import React, { useState, useMemo, useEffect } from 'react';
import {
  FileText,
  Plus,
  Trash2,
  Edit3,
  Calendar,
  AlertTriangle,
  Layers,
  Clock,
  Printer,
  ChevronDown,
  ChevronUp,
  Download,
  Building2,
  Briefcase,
  CheckCircle2,
  FileCheck2,
  DollarSign,
  Compass,
  CloudRain,
  ShieldAlert,
  ArrowRight,
  Calculator,
  RefreshCw,
  Search,
  ExternalLink,
  HelpCircle,
  BarChart2,
  X,
  FileSpreadsheet,
  FileCode2,
  CheckCircle,
  FileSignature,
  Send,
  Lock,
  Unlock,
  History,
  UserCheck,
  Shield,
  Copy,
  Eye,
  Check,
  RotateCcw,
  PenTool,
  CheckCheck,
  ScrollText,
  ArrowLeftCircle,
  Activity
} from 'lucide-react';
import {
  DelayClaim,
  DelayClaimItem,
  DelayClaimCategory,
  DailyReport,
  Project,
  WorkflowStatus,
  WorkflowAction,
  WorkflowEvent
} from '../../types';
import {
  formatShamsiDate,
  calculateShamsiDayDiff,
  addDaysToShamsiDate,
  calculateIntervalsUnionAndOverlap
} from '../../utils/dateUtils';
import { ShamsiDatePicker } from '../ShamsiDatePicker';
import { WorkflowService } from '../../services/workflowService';
import { SystemAdminService } from '../../services/systemAdminService';
import { HRService } from '../../services/hrService';
import { OrganizationType, ModuleId, SystemUser } from '../../systemAdminTypes';
import { formatUserDisplayFormal, formatUserDisplay } from '../../src/utils/userFormatter';

const loadData = <T,>(key: string, defaultValue: T): T => {
  try {
    const saved = localStorage.getItem(key);
    return saved && saved !== "undefined" ? JSON.parse(saved) : defaultValue;
  } catch {
    return defaultValue;
  }
};

const saveData = <T,>(key: string, data: T) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`Error saving ${key}:`, e);
  }
};

interface DelayClaimsManagerProps {
  projectId: string;
  project: Project;
  onShowToast?: (msg: string) => void;
}

const CATEGORY_MAP: Record<
  DelayClaimCategory,
  { label: string; icon: any; color: string; bg: string; border: string; defaultClause: string }
> = {
  TECHNICAL: {
    label: 'دلایل فنی و اجرایی',
    icon: Compass,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    border: 'border-blue-200 dark:border-blue-800',
    defaultClause: 'ماده ۳۰ بند (ج) شرایط عمومی پیمان - مشکلات فنی و اجرایی غیرقابل پیش‌بینی'
  },
  CONTRACTUAL: {
    label: 'دلایل قراردادی و حقوقی',
    icon: Briefcase,
    color: 'text-indigo-600 dark:text-indigo-400',
    bg: 'bg-indigo-50 dark:bg-indigo-950/40',
    border: 'border-indigo-200 dark:border-indigo-800',
    defaultClause: 'ماده ۳۰ بند (الف) و ماده ۲۹ شرایط عمومی پیمان - تغییرات اساسی مقادیر و ابلاغ کارهای جدید'
  },
  FINANCIAL: {
    label: 'مطالبات مالی و پیش‌پرداخت (بخشنامه ۵۰۹۰)',
    icon: DollarSign,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    border: 'border-emerald-200 dark:border-emerald-800',
    defaultClause: 'بخشنامه شماره ۵۰۹۰/۵۴/۱۱۰۸۲-۱ سازمان برنامه و بودجه - تاخیر در پرداخت صورت‌وضعیت‌ها و پیش‌پرداخت'
  },
  ENGINEERING_DESIGN: {
    label: 'طراحی، مهندسی و ابلاغ نقشه‌ها',
    icon: FileCode2,
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-50 dark:bg-purple-950/40',
    border: 'border-purple-200 dark:border-purple-800',
    defaultClause: 'ماده ۲۸ و ماده ۳۰ بند (ب) شرایط عمومی پیمان - تاخیر در ابلاغ نقشه‌ها و دستورکارها'
  },
  EMPLOYER_OBSTACLES: {
    label: 'موانع، معارضین و تاخیرات کارفرما',
    icon: AlertTriangle,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    border: 'border-amber-200 dark:border-amber-800',
    defaultClause: 'ماده ۲۸ بند (ج) شرایط عمومی پیمان - عدم رفع معارض، تحویل به موقع کارگاه یا مصالح کارفرمایی'
  },
  WEATHER_FORCE_MAJEURE: {
    label: 'شرایط نامساعد جوی و حوادث قهری',
    icon: CloudRain,
    color: 'text-cyan-600 dark:text-cyan-400',
    bg: 'bg-cyan-50 dark:bg-cyan-950/40',
    border: 'border-cyan-200 dark:border-cyan-800',
    defaultClause: 'ماده ۴۳ شرایط عمومی پیمان و آمار رسمی هواشناسی - بروز شرایط جوی حاد و فورس‌ماژور'
  },
  PERMITS_LAND: {
    label: 'مجوزها، تملک اراضی و انشعابات',
    icon: FileCheck2,
    color: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    border: 'border-rose-200 dark:border-rose-800',
    defaultClause: 'ماده ۲۸ شرایط عمومی پیمان - تاخیر در اخذ مجوزهای حاکمیتی و تحویل اراضی توسط کارفرما'
  }
};

