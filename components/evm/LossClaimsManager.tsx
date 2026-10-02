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
  ShieldCheck,
  Copy,
  Eye,
  Check,
  RotateCcw,
  PenTool,
  CheckCheck,
  ScrollText,
  ArrowLeftCircle,
  Activity,
  TrendingUp,
  Scale
} from 'lucide-react';
import {
  LossClaim,
  LossClaimItem,
  LossClaimCategory,
  DailyReport,
  Project,
  WorkflowStatus,
  WorkflowAction,
  WorkflowEvent,
  DelayClaim,
  Statement,
  AdjustmentRecord
} from '../../types';
import {
  formatShamsiDate,
  calculateShamsiDayDiff,
  addDaysToShamsiDate
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
    return saved && saved !== 'undefined' ? JSON.parse(saved) : defaultValue;
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

interface LossClaimsManagerProps {
  projectId: string;
  project: Project;
  onShowToast?: (msg: string) => void;
}

const CATEGORY_MAP: Record<
  LossClaimCategory,
  { label: string; icon: any; color: string; bg: string; border: string; defaultClause: string }
> = {
  SITE_OVERHEAD: {
    label: 'هزینه‌های بالاسری کارگاه (ایام تاخیر مجاز)',
    icon: Building2,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    border: 'border-amber-200 dark:border-amber-800',
    defaultClause: 'ماده ۴۴ و ۳۰ شرایط عمومی پیمان - بخشنامه ۵۴/۸۴۲ (جبران هزینه‌های بالاسری کارگاه)'
  },
  IDLE_EQUIPMENT_LABOR: {
    label: 'خسارت بخواب ماشین‌آلات و نیروی انسانی معطل',
    icon: Clock,
    color: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    border: 'border-rose-200 dark:border-rose-800',
    defaultClause: 'بخشنامه ۵۴/۸۴۲ (نرخ اجاره ماشین‌آلات و دستمزد عدم فعالیت) و ماده ۴۹ شرایط عمومی پیمان'
  },
  FINANCIAL_INTEREST_5090: {
    label: 'خسارت تاخیر در تادیه و پرداخت‌ها (بخشنامه ۵۰۹۰)',
    icon: DollarSign,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    border: 'border-emerald-200 dark:border-emerald-800',
    defaultClause: 'بخشنامه ۵۰۹۰/۵۴/۱۱۰۸۲-۱ سازمان برنامه و بودجه - خسارت عدم پرداخت به موقع صورت‌وضعیت‌ها'
  },
  INFLATION_PRICE_DIFF: {
    label: 'مازاد نوسانات قیمت و عدم شمول تعدیل کامل',
    icon: TrendingUp,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    border: 'border-blue-200 dark:border-blue-800',
    defaultClause: 'بخشنامه جبران آثار ناشی از افزایش قیمت ارز و مصالح خاص و تبصره‌های ماده ۲۹'
  },
  SUSPENSION_TERMINATION: {
    label: 'هزینه‌های دوران تعلیق پیمان (ماده ۴۹)',
    icon: ShieldAlert,
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-50 dark:bg-purple-950/40',
    border: 'border-purple-200 dark:border-purple-800',
    defaultClause: 'ماده ۴۹ شرایط عمومی پیمان - هزینه‌های حراست، نگهداری کارگاه و تمدید ضمانت‌نامه‌ها'
  },
  OTHER_DAMAGES: {
    label: 'سایر خسارات قراردادی و حقوقی',
    icon: FileText,
    color: 'text-stone-600 dark:text-stone-400',
    bg: 'bg-stone-50 dark:bg-stone-800/40',
    border: 'border-stone-200 dark:border-stone-700',
    defaultClause: 'قوانین عمومی قراردادها و شرایط خصوصی پیمان'
  }
};

export const LossClaimsManager: React.FC<LossClaimsManagerProps> = ({
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
  const userOrgName = userOrg?.name || 'سازمان نامشخص';

  const recomputeLossClaimStats = (claim: LossClaim): LossClaim => {
    const items = claim.items || [];
    const totalClaimed = items.reduce((sum, it) => sum + (it.totalClaimedAmount || 0), 0);
    const totalConsultant = items.reduce((sum, it) => sum + (it.consultantApprovedAmount ?? it.totalClaimedAmount ?? 0), 0);
    const totalEmployer = items.reduce((sum, it) => sum + (it.employerApprovedAmount ?? it.consultantApprovedAmount ?? it.totalClaimedAmount ?? 0), 0);

    return {
      ...claim,
      totalClaimedAmount: totalClaimed,
      totalConsultantApprovedAmount: totalConsultant,
      totalEmployerApprovedAmount: totalEmployer
    };
  };

  // Stored Claims
  const [claims, setClaims] = useState<LossClaim[]>(() => {
    const loaded = loadData<LossClaim[]>('hamyar_loss_claims', []) || loadData<LossClaim[]>('loss_claims_list', []);
    // Filter out any demo claims to completely purge them from storage
    const cleaned = (loaded || []).filter(c => !c.id?.includes('demo-mock-'));
    // Sanitize any legacy draft claims that had auto-injected signatures in initial draft events
    return cleaned.map(c => {
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

  const handleSaveAllClaims = (updatedList: LossClaim[]) => {
    setClaims(updatedList);
    saveData('hamyar_loss_claims', updatedList);
    saveData('loss_claims_list', updatedList);
  };

  useEffect(() => {
    saveData('hamyar_loss_claims', claims);
    saveData('loss_claims_list', claims);
  }, [claims]);

  // Project Claims Filter
  const projectClaims = useMemo(() => {
    return claims.filter(c => c.projectId === projectId || String(c.projectId) === String(projectId));
  }, [claims, projectId]);

  // Active Claim
  const [viewMode, setViewMode] = useState<'list' | 'editor' | 'preview'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(() => {
    return projectClaims.length > 0 ? projectClaims[0].id : null;
  });

  const activeClaim = useMemo(() => {
    if (!selectedClaimId && projectClaims.length > 0) {
      return projectClaims[0];
    }
    return projectClaims.find(c => c.id === selectedClaimId) || null;
  }, [projectClaims, selectedClaimId]);

  // Filtered Claims in List View
  const filteredClaims = useMemo(() => {
    return projectClaims.filter(claim => {
      const term = searchTerm.toLowerCase().trim();
      if (!term) return true;
      return (
        claim.title?.toLowerCase().includes(term) ||
        claim.claimNumber?.toLowerCase().includes(term) ||
        claim.periodTitle?.toLowerCase().includes(term)
      );
    });
  }, [projectClaims, searchTerm]);

  useEffect(() => {
    if (!selectedClaimId && projectClaims.length > 0) {
      setSelectedClaimId(projectClaims[0].id);
    }
  }, [projectClaims, selectedClaimId]);

  // Modals state
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [editingClaim, setEditingClaim] = useState<Partial<LossClaim> | null>(null);

  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<LossClaimItem> | null>(null);

  // Workflow State & Modals
  const [isWorkflowModalOpen, setIsWorkflowModalOpen] = useState(false);
  const [workflowTargetClaim, setWorkflowTargetClaim] = useState<LossClaim | null>(null);
  const [workflowAction, setWorkflowAction] = useState<WorkflowAction | null>(null);
  const [workflowComment, setWorkflowComment] = useState('');
  const [workflowAssigneeId, setWorkflowAssigneeId] = useState('');
  const [workflowAttachSignature, setWorkflowAttachSignature] = useState(true);

  // History Modal
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyClaim, setHistoryClaim] = useState<LossClaim | null>(null);

  // Delete Modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTargetClaim, setDeleteTargetClaim] = useState<LossClaim | null>(null);
  const [deleteTargetItemId, setDeleteTargetItemId] = useState<string | null>(null);

  // Print Modal
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Filtering & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  const notify = (msg: string) => {
    if (onShowToast) onShowToast(msg);
    else alert(msg);
  };

  const canUserEditClaim = (claim: LossClaim | null | undefined): boolean => {
    if (!claim) return false;
    if (claim.isFinalFrozen) return false;
    if (!currentUser) return false;
    return WorkflowService.canEdit(claim as any, currentUser);
  };

  const canUserDeleteThisClaim = (claim: LossClaim | null | undefined): boolean => {
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

  // Sta  // Standard Workflow Actions calculation matching Delay Claims & Technical Office rules
  const getClaimWorkflowActions = (claim: LossClaim | null | undefined): WorkflowAction[] => {
    if (!claim || !currentUser) return [];

    const contractorOrg = organizations.find(o => o.type === OrganizationType.CONTRACTOR);
    const consultantOrg = organizations.find(o => o.type === OrganizationType.CONSULTANT);
    const employerOrg = organizations.find(o => o.type === OrganizationType.EMPLOYER);

    let currentOrgId = claim.currentOrgId;
    if (!currentOrgId) {
      if (
        claim.status === WorkflowStatus.SENT_TO_CONSULTANT ||
        claim.status === WorkflowStatus.IN_CONSULTANT_REVIEW ||
        claim.status === WorkflowStatus.APPROVED_BY_CONSULTANT
      ) {
        currentOrgId = consultantOrg?.id;
      } else if (
        claim.status === WorkflowStatus.SENT_TO_EMPLOYER ||
        claim.status === WorkflowStatus.IN_EMPLOYER_REVIEW ||
        claim.status === WorkflowStatus.APPROVED_BY_EMPLOYER
      ) {
        currentOrgId = employerOrg?.id;
      } else {
        currentOrgId = claim.ownerOrgId || contractorOrg?.id;
      }
    }

    const claimNormalized = {
      ...claim,
      ownerOrgId: claim.ownerOrgId || contractorOrg?.id,
      currentOrgId: currentOrgId,
      createdById: claim.createdById || currentUser.id,
      assigneeId: claim.assigneeId || (claim.status === WorkflowStatus.DRAFT ? currentUser.id : undefined)
    };

    const t = (currentUser.jobTitle || "").trim();
    const l = (currentUser.jobLevel || "").trim();
    const matchesRole = (str: string, roleName: string) => {
      if (!str) return false;
      const normalized = str.replace(/ك/g, "ک").replace(/ي/g, "ی");
      const target = roleName.replace(/ك/g, "ک").replace(/ي/g, "ی");
      return normalized.includes(target);
    };

    const isSysAdmin = currentUser.role === "SYSTEM_ADMIN";
    const isOrgManager = currentUser.role === "ORG_MANAGER" || currentUser.role === "ORG_ADMIN" || isSysAdmin;
    const isPM = matchesRole(t, "مدیر پروژه") || matchesRole(l, "مدیر پروژه") || matchesRole(t, "مدیر طرح") || matchesRole(l, "مدیر طرح") || matchesRole(t, "نماینده") || matchesRole(l, "نماینده") || matchesRole(t, "مجری") || matchesRole(l, "مجری") || isOrgManager;
    const isWorkshopManager = matchesRole(t, "سرپرست کارگاه") || matchesRole(l, "سرپرست کارگاه") || matchesRole(t, "سرپرست نظارت") || matchesRole(l, "سرپرست نظارت") || matchesRole(t, "رئیس کارگاه") || matchesRole(l, "رئیس کارگاه") || matchesRole(t, "مدیر کارگاه") || matchesRole(l, "مدیر کارگاه") || matchesRole(t, "ناظر مقیم") || matchesRole(l, "ناظر مقیم");
    const isPMOrWorkshopManager = isSysAdmin || isPM || isWorkshopManager;

    let actions = WorkflowService.getAvailableActions(claimNormalized as any, currentUser, userOrgType);

    // Rule: SEND_TO_CONSULTANT can ONLY be active for Workshop Manager (سرپرست کارگاه) and Project Manager (مدیر پروژه / مدیران سیستم)
    if (actions && actions.includes("SEND_TO_CONSULTANT") && !isPMOrWorkshopManager) {
      actions = actions.filter(a => a !== "SEND_TO_CONSULTANT");
    }

    if (!actions || actions.length === 0) {
      const isContractor = userOrgType === OrganizationType.CONTRACTOR || currentUser.orgId === contractorOrg?.id || isSysAdmin;
      const isConsultant = userOrgType === OrganizationType.CONSULTANT || currentUser.orgId === consultantOrg?.id || isSysAdmin;
      const isEmployer = userOrgType === OrganizationType.EMPLOYER || currentUser.orgId === employerOrg?.id || isSysAdmin;

      if (claim.isFinalFrozen) {
        if (isSysAdmin || isEmployer) return ["UNFREEZE_BY_VARIATION"];
        return [];
      }

      if (claim.status === WorkflowStatus.DRAFT || claim.status === WorkflowStatus.REJECTED) {
        if (isContractor) return ["SUBMIT", "REASSIGN"];
      } else if (claim.status === WorkflowStatus.IN_REVIEW) {
        if (isContractor) {
          if (isPMOrWorkshopManager) {
            return ["APPROVE", "SEND_TO_CONSULTANT", "REJECT", "REASSIGN"];
          }
          return [];
        }
      } else if (claim.status === WorkflowStatus.APPROVED_INTERNAL) {
        if (isContractor) {
          if (isPMOrWorkshopManager) {
            return ["SEND_TO_CONSULTANT", "REASSIGN", "REJECT"];
          }
          return [];
        }
      } else if (claim.status === WorkflowStatus.SENT_TO_CONSULTANT || claim.status === WorkflowStatus.IN_CONSULTANT_REVIEW) {
        if (isConsultant) return ["APPROVE", "SEND_TO_EMPLOYER", "RETURN_TO_CONTRACTOR", "REASSIGN", "REJECT"];
      } else if (claim.status === WorkflowStatus.APPROVED_BY_CONSULTANT) {
        if (isConsultant) return ["SEND_TO_EMPLOYER", "RETURN_TO_CONTRACTOR", "REASSIGN"];
        if (isEmployer) return ["FINAL_APPROVE", "RETURN_TO_CONSULTANT", "REASSIGN"];
      } else if (claim.status === WorkflowStatus.SENT_TO_EMPLOYER || claim.status === WorkflowStatus.IN_EMPLOYER_REVIEW) {
        if (isEmployer) return ["FINAL_APPROVE", "RETURN_TO_CONSULTANT", "RETURN_TO_CONTRACTOR", "REASSIGN", "REJECT"];
      }
    }

    return actions || [];
  };

  // KPI Calculations
  const stats = useMemo(() => {
    const totalClaims = projectClaims.length;
    const totalClaimed = projectClaims.reduce((sum, c) => sum + (c.totalClaimedAmount || 0), 0);
    const totalConsultantApproved = projectClaims.reduce(
      (sum, c) => sum + (c.totalConsultantApprovedAmount || c.totalClaimedAmount || 0),
      0
    );
    const totalEmployerApproved = projectClaims.reduce(
      (sum, c) => sum + (c.totalEmployerApprovedAmount || c.totalConsultantApprovedAmount || c.totalClaimedAmount || 0),
      0
    );
    return {
      totalClaims,
      totalClaimed,
      totalConsultantApproved,
      totalEmployerApproved
    };
  }, [projectClaims]);

  // Filtered items in active claim
  const filteredItems = useMemo(() => {
    if (!activeClaim || !activeClaim.items) return [];
    return activeClaim.items.filter(item => {
      const matchCategory = categoryFilter === 'ALL' || item.category === categoryFilter;
      const matchSearch =
        searchQuery === '' ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.contractClauseRef.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [activeClaim, categoryFilter, searchQuery]);

  // Handlers for Claims
  const handleOpenNewClaim = () => {
    const nextNum = (projectClaims.length + 1).toString().padStart(2, '0');
    const todayStr = formatShamsiDate(new Date().toLocaleDateString('fa-IR'));
    const p = project as any;
    const contractorOrgId = p?.contractorOrgId || currentUser?.orgId;
    const contractorName = p?.contractorName || p?.contractor || currentUser?.organization || 'شرکت مهندسی و ساختمانی (پیمانکار)';
    const consultantName = p?.consultantName || p?.consultant || 'مهندسین مشاور ناظر';
    const employerName = p?.employerName || p?.employer || p?.client || 'سازمان کارفرمای محترم پروژه';

    const claimNumber = `CLM-LC-${nextNum}`;

    const initialEvent: WorkflowEvent = {
      id: `wf-init-${Date.now()}`,
      action: 'CREATE' as WorkflowAction,
      fromStatus: WorkflowStatus.DRAFT,
      toStatus: WorkflowStatus.DRAFT,
      actorUserId: currentUser?.id || 'u-contractor',
      actorName: currentUser ? formatUserDisplayFormal(currentUser, userOrg) : 'دفتر فنی پیمانکار',
      actorOrgId: currentUser?.orgId || contractorOrgId,
      actorOrgType: userOrgType || OrganizationType.CONTRACTOR,
      actorTitle: currentUser?.jobTitle || 'کارشناس دفتر فنی',
      signature: undefined,
      comment: 'ایجاد و ثبت اولیه پیش‌نویس لایحه ادعای ضرر و زیان و خسارات مالی',
      timestamp: Date.now()
    };

    const newClaim: LossClaim = {
      id: `claim-loss-${Date.now()}`,
      projectId,
      claimNumber,
      title: `لایحه ادعای ضرر و زیان و خسارات مالی - دوره شماره ${nextNum}`,
      periodTitle: `دوره مالی منتهی به ${todayStr}`,
      claimDate: todayStr,
      targetPeriodStart: project.startDate || todayStr,
      targetPeriodEnd: todayStr,
      conclusion: 'مستندات فوق جهت بررسی و صدور دستور پرداخت تقدیم می‌گردد.',
      status: WorkflowStatus.DRAFT,
      isFinalFrozen: false,
      contractorName,
      consultantName,
      employerName,
      introduction: `این لایحه مستند به مفاد شرایط عمومی پیمان و بخشنامه‌های مربوطه جهت جبران خسارات وارده به پیمانکار شامل هزینه‌های بالاسری کارگاه، بخواب ماشین‌آلات و خسارت تاخیر در پرداخت صورت‌وضعیت‌ها تنظیم گردیده است.`,
      legalBasisSummary: `ماده ۴۴ و ۴۹ شرایط عمومی پیمان، بخشنامه ۵۰۹۰ سازمان برنامه و بودجه و بخشنامه ۵۴/۸۴۲`,
      items: [],
      totalClaimedAmount: 0,
      totalConsultantApprovedAmount: 0,
      totalEmployerApprovedAmount: 0,
      ownerOrgId: contractorOrgId || currentUser?.orgId || '',
      currentOrgId: contractorOrgId || currentUser?.orgId || '',
      createdById: currentUser?.id || 'u-contractor',
      assigneeId: currentUser?.id || 'u-contractor',
      workflowHistory: [initialEvent],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updated = [...claims, newClaim];
    handleSaveAllClaims(updated);
    setSelectedClaimId(newClaim.id);
    setViewMode('editor');
    notify(`لایحه ضرر و زیان جدید به شماره ${claimNumber} ایجاد گردید.`);
  };

  const handleSaveClaim = (claimToSave: LossClaim) => {
    const index = claims.findIndex(c => c.id === claimToSave.id);
    let updated: LossClaim[];
    if (index >= 0) {
      updated = [...claims];
      updated[index] = claimToSave;
    } else {
      updated = [claimToSave, ...claims];
    }
    setClaims(updated);
    setSelectedClaimId(claimToSave.id);
    setIsClaimModalOpen(false);
    notify('اطلاعات لایحه با موفقیت ذخیره شد.');
  };

  // Handlers for Items
  const handleOpenAddItem = () => {
    if (!activeClaim) return;
    if (activeClaim.isFinalFrozen) {
      notify('این لایحه منجمد شده و امکان افزودن یا تغییر آیتم وجود ندارد.');
      return;
    }

    const defaultOverheadRate = activeClaim.contractSummary?.dailyOverheadRate || 250000000;
    const defaultApprovedDays = activeClaim.contractSummary?.approvedDelayDays || 30;

    setEditingItem({
      id: `item-${Date.now()}`,
      claimId: activeClaim.id,
      title: 'خسارت بالاسری عمومی و اختصاصی کارگاه در ایام تاخیر مجاز',
      category: 'SITE_OVERHEAD',
      unit: 'روز',
      quantity: defaultApprovedDays,
      unitRate: defaultOverheadRate,
      totalClaimedAmount: defaultApprovedDays * defaultOverheadRate,
      consultantApprovedAmount: defaultApprovedDays * defaultOverheadRate,
      employerApprovedAmount: defaultApprovedDays * defaultOverheadRate,
      contractClauseRef: CATEGORY_MAP.SITE_OVERHEAD.defaultClause,
      rootCause: 'تحمیل هزینه‌های سرپرستی، استهلاک، بیمه و تضامین در طول ایام تاخیر مجاز کارفرما',
      calculationBasis: `محاسبه بر اساس ${defaultApprovedDays} روز تاخیر مجاز × ${defaultOverheadRate.toLocaleString('fa-IR')} ریال هزینه روزانه بالاسری کارگاه`,
      sourceType: 'MANUAL',
      description: 'هزینه‌های کادر فنی، اموال کارگاهی، خدمات، تضامین و نگهداشت در طول دوره تاخیرات غیرتقصیر پیمانکار'
    });
    setIsItemModalOpen(true);
  };

  const handleSaveItem = (itemToSave: LossClaimItem) => {
    if (!activeClaim) return;

    const items = activeClaim.items || [];
    const index = items.findIndex(i => i.id === itemToSave.id);
    let updatedItems: LossClaimItem[];
    if (index >= 0) {
      updatedItems = [...items];
      updatedItems[index] = itemToSave;
    } else {
      updatedItems = [...items, itemToSave];
    }

    const totalClaimed = updatedItems.reduce((sum, i) => sum + (Number(i.totalClaimedAmount) || 0), 0);
    const totalConsultantApproved = updatedItems.reduce((sum, i) => sum + (Number(i.consultantApprovedAmount) || Number(i.totalClaimedAmount) || 0), 0);
    const totalEmployerApproved = updatedItems.reduce((sum, i) => sum + (Number(i.employerApprovedAmount) || Number(i.consultantApprovedAmount) || Number(i.totalClaimedAmount) || 0), 0);

    const updatedClaim: LossClaim = {
      ...activeClaim,
      items: updatedItems,
      totalClaimedAmount: totalClaimed,
      totalConsultantApprovedAmount: totalConsultantApproved,
      totalEmployerApprovedAmount: totalEmployerApproved
    };

    handleSaveClaim(updatedClaim);
    setIsItemModalOpen(false);
  };

  // Duplicate / Copy Item
  const handleDuplicateItem = (item: LossClaimItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!activeClaim) return;
    if (activeClaim.isFinalFrozen) {
      notify('این لایحه قفل شده و امکان تغییر وجود ندارد.');
      return;
    }

    const duplicated: LossClaimItem = {
      ...item,
      id: `item-${Date.now()}`,
      title: `${item.title} (کپی)`
    };

    const updatedItems = [...(activeClaim.items || []), duplicated];
    const totalClaimed = updatedItems.reduce((sum, i) => sum + (Number(i.totalClaimedAmount) || 0), 0);
    const totalConsultantApproved = updatedItems.reduce((sum, i) => sum + (Number(i.consultantApprovedAmount) || Number(i.totalClaimedAmount) || 0), 0);
    const totalEmployerApproved = updatedItems.reduce((sum, i) => sum + (Number(i.employerApprovedAmount) || Number(i.consultantApprovedAmount) || Number(i.totalClaimedAmount) || 0), 0);

    const updatedClaim: LossClaim = {
      ...activeClaim,
      items: updatedItems,
      totalClaimedAmount: totalClaimed,
      totalConsultantApprovedAmount: totalConsultantApproved,
      totalEmployerApprovedAmount: totalEmployerApproved
    };

    handleSaveClaim(updatedClaim);
    notify('ردیف ادعا با موفقیت کپی و افزوده شد.');
  };

  // Delete Modals Handlers
  const handleOpenDeleteClaimModal = (claim: LossClaim, e?: React.MouseEvent) => {
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
    if (activeClaim?.isFinalFrozen) {
      notify('این لایحه قفل شده و امکان حذف ردیف وجود ندارد.');
      return;
    }
    setDeleteTargetClaim(null);
    setDeleteTargetItemId(itemId);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (deleteTargetClaim) {
      const updated = claims.filter(c => c.id !== deleteTargetClaim.id);
      setClaims(updated);
      if (selectedClaimId === deleteTargetClaim.id) {
        const remaining = updated.filter(c => c.projectId === projectId || String(c.projectId) === String(projectId));
        setSelectedClaimId(remaining.length > 0 ? remaining[0].id : null);
      }
      notify('لایحه ضرر و زیان با موفقیت حذف گردید.');
    } else if (deleteTargetItemId && activeClaim) {
      const updatedItems = (activeClaim.items || []).filter(i => i.id !== deleteTargetItemId);
      const totalClaimed = updatedItems.reduce((sum, i) => sum + (Number(i.totalClaimedAmount) || 0), 0);
      const totalConsultantApproved = updatedItems.reduce((sum, i) => sum + (Number(i.consultantApprovedAmount) || Number(i.totalClaimedAmount) || 0), 0);
      const totalEmployerApproved = updatedItems.reduce((sum, i) => sum + (Number(i.employerApprovedAmount) || Number(i.consultantApprovedAmount) || Number(i.totalClaimedAmount) || 0), 0);

      const updatedClaim: LossClaim = {
        ...activeClaim,
        items: updatedItems,
        totalClaimedAmount: totalClaimed,
        totalConsultantApprovedAmount: totalConsultantApproved,
        totalEmployerApprovedAmount: totalEmployerApproved
      };
      handleSaveClaim(updatedClaim);
      notify('ردیف ادعا با موفقیت حذف گردید.');
    }
    setIsDeleteModalOpen(false);
    setDeleteTargetClaim(null);
    setDeleteTargetItemId(null);
  };

  // Workflow Helper: Filter users based on Technical Office hierarchy and role rules
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
      if (titleLower.includes('سرپرست واحد') || titleLower.includes('سرپرست گروه') || titleLower.includes('رئیس گروه') || titleLower.includes('مدیر واحد') || titleLower.includes('رئیس دفتر') || titleLower.includes('سرپرست دفتر فنی') || titleLower.includes('رئیس دفتر فنی')) {
        return 'consultant_head';
      } else if (titleLower.includes('سرپرست کارگاه') || titleLower.includes('مدیر پروژه') || titleLower.includes('سرپرست نظارت') || titleLower.includes('ناظر مقیم') || titleLower.includes('مدیر طرح') || titleLower.includes('نماینده') || titleLower.includes('رئیس کارگاه') || titleLower.includes('مدیر کارگاه') || titleLower.includes('مشاور')) {
        return 'consultant';
      } else {
        return 'consultant_tech';
      }
    }

    if (titleLower.includes('سرپرست کارگاه') || titleLower.includes('مدیر پروژه') || titleLower.includes('مدیر طرح') || titleLower.includes('نماینده') || titleLower.includes('رئیس کارگاه') || titleLower.includes('مدیر کارگاه')) {
      return 'contractor_site';
    } else if (titleLower.includes('سرپرست واحد') || titleLower.includes('مدیر فنی') || titleLower.includes('سرپرست دفتر فنی')) {
      return 'contractor_head';
    }
    return 'contractor_tech';
  };

  const getRoleSignatory = (roleKey: string, customClaim?: any) => {
    const usersList = SystemAdminService.getUsers();
    const proj = project as any;
    const targetObj = customClaim || activeClaim || {};
    const history = (targetObj?.workflowHistory || []) as any[];
    const isUnsigned = !!targetObj?.unsignedSession;

    if (isUnsigned) {
      if (roleKey === 'contractor_tech') {
        return { name: 'کارشناس / تنظیم‌کننده', title: 'کارشناس دفتر فنی پیمانکار', signature: undefined, date: undefined };
      }
      if (roleKey === 'contractor_head') {
        return { name: 'سرپرست واحد فنی', title: 'سرپرست دفتر فنی پیمانکار', signature: undefined, date: undefined };
      }
      if (roleKey === 'contractor_site') {
        return { name: 'سرپرست کارگاه / مدیر پروژه', title: 'مدیر پروژه پیمانکار', signature: undefined, date: undefined };
      }
      if (roleKey === 'consultant_tech') {
        return { name: 'کارشناس / ناظر مقیم', title: 'کارشناس نظارت مشاور', signature: undefined, date: undefined };
      }
      if (roleKey === 'consultant_head') {
        return { name: 'سرپرست واحد نظارت', title: 'سرپرست واحد نظارت مشاور', signature: undefined, date: undefined };
      }
      if (roleKey === 'consultant') {
        return { name: 'سرپرست نظارت / مدیر پروژه', title: 'مدیر پروژه مشاور', signature: undefined, date: undefined };
      }
      if (roleKey === 'employer_tech') {
        return { name: 'کارشناس / بررسی‌کننده', title: 'کارشناس فنی کارفرما', signature: undefined, date: undefined };
      }
      if (roleKey === 'employer_head') {
        return { name: 'سرپرست واحد / مدیر گروه', title: 'مدیر گروه نظارت کارفرما', signature: undefined, date: undefined };
      }
      if (roleKey === 'employer') {
        return { name: 'مدیر طرح / نماینده کارفرما', title: 'نماینده کارفرما / مجری طرح', signature: undefined, date: undefined };
      }
      return null;
    }

    const findEventForRole = (targetRoleKey: string): any => {
      const matchEvent = (e: any): boolean => {
        if (!e) return false;
        const nonSigningActions = ['REJECT', 'RETURN_TO_CONTRACTOR', 'RETURN_TO_CONSULTANT', 'REASSIGN', 'CREATE'];
        if (nonSigningActions.includes(e.action)) return false;

        const actorUser = usersList.find(u => u.id === e.actorUserId || u.fullName === e.actorName || u.username === e.actorName);
        const orgId = e.actorOrgId || actorUser?.orgId;
        const orgType = e.actorOrgType || (actorUser as any)?.orgType || (orgId ? SystemAdminService.getOrganization(orgId)?.type : undefined);

        const isConsultantOrg = orgType === OrganizationType.CONSULTANT || (proj?.consultantOrgId && String(orgId) === String(proj.consultantOrgId));
        const isEmployerOrg = orgType === OrganizationType.EMPLOYER || (proj?.employerOrgId && String(orgId) === String(proj.employerOrgId));
        const isContractorOrg = !isConsultantOrg && !isEmployerOrg;

        if ((e.action === 'RESUBMIT' || e.action === 'SUBMIT') && !isContractorOrg) return false;

        const effectiveRoleKey = e.roleKey || (actorUser ? getRoleKeyForUser(actorUser) : undefined);

        if (effectiveRoleKey) {
          if (effectiveRoleKey === targetRoleKey) {
            if (targetRoleKey.startsWith('contractor_') && isContractorOrg) return true;
            if (targetRoleKey.startsWith('consultant') && isConsultantOrg) return true;
            if (targetRoleKey.startsWith('employer') && isEmployerOrg) return true;
          }
          if (targetRoleKey === 'contractor_tech' && effectiveRoleKey === 'permit_expert' && isContractorOrg) return true;
          if (targetRoleKey === 'contractor_head' && effectiveRoleKey === 'permit_head' && isContractorOrg) return true;
          if (targetRoleKey === 'contractor_site' && effectiveRoleKey === 'permit_site' && isContractorOrg) return true;
          return false;
        }

        const title = ((actorUser?.jobTitle || e.actorTitle || '') + ' ' + (actorUser?.jobLevel || '')).toLowerCase();

        const isContractorSiteTitle = title.includes('سرپرست کارگاه') || title.includes('مدیر پروژه') || title.includes('رئیس کارگاه') || title.includes('مدیر کارگاه') || title.includes('مدیر طرح') || title.includes('نماینده');
        const isContractorHeadTitle = (title.includes('سرپرست واحد') || title.includes('مدیر فنی') || title.includes('سرپرست دفتر') || title.includes('رئیس دفتر') || title.includes('سرپرست بخش')) && !isContractorSiteTitle;

        if (targetRoleKey === 'contractor_tech') {
          if (!isContractorOrg) return false;
          if (isContractorSiteTitle || isContractorHeadTitle) return false;
          return title.includes('کارشناس') || title.includes('تنظیم') || title.includes('دفتر فنی') || title.includes('مهندس') || e.action === 'SUBMIT' || e.action === 'RESUBMIT';
        }
        if (targetRoleKey === 'contractor_head') {
          if (!isContractorOrg) return false;
          if (isContractorSiteTitle) return false;
          return isContractorHeadTitle;
        }
        if (targetRoleKey === 'contractor_site') {
          if (!isContractorOrg) return false;
          return isContractorSiteTitle;
        }

        const isConsultantSiteTitle = title.includes('سرپرست نظارت') || title.includes('مدیر پروژه') || title.includes('مشاور') || title.includes('مدیر نظارت');
        const isConsultantHeadTitle = (title.includes('سرپرست واحد') || title.includes('سرپرست گروه') || title.includes('رئیس گروه') || title.includes('مدیر واحد')) && !isConsultantSiteTitle;

        if (targetRoleKey === 'consultant_tech') {
          if (!isConsultantOrg) return false;
          if (isConsultantSiteTitle || isConsultantHeadTitle) return false;
          return title.includes('کارشناس') || title.includes('ناظر مقیم') || title.includes('بررسی');
        }
        if (targetRoleKey === 'consultant_head') {
          if (!isConsultantOrg) return false;
          if (isConsultantSiteTitle) return false;
          return isConsultantHeadTitle;
        }
        if (targetRoleKey === 'consultant') {
          if (!isConsultantOrg) return false;
          return isConsultantSiteTitle;
        }

        const isEmployerSiteTitle = title.includes('مدیر طرح') || title.includes('نماینده کارفرما') || title.includes('مجری') || title.includes('کارفرما') || title.includes('مدیر عامل');
        const isEmployerHeadTitle = (title.includes('سرپرست واحد') || title.includes('مدیر گروه') || title.includes('رئیس اداره') || title.includes('رئیس گروه')) && !isEmployerSiteTitle;

        if (targetRoleKey === 'employer_tech') {
          if (!isEmployerOrg) return false;
          if (isEmployerSiteTitle || isEmployerHeadTitle) return false;
          return title.includes('کارشناس') || title.includes('بررسی') || title.includes('رسیدگی');
        }
        if (targetRoleKey === 'employer_head') {
          if (!isEmployerOrg) return false;
          if (isEmployerSiteTitle) return false;
          return isEmployerHeadTitle;
        }
        if (targetRoleKey === 'employer') {
          if (!isEmployerOrg) return false;
          return isEmployerSiteTitle;
        }

        return false;
      };

      const matchedEvents = history.filter(matchEvent);
      if (matchedEvents.length === 0) return null;
      const signedEvents = matchedEvents.filter(e => e.signature && e.action !== 'CREATE' && !(e.fromStatus === WorkflowStatus.DRAFT && e.toStatus === WorkflowStatus.DRAFT));
      if (signedEvents.length > 0) return signedEvents[signedEvents.length - 1];
      return null;
    };

    const ev = findEventForRole(roleKey);
    if (!ev) return null;

    const actorUser = usersList.find(u => u.id === ev.actorUserId || u.fullName === ev.actorName);
    const resolvedName = ev.actorName || actorUser?.fullName || 'کاربر سیستم';
    const actorOrg = actorUser?.orgId ? SystemAdminService.getOrganization(actorUser.orgId) : undefined;
    const formalName = actorUser ? formatUserDisplayFormal(actorUser, actorOrg) : resolvedName;

    // Signature must strictly come from ev.signature when explicitly signed/submitted, never auto-injected on draft creation
    const isDraftOrUnsigned = ev.action === 'CREATE' ||
      (ev.fromStatus === WorkflowStatus.DRAFT && ev.toStatus === WorkflowStatus.DRAFT && activeClaim?.status === WorkflowStatus.DRAFT) ||
      !ev.signature;
    const sig = isDraftOrUnsigned ? undefined : ev.signature;

    return {
      name: formalName,
      title: actorUser?.jobTitle || ev.actorTitle || 'کارشناس مسئول',
      signature: sig,
      date: sig && ev.timestamp ? new Date(ev.timestamp).toLocaleDateString('fa-IR') : undefined
    };
  };

  // Workflow Action Handlers
  const handleOpenWorkflowModal = (claim: LossClaim, action: WorkflowAction, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const hrSig = HRService.getUserSignature(currentUser) || currentUser?.signature;
    setWorkflowTargetClaim(claim);
    setWorkflowAction(action);
    setWorkflowComment('');
    setWorkflowAssigneeId('');
    setWorkflowAttachSignature(!!hrSig);
    setIsWorkflowModalOpen(true);
  };

  const handleOpenHistoryModal = (claim: LossClaim, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setHistoryClaim(claim);
    setIsHistoryModalOpen(true);
  };

  // Official Standard Report Print Generator (Matching Delay Claims Standard exactly)
  const handlePrintOfficial = (targetClaim?: LossClaim) => {
    const claim = targetClaim || activeClaim;
    if (!claim) return;

    const title = `لایحه رسمی ادعای ضرر و زیان و خسارات مالی - ${claim.claimNumber}`;
    const projectTitle = project?.title || (project as any)?.name || 'پروژه در حال اجرا';
    const projectContractor = claim.contractorName || (project as any)?.contractorName || 'سازمان پیمانکار';
    const projectConsultant = claim.consultantName || (project as any)?.consultantName || 'دستگاه نظارت و مشاور';
    const projectEmployer = claim.employerName || (project as any)?.employerName || 'دستگاه اجرایی و کارفرما';
    const initialBudget = (project as any)?.initialBudget ? (project as any).initialBudget.toLocaleString('fa-IR') + ' ریال' : (claim.contractSummary?.initialContractAmount ? claim.contractSummary.initialContractAmount.toLocaleString('fa-IR') + ' ریال' : '---');

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

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const lossItemsHtml = (claim.items || []).map((it, idx) => `
      <tr>
        <td style="padding: 5px; text-align: center; font-weight: bold; border: 1px solid #cbd5e1;">${idx + 1}</td>
        <td style="padding: 5px; font-weight: bold; border: 1px solid #cbd5e1;">
          ${it.title}
          ${it.description ? `<div style="font-size: 8.5px; color: #64748b; font-weight: normal; margin-top: 1px;">${it.description}</div>` : ''}
          ${it.rootCause ? `<div style="font-size: 8px; color: #b45309; font-weight: normal; margin-top: 1px;">علت ریشه‌ای: ${it.rootCause}</div>` : ''}
        </td>
        <td style="padding: 5px; border: 1px solid #cbd5e1; font-size: 8.5px;">${CATEGORY_MAP[it.category]?.label || it.category}</td>
        <td style="padding: 5px; font-size: 8.5px; border: 1px solid #cbd5e1;">${it.contractClauseRef || '---'}</td>
        <td style="padding: 5px; text-align: center; font-family: monospace; border: 1px solid #cbd5e1;">${it.quantity?.toLocaleString('fa-IR')} ${it.unit}</td>
        <td style="padding: 5px; text-align: center; font-family: monospace; border: 1px solid #cbd5e1;">${it.unitRate?.toLocaleString('fa-IR')}</td>
        <td style="padding: 5px; text-align: center; font-weight: bold; color: #b45309; font-family: monospace; border: 1px solid #cbd5e1;">${(it.totalClaimedAmount || 0).toLocaleString('fa-IR')}</td>
        <td style="padding: 5px; text-align: center; font-weight: bold; color: #047857; font-family: monospace; border: 1px solid #cbd5e1;">${(it.consultantApprovedAmount || it.totalClaimedAmount || 0).toLocaleString('fa-IR')}</td>
        <td style="padding: 5px; text-align: center; font-weight: bold; color: #1d4ed8; font-family: monospace; border: 1px solid #cbd5e1;">${(it.employerApprovedAmount || it.consultantApprovedAmount || it.totalClaimedAmount || 0).toLocaleString('fa-IR')}</td>
      </tr>
    `).join('');

    const lossLogos = SystemAdminService.getProjectOrgLogos(project);
    const lossLogoHtml = [
      lossLogos.employerLogo ? `<img src="${lossLogos.employerLogo}" style="height: 40px; max-width: 90px; object-fit: contain;" alt="کارفرما" />` : '',
      lossLogos.consultantLogo ? `<img src="${lossLogos.consultantLogo}" style="height: 40px; max-width: 90px; object-fit: contain;" alt="مشاور" />` : '',
      lossLogos.contractorLogo ? `<img src="${lossLogos.contractorLogo}" style="height: 40px; max-width: 90px; object-fit: contain;" alt="پیمانکار" />` : ''
    ].filter(Boolean).join('');

    printWindow.document.write(`
      <html dir="rtl">
        <head>
          <title>${title}</title>
          <style>
            @font-face { font-family: 'Vazir'; src: url('https://cdn.jsdelivr.net/gh/rastikerdar/vazir-font@v30.1.0/dist/Vazir.woff2'); }
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; box-sizing: border-box; }
            body { font-family: 'Vazir', Tahoma, sans-serif; padding: 15px; color: #1e293b; line-height: 1.5; background: #fff; width: 100%; margin: 0; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #1e40af; padding-bottom: 10px; margin-bottom: 15px; }
            .logo-section { display: flex; align-items: center; gap: 10px; }
            .logo-box { width: 36px; height: 36px; background: #1e40af; border-radius: 6px; }
            .content { min-height: 450px; }
            .info-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 11px; }
            .info-table td { padding: 6px 10px; border: 1px solid #cbd5e1; background: #f8fafc; }
            .info-table td strong { color: #0f172a; }
            .table-delays { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 10px; }
            .table-delays th { background: #f1f5f9; color: #1e293b; padding: 6px 4px; border: 1px solid #cbd5e1; font-weight: bold; }
            .table-delays td { padding: 5px; border: 1px solid #cbd5e1; }
            .summary-box { display: flex; justify-content: space-between; gap: 10px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 10px 14px; margin-bottom: 15px; text-align: center; }
            .footer { margin-top: 15px; border-top: 2px solid #64748b; padding-top: 8px; width: 100%; page-break-inside: avoid; break-inside: avoid; }
            .sig-box { text-align: center; }
            @media print {
              .no-print { display: none; }
              body { padding: 5mm; margin: 0; width: 100%; }
              @page { size: A4 landscape; margin: 10mm; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo-section">
              ${lossLogoHtml || '<div class="logo-box"></div>'}
              <div>
                <h1 style="margin: 0; font-size: 16px; color: #1e40af; font-weight: 900;">سامانه مدیریت پروژه همیار</h1>
                <p style="margin: 2px 0 0 0; font-size: 11px; color: #64748b;">گزارش رسمی لایحه ادعای ضرر و زیان و خسارات مالی</p>
              </div>
            </div>
            <div style="text-align: left; font-size: 11px; color: #475569;">
              <div>شماره سند: <strong>${claim.claimNumber}</strong></div>
              <div>تاریخ صدور: <strong>${claim.claimDate}</strong></div>
              <div>وضعیت سند: <strong>${WorkflowService.getStatusLabel(claim.status)}</strong></div>
            </div>
          </div>

          <div class="content">
            <table class="info-table">
              <tr>
                <td><strong>عنوان پروژه:</strong> ${projectTitle}</td>
                <td><strong>دوره مالی لایحه:</strong> ${claim.periodTitle}</td>
              </tr>
              <tr>
                <td><strong>پیمانکار:</strong> ${projectContractor}</td>
                <td><strong>مهندس مشاور:</strong> ${projectConsultant}</td>
              </tr>
              <tr>
                <td><strong>کارفرما:</strong> ${projectEmployer}</td>
                <td><strong>تعداد ردیف‌های ادعا:</strong> ${(claim.items || []).length} ردیف</td>
              </tr>
              <tr>
                <td><strong>مبلغ اولیه پیمان:</strong> ${initialBudget}</td>
                <td><strong>بازه زمانی ادعا:</strong> ${claim.targetPeriodStart} الی ${claim.targetPeriodEnd}</td>
              </tr>
              <tr>
                <td colspan="2"><strong>کل مبلغ ادعایی پیمانکار:</strong> <span style="color: #b45309; font-weight: bold; font-size: 13px;">${(claim.totalClaimedAmount || 0).toLocaleString('fa-IR')} ریال</span></td>
              </tr>
            </table>

            <h3 style="font-size: 12px; color: #1e40af; border-bottom: 2px solid #e2e8f0; padding-bottom: 5px; margin: 15px 0 10px 0;">
              ۱. مقدمه و مبانی قانونی و بخشنامه‌ای ادعا
            </h3>
            <p style="font-size: 11px; line-height: 1.8; text-align: justify; background: #f8fafc; padding: 10px; border-radius: 6px; border: 1px solid #e2e8f0; margin-bottom: 15px;">
              ${claim.introduction || 'بر اساس مستندات موجود و سوابق کارگاهی منضم به این لایحه، خسارات وارده ناشی از عوامل خارج از قصور پیمانکار و شرایط محیطی/کارفرمایی، به شرح تفصیلی زیر محاسبه و جهت رسیدگی ایفاد می‌گردد.'}
              ${claim.legalBasisSummary ? `<br/><strong style="color: #b45309; display: block; margin-top: 6px;">مبانی استنادی:</strong> ${claim.legalBasisSummary}` : ''}
            </p>

            <h3 style="font-size: 12px; color: #1e40af; border-bottom: 2px solid #e2e8f0; padding-bottom: 5px; margin: 15px 0 10px 0;">
              ۲. جدول تفکیکی رویدادها و ریز ادعاهای خسارت مالی
            </h3>
            <table class="table-delays">
              <thead>
                <tr>
                  <th style="width: 25px;">#</th>
                  <th>شرح رویداد و قلم ادعا</th>
                  <th style="width: 120px;">سرفصل خسارت</th>
                  <th style="width: 110px;">استناد بخشنامه‌ای / قرارداد</th>
                  <th style="width: 75px;">مقدار / کارکرد</th>
                  <th style="width: 80px;">نرخ واحد (ریال)</th>
                  <th style="width: 95px;">مبلغ ادعایی (ریال)</th>
                  <th style="width: 95px;">تایید مشاور (ریال)</th>
                  <th style="width: 95px;">تصویب کارفرما (ریال)</th>
                </tr>
              </thead>
              <tbody>
                ${lossItemsHtml || '<tr><td colspan="9" style="text-align: center; padding: 12px; color: #64748b;">هیچ ردیف ادعایی در این لایحه ثبت نشده است.</td></tr>'}
              </tbody>
              <tfoot>
                <tr style="background: #f1f5f9; font-weight: 900; font-size: 10px;">
                  <td colspan="6" style="padding: 6px 8px; text-align: left;">مجموع مبالغ کل لایحه ضرر و زیان:</td>
                  <td style="padding: 6px; text-align: center; color: #b45309;">${(claim.totalClaimedAmount || 0).toLocaleString('fa-IR')}</td>
                  <td style="padding: 6px; text-align: center; color: #047857;">${(claim.totalConsultantApprovedAmount || claim.totalClaimedAmount || 0).toLocaleString('fa-IR')}</td>
                  <td style="padding: 6px; text-align: center; color: #1d4ed8;">${(claim.totalEmployerApprovedAmount || claim.totalConsultantApprovedAmount || claim.totalClaimedAmount || 0).toLocaleString('fa-IR')}</td>
                </tr>
              </tfoot>
            </table>

            <div class="summary-box">
              <div style="flex: 1;">
                <div style="font-size: 10px; color: #64748b;">کل مبلغ ادعایی پیمانکار</div>
                <div style="font-size: 13px; font-weight: 900; color: #b45309; margin-top: 3px;">${(claim.totalClaimedAmount || 0).toLocaleString('fa-IR')} <span style="font-size: 9px; font-weight: normal;">ریال</span></div>
              </div>
              <div style="flex: 1; border-right: 1px solid #fde68a; border-left: 1px solid #fde68a;">
                <div style="font-size: 10px; color: #64748b;">مبلغ تایید شده مهندس مشاور</div>
                <div style="font-size: 13px; font-weight: 900; color: #047857; margin-top: 3px;">${(claim.totalConsultantApprovedAmount || claim.totalClaimedAmount || 0).toLocaleString('fa-IR')} <span style="font-size: 9px; font-weight: normal;">ریال</span></div>
              </div>
              <div style="flex: 1;">
                <div style="font-size: 10px; color: #64748b;">مبلغ مصوب کارفرما</div>
                <div style="font-size: 13px; font-weight: 900; color: #1d4ed8; margin-top: 3px;">${(claim.totalEmployerApprovedAmount || claim.totalConsultantApprovedAmount || claim.totalClaimedAmount || 0).toLocaleString('fa-IR')} <span style="font-size: 9px; font-weight: normal;">ریال</span></div>
              </div>
            </div>

            ${claim.conclusion ? `
              <h3 style="font-size: 12px; color: #1e40af; border-bottom: 2px solid #e2e8f0; padding-bottom: 5px; margin: 15px 0 10px 0;">
                ۳. جمع‌بندی و نتیجه‌گیری نهایی
              </h3>
              <p style="font-size: 11px; line-height: 1.8; text-align: justify; background: #f8fafc; padding: 10px; border-radius: 6px; border: 1px solid #e2e8f0; margin-bottom: 15px;">
                ${claim.conclusion}
              </p>
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

          <div class="no-print" style="margin-top: 15px; text-align: center;">
            <button onclick="window.print()" style="padding: 8px 20px; background: #1e40af; color: #fff; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 11px; font-family: inherit;">چاپ سند رسمی (Print Official Document)</button>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 500);
  };

  // Target Org users for assignment (Filtered strictly per Technical Office hierarchy rules)
  const orgUsers = useMemo(() => {
    if (!workflowAction || !workflowTargetClaim) return [];
    const isSystemAdmin = currentUser?.role === 'SYSTEM_ADMIN';
    const allUsers = users.filter(u => u.isActive !== false);

    if (workflowAction === 'SEND_TO_CONSULTANT' || workflowAction === 'RETURN_TO_CONSULTANT') {
      if (isSystemAdmin) {
        return filterWorkflowUsers(allUsers, currentUser);
      }
      const consultantOrg = organizations.find(o => o.type === OrganizationType.CONSULTANT);
      return consultantOrg ? filterWorkflowUsers(allUsers.filter(u => u.orgId === consultantOrg.id), currentUser) : [];
    }
    if (workflowAction === 'SEND_TO_EMPLOYER') {
      if (isSystemAdmin) {
        return filterWorkflowUsers(allUsers, currentUser);
      }
      const employerOrg = organizations.find(o => o.type === OrganizationType.EMPLOYER);
      return employerOrg ? filterWorkflowUsers(allUsers.filter(u => u.orgId === employerOrg.id), currentUser) : [];
    }
    if (workflowAction === 'RETURN_TO_CONTRACTOR') {
      if (isSystemAdmin) {
        return filterWorkflowUsers(allUsers, currentUser);
      }
      const targetOrgId = workflowTargetClaim.ownerOrgId;
      const contractorOrg = targetOrgId
        ? organizations.find(o => o.id === targetOrgId)
        : organizations.find(o => o.type === OrganizationType.CONTRACTOR);
      return contractorOrg ? filterWorkflowUsers(allUsers.filter(u => u.orgId === contractorOrg.id), currentUser) : [];
    }

    // Default: users inside the same organization filtered by role level
    return currentUser?.orgId
      ? filterWorkflowUsers(allUsers.filter(u => u.orgId === currentUser.orgId), currentUser)
      : filterWorkflowUsers(allUsers, currentUser);
  }, [workflowAction, workflowTargetClaim, currentUser, organizations, users]);

  const handleExecuteWorkflow = () => {
    if (!workflowTargetClaim || !workflowAction || !currentUser) return;

    const hrSig = HRService.getUserSignature(currentUser) || currentUser?.signature;
    if (workflowAttachSignature && !hrSig) {
      console.warn("HR Signature missing, proceeding without attached PNG signature.");
    }

    try {
      const orgs = SystemAdminService.getOrganizations();
      const contractorOrg = orgs.find(o => o.type === OrganizationType.CONTRACTOR);
      const consultantOrg = orgs.find(o => o.type === OrganizationType.CONSULTANT);
      const employerOrg = orgs.find(o => o.type === OrganizationType.EMPLOYER);

      let targetOrgId: string | undefined;
      if (workflowAction === 'SEND_TO_CONSULTANT' || workflowAction === 'RETURN_TO_CONSULTANT') {
        if (consultantOrg) targetOrgId = consultantOrg.id;
      } else if (workflowAction === 'SEND_TO_EMPLOYER') {
        if (employerOrg) targetOrgId = employerOrg.id;
      } else if (workflowAction === 'RETURN_TO_CONTRACTOR') {
        const contractOrgId = workflowTargetClaim.ownerOrgId;
        const targetContractor = contractOrgId
          ? orgs.find(o => o.id === contractOrgId)
          : contractorOrg;
        if (targetContractor) targetOrgId = targetContractor.id;
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

      // Normalize claim before calling performAction to guarantee consistency
      let targetCurrentOrgId = workflowTargetClaim.currentOrgId;
      if (!targetCurrentOrgId) {
        if (
          workflowTargetClaim.status === WorkflowStatus.SENT_TO_CONSULTANT ||
          workflowTargetClaim.status === WorkflowStatus.IN_CONSULTANT_REVIEW ||
          workflowTargetClaim.status === WorkflowStatus.APPROVED_BY_CONSULTANT
        ) {
          targetCurrentOrgId = consultantOrg?.id;
        } else if (
          workflowTargetClaim.status === WorkflowStatus.SENT_TO_EMPLOYER ||
          workflowTargetClaim.status === WorkflowStatus.IN_EMPLOYER_REVIEW ||
          workflowTargetClaim.status === WorkflowStatus.APPROVED_BY_EMPLOYER
        ) {
          targetCurrentOrgId = employerOrg?.id;
        } else {
          targetCurrentOrgId = workflowTargetClaim.ownerOrgId || contractorOrg?.id || currentUser.orgId;
        }
      }

      const claimToExecute: LossClaim = {
        ...workflowTargetClaim,
        ownerOrgId: workflowTargetClaim.ownerOrgId || contractorOrg?.id || currentUser.orgId,
        currentOrgId: targetCurrentOrgId || currentUser.orgId,
        createdById: workflowTargetClaim.createdById || currentUser.id,
        assigneeId: workflowTargetClaim.assigneeId || (workflowTargetClaim.status === WorkflowStatus.DRAFT ? currentUser.id : undefined)
      };

      const updatedItem = WorkflowService.performAction(
        claimToExecute,
        workflowAction,
        currentUser,
        payload
      ) as LossClaim;

      const updatedList = claims.map(c => (c.id === updatedItem.id ? updatedItem : c));
      setClaims(updatedList);
      saveData('hamyar_loss_claims', updatedList);
      saveData('loss_claims_list', updatedList);
      setSelectedClaimId(updatedItem.id);

      SystemAdminService.addAuditLog({
        user: currentUser.id,
        action: workflowAction,
        details: `تغییر وضعیت گردش کار به [${workflowAction}] برای لایحه ادعای ضرر و زیان: ${claimToExecute.claimNumber} - ${claimToExecute.title}`,
        source: 'دفتر فنی (لایحه ادعا و ضرر و زیان)',
        sourceType: 'TECHNICAL'
      });

      setIsWorkflowModalOpen(false);
      setWorkflowTargetClaim(null);
      setWorkflowAction(null);
      notify(`عملیات گردش کار (${WorkflowService.getActionLabel(workflowAction, userOrgType)}) با موفقیت ثبت و اجرا شد.`);
    } catch (err: any) {
      alert('خطا در انجام عملیات گردش کار: ' + (err.message || err));
    }
  };

  // Automated Integration: Import Overhead Claim from EOT Delay Claims
  const handleImportOverheadFromDelayClaims = () => {
    if (!activeClaim) return;

    const savedDelayClaims = loadData<DelayClaim[]>('delay_claims_list', []) || loadData<DelayClaim[]>('hamyar_delay_claims', []);
    const projectDelayClaims = savedDelayClaims.filter(
      dc => dc.projectId === projectId || String(dc.projectId) === String(projectId)
    );

    const approvedEots = projectDelayClaims.filter(
      dc => dc.isFinalFrozen || dc.status === WorkflowStatus.APPROVED_BY_EMPLOYER || dc.status === WorkflowStatus.APPROVED_BY_CONSULTANT
    );

    if (approvedEots.length === 0) {
      notify('هیچ لایحه تاخیراتی (EOT) تاییدشده یا منجمدشده‌ای در این پروژه جهت استخراج ایام تاخیر یافت نشد.');
      return;
    }

    let addedCount = 0;
    const currentItems = [...(activeClaim.items || [])];
    const dailyRate = activeClaim.contractSummary?.dailyOverheadRate || 250000000;

    approvedEots.forEach(eot => {
      const netDays = eot.totalNetJustifiedDays || 0;
      if (netDays > 0) {
        const itemExists = currentItems.some(i => i.sourceRefId === eot.id);
        if (!itemExists) {
          const totalAmt = netDays * dailyRate;
          const newItem: LossClaimItem = {
            id: `item-eot-${eot.id}-${Date.now()}`,
            claimId: activeClaim.id,
            title: `خسارت بالاسری کارگاه بر مبنای تاخیرات مجاز لایحه شماره ${eot.claimNumber}`,
            category: 'SITE_OVERHEAD',
            unit: 'روز',
            quantity: netDays,
            unitRate: dailyRate,
            totalClaimedAmount: totalAmt,
            consultantApprovedAmount: totalAmt,
            employerApprovedAmount: totalAmt,
            contractClauseRef: 'ماده ۴۴ و ۳۰ شرایط عمومی پیمان - بخشنامه ۵۴/۸۴۲ جبران هزینه‌های بالاسری کارگاه',
            rootCause: `استناد به ${netDays} روز تاخیر مجاز تایید شده در لایحه تاخیرات ${eot.claimNumber} (${eot.periodTitle})`,
            calculationBasis: `${netDays} روز تاخیر مجاز × ${dailyRate.toLocaleString('fa-IR')} ریال نرخ روزانه مصوب بالاسری`,
            sourceType: 'DELAY_CLAIM',
            sourceRefId: eot.id,
            description: `هزینه‌های مستمر کارگاه شامل بیمه، تضامین، سرپرستی و کرایه تجهیزات در طول مدت ${netDays} روز تاخیر مجاز تاییدشده`
          };
          currentItems.push(newItem);
          addedCount++;
        }
      }
    });

    if (addedCount > 0) {
      const totalClaimed = currentItems.reduce((sum, i) => sum + (Number(i.totalClaimedAmount) || 0), 0);
      const totalConsultantApproved = currentItems.reduce((sum, i) => sum + (Number(i.consultantApprovedAmount) || Number(i.totalClaimedAmount) || 0), 0);
      const totalEmployerApproved = currentItems.reduce((sum, i) => sum + (Number(i.employerApprovedAmount) || Number(i.consultantApprovedAmount) || Number(i.totalClaimedAmount) || 0), 0);

      const updatedClaim: LossClaim = {
        ...activeClaim,
        items: currentItems,
        totalClaimedAmount: totalClaimed,
        totalConsultantApprovedAmount: totalConsultantApproved,
        totalEmployerApprovedAmount: totalEmployerApproved
      };
      handleSaveClaim(updatedClaim);
      notify(`تعداد ${addedCount} ردیف ادعای بالاسری از لوایح تاخیرات مجاز پروژه با موفقیت استخراج و افزوده شد.`);
    } else {
      notify('تمام لوایح تاخیرات تاییدشده قبلاً به این لایحه خسارت اضافه شده‌اند.');
    }
  };

  // Automated Integration: Extract Idle Equipment & Labor from Daily Reports
  const handleImportIdleEquipmentFromDailyReports = () => {
    if (!activeClaim) return;

    const savedReports = loadData<DailyReport[]>('hamyar_daily_reports', []) || loadData<DailyReport[]>('daily_reports', []);
    const projectReports = savedReports.filter(
      r => r.projectId === projectId || String(r.projectId) === String(projectId)
    );

    if (projectReports.length === 0) {
      notify('گزارش روزانه‌ای در این پروژه ثبت نشده است.');
      return;
    }

    const reportsWithObstacles = projectReports.filter(
      r => (r.problems && r.problems.length > 0) || (r.machinery && r.machinery.some(m => (m as any).idleHours > 0))
    );

    if (reportsWithObstacles.length === 0) {
      notify('هیچ موانع یا بخواب ماشین‌آلاتی در گزارشات روزانه این پروژه ثبت نشده است.');
      return;
    }

    let addedCount = 0;
    const currentItems = [...(activeClaim.items || [])];

    reportsWithObstacles.forEach(report => {
      if (report.problems && report.problems.length > 0) {
        report.problems.forEach((prob, idx) => {
          const refKey = `daily-prob-${report.date}-${idx}`;
          if (!currentItems.some(i => i.sourceRefId === refKey)) {
            const defaultLoss = 85000000;
            const newItem: LossClaimItem = {
              id: `item-prob-${Date.now()}-${idx}`,
              claimId: activeClaim.id,
              title: `خسارت بخواب کارگاه و توقف عملیات به علت: ${prob.description?.slice(0, 40) || 'معارض کارگاهی'}`,
              category: 'IDLE_EQUIPMENT_LABOR',
              unit: 'مورد/روز',
              quantity: 1,
              unitRate: defaultLoss,
              totalClaimedAmount: defaultLoss,
              consultantApprovedAmount: defaultLoss,
              employerApprovedAmount: defaultLoss,
              contractClauseRef: 'بخشنامه ۵۴/۸۴۲ و ماده ۴۹ شرایط عمومی پیمان',
              rootCause: prob.description || 'توقف عملیات اجرایی و بیکاری اکیپ‌ها بر اساس گزارش روزانه',
              calculationBasis: `گزارش روزانه مورخ ${report.date} - ${prob.description?.slice(0, 50)}`,
              sourceType: 'DAILY_REPORT',
              sourceRefId: refKey,
              description: `توقف فعالیت به استناد گزارش روزانه شماره ${report.reportNumber || report.date} - ${prob.description || ''}`
            };
            currentItems.push(newItem);
            addedCount++;
          }
        });
      }
    });

    if (addedCount > 0) {
      const totalClaimed = currentItems.reduce((sum, i) => sum + (Number(i.totalClaimedAmount) || 0), 0);
      const totalConsultantApproved = currentItems.reduce((sum, i) => sum + (Number(i.consultantApprovedAmount) || Number(i.totalClaimedAmount) || 0), 0);
      const totalEmployerApproved = currentItems.reduce((sum, i) => sum + (Number(i.employerApprovedAmount) || Number(i.consultantApprovedAmount) || Number(i.totalClaimedAmount) || 0), 0);

      const updatedClaim: LossClaim = {
        ...activeClaim,
        items: currentItems,
        totalClaimedAmount: totalClaimed,
        totalConsultantApprovedAmount: totalConsultantApproved,
        totalEmployerApprovedAmount: totalEmployerApproved
      };
      handleSaveClaim(updatedClaim);
      notify(`تعداد ${addedCount} مورد خسارت معطلی و بخواب از گزارشات روزانه به لایحه اضافه شد.`);
    } else {
      notify('موانع و بخواب‌های موجود در گزارشات روزانه قبلاً استخراج شده‌اند.');
    }
  };

  // Automated Integration: Circular 5090 Delayed Financial Interests
  const handleImportDelayedPayments5090 = () => {
    if (!activeClaim) return;

    const savedStatements = loadData<Statement[]>('statements', []) || loadData<Statement[]>('hamyar_statements', []);
    const projectStatements = savedStatements.filter(
      s => s.projectId === projectId || String(s.projectId) === String(projectId)
    );

    if (projectStatements.length === 0) {
      notify('هیچ صورت‌وضعیتی در این پروژه ثبت نشده است.');
      return;
    }

    let addedCount = 0;
    const currentItems = [...(activeClaim.items || [])];

    projectStatements.forEach((st: any) => {
      const refKey = `stmt-5090-${st.id}`;
      if (!currentItems.some(i => i.sourceRefId === refKey)) {
        const approvedAmount = Number(st.approvedAmountByEmployer) || Number(st.approvedAmountByConsultant) || Number(st.claimedAmount) || Number(st.totalAmount) || 1000000000;
        const delayDays = 45;
        const annualRate = 0.23;
        const interestAmount = Math.round((approvedAmount * annualRate * delayDays) / 365);

        const newItem: LossClaimItem = {
          id: `item-stmt-${st.id}-${Date.now()}`,
          claimId: activeClaim.id,
          title: `خسارت تاخیر در پرداخت صورت‌وضعیت شماره ${st.statementNumber || st.number || st.period || '۱'}`,
          category: 'FINANCIAL_INTEREST_5090',
          unit: 'ریال/دوره',
          quantity: delayDays,
          unitRate: Math.round(interestAmount / delayDays),
          totalClaimedAmount: interestAmount,
          consultantApprovedAmount: interestAmount,
          employerApprovedAmount: interestAmount,
          contractClauseRef: 'بخشنامه شماره ۵۰۹۰/۵۴/۱۱۰۸۲-۱ سازمان برنامه و بودجه',
          rootCause: `تاخیر ${delayDays} روزه در پرداخت صورت‌وضعیت تایید شده شماره ${st.statementNumber || st.number || '۱'}`,
          calculationBasis: `مبلغ صورت‌وضعیت: ${approvedAmount.toLocaleString('fa-IR')} ریال × نرخ سالانه ${(annualRate * 100).toFixed(0)}% × ${delayDays} روز ÷ ۳۶۵`,
          sourceType: 'STATEMENT',
          sourceRefId: refKey,
          description: `جبران خسارت افت ارزش پول و تاخیر در پرداخت صورت‌وضعیت طبق ضوابط بخشنامه ۵۰۹۰`
        };
        currentItems.push(newItem);
        addedCount++;
      }
    });

    if (addedCount > 0) {
      const totalClaimed = currentItems.reduce((sum, i) => sum + (Number(i.totalClaimedAmount) || 0), 0);
      const totalConsultantApproved = currentItems.reduce((sum, i) => sum + (Number(i.consultantApprovedAmount) || Number(i.totalClaimedAmount) || 0), 0);
      const totalEmployerApproved = currentItems.reduce((sum, i) => sum + (Number(i.employerApprovedAmount) || Number(i.consultantApprovedAmount) || Number(i.totalClaimedAmount) || 0), 0);

      const updatedClaim: LossClaim = {
        ...activeClaim,
        items: currentItems,
        totalClaimedAmount: totalClaimed,
        totalConsultantApprovedAmount: totalConsultantApproved,
        totalEmployerApprovedAmount: totalEmployerApproved
      };
      handleSaveClaim(updatedClaim);
      notify(`تعداد ${addedCount} مورد خسارت تاخیر در پرداخت (بخشنامه ۵۰۹۰) به لایحه اضافه شد.`);
    } else {
      notify('تمام موارد تاخیر صورت‌وضعیت‌ها قبلاً استخراج شده‌اند.');
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn dir-rtl text-right">
      {/* ========================================================================= */}
      {/* 1. CLAIMS LIST VIEW */}
      {/* ========================================================================= */}
      {viewMode === 'list' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Top Banner & Header */}
          <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 lg:p-8 border border-[#ece5d8] dark:border-stone-800 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200/80 dark:border-stone-800 pb-5">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-black text-stone-900 dark:text-white flex items-center gap-2.5">
                    <Scale className="text-amber-500" size={26} />
                    ماژول مدیریت لوایح ادعای خسارات مالی و ضرر و زیان پیمان
                  </h1>
                  <span className="px-3 py-1 bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-xs font-black rounded-xl border border-amber-300 dark:border-amber-800">
                    بخشنامه‌های ۵۰۹۰، ۵۴/۸۴۲ و شرایط عمومی پیمان
                  </span>
                </div>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 leading-relaxed">
                  استخراج اتوماتیک خسارات بالاسری کارگاه، بخواب ماشین‌آلات و تجهیزات، تاخیر در پرداخت صورت‌وضعیت‌ها و هزینه‌های تعلیق با اتصال به دفاتر فنی و اجرایی
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleOpenNewClaim}
                  className="px-5 py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black text-xs rounded-2xl transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2"
                >
                  <Plus size={18} />
                  ایجاد لایحه ضرر و زیان جدید (New Loss Claim)
                </button>
              </div>
            </div>

            {/* Project Claims Select Bar & Overview KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-stone-50 dark:bg-stone-800/40 p-4 rounded-2xl border border-stone-200/80 dark:border-stone-800 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-stone-500 dark:text-stone-400 block">تعداد لوایح ادعا</span>
                  <span className="text-xl font-black text-stone-800 dark:text-stone-100 mt-1 block">
                    {projectClaims.length} لایحه
                  </span>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-950/60 text-blue-600 rounded-xl">
                  <FileSpreadsheet size={22} />
                </div>
              </div>

              <div className="bg-stone-50 dark:bg-stone-800/40 p-4 rounded-2xl border border-stone-200/80 dark:border-stone-800 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-stone-500 dark:text-stone-400 block">مجموع ادعای مالی پیمانکار</span>
                  <span className="text-lg font-black text-amber-600 dark:text-amber-400 mt-1 block">
                    {stats.totalClaimed.toLocaleString('fa-IR')} <span className="text-xs">ریال</span>
                  </span>
                </div>
                <div className="p-3 bg-amber-100 dark:bg-amber-950/60 text-amber-600 rounded-xl">
                  <DollarSign size={22} />
                </div>
              </div>

              <div className="bg-stone-50 dark:bg-stone-800/40 p-4 rounded-2xl border border-stone-200/80 dark:border-stone-800 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-stone-500 dark:text-stone-400 block">مبلغ تایید شده مشاور</span>
                  <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-1 block">
                    {stats.totalConsultantApproved.toLocaleString('fa-IR')} <span className="text-xs">ریال</span>
                  </span>
                </div>
                <div className="p-3 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 rounded-xl">
                  <CheckCircle2 size={22} />
                </div>
              </div>

              <div className="bg-stone-50 dark:bg-stone-800/40 p-4 rounded-2xl border border-stone-200/80 dark:border-stone-800 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-stone-500 dark:text-stone-400 block">مبلغ تصویب نهایی کارفرما</span>
                  <span className="text-lg font-black text-blue-600 dark:text-blue-400 mt-1 block">
                    {stats.totalEmployerApproved.toLocaleString('fa-IR')} <span className="text-xs">ریال</span>
                  </span>
                </div>
                <div className="p-3 bg-purple-100 dark:bg-purple-950/60 text-purple-600 rounded-xl">
                  <ShieldCheck size={22} />
                </div>
              </div>
            </div>
          </div>

          {/* Claims List Table with Per-Row Workflow and Operation Buttons */}
          <div className="bg-white dark:bg-stone-900 rounded-3xl border border-[#ece5d8] dark:border-stone-800 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-[#ece5d8] dark:border-stone-800 flex items-center justify-between gap-4 flex-wrap">
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
                  <Scale size={32} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-black text-stone-800 dark:text-stone-200">
                    هنوز لایحه ادعای ضرر و زیانی برای این پروژه تدوین نشده است
                  </h4>
                  <p className="text-xs text-stone-500 dark:text-stone-400 max-w-md mx-auto">
                    می‌توانید با کلیک بر روی دکمه «ایجاد لایحه ضرر و زیان جدید»، اولین ادعای خسارات مالی را تدوین نمایید.
                  </p>
                </div>
                <button
                  onClick={handleOpenNewClaim}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-amber-500/20 inline-flex items-center gap-2"
                >
                  <Plus size={16} />
                  ایجاد اولین لایحه
                </button>
              </div>
            ) : (
              <div className="divide-y divide-[#ece5d8] dark:divide-stone-800">
                {filteredClaims.map(claim => {
                  const availableActions = currentUser
                    ? getClaimWorkflowActions(claim)
                    : [];
                  const isEditable = canUserEditClaim(claim);

                  return (
                    <div
                      key={claim.id}
                      onClick={() => {
                        setSelectedClaimId(claim.id);
                        setViewMode('editor');
                      }}
                      className="p-5 hover:bg-stone-50/80 dark:hover:bg-stone-800/40 transition-all cursor-pointer flex flex-col xl:flex-row xl:items-center justify-between gap-4"
                    >
                      {/* Left info block */}
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
                              {claim.items?.length || 0} ردیف ادعا
                            </span>
                          </div>

                          <p className="text-xs text-stone-500 dark:text-stone-400 line-clamp-1">{claim.periodTitle}</p>
                          
                          <div className="flex items-center gap-4 text-[11px] text-stone-400 pt-1 flex-wrap">
                            <span>تاریخ تهیه: {claim.claimDate}</span>
                            <span>•</span>
                            <span>بازه ادعا: {claim.targetPeriodStart} الی {claim.targetPeriodEnd}</span>
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
                        {/* Financial Summary Column */}
                        <div className="text-right min-w-[170px] space-y-0.5">
                          <div className="text-[11px] text-stone-500">
                            ادعای پیمانکار: <span className="font-mono font-bold">{(claim.totalClaimedAmount || 0).toLocaleString('fa-IR')}</span> ریال
                          </div>
                          <div className="text-[11px] text-amber-600">
                            تایید مشاور: <span className="font-mono font-bold">{(claim.totalConsultantApprovedAmount || 0).toLocaleString('fa-IR')}</span> ریال
                          </div>
                          <div className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                            مصوب نهایی: <span className="font-mono">{(claim.totalEmployerApprovedAmount || 0).toLocaleString('fa-IR')}</span> ریال
                          </div>
                        </div>

                        {/* Standard Workflow Action Buttons for this row */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {availableActions.map(action => (
                            <button
                              key={action}
                              onClick={e => {
                                e.stopPropagation();
                                handleOpenWorkflowModal(claim, action, e);
                              }}
                              className={`px-3 py-1.5 rounded-xl font-black text-[11px] transition-all flex items-center gap-1 shadow-sm ${WorkflowService.getActionStyle(
                                action
                              )}`}
                            >
                              {WorkflowService.getActionLabel(action, userOrgType)}
                            </button>
                          ))}

                          {/* Workflow History Button */}
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              handleOpenHistoryModal(claim, e);
                            }}
                            title="تاریخچه تغییرات"
                            className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 transition-all"
                          >
                            <ScrollText size={16} />
                          </button>

                          {/* Standard Print Official Document */}
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              handlePrintOfficial(claim);
                            }}
                            title="چاپ گزارش استاندارد"
                            className="p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 transition-all"
                          >
                            <Printer size={16} />
                          </button>

                          {/* Edit Claim (ONLY if editable) */}
                          {isEditable && (
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                setSelectedClaimId(claim.id);
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
      {viewMode === 'editor' && activeClaim && (
        <div className="space-y-6 animate-fadeIn">
          {/* Top Navigation & Workflow Action Bar */}
          <div className="bg-white dark:bg-stone-900 rounded-3xl p-5 border border-[#ece5d8] dark:border-stone-800 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setViewMode('list')}
                className="p-2.5 rounded-2xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 transition-all flex items-center gap-2"
                title="بازگشت به فهرست لوایح"
              >
                <ArrowRight size={20} />
                <span className="text-xs font-bold hidden sm:inline">بازگشت به فهرست</span>
              </button>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-black text-xs px-2.5 py-0.5 bg-amber-500/10 text-amber-600 rounded-lg">
                    {activeClaim.claimNumber}
                  </span>
                  <h2 className="text-base font-black text-stone-900 dark:text-stone-100">{activeClaim.title}</h2>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${WorkflowService.getStatusStyle(
                      activeClaim.status
                    )}`}
                  >
                    {WorkflowService.getStatusLabel(activeClaim.status)}
                  </span>
                  {activeClaim.isFinalFrozen && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-stone-900 text-amber-300 flex items-center gap-1">
                      <Lock size={10} />
                      قفل نهایی
                    </span>
                  )}
                </div>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                  دوره ادعا: {activeClaim.periodTitle} • تاریخ تنظیم: {activeClaim.claimDate} • گردش کار تاییدات
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Workflow Actions for Active Claim */}
              {currentUser &&
                getClaimWorkflowActions(activeClaim).map(action => (
                  <button
                    key={action}
                    onClick={e => handleOpenWorkflowModal(activeClaim, action, e)}
                    className={`px-3.5 py-2.5 rounded-xl font-black text-xs transition-all flex items-center gap-1.5 shadow-sm ${WorkflowService.getActionStyle(
                      action
                    )}`}
                  >
                    {WorkflowService.getActionLabel(action, userOrgType)}
                  </button>
                ))}

              <button
                onClick={e => handleOpenHistoryModal(activeClaim, e)}
                className="px-3 py-2.5 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5"
                title="تاریخچه تغییرات"
              >
                <ScrollText size={15} />
                تاریخچه
              </button>

              <button
                onClick={() => handlePrintOfficial(activeClaim)}
                className="px-3.5 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5"
                title="چاپ لایحه رسمی"
              >
                <Printer size={15} />
                چاپ رسمی
              </button>

              {canUserEditClaim(activeClaim) && (
                <button
                  onClick={() => {
                    setEditingClaim(activeClaim);
                    setIsClaimModalOpen(true);
                  }}
                  className="px-3 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5"
                  title="ویرایش مشخصات عمومی"
                >
                  <Edit3 size={15} />
                  مشخصات
                </button>
              )}

              {canUserDeleteThisClaim(activeClaim) && (
                <button
                  onClick={e => handleOpenDeleteClaimModal(activeClaim, e)}
                  title="حذف لایحه"
                  className="px-3 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 dark:text-rose-400 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 border border-rose-200 dark:border-rose-800/60"
                >
                  <Trash2 size={15} />
                  حذف لایحه
                </button>
              )}

              {canUserEditClaim(activeClaim) && (
                <button
                  onClick={handleOpenAddItem}
                  className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-black text-xs transition-all shadow-md shadow-amber-500/20 flex items-center gap-1.5"
                >
                  <Plus size={16} />
                  افزودن ردیف ادعا
                </button>
              )}
            </div>
          </div>

          {/* Automated Data Extraction Toolbox & KPI Bar */}
          <div className="bg-amber-500/10 dark:bg-amber-950/30 p-5 rounded-3xl border border-amber-300/60 dark:border-amber-800/60 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <RefreshCw className="text-amber-600 dark:text-amber-400" size={20} />
                <h3 className="text-xs font-black text-amber-900 dark:text-amber-200">
                  ابزارهای بازخوانی هوشمند و استخراج داده از سایر بخش‌های سیستم
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleImportOverheadFromDelayClaims}
                  disabled={activeClaim.isFinalFrozen || !canUserEditClaim(activeClaim)}
                  className="px-3.5 py-2 bg-white dark:bg-stone-800 hover:bg-amber-50 dark:hover:bg-stone-700 text-amber-900 dark:text-amber-200 font-bold text-xs rounded-xl border border-amber-300 dark:border-amber-800 transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  <Building2 size={15} className="text-amber-600" />
                  استخراج بالاسری (لایحه تاخیرات)
                </button>

                <button
                  onClick={handleImportIdleEquipmentFromDailyReports}
                  disabled={activeClaim.isFinalFrozen || !canUserEditClaim(activeClaim)}
                  className="px-3.5 py-2 bg-white dark:bg-stone-800 hover:bg-amber-50 dark:hover:bg-stone-700 text-amber-900 dark:text-amber-200 font-bold text-xs rounded-xl border border-amber-300 dark:border-amber-800 transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  <Clock size={15} className="text-rose-600" />
                  استخراج بخواب ماشین‌آلات (گزارش روزانه)
                </button>

                <button
                  onClick={handleImportDelayedPayments5090}
                  disabled={activeClaim.isFinalFrozen || !canUserEditClaim(activeClaim)}
                  className="px-3.5 py-2 bg-white dark:bg-stone-800 hover:bg-amber-50 dark:hover:bg-stone-700 text-amber-900 dark:text-amber-200 font-bold text-xs rounded-xl border border-amber-300 dark:border-amber-800 transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  <DollarSign size={15} className="text-emerald-600" />
                  استخراج تاخیر پرداخت (بخشنامه ۵۰۹۰)
                </button>

                <button
                  onClick={handleOpenAddItem}
                  disabled={activeClaim.isFinalFrozen || !canUserEditClaim(activeClaim)}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-md shadow-amber-500/20 disabled:opacity-50"
                >
                  <Plus size={16} />
                  افزودن دستی ردیف ادعا
                </button>
              </div>
            </div>

            {/* Financial Overview for Active Claim */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-amber-200/60 dark:border-amber-800/40">
              <div className="bg-white/80 dark:bg-stone-900/80 p-3.5 rounded-2xl border border-amber-200/80 dark:border-stone-800">
                <span className="text-[10px] font-bold text-stone-500 block">مبلغ کل ادعای پیمانکار</span>
                <span className="text-base font-black text-amber-600 dark:text-amber-400 mt-1 block">
                  {(activeClaim.totalClaimedAmount || 0).toLocaleString('fa-IR')} <span className="text-xs font-normal">ریال</span>
                </span>
              </div>
              <div className="bg-white/80 dark:bg-stone-900/80 p-3.5 rounded-2xl border border-amber-200/80 dark:border-stone-800">
                <span className="text-[10px] font-bold text-stone-500 block">مبلغ تایید شده مهندس مشاور</span>
                <span className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-1 block">
                  {(activeClaim.totalConsultantApprovedAmount || 0).toLocaleString('fa-IR')} <span className="text-xs font-normal">ریال</span>
                </span>
              </div>
              <div className="bg-white/80 dark:bg-stone-900/80 p-3.5 rounded-2xl border border-amber-200/80 dark:border-stone-800">
                <span className="text-[10px] font-bold text-stone-500 block">مبلغ تصویب نهایی کارفرما</span>
                <span className="text-base font-black text-blue-600 dark:text-blue-400 mt-1 block">
                  {(activeClaim.totalEmployerApprovedAmount || 0).toLocaleString('fa-IR')} <span className="text-xs font-normal">ریال</span>
                </span>
              </div>
            </div>
          </div>

          {/* Items Table & Filter Controls */}
          <div className="bg-white dark:bg-stone-900 rounded-3xl border border-[#ece5d8] dark:border-stone-800 shadow-sm overflow-hidden">
            {/* Filter Bar */}
            <div className="p-4 bg-stone-50/50 dark:bg-stone-800/30 border-b border-stone-200/80 dark:border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute right-3 top-2.5 text-stone-400" size={16} />
                  <input
                    type="text"
                    placeholder="جستجو در ردیف‌های ادعا..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pr-9 pl-3 py-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>

                <select
                  value={categoryFilter}
                  onChange={e => setCategoryFilter(e.target.value)}
                  className="px-3 py-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-bold text-stone-700 dark:text-stone-300 focus:outline-none"
                >
                  <option value="ALL">همه دسته‌بندی‌ها</option>
                  {Object.entries(CATEGORY_MAP).map(([key, val]) => (
                    <option key={key} value={key}>
                      {val.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-black text-stone-500">
                  تعداد آیتم‌ها: <span className="text-amber-600 font-bold">{filteredItems.length} ردیف</span>
                </span>
                {canUserEditClaim(activeClaim) && (
                  <button
                    onClick={handleOpenAddItem}
                    disabled={activeClaim.isFinalFrozen}
                    className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 shadow-sm disabled:opacity-40"
                  >
                    <Plus size={14} />
                    افزودن ردیف
                  </button>
                )}
              </div>
            </div>

            {/* Items Table / Empty State */}
            {filteredItems.length === 0 ? (
              <div className="p-12 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
                  <Scale size={32} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-black text-stone-800 dark:text-stone-200">
                    هنوز ردیف ادعایی به این لایحه افزوده نشده است
                  </h4>
                  <p className="text-xs text-stone-500 dark:text-stone-400 max-w-md mx-auto leading-relaxed">
                    برای ثبت ردیف‌های ادعای مالی، بر روی دکمه زیر کلیک کنید یا از دکمه‌های استخراج هوشمند بالای جدول استفاده نمایید.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    onClick={handleOpenAddItem}
                    disabled={activeClaim.isFinalFrozen || !canUserEditClaim(activeClaim)}
                    className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs rounded-2xl transition-all shadow-lg shadow-amber-500/20 inline-flex items-center gap-2 disabled:opacity-40"
                  >
                    <Plus size={18} />
                    افزودن اولین ردیف ادعا
                  </button>
                  <button
                    onClick={handleImportOverheadFromDelayClaims}
                    disabled={activeClaim.isFinalFrozen || !canUserEditClaim(activeClaim)}
                    className="px-4 py-2.5 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 rounded-2xl text-xs font-bold hover:bg-stone-50 transition-all inline-flex items-center gap-1.5 disabled:opacity-40"
                  >
                    <Building2 size={16} className="text-amber-500" />
                    استخراج بالاسری ایام تاخیر
                  </button>
                  <button
                    onClick={handleImportDelayedPayments5090}
                    disabled={activeClaim.isFinalFrozen || !canUserEditClaim(activeClaim)}
                    className="px-4 py-2.5 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 rounded-2xl text-xs font-bold hover:bg-stone-50 transition-all inline-flex items-center gap-1.5 disabled:opacity-40"
                  >
                    <DollarSign size={16} className="text-emerald-500" />
                    استخراج تاخیر ۵۰۹۰
                  </button>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-stone-100 dark:bg-stone-800/70 text-stone-600 dark:text-stone-300 font-black border-b border-stone-200 dark:border-stone-700">
                    <tr>
                      <th className="p-4 w-12 text-center">#</th>
                      <th className="p-4">عنوان ادعای مالی و شرح خسارت</th>
                      <th className="p-4">دسته‌بندی و استناد قانونی</th>
                      <th className="p-4 text-center">تعداد / کارکرد</th>
                      <th className="p-4 text-center">نرخ واحد (ریال)</th>
                      <th className="p-4 text-center">مبلغ ادعاشده (ریال)</th>
                      <th className="p-4 text-center">تایید مشاور (ریال)</th>
                      <th className="p-4 text-center">تصویب کارفرما (ریال)</th>
                      <th className="p-4 text-center w-28">عملیات ردیف</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200/80 dark:divide-stone-800">
                    {filteredItems.map((item, idx) => {
                      const catMeta = CATEGORY_MAP[item.category] || CATEGORY_MAP.OTHER_DAMAGES;
                      const CatIcon = catMeta.icon;
                      const isRowEditable = !activeClaim.isFinalFrozen && canUserEditClaim(activeClaim);

                      return (
                        <tr key={item.id} className="hover:bg-stone-50/60 dark:hover:bg-stone-800/30 transition-colors">
                          <td className="p-4 text-center font-bold text-stone-400">{idx + 1}</td>
                          <td className="p-4 space-y-1 max-w-sm">
                            <div className="font-black text-stone-800 dark:text-stone-100 leading-snug">
                              {item.title}
                            </div>
                            <p className="text-[11px] text-stone-500 dark:text-stone-400 line-clamp-2">
                              {item.rootCause}
                            </p>
                          </td>
                          <td className="p-4 space-y-1 max-w-xs">
                            <div className="flex items-center gap-1.5">
                              <span className={`p-1 rounded-lg ${catMeta.bg} ${catMeta.color}`}>
                                <CatIcon size={14} />
                              </span>
                              <span className="font-bold text-stone-700 dark:text-stone-300 text-[11px]">
                                {catMeta.label}
                              </span>
                            </div>
                            <p className="text-[10px] text-stone-400 font-mono truncate">
                              {item.contractClauseRef}
                            </p>
                          </td>
                          <td className="p-4 text-center font-bold text-stone-700 dark:text-stone-300 dir-ltr">
                            {item.quantity?.toLocaleString('fa-IR')} {item.unit}
                          </td>
                          <td className="p-4 text-center font-bold text-stone-600 dark:text-stone-400 dir-ltr">
                            {item.unitRate?.toLocaleString('fa-IR')}
                          </td>
                          <td className="p-4 text-center font-black text-amber-600 dark:text-amber-400 dir-ltr text-sm">
                            {item.totalClaimedAmount?.toLocaleString('fa-IR')}
                          </td>
                          <td className="p-4 text-center font-bold text-emerald-600 dark:text-emerald-400 dir-ltr">
                            {item.consultantApprovedAmount?.toLocaleString('fa-IR')}
                          </td>
                          <td className="p-4 text-center font-black text-blue-600 dark:text-blue-400 dir-ltr">
                            {item.employerApprovedAmount?.toLocaleString('fa-IR')}
                          </td>
                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {isRowEditable && (
                                <button
                                  onClick={() => {
                                    setEditingItem(item);
                                    setIsItemModalOpen(true);
                                  }}
                                  title="ویرایش ردیف"
                                  className="p-1.5 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-lg text-stone-600 dark:text-stone-300 transition-colors"
                                >
                                  <Edit3 size={15} />
                                </button>
                              )}

                              {isRowEditable && (
                                <button
                                  onClick={e => handleDuplicateItem(item, e)}
                                  title="تکثیر ردیف"
                                  className="p-1.5 hover:bg-amber-100 dark:hover:bg-amber-950/60 rounded-lg text-amber-600 transition-colors"
                                >
                                  <Copy size={15} />
                                </button>
                              )}

                              {isRowEditable && (
                                <button
                                  onClick={e => handleOpenDeleteItemModal(item.id, e)}
                                  title="حذف ردیف"
                                  className="p-1.5 hover:bg-rose-100 dark:hover:bg-rose-950/60 rounded-lg text-rose-600 transition-colors"
                                >
                                  <Trash2 size={15} />
                                </button>
                              )}
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
      {/* MODAL 1: Create / Edit Claim */}
      {isClaimModalOpen && editingClaim && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-stone-900 w-full max-w-2xl rounded-3xl border border-[#ece5d8] dark:border-stone-800 shadow-2xl p-6 lg:p-8 space-y-6 dir-rtl">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-4">
              <h2 className="text-base font-black text-stone-900 dark:text-white flex items-center gap-2">
                <FileText className="text-amber-500" size={20} />
                مشخصات لایحه ادعای ضرر و زیان و خسارات مالی
              </h2>
              <button onClick={() => setIsClaimModalOpen(false)} className="text-stone-400 hover:text-stone-600">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-stone-700 dark:text-stone-300 block">شماره لایحه ادعا:</label>
                  <input
                    type="text"
                    value={editingClaim.claimNumber || ''}
                    onChange={e => setEditingClaim({ ...editingClaim, claimNumber: e.target.value })}
                    className="w-full p-3 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl font-mono font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-stone-700 dark:text-stone-300 block">تاریخ تنظیم لایحه:</label>
                  <ShamsiDatePicker
                    value={editingClaim.claimDate || ''}
                    onChange={val => setEditingClaim({ ...editingClaim, claimDate: val })}
                    inputClassName="!p-3 !bg-stone-50 dark:!bg-stone-800 !border-stone-200 dark:!border-stone-700 !rounded-xl !text-center !font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-700 dark:text-stone-300 block">عنوان کامل لایحه:</label>
                <input
                  type="text"
                  value={editingClaim.title || ''}
                  onChange={e => setEditingClaim({ ...editingClaim, title: e.target.value })}
                  className="w-full p-3 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-700 dark:text-stone-300 block">دوره زمانی ادعا:</label>
                <input
                  type="text"
                  value={editingClaim.periodTitle || ''}
                  onChange={e => setEditingClaim({ ...editingClaim, periodTitle: e.target.value })}
                  className="w-full p-3 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-700 dark:text-stone-300 block">مقدمه و تشریح موضوع ادعا:</label>
                <textarea
                  rows={3}
                  value={editingClaim.introduction || ''}
                  onChange={e => setEditingClaim({ ...editingClaim, introduction: e.target.value })}
                  className="w-full p-3 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-700 dark:text-stone-300 block">خلاصه استنادهای قانونی و بخشنامه‌ای:</label>
                <textarea
                  rows={2}
                  value={editingClaim.legalBasisSummary || ''}
                  onChange={e => setEditingClaim({ ...editingClaim, legalBasisSummary: e.target.value })}
                  className="w-full p-3 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200 dark:border-stone-800">
              <button
                onClick={() => setIsClaimModalOpen(false)}
                className="px-5 py-2.5 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 font-bold text-xs rounded-xl"
              >
                انصراف
              </button>
              <button
                onClick={() => handleSaveClaim(editingClaim as LossClaim)}
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs rounded-xl shadow-lg shadow-amber-500/20"
              >
                ذخیره مشخصات لایحه
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Add / Edit Claim Item */}
      {isItemModalOpen && editingItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-stone-900 w-full max-w-2xl rounded-3xl border border-[#ece5d8] dark:border-stone-800 shadow-2xl p-6 lg:p-8 space-y-6 dir-rtl">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-4">
              <h2 className="text-base font-black text-stone-900 dark:text-white flex items-center gap-2">
                <Plus className="text-amber-500" size={20} />
                جزئیات ردیف ادعای ضرر و زیان
              </h2>
              <button onClick={() => setIsItemModalOpen(false)} className="text-stone-400 hover:text-stone-600">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-stone-700 dark:text-stone-300 block">عنوان ردیف ادعای مالی:</label>
                <input
                  type="text"
                  value={editingItem.title || ''}
                  onChange={e => setEditingItem({ ...editingItem, title: e.target.value })}
                  className="w-full p-3 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl font-bold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-stone-700 dark:text-stone-300 block">دسته‌بندی خسارت:</label>
                  <select
                    value={editingItem.category || 'SITE_OVERHEAD'}
                    onChange={e => {
                      const cat = e.target.value as LossClaimCategory;
                      setEditingItem({
                        ...editingItem,
                        category: cat,
                        contractClauseRef: CATEGORY_MAP[cat]?.defaultClause || ''
                      });
                    }}
                    className="w-full p-3 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl font-bold"
                  >
                    {Object.entries(CATEGORY_MAP).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-stone-700 dark:text-stone-300 block">واحد سنجش (روز/ساعت/ریال/مورد):</label>
                  <input
                    type="text"
                    value={editingItem.unit || 'روز'}
                    onChange={e => setEditingItem({ ...editingItem, unit: e.target.value })}
                    className="w-full p-3 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-stone-700 dark:text-stone-300 block">مقدار / تعداد کارکرد:</label>
                  <input
                    type="number"
                    value={editingItem.quantity || 0}
                    onChange={e => {
                      const q = Number(e.target.value) || 0;
                      const r = editingItem.unitRate || 0;
                      const tot = q * r;
                      setEditingItem({
                        ...editingItem,
                        quantity: q,
                        totalClaimedAmount: tot,
                        consultantApprovedAmount: tot,
                        employerApprovedAmount: tot
                      });
                    }}
                    className="w-full p-3 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl font-bold text-blue-600"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-stone-700 dark:text-stone-300 block">نرخ واحد (ریال):</label>
                  <input
                    type="number"
                    value={editingItem.unitRate || 0}
                    onChange={e => {
                      const r = Number(e.target.value) || 0;
                      const q = editingItem.quantity || 0;
                      const tot = q * r;
                      setEditingItem({
                        ...editingItem,
                        unitRate: r,
                        totalClaimedAmount: tot,
                        consultantApprovedAmount: tot,
                        employerApprovedAmount: tot
                      });
                    }}
                    className="w-full p-3 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-stone-700 dark:text-stone-300 block">مبلغ ادعاشده کل (ریال):</label>
                  <input
                    type="number"
                    value={editingItem.totalClaimedAmount || 0}
                    onChange={e =>
                      setEditingItem({
                        ...editingItem,
                        totalClaimedAmount: Number(e.target.value) || 0
                      })
                    }
                    className="w-full p-3 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl font-black text-amber-600"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-stone-700 dark:text-stone-300 block">استناد قراردادی و بخشنامه‌ای:</label>
                <input
                  type="text"
                  value={editingItem.contractClauseRef || ''}
                  onChange={e => setEditingItem({ ...editingItem, contractClauseRef: e.target.value })}
                  className="w-full p-3 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-stone-700 dark:text-stone-300 block">علت ریشه‌ای وقوع خسارت:</label>
                <input
                  type="text"
                  value={editingItem.rootCause || ''}
                  onChange={e => setEditingItem({ ...editingItem, rootCause: e.target.value })}
                  className="w-full p-3 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-stone-700 dark:text-stone-300 block">مبانی و فرمول محاسبه:</label>
                <textarea
                  rows={2}
                  value={editingItem.calculationBasis || ''}
                  onChange={e => setEditingItem({ ...editingItem, calculationBasis: e.target.value })}
                  className="w-full p-3 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200 dark:border-stone-800">
              <button
                onClick={() => setIsItemModalOpen(false)}
                className="px-5 py-2.5 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 font-bold text-xs rounded-xl"
              >
                انصراف
              </button>
              <button
                onClick={() => handleSaveItem(editingItem as LossClaimItem)}
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs rounded-xl shadow-lg shadow-amber-500/20"
              >
                ذخیره ردیف ادعا
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Full Standard Workflow Action Modal (from DelayClaimsManager) */}
      {isWorkflowModalOpen && workflowTargetClaim && workflowAction && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-stone-900 w-full max-w-lg rounded-3xl border border-[#ece5d8] dark:border-stone-800 shadow-2xl p-6 lg:p-8 space-y-6 dir-rtl">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-4">
              <div className="flex items-center gap-2">
                <Send className="text-amber-500" size={20} />
                <h3 className="text-base font-black text-stone-900 dark:text-white">
                  گردش کار و تغییر وضعیت: {WorkflowService.getActionLabel(workflowAction, userOrgType)}
                </h3>
              </div>
              <button onClick={() => setIsWorkflowModalOpen(false)} className="p-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3.5 bg-stone-50 dark:bg-stone-800/60 rounded-2xl border border-stone-200 dark:border-stone-700 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-stone-400 block">لایحه ادعای ضرر و زیان:</span>
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
              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-500 dark:text-stone-400 block">
                  {workflowAction === 'REJECT' || workflowAction === 'RETURN_TO_CONTRACTOR' || workflowAction === 'RETURN_TO_CONSULTANT'
                    ? 'علت رد یا عودت (اجباری)'
                    : 'توضیحات و هامش گردش کار (اختیاری)'}
                </label>
                <textarea
                  value={workflowComment}
                  onChange={e => setWorkflowComment(e.target.value)}
                  className="w-full p-3 bg-[#faf8f4] dark:bg-stone-800 border border-[#e5ded0] dark:border-stone-700 rounded-xl text-sm font-bold outline-none focus:border-stone-500 transition-all min-h-[100px] text-stone-800 dark:text-stone-100"
                  placeholder="توضیحات خود را بنویسید..."
                />
              </div>

              {/* Electronic Signature Toggle & Status Card */}
              {(() => {
                const isNoSignatureAction =
                  workflowAction === 'REJECT' ||
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
                                جهت درج امضا، لطفاً از بخش پرسنلی منابع انسانی تصویر امضای خود را بارگذاری فرمایید.
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
                  onClick={() => setIsWorkflowModalOpen(false)}
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

      {/* MODAL 4: WORKFLOW HISTORY TIMELINE MODAL (Matching Technical Office standard) */}
      {isHistoryModalOpen && historyClaim && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fadeIn" dir="rtl">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl max-h-[80vh] flex flex-col text-stone-700">
            <div className="p-6 border-b border-[#ece5d8] flex justify-between items-center bg-[#faf8f4]">
              <h3 className="font-black text-stone-800 flex items-center gap-2 text-sm md:text-base">
                <ScrollText size={20} className="text-stone-600" />
                تاریخچه تغییرات
              </h3>
              <button
                onClick={() => setIsHistoryModalOpen(false)}
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
                            <div className="text-[10px] text-stone-900 bg-[#faf8f4] px-2 py-1 rounded-lg w-fit mb-1 font-bold">
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

      {/* MODAL 5: Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 w-full max-w-md rounded-3xl border border-rose-200 dark:border-rose-900 shadow-2xl p-6 space-y-6 dir-rtl text-right">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950 flex items-center justify-center shrink-0">
                <Trash2 size={24} />
              </div>
              <div>
                <h3 className="text-base font-black text-stone-900 dark:text-white">
                  {deleteTargetClaim ? 'تایید حذف لایحه ضرر و زیان' : 'تایید حذف ردیف ادعای مالی'}
                </h3>
                <p className="text-xs text-stone-500">عملیات حذف غیرقابل بازگشت است.</p>
              </div>
            </div>

            <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
              {deleteTargetClaim
                ? `آیا از حذف کامل لایحه ادعای «${deleteTargetClaim.claimNumber} - ${deleteTargetClaim.title}» اطمینان دارید؟ تمامی ردیف‌ها و سوابق این لایحه پاک خواهند شد.`
                : 'آیا از حذف این ردیف ادعای مالی از لایحه اطمینان دارید؟'}
            </p>

            <div className="flex gap-3 pt-4 border-t border-stone-200 dark:border-stone-800">
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setDeleteTargetClaim(null);
                  setDeleteTargetItemId(null);
                }}
                className="flex-1 py-3 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-bold text-xs"
              >
                انصراف
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-lg shadow-rose-600/20"
              >
                بله، حذف شود
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: Official A4 Printable Report Modal with 3-Box Signatures */}
      {isPrintModalOpen && activeClaim && (
        <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white text-stone-900 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Control Header */}
            <div className="bg-stone-900 text-white p-4 flex items-center justify-between no-print">
              <div className="flex items-center gap-2">
                <Printer className="text-amber-400" size={20} />
                <span className="font-black text-xs">پیش‌نمایش رسمی A4 لایحه ادعای ضرر و زیان و خسارات مالی</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs rounded-xl transition-all shadow-md flex items-center gap-1.5"
                >
                  <Printer size={15} />
                  چاپ سند / خروجی PDF
                </button>
                <button onClick={() => setIsPrintModalOpen(false)} className="p-2 text-stone-400 hover:text-white">
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Printable Document Sheet (A4 Format) */}
            <div className="p-8 lg:p-12 overflow-y-auto space-y-6 dir-rtl text-right font-sans leading-relaxed text-xs">
              {/* Header */}
              <div className="border-b-2 border-stone-900 pb-4 flex items-center justify-between">
                <div>
                  <h1 className="text-base font-black text-stone-900">جمهوری اسلامی ایران</h1>
                  <h2 className="text-sm font-bold text-stone-700 mt-0.5">لایحه ادعای ضرر و زیان و خسارات مالی پیمان</h2>
                  <p className="text-[11px] text-stone-500 mt-0.5">پروژه: {project?.title}</p>
                </div>

                <div className="text-left font-mono space-y-0.5">
                  <div>شماره سند: <strong>{activeClaim.claimNumber}</strong></div>
                  <div>تاریخ تنظیم: <strong>{activeClaim.claimDate}</strong></div>
                  <div>وضعیت: <strong>{WorkflowService.getStatusLabel(activeClaim.status)}</strong></div>
                </div>
              </div>

              {/* Parties Info */}
              <div className="grid grid-cols-3 gap-4 bg-stone-50 p-4 rounded-xl border border-stone-200 font-bold">
                <div>کارفرما: <span className="font-normal">{activeClaim.employerName}</span></div>
                <div>مشاور: <span className="font-normal">{activeClaim.consultantName}</span></div>
                <div>پیمانکار: <span className="font-normal">{activeClaim.contractorName}</span></div>
              </div>

              {/* Introduction */}
              <div className="space-y-1">
                <h3 className="font-black text-sm text-stone-900">۱. مقدمه و مبانی حقوقی لایحه</h3>
                <p className="text-stone-700 leading-relaxed text-justify">{activeClaim.introduction}</p>
              </div>

              {/* Items Table */}
              <div className="space-y-2">
                <h3 className="font-black text-sm text-stone-900">۲. ریز ادعاهای مالی و برآورد خسارات</h3>
                <table className="w-full text-right border-collapse border border-stone-300">
                  <thead>
                    <tr className="bg-stone-200 text-stone-800 font-black">
                      <th className="border border-stone-300 p-2 text-center w-8">#</th>
                      <th className="border border-stone-300 p-2">شرح خسارت و ادعا</th>
                      <th className="border border-stone-300 p-2">استناد بخشنامه‌ای</th>
                      <th className="border border-stone-300 p-2 text-center">کارکرد</th>
                      <th className="border border-stone-300 p-2 text-center">مبلغ ادعایی (ریال)</th>
                      <th className="border border-stone-300 p-2 text-center">تایید مشاور (ریال)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeClaim.items?.map((item, idx) => (
                      <tr key={item.id} className="border-b border-stone-300">
                        <td className="border border-stone-300 p-2 text-center">{idx + 1}</td>
                        <td className="border border-stone-300 p-2 font-bold">{item.title}</td>
                        <td className="border border-stone-300 p-2 text-[10px]">{item.contractClauseRef}</td>
                        <td className="border border-stone-300 p-2 text-center dir-ltr">{item.quantity} {item.unit}</td>
                        <td className="border border-stone-300 p-2 text-center font-bold dir-ltr">{item.totalClaimedAmount?.toLocaleString('fa-IR')}</td>
                        <td className="border border-stone-300 p-2 text-center font-bold dir-ltr">{(item.consultantApprovedAmount || item.totalClaimedAmount)?.toLocaleString('fa-IR')}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-stone-100 font-black">
                      <td colSpan={4} className="border border-stone-300 p-2 text-left">مجموع کل:</td>
                      <td className="border border-stone-300 p-2 text-center dir-ltr text-amber-700">{activeClaim.totalClaimedAmount?.toLocaleString('fa-IR')} ریال</td>
                      <td className="border border-stone-300 p-2 text-center dir-ltr text-emerald-700">{(activeClaim.totalConsultantApprovedAmount || activeClaim.totalClaimedAmount)?.toLocaleString('fa-IR')} ریال</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Signatures Block with 3-Pillar 9-Signatory Digital Signatures */}
              {(() => {
                const renderModalSigBox = (roleHeader: string, roleKey: string) => {
                  const signatory = getRoleSignatory(roleKey, activeClaim);
                  if (signatory && signatory.signature) {
                    return (
                      <div className="flex-1 min-w-0 text-center bg-white border border-stone-300 rounded p-1">
                        <div className="font-bold text-[9px] text-stone-800 truncate border-b border-stone-200 pb-0.5 mb-1">{roleHeader}</div>
                        <div className="h-8 flex items-center justify-center my-0.5">
                          <img src={signatory.signature} alt="امضا" className="max-h-7 max-w-full object-contain" />
                        </div>
                        <div className="text-[8.5px] font-bold text-stone-800 truncate">{signatory.name}</div>
                        <div className="text-[7.5px] text-emerald-600 font-bold">✓ امضاء معتبر</div>
                        <div className="text-[7.5px] text-stone-400">{signatory.date || new Date().toLocaleDateString('fa-IR')}</div>
                      </div>
                    );
                  }
                  return (
                    <div className="flex-1 min-w-0 text-center bg-white border border-dashed border-stone-300 rounded p-1">
                      <p className="font-bold text-[9px] text-stone-800 truncate mb-0.5">{roleHeader}</p>
                      {signatory?.name && <div className="text-[8.5px] font-bold text-stone-700 truncate">{signatory.name}</div>}
                      <div className="h-8 flex items-center justify-center text-[8px] text-stone-400 italic">محل امضاء و مهر</div>
                      <div className="border-t border-dashed border-stone-300 pt-0.5 text-[7.5px] text-stone-500">نام و امضاء</div>
                    </div>
                  );
                };

                return (
                  <div className="pt-6 border-t-2 border-stone-400">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {/* 1. Contractor */}
                      <div className="border border-blue-200 bg-blue-50/50 rounded-xl p-2.5">
                        <div className="font-black text-[10px] text-blue-900 text-center border-b border-blue-200 pb-1 mb-2">
                          پیمانکار: {activeClaim.contractorName}
                        </div>
                        <div className="flex gap-1.5">
                          {renderModalSigBox("کارشناس / تنظیم‌کننده", "contractor_tech")}
                          {renderModalSigBox("سرپرست واحد فنی", "contractor_head")}
                          {renderModalSigBox("سرپرست کارگاه / مدیر پروژه", "contractor_site")}
                        </div>
                      </div>

                      {/* 2. Consultant */}
                      <div className="border border-emerald-200 bg-emerald-50/50 rounded-xl p-2.5">
                        <div className="font-black text-[10px] text-emerald-900 text-center border-b border-emerald-200 pb-1 mb-2">
                          مشاور: {activeClaim.consultantName}
                        </div>
                        <div className="flex gap-1.5">
                          {renderModalSigBox("کارشناس / ناظر مقیم", "consultant_tech")}
                          {renderModalSigBox("سرپرست واحد نظارت", "consultant_head")}
                          {renderModalSigBox("سرپرست نظارت / مدیر پروژه", "consultant")}
                        </div>
                      </div>

                      {/* 3. Employer */}
                      <div className="border border-purple-200 bg-purple-50/50 rounded-xl p-2.5">
                        <div className="font-black text-[10px] text-purple-900 text-center border-b border-purple-200 pb-1 mb-2">
                          کارفرما: {activeClaim.employerName}
                        </div>
                        <div className="flex gap-1.5">
                          {renderModalSigBox("کارشناس / بررسی‌کننده", "employer_tech")}
                          {renderModalSigBox("سرپرست واحد / مدیر گروه", "employer_head")}
                          {renderModalSigBox("مدیر طرح / نماینده کارفرما", "employer")}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LossClaimsManager;