export const DelayClaimsManager: React.FC<DelayClaimsManagerProps> = ({
  projectId,
  project,
  onShowToast
}) => {
  // Current user & organization context
  const [currentUser, setCurrentUser] = useState<any>(() => SystemAdminService.getCurrentUser());
  const users = useMemo(() => SystemAdminService.getUsers(), []);
  const organizations = useMemo(() => SystemAdminService.getOrganizations(), []);

  useEffect(() => {
    const handleUserChange = () => {
      setCurrentUser(SystemAdminService.getCurrentUser());
    };
    window.addEventListener('storage', handleUserChange);
    return () => window.removeEventListener('storage', handleUserChange);
  }, []);

  const userOrg = useMemo(() => {
    return currentUser?.orgId ? SystemAdminService.getOrganization(currentUser.orgId) : undefined;
  }, [currentUser]);

  const userOrgType = userOrg?.type;

  // View state
  const [viewMode, setViewMode] = useState<'list' | 'editor' | 'preview'>('list');
  const [activeClaimId, setActiveClaimId] = useState<string | null>(null);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');

  // Stored Claims
  const [claims, setClaims] = useState<DelayClaim[]>(() => {
    const rawClaims = loadData<DelayClaim[]>('delay_claims_list', []);
    // Sanitize any legacy draft claims that had auto-injected signatures in initial draft events
    return rawClaims.map(c => {
      if (c.status === WorkflowStatus.DRAFT && c.workflowHistory && c.workflowHistory.length === 1) {
        const firstEv = c.workflowHistory[0];
        if (firstEv.fromStatus === WorkflowStatus.DRAFT && firstEv.toStatus === WorkflowStatus.DRAFT) {
          return {
            ...c,
            workflowHistory: [{
              ...firstEv,
              action: 'CREATE' as WorkflowAction,
              signature: undefined
            }]
          };
        }
      }
      return c;
    });
  });

  // Helper to load daily reports from primary or fallback key
  const getStoredDailyReports = (): DailyReport[] => {
    const hamyarReports = loadData<DailyReport[]>('hamyar_daily_reports', []);
    if (hamyarReports && hamyarReports.length > 0) return hamyarReports;
    return loadData<DailyReport[]>('daily_reports', []);
  };

  // Daily Reports for Import
  const [dailyReports, setDailyReports] = useState<DailyReport[]>(() => {
    return getStoredDailyReports();
  });

  // Filter Claims for this Project
  const projectClaims = useMemo(() => {
    return claims.filter(c => c.projectId === projectId);
  }, [claims, projectId]);

  // Current active claim
  const [currentClaim, setCurrentClaim] = useState<DelayClaim | null>(null);

  // Modals state
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DelayClaimItem | null>(null);
  const [isDailyImportModalOpen, setIsDailyImportModalOpen] = useState(false);
  const [selectedDailyItems, setSelectedDailyItems] = useState<string[]>([]);
  const [is5090ModalOpen, setIs5090ModalOpen] = useState(false);
  const [calc5090State, setCalc5090State] = useState({
    statementAmount: 0,
    contractAmount: 0,
    approvedDueDate: '1403/01/15',
    actualPaymentDate: '1403/03/20',
    description: 'صورت‌وضعیت کارکرد موقت شماره ۳'
  });

  // Workflow Action & History Modals
  const [workflowModalOpen, setWorkflowModalOpen] = useState(false);
  const [workflowTargetClaim, setWorkflowTargetClaim] = useState<DelayClaim | null>(null);
  const [workflowAction, setWorkflowAction] = useState<WorkflowAction | null>(null);
  const [workflowComment, setWorkflowComment] = useState('');
  const [workflowAssigneeId, setWorkflowAssigneeId] = useState('');
  const [workflowAttachSignature, setWorkflowAttachSignature] = useState(true);
  const [workflowTargetOrgId, setWorkflowTargetOrgId] = useState('');
  const [orgUsers, setOrgUsers] = useState<SystemUser[]>([]);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyClaim, setHistoryClaim] = useState<DelayClaim | null>(null);

  // Delete Modal State (Matching Technical Office standard)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTargetClaim, setDeleteTargetClaim] = useState<DelayClaim | null>(null);
  const [deleteTargetItemId, setDeleteTargetItemId] = useState<string | null>(null);

  // Digital Signature Canvas & 9-Box Live Signatures
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const [signingRoleKey, setSigningRoleKey] = useState<string | null>(null);
  const [reportSigs, setReportSigs] = useState<Record<string, { name: string; title: string; signature?: string; date?: string }>>({});

  const notify = (msg: string) => {
    if (onShowToast) onShowToast(msg);
  };

  // Sync active claim with claims array
  useEffect(() => {
    if (activeClaimId) {
      const found = projectClaims.find(c => c.id === activeClaimId);
      if (found) setCurrentClaim(found);
    }
  }, [activeClaimId, projectClaims]);

  // Save all claims
  const handleSaveAllClaims = (updatedList: DelayClaim[]) => {
    setClaims(updatedList);
    saveData('delay_claims_list', updatedList);
  };

  // Mathematical Overlap & Net Calculator
  const recomputeClaimStats = (claim: DelayClaim): DelayClaim => {
    const intervals = claim.items.map(item => ({
      startDate: item.startDate,
      endDate: item.endDate,
      weight: item.claimedDays || item.grossDays || 1
    }));

    const stats = calculateIntervalsUnionAndOverlap(intervals);
    const totalGross = claim.items.reduce((sum, item) => sum + (item.grossDays || 0), 0);
    const totalClaimed = claim.items.reduce((sum, item) => sum + (item.claimedDays || item.grossDays || 0), 0);
    const totalUnjustified = claim.items.reduce((sum, item) => sum + (item.unjustifiedDays || 0), 0);

    const initialEnd = claim.contractSummary?.initialEndDate || project.endDate || '1403/12/29';
    const requestedNewEnd = addDaysToShamsiDate(initialEnd, stats.netDays);

    return {
      ...claim,
      totalGrossDays: totalGross,
      totalOverlapDays: stats.overlapDays,
      totalNetJustifiedDays: stats.netDays,
      totalUnjustifiedDays: totalUnjustified,
      requestedNewEndDate: requestedNewEnd,
      updatedAt: new Date().toISOString()
    };
  };

  // Save single active claim
  const handleSaveClaim = (updatedClaim: DelayClaim) => {
    const recomputed = recomputeClaimStats(updatedClaim);
    const updatedList = claims.map(c => (c.id === recomputed.id ? recomputed : c));
    handleSaveAllClaims(updatedList);
    setCurrentClaim(recomputed);
  };

  // Create New Claim
  const handleCreateNewClaim = () => {
    const claimNumber = `EOT-${projectId.slice(-4).toUpperCase()}-${String(projectClaims.length + 1).padStart(3, '0')}`;
    const today = formatShamsiDate(new Date().toLocaleDateString('fa-IR'));
    const initialEnd = project.endDate || '1403/12/29';

    const p = project as any;
    const contractorOrgId = p?.contractorOrgId || currentUser?.orgId;
    const contractorName = p?.contractorName || p?.contractor || currentUser?.organization || 'شرکت مهندسی و ساختمانی';
    const consultantName = p?.consultantName || p?.consultant || 'مهندسین مشاور سازه‌پرداز';
    const employerName = p?.employerName || p?.employer || 'کارفرمای محترم پروژه';

    const initialEvent: WorkflowEvent = {
      id: crypto.randomUUID(),
      action: 'CREATE' as WorkflowAction,
      actorUserId: currentUser?.id || 'u-contractor',
      actorName: currentUser ? formatUserDisplayFormal(currentUser, userOrg) : 'دفتر فنی پیمانکار',
      actorOrgId: currentUser?.orgId || contractorOrgId,
      actorOrgType: userOrgType || OrganizationType.CONTRACTOR,
      actorTitle: currentUser?.jobTitle || 'کارشناس دفتر فنی',
      signature: undefined,
      fromStatus: WorkflowStatus.DRAFT,
      toStatus: WorkflowStatus.DRAFT,
      comment: 'ایجاد و تدوین اولیه پیش‌نویس لایحه تاخیرات پروژه',
      timestamp: Date.now()
    };

    const newClaim: DelayClaim = {
      id: `claim-${Date.now()}`,
      projectId,
      claimNumber,
      title: `لایحه تاخیرات و ادعای تمدید مدت پیمان - دوره ${projectClaims.length + 1}`,
      periodTitle: `گزارش تاخیرات مجاز و غیرمجاز از شروع پروژه لغایت ${today}`,
      claimDate: today,
      targetPeriodStart: project.startDate || '1402/01/01',
      targetPeriodEnd: today,
      contractorName,
      consultantName,
      employerName,
      status: WorkflowStatus.DRAFT,
      assigneeId: currentUser?.id || 'u-contractor',
      createdById: currentUser?.id || 'u-contractor',
      currentOrgId: contractorOrgId,
      ownerOrgId: contractorOrgId,
      isFinalFrozen: false,
      workflowHistory: [initialEvent],
      items: [],
      totalGrossDays: 0,
      totalOverlapDays: 0,
      totalNetJustifiedDays: 0,
      totalUnjustifiedDays: 0,
      requestedNewEndDate: initialEnd,
      contractSummary: {
        contractNumber: project.contractNumber || (project as any).code || 'CNT-1402-09',
        contractDate: project.startDate || '1402/01/01',
        initialDurationDays: calculateShamsiDayDiff(project.startDate || '1402/01/01', project.endDate || '1403/12/29'),
        initialEndDate: initialEnd,
        previousExtensionDays: 0,
        approvedEndDate: initialEnd,
        contractAmount: (project as any).budget || 50000000000
      },
      introduction: `احتراماً، پیرو قرارداد منعقده به شماره ${project.contractNumber || (project as any).code || 'CNT-1402-09'} موضوع اجرای پروژه "${project.title || (project as any).name}"، با عنایت به بروز موانع و مشکلات خارج از حیطه اختیارات پیمانکار و با استناد به مفاد شرایط عمومی پیمان، لایحه تاخیرات به شرح پیوست جهت بررسی و تمدید مدت پیمان تقدیم می‌گردد.`,
      methodology: `تحلیل تاخیرات بر اساس متدولوژی پنجره‌های زمانی (Time Impact Analysis - TIA) و استخراج رخدادهای بحرانی و محاسبه دقیق همپوشانی روزهای تاخیر انجام پذیرفته است.`,
      conclusion: `با توجه به مستندات ارائه شده و محاسبات حذف همپوشانی زمانی، درخواست تمدید مدت پیمان به میزان مندرج در جدول جمع‌بندی را دارد.`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updated = [...claims, newClaim];
    handleSaveAllClaims(updated);
    setCurrentClaim(newClaim);
    setActiveClaimId(newClaim.id);
    setViewMode('editor');
    notify(`لایحه جدید به شماره ${claimNumber} ایجاد گردید.`);
  };

  // Delete Handlers (Matching Technical Office standard with confirmation modal & audit log)
  const handleOpenDeleteClaimModal = (claim: DelayClaim, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!canUserDeleteThisClaim(claim)) {
      notify('شما مجاز به حذف این سند نیستید.');
      return;
    }
    setDeleteTargetClaim(claim);
    setDeleteTargetItemId(null);
    setIsDeleteModalOpen(true);
  };

  const handleOpenDeleteItemModal = (itemId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!currentClaim) return;
    if (currentClaim.isFinalFrozen) {
      notify('لایحه قفل نهایی شده است.');
      return;
    }
    setDeleteTargetItemId(itemId);
    setDeleteTargetClaim(null);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (deleteTargetClaim) {
      const claimId = deleteTargetClaim.id;
      const updated = claims.filter(c => c.id !== claimId);
      handleSaveAllClaims(updated);

      SystemAdminService.addAuditLog({
        user: currentUser?.id || 'admin',
        action: 'DELETE',
        details: `حذف لایحه تاخیرات شماره ${deleteTargetClaim.claimNumber} با موضوع: ${deleteTargetClaim.title}`,
        source: 'دفتر فنی (لایحه تاخیرات)',
        sourceType: 'TECHNICAL'
      });

      if (activeClaimId === claimId) {
        setActiveClaimId(null);
        setCurrentClaim(null);
        setViewMode('list');
      }
      notify('لایحه با موفقیت حذف گردید.');
    } else if (deleteTargetItemId && currentClaim) {
      const itemToDelete = currentClaim.items.find(it => it.id === deleteTargetItemId);
      const newItems = currentClaim.items.filter(it => it.id !== deleteTargetItemId);
      const updatedClaim = recomputeClaimStats({
        ...currentClaim,
        items: newItems
      });
      handleSaveClaim(updatedClaim);

      SystemAdminService.addAuditLog({
        user: currentUser?.id || 'admin',
        action: 'DELETE',
        details: `حذف ردیف تاخیر «${itemToDelete?.title || deleteTargetItemId}» از لایحه ${currentClaim.claimNumber}`,
        source: 'دفتر فنی (لایحه تاخیرات)',
        sourceType: 'TECHNICAL'
      });

      notify('ردیف تاخیر حذف گردید.');
    }

    setIsDeleteModalOpen(false);
    setDeleteTargetClaim(null);
    setDeleteTargetItemId(null);
  };

  // Item Editor Handlers
  const handleOpenItemEditor = (item?: DelayClaimItem) => {
    if (!currentClaim) return;
    if (currentClaim.isFinalFrozen) {
      notify('این لایحه قفل نهایی شده و امکان ویرایش ردیف‌های آن وجود ندارد.');
      return;
    }

    const today = formatShamsiDate(new Date().toLocaleDateString('fa-IR'));
    if (item) {
      setEditingItem({ ...item });
    } else {
      setEditingItem({
        id: `item-${Date.now()}`,
        claimId: currentClaim.id,
        title: '',
        category: 'EMPLOYER_OBSTACLES',
        impactType: 'CRITICAL_PATH',
        startDate: today,
        endDate: today,
        grossDays: 1,
        overlapDaysWithPrior: 0,
        claimedDays: 1,
        unjustifiedDays: 0,
        contractClauseRef: CATEGORY_MAP['EMPLOYER_OBSTACLES'].defaultClause,
        description: '',
        rootCause: '',
        attachedDocumentRefs: [],
        contractorActions: '',
        status: 'JUSTIFIED'
      });
    }
    setIsItemModalOpen(true);
  };

  const handleSaveItem = () => {
    if (!currentClaim || !editingItem) return;
    if (!editingItem.title.trim()) {
      notify('لطفاً عنوان تاخیر یا مانع را وارد نمایید.');
      return;
    }

    const gross = calculateShamsiDayDiff(editingItem.startDate, editingItem.endDate) + 1;
    const finalItem: DelayClaimItem = {
      ...editingItem,
      grossDays: gross > 0 ? gross : 1,
      claimedDays: editingItem.claimedDays !== undefined ? editingItem.claimedDays : gross > 0 ? gross : 1
    };

    let newItems: DelayClaimItem[];
    const exists = currentClaim.items.some(it => it.id === finalItem.id);
    if (exists) {
      newItems = currentClaim.items.map(it => (it.id === finalItem.id ? finalItem : it));
    } else {
      newItems = [...currentClaim.items, finalItem];
    }

    const updatedClaim = recomputeClaimStats({
      ...currentClaim,
      items: newItems
    });

    handleSaveClaim(updatedClaim);
    setIsItemModalOpen(false);
    setEditingItem(null);
    notify('ردیف تاخیر با موفقیت ذخیره گردید.');
  };

  const handleDuplicateItem = (item: DelayClaimItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!currentClaim) return;
    if (currentClaim.isFinalFrozen) {
      notify('لایحه قفل نهایی شده است.');
      return;
    }

    const duplicated: DelayClaimItem = {
      ...item,
      id: `item-${Date.now()}`,
      title: `${item.title} (کپی)`
    };

    const updatedClaim = recomputeClaimStats({
      ...currentClaim,
      items: [...currentClaim.items, duplicated]
    });
    handleSaveClaim(updatedClaim);
    notify('ردیف تاخیر تکرار و کپی گردید.');
  };

  // Import from Daily Reports
  const handleImportDailyObstacles = () => {
    if (!currentClaim) return;
    if (currentClaim.isFinalFrozen) {
      notify('لایحه قفل نهایی شده است.');
      return;
    }
    setDailyReports(getStoredDailyReports());
    setSelectedDailyItems([]);
    setIsDailyImportModalOpen(true);
  };

  const executeDailyImport = (itemsToImport: any[]) => {
    if (!currentClaim) return;

    const newDelayItems: DelayClaimItem[] = itemsToImport.map((daily, idx) => {
      const isWeather = daily.type === 'WEATHER';
      const category: DelayClaimCategory = daily.category || (isWeather ? 'WEATHER_FORCE_MAJEURE' : 'EMPLOYER_OBSTACLES');
      const sDate = daily.startDate || daily.reportDate || formatShamsiDate(new Date().toLocaleDateString('fa-IR'));
      const eDate = daily.endDate || sDate;
      const daysCount = daily.grossDays || Math.max(1, calculateShamsiDayDiff(sDate, eDate) + 1);

      return {
        id: `daily-imp-${Date.now()}-${idx}`,
        claimId: currentClaim.id,
        title: daily.title || (isWeather ? `شرایط نامساعد جوی (${sDate})` : `مانع کارگاهی (${sDate})`),
        category,
        impactType: 'CRITICAL_PATH',
        startDate: sDate,
        endDate: eDate,
        grossDays: daysCount,
        overlapDaysWithPrior: 0,
        claimedDays: daysCount,
        unjustifiedDays: 0,
        contractClauseRef: CATEGORY_MAP[category]?.defaultClause || 'ماده ۴۳ شرایط عمومی پیمان',
        description: daily.description || '',
        rootCause: `استخراج مستقیم بازه تاخیر مستمر از ${daily.totalReports || 1} گزارش روزانه منجمدشده کارفرما (${daily.reportNumbersSummary || 'گزارشات روزانه'}) از تاریخ ${sDate} تا ${eDate}`,
        attachedDocumentRefs: [daily.reportNumbersSummary ? `گزارشات روزانه ${daily.reportNumbersSummary}` : `گزارش ${sDate}`],
        contractorActions: 'ثبت در گزارشات روزانه منجمدشده و ابلاغ رسمی به دستگاه نظارت/کارفرما',
        status: 'JUSTIFIED'
      };
    });

    const updatedClaim = recomputeClaimStats({
      ...currentClaim,
      items: [...currentClaim.items, ...newDelayItems]
    });

    handleSaveClaim(updatedClaim);
    setIsDailyImportModalOpen(false);
    notify(`${newDelayItems.length} ردیف تاخیر (استخراج‌شده از گزارشات منجمد کارفرما) به لایحه افزوده شد.`);
  };

  // Circular 5090 Calculator
  const handleApply5090 = () => {
    if (!currentClaim) return;
    if (currentClaim.isFinalFrozen) {
      notify('لایحه قفل نهایی شده است.');
      return;
    }

    const { statementAmount, contractAmount, approvedDueDate, actualPaymentDate, description } = calc5090State;
    if (!statementAmount || !contractAmount) {
      notify('لطفاً مبالغ صورت‌وضعیت و کل پیمان را وارد نمایید.');
      return;
    }

    const delayDaysCalculated = calculateShamsiDayDiff(approvedDueDate, actualPaymentDate);
    if (delayDaysCalculated <= 0) {
      notify('تاریخ پرداخت واقعی باید پس از موعد مصوب پرداخت باشد.');
      return;
    }

    const justifiedExtensionDays = Math.max(
      1,
      Math.round((statementAmount * delayDaysCalculated) / (contractAmount || 1))
    );

    const newItem: DelayClaimItem = {
      id: `5090-${Date.now()}`,
      claimId: currentClaim.id,
      title: `تاخیر در پرداخت ${description} (بخشنامه ۵۰۹۰)`,
      category: 'FINANCIAL',
      impactType: 'CRITICAL_PATH',
      startDate: approvedDueDate,
      endDate: actualPaymentDate,
      grossDays: delayDaysCalculated,
      overlapDaysWithPrior: 0,
      claimedDays: justifiedExtensionDays,
      unjustifiedDays: 0,
      contractClauseRef: 'بخشنامه ۵۰۹۰ سازمان برنامه و بودجه - فرمول T=(A*D)/C',
      description: `مبلغ صورت‌وضعیت: ${statementAmount.toLocaleString('fa-IR')} ریال | مبلغ پیمان: ${contractAmount.toLocaleString('fa-IR')} ریال | روزهای تاخیر پرداخت: ${delayDaysCalculated} روز`,
      rootCause: `تاخیر کارفرما در تامین اعتبار و پرداخت صورت‌وضعیت معوقه`,
      attachedDocumentRefs: [description, `نامه ارسال صورت‌وضعیت`],
      contractorActions: 'ارائه مکاتبات مالی و پیگیری پرداخت مطالبات'
    };

    const updatedClaim = recomputeClaimStats({
      ...currentClaim,
      items: [...currentClaim.items, newItem]
    });
    handleSaveClaim(updatedClaim);
    setIs5090ModalOpen(false);
    notify(`تاخیر مالی بخشنامه ۵۰۹۰ با مقدار خالص ${justifiedExtensionDays} روز مجاز اعمال گردید.`);
  };

  // =========================================================================
  // WORKFLOW ACTION & ELECTRONIC SIGNATURE HANDLERS
  // =========================================================================
  const applyUserSignatureToClaim = (sigDataUrl?: string, roleKeyParam?: string) => {
    if (!currentClaim) return;
    const curUser = currentUser || SystemAdminService.getCurrentUser();
    if (!curUser) {
      notify('کاربر جاری مشخص نیست');
      return;
    }

    const effectiveSig = sigDataUrl || curUser.signature || HRService.getSignatureByUserId(curUser.id);
    if (!effectiveSig) {
      setSigningRoleKey(roleKeyParam || null);
      setIsSignModalOpen(true);
      return;
    }

    let roleKey = roleKeyParam;
    if (!roleKey) {
      const titleLower = ((curUser.jobTitle || '') + ' ' + (curUser.jobLevel || '')).toLowerCase();
      const isEmployerOrg = userOrgType === OrganizationType.EMPLOYER;
      const isConsultantOrg = userOrgType === OrganizationType.CONSULTANT;

      if (isEmployerOrg) {
        if (titleLower.includes('مدیر طرح') || titleLower.includes('نماینده') || titleLower.includes('مجری') || titleLower.includes('مدیر پروژه') || titleLower.includes('سرپرست کارگاه')) {
          roleKey = 'employer_site';
        } else if (titleLower.includes('سرپرست واحد') || titleLower.includes('مدیر گروه') || titleLower.includes('رئیس اداره') || titleLower.includes('مدیر واحد')) {
          roleKey = 'employer_head';
        } else {
          roleKey = 'employer_tech';
        }
      } else if (isConsultantOrg) {
        if (titleLower.includes('سرپرست واحد') || titleLower.includes('سرپرست گروه') || titleLower.includes('مدیر واحد') || titleLower.includes('رئیس نظارت')) {
          roleKey = 'consultant_head';
        } else if (titleLower.includes('سرپرست نظارت') || titleLower.includes('مدیر پروژه') || titleLower.includes('ناظر مقیم') || titleLower.includes('سرپرست کارگاه')) {
          roleKey = 'consultant_site';
        } else {
          roleKey = 'consultant_tech';
        }
      } else {
        if (titleLower.includes('سرپرست کارگاه') || titleLower.includes('مدیر پروژه') || titleLower.includes('رئیس کارگاه') || titleLower.includes('مدیر کارگاه')) {
          roleKey = 'contractor_site';
        } else if (titleLower.includes('سرپرست واحد') || titleLower.includes('سرپرست دفتر') || titleLower.includes('رئیس دفتر') || titleLower.includes('مدیر دفتر') || titleLower.includes('رئیس واحد')) {
          roleKey = 'contractor_head';
        } else {
          roleKey = 'contractor_tech';
        }
      }
    }

    const todayDate = formatShamsiDate(new Date().toLocaleDateString('fa-IR'));
    const newSigEntry = {
      name: curUser.fullName || curUser.username,
      title: curUser.jobTitle || 'مسئول مربوطه',
      signature: effectiveSig,
      date: todayDate
    };

    setReportSigs(prev => ({
      ...prev,
      [roleKey!]: newSigEntry
    }));

    const sigEvent: WorkflowEvent = {
      id: crypto.randomUUID(),
      action: 'SIGN' as WorkflowAction,
      actorUserId: curUser.id,
      actorName: formatUserDisplayFormal(curUser, userOrg),
      actorOrgId: curUser.orgId,
      actorOrgType: userOrgType || OrganizationType.CONTRACTOR,
      actorTitle: curUser.jobTitle || 'امضای رسمی لایحه تاخیرات',
      signature: effectiveSig,
      fromStatus: currentClaim.status,
      toStatus: currentClaim.status,
      comment: `ثبت امضای الکترونیکی رسمی توسط ${curUser.fullName || curUser.username} (${curUser.jobTitle || 'مسئول مربوطه'})`,
      timestamp: Date.now(),
      roleKey: roleKey
    } as any;

    const updatedClaim: DelayClaim = {
      ...currentClaim,
      workflowHistory: [...(currentClaim.workflowHistory || []), sigEvent],
      updatedAt: new Date().toISOString()
    };

    handleSaveClaim(updatedClaim);

    SystemAdminService.addAuditLog({
      user: curUser.id,
      action: 'SIGN',
      details: `ثبت امضای الکترونیکی بر روی لایحه تاخیرات ${currentClaim.claimNumber} با جایگاه ${roleKey}`,
      source: 'دفتر فنی (لایحه تاخیرات)',
      sourceType: 'TECHNICAL'
    });

    notify(`امضای الکترونیکی ${curUser.fullName || curUser.username} با موفقیت بر روی لایحه ثبت شد`);
  };

  const handleSaveDrawnSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const curUser = currentUser || SystemAdminService.getCurrentUser();
    if (curUser) {
      HRService.saveUserSignature(curUser.id || curUser.username, dataUrl);
    }
    applyUserSignatureToClaim(dataUrl, signingRoleKey || undefined);
    setIsSignModalOpen(false);
    setSigningRoleKey(null);
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0f172a';
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearDrawing = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const filterWorkflowUsers = (usersList: SystemUser[], cUser: SystemUser) => {
    if (!cUser) return usersList;
    const isCurrentUser = (u: any) =>
      u.id === cUser.id ||
      (cUser.username && u.username === cUser.username);
    const isSystemAdmin = cUser.role === 'SYSTEM_ADMIN';
    if (isSystemAdmin) {
      return usersList.filter(u => !isCurrentUser(u));
    }

    const ut = (cUser.jobTitle || "").trim();
    const ul = (cUser.jobLevel || "").trim();

    const isCurrentUserPM = cUser.role === 'ORG_ADMIN' || ut.includes('مدیر پروژه') || ul.includes('مدیر پروژه') || cUser.username === 'e-pm' || cUser.id === 'e-pm';
    const isCurrentUserWorkshopManager = ut.includes('سرپرست کارگاه') || ul.includes('سرپرست کارگاه');

    const isExpertOrUnitSupervisor = (
      ut.includes("کارشناس") || ul.includes("کارشناس") ||
      ut.includes("سرپرست واحد") || ul.includes("سرپرست واحد")
    );

    return usersList.filter(u => {
      if (isCurrentUser(u)) return false;
      const isSameOrg = u.orgId === cUser.orgId;
      const isTargetPM = u.role === 'ORG_ADMIN' || (u.jobTitle || '').includes('مدیر پروژه') || (u.jobLevel || '').includes('مدیر پروژه') || u.username === 'e-pm' || u.id === 'e-pm';
      const isTargetWorkshopManager = (u.jobTitle || '').includes('سرپرست کارگاه') || (u.jobLevel || '').includes('سرپرست کارگاه');

      if (isTargetPM && !isCurrentUserWorkshopManager && !(isCurrentUserPM && !isSameOrg)) {
        return false;
      }

      if (isSameOrg) {
        if (isExpertOrUnitSupervisor) {
          return !isTargetPM;
        }
        if (isCurrentUserPM || isCurrentUserWorkshopManager) {
          return true;
        }
        return !isTargetPM;
      } else {
        if (isCurrentUserPM || isCurrentUserWorkshopManager) {
          return isTargetPM || isTargetWorkshopManager;
        }
        return false;
      }
    });
  };

  const getRoleKeyForUser = (user: any): string => {
    if (!user) return 'contractor_tech';
    const titleLower = ((user.jobTitle || user.actorTitle || '') + ' ' + (user.jobLevel || '')).toLowerCase();
    const orgType = user.orgType || (user.orgId ? SystemAdminService.getOrganization(user.orgId)?.type : undefined);

    if (orgType === OrganizationType.EMPLOYER || titleLower.includes('کارفرما') || titleLower.includes('مدیر طرح') || titleLower.includes('مجری')) {
      if (titleLower.includes('سرپرست کارگاه') || titleLower.includes('مدیر پروژه') || titleLower.includes('مدیر طرح') || titleLower.includes('نماینده') || titleLower.includes('مجری') || titleLower.includes('رئیس کارگاه') || titleLower.includes('مدیر کارگاه') || titleLower.includes('مدیر عامل') || titleLower.includes('کارفرما')) {
        return 'employer';
      } else if (titleLower.includes('سرپرست واحد') || titleLower.includes('مدیر گروه') || titleLower.includes('رئیس اداره') || titleLower.includes('سرپرست گروه') || titleLower.includes('مدیر واحد') || titleLower.includes('سرپرست دفتر') || titleLower.includes('رئیس دفتر')) {
        return 'employer_head';
      } else {
        return 'employer_tech';
      }
    }
    if (orgType === OrganizationType.CONSULTANT || titleLower.includes('ناظر') || titleLower.includes('مشاور') || titleLower.includes('سرپرست نظارت')) {
      if (titleLower.includes('سرپرست واحد') || titleLower.includes('سرپرست گروه') || titleLower.includes('رئیس گروه') || titleLower.includes('مدیر واحد') || titleLower.includes('رئیس دفتر') || titleLower.includes('سرپرست دفتر فنی') || titleLower.includes('مسئول دفتر فنی')) {
        return 'consultant_head';
      } else if (titleLower.includes('سرپرست نظارت') || titleLower.includes('سرپرست کارگاه') || titleLower.includes('مدیر پروژه') || titleLower.includes('مدیر نظارت') || titleLower.includes('رئیس نظارت') || titleLower.includes('مشاور') || titleLower.includes('رئیس کارگاه') || titleLower.includes('مدیر کارگاه') || titleLower.includes('ناظر مقیم')) {
        return 'consultant';
      } else {
        return 'consultant_tech';
      }
    }
    if (titleLower.includes('سرپرست کارگاه') || titleLower.includes('مدیر پروژه') || titleLower.includes('رئیس کارگاه') || titleLower.includes('مدیر کارگاه')) {
      return 'contractor_site';
    }
    if (titleLower.includes('سرپرست واحد') || titleLower.includes('سرپرست دفتر') || titleLower.includes('رئیس دفتر') || titleLower.includes('مدیر دفتر') || titleLower.includes('رئیس واحد') || titleLower.includes('سرپرست دفتر فنی')) {
      return 'contractor_head';
    }
    return 'contractor_tech';
  };

  const handleOpenWorkflowModal = (claim: DelayClaim, action: WorkflowAction, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setWorkflowTargetClaim(claim);
    setWorkflowAction(action);
    setWorkflowComment('');
    setWorkflowAssigneeId('');
    setWorkflowAttachSignature(true);

    const isSystemAdmin = currentUser?.role === 'SYSTEM_ADMIN';
    const allUsers = SystemAdminService.getUsers().filter(u => u.isActive);

    if (
      action === 'SUBMIT' ||
      action === 'RESUBMIT' ||
      action === 'REASSIGN' ||
      action === 'APPROVE' ||
      action === 'REJECT' ||
      action === 'FINAL_APPROVE'
    ) {
      let filtered = allUsers;
      if (!isSystemAdmin && currentUser) {
        filtered = allUsers.filter(u => u.orgId === currentUser.orgId);
      }
      setOrgUsers(filterWorkflowUsers(filtered, currentUser!));
    } else if (action === 'SEND_TO_CONSULTANT' || action === 'RETURN_TO_CONSULTANT') {
      if (isSystemAdmin) {
        setOrgUsers(filterWorkflowUsers(allUsers, currentUser!));
      } else {
        const orgs = SystemAdminService.getOrganizations();
        const consultantOrg = orgs.find(o => o.type === OrganizationType.CONSULTANT);
        if (consultantOrg) {
          const cUsers = allUsers.filter(u => u.orgId === consultantOrg.id);
          setOrgUsers(filterWorkflowUsers(cUsers, currentUser!));
        } else {
          setOrgUsers([]);
          if (action !== 'RETURN_TO_CONSULTANT') alert('سازمان مشاور تعریف نشده است.');
        }
      }
    } else if (action === 'SEND_TO_EMPLOYER') {
      if (isSystemAdmin) {
        setOrgUsers(filterWorkflowUsers(allUsers, currentUser!));
      } else {
        const orgs = SystemAdminService.getOrganizations();
        const employerOrg = orgs.find(o => o.type === OrganizationType.EMPLOYER);
        if (employerOrg) {
          const eUsers = allUsers.filter(u => u.orgId === employerOrg.id);
          setOrgUsers(filterWorkflowUsers(eUsers, currentUser!));
        } else {
          setOrgUsers([]);
          alert('سازمان کارفرما تعریف نشده است.');
        }
      }
    } else if (action === 'RETURN_TO_CONTRACTOR') {
      if (isSystemAdmin) {
        setOrgUsers(filterWorkflowUsers(allUsers, currentUser!));
      } else {
        const orgs = SystemAdminService.getOrganizations();
        const targetOrgId = claim.ownerOrgId;
        const contractorOrg = targetOrgId
          ? orgs.find(o => o.id === targetOrgId)
          : orgs.find(o => o.type === OrganizationType.CONTRACTOR);
        if (contractorOrg) {
          const cUsers = allUsers.filter(u => u.orgId === contractorOrg.id);
          setOrgUsers(filterWorkflowUsers(cUsers, currentUser!));
        } else {
          setOrgUsers([]);
        }
      }
    }

    setWorkflowModalOpen(true);
  };

  const handleExecuteWorkflow = () => {
    if (!workflowTargetClaim || !workflowAction || !currentUser) return;

    const hrSig = HRService.getUserSignature(currentUser) || currentUser?.signature;

    if (workflowAttachSignature && !hrSig) {
      console.warn("HR Signature missing, proceeding without attached PNG signature.");
    }

    try {
      let targetOrgId: string | undefined;
      const orgs = SystemAdminService.getOrganizations();
      if (workflowAction === 'SEND_TO_CONSULTANT' || workflowAction === 'RETURN_TO_CONSULTANT') {
        const consultantOrg = orgs.find(o => o.type === OrganizationType.CONSULTANT);
        if (consultantOrg) targetOrgId = consultantOrg.id;
      } else if (workflowAction === 'SEND_TO_EMPLOYER') {
        const employerOrg = orgs.find(o => o.type === OrganizationType.EMPLOYER);
        if (employerOrg) targetOrgId = employerOrg.id;
      } else if (workflowAction === 'RETURN_TO_CONTRACTOR') {
        const contractOrgId = workflowTargetClaim.ownerOrgId;
        const contractorOrg = contractOrgId
          ? orgs.find(o => o.id === contractOrgId)
          : orgs.find(o => o.type === OrganizationType.CONTRACTOR);
        if (contractorOrg) targetOrgId = contractorOrg.id;
      }

      let assigneeNameWithTitle: string | undefined;
      if (workflowAssigneeId && workflowAssigneeId.includes(',')) {
        const ids = workflowAssigneeId.split(',').map(id => id.trim());
        const allUsers = SystemAdminService.getUsers();
        const names = ids.map(id => {
          const u = allUsers.find(user => user.id === id);
          if (u) {
            const o = u.orgId ? SystemAdminService.getOrganization(u.orgId) : undefined;
            return formatUserDisplayFormal(u, o);
          }
          return '';
        }).filter(n => n !== '');
        assigneeNameWithTitle = names.join('، ');
      } else if (workflowAssigneeId) {
        const assigneeUser = SystemAdminService.getUsers().find(u => u.id === workflowAssigneeId);
        const assigneeOrg = assigneeUser?.orgId ? SystemAdminService.getOrganization(assigneeUser.orgId) : undefined;
        assigneeNameWithTitle = assigneeUser
          ? formatUserDisplayFormal(assigneeUser, assigneeOrg)
          : undefined;
      }

      const selectedSignature = workflowAttachSignature && hrSig ? hrSig : undefined;
      const payload = {
        assigneeId: workflowAssigneeId || undefined,
        assigneeName: assigneeNameWithTitle,
        comment: workflowComment.trim() || undefined,
        targetOrgId: targetOrgId,
        signature: selectedSignature,
        attachSignature: !!workflowAttachSignature,
        roleKey: getRoleKeyForUser(currentUser),
      };

      const updatedItem = WorkflowService.performAction(
        workflowTargetClaim,
        workflowAction,
        currentUser,
        payload
      ) as DelayClaim;

      const recomputed = recomputeClaimStats(updatedItem);
      const updatedList = claims.map(c => (c.id === recomputed.id ? recomputed : c));
      handleSaveAllClaims(updatedList);
      if (currentClaim?.id === recomputed.id) {
        setCurrentClaim(recomputed);
      }

      SystemAdminService.addAuditLog({
        user: currentUser.id,
        action: workflowAction,
        details: `تغییر وضعیت گردش کار به [${workflowAction}] برای لایحه تاخیرات: ${workflowTargetClaim.claimNumber} - ${workflowTargetClaim.title}`,
        source: 'دفتر فنی (لایحه تاخیرات)',
        sourceType: 'TECHNICAL'
      });

      setWorkflowModalOpen(false);
      setWorkflowTargetClaim(null);
      setWorkflowAction(null);
      notify(`اقدام گردش کار (${WorkflowService.getActionLabel(workflowAction, userOrgType)}) با موفقیت ثبت و ارسال شد.`);
    } catch (err: any) {
      console.error(err);
      notify(err.message || 'خطا در انجام گردش کار');
    }
  };

  const handleOpenHistoryModal = (claim: DelayClaim, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setHistoryClaim(claim);
    setHistoryModalOpen(true);
  };

  // Filtered Claims in List View
  const filteredClaims = useMemo(() => {
    return projectClaims.filter(c => {
      const matchSearch =
        c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.claimNumber.toLowerCase().includes(searchTerm.toLowerCase());
      return matchSearch;
    });
  }, [projectClaims, searchTerm]);

  // Check if current user is allowed to edit this claim
  const canUserEditClaim = (claim: DelayClaim): boolean => {
    if (claim.isFinalFrozen) return false;
    if (currentUser?.role === 'SYSTEM_ADMIN') return true;
    if (claim.status !== WorkflowStatus.DRAFT && claim.status !== WorkflowStatus.REJECTED) {
      return false;
    }
    if (claim.currentOrgId && currentUser?.orgId && claim.currentOrgId !== currentUser.orgId) {
      return false;
    }
    if (currentUser) {
      const actions = WorkflowService.getAvailableActions(claim, currentUser, userOrgType);
      return actions.includes('SUBMIT') || actions.includes('RESUBMIT');
    }
    return false;
  };

  const canUserDeleteThisClaim = (claim: DelayClaim | null | undefined): boolean => {
    if (!claim) return false;
    if (claim.isFinalFrozen) return false;
    if (!currentUser) return false;

    // SYSTEM_ADMIN can always delete non-frozen documents
    if (currentUser.role === 'SYSTEM_ADMIN') return true;

    // Sender lockout: when the document is sent (not in DRAFT status), the sender (last actor who performed a workflow transition) cannot delete it
    if (claim.status !== WorkflowStatus.DRAFT && (claim.workflowHistory || []).length > 0) {
      const lastEvent = WorkflowService.getLastHandoverEvent(claim.workflowHistory);
      if (lastEvent && lastEvent.actorUserId === currentUser.id && lastEvent.action !== 'UNFREEZE_BY_VARIATION') {
        return false;
      }
    }

    // Check organization: must be Contractor organization
    const contractorOrg = organizations.find(o => o.type === OrganizationType.CONTRACTOR);
    const isContractor = currentUser.orgId === contractorOrg?.id || 
                         SystemAdminService.getOrganization(currentUser.orgId)?.type === OrganizationType.CONTRACTOR;
    if (!isContractor) return false;

    // In DRAFT status, anyone with standard delete access or creator can delete
    if (claim.status === WorkflowStatus.DRAFT) {
      return claim.createdById === currentUser.id || WorkflowService.canDelete(claim as any, currentUser);
    }

    // When status is IN_REVIEW (sent from Specialist to Unit Supervisor),
    // Unit Supervisor, Workshop Manager, or Project Manager of Contractor organization can delete
    if (claim.status === WorkflowStatus.IN_REVIEW) {
      const titleLower = ((currentUser.jobTitle || '') + ' ' + (currentUser.jobLevel || '')).toLowerCase();
      const isUnitSupervisor = titleLower.includes('سرپرست واحد') || titleLower.includes('مدیر فنی') || titleLower.includes('سرپرست دفتر فنی') || titleLower.includes('رئیس دفتر');
      const isWorkshopManagerOrPM = titleLower.includes('سرپرست کارگاه') || titleLower.includes('مدیر پروژه') || titleLower.includes('مدیر طرح') || titleLower.includes('نماینده') || titleLower.includes('رئیس کارگاه') || titleLower.includes('مدیر کارگاه');
      
      if (isUnitSupervisor || isWorkshopManagerOrPM) {
        return true;
      }
    }

    // Fallback to standard delete permission check
    return WorkflowService.canDelete(claim as any, currentUser);
  };

  // Resolve digital signature boxes for printing & report preview (Matching Technical Office standard)
  const getRoleSignatory = (roleKey: string, customClaim?: any) => {
    const users = SystemAdminService.getUsers();
    const proj = project as any;
    const targetObj = customClaim || currentClaim || {};
    const history = (targetObj?.workflowHistory || []) as any[];
    const isUnsigned = !!targetObj?.unsignedSession;

    if (isUnsigned) {
      if (roleKey === 'contractor_tech' || roleKey === 'permit_expert') {
        return { name: 'کارشناس / سرپرست دفتر فنی', title: 'بخش مهندسی و دفتر فنی پیمانکار', signature: undefined, date: undefined };
      }
      if (roleKey === 'contractor_head' || roleKey === 'permit_head') {
        return { name: 'سرپرست واحد فنی', title: 'سرپرست واحد فنی پیمانکار', signature: undefined, date: undefined };
      }
      if (roleKey === 'contractor_site' || roleKey === 'permit_site') {
        return { name: 'سرپرست کارگاه / مدیر پروژه', title: 'سرپرست کارگاه پیمانکار', signature: undefined, date: undefined };
      }
      if (roleKey === 'consultant' || roleKey === 'permit_consultant') {
        return { name: 'سرپرست نظارت / مدیر پروژه مشاور', title: 'دستگاه نظارت و مشاور', signature: undefined, date: undefined };
      }
      if (roleKey === 'employer') {
        return { name: 'مدیر طرح / نماینده کارفرما', title: 'دستگاه اجرایی و کارفرما', signature: undefined, date: undefined };
      }
      return null;
    }

    const findEventForRole = (targetRoleKey: string): any => {
      const matchEvent = (e: any): boolean => {
        if (!e) return false;
        
        const nonSigningActions = ['REASSIGN', 'REJECT', 'SEND_TO_CONTRACTOR',
                      'RETURN_TO_CONTRACTOR', 'RETURN_TO_CONSULTANT', 'CREATE'];
        if (nonSigningActions.includes(e.action)) return false;

        const actorUser = users.find(u => u.id === e.actorUserId || u.fullName === e.actorName || u.username === e.actorName);
        const orgId = e.actorOrgId || actorUser?.orgId;
        const orgType = e.actorOrgType || (actorUser as any)?.orgType || (orgId ? SystemAdminService.getOrganization(orgId)?.type : undefined);

        const isConsultantOrg = orgType === OrganizationType.CONSULTANT || (proj?.consultantOrgId && String(orgId) === String(proj.consultantOrgId));
        const isEmployerOrg = orgType === OrganizationType.EMPLOYER || (proj?.employerOrgId && String(orgId) === String(proj.employerOrgId));
        const isContractorOrg = !isConsultantOrg && !isEmployerOrg;

        if ((e.action === 'RESUBMIT' || e.action === 'SUBMIT') && !isContractorOrg) return false;

        if (e.roleKey) {
          if (e.roleKey === targetRoleKey) {
            if ((targetRoleKey.startsWith('contractor_') || targetRoleKey.startsWith('permit_')) && isContractorOrg) return true;
            if ((targetRoleKey.startsWith('consultant') || targetRoleKey === 'permit_consultant') && isConsultantOrg) return true;
            if ((targetRoleKey.startsWith('employer') || targetRoleKey === 'permit_employer') && isEmployerOrg) return true;
          }
          if (targetRoleKey === 'permit_expert' && e.roleKey === 'contractor_tech' && isContractorOrg) return true;
          if (targetRoleKey === 'permit_head' && e.roleKey === 'contractor_head' && isContractorOrg) return true;
          if (targetRoleKey === 'permit_site' && e.roleKey === 'contractor_site' && isContractorOrg) return true;
          if (targetRoleKey === 'permit_consultant' && (e.roleKey === 'consultant' || e.roleKey === 'consultant_site') && isConsultantOrg) return true;
          if ((targetRoleKey === 'consultant' || targetRoleKey === 'consultant_site') && (e.roleKey === 'consultant' || e.roleKey === 'consultant_site' || e.roleKey === 'permit_consultant') && isConsultantOrg) return true;
          if (targetRoleKey === 'consultant_head' && e.roleKey === 'consultant_head' && isConsultantOrg) return true;
          if (targetRoleKey === 'employer_head' && e.roleKey === 'employer_head' && isEmployerOrg) return true;
          if ((targetRoleKey === 'employer' || targetRoleKey === 'employer_site') && (e.roleKey === 'employer' || e.roleKey === 'employer_site') && isEmployerOrg) return true;
          return false;
        }

        const title = ((e.actorTitle || actorUser?.jobTitle || e.actorName || '') + ' ' + (actorUser?.jobLevel || '')).toLowerCase();

        if (targetRoleKey === 'contractor_tech' || targetRoleKey === 'permit_expert') {
          if (!isContractorOrg) return false;
          if (e.action === 'SUBMIT' || e.action === 'RESUBMIT') {
            if (title.includes('سرپرست واحد') || title.includes('سرپرست کارگاه') || title.includes('مدیر پروژه') || title.includes('رئیس کارگاه')) return false;
            return true;
          }
          if (e.action === 'SIGN' || e.action === 'REPORT_SIGNATURE') {
            if (title.includes('سرپرست واحد') || title.includes('سرپرست کارگاه') || title.includes('مدیر پروژه') || title.includes('رئیس کارگاه')) return false;
            return title.includes('کارشناس') || title.includes('دفتر فنی') || title.includes('تهیه') || title.includes('عضو');
          }
          return false;
        }

        if (targetRoleKey === 'contractor_head' || targetRoleKey === 'permit_head') {
          if (!isContractorOrg) return false;
          if (e.action === 'APPROVE' && e.fromStatus === WorkflowStatus.DRAFT) return true;
          if (e.action === 'SIGN' || e.action === 'REPORT_SIGNATURE') {
            if (title.includes('سرپرست کارگاه') || title.includes('مدیر پروژه') || title.includes('رئیس کارگاه')) return false;
            return title.includes('سرپرست واحد') || title.includes('سرپرست دفتر') || title.includes('رئیس دفتر') || title.includes('مدیر دفتر');
          }
          return false;
        }

        if (targetRoleKey === 'contractor_site' || targetRoleKey === 'permit_site') {
          if (!isContractorOrg) return false;
          if (e.action === 'SEND_TO_CONSULTANT' || (e.action === 'APPROVE' && e.toStatus === WorkflowStatus.APPROVED_INTERNAL)) return true;
          if (e.action === 'SIGN' || e.action === 'REPORT_SIGNATURE') {
            return title.includes('سرپرست کارگاه') || title.includes('مدیر پروژه') || title.includes('رئیس کارگاه') || title.includes('مدیر کارگاه');
          }
          return false;
        }

        if (targetRoleKey === 'consultant_tech') {
          if (!isConsultantOrg) return false;
          if (e.roleKey === 'consultant_tech') return true;
          if (e.action === 'APPROVE' || e.action === 'SIGN' || e.action === 'REPORT_SIGNATURE') {
            if (title.includes('سرپرست واحد') || title.includes('سرپرست گروه') || title.includes('سرپرست نظارت') || title.includes('مدیر پروژه') || title.includes('سرپرست کارگاه') || title.includes('مدیر نظارت') || title.includes('رئیس کارگاه')) return false;
            return title.includes('کارشناس') || title.includes('ناظر') || title.includes('مقیم') || title.includes('دفتر فنی');
          }
          return false;
        }

        if (targetRoleKey === 'consultant_head') {
          if (!isConsultantOrg) return false;
          if (e.roleKey === 'consultant_head') return true;
          if (e.action === 'APPROVE' || e.action === 'SIGN' || e.action === 'REPORT_SIGNATURE') {
            if (title.includes('سرپرست نظارت') || title.includes('مدیر پروژه') || title.includes('سرپرست کارگاه') || title.includes('مدیر نظارت') || title.includes('رئیس کارگاه')) return false;
            return title.includes('سرپرست واحد') || title.includes('سرپرست گروه') || title.includes('رئیس گروه') || title.includes('مدیر واحد') || title.includes('سرپرست دفتر') || title.includes('رئیس دفتر');
          }
          return false;
        }

        if (targetRoleKey === 'consultant' || targetRoleKey === 'permit_consultant' || targetRoleKey === 'consultant_site') {
          if (!isConsultantOrg) return false;
          if (e.roleKey === 'consultant' || e.roleKey === 'consultant_site' || e.roleKey === 'permit_consultant') return true;
          if (e.action === 'SEND_TO_EMPLOYER' || e.action === 'APPROVE' || e.action === 'RETURN_TO_CONTRACTOR' || e.action === 'SIGN' || e.action === 'REPORT_SIGNATURE') {
            return true;
          }
          return false;
        }

        if (targetRoleKey === 'employer_tech') {
          if (!isEmployerOrg) return false;
          if (e.roleKey === 'employer_tech') return true;
          if (e.action === 'APPROVE' || e.action === 'SIGN' || e.action === 'REPORT_SIGNATURE') {
            if (title.includes('سرپرست واحد') || title.includes('مدیر گروه') || title.includes('مدیر طرح') || title.includes('نماینده') || title.includes('سرپرست کارگاه') || title.includes('مدیر پروژه') || title.includes('رئیس اداره') || title.includes('رئیس کارگاه')) return false;
            return title.includes('کارشناس') || title.includes('بررسی') || title.includes('فنی');
          }
          return false;
        }

        if (targetRoleKey === 'employer_head') {
          if (!isEmployerOrg) return false;
          if (e.roleKey === 'employer_head') return true;
          if (e.action === 'APPROVE' || e.action === 'SIGN' || e.action === 'REPORT_SIGNATURE' || e.action === 'FINAL_APPROVE' || e.action === 'RETURN_TO_CONSULTANT' || e.action === 'REASSIGN') {
            if (title.includes('مدیر طرح') || title.includes('نماینده') || title.includes('مدیر پروژه') || title.includes('سرپرست کارگاه') || title.includes('رئیس کارگاه')) return false;
            return title.includes('سرپرست واحد') || title.includes('مدیر گروه') || title.includes('رئیس اداره') || title.includes('سرپرست گروه') || title.includes('مدیر واحد');
          }
          return false;
        }

        if (targetRoleKey === 'employer' || targetRoleKey === 'employer_site') {
          if (!isEmployerOrg) return false;
          if (e.roleKey === 'employer' || e.roleKey === 'employer_site') return true;
          if (e.action === 'FINAL_APPROVE' || e.action === 'APPROVE' || e.action === 'SIGN' || e.action === 'REPORT_SIGNATURE' || e.action === 'RETURN_TO_CONSULTANT' || e.action === 'REASSIGN') {
            if (title.includes('کارشناس') && !title.includes('مدیر') && !title.includes('سرپرست') && !title.includes('نماینده')) return false;
            if (title.includes('سرپرست واحد') || title.includes('مدیر گروه') || title.includes('رئیس اداره')) return false;
            return true;
          }
          return false;
        }

        return false;
      };

      const signedEv = [...history].reverse().find(e => matchEvent(e) && e.signature && e.action !== 'CREATE' && !(e.fromStatus === WorkflowStatus.DRAFT && e.toStatus === WorkflowStatus.DRAFT));
      if (signedEv) return signedEv;
      return null;
    };

    const matchedEv = findEventForRole(roleKey);
    if (matchedEv) {
      const allUsers = SystemAdminService.getUsers();
      const actorUser = allUsers.find(u => u.id === matchedEv.actorUserId || u.fullName === matchedEv.actorName);
      const actorOrg = actorUser?.orgId ? SystemAdminService.getOrganization(actorUser.orgId) : undefined;
      const formalName = actorUser ? formatUserDisplayFormal(actorUser, actorOrg) : (matchedEv.actorName || 'امضاء کننده گزارش');
      
      // Signature must strictly come from matchedEv.signature when explicitly signed/submitted, never auto-injected on draft creation
      const isDraftOrUnsigned = matchedEv.action === 'CREATE' || 
        (matchedEv.fromStatus === WorkflowStatus.DRAFT && matchedEv.toStatus === WorkflowStatus.DRAFT && targetObj?.status === WorkflowStatus.DRAFT) ||
        !matchedEv.signature;
      const sig = isDraftOrUnsigned ? undefined : matchedEv.signature;

      return {
        name: formalName,
        title: matchedEv.actorTitle || actorUser?.jobTitle || 'امضاء الکترونیکی',
        signature: sig,
        date: sig ? new Date(matchedEv.timestamp).toLocaleDateString('fa-IR') : undefined
      };
    }

    if (reportSigs[roleKey]) {
      return {
        name: reportSigs[roleKey].name,
        title: reportSigs[roleKey].title,
        signature: reportSigs[roleKey].signature,
        date: reportSigs[roleKey].date || new Date().toLocaleDateString('fa-IR')
      };
    }

    if (roleKey === 'contractor_tech' || roleKey === 'permit_expert') {
      return { name: 'کارشناس / سرپرست دفتر فنی', title: 'بخش مهندسی و دفتر فنی پیمانکار', signature: undefined, date: undefined };
    }
    if (roleKey === 'contractor_head' || roleKey === 'permit_head') {
      return { name: 'سرپرست واحد فنی', title: 'سرپرست واحد فنی پیمانکار', signature: undefined, date: undefined };
    }
    if (roleKey === 'contractor_site' || roleKey === 'permit_site') {
      return { name: 'سرپرست کارگاه / مدیر پروژه', title: 'سرپرست کارگاه پیمانکار', signature: undefined, date: undefined };
    }
    if (roleKey === 'consultant_tech') {
      return { name: 'کارشناس / ناظر مقیم', title: 'دستگاه نظارت و مشاور', signature: undefined, date: undefined };
    }
    if (roleKey === 'consultant_head') {
      return { name: 'سرپرست واحد نظارت', title: 'دستگاه نظارت و مشاور', signature: undefined, date: undefined };
    }
    if (roleKey === 'consultant' || roleKey === 'permit_consultant' || roleKey === 'consultant_site') {
      return { name: 'سرپرست نظارت / مدیر پروژه مشاور', title: 'دستگاه نظارت و مشاور', signature: undefined, date: undefined };
    }
    if (roleKey === 'employer_tech') {
      return { name: 'کارشناس / بررسی‌کننده', title: 'دستگاه اجرایی و کارفرما', signature: undefined, date: undefined };
    }
    if (roleKey === 'employer_head') {
      return { name: 'سرپرست واحد / مدیر گروه', title: 'دستگاه اجرایی و کارفرما', signature: undefined, date: undefined };
    }
    if (roleKey === 'employer' || roleKey === 'employer_site') {
      return { name: 'مدیر طرح / نماینده کارفرما', title: 'دستگاه اجرایی و کارفرما', signature: undefined, date: undefined };
    }
    return null;
  };

  const renderSigCard = (roleHeader: string, signatory: any) => {
    if (signatory && signatory.signature) {
      return (
        <div className="bg-white border border-stone-300 rounded-lg p-1.5 text-center flex flex-col justify-between min-h-[75px]">
          <div className="font-bold text-[8px] text-stone-900 border-b border-stone-200 pb-0.5 mb-1 truncate" title={roleHeader}>
            {roleHeader}
          </div>
          <div className="h-7 flex items-center justify-center my-0.5">
            <img src={signatory.signature} alt="امضای دیجیتال" className="max-h-6 max-w-full object-contain filter contrast-125" />
          </div>
          <div className="text-[7.5px] font-bold text-stone-800 truncate" title={signatory.name}>
            {signatory.name}
          </div>
          <div className="text-[6.5px] text-emerald-600 font-bold mt-0.5">✓ امضاء معتبر</div>
          <div className="text-[6.5px] text-stone-400 font-mono">{signatory.date || new Date().toLocaleDateString('fa-IR')}</div>
        </div>
      );
    }

    return (
      <div className="bg-white border border-dashed border-stone-300 rounded-lg p-1.5 text-center flex flex-col justify-between min-h-[75px]">
        <div className="font-bold text-[8px] text-stone-900 truncate" title={roleHeader}>{roleHeader}</div>
        {signatory?.name && (
          <div className="text-[7.5px] font-bold text-stone-600 truncate" title={signatory.name}>
            {signatory.name}
          </div>
        )}
        <div className="h-6 flex items-center justify-center text-[7px] text-stone-400 italic">مهر / امضاء</div>
        <div className="border-t border-dashed border-stone-200 pt-0.5 text-[7px] text-stone-400 font-mono">
          {signatory?.date || 'نام و امضاء'}
        </div>
      </div>
    );
  };

  // Official Print Function matching Technical Office standards
  const handlePrintOfficial = (targetClaim?: DelayClaim) => {
    const claim = targetClaim || currentClaim;
    if (!claim) return;

    const title = `گزارش لایحه تاخیرات مجاز - ${claim.claimNumber}`;
    const projectTitle = project?.title || (project as any)?.name || "پروژه در حال اجرا";
    const projectContractor = claim.contractorName || "سازمان پیمانکار";
    const projectConsultant = claim.consultantName || "دستگاه نظارت و مشاور";
    const projectEmployer = claim.employerName || "دستگاه اجرایی و کارفرما";

    const renderPrintSignatureBox = (roleHeader: string, roleKey: string) => {
      const signatory = getRoleSignatory(roleKey, claim);
      if (signatory && signatory.signature) {
        return `
          <div class="sig-box" style="flex: 1 1 0%; min-width: 0; text-align: center; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 4px; padding: 3px 2px; box-sizing: border-box; overflow: hidden;">
            <div style="font-weight: bold; font-size: 8px; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 1px; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${roleHeader}">${roleHeader}</div>
            <div style="height: 30px; display: flex; align-items: center; justify-content: center; margin: 1px 0;">
              <img src="${signatory.signature}" style="max-height: 26px; max-width: 100%; object-fit: contain; filter: contrast(120%);" alt="امضای دیجیتال" />
            </div>
            <div style="font-size: 7.5px; font-weight: bold; color: #1e293b; margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${signatory.name}">${signatory.name}</div>
            <div style="font-size: 6.5px; color: #059669; font-weight: bold; margin-top: 1px;">✓ امضاء معتبر</div>
            <div style="font-size: 6.5px; color: #64748b;">${signatory.date || new Date().toLocaleDateString('fa-IR')}</div>
          </div>
        `;
      }

      const personName = signatory?.name ? `<div style="font-size: 7.5px; font-weight: bold; color: #334155; margin-bottom: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${signatory.name}">${signatory.name}</div>` : '';
      return `
        <div class="sig-box" style="flex: 1 1 0%; min-width: 0; text-align: center; background: #ffffff; border: 1px dashed #cbd5e1; border-radius: 4px; padding: 3px 2px; box-sizing: border-box; overflow: hidden;">
          <p style="font-weight: bold; font-size: 8px; margin: 0 0 1px 0; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${roleHeader}">${roleHeader}</p>
          ${personName}
          <div style="height: 26px; display: flex; align-items: center; justify-content: center; font-size: 7px; color: #94a3b8; font-style: italic;">مهر / امضاء</div>
          <div class="sig-line" style="border-top: 1px dashed #cbd5e1; padding-top: 1px; font-size: 7px; color: #64748b;">نام و امضاء</div>
        </div>
      `;
    };

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const delayRowsHtml = claim.items.map((it, idx) => `
      <tr>
        <td style="padding: 6px; text-align: center; font-weight: bold; border: 1px solid #e2e8f0;">${idx + 1}</td>
        <td style="padding: 6px; font-weight: bold; border: 1px solid #e2e8f0;">
          ${it.title}
          ${it.rootCause ? `<div style="font-size: 9px; color: #64748b; font-weight: normal; margin-top: 2px;">علت ریشه‌ای: ${it.rootCause}</div>` : ''}
        </td>
        <td style="padding: 6px; border: 1px solid #e2e8f0;">${CATEGORY_MAP[it.category]?.label || it.category}</td>
        <td style="padding: 6px; text-align: center; font-family: monospace; border: 1px solid #e2e8f0;">${it.startDate} الی ${it.endDate}</td>
        <td style="padding: 6px; text-align: center; font-weight: bold; border: 1px solid #e2e8f0;">${it.grossDays} روز</td>
        <td style="padding: 6px; text-align: center; font-weight: bold; color: #b45309; border: 1px solid #e2e8f0;">${it.claimedDays} روز</td>
        <td style="padding: 6px; font-size: 9px; border: 1px solid #e2e8f0;">${it.contractClauseRef || '---'}</td>
      </tr>
    `).join('');

    const claimLogos = SystemAdminService.getProjectOrgLogos(project);
    const claimLogoHtml = [
      claimLogos.employerLogo ? `<img src="${claimLogos.employerLogo}" style="height: 40px; max-width: 90px; object-fit: contain;" alt="کارفرما" />` : '',
      claimLogos.consultantLogo ? `<img src="${claimLogos.consultantLogo}" style="height: 40px; max-width: 90px; object-fit: contain;" alt="مشاور" />` : '',
      claimLogos.contractorLogo ? `<img src="${claimLogos.contractorLogo}" style="height: 40px; max-width: 90px; object-fit: contain;" alt="پیمانکار" />` : ''
    ].filter(Boolean).join('');

    printWindow.document.write(`
      <html dir="rtl">
        <head>
          <title>${title}</title>
          <style>
            @font-face { font-family: 'Vazir'; src: url('https://cdn.jsdelivr.net/gh/rastikerdar/vazir-font@v30.1.0/dist/Vazir.woff2'); }
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; box-sizing: border-box; }
            body { font-family: 'Vazir', Tahoma, sans-serif; padding: 15px; color: #1e293b; line-height: 1.4; background: #fff; width: 100%; margin: 0; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #1e40af; padding-bottom: 10px; margin-bottom: 15px; }
            .logo-section { display: flex; align-items: center; gap: 10px; }
            .logo-box { width: 36px; height: 36px; background: #1e40af; border-radius: 6px; }
            .content { min-height: 450px; }
            .info-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 11px; }
            .info-table td { padding: 6px 10px; border: 1px solid #cbd5e1; background: #f8fafc; }
            .info-table td strong { color: #0f172a; }
            .table-delays { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 10.5px; }
            .table-delays th { background: #f1f5f9; color: #1e293b; padding: 8px; border: 1px solid #cbd5e1; font-weight: bold; }
            .summary-box { display: flex; justify-content: space-between; gap: 10px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 12px; margin-bottom: 15px; text-align: center; }
            .footer { margin-top: 20px; border-top: 2px solid #64748b; padding-top: 10px; width: 100%; page-break-inside: avoid; break-inside: avoid; }
            .sig-box { text-align: center; }
            @media print { 
               .no-print { display: none; } 
               body { padding: 5mm; margin: 0; width: 100%; } 
               @page { size: A4; margin: 8mm; } 
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo-section">
              ${claimLogoHtml || '<div class="logo-box"></div>'}
              <div>
                <h1 style="margin: 0; color: #1e40af; font-size: 18px; font-weight: 900;">سامانه مدیریت پروژه همیار</h1>
                <div style="font-size: 11px; color: #475569; font-weight: bold; margin-top: 2px;">
                  گزارش رسمی لایحه ادعای تمدید مدت پیمان و تاخیرات مجاز
                </div>
              </div>
            </div>
            <div style="text-align: left; font-size: 11px;">
              <p style="margin: 0; font-weight: bold;">شماره لایحه: ${claim.claimNumber}</p>
              <p style="margin: 2px 0 0 0;">تاریخ صدور: ${claim.claimDate}</p>
              <p style="margin: 2px 0 0 0;">وضعیت: ${WorkflowService.getStatusLabel(claim.status)}</p>
            </div>
          </div>

          <div class="content">
            <table class="info-table">
              <tr>
                <td><strong>عنوان پروژه:</strong> ${projectTitle}</td>
                <td><strong>بازه وقوع تاخیرات:</strong> ${claim.targetPeriodStart} الی ${claim.targetPeriodEnd}</td>
              </tr>
              <tr>
                <td><strong>پیمانکار مجری:</strong> ${projectContractor}</td>
                <td><strong>مهندسین مشاور:</strong> ${projectConsultant}</td>
              </tr>
              <tr>
                <td><strong>دستگاه اجرایی / کارفرما:</strong> ${projectEmployer}</td>
                <td><strong>تعداد ردیف‌های تاخیر:</strong> ${claim.items.length} ردیف</td>
              </tr>
            </table>

            ${claim.introduction ? `
              <div style="margin-bottom: 15px;">
                <h3 style="font-size: 12px; font-weight: bold; color: #0f172a; margin: 0 0 5px 0; border-right: 3px solid #f59e0b; padding-right: 6px;">
                  ۱. مقدمه و مبانی قانونی ادعا
                </h3>
                <p style="font-size: 10.5px; text-align: justify; color: #334155; margin: 0; line-height: 1.6;">
                  ${claim.introduction}
                </p>
              </div>
            ` : ''}

            <div style="margin-bottom: 15px;">
              <h3 style="font-size: 12px; font-weight: bold; color: #0f172a; margin: 0 0 8px 0; border-right: 3px solid #f59e0b; padding-right: 6px;">
                ۲. جدول تفکیکی رویدادها، موانع و تاخیرات مستند حادث شده
              </h3>
              <table class="table-delays">
                <thead>
                  <tr>
                    <th style="width: 30px;">ردیف</th>
                    <th>عنوان تاخیر / مانع کارگاهی</th>
                    <th>دسته‌بندی</th>
                    <th>بازه زمانی</th>
                    <th>روز ناخالص</th>
                    <th>روز ادعایی</th>
                    <th>مستند / ماده قانونی</th>
                  </tr>
                </thead>
                <tbody>
                  ${delayRowsHtml || '<tr><td colspan="7" style="text-align: center; padding: 10px;">ردیفی ثبت نشده است.</td></tr>'}
                </tbody>
              </table>
            </div>

            <div style="margin-bottom: 15px;">
              <h3 style="font-size: 12px; font-weight: bold; color: #0f172a; margin: 0 0 8px 0; border-right: 3px solid #f59e0b; padding-right: 6px;">
                ۳. تحلیل همپوشانی بازه‌های زمانی و محاسبه خالص تاخیرات مجاز
              </h3>
              <div class="summary-box">
                <div style="flex: 1;">
                  <span style="font-size: 10px; color: #64748b; display: block;">مجموع ناخالص تاخیرات</span>
                  <span style="font-size: 16px; font-weight: 900; color: #0f172a;">${claim.totalGrossDays} روز</span>
                </div>
                <div style="flex: 1;">
                  <span style="font-size: 10px; color: #e11d48; display: block;">کسر همپوشانی بازه‌ها</span>
                  <span style="font-size: 16px; font-weight: 900; color: #e11d48;">-${claim.totalOverlapDays} روز</span>
                </div>
                <div style="flex: 1;">
                  <span style="font-size: 10px; color: #047857; font-weight: bold; display: block;">خالص تمدید مجاز درخواستی (Net EOT)</span>
                  <span style="font-size: 16px; font-weight: 900; color: #047857;">${claim.totalNetJustifiedDays} روز تقویمی</span>
                </div>
              </div>
            </div>

            ${claim.conclusion ? `
              <div style="margin-bottom: 15px;">
                <h3 style="font-size: 12px; font-weight: bold; color: #0f172a; margin: 0 0 5px 0; border-right: 3px solid #f59e0b; padding-right: 6px;">
                  ۴. جمع‌بندی و نتیجه‌گیری نهایی
                </h3>
                <p style="font-size: 10.5px; text-align: justify; color: #334155; margin: 0; line-height: 1.6;">
                  ${claim.conclusion}
                </p>
              </div>
            ` : ''}
          </div>

          <div class="footer">
            <div style="display: flex; flex-direction: row; justify-content: space-between; gap: 6px; width: 100%; box-sizing: border-box;">
              <!-- 1. پیمانکار -->
              <div style="flex: 1 1 0%; min-width: 0; border: 1px solid #93c5fd; background: #eff6ff; border-radius: 6px; padding: 4px; box-sizing: border-box;">
                <div style="font-weight: bold; font-size: 9px; color: #1e40af; text-align: center; border-bottom: 1px solid #bfdbfe; padding-bottom: 2px; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  پیمانکار: ${projectContractor}
                </div>
                <div style="display: flex; flex-direction: row; gap: 3px; width: 100%;">
                  ${renderPrintSignatureBox("کارشناس / تنظیم‌کننده", "contractor_tech")}
                  ${renderPrintSignatureBox("سرپرست واحد فنی", "contractor_head")}
                  ${renderPrintSignatureBox("سرپرست کارگاه / مدیر پروژه", "contractor_site")}
                </div>
              </div>

              <!-- 2. دستگاه نظارت و مشاور -->
              <div style="flex: 1 1 0%; min-width: 0; border: 1px solid #6ee7b7; background: #ecfdf5; border-radius: 6px; padding: 4px; box-sizing: border-box;">
                <div style="font-weight: bold; font-size: 9px; color: #065f46; text-align: center; border-bottom: 1px solid #a7f3d0; padding-bottom: 2px; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  مشاور: ${projectConsultant}
                </div>
                <div style="display: flex; flex-direction: row; gap: 3px; width: 100%;">
                  ${renderPrintSignatureBox("کارشناس / ناظر مقیم", "consultant_tech")}
                  ${renderPrintSignatureBox("سرپرست واحد نظارت", "consultant_head")}
                  ${renderPrintSignatureBox("سرپرست نظارت / مدیر پروژه", "consultant")}
                </div>
              </div>

              <!-- 3. دستگاه اجرایی و کارفرما -->
              <div style="flex: 1 1 0%; min-width: 0; border: 1px solid #d8b4fe; background: #faf5ff; border-radius: 6px; padding: 4px; box-sizing: border-box;">
                <div style="font-weight: bold; font-size: 9px; color: #6b21a8; text-align: center; border-bottom: 1px solid #e9d5ff; padding-bottom: 2px; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  کارفرما: ${projectEmployer}
                </div>
                <div style="display: flex; flex-direction: row; gap: 3px; width: 100%;">
                  ${renderPrintSignatureBox("کارشناس / بررسی‌کننده", "employer_tech")}
                  ${renderPrintSignatureBox("سرپرست واحد / مدیر گروه", "employer_head")}
                  ${renderPrintSignatureBox("مدیر طرح / نماینده کارفرما", "employer")}
                </div>
              </div>
            </div>
          </div>

          <script>
            window.onload = () => {
              setTimeout(() => {
                window.print();
              }, 300);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* 1. LIST VIEW OF ALL CLAIMS */}
      {/* ========================================================================= */}
      {viewMode === 'list' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Header Action Card */}
          <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 lg:p-8 border border-[#ece5d8] dark:border-stone-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <ShieldAlert size={22} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-stone-900 dark:text-stone-100 flex items-center gap-2">
                    مدیریت لوایح تاخیرات و ادعای تمدید مدت پیمان (EOT Claim Engine)
                  </h2>
                  <p className="text-xs text-stone-500 dark:text-slate-400">
                    تدوین لوایح استاندارد، استناد به بخشنامه ۵۰۹۰ و گزارشات روزانه، گردش کار، امضای الکترونیک و صدور گزارش رسمی
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={handleCreateNewClaim}
              className="px-5 py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-2xl font-black text-xs transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2"
            >
              <Plus size={18} />
              ایجاد لایحه تاخیرات جدید (New EOT)
            </button>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-stone-900 p-5 rounded-3xl border border-[#ece5d8] dark:border-stone-800 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-500 dark:text-stone-400">تعداد لوایح تاخیرات</span>
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
                  <FileText size={18} />
                </div>
              </div>
              <p className="text-2xl font-black text-stone-900 dark:text-stone-100 mt-2">
                {projectClaims.length} <span className="text-xs font-normal text-stone-400">فقره لایحه</span>
              </p>
            </div>

            <div className="bg-white dark:bg-stone-900 p-5 rounded-3xl border border-[#ece5d8] dark:border-stone-800 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-500 dark:text-stone-400">مجموع ناخالص روزهای ادعایی</span>
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600">
                  <Clock size={18} />
                </div>
              </div>
              <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-2">
                {projectClaims.reduce((s, c) => s + (c.totalGrossDays || 0), 0)}{' '}
                <span className="text-xs font-normal text-stone-400">روز ناخالص</span>
              </p>
            </div>

            <div className="bg-white dark:bg-stone-900 p-5 rounded-3xl border border-[#ece5d8] dark:border-stone-800 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-500 dark:text-stone-400">کسر همپوشانی زمانی</span>
                <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600">
                  <Layers size={18} />
                </div>
              </div>
              <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-2">
                {projectClaims.reduce((s, c) => s + (c.totalOverlapDays || 0), 0)}{' '}
                <span className="text-xs font-normal text-stone-400">روز همپوشان</span>
              </p>
            </div>

            <div className="bg-white dark:bg-stone-900 p-5 rounded-3xl border border-emerald-200 dark:border-emerald-900/60 shadow-sm bg-gradient-to-br from-emerald-500/5 to-transparent">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                  خالص تمدید مجاز درخواستی (Net EOT)
                </span>
                <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-600">
                  <CheckCircle2 size={18} />
                </div>
              </div>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
                {projectClaims.reduce((s, c) => s + (c.totalNetJustifiedDays || 0), 0)}{' '}
                <span className="text-xs font-normal text-stone-400">روز خالص مجاز</span>
              </p>
            </div>
          </div>

          {/* Claims List Table with Per-Row Workflow and Operation Buttons */}
          <div className="bg-white dark:bg-stone-900 rounded-3xl border border-[#ece5d8] dark:border-stone-800 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-[#ece5d8] dark:border-stone-800 flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search size={16} className="absolute right-3.5 top-3.5 text-stone-400" />
                <input
                  type="text"
                  placeholder="جستجو در عناوین و شماره لوایح..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pr-10 pl-4 py-2.5 bg-stone-50 dark:bg-stone-800 border border-[#ece5d8] dark:border-stone-700 rounded-2xl text-xs outline-none focus:border-amber-500"
                />
              </div>
              <span className="text-xs font-bold text-stone-400">{filteredClaims.length} لایحه ثبت شده</span>
            </div>

            {filteredClaims.length === 0 ? (
              <div className="p-12 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
                  <FileText size={32} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-black text-stone-800 dark:text-stone-200">
                    هنوز لایحه تاخیراتی برای این پروژه تدوین نشده است
                  </h4>
                  <p className="text-xs text-stone-500 dark:text-stone-400 max-w-md mx-auto">
                    می‌توانید با کلیک بر روی دکمه "ایجاد لایحه تاخیرات جدید"، اولین ادعای تمدید مدت پیمان را تدوین نمایید.
                  </p>
                </div>
                <button
                  onClick={handleCreateNewClaim}
                  className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-amber-500/20"
                >
                  ایجاد اولین لایحه
                </button>
              </div>
            ) : (
              <div className="divide-y divide-[#ece5d8] dark:divide-stone-800">
                {filteredClaims.map(claim => {
                  const availableActions = currentUser
                    ? WorkflowService.getAvailableActions(claim, currentUser, userOrgType)
                    : [];
                  const isEditable = canUserEditClaim(claim);

                  return (
                    <div
                      key={claim.id}
                      onClick={() => {
                        setCurrentClaim(claim);
                        setActiveClaimId(claim.id);
                        setViewMode('editor');
                      }}
                      className="p-5 hover:bg-stone-50/80 dark:hover:bg-stone-800/40 transition-all cursor-pointer flex flex-col xl:flex-row xl:items-center justify-between gap-4"
                    >
                      {/* Left info */}
                      <div className="flex items-start gap-4 flex-1">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center flex-shrink-0">
                          <FileSpreadsheet size={24} />
                        </div>
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-black text-xs px-2.5 py-1 bg-stone-100 dark:bg-stone-800 rounded-lg text-stone-700 dark:text-stone-300">
                              {claim.claimNumber}
                            </span>
                            <h3 className="text-sm font-black text-stone-900 dark:text-stone-100">{claim.title}</h3>
                            
                            {/* Workflow Status Badge */}
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${WorkflowService.getStatusStyle(
                                claim.status
                              )}`}
                            >
                              {WorkflowService.getStatusLabel(claim.status)}
                            </span>

                            {claim.isFinalFrozen && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-stone-900 text-amber-300 flex items-center gap-1">
                                <Lock size={10} />
                                تایید نهایی و قفل شده
                              </span>
                            )}

                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300">
                              {claim.items.length} ردیف تاخیر
                            </span>
                          </div>

                          <p className="text-xs text-stone-500 dark:text-stone-400 line-clamp-1">{claim.periodTitle}</p>
                          
                          <div className="flex items-center gap-4 text-[11px] text-stone-400 pt-1 flex-wrap">
                            <span>تاریخ تهیه: {claim.claimDate}</span>
                            <span>•</span>
                            <span>بازه بررسی: {claim.targetPeriodStart} الی {claim.targetPeriodEnd}</span>
                            {claim.currentOrgId && (
                              <>
                                <span>•</span>
                                <span className="text-stone-600 dark:text-stone-300 font-medium">
                                  کارتابل فعلی: {organizations.find(o => o.id === claim.currentOrgId)?.name || 'سازمان مربوطه'}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right summary and actions */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 xl:gap-6 self-stretch xl:self-center justify-between xl:justify-end border-t xl:border-t-0 pt-3 xl:pt-0 border-stone-200 dark:border-stone-800">
                        {/* Days Summary */}
                        <div className="text-right sm:text-left min-w-[120px]">
                          <div className="text-[11px] text-stone-400">ناخالص: {claim.totalGrossDays} روز</div>
                          <div className="text-[11px] text-rose-500">همپوشانی: -{claim.totalOverlapDays} روز</div>
                          <div className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                            خالص مجاز: {claim.totalNetJustifiedDays} روز
                          </div>
                        </div>

                        {/* Standard Workflow Action Buttons for this row */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {availableActions.map(action => (
                            <button
                              key={action}
                              onClick={e => handleOpenWorkflowModal(claim, action, e)}
                              className={`px-3 py-1.5 rounded-xl font-black text-[11px] transition-all flex items-center gap-1 shadow-sm ${WorkflowService.getActionStyle(
                                action
                              )}`}
                            >
                              {WorkflowService.getActionLabel(action, userOrgType)}
                            </button>
                          ))}

                          {/* Workflow History Button */}
                          <button
                            onClick={e => handleOpenHistoryModal(claim, e)}
                            title="تاریخچه تغییرات"
                            className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 transition-all"
                          >
                            <ScrollText size={16} />
                          </button>

                          {/* Print/Preview Official Document */}
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              handlePrintOfficial(claim);
                            }}
                            title="چاپ لایحه رسمی"
                            className="p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 transition-all"
                          >
                            <Printer size={16} />
                          </button>

                          {/* Edit Claim (ONLY if editable) */}
                          {isEditable && (
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                setCurrentClaim(claim);
                                setActiveClaimId(claim.id);
                                setViewMode('editor');
                              }}
                              title="ویرایش لایحه"
                              className="p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 transition-all"
                            >
                              <Edit3 size={16} />
                            </button>
                          )}

                          {/* Delete Claim */}
                          {canUserDeleteThisClaim(claim) && (
                            <button
                              onClick={e => handleOpenDeleteClaimModal(claim, e)}
                              title="حذف لایحه"
                              className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 transition-all"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. CLAIM EDITOR VIEW */}
      {/* ========================================================================= */}
      {viewMode === 'editor' && currentClaim && (
        <div className="space-y-6 animate-fadeIn">
          {/* Top Navigation & Workflow Action Bar */}
          <div className="bg-white dark:bg-stone-900 rounded-3xl p-5 border border-[#ece5d8] dark:border-stone-800 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setViewMode('list')}
                className="p-2 rounded-2xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 transition-all"
              >
                <ArrowRight size={20} />
              </button>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-black text-xs px-2.5 py-0.5 bg-amber-500/10 text-amber-600 rounded-lg">
                    {currentClaim.claimNumber}
                  </span>
                  <h2 className="text-base font-black text-stone-900 dark:text-stone-100">{currentClaim.title}</h2>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${WorkflowService.getStatusStyle(
                      currentClaim.status
                    )}`}
                  >
                    {WorkflowService.getStatusLabel(currentClaim.status)}
                  </span>
                  {currentClaim.isFinalFrozen && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-stone-900 text-amber-300 flex items-center gap-1">
                      <Lock size={10} />
                      قفل نهایی
                    </span>
                  )}
                </div>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                  ویرایشگر جامع لایحه تاخیرات • محاسبه لحظه‌ای همپوشانی و گردش کار تاییدات
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Workflow Actions for Active Claim */}
              {currentUser &&
                WorkflowService.getAvailableActions(currentClaim, currentUser, userOrgType).map(action => (
                  <button
                    key={action}
                    onClick={e => handleOpenWorkflowModal(currentClaim, action, e)}
                    className={`px-3.5 py-2.5 rounded-xl font-black text-xs transition-all flex items-center gap-1.5 shadow-sm ${WorkflowService.getActionStyle(
                      action
                    )}`}
                  >
                    {WorkflowService.getActionLabel(action, userOrgType)}
                  </button>
                ))}

              <button
                onClick={e => handleOpenHistoryModal(currentClaim, e)}
                className="px-3 py-2.5 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5"
                title="تاریخچه تغییرات"
              >
                <ScrollText size={15} />
                تاریخچه
              </button>

              {canUserDeleteThisClaim(currentClaim) && (
                <button
                  onClick={e => handleOpenDeleteClaimModal(currentClaim, e)}
                  title="حذف لایحه"
                  className="px-3 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 dark:text-rose-400 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 border border-rose-200 dark:border-rose-800/60"
                >
                  <Trash2 size={15} />
                  حذف لایحه
                </button>
              )}

              {canUserEditClaim(currentClaim) && (
                <>
                  <button
                    onClick={handleImportDailyObstacles}
                    className="px-3.5 py-2.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-xl font-black text-xs transition-all flex items-center gap-1.5 border border-blue-200 dark:border-blue-800"
                  >
                    <RefreshCw size={15} />
                    بازخوانی از گزارشات روزانه
                  </button>

                  <button
                    onClick={() => setIs5090ModalOpen(true)}
                    className="px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 rounded-xl font-black text-xs transition-all flex items-center gap-1.5 border border-emerald-200 dark:border-emerald-800"
                  >
                    <Calculator size={15} />
                    محاسبه‌گر بخشنامه ۵۰۹۰
                  </button>

                  <button
                    onClick={() => handleOpenItemEditor()}
                    className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-black text-xs transition-all shadow-md shadow-amber-500/20 flex items-center gap-1.5"
                  >
                    <Plus size={16} />
                    ثبت ردیف تاخیر جدید
                  </button>
                </>
              )}

              <button
                onClick={() => handlePrintOfficial(currentClaim)}
                className="px-4 py-2.5 bg-stone-900 hover:bg-black dark:bg-stone-100 dark:hover:bg-white text-white dark:text-stone-900 rounded-xl font-black text-xs transition-all flex items-center gap-1.5"
              >
                <Printer size={16} />
                چاپ و صدور رسمی
              </button>
            </div>
          </div>

          {/* Mathematical Overlap Calculation Box (Core Engine) */}
          <div className="bg-gradient-to-br from-stone-900 via-stone-800 to-amber-950 text-white rounded-3xl p-6 lg:p-8 shadow-xl relative overflow-hidden">
            <div className="relative z-10 space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                  <span className="text-[11px] font-black tracking-wider uppercase text-amber-400">
                    موتور تحلیل همپوشانی و ادغام بازه‌های زمانی (Overlap & Net Union Calculation)
                  </span>
                  <h3 className="text-lg font-black text-white mt-1">
                    خلاصه محاسبات زمانی و نتایج تمدید مدت پیمان
                  </h3>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs bg-white/10 px-3 py-1.5 rounded-xl font-mono text-amber-200">
                    تاریخ پایان اولیه: {currentClaim.contractSummary?.initialEndDate || project.endDate}
                  </span>
                  <span className="text-xs bg-amber-500/30 text-amber-300 px-3 py-1.5 rounded-xl font-mono font-black">
                    تاریخ تمدید شده جدید: {currentClaim.requestedNewEndDate}
                  </span>
                </div>
              </div>

              {/* Numerical Calculation Breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                  <span className="text-[11px] text-stone-300 block font-medium">مجموع ناخالص ادعایی</span>
                  <span className="text-2xl font-black text-white mt-1 block">
                    {currentClaim.totalGrossDays}{' '}
                    <span className="text-xs font-normal text-stone-400">روز تقویمی</span>
                  </span>
                  <span className="text-[10px] text-stone-400 mt-1 block">مجموع جبری کلیه ردیف‌ها</span>
                </div>

                <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4">
                  <span className="text-[11px] text-rose-300 block font-medium">کسر همپوشانی (تلاقی زمانی)</span>
                  <span className="text-2xl font-black text-rose-400 mt-1 block">
                    -{currentClaim.totalOverlapDays}{' '}
                    <span className="text-xs font-normal text-rose-200">روز مشترک</span>
                  </span>
                  <span className="text-[10px] text-rose-300/70 mt-1 block">حذف روزهای تکراری بازه‌ها</span>
                </div>

                <div className="bg-emerald-500/20 border border-emerald-500/40 rounded-2xl p-4">
                  <span className="text-[11px] text-emerald-300 block font-medium">خالص تاخیرات مجاز (Net EOT)</span>
                  <span className="text-2xl font-black text-emerald-400 mt-1 block">
                    {currentClaim.totalNetJustifiedDays}{' '}
                    <span className="text-xs font-normal text-emerald-200">روز خالص</span>
                  </span>
                  <span className="text-[10px] text-emerald-300/80 mt-1 block">قابل اعمال در الحاقیه زمانی</span>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                  <span className="text-[11px] text-stone-300 block font-medium">تاخیرات غیرمجاز</span>
                  <span className="text-2xl font-black text-amber-400 mt-1 block">
                    {currentClaim.totalUnjustifiedDays}{' '}
                    <span className="text-xs font-normal text-stone-400">روز</span>
                  </span>
                  <span className="text-[10px] text-stone-400 mt-1 block">فاقد استناد موجه قراردادی</span>
                </div>
              </div>
            </div>
          </div>

          {/* Delay Claim Items Table with Operations for each row */}
          <div className="bg-white dark:bg-stone-900 rounded-3xl border border-[#ece5d8] dark:border-stone-800 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-[#ece5d8] dark:border-stone-800 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <Layers size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-stone-900 dark:text-stone-100">
                    جدول تفکیکی رویدادها و ردیف‌های تاخیر ({currentClaim.items.length} ردیف ثبت شده)
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    مدیریت، ویرایش، تکثیر و مستندسازی ردیف‌های تاخیرات به تفکیک دسته‌بندی
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  disabled={!canUserEditClaim(currentClaim)}
                  onClick={() => handleOpenItemEditor()}
                  className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white rounded-xl font-black text-xs transition-all shadow-md shadow-amber-500/20 flex items-center gap-1.5"
                >
                  <Plus size={16} />
                  افزودن ردیف تاخیر
                </button>
              </div>
            </div>

            {currentClaim.items.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-400 flex items-center justify-center mx-auto">
                  <Clock size={24} />
                </div>
                <p className="text-xs font-bold text-stone-600 dark:text-stone-400">
                  هنوز ردیف تاخیری به این لایحه افزوده نشده است.
                </p>
                <div className="flex justify-center gap-3 pt-2">
                  <button
                    disabled={!canUserEditClaim(currentClaim)}
                    onClick={() => handleOpenItemEditor()}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-40"
                  >
                    ثبت اولین رویداد
                  </button>
                  <button
                    disabled={!canUserEditClaim(currentClaim)}
                    onClick={handleImportDailyObstacles}
                    className="px-4 py-2 bg-blue-50 text-blue-600 border border-blue-200 rounded-xl text-xs font-bold transition-all disabled:opacity-40"
                  >
                    بازخوانی از گزارشات روزانه
                  </button>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-stone-50 dark:bg-stone-800/60 text-stone-700 dark:text-stone-300 font-black border-b border-[#ece5d8] dark:border-stone-800">
                    <tr>
                      <th className="p-3.5 text-center w-10">ردیف</th>
                      <th className="p-3.5">عنوان رویداد تاخیر</th>
                      <th className="p-3.5">دسته‌بندی موضوعی</th>
                      <th className="p-3.5 text-center">بازه زمانی وقوع</th>
                      <th className="p-3.5 text-center">روز ناخالص</th>
                      <th className="p-3.5 text-center">روز ادعایی</th>
                      <th className="p-3.5">استناد قراردادی / مستندات</th>
                      <th className="p-3.5 text-center">عملیات ردیف</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ece5d8] dark:divide-stone-800">
                    {currentClaim.items.map((it, idx) => {
                      const catInfo = CATEGORY_MAP[it.category] || CATEGORY_MAP['TECHNICAL'];
                      const Icon = catInfo.icon;
                      const isEditable = canUserEditClaim(currentClaim);

                      return (
                        <tr key={it.id} className="hover:bg-stone-50/60 dark:hover:bg-stone-800/30 transition-all">
                          <td className="p-3.5 text-center font-bold text-stone-400">{idx + 1}</td>
                          <td className="p-3.5 font-bold text-stone-900 dark:text-stone-100">
                            <div>{it.title}</div>
                            {it.rootCause && (
                              <div className="text-[11px] font-normal text-stone-400 line-clamp-1 mt-0.5">
                                علت ریشه‌ای: {it.rootCause}
                              </div>
                            )}
                          </td>
                          <td className="p-3.5">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold border ${catInfo.bg} ${catInfo.color} ${catInfo.border}`}
                            >
                              <Icon size={13} />
                              {catInfo.label}
                            </span>
                          </td>
                          <td className="p-3.5 text-center font-mono text-[11px]">
                            {it.startDate} الی {it.endDate}
                          </td>
                          <td className="p-3.5 text-center font-bold text-stone-700 dark:text-stone-300">
                            {it.grossDays} روز
                          </td>
                          <td className="p-3.5 text-center font-black text-amber-600 dark:text-amber-400">
                            {it.claimedDays} روز
                          </td>
                          <td className="p-3.5 text-[11px] text-stone-500 dark:text-stone-400 max-w-xs">
                            <div className="line-clamp-1">{it.contractClauseRef}</div>
                            {it.attachedDocumentRefs && it.attachedDocumentRefs.length > 0 && (
                              <div className="text-[10px] text-blue-600 dark:text-blue-400 mt-0.5 line-clamp-1">
                                پیوست: {it.attachedDocumentRefs.join('، ')}
                              </div>
                            )}
                          </td>
                          <td className="p-3.5 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                disabled={!isEditable}
                                onClick={() => handleOpenItemEditor(it)}
                                title="ویرایش ردیف"
                                className="p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 disabled:opacity-30 transition-all"
                              >
                                <Edit3 size={14} />
                              </button>
                              <button
                                disabled={!isEditable}
                                onClick={e => handleDuplicateItem(it, e)}
                                title="کپی و تکثیر ردیف"
                                className="p-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 disabled:opacity-30 transition-all"
                              >
                                <Copy size={14} />
                              </button>
                              <button
                                disabled={!isEditable}
                                onClick={e => handleOpenDeleteItemModal(it.id, e)}
                                title="حذف ردیف"
                                className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 disabled:opacity-30 transition-all"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. OFFICIAL PRINT / PDF PREVIEW WITH 4-BOX STANDARD SIGNATURES */}
      {/* ========================================================================= */}
      {viewMode === 'preview' && currentClaim && (
        <div className="space-y-6 animate-fadeIn">
          {/* Preview Navigation & Actions */}
          <div className="bg-white dark:bg-stone-900 rounded-3xl p-5 border border-[#ece5d8] dark:border-stone-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setViewMode('editor')}
                className="p-2 rounded-2xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 transition-all"
              >
                <ArrowRight size={20} />
              </button>
              <div>
                <h2 className="text-base font-black text-stone-900 dark:text-stone-100">
                  پیش‌نمایش سند رسمی لایحه تاخیرات
                </h2>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  فرمت استاندارد گزارش مهندسی دفتر فنی جهت ارائه به دستگاه نظارت و کارفرما
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {currentUser &&
                WorkflowService.getAvailableActions(currentClaim, currentUser, userOrgType).map(action => (
                  <button
                    key={action}
                    onClick={e => handleOpenWorkflowModal(currentClaim, action, e)}
                    className={`px-3.5 py-2 rounded-xl font-black text-xs transition-all flex items-center gap-1.5 shadow-sm ${WorkflowService.getActionStyle(
                      action
                    )}`}
                  >
                    {WorkflowService.getActionLabel(action, userOrgType)}
                  </button>
                ))}

              <button
                onClick={e => handleOpenHistoryModal(currentClaim, e)}
                className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5"
                title="تاریخچه تغییرات"
              >
                <ScrollText size={15} />
                تاریخچه
              </button>

              <button
                onClick={() => handlePrintOfficial(currentClaim)}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-black text-xs transition-all shadow-md shadow-amber-500/20 flex items-center gap-2"
              >
                <Printer size={16} />
                چاپ رسمی (Print / PDF)
              </button>
            </div>
          </div>

          {/* Printable Report Document */}
          <div className="bg-white text-stone-900 p-8 sm:p-12 rounded-3xl border border-stone-300 shadow-xl max-w-5xl mx-auto space-y-8 print:border-none print:shadow-none print:p-0">
            {/* Report Header */}
            <div className="border-b-2 border-stone-800 pb-5 flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-xs font-bold text-stone-500">جمهوری اسلامی ایران</div>
                <h1 className="text-lg font-black text-stone-900">
                  لایحه ادعای تمدید مدت پیمان و تاخیرات مجاز (Extension of Time Claim)
                </h1>
                <div className="text-xs text-stone-600 font-bold">
                  پروژه: {project.title || (project as any).name} • شماره قرارداد: {currentClaim.contractSummary?.contractNumber || project.contractNumber || (project as any).code}
                </div>
              </div>

              <div className="text-left space-y-1 text-xs font-mono">
                <div>شماره لایحه: <span className="font-bold">{currentClaim.claimNumber}</span></div>
                <div>تاریخ گزارش: <span className="font-bold">{currentClaim.claimDate}</span></div>
                <div>وضعیت سند: <span className="font-bold">{WorkflowService.getStatusLabel(currentClaim.status)}</span></div>
              </div>
            </div>

            {/* Contract Specification Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-stone-50 border border-stone-300 rounded-2xl text-xs">
              <div>
                <span className="text-stone-500 block text-[11px]">پیمانکار مجری:</span>
                <span className="font-bold text-stone-800">{currentClaim.contractorName}</span>
              </div>
              <div>
                <span className="text-stone-500 block text-[11px]">مهندسین مشاور:</span>
                <span className="font-bold text-stone-800">{currentClaim.consultantName}</span>
              </div>
              <div>
                <span className="text-stone-500 block text-[11px]">کارفرمای محترم:</span>
                <span className="font-bold text-stone-800">{currentClaim.employerName}</span>
              </div>
              <div>
                <span className="text-stone-500 block text-[11px]">بازه وقوع تاخیرات:</span>
                <span className="font-bold text-stone-800 font-mono">
                  {currentClaim.targetPeriodStart} الی {currentClaim.targetPeriodEnd}
                </span>
              </div>
            </div>

            {/* Narrative 1: Introduction */}
            <div className="space-y-2">
              <h3 className="text-sm font-black text-stone-900 border-r-4 border-amber-500 pr-3">
                ۱. مقدمه و مبانی قانونی ادعا
              </h3>
              <p className="text-xs leading-relaxed text-stone-700 text-justify">
                {currentClaim.introduction}
              </p>
            </div>

            {/* Table of Delays */}
            <div className="space-y-3">
              <h3 className="text-sm font-black text-stone-900 border-r-4 border-amber-500 pr-3">
                ۲. جدول تفکیکی رویدادها، موانع و تاخیرات مستند حادث شده
              </h3>
              <div className="border border-stone-300 rounded-xl overflow-hidden">
                <table className="w-full text-right text-[11px]">
                  <thead className="bg-stone-100 text-stone-800 font-bold border-b border-stone-300">
                    <tr>
                      <th className="p-2.5 text-center w-8">ردیف</th>
                      <th className="p-2.5">عنوان تاخیر / مانع کارگاهی</th>
                      <th className="p-2.5">دسته‌بندی</th>
                      <th className="p-2.5 text-center">بازه زمانی</th>
                      <th className="p-2.5 text-center">روز ناخالص</th>
                      <th className="p-2.5 text-center">روز ادعایی</th>
                      <th className="p-2.5">مستند / ماده قانونی</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200">
                    {currentClaim.items.map((it, idx) => (
                      <tr key={it.id}>
                        <td className="p-2.5 text-center font-bold">{idx + 1}</td>
                        <td className="p-2.5 font-bold">
                          {it.title}
                          {it.rootCause && (
                            <div className="text-[10px] text-stone-500 font-normal mt-0.5">
                              علت: {it.rootCause}
                            </div>
                          )}
                        </td>
                        <td className="p-2.5">{CATEGORY_MAP[it.category]?.label || it.category}</td>
                        <td className="p-2.5 text-center font-mono">{it.startDate} الی {it.endDate}</td>
                        <td className="p-2.5 text-center font-bold">{it.grossDays}</td>
                        <td className="p-2.5 text-center font-bold text-amber-700">{it.claimedDays}</td>
                        <td className="p-2.5 text-[10px]">{it.contractClauseRef}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Overlap and Net Calculation Matrix */}
            <div className="space-y-3">
              <h3 className="text-sm font-black text-stone-900 border-r-4 border-amber-500 pr-3">
                ۳. تحلیل همپوشانی بازه‌های زمانی و محاسبه خالص تاخیرات مجاز
              </h3>
              <div className="grid grid-cols-3 gap-4 p-4 bg-amber-50/50 border border-amber-200 rounded-2xl text-center">
                <div>
                  <span className="text-[11px] text-stone-500 block">مجموع ناخالص تاخیرات</span>
                  <span className="text-xl font-black text-stone-900 mt-1 block">
                    {currentClaim.totalGrossDays} روز
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-rose-600 block">کسر همپوشانی بازه‌ها</span>
                  <span className="text-xl font-black text-rose-600 mt-1 block">
                    -{currentClaim.totalOverlapDays} روز
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-emerald-700 font-bold block">
                    خالص تمدید مجاز درخواستی (Net EOT)
                  </span>
                  <span className="text-xl font-black text-emerald-700 mt-1 block">
                    {currentClaim.totalNetJustifiedDays} روز تقویمی
                  </span>
                </div>
              </div>
            </div>

            {/* Narrative Conclusion */}
            <div className="space-y-2">
              <h3 className="text-sm font-black text-stone-900 border-r-4 border-amber-500 pr-3">
                ۴. جمع‌بندی و نتیجه‌گیری نهایی
              </h3>
              <p className="text-xs leading-relaxed text-stone-700 text-justify">
                {currentClaim.conclusion}
              </p>
            </div>

            {/* Standard 3-Organization, 9-Box Technical Office Signature Section */}
            <div className="space-y-4 pt-6 border-t-2 border-stone-300">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-black text-stone-900">
                    گردش امضاها و تاییدات مراجع قانونی پروژه (Workflow Signatures)
                  </h3>
                  <p className="text-[10px] text-stone-500 mt-0.5">
                    منطبق با ۳ سطح سازمانی نظام فنی و اجرایی (پیمانکار، مهندسین مشاور و دستگاه اجرایی / کارفرما)
                  </p>
                </div>
                <div className="flex items-center gap-2 print:hidden">
                  <button
                    onClick={() => applyUserSignatureToClaim()}
                    className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-300 rounded-xl text-[11px] font-black transition-all flex items-center gap-1.5 shadow-sm"
                  >
                    <FileSignature size={14} />
                    ثبت امضای الکترونیک من
                  </button>
                  <button
                    onClick={() => {
                      setSigningRoleKey(null);
                      setIsSignModalOpen(true);
                    }}
                    className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1.5"
                  >
                    <PenTool size={14} />
                    رسم امضا
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* 1. Contractor Org */}
                <div className="bg-stone-50/70 border border-stone-300 rounded-2xl p-4 space-y-3 flex flex-col justify-between">
                  <div className="text-center border-b border-stone-200 pb-2">
                    <div className="text-[11px] font-black text-stone-900">سازمان پیمانکار</div>
                    <div className="text-[10px] text-stone-600 font-bold mt-0.5">{currentClaim.contractorName || 'پیمانکار مجری'}</div>
                  </div>
                  <div className="space-y-2.5">
                    {renderSigCard("کارشناس / تنظیم‌کننده دفتر فنی", getRoleSignatory("contractor_tech", currentClaim))}
                    {renderSigCard("سرپرست واحد فنی", getRoleSignatory("contractor_head", currentClaim))}
                    {renderSigCard("سرپرست کارگاه / مدیر پروژه", getRoleSignatory("contractor_site", currentClaim))}
                  </div>
                </div>

                {/* 2. Consultant Org */}
                <div className="bg-stone-50/70 border border-stone-300 rounded-2xl p-4 space-y-3 flex flex-col justify-between">
                  <div className="text-center border-b border-stone-200 pb-2">
                    <div className="text-[11px] font-black text-stone-900">دستگاه نظارت و مهندسین مشاور</div>
                    <div className="text-[10px] text-stone-600 font-bold mt-0.5">{currentClaim.consultantName || 'دستگاه نظارت'}</div>
                  </div>
                  <div className="space-y-2.5">
                    {renderSigCard("کارشناس / ناظر مقیم", getRoleSignatory("consultant_tech", currentClaim))}
                    {renderSigCard("سرپرست واحد نظارت", getRoleSignatory("consultant_head", currentClaim))}
                    {renderSigCard("سرپرست نظارت / مدیر پروژه مشاور", getRoleSignatory("consultant", currentClaim))}
                  </div>
                </div>

                {/* 3. Employer Org */}
                <div className="bg-stone-50/70 border border-stone-300 rounded-2xl p-4 space-y-3 flex flex-col justify-between">
                  <div className="text-center border-b border-stone-200 pb-2">
                    <div className="text-[11px] font-black text-stone-900">دستگاه اجرایی و کارفرما</div>
                    <div className="text-[10px] text-stone-600 font-bold mt-0.5">{currentClaim.employerName || 'دستگاه اجرایی'}</div>
                  </div>
                  <div className="space-y-2.5">
                    {renderSigCard("کارشناس / بررسی‌کننده", getRoleSignatory("employer_tech", currentClaim))}
                    {renderSigCard("سرپرست واحد / مدیر گروه", getRoleSignatory("employer_head", currentClaim))}
                    {renderSigCard("مدیر طرح / نماینده کارفرما", getRoleSignatory("employer", currentClaim))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. ITEM EDIT MODAL */}
      {/* ========================================================================= */}
      {isItemModalOpen && editingItem && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-stone-900 rounded-3xl shadow-2xl p-6 lg:p-8 max-w-2xl w-full border border-[#ece5d8] dark:border-stone-800 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#ece5d8] dark:border-stone-800 pb-3">
              <h3 className="text-base font-black text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <Plus size={18} className="text-amber-600" />
                ثبت و ویرایش رویداد تاخیر
              </h3>
              <button onClick={() => setIsItemModalOpen(false)} className="text-stone-400 hover:text-stone-600">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-stone-600 dark:text-stone-300 mb-1 block">عنوان تاخیر یا مانع</label>
                <input
                  type="text"
                  placeholder="مثال: تاخیر در ابلاغ نقشه‌های فونداسیون توسط مشاور"
                  value={editingItem.title}
                  onChange={e => setEditingItem({ ...editingItem, title: e.target.value })}
                  className="w-full p-3 bg-stone-50 dark:bg-stone-800 border border-[#ece5d8] dark:border-stone-700 rounded-xl outline-none font-bold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-stone-600 dark:text-stone-300 mb-1 block">دسته‌بندی موضوعی</label>
                  <select
                    value={editingItem.category}
                    onChange={e => {
                      const newCat = e.target.value as DelayClaimCategory;
                      setEditingItem({
                        ...editingItem,
                        category: newCat,
                        contractClauseRef: CATEGORY_MAP[newCat]?.defaultClause || editingItem.contractClauseRef
                      });
                    }}
                    className="w-full p-3 bg-stone-50 dark:bg-stone-800 border border-[#ece5d8] dark:border-stone-700 rounded-xl outline-none font-bold"
                  >
                    {Object.entries(CATEGORY_MAP).map(([key, val]) => (
                      <option key={key} value={key}>
                        {val.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-stone-600 dark:text-stone-300 mb-1 block">نوع اثر بر پروژه</label>
                  <select
                    value={editingItem.impactType}
                    onChange={e => setEditingItem({ ...editingItem, impactType: e.target.value as any })}
                    className="w-full p-3 bg-stone-50 dark:bg-stone-800 border border-[#ece5d8] dark:border-stone-700 rounded-xl outline-none font-bold"
                  >
                    <option value="CRITICAL_PATH">مسیر بحرانی (Critical Path Delay)</option>
                    <option value="NON_CRITICAL">غیربحرانی (دارای شناوری)</option>
                    <option value="PARTIAL">تاثیر جزئی و کاهش راندمان</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="font-bold text-stone-600 dark:text-stone-300 mb-1 block">تاریخ شروع تاخیر</label>
                  <ShamsiDatePicker
                    value={editingItem.startDate}
                    onChange={val => {
                      const s = val;
                      const gross = calculateShamsiDayDiff(s, editingItem.endDate) + 1;
                      setEditingItem({
                        ...editingItem,
                        startDate: s,
                        grossDays: gross > 0 ? gross : 1,
                        claimedDays: gross > 0 ? gross : 1
                      });
                    }}
                    inputClassName="!p-3 !bg-stone-50 dark:!bg-stone-800 !border-[#ece5d8] dark:!border-stone-700 !rounded-xl outline-none !font-bold !text-center"
                  />
                </div>

                <div>
                  <label className="font-bold text-stone-600 dark:text-stone-300 mb-1 block">تاریخ پایان تاخیر</label>
                  <ShamsiDatePicker
                    value={editingItem.endDate}
                    onChange={val => {
                      const end = val;
                      const gross = calculateShamsiDayDiff(editingItem.startDate, end) + 1;
                      setEditingItem({
                        ...editingItem,
                        endDate: end,
                        grossDays: gross > 0 ? gross : 1,
                        claimedDays: gross > 0 ? gross : 1
                      });
                    }}
                    inputClassName="!p-3 !bg-stone-50 dark:!bg-stone-800 !border-[#ece5d8] dark:!border-stone-700 !rounded-xl outline-none !font-bold !text-center"
                  />
                </div>

                <div>
                  <label className="font-bold text-stone-600 dark:text-stone-300 mb-1 block">روزهای ادعایی مجاز</label>
                  <input
                    type="number"
                    value={editingItem.claimedDays}
                    onChange={e => setEditingItem({ ...editingItem, claimedDays: Number(e.target.value) })}
                    className="w-full p-3 bg-stone-50 dark:bg-stone-800 border border-[#ece5d8] dark:border-stone-700 rounded-xl outline-none font-bold text-center"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-stone-600 dark:text-stone-300 mb-1 block">
                  استناد قراردادی / ماده قانونی
                </label>
                <input
                  type="text"
                  value={editingItem.contractClauseRef}
                  onChange={e => setEditingItem({ ...editingItem, contractClauseRef: e.target.value })}
                  className="w-full p-3 bg-stone-50 dark:bg-stone-800 border border-[#ece5d8] dark:border-stone-700 rounded-xl outline-none font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-stone-600 dark:text-stone-300 mb-1 block">
                  علت ریشه‌ای و شرح تفصیلی تاخیر
                </label>
                <textarea
                  rows={3}
                  value={editingItem.rootCause}
                  onChange={e => setEditingItem({ ...editingItem, rootCause: e.target.value })}
                  placeholder="شرح جزئیات مانع و علت وقوع آن..."
                  className="w-full p-3 bg-stone-50 dark:bg-stone-800 border border-[#ece5d8] dark:border-stone-700 rounded-xl outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-[#ece5d8] dark:border-stone-800">
              <button
                onClick={() => setIsItemModalOpen(false)}
                className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-2xl font-black text-xs transition-all"
              >
                انصراف
              </button>
              <button
                onClick={handleSaveItem}
                className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-black text-xs transition-all shadow-lg shadow-amber-500/20"
              >
                ذخیره ردیف تاخیر
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. WORKFLOW ACTION MODAL */}
      {/* ========================================================================= */}
      {workflowModalOpen && workflowTargetClaim && workflowAction && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-stone-900 rounded-3xl shadow-2xl p-6 lg:p-8 max-w-lg w-full border border-[#ece5d8] dark:border-stone-800 space-y-5">
            <div className="flex items-center justify-between border-b border-[#ece5d8] dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <Activity size={20} className="text-stone-900 dark:text-stone-100" />
                <h3 className="font-black text-stone-800 dark:text-stone-100 text-base">
                  {workflowAction === 'SUBMIT' && 'ارسال جهت بررسی'}
                  {workflowAction === 'REASSIGN' && 'ارجاع به کارشناس دیگر'}
                  {workflowAction === 'APPROVE' && (userOrgType === OrganizationType.CONSULTANT || userOrgType === OrganizationType.EMPLOYER ? 'تایید' : 'تایید و ارجاع')}
                  {workflowAction === 'FINAL_APPROVE' && (userOrgType === OrganizationType.EMPLOYER ? 'تایید و ثبت نهایی' : 'تایید نهایی')}
                  {workflowAction === 'REJECT' && 'رد و بازگشت برای اصلاح'}
                  {workflowAction === 'SEND_TO_CONSULTANT' && 'ارسال به مشاور'}
                  {workflowAction === 'SEND_TO_EMPLOYER' && (userOrgType === OrganizationType.CONSULTANT ? 'تایید و ارسال به کارفرما' : 'ارسال به کارفرما')}
                  {workflowAction === 'RETURN_TO_CONTRACTOR' && 'عودت به پیمانکار'}
                  {workflowAction === 'RETURN_TO_CONSULTANT' && 'عودت به مشاور'}
                  {workflowAction === 'UNFREEZE_BY_VARIATION' && 'رفع قفل و بازگشایی (Unfreeze)'}
                </h3>
              </div>
              <button onClick={() => setWorkflowModalOpen(false)} className="p-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3.5 bg-stone-50 dark:bg-stone-800/60 rounded-2xl border border-stone-200 dark:border-stone-700 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-stone-400 block">لایحه هدف:</span>
                  <span className="font-bold text-stone-800 dark:text-stone-200">
                    {workflowTargetClaim.claimNumber} - {workflowTargetClaim.title}
                  </span>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${WorkflowService.getStatusStyle(
                    workflowTargetClaim.status
                  )}`}
                >
                  {WorkflowService.getStatusLabel(workflowTargetClaim.status)}
                </span>
              </div>

              {/* Assignee Selection */}
              {(() => {
                const ut = (currentUser?.jobTitle || '').trim();
                const ul = (currentUser?.jobLevel || '').trim();
                const isPMOrWorkshopManager = ut.includes('مدیر پروژه') || ul.includes('مدیر پروژه') || ut.includes('سرپرست کارگاه') || ul.includes('سرپرست کارگاه');

                const showAssigneeDropdown =
                  workflowAction === 'SUBMIT' ||
                  workflowAction === 'RESUBMIT' ||
                  workflowAction === 'REASSIGN' ||
                  workflowAction === 'SEND_TO_CONSULTANT' ||
                  workflowAction === 'SEND_TO_EMPLOYER' ||
                  workflowAction === 'APPROVE' ||
                  workflowAction === 'RETURN_TO_CONTRACTOR' ||
                  workflowAction === 'RETURN_TO_CONSULTANT' ||
                  workflowAction === 'REJECT' ||
                  (workflowAction === 'FINAL_APPROVE' && isPMOrWorkshopManager);

                if (showAssigneeDropdown) {
                  return (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-stone-500 dark:text-stone-400 block">
                        {workflowAction === 'SEND_TO_CONSULTANT'
                          ? 'انتخاب گیرنده (در مشاور)'
                          : workflowAction === 'SEND_TO_EMPLOYER'
                          ? 'انتخاب گیرنده (در کارفرما)'
                          : workflowAction === 'RETURN_TO_CONTRACTOR'
                          ? 'انتخاب گیرنده (در پیمانکار)'
                          : workflowAction === 'RETURN_TO_CONSULTANT'
                          ? 'انتخاب گیرنده (در مشاور)'
                          : workflowAction === 'APPROVE'
                          ? 'انتخاب گیرنده بعدی (جهت ارجاع)'
                          : workflowAction === 'REJECT'
                          ? 'انتخاب دریافت‌کننده سند رد شده'
                          : 'انتخاب گیرنده (داخل سازمان)'}
                      </label>
                      <select
                        value={workflowAssigneeId}
                        onChange={e => setWorkflowAssigneeId(e.target.value)}
                        className="w-full p-3 bg-[#faf8f4] dark:bg-stone-800 border border-[#e5ded0] dark:border-stone-700 rounded-xl text-sm font-bold outline-none focus:border-stone-500 transition-all text-stone-800 dark:text-stone-100"
                      >
                        <option value="">انتخاب کنید...</option>
                        {orgUsers.map(u => (
                          <option key={u.id} value={u.id}>
                            {formatUserDisplayFormal(u, SystemAdminService.getOrganization(u.orgId))}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Comment text */}
              {(workflowAction === 'REJECT' ||
                workflowAction === 'APPROVE' ||
                workflowAction === 'FINAL_APPROVE' ||
                workflowAction === 'RETURN_TO_CONTRACTOR' ||
                workflowAction === 'RETURN_TO_CONSULTANT' ||
                workflowAction === 'UNFREEZE_BY_VARIATION' ||
                workflowAction === 'SUBMIT' ||
                workflowAction === 'RESUBMIT' ||
                workflowAction === 'SEND_TO_CONSULTANT' ||
                workflowAction === 'SEND_TO_EMPLOYER' ||
                workflowAction === 'REASSIGN') && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-500 dark:text-stone-400 block">
                    {workflowAction === 'REJECT' || workflowAction === 'RETURN_TO_CONTRACTOR' || workflowAction === 'RETURN_TO_CONSULTANT' || workflowAction === 'UNFREEZE_BY_VARIATION'
                      ? 'علت رد/عودت/بازگشایی (اجباری)'
                      : 'توضیحات (اختیاری)'}
                  </label>
                  <textarea
                    value={workflowComment}
                    onChange={e => setWorkflowComment(e.target.value)}
                    className="w-full p-3 bg-[#faf8f4] dark:bg-stone-800 border border-[#e5ded0] dark:border-stone-700 rounded-xl text-sm font-bold outline-none focus:border-stone-500 transition-all min-h-[100px] text-stone-800 dark:text-stone-100"
                    placeholder="توضیحات خود را بنویسید..."
                  />
                </div>
              )}

              {/* Electronic Signature Toggle & Status Card */}
              {(() => {
                const isNoSignatureAction =
                  workflowAction === 'REJECT' ||
                  workflowAction === 'REASSIGN' ||
                  workflowAction === 'RETURN_TO_CONTRACTOR' ||
                  workflowAction === 'RETURN_TO_CONSULTANT';
                if (isNoSignatureAction) return null;

                const hrSig = HRService.getUserSignature(currentUser) || currentUser?.signature;
                const isInterOrg =
                  workflowAction === 'SEND_TO_CONSULTANT' ||
                  workflowAction === 'SEND_TO_EMPLOYER' ||
                  workflowAction === 'FINAL_APPROVE';

                return (
                  <div className="space-y-2 border-t border-[#e5ded0] dark:border-stone-700 pt-4 mt-2" dir="rtl">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={workflowAttachSignature}
                          onChange={e => setWorkflowAttachSignature(e.target.checked)}
                          className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer accent-amber-600"
                        />
                        <span className="text-xs font-bold text-stone-800 dark:text-stone-200">
                          درج امضای الکترونیکی در گزارشات و سند
                        </span>
                      </label>
                      {isInterOrg ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
                          الزامی (بین‌سازمانی)
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700">
                          اختیاری (درون‌سازمانی)
                        </span>
                      )}
                    </div>
                    {workflowAttachSignature && (
                      <div className="p-3 bg-[#faf8f4] dark:bg-stone-800/80 border border-[#e5ded0] dark:border-stone-700 rounded-xl">
                        {hrSig ? (
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="w-16 h-10 bg-white border border-stone-200 rounded-lg p-1 flex items-center justify-center shrink-0 shadow-sm">
                                <img src={hrSig} alt="امضای دیجیتال" className="max-h-full max-w-full object-contain" />
                              </div>
                              <div>
                                <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                                  <CheckCircle size={13} /> امضای الکترونیکی آماده درج است
                                </div>
                                <div className="text-[10px] text-stone-500 dark:text-stone-400 mt-0.5">
                                  ثبت‌شده در منابع انسانی ({currentUser?.fullName || currentUser?.username})
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start gap-2 text-red-600 dark:text-red-400 text-xs">
                            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                            <div>
                              <p className="font-bold">امضای الکترونیکی شما در سیستم منابع انسانی ثبت نشده است!</p>
                              <p className="text-[10px] text-stone-500 dark:text-stone-400 mt-0.5">
                                جهت درج امضا، لطفاً از بخش پرسنلی منابع انسانی تصویر امضای خود را بارگذاری و ثبت فرمایید.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="flex gap-3 pt-4 border-t border-[#ece5d8] dark:border-stone-800">
                <button
                  onClick={() => setWorkflowModalOpen(false)}
                  className="flex-1 py-3 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 font-bold transition-all"
                >
                  انصراف
                </button>
                <button
                  onClick={handleExecuteWorkflow}
                  disabled={(() => {
                    const ut = (currentUser?.jobTitle || '').trim();
                    const ul = (currentUser?.jobLevel || '').trim();
                    const isPMOrWorkshopManager = ut.includes('مدیر پروژه') || ul.includes('مدیر پروژه') || ut.includes('سرپرست کارگاه') || ul.includes('سرپرست کارگاه');

                    if (workflowAction === 'REJECT' && (!workflowComment.trim() || !workflowAssigneeId)) {
                      return true;
                    }

                    const actionsRequiringAssignee = [
                      'SUBMIT',
                      'RESUBMIT',
                      'REASSIGN',
                      'SEND_TO_CONSULTANT',
                      'SEND_TO_EMPLOYER',
                      'SEND_TO_CONTRACTOR',
                      'RETURN_TO_CONTRACTOR',
                      'RETURN_TO_CONSULTANT'
                    ];

                    if (workflowAction === 'APPROVE' && !isPMOrWorkshopManager && !workflowAssigneeId) {
                      return true;
                    }
                    if (actionsRequiringAssignee.includes(workflowAction as string) && !workflowAssigneeId) {
                      return true;
                    }
                    if ((workflowAction === 'RETURN_TO_CONTRACTOR' ||
                         workflowAction === 'RETURN_TO_CONSULTANT' ||
                         workflowAction === 'UNFREEZE_BY_VARIATION') &&
                        !workflowComment.trim()) {
                      return true;
                    }
                    return false;
                  })()}
                  className={`flex-1 py-3 rounded-xl text-white font-bold shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                    workflowAction === 'REJECT' ||
                    workflowAction === 'RETURN_TO_CONTRACTOR' ||
                    workflowAction === 'RETURN_TO_CONSULTANT'
                      ? 'bg-red-500 hover:bg-red-600 shadow-red-500/30'
                      : workflowAction === 'UNFREEZE_BY_VARIATION'
                      ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/30'
                      : workflowAction === 'APPROVE' ||
                        workflowAction === 'FINAL_APPROVE'
                      ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30'
                      : 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/30'
                  }`}
                >
                  تایید و انجام
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. WORKFLOW HISTORY TIMELINE MODAL (Matching Technical Office standard) */}
      {/* ========================================================================= */}
      {historyModalOpen && historyClaim && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fadeIn" dir="rtl">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl max-h-[80vh] flex flex-col text-stone-700">
            <div className="p-6 border-b border-[#ece5d8] flex justify-between items-center bg-[#faf8f4]">
              <h3 className="font-black text-stone-800 flex items-center gap-2 text-sm md:text-base">
                <ScrollText size={20} className="text-stone-600" />
                تاریخچه تغییرات
              </h3>
              <button
                onClick={() => setHistoryModalOpen(false)}
                className="p-2 hover:bg-stone-200 rounded-full transition-colors text-stone-500"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4 text-right" dir="rtl">
              {!historyClaim.workflowHistory ||
              historyClaim.workflowHistory.length === 0 ? (
                <div className="text-center text-stone-400 py-8 text-sm font-bold">
                  هیچ سابقه‌ای ثبت نشده است.
                </div>
              ) : (
                [...historyClaim.workflowHistory]
                  .sort((a, b) => b.timestamp - a.timestamp)
                  .map((event, idx) => (
                    <div key={event.id || idx} className="flex gap-4 relative">
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-3 h-3 rounded-full z-10 ${
                            event.action === "APPROVE" || event.action === "FINAL_APPROVE"
                              ? "bg-emerald-500"
                              : event.action === "REJECT" || event.action === "RETURN_TO_CONTRACTOR" || event.action === "RETURN_TO_CONSULTANT"
                                ? "bg-red-500"
                                : event.action === "CREATE"
                                  ? "bg-blue-500"
                                  : "bg-amber-500"
                          }`}
                        />
                        {idx <
                          (historyClaim.workflowHistory?.length || 0) - 1 && (
                          <div className="w-0.5 flex-1 bg-stone-200 my-1" />
                        )}
                      </div>
                      <div className="flex-1 pb-6 text-right" dir="rtl">
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-black text-stone-800 text-xs">
                            {WorkflowService.getActionLabel(event.action, undefined, event.actorUserId)}
                          </span>
                          <span className="text-[10px] text-stone-400 font-bold dir-ltr">
                            {new Date(event.timestamp).toLocaleString("fa-IR")}
                          </span>
                        </div>
                        <div className="text-[10px] text-stone-500 mb-1">
                          توسط:{" "}
                          <span className="font-bold text-stone-700">
                            {event.actorName}
                          </span>
                          {event.actorTitle && (
                            <span className="text-stone-400 mr-1">({event.actorTitle})</span>
                          )}
                        </div>
                        {(() => {
                          const assigneeUser = event.assigneeUserId
                            ? SystemAdminService.getUsers().find((u) => u.id === event.assigneeUserId)
                            : undefined;
                          const assigneeOrg = assigneeUser?.orgId
                            ? SystemAdminService.getOrganization(assigneeUser.orgId)
                            : undefined;
                          const fullAssigneeName = assigneeUser
                            ? formatUserDisplayFormal(assigneeUser, assigneeOrg)
                            : event.assigneeName;
                          return fullAssigneeName ? (
                            <div className="text-[10px] text-stone-900 bg-[#faf8f4] px-2 py-1 rounded-lg w-fit mb-1">
                              گیرنده: {fullAssigneeName}
                            </div>
                          ) : null;
                        })()}
                        {event.comment && event.action !== "EDIT" && (
                          <div className="text-[10px] text-stone-600 bg-[#faf8f4] p-2.5 rounded-xl border border-[#ece5d8] italic mb-1.5">
                            <span className="block">"{event.comment}"</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[9px] px-2 py-0.5 rounded bg-stone-100 text-stone-500 font-medium">
                            {WorkflowService.getStatusLabel(event.fromStatus)}
                          </span>
                          <ArrowLeftCircle
                            size={10}
                            className="text-stone-300"
                          />
                          <span className="text-[9px] px-2 py-0.5 rounded bg-stone-100 text-stone-500 font-medium">
                            {WorkflowService.getStatusLabel(event.toStatus)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (Matching Technical Office standard) */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-md animate-fadeIn" dir="rtl">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm text-center text-stone-700">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full mx-auto flex items-center justify-center mb-4">
              <AlertTriangle size={32} />
            </div>
            <h3 className="text-lg font-black text-stone-800">
              {deleteTargetClaim ? 'حذف لایحه تاخیرات' : 'حذف ردیف تاخیر'}
            </h3>
            <p className="text-sm text-stone-500 mt-2">
              {deleteTargetClaim
                ? `آیا از حذف لایحه «${deleteTargetClaim.claimNumber} - ${deleteTargetClaim.title}» اطمینان دارید؟ این عملیات غیرقابل بازگشت است.`
                : 'آیا از حذف این ردیف تاخیر اطمینان دارید؟ این عملیات غیرقابل بازگشت است.'}
            </p>
            <div className="flex gap-4 mt-6">
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setDeleteTargetClaim(null);
                  setDeleteTargetItemId(null);
                }}
                className="flex-1 py-3 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold transition-all text-xs"
              >
                انصراف
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition-all shadow-lg shadow-red-600/30 text-xs"
              >
                حذف نهایی
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. IMPORT FROM DAILY REPORTS MODAL */}
      {/* ========================================================================= */}
      {isDailyImportModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-stone-900 rounded-3xl shadow-2xl p-6 lg:p-8 max-w-2xl w-full border border-[#ece5d8] dark:border-stone-800 space-y-5">
            <div className="flex items-center justify-between border-b border-[#ece5d8] dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <RefreshCw size={20} className="text-blue-600" />
                <h3 className="text-base font-black text-stone-900 dark:text-stone-100">
                  بازخوانی و استخراج موانع و رویدادهای جوی از گزارشات روزانه
                </h3>
              </div>
              <button onClick={() => setIsDailyImportModalOpen(false)} className="text-stone-400 hover:text-stone-600">
                <X size={20} />
              </button>
            </div>

            {(() => {
              const approvedDailyReports = dailyReports.filter(d => {
                const matchesProject = d.projectId === projectId || String(d.projectId) === String(projectId) || !projectId;
                const statusStr = String(d.status || '');
                const isApprovedOrFrozen = Boolean(
                  d.isFinalFrozen ||
                  (d as any).isFrozen ||
                  statusStr === WorkflowStatus.APPROVED_BY_EMPLOYER ||
                  statusStr === 'APPROVED_BY_EMPLOYER' ||
                  statusStr === 'FINAL_APPROVED'
                );
                return matchesProject && isApprovedOrFrozen;
              });

              if (approvedDailyReports.length === 0) {
                return (
                  <div className="p-8 text-center space-y-2">
                    <p className="text-xs font-bold text-amber-600 dark:text-amber-400">
                      هیچ گزارش روزانه‌ای با تایید نهایی کارفرما یا وضعیت منجمدشده در این پروژه یافت نشد.
                    </p>
                    <p className="text-[11px] text-stone-500">
                      تنها گزارشاتی که فرآیند تایید نهایی کارفرما را طی کرده و منجمد شده باشند جهت بازخوانی لایحه تاخیرات نمایش داده می‌شوند.
                    </p>
                  </div>
                );
              }

              const normalizeShamsiStr = (str: string): string => {
                if (!str) return '1402/01/01';
                const enDigits = str.replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
                const parts = enDigits.trim().split(/[\/\-]/);
                if (parts.length === 3) {
                  const y = parts[0].padStart(4, '0');
                  const m = parts[1].padStart(2, '0');
                  const d = parts[2].padStart(2, '0');
                  return `${y}/${m}/${d}`;
                }
                return str;
              };

              interface RawObstacle {
                drId: string;
                reportDate: string;
                reportNumber: string;
                type: 'WEATHER' | 'PROBLEM' | 'OBSERVATION';
                title: string;
                description: string;
                category: DelayClaimCategory;
                obstacleKey: string;
              }

              const rawEntries: RawObstacle[] = [];

              approvedDailyReports.forEach(dr => {
                const repDate = normalizeShamsiStr((dr as any).reportDate || dr.date || '');
                const repNum = String(dr.reportNumber || '-');

                // 1. Weather Delays
                const weatherStr = typeof dr.weather === 'string' ? dr.weather : ((dr.weather as any)?.condition || '');
                const isStopWork = Boolean((dr.weather as any)?.isStopWork);
                const isBadWeather =
                  isStopWork ||
                  weatherStr.includes('باران') ||
                  weatherStr.includes('برف') ||
                  weatherStr.includes('طوفان') ||
                  weatherStr.includes('گرد') ||
                  weatherStr.includes('غبار') ||
                  weatherStr.includes('یخبندان') ||
                  weatherStr.includes('نامساعد') ||
                  weatherStr.includes('توقف') ||
                  weatherStr.includes('سیل') ||
                  weatherStr.includes('باد');

                if (weatherStr && isBadWeather) {
                  const cleanWeather = weatherStr.trim().toLowerCase().replace(/[^\w\u0600-\u06FF]/g, '');
                  rawEntries.push({
                    drId: dr.id,
                    reportDate: repDate,
                    reportNumber: repNum,
                    type: 'WEATHER',
                    title: `شرایط نامساعد جوی (${weatherStr})`,
                    description: (dr.weather as any)?.notes || dr.description || `توقف کار به دلیل وضعیت جوی (${weatherStr})`,
                    category: 'WEATHER_FORCE_MAJEURE',
                    obstacleKey: `WEATHER_${cleanWeather || 'GENERAL'}`
                  });
                }

                // 2. Explicit Problems / Obstacles Array
                if (dr.problems && Array.isArray(dr.problems) && dr.problems.length > 0) {
                  dr.problems.forEach((p: any) => {
                    const pText = typeof p === 'string' ? p : (p.description || p.title || 'مانع اجرایی');
                    const cleanKey = pText.trim().toLowerCase().replace(/[^\w\u0600-\u06FF]/g, '').slice(0, 30);
                    rawEntries.push({
                      drId: dr.id,
                      reportDate: repDate,
                      reportNumber: repNum,
                      type: 'PROBLEM',
                      title: pText,
                      description: typeof p === 'string' ? p : (p.description || pText),
                      category: 'EMPLOYER_OBSTACLES',
                      obstacleKey: `PROBLEM_${cleanKey || 'GENERAL'}`
                    });
                  });
                }

                // 3. Observations / General description if contains keywords
                const desc = dr.description ? dr.description.trim() : '';
                if (desc) {
                  const obstacleKeywords = ['مانع', 'مشکل', 'توقف', 'تاخیر', 'معارض', 'قطع', 'عدم', 'تاخیرات', 'خرابی', 'کمبود', 'تعطیل', 'نامساعد', 'ممانعت', 'دستور کار', 'ابلاغ'];
                  const hasKeyword = obstacleKeywords.some(kw => desc.includes(kw));
                  const alreadyCapturedAsWeather = weatherStr && isBadWeather && desc === ((dr.weather as any)?.notes || dr.description);

                  if ((hasKeyword || (!dr.problems || dr.problems.length === 0)) && !alreadyCapturedAsWeather) {
                    const cleanKey = desc.toLowerCase().replace(/[^\w\u0600-\u06FF]/g, '').slice(0, 30);
                    rawEntries.push({
                      drId: dr.id,
                      reportDate: repDate,
                      reportNumber: repNum,
                      type: 'OBSERVATION',
                      title: `رخ‌داد کارگاهی`,
                      description: desc,
                      category: 'EMPLOYER_OBSTACLES',
                      obstacleKey: `OBSERVATION_${cleanKey || 'GENERAL'}`
                    });
                  }
                }
              });

              if (rawEntries.length === 0) {
                return (
                  <div className="p-8 text-center space-y-2">
                    <p className="text-xs font-bold text-stone-500">
                      در گزارشات روزانه منجمدشده کارفرما، هیچ مانع اجرایی یا شرایط جوی متوقف‌کننده‌ای ثبت نشده است.
                    </p>
                  </div>
                );
              }

              // Group by obstacleKey and Cluster by Date Range (<= 3 days gap)
              const groupsMap = new Map<string, RawObstacle[]>();
              rawEntries.forEach(entry => {
                if (!groupsMap.has(entry.obstacleKey)) {
                  groupsMap.set(entry.obstacleKey, []);
                }
                groupsMap.get(entry.obstacleKey)!.push(entry);
              });

              const extracted: any[] = [];

              groupsMap.forEach((entries, key) => {
                entries.sort((a, b) => a.reportDate.localeCompare(b.reportDate));

                let currentCluster: {
                  type: 'WEATHER' | 'PROBLEM' | 'OBSERVATION';
                  title: string;
                  category: DelayClaimCategory;
                  startDate: string;
                  endDate: string;
                  reportNumbers: string[];
                  descriptions: string[];
                } | null = null;

                const pushCluster = (cluster: typeof currentCluster) => {
                  if (!cluster) return;
                  const grossDays = Math.max(1, calculateShamsiDayDiff(cluster.startDate, cluster.endDate) + 1);
                  const repNums = cluster.reportNumbers.filter(n => n && n !== '-');
                  const reportNumbersSummary = repNums.length > 0
                    ? (repNums.length === 1 ? `ش. ${repNums[0]}` : `ش. ${repNums[0]} تا ش. ${repNums[repNums.length - 1]} (${repNums.length} گزارش)`)
                    : 'گزارش منجمد';

                  const dateRangeSummary = cluster.startDate === cluster.endDate
                    ? `تاریخ: ${cluster.startDate}`
                    : `بازه زمانی: از ${cluster.startDate} تا ${cluster.endDate} (${grossDays} روز تاخیر مستمر)`;

                  extracted.push({
                    id: `grp-${key}-${cluster.startDate}-${cluster.endDate}`,
                    type: cluster.type,
                    category: cluster.category,
                    startDate: cluster.startDate,
                    endDate: cluster.endDate,
                    grossDays,
                    totalReports: cluster.reportNumbers.length,
                    reportNumbersSummary,
                    dateRangeSummary,
                    title: cluster.title,
                    description: cluster.descriptions.join(' | '),
                    statusLabel: 'تایید کارفرما / منجمد',
                    isApprovedOrFrozen: true
                  });
                };

                entries.forEach(entry => {
                  if (!currentCluster) {
                    currentCluster = {
                      type: entry.type,
                      title: entry.title,
                      category: entry.category,
                      startDate: entry.reportDate,
                      endDate: entry.reportDate,
                      reportNumbers: [entry.reportNumber],
                      descriptions: [entry.description]
                    };
                  } else {
                    const gap = calculateShamsiDayDiff(currentCluster.endDate, entry.reportDate);
                    if (gap >= 0 && gap <= 3) {
                      currentCluster.endDate = entry.reportDate;
                      if (!currentCluster.reportNumbers.includes(entry.reportNumber)) {
                        currentCluster.reportNumbers.push(entry.reportNumber);
                      }
                      if (!currentCluster.descriptions.includes(entry.description)) {
                        currentCluster.descriptions.push(entry.description);
                      }
                    } else {
                      pushCluster(currentCluster);
                      currentCluster = {
                        type: entry.type,
                        title: entry.title,
                        category: entry.category,
                        startDate: entry.reportDate,
                        endDate: entry.reportDate,
                        reportNumbers: [entry.reportNumber],
                        descriptions: [entry.description]
                      };
                    }
                  }
                });

                if (currentCluster) {
                  pushCluster(currentCluster);
                }
              });

              if (extracted.length === 0) {
                return (
                  <div className="p-8 text-center space-y-2">
                    <p className="text-xs font-bold text-stone-500">
                      هیچ مانع یا شرایط جوی متوقف‌کننده‌ای در گزارشات روزانه منجمدشده کارفرما یافت نشد.
                    </p>
                  </div>
                );
              }

              return (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-stone-500">
                      {extracted.length} بازه تاخیر استخراج‌شده از گزارشات منجمد کارفرما:
                    </span>
                    <button
                      onClick={() => {
                        if (selectedDailyItems.length === extracted.length) {
                          setSelectedDailyItems([]);
                        } else {
                          setSelectedDailyItems(extracted.map(e => e.id));
                        }
                      }}
                      className="text-blue-600 text-[11px] font-bold hover:underline"
                    >
                      {selectedDailyItems.length === extracted.length ? 'لغو انتخاب همه' : 'انتخاب همه موارد'}
                    </button>
                  </div>

                  <div className="space-y-2.5 max-h-80 overflow-y-auto">
                    {extracted.map(item => {
                      const isChecked = selectedDailyItems.includes(item.id);
                      return (
                        <div
                          key={item.id}
                          onClick={() => {
                            if (isChecked) {
                              setSelectedDailyItems(selectedDailyItems.filter(id => id !== item.id));
                            } else {
                              setSelectedDailyItems([...selectedDailyItems, item.id]);
                            }
                          }}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                            isChecked
                              ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 shadow-sm'
                              : 'bg-stone-50 dark:bg-stone-800/40 border-[#ece5d8] dark:border-stone-800'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="mt-1 rounded text-blue-600 pointer-events-none"
                          />
                          <div className="flex-1 text-xs space-y-1.5">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <span className="font-bold text-stone-900 dark:text-stone-100 text-xs">
                                {item.title}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                  {item.statusLabel}
                                </span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300">
                                  {item.type === 'WEATHER' ? 'شرایط جوی' : item.type === 'PROBLEM' ? 'مانع اجرایی' : 'رخ‌داد کارگاهی'}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 text-[11px] font-semibold text-blue-700 dark:text-blue-300 flex-wrap bg-blue-50/50 dark:bg-blue-900/20 p-1.5 rounded-lg border border-blue-100 dark:border-blue-800/40">
                              <span>📅 {item.dateRangeSummary}</span>
                              <span>📋 {item.reportNumbersSummary}</span>
                            </div>

                            <p className="text-stone-600 dark:text-stone-400 font-medium text-[11px] leading-relaxed line-clamp-2">
                              {item.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-[#ece5d8] dark:border-stone-800">
                    <button
                      onClick={() => setIsDailyImportModalOpen(false)}
                      className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-2xl font-black text-xs transition-all"
                    >
                      انصراف
                    </button>
                    <button
                      disabled={selectedDailyItems.length === 0}
                      onClick={() => {
                        const toImport = extracted.filter(e => selectedDailyItems.includes(e.id));
                        executeDailyImport(toImport);
                      }}
                      className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-2xl font-black text-xs transition-all shadow-lg shadow-blue-500/20"
                    >
                      افزودن {selectedDailyItems.length} مورد به لایحه
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. CIRCULAR 5090 CALCULATOR MODAL */}
      {/* ========================================================================= */}
      {is5090ModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-stone-900 rounded-3xl shadow-2xl p-6 lg:p-8 max-w-lg w-full border border-[#ece5d8] dark:border-stone-800 space-y-5">
            <div className="flex items-center justify-between border-b border-[#ece5d8] dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <Calculator size={20} className="text-emerald-600" />
                <h3 className="text-base font-black text-stone-900 dark:text-stone-100">
                  محاسبه‌گر تاخیرات مالی (بخشنامه ۵۰۹۰ سازمان برنامه و بودجه)
                </h3>
              </div>
              <button onClick={() => setIs5090ModalOpen(false)} className="text-stone-400 hover:text-stone-600">
                <X size={20} />
              </button>
            </div>

            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-800 dark:text-emerald-200 space-y-1">
              <div className="font-bold">فرمول رسمی بخشنامه ۵۰۹۰:</div>
              <div className="font-mono text-[11px] dir-ltr text-center py-1">
                T = (A × D) / C
              </div>
              <div className="text-[10px] text-emerald-700 dark:text-emerald-300">
                T: مدت تمدید مجاز | A: مبلغ صورت‌وضعیت معوق | D: روزهای تاخیر پرداخت | C: مبلغ کل پیمان
              </div>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-stone-600 dark:text-stone-300 mb-1 block">عنوان و شرح صورت‌وضعیت</label>
                <input
                  type="text"
                  value={calc5090State.description}
                  onChange={e => setCalc5090State({ ...calc5090State, description: e.target.value })}
                  className="w-full p-3 bg-stone-50 dark:bg-stone-800 border border-[#ece5d8] dark:border-stone-700 rounded-xl outline-none font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-stone-600 dark:text-stone-300 mb-1 block">مبلغ معوق صورت‌وضعیت (ریال)</label>
                  <input
                    type="number"
                    value={calc5090State.statementAmount}
                    onChange={e => setCalc5090State({ ...calc5090State, statementAmount: Number(e.target.value) })}
                    className="w-full p-3 bg-stone-50 dark:bg-stone-800 border border-[#ece5d8] dark:border-stone-700 rounded-xl outline-none font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-stone-600 dark:text-stone-300 mb-1 block">مبلغ کل پیمان (ریال)</label>
                  <input
                    type="number"
                    value={calc5090State.contractAmount}
                    onChange={e => setCalc5090State({ ...calc5090State, contractAmount: Number(e.target.value) })}
                    className="w-full p-3 bg-stone-50 dark:bg-stone-800 border border-[#ece5d8] dark:border-stone-700 rounded-xl outline-none font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-stone-600 dark:text-stone-300 mb-1 block">موعد پرداخت مصوب (سررسید)</label>
                  <ShamsiDatePicker
                    value={calc5090State.approvedDueDate}
                    onChange={val => setCalc5090State({ ...calc5090State, approvedDueDate: val })}
                    inputClassName="!p-3 !bg-stone-50 dark:!bg-stone-800 !border-[#ece5d8] dark:!border-stone-700 !rounded-xl outline-none !font-bold !text-center"
                  />
                </div>

                <div>
                  <label className="font-bold text-stone-600 dark:text-stone-300 mb-1 block">تاریخ پرداخت واقعی کارفرما</label>
                  <ShamsiDatePicker
                    value={calc5090State.actualPaymentDate}
                    onChange={val => setCalc5090State({ ...calc5090State, actualPaymentDate: val })}
                    inputClassName="!p-3 !bg-stone-50 dark:!bg-stone-800 !border-[#ece5d8] dark:!border-stone-700 !rounded-xl outline-none !font-bold !text-center"
                  />
                </div>
              </div>

              {/* Real-time Calculation Result */}
              {(() => {
                const diff = calculateShamsiDayDiff(calc5090State.approvedDueDate, calc5090State.actualPaymentDate);
                const resDays =
                  diff > 0
                    ? Math.max(1, Math.round((calc5090State.statementAmount * diff) / (calc5090State.contractAmount || 1)))
                    : 0;
                return (
                  <div className="p-4 bg-stone-100 dark:bg-stone-800/60 rounded-2xl flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-stone-500 block">تاخیر تقویمی در پرداخت:</span>
                      <span className="font-bold text-stone-800 dark:text-stone-200">{diff} روز تقویمی</span>
                    </div>
                    <div className="text-left">
                      <span className="text-[11px] text-emerald-600 font-bold block">تمدید مجاز بخشنامه ۵۰۹۰:</span>
                      <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">{resDays} روز مجاز</span>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="flex gap-3 pt-4 border-t border-[#ece5d8] dark:border-stone-800">
              <button
                onClick={() => setIs5090ModalOpen(false)}
                className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-2xl font-black text-xs transition-all"
              >
                انصراف
              </button>
              <button
                onClick={handleApply5090}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs transition-all shadow-lg shadow-emerald-500/20"
              >
                اعمال و افزودن به لایحه
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 9. ELECTRONIC SIGNATURE DRAWING PAD MODAL */}
      {/* ========================================================================= */}
      {isSignModalOpen && (
        <div className="fixed inset-0 z-[230] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-stone-900 rounded-3xl shadow-2xl p-6 lg:p-8 max-w-md w-full border border-[#ece5d8] dark:border-stone-800 space-y-5">
            <div className="flex items-center justify-between border-b border-[#ece5d8] dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <PenTool size={20} className="text-amber-600" />
                <h3 className="text-base font-black text-stone-900 dark:text-stone-100">
                  ثبت و رسم امضای الکترونیک
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsSignModalOpen(false);
                  setSigningRoleKey(null);
                }}
                className="text-stone-400 hover:text-stone-600"
              >
                <X size={20} />
              </button>
            </div>

            <p className="text-xs text-stone-500 dark:text-stone-400">
              با استفاده از ماوس یا لمس صفحه نمایش، در کادر زیر امضا نمایید تا بر روی سند درج و در پروفایل شما ذخیره شود:
            </p>

            <div className="border-2 border-dashed border-stone-300 dark:border-stone-700 rounded-2xl p-2 bg-white flex justify-center items-center shadow-inner">
              <canvas
                ref={canvasRef}
                width={360}
                height={160}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="cursor-crosshair w-full h-[160px] bg-white rounded-xl touch-none"
              />
            </div>

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={clearDrawing}
                className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl transition-all"
              >
                پاک کردن کادر
              </button>
              <span className="text-[10px] text-stone-400">امضای رسمی مطابق قوانین تجارت الکترونیک</span>
            </div>

            <div className="flex gap-3 pt-4 border-t border-[#ece5d8] dark:border-stone-800">
              <button
                onClick={() => {
                  setIsSignModalOpen(false);
                  setSigningRoleKey(null);
                }}
                className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-2xl font-black text-xs transition-all"
              >
                انصراف
              </button>
              <button
                onClick={handleSaveDrawnSignature}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs transition-all shadow-lg shadow-emerald-500/20"
              >
                تایید و درج امضا
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
