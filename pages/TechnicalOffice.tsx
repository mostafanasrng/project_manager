// Technical Office Page

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Calculator,
  Building2,
  Plus,
  Search,
  Trash2,
  Edit3,
  X,
  FileSpreadsheet,
  Hash,
  DollarSign,
  Sigma,
  Ruler,
  Layers,
  BookOpen,
  Calendar,
  MapPin,
  Info,
  Save,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  Check,
  AlertCircle,
  AlertTriangle,
  FileText,
  ArrowLeftRight,
  Copy,
  PlusCircle,
  MinusCircle,
  Link as LinkIcon,
  TrendingUp,
  List,
  Sparkles,
  ArrowDownToLine,
  Package,
  ScrollText,
  Printer,
  CheckSquare,
  Square,
  PieChart,
  Activity,
  FileDown,
  Loader2,
  FileSignature,
  Briefcase,
  UserCheck,
  HardHat,
  CheckCircle,
  MessageSquare,
  Star,
  Receipt,
  Truck,
  Filter,
  ShieldCheck,
  Download,
  GitCompare,
  Scale,
  Archive,
  ArrowRightCircle,
  ArrowLeftCircle,
  Bell,
  User,
  PenTool,
} from "lucide-react";
import {
  Project,
  EstimateItem,
  ProjectMinute,
  MetreRow,
  PriceListItem,
  Statement,
  WorkPermit,
  ApprovalDetail,
  ItemType,
  MrsRecord,
  MrsMaterialItem,
  VariationOrder,
  VariationItem,
  MivRecord,
  MivMaterialItem,
  Notification,
  FreezeVariationRequest,
  AdjustmentRecord,
} from "../types";
import { NotificationService } from "../services/notificationService";
import {
  MOCK_PROJECTS,
  MOCK_ESTIMATE_ITEMS,
  MOCK_MINUTES,
  MOCK_METRE_ROWS,
  MOCK_VARIATIONS,
  MOCK_MIVS,
  MOCK_MRS,
  MOCK_STATEMENTS,
  MOCK_ADJUSTMENTS,
  MOCK_PRICE_LISTS
} from "../constants";
import AdjustmentTab from "./AdjustmentTab";
import CbsManagement from "./CbsManagement";
import CbsStatements from "./CbsStatements";
import MetreEntryForm from "../src/components/technical-office/MetreEntryForm";
import ReportModal from "../src/components/technical-office/ReportModal";
import { StatementGeneralReport } from "../src/components/technical-office/reports/StatementGeneralReport";
import { StatementMetreReport } from "../src/components/technical-office/reports/StatementMetreReport";
import { StatementSummaryMetreReport } from "../src/components/technical-office/reports/StatementSummaryMetreReport";
import { StatementFinancialReport } from "../src/components/technical-office/reports/StatementFinancialReport";
import { StatementFinancialChaptersReport } from "../src/components/technical-office/reports/StatementFinancialChaptersReport";
import { StatementFinancialBooksReport } from "../src/components/technical-office/reports/StatementFinancialBooksReport";
import { DiscrepancyReport } from "../src/components/technical-office/reports/DiscrepancyReport";
import { SystemAdminService } from "../services/systemAdminService";
import { HRService } from "../services/hrService";
import { SystemUser, OrganizationType } from "../systemAdminTypes";
import { formatUserDisplay, formatUserDisplayFormal } from "../src/utils/userFormatter";
import { ModuleId } from "../systemAdminTypes";
import { WorkflowStatus, WorkflowAction, WorkflowEvent } from "../types";
import { WorkflowService } from "../services/workflowService";
import { formatShamsiDate } from "../utils/dateUtils";
import { ShamsiDatePicker } from "../components/ShamsiDatePicker";

const PERMIT_DISCIPLINES = [
  { key: "Dcc", label: "کنترل مدارک (DCC)" },
  { key: "Surveyor", label: "نقشه‌برداری" },
  { key: "Hse", label: "ایمنی (HSE)" },
  { key: "Civil", label: "سیویل/عمران" },
  { key: "Electrical", label: "تاسیسات برق" },
  { key: "Mechanical", label: "تاسیسات مکانیک" },
];

const MATERIAL_TYPES_SUGGESTIONS = [
  "سیمان",
  "آرماتور",
  "شن و ماسه",
  "آجر/بلوک",
  "گچ",
  "سفال",
  "تیرآهن",
  "لوله و اتصالات",
  "سایر",
];

// --- Helpers ---
const toEnglishDigits = (str: string) => {
  if (!str) return "";
  const persianDigits = "۰۱۲۳۴۵۶۷۸۹";
  const arabicDigits = "٠١٢٣٤٥٦٧٨٩";
  return String(str).replace(/[۰-۹٠-٩]/g, (d) => {
    const pIdx = persianDigits.indexOf(d);
    if (pIdx !== -1) return pIdx.toString();
    const aIdx = arabicDigits.indexOf(d);
    if (aIdx !== -1) return aIdx.toString();
    return d;
  });
};

const cleanCode = (s: any) => {
  if (!s) return "";
  // 1. Convert to string and English digits
  let cleaned = toEnglishDigits(String(s).trim());
  // 2. Remove dots, slashes, spaces, hyphens but keep letters and numbers
  // This helps matching 01.01.01 with 010101 and W-01 with W01
  cleaned = cleaned.replace(/[.\/\s-]/g, "").toUpperCase();
  return cleaned;
};

const parsePersianInt = (val: any): number => {
  if (val === undefined || val === null) return 0;
  const eng = toEnglishDigits(String(val));
  return parseInt(eng.replace(/[^0-9]/g, "")) || 0;
};

export default function TechnicalOffice() {
  const loadData = (key: string, defaultValue: any) => {
    try {
      const saved = localStorage.getItem(key);
      return saved && saved !== "undefined" ? JSON.parse(saved) : defaultValue;
    } catch (e) {
      return defaultValue;
    }
  };

  const [selectedProjectId, setSelectedProjectId] = useState<string>(() => {
    const saved = localStorage.getItem("hamyar_selected_project_id");
    if (saved && saved !== "undefined" && saved !== "null") return saved;
    return "1";
  });

  const [activeTab, setActiveTab] = useState<
    | "estimate"
    | "minutes"
    | "metre"
    | "statements"
    | "discrepancy"
    | "permits"
    | "materials"
    | "variation"
    | "adjustment"
    | "cbsStatements"
  >("estimate");
  const [materialSubTab, setMaterialSubTab] = useState<
    "MRS" | "MIV" | "BALANCE"
  >("MRS");
  const [canCreate, setCanCreate] = useState(true);

  // Workflow States (Phase 4A)
  const [currentUser, setCurrentUser] = useState<SystemUser | null>(() => SystemAdminService.getCurrentUser());
  const [workflowModalOpen, setWorkflowModalOpen] = useState(false);
  const [workflowActionType, setWorkflowActionType] =
    useState<WorkflowAction | null>(null);
  const [workflowItem, setWorkflowItem] = useState<any | null>(null);
  const [workflowBatchItems, setWorkflowBatchItems] = useState<any[] | null>(
    null,
  );
  const [workflowComment, setWorkflowComment] = useState("");
  const [workflowAssignee, setWorkflowAssignee] = useState("");
  const [selectedExperts, setSelectedExperts] = useState<string[]>([]);
  const [orgUsers, setOrgUsers] = useState<SystemUser[]>([]);

  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyItem, setHistoryItem] = useState<any>(null);

  // User Electronic Signature States
  const [attachWorkflowSignature, setAttachWorkflowSignature] = useState(true);

  // Initialize state lazily from localStorage
  const [projects, setProjects] = useState<Project[]>(() => {
    const loaded = loadData("hamyar_projects", MOCK_PROJECTS);
    if (Array.isArray(loaded)) {
      const cleaned = loaded.filter((p: any) => p.id !== '2' && !String(p.title || '').includes('تصفیه‌خانه مرکزی') && !String(p.title || '').includes('تسویه خانه مرکزی') && !String(p.title || '').includes('نیایش'));
      return cleaned.length > 0 ? cleaned : MOCK_PROJECTS;
    }
    return loaded;
  });

  const accessibleProjects = useMemo(() => {
    return projects.filter((p: any) => SystemAdminService.canUserAccessProject(p.id, currentUser));
  }, [projects, currentUser]);

  useEffect(() => {
    if (accessibleProjects.length > 0 && !accessibleProjects.some(p => String(p.id) === String(selectedProjectId))) {
      setSelectedProjectId(String(accessibleProjects[0].id));
    }
  }, [accessibleProjects, selectedProjectId]);
  const [estimates, setEstimates] = useState<EstimateItem[]>(() => {
    return loadData("hamyar_estimates", MOCK_ESTIMATE_ITEMS);
  });
  const [minutes, setMinutes] = useState<ProjectMinute[]>(() => {
    return loadData("hamyar_minutes", MOCK_MINUTES);
  });
  const [metres, setMetres] = useState<MetreRow[]>(() => {
    return loadData("hamyar_metres", MOCK_METRE_ROWS);
  });
  const [statements, setStatements] = useState<Statement[]>(() => {
    return loadData("hamyar_statements", MOCK_STATEMENTS);
  });
  const [workPermits, setWorkPermits] = useState<WorkPermit[]>(() =>
    loadData("hamyar_permits", []),
  );
  const [mrsList, setMrsList] = useState<MrsRecord[]>(() => {
    const data = loadData("hamyar_mrs", MOCK_MRS);
    const filtered = data.filter(
      (item: any) => item.id !== "mrs1" && item.id !== "mrs2",
    );
    if (data.length !== filtered.length) {
      localStorage.setItem("hamyar_mrs", JSON.stringify(filtered));
    }
    return filtered;
  });
  const [mivList, setMivList] = useState<MivRecord[]>(() => {
    const data = loadData("hamyar_mivs", MOCK_MIVS);
    const filtered = data.filter(
      (item: any) => item.id !== "miv1" && item.id !== "miv2",
    );
    if (data.length !== filtered.length) {
      localStorage.setItem("hamyar_mivs", JSON.stringify(filtered));
    }
    return filtered;
  });
  const [variations, setVariations] = useState<VariationOrder[]>(() => {
    const raw = loadData("hamyar_variations", MOCK_VARIATIONS);
    let migrated = false;
    const cleaned = raw.map((v: any) => {
      if (!v.items) return v;
      let itemChanged = false;
      const cleanedItems = v.items.map((item: any) => {
        const updated = { ...item };
        
        if (updated.contractorQty === updated.originalQty) {
          delete updated.contractorQty;
          itemChanged = true;
        }
        if (updated.contractorWeightFactor === updated.originalWeightFactor || updated.contractorWeightFactor === updated.weightFactor) {
          delete updated.contractorWeightFactor;
          itemChanged = true;
        }

        if (updated.consultantQty === updated.contractorQty || updated.consultantQty === updated.originalQty) {
          delete updated.consultantQty;
          itemChanged = true;
        }
        if (updated.consultantWeightFactor === updated.contractorWeightFactor || updated.consultantWeightFactor === updated.originalWeightFactor || updated.consultantWeightFactor === updated.weightFactor) {
          delete updated.consultantWeightFactor;
          itemChanged = true;
        }

        if (updated.employerQty === updated.consultantQty || updated.employerQty === updated.contractorQty || updated.employerQty === updated.originalQty) {
          delete updated.employerQty;
          itemChanged = true;
        }
        if (updated.employerWeightFactor === updated.consultantWeightFactor || updated.employerWeightFactor === updated.contractorWeightFactor || updated.employerWeightFactor === updated.originalWeightFactor || updated.employerWeightFactor === updated.weightFactor) {
          delete updated.employerWeightFactor;
          itemChanged = true;
        }

        return updated;
      });

      if (itemChanged) {
        migrated = true;
        return { ...v, items: cleanedItems };
      }
      return v;
    });

    if (migrated) {
      localStorage.setItem("hamyar_variations", JSON.stringify(cleaned));
    }
    return cleaned;
  });

  useEffect(() => {
    localStorage.setItem("hamyar_selected_project_id", selectedProjectId);
  }, [selectedProjectId]);

  const [cbsNodes, setCbsNodes] = useState<any[]>(() => {
    return loadData("hamyar_cbs_nodes", []);
  });

  const [adjustments, setAdjustments] = useState<AdjustmentRecord[]>(() => {
    const data = loadData("hamyar_adjustments", MOCK_ADJUSTMENTS);
    const filtered = data.filter((a: any) => {
      if (a.id === "adj1") return false;
      if (!a.statementId) return false;
      return (loadData("hamyar_statements", MOCK_STATEMENTS) as Statement[]).some((s) => s.id === a.statementId);
    });
    if (data.length !== filtered.length) {
      localStorage.setItem("hamyar_adjustments", JSON.stringify(filtered));
    }
    return filtered;
  });

  useEffect(() => {
    const currentProj = projects.find((p) => p.id === selectedProjectId);
    if (currentProj?.contractType === "CBS") {
      if (["minutes", "metre", "statements", "discrepancy"].includes(activeTab as string)) {
        setActiveTab("cbsStatements");
      }
    } else {
      if (activeTab === "cbsStatements") {
        setActiveTab("statements");
      }
    }
  }, [selectedProjectId, projects, activeTab]);

  useEffect(() => {
    if (currentUser) {
      const hasBasePermission = SystemAdminService.checkPermission(
        currentUser.id,
        ModuleId.TECHNICAL_OFFICE,
        "create",
      );
      if (!hasBasePermission) {
        setCanCreate(false);
        return;
      }
      if (currentUser.role === "SYSTEM_ADMIN") {
        setCanCreate(true);
        return;
      }

      const userOrg = SystemAdminService.getOrganization(currentUser.orgId);
      const userOrgType = userOrg?.type;

      const currentProj = projects.find((p) => p.id === selectedProjectId);
      const isAllowedByException = currentProj?.allowConsultantEmployerCreation;

      if (userOrgType === OrganizationType.CONTRACTOR) {
        setCanCreate(true);
      } else {
        setCanCreate(!!isAllowedByException);
      }
    }
  }, [currentUser, selectedProjectId, projects]);

  const [searchTerm, setSearchTerm] = useState("");

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [reportModalType, setReportModalType] = useState<
    | "estimate"
    | "minutes"
    | "metre"
    | "statements"
    | "statement-metre"
    | "statement-summary-metre"
    | "statement-financial"
    | "statement-financial-chapters"
    | "statement-financial-books"
    | "discrepancy"
    | "permits"
    | "permitsLocation"
    | "materials"
    | "materialsSingle"
    | "miv"
    | "mivSingle"
    | "balance"
    | "comparison"
    | "variation"
    | null
  >(null);
  const [reportContextData, setReportContextData] = useState<any>(null); // Holds context data for report
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isEditingFullMinute, setIsEditingFullMinute] = useState(false);
  const [expandedMinuteId, setExpandedMinuteId] = useState<string | null>(null);
  const [expandedStatementId, setExpandedStatementId] = useState<string | null>(
    null,
  );

  // Transaction States for Duplication Rollback and Navigation
  const [tempDuplicatedIds, setTempDuplicatedIds] = useState<{
    stmtId: string;
    minuteIds: string[];
    metreIds: string[];
  } | null>(null);
  const [returnToStatementId, setReturnToStatementId] = useState<string | null>(
    null,
  );
  const [returnToTab, setReturnToTab] = useState<string | null>(null);

  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Phase 4D: Variation Unlock State
  const [variationUnlockModalOpen, setVariationUnlockModalOpen] =
    useState(false);
  const [variationUnlockItem, setVariationUnlockItem] = useState<any | null>(
    null,
  );
  const [variationReason, setVariationReason] = useState("");
  const [freezeVariations, setFreezeVariations] = useState<
    FreezeVariationRequest[]
  >(() => loadData("hamyar_freeze_variations", []));

  const [activeReportMenuId, setActiveReportMenuId] = useState<string | null>(null);

  // Phase 4C: Notification State
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [highlightedRecordId, setHighlightedRecordId] = useState<string | null>(
    null,
  );
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const unreadCount = useMemo(
    () => notifications.filter((n) => n.status === "UNREAD").length,
    [notifications],
  );

  // Determine role key from user title and organization
  const getRoleKeyForUser = useCallback((user: any): string => {
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
  }, []);

  // Resolve digital signature boxes for printing & report preview
  const getRoleSignatory = useCallback((roleKey: string, customData?: any) => {
    const users = SystemAdminService.getUsers();
    const proj = projects.find(p => String(p.id) === String(selectedProjectId)) || {};
    const targetObj = customData || reportContextData || {};
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

        const actorUser = users.find(u => u.id === e.actorUserId || u.fullName === e.actorName || u.username === e.actorName);
        const orgId = e.actorOrgId || actorUser?.orgId;
        const orgType = e.actorOrgType || (actorUser as any)?.orgType || (orgId ? SystemAdminService.getOrganization(orgId)?.type : undefined);

        const isConsultantOrg = orgType === OrganizationType.CONSULTANT || ((proj as any)?.consultantOrgId && String(orgId) === String((proj as any).consultantOrgId));
        const isEmployerOrg = orgType === OrganizationType.EMPLOYER || ((proj as any)?.employerOrgId && String(orgId) === String((proj as any).employerOrgId));
        const isContractorOrg = !isConsultantOrg && !isEmployerOrg;

        if ((e.action === 'RESUBMIT' || e.action === 'SUBMIT') && !isContractorOrg) return false;

        if (e.roleKey) {
          if (e.roleKey === targetRoleKey) return true;
          if (targetRoleKey === 'permit_expert' && e.roleKey === 'contractor_tech') return true;
          if (targetRoleKey === 'permit_head' && e.roleKey === 'contractor_head') return true;
          if (targetRoleKey === 'permit_site' && e.roleKey === 'contractor_site') return true;
          if (targetRoleKey === 'permit_consultant' && (e.roleKey === 'consultant' || e.roleKey === 'consultant_site')) return true;
          if ((targetRoleKey === 'consultant' || targetRoleKey === 'consultant_site') && (e.roleKey === 'consultant' || e.roleKey === 'consultant_site' || e.roleKey === 'permit_consultant')) return true;
          if (targetRoleKey === 'consultant_head' && e.roleKey === 'consultant_head') return true;
          if (targetRoleKey === 'employer_head' && e.roleKey === 'employer_head') return true;
          if (targetRoleKey === 'employer' && e.roleKey === 'employer') return true;
          return false;
        }

        const title = ((e.actorTitle || actorUser?.jobTitle || e.actorName || '') + ' ' + (actorUser?.jobLevel || '')).toLowerCase();

        if (targetRoleKey === 'contractor_tech' || targetRoleKey === 'permit_expert') {
          if (e.action === 'CREATE' || e.action === 'SUBMIT' || e.action === 'RESUBMIT') {
            if (title.includes('سرپرست واحد') || title.includes('سرپرست کارگاه') || title.includes('مدیر پروژه') || title.includes('رئیس کارگاه')) return false;
            return true;
          }
          if (e.action === 'SIGN' || e.action === 'REPORT_SIGNATURE') {
            if (!isContractorOrg) return false;
            if (title.includes('سرپرست واحد') || title.includes('سرپرست کارگاه') || title.includes('مدیر پروژه') || title.includes('رئیس کارگاه')) return false;
            return title.includes('کارشناس') || title.includes('دفتر فنی') || title.includes('تهیه') || title.includes('عضو');
          }
          return false;
        }

        if (targetRoleKey === 'contractor_head' || targetRoleKey === 'permit_head') {
          if (e.action === 'APPROVE' && e.fromStatus === WorkflowStatus.DRAFT) return true;
          if (e.action === 'SIGN' || e.action === 'REPORT_SIGNATURE') {
            if (!isContractorOrg) return false;
            if (title.includes('سرپرست کارگاه') || title.includes('مدیر پروژه') || title.includes('رئیس کارگاه')) return false;
            return title.includes('سرپرست واحد') || title.includes('سرپرست دفتر') || title.includes('رئیس دفتر') || title.includes('مدیر دفتر');
          }
          return false;
        }

        if (targetRoleKey === 'contractor_site' || targetRoleKey === 'permit_site') {
          if (e.action === 'SEND_TO_CONSULTANT' || (e.action === 'APPROVE' && e.toStatus === WorkflowStatus.APPROVED_INTERNAL)) return true;
          if (e.action === 'SIGN' || e.action === 'REPORT_SIGNATURE') {
            if (!isContractorOrg) return false;
            return title.includes('سرپرست کارگاه') || title.includes('مدیر پروژه') || title.includes('رئیس کارگاه') || title.includes('مدیر کارگاه');
          }
          return false;
        }

        if (targetRoleKey === 'consultant_tech') {
          if (e.roleKey === 'consultant_tech') return true;
          if (e.action === 'APPROVE' || e.action === 'SIGN' || e.action === 'REPORT_SIGNATURE') {
            if (!isConsultantOrg && !title.includes('مشاور') && !title.includes('ناظر')) return false;
            if (title.includes('سرپرست واحد') || title.includes('سرپرست گروه') || title.includes('سرپرست نظارت') || title.includes('مدیر پروژه') || title.includes('سرپرست کارگاه') || title.includes('مدیر نظارت') || title.includes('رئیس کارگاه')) return false;
            return title.includes('کارشناس') || title.includes('ناظر') || title.includes('مقیم') || title.includes('دفتر فنی');
          }
          return false;
        }

        if (targetRoleKey === 'consultant_head') {
          if (e.roleKey === 'consultant_head') return true;
          if (e.action === 'APPROVE' || e.action === 'SIGN' || e.action === 'REPORT_SIGNATURE') {
            if (!isConsultantOrg && !title.includes('مشاور') && !title.includes('نظارت')) return false;
            if (title.includes('سرپرست نظارت') || title.includes('مدیر پروژه') || title.includes('سرپرست کارگاه') || title.includes('مدیر نظارت') || title.includes('رئیس کارگاه')) return false;
            return title.includes('سرپرست واحد') || title.includes('سرپرست گروه') || title.includes('رئیس گروه') || title.includes('مدیر واحد') || title.includes('سرپرست دفتر') || title.includes('رئیس دفتر');
          }
          return false;
        }

        if (targetRoleKey === 'consultant' || targetRoleKey === 'permit_consultant' || targetRoleKey === 'consultant_site') {
          if (e.roleKey === 'consultant' || e.roleKey === 'consultant_site' || e.roleKey === 'permit_consultant') return true;
          if (e.action === 'SEND_TO_EMPLOYER' || e.action === 'APPROVE' || e.action === 'RETURN_TO_CONTRACTOR' || e.action === 'SIGN' || e.action === 'REPORT_SIGNATURE') {
            if (isConsultantOrg) return true;
            return title.includes('مشاور') || title.includes('ناظر') || title.includes('نظارت') || title.includes('سرپرست کارگاه') || title.includes('مدیر پروژه');
          }
          return false;
        }

        if (targetRoleKey === 'employer_tech') {
          if (e.roleKey === 'employer_tech') return true;
          if (e.action === 'APPROVE' || e.action === 'SIGN' || e.action === 'REPORT_SIGNATURE') {
            if (!isEmployerOrg && !title.includes('کارفرما')) return false;
            if (title.includes('سرپرست واحد') || title.includes('مدیر گروه') || title.includes('مدیر طرح') || title.includes('نماینده') || title.includes('سرپرست کارگاه') || title.includes('مدیر پروژه') || title.includes('رئیس اداره') || title.includes('رئیس کارگاه')) return false;
            return title.includes('کارشناس') || title.includes('بررسی') || title.includes('فنی');
          }
          return false;
        }

        if (targetRoleKey === 'employer_head') {
          if (e.roleKey === 'employer_head') return true;
          if (e.action === 'APPROVE' || e.action === 'SIGN' || e.action === 'REPORT_SIGNATURE' || e.action === 'FINAL_APPROVE' || e.action === 'RETURN_TO_CONSULTANT' || e.action === 'REASSIGN') {
            if (!isEmployerOrg && !title.includes('کارفرما')) return false;
            if (title.includes('مدیر طرح') || title.includes('نماینده') || title.includes('مدیر پروژه') || title.includes('سرپرست کارگاه') || title.includes('رئیس کارگاه')) return false;
            return title.includes('سرپرست واحد') || title.includes('مدیر گروه') || title.includes('رئیس اداره') || title.includes('سرپرست گروه') || title.includes('مدیر واحد');
          }
          return false;
        }

        if (targetRoleKey === 'employer' || targetRoleKey === 'employer_site') {
          if (e.roleKey === 'employer' || e.roleKey === 'employer_site') return true;
          if (e.action === 'FINAL_APPROVE' || e.action === 'APPROVE' || e.action === 'SIGN' || e.action === 'REPORT_SIGNATURE' || e.action === 'RETURN_TO_CONSULTANT' || e.action === 'REASSIGN') {
            if (isEmployerOrg) {
              if (title.includes('کارشناس') && !title.includes('مدیر') && !title.includes('سرپرست') && !title.includes('نماینده')) return false;
              if (title.includes('سرپرست واحد') || title.includes('مدیر گروه') || title.includes('رئیس اداره')) return false;
              return true;
            }
            return title.includes('کارفرما') || title.includes('مدیر طرح') || title.includes('مجری') || title.includes('سرپرست کارگاه') || title.includes('مدیر پروژه') || title.includes('نماینده');
          }
          return false;
        }

        return false;
      };

      return [...history].reverse().find(e => matchEvent(e));
    };

    const matchedEv = findEventForRole(roleKey);
    if (matchedEv) {
      const actorUser = users.find(u => u.id === matchedEv.actorUserId || u.fullName === matchedEv.actorName);
      const actorOrg = actorUser?.orgId ? SystemAdminService.getOrganization(actorUser.orgId) : undefined;
      const formalName = actorUser ? formatUserDisplayFormal(actorUser, actorOrg) : (matchedEv.actorName || 'امضاء کننده گزارش');
      const sig = matchedEv.signature || (actorUser ? (HRService.getUserSignature(actorUser) || actorUser?.signature) : undefined);
      return {
        name: formalName,
        title: matchedEv.actorTitle || actorUser?.jobTitle || 'امضاء الکترونیکی',
        signature: sig,
        date: new Date(matchedEv.timestamp).toLocaleDateString('fa-IR')
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
    if (roleKey === 'consultant' || roleKey === 'permit_consultant') {
      return { name: 'سرپرست نظارت / مدیر پروژه مشاور', title: 'دستگاه نظارت و مشاور', signature: undefined, date: undefined };
    }
    if (roleKey === 'employer_tech') {
      return { name: 'کارشناس / بررسی‌کننده', title: 'دستگاه اجرایی و کارفرما', signature: undefined, date: undefined };
    }
    if (roleKey === 'employer_head') {
      return { name: 'سرپرست واحد / مدیر گروه', title: 'دستگاه اجرایی و کارفرما', signature: undefined, date: undefined };
    }
    if (roleKey === 'employer') {
      return { name: 'مدیر طرح / نماینده کارفرما', title: 'دستگاه اجرایی و کارفرما', signature: undefined, date: undefined };
    }

    return null;
  }, [projects, selectedProjectId, reportContextData]);

  // Register signature handler for reports
  const handleRegisterReportSignature = useCallback((targetData?: any, shouldSign: boolean = true) => {
    const activeData = targetData && typeof targetData === 'object' ? targetData : {};
    
    if (!shouldSign) {
      activeData.unsignedSession = true;
      if (!targetData && reportContextData) {
        setReportContextData({ ...reportContextData, unsignedSession: true });
      }
      return activeData;
    }

    if (!currentUser) {
      setToast({ message: 'لطفاً ابتدا وارد حساب کاربری شوید', type: 'info' });
      activeData.unsignedSession = true;
      return activeData;
    }

    let curSig = HRService.getUserSignature(currentUser);
    if (!curSig) {
      const encodedName = encodeURIComponent(currentUser.fullName || currentUser.username || 'امضا کننده');
      curSig = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="220" height="80" viewBox="0 0 220 80"><path d="M 20 50 Q 40 10 70 45 T 120 30 T 170 55 T 200 25" fill="none" stroke="%231e3a8a" stroke-width="2.5" stroke-linecap="round"/><text x="110" y="70" font-family="Tahoma, sans-serif" font-size="11" font-weight="bold" fill="%230f172a" text-anchor="middle">${encodedName}</text></svg>`;
    }

    const userRoleKey = getRoleKeyForUser(currentUser);
    const newEv = {
      actorName: currentUser.fullName || currentUser.username,
      actorTitle: currentUser.jobTitle || 'امضاء گزارش رسمی',
      action: 'REPORT_SIGNATURE',
      roleKey: userRoleKey,
      timestamp: Date.now(),
      signature: curSig,
      orgType: SystemAdminService.getOrganization(currentUser.orgId)?.type
    };

    activeData.unsignedSession = false;
    if (!Array.isArray(activeData.workflowHistory)) {
      activeData.workflowHistory = [];
    }
    // Remove previous REPORT_SIGNATURE from same actor to avoid duplicates
    activeData.workflowHistory = activeData.workflowHistory.filter(
      (e: any) => !(e.action === 'REPORT_SIGNATURE' && e.actorName === newEv.actorName)
    );
    activeData.workflowHistory.push(newEv);

    if (!targetData && reportContextData) {
      setReportContextData({ ...reportContextData, unsignedSession: false, workflowHistory: activeData.workflowHistory });
    }

    const msg = `امضای الکترونیکی شما (${currentUser.fullName || currentUser.username}) با موفقیت بر روی گزارش درج گردید`;
    setToast({ message: msg, type: 'success' });
    return activeData;
  }, [currentUser, getRoleKeyForUser, reportContextData]);

  useEffect(() => {
    (window as any).registerUserSignatureOnCurrentReport = handleRegisterReportSignature;
  }, [handleRegisterReportSignature]);

  // Helper for Visibility Logic
  const checkItemVisibility = useCallback(
    (
      item: any,
      type:
        | "minute"
        | "statement"
        | "metre"
        | "estimate"
        | "permit"
        | "variation"
        | "mrs"
        | "miv",
    ) => {
      if (!currentUser) return false;

      // System admins see everything
      if (currentUser.role === "SYSTEM_ADMIN") return true;

      // Work permits must be visible to everyone
      if (type === "permit") return true;

      let refItem = item;
      if (type === "metre") {
        refItem = minutes.find((m) => m.id === item.minuteId);
      }
      if (!refItem) return false;

      // Exclude archived versions from standard view for consultant/employer
      if (refItem.isArchived) return false;

      // When a document is final/frozen, users across all organizations are allowed to view it
      if (refItem.isFinalFrozen) return true;

      const hasNoOversightInfo =
        !refItem.createdById &&
        !refItem.assigneeId &&
        (!refItem.workflowHistory || refItem.workflowHistory.length === 0);
      if (hasNoOversightInfo) return true;

      if (
        refItem.createdById === currentUser.id ||
        refItem.assigneeId === currentUser.id
      )
        return true;

      // Exception: Project Managers can see items within their organization OR items currently in their organization for circulation
      const isProjectManager =
        (currentUser.jobTitle || "").includes("مدیر پروژه") ||
        (currentUser.jobLevel || "").includes("مدیر پروژه");
      const hasHistory =
        refItem.workflowHistory && refItem.workflowHistory.length > 0;

      // Can see if they are the owner OR if the item is currently with their organization and has circulation started
      if (
        isProjectManager &&
        (refItem.ownerOrgId === currentUser.orgId ||
          refItem.currentOrgId === currentUser.orgId) &&
        hasHistory
      )
        return true;

      const history = refItem.workflowHistory || [];
      return history.some(
        (ev: any) =>
          ev.assigneeUserId === currentUser.id ||
          ev.actorUserId === currentUser.id,
      );
    },
    [currentUser, minutes],
  );

  useEffect(() => {
    const handleClickOutside = () => setActiveReportMenuId(null);
    if (activeReportMenuId) {
      window.addEventListener("click", handleClickOutside);
    }
    return () => window.removeEventListener("click", handleClickOutside);
  }, [activeReportMenuId]);

  useEffect(() => {
    const user = SystemAdminService.getCurrentUser();
    if (user) {
      setCurrentUser(user);
    }
  }, []);

  
  const filterWorkflowUsers = (users: any[], currentUser: any) => {
    if (!currentUser) return users;
    
    const isCurrentUser = (u: any) =>
      u.id === currentUser.id ||
      (currentUser.username && u.username === currentUser.username);

    const isSystemAdmin = currentUser.role === 'SYSTEM_ADMIN';
    if (isSystemAdmin) {
       return users.filter(u => !isCurrentUser(u));
    }

    const ut = (currentUser.jobTitle || "").trim();
    const ul = (currentUser.jobLevel || "").trim();
    
    const isCurrentUserPM = currentUser.role === 'ORG_ADMIN' || ut.includes('مدیر پروژه') || ul.includes('مدیر پروژه') || currentUser.username === 'e-pm' || currentUser.id === 'e-pm';
    const isCurrentUserWorkshopManager = ut.includes('سرپرست کارگاه') || ul.includes('سرپرست کارگاه');
    
    const isExpertOrUnitSupervisor = (
      ut.includes("کارشناس") || ul.includes("کارشناس") ||
      ut.includes("سرپرست واحد") || ul.includes("سرپرست واحد")
    );

    return users.filter(u => {
      if (isCurrentUser(u)) return false;

      const isSameOrg = u.orgId === currentUser.orgId;
      const isTargetPM = u.role === 'ORG_ADMIN' || (u.jobTitle || '').includes('مدیر پروژه') || (u.jobLevel || '').includes('مدیر پروژه') || u.username === 'e-pm' || u.id === 'e-pm';
      const isTargetWorkshopManager = (u.jobTitle || '').includes('سرپرست کارگاه') || (u.jobLevel || '').includes('سرپرست کارگاه');

      // Rule: For work permits, any user within their own organization can send to any user in the same organization, except the Project Manager
      if (activeTab === "permits" && isSameOrg) {
        return !isTargetPM;
      }

      // Rule: In all organizations, except for the Workshop Manager, no other users should see the Project Manager in the recipient section.
      // Exception: Project Managers sending to another organization must see the other organization's Project Manager.
      if (isTargetPM && !isCurrentUserWorkshopManager && !(isCurrentUserPM && !isSameOrg)) {
        return false;
      }

      if (isSameOrg) {
        if (isExpertOrUnitSupervisor) {
          // Bypassing PM exclusion for minutes tab to allow standard workflow assignment
          if (activeTab === "minutes") {
            return true;
          }
          // Experts and Unit Supervisors see all users of their organization except the Project Manager
          return !isTargetPM;
        }
        if (isCurrentUserPM || isCurrentUserWorkshopManager) {
          // Workshop Managers and Project Managers see all users of their organization
          return true;
        }
        // Fallback for same-organization
        if (activeTab === "minutes") {
          return true;
        }
        return !isTargetPM;
      } else {
        // Cross-organization visibility (only for Project Managers and Workshop Managers)
        if (isCurrentUserPM || isCurrentUserWorkshopManager) {
          // They can see PMs and Workshop Managers of other organizations to route workflows
          return isTargetPM || isTargetWorkshopManager;
        }
        return false;
      }
    });
  };

  const openWorkflowModal = (item: any, action: WorkflowAction) => {
    // Phase 5 Check: If Statement, require all associated minutes to be final approved before advancing
    if (activeTab === "statements" && "selectedMinuteIds" in item) {
      const advancementActions = [
        "SUBMIT",
        "SEND_TO_CONSULTANT",
        "SEND_TO_EMPLOYER",
        "APPROVE",
        "APPROVE_INTERNAL",
      ];
      if (advancementActions.includes(action)) {
        const stmtMinIds = item.selectedMinuteIds || [];
        if (stmtMinIds.length > 0) {
          const stmtMinutes = minutes.filter((m: any) =>
            stmtMinIds.includes(m.id),
          );
          const unapprovedMinutes = stmtMinutes.filter(
            (m: any) => !m.isFinalFrozen,
          );
          if (unapprovedMinutes.length > 0) {
            const unapprovedNumbers = unapprovedMinutes
              .map((m: any) => m.number)
              .join("، ");
            alert(
              `امکان پیش‌برد گردش برای این صورت‌وضعیت وجود ندارد. ابتدا صورت‌جلسات زیر باید تایید نهایی کارفرما را دریافت کنند:\n${unapprovedNumbers}`,
            );
            return;
          }
        }
      }
    }

    setWorkflowItem(item);
    setWorkflowBatchItems(null);
    setWorkflowActionType(action);
    setWorkflowComment("");
    setWorkflowAssignee("");
    const userHrSig = currentUser ? (HRService.getUserSignature(currentUser) || currentUser?.signature) : undefined;
    setAttachWorkflowSignature(!!userHrSig);
    setSelectedExperts(item && item.assigneeId ? item.assigneeId.split(',').filter(Boolean) : []);
    setWorkflowModalOpen(true);

    const isSystemAdmin = currentUser?.role === "SYSTEM_ADMIN";

    if (
      action === "SUBMIT" ||
      action === "REASSIGN" ||
      action === "APPROVE" ||
      action === "REJECT" ||
      action === "FINAL_APPROVE"
    ) {
      // Load users for assignment
      if (currentUser) {
        let users = SystemAdminService.getUsers().filter((u) => u.isActive);
        if (!isSystemAdmin) {
          users = users.filter((u) => u.orgId === currentUser.orgId);
        }
        setOrgUsers(filterWorkflowUsers(users, currentUser));
      }
    } else if (
      action === "SEND_TO_CONSULTANT" ||
      action === "RETURN_TO_CONSULTANT"
    ) {
      // Phase 4B: Load Consultant Users
      if (isSystemAdmin) {
        const users = SystemAdminService.getUsers().filter((u) => u.isActive);
        setOrgUsers(filterWorkflowUsers(users, currentUser));
      } else {
        const orgs = SystemAdminService.getOrganizations();
        const consultantOrg = orgs.find(
          (o) => o.type === OrganizationType.CONSULTANT,
        );
        if (consultantOrg) {
          const users = SystemAdminService.getUsers().filter(
            (u) => u.orgId === consultantOrg.id && u.isActive,
          );
          setOrgUsers(filterWorkflowUsers(users, currentUser));
        } else {
          setOrgUsers([]);
          if (action !== "RETURN_TO_CONSULTANT")
            alert("سازمان مشاور تعریف نشده است.");
        }
      }
    } else if (action === "SEND_TO_EMPLOYER") {
      // Phase 4B: Load Employer Users
      if (isSystemAdmin) {
        const users = SystemAdminService.getUsers().filter((u) => u.isActive);
        setOrgUsers(filterWorkflowUsers(users, currentUser));
      } else {
        const orgs = SystemAdminService.getOrganizations();
        const employerOrg = orgs.find(
          (o) => o.type === OrganizationType.EMPLOYER,
        );
        if (employerOrg) {
          const users = SystemAdminService.getUsers().filter(
            (u) => u.orgId === employerOrg.id && u.isActive,
          );
          setOrgUsers(filterWorkflowUsers(users, currentUser));
        } else {
          setOrgUsers([]);
          alert("سازمان کارفرما تعریف نشده است.");
        }
      }
    } else if (action === "RETURN_TO_CONTRACTOR") {
      if (isSystemAdmin) {
        const users = SystemAdminService.getUsers().filter((u) => u.isActive);
        setOrgUsers(filterWorkflowUsers(users, currentUser));
      } else {
        const orgs = SystemAdminService.getOrganizations();
        const targetOrgId = item.ownerOrgId;
        const contractorOrg = targetOrgId
          ? orgs.find((o) => o.id === targetOrgId)
          : orgs.find((o) => o.type === OrganizationType.CONTRACTOR);
        if (contractorOrg) {
          const users = SystemAdminService.getUsers().filter(
            (u) => u.orgId === contractorOrg.id && u.isActive,
          );
          setOrgUsers(filterWorkflowUsers(users, currentUser));
        } else {
          setOrgUsers([]);
        }
      }
    }
  };

  const openBatchWorkflowModal = (items: any[], action: WorkflowAction) => {
    if (items.length === 0) return;

    // Phase 5 Check for statements in batch
    if (activeTab === "statements") {
      const advancementActions = [
        "SUBMIT",
        "SEND_TO_CONSULTANT",
        "SEND_TO_EMPLOYER",
        "APPROVE",
        "APPROVE_INTERNAL",
      ];
      if (advancementActions.includes(action)) {
        for (const item of items) {
          if ("selectedMinuteIds" in item) {
            const stmtMinIds = item.selectedMinuteIds || [];
            if (stmtMinIds.length > 0) {
              const stmtMinutes = minutes.filter((m: any) =>
                stmtMinIds.includes(m.id),
              );
              const unapprovedMinutes = stmtMinutes.filter(
                (m: any) => !m.isFinalFrozen,
              );
              if (unapprovedMinutes.length > 0) {
                const unapprovedNumbers = unapprovedMinutes
                  .map((m: any) => m.number)
                  .join("، ");
                alert(
                  `امکان پیش‌برد گردش برای صورت‌وضعیت شماره ${item.number} مسدود است. تا تایید نهایی کارفرما برای صورت‌جلسات:\n${unapprovedNumbers}`,
                );
                return;
              }
            }
          }
        }
      }
    }

    setWorkflowBatchItems(items);
    setWorkflowItem(items[0]); // Use first item as a template for modal labels if needed
    setWorkflowActionType(action);
    setWorkflowComment("");
    setWorkflowAssignee("");
    const userHrSig = currentUser ? (HRService.getUserSignature(currentUser) || currentUser?.signature) : undefined;
    setAttachWorkflowSignature(!!userHrSig);
    setWorkflowModalOpen(true);

    if (
      action === "SUBMIT" ||
      action === "REASSIGN" ||
      action === "APPROVE" ||
      action === "REJECT"
    ) {
      if (currentUser) {
        const users = SystemAdminService.getUsers().filter(
          (u) => u.orgId === currentUser.orgId && u.isActive,
        );
        setOrgUsers(filterWorkflowUsers(users, currentUser));
      }
    } else if (action === "SEND_TO_CONSULTANT") {
      const orgs = SystemAdminService.getOrganizations();
      const consultantOrg = orgs.find(
        (o) => o.type === OrganizationType.CONSULTANT,
      );
      if (consultantOrg) {
        const users = SystemAdminService.getUsers().filter(
          (u) => u.orgId === consultantOrg.id && u.isActive,
        );
        setOrgUsers(filterWorkflowUsers(users, currentUser));
      }
    } else if (action === "SEND_TO_EMPLOYER") {
      const orgs = SystemAdminService.getOrganizations();
      const employerOrg = orgs.find(
        (o) => o.type === OrganizationType.EMPLOYER,
      );
      if (employerOrg) {
        const users = SystemAdminService.getUsers().filter(
          (u) => u.orgId === employerOrg.id && u.isActive,
        );
        setOrgUsers(filterWorkflowUsers(users, currentUser));
      }
    } else if (action === "RETURN_TO_CONTRACTOR") {
      const orgs = SystemAdminService.getOrganizations();
      const targetOrgId = items[0]?.ownerOrgId;
      const contractorOrg = targetOrgId
        ? orgs.find((o) => o.id === targetOrgId)
        : orgs.find((o) => o.type === OrganizationType.CONTRACTOR);
      if (contractorOrg) {
        const users = SystemAdminService.getUsers().filter(
          (u) => u.orgId === contractorOrg.id && u.isActive,
        );
        setOrgUsers(filterWorkflowUsers(users, currentUser));
      }
    } else if (action === "RETURN_TO_CONSULTANT") {
      const orgs = SystemAdminService.getOrganizations();
      const consultantOrg = orgs.find(
        (o) => o.type === OrganizationType.CONSULTANT,
      );
      if (consultantOrg) {
        const users = SystemAdminService.getUsers().filter(
          (u) => u.orgId === consultantOrg.id && u.isActive,
        );
        setOrgUsers(filterWorkflowUsers(users, currentUser));
      }
    }
  };

  const handleBatchSendEstimates = (action: string) => {
    if (!currentUser) return;
    if (!selectedProjectId) {
      alert("لطفاً ابتدا یک پروژه را انتخاب کنید.");
      return;
    }

    try {
      const userOrgType = SystemAdminService.getOrganization(
        currentUser.orgId,
      )?.type;
      const projectEstimates = estimates.filter(
        (e) => e.projectId === selectedProjectId,
      );
      let targets: EstimateItem[] = [];

      // Unified target filtering logic
      if (action === "SUBMIT") {
        targets = projectEstimates.filter((e) => {
          const status = WorkflowService.getStatus(e);
          const actions = WorkflowService.getAvailableActions(
            e,
            currentUser,
            userOrgType,
          );
          return (
            (status === WorkflowStatus.DRAFT ||
              status === WorkflowStatus.REJECTED) &&
            actions.includes("SUBMIT")
          );
        });
        if (targets.length === 0) {
          alert(
            "هیچ برآوردی در وضعیت پیش‌نویس یا عودت شده که توسط شما قابل ارسال باشد یافت نشد. اطمینان حاصل کنید که ردیف‌ها متعلق به شما هستند یا دسترسی لازم را دارید.",
          );
          return;
        }
        openBatchWorkflowModal(targets, "SUBMIT");
      } else if (action === "APPROVE") {
        targets = projectEstimates.filter((e) =>
          WorkflowService.getAvailableActions(
            e,
            currentUser,
            userOrgType,
          ).includes("APPROVE"),
        );
        if (targets.length === 0) {
          alert("هیچ برآوردی در انتظار تایید توسط شما یافت نشد.");
          return;
        }
        openBatchWorkflowModal(targets, "APPROVE");
      } else if (action === "REJECT") {
        targets = projectEstimates.filter((e) =>
          WorkflowService.getAvailableActions(
            e,
            currentUser,
            userOrgType,
          ).includes("REJECT"),
        );
        if (targets.length === 0) {
          alert("هیچ برآوردی برای عودت به کارشناس یافت نشد.");
          return;
        }
        openBatchWorkflowModal(targets, "REJECT");
      } else if (action === "SEND_TO_CONSULTANT") {
        targets = projectEstimates.filter((e) =>
          WorkflowService.getAvailableActions(
            e,
            currentUser,
            userOrgType,
          ).includes("SEND_TO_CONSULTANT"),
        );
        if (targets.length === 0) {
          alert("هیچ برآورد تایید شده داخلی برای ارسال به مشاور یافت نشد.");
          return;
        }
        openBatchWorkflowModal(targets, "SEND_TO_CONSULTANT");
      } else if (action === "RETURN_TO_CONTRACTOR") {
        targets = projectEstimates.filter((e) =>
          WorkflowService.getAvailableActions(
            e,
            currentUser,
            userOrgType,
          ).includes("RETURN_TO_CONTRACTOR"),
        );
        if (targets.length === 0) {
          alert("هیچ برآوردی برای عودت به پیمانکار یافت نشد.");
          return;
        }
        openBatchWorkflowModal(targets, "RETURN_TO_CONTRACTOR");
      } else if (action === "SEND_TO_EMPLOYER") {
        targets = projectEstimates.filter((e) =>
          WorkflowService.getAvailableActions(
            e,
            currentUser,
            userOrgType,
          ).includes("SEND_TO_EMPLOYER"),
        );
        if (targets.length === 0) {
          alert("هیچ برآوردی برای ارسال به کارفرما یافت نشد.");
          return;
        }
        openBatchWorkflowModal(targets, "SEND_TO_EMPLOYER");
      } else if (action === "RETURN_TO_CONSULTANT") {
        targets = projectEstimates.filter((e) =>
          WorkflowService.getAvailableActions(
            e,
            currentUser,
            userOrgType,
          ).includes("RETURN_TO_CONSULTANT"),
        );
        if (targets.length === 0) {
          alert("هیچ برآوردی برای عودت به مشاور یافت نشد.");
          return;
        }
        openBatchWorkflowModal(targets, "RETURN_TO_CONSULTANT");
      } else if (action === "REASSIGN") {
        targets = projectEstimates.filter((e) =>
          WorkflowService.getAvailableActions(
            e,
            currentUser,
            userOrgType,
          ).includes("REASSIGN"),
        );
        if (targets.length === 0) {
          alert("هیچ برآوردی برای ارجاع به سایر کاربران یافت نشد.");
          return;
        }
        openBatchWorkflowModal(targets, "REASSIGN");
      } else if (action === "FINAL_APPROVE") {
        targets = projectEstimates.filter((e) =>
          WorkflowService.getAvailableActions(
            e,
            currentUser,
            userOrgType,
          ).includes("FINAL_APPROVE"),
        );
        if (targets.length === 0) {
          alert("هیچ برآوردی برای تایید نهایی توسط شما یافت نشد.");
          return;
        }
        openBatchWorkflowModal(targets, "FINAL_APPROVE");
      }
    } catch (err: any) {
      alert("خطا در انجام عملیات دسته‌ای: " + (err.message || err));
    }
  };

  const handleWorkflowSubmit = () => {
    if (
      (!workflowItem && !workflowBatchItems) ||
      !workflowActionType ||
      !currentUser
    )
      return;

    const isInterOrgAction =
      workflowActionType === "SEND_TO_CONSULTANT" ||
      workflowActionType === "SEND_TO_EMPLOYER" ||
      workflowActionType === "FINAL_APPROVE" ||
      workflowActionType === "RETURN_TO_CONTRACTOR" ||
      workflowActionType === "RETURN_TO_CONSULTANT";

    const hrSig = HRService.getUserSignature(currentUser) || currentUser?.signature;

    // Signature check non-blocking
    if (attachWorkflowSignature && !hrSig) {
      console.warn("HR Signature not found for user, proceeding without attached digital PNG signature.");
    }

    try {
      let targetOrgId: string | undefined;
      const orgs = SystemAdminService.getOrganizations();
      if (
        workflowActionType === "SEND_TO_CONSULTANT" ||
        workflowActionType === "RETURN_TO_CONSULTANT"
      ) {
        const consultantOrg = orgs.find(
          (o) => o.type === OrganizationType.CONSULTANT,
        );
        if (consultantOrg) targetOrgId = consultantOrg.id;
      } else if (workflowActionType === "SEND_TO_EMPLOYER") {
        const employerOrg = orgs.find(
          (o) => o.type === OrganizationType.EMPLOYER,
        );
        if (employerOrg) targetOrgId = employerOrg.id;
      } else if (workflowActionType === "RETURN_TO_CONTRACTOR") {
        const item =
          workflowItem || (workflowBatchItems && workflowBatchItems[0]);
        if (item) {
          const contractOrgId = item.ownerOrgId;
          const contractorOrg = contractOrgId
            ? orgs.find((o) => o.id === contractOrgId)
            : orgs.find((o) => o.type === OrganizationType.CONTRACTOR);
          if (contractorOrg) targetOrgId = contractorOrg.id;
        }
      }

      let assigneeNameWithTitle: string | undefined;
      if (workflowAssignee && workflowAssignee.includes(",")) {
        const ids = workflowAssignee.split(",").map(id => id.trim());
        const allUsers = SystemAdminService.getUsers();
        const names = ids.map(id => {
          const u = allUsers.find(user => user.id === id);
          if (u) {
            const o = u.orgId ? SystemAdminService.getOrganization(u.orgId) : undefined;
            return formatUserDisplayFormal(u, o);
          }
          return "";
        }).filter(n => n !== "");
        assigneeNameWithTitle = names.join("، ");
      } else {
        const assigneeUser = orgUsers.find((u) => u.id === workflowAssignee);
        const assigneeOrg = assigneeUser?.orgId ? SystemAdminService.getOrganization(assigneeUser.orgId) : undefined;
        assigneeNameWithTitle = assigneeUser
          ? formatUserDisplayFormal(assigneeUser, assigneeOrg)
          : undefined;
      }

      const selectedSignature = attachWorkflowSignature && hrSig ? hrSig : undefined;

      const payload = {
        assigneeId: workflowAssignee,
        assigneeName: assigneeNameWithTitle,
        comment: workflowComment,
        targetOrgId: targetOrgId,
        signature: selectedSignature,
        attachSignature: !!attachWorkflowSignature,
        roleKey: getRoleKeyForUser(currentUser),
      };

      if (workflowBatchItems && workflowBatchItems.length > 0) {
        // Handling Batch
        const itemsToUpdate = [...workflowBatchItems];
        console.log(
          `Processing batch of ${itemsToUpdate.length} items for action ${workflowActionType}`,
        );

        let newEstimates = [...estimates];
        let hasChanges = false;
        let successCount = 0;
        let failCount = 0;

        itemsToUpdate.forEach((item) => {
          try {
            // Check if action is actually allowed for this item first
            const userOrgType = SystemAdminService.getOrganization(
              currentUser.orgId,
            )?.type;
            const allowedActions = WorkflowService.getAvailableActions(
              item,
              currentUser,
              userOrgType,
            );

            if (allowedActions.includes(workflowActionType)) {
              const updated = WorkflowService.performAction(
                item,
                workflowActionType,
                currentUser,
                payload,
              );
              if ("unitPrice" in updated && "quantity" in updated) {
                const idx = newEstimates.findIndex((e) => e.id === updated.id);
                if (idx !== -1) {
                  newEstimates[idx] = updated as EstimateItem;
                  hasChanges = true;
                  successCount++;
                }
              }
            } else {
              failCount++;
            }
          } catch (itemErr) {
            console.error(`Error in batch item ${item.id}:`, itemErr);
            failCount++;
          }
        });

        if (hasChanges) {
          setEstimates(newEstimates);
          localStorage.setItem(
            "hamyar_estimates",
            JSON.stringify(newEstimates),
          );
          alert(
            `${successCount} ردیف با موفقیت بروزرسانی شد.${failCount > 0 ? ` (${failCount} ردیف به دلیل عدم دسترسی یا خطا تغییر نکرد)` : ""}`,
          );

          SystemAdminService.addAuditLog({
            user: currentUser?.id || 'admin',
            action: workflowActionType,
            details: `تغییر وضعیت گردش کار به [${workflowActionType}] روی تعداد ${successCount} ردیف برآورد پیمان به صورت دسته‌ای`,
            source: 'دفتر فنی (گردش کار دسته‌ای)',
            sourceType: 'TECHNICAL'
          });
        } else if (failCount > 0) {
          alert(
            `خطا: هیچکدام از ${itemsToUpdate.length} ردیف انتخاب شده توسط شما قابل تغییر نیستند. (عدم دسترسی یا وضعیت نامناسب)`,
          );
        }
      } else if (workflowItem) {
        // Handling Single Item
        const updatedItem = WorkflowService.performAction(
          workflowItem,
          workflowActionType,
          currentUser,
          payload,
        );

        // Update state
        if ("startDate" in updatedItem) {
          // It's a Statement
          const newStatements = statements.map((s) =>
            s.id === updatedItem.id ? (updatedItem as Statement) : s,
          );
          setStatements(newStatements);
          localStorage.setItem(
            "hamyar_statements",
            JSON.stringify(newStatements),
          );
        } else if ("unitPrice" in updatedItem && "quantity" in updatedItem) {
          // It's an Estimate
          const newEstimates = estimates.map((e) =>
            e.id === updatedItem.id ? (updatedItem as EstimateItem) : e,
          );
          setEstimates(newEstimates);
          localStorage.setItem(
            "hamyar_estimates",
            JSON.stringify(newEstimates),
          );
        } else if (activeTab === "permits" || "contractorDcc" in updatedItem) {
          // WorkPermit
          const newPermits = workPermits.map((p) =>
            p.id === (updatedItem as any).id ? (updatedItem as any as WorkPermit) : p,
          );
          setWorkPermits(newPermits);
          localStorage.setItem("hamyar_permits", JSON.stringify(newPermits));
        } else if ("entryDate" in updatedItem) {
          // MrsRecord
          const newMrs = mrsList.map((m) =>
            m.id === (updatedItem as any).id ? (updatedItem as any as MrsRecord) : m,
          );
          setMrsList(newMrs);
          localStorage.setItem("hamyar_mrs", JSON.stringify(newMrs));
        } else if ("requestedBy" in updatedItem) {
          // MivRecord
          const newMiv = mivList.map((m) =>
            m.id === (updatedItem as any).id ? (updatedItem as any as MivRecord) : m,
          );
          setMivList(newMiv);
          localStorage.setItem("hamyar_miv", JSON.stringify(newMiv));
        } else if ("items" in updatedItem) {
          // VariationOrder
          const vo = updatedItem as any as VariationOrder;
          const newVars = variations.map((v) =>
            v.id === vo.id ? vo : v,
          );
          setVariations(newVars);
          localStorage.setItem("hamyar_variations", JSON.stringify(newVars));

          // Sync quantities and weights to Estimates / CBS Nodes ONLY when approved by Employer
          const isApprovedByEmployer = 
            vo.status === WorkflowStatus.APPROVED_BY_EMPLOYER || 
            (vo.status as any) === "APPROVED_BY_EMPLOYER" ||
            (vo.status as any) === ("APPROVED" as any) || 
            vo.isFinalFrozen;

          if (isApprovedByEmployer) {
            const newEstimates = [...estimates];
            const newCbsNodes = [...cbsNodes];
            
            vo.items?.forEach((vItem) => {
              const finalQty = vItem.employerQty ?? vItem.consultantQty ?? vItem.contractorQty ?? 0;
              const finalWeight = vItem.employerWeightFactor ?? vItem.consultantWeightFactor ?? vItem.contractorWeightFactor ?? vItem.weightFactor ?? 0;

              if (currentProject?.contractType === "CBS") {
                const nodeIndex = newCbsNodes.findIndex(n => n.projectId === selectedProjectId && n.code === vItem.code);
                if (nodeIndex !== -1) {
                  newCbsNodes[nodeIndex] = {
                    ...newCbsNodes[nodeIndex],
                    quantity: finalQty,
                    weightPercent: finalWeight
                  };
                }
              } else {
                const existingEstIndex = newEstimates.findIndex(
                  (e) => e.projectId === selectedProjectId && e.code === vItem.code,
                );
                if (existingEstIndex !== -1)
                  newEstimates[existingEstIndex] = {
                    ...newEstimates[existingEstIndex],
                    quantity: finalQty,
                    weightPercent: finalWeight,
                  };
                else if (finalQty > 0)
                  newEstimates.push({
                    id: Math.random().toString(36).substr(2, 9),
                    projectId: selectedProjectId,
                    code: vItem.code,
                    description: vItem.description,
                    unit: vItem.unit,
                    unitPrice: vItem.unitPrice,
                    quantity: finalQty,
                    weightPercent: finalWeight,
                    itemType: vItem.itemType,
                    independentCoefficient: vItem.independentCoefficient,
                  });
              }
            });

            if (currentProject?.contractType === "CBS") {
              setCbsNodes(newCbsNodes);
              localStorage.setItem("hamyar_cbs_nodes", JSON.stringify(newCbsNodes));
            } else {
              setEstimates(newEstimates);
              localStorage.setItem("hamyar_estimates", JSON.stringify(newEstimates));
            }
          }
        } else if ("periods" in updatedItem) {
          // AdjustmentRecord
          const newAdjustments = adjustments.map((a) =>
            a.id === (updatedItem as any).id ? (updatedItem as any as AdjustmentRecord) : a,
          );
          setAdjustments(newAdjustments);
          localStorage.setItem(
            "hamyar_adjustments",
            JSON.stringify(newAdjustments),
          );
        } else {
          // It's a Minute
          const newMinutes = minutes.map((m) =>
            m.id === (updatedItem as any).id ? (updatedItem as any as ProjectMinute) : m,
          );
          setMinutes(newMinutes);
          localStorage.setItem("hamyar_minutes", JSON.stringify(newMinutes));
        }

        let docDetails = '';
        let docSource = 'گردش کار';
        if ("startDate" in updatedItem) {
          docDetails = `صورت‌وضعیت شماره ${(updatedItem as Statement).number || ''} دوره ${(updatedItem as Statement).startDate || ''} تا ${(updatedItem as Statement).endDate || ''}`;
          docSource = 'دفتر فنی (صورت‌وضعیت)';
        } else if ("unitPrice" in updatedItem && "quantity" in updatedItem) {
          docDetails = `برآورد پیمان کد ${(updatedItem as EstimateItem).code || ''} موضوع: ${(updatedItem as EstimateItem).description || ''}`;
          docSource = 'دفتر فنی (برآورد)';
        } else if (activeTab === "permits" || "contractorDcc" in updatedItem) {
          docDetails = `مجوز کار شماره ${(updatedItem as any).number || ''}`;
          docSource = 'دفتر فنی (مجوز کار)';
        } else if ("entryDate" in updatedItem) {
          docDetails = `درخواست مصالح شماره ${(updatedItem as any).serialNumber || ''}`;
          docSource = 'دفتر فنی (MRS)';
        } else if ("requestedBy" in updatedItem) {
          docDetails = `حواله خروج مصالح شماره ${(updatedItem as any).serialNumber || ''}`;
          docSource = 'دفتر فنی (MIV)';
        } else if ("items" in updatedItem) {
          docDetails = `ابلاغیه تغییرات موضوع ${(updatedItem as any).description || ''}`;
          docSource = 'دفتر فنی (تغییر کار)';
        } else if ("periods" in updatedItem) {
          docDetails = `دفترچه تعدیل به شماره ${(updatedItem as any).number || ''}`;
          docSource = 'دفتر فنی (تعدیل)';
        } else {
          docDetails = `صورت‌جلسه کارکرد شماره ${(updatedItem as any).number || ''}`;
          docSource = 'دفتر فنی (صورت‌جلسات)';
        }

        SystemAdminService.addAuditLog({
          user: currentUser?.id || 'admin',
          action: workflowActionType,
          details: `تغییر وضعیت گردش کار به [${workflowActionType}] برای سند: ${docDetails} ${workflowAssignee ? ` - ارجاع به: ${assigneeNameWithTitle || workflowAssignee}` : ''}`,
          source: docSource,
          sourceType: 'TECHNICAL'
        });
      }

      setToast({
        message: workflowBatchItems && workflowBatchItems.length > 0
          ? `عملیات گروهی گردش کار با موفقیت انجام شد`
          : "اقدام گردش کار با موفقیت ثبت و ارسال شد",
        type: "success"
      });
      setWorkflowBatchItems(null);
      setWorkflowModalOpen(false);
    } catch (error: any) {
      setToast({ message: "خطا در انجام عملیات: " + error.message, type: "error" });
    }
  };

  const WorkflowProgressStage = ({
    status,
    isFinalFrozen,
  }: {
    status: WorkflowStatus;
    isFinalFrozen?: boolean;
  }) => {
    const stages = [
      { id: WorkflowStatus.DRAFT, label: "پیش‌نویس", color: "slate" },
      {
        id: WorkflowStatus.IN_REVIEW,
        label: "بررسی داخلی (پیمانکار)",
        color: "blue",
      },
      {
        id: WorkflowStatus.APPROVED_INTERNAL,
        label: "تایید داخلی / آماده ارسال",
        color: "emerald",
      },
      {
        id: WorkflowStatus.SENT_TO_CONSULTANT,
        label: "ارسال به مشاور",
        color: "indigo",
      },
      {
        id: WorkflowStatus.IN_CONSULTANT_REVIEW,
        label: "در بررسی مشاور",
        color: "indigo",
      },
      {
        id: WorkflowStatus.APPROVED_BY_CONSULTANT,
        label: "تایید مشاور / آماده ارسال به کارفرما",
        color: "emerald",
      },
      {
        id: WorkflowStatus.SENT_TO_EMPLOYER,
        label: "ارسال به کارفرما",
        color: "purple",
      },
      {
        id: WorkflowStatus.IN_EMPLOYER_REVIEW,
        label: "در بررسی کارفرما / تایید نهایی",
        color: "purple",
      },
      { id: "FINALIZED", label: "تایید نهایی و قطعی (فریز)", color: "emerald" },
    ];

    let currentIdx = stages.findIndex((s) => s.id === status);
    if (status === WorkflowStatus.REJECTED) currentIdx = 0; // Show rejected at start
    if (isFinalFrozen) currentIdx = 8; // Index of FINALIZED stage

    return (
      <div className="flex flex-col items-center gap-1.5 w-full">
        <div className="flex items-center justify-between w-full max-w-[140px] gap-0.5 px-1">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                isFinalFrozen
                  ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                  : s <= currentIdx
                    ? status === WorkflowStatus.REJECTED
                      ? "bg-red-500"
                      : "bg-[#faf8f4]0"
                    : "bg-stone-200"
              }`}
            />
          ))}
        </div>
        <span
          className={`px-2 py-0.5 rounded-lg font-black text-[9px] border transition-all ${
            isFinalFrozen
              ? "bg-emerald-100 text-emerald-800 border-emerald-200 animate-pulse"
              : status === WorkflowStatus.REJECTED
                ? "bg-red-50 text-red-600 border-red-100"
                : status === WorkflowStatus.DRAFT
                  ? "bg-[#faf8f4] text-stone-500 border-[#ece5d8]"
                  : "bg-[#faf8f4] text-amber-700 border-stone-100"
          }`}
        >
          {isFinalFrozen
            ? "تایید نهایی / قطعی (Frozen)"
            : status === WorkflowStatus.REJECTED
              ? "عودت داده شده (نیاز به بازنگری)"
              : WorkflowService.getStatusLabel(status)}
        </span>
      </div>
    );
  };

  const handlePrintOfficial = (type: string, data: any = null, bypassPrompt: boolean = true) => {
    // Determine title and content based on type
    let title = "گزارش سامانه همیار";
    let contentHtml = "";
    const projectTitle = currentProject?.title || "---";
    const projectEmployer = currentProject?.employerName || "---";
    const projectConsultant = currentProject?.consultantName || "---";
    const projectContractor = currentProject?.contractorName || "---";
    const projectBudget = currentProject?.initialBudget
      ? currentProject.initialBudget.toLocaleString("fa-IR") + " ریال"
      : "---";
    const projectTimeline =
      (currentProject?.startDate || "---") +
      " الی " +
      (currentProject?.endDate || "---");

    const getPlTitle = (plId: string) => {
      if (plId && plId !== 'default') {
        const found = currentProject?.priceLists?.find((pl: any) => pl.id === plId);
        if (found) return `${found.title} (${found.year || ''})`;
      }
      if (currentProject?.priceLists && currentProject.priceLists.length > 0) {
        return currentProject.priceLists.map((pl: any) => `${pl.title} (${pl.year || ''})`).join(' و ');
      }
      return 'فهرست بهای عمومی / پیش‌فرض';
    };

    const renderProjectHeader = (
      reportTitle: string,
      showContractInfo: boolean = false,
    ) => `
      <div style="border-bottom: 2px solid #1e40af; padding-bottom: 15px; margin-bottom: 20px;">
        <h2 style="margin: 0; color: #1e40af; text-align: center;">${reportTitle}</h2>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 15px; font-size: 12px; background: #f8fafc; padding: 10px; border-radius: 8px;">
          <div><strong>پروژه:</strong> ${projectTitle}</div>
          <div><strong>شماره پیمان:</strong> ${currentProject?.contractNumber || "---"}</div>
          <div><strong>کارفرما:</strong> ${projectEmployer}</div>
          <div><strong>مشاور:</strong> ${projectConsultant}</div>
          <div><strong>پیمانکار:</strong> ${projectContractor}</div>
          ${
            showContractInfo
              ? `
            <div><strong>مبلغ کل قرارداد:</strong> ${projectBudget}</div>
            <div><strong>مدت پیمان:</strong> ${projectTimeline}</div>
          `
              : ""
          }
        </div>
      </div>
    `;

    if (type === "statements") {
      const projStatements = statements.filter(
        (s) => s.projectId === selectedProjectId,
      );
      const approvedStatements = projStatements.filter((s) => s.isFinalFrozen);
      const pendingStatements = projStatements.filter(
        (s) =>
          !s.isFinalFrozen &&
          WorkflowService.getStatus(s) !== WorkflowStatus.DRAFT &&
          WorkflowService.getStatus(s) !== WorkflowStatus.REJECTED,
      );

      const sortedAllStmts = [...projStatements].sort((a, b) => {
        const numA = parsePersianInt(a.number);
        const numB = parsePersianInt(b.number);
        return numA - numB;
      });

      const getPeriodTotals = (s: Statement) => {
        const sIdx = sortedAllStmts.findIndex((item) => item.id === s.id);
        const prevStmt = sIdx > 0 ? sortedAllStmts[sIdx - 1] : null;

        const cumTotals = getStatementTotals(s);
        const prevTotals = prevStmt ? getStatementTotals(prevStmt) : { totalRaw: 0, totalCoeff: 0 };

        const periodRaw = Math.max(0, cumTotals.totalRaw - prevTotals.totalRaw);
        const periodCoeff = Math.max(0, cumTotals.totalCoeff - prevTotals.totalCoeff);

        return {
          periodRaw,
          periodCoeff,
        };
      };

      const approvedTotal = approvedStatements.reduce(
        (sum, s) => sum + getPeriodTotals(s).periodCoeff,
        0,
      );
      const pendingTotal = pendingStatements.reduce(
        (sum, s) => sum + getPeriodTotals(s).periodCoeff,
        0,
      );
      const approvedRawTotal = approvedStatements.reduce(
        (sum, s) => sum + getPeriodTotals(s).periodRaw,
        0,
      );
      const pendingRawTotal = pendingStatements.reduce(
        (sum, s) => sum + getPeriodTotals(s).periodRaw,
        0,
      );

      if (data) {
        title = `صورت‌وضعیت شماره ${data.number} - ${data.description}`;
        contentHtml = `
          ${renderProjectHeader("صورت‌وضعیت کارکرد موقت", true)}
          <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px;">
            <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; width: 30%;">شماره صورت‌وضعیت:</td><td style="padding: 8px; border: 1px solid #ddd;">${data.number}</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">دوره کارکرد:</td><td style="padding: 8px; border: 1px solid #ddd;">${data.startDate} الی ${data.endDate}</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">توضیحات:</td><td style="padding: 8px; border: 1px solid #ddd;">${data.description}</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">وضعیت تایید:</td><td style="padding: 8px; border: 1px solid #ddd;">${WorkflowService.getStatusLabel(data)}</td></tr>
          </table>
          <div style="margin-top: 30px;">
            <h3 style="border-bottom: 1px solid #eee; padding-bottom: 5px;">خلاصه مالی صورت‌وضعیت</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 10px;">
               <div style="background: #f1f5f9; padding: 15px; border-radius: 12px; text-align: center;">
                 <div style="font-size: 10px; color: #64748b;">مبلغ ناخالص (خام)</div>
                 <div style="font-size: 18px; font-weight: bold; margin-top: 5px;">${getStatementTotals(data).totalRaw.toLocaleString("fa-IR")} <small>ریال</small></div>
               </div>
               <div style="background: #e0f2fe; padding: 15px; border-radius: 12px; text-align: center;">
                 <div style="font-size: 10px; color: #0369a1;">مبلغ با کلیه ضرایب</div>
                 <div style="font-size: 18px; font-weight: bold; margin-top: 5px;">${getStatementTotals(data).totalCoeff.toLocaleString("fa-IR")} <small>ریال</small></div>
               </div>
            </div>
          </div>
          <div style="margin-top: 30px;">
            <h3 style="border-bottom: 2px solid #10b981; padding-bottom: 5px; color: #065f46; font-size: 14px;">صورت‌جلسات مرتبط و پیوست این صورت‌وضعیت</h3>
            <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; text-align: center; direction: rtl;">
              <thead>
                <tr style="background: #f1f5f9;">
                  <th style="padding: 8px; border: 1px solid #ddd; width: 8%;">ردیف</th>
                  <th style="padding: 8px; border: 1px solid #ddd; width: 15%;">شماره صورت‌جلسه</th>
                  <th style="padding: 8px; border: 1px solid #ddd; width: 15%;">تاریخ</th>
                  <th style="padding: 8px; border: 1px solid #ddd;">شرح صورت‌جلسه و محل اجرا</th>
                  <th style="padding: 8px; border: 1px solid #ddd; width: 18%;">مبلغ خام (ریال)</th>
                  <th style="padding: 8px; border: 1px solid #ddd; width: 18%;">مبلغ با ضرایب (ریال)</th>
                </tr>
              </thead>
              <tbody>
                ${
                  getStatementTotals(data).includedMinutes.length > 0
                    ? getStatementTotals(data)
                        .includedMinutes.map((min, idx) => {
                           const t = getMinuteTotals(min.id);
                           return `
                     <tr>
                       <td style="padding: 8px; border: 1px solid #ddd;">${(idx + 1).toLocaleString("fa-IR")}</td>
                       <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${min.number}</td>
                       <td style="padding: 8px; border: 1px solid #ddd;">${min.date}</td>
                       <td style="padding: 8px; border: 1px solid #ddd; text-align: right; padding-right: 15px;">${min.description} ${min.location ? `- ${min.location}` : ""}</td>
                       <td style="padding: 8px; border: 1px solid #ddd;">${t.raw.toLocaleString("fa-IR")}</td>
                       <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${t.withCoeff.toLocaleString("fa-IR")}</td>
                     </tr>
                   `;
                         })
                        .join("")
                    : '<tr><td colspan="6" style="padding: 20px; color: #94a3b8;">هیچ صورت‌جلسه متصلی برای این صورت‌وضعیت یافت نشد.</td></tr>'
                }
              </tbody>
            </table>
          </div>
        `;
      } else {
        title = `گزارش جامع وضعیت مالی پروژه ${projectTitle}`;
        contentHtml = `
          ${renderProjectHeader("گزارش وضعیت مالی و کارکرد صورت‌وضعیت‌ها", true)}
          
          <h3 style="margin-top: 25px; border-right: 4px solid #10b981; padding-right: 10px; color: #065f46;">۱. صورت‌وضعیت‌های قطعی (تایید نهایی شده)</h3>
          <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; text-align: center;">
            <thead>
              <tr style="background: #ecfdf5;">
                <th style="padding: 8px; border: 1px solid #ddd; width: 6%;">ردیف</th>
                <th style="padding: 8px; border: 1px solid #ddd; width: 12%;">شماره</th>
                <th style="padding: 8px; border: 1px solid #ddd; width: 12%;">تاریخ</th>
                <th style="padding: 8px; border: 1px solid #ddd;">شرح دوره کارکرد</th>
                <th style="padding: 8px; border: 1px solid #ddd; width: 20%;">مبلغ خالص دوره (ریال)</th>
                <th style="padding: 8px; border: 1px solid #ddd; width: 20%;">مبلغ با ضریب دوره (ریال)</th>
              </tr>
            </thead>
            <tbody>
              ${
                approvedStatements.length > 0
                  ? approvedStatements
                      .map(
                        (s, idx) => `
                <tr>
                  <td style="padding: 8px; border: 1px solid #ddd;">${(idx + 1).toLocaleString("fa-IR")}</td>
                  <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${s.number}</td>
                  <td style="padding: 8px; border: 1px solid #ddd;">${s.date || "---"}</td>
                  <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${s.description}</td>
                  <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${getPeriodTotals(s).periodRaw.toLocaleString("fa-IR")}</td>
                  <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; color: #0f172a;">${getPeriodTotals(s).periodCoeff.toLocaleString("fa-IR")}</td>
                </tr>
              `,
                      )
                      .join("")
                  : '<tr><td colspan="6" style="padding: 20px; color: #94a3b8;">موردی یافت نشد.</td></tr>'
              }
            </tbody>
            <tfoot>
              <tr style="background: #f0fdf4; font-weight: bold;">
                <td colspan="4" style="padding: 10px; border: 1px solid #ddd; text-align: left;">مجموع صورت‌وضعیت‌های قطعی:</td>
                <td style="padding: 10px; border: 1px solid #ddd; color: #047857;">${approvedRawTotal.toLocaleString("fa-IR")}</td>
                <td style="padding: 10px; border: 1px solid #ddd; color: #065f46;">${approvedTotal.toLocaleString("fa-IR")}</td>
              </tr>
            </tfoot>
          </table>

          <h3 style="margin-top: 35px; border-right: 4px solid #f59e0b; padding-right: 10px; color: #92400e;">۲. صورت‌وضعیت‌های در جریان (در دست بررسی و ابلاغ)</h3>
          <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; text-align: center;">
            <thead>
              <tr style="background: #fffbeb;">
                <th style="padding: 8px; border: 1px solid #ddd; width: 6%;">ردیف</th>
                <th style="padding: 8px; border: 1px solid #ddd; width: 12%;">شماره</th>
                <th style="padding: 8px; border: 1px solid #ddd;">شرح</th>
                <th style="padding: 8px; border: 1px solid #ddd; width: 20%;">مبلغ خالص دوره (ریال)</th>
                <th style="padding: 8px; border: 1px solid #ddd; width: 20%;">مبلغ با ضریب دوره (ریال)</th>
                <th style="padding: 8px; border: 1px solid #ddd; width: 15%;">وضعیت فعلی</th>
              </tr>
            </thead>
            <tbody>
              ${
                pendingStatements.length > 0
                  ? pendingStatements
                      .map(
                        (s, idx) => `
                <tr>
                  <td style="padding: 8px; border: 1px solid #ddd;">${(idx + 1).toLocaleString("fa-IR")}</td>
                  <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${s.number}</td>
                  <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${s.description}</td>
                  <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${getPeriodTotals(s).periodRaw.toLocaleString("fa-IR")}</td>
                  <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; color: #0f172a;">${getPeriodTotals(s).periodCoeff.toLocaleString("fa-IR")}</td>
                  <td style="padding: 8px; border: 1px solid #ddd; font-size: 10px;">${WorkflowService.getStatusLabel(s)}</td>
                </tr>
              `,
                      )
                      .join("")
                  : '<tr><td colspan="6" style="padding: 20px; color: #94a3b8;">موردی یافت نشد.</td></tr>'
              }
            </tbody>
            <tfoot>
              <tr style="background: #fffcf0; font-weight: bold;">
                <td colspan="3" style="padding: 10px; border: 1px solid #ddd; text-align: left;">مجموع صورت‌وضعیت‌های در جریان:</td>
                <td style="padding: 10px; border: 1px solid #ddd; color: #b45309;">${pendingRawTotal.toLocaleString("fa-IR")}</td>
                <td style="padding: 10px; border: 1px solid #ddd; color: #92400e;">${pendingTotal.toLocaleString("fa-IR")}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>

          <div style="margin-top: 40px; padding: 25px; background: #1e3a8a; color: white; border-radius: 16px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <div style="text-align: center;">
              <div style="font-size: 14px; font-weight: bold; margin-bottom: 5px; color: #bfdbfe;">مجموع کل کارکرد خالص (بدون ضریب):</div>
              <div style="font-size: 22px; font-weight: 900;">${(approvedRawTotal + pendingRawTotal).toLocaleString("fa-IR")} <span style="font-size: 12px; font-weight: normal;">ریال</span></div>
            </div>
            <div style="text-align: center; border-right: 1px solid rgba(255,255,255,0.2);">
              <div style="font-size: 14px; font-weight: bold; margin-bottom: 5px; color: #bfdbfe;">مجموع کل کارکرد با ضریب:</div>
              <div style="font-size: 22px; font-weight: 900;">${(approvedTotal + pendingTotal).toLocaleString("fa-IR")} <span style="font-size: 12px; font-weight: normal;">ریال</span></div>
            </div>
          </div>
        `;
      }
    } else if (type === "adjustment") {
      const projAdjustments = adjustments.filter(
        (a) => a.projectId === selectedProjectId,
      );
      const projStatements = statements.filter(
        (s) => s.projectId === selectedProjectId,
      );

      // Calculation helpers for adjustment report
      const getChapterAmountsLocal = (statementId: string) => {
        let allStmts = [...statements];
        try {
          const cbsRaw = localStorage.getItem('hamyar_cbs_statements');
          if (cbsRaw) {
            const cbsList = JSON.parse(cbsRaw);
            if (Array.isArray(cbsList)) {
              cbsList.forEach((cs: any) => {
                if (!allStmts.some(s => s.id === cs.id)) allStmts.push(cs);
              });
            }
          }
        } catch (e) {}

        const stmt = allStmts.find((s) => s.id === statementId);
        if (!stmt) return new Map<string, number>();

        const chapterMap = new Map<string, number>();

        if (stmt.selectedMinuteIds && stmt.selectedMinuteIds.length > 0) {
          const currentNum = parsePersianInt(stmt.number);
          const projWbsStmts = allStmts.filter(s => 
            s.projectId === stmt.projectId && s.selectedMinuteIds && s.selectedMinuteIds.length > 0
          );

          const currentMinuteIds = new Set<string>();
          const prevMinuteIds = new Set<string>();

          projWbsStmts.forEach(s => {
            const num = parsePersianInt(s.number);
            if (num <= currentNum) {
              s.selectedMinuteIds?.forEach((id: string) => currentMinuteIds.add(id));
            }
            if (num < currentNum) {
              s.selectedMinuteIds?.forEach((id: string) => prevMinuteIds.add(id));
            }
          });

          if (currentMinuteIds.size === 0) {
            stmt.selectedMinuteIds.forEach((id: string) => currentMinuteIds.add(id));
          }

          const currentChapterMap = new Map<string, number>();
          currentMinuteIds.forEach((minId: string) => {
            const associatedMetres = metres.filter((m) => m.minuteId === minId);
            associatedMetres.forEach((m) => {
              const chapter = m.itemCode ? m.itemCode.substring(0, 2) : '01';
              const price = getRowEffectivePrice(m);
              const multipliers = getMultipliers(
                m.itemCode,
                m.itemType || "NORMAL",
                m.independentCoefficient || 1,
              );
              const amount = m.partialTotal * price * multipliers.total;
              currentChapterMap.set(chapter, (currentChapterMap.get(chapter) || 0) + amount);
            });
          });

          const prevChapterMap = new Map<string, number>();
          prevMinuteIds.forEach((minId: string) => {
            const associatedMetres = metres.filter((m) => m.minuteId === minId);
            associatedMetres.forEach((m) => {
              const chapter = m.itemCode ? m.itemCode.substring(0, 2) : '01';
              const price = getRowEffectivePrice(m);
              const multipliers = getMultipliers(
                m.itemCode,
                m.itemType || "NORMAL",
                m.independentCoefficient || 1,
              );
              const amount = m.partialTotal * price * multipliers.total;
              prevChapterMap.set(chapter, (prevChapterMap.get(chapter) || 0) + amount);
            });
          });

          const chapterMap = new Map<string, number>();
          currentChapterMap.forEach((currAmount, chapter) => {
            const prevAmount = prevChapterMap.get(chapter) || 0;
            const netPeriodAmount = Math.max(0, currAmount - prevAmount);
            chapterMap.set(chapter, netPeriodAmount);
          });

          return chapterMap;
        }

        if (stmt.values && Array.isArray(stmt.values)) {
          let projNodes: any[] = [];
          try {
            const rawNodes = localStorage.getItem('hamyar_cbs_nodes');
            if (rawNodes) {
              projNodes = JSON.parse(rawNodes).filter((n: any) => n.projectId === selectedProjectId);
            }
          } catch (e) {}

          const nodeMap = new Map<string, any>();
          projNodes.forEach(n => nodeMap.set(n.id, n));

          stmt.values.forEach((v: any) => {
            const node = nodeMap.get(v.cbsId);
            if (!node) return;
            let rootCode = node.code ? String(node.code).split('.')[0].trim() : '01';
            if (rootCode.length === 1 && !isNaN(Number(rootCode))) rootCode = '0' + rootCode;

            const currProgress = Number(v.currentProgressPercent) || 0;
            const prevProgress = Number(v.previousProgressPercent) || 0;
            const periodProgressPercent = Math.max(0, currProgress - prevProgress);

            let nodeBudget = Number(node.budget) || 0;
            if (nodeBudget === 0 && node.quantity && node.unitPrice) nodeBudget = node.quantity * node.unitPrice;

            let periodAmount = 0;
            if (periodProgressPercent > 0 && nodeBudget > 0) {
              periodAmount = (periodProgressPercent / 100) * nodeBudget;
            } else if (v.currentQuantity && v.currentQuantity > 0 && node.unitPrice) {
              periodAmount = v.currentQuantity * node.unitPrice;
            } else if (currProgress > 0 && nodeBudget > 0 && prevProgress === 0) {
              periodAmount = (currProgress / 100) * nodeBudget;
            }

            if (periodAmount > 0) {
              chapterMap.set(rootCode, (chapterMap.get(rootCode) || 0) + periodAmount);
              let nodeCode = node.code ? String(node.code).trim() : rootCode;
              if (nodeCode.length === 1 && !isNaN(Number(nodeCode))) nodeCode = '0' + nodeCode;
              if (nodeCode && nodeCode !== rootCode) {
                chapterMap.set(nodeCode, (chapterMap.get(nodeCode) || 0) + periodAmount);
              }
            }
          });

          if (chapterMap.size === 0 && projNodes.length > 0) {
            projNodes.forEach(n => {
              let code = n.code ? String(n.code).trim() : '01';
              if (code.length === 1 && !isNaN(Number(code))) code = '0' + code;
              let b = Number(n.budget) || (n.quantity && n.unitPrice ? n.quantity * n.unitPrice : 100000000);
              chapterMap.set(code, b);
            });
          }

          return chapterMap;
        }

        return chapterMap;
      };

      const calculateChapterAdjustmentValueLocal = (
        amount: number,
        baseIdx: number,
        perfIdx: number,
        ratio: number,
        coeff: number,
      ) => {
        if (!baseIdx || baseIdx === 0) return 0;
        return amount * (perfIdx / baseIdx - 1) * ratio * coeff;
      };

      const getRootEffectiveAmountLocal = (rootCode: string, stmtId: string, selectedCodes?: string[]) => {
        const chapterMap = getChapterAmountsLocal(stmtId);
        let normalizedRoot = rootCode.trim();
        if (normalizedRoot.length === 1 && !isNaN(Number(normalizedRoot))) {
          normalizedRoot = '0' + normalizedRoot;
        }

        if (!selectedCodes || selectedCodes.length === 0) {
          return chapterMap.get(normalizedRoot) || chapterMap.get(rootCode) || 0;
        }

        let projNodes: any[] = [];
        try {
          const rawNodes = localStorage.getItem('hamyar_cbs_nodes');
          if (rawNodes) {
            projNodes = JSON.parse(rawNodes).filter((n: any) => n.projectId === selectedProjectId);
          }
        } catch (e) {}

        const childNodes = projNodes.filter(n => {
          const code = n.code ? String(n.code).trim() : '';
          return code === normalizedRoot || code.startsWith(normalizedRoot + '.') || code.startsWith(rootCode + '.');
        });

        const selectedSubCodes = selectedCodes.filter(c => {
          const trimmed = c.trim();
          return trimmed === normalizedRoot || trimmed.startsWith(normalizedRoot + '.') || trimmed.startsWith(rootCode + '.');
        });

        if (selectedSubCodes.length === 0) {
          return chapterMap.get(normalizedRoot) || chapterMap.get(rootCode) || 0;
        }

        const isExactRootExplicitlySelected = selectedSubCodes.includes(normalizedRoot) || selectedSubCodes.includes(rootCode);
        const subOnlyCodes = selectedSubCodes.filter(c => c !== normalizedRoot && c !== rootCode);

        if (isExactRootExplicitlySelected && subOnlyCodes.length === 0) {
          return chapterMap.get(normalizedRoot) || chapterMap.get(rootCode) || 0;
        }

        let sum = 0;
        selectedSubCodes.forEach(code => {
          let norm = code.trim();
          if (norm.length === 1 && !isNaN(Number(norm))) norm = '0' + norm;
          sum += chapterMap.get(norm) || chapterMap.get(code) || 0;
        });

        return sum > 0 ? sum : (chapterMap.get(normalizedRoot) || chapterMap.get(rootCode) || 0);
      };

      const calculateRecordTotalLocal = (record: any) => {
        if (!record.statementId) return 0;
        const coeff = record.coefficient || 0.95;
        let total = 0;

        const totalDays = record.totalDays || 1;
        const selectedCodes = record.selectedRootCodes;
        record.periods?.forEach((period: any) => {
          const ratio = period.days / totalDays;
          period.indices.forEach((idx: any) => {
            const amount = getRootEffectiveAmountLocal(idx.chapterCode, record.statementId, selectedCodes);
            total += calculateChapterAdjustmentValueLocal(
              amount,
              idx.baseIndex,
              idx.performanceIndex,
              ratio,
              coeff,
            );
          });
        });
        return Math.round(total);
      };

      const ReportSignaturesLocal = "";

      if (data) {
        title = `گزارش محاسبات تعدیل آحاد بها شماره ${data.number}`;
        let printStmts = [...statements];
        try {
          const cbsRaw = localStorage.getItem('hamyar_cbs_statements');
          if (cbsRaw) {
            const cbsList = JSON.parse(cbsRaw);
            if (Array.isArray(cbsList)) {
              cbsList.forEach((cs: any) => {
                if (!printStmts.some(s => s.id === cs.id)) printStmts.push(cs);
              });
            }
          }
        } catch (e) {}
        const stmt = printStmts.find((s) => s.id === data.statementId);
        const chapterMap = getChapterAmountsLocal(data.statementId);
        
        let uniqueChapters: string[] = [];
        if (data.periods && data.periods.length > 0) {
          const pCodes: string[] = data.periods.flatMap((p: any) => p.indices.map((i: any) => String(i.chapterCode)));
          uniqueChapters = Array.from(new Set(pCodes)).sort();
        } else if (data.selectedRootCodes && Array.isArray(data.selectedRootCodes) && data.selectedRootCodes.length > 0) {
          uniqueChapters = data.selectedRootCodes;
        } else {
          uniqueChapters = Array.from(chapterMap.keys()).sort();
        }

        contentHtml = `
          ${renderProjectHeader("گزارش محاسبات تعدیل آحاد بها")}
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 11px; margin-bottom: 20px; border: 1px solid #ddd; padding: 10px; border-radius: 8px; direction: rtl; background: #fff;">
            <div><strong>مرجع:</strong> صورت‌وضعیت شماره ${stmt?.number || "---"} کارکرد ${stmt?.startDate || "---"} الی ${stmt?.endDate || "---"}</div>
            <div style="text-align: left;"><strong>تاریخ تنظیم تعدیل:</strong> ${data.date}</div>
            <div><strong>مدت کارکرد:</strong> ${data.totalDays} روز</div>
            <div style="text-align: left;"><strong>ضریب تعدیل:</strong> ${data.coefficient}</div>
          </div>

          <table style="width: 100%; border-collapse: collapse; font-size: 11px; text-align: center; direction: rtl;">
            <thead>
              <tr style="background: #f1f5f9;">
                <th style="padding: 6px; border: 1px solid #ddd; width: 6%;">ردیف</th>
                <th style="padding: 6px; border: 1px solid #ddd; width: 10%;">فصل / ریشه</th>
                <th style="padding: 6px; border: 1px solid #ddd; text-align: right;">شرح دوره و شاخص</th>
                <th style="padding: 6px; border: 1px solid #ddd; width: 18%;">مبلغ کارکرد تجمیعی (ریال)</th>
                <th style="padding: 6px; border: 1px solid #ddd; width: 8%;">نسبت</th>
                <th style="padding: 6px; border: 1px solid #ddd; width: 10%;">شاخص مبنا</th>
                <th style="padding: 6px; border: 1px solid #ddd; width: 10%;">شاخص دوره</th>
                <th style="padding: 6px; border: 1px solid #ddd; width: 20%;">مبلغ تعدیل (ریال)</th>
              </tr>
            </thead>
            <tbody>
              ${(() => {
                let globalIdx = 1;
                return uniqueChapters
                  .flatMap((code: string) => {
                    return data.periods.map((period: any, pI: number) => {
                      const amount = getRootEffectiveAmountLocal(code, data.statementId, data.selectedRootCodes);
                      const idxData = period.indices.find(
                        (i: any) => i.chapterCode === code,
                      ) || { baseIndex: 1, performanceIndex: 1 };
                      const ratio =
                        data.totalDays > 0 ? period.days / data.totalDays : 0;
                      const val = calculateChapterAdjustmentValueLocal(
                        amount,
                        idxData.baseIndex,
                        idxData.performanceIndex,
                        ratio,
                        data.coefficient,
                      );

                      return `
                      <tr>
                        <td style="padding: 6px; border: 1px solid #ddd;">${(globalIdx++).toLocaleString("fa-IR")}</td>
                        <td style="padding: 6px; border: 1px solid #ddd; font-weight: bold; color: #475569;">${code}</td>
                        <td style="padding: 6px; border: 1px solid #ddd; text-align: right;">${period.title}</td>
                        <td style="padding: 6px; border: 1px solid #ddd;">${Math.round(amount).toLocaleString("fa-IR")}</td>
                        <td style="padding: 6px; border: 1px solid #ddd;">${ratio.toLocaleString("fa-IR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</td>
                        <td style="padding: 6px; border: 1px solid #ddd;">${idxData.baseIndex.toLocaleString("fa-IR")}</td>
                        <td style="padding: 6px; border: 1px solid #ddd;">${idxData.performanceIndex.toLocaleString("fa-IR")}</td>
                        <td style="padding: 6px; border: 1px solid #ddd; font-weight: bold; text-align: left; background: #f0fdf4; color: ${val < 0 ? "#b91c1c" : "#059669"};">
                          ${val < 0 ? "-" : ""}${Math.abs(Math.round(val)).toLocaleString("fa-IR")}
                        </td>
                      </tr>
                    `;
                    });
                  })
                  .join("");
              })()}
            </tbody>
            <tfoot>
              <tr style="background: #f8fafc; font-weight: bold;">
                <td colspan="7" style="padding: 10px; border: 1px solid #ddd; text-align: right; font-size: 12px; color: #1e40af;">خالص مبلغ تعدیل دوره کارکرد:</td>
                <td style="padding: 10px; border: 1px solid #ddd; text-align: left; font-size: 12px; font-weight: black; color: #1e40af; background: #eff6ff;">
                  ${calculateRecordTotalLocal(data).toLocaleString("fa-IR")} ریال
                </td>
              </tr>
            </tfoot>
          </table>
          ${ReportSignaturesLocal}
        `;
      } else {
        const approvedAdjustments = projAdjustments.filter(
          (a) => a.isFinalFrozen,
        );
        const pendingAdjustments = projAdjustments.filter(
          (a) =>
            !a.isFinalFrozen &&
            WorkflowService.getStatus(a) !== WorkflowStatus.DRAFT &&
            WorkflowService.getStatus(a) !== WorkflowStatus.REJECTED,
        );

        const approvedTotal = approvedAdjustments.reduce(
          (sum, a) => sum + calculateRecordTotalLocal(a),
          0,
        );
        const pendingTotal = pendingAdjustments.reduce(
          (sum, a) => sum + calculateRecordTotalLocal(a),
          0,
        );

        title = `گزارش تجمعی محاسبات تعدیل پروژه ${projectTitle}`;

        contentHtml = `
          ${renderProjectHeader("گزارش توضیحی و تجمعی محاسبات تعدیل پروژه")}
          
          <h3 style="margin-top: 25px; border-right: 4px solid #10b981; padding-right: 10px; color: #065f46; font-size: 13px;">۱. محاسبات تعدیل قطعی (تایید نهایی شده)</h3>
          <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; text-align: center; direction: rtl;">
            <thead>
              <tr style="background: #ecfdf5;">
                <th style="padding: 8px; border: 1px solid #ddd; width: 6%;">ردیف</th>
                <th style="padding: 8px; border: 1px solid #ddd; width: 15%;">شماره گزارش</th>
                <th style="padding: 8px; border: 1px solid #ddd; width: 18%;">تاریخ گزارش</th>
                <th style="padding: 8px; border: 1px solid #ddd; text-align: right; padding-right: 15px;">بابت محاسبات صورت‌وضعیت</th>
                <th style="padding: 8px; border: 1px solid #ddd; width: 25%;">مبلغ تعدیل (ریال)</th>
              </tr>
            </thead>
            <tbody>
              ${
                approvedAdjustments.length > 0
                  ? approvedAdjustments
                      .map((a, idx) => {
                        const sourceStmt = statements.find(
                          (s) => s.id === a.statementId,
                        );
                        const amt = calculateRecordTotalLocal(a);
                        return `
                  <tr>
                    <td style="padding: 8px; border: 1px solid #ddd;">${(idx + 1).toLocaleString("fa-IR")}</td>
                    <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${a.number}</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${a.date}</td>
                    <td style="padding: 8px; border: 1px solid #ddd; text-align: right; padding-right: 15px;">صورت‌وضعیت شماره ${sourceStmt ? sourceStmt.number : "---"}</td>
                    <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; text-align: left; font-family: monospace; background: #f0fdf4; color: #059669;">
                      ${amt.toLocaleString("fa-IR")}
                    </td>
                  </tr>
                `;
                      })
                      .join("")
                  : '<tr><td colspan="5" style="padding: 20px; color: #94a3b8;">هیچ محاسبات تعدیل قطعی یافت نشد.</td></tr>'
              }
            </tbody>
            <tfoot>
              <tr style="background: #f0fdf4; font-weight: bold;">
                <td colspan="4" style="padding: 10px; border: 1px solid #ddd; text-align: right; font-size: 12px; color: #065f46;">مجموع تعدیل‌های قطعی:</td>
                <td style="padding: 10px; border: 1px solid #ddd; text-align: left; font-size: 12px; background: #e6fbf1; color: #065f46;">
                  ${approvedTotal.toLocaleString("fa-IR")} ریال
                </td>
              </tr>
            </tfoot>
          </table>

          <h3 style="margin-top: 35px; border-right: 4px solid #f59e0b; padding-right: 10px; color: #92400e; font-size: 13px;">۲. محاسبات تعدیل در جریان (در دست بررسی)</h3>
          <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; text-align: center; direction: rtl;">
            <thead>
              <tr style="background: #fffbeb;">
                <th style="padding: 8px; border: 1px solid #ddd; width: 6%;">ردیف</th>
                <th style="padding: 8px; border: 1px solid #ddd; width: 15%;">شماره گزارش</th>
                <th style="padding: 8px; border: 1px solid #ddd; width: 18%;">تاریخ گزارش</th>
                <th style="padding: 8px; border: 1px solid #ddd; text-align: right; padding-right: 15px;">بابت محاسبات صورت‌وضعیت</th>
                <th style="padding: 8px; border: 1px solid #ddd; width: 22%;">مبلغ تعدیل (ریال)</th>
                <th style="padding: 8px; border: 1px solid #ddd; width: 18%;">وضعیت فعلی</th>
              </tr>
            </thead>
            <tbody>
              ${
                pendingAdjustments.length > 0
                  ? pendingAdjustments
                      .map((a, idx) => {
                        const sourceStmt = statements.find(
                          (s) => s.id === a.statementId,
                        );
                        const amt = calculateRecordTotalLocal(a);
                        return `
                  <tr>
                    <td style="padding: 8px; border: 1px solid #ddd;">${(idx + 1).toLocaleString("fa-IR")}</td>
                    <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${a.number}</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${a.date}</td>
                    <td style="padding: 8px; border: 1px solid #ddd; text-align: right; padding-right: 15px;">صورت‌وضعیت شماره ${sourceStmt ? sourceStmt.number : "---"}</td>
                    <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; text-align: left; font-family: monospace; background: #fffcf0;">
                      ${amt.toLocaleString("fa-IR")}
                    </td>
                    <td style="padding: 8px; border: 1px solid #ddd; font-size: 10px;">${WorkflowService.getStatusLabel(a)}</td>
                  </tr>
                `;
                      })
                      .join("")
                  : '<tr><td colspan="6" style="padding: 20px; color: #94a3b8;">هیچ محاسبات تعدیل در جریانی یافت نشد.</td></tr>'
              }
            </tbody>
            <tfoot>
              <tr style="background: #fffcf0; font-weight: bold;">
                <td colspan="4" style="padding: 10px; border: 1px solid #ddd; text-align: right; font-size: 12px; color: #92400e;">مجموع تعدیل‌های در جریان:</td>
                <td colspan="2" style="padding: 10px; border: 1px solid #ddd; text-align: left; font-size: 12px; background: #fffbf0; color: #92400e;">
                  ${pendingTotal.toLocaleString("fa-IR")} ریال
                </td>
              </tr>
            </tfoot>
          </table>

          <div style="margin-top: 40px; padding: 25px; background: #1e3a8a; color: white; border-radius: 16px; display: flex; justify-content: space-between; align-items: center; direction: rtl;">
            <div style="font-size: 14px; font-weight: bold;">مجموع کل تعدیل‌های تجمعی پروژه (قطعی + در جریان):</div>
            <div style="font-size: 24px; font-weight: 900;">${(approvedTotal + pendingTotal).toLocaleString("fa-IR")} <span style="font-size: 12px; font-weight: normal;">ریال</span></div>
          </div>

          ${ReportSignaturesLocal}
        `;
      }
    } else if (type === "minutes") {
      if (data) {
        const { withCoeff, items: linkedItems } = getMinuteTotals(data.id);
        const isCbs = currentProject?.contractType === "CBS";
        title = isCbs 
          ? `صورت‌جلسه ساختار شکست (CBS) شماره ${data.number} - ${data.description}`
          : `صورت‌جلسه شماره ${data.number} - ${data.description}`;

        const groupedItems: { [plId: string]: typeof linkedItems } = {};
        linkedItems.forEach((m) => {
          const plId = m.priceListId || 'default';
          if (!groupedItems[plId]) {
            groupedItems[plId] = [];
          }
          groupedItems[plId].push(m);
        });

        const plKeys = Object.keys(groupedItems);

        const tablesHtml = plKeys.map((plKey) => {
          const groupItems = groupedItems[plKey];
          const groupTotal = groupItems.reduce((sum, m) => {
            const mUP = getRowEffectivePrice(m);
            const mMult = isCbs ? 1 : getMultipliers(
              m.itemCode,
              m.itemType,
              m.independentCoefficient,
            ).total;
            return sum + m.partialTotal * mUP * mMult;
          }, 0);

          return `
            <div style="margin-top: 25px; border: 1px solid #ccc; border-radius: 8px; overflow: hidden; background: #fff;">
              <div style="background: #f1f5f9; padding: 10px; font-weight: bold; font-size: 11px; border-bottom: 1px solid #ccc; display: flex; justify-content: space-between;">
                <span>📋 ${isCbs ? "ریزمتره ساختار شکست (CBS)" : "ریزمتره فهرست بها"}: ${getPlTitle(plKey)}</span>
                <span>تعداد ردیف‌ها: ${groupItems.length.toLocaleString("fa-IR")}</span>
              </div>
              <table style="width: 100%; border-collapse: collapse; font-size: 10px; text-align: center; margin: 0;">
                <thead>
                  <tr style="background: #f8fafc;">
                    <th style="padding: 5px; border: 1px solid #ddd;">ردیف</th>
                    <th style="padding: 5px; border: 1px solid #ddd;">${isCbs ? "کد ساختار شکست (CBS)" : "کد آیتم"}</th>
                    <th style="padding: 5px; border: 1px solid #ddd;">${isCbs ? "شرح فعالیت ساختار شکست" : "شرح عملیات"}</th>
                    <th style="padding: 5px; border: 1px solid #ddd;">واحد</th>
                    <th style="padding: 5px; border: 1px solid #ddd;">تعداد</th>
                    <th style="padding: 5px; border: 1px solid #ddd;">طول</th>
                    <th style="padding: 5px; border: 1px solid #ddd;">عرض</th>
                    <th style="padding: 5px; border: 1px solid #ddd;">ارتفاع</th>
                    <th style="padding: 5px; border: 1px solid #ddd;">ضریب</th>
                    <th style="padding: 5px; border: 1px solid #ddd;">مقدار کل</th>
                    <th style="padding: 5px; border: 1px solid #ddd;">بهای واحد (ریال)</th>
                    <th style="padding: 5px; border: 1px solid #ddd;">${isCbs ? "مبلغ ردیف (ریال)" : "مبلغ کل (ریال)"}</th>
                    ${isCbs ? `<th style="padding: 5px; border: 1px solid #ddd;">سهم وزنی از پروژه (٪)</th>` : ""}
                  </tr>
                </thead>
                <tbody>
                  ${groupItems
                    .map((m, idx) => {
                      const mUP = getRowEffectivePrice(m);
                      const mMult = isCbs ? 1 : getMultipliers(
                        m.itemCode,
                        m.itemType,
                        m.independentCoefficient,
                      ).total;
                      const mRaw = m.partialTotal * mUP;
                      const mCoeff = mRaw * mMult;
                      const weightPercent = isCbs 
                        ? (((m.partialTotal * mUP) / (currentProject?.initialBudget || 1)) * 100).toFixed(4)
                        : "0";
                      return `
                      <tr>
                        <td style="padding: 5px; border: 1px solid #ddd;">${(idx + 1).toLocaleString("fa-IR")}</td>
                        <td style="padding: 5px; border: 1px solid #ddd; font-weight: bold; font-family: monospace; color: #2563eb;">${m.itemCode}</td>
                        <td style="padding: 5px; border: 1px solid #ddd; text-align: right;">${m.description}</td>
                        <td style="padding: 5px; border: 1px solid #ddd;">${m.unit || "---"}</td>
                        <td style="padding: 5px; border: 1px solid #ddd;">${m.count.toLocaleString("fa-IR")}</td>
                        <td style="padding: 5px; border: 1px solid #ddd;">${m.length.toLocaleString("fa-IR")}</td>
                        <td style="padding: 5px; border: 1px solid #ddd;">${m.width.toLocaleString("fa-IR")}</td>
                        <td style="padding: 5px; border: 1px solid #ddd;">${m.height.toLocaleString("fa-IR")}</td>
                        <td style="padding: 5px; border: 1px solid #ddd;">${m.multiplier.toLocaleString("fa-IR")}</td>
                        <td style="padding: 5px; border: 1px solid #ddd; font-weight: bold;">${m.partialTotal.toLocaleString("fa-IR")}</td>
                        <td style="padding: 5px; border: 1px solid #ddd;">${mUP.toLocaleString("fa-IR")}</td>
                        <td style="padding: 5px; border: 1px solid #ddd; font-weight: bold;">${mCoeff.toLocaleString("fa-IR")}</td>
                        ${isCbs ? `<td style="padding: 5px; border: 1px solid #ddd; font-weight: bold; color: #059669;">${Number(weightPercent).toLocaleString("fa-IR")}%</td>` : ""}
                      </tr>
                    `;
                    })
                    .join("")}
                </tbody>
                <tfoot>
                  <tr style="background: #fafafc; font-weight: bold;">
                    <td colspan="${isCbs ? 12 : 11}" style="padding: 8px; border: 1px solid #ddd; text-align: left;">${isCbs ? "جمع این بخش ساختار شکست (CBS):" : "جمع این بخش فهرست بها (با احتساب کلیه ضرایب):"}</td>
                    <td style="padding: 8px; border: 1px solid #ddd; color: #1e40af;">${groupTotal.toLocaleString("fa-IR")} ریال</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          `;
        }).join("");

        contentHtml = `
          ${renderProjectHeader(isCbs ? "صورت‌جلسه کارگاهی ساختار شکست (CBS)" : "صورت‌جلسه کارگاهی (احجام عملیات)")}
          <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px;">
            <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; width: 30%;">شماره صورت‌جلسه:</td><td style="padding: 8px; border: 1px solid #ddd;">${data.number}</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">تاریخ:</td><td style="padding: 8px; border: 1px solid #ddd;">${data.date}</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">محل اجرا:</td><td style="padding: 8px; border: 1px solid #ddd;">${data.location}</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">وضعیت:</td><td style="padding: 8px; border: 1px solid #ddd;">${WorkflowService.getStatusLabel(data)}</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${isCbs ? "مبلغ کل ردیف‌ها:" : "مبلغ کل با ضرایب:"}</td><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; color: #1e40af;">${withCoeff.toLocaleString("fa-IR")} ریال</td></tr>
            ${isCbs ? `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">سهم وزنی کل صورت‌جلسه از پروژه:</td><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; color: #059669;">${((withCoeff / (currentProject?.initialBudget || 1)) * 100).toFixed(4)}٪</td></tr>` : ""}
          </table>
          <div style="margin-top: 20px;">
            <h3 style="border-bottom: 1px solid #eee; padding-bottom: 5px;">شرح و جزئیات مصوبه</h3>
            <div style="padding: 15px; background: #fff; border: 1px solid #eee; border-radius: 8px; min-height: 50px;">
              ${data.description}
            </div>
          </div>
          
          <div style="margin-top: 25px;">
            <h3 style="border-bottom: 2px solid #1e40af; padding-bottom: 5px; color: #1e40af;">${isCbs ? "ریز متره و محاسبات ساختار شکست هزینه (CBS)" : "ریز متره و محاسبات احجام به تفکیک فهارس بها"}</h3>
            ${
              linkedItems.length > 0
                ? tablesHtml
                : '<div style="padding: 20px; text-align: center; border: 1px solid #ddd; border-radius: 8px; color: #94a3b8; background: #fafafa;">هیچ قلم ریزمتره‌ای برای این صورت‌جلسه ثبت نشده است.</div>'
            }
          </div>
        `;
      } else {
        const projMinutes = minutes.filter(
          (m) => m.projectId === selectedProjectId,
        );
        const finalizedMinutes = projMinutes.filter((m) => m.isFinalFrozen);
        const pendingMinutes = projMinutes.filter(
          (m) =>
            !m.isFinalFrozen &&
            WorkflowService.getStatus(m) !== WorkflowStatus.DRAFT &&
            WorkflowService.getStatus(m) !== WorkflowStatus.REJECTED,
        );

        const finalizedTotal = finalizedMinutes.reduce(
          (sum, m) => sum + getMinuteTotals(m.id).withCoeff,
          0,
        );
        const pendingTotal = pendingMinutes.reduce(
          (sum, m) => sum + getMinuteTotals(m.id).withCoeff,
          0,
        );

        title = `گزارش جامع صورت‌جلسات پروژه ${projectTitle}`;
        contentHtml = `
          ${renderProjectHeader("گزارش وضعیت تجمعی صورت‌جلسات کارگاهی", true)}
          
          <h3 style="margin-top: 25px; border-right: 4px solid #10b981; padding-right: 10px; color: #065f46;">۱. صورت‌جلسات قطعی (ابلاغ شده)</h3>
          <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; text-align: center;">
            <thead>
              <tr style="background: #ecfdf5;">
                <th style="padding: 8px; border: 1px solid #ddd;">ردیف</th>
                <th style="padding: 8px; border: 1px solid #ddd;">شماره</th>
                <th style="padding: 8px; border: 1px solid #ddd;">تاریخ ابلاغ</th>
                <th style="padding: 8px; border: 1px solid #ddd;">شرح و محل اجرا</th>
                <th style="padding: 8px; border: 1px solid #ddd;">مبلغ با ضرایب (ریال)</th>
              </tr>
            </thead>
            <tbody>
              ${
                finalizedMinutes.length > 0
                  ? finalizedMinutes
                      .map(
                        (m, idx) => `
                <tr>
                  <td style="padding: 8px; border: 1px solid #ddd;">${(idx + 1).toLocaleString("fa-IR")}</td>
                  <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${m.number}</td>
                  <td style="padding: 8px; border: 1px solid #ddd;">${m.date}</td>
                  <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${m.description} - ${m.location}</td>
                  <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${getMinuteTotals(m.id).withCoeff.toLocaleString("fa-IR")}</td>
                </tr>
              `,
                      )
                      .join("")
                  : '<tr><td colspan="5" style="padding: 20px; color: #94a3b8;">موردی یافت نشد.</td></tr>'
              }
            </tbody>
            <tfoot>
              <tr style="background: #f0fdf4; font-weight: bold;">
                <td colspan="4" style="padding: 10px; border: 1px solid #ddd; text-align: left;">مجموع صورت‌جلسات قطعی:</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${finalizedTotal.toLocaleString("fa-IR")}</td>
              </tr>
            </tfoot>
          </table>

          <h3 style="margin-top: 35px; border-right: 4px solid #f59e0b; padding-right: 10px; color: #92400e;">۲. صورت‌جلسات در جریان (در دست بررسی و تایید)</h3>
          <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; text-align: center;">
            <thead>
              <tr style="background: #fffbeb;">
                <th style="padding: 8px; border: 1px solid #ddd;">ردیف</th>
                <th style="padding: 8px; border: 1px solid #ddd;">شماره</th>
                <th style="padding: 8px; border: 1px solid #ddd;">شرح</th>
                <th style="padding: 8px; border: 1px solid #ddd;">مبلغ با ضرایب (ریال)</th>
                <th style="padding: 8px; border: 1px solid #ddd;">وضعیت فعلی</th>
              </tr>
            </thead>
            <tbody>
              ${
                pendingMinutes.length > 0
                  ? pendingMinutes
                      .map(
                        (m, idx) => `
                <tr>
                  <td style="padding: 8px; border: 1px solid #ddd;">${(idx + 1).toLocaleString("fa-IR")}</td>
                  <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${m.number}</td>
                  <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${m.description}</td>
                  <td style="padding: 8px; border: 1px solid #ddd;">${getMinuteTotals(m.id).withCoeff.toLocaleString("fa-IR")}</td>
                  <td style="padding: 8px; border: 1px solid #ddd; font-size: 10px;">${WorkflowService.getStatusLabel(m)}</td>
                </tr>
              `,
                      )
                      .join("")
                  : '<tr><td colspan="5" style="padding: 20px; color: #94a3b8;">موردی یافت نشد.</td></tr>'
              }
            </tbody>
            <tfoot>
              <tr style="background: #fffcf0; font-weight: bold;">
                <td colspan="3" style="padding: 10px; border: 1px solid #ddd; text-align: left;">مجموع صورت‌جلسات در جریان:</td>
                <td colspan="2" style="padding: 10px; border: 1px solid #ddd;">${pendingTotal.toLocaleString("fa-IR")}</td>
              </tr>
            </tfoot>
          </table>

          <div style="margin-top: 40px; padding: 25px; background: #1e3a8a; color: white; border-radius: 16px; display: flex; justify-content: space-between; align-items: center;">
            <div style="font-size: 14px; font-weight: bold;">مجموع کل احجام صورت‌جلسه شده (قطعی + در جریان):</div>
            <div style="font-size: 24px; font-weight: 900;">${(finalizedTotal + pendingTotal).toLocaleString("fa-IR")} <span style="font-size: 12px; font-weight: normal;">ریال</span></div>
          </div>
        `;
      }
    } else if (type === "estimate") {
      const projEstimates = estimates.filter(
        (e) => e.projectId === selectedProjectId,
      );

      const resolveEstimateType = (
        code: string,
        explicitType?: string,
        desc?: string,
        coef?: number,
        plId?: string,
      ): "NORMAL" | "STARRED" | "INVOICE" => {
        const expUpper = (explicitType || "").toUpperCase();
        if (expUpper === "STARRED") return "STARRED";
        if (expUpper === "INVOICE" || expUpper === "NEW") return "INVOICE";

        if (code && (code.includes("*") || code.startsWith("*") || code.endsWith("*"))) {
          return "STARRED";
        }

        const d = (desc || "").toLowerCase();
        if (
          d.includes("ستاره") ||
          d.includes("starred") ||
          d.includes("ستاره‌دار") ||
          d.includes("ستاره دار") ||
          d.includes("قیمت توافقی")
        ) {
          return "STARRED";
        }
        if (
          d.includes("فاکتور") ||
          d.includes("invoice") ||
          d.includes("فاکتوری") ||
          d.includes("قیمت جدید") ||
          d.includes("خرید مستقیم")
        ) {
          return "INVOICE";
        }

        if (coef && coef !== 1 && coef > 0) {
          return "STARRED";
        }

        // Check in project price lists
        const plItem = findPriceListItem(code, plId);
        if (plItem) {
          if ((plItem as any).isStarred || (plItem as any).type === "STARRED" || (plItem as any).itemType === "STARRED") return "STARRED";
          if ((plItem as any).isInvoice || (plItem as any).type === "INVOICE" || (plItem as any).itemType === "INVOICE") return "INVOICE";
        }

        return "NORMAL";
      };

      let estNormalCount = 0;
      let estStarredCount = 0;
      let estInvoiceCount = 0;
      let estNormalTotal = 0;
      let estStarredTotal = 0;
      let estInvoiceTotal = 0;

      projEstimates.forEach((item) => {
        const itemType = resolveEstimateType(
          item.code,
          item.itemType,
          item.description,
          item.independentCoefficient,
          item.priceListId,
        );
        const mult = getMultipliers(
          item.code,
          itemType,
          item.independentCoefficient,
        ).total;
        const rowTotal = item.quantity * item.unitPrice * mult;

        if (itemType === "STARRED") {
          estStarredCount++;
          estStarredTotal += rowTotal;
        } else if (itemType === "INVOICE") {
          estInvoiceCount++;
          estInvoiceTotal += rowTotal;
        } else {
          estNormalCount++;
          estNormalTotal += rowTotal;
        }
      });
      
      const groupedEsts: { [plId: string]: typeof projEstimates } = {};
      projEstimates.forEach((item) => {
        const plId = item.priceListId || 'default';
        if (!groupedEsts[plId]) {
          groupedEsts[plId] = [];
        }
        groupedEsts[plId].push(item);
      });

      const plKeys = Object.keys(groupedEsts);
      let grandTotalAmount = 0;

      const tablesHtml = plKeys.map((plKey) => {
        const groupItems = groupedEsts[plKey];
        const groupTotal = groupItems.reduce((acc, item) => {
          const itemType = resolveEstimateType(
            item.code,
            item.itemType,
            item.description,
            item.independentCoefficient,
            item.priceListId,
          );
          const mult = getMultipliers(
            item.code,
            itemType,
            item.independentCoefficient,
          ).total;
          return acc + item.quantity * item.unitPrice * mult;
        }, 0);
        grandTotalAmount += groupTotal;

        return `
          <div style="margin-top: 25px; border: 1.5px solid #0f172a; border-radius: 8px; overflow: hidden; background: #fff;">
            <div style="background: #0f172a; color: #fff; padding: 10px 14px; font-weight: bold; font-size: 11.5px; display: flex; justify-content: space-between; align-items: center;">
              <span>📋 برآورد به تفکیک فهرست بها: ${getPlTitle(plKey)}</span>
              <span style="font-size: 10.5px; color: #facc15; font-weight: bold;">تعداد کل ردیف‌ها: ${groupItems.length.toLocaleString("fa-IR")} ردیف (شامل عادی، ستاره‌دار و فاکتوری)</span>
            </div>
            <table style="width: 100%; border-collapse: collapse; font-size: 10px; direction: rtl; margin: 0;">
              <thead>
                <tr style="background: #f1f5f9; font-weight: 900; color: #1e293b; border-bottom: 2px solid #cbd5e1;">
                  <th style="padding: 7px 4px; border: 1px solid #cbd5e1; width: 4%; text-align: center;">ردیف</th>
                  <th style="padding: 7px 4px; border: 1px solid #cbd5e1; width: 17%; text-align: center;">کد ردیف و نوع آیتم</th>
                  <th style="padding: 7px 6px; border: 1px solid #cbd5e1; text-align: right;">شرح آیتم و مشخصات عملیات</th>
                  <th style="padding: 7px 4px; border: 1px solid #cbd5e1; width: 6%; text-align: center;">واحد</th>
                  <th style="padding: 7px 4px; border: 1px solid #cbd5e1; width: 7%; text-align: center;">مقدار</th>
                  <th style="padding: 7px 4px; border: 1px solid #cbd5e1; width: 10%; text-align: center;">بهای واحد (ریال)</th>
                  <th style="padding: 7px 4px; border: 1px solid #cbd5e1; width: 6%; text-align: center;">ضریب کل</th>
                  <th style="padding: 7px 4px; border: 1px solid #cbd5e1; width: 14%; text-align: center;">مبلغ کل با ضرایب (ریال)</th>
                  <th style="padding: 7px 4px; border: 1px solid #cbd5e1; width: 9%; text-align: center;">وضعیت</th>
                </tr>
              </thead>
              <tbody>
                ${groupItems
                  .map((item, idx) => {
                    const itemType = resolveEstimateType(
                      item.code,
                      item.itemType,
                      item.description,
                      item.independentCoefficient,
                      item.priceListId,
                    );
                    const mult = getMultipliers(
                      item.code,
                      itemType,
                      item.independentCoefficient,
                    ).total;
                    const rowTotal = item.quantity * item.unitPrice * mult;
                    const isStarred = itemType === "STARRED";
                    const isInvoice = itemType === "INVOICE";
                    const bgRow = isStarred ? "#fffdf5" : isInvoice ? "#faf5ff" : (idx % 2 === 0 ? "#ffffff" : "#f8fafc");

                    const badgeHtml = isStarred
                      ? `<div style="margin-top: 3px;"><span style="display: inline-block; font-size: 8.5px; background: #fef3c7; color: #78350f; border: 1.5px solid #f59e0b; padding: 2px 7px; border-radius: 4px; font-weight: 900; print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important;">⭐ ستاره‌دار</span></div>`
                      : isInvoice
                        ? `<div style="margin-top: 3px;"><span style="display: inline-block; font-size: 8.5px; background: #f3e8ff; color: #581c87; border: 1.5px solid #a855f7; padding: 2px 7px; border-radius: 4px; font-weight: 900; print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important;">🧾 فاکتوری / جدید</span></div>`
                        : `<div style="margin-top: 3px;"><span style="display: inline-block; font-size: 8.5px; background: #eff6ff; color: #1e40af; border: 1.5px solid #93c5fd; padding: 2px 7px; border-radius: 4px; font-weight: bold; print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important;">🔹 آیتم عادی (پایه)</span></div>`;

                    return `
                    <tr style="background: ${bgRow}; border-bottom: 1px solid #cbd5e1;">
                      <td style="padding: 6px 4px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold;">${(idx + 1).toLocaleString("fa-IR")}</td>
                      <td style="padding: 6px 4px; border: 1px solid #cbd5e1; text-align: center;">
                        <div style="font-family: monospace; font-weight: 900; color: #0f172a; font-size: 11px; direction: ltr;">${item.itemCode || item.code}</div>
                        ${badgeHtml}
                      </td>
                      <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: right; line-height: 1.5;">
                        <div style="font-weight: bold; color: #1e293b;">${item.description}</div>
                        ${item.independentCoefficient && item.independentCoefficient !== 1 ? `
                          <div style="margin-top: 3px;">
                            <span style="display: inline-block; font-size: 8.5px; background: #fffbeb; color: #92400e; border: 1px solid #fcd34d; padding: 1px 5px; border-radius: 3px; font-weight: bold; print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important;">
                              ضریب اختصاصی آیتم: ${item.independentCoefficient}
                            </span>
                          </div>
                        ` : ""}
                      </td>
                      <td style="padding: 6px 4px; border: 1px solid #cbd5e1; text-align: center; color: #475569; font-weight: bold;">${item.unit || "-"}</td>
                      <td style="padding: 6px 4px; border: 1px solid #cbd5e1; text-align: center; font-family: monospace; font-weight: bold;">${item.quantity.toLocaleString("fa-IR")}</td>
                      <td style="padding: 6px 4px; border: 1px solid #cbd5e1; text-align: center; font-family: monospace;">${item.unitPrice.toLocaleString("fa-IR")}</td>
                      <td style="padding: 6px 4px; border: 1px solid #cbd5e1; text-align: center; font-family: monospace; font-size: 9.5px; color: #475569;">${mult.toFixed(3)}</td>
                      <td style="padding: 6px 4px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold; font-family: monospace; color: #0f172a;">${Math.round(rowTotal).toLocaleString("fa-IR")}</td>
                      <td style="padding: 6px 4px; border: 1px solid #cbd5e1; text-align: center; font-size: 9px;">
                        ${WorkflowService.getStatusLabel(item)}
                      </td>
                    </tr>
                  `;
                  })
                  .join("")}
              </tbody>
              <tfoot>
                 <tr style="background: #f1f5f9; font-weight: bold;">
                   <td colspan="7" style="padding: 8px; border: 1px solid #cbd5e1; text-align: left;">جمع جزء برآورد این فهرست بها:</td>
                   <td colspan="2" style="padding: 8px; border: 1px solid #cbd5e1; text-align: center; color: #16a34a; font-family: monospace; font-size: 11px; font-weight: 900;">${Math.round(groupTotal).toLocaleString("fa-IR")} ریال</td>
                 </tr>
              </tfoot>
            </table>
          </div>
        `;
      }).join("");

      title = `گزارش جامع برآورد پیمان پروژه ${projectTitle}`;
      contentHtml = `
        ${renderProjectHeader("لیست جامع اقلام و مقادیر برآورد اولیه پیمان (تفکیک بهای پایه، ستاره‌دار و فاکتوری)")}
        
        <!-- Summary Category Cards -->
        <div style="margin-top: 15px; margin-bottom: 20px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; direction: rtl;">
          <div style="background: #eff6ff; border: 1.5px solid #93c5fd; border-radius: 10px; padding: 12px; print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <span style="font-weight: 900; font-size: 11px; color: #1e3a8a;">🔹 ردیف‌های عادی پایه فهرست‌بها</span>
              <span style="font-size: 10px; background: #fff; color: #1e40af; border: 1px solid #bfdbfe; padding: 2px 6px; border-radius: 4px; font-weight: 900;">${estNormalCount.toLocaleString("fa-IR")} ردیف</span>
            </div>
            <div style="font-size: 10px; color: #475569;">مبلغ کل برآورد:</div>
            <div style="font-size: 12px; font-weight: 900; color: #1e3a8a; font-family: monospace; margin-top: 2px;">
              ${Math.round(estNormalTotal).toLocaleString("fa-IR")} <span style="font-size: 9px; font-weight: normal;">ریال</span>
            </div>
          </div>

          <div style="background: #fefce8; border: 1.5px solid #fde047; border-radius: 10px; padding: 12px; print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <span style="font-weight: 900; font-size: 11px; color: #854d0e;">⭐ ردیف‌های ستاره‌دار</span>
              <span style="font-size: 10px; background: #fff; color: #854d0e; border: 1px solid #fef08a; padding: 2px 6px; border-radius: 4px; font-weight: 900;">${estStarredCount.toLocaleString("fa-IR")} ردیف</span>
            </div>
            <div style="font-size: 10px; color: #475569;">مبلغ کل برآورد:</div>
            <div style="font-size: 12px; font-weight: 900; color: #854d0e; font-family: monospace; margin-top: 2px;">
              ${Math.round(estStarredTotal).toLocaleString("fa-IR")} <span style="font-size: 9px; font-weight: normal;">ریال</span>
            </div>
          </div>

          <div style="background: #faf5ff; border: 1.5px solid #d8b4fe; border-radius: 10px; padding: 12px; print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <span style="font-weight: 900; font-size: 11px; color: #581c87;">🧾 اقلام فاکتوری و قیمت جدید</span>
              <span style="font-size: 10px; background: #fff; color: #581c87; border: 1px solid #e9d5ff; padding: 2px 6px; border-radius: 4px; font-weight: 900;">${estInvoiceCount.toLocaleString("fa-IR")} ردیف</span>
            </div>
            <div style="font-size: 10px; color: #475569;">مبلغ کل برآورد:</div>
            <div style="font-size: 12px; font-weight: 900; color: #581c87; font-family: monospace; margin-top: 2px;">
              ${Math.round(estInvoiceTotal).toLocaleString("fa-IR")} <span style="font-size: 9px; font-weight: normal;">ریال</span>
            </div>
          </div>
        </div>

        ${tablesHtml}
        
        <div style="margin-top: 30px; padding: 15px; background: #0f172a; color: #fff; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; direction: rtl; print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important;">
          <strong style="font-size: 13px;">جمع کل نهایی برآورد پیمان (تمامی فهارس بها):</strong>
          <span style="font-size: 16px; font-weight: 900; color: #4ade80; font-family: monospace;">${Math.round(grandTotalAmount).toLocaleString("fa-IR")} ریال</span>
        </div>
      `;
    } else if (type === "materials_mrs") {
      title = `گزارش جامع کنترل مصالح وارده پروژه ${projectTitle}`;
      contentHtml = `
        ${renderProjectHeader("گزارش کنترل مصالح وارده (تفکیکی MRS)")}
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 11px; text-align: center; direction: rtl;">
          <thead>
            <tr style="background: #f1f5f9;">
              <th style="padding: 8px; border: 1px solid #ddd; width: 5%;">ردیف</th>
              <th style="padding: 8px; border: 1px solid #ddd; width: 12%;">تاریخ ورود</th>
              <th style="padding: 8px; border: 1px solid #ddd; width: 12%;">سریال قبض</th>
              <th style="padding: 8px; border: 1px solid #ddd; width: 18%;">نوع مصالح</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: right; padding-right: 15px;">شرح مصالح</th>
              <th style="padding: 8px; border: 1px solid #ddd; width: 15%;">محل دپو / انبار</th>
              <th style="padding: 8px; border: 1px solid #ddd; width: 15%;">وضعیت</th>
            </tr>
          </thead>
          <tbody>
            ${
              mrsList.filter((i) => i.projectId === selectedProjectId).length >
              0
                ? mrsList
                    .filter((i) => i.projectId === selectedProjectId)
                    .map(
                      (record, idx) => `
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd;">${(idx + 1).toLocaleString("fa-IR")}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${record.entryDate}</td>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${record.serialNumber}</td>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; color: #475569;">
                  ${(record.items || []).map((it) => `<div>${it.materialType}</div>`).join("")}
                </td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right; padding-right: 15px;">
                  ${(record.items || []).map((it) => `<div style="font-weight: bold; color: #1e293b;">- ${it.materialName} (${(it.quantity || 0).toLocaleString("fa-IR")} ${it.unit})</div>`).join("")}
                </td>
                <td style="padding: 8px; border: 1px solid #ddd;">${record.storageLocation || "انبار کارگاه"}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">
                  ${record.status === ("APPROVED" as any) ? '<span style="color: #059669; font-weight: bold;">تایید قطعی</span>' : record.status === "REJECTED" ? '<span style="color: #dc2626; font-weight: bold;">مردود</span>' : '<span style="color: #d97706; font-weight: bold;">معلق/در جریان</span>'}
                </td>
              </tr>
            `,
                    )
                    .join("")
                : '<tr><td colspan="7" style="padding: 20px; color: #94a3b8;">هیچ قبض ورودی ثبت نشده است.</td></tr>'
            }
          </tbody>
        </table>
      `;
    } else if (type === "materials_miv") {
      title = `گزارش جامع حواله‌های خروج مصالح پروژه ${projectTitle}`;
      contentHtml = `
        ${renderProjectHeader("گزارش حواله خروج مصالح (تفکیکی MIV)")}
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 11px; text-align: center; direction: rtl;">
          <thead>
            <tr style="background: #f1f5f9;">
              <th style="padding: 8px; border: 1px solid #ddd; width: 5%;">ردیف</th>
              <th style="padding: 8px; border: 1px solid #ddd; width: 15%;">تاریخ خروج</th>
              <th style="padding: 8px; border: 1px solid #ddd; width: 15%;">شماره حواله</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: right; padding-right: 15px;">شرح اقلام</th>
              <th style="padding: 8px; border: 1px solid #ddd; width: 25%;">تحویل‌گیرنده / بخش</th>
              <th style="padding: 8px; border: 1px solid #ddd; width: 15%;">وضعیت</th>
            </tr>
          </thead>
          <tbody>
            ${
              mivList.filter((i) => i.projectId === selectedProjectId).length >
              0
                ? mivList
                    .filter((i) => i.projectId === selectedProjectId)
                    .map(
                      (record, idx) => `
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd;">${(idx + 1).toLocaleString("fa-IR")}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${record.date}</td>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${record.serialNumber}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right; padding-right: 15px;">
                  ${(record.items || []).map((it) => `<div style="font-weight: bold; color: #1e293b;">- ${it.materialName} (${(it.quantity || 0).toLocaleString("fa-IR")} ${it.unit})</div>`).join("")}
                </td>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; color: #475569;">${record.requestedBy}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">
                  ${record.status === ("APPROVED" as any) ? '<span style="color: #059669; font-weight: bold;">صادر شده</span>' : record.status === "REJECTED" ? '<span style="color: #dc2626; font-weight: bold;">لغو شده</span>' : '<span style="color: #d97706; font-weight: bold;">معلق/در جریان</span>'}
                </td>
              </tr>
            `,
                    )
                    .join("")
                : '<tr><td colspan="6" style="padding: 20px; color: #94a3b8;">هیچ حواله خروجی ثبت نشده است.</td></tr>'
            }
          </tbody>
        </table>
      `;
    } else if (type === "materials_balance") {
      title = `گزارش جامع موجودی کارگاهی مصالح پروژه ${projectTitle}`;
      const balanceData = data || getMaterialBalance();
      contentHtml = `
        ${renderProjectHeader("گزارش جامع موجودی انبار و مصالح کارگاهی")}
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 11px; text-align: center; direction: rtl;">
          <thead>
            <tr style="background: #f1f5f9;">
              <th style="padding: 8px; border: 1px solid #ddd; width: 5%;">ردیف</th>
              <th style="padding: 8px; border: 1px solid #ddd; width: 20%;">نوع مصالح</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: right; padding-right: 15px;">شرح کالا</th>
              <th style="padding: 8px; border: 1px solid #ddd; width: 15%;">کل وارده (In)</th>
              <th style="padding: 8px; border: 1px solid #ddd; width: 15%;">کل صادره (Out)</th>
              <th style="padding: 8px; border: 1px solid #ddd; width: 15%;">موجودی کارگاه</th>
              <th style="padding: 8px; border: 1px solid #ddd; width: 10%;">واحد</th>
            </tr>
          </thead>
          <tbody>
            ${
              balanceData.length > 0
                ? balanceData
                    .map(
                      (row: any, idx: number) => `
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd;">${(idx + 1).toLocaleString("fa-IR")}</td>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; color: #475569;">${row.materialType}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right; padding-right: 15px; font-weight: bold;">${row.materialName}</td>
                <td style="padding: 8px; border: 1px solid #ddd; color: #065f46; background: #f0fdf4; font-weight: bold;">${(row.totalIn || 0).toLocaleString("fa-IR")}</td>
                <td style="padding: 8px; border: 1px solid #ddd; color: #92400e; background: #fffbeb; font-weight: bold;">${(row.totalOut || 0).toLocaleString("fa-IR")}</td>
                <td style="padding: 8px; border: 1px solid #ddd; color: ${row.remaining > 0 ? "#1e40af" : "#b91c1c"}; background: ${row.remaining > 0 ? "#eff6ff" : "#fef2f2"}; font-weight: bold;">${(row.remaining || 0).toLocaleString("fa-IR")}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${row.unit}</td>
              </tr>
            `,
                    )
                    .join("")
                : '<tr><td colspan="7" style="padding: 20px; color: #94a3b8;">هیچ داده‌ای جهت نمایش یافت نشد.</td></tr>'
            }
          </tbody>
        </table>
      `;
    } else if (type === "materials_mrs_single") {
      const record = data;
      title = `قبض ورود مصالح به انبار - سریال ${record.serialNumber}`;
      contentHtml = `
        ${renderProjectHeader("قبض ورود مصالح به انبار (MRS Ticket)")}
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; margin-bottom: 20px; direction: rtl;">
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; width: 25%; background: #f8fafc;">سریال قبض:</td>
            <td style="padding: 8px; border: 1px solid #ddd; font-family: monospace; font-weight: bold;">${record.serialNumber}</td>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; width: 25%; background: #f8fafc;">تاریخ ورود:</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${record.entryDate}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background: #f8fafc;">ساعت ورود:</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${record.entryTime || "---"}</td>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background: #f8fafc;">محل تخلیه / دپو:</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${record.storageLocation || "انبار مرکزی"}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background: #f8fafc;">مشخصات خودرو و راننده:</td>
            <td style="padding: 8px; border: 1px solid #ddd;" colspan="3">
              ${record.driverName || "---"} ${record.vehicleType ? `(${record.vehicleType})` : ""} ${record.plateNumber ? `| پلاک: ${record.plateNumber}` : ""}
            </td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background: #f8fafc;">وضعیت تایید سند:</td>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; color: #1e40af;" colspan="3">
              ${record.status === ("APPROVED" as any) ? "تایید نهایی و رسید شده" : "معلق / پیش‌نویس"}
            </td>
          </tr>
        </table>

        <h3 style="border-bottom: 2px solid #1e40af; padding-bottom: 5px; color: #1e40af; margin-top: 25px;">اقلام وارده طبق بارنامه</h3>
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; text-align: center; direction: rtl;">
          <thead>
            <tr style="background: #f1f5f9;">
              <th style="padding: 8px; border: 1px solid #ddd; width: 8%;">ردیف</th>
              <th style="padding: 8px; border: 1px solid #ddd; width: 25%;">نوع مصالح</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: right; padding-right: 15px;">شرح کامل کالا / معدن / تولیدکننده</th>
              <th style="padding: 8px; border: 1px solid #ddd; width: 15%;">مقدار قبضی</th>
              <th style="padding: 8px; border: 1px solid #ddd; width: 12%;">واحد</th>
            </tr>
          </thead>
          <tbody>
            ${(record.items || [])
              .map(
                (item: any, idx: number) => `
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd;">${(idx + 1).toLocaleString("fa-IR")}</td>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; color: #475569;">${item.materialType || "---"}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right; padding-right: 15px; font-weight: bold;">${item.materialName} ${item.supplier ? `(منبع: ${item.supplier})` : ""}</td>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: black; color: #1e40af; background: #eff6ff;">${(item.quantity || 0).toLocaleString("fa-IR")}</td>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; color: #64748b;">${item.unit}</td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>
      `;
    } else if (type === "materials_miv_single") {
      const record = data;
      title = `برگ حواله خروج مصالح از انبار - حواله ${record.serialNumber}`;
      contentHtml = `
        ${renderProjectHeader("حواله خروج مصالح از انبار (MIV Ticket)")}
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; margin-bottom: 20px; direction: rtl;">
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; width: 25%; background: #f8fafc;">شماره حواله:</td>
            <td style="padding: 8px; border: 1px solid #ddd; font-family: monospace; font-weight: bold;">${record.serialNumber}</td>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; width: 25%; background: #f8fafc;">تاریخ حواله:</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${record.date}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background: #f8fafc;">درخواست کننده:</td>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${record.requestedBy}</td>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background: #f8fafc;">محل مصرف / جبهه کاری:</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${record.location || "کارگاه"}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background: #f8fafc;">وضعیت حواله:</td>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; color: #059669;" colspan="3">
              ${record.status === ("APPROVED" as any) ? "صادر شده و نهایی" : "معلق / پیش‌نویس"}
            </td>
          </tr>
        </table>

        <h3 style="border-bottom: 2px solid #1e40af; padding-bottom: 5px; color: #1e40af; margin-top: 25px;">ریز مصالح خروجی مصرفی</h3>
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; text-align: center; direction: rtl;">
          <thead>
            <tr style="background: #f1f5f9;">
              <th style="padding: 8px; border: 1px solid #ddd; width: 8%;">ردیف</th>
              <th style="padding: 8px; border: 1px solid #ddd; width: 20%;">نوع مصالح</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: right; padding-right: 15px;">شرح مصالح مصرفی</th>
              <th style="padding: 8px; border: 1px solid #ddd; width: 15%;">مقدار حواله</th>
              <th style="padding: 8px; border: 1px solid #ddd; width: 12%;">واحد</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: right; padding-right: 15px;">توضیحات</th>
            </tr>
          </thead>
          <tbody>
            ${(record.items || [])
              .map(
                (item: any, idx: number) => `
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd;">${(idx + 1).toLocaleString("fa-IR")}</td>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; color: #475569;">${item.materialType || "---"}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right; padding-right: 15px; font-weight: bold;">${item.materialName}</td>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: black; color: #059669; background: #f0fdf4;">${(item.quantity || 0).toLocaleString("fa-IR")}</td>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; color: #64748b;">${item.unit}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right; padding-right: 15px; color: #64748b;">${item.remarks || "---"}</td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>
      `;
    } else if (type === "metre") {
      const projMetres = metres.filter(
        (m) => m.projectId === selectedProjectId,
      );

      const groupedMetres: { [plId: string]: typeof projMetres } = {};
      projMetres.forEach((item) => {
        const plId = item.priceListId || 'default';
        if (!groupedMetres[plId]) {
          groupedMetres[plId] = [];
        }
        groupedMetres[plId].push(item);
      });

      const plKeys = Object.keys(groupedMetres);

      const tablesHtml = plKeys.map((plKey) => {
        const groupItems = groupedMetres[plKey];
        const totalQty = groupItems.reduce((sum, item) => sum + item.partialTotal, 0);

        return `
          <div style="margin-top: 25px; border: 1px solid #ccc; border-radius: 8px; overflow: hidden; background: #fff;">
            <div style="background: #f1f5f9; padding: 10px; font-weight: bold; font-size: 11px; border-bottom: 1px solid #ccc; display: flex; justify-content: space-between;">
              <span>📋 ریزمتره فهرست بها: ${getPlTitle(plKey)}</span>
              <span>تعداد ردیف‌ها: ${groupItems.length.toLocaleString("fa-IR")}</span>
            </div>
            <table style="width: 100%; border-collapse: collapse; font-size: 10px; direction: rtl; margin: 0;">
              <thead>
                <tr style="background: #f8fafc;">
                  <th style="padding: 8px; border: 1px solid #ddd; width: 6%;">ردیف</th>
                  <th style="padding: 8px; border: 1px solid #ddd; width: 15%;">کد آیتم</th>
                  <th style="padding: 8px; border: 1px solid #ddd;">شرح آیتم</th>
                  <th style="padding: 8px; border: 1px solid #ddd; width: 10%;">واحد</th>
                  <th style="padding: 8px; border: 1px solid #ddd; width: 15%;">مقدار کل</th>
                  <th style="padding: 8px; border: 1px solid #ddd; width: 18%;">منبع (صورت‌جلسه)</th>
                </tr>
              </thead>
              <tbody>
                ${groupItems
                  .map((item, idx) => {
                    const sourceMin = minutes.find((m) => m.id === item.minuteId);
                    return `
                    <tr>
                      <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${(idx + 1).toLocaleString("fa-IR")}</td>
                      <td style="padding: 8px; border: 1px solid #ddd; text-align: center; font-family: monospace; font-weight: bold; color: #2563eb;">${item.itemCode}</td>
                      <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${item.description}</td>
                      <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${item.unit || "-"}</td>
                      <td style="padding: 8px; border: 1px solid #ddd; text-align: center; font-weight: bold;">${item.partialTotal.toLocaleString("fa-IR")}</td>
                      <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${sourceMin ? `صورت‌جلسه ${sourceMin.number}` : "مستقیم"}</td>
                    </tr>
                  `;
                  })
                  .join("")}
              </tbody>
              <tfoot>
                <tr style="background: #fafafc; font-weight: bold;">
                  <td colspan="4" style="padding: 8px; border: 1px solid #ddd; text-align: left;">مجموع مقادیر این بخش:</td>
                  <td colspan="2" style="padding: 8px; border: 1px solid #ddd; text-align: center; color: #2563eb;">${totalQty.toLocaleString("fa-IR")}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        `;
      }).join("");

      title = `گزارش جامع ریزمتره پروژه ${projectTitle}`;
      contentHtml = `
        ${renderProjectHeader("لیست کلیه اقلام ریزمتره و احجام پروژه")}
        ${tablesHtml}
      `;
    } else if (type === "variation") {
      const projVariations = variations.filter(
        (v) => v.projectId === selectedProjectId,
      );
      title = `گزارش تغییر مقادیر پروژه ${projectTitle}`;
      contentHtml = `
        ${renderProjectHeader("گزارش تغییر مقادیر (Variation Orders)")}
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; text-align: center;">
          <thead>
            <tr style="background: #f1f5f9;">
              <th style="padding: 8px; border: 1px solid #ddd;">ردیف</th>
              <th style="padding: 8px; border: 1px solid #ddd;">شماره ابلاغ</th>
              <th style="padding: 8px; border: 1px solid #ddd;">تاریخ</th>
              <th style="padding: 8px; border: 1px solid #ddd;">مبلغ خالص تغییرات (ریال)</th>
              <th style="padding: 8px; border: 1px solid #ddd;">وضعیت</th>
            </tr>
          </thead>
          <tbody>
            ${projVariations
              .map((v, idx) => {
                const vAmount = (v.items || []).reduce((acc, i) => {
                  let origQty = i.originalQty;
                  let unitPrice = i.unitPrice;
                  const isCBS = currentProject?.contractType?.toUpperCase() === "CBS";
                  if (isCBS) {
                    if (origQty === undefined || origQty === null || origQty === 0 || String(origQty) === "0") {
                      const cNode = cbsNodes.find(n => (cleanCode(n.code) === cleanCode(i.code) || n.code === i.code) && String(n.projectId) === String(selectedProjectId));
                      origQty = cNode ? (cNode.quantity || 0) : 0;
                    }
                    if (unitPrice === undefined || unitPrice === null || unitPrice === 0 || String(unitPrice) === "0") {
                      const cNode = cbsNodes.find(n => (cleanCode(n.code) === cleanCode(i.code) || n.code === i.code) && String(n.projectId) === String(selectedProjectId));
                      if (cNode) {
                        unitPrice = cNode.unitPrice || (cNode.quantity ? (cNode.budget / cNode.quantity) : cNode.budget) || 0;
                      } else {
                        unitPrice = 0;
                      }
                    }
                  } else {
                    if (origQty === undefined || origQty === null || origQty === 0) {
                      const eNode = estimates.find(e => cleanCode(e.code) === cleanCode(i.code) && String(e.projectId) === String(selectedProjectId));
                      origQty = eNode ? (eNode.quantity || 0) : 0;
                    }
                    if (unitPrice === undefined || unitPrice === null || unitPrice === 0) {
                      const eNode = estimates.find(e => cleanCode(e.code) === cleanCode(i.code) && String(e.projectId) === String(selectedProjectId));
                      unitPrice = eNode ? (eNode.unitPrice || 0) : 0;
                    }
                  }
                  const finalQty = i.employerQty ?? i.consultantQty ?? i.contractorQty ?? origQty ?? 0;
                  const diff = finalQty - origQty;
                  const mult = isCBS ? 1 : (getMultipliers(
                    i.code,
                    i.itemType,
                    i.independentCoefficient || 1,
                  ).total || 1);
                  return acc + diff * unitPrice * mult;
                }, 0);
                return `
                <tr>
                  <td style="padding: 8px; border: 1px solid #ddd;">${(idx + 1).toLocaleString("fa-IR")}</td>
                  <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${v.number}</td>
                  <td style="padding: 8px; border: 1px solid #ddd;">${v.date}</td>
                  <td style="padding: 8px; border: 1px solid #ddd;">${Math.round(vAmount).toLocaleString("fa-IR")}</td>
                  <td style="padding: 8px; border: 1px solid #ddd;">${WorkflowService.getStatusLabel(v)}</td>
                </tr>
              `;
              })
              .join("")}
          </tbody>
        </table>
      `;
    } else if (type === "permits") {
      const projPermits = workPermits.filter(
        (p) => p.projectId === selectedProjectId,
      );

      if (data) {
        title = `مجوز اجرای کار شماره ${data.number}`;
        const approvedCount = PERMIT_DISCIPLINES.filter(
          (d) =>
            (data[`consultant${d.key}` as keyof WorkPermit] as ApprovalDetail)
              ?.isApproved,
        ).length;
        contentHtml = `
          ${renderProjectHeader("مجوز اجرای کار (Work Permit)")}
          <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px;">
            <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; width: 30%;">شماره مجوز:</td><td style="padding: 8px; border: 1px solid #ddd;">${data.number}</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">تاریخ درخواست:</td><td style="padding: 8px; border: 1px solid #ddd;">${data.date}</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">محل اجرا:</td><td style="padding: 8px; border: 1px solid #ddd;">${data.location}</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">وضعیت نهایی:</td><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${WorkflowService.getStatusLabel(data)}</td></tr>
          </table>
          <div style="margin-top: 20px;">
            <h3 style="border-bottom: 1px solid #eee; padding-bottom: 5px;">شرح عملیات مورد درخواست</h3>
            <div style="padding: 15px; background: #fff; border: 1px solid #eee; border-radius: 8px; min-height: 50px;">
              ${data.description}
            </div>
          </div>
          <div style="margin-top: 25px;">
            <h3 style="border-bottom: 2px solid #1e40af; padding-bottom: 5px; color: #1e40af;">چک‌لیست تاییدات دیسیپلین‌های فنی</h3>
            <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 10px; text-align: center;">
              <thead>
                <tr style="background: #f8fafc;">
                  <th style="padding: 8px; border: 1px solid #ddd;">دیسیپلین</th>
                  <th style="padding: 8px; border: 1px solid #ddd;">تایید پیمانکار</th>
                  <th style="padding: 8px; border: 1px solid #ddd;">توضیحات پیمانکار</th>
                  <th style="padding: 8px; border: 1px solid #ddd;">تایید مشاور</th>
                  <th style="padding: 8px; border: 1px solid #ddd;">توضیحات مشاور</th>
                  <th style="padding: 8px; border: 1px solid #ddd;">تایید کارفرما</th>
                  <th style="padding: 8px; border: 1px solid #ddd;">توضیحات کارفرما</th>
                </tr>
              </thead>
              <tbody>
                ${PERMIT_DISCIPLINES.map((d) => {
                  const contDetail = (data[
                    `contractor${d.key}` as keyof WorkPermit
                  ] as ApprovalDetail) || { isApproved: false, comment: "" };
                  const consDetail = (data[
                    `consultant${d.key}` as keyof WorkPermit
                  ] as ApprovalDetail) || { isApproved: false, comment: "" };
                  const empDetail = (data[
                    `employer${d.key}` as keyof WorkPermit
                  ] as ApprovalDetail) || { isApproved: false, comment: "" };
                  return `
                    <tr>
                      <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${d.label}</td>
                      <td style="padding: 8px; border: 1px solid #ddd; color: ${contDetail.isApproved ? "#059669" : "#dc2626"}">${contDetail.isApproved ? "تایید" : "عدم تایید"}</td>
                      <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${contDetail.comment || "---"}</td>
                      <td style="padding: 8px; border: 1px solid #ddd; color: ${consDetail.isApproved ? "#059669" : "#dc2626"}">${consDetail.isApproved ? "تایید" : "عدم تایید"}</td>
                      <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${consDetail.comment || "---"}</td>
                      <td style="padding: 8px; border: 1px solid #ddd; color: ${empDetail.isApproved ? "#059669" : "#dc2626"}">${empDetail.isApproved ? "تایید" : "عدم تایید"}</td>
                      <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${empDetail.comment || "---"}</td>
                    </tr>
                  `;
                }).join("")}
              </tbody>
            </table>
            <div style="margin-top: 15px; font-size: 11px; font-weight: bold; display: flex; gap: 30px;">
              <span>تعداد دیسیپلین‌های تایید شده توسط مشاور: ${approvedCount} از ۶</span>
              <span>تعداد دیسیپلین‌های تایید شده توسط کارفرما: ${
                PERMIT_DISCIPLINES.filter(
                  (d) =>
                    (
                      data[
                        `employer${d.key}` as keyof WorkPermit
                      ] as ApprovalDetail
                    )?.isApproved,
                ).length
              } از ۶</span>
            </div>
          </div>
        `;
      } else {
        const finalizedPermits = projPermits.filter((p) => p.isFinalFrozen);
        const pendingPermits = projPermits.filter(
          (p) =>
            !p.isFinalFrozen &&
            WorkflowService.getStatus(p) !== WorkflowStatus.DRAFT &&
            WorkflowService.getStatus(p) !== WorkflowStatus.REJECTED,
        );

        title = `گزارش جامع مجوزهای پروژه ${projectTitle}`;
        contentHtml = `
          ${renderProjectHeader("گزارش وضعیت تجمعی مجوزهای اجرای کار", false)}
          
          <h3 style="margin-top: 25px; border-right: 4px solid #10b981; padding-right: 10px; color: #065f46;">۱. مجوزهای صادر شده نهایی</h3>
          <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; text-align: center;">
            <thead>
              <tr style="background: #ecfdf5;">
                <th style="padding: 8px; border: 1px solid #ddd;">ردیف</th>
                <th style="padding: 8px; border: 1px solid #ddd;">شماره مجوز</th>
                <th style="padding: 8px; border: 1px solid #ddd;">تاریخ صدور</th>
                <th style="padding: 8px; border: 1px solid #ddd;">موضوع و محل اجرا</th>
                <th style="padding: 8px; border: 1px solid #ddd;">وضعیت</th>
              </tr>
            </thead>
            <tbody>
              ${
                finalizedPermits.length > 0
                  ? finalizedPermits
                      .map(
                        (p, idx) => `
                <tr>
                  <td style="padding: 8px; border: 1px solid #ddd;">${(idx + 1).toLocaleString("fa-IR")}</td>
                  <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${p.number}</td>
                  <td style="padding: 8px; border: 1px solid #ddd;">${p.date}</td>
                  <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${p.description} - ${p.location}</td>
                  <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; color: #059669;">صادر شده</td>
                </tr>
              `,
                      )
                      .join("")
                  : '<tr><td colspan="5" style="padding: 20px; color: #94a3b8;">موردی یافت نشد.</td></tr>'
              }
            </tbody>
          </table>

          <h3 style="margin-top: 35px; border-right: 4px solid #f59e0b; padding-right: 10px; color: #92400e;">۲. مجوزهای در جریان بررسی</h3>
          <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; text-align: center;">
            <thead>
              <tr style="background: #fffbeb;">
                <th style="padding: 8px; border: 1px solid #ddd;">ردیف</th>
                <th style="padding: 8px; border: 1px solid #ddd;">شماره</th>
                <th style="padding: 8px; border: 1px solid #ddd;">تاریخ درخواست</th>
                <th style="padding: 8px; border: 1px solid #ddd;">موضوع</th>
                <th style="padding: 8px; border: 1px solid #ddd;">وضعیت فعلی</th>
              </tr>
            </thead>
            <tbody>
              ${
                pendingPermits.length > 0
                  ? pendingPermits
                      .map(
                        (p, idx) => `
                <tr>
                  <td style="padding: 8px; border: 1px solid #ddd;">${(idx + 1).toLocaleString("fa-IR")}</td>
                  <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${p.number}</td>
                  <td style="padding: 8px; border: 1px solid #ddd;">${p.date}</td>
                  <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${p.description}</td>
                  <td style="padding: 8px; border: 1px solid #ddd; font-size: 10px;">${WorkflowService.getStatusLabel(p)}</td>
                </tr>
              `,
                      )
                      .join("")
                  : '<tr><td colspan="5" style="padding: 20px; color: #94a3b8;">موردی یافت نشد.</td></tr>'
              }
            </tbody>
          </table>
        `;
      }
    } else if (type === "discrepancy") {
      // Use discrepancyData to ensure complete parity with technical office calculations
      const resolveDiscrepancyType = (
        code: string,
        explicitType?: string,
        desc?: string,
        coef?: number,
        plId?: string,
      ): "NORMAL" | "STARRED" | "INVOICE" => {
        const expUpper = (explicitType || "").toUpperCase();
        if (expUpper === "STARRED") return "STARRED";
        if (expUpper === "INVOICE" || expUpper === "NEW") return "INVOICE";

        if (code && (code.includes("*") || code.startsWith("*") || code.endsWith("*"))) {
          return "STARRED";
        }

        const d = (desc || "").toLowerCase();
        if (
          d.includes("ستاره") ||
          d.includes("starred") ||
          d.includes("ستاره‌دار") ||
          d.includes("ستاره دار") ||
          d.includes("قیمت توافقی")
        ) {
          return "STARRED";
        }
        if (
          d.includes("فاکتور") ||
          d.includes("invoice") ||
          d.includes("فاکتوری") ||
          d.includes("قیمت جدید") ||
          d.includes("خرید مستقیم")
        ) {
          return "INVOICE";
        }

        if (coef && coef !== 1 && coef > 0) {
          return "STARRED";
        }

        // Check in project price lists
        const plItem = findPriceListItem(code, plId);
        if (plItem) {
          if ((plItem as any).isStarred || (plItem as any).type === "STARRED" || (plItem as any).itemType === "STARRED") return "STARRED";
          if ((plItem as any).isInvoice || (plItem as any).type === "INVOICE" || (plItem as any).itemType === "INVOICE") return "INVOICE";
        }

        return "NORMAL";
      };

      const groupedByPriceList: {
        [plId: string]: {
          NORMAL: any[];
          STARRED: any[];
          INVOICE: any[];
        };
      } = {};

      let totalNormalCount = 0;
      let totalStarredCount = 0;
      let totalInvoiceCount = 0;
      let totalNormalEst = 0;
      let totalStarredEst = 0;
      let totalInvoiceEst = 0;
      let totalNormalExec = 0;
      let totalStarredExec = 0;
      let totalInvoiceExec = 0;

      discrepancyData.items.forEach((item) => {
        const plId = item.priceListId || "default";
        if (!groupedByPriceList[plId]) {
          groupedByPriceList[plId] = { NORMAL: [], STARRED: [], INVOICE: [] };
        }
        const itemType = resolveDiscrepancyType(
          item.code,
          item.itemType,
          item.description,
          item.independentCoefficient,
          item.priceListId,
        );
        if (itemType === "STARRED") {
          groupedByPriceList[plId].STARRED.push({ ...item, itemType });
          totalStarredCount++;
          totalStarredEst += item.estAmnt || 0;
          totalStarredExec += item.execAmnt || 0;
        } else if (itemType === "INVOICE") {
          groupedByPriceList[plId].INVOICE.push({ ...item, itemType });
          totalInvoiceCount++;
          totalInvoiceEst += item.estAmnt || 0;
          totalInvoiceExec += item.execAmnt || 0;
        } else {
          groupedByPriceList[plId].NORMAL.push({ ...item, itemType });
          totalNormalCount++;
          totalNormalEst += item.estAmnt || 0;
          totalNormalExec += item.execAmnt || 0;
        }
      });

      const ITEM_TYPES_INFO = [
        {
          key: "NORMAL" as const,
          title: "ردیف‌های پایه فهرست بها (عادی)",
          badgeLabel: "🔹 ردیف عادی (پایه)",
          badgeBg: "#eff6ff",
          badgeColor: "#1e40af",
          badgeBorder: "#93c5fd",
          rowBg: "#ffffff",
          headerBg: "#f0fdf4",
          headerBorder: "#22c55e",
        },
        {
          key: "STARRED" as const,
          title: "ردیف‌های ستاره‌دار (دارای ضریب یا قیمت مصوب)",
          badgeLabel: "⭐ ستاره‌دار",
          badgeBg: "#fef3c7",
          badgeColor: "#78350f",
          badgeBorder: "#f59e0b",
          rowBg: "#fffdf5",
          headerBg: "#fffbeb",
          headerBorder: "#f59e0b",
        },
        {
          key: "INVOICE" as const,
          title: "اقلام فاکتوری و قیمت جدید",
          badgeLabel: "🧾 فاکتوری / قیمت جدید",
          badgeBg: "#f3e8ff",
          badgeColor: "#581c87",
          badgeBorder: "#a855f7",
          rowBg: "#faf5ff",
          headerBg: "#faf5ff",
          headerBorder: "#a855f7",
        },
      ];

      const plKeys = Object.keys(groupedByPriceList);

      const tablesHtml = plKeys.map((plKey) => {
        const plGroups = groupedByPriceList[plKey];
        const plTitle = getPlTitle(plKey);

        let plTotalEst = 0;
        let plTotalExec = 0;
        let plTotalDiff = 0;

        const subGroupsHtml = ITEM_TYPES_INFO.map((typeCfg) => {
          const typeItems = plGroups[typeCfg.key] || [];
          if (typeItems.length === 0) return "";

          const typeTotalEst = typeItems.reduce((s, i) => s + (i.estAmnt || 0), 0);
          const typeTotalExec = typeItems.reduce((s, i) => s + (i.execAmnt || 0), 0);
          const typeTotalDiff = typeTotalExec - typeTotalEst;

          plTotalEst += typeTotalEst;
          plTotalExec += typeTotalExec;
          plTotalDiff += typeTotalDiff;

          return `
            <div style="margin-top: 18px; border: 1.5px solid ${typeCfg.badgeBorder}; border-radius: 8px; overflow: hidden; background: #fff;">
              <div style="background: ${typeCfg.headerBg}; border-bottom: 2px solid ${typeCfg.headerBorder}; padding: 10px 14px; font-weight: 900; font-size: 12px; display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="background: ${typeCfg.badgeBg}; color: ${typeCfg.badgeColor}; border: 1px solid ${typeCfg.badgeBorder}; padding: 3px 10px; border-radius: 6px; font-size: 11px; print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important;">
                    ${typeCfg.badgeLabel}
                  </span>
                  <span style="color: #0f172a;">${typeCfg.title}</span>
                </div>
                <span style="font-size: 10.5px; color: #334155; background: #fff; padding: 3px 10px; border-radius: 5px; border: 1px solid #cbd5e1; font-weight: bold;">
                  تعداد: ${typeItems.length.toLocaleString("fa-IR")} ردیف
                </span>
              </div>
              <table style="width: 100%; border-collapse: collapse; font-size: 10px; direction: rtl; text-align: center; margin: 0;">
                <thead>
                  <tr style="background: #f1f5f9; font-weight: 900; border-bottom: 2px solid #cbd5e1; color: #1e293b;">
                    <th style="padding: 7px 4px; border: 1px solid #cbd5e1; width: 4%;">ردیف</th>
                    <th style="padding: 7px 4px; border: 1px solid #cbd5e1; width: 14%;">کد ردیف و نوع</th>
                    <th style="padding: 7px 4px; border: 1px solid #cbd5e1; width: 11%;">نوع ردیف</th>
                    <th style="padding: 7px 6px; border: 1px solid #cbd5e1; width: 23%; text-align: right;">شرح آیتم و مشخصات عملیات</th>
                    <th style="padding: 7px 4px; border: 1px solid #cbd5e1; width: 5%;">واحد</th>
                    <th style="padding: 7px 4px; border: 1px solid #cbd5e1; width: 8%;">بهای واحد (ریال)</th>
                    <th style="padding: 7px 4px; border: 1px solid #cbd5e1; width: 5%;">ضریب</th>
                    <th style="padding: 7px 4px; border: 1px solid #cbd5e1; width: 6%;">مقدار برآورد</th>
                    <th style="padding: 7px 4px; border: 1px solid #cbd5e1; width: 6%;">مقدار اجرا</th>
                    <th style="padding: 7px 4px; border: 1px solid #cbd5e1; width: 6%;">اختلاف مقدار</th>
                    <th style="padding: 7px 4px; border: 1px solid #cbd5e1; width: 8%;">مبلغ برآورد (ریال)</th>
                    <th style="padding: 7px 4px; border: 1px solid #cbd5e1; width: 8%;">مبلغ اجرا (ریال)</th>
                  </tr>
                </thead>
                <tbody>
                  ${typeItems
                    .map((item, idx) => {
                      const isStarred = (item.itemType || "").toUpperCase() === "STARRED";
                      const isInvoice = (item.itemType || "").toUpperCase() === "INVOICE" || (item.itemType || "").toUpperCase() === "NEW";
                      const diffQty = item.diffQty || 0;
                      const diffAmnt = item.diffAmnt || 0;

                      const typeBadge = isStarred
                        ? `<span style="display: inline-block; font-size: 9px; background: #fef3c7; color: #78350f; border: 1.5px solid #f59e0b; padding: 2px 7px; border-radius: 5px; font-weight: 900; print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important;">⭐ ستاره‌دار</span>`
                        : isInvoice
                          ? `<span style="display: inline-block; font-size: 9px; background: #f3e8ff; color: #581c87; border: 1.5px solid #a855f7; padding: 2px 7px; border-radius: 5px; font-weight: 900; print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important;">🧾 فاکتوری / جدید</span>`
                          : `<span style="display: inline-block; font-size: 9px; background: #eff6ff; color: #1e40af; border: 1.5px solid #93c5fd; padding: 2px 7px; border-radius: 5px; font-weight: bold; print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important;">🔹 عادی (پایه)</span>`;

                      const extraBadge = item.isExtra
                        ? `<span style="display: inline-block; margin-top: 3px; font-size: 8.5px; background: #fee2e2; color: #991b1b; border: 1px solid #f87171; padding: 1px 6px; border-radius: 4px; font-weight: bold; print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important;">📌 ردیف جدید خارج از برآورد اولیه</span>`
                        : "";

                      const coefTag = item.independentCoefficient && item.independentCoefficient !== 1
                        ? `<span style="display: inline-block; margin-right: 4px; font-size: 8.5px; background: #fffbeb; color: #92400e; border: 1px solid #fcd34d; padding: 1px 4px; border-radius: 3px; font-weight: bold; print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important;">(ضریب اختصاصی: ${item.independentCoefficient})</span>`
                        : "";

                      return `
                        <tr style="background: ${isStarred ? "#fffdf5" : isInvoice ? "#faf5ff" : idx % 2 === 1 ? "#f8fafc" : "#ffffff"}; border-bottom: 1px solid #e2e8f0;">
                          <td style="padding: 6px 4px; border: 1px solid #e2e8f0; font-weight: bold;">${(idx + 1).toLocaleString("fa-IR")}</td>
                          <td style="padding: 6px 4px; border: 1px solid #e2e8f0; text-align: center;">
                            <div style="font-family: monospace; font-weight: 900; font-size: 11px; color: #0f172a; direction: ltr;">${item.code}</div>
                            <div style="margin-top: 3px;">${typeBadge}</div>
                          </td>
                          <td style="padding: 6px 4px; border: 1px solid #e2e8f0; text-align: center;">
                            ${typeBadge}
                          </td>
                          <td style="padding: 6px 8px; border: 1px solid #e2e8f0; text-align: right; line-height: 1.5;">
                            <div style="font-weight: bold; color: #1e293b;">${item.description}</div>
                            <div style="margin-top: 2px;">${extraBadge} ${coefTag}</div>
                          </td>
                          <td style="padding: 6px 4px; border: 1px solid #e2e8f0; font-weight: bold; color: #475569;">${item.unit || "---"}</td>
                          <td style="padding: 6px 4px; border: 1px solid #e2e8f0; font-family: monospace; font-weight: bold;">${(item.price || 0).toLocaleString("fa-IR")}</td>
                          <td style="padding: 6px 4px; border: 1px solid #e2e8f0; font-family: monospace;">${(item.coeff || 1).toFixed(3)}</td>
                          <td style="padding: 6px 4px; border: 1px solid #e2e8f0; font-weight: bold; color: #334155;">${(item.estQty || 0).toLocaleString("fa-IR")}</td>
                          <td style="padding: 6px 4px; border: 1px solid #e2e8f0; font-weight: bold; color: #0f172a;">${(item.execQty || 0).toLocaleString("fa-IR")}</td>
                          <td style="padding: 6px 4px; border: 1px solid #e2e8f0; font-weight: 900; color: ${diffQty > 0 ? "#15803d" : diffQty < 0 ? "#b91c1c" : "#64748b"};">
                            ${diffQty > 0 ? "+" : ""}${diffQty.toLocaleString("fa-IR")}
                          </td>
                          <td style="padding: 6px 4px; border: 1px solid #e2e8f0; font-family: monospace; font-weight: bold; color: #334155;">${Math.round(item.estAmnt || 0).toLocaleString("fa-IR")}</td>
                          <td style="padding: 6px 4px; border: 1px solid #e2e8f0; font-family: monospace; font-weight: bold; color: #0f172a;">${Math.round(item.execAmnt || 0).toLocaleString("fa-IR")}</td>
                        </tr>
                      `;
                    })
                    .join("")}
                </tbody>
                <tfoot>
                  <tr style="background: #f1f5f9; font-weight: 900; border-top: 2px solid #cbd5e1;">
                    <td colspan="10" style="padding: 7px 10px; border: 1px solid #cbd5e1; text-align: left; font-size: 11px;">
                      جمع جزء ${typeCfg.title} (ریال):
                    </td>
                    <td style="padding: 7px 4px; border: 1px solid #cbd5e1; font-family: monospace; font-size: 11px;">
                      ${Math.round(typeTotalEst).toLocaleString("fa-IR")}
                    </td>
                    <td style="padding: 7px 4px; border: 1px solid #cbd5e1; font-family: monospace; font-size: 11px;">
                      ${Math.round(typeTotalExec).toLocaleString("fa-IR")}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          `;
        }).join("");

        return `
          <div style="margin-top: 25px; border: 2px solid #0f172a; border-radius: 8px; overflow: hidden; background: #fff;">
            <div style="background: #0f172a; color: #fff; padding: 12px 16px; font-weight: 900; font-size: 13px; display: flex; justify-content: space-between; align-items: center;">
              <span>📚 فهرست بها: ${plTitle}</span>
              <span style="font-size: 11px; color: #facc15; font-weight: bold;">تفکیک شده به: ردیف‌های پایه 🔹 | ردیف‌های ستاره‌دار ⭐ | اقلام فاکتوری 🧾</span>
            </div>
            <div style="padding: 12px;">
              ${subGroupsHtml}
            </div>
            <div style="background: #e2e8f0; border-top: 2px solid #94a3b8; padding: 10px 16px; font-weight: 900; font-size: 11.5px; display: flex; justify-content: space-between; align-items: center;">
              <span>جمع کل برآورد و اجرای فهرست بهای ${plTitle}:</span>
              <div style="display: flex; gap: 24px;">
                <span>برآورد: ${Math.round(plTotalEst).toLocaleString("fa-IR")} ریال</span>
                <span>اجرا: ${Math.round(plTotalExec).toLocaleString("fa-IR")} ریال</span>
                <span style="color: ${plTotalDiff > 0 ? "#15803d" : "#b91c1c"};">
                  خالص مغایرت: ${plTotalDiff > 0 ? "+" : ""}${Math.round(plTotalDiff).toLocaleString("fa-IR")} ریال
                </span>
              </div>
            </div>
          </div>
        `;
      }).join("");

      const grandTotalEst = discrepancyData.totals.est;
      const grandTotalExec = discrepancyData.totals.exec;
      const grandTotalDiff = discrepancyData.totals.diff;

      const topCategorySummary = `
        <div style="margin-bottom: 20px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
          <div style="border: 1.5px solid #93c5fd; background: #eff6ff; border-radius: 8px; padding: 10px 14px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <span style="font-weight: 900; color: #1e40af; font-size: 11.5px;">🔹 ردیف‌های پایه فهرست بها</span>
              <span style="background: #fff; color: #1e40af; font-weight: 900; font-size: 10px; padding: 1px 8px; border-radius: 4px; border: 1px solid #bfdbfe;">
                ${totalNormalCount.toLocaleString("fa-IR")} ردیف
              </span>
            </div>
            <div style="font-size: 10px; color: #334155; line-height: 1.6;">
              <div>برآورد: <b>${Math.round(totalNormalEst).toLocaleString("fa-IR")}</b> ریال</div>
              <div>اجرا: <b>${Math.round(totalNormalExec).toLocaleString("fa-IR")}</b> ریال</div>
              <div style="color: ${totalNormalExec - totalNormalEst >= 0 ? "#15803d" : "#b91c1c"}; font-weight: bold;">
                اختلاف: ${totalNormalExec - totalNormalEst >= 0 ? "+" : ""}${Math.round(totalNormalExec - totalNormalEst).toLocaleString("fa-IR")} ریال
              </div>
            </div>
          </div>

          <div style="border: 1.5px solid #f59e0b; background: #fffbeb; border-radius: 8px; padding: 10px 14px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <span style="font-weight: 900; color: #92400e; font-size: 11.5px;">⭐ ردیف‌های ستاره‌دار</span>
              <span style="background: #fff; color: #92400e; font-weight: 900; font-size: 10px; padding: 1px 8px; border-radius: 4px; border: 1px solid #fde68a;">
                ${totalStarredCount.toLocaleString("fa-IR")} ردیف
              </span>
            </div>
            <div style="font-size: 10px; color: #334155; line-height: 1.6;">
              <div>برآورد: <b>${Math.round(totalStarredEst).toLocaleString("fa-IR")}</b> ریال</div>
              <div>اجرا: <b>${Math.round(totalStarredExec).toLocaleString("fa-IR")}</b> ریال</div>
              <div style="color: ${totalStarredExec - totalStarredEst >= 0 ? "#15803d" : "#b91c1c"}; font-weight: bold;">
                اختلاف: ${totalStarredExec - totalStarredEst >= 0 ? "+" : ""}${Math.round(totalStarredExec - totalStarredEst).toLocaleString("fa-IR")} ریال
              </div>
            </div>
          </div>

          <div style="border: 1.5px solid #a855f7; background: #faf5ff; border-radius: 8px; padding: 10px 14px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <span style="font-weight: 900; color: #6b21a8; font-size: 11.5px;">🧾 اقلام فاکتوری و قیمت جدید</span>
              <span style="background: #fff; color: #6b21a8; font-weight: 900; font-size: 10px; padding: 1px 8px; border-radius: 4px; border: 1px solid #e9d5ff;">
                ${totalInvoiceCount.toLocaleString("fa-IR")} ردیف
              </span>
            </div>
            <div style="font-size: 10px; color: #334155; line-height: 1.6;">
              <div>برآورد: <b>${Math.round(totalInvoiceEst).toLocaleString("fa-IR")}</b> ریال</div>
              <div>اجرا: <b>${Math.round(totalInvoiceExec).toLocaleString("fa-IR")}</b> ریال</div>
              <div style="color: ${totalInvoiceExec - totalInvoiceEst >= 0 ? "#15803d" : "#b91c1c"}; font-weight: bold;">
                اختلاف: ${totalInvoiceExec - totalInvoiceEst >= 0 ? "+" : ""}${Math.round(totalInvoiceExec - totalInvoiceEst).toLocaleString("fa-IR")} ریال
              </div>
            </div>
          </div>
        </div>
      `;

      const grandSummaryCard = `
        <div style="margin-top: 25px; border: 2px solid #1e293b; background: #0f172a; color: #fff; border-radius: 10px; padding: 15px 20px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <h3 style="margin: 0; font-size: 14px; font-weight: 900; color: #facc15;">جمع‌بندی کل کنترل مغایرت مقادیر (تمامی فهارس بها)</h3>
              <p style="margin: 4px 0 0 0; font-size: 10px; color: #94a3b8;">شامل کلیه ردیف‌های پایه، ستاره‌دار ⭐ و اقلام فاکتوری 🧾</p>
            </div>
            <div style="display: flex; gap: 15px; text-align: center;">
              <div style="background: rgba(255,255,255,0.1); padding: 8px 12px; border-radius: 6px;">
                <div style="font-size: 9.5px; color: #cbd5e1;">مجموع کل برآورد</div>
                <div style="font-size: 12px; font-weight: 900;">${Math.round(grandTotalEst).toLocaleString("fa-IR")} ریال</div>
              </div>
              <div style="background: rgba(255,255,255,0.1); padding: 8px 12px; border-radius: 6px;">
                <div style="font-size: 9.5px; color: #cbd5e1;">مجموع کل اجرا</div>
                <div style="font-size: 12px; font-weight: 900;">${Math.round(grandTotalExec).toLocaleString("fa-IR")} ریال</div>
              </div>
              <div style="background: #f59e0b; color: #0f172a; padding: 8px 14px; border-radius: 6px; font-weight: 900;">
                <div style="font-size: 9.5px;">خالص اختلاف کل پیمان</div>
                <div style="font-size: 12px; direction: ltr;">${grandTotalDiff > 0 ? "+" : ""}${Math.round(grandTotalDiff).toLocaleString("fa-IR")} ریال</div>
              </div>
            </div>
          </div>
        </div>
      `;

      title = `گزارش کنترل مغایرت رسمی پروژه ${projectTitle}`;
      contentHtml = `
        ${renderProjectHeader("گزارش رسمی کنترل مغایرت مقادیر و احجام (تفکیک بهای پایه، ستاره‌دار و فاکتوری)")}
        ${topCategorySummary}
        ${tablesHtml}
        ${grandSummaryCard}
      `;
    } else {
      // Fallback for list reports
      title = `گزارش ${activeTab === "minutes" ? "صورت‌جلسات" : activeTab === "estimate" ? "برآوردها" : activeTab === ("variation" as any) ? "تغییر مقادیر" : activeTab === ("permits" as any) ? "مجوزها" : "اقلام منتخب"}`;
      contentHtml = `
          ${renderProjectHeader(`لیست ${title} پروژه`)}
          <p style="text-align: center; margin-top: 50px; color: #64748b;">در حال تهیه گزارش تفصیلی... لطفا از بخش‌های اختصاصی اقدام نمایید.</p>
        `;
    }

     // Determine role key from user title and organization
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

    // Resolve digital signature boxes for printing & report preview
    const getRoleSignatory = (roleKey: string, customData?: any) => {
      const users = SystemAdminService.getUsers();
      const proj = currentProject as any;
      const targetObj = customData || reportContextData || data || {};
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
          
          const nonSigningActions = ['REASSIGN', 'REJECT', 'RETURN_TO_CONTRACTOR', 'RETURN_TO_CONSULTANT'];
          if (nonSigningActions.includes(e.action)) return false;

          const actorUser = users.find(u => u.id === e.actorUserId || u.fullName === e.actorName || u.username === e.actorName);
          const orgId = e.actorOrgId || actorUser?.orgId;
          const orgType = e.actorOrgType || (actorUser as any)?.orgType || (orgId ? SystemAdminService.getOrganization(orgId)?.type : undefined);

          const isConsultantOrg = orgType === OrganizationType.CONSULTANT || (proj?.consultantOrgId && String(orgId) === String(proj.consultantOrgId));
          const isEmployerOrg = orgType === OrganizationType.EMPLOYER || (proj?.employerOrgId && String(orgId) === String(proj.employerOrgId));
          const isContractorOrg = !isConsultantOrg && !isEmployerOrg;

          if ((e.action === 'RESUBMIT' || e.action === 'SUBMIT') && !isContractorOrg) return false;

          if (e.roleKey) {
            if (e.roleKey === targetRoleKey) return true;
            if (targetRoleKey === 'permit_expert' && e.roleKey === 'contractor_tech') return true;
            if (targetRoleKey === 'permit_head' && e.roleKey === 'contractor_head') return true;
            if (targetRoleKey === 'permit_site' && e.roleKey === 'contractor_site') return true;
            if (targetRoleKey === 'permit_consultant' && e.roleKey === 'consultant') return true;
            return false;
          }

          const title = ((e.actorTitle || actorUser?.jobTitle || e.actorName || '') + ' ' + (actorUser?.jobLevel || '')).toLowerCase();

          if (targetRoleKey === 'contractor_tech' || targetRoleKey === 'permit_expert') {
            if (e.action === 'CREATE' || e.action === 'SUBMIT' || e.action === 'RESUBMIT') {
              if (title.includes('سرپرست واحد') || title.includes('سرپرست کارگاه') || title.includes('مدیر پروژه') || title.includes('رئیس کارگاه')) return false;
              return true;
            }
            if (e.action === 'SIGN' || e.action === 'REPORT_SIGNATURE') {
              if (!isContractorOrg) return false;
              if (title.includes('سرپرست واحد') || title.includes('سرپرست کارگاه') || title.includes('مدیر پروژه') || title.includes('رئیس کارگاه')) return false;
              return title.includes('کارشناس') || title.includes('دفتر فنی') || title.includes('تهیه') || title.includes('عضو');
            }
            return false;
          }

          if (targetRoleKey === 'contractor_head' || targetRoleKey === 'permit_head') {
            if (e.action === 'APPROVE' && e.fromStatus === WorkflowStatus.DRAFT) return true;
            if (e.action === 'SIGN' || e.action === 'REPORT_SIGNATURE') {
              if (!isContractorOrg) return false;
              if (title.includes('سرپرست کارگاه') || title.includes('مدیر پروژه') || title.includes('رئیس کارگاه')) return false;
              return title.includes('سرپرست واحد') || title.includes('سرپرست دفتر') || title.includes('رئیس دفتر') || title.includes('مدیر دفتر');
            }
            return false;
          }

          if (targetRoleKey === 'contractor_site' || targetRoleKey === 'permit_site') {
            if (e.action === 'SEND_TO_CONSULTANT' || (e.action === 'APPROVE' && e.toStatus === WorkflowStatus.APPROVED_INTERNAL)) return true;
            if (e.action === 'SIGN' || e.action === 'REPORT_SIGNATURE') {
              if (!isContractorOrg) return false;
              return title.includes('سرپرست کارگاه') || title.includes('مدیر پروژه') || title.includes('رئیس کارگاه') || title.includes('مدیر کارگاه');
            }
            return false;
          }

          if (targetRoleKey === 'consultant_tech') {
            if (e.roleKey === 'consultant_tech') return true;
            if (e.action === 'APPROVE' || e.action === 'SIGN' || e.action === 'REPORT_SIGNATURE') {
              if (!isConsultantOrg) return false;
              if (title.includes('سرپرست واحد') || title.includes('سرپرست گروه') || title.includes('سرپرست نظارت') || title.includes('مدیر پروژه') || title.includes('سرپرست کارگاه') || title.includes('مدیر نظارت') || title.includes('رئیس کارگاه')) return false;
              return title.includes('کارشناس') || title.includes('ناظر') || title.includes('مقیم') || title.includes('دفتر فنی');
            }
            return false;
          }

          if (targetRoleKey === 'consultant_head') {
            if (e.roleKey === 'consultant_head') return true;
            if (e.action === 'APPROVE' || e.action === 'SIGN' || e.action === 'REPORT_SIGNATURE' || e.action === 'SEND_TO_EMPLOYER') {
              if (!isConsultantOrg) return false;
              if (title.includes('سرپرست نظارت') || title.includes('مدیر پروژه') || title.includes('سرپرست کارگاه') || title.includes('مدیر نظارت') || title.includes('رئیس کارگاه')) return false;
              return title.includes('سرپرست واحد') || title.includes('سرپرست گروه') || title.includes('رئیس گروه') || title.includes('مدیر واحد') || title.includes('سرپرست دفتر') || title.includes('رئیس دفتر');
            }
            return false;
          }

          if (targetRoleKey === 'consultant' || targetRoleKey === 'permit_consultant') {
            if (e.action === 'SEND_TO_EMPLOYER' || (e.action === 'APPROVE' && e.toStatus === WorkflowStatus.APPROVED_BY_CONSULTANT)) return true;
            if (e.action === 'SIGN' || e.action === 'REPORT_SIGNATURE') {
              return isConsultantOrg || title.includes('مشاور') || title.includes('ناظر') || title.includes('نظارت');
            }
            return false;
          }

          if (targetRoleKey === 'employer_tech') {
            if (e.roleKey === 'employer_tech') return true;
            if (e.action === 'APPROVE' || e.action === 'SIGN' || e.action === 'REPORT_SIGNATURE') {
              if (!isEmployerOrg && !title.includes('کارفرما')) return false;
              if (title.includes('سرپرست واحد') || title.includes('مدیر گروه') || title.includes('مدیر طرح') || title.includes('نماینده') || title.includes('سرپرست کارگاه') || title.includes('مدیر پروژه') || title.includes('رئیس اداره') || title.includes('رئیس کارگاه')) return false;
              return title.includes('کارشناس') || title.includes('بررسی') || title.includes('فنی');
            }
            return false;
          }

          if (targetRoleKey === 'employer_head') {
            if (e.roleKey === 'employer_head') return true;
            if (e.action === 'APPROVE' || e.action === 'SIGN' || e.action === 'REPORT_SIGNATURE' || e.action === 'FINAL_APPROVE' || e.action === 'RETURN_TO_CONSULTANT' || e.action === 'REASSIGN') {
              if (!isEmployerOrg && !title.includes('کارفرما')) return false;
              if (title.includes('مدیر طرح') || title.includes('نماینده') || title.includes('مدیر پروژه') || title.includes('سرپرست کارگاه') || title.includes('رئیس کارگاه')) return false;
              return title.includes('سرپرست واحد') || title.includes('مدیر گروه') || title.includes('رئیس اداره') || title.includes('سرپرست گروه') || title.includes('مدیر واحد');
            }
            return false;
          }

          if (targetRoleKey === 'employer' || targetRoleKey === 'employer_site') {
            if (e.roleKey === 'employer' || e.roleKey === 'employer_site') return true;
            if (e.action === 'FINAL_APPROVE' || e.action === 'APPROVE' || e.action === 'SIGN' || e.action === 'REPORT_SIGNATURE' || e.action === 'RETURN_TO_CONSULTANT' || e.action === 'REASSIGN') {
              if (isEmployerOrg) {
                if (title.includes('کارشناس') && !title.includes('مدیر') && !title.includes('سرپرست') && !title.includes('نماینده')) return false;
                if (title.includes('سرپرست واحد') || title.includes('مدیر گروه') || title.includes('رئیس اداره')) return false;
                return true;
              }
              return title.includes('کارفرما') || title.includes('مدیر طرح') || title.includes('مجری') || title.includes('سرپرست کارگاه') || title.includes('مدیر پروژه') || title.includes('نماینده');
            }
            return false;
          }

          return false;
        };

        return [...history].reverse().find(e => matchEvent(e));
      };

      const matchedEv = findEventForRole(roleKey);
      if (matchedEv && matchedEv.signature) {
        return {
          name: matchedEv.actorName || 'امضاء کننده گزارش',
          title: matchedEv.actorTitle || 'امضاء الکترونیکی',
          signature: matchedEv.signature,
          date: new Date(matchedEv.timestamp).toLocaleDateString('fa-IR')
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
      if (roleKey === 'consultant' || roleKey === 'permit_consultant') {
        return { name: 'سرپرست نظارت / مدیر پروژه مشاور', title: 'دستگاه نظارت و مشاور', signature: undefined, date: undefined };
      }
      if (roleKey === 'employer_tech') {
        return { name: 'کارشناس / بررسی‌کننده', title: 'دستگاه اجرایی و کارفرما', signature: undefined, date: undefined };
      }
      if (roleKey === 'employer_head') {
        return { name: 'سرپرست واحد / مدیر گروه', title: 'دستگاه اجرایی و کارفرما', signature: undefined, date: undefined };
      }
      if (roleKey === 'employer') {
        return { name: 'مدیر طرح / نماینده کارفرما', title: 'دستگاه اجرایی و کارفرما', signature: undefined, date: undefined };
      }

      return null;
    };

    const renderPrintSignatureBox = (roleHeader: string, roleKey: string) => {
      const signatory = getRoleSignatory(roleKey);
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

    const currProjForPrint = projects.find(p => p.id === selectedProjectId);
    const techLogos = SystemAdminService.getProjectOrgLogos(currProjForPrint);
    const techLogoHtml = [
      techLogos.employerLogo ? `<img src="${techLogos.employerLogo}" style="height: 40px; max-width: 90px; object-fit: contain;" alt="کارفرما" />` : '',
      techLogos.consultantLogo ? `<img src="${techLogos.consultantLogo}" style="height: 40px; max-width: 90px; object-fit: contain;" alt="مشاور" />` : '',
      techLogos.contractorLogo ? `<img src="${techLogos.contractorLogo}" style="height: 40px; max-width: 90px; object-fit: contain;" alt="پیمانکار" />` : ''
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
              ${techLogoHtml || '<div class="logo-box"></div>'}
              <h1 style="margin: 0; color: #1e40af; font-size: 22px;">سامانه مدیریت پروژه همیار</h1>
            </div>
            <div style="text-align: left; font-size: 11px;">
              <p style="margin: 0;">تاریخ چاپ: ${new Date().toLocaleDateString("fa-IR")}</p>
              <p style="margin: 0;">نسخه: ۱.۴.۰</p>
            </div>
          </div>
          <div class="content">
            ${contentHtml}
          </div>
          <div class="footer">
            <div style="display: flex; flex-direction: row; justify-content: space-between; gap: 6px; width: 100%; box-sizing: border-box;">
              <!-- 1. پیمانکار -->
              <div style="flex: 1 1 0%; min-width: 0; border: 1px solid #93c5fd; background: #eff6ff; border-radius: 6px; padding: 4px; box-sizing: border-box;">
                <div style="font-weight: bold; font-size: 9px; color: #1e40af; text-align: center; border-bottom: 1px solid #bfdbfe; padding-bottom: 2px; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  پیمانکار: ${(currentProject as any)?.contractorName || 'سازمان پیمانکار'}
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
                  مشاور: ${(currentProject as any)?.consultantName || 'دستگاه نظارت و مشاور'}
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
                  کارفرما: ${(currentProject as any)?.employerName || 'دستگاه اجرایی و کارفرما'}
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

  const handleVariationUnlockSubmit = () => {
    if (!variationUnlockItem || !variationReason.trim() || !currentUser) return;

    try {
      // Step 1: Create Variation Request (SUBMITTED)
      const newVariation: FreezeVariationRequest = {
        id: typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : 'req-' + Math.random().toString(36).substr(2, 9),
        parentRecordId: variationUnlockItem.id,
        reason: variationReason,
        createdById: currentUser.id,
        createdAt: Date.now(),
        status: "SUBMITTED",
      };

      const newVariations = [...freezeVariations, newVariation];
      setFreezeVariations(newVariations);
      localStorage.setItem(
        "hamyar_freeze_variations",
        JSON.stringify(newVariations),
      );

      setVariationUnlockModalOpen(false);
      setVariationUnlockItem(null);
      setVariationReason("");
      setToast({ message: "درخواست ابلاغیه تغییرات با موفقیت ثبت شد", type: "success" });
    } catch (error: any) {
      setToast({ message: "خطا: " + error.message, type: "error" });
    }
  };

  const handleApproveVariationUnlock = (
    item: ProjectMinute | Statement,
    variation: FreezeVariationRequest,
  ) => {
    if (!currentUser) return;
    try {
      // Step 2: Approve Variation and Unfreeze
      const updatedItem = WorkflowService.performAction(
        item,
        "UNFREEZE_BY_VARIATION",
        currentUser,
        { comment: variation.reason },
      );

      if ("startDate" in updatedItem) {
        const newStatements = statements.map((s) =>
          s.id === updatedItem.id ? (updatedItem as Statement) : s,
        );
        setStatements(newStatements);
        localStorage.setItem(
          "hamyar_statements",
          JSON.stringify(newStatements),
        );
      } else {
        const newMinutes = minutes.map((m) =>
          m.id === updatedItem.id ? (updatedItem as ProjectMinute) : m,
        );
        setMinutes(newMinutes);
        localStorage.setItem("hamyar_minutes", JSON.stringify(newMinutes));
      }

      // Update Variation Status
      const newVariations = freezeVariations.map((v) =>
        v.id === variation.id ? { ...v, status: "APPROVED" as const } : v,
      );
      setFreezeVariations(newVariations);
      localStorage.setItem(
        "hamyar_freeze_variations",
        JSON.stringify(newVariations),
      );
      setToast({ message: "ابلاغیه تغییرات با موفقیت تایید و قفل سند باز شد", type: "success" });
    } catch (error: any) {
      setToast({ message: "خطا: " + error.message, type: "error" });
    }
  };


  useEffect(() => {
    if (currentUser) {
      setNotifications(
        NotificationService.getUserNotifications(currentUser.id).filter(
          (n) => n.module !== "COMMUNICATIONS" && n.module !== "EXECUTION"
        ),
      );
    }
  }, [currentUser]);

  // Listen for notification updates
  useEffect(() => {
    const handleNotificationUpdate = () => {
      if (currentUser) {
        setNotifications(
          NotificationService.getUserNotifications(currentUser.id).filter(
            (n) => n.module !== "COMMUNICATIONS" && n.module !== "EXECUTION"
          ),
        );
        setUnreadRecordIds(NotificationService.getUnreadRecordIds(currentUser.id));
      }
    };
    window.addEventListener("notification-updated", handleNotificationUpdate);
    return () =>
      window.removeEventListener(
        "notification-updated",
        handleNotificationUpdate,
      );
  }, [currentUser]);

  const [unreadRecordIds, setUnreadRecordIds] = useState<Set<string>>(() => {
    return currentUser ? NotificationService.getUnreadRecordIds(currentUser.id) : new Set();
  });

  const handleRecordRowClick = (recordId: string) => {
    if (currentUser && unreadRecordIds.has(String(recordId))) {
      NotificationService.markRecordAsRead(String(recordId), currentUser.id);
      setUnreadRecordIds((prev) => {
        const next = new Set(prev);
        next.delete(String(recordId));
        return next;
      });
    }
  };

  // Listen for project change event and CBS contracts/nodes updates
  useEffect(() => {
    const handleProjectChanged = (e?: Event) => {
      const customEvent = e as CustomEvent<{ projectId: string }>;
      const newProjId = customEvent?.detail?.projectId || localStorage.getItem("hamyar_selected_project_id");
      if (newProjId) {
        setSelectedProjectId(newProjId);
      }
    };

    const handleCbsUpdate = () => {
      try {
        const loadedNodes = JSON.parse(localStorage.getItem('hamyar_cbs_nodes') || '[]');
        setCbsNodes(Array.isArray(loadedNodes) ? loadedNodes : []);
      } catch (err) {
        setCbsNodes([]);
      }
      try {
        const loadedEst = JSON.parse(localStorage.getItem('hamyar_estimates') || '[]');
        setEstimates(Array.isArray(loadedEst) ? loadedEst : []);
      } catch (err) {
        setEstimates([]);
      }
      try {
        const loadedProjs = JSON.parse(localStorage.getItem('hamyar_projects') || '[]');
        if (Array.isArray(loadedProjs)) {
          const cleaned = loadedProjs.filter((p: any) => p.id !== '2' && !String(p.title || '').includes('تصفیه‌خانه مرکزی') && !String(p.title || '').includes('تسویه خانه مرکزی') && !String(p.title || '').includes('نیایش'));
          setProjects(cleaned.length > 0 ? cleaned : MOCK_PROJECTS);
        }
      } catch (err) {}
    };

    window.addEventListener("project-changed", handleProjectChanged);
    window.addEventListener("cbs-nodes-updated", handleCbsUpdate);
    window.addEventListener("cbs-contracts-updated", handleCbsUpdate);
    window.addEventListener("estimates-updated", handleCbsUpdate);
    window.addEventListener("wbs-updated", handleCbsUpdate);
    window.addEventListener("storage", handleCbsUpdate);

    return () => {
      window.removeEventListener("project-changed", handleProjectChanged);
      window.removeEventListener("cbs-nodes-updated", handleCbsUpdate);
      window.removeEventListener("cbs-contracts-updated", handleCbsUpdate);
      window.removeEventListener("estimates-updated", handleCbsUpdate);
      window.removeEventListener("wbs-updated", handleCbsUpdate);
      window.removeEventListener("storage", handleCbsUpdate);
    };
  }, []);

  // Listen for global notification clicks
  useEffect(() => {
    const handleGlobalClick = (e: Event) => {
      const customEvent = e as CustomEvent<Notification>;
      if (customEvent.detail && customEvent.detail.module !== "COMMUNICATIONS" && customEvent.detail.module !== "EXECUTION") {
        handleNotificationClick(customEvent.detail);
      }
    };
    window.addEventListener("hamyar-notification-clicked", handleGlobalClick);
    return () => {
      window.removeEventListener("hamyar-notification-clicked", handleGlobalClick);
    };
  }, [minutes, statements, currentUser, mrsList, mivList]);

  // Handle URL Deep Links on Load
  useEffect(() => {
    if (currentUser) {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab");
      const recordId = params.get("recordId");
      const projectId = params.get("projectId");

      if (tab && recordId) {
        if (
          projectId &&
          currentUser.projectIds &&
          !currentUser.projectIds.includes(projectId)
        ) {
          alert("دسترسی به این پروژه برای شما مجاز نیست.");
          return;
        }

        const hasAccess = SystemAdminService.checkPermission(
          currentUser.id,
          ModuleId.TECHNICAL_OFFICE,
          "view",
        );
        if (!hasAccess) {
          alert("دسترسی به این بخش برای شما مجاز نیست.");
          return;
        }

        if (projectId) setSelectedProjectId(projectId);
        setEditingId(null);
        setActiveTab(tab as any);

        if (tab === "materials") {
          if (mrsList.some((m) => String(m.id) === String(recordId))) {
            setMaterialSubTab("MRS");
          } else if (mivList.some((m) => String(m.id) === String(recordId))) {
            setMaterialSubTab("MIV");
          }
        }

        setHighlightedRecordId(recordId);

        // Scroll into view
        setTimeout(() => {
          const el = document.getElementById(`record-${recordId}`);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }, 200);

        // Remove highlight after 3.5 seconds
        setTimeout(() => {
          setHighlightedRecordId(null);
          window.history.replaceState({}, "", window.location.pathname);
        }, 3500);
      }
    }
  }, [currentUser, minutes, statements, mrsList, mivList]);

  const handleNotificationClick = (notification: Notification) => {
    // Access Gate
    if (currentUser) {
      if (
        notification.projectId &&
        currentUser.projectIds &&
        !currentUser.projectIds.includes(notification.projectId)
      ) {
        NotificationService.markAsRead(notification.id);
        alert("دسترسی به این پروژه برای شما مجاز نیست.");
        return;
      }
      const hasAccess = SystemAdminService.checkPermission(
        currentUser.id,
        ModuleId.TECHNICAL_OFFICE,
        "view",
      );
      if (!hasAccess) {
        NotificationService.markAsRead(notification.id);
        alert("دسترسی به این بخش برای شما مجاز نیست.");
        return;
      }
    }

    const mod = (notification.module || "").toUpperCase();
    let tabName = "minutes";
    if (mod === "MINUTES") tabName = "minutes";
    else if (mod === "STATEMENTS") tabName = "statements";
    else if (mod === "PERMITS") tabName = "permits";
    else if (mod === "VARIATIONS") tabName = "variation";
    else if (mod === "ESTIMATES") tabName = "estimate";
    else if (mod === "ADJUSTMENT") tabName = "adjustment";
    else if (mod === "MATERIALS") {
      tabName = "materials";
      const recId = notification.recordId;
      if (mrsList.some((m) => String(m.id) === String(recId))) {
        setMaterialSubTab("MRS");
      } else if (mivList.some((m) => String(m.id) === String(recId))) {
        setMaterialSubTab("MIV");
      }
    }

    // Mark as read and clear unread state
    NotificationService.markAsRead(notification.id);
    if (notification.recordId && currentUser) {
      NotificationService.markRecordAsRead(notification.recordId, currentUser.id);
      setUnreadRecordIds((prev) => {
        const next = new Set(prev);
        next.delete(String(notification.recordId));
        return next;
      });
    }
    setShowNotifications(false);

    // Update URL
    const newUrl = `/technical-office?tab=${tabName}&recordId=${notification.recordId}&projectId=${notification.projectId}`;
    window.history.pushState({}, "", newUrl);

    // Update State: Ensure we are in list view and NOT in edit form
    if (notification.projectId) {
      setSelectedProjectId(notification.projectId);
    }
    setEditingId(null);
    setActiveTab(tabName as any);
    setHighlightedRecordId(notification.recordId);

    // Scroll into view
    setTimeout(() => {
      const el = document.getElementById(`record-${notification.recordId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 200);

    // Remove highlight after 3.5 seconds
    setTimeout(() => {
      setHighlightedRecordId(null);
      window.history.replaceState({}, "", window.location.pathname);
    }, 3500);
  };

  const handleMarkAllRead = () => {
    if (currentUser) {
      notifications.forEach((n) => {
        if (n.status === "UNREAD") {
          NotificationService.markAsRead(n.id);
        }
      });
    }
  };

  // Form states
  const [estForm, setEstForm] = useState<Partial<EstimateItem>>({
    itemType: "NORMAL",
    independentCoefficient: 1,
  });
  const [minForm, setMinForm] = useState<Partial<ProjectMinute>>({});
  const [stmtForm, setStmtForm] = useState<Partial<Statement>>({
    selectedMinuteIds: [],
  });
  const [permitForm, setPermitForm] = useState<Partial<WorkPermit>>({});

  // MRS Form containing nested items
  const [mrsForm, setMrsForm] = useState<Partial<MrsRecord>>({});

  // MIV Form
  const [mivForm, setMivForm] = useState<Partial<MivRecord>>({});

  // Variation Form & Logic
  const [variationForm, setVariationForm] = useState<Partial<VariationOrder>>(
    {},
  );
  const [expandedVariationCodes, setExpandedVariationCodes] = useState<
    Record<string, boolean>
  >({});
  const [variationRoleView, setVariationRoleView] = useState<
    "CONTRACTOR" | "CONSULTANT" | "EMPLOYER"
  >("CONTRACTOR");

  // Variation - New Item Logic
  const [variationNewItem, setVariationNewItem] = useState<
    Partial<VariationItem>
  >({
    itemType: "NORMAL",
    independentCoefficient: 1,
    originalQty: 0,
    contractorQty: 0,
    unitPrice: 0,
    originalWeightFactor: 0,
    weightFactor: 0,
    contractorWeightFactor: 0,
    consultantWeightFactor: 0,
    employerWeightFactor: 0,
  });
  const [variationSearchQuery, setVariationSearchQuery] = useState("");
  const [variationSearchResults, setVariationSearchResults] = useState<
    PriceListItem[]
  >([]);
  const [showVariationDropdown, setShowVariationDropdown] = useState(false);

  const [permitActiveRoleTab, setPermitActiveRoleTab] = useState<
    "contractor" | "consultant" | "employer"
  >("contractor");

  // Multi-row Metre Form State
  const [metreRowsForm, setMetreRowsForm] = useState<
    (Partial<MetreRow> & {
      isSearching?: boolean;
      searchResults?: PriceListItem[];
    })[]
  >([
    {
      id: Math.random().toString(36).substr(2, 9),
      count: 1,
      length: 1,
      width: 1,
      height: 1,
      multiplier: 1,
      partialTotal: 0,
      itemType: "NORMAL",
      independentCoefficient: 1,
      unitPrice: 0,
    },
  ]);
  const [metreMinuteId, setMetreMinuteId] = useState<string>("");
  const [estSearchQuery, setEstSearchQuery] = useState("");
  const [estSearchResults, setEstSearchResults] = useState<PriceListItem[]>([]);
  const [showEstDropdown, setShowEstDropdown] = useState(false);
  const [estPlFilter, setEstPlFilter] = useState<string>("all");
  const [variationPlFilter, setVariationPlFilter] = useState<string>("all");

  // Persist data changes to localStorage automatically
  useEffect(() => {
    localStorage.setItem("hamyar_estimates", JSON.stringify(estimates));
  }, [estimates]);
  useEffect(() => {
    localStorage.setItem("hamyar_minutes", JSON.stringify(minutes));
  }, [minutes]);
  useEffect(() => {
    localStorage.setItem("hamyar_metres", JSON.stringify(metres));
  }, [metres]);
  useEffect(() => {
    localStorage.setItem("hamyar_statements", JSON.stringify(statements));
  }, [statements]);
  useEffect(() => {
    localStorage.setItem("hamyar_permits", JSON.stringify(workPermits));
  }, [workPermits]);
  useEffect(() => {
    localStorage.setItem("hamyar_mrs", JSON.stringify(mrsList));
  }, [mrsList]);
  useEffect(() => {
    localStorage.setItem("hamyar_mivs", JSON.stringify(mivList));
  }, [mivList]);
  useEffect(() => {
    localStorage.setItem("hamyar_variations", JSON.stringify(variations));
  }, [variations]);
  useEffect(() => {
    localStorage.setItem("hamyar_adjustments", JSON.stringify(adjustments));
  }, [adjustments]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const currentProject = projects.find((p) => p.id === selectedProjectId);

  // --- Helper to Generate Next Sequence Number ---
  const getNextNumber = (list: any[], field: string = "number") => {
    const projItems = list.filter((i) => i.projectId === selectedProjectId);
    if (projItems.length === 0) return "01";

    const max = projItems.reduce((acc, curr) => {
      let valStr = String(curr[field] || "");
      // Convert Persian/Arabic digits to English digits
      const persianDigits = [/۰/g, /۱/g, /۲/g, /۳/g, /۴/g, /۵/g, /۶/g, /۷/g, /۸/g, /۹/g];
      const arabicDigits = [/٠/g, /١/g, /٢/g, /٣/g, /٤/g, /٥/g, /٦/g, /٧/g, /٨/g, /٩/g];
      for (let i = 0; i < 10; i++) {
        valStr = valStr.replace(persianDigits[i], String(i)).replace(arabicDigits[i], String(i));
      }
      const num = parseInt(valStr.replace(/[^0-9]/g, ""), 10) || 0;
      return Math.max(acc, num);
    }, 0);

    return (max + 1).toString().padStart(2, "0");
  };

  const printReportOfficial = () => {
    const element = document.getElementById("report-modal-content");
    if (!element) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const currProj = projects.find(p => p.id === selectedProjectId);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="fa" dir="rtl">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>گزارش رسمی و سند فنی مهندسی - ${currProj?.title || "پروژه"}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <script>
            tailwind.config = {
              theme: {
                extend: {
                  colors: {
                    sand: {
                      50: '#fdfcf9',
                      100: '#f7f4ee',
                      200: '#efe8db',
                      300: '#e3d6c1',
                      400: '#d1be9f',
                      500: '#b79e78',
                      600: '#9e815e',
                      700: '#82684b',
                      800: '#6b533c',
                      900: '#564230',
                    },
                    gold: {
                      300: '#ffd875',
                      400: '#ffc745',
                      500: '#f5b528',
                      600: '#da9917',
                    },
                    taupe: {
                      50: '#faf7f2',
                      100: '#f4efe7',
                      200: '#e5dcd0',
                      300: '#ccbeaf',
                      400: '#b4a392',
                      500: '#a39381',
                      600: '#8c7d6b',
                      700: '#736556',
                      800: '#5d5144',
                      900: '#463c32',
                    }
                  },
                  borderRadius: {
                    '2xl': '1rem',
                    '3xl': '1.5rem',
                    '4xl': '2rem',
                  }
                }
              }
            }
          </script>
          <link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@100;300;400;500;600;700;800;900&display=swap" rel="stylesheet">
          <style>
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
              box-sizing: border-box !important;
            }
            html, body { 
              font-family: 'Vazirmatn', 'Tahoma', 'Segoe UI', Arial, sans-serif !important; 
              color: #1e293b; 
              background-color: #ffffff !important;
              line-height: 1.4; 
              direction: rtl !important; 
              text-align: right !important;
              margin: 0 !important;
              padding: 0 !important;
              width: 100% !important;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 3px solid #1e40af;
              padding-bottom: 8px;
              margin-bottom: 12px;
            }
            .logo-section {
              display: flex;
              align-items: center;
              gap: 10px;
            }
            .logo-box {
              width: 36px;
              height: 36px;
              background: #1e40af;
              border-radius: 6px;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-weight: 900;
              font-size: 18px;
            }
            .project-bar {
              display: flex;
              justify-content: space-between;
              align-items: center;
              background-color: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 6px;
              padding: 6px 12px;
              font-size: 11px;
              margin-bottom: 12px;
            }
            .page-break-inside-avoid {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            @media print {
              body {
                padding: 0 !important;
                margin: 0 !important;
                background: #ffffff !important;
              }
              .no-print {
                display: none !important;
              }
              @page {
                size: A4 landscape;
                margin: 8mm;
              }
            }
          </style>
        </head>
        <body class="bg-white text-stone-900 selection:bg-gold-400">
          <div class="p-4 max-w-full mx-auto" style="direction: rtl;">
            <!-- Official Standard System Header -->
            <div class="header">
              <div class="logo-section">
                <div class="logo-box">H</div>
                <div>
                  <h1 style="margin: 0; color: #1e40af; font-size: 20px; font-weight: 900;">سامانه مدیریت پروژه همیار</h1>
                  <div style="font-size: 11px; color: #64748b; font-weight: bold; margin-top: 2px;">گزارش رسمی و سند فنی و مهندسی - دفتر فنی و نظارت</div>
                </div>
              </div>
              <div style="text-align: left; font-size: 11px; color: #334155; line-height: 1.5;">
                <p style="margin: 0;"><strong>تاریخ چاپ:</strong> ${new Date().toLocaleDateString("fa-IR")}</p>
                <p style="margin: 0;"><strong>نسخه:</strong> ۱.۴.۰</p>
                ${currProj?.contractNumber ? `<p style="margin: 0;"><strong>شماره پیمان:</strong> ${currProj.contractNumber}</p>` : ''}
              </div>
            </div>

            <!-- Project Details Summary Bar -->
            <div class="project-bar">
              <div><strong>نام پروژه:</strong> ${currProj?.title || "پروژه در دست اقدام"}</div>
              <div><strong>کارفرما:</strong> ${currProj?.employerName || "دستگاه اجرایی و کارفرما"}</div>
              <div><strong>مشاور:</strong> ${currProj?.consultantName || "دستگاه نظارت و مشاور"}</div>
              <div><strong>پیمانکار:</strong> ${currProj?.contractorName || "سازمان پیمانکار"}</div>
            </div>

            <!-- Report Body -->
            <div>
              ${element.innerHTML}
            </div>

            <!-- Footer Note -->
            <div style="margin-top: 14px; text-align: center; font-size: 9px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 5px; display: flex; justify-content: space-between;">
              <span>سند رسمی تولید شده توسط سامانه مدیریت پروژه همیار - معتبر با امضاهای الکترونیکی ارکان پروژه</span>
              <span>صفحه ۱ از ۱</span>
            </div>
          </div>
          <script>
            window.onload = function() {
              setTimeout(() => {
                window.print();
                window.close();
              }, 400);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // --- Material Balance Logic ---
  const getMaterialBalance = useCallback(() => {
    const balanceMap = new Map<
      string,
      { in: number; out: number; unit: string; type: string }
    >();

    // Process MRS (In)
    mrsList
      .filter(
        (m) =>
          m.projectId === selectedProjectId &&
          (WorkflowService.getStatus(m) === WorkflowStatus.APPROVED_INTERNAL ||
            WorkflowService.getStatus(m) ===
              WorkflowStatus.APPROVED_BY_CONSULTANT),
      )
      .forEach((rec) => {
        rec.items.forEach((item) => {
          const name = item.materialName.trim();
          if (!balanceMap.has(name))
            balanceMap.set(name, {
              in: 0,
              out: 0,
              unit: item.unit,
              type: item.materialType,
            });
          const current = balanceMap.get(name)!;
          current.in += item.quantity;
        });
      });

    // Process MIV (Out)
    mivList
      .filter(
        (m) =>
          m.projectId === selectedProjectId &&
          (WorkflowService.getStatus(m) === WorkflowStatus.APPROVED_INTERNAL ||
            WorkflowService.getStatus(m) ===
              WorkflowStatus.APPROVED_BY_CONSULTANT),
      )
      .forEach((rec) => {
        rec.items.forEach((item) => {
          const name = item.materialName.trim();
          if (balanceMap.has(name)) {
            const current = balanceMap.get(name)!;
            current.out += item.quantity;
          } else {
            balanceMap.set(name, {
              in: 0,
              out: item.quantity,
              unit: item.unit,
              type: item.materialType || "",
            });
          }
        });
      });

    return Array.from(balanceMap.entries()).map(([name, val]) => ({
      materialName: name,
      totalIn: val.in,
      totalOut: val.out,
      remaining: val.in - val.out,
      unit: val.unit,
      materialType: val.type,
    }));
  }, [mrsList, mivList, selectedProjectId]);

  const availableMaterialNames = useMemo(() => {
    const names = new Set<string>();
    mrsList
      .filter((m) => m.projectId === selectedProjectId)
      .forEach((r) => r.items.forEach((i) => names.add(i.materialName)));
    return Array.from(names);
  }, [mrsList, selectedProjectId]);

  // --- Coefficient Logic ---
  const getMultipliers = useCallback(
    (
      itemCode: string,
      itemType: ItemType = "NORMAL",
      independentCoef: number = 1,
    ) => {
      if (itemType === "STARRED" || itemType === "INVOICE") {
        return { total: independentCoef || 1 };
      }
      if (!currentProject || !currentProject.coefficients) return { total: 1 };
      const c = currentProject.coefficients;
      let base =
        (c.regional || 1) *
        (c.overhead || 1) *
        (c.contractor || 1) *
        (c.equipment || 1) *
        (c.others || 1);
      c.generalCoefficients?.forEach((gc) => (base *= gc.value || 1));
      const chapterPart = (itemCode || "").substring(0, 2);
      const chapterMatch = c.chapterCoefficients?.find(
        (cc) => cc.chapterCode === chapterPart,
      );
      const chapterCoeff = chapterMatch ? chapterMatch.multiplier : 1;
      return { total: base * chapterCoeff };
    },
    [currentProject],
  );

  const getUnitPrice = useCallback(
    (code: string) => {
      const est = estimates.find(
        (e) => e.code === code && e.projectId === selectedProjectId,
      );
      if (est) return est.unitPrice;
      if (currentProject?.priceLists) {
        for (const pl of currentProject.priceLists) {
          const item = pl.items?.find((i) => i.code === code);
          if (item) return item.price;
        }
      }
      return 0;
    },
    [estimates, selectedProjectId, currentProject],
  );

  const getRowEffectivePrice = useCallback(
    (row: MetreRow | Partial<MetreRow>) => {
      if (
        (row.itemType === "STARRED" || row.itemType === "INVOICE") &&
        row.unitPrice !== undefined &&
        row.unitPrice !== 0
      ) {
        return row.unitPrice;
      }
      return getUnitPrice(row.itemCode || "");
    },
    [getUnitPrice],
  );

  const getMinuteTotals = useCallback(
    (minuteId: string) => {
      const associatedMetres = metres.filter(
        (m) => m.minuteId === minuteId && m.projectId === selectedProjectId,
      );
      let raw = 0;
      let withCoeff = 0;
      let contractorRaw = 0;
      let contractorWithCoeff = 0;
      let consultantRaw = 0;
      let consultantWithCoeff = 0;
      let employerRaw = 0;
      let employerWithCoeff = 0;

      associatedMetres.forEach((m) => {
        const up = getRowEffectivePrice(m);
        const mult = getMultipliers(
          m.itemCode,
          m.itemType,
          m.independentCoefficient,
        ).total;

        const cQty = m.contractorTotal !== undefined ? m.contractorTotal : m.partialTotal;
        const consQty = m.consultantTotal !== undefined ? m.consultantTotal : cQty;
        const empQty = m.employerTotal !== undefined ? m.employerTotal : consQty;

        const lineRaw = m.partialTotal * up;
        const cRaw = cQty * up;
        const consRaw = consQty * up;
        const empRaw = empQty * up;

        raw += lineRaw;
        withCoeff += lineRaw * mult;

        contractorRaw += cRaw;
        contractorWithCoeff += cRaw * mult;

        consultantRaw += consRaw;
        consultantWithCoeff += consRaw * mult;

        employerRaw += empRaw;
        employerWithCoeff += empRaw * mult;
      });

      return {
        raw,
        withCoeff,
        contractorRaw,
        contractorWithCoeff,
        consultantRaw,
        consultantWithCoeff,
        employerRaw,
        employerWithCoeff,
        items: associatedMetres,
      };
    },
    [metres, selectedProjectId, getRowEffectivePrice, getMultipliers],
  );

  const getCumulativeMinuteIdsForStatement = useCallback(
    (statement: Statement) => {
      if (!statement) return [];
      const currentNum = parsePersianInt(statement.number);
      const projStmts = statements.filter(
        (s) => s.projectId === statement.projectId,
      );

      const minuteIdsSet = new Set<string>();
      projStmts.forEach((s) => {
        const num = parsePersianInt(s.number);
        if (num <= currentNum) {
          (s.selectedMinuteIds || []).forEach((id) => minuteIdsSet.add(id));
        }
      });

      if (statement.selectedMinuteIds && statement.selectedMinuteIds.length > 0) {
        statement.selectedMinuteIds.forEach((id) => minuteIdsSet.add(id));
      }

      if (minuteIdsSet.size === 0) {
        let projectMinutes = minutes.filter(
          (m) => m.projectId === statement.projectId && m.isFinalFrozen,
        );
        if (projectMinutes.length === 0) {
          projectMinutes = minutes.filter(
            (m) => m.projectId === statement.projectId,
          );
        }
        projectMinutes.forEach((m) => minuteIdsSet.add(m.id));
      }

      return Array.from(minuteIdsSet);
    },
    [statements, minutes],
  );

  const getStatementTotals = useCallback(
    (statement: Statement) => {
      let totalRaw = 0;
      let totalCoeff = 0;
      let contractorTotalRaw = 0;
      let contractorTotalCoeff = 0;
      let consultantTotalRaw = 0;
      let consultantTotalCoeff = 0;
      let employerTotalRaw = 0;
      let employerTotalCoeff = 0;
      const includedMinutes: ProjectMinute[] = [];
      if (!statement)
        return {
          totalRaw,
          totalCoeff,
          contractorTotalRaw,
          contractorTotalCoeff,
          consultantTotalRaw,
          consultantTotalCoeff,
          employerTotalRaw,
          employerTotalCoeff,
          includedMinutes,
        };

      const isCBS = currentProject?.contractType === "CBS";
      const minIds = getCumulativeMinuteIdsForStatement(statement);
      minIds.forEach((mid) => {
        const min = minutes.find((m) => m.id === mid);
        if (min) {
          const isApproved =
            min.isFinalFrozen ||
            WorkflowService.getStatus(min) === WorkflowStatus.APPROVED_INTERNAL ||
            WorkflowService.getStatus(min) ===
              WorkflowStatus.APPROVED_BY_CONSULTANT ||
            (min.status as any) === ("APPROVED" as any);

          if (isCBS || isApproved) {
            includedMinutes.push(min);
            const t = getMinuteTotals(min.id);
            totalRaw += t.raw;
            totalCoeff += t.withCoeff;
            contractorTotalRaw += t.contractorRaw;
            contractorTotalCoeff += t.contractorWithCoeff;
            consultantTotalRaw += t.consultantRaw;
            consultantTotalCoeff += t.consultantWithCoeff;
            employerTotalRaw += t.employerRaw;
            employerTotalCoeff += t.employerWithCoeff;
          }
        }
      });
      return {
        totalRaw,
        totalCoeff,
        contractorTotalRaw,
        contractorTotalCoeff,
        consultantTotalRaw,
        consultantTotalCoeff,
        employerTotalRaw,
        employerTotalCoeff,
        includedMinutes,
      };
    },
    [minutes, getMinuteTotals, getCumulativeMinuteIdsForStatement, currentProject],
  );

  // --- Financial Calculations for Statements (Previous, Current, Cumulative) ---
  const getStatementFinancials = useCallback(
    (currentStmt: Statement) => {
      if (!currentStmt)
        return {
          previous: 0,
          current: 0,
          cumulative: 0,
          contractor: { previous: 0, current: 0, cumulative: 0 },
          consultant: { previous: 0, current: 0, cumulative: 0 },
          employer: { previous: 0, current: 0, cumulative: 0 },
          prevStmt: null,
        };

      const projectStmts = statements.filter(
        (s) => s.projectId === selectedProjectId,
      );
      const sortedStmts = [...projectStmts].sort((a, b) => {
        const numA = parsePersianInt(a.number);
        const numB = parsePersianInt(b.number);
        return numA - numB;
      });

      const currentNum = parsePersianInt(currentStmt.number);

      let prevStmt: Statement | null = null;

      for (const s of sortedStmts) {
        const sNum = parsePersianInt(s.number);
        if (sNum < currentNum) {
          prevStmt = s;
        }
      }

      const currTotals = getStatementTotals(currentStmt);
      const prevTotals = prevStmt ? getStatementTotals(prevStmt) : null;

      const cumulative = currTotals.totalCoeff;
      const previous = prevTotals ? prevTotals.totalCoeff : 0;
      const current = cumulative - previous;

      const contractorCumulative = currTotals.contractorTotalCoeff;
      const contractorPrevious = prevTotals ? prevTotals.contractorTotalCoeff : 0;
      const contractorCurrent = contractorCumulative - contractorPrevious;

      const consultantCumulative = currTotals.consultantTotalCoeff;
      const consultantPrevious = prevTotals ? prevTotals.consultantTotalCoeff : 0;
      const consultantCurrent = consultantCumulative - consultantPrevious;

      const employerCumulative = currTotals.employerTotalCoeff;
      const employerPrevious = prevTotals ? prevTotals.employerTotalCoeff : 0;
      const employerCurrent = employerCumulative - employerPrevious;

      return {
        previous,
        current,
        cumulative,
        contractor: {
          previous: contractorPrevious,
          current: contractorCurrent,
          cumulative: contractorCumulative,
        },
        consultant: {
          previous: consultantPrevious,
          current: consultantCurrent,
          cumulative: consultantCumulative,
        },
        employer: {
          previous: employerPrevious,
          current: employerCurrent,
          cumulative: employerCumulative,
        },
        prevStmt,
      };
    },
    [statements, selectedProjectId, getStatementTotals],
  );

  // --- Helper: Get aggregated items for a statement ---
  const getStatementItems = useCallback(
    (statement: Statement) => {
      const itemMap = new Map<
        string,
        {
          code: string;
          desc: string;
          unit: string;
          unitPrice?: number;
          qty: number;
          rawAmnt: number;
          coeffAmnt: number;
          contractorQty: number;
          contractorRawAmnt: number;
          contractorCoeffAmnt: number;
          consultantQty: number;
          consultantRawAmnt: number;
          consultantCoeffAmnt: number;
          employerQty: number;
          employerRawAmnt: number;
          employerCoeffAmnt: number;
          priceListId?: string;
        }
      >();

      if (!statement) return [];

      const isCBS = currentProject?.contractType === "CBS";
      const minIds = getCumulativeMinuteIdsForStatement(statement);

      minIds.forEach((minId) => {
        const min = minutes.find((m) => m.id === minId);
        if (!isCBS && min) {
          const isApproved =
            min.isFinalFrozen ||
            WorkflowService.getStatus(min) === WorkflowStatus.APPROVED_INTERNAL ||
            WorkflowService.getStatus(min) ===
              WorkflowStatus.APPROVED_BY_CONSULTANT ||
            (min.status as any) === ("APPROVED" as any);
          if (!isApproved) return;
        }

        const associatedMetres = metres.filter(
          (m) => m.minuteId === minId && m.projectId === selectedProjectId,
        );
        associatedMetres.forEach((m) => {
          const up = getRowEffectivePrice(m);
          const multipliers = getMultipliers(
            m.itemCode,
            m.itemType,
            m.independentCoefficient,
          );
          const lineRaw = m.partialTotal * up;
          const lineCoeff = lineRaw * multipliers.total;

          const cQty =
            m.contractorTotal !== undefined ? m.contractorTotal : m.partialTotal;
          const consQty =
            m.consultantTotal !== undefined ? m.consultantTotal : cQty;
          const empQty =
            m.employerTotal !== undefined ? m.employerTotal : consQty;

          const cRaw = cQty * up;
          const cCoeff = cRaw * multipliers.total;

          const consRaw = consQty * up;
          const consCoeff = consRaw * multipliers.total;

          const empRaw = empQty * up;
          const empCoeff = empRaw * multipliers.total;

          const itemKey = `${m.priceListId || 'default'}_${m.itemCode}`;
          if (itemMap.has(itemKey)) {
            const exist = itemMap.get(itemKey)!;
            exist.qty += m.partialTotal;
            exist.rawAmnt += lineRaw;
            exist.coeffAmnt += lineCoeff;

            exist.contractorQty += cQty;
            exist.contractorRawAmnt += cRaw;
            exist.contractorCoeffAmnt += cCoeff;

            exist.consultantQty += consQty;
            exist.consultantRawAmnt += consRaw;
            exist.consultantCoeffAmnt += consCoeff;

            exist.employerQty += empQty;
            exist.employerRawAmnt += empRaw;
            exist.employerCoeffAmnt += empCoeff;
            if (!exist.unitPrice && up > 0) {
              exist.unitPrice = up;
            }
          } else {
            itemMap.set(itemKey, {
              code: m.itemCode,
              desc: m.description,
              unit: m.unit || "",
              unitPrice: up,
              qty: m.partialTotal,
              rawAmnt: lineRaw,
              coeffAmnt: lineCoeff,
              contractorQty: cQty,
              contractorRawAmnt: cRaw,
              contractorCoeffAmnt: cCoeff,
              consultantQty: consQty,
              consultantRawAmnt: consRaw,
              consultantCoeffAmnt: consCoeff,
              employerQty: empQty,
              employerRawAmnt: empRaw,
              employerCoeffAmnt: empCoeff,
              priceListId: m.priceListId,
            });
          }
        });
      });
      return Array.from(itemMap.values());
    },
    [metres, minutes, selectedProjectId, getRowEffectivePrice, getMultipliers, getCumulativeMinuteIdsForStatement, currentProject],
  );

  const renderStatementReportHeader = (
    reportTitle: string,
    statement: Statement,
  ) => (
    <div className="border border-stone-700 bg-white p-5 rounded-xl text-stone-800 shadow-sm mb-6 text-right">
      <div className="flex justify-between items-center border-b border-stone-400 pb-3 mb-4">
        <div className="w-1/3 text-right">
          <p className="font-bold text-[10px] text-stone-500">
            جمهوری اسلامی ایران
          </p>
          <p className="font-bold text-xs mt-0.5 text-stone-700">
            {currentProject?.employerName || "دستگاه اجرایی / کارفرما"}
          </p>
        </div>
        <div className="w-1/3 text-center">
          <h2 className="text-base font-black text-stone-950">{reportTitle}</h2>
          <p className="text-[10px] font-bold text-amber-700 mt-1 bg-[#faf8f4] px-3 py-1 rounded-full inline-block border border-amber-200">
            دفتر فنی پروژه
          </p>
        </div>
        <div
          className="w-1/3 text-left font-mono text-[9px] text-stone-500 space-y-0.5"
          dir="rtl"
        >
          <p>تاریخ تنظیم: {new Date().toLocaleDateString("fa-IR")}</p>
          <p>صورت‌وضعیت شماره: {statement?.number || "---"}</p>
          <p>صفحه: ۱ از ۱</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-y-2 gap-x-4 text-[10.5px] font-medium text-stone-600">
        <div>
          <strong>پروژه / پیمان:</strong>{" "}
          <span className="text-stone-900 font-bold">
            {currentProject?.title || "---"}
          </span>
        </div>
        <div>
          <strong>شماره پیمان:</strong>{" "}
          <span className="text-stone-900 font-mono font-bold">
            {currentProject?.contractNumber || "---"}
          </span>
        </div>
        <div>
          <strong>مشاور پروژه:</strong>{" "}
          <span className="text-stone-900">
            {currentProject?.consultantName || "---"}
          </span>
        </div>
        <div>
          <strong>پیمانکار:</strong>{" "}
          <span className="text-stone-900 font-bold">
            {currentProject?.contractorName || "---"}
          </span>
        </div>
        <div>
          <strong>شماره صورت‌وضعیت:</strong>{" "}
          <span className="text-amber-700 font-bold">{statement?.number || "---"}</span>
        </div>
        <div>
          <strong>دوره کارکرد:</strong>{" "}
          <span className="text-stone-900">
            {statement?.startDate || "---"} الی {statement?.endDate || "---"}
          </span>
        </div>
        <div>
          <strong>تاریخ ثبت سند:</strong>{" "}
          <span className="text-stone-900">{statement?.date || "---"}</span>
        </div>
        <div>
          <strong>وضعیت سند:</strong>{" "}
          <span className="text-emerald-700 font-bold">
            {statement ? WorkflowService.getStatusLabel(statement) : "---"}
          </span>
        </div>
      </div>
    </div>
  );

  // --- Comparison Logic ---
  const getStatementComparison = useCallback(
    (currentStmt: Statement) => {
      const { prevStmt } = getStatementFinancials(currentStmt);

      const currentItems = getStatementItems(currentStmt);
      const prevItems = prevStmt ? getStatementItems(prevStmt) : [];

      const allCodes = new Set([
        ...currentItems.map((i) => i.code),
        ...prevItems.map((i) => i.code),
      ]);
      const comparisonRows = [];

      let totalDiffAmount = 0;

      for (const code of allCodes) {
        const curr = currentItems.find((i) => i.code === code) || {
          code,
          desc: "",
          unit: "",
          qty: 0,
          rawAmnt: 0,
          coeffAmnt: 0,
          priceListId: undefined,
        };
        const prev = prevItems.find((i) => i.code === code) || {
          code,
          desc: "",
          unit: "",
          qty: 0,
          rawAmnt: 0,
          coeffAmnt: 0,
          priceListId: undefined,
        };

        const diffQty = curr.qty - prev.qty;
        const diffAmount = curr.coeffAmnt - prev.coeffAmnt;

        if (Math.abs(diffQty) > 0.001 || Math.abs(diffAmount) > 1) {
          totalDiffAmount += diffAmount;
          comparisonRows.push({
            code,
            desc: curr.desc || prev.desc,
            unit: curr.unit || prev.unit,
            prevQty: prev.qty,
            currQty: curr.qty,
            diffQty,
            prevAmnt: prev.coeffAmnt,
            currAmnt: curr.coeffAmnt,
            diffAmnt: diffAmount,
            priceListId: curr.priceListId || prev.priceListId,
          });
        }
      }

      return { rows: comparisonRows, totalDiffAmount, prevStmt };
    },
    [getStatementFinancials, getStatementItems],
  );

  const searchPriceList = (query: string, plIdFilter?: string): PriceListItem[] => {
    if (!currentProject?.priceLists || query.length < 2) return [];
    
    const qClean = cleanCode(query).toLowerCase();
    const qRaw = query.toLowerCase();

    const filteredPriceLists = plIdFilter && plIdFilter !== "all"
      ? currentProject.priceLists.filter(pl => pl.id === plIdFilter || pl.title === plIdFilter)
      : currentProject.priceLists;

    const allItems = filteredPriceLists.flatMap((pl) => 
      (pl.items || []).map(item => ({ ...item, priceListId: pl.id, priceListTitle: pl.title }))
    );
    const fromPriceList = allItems.filter(
      (i) =>
        cleanCode(i.code).includes(qClean) ||
        i.description.toLowerCase().includes(qRaw),
    );

    const fromEstimates = estimates
      .filter(
        (e) => {
          const isProj = String(e.projectId) === String(selectedProjectId);
          const isPl = !plIdFilter || plIdFilter === "all" || e.priceListId === plIdFilter;
          const matchCode = cleanCode(e.code).includes(qClean) || e.description.toLowerCase().includes(qRaw);
          return isProj && isPl && matchCode;
        }
      )
      .map((e) => ({
        code: e.code,
        description: e.description,
        unit: e.unit,
        price: e.unitPrice,
        priceListId: e.priceListId,
      }));

    // Combine and remove duplicates based on code
    const combined = [...fromEstimates, ...fromPriceList];
    const seen = new Set();
    return combined
      .filter((item) => {
        const key = cleanCode(item.code);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 15);
  };

  const handleEstCodeSearch = (q: string) => {
    setEstForm((prev) => ({ ...prev, code: q }));
    if (q.length >= 2) {
      setEstSearchResults(searchPriceList(q, estPlFilter));
      setShowEstDropdown(true);
    } else {
      setShowEstDropdown(false);
    }
  };
  const selectEstItem = (item: PriceListItem) => {
    setEstForm((prev) => ({
      ...prev,
      code: item.code,
      description: item.description,
      unit: item.unit,
      unitPrice: item.price,
      priceListId: item.priceListId || prev.priceListId,
    }));
    if (item.priceListId) {
      setEstPlFilter(item.priceListId);
    }
    setShowEstDropdown(false);
  };

  // Variation Item Search
  const handleVariationItemSearch = (q: string) => {
    setVariationSearchQuery(q);
    setVariationNewItem((prev) => ({ ...prev, code: q }));
    if (q.length >= 2) {
      if (currentProject?.contractType === "CBS") {
        const results = cbsNodes
          .filter(
            (n) =>
              String(n.projectId) === String(selectedProjectId) &&
              (n.code.includes(q) || n.title.includes(q)),
          )
          .map((n) => ({
            code: n.code,
            description: n.title,
            unit: n.unit || "---",
            price: n.unitPrice || (n.budget / (n.quantity || 1)) || 0,
            priceListId: "CBS",
          }));
        setVariationSearchResults(results as any);
        setShowVariationDropdown(true);
      } else {
        setVariationSearchResults(searchPriceList(q, variationPlFilter));
        setShowVariationDropdown(true);
      }
    } else {
      setShowVariationDropdown(false);
    }
  };
  const selectVariationSearchItem = (item: PriceListItem) => {
    // Try to find in existing estimates or CBS nodes to get original values
    let origQty = 0;
    let origWeight = 0;

    if (currentProject?.contractType === "CBS") {
      const node = cbsNodes.find(n => (cleanCode(n.code) === cleanCode(item.code) || n.code === item.code) && String(n.projectId) === String(selectedProjectId));
      if (node) {
        origQty = node.quantity || 0;
        origWeight = node.weightPercent || 0;
      }
    } else {
      const est = estimates.find(e => cleanCode(e.code) === cleanCode(item.code) && String(e.projectId) === String(selectedProjectId));
      if (est) {
        origQty = est.quantity || 0;
        origWeight = est.weightPercent || 0;
      }
    }

    setVariationNewItem((prev) => ({
      ...prev,
      code: item.code,
      description: item.description,
      unit: item.unit,
      unitPrice: item.price,
      priceListId: item.priceListId || prev.priceListId,
      originalQty: origQty,
      originalWeightFactor: origWeight,
      weightFactor: origWeight, // Default new weight to original weight
      contractorWeightFactor: origWeight,
      consultantWeightFactor: origWeight,
      employerWeightFactor: origWeight,
    }));
    if (item.priceListId) {
      setVariationPlFilter(item.priceListId);
    }
    setShowVariationDropdown(false);
  };

  const findPriceListItem = (code: string, priceListId?: string) => {
    if (!code) return null;
    
    const normalizedCode = cleanCode(code);
    if (!normalizedCode) return null;

    const stripZeros = (s: string) => s.replace(/^0+/, "") || "0";
    const strippedCode = stripZeros(normalizedCode);

    // 1. Search in current project estimates first (highest priority)
    const est = estimates.find((e) => {
      const ec = cleanCode(e.code);
      const isProj = String(e.projectId) === String(selectedProjectId);
      const isPl = !priceListId || priceListId === "all" || e.priceListId === priceListId;
      if (ec === normalizedCode)
        return isProj && isPl;
      return (
        ec &&
        stripZeros(ec) === strippedCode &&
        isProj &&
        isPl
      );
    });
    if (est)
      return {
        description: est.description,
        unit: est.unit,
        price: est.unitPrice,
      };

    // 2. Search in current project's price lists
    if (currentProject?.priceLists) {
      const filteredPls = priceListId && priceListId !== "all"
        ? currentProject.priceLists.filter(pl => pl.id === priceListId || pl.title === priceListId)
        : currentProject.priceLists;
      for (const pl of filteredPls) {
        if (!pl.items) continue;
        const item = pl.items.find((i) => {
          const ic = cleanCode(i.code);
          if (ic === normalizedCode) return true;
          return ic && stripZeros(ic) === strippedCode;
        });
        if (item)
          return {
            description: item.description,
            unit: item.unit,
            price: item.price,
          };
      }
    }

    // 3. Search in all global price lists (fallback)
    for (const pl of MOCK_PRICE_LISTS) {
      if (!pl.items) continue;
      const item = pl.items.find((i) => {
        const ic = cleanCode(i.code);
        if (ic === normalizedCode) return true;
        return ic && stripZeros(ic) === strippedCode;
      });
      if (item)
        return {
          description: item.description,
          unit: item.unit,
          price: item.price,
        };
    }

    // 4. Search in ALL estimates as a fallback
    const anyEst = estimates.find((e) => cleanCode(e.code) === normalizedCode);
    if (anyEst)
      return {
        description: anyEst.description,
        unit: anyEst.unit,
        price: anyEst.unitPrice,
      };

    // 5. Fallback: partial match in ALL estimates
    const partialEst = estimates.find((e) => cleanCode(e.code).includes(normalizedCode) || normalizedCode.includes(cleanCode(e.code)));
    if (partialEst)
      return {
        description: partialEst.description,
        unit: partialEst.unit,
        price: partialEst.unitPrice,
      };

    return null;
  };

  const handleMetreCodeSearch = (rowId: string, q: string, priceListId?: string) => {
    setMetreRowsForm((prev) =>
      prev.map((r) => {
        if (r.id === rowId) {
          const plId = priceListId !== undefined ? priceListId : r.priceListId;
          const results = searchPriceList(q, plId);
          const itemInfo = findPriceListItem(q, plId);
          
          return {
            ...r,
            itemCode: q,
            description: itemInfo ? itemInfo.description : r.description,
            unit: itemInfo ? itemInfo.unit : r.unit,
            unitPrice: itemInfo ? itemInfo.price : r.unitPrice,
            searchResults: results,
            isSearching: results.length > 0,
            priceListId: plId,
          };
        }
        return r;
      }),
    );
  };
  const selectMetreItem = (rowId: string, item: PriceListItem) => {
    setMetreRowsForm((prev) =>
      prev.map((r) => {
        if (r.id === rowId) {
          return {
            ...r,
            itemCode: item.code,
            description: item.description,
            unit: item.unit,
            unitPrice: item.price,
            isSearching: false,
            searchResults: [],
          };
        }
        return r;
      }),
    );
  };

  // Calculate discrepancy data for stats use
  // Calculate discrepancy data for stats use
  const discrepancyData = useMemo(() => {
    if (!currentProject)
      return { items: [], totals: { est: 0, exec: 0, diff: 0 } };
    const estMap = new Map<string, number>();
    const metreMap = new Map<string, number>();
    const infoMap = new Map<
      string,
      {
        desc: string;
        unit: string;
        price: number;
        type: ItemType;
        coef: number;
        priceListId?: string;
      }
    >();

    const projEstimates = estimates.filter((e) => e.projectId === selectedProjectId && !(e as any).isArchived);
    const hasFrozenEst = projEstimates.some((e) => e.isFinalFrozen);
    const baselineEstimates = hasFrozenEst
      ? projEstimates.filter((e) => e.isFinalFrozen)
      : projEstimates;

    // Helper to resolve accurate item type (NORMAL, STARRED, INVOICE)
    const resolveItemType = (
      code: string,
      explicitType?: string,
      desc?: string,
      coef?: number,
      plId?: string,
    ): ItemType => {
      const expUpper = (explicitType || "").toUpperCase();
      if (expUpper === "STARRED") return "STARRED";
      if (expUpper === "INVOICE" || expUpper === "NEW") return "INVOICE";

      // Check code for star indicators (e.g. *010101 or 010101*)
      if (code && (code.includes("*") || code.startsWith("*") || code.endsWith("*"))) {
        return "STARRED";
      }

      // Check description keywords
      const d = (desc || "").toLowerCase();
      if (
        d.includes("ستاره") ||
        d.includes("starred") ||
        d.includes("ستاره‌دار") ||
        d.includes("ستاره دار") ||
        d.includes("قیمت توافقی")
      ) {
        return "STARRED";
      }
      if (
        d.includes("فاکتور") ||
        d.includes("invoice") ||
        d.includes("فاکتوری") ||
        d.includes("قیمت جدید") ||
        d.includes("خرید مستقیم")
      ) {
        return "INVOICE";
      }

      // Check independent coefficient (> 0 and != 1 usually indicates starred/custom item)
      if (coef && coef !== 1 && coef > 0) {
        return "STARRED";
      }

      // Check in all project estimates
      const matchEst = projEstimates.find(
        (e) => cleanCode(e.code) === cleanCode(code) || e.code === code,
      );
      if (matchEst) {
        const estType = (matchEst.itemType || "").toUpperCase();
        if (estType === "STARRED") return "STARRED";
        if (estType === "INVOICE" || estType === "NEW") return "INVOICE";
        if (matchEst.independentCoefficient && matchEst.independentCoefficient !== 1) return "STARRED";
      }

      // Check in project variations
      for (const vo of variations.filter((v) => v.projectId === selectedProjectId)) {
        const vItem = vo.items?.find(
          (it) => cleanCode(it.code) === cleanCode(code) || it.code === code,
        );
        if (vItem?.itemType) {
          const vType = vItem.itemType.toUpperCase();
          if (vType === "STARRED") return "STARRED";
          if (vType === "INVOICE" || vType === "NEW") return "INVOICE";
        }
      }

      // Check in project metres
      const matchMetre = metres.find(
        (m) =>
          m.projectId === selectedProjectId &&
          (cleanCode(m.itemCode) === cleanCode(code) || m.itemCode === code) &&
          m.itemType &&
          m.itemType !== "NORMAL",
      );
      if (matchMetre?.itemType) {
        const mType = matchMetre.itemType.toUpperCase();
        if (mType === "STARRED") return "STARRED";
        if (mType === "INVOICE" || mType === "NEW") return "INVOICE";
      }

      // Check in price lists
      const plItem = findPriceListItem(code, plId);
      if (plItem) {
        if ((plItem as any).isStarred || (plItem as any).type === "STARRED" || (plItem as any).itemType === "STARRED") return "STARRED";
        if ((plItem as any).isInvoice || (plItem as any).type === "INVOICE" || (plItem as any).itemType === "INVOICE") return "INVOICE";
      }

      return "NORMAL";
    };

    // First populate infoMap from all estimates in project to ensure rich metadata
    projEstimates.forEach((e) => {
      let plId = e.priceListId;
      if (!plId && currentProject?.priceLists) {
        const foundPl = currentProject.priceLists.find((pl: any) =>
          pl.items?.some((it: any) => cleanCode(it.code) === cleanCode(e.code)),
        );
        if (foundPl) plId = foundPl.id;
      }
      const itemType = resolveItemType(e.code, e.itemType, e.description, e.independentCoefficient, plId);
      if (!infoMap.has(e.code) || itemType !== "NORMAL") {
        infoMap.set(e.code, {
          desc: e.description,
          unit: e.unit,
          price: e.unitPrice,
          type: itemType,
          coef: e.independentCoefficient || 1,
          priceListId: plId,
        });
      }
    });

    // Populate estimate quantities from baseline
    baselineEstimates.forEach((e) => {
      estMap.set(e.code, (estMap.get(e.code) || 0) + e.quantity);
    });

    // Populate metre quantities and missing metadata
    metres
      .filter(
        (m) =>
          m.projectId === selectedProjectId &&
          !(m as any).isArchived &&
          checkItemVisibility(m, "metre"),
      )
      .forEach((m) => {
        metreMap.set(
          m.itemCode,
          (metreMap.get(m.itemCode) || 0) + m.partialTotal,
        );
        let plId = m.priceListId;
        if (!plId && currentProject?.priceLists) {
          const foundPl = currentProject.priceLists.find((pl: any) =>
            pl.items?.some((it: any) => cleanCode(it.code) === cleanCode(m.itemCode)),
          );
          if (foundPl) plId = foundPl.id;
        }
        let price = getUnitPrice(m.itemCode);
        if (price === 0 && m.unitPrice) price = m.unitPrice;
        const resolvedType = resolveItemType(m.itemCode, m.itemType, m.description, m.independentCoefficient, plId);

        if (!infoMap.has(m.itemCode)) {
          infoMap.set(m.itemCode, {
            desc: m.description,
            unit: m.unit || "",
            price,
            type: resolvedType,
            coef: m.independentCoefficient || 1,
            priceListId: plId,
          });
        } else {
          // If current info is NORMAL but metre has STARRED/INVOICE, upgrade it
          const current = infoMap.get(m.itemCode)!;
          if (current.type === "NORMAL" && resolvedType !== "NORMAL") {
            infoMap.set(m.itemCode, {
              ...current,
              type: resolvedType,
            });
          }
        }
      });

    const allCodes = Array.from(
      new Set([...estMap.keys(), ...metreMap.keys()]),
    );
    let totalEst = 0;
    let totalExec = 0;
    const items = allCodes
      .map((code) => {
        const estQty = estMap.get(code) || 0;
        const execQty = metreMap.get(code) || 0;
        const diffQty = execQty - estQty;
        const info = infoMap.get(code) || {
          desc: "نامشخص",
          unit: "---",
          price: 0,
          type: resolveItemType(code),
          coef: 1,
          priceListId: undefined,
        };
        const itemType = resolveItemType(code, info.type, info.desc, info.coef, info.priceListId);
        const multipliers = getMultipliers(code, itemType, info.coef);
        const coeff = multipliers.total;
        const estRaw = estQty * info.price;
        const execRaw = execQty * info.price;
        const diffRaw = execRaw - estRaw;
        const estAmnt = estRaw * coeff;
        const execAmnt = execRaw * coeff;
        const diffAmnt = execAmnt - estAmnt;
        totalEst += estAmnt;
        totalExec += execAmnt;
        return {
          code,
          description: info.desc,
          unit: info.unit,
          price: info.price,
          itemType,
          independentCoefficient: info.coef,
          estQty,
          execQty,
          diffQty,
          estRaw,
          execRaw,
          diffRaw,
          estAmnt,
          execAmnt,
          diffAmnt,
          coeff,
          isExtra: estQty === 0,
          priceListId: info.priceListId,
        };
      })
      .filter((i) => Math.abs(i.diffQty) > 0.0001);

    return {
      items: items.sort((a, b) => b.diffAmnt - a.diffAmnt),
      totals: { est: totalEst, exec: totalExec, diff: totalExec - totalEst },
    };
  }, [
    estimates,
    metres,
    variations,
    selectedProjectId,
    currentProject,
    getUnitPrice,
    getMultipliers,
    findPriceListItem,
    checkItemVisibility,
  ]);

  const stats = useMemo(() => {
    let rawTotal = 0;
    let withCoeffTotal = 0;
    let extraStat = 0;

    if (activeTab === "estimate") {
      estimates
        .filter(
          (e) =>
            e.projectId === selectedProjectId &&
            !(e as any).isArchived &&
            checkItemVisibility(e, "estimate"),
        )
        .forEach((e) => {
          const lineRaw = e.quantity * e.unitPrice;
          rawTotal += lineRaw;
          withCoeffTotal +=
            lineRaw *
            getMultipliers(e.code, e.itemType, e.independentCoefficient).total;
        });
      extraStat = estimates.filter(
        (e) =>
          e.projectId === selectedProjectId &&
          !(e as any).isArchived &&
          checkItemVisibility(e, "estimate"),
      ).length;
    } else if (activeTab === "metre") {
      const isCBS = currentProject?.contractType === "CBS";
      const filteredMetres = metres.filter(
        (m) =>
          m.projectId === selectedProjectId &&
          !(m as any).isArchived &&
          checkItemVisibility(m, "metre"),
      );

      filteredMetres.forEach((m) => {
        if (!isCBS) {
          const parentMin = minutes.find((min) => min.id === m.minuteId);
          const isApproved =
            parentMin &&
            (parentMin.isFinalFrozen ||
              WorkflowService.getStatus(parentMin) === WorkflowStatus.APPROVED_INTERNAL ||
              WorkflowService.getStatus(parentMin) === WorkflowStatus.APPROVED_BY_CONSULTANT ||
              (parentMin.status as any) === ("APPROVED" as any));
          if (!isApproved) return;
        }
        const up = getRowEffectivePrice(m);
        const lineRaw = m.partialTotal * up;
        rawTotal += lineRaw;
        withCoeffTotal +=
          lineRaw *
          getMultipliers(m.itemCode, m.itemType, m.independentCoefficient)
            .total;
      });

      extraStat = filteredMetres.filter((m) => {
        if (isCBS) return true;
        const parentMin = minutes.find((min) => min.id === m.minuteId);
        return (
          parentMin &&
          (parentMin.isFinalFrozen ||
            WorkflowService.getStatus(parentMin) === WorkflowStatus.APPROVED_INTERNAL ||
            WorkflowService.getStatus(parentMin) === WorkflowStatus.APPROVED_BY_CONSULTANT ||
            (parentMin.status as any) === ("APPROVED" as any))
        );
      }).length;
    } else if (activeTab === "minutes") {
      const isCBS = currentProject?.contractType === "CBS";
      const filteredMinutes = minutes.filter(
        (min) =>
          min.projectId === selectedProjectId &&
          !(min as any).isArchived &&
          checkItemVisibility(min, "minute"),
      );

      filteredMinutes.forEach((min) => {
        const isApproved =
          min.isFinalFrozen ||
          WorkflowService.getStatus(min) === WorkflowStatus.APPROVED_INTERNAL ||
          WorkflowService.getStatus(min) === WorkflowStatus.APPROVED_BY_CONSULTANT ||
          (min.status as any) === ("APPROVED" as any);

        if (isCBS || isApproved) {
          const totals = getMinuteTotals(min.id);
          rawTotal += totals.raw;
          withCoeffTotal += totals.withCoeff;
        }
      });

      extraStat = filteredMinutes.filter((min) => {
        if (isCBS) return true;
        return (
          min.isFinalFrozen ||
          WorkflowService.getStatus(min) === WorkflowStatus.APPROVED_INTERNAL ||
          WorkflowService.getStatus(min) === WorkflowStatus.APPROVED_BY_CONSULTANT ||
          (min.status as any) === ("APPROVED" as any)
        );
      }).length;
    } else if (activeTab === "statements") {
      const projStatements = statements.filter(
        (s) =>
          s.projectId === selectedProjectId &&
          !(s as any).isArchived &&
          checkItemVisibility(s, "statement"),
      );

      const approvedStatements = projStatements
        .filter((s) => {
          if (s.isFinalFrozen) return true;
          const status = WorkflowService.getStatus(s);
          return (
            status === WorkflowStatus.APPROVED_INTERNAL ||
            status === WorkflowStatus.APPROVED_BY_CONSULTANT ||
            (s.status as any) === ("APPROVED" as any)
          );
        })
        .sort((a, b) => {
          const numA = parsePersianInt(a.number);
          const numB = parsePersianInt(b.number);
          return numA - numB;
        });

      if (approvedStatements.length > 0) {
        const latestApproved = approvedStatements[approvedStatements.length - 1];
        rawTotal = getStatementTotals(latestApproved).totalRaw;
        withCoeffTotal = getStatementFinancials(latestApproved).cumulative;
      } else {
        rawTotal = 0;
        withCoeffTotal = 0;
      }

      extraStat = projStatements.length;
    } else if (activeTab === "discrepancy") {
      rawTotal = discrepancyData.totals.est;
      withCoeffTotal = discrepancyData.totals.exec;
      extraStat = discrepancyData.items.filter((i) => i.diffAmnt !== 0).length;
    } else if (activeTab === ("permits" as any)) {
      rawTotal = workPermits.filter(
        (p) => p.projectId === selectedProjectId,
      ).length;
      withCoeffTotal = workPermits.filter(
        (p) =>
          p.projectId === selectedProjectId &&
          (p.status === WorkflowStatus.APPROVED_INTERNAL ||
            p.status === WorkflowStatus.APPROVED_BY_CONSULTANT),
      ).length;
      extraStat = workPermits.filter(
        (p) => p.projectId === selectedProjectId && p.status === ("OPEN" as any),
      ).length;
    } else if (activeTab === ("materials" as any)) {
      const projectMrs = mrsList.filter(
        (m) => m.projectId === selectedProjectId,
      );
      const projectMiv = mivList.filter(
        (m) => m.projectId === selectedProjectId,
      );
      if (materialSubTab === "MRS") {
        rawTotal = projectMrs.length;
        withCoeffTotal = projectMrs.filter(
          (m) =>
            m.status === WorkflowStatus.APPROVED_INTERNAL ||
            m.status === WorkflowStatus.APPROVED_BY_CONSULTANT,
        ).length;
        extraStat = projectMrs.filter(
          (m) => m.status === "REJECTED" || m.status === ("PENDING" as any),
        ).length;
      } else if (materialSubTab === "MIV") {
        rawTotal = projectMiv.length;
        withCoeffTotal = projectMiv.filter(
          (m) =>
            m.status === WorkflowStatus.APPROVED_INTERNAL ||
            m.status === WorkflowStatus.APPROVED_BY_CONSULTANT,
        ).length;
        extraStat = projectMiv.filter((m) => m.status === ("PENDING" as any)).length;
      } else {
        // Balance Tab Stats Logic
        if (!searchTerm.trim()) {
          rawTotal = 0;
          withCoeffTotal = 0;
          extraStat = 0;
        } else {
          const bal = getMaterialBalance().filter(
            (i) =>
              i.materialName.toLowerCase().includes(searchTerm.toLowerCase()) ||
              i.materialType.toLowerCase().includes(searchTerm.toLowerCase()),
          );
          rawTotal = bal.reduce((s, i) => s + i.totalIn, 0);
          withCoeffTotal = bal.reduce((s, i) => s + i.totalOut, 0);
          extraStat = bal.reduce((s, i) => s + i.remaining, 0);
        }
      }
    } else if (activeTab === ("variation" as any)) {
      const projVariations = variations.filter(
        (v) => v.projectId === selectedProjectId,
      );
      rawTotal = projVariations.length;
      withCoeffTotal = projVariations.filter(
        (v) =>
          v.status === WorkflowStatus.APPROVED_INTERNAL ||
          v.status === WorkflowStatus.APPROVED_BY_CONSULTANT ||
          v.status === ("APPROVED" as any),
      ).length;

      const isCBS = currentProject?.contractType?.toUpperCase() === "CBS";

      extraStat = projVariations
        .filter(
          (v) =>
            v.status === WorkflowStatus.APPROVED_INTERNAL ||
            v.status === WorkflowStatus.APPROVED_BY_CONSULTANT ||
            v.status === ("APPROVED" as any),
        )
        .reduce((acc, v) => {
          const vTotal = (v.items || []).reduce((s, i) => {
            let origQty = i.originalQty;
            let unitPrice = i.unitPrice;

            if (isCBS) {
              if (origQty === undefined || origQty === null || origQty === 0 || String(origQty) === "0") {
                const cNode = cbsNodes.find(n => (cleanCode(n.code) === cleanCode(i.code) || n.code === i.code) && String(n.projectId) === String(selectedProjectId));
                origQty = cNode ? (cNode.quantity || 0) : 0;
              }
              if (unitPrice === undefined || unitPrice === null || unitPrice === 0 || String(unitPrice) === "0") {
                const cNode = cbsNodes.find(n => (cleanCode(n.code) === cleanCode(i.code) || n.code === i.code) && String(n.projectId) === String(selectedProjectId));
                if (cNode) {
                  unitPrice = cNode.unitPrice || (cNode.quantity ? (cNode.budget / cNode.quantity) : cNode.budget) || 0;
                } else {
                  unitPrice = 0;
                }
              }
            } else {
              if (origQty === undefined || origQty === null || origQty === 0) {
                const eNode = estimates.find(e => cleanCode(e.code) === cleanCode(i.code) && String(e.projectId) === String(selectedProjectId));
                origQty = eNode ? (eNode.quantity || 0) : 0;
              }
              if (unitPrice === undefined || unitPrice === null || unitPrice === 0) {
                const eNode = estimates.find(e => cleanCode(e.code) === cleanCode(i.code) && String(e.projectId) === String(selectedProjectId));
                unitPrice = eNode ? (eNode.unitPrice || 0) : 0;
              }
            }

            const finalEmployerQty = i.employerQty ?? i.consultantQty ?? i.contractorQty ?? origQty ?? 0;
            const diff = finalEmployerQty - (origQty ?? 0);
            const mult = isCBS ? 1 : (getMultipliers(
              i.code,
              i.itemType,
              i.independentCoefficient,
            ).total || 1);

            const itemDiffTotal = diff * (unitPrice ?? 0) * mult;
            return s + (isNaN(itemDiffTotal) ? 0 : itemDiffTotal);
          }, 0);
          return acc + (isNaN(vTotal) ? 0 : vTotal);
        }, 0);
    }

    return { rawTotal, withCoeffTotal, extraStat };
  }, [
    activeTab,
    materialSubTab,
    estimates,
    metres,
    minutes,
    statements,
    workPermits,
    mrsList,
    mivList,
    variations,
    selectedProjectId,
    getMultipliers,
    getUnitPrice,
    getRowEffectivePrice,
    getMinuteTotals,
    getStatementTotals,
    getStatementFinancials,
    discrepancyData,
    getMaterialBalance,
    searchTerm,
    checkItemVisibility,
  ]);

  const getStatsLabels = () => {
    switch (activeTab) {
      case "estimate":
        return {
          raw: "مبلغ خام برآورد",
          coeff: "مبلغ با ضرایب",
          extra: "تعداد ردیف‌ها",
          unit: "ریال",
        };
      case "minutes":
        return {
          raw: "مبلغ خام صورت‌جلسات",
          coeff: "مبلغ تایید شده",
          extra: "تعداد صورت‌جلسات",
          unit: "ریال",
        };
      case "metre":
        return {
          raw: "مبلغ خام ریزمتره",
          coeff: "مبلغ با ضرایب",
          extra: "تعداد ردیف‌ها",
          unit: "ریال",
        };
      case "statements":
        return {
          raw: "کارکرد خام تجمعی",
          coeff: "کارکرد تایید شده",
          extra: "تعداد صورت‌وضعیت‌ها",
          unit: "ریال",
        };
      case "permits":
        return {
          raw: "کل درخواست‌ها",
          coeff: "مجوزهای صادره",
          extra: "در انتظار تایید",
          unit: "عدد",
        };
      case "materials":
        if (materialSubTab === "MRS")
          return {
            raw: "تعداد کل قبوض (وارده)",
            coeff: "قبوض تایید شده",
            extra: "در جریان / رد شده",
            unit: "عدد",
          };
        if (materialSubTab === "MIV")
          return {
            raw: "تعداد کل حواله‌ها (خروجی)",
            coeff: "حواله تایید شده",
            extra: "در جریان",
            unit: "عدد",
          };
        return {
          raw: "مجموع وارده (کل)",
          coeff: "مجموع مصرفی (کل)",
          extra: "موجودی پای کار (فعلی)",
          unit: "واحد",
        };
      case "discrepancy":
        return {
          raw: "مبلغ برآورد (مبنا)",
          coeff: "مبلغ اجرا (فعلی)",
          extra: "آیتم‌های دارای مغایرت",
          unit: "ریال",
        };
      case "variation":
        return {
          raw: "تعداد دستورکارها",
          coeff: "مصوب شده",
          extra: "تغییر ریالی کل (مصوب)",
          unit: "عدد",
        };
      default:
        return {
          raw: "مجموع مقادیر خام",
          coeff: "مجموع با ضرایب",
          extra: "موارد باز",
          unit: "ریال / عدد",
        };
    }
  };

  const statLabels = getStatsLabels();

  const handleCloseModal = () => {
    // 1. If we are in Metre sub-tab but came from a Statement sub-edit, just return to Statement modal
    if (activeTab === "metre" && returnToStatementId) {
      setActiveTab("statements");
      setEditingId(returnToStatementId);
      setReturnToStatementId(null);
      setReturnToTab(null);
      return;
    }

    if (activeTab === "metre" && returnToTab) {
      setActiveTab(returnToTab as any);
      setReturnToTab(null);
      setIsModalOpen(false);
      setEditingId(null);
      return;
    }

    // 2. Rollback logic for DUPLICATE action (only if we are closing the creation modal of THAT specific item)
    if (tempDuplicatedIds) {
      if (editingId === tempDuplicatedIds.stmtId) {
        setStatements((prev) =>
          prev.filter((s) => s.id !== tempDuplicatedIds.stmtId),
        );
        setMinutes((prev) =>
          prev.filter((m) => !tempDuplicatedIds.minuteIds.includes(m.id)),
        );
        setMetres((prev) =>
          prev.filter((m) => !tempDuplicatedIds.metreIds.includes(m.id)),
        );
      }
      // Always clear the transaction flag on close
      setTempDuplicatedIds(null);
    }

    setIsModalOpen(false);
    setEditingId(null);
    setIsEditingFullMinute(false);
    setReturnToStatementId(null);
  };

  const initializeVariationForm = (vo?: VariationOrder) => {
    setVariationNewItem({
      itemType: "NORMAL",
      independentCoefficient: 1,
      originalQty: 0,
      contractorQty: 0,
      unitPrice: 0,
    }); // Reset add item form

    const userOrg = currentUser?.orgId
      ? SystemAdminService.getOrganization(currentUser.orgId)
      : null;
    const userOrgType = userOrg?.type;

    if (userOrgType === OrganizationType.CONSULTANT) {
      setVariationRoleView("CONSULTANT");
    } else if (userOrgType === OrganizationType.EMPLOYER) {
      setVariationRoleView("EMPLOYER");
    } else {
      setVariationRoleView("CONTRACTOR");
    }

    if (vo) {
      setVariationForm(JSON.parse(JSON.stringify(vo)));
    } else {
      let items: VariationItem[] = [];

      if (currentProject?.contractType === "CBS") {
        const projectNodes = cbsNodes.filter(
          (n) => String(n.projectId) === String(selectedProjectId),
        );
        items = projectNodes.map((n) => ({
          code: n.code,
          description: n.title,
          unit: n.unit || "---",
          unitPrice: n.unitPrice || (n.budget / (n.quantity || 1)) || 0,
          itemType: "NORMAL",
          independentCoefficient: 1,
          originalQty: n.quantity || 0,
          originalWeightFactor: n.weightPercent || 0,
          weightFactor: n.weightPercent || 0,
        }));
      } else {
        const currentEstimates = estimates.filter(
          (e) => e.projectId === selectedProjectId && e.isFinalFrozen === true,
        );
        items = currentEstimates.map((e) => ({
          code: e.code,
          description: e.description,
          unit: e.unit,
          unitPrice: e.unitPrice,
          itemType: e.itemType || "NORMAL",
          independentCoefficient: e.independentCoefficient || 1,
          originalQty: e.quantity,
          originalWeightFactor: e.weightPercent || 0,
          weightFactor: e.weightPercent || 0,
          priceListId: e.priceListId,
        }));
      }

      setVariationForm({
        number: getNextNumber(variations, "number"),
        date: new Date().toLocaleDateString("fa-IR"),
        description: "",
        status: WorkflowStatus.DRAFT,
        items: items,
        ownerOrgId: currentUser?.orgId,
        currentOrgId: currentUser?.orgId,
        createdById: currentUser?.id,
      });
    }
  };

  const recalcCBSWeights = (items: VariationItem[], contractType: string | undefined): VariationItem[] => {
    if (contractType !== "CBS") return items;

    const getDepth = (code: string): number => {
      const parts = code.split('.');
      let depth = parts.length;
      const lastPart = parts[parts.length - 1];
      if (lastPart === '00' || lastPart === '0' || lastPart === '000') {
        depth -= 1;
      }
      return depth;
    };

    const isDirectChild = (parentCode: string, childCode: string): boolean => {
      const pParts = parentCode.split('.');
      const cParts = childCode.split('.');

      // 1. Strict hierarchy: 01 -> 01.01
      if (cParts.length === pParts.length + 1 && childCode.startsWith(parentCode + ".")) {
        return true;
      }

      // 2. xx.00 style hierarchy: 01.00 -> 01.01
      if (cParts.length === pParts.length) {
        const pLast = pParts[pParts.length - 1];
        const cLast = cParts[cParts.length - 1];
        if ((pLast === '00' || pLast === '0' || pLast === '000') && 
            !(cLast === '00' || cLast === '0' || cLast === '000')) {
          if (pParts.slice(0, -1).join('.') === cParts.slice(0, -1).join('.')) {
            return true;
          }
        }
      }

      return false;
    };

    const sorted = [...items].sort((a, b) => getDepth(b.code) - getDepth(a.code));
    const itemsMap = new Map<string, VariationItem>();
    sorted.forEach(i => itemsMap.set(i.code, { ...i }));

    for (const item of sorted) {
      const children = Array.from(itemsMap.values()).filter(child => {
        if (child.code === item.code) return false;
        return isDirectChild(item.code, child.code);
      });
      
      if (children.length > 0) {
        const updated = itemsMap.get(item.code)!;
        
        let sumContractor = 0;
        let sumConsultant = 0;
        let sumEmployer = 0;
        let sumWeight = 0;
        
        children.forEach(c => {
          sumContractor += (c.contractorWeightFactor ?? c.weightFactor ?? 0);
          sumConsultant += (c.consultantWeightFactor ?? c.contractorWeightFactor ?? c.weightFactor ?? 0);
          sumEmployer += (c.employerWeightFactor ?? c.consultantWeightFactor ?? c.contractorWeightFactor ?? c.weightFactor ?? 0);
          sumWeight += (c.weightFactor ?? 0);
        });
        
        updated.contractorWeightFactor = sumContractor;
        updated.consultantWeightFactor = sumConsultant;
        updated.employerWeightFactor = sumEmployer;
        updated.weightFactor = sumWeight;
        
        itemsMap.set(item.code, updated);
      }
    }
    
    return items.map(orig => itemsMap.get(orig.code)!);
  };

  const updateVariationItem = (
    code: string,
    field: keyof VariationItem,
    value: any,
  ) => {
    const userOrg = currentUser?.orgId
      ? SystemAdminService.getOrganization(currentUser.orgId)
      : null;
    let userOrgType = userOrg?.type;
    const isSystemAdmin = currentUser?.role === "SYSTEM_ADMIN" || currentUser?.username === "admin";

    if (!userOrgType && currentUser && !isSystemAdmin) {
      const titleLower = ((currentUser.jobTitle || '') + ' ' + (currentUser.jobLevel || '') + ' ' + (currentUser.fullName || '')).toLowerCase();
      if (titleLower.includes('کارفرما') || titleLower.includes('مدیر طرح') || titleLower.includes('مجری')) {
        userOrgType = OrganizationType.EMPLOYER;
      } else if (titleLower.includes('ناظر') || titleLower.includes('مشاور') || titleLower.includes('سرپرست نظارت')) {
        userOrgType = OrganizationType.CONSULTANT;
      } else {
        userOrgType = OrganizationType.CONTRACTOR;
      }
    } else if (!userOrgType && !currentUser && !isSystemAdmin) {
      userOrgType = OrganizationType.CONTRACTOR;
    }

    // Enforce role-based editing permissions: Each organization can ONLY modify its own field
    if (!isSystemAdmin) {
      if (
        (field === "contractorQty" || field === "contractorWeightFactor") &&
        userOrgType !== OrganizationType.CONTRACTOR
      ) {
        return;
      }
      if (
        (field === "consultantQty" || field === "consultantWeightFactor") &&
        userOrgType !== OrganizationType.CONSULTANT
      ) {
        return;
      }
      if (
        (field === "employerQty" || field === "employerWeightFactor") &&
        userOrgType !== OrganizationType.EMPLOYER
      ) {
        return;
      }
    }

    setVariationForm((prev) => {
      const isCBS = currentProject?.contractType === "CBS";
      const totalBudget = currentProject?.initialBudget || 1;

      const updatedItems = prev.items?.map((i) => {
        if (i.code === code) {
          const updated = { ...i, [field]: value };
          const unitPrice = i.unitPrice || 0;

          if (isCBS) {
            if (field === "contractorQty") {
              // quantity -> weight (contractor only)
              const newWeight = unitPrice > 0 ? Number((((value * unitPrice) / totalBudget) * 100).toFixed(4)) : 0;
              updated.contractorWeightFactor = newWeight;
            } else if (field === "contractorWeightFactor") {
              // weight -> quantity (contractor only)
              const newQty = unitPrice > 0 ? Number((((value / 100) * totalBudget) / unitPrice).toFixed(4)) : 0;
              updated.contractorQty = newQty;
            } else if (field === "consultantQty") {
              // quantity -> weight (consultant only)
              const newWeight = unitPrice > 0 ? Number((((value * unitPrice) / totalBudget) * 100).toFixed(4)) : 0;
              updated.consultantWeightFactor = newWeight;
            } else if (field === "consultantWeightFactor") {
              // weight -> quantity (consultant only)
              const newQty = unitPrice > 0 ? Number((((value / 100) * totalBudget) / unitPrice).toFixed(4)) : 0;
              updated.consultantQty = newQty;
            } else if (field === "employerQty") {
              // quantity -> weight (employer only)
              const newWeight = unitPrice > 0 ? Number((((value * unitPrice) / totalBudget) * 100).toFixed(4)) : 0;
              updated.employerWeightFactor = newWeight;
            } else if (field === "employerWeightFactor") {
              // weight -> quantity (employer only)
              const newQty = unitPrice > 0 ? Number((((value / 100) * totalBudget) / unitPrice).toFixed(4)) : 0;
              updated.employerQty = newQty;
            }
          }
          // In Non-CBS, only updated[field] = value applies, with NO propagation across roles
          return updated;
        }
        return i;
      }) || [];
      return {
        ...prev,
        items: recalcCBSWeights(updatedItems, currentProject?.contractType),
      };
    });
  };

  const addVariationItem = () => {
    if (
      !variationNewItem.code ||
      !variationNewItem.description ||
      !variationNewItem.unit ||
      variationNewItem.unitPrice === undefined
    ) {
      alert("لطفا تمام فیلدهای آیتم جدید را تکمیل کنید.");
      return;
    }

    // Check if item already exists
    if (variationForm.items?.some((i) => i.code === variationNewItem.code)) {
      alert("این کد آیتم قبلاً در لیست وجود دارد.");
      return;
    }

    const newItem: VariationItem = {
      code: variationNewItem.code!,
      description: variationNewItem.description!,
      unit: variationNewItem.unit!,
      unitPrice: variationNewItem.unitPrice!,
      itemType: variationNewItem.itemType || "NORMAL",
      independentCoefficient: variationNewItem.independentCoefficient || 1,
      originalQty: variationNewItem.originalQty || 0,
      contractorQty: variationNewItem.contractorQty || 0, // Contractor Proposal
      originalWeightFactor: variationNewItem.originalWeightFactor || 0,
      weightFactor: variationNewItem.weightFactor || 0,
      contractorWeightFactor: variationNewItem.weightFactor || 0,
    };

    setVariationForm((prev) => {
      const updatedItems = [...(prev.items || []), newItem];
      return {
        ...prev,
        items: recalcCBSWeights(updatedItems, currentProject?.contractType),
      };
    });

    // Reset Form
    setVariationNewItem({
      itemType: "NORMAL",
      independentCoefficient: 1,
      originalQty: 0,
      contractorQty: 0,
      unitPrice: 0,
      originalWeightFactor: 0,
      weightFactor: 0,
      contractorWeightFactor: 0,
      consultantWeightFactor: 0,
      employerWeightFactor: 0,
    });
    setVariationSearchQuery("");
  };

  const calculateVariationTotals = () => {
    const items = variationForm.items || [];
    let orig = 0,
      cont = 0,
      cons = 0,
      emp = 0;

    items.forEach((item) => {
      const mult = getMultipliers(
        item.code,
        item.itemType,
        item.independentCoefficient,
      ).total || 1;
      
      let origQty = item.originalQty || 0;
      if (origQty === 0 || String(origQty) === "0") {
        if (currentProject?.contractType === "CBS") {
          const cNode = cbsNodes.find(n => (cleanCode(n.code) === cleanCode(item.code) || n.code === item.code) && String(n.projectId) === String(selectedProjectId));
          if (cNode) origQty = cNode.quantity || 0;
        } else {
          const eNode = estimates.find(e => cleanCode(e.code) === cleanCode(item.code) && String(e.projectId) === String(selectedProjectId));
          if (eNode) origQty = eNode.quantity || 0;
        }
      }
      
      const unitPrice = item.unitPrice ?? 0;
      const contractorQty = item.contractorQty ?? origQty;
      const consultantQty = item.consultantQty ?? contractorQty;
      const employerQty = item.employerQty ?? consultantQty;
      
      orig += origQty * unitPrice * mult;
      cont += contractorQty * unitPrice * mult;
      cons += consultantQty * unitPrice * mult;
      emp += employerQty * unitPrice * mult;
    });

    return {
      orig: isNaN(orig) ? 0 : orig,
      cont: isNaN(cont) ? 0 : cont,
      cons: isNaN(cons) ? 0 : cons,
      emp: isNaN(emp) ? 0 : emp,
    };
  };

  const currentVariationWeight = useMemo(() => {
    let totalWeight = 0;
    if (currentProject?.contractType === "CBS") {
      const projectNodes = cbsNodes.filter((n) => String(n.projectId) === String(selectedProjectId));
      const rootNodes = projectNodes.filter(n => !n.parentId || n.parentId === "root");
      totalWeight = rootNodes.reduce((sum, n) => {
        const vItem = variationForm.items?.find((i) => i.code === n.code);
        if (vItem) {
          const finalWeight =
            variationRoleView === "EMPLOYER" ? (vItem.employerWeightFactor ?? vItem.consultantWeightFactor ?? vItem.contractorWeightFactor ?? vItem.weightFactor ?? 0) :
            variationRoleView === "CONSULTANT" ? (vItem.consultantWeightFactor ?? vItem.contractorWeightFactor ?? vItem.weightFactor ?? 0) :
            (vItem.contractorWeightFactor ?? vItem.weightFactor ?? 0);
          return sum + finalWeight;
        }
        return sum + (n.weightPercent || 0);
      }, 0);
      variationForm.items?.forEach((vItem) => {
        const isRoot = !vItem.code.includes(".");
        if (isRoot && !projectNodes.some((n) => n.code === vItem.code)) {
          const finalWeight =
            variationRoleView === "EMPLOYER" ? (vItem.employerWeightFactor ?? vItem.consultantWeightFactor ?? vItem.contractorWeightFactor ?? vItem.weightFactor ?? 0) :
            variationRoleView === "CONSULTANT" ? (vItem.consultantWeightFactor ?? vItem.contractorWeightFactor ?? vItem.weightFactor ?? 0) :
            (vItem.contractorWeightFactor ?? vItem.weightFactor ?? 0);
          totalWeight += finalWeight;
        }
      });
    } else {
      const projectEst = estimates.filter((e) => String(e.projectId) === String(selectedProjectId));
      totalWeight = projectEst.reduce((sum, e) => {
        const vItem = variationForm.items?.find((i) => i.code === e.code);
        if (vItem) {
          const finalWeight =
            variationRoleView === "EMPLOYER" ? (vItem.employerWeightFactor ?? vItem.consultantWeightFactor ?? vItem.contractorWeightFactor ?? vItem.weightFactor ?? 0) :
            variationRoleView === "CONSULTANT" ? (vItem.consultantWeightFactor ?? vItem.contractorWeightFactor ?? vItem.weightFactor ?? 0) :
            (vItem.contractorWeightFactor ?? vItem.weightFactor ?? 0);
          return sum + finalWeight;
        }
        return sum + (e.weightPercent || 0);
      }, 0);
      variationForm.items?.forEach((vItem) => {
        if (!projectEst.some((e) => e.code === vItem.code)) {
          const finalWeight =
            variationRoleView === "EMPLOYER" ? (vItem.employerWeightFactor ?? vItem.consultantWeightFactor ?? vItem.contractorWeightFactor ?? vItem.weightFactor ?? 0) :
            variationRoleView === "CONSULTANT" ? (vItem.consultantWeightFactor ?? vItem.contractorWeightFactor ?? vItem.weightFactor ?? 0) :
            (vItem.contractorWeightFactor ?? vItem.weightFactor ?? 0);
          totalWeight += finalWeight;
        }
      });
    }
    return totalWeight;
  }, [variationForm.items, cbsNodes, estimates, currentProject, selectedProjectId, variationRoleView]);

  const getDifferenceMessage = (oldVal: any, newVal: any, tab: string): string => {
    const changes: string[] = [];

    if (oldVal.number !== newVal.number) {
      changes.push(`شماره: از "${oldVal.number || 'خالی'}" به "${newVal.number || 'خالی'}"`);
    }
    if (oldVal.serialNumber !== newVal.serialNumber) {
      changes.push(`شماره سریال: از "${oldVal.serialNumber || 'خالی'}" به "${newVal.serialNumber || 'خالی'}"`);
    }
    if (oldVal.date !== newVal.date) {
      changes.push(`تاریخ: از "${oldVal.date || 'خالی'}" به "${newVal.date || 'خالی'}"`);
    }
    if (oldVal.entryDate !== newVal.entryDate) {
      changes.push(`تاریخ ورود: از "${oldVal.entryDate || 'خالی'}" به "${newVal.entryDate || 'خالی'}"`);
    }
    if (oldVal.startDate !== newVal.startDate) {
      changes.push(`تاریخ شروع: از "${oldVal.startDate || 'خالی'}" به "${newVal.startDate || 'خالی'}"`);
    }
    if (oldVal.endDate !== newVal.endDate) {
      changes.push(`تاریخ پایان: از "${oldVal.endDate || 'خالی'}" به "${newVal.endDate || 'خالی'}"`);
    }
    if (oldVal.description !== newVal.description) {
      changes.push(`توضیحات: از "${oldVal.description || 'خالی'}" به "${newVal.description || 'خالی'}"`);
    }
    if (oldVal.location !== newVal.location) {
      changes.push(`محل: از "${oldVal.location || 'خالی'}" به "${newVal.location || 'خالی'}"`);
    }
    if (oldVal.storageLocation !== newVal.storageLocation) {
      changes.push(`محل دپو: از "${oldVal.storageLocation || 'خالی'}" به "${newVal.storageLocation || 'خالی'}"`);
    }
    if (oldVal.driverName !== newVal.driverName) {
      changes.push(`نام راننده: از "${oldVal.driverName || 'خالی'}" به "${newVal.driverName || 'خالی'}"`);
    }
    if (oldVal.plateNumber !== newVal.plateNumber) {
      changes.push(`شماره پلاک: از "${oldVal.plateNumber || 'خالی'}" به "${newVal.plateNumber || 'خالی'}"`);
    }
    if (oldVal.vehicleType !== newVal.vehicleType) {
      changes.push(`نوع خودرو: از "${oldVal.vehicleType || 'خالی'}" به "${newVal.vehicleType || 'خالی'}"`);
    }
    if (oldVal.requestedBy !== newVal.requestedBy) {
      changes.push(`درخواست‌کننده: از "${oldVal.requestedBy || 'خالی'}" به "${newVal.requestedBy || 'خالی'}"`);
    }
    if (oldVal.coefficient !== newVal.coefficient) {
      changes.push(`ضریب تعدیل: از "${oldVal.coefficient || 'خالی'}" به "${newVal.coefficient || 'خالی'}"`);
    }

    if (tab === "materials") {
      const oldItems = oldVal.items || [];
      const newItems = newVal.items || [];
      if (oldItems.length !== newItems.length) {
        changes.push(`تغییر تعداد اقلام لیست مصالح`);
      } else {
        newItems.forEach((nInput: any, i: number) => {
          const oInput = oldItems[i];
          if (oInput) {
            if (oInput.materialName !== nInput.materialName || oInput.quantity !== nInput.quantity) {
              changes.push(`اصلاح قلم "${nInput.materialName || nInput.materialType || ''}": مقدار از ${oInput.quantity} به ${nInput.quantity}`);
            }
          }
        });
      }
    }

    if (tab === "variation") {
      const oldItems = oldVal.items || [];
      const newItems = newVal.items || [];
      newItems.forEach((nItem: any) => {
        const oItem = oldItems.find((o: any) => o.code === nItem.code);
        if (oItem) {
          if (oItem.contractorQty !== nItem.contractorQty) {
            changes.push(`اصلاح مقدار پیمانکار آیتم "${nItem.code}": از ${oItem.contractorQty} به ${nItem.contractorQty}`);
          }
          if (oItem.consultantQty !== nItem.consultantQty) {
            changes.push(`اصلاح مقدار مشاور آیتم "${nItem.code}": از ${oItem.consultantQty} به ${nItem.consultantQty}`);
          }
          if (oItem.employerQty !== nItem.employerQty) {
            changes.push(`اصلاح مقدار کارفرما آیتم "${nItem.code}": از ${oItem.employerQty} به ${nItem.employerQty}`);
          }
        }
      });
    }

    return changes.length > 0 ? changes.join(" | ") : "";
  };

  const appendEditEvent = (oldItem: any, newItem: any, tab: string) => {
    if (!oldItem) return newItem;
    const changes = getDifferenceMessage(oldItem, newItem, tab);
    if (changes) {
      const editEvent = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: Date.now(),
        action: "EDIT" as any,
        fromStatus: oldItem.status || "DRAFT",
        toStatus: newItem.status || "DRAFT",
        actorUserId: currentUser?.id || "",
        actorName: currentUser
          ? formatUserDisplayFormal(currentUser, SystemAdminService.getOrganization(currentUser.orgId))
          : "کاربر",
        comment: changes,
      };
      newItem.workflowHistory = [
        ...(oldItem.workflowHistory || []),
        editEvent,
      ];
    }
    return newItem;
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let oldItemBeforeSave: any = null;
      if (editingId) {
        if (activeTab === "estimate")
          oldItemBeforeSave = JSON.parse(JSON.stringify(estimates.find((e) => e.id === editingId) || null));
        else if (activeTab === "minutes")
          oldItemBeforeSave = JSON.parse(JSON.stringify(minutes.find((m) => m.id === editingId) || null));
        else if (activeTab === "statements")
          oldItemBeforeSave = JSON.parse(JSON.stringify(statements.find((s) => s.id === editingId) || null));
        else if (activeTab === ("permits" as any))
          oldItemBeforeSave = JSON.parse(JSON.stringify(workPermits.find((p) => p.id === editingId) || null));
        else if (activeTab === ("materials" as any)) {
          if (materialSubTab === "MRS")
            oldItemBeforeSave = JSON.parse(JSON.stringify(mrsList.find((m) => m.id === editingId) || null));
          if (materialSubTab === "MIV")
            oldItemBeforeSave = JSON.parse(JSON.stringify(mivList.find((m) => m.id === editingId) || null));
        } else if (activeTab === ("variation" as any))
          oldItemBeforeSave = JSON.parse(JSON.stringify(variations.find((v) => v.id === editingId) || null));
      }

      if (currentUser?.role !== "SYSTEM_ADMIN") {
        if (!editingId && !canCreate && activeTab !== "metre") {
          alert("شما دسترسی ایجاد مدرک جدید در دفتر فنی را ندارید.");
          return;
        }

        if (editingId) {
          let itemToInspect = null;
          if (activeTab === "estimate")
            itemToInspect = estimates.find((e) => e.id === editingId);
          else if (activeTab === "minutes")
            itemToInspect = minutes.find((m) => m.id === editingId);
          else if (activeTab === "statements")
            itemToInspect = statements.find((s) => s.id === editingId);
          else if (activeTab === ("permits" as any))
            itemToInspect = workPermits.find((p) => p.id === editingId);
          else if (activeTab === ("materials" as any)) {
            if (materialSubTab === "MRS")
              itemToInspect = mrsList.find((m) => m.id === editingId);
            if (materialSubTab === "MIV")
              itemToInspect = mivList.find((m) => m.id === editingId);
          } else if (activeTab === ("variation" as any))
            itemToInspect = variations.find((v) => v.id === editingId);

          if (
            itemToInspect &&
            !WorkflowService.canEdit(itemToInspect as any, currentUser)
          ) {
            alert("شما مجاز به ویرایش این سند نیستید.");
            return;
          }
        }
      }

      if (activeTab === "metre") {
        // Logic to ensure minuteId is present (crucial for replacement logic)
        let effectiveMinuteId = metreMinuteId;
        if (
          !effectiveMinuteId &&
          metreRowsForm.length > 0 &&
          metreRowsForm[0].minuteId
        ) {
          effectiveMinuteId = metreRowsForm[0].minuteId;
        }

        if (
          effectiveMinuteId &&
          currentUser &&
          currentUser.role !== "SYSTEM_ADMIN"
        ) {
          const minToEdit = minutes.find((m) => m.id === effectiveMinuteId);
          if (minToEdit && !WorkflowService.canEdit(minToEdit, currentUser)) {
            alert("شما مجاز به ویرایش ریزمتره این صورت‌جلسه نیستید.");
            return;
          }
        }

        // 1. Prepare new rows from the form
        const newMetres = metreRowsForm.map((row) => {
          const userOrg = currentUser
            ? SystemAdminService.getOrganization(currentUser.orgId)
            : undefined;
          const userOrgType = userOrg?.type;

          const updatedRow = {
            ...row,
            id: row.id || Math.random().toString(36).substr(2, 9),
            projectId: selectedProjectId,
            minuteId: effectiveMinuteId || "",
          } as MetreRow;

          const getVal = (v: any) => {
            const n = parseFloat(v);
            return isNaN(n) || n === 0 ? 1 : n;
          };
          const c = getVal(updatedRow.count);
          const l = getVal(updatedRow.length);
          const w = getVal(updatedRow.width);
          const h = getVal(updatedRow.height);
          const m = parseFloat(updatedRow.multiplier as any) || 1;
          const currentTotal = updatedRow.isManualPartialTotal
            ? parseFloat(updatedRow.partialTotal as any) || 0
            : parseFloat((c * l * w * h * m).toFixed(3));

          updatedRow.partialTotal = currentTotal;

          if (userOrgType === OrganizationType.CONTRACTOR) {
            updatedRow.contractorCount = updatedRow.isManualPartialTotal
              ? 0
              : c;
            updatedRow.contractorLength = updatedRow.isManualPartialTotal
              ? 0
              : l;
            updatedRow.contractorWidth = updatedRow.isManualPartialTotal
              ? 0
              : w;
            updatedRow.contractorHeight = updatedRow.isManualPartialTotal
              ? 0
              : h;
            updatedRow.contractorMultiplier = updatedRow.isManualPartialTotal
              ? 0
              : m;
            updatedRow.contractorTotal = currentTotal;
          } else if (userOrgType === OrganizationType.CONSULTANT) {
            if (updatedRow.contractorTotal === undefined) {
              updatedRow.contractorCount =
                parseFloat(row.contractorCount as any) ||
                (updatedRow.isManualPartialTotal
                  ? 0
                  : parseFloat(row.count as any)) ||
                1;
              updatedRow.contractorLength =
                parseFloat(row.contractorLength as any) ||
                (updatedRow.isManualPartialTotal
                  ? 0
                  : parseFloat(row.length as any)) ||
                1;
              updatedRow.contractorWidth =
                parseFloat(row.contractorWidth as any) ||
                (updatedRow.isManualPartialTotal
                  ? 0
                  : parseFloat(row.width as any)) ||
                1;
              updatedRow.contractorHeight =
                parseFloat(row.contractorHeight as any) ||
                (updatedRow.isManualPartialTotal
                  ? 0
                  : parseFloat(row.height as any)) ||
                1;
              updatedRow.contractorMultiplier =
                parseFloat(row.contractorMultiplier as any) ||
                (updatedRow.isManualPartialTotal
                  ? 0
                  : parseFloat(row.multiplier as any)) ||
                1;
              updatedRow.contractorTotal =
                parseFloat(row.contractorTotal as any) ||
                parseFloat(row.partialTotal as any) ||
                0;
            }
            updatedRow.consultantCount = updatedRow.isManualPartialTotal
              ? 0
              : c;
            updatedRow.consultantLength = updatedRow.isManualPartialTotal
              ? 0
              : l;
            updatedRow.consultantWidth = updatedRow.isManualPartialTotal
              ? 0
              : w;
            updatedRow.consultantHeight = updatedRow.isManualPartialTotal
              ? 0
              : h;
            updatedRow.consultantMultiplier = updatedRow.isManualPartialTotal
              ? 0
              : m;
            updatedRow.consultantTotal = currentTotal;
            updatedRow.consultantEditedBy = currentUser
              ? formatUserDisplayFormal(currentUser, SystemAdminService.getOrganization(currentUser.orgId))
              : "مشاور";
            updatedRow.consultantEditedAt = new Date().toLocaleDateString(
              "fa-IR",
            );
          } else if (userOrgType === OrganizationType.EMPLOYER) {
            if (updatedRow.contractorTotal === undefined) {
              updatedRow.contractorCount =
                parseFloat(row.contractorCount as any) ||
                (updatedRow.isManualPartialTotal
                  ? 0
                  : parseFloat(row.count as any)) ||
                1;
              updatedRow.contractorLength =
                parseFloat(row.contractorLength as any) ||
                (updatedRow.isManualPartialTotal
                  ? 0
                  : parseFloat(row.length as any)) ||
                1;
              updatedRow.contractorWidth =
                parseFloat(row.contractorWidth as any) ||
                (updatedRow.isManualPartialTotal
                  ? 0
                  : parseFloat(row.width as any)) ||
                1;
              updatedRow.contractorHeight =
                parseFloat(row.contractorHeight as any) ||
                (updatedRow.isManualPartialTotal
                  ? 0
                  : parseFloat(row.height as any)) ||
                1;
              updatedRow.contractorMultiplier =
                parseFloat(row.contractorMultiplier as any) ||
                (updatedRow.isManualPartialTotal
                  ? 0
                  : parseFloat(row.multiplier as any)) ||
                1;
              updatedRow.contractorTotal =
                parseFloat(row.contractorTotal as any) ||
                parseFloat(row.partialTotal as any) ||
                0;
            }
            if (updatedRow.consultantTotal === undefined) {
              updatedRow.consultantCount =
                parseFloat(row.consultantCount as any) ||
                (updatedRow.isManualPartialTotal
                  ? 0
                  : parseFloat(row.count as any)) ||
                1;
              updatedRow.consultantLength =
                parseFloat(row.consultantLength as any) ||
                (updatedRow.isManualPartialTotal
                  ? 0
                  : parseFloat(row.length as any)) ||
                1;
              updatedRow.consultantWidth =
                parseFloat(row.consultantWidth as any) ||
                (updatedRow.isManualPartialTotal
                  ? 0
                  : parseFloat(row.width as any)) ||
                1;
              updatedRow.consultantHeight =
                parseFloat(row.consultantHeight as any) ||
                (updatedRow.isManualPartialTotal
                  ? 0
                  : parseFloat(row.height as any)) ||
                1;
              updatedRow.consultantMultiplier =
                parseFloat(row.consultantMultiplier as any) ||
                (updatedRow.isManualPartialTotal
                  ? 0
                  : parseFloat(row.multiplier as any)) ||
                1;
              updatedRow.consultantTotal =
                parseFloat(row.consultantTotal as any) ||
                parseFloat(row.partialTotal as any) ||
                0;
            }
            updatedRow.employerCount = updatedRow.isManualPartialTotal ? 0 : c;
            updatedRow.employerLength = updatedRow.isManualPartialTotal ? 0 : l;
            updatedRow.employerWidth = updatedRow.isManualPartialTotal ? 0 : w;
            updatedRow.employerHeight = updatedRow.isManualPartialTotal ? 0 : h;
            updatedRow.employerMultiplier = updatedRow.isManualPartialTotal
              ? 0
              : m;
            updatedRow.employerTotal = currentTotal;
            updatedRow.employerEditedBy = currentUser
               ? formatUserDisplayFormal(currentUser, SystemAdminService.getOrganization(currentUser.orgId))
               : "کارفرما";
            updatedRow.employerEditedAt = new Date().toLocaleDateString(
              "fa-IR",
            );
          }

          return updatedRow;
        });

        // 2. Validation: Check against Estimate Quantity cap (Normal items only)
        let warnings = [];
        for (const newRow of newMetres) {
          if (!newRow.itemCode || newRow.itemType !== "NORMAL") continue;
          const baseEst = estimates.find(
            (e) =>
              e.projectId === selectedProjectId && e.code === newRow.itemCode,
          );
          if (!baseEst) continue;

          let allowedQty = baseEst.quantity;
          const otherMetres = metres.filter((m) => {
            if (m.projectId !== selectedProjectId) return false;
            if (m.itemCode !== newRow.itemCode) return false;
            if (m.minuteId === effectiveMinuteId) return false;
            if (editingId && m.id === editingId) return false;

            // Exclude metres from archived contractor copies
            const parentMin = minutes.find((min) => min.id === m.minuteId);
            if (parentMin && (parentMin as any).isArchived) return false;

            return true;
          });
          const executedInOtherMinutes = otherMetres.reduce(
            (sum, m) => sum + m.partialTotal,
            0,
          );
          const executedInThisForm = newMetres
            .filter((m) => m.itemCode === newRow.itemCode)
            .reduce((sum, m) => sum + m.partialTotal, 0);
          const newTotalExecuted = executedInOtherMinutes + executedInThisForm;

          if (newTotalExecuted > allowedQty) {
            warnings.push(
              `آیتم ${newRow.itemCode}: مقدار کارکرد (${newTotalExecuted}) از برآورد (${allowedQty}) بیشتر است.`,
            );
          }
        }

        if (warnings.length > 0) {
          alert(
            `هشدار واضح: مقادیر وارد شده در موارد زیر از سقف برآورد پیمان بیشتر است. اطلاعات با موفقیت ثبت خواهد شد:\n\n${warnings.join("\n")}`,
          );
        }

        // 3. Update State Logic - Replace existing entries for this minute context
        if (effectiveMinuteId) {
          let metresSource = [...metres];
          let minutesSource = [...minutes];
          // ... (keep the existing archival logic) ...
          const baseMinute = minutes.find((m) => m.id === effectiveMinuteId);
          if (baseMinute) {
            const associatedRejectedStatement = statements.find(
              (s) =>
                s.projectId === selectedProjectId &&
                s.status === WorkflowStatus.REJECTED &&
                s.selectedMinuteIds?.includes(effectiveMinuteId),
            );
            if (associatedRejectedStatement) {
              const isAlreadyArchived = minutesSource.some(
                (m) =>
                  (m as any).isArchived &&
                  (m as any).originalMinuteId === effectiveMinuteId,
              );
              if (!isAlreadyArchived) {
                const archivedMinuteId =
                  "arch_min_" + Math.random().toString(36).substr(2, 9);
                const archivedMinute: ProjectMinute = {
                  ...baseMinute,
                  id: archivedMinuteId,
                  description: `${baseMinute.description} (صورت‌جلسه پیمانکار - پیش از ویرایش)`,
                  isFinalFrozen: false,
                  status: WorkflowStatus.DRAFT,
                  isArchived: true,
                  originalMinuteId: effectiveMinuteId,
                } as any;
                const originalMetres = metres.filter(
                  (m) => m.minuteId === effectiveMinuteId,
                );
                const archivedMetres: MetreRow[] = originalMetres.map(
                  (m) =>
                    ({
                      ...m,
                      id: "arch_met_" + Math.random().toString(36).substr(2, 9),
                      minuteId: archivedMinuteId,
                      isArchived: true,
                    }) as any,
                );
                minutesSource = [archivedMinute, ...minutesSource];
                metresSource = [...metresSource, ...archivedMetres];
              }
              minutesSource = minutesSource.map((m) => {
                if (m.id === effectiveMinuteId) {
                  return {
                    ...m,
                    status: WorkflowStatus.DRAFT,
                    isFinalFrozen: false,
                    workflowHistory: [
                      ...(m.workflowHistory || []),
                      {
                        id: Math.random().toString(36).substr(2, 9),
                        timestamp: Date.now(),
                        action: "RESUBMIT" as WorkflowAction,
                        fromStatus: WorkflowStatus.REJECTED,
                        toStatus: WorkflowStatus.DRAFT,
                        actorUserId: currentUser?.id || "",
                        actorName: currentUser 
                          ? formatUserDisplayFormal(currentUser, SystemAdminService.getOrganization(currentUser.orgId))
                          : "کاربر",
                        comment: "ویرایش ناشی از رد صورت وضعیت کارکرد",
                      },
                    ],
                  };
                }
                return m;
              });
              setMinutes(minutesSource);
            }
          }
          if (isEditingFullMinute) {
            const metresWithoutCurrentMinute = metresSource.filter(
              (m) => m.minuteId !== effectiveMinuteId,
            );
            setMetres([...metresWithoutCurrentMinute, ...newMetres]);
          } else {
            const newRowIds = new Set(newMetres.map((r) => r.id));
            const unchangedMetres = metresSource.filter((m) => !newRowIds.has(m.id));
            setMetres([...newMetres, ...unchangedMetres]);
          }
        } else {
          let updatedMetres = [...metres];
          if (editingId) {
            updatedMetres = updatedMetres.filter((m) => m.id !== editingId);
          }
          const newRowIds = new Set(newMetres.map((r) => r.id));
          const unchangedMetres = updatedMetres.filter((m) => !newRowIds.has(m.id));
          setMetres([...newMetres, ...unchangedMetres]);
        }
        setIsEditingFullMinute(false);

        // Return handling for sub-modal
        if (returnToStatementId) {
          setActiveTab("statements");
          setEditingId(returnToStatementId);
          setReturnToStatementId(null);
          setReturnToTab(null);
          return;
        }

        if (returnToTab) {
          setActiveTab(returnToTab as any);
          setReturnToTab(null);
        }
      } else if (activeTab === "estimate") {
        const id = editingId || Math.random().toString(36).substr(2, 9);
        const mult = getMultipliers(
          estForm.code || "",
          estForm.itemType,
          estForm.independentCoefficient,
        ).total;
        const total = (estForm.quantity || 0) * (estForm.unitPrice || 0) * mult;
        const newItem = {
          ...estForm,
          id,
          projectId: selectedProjectId,
          priceListId: estForm.priceListId || (estPlFilter !== "all" ? estPlFilter : undefined),
          createdById: editingId ? estForm.createdById : currentUser?.id,
          status: editingId ? estForm.status : "DRAFT",
          ownerOrgId: editingId ? estForm.ownerOrgId : currentUser?.orgId,
          currentOrgId: editingId ? estForm.currentOrgId : currentUser?.orgId,
          total,
          ...(currentProject?.contractType === "CBS" ? {
            weightPercent: estForm.weightPercent !== undefined
              ? estForm.weightPercent
              : Number(((((estForm.quantity || 0) * (estForm.unitPrice || 0)) / (currentProject?.initialBudget || 1)) * 100).toFixed(4))
          } : {})
        } as EstimateItem;
        const newItemWithEdit = appendEditEvent(oldItemBeforeSave, newItem, "estimate");
        const updated = editingId
          ? estimates.map((i) => (i.id === editingId ? newItemWithEdit : i))
          : [newItemWithEdit, ...estimates];
        setEstimates(updated);

        SystemAdminService.addAuditLog({
          user: currentUser?.id || 'admin',
          action: editingId ? 'EDIT_ESTIMATE' : 'CREATE_ESTIMATE',
          details: `${editingId ? 'ویرایش' : 'ثبت'} آیتم برآورد پیمان: ${newItem.code || ''} - ${newItem.description || ''} به مقدار ${newItem.quantity || 0}`,
          source: 'دفتر فنی (برآورد پیمان)',
          sourceType: 'TECHNICAL'
        });
      } else if (activeTab === "minutes") {
        const id = editingId || Math.random().toString(36).substr(2, 9);
        const newItem = {
          ...minForm,
          id,
          projectId: selectedProjectId,
          createdById: editingId ? minForm.createdById : currentUser?.id, // Phase 4A: Set creator
          status: editingId ? minForm.status : "DRAFT", // Phase 4A: Default status
          // Phase 4B: Set Owner and Current Org
          ownerOrgId: editingId ? minForm.ownerOrgId : currentUser?.orgId,
          currentOrgId: editingId ? minForm.currentOrgId : currentUser?.orgId,
        } as ProjectMinute;
        const newItemWithEdit = appendEditEvent(oldItemBeforeSave, newItem, "minutes");
        const updated = editingId
          ? minutes.map((i) => (i.id === editingId ? newItemWithEdit : i))
          : [newItemWithEdit, ...minutes];
        setMinutes(updated);

        SystemAdminService.addAuditLog({
          user: currentUser?.id || 'admin',
          action: editingId ? 'EDIT_MINUTE' : 'CREATE_MINUTE',
          details: `${editingId ? 'ویرایش' : 'ثبت'} صورت‌جلسه کارکرد شماره ${newItem.number || ''} موضوع: ${newItem.description || ''}`,
          source: 'دفتر فنی (صورت‌جلسات)',
          sourceType: 'TECHNICAL'
        });
      } else if (activeTab === "statements") {
        const id = editingId || Math.random().toString(36).substr(2, 9);
        const newItem = {
          ...stmtForm,
          id,
          projectId: selectedProjectId,
          createdById: editingId ? stmtForm.createdById : currentUser?.id, // Phase 4A: Set creator
          status: editingId ? stmtForm.status : "DRAFT",
          // Phase 4B: Set Owner and Current Org
          ownerOrgId: editingId ? stmtForm.ownerOrgId : currentUser?.orgId,
          currentOrgId: editingId ? stmtForm.currentOrgId : currentUser?.orgId,
        } as Statement;
        const newItemWithEdit = appendEditEvent(oldItemBeforeSave, newItem, "statements");
        const updated = editingId
          ? statements.map((i) => (i.id === editingId ? newItemWithEdit : i))
          : [newItemWithEdit, ...statements];
        setStatements(updated);
        setTempDuplicatedIds(null); // Clear transaction on successful save

        SystemAdminService.addAuditLog({
          user: currentUser?.id || 'admin',
          action: editingId ? 'EDIT_STATEMENT' : 'CREATE_STATEMENT',
          details: `${editingId ? 'ویرایش' : 'ثبت'} صورت‌وضعیت شماره ${newItem.number || ''} دوره ${newItem.startDate || ''} تا ${newItem.endDate || ''}`,
          source: 'دفتر فنی (صورت‌وضعیت)',
          sourceType: 'TECHNICAL'
        });
      } else if (activeTab === ("permits" as any)) {
        const id = editingId || Math.random().toString(36).substr(2, 9);
        const newItem = {
          ...permitForm,
          id,
          projectId: selectedProjectId,
          module: 'PERMITS',
          createdById: editingId ? permitForm.createdById : currentUser?.id,
          status: editingId ? permitForm.status : WorkflowStatus.DRAFT,
          ownerOrgId: editingId ? permitForm.ownerOrgId : currentUser?.orgId,
          currentOrgId: editingId
            ? permitForm.currentOrgId
            : currentUser?.orgId,
        } as WorkPermit;
        const newItemWithEdit = appendEditEvent(oldItemBeforeSave, newItem, "permits");
        const updated = editingId
          ? workPermits.map((p) => (p.id === editingId ? newItemWithEdit : p))
          : [newItemWithEdit, ...workPermits];
        setWorkPermits(updated);

        SystemAdminService.addAuditLog({
          user: currentUser?.id || 'admin',
          action: editingId ? 'EDIT_PERMIT' : 'CREATE_PERMIT',
          details: `${editingId ? 'ویرایش' : 'ثبت'} مجوز کار شماره ${newItem.number || ''} موضوع: ${newItem.description || ''}`,
          source: 'دفتر فنی (مجوز کار)',
          sourceType: 'TECHNICAL'
        });
      } else if (activeTab === ("materials" as any)) {
        if (materialSubTab === "MRS") {
          const recordId = editingId || Math.random().toString(36).substr(2, 9);
          const newRecord: MrsRecord = {
            ...mrsForm,
            id: recordId,
            projectId: selectedProjectId,
            createdById: editingId ? mrsForm.createdById : currentUser?.id,
            status: editingId ? mrsForm.status : ("DRAFT" as any),
            ownerOrgId: editingId ? mrsForm.ownerOrgId : currentUser?.orgId,
            currentOrgId: editingId ? mrsForm.currentOrgId : currentUser?.orgId,
          } as MrsRecord;
          const newRecordWithEdit = appendEditEvent(oldItemBeforeSave, newRecord, "materials");
          if (editingId)
            setMrsList(
              mrsList.map((m) => (m.id === editingId ? newRecordWithEdit : m)),
            );
          else setMrsList([newRecordWithEdit, ...mrsList]);

          SystemAdminService.addAuditLog({
            user: currentUser?.id || 'admin',
            action: editingId ? 'EDIT_MRS' : 'CREATE_MRS',
            details: `${editingId ? 'ویرایش' : 'ثبت'} سند ورود مصالح به کارگاه (MRS) شماره ${newRecord.serialNumber || ''}`,
            source: 'دفتر فنی (درخواست مصالح - MRS)',
            sourceType: 'MATERIALS'
          });
        } else if (materialSubTab === "MIV") {
          const balance = getMaterialBalance();
          const inventoryErrors: string[] = [];
          mivForm.items?.forEach((reqItem) => {
            const matName = (reqItem.materialName || "").trim();
            const stock = balance.find((b) => b.materialName === matName);
            let currentlyEditingQty = 0;
            if (editingId) {
              const oldRec = mivList.find((r) => r.id === editingId);
              if (oldRec) {
                const oldItem = oldRec.items.find(
                  (i) => (i.materialName || "").trim() === matName,
                );
                if (oldItem) currentlyEditingQty = oldItem.quantity;
              }
            }
            const available =
              (stock ? stock.remaining : 0) + currentlyEditingQty;
            if (reqItem.quantity > available)
              inventoryErrors.push(
                `- ${matName}: موجودی ${available} (درخواست: ${reqItem.quantity})`,
              );
          });
          if (inventoryErrors.length > 0) {
            alert(
              `خطا: موجودی انبار کافی نیست:\n${inventoryErrors.join("\n")}`,
            );
            return;
          }
          const recordId = editingId || Math.random().toString(36).substr(2, 9);
          const newRecord: MivRecord = {
            ...mivForm,
            id: recordId,
            projectId: selectedProjectId,
            createdById: editingId ? mivForm.createdById : currentUser?.id,
            status: editingId ? mivForm.status : ("DRAFT" as any),
            ownerOrgId: editingId ? mivForm.ownerOrgId : currentUser?.orgId,
            currentOrgId: editingId ? mivForm.currentOrgId : currentUser?.orgId,
            requestedBy: mivForm.requestedBy || "",
          } as MivRecord;
          const newRecordWithEdit = appendEditEvent(oldItemBeforeSave, newRecord, "materials");
          if (editingId)
            setMivList(
              mivList.map((m) => (m.id === editingId ? newRecordWithEdit : m)),
            );
          else setMivList([newRecordWithEdit, ...mivList]);

          SystemAdminService.addAuditLog({
            user: currentUser?.id || 'admin',
            action: editingId ? 'EDIT_MIV' : 'CREATE_MIV',
            details: `${editingId ? 'ویرایش' : 'ثبت'} سند خروج مصالح از انبار (MIV) شماره ${newRecord.serialNumber || ''}`,
            source: 'دفتر فنی (حواله خروج مصالح - MIV)',
            sourceType: 'MATERIALS'
          });
        }
      } else if (activeTab === ("variation" as any)) {
        // Validate total weight percent across the project structure (CBS only)
        if (currentProject?.contractType?.toUpperCase() === "CBS") {
          let totalWeight = 0;
          const projectNodes = cbsNodes.filter((n) => n.projectId === selectedProjectId);
          const rootNodes = projectNodes.filter(n => !n.parentId || n.parentId === "root");
          totalWeight = rootNodes.reduce((sum, n) => {
            const vItem = variationForm.items?.find((i) => i.code === n.code);
            if (vItem) {
              const finalWeight =
                vItem.employerWeightFactor ??
                vItem.consultantWeightFactor ??
                vItem.contractorWeightFactor ??
                vItem.weightFactor ??
                0;
              return sum + finalWeight;
            }
            return sum + (n.weightPercent || 0);
          }, 0);
          variationForm.items?.forEach((vItem) => {
            const isRoot = !vItem.code.includes(".");
            if (isRoot && !projectNodes.some((n) => n.code === vItem.code)) {
              const finalWeight =
                vItem.employerWeightFactor ??
                vItem.consultantWeightFactor ??
                vItem.contractorWeightFactor ??
                vItem.weightFactor ??
                0;
              totalWeight += finalWeight;
            }
          });

          if (Math.abs(totalWeight - 100) > 0.01) {
            alert(`خطا: مجموع درصد وزنی کل ساختار باید دقیقاً 100٪ باشد. مقدار فعلی: ${totalWeight.toFixed(2)}٪`);
            return;
          }
        }

        const id = editingId || Math.random().toString(36).substr(2, 9);
        if (
          variationForm.status === WorkflowStatus.APPROVED_INTERNAL ||
          variationForm.status === WorkflowStatus.APPROVED_BY_CONSULTANT ||
          variationForm.isFinalFrozen ||
          variationForm.status === WorkflowStatus.SENT_TO_EMPLOYER ||
          variationForm.status === WorkflowStatus.IN_EMPLOYER_REVIEW ||
          variationForm.status === ("APPROVED" as any)
        ) {
          const newEstimates = [...estimates];
          const newCbsNodes = [...cbsNodes];
          
          variationForm.items?.forEach((vItem) => {
            const finalQty = vItem.employerQty ?? vItem.consultantQty ?? vItem.contractorQty ?? 0;
            const finalWeight = vItem.employerWeightFactor ?? vItem.consultantWeightFactor ?? vItem.contractorWeightFactor ?? vItem.weightFactor ?? 0;

            if (currentProject?.contractType === "CBS") {
              const nodeIndex = newCbsNodes.findIndex(n => n.projectId === selectedProjectId && n.code === vItem.code);
              if (nodeIndex !== -1) {
                newCbsNodes[nodeIndex] = {
                  ...newCbsNodes[nodeIndex],
                  quantity: finalQty,
                  weightPercent: finalWeight
                };
              }
            } else {
              const existingEstIndex = newEstimates.findIndex(
                (e) => e.projectId === selectedProjectId && e.code === vItem.code,
              );
              if (existingEstIndex !== -1)
                newEstimates[existingEstIndex] = {
                  ...newEstimates[existingEstIndex],
                  quantity: finalQty,
                  weightPercent: finalWeight,
                };
              else if (finalQty > 0)
                newEstimates.push({
                  id: Math.random().toString(36).substr(2, 9),
                  projectId: selectedProjectId,
                  code: vItem.code,
                  description: vItem.description,
                  unit: vItem.unit,
                  unitPrice: vItem.unitPrice,
                  quantity: finalQty,
                  weightPercent: finalWeight,
                  itemType: vItem.itemType,
                  independentCoefficient: vItem.independentCoefficient,
                });
            }
          });

          if (currentProject?.contractType === "CBS") {
            setCbsNodes(newCbsNodes);
            localStorage.setItem("hamyar_cbs_nodes", JSON.stringify(newCbsNodes));
          } else {
            setEstimates(newEstimates);
            localStorage.setItem("hamyar_estimates", JSON.stringify(newEstimates));
          }
        }
        const newVariation = {
          ...variationForm,
          id,
          projectId: selectedProjectId,
        } as VariationOrder;
        const newVariationWithEdit = appendEditEvent(oldItemBeforeSave, newVariation, "variation");
        const updated = editingId
          ? variations.map((v) => (v.id === editingId ? newVariationWithEdit : v))
          : [newVariationWithEdit, ...variations];
        setVariations(updated);

        SystemAdminService.addAuditLog({
          user: currentUser?.id || 'admin',
          action: editingId ? 'EDIT_VARIATION' : 'CREATE_VARIATION',
          details: `${editingId ? 'ویرایش' : 'ثبت'} ابلاغیه تغییر کار کارهای پیمان موضوع: ${newVariation.description || ''}`,
          source: 'دفتر فنی (ابلاغیه تغییرات)',
          sourceType: 'TECHNICAL'
        });
      }

      setToast({
        message: editingId
          ? `${activeTab === "estimate" ? "آیتم برآورد" : activeTab === "minutes" ? "صورت‌جلسه" : activeTab === "statements" ? "صورت‌وضعیت" : activeTab === ("permits" as any) ? "مجوز کار" : activeTab === ("materials" as any) ? (materialSubTab === "MRS" ? "سند ورود مصالح" : "سند خروج مصالح") : activeTab === ("variation" as any) ? "ابلاغیه تغییرات" : "اطلاعات"} با موفقیت ویرایش و ذخیره شد`
          : `${activeTab === "estimate" ? "آیتم برآورد جدید" : activeTab === "minutes" ? "صورت‌جلسه جدید" : activeTab === "statements" ? "صورت‌وضعیت جدید" : activeTab === ("permits" as any) ? "مجوز کار جدید" : activeTab === ("materials" as any) ? (materialSubTab === "MRS" ? "سند ورود مصالح جدید" : "سند خروج مصالح جدید") : activeTab === ("variation" as any) ? "ابلاغیه تغییرات جدید" : "سند جدید"} با موفقیت ثبت شد`,
        type: "success"
      });
      setIsModalOpen(false);
      setEditingId(null);
    } catch (err: any) {
      console.error(err);
      alert("خطا در ذخیره اطلاعات: " + err.message);
    }
  };

  const handleDelete = () => {
    if (!deleteId) return;

    // Retrieve item to delete before filtering it out to construct a detailed audit log
    const itemToDelete =
      activeTab === "estimate"
        ? estimates.find((e) => e.id === deleteId)
        : activeTab === "minutes"
          ? minutes.find((m) => m.id === deleteId)
          : activeTab === "statements"
            ? statements.find((s) => s.id === deleteId)
            : activeTab === ("permits" as any)
              ? workPermits.find((p) => p.id === deleteId)
              : activeTab === ("materials" as any)
                ? materialSubTab === "MRS"
                  ? mrsList.find((m) => m.id === deleteId)
                  : mivList.find((m) => m.id === deleteId)
                : activeTab === ("variation" as any)
                  ? variations.find((v) => v.id === deleteId)
                  : null;

    if (currentUser?.role !== "SYSTEM_ADMIN") {
      const item = itemToDelete;

      if (item) {
        if (!WorkflowService.canDelete(item as any, currentUser)) {
          alert("شما مجاز به حذف این سند نیستید.");
          setIsDeleteModalOpen(false);
          setDeleteId(null);
          return;
        }
      }
    }
    if (deleteId) {
      if (itemToDelete) {
        let details = '';
        if (activeTab === "estimate") {
          details = `حذف آیتم برآورد پیمان: ${(itemToDelete as any).code || ''} - ${(itemToDelete as any).description || ''}`;
        } else if (activeTab === "minutes") {
          details = `حذف صورت‌جلسه کارکرد شماره ${(itemToDelete as any).number || ''} با موضوع: ${(itemToDelete as any).description || ''}`;
        } else if (activeTab === "statements") {
          details = `حذف صورت‌وضعیت شماره ${(itemToDelete as any).number || ''} دوره ${(itemToDelete as any).startDate || ''} تا ${(itemToDelete as any).endDate || ''}`;
        } else if (activeTab === ("permits" as any)) {
          details = `حذف مجوز کار شماره ${(itemToDelete as any).number || ''} با موضوع: ${(itemToDelete as any).description || ''}`;
        } else if (activeTab === ("materials" as any)) {
          if (materialSubTab === "MRS") {
            details = `حذف سند ورود مصالح (MRS) شماره ${(itemToDelete as any).serialNumber || ''}`;
          } else {
            details = `حذف سند خروج مصالح (MIV) شماره ${(itemToDelete as any).serialNumber || ''}`;
          }
        } else if (activeTab === ("variation" as any)) {
          details = `حذف ابلاغیه تغییرات موضوع: ${(itemToDelete as any).description || ''}`;
        }

        SystemAdminService.addAuditLog({
          user: currentUser?.id || 'admin',
          action: 'DELETE_RECORD',
          details: details || `حذف سند از بخش ${activeTab}`,
          source: `دفتر فنی (${activeTab === 'estimate' ? 'برآورد پیمان' : activeTab === 'minutes' ? 'صورت‌جلسات' : activeTab === 'statements' ? 'صورت‌وضعیت' : activeTab === 'permits' ? 'مجوز کار' : activeTab === 'materials' ? 'مصالح' : 'تغییرات'})`,
          sourceType: 'TECHNICAL'
        });
      }

      if (activeTab === "estimate")
        setEstimates((prev) => prev.filter((e) => e.id !== deleteId));
      else if (activeTab === "minutes") {
        setMinutes((prev) => prev.filter((m) => m.id !== deleteId));
        setMetres((prev) => prev.filter((m) => m.minuteId !== deleteId));
      } else if (activeTab === "statements") {
        const stmtToDelete = statements.find((s) => s.id === deleteId);
        if (stmtToDelete) {
          const minutesToDelete = stmtToDelete.selectedMinuteIds || [];
          setMetres((prev) =>
            prev.filter((m) => !minutesToDelete.includes(m.minuteId || "")),
          );
          setMinutes((prev) =>
            prev.filter((m) => !minutesToDelete.includes(m.id)),
          );
        }
        setStatements((prev) => prev.filter((s) => s.id !== deleteId));
        setAdjustments((prev) => prev.filter((a) => a.statementId !== deleteId));
      } else if (activeTab === ("permits" as any))
        setWorkPermits((prev) => prev.filter((p) => p.id !== deleteId));
      else if (activeTab === ("materials" as any)) {
        if (materialSubTab === "MRS")
          setMrsList((prev) => prev.filter((m) => m.id !== deleteId));
        if (materialSubTab === "MIV")
          setMivList((prev) => prev.filter((m) => m.id !== deleteId));
      } else if (activeTab === ("variation" as any))
        setVariations((prev) => prev.filter((v) => v.id !== deleteId));
      else setMetres((prev) => prev.filter((m) => m.id !== deleteId));

      setToast({
        message: `${activeTab === "estimate" ? "آیتم برآورد" : activeTab === "minutes" ? "صورت‌جلسه" : activeTab === "statements" ? "صورت‌وضعیت" : activeTab === ("permits" as any) ? "مجوز کار" : activeTab === ("materials" as any) ? (materialSubTab === "MRS" ? "سند ورود مصالح" : "سند خروج مصالح") : activeTab === ("variation" as any) ? "ابلاغیه تغییرات" : "سند"} با موفقیت حذف شد`,
        type: "success"
      });
      setIsDeleteModalOpen(false);
      setDeleteId(null);
    }
  };

  const handleDuplicateMinute = (originalMinute: ProjectMinute) => {
    const newMinuteId = Math.random().toString(36).substr(2, 9);
    const nextNumber = getNextNumber(minutes, "number");
    const newMinute: ProjectMinute = {
      ...originalMinute,
      id: newMinuteId,
      number: nextNumber,
      date: new Date().toLocaleDateString("fa-IR"),
      description: originalMinute.description + " (کپی)",
      isFinalFrozen: false,
      status: WorkflowStatus.DRAFT,
      createdById: currentUser?.id,
      ownerOrgId: currentUser?.orgId,
      currentOrgId: currentUser?.orgId,
      assigneeId: undefined,
      workflowHistory: [],
    };
    const originalMetres = metres.filter(
      (m) => m.minuteId === originalMinute.id,
    );
    const newMetres = originalMetres.map((m) => ({
      ...m,
      id: Math.random().toString(36).substr(2, 9),
      minuteId: newMinuteId,
      isArchived: false,
    }));
    setMinutes((prev) => [newMinute, ...prev]);
    setMetres((prev) => [...prev, ...newMetres]);
    setEditingId(newMinuteId);
    setMinForm(newMinute);
    setIsModalOpen(true);
    setToast({ message: "صورت‌جلسه با موفقیت کپی شد", type: "success" });
  };

  const handleDuplicateStatement = (sourceStmt: Statement) => {
    const newStmtId = Math.random().toString(36).substr(2, 9);
    const nextNumber = getNextNumber(statements, "number");
    const newMinuteIds: string[] = [];
    const newMinutes: ProjectMinute[] = [];
    const newMetres: MetreRow[] = [];
    const createdMetreIds: string[] = [];
    let minCounter =
      minutes.filter((m) => m.projectId === selectedProjectId).length + 1;

    sourceStmt.selectedMinuteIds.forEach((minId) => {
      const originalMin = minutes.find((m) => m.id === minId);
      if (originalMin) {
        const newMinId = Math.random().toString(36).substr(2, 9);
        const newMinNum = minCounter.toString().padStart(2, "0");
        minCounter++;
        const newMin: ProjectMinute = {
          ...originalMin,
          id: newMinId,
          number: newMinNum,
          date: new Date().toLocaleDateString("fa-IR"),
          description: `${originalMin.description} (کپی برای صورت‌وضعیت ${nextNumber})`,
          isFinalFrozen: false,
          status: WorkflowStatus.DRAFT,
          createdById: currentUser?.id,
          ownerOrgId: currentUser?.orgId,
          currentOrgId: currentUser?.orgId,
          assigneeId: undefined,
          workflowHistory: [],
        };
        newMinutes.push(newMin);
        newMinuteIds.push(newMinId);
        const originalMetres = metres.filter((m) => m.minuteId === minId);
        originalMetres.forEach((om) => {
          const newMetreId = Math.random().toString(36).substr(2, 9);
          createdMetreIds.push(newMetreId);
          newMetres.push({
            ...om,
            id: newMetreId,
            minuteId: newMinId,
            isArchived: false,
          });
        });
      }
    });

    const newStmt: Statement = {
      ...sourceStmt,
      id: newStmtId,
      number: nextNumber,
      date: new Date().toLocaleDateString("fa-IR"),
      startDate: sourceStmt.endDate || "",
      endDate: "",
      description: `صورت‌وضعیت جدید (کپی شده از ${sourceStmt.number})`,
      selectedMinuteIds: newMinuteIds,
      status: WorkflowStatus.DRAFT,
      isFinalFrozen: false,
      createdById: currentUser?.id,
      ownerOrgId: currentUser?.orgId,
      currentOrgId: currentUser?.orgId,
      assigneeId: undefined,
      workflowHistory: [],
    };
    setMinutes((prev) => [...newMinutes, ...prev]);
    setMetres((prev) => [...newMetres, ...prev]);
    setStatements((prev) => [newStmt, ...prev]);
    setTempDuplicatedIds({
      stmtId: newStmtId,
      minuteIds: newMinuteIds,
      metreIds: createdMetreIds,
    });
    setEditingId(newStmtId);
    setStmtForm(newStmt);
    setIsModalOpen(true);
    setToast({ message: "صورت‌وضعیت با موفقیت تکثیر و در حالت ویرایش پیش‌نویس قرار گرفت", type: "info" });
  };

  const handleEditMinuteMetre = (minuteId: string) => {
    if (activeTab === "statements") setReturnToStatementId(editingId);
    if (activeTab === "minutes") setReturnToTab("minutes");
    setActiveTab("metre");
    setMetreMinuteId(minuteId);
    const associatedMetres = metres.filter((m) => m.minuteId === minuteId);
    if (associatedMetres.length > 0) {
      // Heal data on load: if row has code but description looks like a daily log, try to resolve official description
      const healedMetres = associatedMetres.map(m => {
        if (m.itemCode && (!m.description || m.description.includes("کارکرد روزانه"))) {
          const info = findPriceListItem(m.itemCode);
          if (info) {
            return {
              ...m,
              description: info.description,
              unit: info.unit,
              unitPrice: info.price
            };
          }
        }
        return m;
      });
      setMetreRowsForm(healedMetres);
      setEditingId(null);
    } else {
      setMetreRowsForm([
        {
          id: Math.random().toString(36).substr(2, 9),
          count: 1,
          length: 1,
          width: 1,
          height: 1,
          multiplier: 1,
          partialTotal: 0,
          itemType: "NORMAL",
          independentCoefficient: 1,
          unitPrice: 0,
        },
      ]);
      setEditingId(null);
    }
    setIsEditingFullMinute(true);
    setIsModalOpen(true);
  };

  const handleCompareStatement = (stmt: Statement) => {
    const comparisonData = getStatementComparison(stmt);
    setReportContextData({ ...stmt, comparison: comparisonData });
    setReportModalType("comparison");
    setIsReportModalOpen(true);
  };

  const handlePrintReport = (type: string, data: any = null) => {
    setReportContextData(data || {});
    setReportModalType(type as any);
    setIsReportModalOpen(true);
  };

  const initializeMrsForm = (record?: MrsRecord) => {
    if (record) setMrsForm(JSON.parse(JSON.stringify(record)));
    else
      setMrsForm({
        entryDate: new Date().toLocaleDateString("fa-IR"),
        entryTime: new Date().toLocaleTimeString("fa-IR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        items: [
          {
            id: Math.random().toString(36).substr(2, 9),
            materialType: "",
            materialName: "",
            quantity: 0,
            unit: "",
            supplier: "",
          },
        ],
        status: "DRAFT" as any,
        techOfficeApproval: { isApproved: false, comment: "" },
        siteManagerApproval: { isApproved: false, comment: "" },
        supervisorApproval: { isApproved: false, comment: "" },
        contractorExpertApproval: { isApproved: false, comment: "" },
        contractorUnitHeadApproval: { isApproved: false, comment: "" },
        contractorSiteManagerApproval: { isApproved: false, comment: "" },
        consultantExpertApproval: { isApproved: false, comment: "" },
        consultantUnitHeadApproval: { isApproved: false, comment: "" },
        consultantSiteManagerApproval: { isApproved: false, comment: "" },
        employerExpertApproval: { isApproved: false, comment: "" },
        employerUnitHeadApproval: { isApproved: false, comment: "" },
        employerSiteManagerApproval: { isApproved: false, comment: "" },
      });
  };

  const initializeMivForm = (record?: MivRecord) => {
    if (record) setMivForm(JSON.parse(JSON.stringify(record)));
    else {
      const currentUserOrg = currentUser?.orgId ? SystemAdminService.getOrganization(currentUser.orgId) : undefined;
      const formattedRequestor = currentUser ? formatUserDisplayFormal(currentUser, currentUserOrg) : "";
      
      setMivForm({
        serialNumber: getNextNumber(mivList, "serialNumber"),
        date: new Date().toLocaleDateString("fa-IR"),
        requestedBy: formattedRequestor,
        items: [
          {
            id: Math.random().toString(36).substr(2, 9),
            materialName: "",
            quantity: 0,
            unit: "",
          },
        ],
        status: "DRAFT" as any,
        warehouseManagerApproval: { isApproved: false, comment: "" },
        siteManagerApproval: { isApproved: false, comment: "" },
        contractorExpertApproval: { isApproved: false, comment: "" },
        contractorUnitHeadApproval: { isApproved: false, comment: "" },
        contractorSiteManagerApproval: { isApproved: false, comment: "" },
        consultantExpertApproval: { isApproved: false, comment: "" },
        consultantUnitHeadApproval: { isApproved: false, comment: "" },
        consultantSiteManagerApproval: { isApproved: false, comment: "" },
        employerExpertApproval: { isApproved: false, comment: "" },
        employerUnitHeadApproval: { isApproved: false, comment: "" },
        employerSiteManagerApproval: { isApproved: false, comment: "" },
      });
    }
  };

  const addMivRow = () => {
    setMivForm((prev) => ({
      ...prev,
      items: [
        ...(prev.items || []),
        {
          id: Math.random().toString(36).substr(2, 9),
          materialName: "",
          quantity: 0,
          unit: "",
        },
      ],
    }));
  };

  const removeMivRow = (id: string) => {
    setMivForm((prev) => ({
      ...prev,
      items: prev.items?.filter((i) => i.id !== id),
    }));
  };

  const updateMivRowField = (
    id: string,
    field: keyof MivMaterialItem,
    value: any,
  ) => {
    setMivForm((prev) => ({
      ...prev,
      items: prev.items?.map((i) => {
        if (i.id === id) {
          if (field === "materialName") {
            const stock = getMaterialBalance().find(
              (b) => b.materialName === value,
            );
            if (stock)
              return {
                ...i,
                [field]: value,
                unit: stock.unit,
                materialType: stock.materialType,
              };
          }
          return { ...i, [field]: value };
        }
        return i;
      }),
    }));
  };

  const canUserApproveMaterialRole = (roleId: string): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === "SYSTEM_ADMIN") return true;

    const userOrgType = SystemAdminService.getOrganization(currentUser.orgId)?.type;

    // Verify organization type
    if (
      (roleId === "techOffice" ||
        roleId === "siteManager" ||
        roleId === "warehouseManager" ||
        roleId.startsWith("contractor")) &&
      userOrgType !== OrganizationType.CONTRACTOR
    ) {
      return false;
    }
    if (
      (roleId === "supervisor" || roleId.startsWith("consultant")) &&
      userOrgType !== OrganizationType.CONSULTANT
    ) {
      return false;
    }
    if (roleId.startsWith("employer") && userOrgType !== OrganizationType.EMPLOYER) {
      return false;
    }

    const ut = (currentUser.jobTitle || "").toLowerCase().trim();
    const ul = (currentUser.jobLevel || "").toLowerCase().trim();
    const ud = (currentUser.department || "").toLowerCase().trim();
    const combined = `${ut} ${ul} ${ud} ${currentUser.role || ""}`;

    const isOrgAuthority =
      currentUser.role === "ORG_ADMIN" ||
      currentUser.role === "ORG_MANAGER" ||
      combined.includes("مدیر ارشد") ||
      combined.includes("مدیر عامل");

    const isPM =
      isOrgAuthority ||
      combined.includes("مدیر پروژه") ||
      combined.includes("مدیر طرح") ||
      combined.includes("مجری") ||
      combined.includes("نماینده");

    const isWorkshopManager =
      isPM ||
      combined.includes("سرپرست کارگاه") ||
      combined.includes("رئیس کارگاه") ||
      combined.includes("مدیر کارگاه") ||
      combined.includes("سرپرست نظارت") ||
      combined.includes("رئیس دستگاه نظارت") ||
      combined.includes("ناظر مقیم") ||
      combined.includes("مدیر انبار") ||
      combined.includes("مسئول انبار") ||
      combined.includes("انباردار");

    const isUnitHead =
      isWorkshopManager ||
      combined.includes("سرپرست واحد") ||
      combined.includes("رئیس دفتر فنی") ||
      combined.includes("سرپرست دفتر فنی") ||
      combined.includes("سرپرست");

    const isExpert =
      isUnitHead ||
      combined.includes("کارشناس") ||
      combined.includes("مهندس") ||
      true; // Any member within the organization has at least expert-level approval authority

    if (roleId.endsWith("Expert") || roleId === "techOffice") {
      return isExpert;
    }
    if (roleId.endsWith("UnitHead") || roleId === "supervisor") {
      return isUnitHead;
    }
    if (
      roleId.endsWith("SiteManager") ||
      roleId === "siteManager" ||
      roleId === "warehouseManager"
    ) {
      return isWorkshopManager;
    }

    return true;
  };

  const updateMivApproval = (
    role:
      | "warehouseManager"
      | "siteManager"
      | "contractorExpert"
      | "contractorUnitHead"
      | "contractorSiteManager"
      | "consultantExpert"
      | "consultantUnitHead"
      | "consultantSiteManager"
      | "employerExpert"
      | "employerUnitHead"
      | "employerSiteManager",
    field: "isApproved" | "comment",
    value: any,
  ) => {
    if (!currentUser) return;
    if (!canUserApproveMaterialRole(role)) return;

    const key = `${role}Approval` as keyof MivRecord;
    setMivForm((prev) => {
      const current = (prev[key] as ApprovalDetail) || {
        isApproved: false,
        comment: "",
      };
      return { ...prev, [key]: { ...current, [field]: value } };
    });
  };

  const filteredItems = useMemo(() => {
    let items: any[] = [];
    if (activeTab === "estimate") items = estimates;
    else if (activeTab === "minutes") items = minutes;
    else if (activeTab === "metre") items = metres;
    else if (activeTab === "statements") items = statements;
    else if (activeTab === ("permits" as any)) items = workPermits;
    else if (activeTab === ("materials" as any)) {
      if (materialSubTab === "MRS") items = mrsList;
      else if (materialSubTab === "MIV") items = mivList;
      else {
        // Balance logic: Strictly filter by name if search term exists
        const allBalance = getMaterialBalance();
        if (!searchTerm.trim()) return allBalance;
        return allBalance.filter(
          (i) =>
            i.materialName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            i.materialType.toLowerCase().includes(searchTerm.toLowerCase()),
        );
      }
    } else if (activeTab === ("variation" as any)) items = variations;
    else if (activeTab === "discrepancy") items = discrepancyData.items;
    else if (activeTab === ("adjustment" as any)) return []; // Handled separately

    return items.filter((item: any) => {
      if (activeTab === ("materials" as any) && materialSubTab === "BALANCE")
        return true;
      if (
        activeTab !== "discrepancy" &&
        activeTab !== "materials" &&
        item.projectId &&
        item.projectId !== selectedProjectId
      )
        return false;
      if (
        activeTab === ("materials" as any) &&
        materialSubTab !== "BALANCE" &&
        item.projectId !== selectedProjectId
      )
        return false;

      // Visibility Logic
      let visibilityType: any = null;
      if (activeTab === "minutes") visibilityType = "minute";
      else if (activeTab === "statements") visibilityType = "statement";
      else if (activeTab === "metre") visibilityType = "metre";
      else if (activeTab === "estimate") visibilityType = "estimate";
      else if (activeTab === ("permits" as any)) visibilityType = "permit";
      else if (activeTab === ("variation" as any)) visibilityType = "variation";
      else if (activeTab === ("materials" as any) && materialSubTab === "MRS") visibilityType = "mrs";
      else if (activeTab === ("materials" as any) && materialSubTab === "MIV") visibilityType = "miv";

      if (visibilityType && !checkItemVisibility(item, visibilityType)) return false;

      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return JSON.stringify(item).toLowerCase().includes(term);
    });
  }, [
    activeTab,
    materialSubTab,
    estimates,
    minutes,
    metres,
    statements,
    workPermits,
    mrsList,
    mivList,
    variations,
    discrepancyData,
    selectedProjectId,
    searchTerm,
    getMaterialBalance,
    checkItemVisibility,
  ]);

  const toggleMinuteInStatement = (minuteId: string) => {
    setStmtForm((prev) => {
      const currentIds = prev.selectedMinuteIds || [];
      if (currentIds.includes(minuteId))
        return {
          ...prev,
          selectedMinuteIds: currentIds.filter((id) => id !== minuteId),
        };
      else return { ...prev, selectedMinuteIds: [...currentIds, minuteId] };
    });
  };

  const checkPermitDisciplineExpertAuth = (disciplineKey: string): boolean => {
    if (!currentUser) return false;
    const isSystemAdmin = currentUser.role === "SYSTEM_ADMIN";
    if (isSystemAdmin) return true;

    const ut = (currentUser.jobTitle || "").toLowerCase();
    const ul = (currentUser.jobLevel || "").toLowerCase();
    const ud = (currentUser.department || "").toLowerCase();
    const uCombined = `${ut} ${ul} ${ud}`;

    // System Admins, Organization Admins, and Project/Workshop managers have override authority for all disciplines within their organization
    const isPMOrManager = currentUser.role === "ORG_ADMIN" || 
                          currentUser.role === "ORG_MANAGER" ||
                          uCombined.includes("مدیر پروژه") || 
                          uCombined.includes("سرپرست کارگاه") ||
                          currentUser.username === 'e-pm' ||
                          currentUser.id === 'e-pm';
    
    if (isPMOrManager) return true;

    // Otherwise, match specific disciplines:
    switch (disciplineKey) {
      case "Dcc":
        return uCombined.includes("dcc") || uCombined.includes("مدارک") || uCombined.includes("اسناد") || uCombined.includes("کنترل") || uCombined.includes("آرشیو");
      case "Surveyor":
        return uCombined.includes("نقشه") || uCombined.includes("survey") || uCombined.includes("مساح") || uCombined.includes("گرید");
      case "Hse":
        return uCombined.includes("hse") || uCombined.includes("ایمنی") || uCombined.includes("بهداشت") || uCombined.includes("محیط زیست") || uCombined.includes("سلامت");
      case "Civil":
        return uCombined.includes("عمران") || uCombined.includes("سیویل") || uCombined.includes("civil") || uCombined.includes("سازه") || uCombined.includes("ابنیه") || uCombined.includes("ساختمان") || uCombined.includes("معماری");
      case "Electrical":
        return uCombined.includes("برق") || uCombined.includes("الکتریک") || uCombined.includes("electrical") || uCombined.includes("نیرو");
      case "Mechanical":
        return uCombined.includes("مکانیک") || uCombined.includes("mechanical") || uCombined.includes("تاسیسات") || uCombined.includes("تأسیسات") || uCombined.includes("مکانیکی");
      default:
        return false;
    }
  };

  const getDisciplineExpertName = (key: string): string => {
    switch (key) {
      case "Dcc": return "کنترل مدارک (DCC)";
      case "Surveyor": return "نقشه‌برداری";
      case "Hse": return "ایمنی و بهداشت (HSE)";
      case "Civil": return "سیویل و عمران";
      case "Electrical": return "تاسیسات برق";
      case "Mechanical": return "تاسیسات مکانیک";
      default: return "";
    }
  };

  const updatePermitDiscipline = (
    role: "contractor" | "consultant" | "employer",
    discipline: string,
    field: "isApproved" | "comment",
    value: any,
  ) => {
    if (!currentUser) return;
    const userOrgType = SystemAdminService.getOrganization(
      currentUser.orgId,
    )?.type;
    const isSystemAdmin = currentUser.role === "SYSTEM_ADMIN";
    const isWorkshopSupervisor =
      (currentUser.jobTitle || "").includes("سرپرست کارگاه") ||
      (currentUser.jobLevel || "").includes("سرپرست کارگاه");

    // Check permission
    if (!isSystemAdmin && !isWorkshopSupervisor) {
      if (role === "contractor" && userOrgType !== OrganizationType.CONTRACTOR)
        return;
      if (role === "consultant" && userOrgType !== OrganizationType.CONSULTANT)
        return;
      if (role === "employer" && userOrgType !== OrganizationType.EMPLOYER)
        return;
    }

    // Check discipline expert restriction
    if (!checkPermitDisciplineExpertAuth(discipline)) {
      alert(`خطا: شما به عنوان کارشناس «${getDisciplineExpertName(discipline)}» در سازمان خود شناسایی نشدید و دسترسی تایید یا نظردهی این دیسیپلین را ندارید.`);
      return;
    }

    const key = `${role}${discipline}` as keyof WorkPermit;
    setPermitForm((prev) => {
      const currentDetail = (prev[key] as ApprovalDetail) || {
        isApproved: false,
        comment: "",
      };
      return { ...prev, [key]: { ...currentDetail, [field]: value } };
    });
  };

  const addMrsRow = () => {
    setMrsForm((prev) => ({
      ...prev,
      items: [
        ...(prev.items || []),
        {
          id: Math.random().toString(36).substr(2, 9),
          materialType: "",
          materialName: "",
          quantity: 0,
          unit: "",
          supplier: "",
        },
      ],
    }));
  };

  const removeMrsRow = (id: string) => {
    setMrsForm((prev) => ({
      ...prev,
      items: prev.items?.filter((i) => i.id !== id),
    }));
  };

  const updateMrsRowField = (
    id: string,
    field: keyof MrsMaterialItem,
    value: any,
  ) => {
    setMrsForm((prev) => ({
      ...prev,
      items: prev.items?.map((i) =>
        i.id === id ? { ...i, [field]: value } : i,
      ),
    }));
  };

  const updateMrsApproval = (
    role:
      | "techOffice"
      | "siteManager"
      | "supervisor"
      | "contractorExpert"
      | "contractorUnitHead"
      | "contractorSiteManager"
      | "consultantExpert"
      | "consultantUnitHead"
      | "consultantSiteManager"
      | "employerExpert"
      | "employerUnitHead"
      | "employerSiteManager",
    field: "isApproved" | "comment",
    value: any,
  ) => {
    if (!currentUser) return;
    if (!canUserApproveMaterialRole(role)) return;

    const key = `${role}Approval` as keyof MrsRecord;
    setMrsForm((prev) => {
      const current = (prev[key] as ApprovalDetail) || {
        isApproved: false,
        comment: "",
      };
      return { ...prev, [key]: { ...current, [field]: value } };
    });
  };

  const checkPermitSignatureAuth = (roleId: string): boolean => {
    if (!currentUser) return false;
    const isSystemAdmin = currentUser.role === "SYSTEM_ADMIN";
    if (isSystemAdmin) return true;

    const userOrgType = SystemAdminService.getOrganization(currentUser.orgId)?.type;
    // Must belong to the Contractor organization
    if (userOrgType !== OrganizationType.CONTRACTOR) return false;

    const ut = (currentUser.jobTitle || "").toLowerCase();
    const ul = (currentUser.jobLevel || "").toLowerCase();
    const ud = (currentUser.department || "").toLowerCase();
    const uCombined = `${ut} ${ul} ${ud}`;

    // Project Manager or Org Admin of Contractor has admin override privilege
    const isPMOrAdmin = currentUser.role === "ORG_ADMIN" || 
                        currentUser.role === "ORG_MANAGER" ||
                        uCombined.includes("مدیر پروژه") || 
                        currentUser.username === 'e-pm' ||
                        currentUser.id === 'e-pm';

    if (isPMOrAdmin) return true;

    if (roleId === "contractorExpert") {
      // Must be an expert / کارشناس
      return uCombined.includes("کارشناس") || uCombined.includes("expert") || uCombined.includes("دفتر فنی");
    }

    if (roleId === "contractorUnitHead") {
      // Must be a Unit Head / سرپرست واحد / رئیس دفتر فنی
      return uCombined.includes("سرپرست واحد") || uCombined.includes("رئیس") || uCombined.includes("رییس") || uCombined.includes("head") || uCombined.includes("مدیر دفتر فنی") || uCombined.includes("سرپرست دفتر فنی");
    }

    if (roleId === "contractorSiteManager") {
      // Must be Workshop Manager / سرپرست کارگاه
      return uCombined.includes("سرپرست کارگاه") || uCombined.includes("مدیر کارگاه") || uCombined.includes("site manager") || uCombined.includes("workshop manager");
    }

    return false;
  };

  const getPermitSignatureRoleRequiredName = (roleId: string): string => {
    if (roleId === "contractorExpert") return "کارشناس دفتر فنی";
    if (roleId === "contractorUnitHead") return "سرپرست واحد / رئیس دفتر فنی";
    if (roleId === "contractorSiteManager") return "سرپرست کارگاه";
    return "";
  };

  const updatePermitApproval = (
    role:
      | "contractorExpert"
      | "contractorUnitHead"
      | "contractorSiteManager",
    field: "isApproved" | "comment",
    value: any,
  ) => {
    // Check permission
    if (!checkPermitSignatureAuth(role)) {
      alert(`خطا: شما به عنوان «${getPermitSignatureRoleRequiredName(role)}» یا مدیر پروژه مجاز در سازمان پیمانکار شناسایی نشدید و دسترسی تایید یا درج نظر در این بخش را ندارید.`);
      return;
    }

    const key = `${role}Approval` as keyof WorkPermit;
    setPermitForm((prev) => {
      const current = (prev[key] as ApprovalDetail) || {
        isApproved: false,
        comment: "",
      };
      return { ...prev, [key]: { ...current, [field]: value } };
    });
  };

  const addMetreRow = () => {
    setMetreRowsForm((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substr(2, 9),
        count: 1,
        length: 1,
        width: 1,
        height: 1,
        multiplier: 1,
        partialTotal: 0,
        itemType: "NORMAL",
        independentCoefficient: 1,
        unitPrice: 0,
      },
    ]);
  };

  const updateMetreRowField = (
    id: string,
    field: keyof MetreRow,
    value: any,
  ) => {
    setMetreRowsForm((prev) =>
      prev.map((row) => {
        if (row.id === id) {
          const updated = { ...row, [field]: value };

          // If itemCode is changed, try to find in estimates or global lists and update description/unit
          if (field === "itemCode") {
            const itemInfo = findPriceListItem(value);
            if (itemInfo) {
              updated.description = itemInfo.description;
              updated.unit = itemInfo.unit;
              updated.unitPrice = itemInfo.price;
            }
          }

          // Convert numerical fields
          if (
            [
              "count",
              "length",
              "width",
              "height",
              "multiplier",
              "independentCoefficient",
              "unitPrice",
              "partialTotal",
            ].includes(field as string)
          ) {
            const numVal = parseFloat(toEnglishDigits(String(value)));
            (updated as any)[field] = isNaN(numVal)
              ? field === "partialTotal"
                ? 0
                : 1
              : numVal;
          }

          // Auto-recalculate partialTotal if dimensions change
          if (
            ["count", "length", "width", "height", "multiplier"].includes(
              field as string,
            )
          ) {
            const getVal = (v: any) => {
              const n = parseFloat(v);
              return isNaN(n) || n === 0 ? 1 : n;
            };
            const c = getVal(updated.count);
            const l = getVal(updated.length);
            const w = getVal(updated.width);
            const h = getVal(updated.height);
            const m = parseFloat(updated.multiplier as any) || 1;
            updated.partialTotal = parseFloat((c * l * w * h * m).toFixed(3));
            updated.isManualPartialTotal = false;
          } else if (field === "partialTotal") {
            updated.isManualPartialTotal = true;
          }
          return updated;
        }
        return row;
      }),
    );
  };

  return (
    <div className="theme-adaptive-module space-y-6 pb-12 text-right text-stone-900 dark:text-slate-100" dir="rtl">
      {/* Dynamic Header */}
      <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-stone-200/80 dark:border-slate-800 shadow-sm flex flex-col xl:flex-row justify-between items-center gap-8">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-stone-900 dark:bg-slate-800 rounded-[1.5rem] flex items-center justify-center text-amber-500 shadow-2xl shadow-stone-500/20 border border-transparent dark:border-slate-700">
            <Calculator size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-stone-900 dark:text-white tracking-tight">
              دفتر فنی هوشمند
            </h2>
            <p className="text-stone-500 dark:text-slate-400 text-xs font-bold mt-1">
              برآورد، متره، صورت‌جلسات، صورت وضعیت‌ها و تعدیل
            </p>
          </div>
          <div className="flex items-center gap-2 bg-white dark:bg-slate-800 text-stone-900 dark:text-white p-2.5 rounded-2xl border border-stone-300 dark:border-slate-700 shadow-sm">
            <Building2 size={18} className="text-amber-600 mr-2" />
            <select
              value={selectedProjectId}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedProjectId(val);
                localStorage.setItem("hamyar_selected_project_id", val);
                window.dispatchEvent(new Event('storage'));
                window.dispatchEvent(new CustomEvent('project-changed', { detail: { projectId: val } }));
              }}
              className="bg-transparent text-xs font-black text-stone-900 dark:text-white outline-none cursor-pointer pl-4"
            >
              {accessibleProjects.length === 0 ? (
                <option value="">هیچ پروژه مجازی یافت نشد</option>
              ) : (
                accessibleProjects.map((p) => (
                  <option key={p.id} value={p.id} className="bg-white dark:bg-slate-900 text-stone-900 dark:text-white font-bold">
                    {p.title} ({p.contractNumber || 'پروژه'})
                  </option>
                ))
              )}
            </select>
          </div>
        </div>
        <div className="flex bg-stone-100/80 dark:bg-slate-800/80 p-1.5 rounded-[1.5rem] gap-1.5 flex-wrap justify-center border border-stone-200/50 dark:border-slate-700/60">
          {[
            {
              id: "estimate",
              label: currentProject?.contractType === "CBS" ? "ساختار شکست هزینه (CBS)" : "برآورد پیمان",
              icon: <Layers size={18} />,
            },
            ...(currentProject?.contractType === "CBS"
              ? [
                  {
                    id: "cbsStatements",
                    label: "صورت وضعیت CBS",
                    icon: <FileSignature size={18} />,
                  },
                ]
              : [
                  {
                    id: "minutes",
                    label: "صورت‌جلسات",
                    icon: <FileSpreadsheet size={18} />,
                  },
                  {
                    id: "metre",
                    label: "ریزمتره و احجام",
                    icon: <Ruler size={18} />,
                  },
                  {
                    id: "statements",
                    label: "صورت‌وضعیت",
                    icon: <ScrollText size={18} />,
                  },
                ]),
            {
              id: "variation",
              label: "تغییر مقادیر",
              icon: <Scale size={18} />,
            },
            {
              id: "adjustment",
              label: "تعدیل",
              icon: <TrendingUp size={18} />,
            },
            {
              id: "materials",
              label: "کنترل مصالح (MRS/MIV)",
              icon: <Truck size={18} />,
            },
            {
              id: "permits",
              label: "مجوز کار",
              icon: <FileSignature size={18} />,
            },
            ...(currentProject?.contractType === "CBS"
              ? []
              : [
                  {
                    id: "discrepancy",
                    label: "کنترل مغایرت",
                    icon: <ArrowLeftRight size={18} />,
                  },
                ]),
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-6 py-2.5 rounded-2xl text-xs font-black flex items-center gap-3 transition-all ${activeTab === tab.id ? "bg-stone-900 text-white shadow-lg shadow-stone-900/20" : "text-stone-500 hover:text-stone-900"}`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === ("adjustment" as any) ? (
        <AdjustmentTab
          selectedProjectId={selectedProjectId}
          statements={statements}
          minutes={minutes}
          metres={metres}
          getRowEffectivePrice={getRowEffectivePrice}
          getMultipliers={getMultipliers}
          currentUser={currentUser}
          orgUsers={orgUsers}
          openWorkflowModal={openWorkflowModal}
          adjustments={adjustments}
          setAdjustments={setAdjustments}
          handlePrintOfficial={handlePrintOfficial}
          onOpenHistory={(item: any) => {
            setHistoryItem(item);
            setHistoryModalOpen(true);
          }}
        />
      ) : activeTab === "cbsStatements" ? (
        <CbsStatements selectedProjectIdProp={selectedProjectId} hideProjectSelector={true} />
      ) : activeTab === "estimate" && currentProject?.contractType === "CBS" ? (
        <CbsManagement selectedProjectId={selectedProjectId} />
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-8 rounded-[2.5rem] border border-stone-200 shadow-sm flex items-center gap-6 group hover:border-amber-500/50 transition-all">
              <div className="w-14 h-14 bg-stone-50 text-stone-900 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Activity size={28} />
              </div>
              <div>
                <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">
                  {statLabels.raw}
                </p>
                <h3 className="text-2xl font-black text-stone-900 tracking-tighter mt-1">
                  {Math.round(stats.rawTotal).toLocaleString()}{" "}
                  <span className="text-xs opacity-40 font-bold">
                    {statLabels.unit}
                  </span>
                </h3>
              </div>
            </div>
            <div className="bg-white p-8 rounded-[2.5rem] border border-stone-200 shadow-sm flex items-center gap-6 group hover:border-emerald-500/50 transition-all">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <CheckCircle size={28} />
              </div>
              <div>
                <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">
                  {statLabels.coeff}
                </p>
                <h3 className="text-2xl font-black text-stone-900 tracking-tighter mt-1">
                  {Math.round(stats.withCoeffTotal).toLocaleString()}{" "}
                  <span className="text-xs opacity-40 font-bold">
                    {statLabels.unit}
                  </span>
                </h3>
              </div>
            </div>
            <div className="bg-white p-8 rounded-[2.5rem] border border-stone-200 shadow-sm flex items-center gap-6 group hover:border-amber-500/50 transition-all">
              <div className="w-14 h-14 bg-amber-50 text-stone-900 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <AlertTriangle size={28} />
              </div>
              <div>
                <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">
                  {statLabels.extra}
                </p>
                <h3 className="text-2xl font-black text-stone-900 tracking-tighter mt-1">
                  {activeTab === "discrepancy" || activeTab === ("variation" as any)
                    ? Math.round(
                        activeTab === ("variation" as any)
                          ? stats.extraStat
                          : discrepancyData.totals.diff,
                      ).toLocaleString()
                    : stats.extraStat}{" "}
                  <span className="text-xs opacity-40 font-bold">
                    {activeTab === "discrepancy" || activeTab === ("variation" as any)
                      ? "ریال"
                      : "مورد"}
                  </span>
                </h3>
              </div>
            </div>
          </div>

          {/* Main Table Container */}
          <div className="bg-white rounded-[3.5rem] border border-[#e5ded0] shadow-sm overflow-hidden min-h-[550px] flex flex-col group/table transition-all duration-500">
            <div className="p-8 border-b flex flex-col md:flex-row justify-between items-center gap-6 bg-[#faf8f4]/30">
              <div className="relative w-full md:w-96 group/search">
                <Search
                  className="absolute right-6 top-1/2 -transtone-y-1/2 text-stone-400 group-focus-within:text-stone-500 transition-colors"
                  size={24}
                />
                <input
                  type="text"
                  placeholder="جستجو در آیتم‌ها..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white pr-16 pl-6 py-4 rounded-[2rem] text-sm font-bold outline-none border border-[#e5ded0] focus:border-stone-500 focus:ring-4 focus:ring-stone-50 transition-all shadow-sm"
                />
              </div>

              {activeTab === ("materials" as any) && (
                <div className="flex bg-stone-200 p-1 rounded-2xl gap-1">
                  <button
                    onClick={() => setMaterialSubTab("MRS")}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${materialSubTab === "MRS" ? "bg-white text-stone-900 shadow-sm" : "text-stone-500"}`}
                  >
                    مصالح وارده (MRS)
                  </button>
                  <button
                    onClick={() => setMaterialSubTab("MIV")}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${materialSubTab === "MIV" ? "bg-white text-stone-900 shadow-sm" : "text-stone-500"}`}
                  >
                    حواله خروج (MIV)
                  </button>
                  <button
                    onClick={() => setMaterialSubTab("BALANCE")}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${materialSubTab === "BALANCE" ? "bg-white text-emerald-600 shadow-sm" : "text-stone-500"}`}
                  >
                    گزارش موجودی
                  </button>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-center md:justify-end gap-3 w-full md:w-auto flex-1">
                <button
                  onClick={() => {
                    if (activeTab === "minutes" || activeTab === "statements")
                      handlePrintOfficial(activeTab);
                    else if (activeTab === ("materials" as any)) {
                      if (materialSubTab === "MRS")
                        handlePrintOfficial("materials_mrs", null);
                      if (materialSubTab === "MIV")
                        handlePrintOfficial("materials_miv", null);
                      if (materialSubTab === "BALANCE") {
                        // Professional Report should filter according to search bar
                        const filteredBalance = getMaterialBalance().filter(
                          (i) =>
                            i.materialName
                              .toLowerCase()
                              .includes(searchTerm.toLowerCase()) ||
                            i.materialType
                              .toLowerCase()
                              .includes(searchTerm.toLowerCase()),
                        );
                        handlePrintOfficial(
                          "materials_balance",
                          filteredBalance,
                        );
                      }
                    } else handlePrintOfficial(activeTab, null);
                  }}
                  className="shrink-0 flex items-center justify-center gap-2 bg-stone-100 border border-[#e5ded0] text-stone-700 px-6 py-3 rounded-xl text-xs font-bold hover:bg-stone-200 transition-all shadow-sm h-fit"
                >
                  <Printer size={20} /> چاپ رسمی کل
                </button>
                {activeTab === "estimate" &&
                  currentUser &&
                  (() => {
                    const userOrgType = SystemAdminService.getOrganization(
                      currentUser.orgId,
                    )?.type;
                    const projectEstimates = estimates.filter(
                      (e) => e.projectId === selectedProjectId,
                    );

                    const forwardActionsList: {
                      action: string;
                      label: string;
                      title: string;
                      color: string;
                    }[] = [
                      {
                        action: "SUBMIT",
                        label: "ارسال کل پیش‌نویس‌ها",
                        title:
                          "ارسال تمامی ردیف‌های پیش‌نویس به کارشناس ارشد/سرپرست",
                        color:
                          "bg-amber-600 hover:bg-amber-700 shadow-stone-500/20",
                      },
                      {
                        action: "APPROVE",
                        label: "تایید کل موارد",
                        title: "تایید تمامی ردیف‌های ارسالی به شما",
                        color:
                          "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20",
                      },
                      {
                        action: "REASSIGN",
                        label: "ارجاع کل موارد",
                        title: "ارجاع تمامی ردیف‌های ارسالی به کارشناس دیگر",
                        color:
                          "bg-amber-600 hover:bg-amber-700 shadow-amber-500/20",
                      },
                      {
                        action: "REJECT",
                        label: "رد کل موارد",
                        title: "رد و عودت کل ردیف‌های ارسالی به شما",
                        color:
                          "bg-rose-600 hover:bg-rose-700 shadow-rose-500/20",
                      },
                      {
                        action: "RETURN_TO_CONTRACTOR",
                        label: "عودت کل موارد",
                        title: "عودت تمامی ردیف‌های ارسالی به پیمانکار",
                        color:
                          "bg-rose-700 hover:bg-rose-800 shadow-rose-600/20",
                      },
                      {
                        action: "RETURN_TO_CONSULTANT",
                        label: "عودت کل موارد",
                        title: "عودت تمامی ردیف‌های ارسالی به مشاور",
                        color:
                          "bg-rose-700 hover:bg-rose-800 shadow-rose-600/20",
                      },
                      {
                        action: "SEND_TO_CONSULTANT",
                        label: "ارسال کل به مشاور",
                        title: "ارسال تمامی ردیف‌های تایید شده به مشاور",
                        color:
                          "bg-amber-600 hover:bg-amber-700 shadow-stone-500/20",
                      },
                      {
                        action: "SEND_TO_EMPLOYER",
                        label:
                          userOrgType === OrganizationType.CONSULTANT
                            ? "تایید نهایی"
                            : "ارسال کل به کارفرما",
                        title:
                          userOrgType === OrganizationType.CONSULTANT
                            ? "تایید نهایی تمامی ردیف‌ها"
                            : "ارسال تمامی ردیف‌های تایید شده به کارفرما",
                        color:
                          "bg-purple-600 hover:bg-purple-700 shadow-purple-500/20",
                      },
                      {
                        action: "FINAL_APPROVE",
                        label:
                          userOrgType === OrganizationType.EMPLOYER
                            ? "تایید کل موارد"
                            : "تایید نهایی کل موارد",
                        title:
                          userOrgType === OrganizationType.EMPLOYER
                            ? "تایید نهایی و ثبت ردیف‌های ارسالی توسط کارفرما"
                            : "تایید نهایی تمامی ردیف‌های ارسالی توسط کارفرما",
                        color:
                          "bg-teal-600 hover:bg-teal-700 shadow-teal-500/20",
                      },
                    ];

                    const visibleButtons = forwardActionsList
                      .map((item) => {
                        let targets: EstimateItem[] = [];
                        if (item.action === "SUBMIT") {
                          targets = projectEstimates.filter((e) => {
                            const status = WorkflowService.getStatus(e);
                            const actions = WorkflowService.getAvailableActions(
                              e,
                              currentUser,
                              userOrgType,
                            );
                            return (
                              (status === WorkflowStatus.DRAFT ||
                                status === WorkflowStatus.REJECTED) &&
                              actions.includes("SUBMIT")
                            );
                          });
                        } else {
                          targets = projectEstimates.filter((e) => {
                            const actions = WorkflowService.getAvailableActions(
                              e,
                              currentUser,
                              userOrgType,
                            );
                            return actions.includes(item.action as any);
                          });
                        }
                        return { ...item, count: targets.length };
                      })
                      .filter((btn, idx, self) => {
                        if (btn.count === 0) return false;

                        // Contractor must NEVER see "SEND_TO_EMPLOYER"
                        if (userOrgType === OrganizationType.CONTRACTOR && btn.action === "SEND_TO_EMPLOYER") {
                          return false;
                        }

                        // Strict sequence: "تایید کل موارد" (APPROVE) must be clicked first.
                        // So if APPROVE button exists and has a count > 0:
                        // - Contractor: Hide SEND_TO_CONSULTANT
                        // - Consultant: Hide SEND_TO_EMPLOYER
                        const hasPendingApproval = self.some(s => s.action === "APPROVE" && s.count > 0);
                        if (hasPendingApproval) {
                          if (userOrgType === OrganizationType.CONTRACTOR && btn.action === "SEND_TO_CONSULTANT") {
                            return false;
                          }
                          if (userOrgType === OrganizationType.CONSULTANT && btn.action === "SEND_TO_EMPLOYER") {
                            return false;
                          }
                        }

                        // If FINAL_APPROVE is actually available (count > 0), regular APPROVE is redundant in the bulk panel
                        if (btn.action === "APPROVE") {
                          const hasFinalApprove = self.some(s => s.action === "FINAL_APPROVE" && s.count > 0);
                          if (hasFinalApprove) return false;
                        }
                        return true;
                      });

                    if (visibleButtons.length === 0) return null;

                    return (
                      <div className="flex flex-wrap gap-2 items-center justify-center md:justify-end">
                        {visibleButtons.map((btn) => (
                          <button
                            key={btn.action}
                            onClick={() => handleBatchSendEstimates(btn.action)}
                            className={`flex items-center justify-center gap-2 text-white px-5 py-3 rounded-xl text-[10px] font-bold shadow-md hover:shadow-lg transition-all active:scale-95 ${btn.color} min-w-[140px]`}
                            title={btn.title}
                          >
                            {btn.action === "REASSIGN" ? (
                              <ArrowLeftRight size={16} />
                            ) : btn.action === "REJECT" ||
                              btn.action === "RETURN_TO_CONTRACTOR" ||
                              btn.action === "RETURN_TO_CONSULTANT" ? (
                              <ArrowLeftCircle size={16} />
                            ) : (
                              <ArrowRightCircle size={16} />
                            )}
                            <span>{btn.label}</span>
                            <span className="bg-white/20 px-1.5 py-0.5 rounded-md">
                              {btn.count.toLocaleString("fa-IR")}
                            </span>
                          </button>
                        ))}
                      </div>
                    );
                  })()}
                {activeTab !== "discrepancy" &&
                  activeTab !== "adjustment" &&
                  (activeTab !== "materials" || materialSubTab !== "BALANCE") &&
                  canCreate && (
                    <button
                      onClick={() => {
                        setEditingId(null);
                        if (activeTab === "estimate")
                          setEstForm({
                            itemType: "NORMAL",
                            independentCoefficient: 1,
                          });
                        else if (activeTab === "minutes")
                          setMinForm({
                            number: getNextNumber(minutes, "number"),
                          });
                        else if (activeTab === "statements")
                          setStmtForm({
                            selectedMinuteIds: [],
                            number: getNextNumber(statements, "number"),
                          });
                        else if (activeTab === ("permits" as any)) {
                          setPermitForm({
                            number: getNextNumber(workPermits, "number"),
                          });
                          if (currentUser) {
                            const userOrgType =
                              SystemAdminService.getOrganization(
                                currentUser.orgId,
                              )?.type;
                            if (userOrgType === OrganizationType.CONSULTANT)
                              setPermitActiveRoleTab("consultant");
                            else if (userOrgType === OrganizationType.EMPLOYER)
                              setPermitActiveRoleTab("employer");
                            else setPermitActiveRoleTab("contractor");
                          }
                        } else if (activeTab === ("variation" as any))
                          initializeVariationForm();
                        else if (activeTab === ("materials" as any)) {
                          if (materialSubTab === "MIV") initializeMivForm();
                          else initializeMrsForm();
                        } else {
                          setMetreRowsForm([
                            {
                              id: Math.random().toString(36).substr(2, 9),
                              count: 1,
                              length: 1,
                              width: 1,
                              height: 1,
                              multiplier: 1,
                              partialTotal: 0,
                              itemType: "NORMAL",
                              independentCoefficient: 1,
                              unitPrice: 0,
                            },
                          ]);
                          setMetreMinuteId("");
                          setIsEditingFullMinute(false);
                        }
                        setIsModalOpen(true);
                      }}
                      className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-[#ffc745] text-stone-950 font-black px-8 py-4 rounded-[2rem] text-xs font-black shadow-lg shadow-stone-500/20 hover:bg-amber-700 transition-all active:scale-95"
                    >
                      <Plus size={20} /> ثبت مورد جدید
                    </button>
                  )}
                {!canCreate &&
                  activeTab !== "discrepancy" &&
                  activeTab !== "adjustment" &&
                  (activeTab !== "materials" ||
                    materialSubTab !== "BALANCE") && (
                    <div
                      className="flex-1 md:flex-none p-3 px-5 rounded-[2rem] bg-stone-50/70 border border-stone-100 flex items-center gap-2 text-[10px] font-bold text-amber-700 text-right max-w-md"
                      dir="rtl"
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-stone-500 animate-pulse shrink-0"></span>
                      <span>
                        ثبت خام به صورت پیش‌فرض ویژه پیمانکار است. دیدگاه‌های
                        بررسی فعال است. مجوز ثبت اسناد خام برای مشاور و کارفرما
                        در بخش تنظیمات پروژه‌ها با تصمیم ارشد کارفرما صادر
                        می‌شود.
                      </span>
                    </div>
                  )}
              </div>
            </div>

            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="text-stone-400 font-black border-b bg-[#faf8f4]/50 uppercase tracking-widest">
                    {activeTab === ("materials" as any) ? (
                      <>
                        <th className="p-6 w-16 text-center">ردیف</th>
                        {materialSubTab === "MRS" && (
                          <>
                            <th className="p-6 w-32">تاریخ ورود</th>
                            <th className="p-6 w-24">سریال قبض</th>
                            <th className="p-6">اقلام و شرح مصالح</th>
                            <th className="p-6">راننده / پلاک</th>
                            <th className="p-6 text-center">تاییدیه</th>
                          </>
                        )}
                        {materialSubTab === "MIV" && (
                          <>
                            <th className="p-6 w-32">تاریخ خروج</th>
                            <th className="p-6 w-24">شماره حواله</th>
                            <th className="p-6">اقلام درخواستی</th>
                            <th className="p-6">درخواست کننده / محل مصرف</th>
                            <th className="p-6 text-center">وضعیت</th>
                          </>
                        )}
                        {materialSubTab === "BALANCE" && (
                          <>
                            <th className="p-6">نوع مصالح</th>
                            <th className="p-6">نام و شرح مصالح</th>
                            <th className="p-6 text-center text-emerald-600">
                              کل وارده (MRS)
                            </th>
                            <th className="p-6 text-center text-stone-900">
                              کل مصرفی (MIV)
                            </th>
                            <th className="p-6 text-center text-stone-900">
                              موجودی (Balance)
                            </th>
                            <th className="p-6 text-center">واحد</th>
                          </>
                        )}
                        {materialSubTab !== "BALANCE" && (
                          <th className="p-6 text-center w-32">مدیریت</th>
                        )}
                      </>
                    ) : activeTab === ("variation" as any) ? (
                      <>
                        <th className="p-6 w-16 text-center">ردیف</th>
                        <th className="p-6 w-32">شماره و تاریخ</th>
                        <th className="p-6">شرح دستورکار / تغییرات</th>
                        <th className="p-6 text-center">وضعیت</th>
                        <th className="p-6 text-center w-32">مدیریت</th>
                      </>
                    ) : (
                      <>
                        <th className="p-6 w-16 text-center">ردیف</th>
                        {activeTab === ("permits" as any) && (
                          <th className="p-6 w-32">شماره و تاریخ</th>
                        )}
                        {activeTab === ("permits" as any) && (
                          <th className="p-6 w-40">موقعیت</th>
                        )}
                        {activeTab === ("permits" as any) && (
                          <th className="p-6 w-[30%]">موضوع مجوز</th>
                        )}
                        {activeTab === ("permits" as any) && (
                          <th className="p-6 text-center">تاییدات مشاور</th>
                        )}
                        {activeTab === ("permits" as any) && (
                          <th className="p-6 text-center">تاییدات کارفرما</th>
                        )}
                        {activeTab === ("permits" as any) && (
                          <th className="p-6 text-center">وضعیت نهایی</th>
                        )}

                        {activeTab === "discrepancy" && (
                          <th className="p-6 w-24">
                            {currentProject?.contractType === "CBS" ? "کد ساختار شکست (CBS)" : "کد آیتم"}
                          </th>
                        )}
                        {activeTab === "discrepancy" && (
                          <th className="p-6 w-[30%]">شرح عملیات</th>
                        )}
                        {activeTab === "discrepancy" && (
                          <th className="p-6 text-center">مقدار برآورد</th>
                        )}
                        {activeTab === "discrepancy" && (
                          <th className="p-6 text-center">مقدار اجرا</th>
                        )}
                        {activeTab === "discrepancy" && (
                          <th className="p-6 text-center">اختلاف مقدار</th>
                        )}
                        {activeTab === "discrepancy" && (
                          <th className="p-6 text-center">مبلغ کل برآورد</th>
                        )}
                        {activeTab === "discrepancy" && (
                          <th className="p-6 text-center">مبلغ کل اجرا</th>
                        )}
                        {activeTab === "discrepancy" && (
                          <th className="p-6 text-center">مبلغ اختلاف</th>
                        )}

                        {activeTab !== "permits" &&
                          activeTab !== "discrepancy" &&
                          activeTab !== "materials" && (
                            <>
                              <th className="p-6 w-40">
                                {activeTab === "minutes"
                                  ? "شماره و تاریخ"
                                  : activeTab === "statements"
                                    ? "شماره و دوره"
                                    : "اطلاعات پایه ردیف"}
                              </th>
                              <th className="p-6 w-[30%]">
                                شرح عملیات / موضوع
                              </th>
                              {activeTab === "metre" && (
                                <th className="p-6">تخصیص ص.ج</th>
                              )}
                              {activeTab !== "minutes" &&
                                activeTab !== "statements" && (
                                  <th className="p-6 text-center">مقدار</th>
                                )}
                              {(activeTab === "minutes" ||
                                activeTab === "statements" ||
                                activeTab === "estimate") && (
                                <th className="p-6 text-center">
                                  مبلغ کل (خام)
                                </th>
                              )}
                              {(activeTab === "minutes" ||
                                activeTab === "statements" ||
                                activeTab === "estimate") && (
                                <th className="p-6 text-center">وضعیت</th>
                              )}
                              <th className="p-6 text-center">
                                {currentProject?.contractType === "CBS" ? "سهم وزنی فیزیکی (٪)" : "مبلغ کل (با ضرایب)"}
                              </th>
                              {activeTab === "statements" && (
                                <>
                                  <th className="p-6 text-center text-stone-400">
                                    مبلغ قبلی
                                  </th>
                                  <th className="p-6 text-center text-stone-900">
                                    مبلغ دوره
                                  </th>
                                  <th className="p-6 text-center text-emerald-600">
                                    مبلغ تجمعی
                                  </th>
                                </>
                              )}
                            </>
                          )}
                        {activeTab !== "discrepancy" &&
                          activeTab !== "materials" && (
                            <th className="p-6 text-center w-32">مدیریت</th>
                          )}
                        {activeTab === ("materials" as any) &&
                          materialSubTab === "BALANCE" && (
                            <th className="p-6 text-center w-32"></th>
                          )}
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-40 text-center">
                        <div className="opacity-10 flex flex-col items-center gap-6">
                          <div className="w-24 h-24 bg-stone-900 rounded-[2rem] flex items-center justify-center text-white">
                            <Search size={48} />
                          </div>
                          <p className="font-black text-2xl tracking-tight">
                            رکوردی برای نمایش وجود ندارد
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((row: any, idx) => {
                      if (activeTab === ("materials" as any)) {
                        if (materialSubTab === "MRS") {
                          const item = row as MrsRecord;
                          return (
                            <tr
                              key={item.id}
                              id={`record-${item.id}`}
                              className={`border-b last:border-0 transition-all duration-500 group ${
                                highlightedRecordId === item.id
                                  ? "bg-yellow-100/80 dark:bg-yellow-950/50 scale-[1.005] shadow-md z-10 relative ring-2 ring-amber-400"
                                  : "hover:bg-[#faf8f4]"
                              }`}
                            >
                              <td className="p-6 text-center font-bold text-stone-300">
                                {idx + 1}
                              </td>
                              <td className="p-6">
                                <div className="flex flex-col">
                                  <span className="font-bold text-stone-800">
                                    {item.entryDate}
                                  </span>
                                  <span className="text-[10px] text-stone-400">
                                    {item.entryTime}
                                  </span>
                                </div>
                              </td>
                              <td className="p-6">
                                <span className="bg-emerald-50 text-emerald-600 px-2 py-1 rounded-lg font-mono font-bold text-[10px] border border-emerald-100">
                                  {item.serialNumber}
                                </span>
                              </td>
                              <td className="p-6 font-bold text-stone-700 text-xs">
                                <div className="space-y-1">
                                  {item.items.map(
                                    (it: MrsMaterialItem, i: number) => (
                                      <div
                                        key={i}
                                        className="flex items-center gap-2"
                                      >
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                        <span className="text-emerald-700 font-black">
                                          {it.materialType}
                                        </span>
                                        <span>{it.materialName}</span>
                                        <span className="bg-[#faf8f4] px-1 rounded text-[9px] text-stone-500">
                                          {it.quantity} {it.unit}
                                        </span>
                                      </div>
                                    ),
                                  )}
                                </div>
                              </td>
                              <td className="p-6">
                                <div className="flex flex-col">
                                  <span className="font-bold text-xs">
                                    {item.driverName}
                                  </span>
                                  <span className="text-[10px] text-stone-400 font-mono mt-0.5 dir-ltr text-right">
                                    {item.plateNumber}
                                  </span>
                                </div>
                              </td>
                              <td className="p-6 text-center">
                                <div className="flex flex-col items-center">
                                  <span
                                    className={`px-3 py-1 rounded-xl font-black text-[10px] border ${
                                      WorkflowService.getStatus(item) ===
                                      "APPROVED_INTERNAL"
                                        ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                        : WorkflowService.getStatus(item) ===
                                            "REJECTED"
                                          ? "bg-red-50 text-red-600 border-red-100"
                                          : WorkflowService.getStatus(item) ===
                                              "IN_REVIEW"
                                            ? "bg-[#faf8f4] text-stone-900 border-stone-100"
                                            : WorkflowService.getStatus(
                                                  item,
                                                ) === "SENT_TO_CONSULTANT"
                                              ? "bg-stone-50 text-amber-600 border-stone-100"
                                              : WorkflowService.getStatus(
                                                    item,
                                                  ) === "IN_CONSULTANT_REVIEW"
                                                ? "bg-stone-50 text-amber-600 border-stone-100"
                                                : WorkflowService.getStatus(
                                                      item,
                                                    ) ===
                                                    "APPROVED_BY_CONSULTANT"
                                                  ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                                  : WorkflowService.getStatus(
                                                        item,
                                                      ) === "SENT_TO_EMPLOYER"
                                                    ? "bg-purple-50 text-purple-600 border-purple-100"
                                                    : WorkflowService.getStatus(
                                                          item,
                                                        ) ===
                                                        "IN_EMPLOYER_REVIEW"
                                                      ? "bg-purple-50 text-purple-600 border-purple-100"
                                                      : "bg-[#faf8f4] text-stone-500 border-[#ece5d8]"
                                    }`}
                                  >
                                    {WorkflowService.getStatus(item) ===
                                    "APPROVED_INTERNAL"
                                      ? "تایید نهایی"
                                      : WorkflowService.getStatus(item) ===
                                          "REJECTED"
                                        ? "رد شده"
                                        : WorkflowService.getStatus(item) ===
                                            "IN_REVIEW"
                                          ? "در حال بررسی"
                                          : WorkflowService.getStatus(item) ===
                                              "SENT_TO_CONSULTANT"
                                            ? "ارسال به مشاور"
                                            : WorkflowService.getStatus(
                                                  item,
                                                ) === "IN_CONSULTANT_REVIEW"
                                              ? "در بررسی مشاور"
                                              : WorkflowService.getStatus(
                                                    item,
                                                  ) === "APPROVED_BY_CONSULTANT"
                                                ? "تایید مشاور"
                                                : WorkflowService.getStatus(
                                                      item,
                                                    ) === "SENT_TO_EMPLOYER"
                                                  ? "ارسال به کارفرما"
                                                  : WorkflowService.getStatus(
                                                        item,
                                                      ) === "IN_EMPLOYER_REVIEW"
                                                    ? "در بررسی کارفرما"
                                                    : "پیش‌نویس"}
                                  </span>
                                  {(WorkflowService.getStatus(item) ===
                                    "IN_REVIEW" ||
                                    WorkflowService.getStatus(item) ===
                                      "IN_CONSULTANT_REVIEW" ||
                                    WorkflowService.getStatus(item) ===
                                      "IN_EMPLOYER_REVIEW") &&
                                    item.assigneeId && (
                                      <div className="text-[9px] text-stone-400 mt-1">
                                        {(() => {
                                          const assignee = orgUsers.find(
                                            (u) => u.id === item.assigneeId,
                                          );
                                          return assignee
                                            ? formatUserDisplayFormal(assignee, SystemAdminService.getOrganization(assignee.orgId))
                                            : "کارشناس";
                                        })()}
                                      </div>
                                    )}
                                </div>
                              </td>
                              <td className="p-6">
                                <div className="flex items-center justify-center gap-2">
                                  {currentUser &&
                                    WorkflowService.getAvailableActions(
                                      item,
                                      currentUser,
                                      SystemAdminService.getOrganization(
                                        currentUser.orgId,
                                      )?.type,
                                    ).length > 0 && (
                                      <div className="flex gap-1 ml-2">
                                        {WorkflowService.getAvailableActions(
                                          item,
                                          currentUser,
                                          SystemAdminService.getOrganization(
                                            currentUser.orgId,
                                          )?.type,
                                        ).map((action) => (
                                          <button
                                            key={action}
                                            onClick={() =>
                                              openWorkflowModal(item, action)
                                            }
                                            className={`p-2 rounded-lg text-[10px] font-bold transition-all ${WorkflowService.getActionStyle(action)}`}
                                            title={action}
                                          >
                                            {WorkflowService.getActionLabel(
                                              action,
                                              SystemAdminService.getOrganization(
                                                currentUser.orgId,
                                              )?.type,
                                            )}
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  <button
                                    onClick={() =>
                                      handlePrintOfficial(
                                        "materials_mrs_single",
                                        item,
                                      )
                                    }
                                    className="p-3 text-stone-400 hover:text-stone-900 hover:bg-[#faf8f4] rounded-2xl transition-all shadow-sm hover:shadow-md"
                                    title="چاپ رسید"
                                  >
                                    <Printer size={18} />
                                  </button>
                                  {currentUser &&
                                    WorkflowService.canEdit(
                                      item,
                                      currentUser,
                                    ) && (
                                      <button
                                        onClick={() => {
                                          setEditingId(item.id);
                                          initializeMrsForm(item);
                                          setIsModalOpen(true);
                                        }}
                                        className="p-3 text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-2xl transition-all shadow-sm hover:shadow-md"
                                        title="ویرایش"
                                      >
                                        <Edit3 size={18} />
                                      </button>
                                    )}
                                  {currentUser &&
                                    WorkflowService.canDelete(
                                      item,
                                      currentUser,
                                    ) && (
                                      <button
                                        onClick={() => {
                                          setDeleteId(item.id);
                                          setIsDeleteModalOpen(true);
                                        }}
                                        className="p-3 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all shadow-sm hover:shadow-md"
                                        title="حذف"
                                      >
                                        <Trash2 size={18} />
                                      </button>
                                    )}
                                  <button
                                    onClick={() => {
                                      setHistoryItem(item as any);
                                      setHistoryModalOpen(true);
                                    }}
                                    className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-all"
                                    title="تاریخچه"
                                  >
                                    <ScrollText size={16} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        } else if (materialSubTab === "MIV") {
                          const item = row as MivRecord;
                          return (
                            <tr
                              key={item.id}
                              id={`record-${item.id}`}
                              className={`border-b last:border-0 transition-all duration-500 group ${
                                highlightedRecordId === item.id
                                  ? "bg-yellow-100/80 dark:bg-yellow-950/50 scale-[1.005] shadow-md z-10 relative ring-2 ring-amber-400"
                                  : "hover:bg-[#faf8f4]"
                              }`}
                            >
                              <td className="p-6 text-center font-bold text-stone-300">
                                {idx + 1}
                              </td>
                              <td className="p-6 font-bold text-stone-800">
                                {item.date}
                              </td>
                              <td className="p-6">
                                <span className="bg-amber-50 text-stone-900 px-2 py-1 rounded-lg font-mono font-bold text-[10px] border border-amber-100">
                                  {item.serialNumber}
                                </span>
                              </td>
                              <td className="p-6 font-bold text-stone-700 text-xs">
                                <div className="space-y-1">
                                  {item.items.map(
                                    (it: MivMaterialItem, i: number) => (
                                      <div
                                        key={i}
                                        className="flex items-center gap-2"
                                      >
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                                        <span className="text-amber-700 font-bold">
                                          {it.materialType}
                                        </span>
                                        <span>{it.materialName}</span>
                                        <span className="bg-[#faf8f4] px-1 rounded text-[9px] text-stone-500">
                                          {it.quantity} {it.unit}
                                        </span>
                                      </div>
                                    ),
                                  )}
                                </div>
                              </td>
                              <td className="p-6">
                                <div className="flex flex-col">
                                  <span className="font-bold text-xs">
                                    {item.requestedBy}
                                  </span>
                                  <span className="text-[10px] text-stone-400 mt-0.5">
                                    {item.location}
                                  </span>
                                </div>
                              </td>
                              <td className="p-6 text-center">
                                <div className="flex flex-col items-center">
                                  <span
                                    className={`px-3 py-1 rounded-xl font-black text-[10px] border ${
                                      WorkflowService.getStatus(item) ===
                                      "APPROVED_INTERNAL"
                                        ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                        : WorkflowService.getStatus(item) ===
                                            "REJECTED"
                                          ? "bg-red-50 text-red-600 border-red-100"
                                          : WorkflowService.getStatus(item) ===
                                              "IN_REVIEW"
                                            ? "bg-[#faf8f4] text-stone-900 border-stone-100"
                                            : WorkflowService.getStatus(
                                                  item,
                                                ) === "SENT_TO_CONSULTANT"
                                              ? "bg-stone-50 text-amber-600 border-stone-100"
                                              : WorkflowService.getStatus(
                                                    item,
                                                  ) === "IN_CONSULTANT_REVIEW"
                                                ? "bg-stone-50 text-amber-600 border-stone-100"
                                                : WorkflowService.getStatus(
                                                      item,
                                                    ) ===
                                                    "APPROVED_BY_CONSULTANT"
                                                  ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                                  : WorkflowService.getStatus(
                                                        item,
                                                      ) === "SENT_TO_EMPLOYER"
                                                    ? "bg-purple-50 text-purple-600 border-purple-100"
                                                    : WorkflowService.getStatus(
                                                          item,
                                                        ) ===
                                                        "IN_EMPLOYER_REVIEW"
                                                      ? "bg-purple-50 text-purple-600 border-purple-100"
                                                      : "bg-[#faf8f4] text-stone-500 border-[#ece5d8]"
                                    }`}
                                  >
                                    {WorkflowService.getStatus(item) ===
                                    "APPROVED_INTERNAL"
                                      ? "تایید نهایی"
                                      : WorkflowService.getStatus(item) ===
                                          "REJECTED"
                                        ? "رد شده"
                                        : WorkflowService.getStatus(item) ===
                                            "IN_REVIEW"
                                          ? "در حال بررسی"
                                          : WorkflowService.getStatus(item) ===
                                              "SENT_TO_CONSULTANT"
                                            ? "ارسال به مشاور"
                                            : WorkflowService.getStatus(
                                                  item,
                                                ) === "IN_CONSULTANT_REVIEW"
                                              ? "در بررسی مشاور"
                                              : WorkflowService.getStatus(
                                                    item,
                                                  ) === "APPROVED_BY_CONSULTANT"
                                                ? "تایید مشاور"
                                                : WorkflowService.getStatus(
                                                      item,
                                                    ) === "SENT_TO_EMPLOYER"
                                                  ? "ارسال به کارفرما"
                                                  : WorkflowService.getStatus(
                                                        item,
                                                      ) === "IN_EMPLOYER_REVIEW"
                                                    ? "در بررسی کارفرما"
                                                    : "پیش‌نویس"}
                                  </span>
                                  {(WorkflowService.getStatus(item) ===
                                    "IN_REVIEW" ||
                                    WorkflowService.getStatus(item) ===
                                      "IN_CONSULTANT_REVIEW" ||
                                    WorkflowService.getStatus(item) ===
                                      "IN_EMPLOYER_REVIEW") &&
                                    item.assigneeId && (
                                      <div className="text-[9px] text-stone-400 mt-1">
                                        {(() => {
                                          const assignee = orgUsers.find(
                                            (u) => u.id === item.assigneeId,
                                          );
                                          return assignee
                                            ? formatUserDisplayFormal(assignee, SystemAdminService.getOrganization(assignee.orgId))
                                            : "کارشناس";
                                        })()}
                                      </div>
                                    )}
                                </div>
                              </td>
                              <td className="p-6">
                                <div className="flex items-center justify-center gap-2">
                                  {currentUser &&
                                    WorkflowService.getAvailableActions(
                                      item,
                                      currentUser,
                                      SystemAdminService.getOrganization(
                                        currentUser.orgId,
                                      )?.type,
                                    ).length > 0 && (
                                      <div className="flex gap-1 ml-2">
                                        {WorkflowService.getAvailableActions(
                                          item,
                                          currentUser,
                                          SystemAdminService.getOrganization(
                                            currentUser.orgId,
                                          )?.type,
                                        ).map((action) => (
                                          <button
                                            key={action}
                                            onClick={() =>
                                              openWorkflowModal(item, action)
                                            }
                                            className={`p-2 rounded-lg text-[10px] font-bold transition-all ${WorkflowService.getActionStyle(action)}`}
                                            title={action}
                                          >
                                            {WorkflowService.getActionLabel(
                                              action,
                                              SystemAdminService.getOrganization(
                                                currentUser.orgId,
                                              )?.type,
                                            )}
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  <button
                                    onClick={() =>
                                      handlePrintOfficial(
                                        "materials_miv_single",
                                        item,
                                      )
                                    }
                                    className="p-3 text-stone-400 hover:text-stone-900 hover:bg-[#faf8f4] rounded-2xl transition-all shadow-sm hover:shadow-md"
                                    title="چاپ حواله"
                                  >
                                    <Printer size={18} />
                                  </button>
                                  {currentUser &&
                                    WorkflowService.canEdit(
                                      item,
                                      currentUser,
                                    ) && (
                                      <button
                                        onClick={() => {
                                          setEditingId(item.id);
                                          initializeMivForm(item);
                                          setIsModalOpen(true);
                                        }}
                                        className="p-3 text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-2xl transition-all shadow-sm hover:shadow-md"
                                        title="ویرایش"
                                      >
                                        <Edit3 size={18} />
                                      </button>
                                    )}
                                  {currentUser &&
                                    WorkflowService.canDelete(
                                      item,
                                      currentUser,
                                    ) && (
                                      <button
                                        onClick={() => {
                                          setDeleteId(item.id);
                                          setIsDeleteModalOpen(true);
                                        }}
                                        className="p-3 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all shadow-sm hover:shadow-md"
                                        title="حذف"
                                      >
                                        <Trash2 size={18} />
                                      </button>
                                    )}
                                  <button
                                    onClick={() => {
                                      setHistoryItem(item as any);
                                      setHistoryModalOpen(true);
                                    }}
                                    className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-all"
                                    title="تاریخچه"
                                  >
                                    <ScrollText size={16} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        } else {
                          return (
                            <tr
                              key={idx}
                              className="border-b last:border-0 hover:bg-[#faf8f4] transition-all"
                            >
                              <td className="p-6 text-center font-bold text-stone-300">
                                {idx + 1}
                              </td>
                              <td className="p-6 text-center font-black text-stone-900">
                                {row.materialType}
                              </td>
                              <td className="p-6 font-black text-stone-800 text-sm">
                                {row.materialName}
                              </td>
                              <td className="p-6 text-center">
                                <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-lg font-black">
                                  {row.totalIn.toLocaleString()}
                                </span>
                              </td>
                              <td className="p-6 text-center">
                                <span className="bg-amber-50 text-amber-700 px-3 py-1 rounded-lg font-black">
                                  {row.totalOut.toLocaleString()}
                                </span>
                              </td>
                              <td className="p-6 text-center">
                                <span
                                  className={`px-4 py-2 rounded-xl font-black text-white ${row.remaining > 0 ? "bg-amber-600 shadow-lg shadow-stone-500/30" : "bg-red-500"}`}
                                >
                                  {row.remaining.toLocaleString()}
                                </span>
                              </td>
                              <td className="p-6 text-center font-bold text-stone-500">
                                {row.unit}
                              </td>
                              <td className="p-6"></td>
                            </tr>
                          );
                        }
                      }

                      if (activeTab === ("variation" as any)) {
                        const item = row as VariationOrder;
                        return (
                          <tr
                            key={item.id}
                            className="border-b last:border-0 hover:bg-[#faf8f4] transition-all group"
                          >
                            <td className="p-6 text-center font-bold text-stone-300">
                              {idx + 1}
                            </td>
                            <td className="p-6">
                              <div className="flex flex-col gap-1">
                                <span className="font-black text-purple-600 bg-purple-50 px-2 py-1 rounded-lg border border-purple-100 text-center w-fit">
                                  {item.number}
                                </span>
                                <span className="text-[10px] text-stone-400 font-bold">
                                  {item.date}
                                </span>
                              </div>
                            </td>
                            <td className="p-6 font-bold text-stone-800 text-sm leading-relaxed">
                              {item.description}
                            </td>
                            <td className="p-6 text-center">
                              <div className="flex flex-col items-center min-w-[140px]">
                                <WorkflowProgressStage
                                  status={WorkflowService.getStatus(item)}
                                  isFinalFrozen={item.isFinalFrozen}
                                />
                                {(WorkflowService.getStatus(item) ===
                                  "IN_REVIEW" ||
                                  WorkflowService.getStatus(item) ===
                                    "IN_CONSULTANT_REVIEW" ||
                                  WorkflowService.getStatus(item) ===
                                    "IN_EMPLOYER_REVIEW") &&
                                  item.assigneeId && (
                                    <div className="text-[9px] text-stone-400 mt-1 text-center">
                                      {(() => {
                                        const assignee = orgUsers.find(
                                          (u) => u.id === item.assigneeId,
                                        );
                                        return assignee
                                          ? formatUserDisplayFormal(assignee, SystemAdminService.getOrganization(assignee.orgId))
                                          : "کارشناس";
                                      })()}
                                    </div>
                                  )}
                              </div>
                            </td>
                            <td className="p-6">
                              <div className="flex items-center justify-center gap-2">
                                {currentUser &&
                                  WorkflowService.getAvailableActions(
                                    item,
                                    currentUser,
                                    SystemAdminService.getOrganization(
                                      currentUser.orgId,
                                    )?.type,
                                  ).length > 0 && (
                                    <div className="flex gap-1 ml-2">
                                      {WorkflowService.getAvailableActions(
                                        item,
                                        currentUser,
                                        SystemAdminService.getOrganization(
                                          currentUser.orgId,
                                        )?.type,
                                      ).map((action) => (
                                        <button
                                          key={action}
                                          onClick={() =>
                                            openWorkflowModal(item, action)
                                          }
                                          className={`p-1.5 rounded-lg text-[9px] font-bold transition-all ${WorkflowService.getActionStyle(action)}`}
                                        >
                                          {WorkflowService.getActionLabel(
                                            action,
                                            SystemAdminService.getOrganization(
                                              currentUser.orgId,
                                            )?.type,
                                          )}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                <button
                                  onClick={() =>
                                    handlePrintReport("variation", item)
                                  }
                                  className="p-3 text-stone-400 hover:text-stone-900 hover:bg-[#faf8f4] rounded-2xl transition-all shadow-sm hover:shadow-md"
                                  title="چاپ گزارش"
                                >
                                  <Printer size={18} />
                                </button>
                                <button
                                  onClick={() => {
                                    setHistoryItem(item as any);
                                    setHistoryModalOpen(true);
                                  }}
                                  className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-all"
                                  title="تاریخچه"
                                >
                                  <ScrollText size={16} />
                                </button>
                                {currentUser &&
                                  WorkflowService.canEdit(
                                    item,
                                    currentUser,
                                  ) && (
                                    <button
                                      onClick={() => {
                                        setEditingId(item.id);
                                        initializeVariationForm(item);
                                        setIsModalOpen(true);
                                      }}
                                      className="p-3 text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-2xl transition-all shadow-sm hover:shadow-md"
                                      title="ویرایش"
                                    >
                                      <Edit3 size={18} />
                                    </button>
                                  )}
                                {currentUser &&
                                  WorkflowService.canEdit(item, currentUser) &&
                                  WorkflowService.canDelete(
                                    item,
                                    currentUser,
                                  ) && (
                                    <button
                                      onClick={() => {
                                        setDeleteId(item.id);
                                        setIsDeleteModalOpen(true);
                                      }}
                                      className="p-3 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all shadow-sm hover:shadow-md"
                                      title="حذف"
                                    >
                                      <Trash2 size={18} />
                                    </button>
                                  )}
                              </div>
                            </td>
                          </tr>
                        );
                      }

                      if (activeTab === "discrepancy") {
                        const itemType = row.itemType?.toUpperCase() || "NORMAL";
                        return (
                          <tr
                            key={`${row.code}-${idx}`}
                            className={`border-b last:border-0 hover:bg-[#faf8f4] transition-colors ${row.isExtra ? "bg-amber-50/40" : ""}`}
                          >
                            <td className="p-6 text-center text-stone-300 font-bold">
                              {idx + 1}
                            </td>
                            <td className="p-6">
                              <div className="font-black text-stone-900 bg-[#faf8f4] px-2 py-1 rounded-lg text-center border border-stone-100 font-mono">
                                {row.code}
                              </div>
                              <div className="mt-1 flex flex-col items-center gap-0.5">
                                {itemType === "STARRED" ? (
                                  <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-black border border-amber-200 text-center">
                                    ⭐ ستاره‌دار
                                  </span>
                                ) : itemType === "INVOICE" ? (
                                  <span className="text-[9px] bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded font-black border border-purple-200 text-center">
                                    🧾 فاکتوری
                                  </span>
                                ) : (
                                  <span className="text-[9px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-black border border-blue-100 text-center">
                                    پایه فهرست‌بها
                                  </span>
                                )}
                                {row.isExtra && (
                                  <span className="text-[8px] text-amber-700 font-black text-center">
                                    {currentProject?.contractType === "CBS" ? "فعالیت جدید CBS" : "آیتم جدید مازاد"}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-6 font-bold text-stone-700 leading-relaxed text-[11px]">
                              {row.description}
                            </td>
                            <td className="p-6 text-center font-bold text-stone-500">
                              {row.estQty.toLocaleString("fa-IR")}
                            </td>
                            <td className="p-6 text-center font-bold text-stone-900">
                              {row.execQty.toLocaleString("fa-IR")}
                            </td>
                            <td className="p-6 text-center">
                              <span
                                className={`px-2 py-1 rounded-lg font-black ${row.diffQty > 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}
                              >
                                {row.diffQty > 0 ? "+" : ""}
                                {row.diffQty.toLocaleString("fa-IR")}
                              </span>
                            </td>
                            <td className="p-6 text-center text-stone-400 font-bold">
                              {row.estAmnt.toLocaleString("fa-IR")}
                            </td>
                            <td className="p-6 text-center text-stone-900 font-bold">
                              {row.execAmnt.toLocaleString("fa-IR")}
                            </td>
                            <td className="p-6 text-center">
                              <span
                                className={`font-black ${row.diffAmnt > 0 ? "text-emerald-600" : "text-red-600"}`}
                              >
                                {row.diffAmnt > 0 ? "+" : ""}
                                {row.diffAmnt.toLocaleString("fa-IR")}
                              </span>
                            </td>
                          </tr>
                        );
                      }
                      if (activeTab === ("permits" as any)) {
                        const permit = row as WorkPermit;
                        const approvedCount = PERMIT_DISCIPLINES.filter(
                          (d) =>
                            (
                              permit[
                                `consultant${d.key}` as keyof WorkPermit
                              ] as ApprovalDetail
                            )?.isApproved,
                        ).length;
                        const approvedEmployerCount = PERMIT_DISCIPLINES.filter(
                          (d) =>
                            (
                              permit[
                                `employer${d.key}` as keyof WorkPermit
                              ] as ApprovalDetail
                            )?.isApproved,
                        ).length;
                        return (
                          <tr
                            key={permit.id}
                            id={`record-${permit.id}`}
                            className={`border-b last:border-0 transition-colors duration-500 group cursor-pointer ${
                              highlightedRecordId === permit.id
                                ? "bg-yellow-100/80 dark:bg-yellow-950/50 scale-[1.01] shadow-md z-10 relative ring-2 ring-amber-400"
                                : "hover:bg-[#faf8f4]"
                            }`}
                          >
                            <td className="p-6 text-stone-300 font-bold text-center">
                              {idx + 1}
                            </td>
                            <td className="p-6">
                              <div className="flex flex-col gap-1">
                                <span className="font-black text-stone-900 bg-[#faf8f4] px-2 py-1 rounded-lg border border-stone-100 text-center w-fit">
                                  {permit.number}
                                </span>
                                <span className="text-[10px] text-stone-400 font-bold">
                                  {permit.date}
                                </span>
                              </div>
                            </td>
                            <td className="p-6 font-bold text-stone-700 text-xs">
                              {permit.location}
                            </td>
                            <td className="p-6 font-bold text-stone-800 text-sm leading-relaxed">
                              {permit.description}
                            </td>
                            <td className="p-6 text-center">
                              <div className="flex items-center justify-center gap-1">
                                {PERMIT_DISCIPLINES.map((d, i) => {
                                  const isApproved = (
                                    permit[
                                      `consultant${d.key}` as keyof WorkPermit
                                    ] as ApprovalDetail
                                  )?.isApproved;
                                  return (
                                    <div
                                      key={i}
                                      title={d.label}
                                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-black border ${isApproved ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-stone-100 text-stone-300 border-[#e5ded0]"}`}
                                    >
                                      {d.key[0]}
                                    </div>
                                  );
                                })}
                              </div>
                              <span className="text-[9px] text-stone-400 font-bold mt-1 block">
                                {approvedCount} از ۶ تاییدیه (مشاور)
                              </span>
                            </td>
                            <td className="p-6 text-center">
                              <div className="flex items-center justify-center gap-1">
                                {PERMIT_DISCIPLINES.map((d, i) => {
                                  const isApproved = (
                                    permit[
                                      `employer${d.key}` as keyof WorkPermit
                                    ] as ApprovalDetail
                                  )?.isApproved;
                                  return (
                                    <div
                                      key={i}
                                      title={d.label}
                                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-black border ${isApproved ? "bg-stone-100 text-amber-700 border-blue-200" : "bg-stone-100 text-stone-300 border-stone-300"}`}
                                    >
                                      {d.key[0]}
                                    </div>
                                  );
                                })}
                              </div>
                              <span className="text-[9px] text-stone-400 font-bold mt-1 block">
                                {approvedEmployerCount} از ۶ تاییدیه (کارفرما)
                              </span>
                            </td>
                            <td className="p-6 text-center">
                              <div className="flex flex-col items-center min-w-[140px]">
                                <WorkflowProgressStage
                                  status={WorkflowService.getStatus(permit)}
                                  isFinalFrozen={permit.isFinalFrozen}
                                />
                                {(WorkflowService.getStatus(permit) ===
                                  "IN_REVIEW" ||
                                  WorkflowService.getStatus(permit) ===
                                    "IN_CONSULTANT_REVIEW" ||
                                  WorkflowService.getStatus(permit) ===
                                    "IN_EMPLOYER_REVIEW") &&
                                  permit.assigneeId && (
                                    <div className="text-[9px] text-stone-400 mt-1 text-center font-bold">
                                      {(() => {
                                        if (permit.assigneeId && permit.assigneeId.includes(",")) {
                                          const ids = permit.assigneeId.split(",").map(id => id.trim());
                                          const allUsers = SystemAdminService.getUsers();
                                          const names = ids.map(id => {
                                            const u = allUsers.find((user) => user.id === id);
                                            return u ? (u.jobTitle || "کارشناس") : "";
                                          }).filter(n => n !== "");
                                          return names.join(" و ");
                                        }
                                        const assignee = orgUsers.find(
                                          (u) => u.id === permit.assigneeId,
                                        );
                                        return assignee
                                          ? formatUserDisplayFormal(assignee, SystemAdminService.getOrganization(assignee.orgId))
                                          : "کارشناس";
                                      })()}
                                    </div>
                                  )}
                              </div>
                            </td>
                            <td className="p-6">
                              <div className="flex items-center justify-center gap-2">
                                {currentUser &&
                                  WorkflowService.getAvailableActions(
                                    permit,
                                    currentUser,
                                    SystemAdminService.getOrganization(
                                      currentUser.orgId,
                                    )?.type,
                                  ).length > 0 && (
                                    <div className="flex gap-1 ml-2">
                                      {WorkflowService.getAvailableActions(
                                        permit,
                                        currentUser,
                                        SystemAdminService.getOrganization(
                                          currentUser.orgId,
                                        )?.type,
                                      ).map((action) => (
                                        <button
                                          key={action}
                                          onClick={() =>
                                            openWorkflowModal(permit, action)
                                          }
                                          className={`p-1.5 rounded-lg text-[9px] font-bold transition-all ${WorkflowService.getActionStyle(action)}`}
                                          title={action}
                                        >
                                          {WorkflowService.getActionLabel(
                                            action,
                                            SystemAdminService.getOrganization(
                                              currentUser.orgId,
                                            )?.type,
                                          )}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                <button
                                  onClick={() =>
                                    handlePrintOfficial("permits", permit)
                                  }
                                  className="p-3 text-stone-400 hover:text-stone-900 hover:bg-[#faf8f4] rounded-2xl transition-all shadow-sm hover:shadow-md"
                                  title="چاپ رسمی مجوز"
                                >
                                  <Printer size={18} />
                                </button>
                                {currentUser &&
                                  WorkflowService.canEdit(
                                    permit,
                                    currentUser,
                                  ) && (
                                    <button
                                      onClick={() => {
                                        setEditingId(permit.id);
                                        const permitClone = {
                                          ...permit,
                                        } as any;
                                        PERMIT_DISCIPLINES.forEach((d) => {
                                          if (
                                            !permitClone[`contractor${d.key}`]
                                          )
                                            permitClone[`contractor${d.key}`] =
                                              {
                                                isApproved: false,
                                                comment: "",
                                              };
                                          if (
                                            !permitClone[`consultant${d.key}`]
                                          )
                                            permitClone[`consultant${d.key}`] =
                                              {
                                                isApproved: false,
                                                comment: "",
                                              };
                                          if (
                                            !permitClone[`employer${d.key}`]
                                          )
                                            permitClone[`employer${d.key}`] =
                                              {
                                                isApproved: false,
                                                comment: "",
                                              };
                                        });
                                        setPermitForm(permitClone);
                                        setIsModalOpen(true);
                                      }}
                                      className="p-3 text-stone-400 hover:text-stone-900 hover:bg-[#faf8f4] rounded-2xl transition-all shadow-sm hover:shadow-md"
                                      title="ویرایش"
                                    >
                                      <Edit3 size={18} />
                                    </button>
                                  )}
                                {currentUser &&
                                  WorkflowService.canDelete(
                                    permit,
                                    currentUser,
                                  ) && (
                                    <button
                                      onClick={() => {
                                        setDeleteId(permit.id);
                                        setIsDeleteModalOpen(true);
                                      }}
                                      className="p-3 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all shadow-sm hover:shadow-md"
                                      title="حذف"
                                    >
                                      <Trash2 size={18} />
                                    </button>
                                  )}
                                <button
                                  onClick={() => {
                                    setHistoryItem(permit as any);
                                    setHistoryModalOpen(true);
                                  }}
                                  className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-all"
                                  title="تاریخچه"
                                >
                                  <ScrollText size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      }

                      const lineCode = row.code || row.itemCode || "";
                      const lineAmount = row.quantity || row.partialTotal || 0;
                      const resolveItemTypeLocal = (
                        code: string,
                        explicitType?: string,
                        desc?: string,
                        coef?: number,
                      ): "NORMAL" | "STARRED" | "INVOICE" => {
                        const expUpper = (explicitType || "").toUpperCase();
                        if (expUpper === "STARRED") return "STARRED";
                        if (expUpper === "INVOICE" || expUpper === "NEW") return "INVOICE";
                        if (code && (code.includes("*") || code.startsWith("*") || code.endsWith("*"))) return "STARRED";
                        const d = (desc || "").toLowerCase();
                        if (d.includes("ستاره") || d.includes("starred") || d.includes("قیمت توافقی")) return "STARRED";
                        if (d.includes("فاکتور") || d.includes("invoice") || d.includes("قیمت جدید")) return "INVOICE";
                        if (coef && coef !== 1 && coef > 0) return "STARRED";
                        return "NORMAL";
                      };
                      const lineType = resolveItemTypeLocal(
                        lineCode,
                        row.itemType,
                        row.description,
                        row.independentCoefficient,
                      );
                      const lineIndepCoef = row.independentCoefficient || 1;
                      let rawAmount = 0;
                      let coeffAmount = 0;
                      let linkedItems: any[] = [];
                      let financialInfo = {
                        previous: 0,
                        current: 0,
                        cumulative: 0,
                      };

                      if (activeTab === "minutes") {
                        const totals = getMinuteTotals(row.id);
                        rawAmount = totals.raw;
                        coeffAmount = totals.withCoeff;
                        linkedItems = totals.items;
                      } else if (activeTab === "statements") {
                        const totals = getStatementTotals(row);
                        rawAmount = totals.totalRaw;
                        coeffAmount = totals.totalCoeff;
                        financialInfo = getStatementFinancials(
                          row as Statement,
                        );
                      } else if (activeTab === "estimate") {
                        const est = row as EstimateItem;
                        const multipliers = getMultipliers(
                          est.code,
                          est.itemType,
                          est.independentCoefficient,
                        );
                        rawAmount = est.quantity * est.unitPrice;
                        coeffAmount = rawAmount * multipliers.total;
                      } else {
                        const unitPrice =
                          activeTab === "metre"
                             ? getRowEffectivePrice(row)
                            : getUnitPrice(lineCode);
                        const multipliers = getMultipliers(
                          lineCode,
                          lineType,
                          lineIndepCoef,
                        );
                        rawAmount = lineAmount * unitPrice;
                        coeffAmount = rawAmount * multipliers.total;
                      }
                      const isExpanded =
                        activeTab === "minutes"
                          ? expandedMinuteId === row.id
                          : activeTab === "statements"
                            ? expandedStatementId === row.id
                            : false;
                      const isUnread = unreadRecordIds.has(String(row.id));

                      return (
                        <React.Fragment key={row.id}>
                          <tr
                            id={`record-${row.id}`}
                            onClick={() => handleRecordRowClick(row.id)}
                            className={`border-b last:border-0 transition-colors duration-500 group cursor-pointer ${
                              isUnread
                                ? "bg-amber-100/50 dark:bg-amber-950/30 border-r-4 border-r-amber-500 shadow-xs ring-1 ring-amber-400/30"
                                : ""
                            } ${isExpanded ? "bg-[#faf8f4]/60 dark:bg-slate-800/60" : ""} ${
                              highlightedRecordId === row.id
                                ? "bg-yellow-100/80 dark:bg-yellow-950/50 scale-[1.01] shadow-md z-10 relative ring-2 ring-amber-400"
                                : "hover:bg-[#faf8f4]/40 dark:hover:bg-slate-800/40"
                            }`}
                          >
                            <td className="p-6 text-stone-300 font-bold text-center group-hover:text-stone-900 transition-colors">
                              {activeTab === "minutes" &&
                              linkedItems.length > 0 ? (
                                <button
                                  onClick={() =>
                                    setExpandedMinuteId(
                                      isExpanded ? null : row.id,
                                    )
                                  }
                                  className="p-1 hover:bg-white rounded-lg transition-all"
                                >
                                  {isExpanded ? (
                                    <ChevronUp size={16} />
                                  ) : (
                                    <ChevronDown size={16} />
                                  )}
                                </button>
                              ) : activeTab === "statements" &&
                                row.selectedMinuteIds &&
                                row.selectedMinuteIds.length > 0 ? (
                                <button
                                  onClick={() =>
                                    setExpandedStatementId(
                                      isExpanded ? null : row.id,
                                    )
                                  }
                                  className="p-1 hover:bg-white rounded-lg transition-all"
                                >
                                  {isExpanded ? (
                                    <ChevronUp size={16} />
                                  ) : (
                                    <ChevronDown size={16} />
                                  )}
                                </button>
                              ) : (
                                idx + 1
                              )}
                            </td>
                            <td className="p-6">
                              <div className="flex flex-col gap-1.5">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span
                                    className={`font-black px-3 py-1.5 rounded-xl border text-center shadow-sm w-fit flex items-center gap-1 font-mono text-xs ${lineType === "STARRED" ? "bg-amber-50 text-amber-900 border-amber-200" : lineType === "INVOICE" ? "bg-purple-50 text-purple-900 border-purple-200" : "bg-[#faf8f4] text-stone-900 border-stone-100"}`}
                                  >
                                    {row.code || row.number || row.itemCode}
                                  </span>
                                  {isUnread && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                      سند جدید (دیده نشده)
                                    </span>
                                  )}
                                  {activeTab === "estimate" && (
                                    lineType === "STARRED" ? (
                                      <span className="text-[10px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded-lg font-black border border-amber-300">
                                        ⭐ ستاره‌دار
                                      </span>
                                    ) : lineType === "INVOICE" ? (
                                      <span className="text-[10px] bg-purple-100 text-purple-900 px-2 py-0.5 rounded-lg font-black border border-purple-300">
                                        🧾 فاکتوری
                                      </span>
                                    ) : (
                                      <span className="text-[10px] bg-blue-50 text-blue-800 px-2 py-0.5 rounded-lg font-bold border border-blue-200">
                                        🔹 پایه فهرست
                                      </span>
                                    )
                                  )}
                                </div>
                                {row.date && (
                                  <span className="text-[9px] font-black text-stone-400 mr-1 flex items-center gap-1">
                                    <Calendar size={10} /> {row.date}
                                  </span>
                                )}
                                {row.periodStart && (
                                  <span className="text-[9px] font-black text-stone-400 mr-1">
                                    {row.periodStart} تا {row.periodEnd}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-6">
                              <div className="flex flex-col gap-2">
                                <p className="font-bold text-stone-800 text-sm leading-relaxed">
                                  {row.description}
                                </p>
                                <div className="flex items-center gap-4">
                                  {row.unit && (
                                    <span className="text-[10px] font-black text-stone-400 bg-stone-100 px-2 py-0.5 rounded-lg border border-[#e5ded0]">
                                      واحد: {row.unit}
                                    </span>
                                  )}
                                  {currentProject?.contractType === "CBS" && (
                                    <span className="text-[10px] font-black text-stone-900 bg-[#faf8f4] px-2 py-0.5 rounded-lg border border-stone-100 flex items-center gap-1">
                                      📊 درصد وزنی: {(() => {
                                        const pl = currentProject?.priceLists?.[0];
                                        const foundItem = pl?.items?.find((it: any) => it.code === row.code || it.code === row.itemCode);
                                        return foundItem?.weightPercent !== undefined ? `${foundItem.weightPercent}%` : "تعریف‌نشده";
                                      })()}
                                    </span>
                                  )}
                                  {row.priceListId && currentProject?.priceLists?.find((pl: any) => pl.id === row.priceListId) && (
                                    <span className="text-[10px] font-black text-amber-600 bg-stone-50 px-2 py-0.5 rounded-lg border border-stone-100 flex items-center gap-1">
                                      📋 فهرست بها: {currentProject.priceLists.find((pl: any) => pl.id === row.priceListId)?.title}
                                    </span>
                                  )}
                                  {row.location && (
                                    <span className="text-[10px] font-bold text-stone-400 flex items-center gap-1">
                                      <MapPin size={10} /> {row.location}
                                    </span>
                                  )}
                                  {row.status === "DRAFT" && (
                                    <span className="text-[10px] bg-amber-50 text-stone-900 px-2 rounded-full font-bold">
                                      پیش‌نویس
                                    </span>
                                  )}
                                  {(row as any).isArchived && (
                                    <span className="text-[10px] bg-stone-50 text-amber-600 px-2 rounded-full font-bold ml-2 tracking-tight">
                                      صورت‌جلسه پیمانکار (بایگانی)
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            {activeTab === "metre" && (
                              <td className="p-6">
                                {row.minuteId ? (
                                  <div className="inline-flex items-center gap-2 text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100 shadow-sm">
                                    <LinkIcon size={12} /> ص.ج{" "}
                                    {
                                      minutes.find((m) => m.id === row.minuteId)
                                        ?.number
                                    }
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-stone-300 font-black italic">
                                    فاقد تخصیص
                                  </span>
                                )}
                              </td>
                            )}
                            {activeTab !== "minutes" &&
                              activeTab !== "statements" && (
                                <td className="p-6 text-center">
                                  <div className="bg-[#faf8f4] inline-block px-4 py-2 rounded-2xl border border-[#ece5d8] group-hover:bg-white transition-colors">
                                    <span className="font-black text-stone-900 text-lg tracking-tighter">
                                      {lineAmount.toLocaleString("fa-IR")}
                                    </span>
                                  </div>
                                </td>
                              )}
                            {(activeTab === "minutes" ||
                              activeTab === "statements" ||
                              activeTab === "estimate") && (
                              <td className="p-6 text-center">
                                <span className="font-black text-stone-700 text-sm">
                                  {rawAmount.toLocaleString("fa-IR")}
                                </span>
                              </td>
                            )}
                            {(activeTab === "minutes" ||
                              activeTab === "statements" ||
                              activeTab === "estimate") && (
                              <td className="p-6 text-center">
                                <div className="flex flex-col items-center min-w-[140px]">
                                  <WorkflowProgressStage
                                    status={WorkflowService.getStatus(
                                      row as any,
                                    )}
                                    isFinalFrozen={(row as any).isFinalFrozen}
                                  />
                                  {(WorkflowService.getStatus(row as any) ===
                                    "IN_REVIEW" ||
                                    WorkflowService.getStatus(row as any) ===
                                      "IN_CONSULTANT_REVIEW" ||
                                    WorkflowService.getStatus(row as any) ===
                                      "IN_EMPLOYER_REVIEW") &&
                                    (row as any).assigneeId && (
                                      <div className="text-[9px] text-stone-400 mt-1 text-center">
                                        {(() => {
                                          const assignee = orgUsers.find(
                                            (u) =>
                                              u.id === (row as any).assigneeId,
                                          );
                                          return assignee
                                            ? formatUserDisplayFormal(assignee, SystemAdminService.getOrganization(assignee.orgId))
                                            : "کارشناس";
                                        })()}
                                      </div>
                                    )}
                                </div>
                              </td>
                            )}
                            <td className="p-6 text-center">
                              <div className="flex flex-col items-center">
                                <span className="font-black text-amber-700 text-base">
                                  {currentProject?.contractType === "CBS" ? (
                                    `${(((rawAmount) / (currentProject?.initialBudget || 1)) * 100).toFixed(4)}٪`
                                  ) : (
                                    coeffAmount.toLocaleString("fa-IR")
                                  )}
                                </span>
                                {activeTab !== "minutes" &&
                                  activeTab !== "statements" && (
                                    <span
                                      className={`text-[9px] font-bold px-2 py-0.5 rounded-lg mt-1 ${lineType !== "NORMAL" ? "bg-amber-100 text-amber-800" : "bg-[#faf8f4] text-stone-400"}`}
                                    >
                                      {currentProject?.contractType === "CBS" ? (
                                        "سرجمع (بدون ضریب)"
                                      ) : (
                                        <>
                                          ضریب{" "}
                                          {getMultipliers(
                                            lineCode,
                                            lineType,
                                            lineIndepCoef,
                                          ).total.toFixed(3)}
                                        </>
                                      )}
                                    </span>
                                  )}
                              </div>
                            </td>

                            {activeTab === "statements" && (
                              <>
                                <td className="p-6 text-center">
                                  <span className="font-bold text-stone-400">
                                    {financialInfo.previous.toLocaleString(
                                      "fa-IR",
                                    )}
                                  </span>
                                </td>
                                <td className="p-6 text-center">
                                  <span className="font-black text-stone-900">
                                    {financialInfo.current.toLocaleString(
                                      "fa-IR",
                                    )}
                                  </span>
                                </td>
                                <td className="p-6 text-center">
                                  <span className="font-black text-emerald-600">
                                    {financialInfo.cumulative.toLocaleString(
                                      "fa-IR",
                                    )}
                                  </span>
                                </td>
                              </>
                            )}

                            <td className="p-6">
                              <div className="flex items-center justify-center gap-2">
                                {(activeTab === "minutes" ||
                                  activeTab === "statements" ||
                                  activeTab === "estimate") &&
                                  currentUser &&
                                  WorkflowService.getAvailableActions(
                                    row as any,
                                    currentUser,
                                    SystemAdminService.getOrganization(
                                      currentUser.orgId,
                                    )?.type,
                                  ).length > 0 && (
                                    <div className="flex gap-1 ml-2">
                                      {WorkflowService.getAvailableActions(
                                        row as any,
                                        currentUser,
                                        SystemAdminService.getOrganization(
                                          currentUser.orgId,
                                        )?.type,
                                    ).map((action) => (
                                      <button
                                        key={action}
                                        onClick={() =>
                                          openWorkflowModal(
                                            row as any,
                                            action,
                                          )
                                        }
                                        className={`p-2 rounded-lg text-[10px] font-bold transition-all ${WorkflowService.getActionStyle(action)}`}
                                        title={action}
                                      >
                                        {WorkflowService.getActionLabel(
                                          action,
                                          SystemAdminService.getOrganization(
                                            currentUser.orgId,
                                          )?.type,
                                        )}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              {activeTab === "minutes" &&
                                currentUser &&
                                WorkflowService.canEdit(
                                  row as any,
                                  currentUser,
                                ) && (
                                    <button
                                      onClick={() =>
                                        handleEditMinuteMetre(row.id)
                                      }
                                      className="p-2 text-stone-400 hover:text-stone-900 hover:bg-[#faf8f4] rounded-lg transition-all"
                                      title="ویرایش ریزمتره"
                                    >
                                      <Edit3 size={16} />
                                    </button>
                                  )}

                                {(activeTab === "minutes" ||
                                  activeTab === "statements" ||
                                  activeTab === "estimate") && (
                                  <button
                                    onClick={() => {
                                      setHistoryItem(row as any);
                                      setHistoryModalOpen(true);
                                    }}
                                    className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-all"
                                    title="تاریخچه"
                                  >
                                    <ScrollText size={16} />
                                  </button>
                                )}

                                {activeTab === "statements" && (
                                  <>
                                    <button
                                      onClick={() =>
                                        handleCompareStatement(row as Statement)
                                      }
                                      className="p-3 text-stone-400 hover:text-amber-600 hover:bg-stone-50 rounded-2xl transition-all shadow-sm hover:shadow-md"
                                      title="گزارش مقایسه با صورت‌وضعیت قبلی"
                                    >
                                      <GitCompare size={18} />
                                    </button>
                                    <button
                                      onClick={() =>
                                        handlePrintOfficial("statements", row)
                                      }
                                      className="p-3 text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-2xl transition-all shadow-sm hover:shadow-md"
                                      title="چاپ رسمی صورت‌وضعیت"
                                    >
                                      <Printer size={18} />
                                    </button>
                                    <div className="relative">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActiveReportMenuId(
                                            activeReportMenuId === row.id
                                              ? null
                                              : row.id,
                                          );
                                        }}
                                        className={`p-3 rounded-2xl transition-all shadow-sm hover:shadow-md flex items-center gap-1 ${
                                          activeReportMenuId === row.id
                                            ? "bg-[#ffc745] text-stone-950 font-black"
                                            : "text-stone-400 hover:text-stone-900 hover:bg-[#faf8f4]"
                                        }`}
                                        title="چاپ گزارش‌های صورت‌وضعیت"
                                      >
                                        <Printer size={18} />
                                        <ChevronDown
                                          size={14}
                                          className={`transition-transform ${activeReportMenuId === row.id ? "rotate-180" : ""}`}
                                        />
                                      </button>

                                      {activeReportMenuId === row.id && (
                                        <div className="absolute left-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-[#ece5d8] py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                          <button
                                            onClick={() => {
                                              handlePrintReport(
                                                "statement-metre",
                                                row,
                                              );
                                              setActiveReportMenuId(null);
                                            }}
                                            className="w-full px-4 py-3 text-right hover:bg-[#faf8f4] flex items-center gap-3 text-stone-700 transition-colors"
                                          >
                                            <div className="w-8 h-8 rounded-lg bg-[#faf8f4] text-stone-900 flex items-center justify-center">
                                              <Ruler size={16} />
                                            </div>
                                            <div className="flex flex-col text-right">
                                              <span className="text-xs font-bold">
                                                ریزمتره تفصیلی
                                              </span>
                                              <span className="text-[10px] text-stone-400">
                                                به تفکیک صورت‌جلسات
                                              </span>
                                            </div>
                                          </button>

                                          <button
                                            onClick={() => {
                                              handlePrintReport(
                                                "statement-summary-metre",
                                                row,
                                              );
                                              setActiveReportMenuId(null);
                                            }}
                                            className="w-full px-4 py-3 text-right hover:bg-[#faf8f4] flex items-center gap-3 text-stone-700 transition-colors"
                                          >
                                            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                                              <List size={16} />
                                            </div>
                                            <div className="flex flex-col text-right">
                                              <span className="text-xs font-bold">
                                                خلاصه متره
                                              </span>
                                              <span className="text-[10px] text-stone-400">
                                                تجمیع بر اساس کد آیتم
                                              </span>
                                            </div>
                                          </button>

                                          <button
                                            onClick={() => {
                                              handlePrintReport(
                                                "statement-financial",
                                                row,
                                              );
                                              setActiveReportMenuId(null);
                                            }}
                                            className="w-full px-4 py-3 text-right hover:bg-[#faf8f4] flex items-center gap-3 text-stone-700 transition-colors border-t border-stone-50"
                                          >
                                            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                                              <FileSpreadsheet size={16} />
                                            </div>
                                            <div className="flex flex-col text-right">
                                              <span className="text-xs font-bold">
                                                خلاصه مالی
                                              </span>
                                              <span className="text-[10px] text-stone-400">
                                                ریز محاسبات اقلام و ضرایب فصول
                                              </span>
                                            </div>
                                          </button>

                                          <button
                                            onClick={() => {
                                              handlePrintReport(
                                                "statement-financial-chapters",
                                                row,
                                              );
                                              setActiveReportMenuId(null);
                                            }}
                                            className="w-full px-4 py-3 text-right hover:bg-[#faf8f4] flex items-center gap-3 text-stone-700 transition-colors border-t border-stone-50"
                                          >
                                            <div className="w-8 h-8 rounded-lg bg-amber-50 text-stone-900 flex items-center justify-center">
                                              <PieChart size={16} />
                                            </div>
                                            <div className="flex flex-col text-right">
                                              <span className="text-xs font-bold">
                                                خلاصه مالی فصول
                                              </span>
                                              <span className="text-[10px] text-stone-400">
                                                مبالغ تجمعی فصول فهرست‌بها
                                              </span>
                                            </div>
                                          </button>

                                          <button
                                            onClick={() => {
                                              handlePrintReport(
                                                "statement-financial-books",
                                                row,
                                              );
                                              setActiveReportMenuId(null);
                                            }}
                                            className="w-full px-4 py-3 text-right hover:bg-[#faf8f4] flex items-center gap-3 text-stone-700 transition-colors border-t border-stone-50"
                                          >
                                            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                              <BookOpen size={16} />
                                            </div>
                                            <div className="flex flex-col text-right">
                                              <span className="text-xs font-bold">
                                                خلاصه مالی دفترچه‌ها
                                              </span>
                                              <span className="text-[10px] text-stone-400">
                                                مبالغ تفکیک شده دفترچه‌های فهرست‌بها
                                              </span>
                                            </div>
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                    {adjustments.find((a) => a.statementId === row.id) && (
                                      <button
                                        onClick={() =>
                                          handlePrintOfficial(
                                            "adjustment",
                                            adjustments.find(
                                              (a) => a.statementId === row.id,
                                            ),
                                          )
                                        }
                                        className="p-3 text-stone-400 hover:text-amber-600 hover:bg-stone-50 rounded-2xl transition-all shadow-sm hover:shadow-md"
                                        title="چاپ دفترچه تعدیل"
                                       style={{ display: 'none' }}
                                      >
                                        <TrendingUp size={18} />
                                      </button>
                                    )}
                                    {(() => {
                                      const isDraft =
                                        WorkflowService.getStatus(
                                          row as any,
                                        ) === "DRAFT";
                                      const isFinalFrozen = (row as any)
                                        .isFinalFrozen;
                                      const canCopy =
                                        (isDraft || isFinalFrozen) && canCreate;
                                      return (
                                        <button
                                          onClick={() => {
                                            if (canCopy) {
                                              handleDuplicateStatement(
                                                row as Statement,
                                              );
                                            }
                                          }}
                                          disabled={!canCopy}
                                          className={`p-3 rounded-2xl transition-all shadow-sm ${
                                             canCopy
                                              ? "text-stone-400 hover:text-stone-900 hover:bg-amber-50 hover:shadow-md"
                                              : "text-stone-200 bg-[#faf8f4] cursor-not-allowed opacity-50"
                                          }`}
                                          title={
                                            !canCreate
                                              ? "شما دسترسی ایجاد مدرک جدید در این پروژه را ندارید."
                                              : canCopy
                                                ? "کپی و ایجاد صورت‌وضعیت جدید (با کپی تمام صورت‌جلسات)"
                                                : "کپی صورت‌وضعیت فقط برای پیش‌نویس‌ها و صورت‌وضعیت‌های تایید نهایی شده امکان‌پذیر است"
                                          }
                                        >
                                          <Copy size={18} />
                                        </button>
                                      );
                                    })()}
                                  </>
                                )}
                                {activeTab === "minutes" && (
                                  <>
                                    <button
                                      onClick={() =>
                                        handlePrintOfficial("minutes", row)
                                      }
                                      className="p-3 text-stone-400 hover:text-stone-900 hover:bg-[#faf8f4] rounded-2xl transition-all shadow-sm hover:shadow-md"
                                      title="چاپ رسمی صورت‌جلسه"
                                    >
                                      <Printer size={18} />
                                    </button>
                                    {(() => {
                                      const isDraft =
                                        WorkflowService.getStatus(
                                          row as any,
                                        ) === "DRAFT";
                                      const isFinalFrozen = (row as any)
                                        .isFinalFrozen;
                                      const canCopy =
                                        (isDraft || isFinalFrozen) && canCreate;
                                      return (
                                        <button
                                          onClick={() => {
                                            if (canCopy) {
                                              handleDuplicateMinute(
                                                row as ProjectMinute,
                                              );
                                            }
                                          }}
                                          disabled={!canCopy}
                                          className={`p-3 rounded-2xl transition-all shadow-sm ${
                                            canCopy
                                              ? "text-stone-400 hover:text-stone-900 hover:bg-amber-50 hover:shadow-md"
                                              : "text-stone-200 bg-[#faf8f4] cursor-not-allowed opacity-50"
                                          }`}
                                          title={
                                            !canCreate
                                              ? "شما دسترسی ایجاد مدرک جدید در این پروژه را ندارید."
                                              : canCopy
                                                ? "کپی و ایجاد صورت‌جلسه جدید از روی این مورد"
                                                : "کپی صورت‌جلسه فقط برای پیش‌نویس‌ها و صورت‌جلسات تایید نهایی شده (توسط کارفرما) امکان‌پذیر است"
                                          }
                                        >
                                          <Copy size={18} />
                                        </button>
                                      );
                                    })()}
                                  </>
                                )}

                                {/* Edit/Delete Buttons with Workflow Locking */}
                                {(() => {
                                  let canEditRow = false;
                                  if (currentUser?.role === "SYSTEM_ADMIN") {
                                    canEditRow = true;
                                  } else if (
                                    activeTab === "minutes" ||
                                    activeTab === "statements" ||
                                    activeTab === "estimate" ||
                                    activeTab === ("permits" as any) ||
                                    activeTab === ("variation" as any) ||
                                    activeTab === ("adjustment" as any)
                                  ) {
                                    canEditRow = currentUser
                                      ? WorkflowService.canEdit(
                                          row as any,
                                          currentUser,
                                        )
                                      : false;
                                  } else if (activeTab === "metre") {
                                    const mRow = row as MetreRow;
                                    if (mRow.minuteId) {
                                      const parentMin = minutes.find(
                                        (m) => m.id === mRow.minuteId,
                                      );
                                      const associatedRejectedStatement =
                                        statements.find(
                                          (s) =>
                                            s.projectId === selectedProjectId &&
                                            s.status ===
                                              WorkflowStatus.REJECTED &&
                                            s.selectedMinuteIds?.includes(
                                              mRow.minuteId || "",
                                            ),
                                        );
                                      const orgTyp =
                                        SystemAdminService.getOrganization(
                                          currentUser?.orgId || "",
                                        )?.type;
                                      const isAccessibleOrg =
                                        orgTyp ===
                                          OrganizationType.CONTRACTOR ||
                                        orgTyp === OrganizationType.CONSULTANT;

                                      canEditRow =
                                        (parentMin && currentUser
                                          ? WorkflowService.canEdit(
                                              parentMin,
                                              currentUser,
                                            )
                                          : false) ||
                                        (!!associatedRejectedStatement &&
                                          isAccessibleOrg &&
                                          !(parentMin as any)?.isArchived);
                                    } else {
                                      canEditRow = canCreate;
                                    }
                                  }

                                  const canDeleteRow =
                                    currentUser?.role === "SYSTEM_ADMIN"
                                      ? true
                                      : activeTab === "minutes" ||
                                          activeTab === "statements" ||
                                          activeTab === "estimate" ||
                                          activeTab === ("permits" as any) ||
                                          activeTab === ("variation" as any) ||
                                          activeTab === ("adjustment" as any)
                                        ? currentUser
                                          ? WorkflowService.canDelete(
                                              row as any,
                                              currentUser,
                                            )
                                          : false
                                        : canEditRow;
                                  return canEditRow || canDeleteRow ? (
                                    <>
                                      {canEditRow && (
                                        <button
                                          onClick={() => {
                                            setEditingId(row.id);
                                            if (activeTab === "minutes")
                                              setMinForm(row);
                                            else if (activeTab === "statements")
                                              setStmtForm(row);
                                            else if (activeTab === "estimate")
                                              setEstForm(row);
                                            else if (activeTab === ("permits" as any)) {
                                              const updatedRow = { ...row };
                                              PERMIT_DISCIPLINES.forEach((d) => {
                                                if (!updatedRow[`contractor${d.key}` as keyof WorkPermit]) {
                                                  (updatedRow as any)[`contractor${d.key}`] = { isApproved: false, comment: "" };
                                                }
                                                if (!updatedRow[`consultant${d.key}` as keyof WorkPermit]) {
                                                  (updatedRow as any)[`consultant${d.key}`] = { isApproved: false, comment: "" };
                                                }
                                                if (!updatedRow[`employer${d.key}` as keyof WorkPermit]) {
                                                  (updatedRow as any)[`employer${d.key}`] = { isApproved: false, comment: "" };
                                                }
                                              });
                                              setPermitForm(updatedRow);
                                              PERMIT_DISCIPLINES.forEach(
                                                (d) => {
                                                  if (
                                                    !row[
                                                      `contractor${d.key}` as keyof WorkPermit
                                                    ]
                                                  )
                                                    row[
                                                      `contractor${d.key}` as keyof WorkPermit
                                                    ] = {
                                                      isApproved: false,
                                                      comment: "",
                                                    };
                                                  if (
                                                    !row[
                                                      `consultant${d.key}` as keyof WorkPermit
                                                    ]
                                                  )
                                                    row[
                                                      `consultant${d.key}` as keyof WorkPermit
                                                    ] = {
                                                      isApproved: false,
                                                      comment: "",
                                                    };
                                                },
                                              );
                                            } else if (activeTab === "metre") {
                                              setMetreRowsForm([row]);
                                              setMetreMinuteId(
                                                row.minuteId || "",
                                              );
                                            } else if (
                                              activeTab === ("variation" as any)
                                            ) {
                                              setVariationForm(row);
                                              setVariationRoleView(
                                                SystemAdminService.getOrganization(
                                                  currentUser?.orgId || "",
                                                )?.type || "CONTRACTOR",
                                              );
                                            }
                                            setIsModalOpen(true);
                                          }}
                                          className="p-3 text-stone-400 hover:text-stone-900 hover:bg-[#faf8f4] rounded-2xl transition-all shadow-sm hover:shadow-md"
                                          title="ویرایش"
                                        >
                                          <Edit3 size={18} />
                                        </button>
                                      )}
                                      {canDeleteRow && (
                                        <button
                                          onClick={() => {
                                            setDeleteId(row.id);
                                            setIsDeleteModalOpen(true);
                                          }}
                                          className="p-3 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all shadow-sm hover:shadow-md"
                                          title="حذف"
                                        >
                                          <Trash2 size={18} />
                                        </button>
                                      )}
                                    </>
                                  ) : null;
                                })()}
                              </div>
                            </td>
                          </tr>
                          {activeTab === "minutes" &&
                            isExpanded &&
                            linkedItems.length > 0 && (
                              <tr className="bg-[#faf8f4] animate-fadeIn">
                                <td colSpan={8} className="p-6 border-b">
                                  <div
                                    className="bg-white rounded-3xl p-6 border border-stone-100 shadow-inner text-right"
                                    dir="rtl"
                                  >
                                    <h5 className="text-[10px] font-black text-stone-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                      <Package size={14} /> اقلام ریزمتره مرتبط
                                      با این صورت‌جلسه و مقایسه دیدگاه‌ها
                                    </h5>
                                    <div className="space-y-4">
                                      {linkedItems.map((m, mIdx) => {
                                        const mUP = getRowEffectivePrice(m);
                                        const mMult = getMultipliers(
                                          m.itemCode,
                                          m.itemType,
                                          m.independentCoefficient,
                                        ).total;
                                        const mRaw = m.partialTotal * mUP;
                                        const mCoeff = mRaw * mMult;

                                        const hasAudit =
                                          m.contractorTotal !== undefined ||
                                          m.consultantTotal !== undefined ||
                                          m.employerTotal !== undefined;

                                        return (
                                          <div
                                            key={m.id}
                                            className="p-5 bg-[#faf8f4]/50 rounded-2xl border border-[#ece5d8] space-y-4 group/item"
                                          >
                                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                              <div className="flex items-start gap-4 flex-1">
                                                <span className="text-[10px] font-black text-stone-300 mt-1">
                                                  {mIdx + 1}
                                                </span>
                                                <span className="font-black text-stone-900 bg-white px-2 py-1 rounded-lg border border-stone-100 text-[10px] shrink-0">
                                                  {m.itemCode}
                                                </span>
                                                <div>
                                                  <p className="text-xs font-bold text-stone-700 leading-relaxed">
                                                    {m.description}
                                                  </p>
                                                  {m.unit && (
                                                    <span className="text-[9px] text-stone-400 bg-white px-2 py-0.5 rounded border border-[#ece5d8] mt-1 inline-block">
                                                      واحد کار: {m.unit}
                                                    </span>
                                                  )}
                                                </div>
                                              </div>

                                              <div className="flex flex-wrap items-center gap-6 lg:gap-10 shrink-0 bg-white/60 p-3 rounded-xl border border-[#ece5d8]">
                                                <div className="text-center">
                                                  <p className="text-[8px] font-black text-stone-400 uppercase">
                                                    مقدار ملاک عمل
                                                  </p>
                                                  <p className="text-xs font-black text-stone-900">
                                                    {m.partialTotal.toLocaleString(
                                                      "fa-IR",
                                                    )}
                                                  </p>
                                                </div>
                                                <div className="text-center">
                                                  <p className="text-[8px] font-black text-stone-400 uppercase">
                                                    مبلغ خام
                                                  </p>
                                                  <p className="text-xs font-black text-stone-600">
                                                    {mRaw.toLocaleString(
                                                      "fa-IR",
                                                    )}
                                                  </p>
                                                </div>
                                                <div className="text-center">
                                                  <p className="text-[8px] font-black text-stone-500 uppercase">
                                                    مبلغ با ضریب
                                                  </p>
                                                  <p className="text-xs font-black text-amber-700">
                                                    {mCoeff.toLocaleString(
                                                      "fa-IR",
                                                    )}
                                                  </p>
                                                </div>
                                              </div>
                                            </div>

                                            {hasAudit && (
                                              <div className="pt-3 border-t border-dashed border-[#e5ded0]/50 flex flex-wrap gap-3 text-[9px] font-bold text-stone-500">
                                                {m.contractorTotal !==
                                                  undefined && (
                                                  <span className="bg-[#faf8f4]/50 text-amber-700 px-2.5 py-1 rounded-lg border border-stone-100/40">
                                                    👨‍🔧{" "}
                                                    <strong>
                                                      ادعای پیمانکار:
                                                    </strong>{" "}
                                                    {m.contractorCount ?? 1}×
                                                    {m.contractorLength ?? 1}×
                                                    {m.contractorWidth ?? 1}×
                                                    {m.contractorHeight ?? 1}×
                                                    {m.contractorMultiplier ??
                                                      1}{" "}
                                                    ={" "}
                                                    <span className="font-extrabold">
                                                      {m.contractorTotal.toLocaleString(
                                                        "fa-IR",
                                                      )}
                                                    </span>
                                                  </span>
                                                )}
                                                {m.consultantTotal !==
                                                  undefined && (
                                                  <span className="bg-emerald-50/50 text-emerald-700 px-2.5 py-1 rounded-lg border border-emerald-100/40">
                                                    🔍{" "}
                                                    <strong>
                                                      نظریه مشاور (
                                                      {m.consultantEditedBy}):
                                                    </strong>{" "}
                                                    {m.consultantCount ?? 1}×
                                                    {m.consultantLength ?? 1}×
                                                    {m.consultantWidth ?? 1}×
                                                    {m.consultantHeight ?? 1}×
                                                    {m.consultantMultiplier ??
                                                      1}{" "}
                                                    ={" "}
                                                    <span className="font-extrabold">
                                                      {m.consultantTotal.toLocaleString(
                                                        "fa-IR",
                                                      )}
                                                    </span>{" "}
                                                    {m.consultantEditedAt &&
                                                      `(${m.consultantEditedAt})`}
                                                  </span>
                                                )}
                                                {m.employerTotal !==
                                                  undefined && (
                                                  <span className="bg-purple-50/50 text-purple-700 px-2.5 py-1 rounded-lg border border-purple-100/40">
                                                    🏛️{" "}
                                                    <strong>
                                                      ابلاغ کارفرما (
                                                      {m.employerEditedBy}):
                                                    </strong>{" "}
                                                    {m.employerCount ?? 1}×
                                                    {m.employerLength ?? 1}×
                                                    {m.employerWidth ?? 1}×
                                                    {m.employerHeight ?? 1}×
                                                    {m.employerMultiplier ?? 1}{" "}
                                                    ={" "}
                                                    <span className="font-extrabold">
                                                      {m.employerTotal.toLocaleString(
                                                        "fa-IR",
                                                      )}
                                                    </span>{" "}
                                                    {m.employerEditedAt &&
                                                      `(${m.employerEditedAt})`}
                                                  </span>
                                                )}

                                                <div className="mr-auto flex items-center gap-1 text-[9px] font-black text-stone-400">
                                                  <span>
                                                    مبنای فعلی محاسبات:
                                                  </span>
                                                  <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200/50">
                                                    {m.employerTotal !==
                                                    undefined
                                                      ? "نسخه کارفرما (نهایی)"
                                                      : m.consultantTotal !==
                                                          undefined
                                                        ? "نسخه مشاور (مورد تایید)"
                                                        : "نسخه اولیه پیمانکار (ادعایی)"}
                                                  </span>
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          {activeTab === "statements" &&
                            isExpanded &&
                            row.selectedMinuteIds &&
                            row.selectedMinuteIds.length > 0 && (
                              <tr className="bg-[#faf8f4] animate-fadeIn">
                                <td colSpan={8} className="p-6 border-b">
                                  <div
                                    className="bg-white rounded-3xl p-6 border border-emerald-100 shadow-inner text-right"
                                    dir="rtl"
                                  >
                                    <h5 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                                      <FileSpreadsheet size={14} /> صورت‌جلسات
                                      مرتبط با این صورت‌وضعیت
                                    </h5>
                                    <div className="space-y-4">
                                      {getStatementTotals(
                                        row,
                                      ).includedMinutes.map((min, mIdx) => {
                                        const minTotals = getMinuteTotals(
                                          min.id,
                                        );
                                        return (
                                          <div
                                            key={min.id}
                                            className="p-5 bg-[#faf8f4]/50 rounded-2xl border border-[#ece5d8] space-y-4 group/item"
                                          >
                                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                              <div className="flex items-start gap-4 flex-1">
                                                <span className="text-[10px] font-black text-stone-300 mt-1">
                                                  {mIdx + 1}
                                                </span>
                                                <span className="font-black text-emerald-600 bg-white px-2.5 py-1.5 rounded-lg border border-emerald-100 text-[10px] shrink-0">
                                                  صورت‌جلسه {min.number}
                                                </span>
                                                <div>
                                                  <p className="text-xs font-bold text-stone-700 leading-relaxed">
                                                    {min.description}
                                                  </p>
                                                  {min.date && (
                                                    <span className="text-[9px] text-stone-400 bg-white px-2 py-0.5 rounded border border-[#ece5d8] mt-1 inline-block">
                                                      تاریخ صورت‌جلسه:{" "}
                                                      {min.date}
                                                    </span>
                                                  )}
                                                  {min.location && (
                                                    <span className="text-[9px] text-stone-400 bg-white px-2 py-0.5 rounded border border-[#ece5d8] mt-1 inline-block mr-2">
                                                      محل اجرا: {min.location}
                                                    </span>
                                                  )}
                                                </div>
                                              </div>

                                              <div className="flex flex-wrap items-center gap-6 lg:gap-10 shrink-0 bg-white/60 p-3 rounded-xl border border-[#ece5d8]">
                                                <div className="text-center">
                                                  <p className="text-[8px] font-black text-stone-400 uppercase">
                                                    مبلغ خام
                                                  </p>
                                                  <p className="text-xs font-black text-stone-600">
                                                    {minTotals.raw.toLocaleString(
                                                      "fa-IR",
                                                    )}{" "}
                                                    <span className="text-[9px] font-normal text-stone-400">
                                                      ریال
                                                    </span>
                                                  </p>
                                                </div>
                                                <div className="text-center">
                                                  <p className="text-[8px] font-black text-emerald-500 uppercase">
                                                    مبلغ با ضریب
                                                  </p>
                                                  <p className="text-xs font-black text-emerald-700">
                                                    {minTotals.withCoeff.toLocaleString(
                                                      "fa-IR",
                                                    )}{" "}
                                                    <span className="text-[9px] font-normal text-stone-400">
                                                      ریال
                                                    </span>
                                                  </p>
                                                </div>
                                                <div className="text-center">
                                                  <p className="text-[8px] font-black text-stone-400 uppercase">
                                                    وضعیت صورت‌جلسه
                                                  </p>
                                                  <p className="text-xs font-black text-stone-900">
                                                    {WorkflowService.getStatusLabel(
                                                      min,
                                                    )}
                                                  </p>
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Input Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/70 backdrop-blur-xl animate-fadeIn">
          <div className="bg-white w-full max-w-5xl rounded-[4rem] shadow-2xl overflow-hidden animate-slideUp border border-[#ece5d8] flex flex-col max-h-[95vh]">
            {/* Modal Header */}
            <div className="p-10 bg-stone-900 text-white flex justify-between items-center shrink-0 border-b border-white/5 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                {" "}
                <Sparkles
                  size={200}
                  className="absolute -right-20 -top-20"
                />{" "}
              </div>
              <div className="flex items-center gap-6 relative z-10 text-right">
                <div className="w-16 h-16 bg-amber-600 rounded-[1.8rem] flex items-center justify-center shadow-2xl shadow-stone-500/30">
                  {activeTab === "estimate" ? (
                    <Layers size={32} />
                  ) : activeTab === "minutes" ? (
                    <FileSpreadsheet size={32} />
                  ) : activeTab === "statements" ? (
                    <ScrollText size={32} />
                  ) : activeTab === ("permits" as any) ? (
                    <FileSignature size={32} />
                  ) : activeTab === ("materials" as any) ? (
                    <Truck size={32} />
                  ) : activeTab === ("variation" as any) ? (
                    <Scale size={32} />
                  ) : (
                    <Ruler size={32} />
                  )}
                </div>
                <div>
                  <h3 className="text-2xl font-black tracking-tight">
                    {editingId ? "بروزرسانی اطلاعات" : "ثبت داده‌های جدید"}
                  </h3>
                  <div className="flex items-center gap-3 mt-1.5 opacity-60">
                    <span className="text-[10px] font-black uppercase tracking-widest">
                      {activeTab === "estimate"
                        ? "برآورد پیمان"
                        : activeTab === "minutes"
                          ? "صورت‌جلسه کارگاهی"
                          : activeTab === "statements"
                            ? "صورت‌وضعیت کارکرد"
                            : activeTab === ("permits" as any)
                              ? "مجوز اجرای کار"
                              : activeTab === ("materials" as any)
                                ? materialSubTab === "MRS"
                                  ? "کنترل مصالح (ورودی)"
                                  : "حواله خروج (مصرفی)"
                                : activeTab === ("variation" as any)
                                  ? "تغییر مقادیر پیمان"
                                  : "ریزمتره و احجام"}
                    </span>
                    <div className="w-1 h-1 bg-white rounded-full"></div>
                    <span className="text-[10px] font-black">
                      پروژه {currentProject?.title}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-all group"
              >
                {" "}
                <X
                  size={28}
                  className="group-hover:rotate-90 transition-transform duration-500"
                />{" "}
              </button>
            </div>

            {/* Modal Body with Forms */}
            <form
              id="technical-office-form"
              onSubmit={handleSave}
              className="p-10 space-y-10 bg-[#faf8f4]/40 overflow-y-auto flex-1 custom-scrollbar"
            >
              {activeTab === "estimate" && (
                <div className="space-y-8 animate-fadeIn text-right">
                  {" "}
                  {currentProject?.contractType === "CBS" ? (
                    <div className="bg-stone-50/80 border border-indigo-200/80 rounded-[2rem] p-6 text-right text-indigo-900 shadow-sm flex flex-col md:flex-row items-start gap-4">
                      <div className="p-3 bg-amber-600 text-white rounded-xl shadow-md mt-1">
                        <Layers size={24} />
                      </div>
                      <div className="space-y-2 flex-1">
                        <h4 className="font-black text-sm">📋 ردیف ساختار شکست هزینه (CBS):</h4>
                        <p className="text-xs font-bold leading-relaxed text-amber-700 font-sans">
                          پروژه جاری تحت پیمان ساختار شکست (CBS) اداره می‌شود. در این نوع قرارداد، هر فعالیت دارای وزن مالی مستقیم است و هیچ‌گونه ضریب منطقه‌ای، بالاسری یا فصل فهرست‌بها اعمال نمی‌شود.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white p-4 rounded-3xl border border-[#e5ded0] flex flex-col md:flex-row gap-6 items-center justify-between shadow-sm">
                      {" "}
                      <div className="flex gap-2 p-1 bg-stone-100 rounded-2xl">
                        {" "}
                        {[
                          { id: "NORMAL", label: "آیتم فهرست‌بهایی (عادی)" },
                          { id: "STARRED", label: "آیتم ستاره‌دار" },
                          { id: "INVOICE", label: "آیتم فاکتوری" },
                        ].map((type) => (
                          <button
                            key={type.id}
                            type="button"
                            onClick={() =>
                              setEstForm({ ...estForm, itemType: type.id as any })
                            }
                            className={`px-6 py-3 rounded-xl text-xs font-black transition-all ${estForm.itemType === type.id ? "bg-[#ffc745] text-stone-950 font-black shadow-lg" : "text-stone-500 hover:text-stone-900"}`}
                          >
                            {" "}
                            {type.label}{" "}
                          </button>
                        ))}{" "}
                      </div>{" "}
                      {estForm.itemType !== "NORMAL" && (
                        <div className="flex items-center gap-4 bg-amber-50 px-6 py-3 rounded-2xl border border-amber-200 w-full md:w-auto animate-fadeIn">
                          {" "}
                          <span className="text-xs font-black text-amber-700">
                            ضریب اختصاصی آیتم:
                          </span>{" "}
                          <input
                            type="number"
                            step="0.01"
                            value={estForm.independentCoefficient || ""}
                            onChange={(e) =>
                              setEstForm({
                                ...estForm,
                                independentCoefficient: Number(e.target.value),
                              })
                            }
                            className="w-24 text-center bg-white border border-amber-300 rounded-xl py-2 font-bold outline-none focus:ring-2 focus:ring-amber-400"
                          />{" "}
                        </div>
                      )}{" "}
                    </div>
                  )}
                  {/* Discipline Selection (Phase 3B) */}
                  <div className="relative space-y-3">
                    {" "}
                    <label className="text-[11px] font-black text-stone-400 mr-2 uppercase tracking-widest flex items-center gap-2">
                      <Search size={14} /> {currentProject?.contractType === "CBS" ? "جستجوی هوشمند در کدهای ساختار شکست پروژه" : "جستجوی هوشمند در فهارس‌بهای پروژه"}
                    </label>{" "}
                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="md:w-64 shrink-0">
                        <select
                          value={estPlFilter}
                          onChange={(e) => {
                            setEstPlFilter(e.target.value);
                            if (estForm.code && estForm.code.length >= 2) {
                              setEstSearchResults(searchPriceList(estForm.code, e.target.value));
                            }
                          }}
                          className="w-full p-5 bg-white border border-[#e5ded0] rounded-[1.5rem] text-xs font-black outline-none focus:border-stone-500 shadow-sm text-right cursor-pointer"
                        >
                          <option value="all">{currentProject?.contractType === "CBS" ? "🔍 تمامی ساختارهای شکست" : "🔍 تمامی فهارس بها"}</option>
                          {currentProject?.priceLists?.map((pl) => (
                            <option key={pl.id} value={pl.id}>
                              {pl.title} {pl.year ? `(${pl.year})` : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="relative flex-1 group">
                        {" "}
                        <Hash
                          className="absolute right-4 top-1/2 -transtone-y-1/2 text-stone-300 group-focus-within:text-stone-500 transition-colors"
                          size={20}
                        />{" "}
                        <input
                          required
                          placeholder={currentProject?.contractType === "CBS" ? "کد ساختار شکست (WBS/CBS) یا شرح فعالیت را وارد کنید..." : "کد یا شرح آیتم را وارد کنید..."}
                          value={estForm.code || ""}
                          onChange={(e) => handleEstCodeSearch(e.target.value)}
                          className="w-full pr-12 pl-4 py-5 bg-white border border-[#e5ded0] rounded-[1.5rem] text-sm font-black outline-none focus:border-stone-500 focus:ring-4 focus:ring-stone-50 transition-all shadow-sm"
                        />{" "}
                        {showEstDropdown && estSearchResults.length > 0 && (
                          <div className="absolute top-full right-0 w-[min(90vw,700px)] mt-3 bg-white border border-[#e5ded0] rounded-3xl shadow-2xl z-[150] overflow-hidden animate-slideDown border-t-stone-500 border-t-8">
                            {" "}
                            <div className="p-3 bg-[#faf8f4] border-b border-[#ece5d8] flex items-center justify-between">
                              {" "}
                              <span className="text-[9px] font-black text-stone-400 uppercase px-3">
                                {currentProject?.contractType === "CBS" ? "نتایج جستجو در ساختار شکست هزینه (CBS)" : "نتایج جستجو در فهرست‌بها"}
                              </span>{" "}
                              <span className="text-[9px] font-bold text-stone-500 bg-white px-2 py-0.5 rounded-full shadow-sm">
                                {estSearchResults.length} مورد یافت شد
                              </span>{" "}
                            </div>{" "}
                            <div className="max-h-80 overflow-y-auto custom-scrollbar">
                              {" "}
                              {estSearchResults.map((item, idx) => (
                                <div
                                  key={idx}
                                  onClick={() => selectEstItem(item)}
                                  className="p-5 hover:bg-[#faf8f4] cursor-pointer border-b last:border-0 flex items-start gap-6 transition-colors group/item"
                                >
                                  {" "}
                                  <span className="w-24 font-black text-stone-900 text-[10px] shrink-0 bg-[#faf8f4] px-3 py-1.5 rounded-xl border border-stone-100 group-hover/item:bg-amber-600 group-hover/item:text-white transition-all shadow-sm text-center">
                                    {item.code}
                                  </span>{" "}
                                  <div className="flex-1 text-right">
                                    {" "}
                                    <span className="text-xs font-bold text-stone-800 block leading-relaxed group-hover/item:text-blue-900">
                                      {item.description}
                                    </span>{" "}
                                    <div className="flex items-center gap-4 mt-2">
                                      {" "}
                                      <span className="text-[9px] text-stone-400 font-black uppercase bg-stone-100 px-2 py-0.5 rounded-md">
                                        واحد: {item.unit}
                                      </span>{" "}
                                      {item.weightPercent !== undefined && (
                                        <span className="text-[9px] text-amber-600 font-black uppercase bg-stone-50 px-2 py-0.5 rounded-md">
                                          وزن مالی: {item.weightPercent}%
                                        </span>
                                      )}
                                      <span className="text-[9px] text-emerald-600 font-black uppercase bg-emerald-50 px-2 py-0.5 rounded-md">
                                        بهای پایه: {item.price.toLocaleString()}{" "}
                                        ریال
                                      </span>{" "}
                                    </div>{" "}
                                  </div>{" "}
                                </div>
                              ))}{" "}
                            </div>{" "}
                          </div>
                        )}{" "}
                      </div>{" "}
                      <div className="relative min-w-[120px]">
                        {" "}
                        <input
                          required
                          placeholder="واحد"
                          value={estForm.unit || ""}
                          onChange={(e) =>
                            setEstForm({ ...estForm, unit: e.target.value })
                          }
                          className="w-full h-full px-4 py-5 bg-white border border-[#e5ded0] rounded-[1.5rem] text-xs font-black text-center outline-none focus:border-stone-500 transition-all shadow-sm"
                        />{" "}
                      </div>{" "}
                    </div>{" "}
                  </div>{" "}
                  <div className="space-y-3">
                    {" "}
                    <label className="text-[11px] font-black text-stone-400 mr-2 uppercase tracking-widest">
                      {currentProject?.contractType === "CBS" ? "تایید نهایی شرح تفصیلی فعالیت ساختار شکست (CBS)" : "تایید نهایی شرح عملیات"}
                    </label>{" "}
                    <textarea
                      required
                      value={estForm.description || ""}
                      onChange={(e) =>
                        setEstForm({ ...estForm, description: e.target.value })
                      }
                      className="w-full px-6 py-4 bg-white border border-[#e5ded0] rounded-[1.5rem] text-sm font-bold outline-none focus:border-stone-500 transition-all shadow-sm"
                      rows={3}
                    />{" "}
                  </div>{" "}
                  <div className={`grid ${currentProject?.contractType === "CBS" ? "grid-cols-3" : "grid-cols-2"} gap-8`}>
                    {" "}
                    <div className="space-y-3">
                      {" "}
                      <label className="text-[11px] font-black text-stone-400 mr-2 uppercase tracking-widest flex items-center gap-2">
                        <Sigma size={14} /> {currentProject?.contractType === "CBS" ? "مقدار فیزیکی فعالیت" : "مقدار برآورد اولیه"}
                      </label>{" "}
                      <input
                        type="number"
                        step="any"
                        required
                        value={estForm.quantity || ""}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          if (currentProject?.contractType === "CBS") {
                            const totalBudget = currentProject?.initialBudget || 1;
                            const newWeight = ((val * (estForm.unitPrice || 0)) / totalBudget) * 100;
                            setEstForm({
                              ...estForm,
                              quantity: val,
                              weightPercent: Number(newWeight.toFixed(4)),
                            });
                          } else {
                            setEstForm({
                              ...estForm,
                              quantity: val,
                            });
                          }
                        }}
                        className="w-full px-6 py-5 bg-white border border-[#e5ded0] rounded-[1.5rem] text-lg font-black text-center outline-none focus:border-stone-500 transition-all shadow-sm"
                      />{" "}
                    </div>{" "}
                    <div className="space-y-3">
                      {" "}
                      <label className="text-[11px] font-black text-stone-400 mr-2 uppercase tracking-widest flex items-center gap-2">
                        <DollarSign size={14} /> {currentProject?.contractType === "CBS" ? "بهای واحد تخصیص مالی (ریال)" : "بهای واحد مبنا (ریال)"}
                      </label>{" "}
                      <input
                        type="number"
                        step="any"
                        required
                        value={estForm.unitPrice || ""}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          if (currentProject?.contractType === "CBS") {
                            const totalBudget = currentProject?.initialBudget || 1;
                            const newWeight = (((estForm.quantity || 0) * val) / totalBudget) * 100;
                            setEstForm({
                              ...estForm,
                              unitPrice: val,
                              weightPercent: Number(newWeight.toFixed(4)),
                            });
                          } else {
                            setEstForm({
                              ...estForm,
                              unitPrice: val,
                            });
                          }
                        }}
                        className="w-full px-6 py-5 bg-white border border-[#e5ded0] rounded-[1.5rem] text-lg font-black text-center outline-none focus:border-stone-500 transition-all shadow-sm"
                      />{" "}
                    </div>{" "}
                    {currentProject?.contractType === "CBS" && (
                      <div className="space-y-3 animate-fadeIn">
                        {" "}
                        <label className="text-[11px] font-black text-stone-400 mr-2 uppercase tracking-widest flex items-center gap-2 text-amber-600">
                          <TrendingUp size={14} /> سهم وزنی مالی فعالیت (٪)
                        </label>{" "}
                        <input
                          type="number"
                          step="0.0001"
                          required
                          value={
                            estForm.weightPercent !== undefined
                              ? estForm.weightPercent
                              : Number(((((estForm.quantity || 0) * (estForm.unitPrice || 0)) / (currentProject?.initialBudget || 1)) * 100).toFixed(4))
                          }
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            const totalBudget = currentProject?.initialBudget || 0;
                            const targetTotal = totalBudget * (val / 100);
                            const newUnitPrice = targetTotal / (estForm.quantity || 1);
                            setEstForm({
                              ...estForm,
                              weightPercent: val,
                              unitPrice: Number(newUnitPrice.toFixed(2)),
                            });
                          }}
                          className="w-full px-6 py-5 bg-stone-50/50 border border-indigo-200 text-indigo-900 rounded-[1.5rem] text-lg font-black text-center outline-none focus:border-stone-500 transition-all shadow-sm focus:ring-4 focus:ring-stone-100"
                        />{" "}
                      </div>
                    )}
                  </div>{" "}
                  <div className="bg-stone-900 text-white p-8 rounded-3xl flex justify-between items-center shadow-2xl shadow-stone-900/40 border border-stone-800 animate-pulse">
                    {" "}
                    <div className="flex items-center gap-4">
                      {" "}
                      <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-md text-amber-400">
                        <TrendingUp size={32} />
                      </div>{" "}
                      <div className="text-right">
                        {" "}
                        <span className="text-[10px] font-black opacity-50 uppercase tracking-widest">
                          {currentProject?.contractType === "CBS" ? "مبلغ کل ردیف ساختار شکست و سهم وزنی:" : "مبلغ کل برآورد با ضرایب:"}
                        </span>{" "}
                        <h4 className="text-sm font-bold text-stone-300 mt-1">
                          {currentProject?.contractType === "CBS" ? (
                            `مبلغ کل ردیف: ${((estForm.quantity || 0) * (estForm.unitPrice || 0)).toLocaleString()} ریال`
                          ) : (
                            <>
                              ضریب موثر:{" "}
                              {getMultipliers(
                                estForm.code || "",
                                estForm.itemType,
                                estForm.independentCoefficient,
                              ).total.toFixed(4)}
                            </>
                          )}
                        </h4>{" "}
                      </div>{" "}
                    </div>{" "}
                    <span className="text-4xl font-black tracking-tighter text-amber-400">
                      {" "}
                      {currentProject?.contractType === "CBS" ? (
                        `${((((estForm.quantity || 0) * (estForm.unitPrice || 0)) / (currentProject?.initialBudget || 1)) * 100).toFixed(4)}٪`
                      ) : (
                        (
                          (estForm.quantity || 0) *
                          (estForm.unitPrice || 0) *
                          getMultipliers(
                            estForm.code || "",
                            estForm.itemType,
                            estForm.independentCoefficient,
                          ).total
                        ).toLocaleString()
                      )}{" "}
                    </span>{" "}
                  </div>{" "}
                </div>
              )}
              {activeTab === "minutes" && (
                <div className="space-y-8 animate-fadeIn text-right">
                  {" "}
                  <div className="grid grid-cols-2 gap-8">
                    {" "}
                    <div className="space-y-3">
                      {" "}
                      <label className="text-[11px] font-black text-stone-400 mr-2 uppercase tracking-widest flex items-center gap-2">
                        <Hash size={14} /> شماره صورت‌جلسه
                      </label>{" "}
                      <input
                        required
                        value={minForm.number || ""}
                        onChange={(e) =>
                          setMinForm({ ...minForm, number: e.target.value })
                        }
                        className="w-full px-6 py-5 bg-white border border-[#e5ded0] rounded-[1.5rem] text-lg font-black text-center outline-none focus:border-stone-500 transition-all shadow-sm"
                        placeholder="مثلاً ۰۱"
                      />{" "}
                    </div>{" "}
                    <div className="space-y-3">
                      {" "}
                      <label className="text-[11px] font-black text-stone-400 mr-2 uppercase tracking-widest flex items-center gap-2">
                        <Calendar size={14} /> تاریخ تنظیم و تایید
                      </label>{" "}
                      <ShamsiDatePicker
                        required
                        value={minForm.date || ""}
                        onChange={(val) =>
                          setMinForm({
                            ...minForm,
                            date: val,
                          })
                        }
                        inputClassName="!px-6 !py-5 !bg-white !border-[#e5ded0] !rounded-[1.5rem] !text-lg !font-black !text-center outline-none focus:!border-stone-500 transition-all shadow-sm"
                        placeholder="۱۴۰۳/۰۱/۰۱"
                      />{" "}
                    </div>{" "}
                  </div>
                  {/* Discipline Selection (Phase 3B) */}
                  <div className="space-y-3">
                    {" "}
                    <label className="text-[11px] font-black text-stone-400 mr-2 uppercase tracking-widest flex items-center gap-2">
                      <Info size={14} /> موضوع و شرح تفصیلی عملیات
                    </label>{" "}
                    <textarea
                      required
                      value={minForm.description || ""}
                      onChange={(e) =>
                        setMinForm({ ...minForm, description: e.target.value })
                      }
                      className="w-full px-6 py-5 bg-white border border-[#e5ded0] rounded-[1.5rem] text-sm font-bold outline-none focus:border-stone-500 transition-all shadow-sm"
                      rows={4}
                    />{" "}
                  </div>{" "}
                  <div className="space-y-3">
                    {" "}
                    <label className="text-[11px] font-black text-stone-400 mr-2 uppercase tracking-widest flex items-center gap-2">
                      <MapPin size={14} /> محدوده اجرایی و موقعیت دقیق (لوکیشن)
                    </label>{" "}
                    <input
                      value={minForm.location || ""}
                      onChange={(e) =>
                        setMinForm({ ...minForm, location: e.target.value })
                      }
                      className="w-full px-6 py-5 bg-white border border-[#e5ded0] rounded-[1.5rem] text-sm font-bold outline-none focus:border-stone-500 transition-all shadow-sm"
                      placeholder="مثلاً کیلومتر ۵ الی ۱۰ - جبهه شرقی"
                    />{" "}
                  </div>{" "}
                </div>
              )}
              {activeTab === "statements" && (
                <div className="space-y-8 animate-fadeIn text-right">
                  {" "}
                  <div className="grid grid-cols-3 gap-6">
                    {" "}
                    <div className="space-y-3">
                      {" "}
                      <label className="text-[11px] font-black text-stone-400 mr-2 uppercase tracking-widest">
                        شماره صورت‌وضعیت
                      </label>{" "}
                      <input
                        required
                        value={stmtForm.number || ""}
                        onChange={(e) =>
                          setStmtForm({ ...stmtForm, number: e.target.value })
                        }
                        className="w-full px-6 py-4 bg-white border border-[#e5ded0] rounded-[1.5rem] text-lg font-black text-center outline-none focus:border-stone-500 transition-all"
                        placeholder="۰۱"
                      />{" "}
                    </div>{" "}
                    <div className="space-y-3">
                      {" "}
                      <label className="text-[11px] font-black text-stone-400 mr-2 uppercase tracking-widest">
                        از تاریخ
                      </label>{" "}
                      <ShamsiDatePicker
                        required
                        value={stmtForm.startDate || ""}
                        onChange={(val) =>
                          setStmtForm({
                            ...stmtForm,
                            startDate: val,
                          })
                        }
                        inputClassName="!px-6 !py-4 !bg-white !border-[#e5ded0] !rounded-[1.5rem] !text-center !font-bold outline-none focus:!border-stone-500 transition-all"
                        placeholder="۱۴۰۳/۰۱/۰۱"
                      />{" "}
                    </div>{" "}
                    <div className="space-y-3">
                      {" "}
                      <label className="text-[11px] font-black text-stone-400 mr-2 uppercase tracking-widest">
                        تا تاریخ
                      </label>{" "}
                      <ShamsiDatePicker
                        required
                        value={stmtForm.endDate || ""}
                        onChange={(val) =>
                          setStmtForm({
                            ...stmtForm,
                            endDate: val,
                          })
                        }
                        inputClassName="!px-6 !py-4 !bg-white !border-[#e5ded0] !rounded-[1.5rem] !text-center !font-bold outline-none focus:!border-stone-500 transition-all"
                        placeholder="۱۴۰۳/۰۱/۳۰"
                      />{" "}
                    </div>{" "}
                  </div>{" "}
                  <div className="space-y-3">
                    {" "}
                    <label className="text-[11px] font-black text-stone-400 mr-2 uppercase tracking-widest">
                      توضیحات صورت‌وضعیت
                    </label>{" "}
                    <input
                      value={stmtForm.description || ""}
                      onChange={(e) =>
                        setStmtForm({
                          ...stmtForm,
                          description: e.target.value,
                        })
                      }
                      className="w-full px-6 py-4 bg-white border border-[#e5ded0] rounded-[1.5rem] font-bold outline-none focus:border-stone-500 transition-all"
                      placeholder="شرح دوره کارکرد..."
                    />{" "}
                  </div>{" "}
                  <div className="bg-[#faf8f4] p-6 rounded-3xl border border-[#e5ded0]">
                    {" "}
                    <h4 className="text-sm font-black text-stone-800 mb-4 flex items-center gap-2">
                      <CheckSquare size={18} /> انتخاب صورت‌جلسات قابل پرداخت در
                      این دوره
                    </h4>{" "}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                      {" "}
                      {minutes
                        .filter((m) => {
                          const isProjectMatch =
                            m.projectId === selectedProjectId;
                          const otherStatements = statements.filter(
                            (s) =>
                              s.id !== editingId &&
                              s.projectId === selectedProjectId,
                          );
                          const usedInOthers = otherStatements.flatMap(
                            (s) => s.selectedMinuteIds || [],
                          );
                          const isUnassigned = !usedInOthers.includes(m.id);
                          const isFinalApprovedByEmployer = m.isFinalFrozen;
                          const isNotArchived = !(m as any).isArchived;
                          const isAlreadySelectedInThisForm =
                            stmtForm.selectedMinuteIds?.includes(m.id);
                          return (
                            isProjectMatch &&
                            isNotArchived &&
                            (isAlreadySelectedInThisForm ||
                              (isUnassigned && isFinalApprovedByEmployer))
                          );
                        })
                        .map((minute) => {
                          const isSelected =
                            stmtForm.selectedMinuteIds?.includes(minute.id);
                          return (
                            <div
                              key={minute.id}
                              className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 ${isSelected ? "bg-amber-600 border-amber-600 text-white" : "bg-white border-[#e5ded0] hover:border-blue-300"}`}
                            >
                              {" "}
                              <div
                                className="flex items-center gap-3 cursor-pointer flex-1"
                                onClick={() =>
                                  toggleMinuteInStatement(minute.id)
                                }
                              >
                                {" "}
                                {isSelected ? (
                                  <CheckSquare size={20} />
                                ) : (
                                  <Square
                                    size={20}
                                    className="text-stone-300"
                                  />
                                )}{" "}
                                <div>
                                  {" "}
                                  <div className="text-xs font-black">
                                    صورت‌جلسه {minute.number}
                                  </div>{" "}
                                  <div
                                    className={`text-[10px] mt-1 truncate max-w-[150px] ${isSelected ? "text-stone-100" : "text-stone-400"}`}
                                  >
                                    {minute.description}
                                  </div>{" "}
                                </div>{" "}
                              </div>{" "}
                              {isSelected &&
                                currentUser &&
                                WorkflowService.canEdit(
                                  minute,
                                  currentUser,
                                ) && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleEditMinuteMetre(minute.id)
                                    }
                                    className="p-2 bg-white/20 hover:bg-white/30 rounded-lg text-white transition-all z-10"
                                    title="ویرایش ریزمتره این صورت‌جلسه"
                                  >
                                    {" "}
                                    <Edit3 size={16} />{" "}
                                  </button>
                                )}{" "}
                            </div>
                          );
                        })}{" "}
                    </div>{" "}
                  </div>{" "}
                  {stmtForm.selectedMinuteIds &&
                    stmtForm.selectedMinuteIds.length > 0 && (
                      <div className="bg-emerald-50 text-emerald-800 p-6 rounded-[2rem] border border-emerald-100 flex justify-between items-center">
                        {" "}
                        <span className="text-xs font-black">
                          جمع مبلغ تایید شده این صورت‌وضعیت:
                        </span>{" "}
                        <span className="text-xl font-black tracking-tighter">
                          {getStatementTotals(
                            stmtForm as Statement,
                          ).totalCoeff.toLocaleString("fa-IR")}{" "}
                          <span className="text-xs">ریال</span>
                        </span>{" "}
                      </div>
                    )}{" "}
                </div>
              )}
              {activeTab === ("permits" as any) && (
                <div className="space-y-8 animate-fadeIn text-right">
                  {currentProject?.contractType === "CBS" && (
                    <div className="bg-stone-50/80 border border-indigo-200/80 rounded-[2rem] p-6 text-right text-indigo-900 shadow-sm flex flex-col md:flex-row items-start gap-4 animate-fadeIn">
                      <div className="p-3 bg-amber-600 text-white rounded-xl shadow-md mt-1">
                        <Info size={24} />
                      </div>
                      <div className="space-y-2 flex-1">
                        <h4 className="font-black text-sm">📋 انطباق مجوزهای کار با ساختار شکست (CBS):</h4>
                        <p className="text-xs font-bold leading-relaxed text-amber-700 font-sans">
                          در پروژه‌های با ساختار شکست (CBS)، صدور و تایید هرگونه مجوز کار (Permit to Work) مستقیماً منوط به تطبیق فعالیت‌ها با ساختار شکست مصوب و تاییدیه درصد پیشرفت فیزیکی دوره‌ای می‌باشد.
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="bg-white p-8 rounded-3xl border border-[#e5ded0] shadow-sm space-y-6">
                    <div className="flex items-center gap-4 mb-2">
                      <div className="w-10 h-10 bg-[#faf8f4] text-stone-900 rounded-xl flex items-center justify-center">
                        <FileSignature size={20} />
                      </div>
                      <h4 className="text-sm font-black text-stone-800">
                        اطلاعات پایه مجوز
                      </h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <label className="text-[11px] font-black text-stone-400 mr-2 uppercase tracking-widest">
                          شماره مجوز
                        </label>
                        <input
                          required
                          value={permitForm.number || ""}
                          onChange={(e) =>
                            setPermitForm({
                              ...permitForm,
                              number: e.target.value,
                            })
                          }
                          className="w-full px-6 py-4 bg-[#faf8f4] border border-[#e5ded0] rounded-2xl text-lg font-black text-center outline-none focus:border-stone-500 transition-all"
                          placeholder="WP-001"
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="text-[11px] font-black text-stone-400 mr-2 uppercase tracking-widest">
                          تاریخ درخواست
                        </label>
                        <ShamsiDatePicker
                          required
                          value={permitForm.date || ""}
                          onChange={(val) =>
                            setPermitForm({
                              ...permitForm,
                              date: val,
                            })
                          }
                          inputClassName="!px-6 !py-4 !bg-[#faf8f4] !border-[#e5ded0] !rounded-2xl !text-lg !font-black !text-center outline-none focus:!border-stone-500 transition-all font-mono"
                          placeholder="۱۴۰۳/۰۱/۰۱"
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[11px] font-black text-stone-400 mr-2 uppercase tracking-widest">
                        موقعیت دقیق اجرایی
                      </label>
                      <input
                        required
                        value={permitForm.location || ""}
                        onChange={(e) =>
                          setPermitForm({
                            ...permitForm,
                            location: e.target.value,
                          })
                        }
                        className="w-full px-6 py-4 bg-[#faf8f4] border border-[#e5ded0] rounded-2xl text-sm font-bold outline-none focus:border-stone-500 transition-all"
                        placeholder="مثلاً: زون A - طبقه اول"
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[11px] font-black text-stone-400 mr-2 uppercase tracking-widest">
                        شرح عملیات مورد درخواست
                      </label>
                      <textarea
                        required
                        value={permitForm.description || ""}
                        onChange={(e) =>
                          setPermitForm({
                            ...permitForm,
                            description: e.target.value,
                          })
                        }
                        className="w-full px-6 py-4 bg-[#faf8f4] border border-[#e5ded0] rounded-2xl text-sm font-bold outline-none focus:border-stone-500 transition-all leading-relaxed"
                        rows={3}
                      />
                    </div>
                  </div>

                  <div className="bg-white p-8 rounded-3xl border border-[#e5ded0] shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                      <h4 className="text-sm font-black text-stone-800 flex items-center gap-2">
                        <ShieldCheck size={20} className="text-amber-500" />{" "}
                        چک‌لیست تاییدات فنی و ایمنی
                      </h4>
                      <div className="bg-stone-100 p-1 rounded-2xl border border-[#e5ded0] flex text-[10px] font-black shadow-inner">
                        <button
                          type="button"
                          onClick={() => setPermitActiveRoleTab("contractor")}
                          className={`px-6 py-2 rounded-xl transition-all ${permitActiveRoleTab === "contractor" ? "bg-white text-stone-900 shadow-md transform scale-105" : "text-stone-400 hover:text-stone-600"}`}
                        >
                          {" "}
                          تاییدات پیمانکار{" "}
                        </button>
                        {(currentUser?.role === "SYSTEM_ADMIN" || (currentUser && SystemAdminService.getOrganization(currentUser.orgId)?.type !== "CONTRACTOR")) && (
                          <button
                            type="button"
                            onClick={() => setPermitActiveRoleTab("consultant")}
                            className={`px-6 py-2 rounded-xl transition-all ${permitActiveRoleTab === "consultant" ? "bg-white text-stone-900 shadow-md transform scale-105" : "text-stone-400 hover:text-stone-600"}`}
                          >
                            {" "}
                            تاییدات مشاور{" "}
                          </button>
                        )}
                        {(currentUser?.role === "SYSTEM_ADMIN" || (currentUser && SystemAdminService.getOrganization(currentUser.orgId)?.type !== "CONTRACTOR")) && (
                          <button
                            type="button"
                            onClick={() => setPermitActiveRoleTab("employer")}
                            className={`px-6 py-2 rounded-xl transition-all ${permitActiveRoleTab === "employer" ? "bg-white text-stone-900 shadow-md transform scale-105" : "text-stone-400 hover:text-stone-600"}`}
                          >
                            {" "}
                            تاییدات کارفرما{" "}
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(() => {
                        const userOrgType = currentUser
                          ? SystemAdminService.getOrganization(
                              currentUser.orgId,
                            )?.type
                          : null;
                        const isSystemAdmin =
                          currentUser?.role === "SYSTEM_ADMIN";
                        const isWorkshopSupervisor =
                          (currentUser?.jobTitle || "").includes("سرپرست کارگاه") ||
                          (currentUser?.jobLevel || "").includes("سرپرست کارگاه");
                        const canModifyCurrentTab =
                          isSystemAdmin ||
                          isWorkshopSupervisor ||
                          (permitActiveRoleTab === "contractor" &&
                            userOrgType === OrganizationType.CONTRACTOR) ||
                          (permitActiveRoleTab === "consultant" &&
                            userOrgType === OrganizationType.CONSULTANT) ||
                          (permitActiveRoleTab === "employer" &&
                            userOrgType === OrganizationType.EMPLOYER);

                        return PERMIT_DISCIPLINES.map((d) => {
                          const roleKey =
                            `${permitActiveRoleTab}${d.key}` as keyof WorkPermit;
                          const detail = (permitForm[
                            roleKey
                          ] as ApprovalDetail) || {
                            isApproved: false,
                            comment: "",
                          };
                          const hasDisciplineAuth = checkPermitDisciplineExpertAuth(d.key);
                          const canUserModifyThisDiscipline = canModifyCurrentTab && hasDisciplineAuth;

                          return (
                            <div
                              key={d.key}
                              className={`bg-[#faf8f4] p-4 rounded-3xl border border-[#ece5d8] transition-all space-y-3 group/item ${canUserModifyThisDiscipline ? "hover:border-blue-300" : "opacity-70 grayscale-[0.5]"}`}
                            >
                              <div
                                onClick={() =>
                                  canUserModifyThisDiscipline &&
                                  updatePermitDiscipline(
                                    permitActiveRoleTab,
                                    d.key,
                                    "isApproved",
                                    !detail.isApproved,
                                  )
                                }
                                className={`flex items-center justify-between ${canUserModifyThisDiscipline ? "cursor-pointer" : "cursor-not-allowed"}`}
                              >
                                <div className="flex items-center justify-between w-full">
                                  <div className="flex items-center gap-3">
                                    {detail.isApproved ? (
                                      <CheckCircle
                                        size={24}
                                        className={
                                          permitActiveRoleTab === "contractor"
                                            ? "text-amber-500"
                                            : permitActiveRoleTab === "consultant"
                                              ? "text-stone-500"
                                              : "text-emerald-500"
                                        }
                                      />
                                    ) : (
                                      <Square
                                        size={24}
                                        className="text-stone-200"
                                      />
                                    )}
                                    <span
                                      className={`text-xs font-black ${detail.isApproved ? "text-stone-800" : "text-stone-400"}`}
                                    >
                                      {d.label}
                                    </span>
                                  </div>
                                  {canModifyCurrentTab && !hasDisciplineAuth && (
                                    <span className="text-[8px] font-black text-rose-500 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md" dir="rtl">
                                      مخصوص کارشناس {getDisciplineExpertName(d.key)}
                                    </span>
                                  )}
                                  {canUserModifyThisDiscipline && (
                                    <span className="text-[8px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md" dir="rtl">
                                      شما دسترسی تایید دارید
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div
                                className={`flex items-center gap-2 p-3 rounded-xl border border-[#ece5d8] transition-all ${canUserModifyThisDiscipline ? "bg-white/50 focus-within:border-blue-300 focus-within:bg-white" : "bg-stone-200/50"}`}
                              >
                                <MessageSquare
                                  size={14}
                                  className="text-stone-300 ml-2"
                                />
                                <input
                                  placeholder={
                                    canUserModifyThisDiscipline
                                      ? `توضیحات ${permitActiveRoleTab === "contractor" ? "پیمانکار" : permitActiveRoleTab === "consultant" ? "مشاور" : "کارفرما"}...`
                                      : !hasDisciplineAuth && canModifyCurrentTab
                                        ? `فقط برای کارشناس ${getDisciplineExpertName(d.key)}`
                                        : "دسترسی فقط برای سازمان مربوطه"
                                  }
                                  value={detail.comment || ""}
                                  disabled={!canUserModifyThisDiscipline}
                                  onChange={(e) =>
                                    updatePermitDiscipline(
                                      permitActiveRoleTab,
                                      d.key,
                                      "comment",
                                      e.target.value,
                                    )
                                  }
                                  className={`w-full bg-transparent text-[11px] font-bold outline-none ${canUserModifyThisDiscipline ? "text-stone-600" : "text-stone-400 cursor-not-allowed"}`}
                                />
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>

                  {/* Contractor Organizational Signatures Panel */}
                  <div className="bg-white p-8 rounded-3xl border border-[#e5ded0] shadow-sm space-y-6">
                    <div className="flex items-center gap-4 mb-2">
                      <div className="w-10 h-10 bg-[#faf8f4] text-stone-900 rounded-xl flex items-center justify-center">
                        <CheckCircle size={20} />
                      </div>
                      <h4 className="text-sm font-black text-stone-800">
                        باکس‌های تایید سازمانی پیمانکار
                      </h4>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {[
                        { id: "contractorExpert", label: "کارشناس پیمانکار (کارشناس دفتر فنی)", desc: "بررسی انطباق فنی و مدارک مرتبط" },
                        { id: "contractorUnitHead", label: "سرپرست واحد پیمانکار (رئیس دفتر فنی)", desc: "تایید نهایی رسته و صلاحیت فنی" },
                        { id: "contractorSiteManager", label: "سرپرست کارگاه پیمانکار", desc: "تایید عملیات اجرایی کارگاه" },
                      ].map((role) => {
                        const key = `${role.id}Approval` as keyof WorkPermit;
                        const data = (permitForm[key] as ApprovalDetail) || {
                          isApproved: false,
                          comment: "",
                        };
                        const userOrgType = currentUser
                          ? SystemAdminService.getOrganization(currentUser.orgId)?.type
                          : null;
                        const isContractorUser = userOrgType === "CONTRACTOR";
                        const canModify = checkPermitSignatureAuth(role.id);

                        return (
                          <div
                            key={role.id}
                            className={`p-4 rounded-3xl border transition-all ${
                              data.isApproved 
                                ? "bg-[#faf8f4]/60 border-blue-200 shadow-3xs" 
                                : "bg-[#faf8f4] border-[#ece5d8]"
                            } ${!canModify ? 'opacity-75 grayscale-[0.2]' : ''}`}
                          >
                            <div className="flex items-start justify-between gap-2 mb-3">
                              <div className="flex-1">
                                <h5 className="font-bold text-xs text-stone-800">
                                  {role.label}
                                </h5>
                                <p className="text-[9px] text-stone-400 mt-0.5 leading-relaxed">
                                  {role.desc}
                                </p>
                                <div className="mt-1.5 flex flex-wrap gap-1">
                                  {isContractorUser && !canModify && (
                                    <span className="text-[8px] font-black text-rose-500 bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded-md" dir="rtl">
                                      مخصوص {getPermitSignatureRoleRequiredName(role.id)}
                                    </span>
                                  )}
                                  {canModify && (
                                    <span className="text-[8px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-md" dir="rtl">
                                      شما دسترسی تایید دارید
                                    </span>
                                  )}
                                </div>
                              </div>
                              <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#e5ded0] shadow-3xs hover:bg-[#faf8f4] select-none ${canModify ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed'}`}>
                                <input
                                  type="checkbox"
                                  checked={data.isApproved}
                                  disabled={!canModify}
                                  onChange={(e) =>
                                    updatePermitApproval(
                                      role.id as any,
                                      "isApproved",
                                      e.target.checked,
                                    )
                                  }
                                  className="w-3.5 h-3.5 rounded text-stone-900 accent-amber-600 focus:ring-0 cursor-pointer"
                                />
                                <span className="text-[10px] font-black leading-none text-stone-700">تایید</span>
                              </label>
                            </div>
                            <input
                              placeholder={canModify ? "توضیحات و دیدگاه کارشناسی..." : isContractorUser ? `فقط کاربری با سمت «${getPermitSignatureRoleRequiredName(role.id)}»` : "دسترسی فقط برای پیمانکار"}
                              value={data.comment || ""}
                              disabled={!canModify}
                              onChange={(e) =>
                                updatePermitApproval(
                                  role.id as any,
                                  "comment",
                                  e.target.value,
                                )
                              }
                              className="w-full text-[10px] bg-white p-2.5 rounded-xl border border-[#e5ded0] outline-none focus:border-amber-400 placeholder:text-stone-400 font-medium"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="bg-[#faf8f4] p-8 rounded-3xl border border-stone-100 flex items-center gap-6">
                    <div className="p-4 bg-[#ffc745] text-stone-950 font-black rounded-2xl shadow-lg shadow-stone-500/20">
                      <UserCheck size={28} />
                    </div>
                    <div>
                      <h4 className="text-base font-black text-blue-900 mb-1">
                        فرآیند تایید و صدور
                      </h4>
                      <p className="text-xs font-bold text-amber-700/60 leading-relaxed max-w-lg">
                        پس از ثبت اطلاعات و تکمیل چک‌لیست‌های مربوطه، سند را
                        ذخیره کرده و از طریق دکمه "ارسال" در لیست مجوزها، آن را
                        به گردش کار بفرستید. تایید نهایی توسط مدیران پیمانکار و
                        مشاور طبق روال استاندارد انجام خواهد شد.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "metre" && (
                <MetreEntryForm
                  metreMinuteId={metreMinuteId}
                  setMetreMinuteId={setMetreMinuteId}
                  metreRowsForm={metreRowsForm}
                  setMetreRowsForm={setMetreRowsForm}
                  minutes={minutes}
                  selectedProjectId={selectedProjectId}
                  currentUser={currentUser}
                  handleMetreCodeSearch={handleMetreCodeSearch}
                  selectMetreItem={selectMetreItem}
                  addMetreRow={addMetreRow}
                  updateMetreRowField={updateMetreRowField}
                  currentProject={currentProject}
                />
              )}

              {activeTab === ("materials" as any) && materialSubTab === "MRS" && (
                <div className="space-y-8 animate-fadeIn text-right">
                  {currentProject?.contractType === "CBS" && (
                    <div className="bg-stone-50/80 border border-indigo-200/80 rounded-[2rem] p-6 text-right text-indigo-900 shadow-sm flex flex-col md:flex-row items-start gap-4">
                      <div className="p-3 bg-amber-600 text-white rounded-xl shadow-md mt-1">
                        <Info size={24} />
                      </div>
                      <div className="space-y-2 flex-1">
                        <h4 className="font-black text-sm">📊 کنترل مصالح وارده در قرارداد ساختار شکست (CBS):</h4>
                        <p className="text-xs font-bold leading-relaxed text-amber-700 font-sans">
                          در قراردادهای ساختار شکست (CBS)، مصالح وارده مستقیماً بر اساس نیازمندی‌های مصوب فعالیت‌های کلان ساختار شکست ثبت و تخصیص داده می‌شوند تا کنترل پرت کارگاهی و بهینه‌سازی زنجیره تامین دقیقاً مطابق با درصد پیشرفت فیزیکی ارزیابی شود.
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="space-y-4">
                    <h4 className="text-xs font-black text-stone-500 uppercase tracking-widest border-b border-stone-100 pb-2 mb-4">
                      اطلاعات پایه و زمان
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <div>
                        <label className="text-[10px] font-bold text-stone-400 mb-1 block">
                          شماره سریال قبض
                        </label>
                        <input
                          required
                          value={mrsForm.serialNumber || ""}
                          onChange={(e) =>
                            setMrsForm({
                              ...mrsForm,
                              serialNumber: e.target.value,
                            })
                          }
                          className="w-full p-3 bg-[#faf8f4] rounded-xl font-bold text-sm border border-transparent focus:bg-white focus:border-stone-500 transition-all outline-none"
                          placeholder="مثلاً 1024"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-stone-400 mb-1 block">
                          تاریخ ورود
                        </label>
                        <ShamsiDatePicker
                          required
                          value={mrsForm.entryDate || ""}
                          onChange={(val) =>
                            setMrsForm({
                              ...mrsForm,
                              entryDate: val,
                            })
                          }
                          inputClassName="!p-3 !bg-[#faf8f4] !rounded-xl !font-bold !text-sm border border-transparent focus:!bg-white focus:!border-stone-500 transition-all outline-none !text-center"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-stone-400 mb-1 block">
                          ساعت ورود
                        </label>
                        <input
                          required
                          value={mrsForm.entryTime || ""}
                          onChange={(e) =>
                            setMrsForm({
                              ...mrsForm,
                              entryTime: e.target.value,
                            })
                          }
                          className="w-full p-3 bg-[#faf8f4] rounded-xl font-bold text-sm border border-transparent focus:bg-white focus:border-stone-500 transition-all outline-none text-center"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-stone-400 mb-1 block">
                          محل دپو / انبار
                        </label>
                        <input
                          value={mrsForm.storageLocation || ""}
                          onChange={(e) =>
                            setMrsForm({
                              ...mrsForm,
                              storageLocation: e.target.value,
                            })
                          }
                          className="w-full p-3 bg-[#faf8f4] rounded-xl font-bold text-sm border border-transparent focus:bg-white focus:border-stone-500 transition-all outline-none"
                          placeholder="انبار مرکزی"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Discipline Selection (Phase 3B) */}

                  <div className="bg-[#faf8f4] p-4 rounded-2xl border border-[#ece5d8]">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <label className="text-[10px] font-bold text-stone-400 mb-1 block">
                          نام راننده
                        </label>
                        <input
                          value={mrsForm.driverName || ""}
                          onChange={(e) =>
                            setMrsForm({
                              ...mrsForm,
                              driverName: e.target.value,
                            })
                          }
                          className="w-full p-2 bg-white rounded-lg font-bold text-sm border border-[#e5ded0] outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-stone-400 mb-1 block">
                          شماره پلاک
                        </label>
                        <input
                          value={mrsForm.plateNumber || ""}
                          onChange={(e) =>
                            setMrsForm({
                              ...mrsForm,
                              plateNumber: e.target.value,
                            })
                          }
                          className="w-full p-2 bg-white rounded-lg font-bold text-sm border border-[#e5ded0] outline-none text-center"
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-stone-400 mb-1 block">
                          نوع خودرو
                        </label>
                        <input
                          value={mrsForm.vehicleType || ""}
                          onChange={(e) =>
                            setMrsForm({
                              ...mrsForm,
                              vehicleType: e.target.value,
                            })
                          }
                          className="w-full p-2 bg-white rounded-lg font-bold text-sm border border-[#e5ded0] outline-none"
                          placeholder="تریلی / کامیون"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-amber-100 pb-2 mb-4">
                      <h4 className="text-xs font-black text-amber-500 uppercase tracking-widest">
                        اقلام محموله
                      </h4>
                      <button
                        type="button"
                        onClick={addMrsRow}
                        className="flex items-center gap-1 text-[10px] font-black bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg hover:bg-amber-100 transition-colors"
                      >
                        <PlusCircle size={14} /> افزودن ردیف
                      </button>
                    </div>

                    <div className="space-y-4">
                      {mrsForm.items?.map((row) => (
                        <div
                          key={row.id}
                          className="bg-[#faf8f4] p-4 rounded-2xl border border-[#ece5d8] relative group"
                        >
                          <button
                            type="button"
                            onClick={() => removeMrsRow(row.id!)}
                            className="absolute top-2 left-2 text-stone-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                            disabled={(mrsForm.items?.length || 0) <= 1}
                          >
                            <MinusCircle size={20} />
                          </button>

                          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                            <div className="md:col-span-2 relative">
                              <label className="text-[9px] font-bold text-stone-400 mb-1 block">
                                نوع (انتخاب یا دستی)
                              </label>
                              <input
                                list={`material-types-${row.id}`}
                                value={row.materialType}
                                onChange={(e) =>
                                  updateMrsRowField(
                                    row.id!,
                                    "materialType",
                                    e.target.value,
                                  )
                                }
                                className="w-full p-2 bg-white rounded-xl font-bold text-xs outline-none border border-[#e5ded0] focus:border-amber-400 transition-all"
                                placeholder="انتخاب یا تایپ..."
                              />
                              <datalist id={`material-types-${row.id}`}>
                                {MATERIAL_TYPES_SUGGESTIONS.map((t) => (
                                  <option key={t} value={t} />
                                ))}
                              </datalist>
                            </div>
                            <div className="md:col-span-3">
                              <label className="text-[9px] font-bold text-stone-400 mb-1 block">
                                تولیدکننده / معدن
                              </label>
                              <input
                                required
                                value={row.supplier || ""}
                                onChange={(e) =>
                                  updateMrsRowField(
                                    row.id!,
                                    "supplier",
                                    e.target.value,
                                  )
                                }
                                className="w-full p-2 bg-white rounded-xl font-bold text-xs border border-[#e5ded0] outline-none"
                              />
                            </div>
                            <div className="md:col-span-4">
                              <label className="text-[9px] font-bold text-stone-400 mb-1 block">
                                شرح کامل
                              </label>
                              <input
                                required
                                value={row.materialName || ""}
                                onChange={(e) =>
                                  updateMrsRowField(
                                    row.id!,
                                    "materialName",
                                    e.target.value,
                                  )
                                }
                                className="w-full p-2 bg-white rounded-xl font-bold text-xs border border-[#e5ded0] outline-none"
                                placeholder="مشخصات فنی..."
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="text-[9px] font-bold text-stone-400 mb-1 block">
                                مقدار
                              </label>
                              <input
                                type="number"
                                required
                                value={row.quantity || ""}
                                onChange={(e) =>
                                  updateMrsRowField(
                                    row.id!,
                                    "quantity",
                                    Number(e.target.value),
                                  )
                                }
                                className="w-full p-2 bg-white rounded-xl font-black text-sm text-center border border-[#e5ded0] outline-none"
                              />
                            </div>
                            <div className="md:col-span-1">
                              <label className="text-[9px] font-bold text-stone-400 mb-1 block">
                                واحد
                              </label>
                              <input
                                required
                                value={row.unit || ""}
                                onChange={(e) =>
                                  updateMrsRowField(
                                    row.id!,
                                    "unit",
                                    e.target.value,
                                  )
                                }
                                className="w-full p-2 bg-white rounded-xl font-bold text-xs text-center border border-[#e5ded0] outline-none"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h4 className="font-black text-stone-800 text-sm border-b border-[#ece5d8] pb-2 mb-4 text-right">
                      پنل تاییدات سازمانی
                    </h4>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {[
                        {
                          orgName: "پیمانکار",
                          color: "blue",
                          badge: "bg-[#faf8f4] border-stone-100 text-amber-700",
                          icon: <CheckCircle size={18} className="text-stone-500" />,
                          roles: [
                            { id: "contractorExpert", label: "کارشناس پیمانکار (کارشناس دفتر فنی)", desc: "بررسی انطباق کالا با مستندات فنی" },
                            { id: "contractorUnitHead", label: "سرپرست واحد پیمانکار (رئیس دفتر فنی)", desc: "تایید نهایی رسته تحویل مصالح" },
                            { id: "contractorSiteManager", label: "سرپرست کارگاه پیمانکار", desc: "تایید عملیات انبارش و لجستیک کارگاهی" },
                          ]
                        },
                        {
                          orgName: "مشاور / دستگاه نظارت",
                          color: "emerald",
                          badge: "bg-emerald-50 border-emerald-100 text-emerald-700",
                          icon: <ShieldCheck size={18} className="text-emerald-500" />,
                          roles: [
                            { id: "consultantExpert", label: "کارشناس نظارت (مهندس ناظر مقیم)", desc: "کنترل کیفیت کارگاهی و اخذ آزمایش‌ها" },
                            { id: "consultantUnitHead", label: "سرپرست واحد نظارت (سرپرست نظارت مقیم)", desc: "بررسی نتایج آزمون‌ها و تایید فنی" },
                            { id: "consultantSiteManager", label: "سرپرست کارگاه نظارت (رئیس دستگاه نظارت)", desc: "ابلاغ بلامانع بودن مصرف مصالح در پروژه" },
                          ]
                        },
                        {
                          orgName: "کارفرما / مجری طرح",
                          color: "purple",
                          badge: "bg-purple-50 border-purple-100 text-purple-700",
                          icon: <UserCheck size={18} className="text-purple-500" />,
                          roles: [
                            { id: "employerExpert", label: "کارشناس کارفرما (کارشناس فنی/مالی)", desc: "کنترل اسناد خرید و هزینه‌های خرید مصالح" },
                            { id: "employerUnitHead", label: "سرپرست واحد کارفرما (مدیر پروژه کارفرما)", desc: "تایید نهایی مصالح بر اساس بودجه پروژه" },
                            { id: "employerSiteManager", label: "سرپرست کارگاه کارفرما (نماینده مجری)", desc: "ابلاغ قطعی پذیرش بارهای وارده" },
                          ]
                        }
                      ].map((org) => (
                        <div key={org.orgName} className="bg-white rounded-[1.5rem] border border-[#e5ded0] shadow-xs overflow-hidden flex flex-col text-right">
                          <div className={`p-4 border-b border-[#ece5d8] flex items-center gap-2 font-black text-xs justify-between ${org.color === "blue" ? "bg-[#faf8f4]/20 text-blue-950" : org.color === "purple" ? "bg-purple-50/20 text-purple-950" : "bg-emerald-50/20 text-emerald-950"}`}>
                            <div className="flex items-center gap-2">
                              {org.icon}
                              <span>سازمان {org.orgName}</span>
                            </div>
                          </div>
                          <div className="p-4 space-y-4 flex-1 bg-[#faf8f4]/30">
                            {org.roles.map((role) => {
                              const key = `${role.id}Approval` as keyof MrsRecord;
                              const data = (mrsForm[key] as ApprovalDetail) || {
                                isApproved: false,
                                comment: "",
                              };
                              
                              const isAllowed = canUserApproveMaterialRole(role.id);
                              const isForbidden = !isAllowed;

                              return (
                                <div
                                  key={role.id}
                                  className={`p-3 rounded-xl border transition-all ${
                                    data.isApproved 
                                      ? org.color === "blue" ? "bg-[#faf8f4]/60 border-blue-200 shadow-3xs" : org.color === "purple" ? "bg-purple-50/60 border-purple-200 shadow-3xs" : "bg-emerald-50/60 border-emerald-200 shadow-3xs"
                                      : "bg-white border-[#ece5d8]"
                                  } ${isForbidden ? "opacity-60 grayscale-[0.5]" : ""}`}
                                >
                                  <div className="flex items-start justify-between gap-2 mb-2">
                                    <div className="flex-1">
                                      <h5 className="font-bold text-xs text-stone-800">
                                        {role.label}
                                      </h5>
                                      <p className="text-[9px] text-stone-400 mt-0.5">
                                        {role.desc}
                                      </p>
                                    </div>
                                    <label
                                      className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border border-[#e5ded0] shadow-3xs select-none ${isForbidden ? "cursor-not-allowed bg-stone-100" : "cursor-pointer bg-white hover:bg-[#faf8f4]"}`}
                                      title={isForbidden ? "تایید این ردیف نیازمند سمت سازمانی متناظر کاربر در این سازمان است" : "کلیک جهت تایید"}
                                    >
                                      <input
                                        type="checkbox"
                                        disabled={isForbidden}
                                        checked={data.isApproved}
                                        onChange={(e) =>
                                          updateMrsApproval(
                                            role.id as any,
                                            "isApproved",
                                            e.target.checked,
                                          )
                                        }
                                        className="w-3.5 h-3.5 rounded text-stone-900 accent-amber-600 focus:ring-0 cursor-pointer disabled:cursor-not-allowed"
                                      />
                                      <span className="text-[10px] font-black leading-none text-stone-700">تایید</span>
                                    </label>
                                  </div>
                                  <input
                                    placeholder="توضیحات و دیدگاه کارشناسی..."
                                    disabled={isForbidden}
                                    value={data.comment || ""}
                                    onChange={(e) =>
                                      updateMrsApproval(
                                        role.id as any,
                                        "comment",
                                        e.target.value,
                                      )
                                    }
                                    className="w-full text-[10px] bg-white p-2 rounded-lg border border-[#e5ded0] outline-none focus:border-amber-400 placeholder:text-stone-400 font-medium disabled:bg-[#faf8f4] disabled:cursor-not-allowed"
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === ("materials" as any) && materialSubTab === "MIV" && (
                <div className="space-y-8 animate-fadeIn text-right">
                  {currentProject?.contractType === "CBS" && (
                    <div className="bg-stone-50/80 border border-indigo-200/80 rounded-[2rem] p-6 text-right text-indigo-900 shadow-sm flex flex-col md:flex-row items-start gap-4">
                      <div className="p-3 bg-amber-600 text-white rounded-xl shadow-md mt-1">
                        <Info size={24} />
                      </div>
                      <div className="space-y-2 flex-1">
                        <h4 className="font-black text-sm">📊 حواله خروج مصالح در قرارداد ساختار شکست (CBS):</h4>
                        <p className="text-xs font-bold leading-relaxed text-amber-700 font-sans">
                          خروج مصالح در ساختار CBS با پیوند به کدهای ساختار شکست فعالیت مربوطه کنترل شده تا بررسی شود مصرف کارگاهی مصالح با تعهدات سهم وزنی و پیشرفت واقعی پروژه همخوانی دارد یا خیر.
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#faf8f4] p-6 rounded-3xl border border-[#e5ded0]">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-stone-500">
                        شماره حواله خروج
                      </label>
                      <input
                        required
                        value={mivForm.serialNumber || ""}
                        onChange={(e) =>
                          setMivForm({
                            ...mivForm,
                            serialNumber: e.target.value,
                          })
                        }
                        className="w-full p-3 bg-white rounded-xl font-bold text-sm outline-none border border-[#e5ded0] focus:border-amber-500"
                        placeholder="MIV-001"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-stone-500">
                        تاریخ خروج
                      </label>
                      <ShamsiDatePicker
                        required
                        value={mivForm.date || ""}
                        onChange={(val) =>
                          setMivForm({
                            ...mivForm,
                            date: val,
                          })
                        }
                        inputClassName="!p-3 !bg-white !rounded-xl !font-bold !text-sm outline-none !border !border-[#e5ded0] focus:!border-amber-500 !text-center"
                        placeholder="1403/01/01"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-stone-500">
                        درخواست کننده
                      </label>
                      <input
                        required
                        value={mivForm.requestedBy || ""}
                        onChange={(e) =>
                          setMivForm({
                            ...mivForm,
                            requestedBy: e.target.value,
                          })
                        }
                        className="w-full p-3 bg-white rounded-xl font-bold text-sm outline-none border border-[#e5ded0] focus:border-amber-500"
                        placeholder="نام پیمانکار جزء / سرپرست اجرا"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-stone-500">
                        محل مصرف (لوکیشن)
                      </label>
                      <input
                        required
                        value={mivForm.location || ""}
                        onChange={(e) =>
                          setMivForm({ ...mivForm, location: e.target.value })
                        }
                        className="w-full p-3 bg-white rounded-xl font-bold text-sm outline-none border border-[#e5ded0] focus:border-amber-500"
                        placeholder="زون A - طبقه اول"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-amber-100 pb-2 mb-4">
                      <h4 className="text-xs font-black text-stone-900 uppercase tracking-widest">
                        اقلام درخواستی (خروجی)
                      </h4>
                      <button
                        type="button"
                        onClick={addMivRow}
                        className="flex items-center gap-1 text-[10px] font-black bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg hover:bg-amber-100 transition-colors"
                      >
                        <PlusCircle size={14} /> افزودن ردیف
                      </button>
                    </div>

                    <div className="space-y-4">
                      {mivForm.items?.map((row) => {
                        const balanceInfo = getMaterialBalance().find(
                          (b) => b.materialName === row.materialName,
                        );
                        const maxQty = balanceInfo ? balanceInfo.remaining : 0;
                        return (
                          <div
                            key={row.id}
                            className="bg-[#faf8f4] p-4 rounded-2xl border border-[#ece5d8] relative group"
                          >
                            <button
                              type="button"
                              onClick={() => removeMivRow(row.id!)}
                              className="absolute top-2 left-2 text-stone-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                              disabled={(mivForm.items?.length || 0) <= 1}
                            >
                              <MinusCircle size={20} />
                            </button>

                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                              <div className="md:col-span-5 relative">
                                <label className="text-[9px] font-bold text-stone-400 mb-1 block">
                                  نام و نوع مصالح (موجود در انبار)
                                </label>
                                <select
                                  value={row.materialName}
                                  onChange={(e) =>
                                    updateMivRowField(
                                      row.id!,
                                      "materialName",
                                      e.target.value,
                                    )
                                  }
                                  className="w-full p-2 bg-white rounded-xl font-bold text-xs outline-none border border-[#e5ded0] focus:border-amber-400 transition-all cursor-pointer"
                                >
                                  <option value="">انتخاب مصالح...</option>
                                  {getMaterialBalance().map((m) => (
                                    <option
                                      key={m.materialName}
                                      value={m.materialName}
                                    >
                                      {m.materialType} - {m.materialName}{" "}
                                      (موجودی: {m.remaining} {m.unit})
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="md:col-span-3">
                                <label className="text-[9px] font-bold text-stone-400 mb-1 block">
                                  توضیحات مصرف
                                </label>
                                <input
                                  value={row.remarks || ""}
                                  onChange={(e) =>
                                    updateMivRowField(
                                      row.id!,
                                      "remarks",
                                      e.target.value,
                                    )
                                  }
                                  className="w-full p-2 bg-white rounded-xl font-bold text-xs border border-[#e5ded0] outline-none"
                                />
                              </div>
                              <div className="md:col-span-2">
                                <label className="text-[9px] font-bold text-stone-400 mb-1 block">
                                  مقدار خروج
                                </label>
                                <input
                                  type="number"
                                  required
                                  value={row.quantity || ""}
                                  onChange={(e) =>
                                    updateMivRowField(
                                      row.id!,
                                      "quantity",
                                      Number(e.target.value),
                                    )
                                  }
                                  className={`w-full p-2 bg-white rounded-xl font-black text-sm text-center border outline-none ${row.quantity > maxQty ? "border-red-500 text-red-600" : "border-[#e5ded0]"}`}
                                />
                              </div>
                              <div className="md:col-span-2">
                                <label className="text-[9px] font-bold text-stone-400 mb-1 block">
                                  واحد
                                </label>
                                <input
                                  readOnly
                                  value={row.unit || ""}
                                  className="w-full p-2 bg-stone-100 rounded-xl font-bold text-xs text-center border border-[#e5ded0] outline-none text-stone-500"
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-6 mt-12">
                    <h4 className="font-black text-stone-800 text-sm border-b border-[#ece5d8] pb-2 mb-4 text-right">
                      پنل تاییدات سازمانی
                    </h4>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {[
                        {
                          orgName: "پیمانکار",
                          color: "blue",
                          badge: "bg-[#faf8f4] border-stone-100 text-amber-700",
                          icon: <CheckCircle size={18} className="text-stone-500" />,
                          roles: [
                            { id: "contractorExpert", label: "کارشناس پیمانکار (کارشناس دفتر فنی)", desc: "بررسی انطباق کالا با مستندات فنی" },
                            { id: "contractorUnitHead", label: "سرپرست واحد پیمانکار (رئیس دفتر فنی)", desc: "تایید نهایی رسته تحویل مصالح" },
                            { id: "contractorSiteManager", label: "سرپرست کارگاه پیمانکار", desc: "تایید عملیات انبارش و لجستیک کارگاهی" },
                          ]
                        },
                        {
                          orgName: "مشاور / دستگاه نظارت",
                          color: "emerald",
                          badge: "bg-emerald-50 border-emerald-100 text-emerald-700",
                          icon: <ShieldCheck size={18} className="text-emerald-500" />,
                          roles: [
                            { id: "consultantExpert", label: "کارشناس نظارت (مهندس ناظر مقیم)", desc: "کنترل کیفیت کارگاهی و اخذ آزمایش‌ها" },
                            { id: "consultantUnitHead", label: "سرپرست واحد نظارت (سرپرست نظارت مقیم)", desc: "بررسی نتایج آزمون‌ها و تایید فنی" },
                            { id: "consultantSiteManager", label: "سرپرست کارگاه نظارت (رئیس دستگاه نظارت)", desc: "ابلاغ بلامانع بودن مصرف مصالح در پروژه" },
                          ]
                        },
                        {
                          orgName: "کارفرما / مجری طرح",
                          color: "purple",
                          badge: "bg-purple-50 border-purple-100 text-purple-700",
                          icon: <UserCheck size={18} className="text-purple-500" />,
                          roles: [
                            { id: "employerExpert", label: "کارشناس کارفرما (کارشناس فنی/مالی)", desc: "کنترل اسناد خرید و هزینه‌های خرید مصالح" },
                            { id: "employerUnitHead", label: "سرپرست واحد کارفرما (مدیر پروژه کارفرما)", desc: "تایید نهایی مصالح بر اساس بودجه پروژه" },
                            { id: "employerSiteManager", label: "سرپرست کارگاه کارفرما (نماینده مجری)", desc: "ابلاغ قطعی پذیرش بارهای وارده" },
                          ]
                        }
                      ].map((org) => (
                        <div key={org.orgName} className="bg-white rounded-[1.5rem] border border-[#e5ded0] shadow-xs overflow-hidden flex flex-col text-right">
                          <div className={`p-4 border-b border-[#ece5d8] flex items-center gap-2 font-black text-xs justify-between ${org.color === "blue" ? "bg-[#faf8f4]/20 text-blue-950" : org.color === "purple" ? "bg-purple-50/20 text-purple-950" : "bg-emerald-50/20 text-emerald-950"}`}>
                            <div className="flex items-center gap-2">
                              {org.icon}
                              <span>سازمان {org.orgName}</span>
                            </div>
                          </div>
                          <div className="p-4 space-y-4 flex-1 bg-[#faf8f4]/30">
                            {org.roles.map((role) => {
                              const key = `${role.id}Approval` as keyof MivRecord;
                              const data = (mivForm[key] as ApprovalDetail) || {
                                isApproved: false,
                                comment: "",
                              };

                              const isAllowed = canUserApproveMaterialRole(role.id);
                              const isForbidden = !isAllowed;

                              return (
                                <div
                                  key={role.id}
                                  className={`p-3 rounded-xl border transition-all ${
                                    data.isApproved 
                                      ? org.color === "blue" ? "bg-[#faf8f4]/60 border-blue-200 shadow-3xs" : org.color === "purple" ? "bg-purple-50/60 border-purple-200 shadow-3xs" : "bg-emerald-50/60 border-emerald-200 shadow-3xs"
                                      : "bg-white border-[#ece5d8]"
                                  } ${isForbidden ? "opacity-60 grayscale-[0.5]" : ""}`}
                                >
                                  <div className="flex items-start justify-between gap-2 mb-2">
                                    <div className="flex-1">
                                      <h5 className="font-bold text-xs text-stone-800">
                                        {role.label}
                                      </h5>
                                      <p className="text-[9px] text-stone-400 mt-0.5">
                                        {role.desc}
                                      </p>
                                    </div>
                                    <label
                                      className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border border-[#e5ded0] shadow-3xs select-none ${isForbidden ? "cursor-not-allowed bg-stone-100" : "cursor-pointer bg-white hover:bg-[#faf8f4]"}`}
                                      title={isForbidden ? "تایید این ردیف نیازمند سمت سازمانی متناظر کاربر در این سازمان است" : "کلیک جهت تایید"}
                                    >
                                      <input
                                        type="checkbox"
                                        disabled={isForbidden}
                                        checked={data.isApproved}
                                        onChange={(e) =>
                                          updateMivApproval(
                                            role.id as any,
                                            "isApproved",
                                            e.target.checked,
                                          )
                                        }
                                        className="w-3.5 h-3.5 rounded text-stone-900 accent-amber-600 focus:ring-0 cursor-pointer disabled:cursor-not-allowed"
                                      />
                                      <span className="text-[10px] font-black leading-none text-stone-700">تایید</span>
                                    </label>
                                  </div>
                                  <input
                                    placeholder="توضیحات و دیدگاه کارشناسی..."
                                    disabled={isForbidden}
                                    value={data.comment || ""}
                                    onChange={(e) =>
                                      updateMivApproval(
                                        role.id as any,
                                        "comment",
                                        e.target.value,
                                      )
                                    }
                                    className="w-full text-[10px] bg-white p-2 rounded-lg border border-[#e5ded0] outline-none focus:border-amber-400 placeholder:text-stone-400 font-medium disabled:bg-[#faf8f4] disabled:cursor-not-allowed"
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === ("variation" as any) && (
                <div className="space-y-8 animate-fadeIn text-right">
                  {currentProject?.contractType === "CBS" && (
                    <div className="bg-stone-50/90 border border-indigo-200/80 rounded-[2rem] p-6 text-right text-indigo-900 shadow-sm flex flex-col md:flex-row items-start gap-4 animate-fadeIn">
                      <div className="p-3 bg-amber-600 text-white rounded-xl shadow-md mt-1">
                        <Info size={24} />
                      </div>
                      <div className="space-y-2 flex-1">
                        <h4 className="font-black text-sm">⚠️ مدیریت تغییر مقادیر در قراردادهای ساختار شکست (CBS):</h4>
                        <p className="text-xs font-bold leading-relaxed text-amber-700 font-sans">
                          در قراردادهای ساختار شکست (CBS) یا مقطوع، تغییر مقادیر به صورت افزایش/کاهش سنتی احجام ردیف‌های فهرست‌بها معنا ندارد. هرگونه تغییر در این قراردادها به صورت اصلاح سهم وزنی فعالیت‌های کلان، ابلاغ فعالیت جدید با سهم وزنی مصوب (کارهای جدید) یا حذف برخی فعالیت‌ها صورت می‌گیرد. سیستم در این بخش کدهای وارد شده را به عنوان فعالیت‌های CBS مدیریت می‌کند.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-purple-50 p-6 rounded-3xl border border-purple-100">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-stone-500">
                        شماره دستورکار / تغییر مقادیر
                      </label>
                      <input
                        required
                        value={variationForm.number || ""}
                        onChange={(e) =>
                          setVariationForm({
                            ...variationForm,
                            number: e.target.value,
                          })
                        }
                        className="w-full p-3 bg-white rounded-xl font-bold text-sm outline-none border border-purple-200 focus:border-purple-500"
                        placeholder="مثلاً VO-01"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-stone-500">
                        تاریخ ابلاغ / درخواست
                      </label>
                      <ShamsiDatePicker
                        required
                        value={variationForm.date || ""}
                        onChange={(val) =>
                          setVariationForm({
                            ...variationForm,
                            date: val,
                          })
                        }
                        inputClassName="!p-3 !bg-white !rounded-xl !font-bold !text-sm outline-none !border !border-purple-200 focus:!border-purple-500 !text-center"
                        placeholder="۱۴۰۳/۰۵/۰۱"
                      />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-[10px] font-bold text-stone-500">
                        شرح تغییرات و دلیل فنی
                      </label>
                      <textarea
                        required
                        value={variationForm.description || ""}
                        onChange={(e) =>
                          setVariationForm({
                            ...variationForm,
                            description: e.target.value,
                          })
                        }
                        className="w-full p-3 bg-white rounded-xl font-bold text-sm outline-none border border-purple-200 focus:border-purple-500"
                        rows={2}
                      />
                    </div>
                  </div>

                  <div className="bg-[#faf8f4] p-6 rounded-3xl border border-[#e5ded0]">
                    <div className="flex flex-col md:flex-row gap-6 items-center justify-between mb-4">
                      <h4 className="text-sm font-black text-stone-800 flex items-center gap-2">
                        <PlusCircle size={18} /> {currentProject?.contractType === "CBS" ? "ثبت فعالیت جدید (CBS)" : "ثبت آیتم جدید"}
                      </h4>
                      {currentProject?.contractType !== "CBS" && (
                        <div className="flex flex-wrap items-center gap-4">
                          <div className="flex gap-2 p-1 bg-white rounded-xl shadow-sm border border-[#ece5d8]">
                            {[
                              { id: "NORMAL", label: "فهرست‌بهایی" },
                              { id: "STARRED", label: "ستاره‌دار" },
                              { id: "INVOICE", label: "فاکتوری" },
                            ].map((type) => (
                              <button
                                key={type.id}
                                type="button"
                                onClick={() =>
                                  setVariationNewItem({
                                    ...variationNewItem,
                                    itemType: type.id as any,
                                    independentCoefficient: type.id === "NORMAL" ? 1 : (variationNewItem.independentCoefficient || 1),
                                  })
                                }
                                className={`px-4 py-2 rounded-lg text-[11px] font-bold transition-all ${variationNewItem.itemType === type.id ? "bg-purple-600 text-white shadow-md" : "text-stone-500 hover:text-stone-900 hover:bg-[#faf8f4]"}`}
                              >
                                {" "}
                                {type.label}{" "}
                              </button>
                            ))}
                          </div>
                          {variationNewItem.itemType !== "NORMAL" && (
                            <div className="flex items-center gap-3 bg-amber-50 px-4 py-2 rounded-xl border border-amber-200 animate-fadeIn">
                              <span className="text-[10px] font-black text-amber-700">
                                ضریب اختصاصی آیتم:
                              </span>
                              <input
                                type="number"
                                step="0.01"
                                value={variationNewItem.independentCoefficient || ""}
                                onChange={(e) =>
                                  setVariationNewItem({
                                    ...variationNewItem,
                                    independentCoefficient: Number(e.target.value),
                                  })
                                }
                                className="w-20 text-center bg-white border border-amber-300 rounded-lg py-1 text-xs font-bold outline-none focus:ring-2 focus:ring-amber-400"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                      {currentProject?.contractType?.toUpperCase() !== "CBS" && (
                        <div className="md:col-span-1">
                          <label className="text-[10px] font-black text-stone-500 mb-1 block">
                            فهرست بها مرجع
                          </label>
                          <select
                            value={variationPlFilter}
                            onChange={(e) => {
                              setVariationPlFilter(e.target.value);
                              if (variationNewItem.code && variationNewItem.code.length >= 2) {
                                setVariationSearchResults(searchPriceList(variationNewItem.code, e.target.value));
                              }
                            }}
                            className="w-full p-3 bg-white rounded-xl font-bold text-xs text-black border border-[#e5ded0] outline-none focus:border-purple-500 text-right cursor-pointer h-[48px]"
                          >
                            <option value="all">🔍 تمامی فهارس</option>
                            {currentProject?.priceLists?.map((pl) => (
                              <option key={pl.id} value={pl.id}>
                                {pl.title}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      <div className={currentProject?.contractType?.toUpperCase() === "CBS" ? "md:col-span-2 relative" : "md:col-span-2 relative"}>
                        <label className="text-[10px] font-black text-stone-500 mb-1 block flex items-center gap-1">
                          <Hash size={12} /> {currentProject?.contractType?.toUpperCase() === "CBS" ? "کد فعالیت CBS" : "کد آیتم"}
                        </label>
                        <input
                          value={variationNewItem.code || ""}
                          onChange={(e) =>
                            handleVariationItemSearch(e.target.value)
                          }
                          className="w-full p-3 bg-white rounded-xl font-bold text-xs text-black border border-[#e5ded0] outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-50 h-[48px]"
                          placeholder="جستجو..."
                        />
                        {showVariationDropdown &&
                          variationSearchResults.length > 0 && (
                            <div className="absolute top-full right-0 w-full mt-2 bg-white border border-[#e5ded0] rounded-xl shadow-xl z-20 overflow-hidden max-h-48 overflow-y-auto">
                              {variationSearchResults.map((item, idx) => (
                                <div
                                  key={idx}
                                  onClick={() =>
                                    selectVariationSearchItem(item)
                                  }
                                  className="p-3 hover:bg-[#faf8f4] cursor-pointer text-[10px] border-b last:border-0"
                                >
                                  <span className="font-bold text-purple-700">
                                    {item.code}
                                  </span>{" "}
                                  - {item.description}
                                </div>
                              ))}
                            </div>
                          )}
                      </div>
                      <div className="md:col-span-3">
                        <label className="text-[10px] font-black text-stone-500 mb-1 block">
                          شرح فعالیت
                        </label>
                        <input
                          value={variationNewItem.description || ""}
                          onChange={(e) =>
                            setVariationNewItem({
                              ...variationNewItem,
                              description: e.target.value,
                            })
                          }
                          className="w-full p-3 bg-white rounded-xl font-bold text-xs border border-[#e5ded0] outline-none h-[48px]"
                        />
                      </div>
                      <div className="md:col-span-1">
                        <label className="text-[10px] font-black text-stone-500 mb-1 block">
                          واحد
                        </label>
                        <input
                          value={variationNewItem.unit || ""}
                          onChange={(e) =>
                            setVariationNewItem({
                              ...variationNewItem,
                              unit: e.target.value,
                            })
                          }
                          className="w-full p-3 bg-white rounded-xl font-bold text-xs border border-[#e5ded0] outline-none text-center h-[48px]"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-[10px] font-black text-stone-500 mb-1 block flex justify-between">
                          <span>بهای واحد</span>
                          <span className="text-purple-600 text-[8px]">
                            {currentProject?.currency || "ریال"}
                          </span>
                        </label>
                        <input
                          type="text"
                          dir="ltr"
                          value={
                            variationNewItem.unitPrice
                              ? variationNewItem.unitPrice.toLocaleString()
                              : ""
                          }
                          onChange={(e) => {
                            const val = e.target.value.replace(/,/g, "");
                            if (val === "" || !isNaN(Number(val))) {
                              setVariationNewItem({
                                ...variationNewItem,
                                unitPrice: val === "" ? 0 : Number(val),
                              });
                            }
                          }}
                          className="w-full p-3 bg-white rounded-xl font-bold text-sm border border-[#e5ded0] outline-none text-center focus:border-purple-500 h-[48px]"
                          placeholder="0"
                        />
                      </div>
                      <div className="md:col-span-1">
                        <label className="text-[10px] font-black text-stone-500 mb-1 block">
                          مقدار
                        </label>
                        <input
                          type="number"
                          value={variationNewItem.contractorQty || 0}
                          onChange={(e) =>
                            setVariationNewItem({
                              ...variationNewItem,
                              contractorQty: Number(e.target.value),
                            })
                          }
                          className="w-full p-3 bg-white rounded-xl font-bold text-sm border border-[#e5ded0] outline-none text-center focus:border-purple-500 h-[48px]"
                        />
                      </div>
                      {currentProject?.contractType?.toUpperCase() === "CBS" && (
                        <div className="md:col-span-1">
                          <label className="text-[10px] font-black text-stone-500 mb-1 block">
                            وزن پیشنهادی (%)
                          </label>
                          <input
                            type="number"
                            step="any"
                            value={variationNewItem.weightFactor || 0}
                            onChange={(e) =>
                              setVariationNewItem({
                                ...variationNewItem,
                                weightFactor: Number(e.target.value),
                              })
                            }
                            className="w-full p-3 bg-white rounded-xl font-bold text-sm border border-[#e5ded0] outline-none text-center focus:border-purple-500 h-[48px]"
                          />
                        </div>
                      )}
                      <div className="md:col-span-2">
                        <button
                          type="button"
                          onClick={addVariationItem}
                          className="w-full bg-purple-600 text-white rounded-xl font-black text-[11px] hover:bg-purple-700 transition-all shadow-lg shadow-purple-200 flex items-center justify-center gap-2 h-[48px]"
                        >
                          <PlusCircle size={16} /> افزودن فعالیت
                        </button>
                      </div>
                    </div>
                  </div>

                    {/* Real-time Weight Indicator */}
                  {currentProject?.contractType?.toUpperCase() === "CBS" && (
                    <div className="mt-6 mb-4 p-6 bg-stone-100 rounded-2xl flex flex-col items-center justify-center border-2 border-[#e5ded0]">
                      <h4 className="text-sm font-black text-stone-700 mb-2">وضعیت کل سهم وزنی پروژه</h4>
                      <div className="flex items-center gap-4 text-xl font-black">
                        <span className={Math.abs(currentVariationWeight - 100) <= 0.01 ? "text-emerald-600" : currentVariationWeight > 100 ? "text-red-600" : "text-amber-500"}>
                          {currentVariationWeight.toFixed(2)}%
                        </span>
                        <span className="text-stone-400 text-sm">از 100%</span>
                      </div>
                      {Math.abs(currentVariationWeight - 100) > 0.01 && (
                        <p className={`mt-2 text-xs font-bold ${currentVariationWeight > 100 ? "text-red-500" : "text-stone-900"}`}>
                          {currentVariationWeight > 100 
                            ? `مقدار ${Math.abs(currentVariationWeight - 100).toFixed(2)}% بیشتر از سقف مجاز (100٪) است.` 
                            : `هنوز ${Math.abs(100 - currentVariationWeight).toFixed(2)}% تا تکمیل سهم وزنی کل پروژه باقیمانده است.`}
                        </p>
                      )}
                      {Math.abs(currentVariationWeight - 100) <= 0.01 && (
                        <p className="mt-2 text-xs font-bold text-emerald-600">
                          سهم وزنی دقیقاً 100٪ است و فرم آماده ثبت می‌باشد.
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex flex-col md:flex-row gap-6 items-center justify-between mt-6 mb-4">
                      <div className="flex items-center gap-4">
                        <h4 className="font-black text-stone-800 flex items-center gap-2">
                          <ArrowLeftRight size={20} className="text-purple-600" />{" "}
                          جدول تغییرات مقادیر پیمان
                        </h4>
                        {currentProject?.contractType?.toUpperCase() === "CBS" && (
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                const allCodes: Record<string, boolean> = {};
                                variationForm.items.forEach(item => {
                                  allCodes[item.code] = true;
                                });
                                setExpandedVariationCodes(allCodes);
                              }}
                              className="text-[10px] font-black px-2 py-1 bg-stone-200 text-stone-700 rounded-lg hover:bg-stone-300 transition-colors"
                            >
                              باز کردن همه
                            </button>
                            <button
                              type="button"
                              onClick={() => setExpandedVariationCodes({})}
                              className="text-[10px] font-black px-2 py-1 bg-stone-200 text-stone-700 rounded-lg hover:bg-stone-300 transition-colors"
                            >
                              بستن همه
                            </button>
                          </div>
                        )}
                      </div>
                    {(() => {
                      const userOrg = currentUser?.orgId
                        ? SystemAdminService.getOrganization(currentUser.orgId)
                        : null;
                      let userOrgType = userOrg?.type;
                      const isSystemAdmin = currentUser?.role === "SYSTEM_ADMIN" || currentUser?.username === "admin";

                      if (!userOrgType && currentUser && !isSystemAdmin) {
                        const titleLower = ((currentUser.jobTitle || '') + ' ' + (currentUser.jobLevel || '') + ' ' + (currentUser.fullName || '')).toLowerCase();
                        if (titleLower.includes('کارفرما') || titleLower.includes('مدیر طرح') || titleLower.includes('مجری')) {
                          userOrgType = OrganizationType.EMPLOYER;
                        } else if (titleLower.includes('ناظر') || titleLower.includes('مشاور') || titleLower.includes('سرپرست نظارت')) {
                          userOrgType = OrganizationType.CONSULTANT;
                        } else {
                          userOrgType = OrganizationType.CONTRACTOR;
                        }
                      } else if (!userOrgType && !currentUser && !isSystemAdmin) {
                        userOrgType = OrganizationType.CONTRACTOR;
                      }

                      const canEditContractor = isSystemAdmin || userOrgType === OrganizationType.CONTRACTOR;
                      const canEditConsultant = isSystemAdmin || userOrgType === OrganizationType.CONSULTANT;
                      const canEditEmployer = isSystemAdmin || userOrgType === OrganizationType.EMPLOYER;

                      return (
                        <div className="bg-stone-100 p-1 rounded-xl flex items-center gap-1">
                          {[
                            { id: "CONTRACTOR", label: "نمای پیمانکار (ادعا)", canEdit: canEditContractor, activeColor: "bg-purple-600 text-white shadow-sm" },
                            { id: "CONSULTANT", label: "نمای مشاور (بررسی)", canEdit: canEditConsultant, activeColor: "bg-amber-600 text-white shadow-sm" },
                            { id: "EMPLOYER", label: "نمای کارفرما (تصویب)", canEdit: canEditEmployer, activeColor: "bg-emerald-600 text-white shadow-sm" },
                          ].map((role) => (
                            <button
                              key={role.id}
                              type="button"
                              onClick={() => setVariationRoleView(role.id as any)}
                              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                                variationRoleView === role.id
                                  ? role.activeColor
                                  : "text-stone-500 hover:text-stone-800"
                              }`}
                            >
                              <span>{role.label}</span>
                              {!role.canEdit && (
                                <span
                                  className={`text-[9px] px-1.5 py-0.5 rounded font-normal ${
                                    variationRoleView === role.id
                                      ? "bg-white/20 text-white"
                                      : "bg-stone-200 text-stone-600"
                                  }`}
                                >
                                  فقط مشاهده
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      );
                    })()}
                  </div>

                  {(() => {
                    const userOrg = currentUser?.orgId
                      ? SystemAdminService.getOrganization(currentUser.orgId)
                      : null;
                    let userOrgType = userOrg?.type;
                    const isSystemAdmin = currentUser?.role === "SYSTEM_ADMIN" || currentUser?.username === "admin";

                    if (!userOrgType && currentUser && !isSystemAdmin) {
                      const titleLower = ((currentUser.jobTitle || '') + ' ' + (currentUser.jobLevel || '') + ' ' + (currentUser.fullName || '')).toLowerCase();
                      if (titleLower.includes('کارفرما') || titleLower.includes('مدیر طرح') || titleLower.includes('مجری')) {
                        userOrgType = OrganizationType.EMPLOYER;
                      } else if (titleLower.includes('ناظر') || titleLower.includes('مشاور') || titleLower.includes('سرپرست نظارت')) {
                        userOrgType = OrganizationType.CONSULTANT;
                      } else {
                        userOrgType = OrganizationType.CONTRACTOR;
                      }
                    } else if (!userOrgType && !currentUser && !isSystemAdmin) {
                      userOrgType = OrganizationType.CONTRACTOR;
                    }

                    const isReadOnlyView =
                      (!isSystemAdmin && variationRoleView === "CONTRACTOR" && userOrgType !== OrganizationType.CONTRACTOR) ||
                      (!isSystemAdmin && variationRoleView === "CONSULTANT" && userOrgType !== OrganizationType.CONSULTANT) ||
                      (!isSystemAdmin && variationRoleView === "EMPLOYER" && userOrgType !== OrganizationType.EMPLOYER);

                    if (isReadOnlyView) {
                      return (
                        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs font-bold flex items-center gap-2 animate-fadeIn">
                          <AlertCircle size={16} className="text-amber-600 shrink-0" />
                          <span>
                            توجه: شما در حال حاضر در نمای{" "}
                            <strong className="text-amber-950 font-black">
                              {variationRoleView === "CONTRACTOR"
                                ? "پیمانکار (ادعا)"
                                : variationRoleView === "CONSULTANT"
                                  ? "مشاور (بررسی)"
                                  : "کارفرما (تصویب)"}
                            </strong>{" "}
                            به صورت <strong className="underline">صرفاً مشاهده</strong> قرار دارید. طبق دسترسی سازمانی، امکان تغییر مقادیر این نما فقط برای سازمان مربوطه مجاز است.
                          </span>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-[#faf8f4] text-stone-700 border-b border-[#e5ded0]">
                        <tr>
                          <th className="p-3 w-16 text-black font-black">کد</th>
                          <th className="p-3 text-black font-black">شرح</th>
                          <th className="p-3 w-16 text-center text-black font-black">
                            واحد
                          </th>
                          {currentProject?.contractType?.toUpperCase() === "CBS" && (
                            <>
                              <th className="p-3 w-16 text-center text-stone-500 font-bold">
                                وزن اول%
                              </th>
                              <th className="p-3 w-20 text-center text-purple-600 font-bold">
                                وزن پیشنهاد
                              </th>
                              <th className="p-3 w-20 text-center text-stone-900 font-bold">
                                وزن مشاور
                              </th>
                              <th className="p-3 w-20 text-center text-emerald-600 font-bold">
                                وزن کارفرما
                              </th>
                            </>
                          )}
                          <th className="p-3 w-20 text-center text-stone-500 font-bold">
                            مقدار اول
                          </th>
                          <th
                            className={`p-3 w-24 text-center font-black ${variationRoleView === "CONTRACTOR" ? "bg-purple-100 text-purple-900" : "text-black"}`}
                          >
                            پیشنهاد پیمانکار
                          </th>
                          <th
                            className={`p-3 w-24 text-center font-black ${variationRoleView === "CONSULTANT" ? "bg-stone-100 text-blue-900" : "text-black"}`}
                          >
                            نظر مشاور
                          </th>
                          <th
                            className={`p-3 w-24 text-center font-black ${variationRoleView === "EMPLOYER" ? "bg-emerald-100 text-emerald-900" : "text-black"}`}
                          >
                            مصوب کارفرما
                          </th>
                        </tr>
                      </thead>
                      <tbody className="text-black font-medium">
                        {(() => {
                          const items = variationForm.items || [];
                          const isCBS = currentProject?.contractType?.toUpperCase() === "CBS";

                          const userOrg = currentUser?.orgId
                            ? SystemAdminService.getOrganization(currentUser.orgId)
                            : null;
                          let userOrgType = userOrg?.type;
                          const isSystemAdmin = currentUser?.role === "SYSTEM_ADMIN" || currentUser?.username === "admin";

                          if (!userOrgType && currentUser && !isSystemAdmin) {
                            const titleLower = ((currentUser.jobTitle || '') + ' ' + (currentUser.jobLevel || '') + ' ' + (currentUser.fullName || '')).toLowerCase();
                            if (titleLower.includes('کارفرما') || titleLower.includes('مدیر طرح') || titleLower.includes('مجری')) {
                              userOrgType = OrganizationType.EMPLOYER;
                            } else if (titleLower.includes('ناظر') || titleLower.includes('مشاور') || titleLower.includes('سرپرست نظارت')) {
                              userOrgType = OrganizationType.CONSULTANT;
                            } else {
                              userOrgType = OrganizationType.CONTRACTOR;
                            }
                          } else if (!userOrgType && !currentUser && !isSystemAdmin) {
                            userOrgType = OrganizationType.CONTRACTOR;
                          }

                          const canEditContractor = isSystemAdmin || userOrgType === OrganizationType.CONTRACTOR;
                          const canEditConsultant = isSystemAdmin || userOrgType === OrganizationType.CONSULTANT;
                          const canEditEmployer = isSystemAdmin || userOrgType === OrganizationType.EMPLOYER;

                          const sortedItems = [...items].sort((a, b) =>
                            a.code.localeCompare(b.code, undefined, {
                              numeric: true,
                              sensitivity: "base",
                            }),
                          );

                          const visibleItems = isCBS
                            ? sortedItems.filter((item) => {
                                const parts = item.code.split(".");
                                
                                // Check hierarchical parents
                                for (let i = 1; i < parts.length; i++) {
                                  const parentCode = parts.slice(0, i).join(".");
                                  const parentInList = items.find(it => it.code === parentCode);
                                  if (parentInList && !expandedVariationCodes[parentCode]) {
                                    return false;
                                  }
                                }

                                // Check "xx.00" style parents
                                const lastPart = parts[parts.length - 1];
                                if (lastPart !== "00" && lastPart !== "0" && lastPart !== "000") {
                                  const zeroParts = [...parts];
                                  zeroParts[zeroParts.length - 1] = lastPart.length === 2 ? "00" : (lastPart.length === 3 ? "000" : "0");
                                  const zeroParentCode = zeroParts.join(".");
                                  const zeroParentInList = items.find(it => it.code === zeroParentCode);
                                  if (zeroParentInList && !expandedVariationCodes[zeroParentCode]) {
                                    return false;
                                  }
                                }

                                return true;
                              })
                            : sortedItems;

                          return visibleItems.map((item, idx) => {
                            const parts = item.code.split(".");
                            let level = 0;
                            if (isCBS) {
                              level = parts.length - 1;
                              const lastPart = parts[parts.length - 1];
                              if (lastPart === '00' || lastPart === '0' || lastPart === '000') {
                                level = Math.max(0, level - 1);
                              }
                            }
                            
                            const hasChildren = isCBS && items.some(i => {
                              if (i.code === item.code) return false;
                              
                              // Check if i is a descendant of item
                              if (i.code.startsWith(item.code + ".")) return true;
                              
                              const iParts = i.code.split('.');
                              if (iParts.length === parts.length) {
                                // xx.00 style hierarchy
                                const iLastPart = iParts[iParts.length - 1];
                                if (iLastPart !== '00' && iLastPart !== '0' && iLastPart !== '000') {
                                  const zeroParts = [...iParts];
                                  zeroParts[zeroParts.length - 1] = iLastPart.length === 2 ? '00' : (iLastPart.length === 3 ? '000' : '0');
                                  if (zeroParts.join('.') === item.code) return true;
                                }
                              }
                              return false;
                            });

                            const isExpanded = expandedVariationCodes[item.code];

                            let displayOrigWeight = item.originalWeightFactor || 0;
                            let displayOrigQty = item.originalQty || 0;
                            
                            if (isCBS) {
                              if (!displayOrigWeight || displayOrigWeight === 0 || String(displayOrigWeight) === "0") {
                                const cNode = cbsNodes.find(n => (cleanCode(n.code) === cleanCode(item.code) || n.code === item.code) && String(n.projectId) === String(selectedProjectId));
                                if (cNode) displayOrigWeight = cNode.weightPercent || 0;
                              }
                              if (!displayOrigQty || displayOrigQty === 0 || String(displayOrigQty) === "0") {
                                const cNode = cbsNodes.find(n => (cleanCode(n.code) === cleanCode(item.code) || n.code === item.code) && String(n.projectId) === String(selectedProjectId));
                                if (cNode) displayOrigQty = cNode.quantity || 0;
                              }
                            } else {
                              if (!displayOrigWeight || displayOrigWeight === 0 || String(displayOrigWeight) === "0") {
                                const eNode = estimates.find(e => cleanCode(e.code) === cleanCode(item.code) && String(e.projectId) === String(selectedProjectId));
                                if (eNode) displayOrigWeight = eNode.weightPercent || 0;
                              }
                              if (!displayOrigQty || displayOrigQty === 0 || String(displayOrigQty) === "0") {
                                const eNode = estimates.find(e => cleanCode(e.code) === cleanCode(item.code) && String(e.projectId) === String(selectedProjectId));
                                if (eNode) displayOrigQty = eNode.quantity || 0;
                              }
                            }

                            return (
                              <tr
                                key={`${item.code}-${idx}`}
                                className={`border-b last:border-0 hover:bg-[#faf8f4] transition-colors ${level > 0 ? "bg-[#faf8f4]/30" : "bg-white"}`}
                              >
                                <td className="p-3 text-[11px] font-black text-black">
                                  <div
                                    className="flex items-center gap-2"
                                    style={{ paddingRight: `${level * 20}px` }}
                                  >
                                    {isCBS && hasChildren && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setExpandedVariationCodes((prev) => ({
                                            ...prev,
                                            [item.code]: !prev[item.code],
                                          }))
                                        }
                                        className="p-1 bg-stone-100 hover:bg-purple-100 border border-[#e5ded0] rounded transition-colors text-purple-600 shadow-sm"
                                      >
                                        {isExpanded ? (
                                          <ChevronDown size={14} />
                                        ) : (
                                          <ChevronLeft size={14} />
                                        )}
                                      </button>
                                    )}
                                    {!hasChildren && isCBS && level > 0 && (
                                      <div className="w-6" />
                                    )}
                                    <span className={level === 0 ? "text-purple-700" : ""}>{item.code}</span>
                                  </div>
                                </td>
                                <td
                                  className={`p-3 text-[11px] font-bold text-black truncate max-w-[250px] ${level === 0 ? "font-black text-stone-900" : "text-stone-700"}`}
                                  title={item.description}
                                >
                                  {item.description}
                                </td>
                                <td className="p-3 text-center text-black font-bold">
                                  {item.unit}
                                </td>
                                {isCBS && (
                                  <td className="p-3 text-center text-stone-500 font-mono">
                                    {displayOrigWeight}%
                                  </td>
                                )}
                                
                                {/* Contractor Weight */}
                                {isCBS && (
                                  <>
                                    <td className={`p-2 text-center ${variationRoleView === "CONTRACTOR" ? "bg-purple-50" : ""}`}>
                                      <input
                                        type="number"
                                        step="any"
                                        disabled={
                                          hasChildren ||
                                          variationRoleView !== "CONTRACTOR" ||
                                          !canEditContractor
                                        }
                                        value={item.contractorWeightFactor ?? item.weightFactor ?? 0}
                                        onChange={(e) =>
                                          updateVariationItem(
                                            item.code,
                                            "contractorWeightFactor",
                                            Number(e.target.value),
                                          )
                                        }
                                        className={`w-full text-center bg-transparent outline-none font-bold ${
                                          variationRoleView === "CONTRACTOR" && canEditContractor
                                            ? "text-purple-700 border-b border-purple-400"
                                            : variationRoleView === "CONTRACTOR"
                                              ? "text-stone-500 cursor-not-allowed opacity-75"
                                              : "text-purple-700"
                                        } ${hasChildren ? "opacity-50 cursor-not-allowed" : ""}`}
                                      />
                                    </td>

                                    {/* Consultant Weight */}
                                    <td className={`p-2 text-center ${variationRoleView === "CONSULTANT" ? "bg-[#faf8f4]" : ""}`}>
                                      <input
                                        type="number"
                                        step="any"
                                        disabled={
                                          hasChildren ||
                                          variationRoleView !== "CONSULTANT" ||
                                          !canEditConsultant
                                        }
                                        value={item.consultantWeightFactor ?? item.contractorWeightFactor ?? item.weightFactor ?? 0}
                                        onChange={(e) =>
                                          updateVariationItem(
                                            item.code,
                                            "consultantWeightFactor",
                                            Number(e.target.value),
                                          )
                                        }
                                        className={`w-full text-center bg-transparent outline-none font-bold ${
                                          variationRoleView === "CONSULTANT" && canEditConsultant
                                            ? "text-amber-700 border-b border-amber-400"
                                            : variationRoleView === "CONSULTANT"
                                              ? "text-stone-500 cursor-not-allowed opacity-75"
                                              : "text-amber-700"
                                        } ${hasChildren ? "opacity-50 cursor-not-allowed" : ""}`}
                                      />
                                    </td>

                                    {/* Employer Weight */}
                                    <td className={`p-2 text-center ${variationRoleView === "EMPLOYER" ? "bg-emerald-50" : ""}`}>
                                      <input
                                        type="number"
                                        step="any"
                                        disabled={
                                          hasChildren ||
                                          variationRoleView !== "EMPLOYER" ||
                                          !canEditEmployer
                                        }
                                        value={item.employerWeightFactor ?? item.consultantWeightFactor ?? item.contractorWeightFactor ?? item.weightFactor ?? 0}
                                        onChange={(e) =>
                                          updateVariationItem(
                                            item.code,
                                            "employerWeightFactor",
                                            Number(e.target.value),
                                          )
                                        }
                                        className={`w-full text-center bg-transparent outline-none font-bold ${
                                          variationRoleView === "EMPLOYER" && canEditEmployer
                                            ? "text-emerald-700 border-b border-emerald-400"
                                            : variationRoleView === "EMPLOYER"
                                              ? "text-stone-500 cursor-not-allowed opacity-75"
                                              : "text-emerald-700"
                                        } ${hasChildren ? "opacity-50 cursor-not-allowed" : ""}`}
                                      />
                                    </td>
                                  </>
                                )}
                                <td className="p-3 text-center bg-[#faf8f4]/50 font-mono text-stone-500">
                                  {displayOrigQty.toLocaleString()}
                                </td>

                                <td
                                  className={`p-2 text-center ${variationRoleView === "CONTRACTOR" ? "bg-purple-50" : ""}`}
                                >
                                  <input
                                    type="number"
                                    step="any"
                                    disabled={
                                      variationRoleView !== "CONTRACTOR" ||
                                      !canEditContractor
                                    }
                                    value={item.contractorQty ?? displayOrigQty ?? 0}
                                    onChange={(e) =>
                                      updateVariationItem(
                                        item.code,
                                        "contractorQty",
                                        Number(e.target.value),
                                      )
                                    }
                                    className={`w-full text-center bg-transparent outline-none font-black ${
                                      variationRoleView === "CONTRACTOR" && canEditContractor
                                        ? "border-b border-purple-400 text-purple-950"
                                        : variationRoleView === "CONTRACTOR"
                                          ? "text-stone-500 cursor-not-allowed opacity-75"
                                          : "text-black"
                                    }`}
                                  />
                                </td>

                                <td
                                  className={`p-2 text-center ${variationRoleView === "CONSULTANT" ? "bg-[#faf8f4]" : ""}`}
                                >
                                  <input
                                    type="number"
                                    step="any"
                                    disabled={
                                      variationRoleView !== "CONSULTANT" ||
                                      !canEditConsultant
                                    }
                                    value={item.consultantQty ?? item.contractorQty ?? displayOrigQty ?? 0}
                                    onChange={(e) =>
                                      updateVariationItem(
                                        item.code,
                                        "consultantQty",
                                        Number(e.target.value),
                                      )
                                    }
                                    className={`w-full text-center bg-transparent outline-none font-black ${
                                      variationRoleView === "CONSULTANT" && canEditConsultant
                                        ? "border-b border-amber-400 text-amber-950"
                                        : variationRoleView === "CONSULTANT"
                                          ? "text-stone-500 cursor-not-allowed opacity-75"
                                          : "text-black"
                                    }`}
                                  />
                                </td>

                                <td
                                  className={`p-2 text-center ${variationRoleView === "EMPLOYER" ? "bg-emerald-50" : ""}`}
                                >
                                  <input
                                    type="number"
                                    step="any"
                                    disabled={
                                      variationRoleView !== "EMPLOYER" ||
                                      !canEditEmployer
                                    }
                                    value={item.employerQty ?? item.consultantQty ?? item.contractorQty ?? displayOrigQty ?? 0}
                                    onChange={(e) =>
                                      updateVariationItem(
                                        item.code,
                                        "employerQty",
                                        Number(e.target.value),
                                      )
                                    }
                                    className={`w-full text-center bg-transparent outline-none font-black ${
                                      variationRoleView === "EMPLOYER" && canEditEmployer
                                        ? "border-b border-emerald-400 text-emerald-950"
                                        : variationRoleView === "EMPLOYER"
                                          ? "text-stone-500 cursor-not-allowed opacity-75"
                                          : "text-black"
                                    }`}
                                  />
                                </td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </form>

            {/* Modal Footer for Input Modal */}
            <div className="p-8 bg-[#faf8f4] border-t shrink-0 flex justify-end gap-4 rounded-b-[4rem]">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-8 py-4 bg-white border border-[#e5ded0] rounded-2xl font-black text-xs text-stone-500 hover:text-stone-900 hover:bg-[#faf8f4] transition-all"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={() => {
                  const form = document.getElementById(
                    "technical-office-form",
                  ) as HTMLFormElement;
                  if (form) {
                    if (form.reportValidity()) {
                      try {
                        form.requestSubmit();
                      } catch (err) {
                        form.dispatchEvent(
                          new Event("submit", {
                            cancelable: true,
                            bubbles: true,
                          }),
                        );
                      }
                    }
                  }
                }}
                disabled={activeTab === ("variation" as any) && currentProject?.contractType?.toUpperCase() === "CBS" && Math.abs(currentVariationWeight - 100) > 0.01}
                className={`px-10 py-4 font-black text-xs rounded-2xl transition-all ${activeTab === ("variation" as any) && currentProject?.contractType?.toUpperCase() === "CBS" && Math.abs(currentVariationWeight - 100) > 0.01 ? "bg-stone-300 text-stone-500 cursor-not-allowed" : "bg-[#ffc745] text-stone-950 font-black shadow-xl shadow-stone-500/20"}`}
              >
                {editingId ? "بروزرسانی نهایی" : "ثبت قطعی داده‌ها"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-md animate-fadeIn">
          <div className="bg-white rounded-[2rem] w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Report Header */}
            <div className="p-6 bg-stone-950 text-white flex justify-between items-center gap-4 shrink-0 border-b border-stone-800" dir="rtl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                  <Printer size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-black">
                    پیش‌نمایش گزارش و سند فنی و مهندسی
                  </h3>
                  <p className="text-[11px] text-stone-400 font-bold mt-0.5">
                    بررسی تاییدات، امضاها و اطلاعات رسمی گزارش صورت‌وضعیت
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsReportModalOpen(false);
                    setReportModalType(null);
                    setReportContextData(null);
                  }}
                  className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all cursor-pointer"
                  title="بستن پیش‌نمایش"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Report Content */}
            <div
              id="report-modal-content"
              className="p-10 overflow-y-auto flex-1 custom-scrollbar text-right"
            >
              {reportModalType === "materials" && (
                <>
                  <div className="mb-4 bg-stone-100 p-3 text-center border border-black font-bold text-black text-sm rounded-xl">
                    گزارش کنترل مصالح وارده (تفکیکی MRS)
                  </div>
                  <table className="w-full border-collapse border border-black text-xs text-black">
                    <thead>
                      <tr className="bg-gray-200">
                        <th className="border border-black p-2 w-10 text-center">
                          ردیف
                        </th>
                        <th className="border border-black p-2 w-24 text-center">
                          تاریخ ورود
                        </th>
                        <th className="border border-black p-2 w-24 text-center">
                          سریال قبض
                        </th>
                        <th className="border border-black p-2 w-32 text-center">
                          نوع مصالح
                        </th>
                        <th className="border border-black p-2 text-right pr-4">
                          شرح مصالح
                        </th>
                        <th className="border border-black p-2 w-24 text-center">
                          محل دپو / انبار
                        </th>
                        <th className="border border-black p-2 w-24 text-center">
                          وضعیت
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {mrsList
                        .filter((i) => i.projectId === selectedProjectId)
                        .map((record, i) => (
                          <tr key={record.id || i}>
                            <td className="border border-black p-2 text-center">
                              {(i + 1).toLocaleString("fa-IR")}
                            </td>
                            <td className="border border-black p-2 text-center">
                              {record.entryDate}
                            </td>
                            <td className="border border-black p-2 text-center font-bold font-mono">
                              {record.serialNumber}
                            </td>
                            <td className="border border-black p-2 text-center font-bold">
                              {record.items?.map((it, idx) => (
                                <div key={idx}>{it.materialType}</div>
                              ))}
                            </td>
                            <td className="border border-black p-2 text-right pr-4">
                              {record.items?.map((it, idx) => (
                                <div
                                  key={idx}
                                  className="text-stone-800 font-bold"
                                >
                                  - {it.materialName} (
                                  {it.quantity?.toLocaleString()} {it.unit})
                                </div>
                              ))}
                            </td>
                            <td className="border border-black p-2 text-center">
                              {record.storageLocation || "انبار کارگاه"}
                            </td>
                            <td className="border border-black p-2 text-center">
                              {record.status === ("APPROVED" as any) ? (
                                <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-1 rounded font-bold">
                                  تایید قطعی
                                </span>
                              ) : record.status === "REJECTED" ? (
                                <span className="text-[10px] bg-red-50 text-red-700 px-2 py-1 rounded font-bold">
                                  مردود
                                </span>
                              ) : (
                                <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-1 rounded font-bold">
                                  معلق/در جریان
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </>
              )}

              {reportModalType === "miv" && (
                <>
                  <div className="mb-4 bg-stone-100 p-3 text-center border border-black font-bold text-black text-sm rounded-xl">
                    گزارش حواله خروج مصالح (تفکیکی MIV)
                  </div>
                  <table className="w-full border-collapse border border-black text-xs text-black">
                    <thead>
                      <tr className="bg-gray-200">
                        <th className="border border-black p-2 w-10 text-center">
                          ردیف
                        </th>
                        <th className="border border-black p-2 w-24 text-center">
                          تاریخ خروج
                        </th>
                        <th className="border border-black p-2 w-24 text-center">
                          شماره حواله
                        </th>
                        <th className="border border-black p-2 text-right pr-4">
                          شرح اقلام
                        </th>
                        <th className="border border-black p-2 w-32 text-center">
                          تحویل‌گیرنده / بخش
                        </th>
                        <th className="border border-black p-2 w-24 text-center">
                          وضعیت
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {mivList
                        .filter((i) => i.projectId === selectedProjectId)
                        .map((record, i) => (
                          <tr key={record.id || i}>
                            <td className="border border-black p-2 text-center">
                              {(i + 1).toLocaleString("fa-IR")}
                            </td>
                            <td className="border border-black p-2 text-center">
                              {record.date}
                            </td>
                            <td className="border border-black p-2 text-center font-bold font-mono">
                              {record.serialNumber}
                            </td>
                            <td className="border border-black p-2 text-right pr-4">
                              {record.items?.map((it, idx) => (
                                <div
                                  key={idx}
                                  className="text-stone-800 font-bold"
                                >
                                  - {it.materialName} (
                                  {it.quantity?.toLocaleString()} {it.unit})
                                </div>
                              ))}
                            </td>
                            <td className="border border-black p-2 text-center font-bold text-stone-700">
                              {record.requestedBy}
                            </td>
                            <td className="border border-black p-2 text-center">
                              {record.status === ("APPROVED" as any) ? (
                                <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-1 rounded font-bold">
                                  صادر شده
                                </span>
                              ) : record.status === "REJECTED" ? (
                                <span className="text-[10px] bg-red-50 text-red-700 px-2 py-1 rounded font-bold">
                                  لغو شده
                                </span>
                              ) : (
                                <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-1 rounded font-bold">
                                  معلق/در جریان
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </>
              )}

              {reportModalType === "materialsSingle" && reportContextData && (
                <div className="border border-black p-6 rounded-xl text-black">
                  <div className="flex justify-between items-center mb-6 border-b border-black pb-4 text-sm font-bold">
                    <div>قبض ورود مصالح به انبار (MRS Ticket)</div>
                    <div className="text-left font-mono">
                      سریال قبض: {reportContextData.serialNumber}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-6 text-xs text-stone-800">
                    <div className="border border-black p-2">
                      <strong>تاریخ ورود:</strong> {reportContextData.entryDate}
                    </div>
                    <div className="border border-black p-2">
                      <strong>ساعت ورود:</strong>{" "}
                      {reportContextData.entryTime || "---"}
                    </div>
                    <div className="border border-black p-2 col-span-2">
                      <strong>نام راننده و مشخصات خودرو:</strong>{" "}
                      {reportContextData.driverName || "---"}{" "}
                      {reportContextData.vehicleType
                        ? `(${reportContextData.vehicleType})`
                        : ""}{" "}
                      {reportContextData.plateNumber
                        ? `| پلاک: ${reportContextData.plateNumber}`
                        : ""}
                    </div>
                    <div className="border border-black p-2">
                      <strong>محل تخلیه / دپو مصالح:</strong>{" "}
                      {reportContextData.storageLocation || "انبار مرکزی"}
                    </div>
                    <div className="border border-black p-2 font-black text-stone-900">
                      <strong>وضعیت سند:</strong>{" "}
                      {reportContextData.status === ("APPROVED" as any)
                        ? "تایید نهایی و رسید شده"
                        : "معلق / پیش‌نویس"}
                    </div>
                  </div>
                  <table className="w-full border-collapse border border-black mb-6 text-xs">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-black p-2 w-10 text-center">
                          ردیف
                        </th>
                        <th className="border border-black p-2 w-32 text-center">
                          نوع مصالح
                        </th>
                        <th className="border border-black p-2 text-right pr-4">
                          شرح کامل کالا / معدن / تولیدکننده
                        </th>
                        <th className="border border-black p-2 w-24 text-center bg-[#faf8f4]">
                          مقدار قبضی
                        </th>
                        <th className="border border-black p-2 w-16 text-center">
                          واحد
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportContextData.items?.map((item: any, i: number) => (
                        <tr key={i}>
                          <td className="border border-black p-2 text-center">
                            {(i + 1).toLocaleString("fa-IR")}
                          </td>
                          <td className="border border-black p-2 text-center font-bold">
                            {item.materialType || "---"}
                          </td>
                          <td className="border border-black p-2 text-right pr-4 font-bold">
                            {item.materialName}{" "}
                            {item.supplier ? `(منبع: ${item.supplier})` : ""}
                          </td>
                          <td className="border border-black p-2 text-center font-black text-amber-700 bg-[#faf8f4]/50">
                            {item.quantity?.toLocaleString()}
                          </td>
                          <td className="border border-black p-2 text-center font-bold text-stone-500">
                            {item.unit}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="border border-black mt-8 text-xs text-black font-bold">
                    <div className="grid grid-cols-3 divide-x divide-x-reverse divide-black text-center border-b border-black bg-gray-100">
                      <div className="p-2 font-black">پیمانکار عمومی</div>
                      <div className="p-2 font-black border-r border-black">دستگاه نظارت / مشاور</div>
                      <div className="p-2 font-black border-r border-black">کارفرما / مجری طرح</div>
                    </div>
                    <div className="grid grid-cols-3 divide-x divide-x-reverse divide-black text-right text-[10px]">
                      {/* Contractor Col */}
                      <div className="p-3 space-y-3">
                        <div className="border-b border-gray-250 pb-2 min-h-[50px]">
                          <strong>کارشناس دفتر فنی:</strong>
                          {reportContextData.contractorExpertApproval?.isApproved ? (
                            <div className="text-emerald-700 font-bold mt-1 text-[9px]">
                              <span>✓ تایید شد</span>
                              {reportContextData.contractorExpertApproval.comment && (
                                <span className="text-stone-600 font-normal block mt-1">دیدگاه: {reportContextData.contractorExpertApproval.comment}</span>
                              )}
                            </div>
                          ) : <div className="text-stone-400 font-normal mt-1 text-[9px] italic">عدم ثبت تایید</div>}
                        </div>
                        <div className="border-b border-gray-250 pb-2 min-h-[50px]">
                          <strong>سرپرست واحد مصالح:</strong>
                          {reportContextData.contractorUnitHeadApproval?.isApproved ? (
                            <div className="text-emerald-700 font-bold mt-1 text-[9px]">
                              <span>✓ تایید شد</span>
                              {reportContextData.contractorUnitHeadApproval.comment && (
                                <span className="text-stone-600 font-normal block mt-1">دیدگاه: {reportContextData.contractorUnitHeadApproval.comment}</span>
                              )}
                            </div>
                          ) : <div className="text-stone-400 font-normal mt-1 text-[9px] italic">عدم ثبت تایید</div>}
                        </div>
                        <div className="min-h-[50px] pt-1">
                          <strong>سرپرست کارگاه پیمانکار:</strong>
                          {reportContextData.contractorSiteManagerApproval?.isApproved ? (
                            <div className="text-emerald-700 font-bold mt-1 text-[9px]">
                              <span>✓ تایید شد</span>
                              {reportContextData.contractorSiteManagerApproval.comment && (
                                <span className="text-stone-600 font-normal block mt-1">دیدگاه: {reportContextData.contractorSiteManagerApproval.comment}</span>
                              )}
                            </div>
                          ) : <div className="text-stone-400 font-normal mt-1 text-[9px] italic">عدم ثبت تایید</div>}
                        </div>
                      </div>

                      {/* Consultant Col */}
                      <div className="p-3 space-y-3 border-r border-black">
                        <div className="border-b border-gray-250 pb-2 min-h-[50px]">
                          <strong>کارشناس ناظر مقیم:</strong>
                          {reportContextData.consultantExpertApproval?.isApproved ? (
                            <div className="text-emerald-700 font-bold mt-1 text-[9px]">
                              <span>✓ تایید شد</span>
                              {reportContextData.consultantExpertApproval.comment && (
                                <span className="text-stone-600 font-normal block mt-1">دیدگاه: {reportContextData.consultantExpertApproval.comment}</span>
                              )}
                            </div>
                          ) : <div className="text-stone-400 font-normal mt-1 text-[9px] italic">عدم ثبت تایید</div>}
                        </div>
                        <div className="border-b border-gray-250 pb-2 min-h-[50px]">
                          <strong>سرپرست نظارت مقیم:</strong>
                          {reportContextData.consultantUnitHeadApproval?.isApproved ? (
                            <div className="text-emerald-700 font-bold mt-1 text-[9px]">
                              <span>✓ تایید شد</span>
                              {reportContextData.consultantUnitHeadApproval.comment && (
                                <span className="text-stone-600 font-normal block mt-1">دیدگاه: {reportContextData.consultantUnitHeadApproval.comment}</span>
                              )}
                            </div>
                          ) : <div className="text-stone-400 font-normal mt-1 text-[9px] italic">عدم ثبت تایید</div>}
                        </div>
                        <div className="min-h-[50px] pt-1">
                          <strong>رئیس دستگاه نظارت / مشاور:</strong>
                          {reportContextData.consultantSiteManagerApproval?.isApproved ? (
                            <div className="text-emerald-700 font-bold mt-1 text-[9px]">
                              <span>✓ تایید شد</span>
                              {reportContextData.consultantSiteManagerApproval.comment && (
                                <span className="text-stone-600 font-normal block mt-1">دیدگاه: {reportContextData.consultantSiteManagerApproval.comment}</span>
                              )}
                            </div>
                          ) : <div className="text-stone-400 font-normal mt-1 text-[9px] italic">عدم ثبت تایید</div>}
                        </div>
                      </div>

                      {/* Employer Col */}
                      <div className="p-3 space-y-3 border-r border-black">
                        <div className="border-b border-gray-250 pb-2 min-h-[50px]">
                          <strong>کارشناس فنی/مالی کارفرما:</strong>
                          {reportContextData.employerExpertApproval?.isApproved ? (
                            <div className="text-emerald-700 font-bold mt-1 text-[9px]">
                              <span>✓ تایید شد</span>
                              {reportContextData.employerExpertApproval.comment && (
                                <span className="text-stone-600 font-normal block mt-1">دیدگاه: {reportContextData.employerExpertApproval.comment}</span>
                              )}
                            </div>
                          ) : <div className="text-stone-400 font-normal mt-1 text-[9px] italic">عدم ثبت تایید</div>}
                        </div>
                        <div className="border-b border-gray-250 pb-2 min-h-[50px]">
                          <strong>مدیر پروژه کارفرما:</strong>
                          {reportContextData.employerUnitHeadApproval?.isApproved ? (
                            <div className="text-emerald-700 font-bold mt-1 text-[9px]">
                              <span>✓ تایید شد</span>
                              {reportContextData.employerUnitHeadApproval.comment && (
                                <span className="text-stone-600 font-normal block mt-1">دیدگاه: {reportContextData.employerUnitHeadApproval.comment}</span>
                              )}
                            </div>
                          ) : <div className="text-stone-400 font-normal mt-1 text-[9px] italic">عدم ثبت تایید</div>}
                        </div>
                        <div className="min-h-[50px] pt-1">
                          <strong>سرپرست کارگاه کارفرما (نماینده مجری):</strong>
                          {reportContextData.employerSiteManagerApproval?.isApproved ? (
                            <div className="text-emerald-700 font-bold mt-1 text-[9px]">
                              <span>✓ تایید شد</span>
                              {reportContextData.employerSiteManagerApproval.comment && (
                                <span className="text-stone-600 font-normal block mt-1">دیدگاه: {reportContextData.employerSiteManagerApproval.comment}</span>
                              )}
                            </div>
                          ) : <div className="text-stone-400 font-normal mt-1 text-[9px] italic">عدم ثبت تایید</div>}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {reportModalType === "mivSingle" && reportContextData && (
                <div className="border border-black p-6 rounded-xl text-black">
                  <div className="flex justify-between items-center mb-6 border-b border-black pb-4 text-sm font-bold">
                    <div>برگ حواله خروج مصالح از انبار (MIV Ticket)</div>
                    <div className="text-left font-mono">
                      شماره حواله: {reportContextData.serialNumber}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-6 text-xs text-stone-800">
                    <div className="border border-black p-2">
                      <strong>تاریخ حواله:</strong> {reportContextData.date}
                    </div>
                    <div className="border border-black p-2">
                      <strong>درخواست‌کننده (پیمانکار جزء / سرپرست):</strong>{" "}
                      {reportContextData.requestedBy}
                    </div>
                    <div className="border border-black p-2 col-span-2">
                      <strong>محل مصرف / جبهه کاری:</strong>{" "}
                      {reportContextData.location || "کارگاه"}
                    </div>
                    <div className="border border-black p-2 col-span-2 font-black text-emerald-600">
                      <strong>وضعیت سند:</strong>{" "}
                      {reportContextData.status === ("APPROVED" as any)
                        ? "صادر شده و نهایی"
                        : "معلق / پیش‌نویس"}
                    </div>
                  </div>
                  <table className="w-full border-collapse border border-black mb-6 text-xs">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-black p-2 w-10 text-center">
                          ردیف
                        </th>
                        <th className="border border-black p-2 w-32 text-center">
                          نوع مصالح
                        </th>
                        <th className="border border-black p-2 text-right pr-4">
                          شرح مصالح مصرفی
                        </th>
                        <th className="border border-black p-2 w-24 text-center bg-emerald-50">
                          مقدار حواله
                        </th>
                        <th className="border border-black p-2 w-16 text-center">
                          واحد
                        </th>
                        <th className="border border-black p-2 text-right pr-4">
                          توضیحات
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportContextData.items?.map((item: any, i: number) => (
                        <tr key={i}>
                          <td className="border border-black p-2 text-center">
                            {(i + 1).toLocaleString("fa-IR")}
                          </td>
                          <td className="border border-black p-2 text-center font-bold">
                            {item.materialType || "---"}
                          </td>
                          <td className="border border-black p-2 text-right pr-4 font-bold">
                            {item.materialName}
                          </td>
                          <td className="border border-black p-2 text-center font-black text-emerald-700 bg-emerald-50/50">
                            {item.quantity?.toLocaleString()}
                          </td>
                          <td className="border border-black p-2 text-center font-bold text-stone-500">
                            {item.unit}
                          </td>
                          <td className="border border-black p-2 text-right pr-4 text-stone-500">
                            {item.remarks || "---"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="grid grid-cols-3 gap-0 border border-black text-xs text-center font-black divide-x divide-x-reverse divide-black">
                    <div className="p-8">
                      <p className="mb-12">درخواست کننده</p>
                    </div>
                    <div className="p-8">
                      <p className="mb-12">انباردار / صادرکننده</p>
                      <span className="text-[10px] text-stone-400 font-bold">
                        {reportContextData.warehouseManagerApproval?.isApproved
                          ? "تایید صدور"
                          : ""}
                      </span>
                    </div>
                    <div className="p-8">
                      <p className="mb-12">سرپرست کارگاه</p>
                      <span className="text-[10px] text-stone-400 font-bold">
                        {reportContextData.siteManagerApproval?.isApproved
                          ? "تایید نهایی مصرف"
                          : ""}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {reportModalType === "balance" && (
                <>
                  <div className="mb-4 bg-stone-100 p-3 text-center border border-black font-bold text-black text-sm rounded-xl">
                    گزارش جامع موجودی انبار (Material Balance Sheet)
                  </div>
                  <table className="w-full border-collapse border border-black text-xs text-black">
                    <thead>
                      <tr className="bg-gray-200">
                        <th className="border border-black p-2 w-10 text-center">
                          ردیف
                        </th>
                        <th className="border border-black p-2 w-32 text-center">
                          نوع مصالح
                        </th>
                        <th className="border border-black p-2 text-right pr-4">
                          شرح کالا
                        </th>
                        <th className="border border-black p-2 w-24 text-center bg-emerald-50">
                          کل وارده (In)
                        </th>
                        <th className="border border-black p-2 w-24 text-center bg-amber-50">
                          کل صادره (Out)
                        </th>
                        <th className="border border-black p-2 w-24 text-center bg-[#faf8f4]">
                          موجودی (Remaining)
                        </th>
                        <th className="border border-black p-2 w-20 text-center">
                          واحد
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {getMaterialBalance().map((row, i) => (
                        <tr key={i}>
                          <td className="border border-black p-2 text-center">
                            {(i + 1).toLocaleString("fa-IR")}
                          </td>
                          <td className="border border-black p-2 text-center font-bold text-stone-500">
                            {row.materialType}
                          </td>
                          <td className="border border-black p-2 text-right pr-4 font-black text-stone-800">
                            {row.materialName}
                          </td>
                          <td className="border border-black p-2 text-center bg-emerald-50 text-emerald-800 font-bold">
                            {row.totalIn?.toLocaleString()}
                          </td>
                          <td className="border border-black p-2 text-center bg-amber-50 text-amber-800 font-bold">
                            {row.totalOut?.toLocaleString()}
                          </td>
                          <td
                            className={`border border-black p-2 text-center font-black ${row.remaining > 0 ? "text-amber-700 bg-[#faf8f4]" : "text-red-700 bg-red-50"}`}
                          >
                            {row.remaining?.toLocaleString()}
                          </td>
                          <td className="border border-black p-2 text-center font-bold text-stone-500">
                            {row.unit}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}

              {reportModalType === "variation" && reportContextData && (() => {
                const variation = reportContextData as VariationOrder;
                const isCBS = currentProject?.contractType?.toUpperCase() === "CBS";
                const filteredItems = variation.items.filter((item) => {
                  const status = variation.status as any;
                  let origQty = item.originalQty;
                  if (origQty === undefined || origQty === null || origQty === 0) {
                    if (isCBS) {
                      const cNode = cbsNodes.find(n => (cleanCode(n.code) === cleanCode(item.code) || n.code === item.code) && String(n.projectId) === String(selectedProjectId));
                      origQty = cNode ? (cNode.quantity || 0) : 0;
                    } else {
                      const eNode = estimates.find(e => cleanCode(e.code) === cleanCode(item.code) && String(e.projectId) === String(selectedProjectId));
                      origQty = eNode ? (eNode.quantity || 0) : 0;
                    }
                  }

                  let origWeight = item.originalWeightFactor;
                  if (origWeight === undefined || origWeight === null || origWeight === 0) {
                    if (isCBS) {
                      const cNode = cbsNodes.find(n => (cleanCode(n.code) === cleanCode(item.code) || n.code === item.code) && String(n.projectId) === String(selectedProjectId));
                      origWeight = cNode ? (cNode.weightPercent || 0) : 0;
                    } else {
                      origWeight = 0;
                    }
                  }

                  const effectiveQty =
                    (status === WorkflowStatus.APPROVED_INTERNAL ||
                    status === WorkflowStatus.APPROVED_BY_CONSULTANT ||
                    status === WorkflowStatus.SENT_TO_EMPLOYER ||
                    status === WorkflowStatus.IN_EMPLOYER_REVIEW ||
                    status === ("APPROVED" as any) ||
                    status === "APPROVED_BY_EMPLOYER"
                      ? (item.employerQty ?? item.consultantQty ?? item.contractorQty)
                      : status === WorkflowStatus.SENT_TO_CONSULTANT ||
                          status === WorkflowStatus.IN_CONSULTANT_REVIEW
                        ? (item.consultantQty ?? item.contractorQty)
                        : item.contractorQty) ?? origQty ?? 0;
                  const diff = effectiveQty - origQty;

                  const effectiveWeight =
                    (status === WorkflowStatus.APPROVED_INTERNAL ||
                    status === WorkflowStatus.APPROVED_BY_CONSULTANT ||
                    status === WorkflowStatus.SENT_TO_EMPLOYER ||
                    status === WorkflowStatus.IN_EMPLOYER_REVIEW ||
                    status === ("APPROVED" as any) ||
                    status === "APPROVED_BY_EMPLOYER"
                      ? (item.employerWeightFactor ?? item.consultantWeightFactor ?? item.contractorWeightFactor)
                      : status === WorkflowStatus.SENT_TO_CONSULTANT ||
                          status === WorkflowStatus.IN_CONSULTANT_REVIEW
                        ? (item.consultantWeightFactor ?? item.contractorWeightFactor)
                        : item.contractorWeightFactor) ?? item.weightFactor ?? origWeight ?? 0;
                  const diffWeight = effectiveWeight - origWeight;

                  if (isCBS) {
                    return Math.abs(diff) >= 0.001 || Math.abs(diffWeight) >= 0.001;
                  }
                  return Math.abs(diff) >= 0.001;
                });

                const groupedItems: { [plId: string]: VariationItem[] } = {};
                filteredItems.forEach((item) => {
                  let plId = item.priceListId || 'default';
                  if (plId === 'default' || !plId) {
                    // Try to resolve the actual price list for this item from the project's price lists
                    const foundPl = currentProject?.priceLists?.find(pl => 
                      pl.items?.some((i: any) => i.code === item.code)
                    );
                    if (foundPl) {
                      plId = foundPl.id;
                    } else if (currentProject?.priceLists && currentProject.priceLists.length === 1) {
                      plId = currentProject.priceLists[0].id;
                    }
                  }
                  if (!groupedItems[plId]) {
                    groupedItems[plId] = [];
                  }
                  groupedItems[plId].push(item);
                });

                const plKeys = Object.keys(groupedItems);

                const getPlTitle = (plId: string) => {
                  if (plId && plId !== 'default') {
                    const found = currentProject?.priceLists?.find((pl: any) => pl.id === plId);
                    if (found) return `${found.title} (${found.year || ''})`;
                  }
                  if (currentProject?.priceLists && currentProject.priceLists.length > 0) {
                    return currentProject.priceLists.map((pl: any) => `${pl.title} (${pl.year || ''})`).join(' و ');
                  }
                  return 'فهرست بهای منضم به پیمان';
                };

                let grandTotalDiffAmount = 0;

                return (
                  <>
                    {/* Standard Official Header */}
                    <div className="border-b-2 border-purple-600 pb-5 mb-6 text-right">
                      <h2 className="text-xl font-black text-purple-800 text-center">
                        {isCBS ? "گزارش رسمی تغییر احجام و اوزان ساختار شکست (CBS)" : "گزارش رسمی دستورکار / تغییر مقادیر پیمان"}
                      </h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4 font-sans text-xs bg-[#faf8f4] p-4 rounded-xl text-stone-700 leading-relaxed">
                        <div>
                          <strong>پروژه:</strong> {currentProject?.title || "---"}
                        </div>
                        <div>
                          <strong>شماره پیمان:</strong>{" "}
                          {currentProject?.contractNumber || "---"}
                        </div>
                        <div>
                          <strong>کارفرما:</strong>{" "}
                          {currentProject?.employerName || "---"}
                        </div>
                        <div>
                          <strong>پیمانکار:</strong>{" "}
                          {currentProject?.contractorName || "---"}
                        </div>
                      </div>
                    </div>

                    <div className="border border-black p-4 mb-6 text-xs text-black grid grid-cols-2 gap-4 rounded-xl bg-[#faf8f4]/50">
                      <div>
                        <strong>کد/شماره تغییر:</strong>{" "}
                        <span className="font-bold text-purple-700">
                          {variation.number || "---"}
                        </span>
                      </div>
                      <div>
                        <strong>تاریخ:</strong>{" "}
                        <span className="font-bold">
                          {variation.date}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <strong>موضوع تغییرات:</strong>{" "}
                        <span className="font-bold">
                          {variation.description}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <strong>وضعیت گردش کار:</strong>{" "}
                        <span className="font-bold">
                          {WorkflowService.getStatusLabel(variation)}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-8 text-right">
                      {plKeys.map((plKey) => {
                        const groupItems = groupedItems[plKey];
                        const groupDiffAmount = groupItems.reduce((acc, item) => {
                          const status = variation.status as any;
                          let origQty = item.originalQty;
                          let unitPrice = item.unitPrice;

                          if (isCBS) {
                            if (origQty === undefined || origQty === null || origQty === 0) {
                              const cNode = cbsNodes.find(n => (cleanCode(n.code) === cleanCode(item.code) || n.code === item.code) && String(n.projectId) === String(selectedProjectId));
                              origQty = cNode ? (cNode.quantity || 0) : 0;
                            }
                            if (unitPrice === undefined || unitPrice === null || unitPrice === 0) {
                              const cNode = cbsNodes.find(n => (cleanCode(n.code) === cleanCode(item.code) || n.code === item.code) && String(n.projectId) === String(selectedProjectId));
                              if (cNode) {
                                unitPrice = cNode.unitPrice || (cNode.quantity ? (cNode.budget / cNode.quantity) : cNode.budget) || 0;
                              } else {
                                unitPrice = 0;
                              }
                            }
                          } else {
                            if (origQty === undefined || origQty === null || origQty === 0) {
                              const eNode = estimates.find(e => cleanCode(e.code) === cleanCode(item.code) && String(e.projectId) === String(selectedProjectId));
                              origQty = eNode ? (eNode.quantity || 0) : 0;
                            }
                            if (unitPrice === undefined || unitPrice === null || unitPrice === 0) {
                              const eNode = estimates.find(e => cleanCode(e.code) === cleanCode(item.code) && String(e.projectId) === String(selectedProjectId));
                              unitPrice = eNode ? (eNode.unitPrice || 0) : 0;
                            }
                          }

                          const effectiveQty =
                            (status === WorkflowStatus.APPROVED_INTERNAL ||
                            status === WorkflowStatus.APPROVED_BY_CONSULTANT ||
                            status === WorkflowStatus.SENT_TO_EMPLOYER ||
                            status === WorkflowStatus.IN_EMPLOYER_REVIEW ||
                            status === ("APPROVED" as any) ||
                            status === "APPROVED_BY_EMPLOYER"
                              ? (item.employerQty ?? item.consultantQty ?? item.contractorQty)
                              : status === WorkflowStatus.SENT_TO_CONSULTANT ||
                                  status === WorkflowStatus.IN_CONSULTANT_REVIEW
                                ? (item.consultantQty ?? item.contractorQty)
                                : item.contractorQty) ?? origQty ?? 0;

                          const diff = effectiveQty - origQty;
                          const mult = isCBS ? 1 : (getMultipliers(
                            item.code,
                            item.itemType,
                            item.independentCoefficient,
                          ).total || 1);
                          const diffAmount = diff * unitPrice * mult;
                          return acc + (isNaN(diffAmount) ? 0 : diffAmount);
                        }, 0);

                        grandTotalDiffAmount += groupDiffAmount;

                        return (
                          <div key={plKey} className="border border-stone-300 rounded-xl overflow-hidden shadow-sm bg-white">
                            <div className="bg-stone-100 p-3 font-black text-xs text-stone-800 border-b border-stone-300 flex justify-between items-center">
                              <span>📋 {isCBS ? "ساختار شکست کار (CBS)" : `تغییر مقادیر فهرست بها: ${getPlTitle(plKey)}`}</span>
                              <span className="text-stone-500 font-bold">تعداد اقلام: {groupItems.length}</span>
                            </div>
                            <table className="w-full border-collapse border-t border-stone-300 text-[10px] text-black">
                              <thead>
                                {isCBS ? (
                                  <tr className="bg-gray-50 text-stone-700 font-bold">
                                    <th className="border-b border-l border-stone-300 p-1.5 w-12 text-center">ردیف</th>
                                    <th className="border-b border-l border-stone-300 p-1.5 w-24 text-center">کد ساختار شکست</th>
                                    <th className="border-b border-l border-stone-300 p-1.5">شرح فعالیت</th>
                                    <th className="border-b border-l border-stone-300 p-1.5 w-10 text-center">واحد</th>
                                    <th className="border-b border-l border-stone-300 p-1.5 w-16 text-center bg-gray-50/50">وزن اولیه</th>
                                    <th className="border-b border-l border-stone-300 p-1.5 w-16 text-center bg-emerald-50/50">وزن مصوب</th>
                                    <th className="border-b border-l border-stone-300 p-1.5 w-16 text-center bg-yellow-50/50">تغییر وزن</th>
                                    <th className="border-b border-l border-stone-300 p-1.5 w-16 text-center bg-gray-50/50">مقدار اولیه</th>
                                    <th className="border-b border-l border-stone-300 p-1.5 w-16 text-center bg-emerald-50/50">مقدار مصوب</th>
                                    <th className="border-b border-l border-stone-300 p-1.5 w-16 text-center bg-yellow-50/50">تغییر مقدار</th>
                                    <th className="border-b border-l border-stone-300 p-1.5 w-20 text-center">بهای واحد (ریال)</th>
                                    <th className="border-b border-stone-300 p-1.5 w-24 text-center">مبلغ کل تغییرات (ریال)</th>
                                  </tr>
                                ) : (
                                  <tr className="bg-gray-50 text-stone-700 font-bold">
                                    <th className="border-b border-l border-stone-300 p-1.5 w-12 text-center">ردیف</th>
                                    <th className="border-b border-l border-stone-300 p-1.5 w-20 text-center">کد آیتم</th>
                                    <th className="border-b border-l border-stone-300 p-1.5">شرح عملیات</th>
                                    <th className="border-b border-l border-stone-300 p-1.5 w-10 text-center">واحد</th>
                                    <th className="border-b border-l border-stone-300 p-1.5 w-16 text-center bg-gray-50/50">مقدار اولیه</th>
                                    <th className="border-b border-l border-stone-300 p-1.5 w-16 text-center bg-emerald-50/50">مقدار مصوب</th>
                                    <th className="border-b border-l border-stone-300 p-1.5 w-16 text-center bg-yellow-50/50">تغییرات</th>
                                    <th className="border-b border-l border-stone-300 p-1.5 w-20 text-center">بهای واحد</th>
                                    <th className="border-b border-l border-stone-300 p-1.5 w-12 text-center">ضریب</th>
                                    <th className="border-b border-stone-300 p-1.5 w-24 text-center">مبلغ افزایش/کاهش</th>
                                  </tr>
                                )}
                              </thead>
                              <tbody>
                                {groupItems.map((item, idx) => {
                                  const status = variation.status as any;
                                  let origQty = item.originalQty;
                                  let unitPrice = item.unitPrice;

                                  if (isCBS) {
                                    if (origQty === undefined || origQty === null || origQty === 0 || String(origQty) === "0") {
                                      const cNode = cbsNodes.find(n => (cleanCode(n.code) === cleanCode(item.code) || n.code === item.code) && String(n.projectId) === String(selectedProjectId));
                                      origQty = cNode ? (cNode.quantity || 0) : 0;
                                    }
                                    if (unitPrice === undefined || unitPrice === null || unitPrice === 0 || String(unitPrice) === "0") {
                                      const cNode = cbsNodes.find(n => (cleanCode(n.code) === cleanCode(item.code) || n.code === item.code) && String(n.projectId) === String(selectedProjectId));
                                      if (cNode) {
                                        unitPrice = cNode.unitPrice || (cNode.quantity ? (cNode.budget / cNode.quantity) : cNode.budget) || 0;
                                      } else {
                                        unitPrice = 0;
                                      }
                                    }
                                  } else {
                                    if (origQty === undefined || origQty === null || origQty === 0 || String(origQty) === "0") {
                                      const eNode = estimates.find(e => cleanCode(e.code) === cleanCode(item.code) && String(e.projectId) === String(selectedProjectId));
                                      origQty = eNode ? (eNode.quantity || 0) : 0;
                                    }
                                    if (unitPrice === undefined || unitPrice === null || unitPrice === 0 || String(unitPrice) === "0") {
                                      const eNode = estimates.find(e => cleanCode(e.code) === cleanCode(item.code) && String(e.projectId) === String(selectedProjectId));
                                      unitPrice = eNode ? (eNode.unitPrice || 0) : 0;
                                    }
                                  }

                                  const effectiveQty =
                                    (status === WorkflowStatus.APPROVED_INTERNAL ||
                                    status === WorkflowStatus.APPROVED_BY_CONSULTANT ||
                                    status === WorkflowStatus.SENT_TO_EMPLOYER ||
                                    status === WorkflowStatus.IN_EMPLOYER_REVIEW ||
                                    status === ("APPROVED" as any) ||
                                    status === "APPROVED_BY_EMPLOYER"
                                      ? (item.employerQty ?? item.consultantQty ?? item.contractorQty)
                                      : status === WorkflowStatus.SENT_TO_CONSULTANT ||
                                          status === WorkflowStatus.IN_CONSULTANT_REVIEW
                                        ? (item.consultantQty ?? item.contractorQty)
                                        : item.contractorQty) ?? origQty ?? 0;

                                  const diff = effectiveQty - origQty;

                                  const effectiveWeight =
                                    (status === WorkflowStatus.APPROVED_INTERNAL ||
                                    status === WorkflowStatus.APPROVED_BY_CONSULTANT ||
                                    status === WorkflowStatus.SENT_TO_EMPLOYER ||
                                    status === WorkflowStatus.IN_EMPLOYER_REVIEW ||
                                    status === ("APPROVED" as any) ||
                                    status === "APPROVED_BY_EMPLOYER"
                                      ? (item.employerWeightFactor ?? item.consultantWeightFactor ?? item.contractorWeightFactor)
                                      : status === WorkflowStatus.SENT_TO_CONSULTANT ||
                                          status === WorkflowStatus.IN_CONSULTANT_REVIEW
                                        ? (item.consultantWeightFactor ?? item.contractorWeightFactor)
                                        : item.contractorWeightFactor) ?? item.weightFactor ?? item.originalWeightFactor ?? 0;

                                  let origWeight = item.originalWeightFactor;
                                  if (origWeight === undefined || origWeight === null || origWeight === 0) {
                                    if (isCBS) {
                                      const cNode = cbsNodes.find(n => (cleanCode(n.code) === cleanCode(item.code) || n.code === item.code) && String(n.projectId) === String(selectedProjectId));
                                      origWeight = cNode ? (cNode.weightPercent || 0) : 0;
                                    } else {
                                      origWeight = 0;
                                    }
                                  }
                                  const diffWeight = effectiveWeight - origWeight;

                                  const mult = isCBS ? 1 : (getMultipliers(
                                    item.code,
                                    item.itemType,
                                    item.independentCoefficient,
                                  ).total || 1);
                                  const diffAmount = diff * unitPrice * mult;

                                  if (isCBS) {
                                    return (
                                      <tr key={`${item.code}-${idx}`} className="hover:bg-[#faf8f4]/50">
                                        <td className="border-b border-l border-[#e5ded0] p-1.5 text-center">{idx + 1}</td>
                                        <td className="border-b border-l border-[#e5ded0] p-1.5 text-center font-bold font-mono text-purple-600">{item.code}</td>
                                        <td className="border-b border-l border-[#e5ded0] p-1.5">{item.description}</td>
                                        <td className="border-b border-l border-[#e5ded0] p-1.5 text-center">{item.unit}</td>
                                        
                                        {/* CBS Specific: Weights */}
                                        <td className="border-b border-l border-[#e5ded0] p-1.5 text-center bg-gray-50/30">{origWeight.toFixed(2)}٪</td>
                                        <td className="border-b border-l border-[#e5ded0] p-1.5 text-center font-bold bg-emerald-50/30">{effectiveWeight.toFixed(2)}٪</td>
                                        <td className={`border-b border-l border-[#e5ded0] p-1.5 text-center font-bold dir-ltr bg-yellow-50/30 ${diffWeight > 0 ? "text-green-700" : diffWeight < 0 ? "text-red-700" : "text-stone-500"}`}>
                                          {diffWeight > 0 ? "+" : ""}
                                          {diffWeight.toFixed(2)}٪
                                        </td>
                                        
                                        {/* CBS Specific: Quantities */}
                                        <td className="border-b border-l border-[#e5ded0] p-1.5 text-center bg-gray-50/30">{origQty.toLocaleString()}</td>
                                        <td className="border-b border-l border-[#e5ded0] p-1.5 text-center font-bold bg-emerald-50/30">{effectiveQty.toLocaleString()}</td>
                                        <td className={`border-b border-l border-[#e5ded0] p-1.5 text-center font-bold dir-ltr bg-yellow-50/30 ${diff > 0 ? "text-green-700" : diff < 0 ? "text-red-700" : "text-stone-500"}`}>
                                          {diff > 0 ? "+" : ""}
                                          {diff.toLocaleString()}
                                        </td>
                                        
                                        <td className="border-b border-l border-[#e5ded0] p-1.5 text-center">{(unitPrice ?? 0).toLocaleString()}</td>
                                        <td className={`border-b border-[#e5ded0] p-1.5 text-center font-bold dir-ltr ${diffAmount > 0 ? "text-green-700" : diffAmount < 0 ? "text-red-700" : "text-stone-500"}`}>
                                          {diffAmount > 0 ? "+" : ""}
                                          {Math.round(diffAmount).toLocaleString()}
                                        </td>
                                      </tr>
                                    );
                                  }

                                  return (
                                    <tr key={`${item.code}-${idx}`} className="hover:bg-[#faf8f4]/50">
                                      <td className="border-b border-l border-[#e5ded0] p-1.5 text-center">{idx + 1}</td>
                                      <td className="border-b border-l border-[#e5ded0] p-1.5 text-center font-bold font-mono text-stone-900">{item.code}</td>
                                      <td className="border-b border-l border-[#e5ded0] p-1.5">{item.description}</td>
                                      <td className="border-b border-l border-[#e5ded0] p-1.5 text-center">{item.unit}</td>
                                      <td className="border-b border-l border-[#e5ded0] p-1.5 text-center bg-gray-50/30">{origQty.toLocaleString()}</td>
                                      <td className="border-b border-l border-[#e5ded0] p-1.5 text-center font-bold bg-emerald-50/30">{effectiveQty.toLocaleString()}</td>
                                      <td className={`border-b border-l border-[#e5ded0] p-1.5 text-center font-bold dir-ltr bg-yellow-50/30 ${diff > 0 ? "text-green-700" : diff < 0 ? "text-red-700" : "text-stone-500"}`}>
                                        {diff > 0 ? "+" : ""}
                                        {diff.toLocaleString()}
                                      </td>
                                      <td className="border-b border-l border-[#e5ded0] p-1.5 text-center">{(unitPrice ?? 0).toLocaleString()}</td>
                                      <td className="border-b border-l border-[#e5ded0] p-1.5 text-center">{mult.toFixed(3)}</td>
                                      <td className={`border-b border-[#e5ded0] p-1.5 text-center font-bold dir-ltr ${diffAmount > 0 ? "text-green-700" : diffAmount < 0 ? "text-red-700" : "text-stone-500"}`}>
                                        {diffAmount > 0 ? "+" : ""}
                                        {Math.round(diffAmount).toLocaleString()}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                              <tfoot>
                                <tr className="bg-[#faf8f4]/80 font-black text-stone-800">
                                  <td colSpan={isCBS ? 11 : 9} className="border-t border-l border-stone-300 p-2 text-left">
                                    {isCBS ? "جمع تغییرات ساختار شکست کار (ریال):" : "جمع تغییرات این فهرست بها (ریال):"}
                                  </td>
                                  <td className={`border-t border-stone-300 p-2 text-center font-black ${groupDiffAmount > 0 ? "text-green-700" : groupDiffAmount < 0 ? "text-red-700" : "text-stone-500"}`}>
                                    {groupDiffAmount > 0 ? "+" : ""}
                                    {Math.round(groupDiffAmount).toLocaleString()}
                                  </td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        );
                      })}

                      {/* Final Grand Total */}
                      <div className="border border-stone-300 bg-stone-900 text-white rounded-xl overflow-hidden p-4 flex justify-between items-center shadow-lg">
                        <span className="font-black text-sm">
                          {isCBS ? "جمع کل نهایی تغییرات ساختار شکست کار (CBS):" : "جمع کل نهایی دستورکار (تمامی فهارس بها):"}
                        </span>
                        <span className={`font-mono text-sm md:text-base font-black ${grandTotalDiffAmount > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                          {grandTotalDiffAmount > 0 ? "+" : ""}
                          {Math.round(grandTotalDiffAmount).toLocaleString()} ریال
                        </span>
                      </div>
                    </div>

                    <div className="mt-6 p-3 border border-[#e5ded0] bg-[#faf8f4]/50 rounded-xl text-xs text-stone-700 leading-relaxed shadow-sm">
                      <strong>تحلیل مالی:</strong> مبلغ اولیه پیمان:{" "}
                      {currentProject?.initialBudget?.toLocaleString()} ریال |{" "}
                      درصد تغییرات این دستورکار نسبت به پیمان اولیه:{" "}
                      <span className="font-bold text-stone-900">
                        {(((grandTotalDiffAmount) / (currentProject?.initialBudget || 1)) * 100).toFixed(2)}%
                      </span>
                    </div>

                    <div className="mt-16 mb-8 grid grid-cols-4 gap-8 text-center text-xs font-bold text-slate-800 break-inside-avoid">
                      <div>
                        <p className="mb-16">بخش مهندسی و دفتر فنی پیمانکار</p>
                        <p className="border-t border-slate-400 pt-4 border-dashed inline-block w-4/5 text-slate-600">
                          نام، مهر و امضاء
                        </p>
                      </div>
                      <div>
                        <p className="mb-16">رئیس کارگاه / مدیر پروژه پیمانکار</p>
                        <p className="border-t border-slate-400 pt-4 border-dashed inline-block w-4/5 text-slate-600">
                          نام، مهر و امضاء
                        </p>
                      </div>
                      <div>
                        <p className="mb-16">مهندسین مشاور / دستگاه نظارت مقیم</p>
                        <p className="border-t border-slate-400 pt-4 border-dashed inline-block w-4/5 text-slate-600">
                          نام، مهر و امضاء
                        </p>
                      </div>
                      <div>
                        <p className="mb-16">نماینده کارفرما / مجری</p>
                        <p className="border-t border-slate-400 pt-4 border-dashed inline-block w-4/5 text-slate-600">
                          نام، مهر و امضاء
                        </p>
                      </div>
                    </div>
                  </>
                );
              })()}

              {reportModalType === "comparison" && reportContextData && (
                <>
                  {/* Project Header to make it a standard official report */}
                  <div className="border-b-2 border-amber-600 pb-5 mb-6 text-right">
                    <h2 className="text-xl font-black text-stone-950 text-center">
                      گزارش رسمی مقایسه و مغایرت صورت‌وضعیت‌ها (متره و مالی)
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4 font-sans text-xs bg-[#faf8f4] p-4 rounded-xl text-stone-700 leading-relaxed">
                      <div>
                        <strong>پروژه:</strong> {currentProject?.title || "---"}
                      </div>
                      <div>
                        <strong>شماره پیمان:</strong>{" "}
                        {currentProject?.contractNumber || "---"}
                      </div>
                      <div>
                        <strong>کارفرما:</strong>{" "}
                        {currentProject?.employerName || "---"}
                      </div>
                      <div>
                        <strong>مشاور:</strong>{" "}
                        {currentProject?.consultantName || "---"}
                      </div>
                      <div>
                        <strong>پیمانکار:</strong>{" "}
                        {currentProject?.contractorName || "---"}
                      </div>
                      <div>
                        <strong>مبلغ کل قرارداد:</strong>{" "}
                        {currentProject?.initialBudget
                          ? currentProject.initialBudget.toLocaleString(
                              "fa-IR",
                            ) + " ریال"
                          : "---"}
                      </div>
                      <div>
                        <strong>دوره کارکرد فعلی:</strong>{" "}
                        {(reportContextData as Statement).startDate} الی{" "}
                        {(reportContextData as Statement).endDate}
                      </div>
                      <div>
                        <strong>تاریخ تنظیم این گزارش:</strong>{" "}
                        {new Date().toLocaleDateString("fa-IR")}
                      </div>
                    </div>
                  </div>

                  {/* Financial overview cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 text-right">
                    <div className="p-4 bg-stone-100 rounded-2xl border border-[#e5ded0] text-center shadow-sm">
                      <div className="text-[10px] text-stone-500 font-bold mb-1">
                        صورت‌وضعیت مبنا (قبلی)
                      </div>
                      <div className="text-sm font-black text-stone-950">
                        شماره {(reportContextData as Statement).number}
                      </div>
                      <div className="text-xs text-stone-900 mt-1">
                        مبلغ کل:{" "}
                        {getStatementTotals(
                          reportContextData as Statement,
                        ).totalCoeff.toLocaleString("fa-IR")}{" "}
                        <small>ریال</small>
                      </div>
                    </div>
                    <div
                      className={`p-4 rounded-2xl border text-center shadow-sm ${reportContextData.comparison.totalDiffAmount >= 0 ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200"}`}
                    >
                      <div
                        className={`text-[10px] font-bold mb-1 ${reportContextData.comparison.totalDiffAmount >= 0 ? "text-emerald-700" : "text-rose-700"}`}
                      >
                        میزان کل تغییرات ریالی
                      </div>
                      <div
                        className={`text-sm font-black ${reportContextData.comparison.totalDiffAmount >= 0 ? "text-emerald-800" : "text-rose-800"}`}
                        dir="ltr"
                      >
                        {reportContextData.comparison.totalDiffAmount > 0
                          ? "+"
                          : ""}
                        {reportContextData.comparison.totalDiffAmount.toLocaleString(
                          "fa-IR",
                        )}{" "}
                        <small>ریال</small>
                      </div>
                      <div className="text-[10px] text-stone-500 mt-1">
                        {reportContextData.comparison.totalDiffAmount >= 0
                          ? "افزایش ناخالص کارکرد نسبت به دوره قبل"
                          : "کاهش ناخالص کارکرد نسبت به دوره قبل"}
                      </div>
                    </div>
                  </div>

                  {(() => {
                    const groupedRows: { [plId: string]: any[] } = {};
                    (reportContextData.comparison.rows as any[]).forEach((row) => {
                      const plId = row.priceListId || 'default';
                      if (!groupedRows[plId]) {
                        groupedRows[plId] = [];
                      }
                      groupedRows[plId].push(row);
                    });

                    const plKeys = Object.keys(groupedRows);

                    const getPlTitle = (plId: string) => {
                      if (plId && plId !== 'default') {
                        const found = currentProject?.priceLists?.find((pl: any) => pl.id === plId);
                        if (found) return `${found.title} (${found.year || ''})`;
                      }
                      if (currentProject?.priceLists && currentProject.priceLists.length > 0) {
                        return currentProject.priceLists.map((pl: any) => `${pl.title} (${pl.year || ''})`).join(' و ');
                      }
                      return 'فهرست بهای عمومی / پیش‌فرض';
                    };

                    return (
                      <div className="space-y-8 text-right font-sans">
                        {plKeys.map((plKey) => {
                          const groupItems = groupedRows[plKey];
                          const subTotalDiff = groupItems.reduce((sum, row) => sum + row.diffAmnt, 0);

                          return (
                            <div key={plKey} className="border border-stone-300 rounded-xl overflow-hidden shadow-sm bg-white">
                              <div className="bg-stone-100 p-3 font-black text-xs text-stone-800 border-b border-stone-300 flex justify-between items-center">
                                <span>📋 مقایسه تغییرات صورت‌وضعیت فهرست بها: {getPlTitle(plKey)}</span>
                                <span className="text-stone-500 font-bold">تعداد ردیف‌ها: {groupItems.length}</span>
                              </div>
                              <table className="w-full border-collapse text-xs text-black">
                                <thead>
                                  <tr className="bg-[#faf8f4] text-stone-700 text-xs text-center font-bold border-b border-stone-300">
                                    <th className="border-l border-stone-300 p-2.5 w-16 text-center">کد آیتم</th>
                                    <th className="border-l border-stone-300 p-2.5 text-right">شرح عملیات</th>
                                    <th className="border-l border-stone-300 p-2.5 w-12 text-center">واحد</th>
                                    <th className="border-l border-stone-300 p-2.5 w-20 text-center">مقدار قبلی</th>
                                    <th className="border-l border-stone-300 p-2.5 w-20 text-center">مقدار فعلی</th>
                                    <th className="border-l border-stone-300 p-2.5 w-24 text-center bg-amber-50/40">اختلاف مقدار</th>
                                    <th className="border-l border-stone-300 p-2.5 w-28 text-center">مبلغ قبلی (ریال)</th>
                                    <th className="border-l border-stone-300 p-2.5 w-28 text-center">مبلغ جدید (ریال)</th>
                                    <th className="p-2.5 w-28 text-center bg-amber-50/40">اختلاف مبلغ (ریال)</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {groupItems.map((row, idx) => (
                                    <tr key={idx} className="hover:bg-[#faf8f4]/55 transition-colors border-b border-[#e5ded0] last:border-0">
                                      <td className="border-l border-[#e5ded0] p-2 text-center font-mono text-xs dir-ltr text-stone-900 font-bold">
                                        {row.code}
                                      </td>
                                      <td className="border-l border-[#e5ded0] p-2 text-right text-xs leading-relaxed font-medium text-stone-800">
                                        {row.desc}
                                      </td>
                                      <td className="border-l border-[#e5ded0] p-2 text-center text-xs text-stone-600">
                                        {row.unit}
                                      </td>
                                      <td className="border-l border-[#e5ded0] p-2 text-center font-mono font-medium text-stone-600">
                                        {row.prevQty.toLocaleString("fa-IR")}
                                      </td>
                                      <td className="border-l border-[#e5ded0] p-2 text-center font-mono font-medium text-stone-800">
                                        {row.currQty.toLocaleString("fa-IR")}
                                      </td>
                                      <td className={`border-l border-[#e5ded0] p-2 text-center font-bold font-mono dir-ltr ${row.diffQty > 0 ? "text-emerald-700 bg-emerald-50/40" : row.diffQty < 0 ? "text-rose-700 bg-rose-50/40" : "text-stone-500"}`}>
                                        {row.diffQty > 0 ? "+" : ""}
                                        {row.diffQty.toLocaleString("fa-IR")}
                                      </td>
                                      <td className="border-l border-[#e5ded0] p-2 text-center font-mono text-stone-600">
                                        {row.prevAmnt.toLocaleString("fa-IR")}
                                      </td>
                                      <td className="border-l border-[#e5ded0] p-2 text-center font-mono text-stone-800">
                                        {row.currAmnt.toLocaleString("fa-IR")}
                                      </td>
                                      <td className={`p-2 text-center font-bold font-mono dir-ltr ${row.diffAmnt > 0 ? "text-emerald-700 bg-emerald-50/50" : row.diffAmnt < 0 ? "text-rose-700 bg-rose-50/50" : "text-stone-500"}`}>
                                        {row.diffAmnt > 0 ? "+" : ""}
                                        {row.diffAmnt.toLocaleString("fa-IR")}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                                <tfoot>
                                  <tr className="bg-[#faf8f4]/80 font-bold text-stone-800 border-t border-stone-300">
                                    <td colSpan={8} className="p-3 text-left text-xs">
                                      جمع کل تغییرات مالی این فهرست بها (ریال):
                                    </td>
                                    <td className={`p-3 text-center text-xs font-black font-mono dir-ltr ${subTotalDiff >= 0 ? "text-emerald-700 bg-emerald-100/50" : "text-rose-700 bg-rose-100/50"}`}>
                                      {subTotalDiff > 0 ? "+" : ""}
                                      {subTotalDiff.toLocaleString("fa-IR")}
                                    </td>
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </>
              )}

              {reportModalType === "estimate" && (() => {
                const filteredEsts = estimates.filter(
                  (e) =>
                    e.projectId === selectedProjectId &&
                    checkItemVisibility(e, "estimate"),
                );
                const groupedEsts: { [plId: string]: EstimateItem[] } = {};
                filteredEsts.forEach(item => {
                  const plId = item.priceListId || 'default';
                  if (!groupedEsts[plId]) {
                    groupedEsts[plId] = [];
                  }
                  groupedEsts[plId].push(item);
                });

                const plKeys = Object.keys(groupedEsts);

                const getPlTitle = (plId: string) => {
                  if (plId && plId !== 'default') {
                    const found = currentProject?.priceLists?.find((pl: any) => pl.id === plId);
                    if (found) return `${found.title} (${found.year || ''})`;
                  }
                  if (currentProject?.priceLists && currentProject.priceLists.length > 0) {
                    return currentProject.priceLists.map((pl: any) => `${pl.title} (${pl.year || ''})`).join(' و ');
                  }
                  return 'فهرست بهای عمومی / پیش‌فرض';
                };

                let grandRaw = 0;
                let grandCoeff = 0;

                return (
                  <div className="space-y-8 text-right">
                    {plKeys.map((plKey) => {
                      const groupItems = groupedEsts[plKey];
                      const groupRaw = groupItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
                      const groupCoeff = groupItems.reduce((sum, item) => sum + item.quantity * item.unitPrice * getMultipliers(item.code, item.itemType, item.independentCoefficient).total, 0);
                      grandRaw += groupRaw;
                      grandCoeff += groupCoeff;

                      return (
                        <div key={plKey} className="border border-stone-300 rounded-xl overflow-hidden shadow-sm bg-white">
                          <div className="bg-stone-100 p-3 font-black text-xs text-stone-800 border-b border-stone-300 flex justify-between items-center">
                            <span>📋 برآورد به تفکیک فهرست بها: {getPlTitle(plKey)}</span>
                            <span className="text-stone-500 font-bold">تعداد ردیف‌ها: {groupItems.length}</span>
                          </div>
                          <table className="w-full border-collapse border-t border-stone-300 text-xs text-black">
                            <thead>
                              <tr className="bg-gray-50 text-stone-700">
                                <th className="border-b border-l border-stone-300 p-2 w-10 text-center font-bold">ردیف</th>
                                <th className="border-b border-l border-stone-300 p-2 w-24 text-center font-bold">
                                  {currentProject?.contractType === "CBS" ? "کد ساختار شکست (CBS)" : "کد آیتم"}
                                </th>
                                <th className="border-b border-l border-stone-300 p-2 font-bold">شرح عملیات</th>
                                <th className="border-b border-l border-stone-300 p-2 w-12 text-center font-bold">واحد</th>
                                {currentProject?.contractType === "CBS" && (
                                  <th className="border-b border-l border-stone-300 p-2 w-16 text-center font-bold text-amber-700">وزن مالی</th>
                                )}
                                <th className="border-b border-l border-stone-300 p-2 w-16 text-center font-bold">مقدار</th>
                                <th className="border-b border-l border-stone-300 p-2 w-24 text-center font-bold">بهای واحد</th>
                                <th className="border-b border-l border-stone-300 p-2 w-12 text-center font-bold">ضریب</th>
                                <th className="border-b border-l border-stone-300 p-2 w-24 text-center font-bold">مبلغ خام</th>
                                <th className="border-b border-stone-300 p-2 w-24 text-center font-bold">مبلغ نهایی</th>
                              </tr>
                            </thead>
                            <tbody>
                              {groupItems.map((item, idx) => {
                                const multipliers = getMultipliers(item.code, item.itemType, item.independentCoefficient);
                                const rawAmount = item.quantity * item.unitPrice;
                                const finalAmount = rawAmount * multipliers.total;
                                return (
                                  <tr key={item.id} className="hover:bg-[#faf8f4]/50">
                                    <td className="border-b border-l border-[#e5ded0] p-2 text-center">{(idx + 1).toLocaleString("fa-IR")}</td>
                                    <td className="border-b border-l border-[#e5ded0] p-2 text-center dir-ltr font-bold font-mono text-stone-900">{item.code}</td>
                                    <td className="border-b border-l border-[#e5ded0] p-2">{item.description}</td>
                                    <td className="border-b border-l border-[#e5ded0] p-2 text-center">{item.unit}</td>
                                    {currentProject?.contractType === "CBS" && (() => {
                                      const pl = currentProject?.priceLists?.find((p: any) => p.id === item.priceListId) || currentProject?.priceLists?.[0];
                                      const foundItem = pl?.items?.find((it: any) => it.code === item.code);
                                      return (
                                        <td className="border-b border-l border-[#e5ded0] p-2 text-center font-bold text-amber-600">
                                          {foundItem?.weightPercent !== undefined ? `${foundItem.weightPercent}%` : "—"}
                                        </td>
                                      );
                                    })()}
                                    <td className="border-b border-l border-[#e5ded0] p-2 text-center">{item.quantity.toLocaleString()}</td>
                                    <td className="border-b border-l border-[#e5ded0] p-2 text-center">{item.unitPrice.toLocaleString()}</td>
                                    <td className="border-b border-l border-[#e5ded0] p-2 text-center">
                                      {currentProject?.contractType === "CBS" ? "بدون ضریب" : multipliers.total.toFixed(4)}
                                    </td>
                                    <td className="border-b border-l border-[#e5ded0] p-2 text-center">{rawAmount.toLocaleString()}</td>
                                    <td className="border-b border-[#e5ded0] p-2 text-center font-bold text-emerald-600">{finalAmount.toLocaleString()}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                            <tfoot>
                              <tr className="bg-[#faf8f4]/80 font-bold text-stone-800">
                                <td colSpan={currentProject?.contractType === "CBS" ? 8 : 7} className="border-t border-l border-stone-300 p-2 text-left">
                                  {currentProject?.contractType === "CBS" ? "جمع جزء برآورد ساختار شکست CBS (ریال):" : "جمع جزء برآورد فهرست بها (ریال):"}
                                </td>
                                <td className="border-t border-l border-stone-300 p-2 text-center">{groupRaw.toLocaleString()}</td>
                                <td className="border-t border-stone-300 p-2 text-center text-emerald-700">{groupCoeff.toLocaleString()}</td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      );
                    })}

                    {/* Final Grand Total */}
                    <div className="border border-stone-800 bg-stone-900 text-white rounded-xl overflow-hidden p-4 flex justify-between items-center shadow-lg">
                      <span className="font-black text-sm">جمع کل نهایی برآورد پیمان (تمامی فهارس بها):</span>
                      <div className="flex gap-8 text-xs md:text-sm font-black">
                        <div>جمع کل خام: <span className="font-mono text-emerald-400">{grandRaw.toLocaleString()}</span> ریال</div>
                        <div>جمع کل با ضریب: <span className="font-mono text-emerald-400">{grandCoeff.toLocaleString()}</span> ریال</div>
                      </div>
                    </div>

                    {plKeys.length === 0 && (
                      <div className="p-20 text-center bg-white border border-dashed border-stone-300 rounded-3xl">
                        <div className="w-20 h-20 bg-[#faf8f4] rounded-full flex items-center justify-center mx-auto mb-6">
                          <Calculator className="text-stone-300" size={40} />
                        </div>
                        <h4 className="text-lg font-black text-stone-800 mb-2">هیچ برآوردی یافت نشد</h4>
                        <p className="text-stone-500 text-sm max-w-md mx-auto leading-relaxed">
                          برای این پروژه هیچ ردیف برآوردی ثبت نشده است یا فیلترهای اعمال شده مانع از نمایش موارد می‌شوند.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}

              {reportModalType === "metre" && (() => {
                const filteredMetres = metres.filter(
                  (m) =>
                    m.projectId === selectedProjectId &&
                    checkItemVisibility(m, "metre"),
                );
                const groupedMetres: { [plId: string]: typeof filteredMetres } = {};
                filteredMetres.forEach((item) => {
                  const plId = item.priceListId || 'default';
                  if (!groupedMetres[plId]) {
                    groupedMetres[plId] = [];
                  }
                  groupedMetres[plId].push(item);
                });

                const plKeys = Object.keys(groupedMetres);

                const getPlTitle = (plId: string) => {
                  if (plId && plId !== 'default') {
                    const found = currentProject?.priceLists?.find((pl: any) => pl.id === plId);
                    if (found) return `${found.title} (${found.year || ''})`;
                  }
                  if (currentProject?.priceLists && currentProject.priceLists.length > 0) {
                    return currentProject.priceLists.map((pl: any) => `${pl.title} (${pl.year || ''})`).join(' و ');
                  }
                  return 'فهرست بهای عمومی / پیش‌فرض';
                };

                return (
                  <div className="space-y-8 text-right">
                    {plKeys.map((plKey) => {
                      const groupItems = groupedMetres[plKey];
                      const totalQty = groupItems.reduce((sum, item) => sum + item.partialTotal, 0);

                      return (
                        <div key={plKey} className="border border-stone-300 rounded-xl overflow-hidden shadow-sm bg-white">
                          {plKeys.length > 1 && (
                            <div className="bg-stone-100 p-3 font-black text-xs text-stone-800 border-b border-stone-300 flex justify-between items-center">
                              <span>📋 ریزمتره فهرست بها: {getPlTitle(plKey)}</span>
                              <span className="text-stone-500 font-bold">تعداد ردیف‌ها: {groupItems.length}</span>
                            </div>
                          )}
                          <table className="w-full border-collapse border-t border-stone-300 text-xs text-black">
                            <thead>
                              <tr className="bg-gray-50 text-stone-700">
                                <th className="border-b border-l border-stone-300 p-2 w-10 text-center font-bold">ردیف</th>
                                <th className="border-b border-l border-stone-300 p-2 w-24 text-center font-bold">کد آیتم</th>
                                <th className="border-b border-l border-stone-300 p-2 font-bold">شرح عملیات</th>
                                <th className="border-b border-l border-stone-300 p-2 w-12 text-center font-bold">واحد</th>
                                <th className="border-b border-l border-stone-300 p-2 w-12 text-center font-bold">تعداد</th>
                                <th className="border-b border-l border-stone-300 p-2 w-12 text-center font-bold">طول</th>
                                <th className="border-b border-l border-stone-300 p-2 w-12 text-center font-bold">عرض</th>
                                <th className="border-b border-l border-stone-300 p-2 w-12 text-center font-bold">ارتفاع</th>
                                <th className="border-b border-l border-stone-300 p-2 w-12 text-center font-bold">ضریب</th>
                                <th className="border-b border-stone-300 p-2 w-20 text-center font-bold">جمع جزء</th>
                              </tr>
                            </thead>
                            <tbody>
                              {groupItems.map((item, idx) => (
                                <tr key={item.id} className="hover:bg-[#faf8f4]/50">
                                  <td className="border-b border-l border-[#e5ded0] p-2 text-center">{(idx + 1).toLocaleString("fa-IR")}</td>
                                  <td className="border-b border-l border-[#e5ded0] p-2 text-center dir-ltr font-bold font-mono text-stone-900">{item.itemCode}</td>
                                  <td className="border-b border-l border-[#e5ded0] p-2">{item.description}</td>
                                  <td className="border-b border-l border-[#e5ded0] p-2 text-center">{item.unit}</td>
                                  <td className="border-b border-l border-[#e5ded0] p-2 text-center">{item.count.toLocaleString()}</td>
                                  <td className="border-b border-l border-[#e5ded0] p-2 text-center">{item.length.toLocaleString()}</td>
                                  <td className="border-b border-l border-[#e5ded0] p-2 text-center">{item.width.toLocaleString()}</td>
                                  <td className="border-b border-l border-[#e5ded0] p-2 text-center">{item.height.toLocaleString()}</td>
                                  <td className="border-b border-l border-[#e5ded0] p-2 text-center">{item.multiplier.toLocaleString()}</td>
                                  <td className="border-b border-[#e5ded0] p-2 text-center font-black text-emerald-600">{item.partialTotal.toLocaleString()}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="bg-[#faf8f4]/80 font-bold text-stone-800">
                                <td colSpan={9} className="border-t border-l border-stone-300 p-2 text-left">جمع کل مقادیر ریزمتره این فهرست بها:</td>
                                <td className="border-t border-stone-300 p-2 text-center text-emerald-700 font-black">{totalQty.toLocaleString()}</td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      );
                    })}

                    {plKeys.length === 0 && (
                      <div className="p-20 text-center bg-white border border-dashed border-stone-300 rounded-3xl">
                        <div className="w-20 h-20 bg-[#faf8f4] rounded-full flex items-center justify-center mx-auto mb-6">
                          <Ruler className="text-stone-300" size={40} />
                        </div>
                        <h4 className="text-lg font-black text-stone-800 mb-2">هیچ داده متره‌ای یافت نشد</h4>
                        <p className="text-stone-500 text-sm max-w-md mx-auto leading-relaxed">
                          در حال حاضر هیچ ردیف ریزمتره‌ای برای این پروژه ثبت نشده است.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}

              {reportModalType === "minutes" && !reportContextData && (
                <table className="w-full border-collapse border border-black text-xs text-black">
                  <thead>
                    <tr className="bg-gray-200">
                      <th className="border border-black p-2 w-10 text-center">
                        ردیف
                      </th>
                      <th className="border border-black p-2 w-24 text-center">
                        شماره
                      </th>
                      <th className="border border-black p-2 w-24 text-center">
                        تاریخ
                      </th>
                      <th className="border border-black p-2">
                        موضوع صورت‌جلسه
                      </th>
                      <th className="border border-black p-2 w-48 text-center">
                        موقعیت
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {minutes
                      .filter(
                        (m) =>
                          m.projectId === selectedProjectId &&
                          checkItemVisibility(m, "minute"),
                      )
                      .map((item, idx) => (
                        <tr key={item.id}>
                          <td className="border border-black p-2 text-center">
                            {(idx + 1).toLocaleString("fa-IR", {
                              minimumIntegerDigits: 2,
                              useGrouping: false,
                            })}
                          </td>
                          <td className="border border-black p-2 text-center font-bold">
                            {item.number}
                          </td>
                          <td className="border border-black p-2 text-center">
                            {item.date}
                          </td>
                          <td className="border border-black p-2">
                            {item.description}
                          </td>
                          <td className="border border-black p-2 text-center">
                            {item.location}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}

              {reportModalType === "minutes" && reportContextData && (() => {
                const minuteItems = getMinuteTotals(reportContextData.id).items;
                const groupedItems: { [plId: string]: typeof minuteItems } = {};
                minuteItems.forEach((item) => {
                  const plId = item.priceListId || 'default';
                  if (!groupedItems[plId]) {
                    groupedItems[plId] = [];
                  }
                  groupedItems[plId].push(item);
                });

                const plKeys = Object.keys(groupedItems);

                const getPlTitle = (plId: string) => {
                  if (plId && plId !== 'default') {
                    const found = currentProject?.priceLists?.find((pl: any) => pl.id === plId);
                    if (found) return `${found.title} (${found.year || ''})`;
                  }
                  if (currentProject?.priceLists && currentProject.priceLists.length > 0) {
                    return currentProject.priceLists.map((pl: any) => `${pl.title} (${pl.year || ''})`).join(' و ');
                  }
                  return 'فهرست بهای عمومی / پیش‌فرض';
                };

                let grandRaw = 0;
                let grandCoeff = 0;

                return (
                  <>
                    <div className="border border-black p-4 mb-6 text-xs text-black grid grid-cols-2 gap-4 bg-[#faf8f4] rounded-xl">
                      <div>
                        <strong>شماره صورت‌جلسه:</strong>{" "}
                        {(reportContextData as ProjectMinute).number}
                      </div>
                      <div>
                        <strong>تاریخ:</strong>{" "}
                        {(reportContextData as ProjectMinute).date}
                      </div>
                      <div className="col-span-2">
                        <strong>موضوع:</strong>{" "}
                        {(reportContextData as ProjectMinute).description}
                      </div>
                      <div className="col-span-2">
                        <strong>محل اجرا:</strong>{" "}
                        {(reportContextData as ProjectMinute).location}
                      </div>
                    </div>

                    <div className="space-y-8">
                      {plKeys.map((plKey) => {
                        const groupItems = groupedItems[plKey];
                        const groupRaw = groupItems.reduce((sum, item) => sum + (item.partialTotal * getRowEffectivePrice(item)), 0);
                        const groupCoeff = groupItems.reduce((sum, item) => {
                          const unitPrice = getRowEffectivePrice(item);
                          const mult = getMultipliers(item.itemCode, item.itemType, item.independentCoefficient).total;
                          return sum + (item.partialTotal * unitPrice * mult);
                        }, 0);

                        grandRaw += groupRaw;
                        grandCoeff += groupCoeff;

                        return (
                          <div key={plKey} className="border border-stone-300 rounded-xl overflow-hidden shadow-sm bg-white">
                            {plKeys.length > 1 && (
                              <div className="bg-stone-100 p-3 font-black text-xs text-stone-800 border-b border-stone-300 flex justify-between items-center">
                                <span>📋 ریزمتره صورت‌جلسه فهرست بها: {getPlTitle(plKey)}</span>
                                <span className="text-stone-500 font-bold">تعداد ردیف‌ها: {groupItems.length}</span>
                              </div>
                            )}
                            <table className="w-full border-collapse border-t border-stone-300 text-xs text-black">
                              <thead>
                                <tr className="bg-gray-50 text-stone-700 font-bold">
                                  <th className="border-b border-l border-stone-300 p-2 w-10 text-center">ردیف</th>
                                  <th className="border-b border-l border-stone-300 p-2 w-20 text-center">کد آیتم</th>
                                  <th className="border-b border-l border-stone-300 p-2">شرح عملیات</th>
                                  <th className="border-b border-l border-stone-300 p-2 w-12 text-center">واحد</th>
                                  <th className="border-b border-l border-stone-300 p-2 w-16 text-center">مقدار</th>
                                  <th className="border-b border-l border-stone-300 p-2 w-20 text-center">بهای واحد</th>
                                  <th className="border-b border-l border-stone-300 p-2 w-12 text-center">ضریب</th>
                                  <th className="border-b border-l border-stone-300 p-2 w-24 text-center">مبلغ خام</th>
                                  <th className="border-b border-stone-300 p-2 w-24 text-center">مبلغ با ضریب</th>
                                </tr>
                              </thead>
                              <tbody>
                                {groupItems.map((item, idx) => {
                                  const unitPrice = getRowEffectivePrice(item);
                                  const multipliers = getMultipliers(item.itemCode, item.itemType, item.independentCoefficient);
                                  const raw = item.partialTotal * unitPrice;
                                  const final = raw * multipliers.total;
                                  return (
                                    <tr key={item.id} className="hover:bg-[#faf8f4]/55">
                                      <td className="border-b border-l border-[#e5ded0] p-2 text-center">{(idx + 1).toLocaleString("fa-IR")}</td>
                                      <td className="border-b border-l border-[#e5ded0] p-2 text-center font-bold font-mono text-stone-900">{item.itemCode}</td>
                                      <td className="border-b border-l border-[#e5ded0] p-2">{item.description}</td>
                                      <td className="border-b border-l border-[#e5ded0] p-2 text-center">{item.unit}</td>
                                      <td className="border-b border-l border-[#e5ded0] p-2 text-center font-bold">{item.partialTotal.toLocaleString()}</td>
                                      <td className="border-b border-l border-[#e5ded0] p-2 text-center">{unitPrice.toLocaleString()}</td>
                                      <td className="border-b border-l border-[#e5ded0] p-2 text-center">{multipliers.total.toFixed(4)}</td>
                                      <td className="border-b border-l border-[#e5ded0] p-2 text-center">{raw.toLocaleString()}</td>
                                      <td className="border-b border-[#e5ded0] p-2 text-center font-bold text-emerald-600">{final.toLocaleString()}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                              <tfoot>
                                <tr className="bg-[#faf8f4]/80 font-bold text-stone-800">
                                  <td colSpan={7} className="border-t border-l border-stone-300 p-2 text-left">جمع جزء این فهرست بها (ریال):</td>
                                  <td className="border-t border-l border-stone-300 p-2 text-center">{groupRaw.toLocaleString()}</td>
                                  <td className="border-t border-stone-300 p-2 text-center text-emerald-700 font-black">{groupCoeff.toLocaleString()}</td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        );
                      })}

                      {/* Final Grand Total */}
                      <div className="border border-stone-800 bg-stone-900 text-white rounded-xl overflow-hidden p-4 flex justify-between items-center shadow-lg">
                        <span className="font-black text-sm">جمع کل نهایی صورت‌جلسه (تمامی فهارس بها):</span>
                        <div className="flex gap-8 text-xs md:text-sm font-black">
                          <div>جمع کل خام: <span className="font-mono text-emerald-400">{grandRaw.toLocaleString()}</span> ریال</div>
                          <div>جمع کل با ضریب: <span className="font-mono text-emerald-400">{grandCoeff.toLocaleString()}</span> ریال</div>
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}

              {reportModalType === "statements" && !reportContextData && (
                <table className="w-full border-collapse border border-black text-xs text-black">
                  <thead>
                    <tr className="bg-gray-200">
                      <th className="border border-black p-2 w-10 text-center">
                        ردیف
                      </th>
                      <th className="border border-black p-2 w-20 text-center">
                        شماره
                      </th>
                      <th className="border border-black p-2 w-48 text-center">
                        دوره کارکرد
                      </th>
                      <th className="border border-black p-2">توضیحات</th>
                      <th className="border border-black p-2 w-32 text-center">
                        مبلغ تایید شده
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {statements
                      .filter(
                        (s) =>
                          s.projectId === selectedProjectId &&
                          checkItemVisibility(s, "statement"),
                      )
                      .map((item, idx) => (
                        <tr key={item.id}>
                          <td className="border border-black p-2 text-center">
                            {(idx + 1).toLocaleString("fa-IR", {
                              minimumIntegerDigits: 2,
                              useGrouping: false,
                            })}
                          </td>
                          <td className="border border-black p-2 text-center font-bold">
                            {item.number}
                          </td>
                          <td className="border border-black p-2 text-center">
                            {item.startDate} تا {item.endDate}
                          </td>
                          <td className="border border-black p-2">
                            {item.description}
                          </td>
                          <td className="border border-black p-2 text-center font-bold">
                            {getStatementTotals(
                              item,
                            ).totalCoeff.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}

              {reportModalType === "statements" && reportContextData && (
                <StatementGeneralReport
                  statement={reportContextData as Statement}
                  currentProject={currentProject}
                  getStatementTotals={getStatementTotals}
                  getStatementFinancials={getStatementFinancials}
                  getMinuteTotals={getMinuteTotals}
                  getStatementItems={getStatementItems}
                  renderStatementReportHeader={renderStatementReportHeader}
                />
              )}

              {reportModalType === "statement-metre" && reportContextData && (
                <StatementMetreReport
                  statement={reportContextData as Statement}
                  currentProject={currentProject}
                  minutes={minutes}
                  metres={metres}
                  selectedProjectId={selectedProjectId}
                  getCumulativeMinuteIdsForStatement={getCumulativeMinuteIdsForStatement}
                  renderStatementReportHeader={renderStatementReportHeader}
                />
              )}

              {reportModalType === "statement-summary-metre" && reportContextData && (
                <StatementSummaryMetreReport
                  statement={reportContextData as Statement}
                  currentProject={currentProject}
                  minutes={minutes}
                  metres={metres}
                  selectedProjectId={selectedProjectId}
                  getCumulativeMinuteIdsForStatement={getCumulativeMinuteIdsForStatement}
                  renderStatementReportHeader={renderStatementReportHeader}
                />
              )}

              {reportModalType === "statement-financial" && reportContextData && (
                <StatementFinancialReport
                  statement={reportContextData as Statement}
                  currentProject={currentProject}
                  getStatementItems={getStatementItems}
                  renderStatementReportHeader={renderStatementReportHeader}
                />
              )}

              {reportModalType === "statement-financial-chapters" && reportContextData && (
                <StatementFinancialChaptersReport
                  statement={reportContextData as Statement}
                  currentProject={currentProject}
                  getStatementItems={getStatementItems}
                  renderStatementReportHeader={renderStatementReportHeader}
                />
              )}

              {reportModalType === "statement-financial-books" && reportContextData && (
                <StatementFinancialBooksReport
                  statement={reportContextData as Statement}
                  currentProject={currentProject}
                  getStatementItems={getStatementItems}
                  renderStatementReportHeader={renderStatementReportHeader}
                />
              )}

              {reportModalType === "discrepancy" && (
                <DiscrepancyReport
                  discrepancyData={discrepancyData}
                  currentProject={currentProject}
                />
              )}

              {reportModalType === "permits" && reportContextData && (
                <div className="border-2 border-black p-6 text-black">
                  <div className="flex justify-between items-center mb-6 border-b-2 border-black pb-4">
                    <h2 className="text-lg font-black">
                      درخواست صدور مجوز عملیات (Work Permit)
                    </h2>
                    <div className="text-left text-sm">
                      <div>
                        <strong>شماره:</strong>{" "}
                        {(reportContextData as WorkPermit).number}
                      </div>
                      <div>
                        <strong>تاریخ:</strong>{" "}
                        {(reportContextData as WorkPermit).date}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                    <div className="border border-black p-3 rounded">
                      <strong>موقعیت / لوکیشن:</strong>{" "}
                      {(reportContextData as WorkPermit).location}
                    </div>
                    <div className="border border-black p-3 rounded">
                      <strong>وضعیت مجوز:</strong>{" "}
                      {(reportContextData as WorkPermit).status ===
                        WorkflowStatus.APPROVED_INTERNAL ||
                      (reportContextData as WorkPermit).status ===
                        WorkflowStatus.APPROVED_BY_CONSULTANT
                        ? "بسته شده (مجاز)"
                        : "باز (در جریان)"}
                    </div>
                    <div className="col-span-2 border border-black p-3 rounded min-h-[80px]">
                      <strong>شرح عملیات:</strong>{" "}
                      {(reportContextData as WorkPermit).description}
                    </div>
                  </div>
                  <div className="mb-6">
                    <h3 className="font-bold text-sm mb-2">
                      تاییدیه‌های واحدها (دیسیپلین‌ها)
                    </h3>
                    <table className="w-full border-collapse border border-black text-center text-xs">
                      <thead>
                        <tr className="bg-gray-200">
                          <th className="border border-black p-2">ردیف</th>
                          <th className="border border-black p-2">
                            واحد کنترل کننده
                          </th>
                          <th className="border border-black p-2">
                            تایید پیمانکار
                          </th>
                          <th className="border border-black p-2">
                            تایید مشاور
                          </th>
                          <th className="border border-black p-2">
                            تایید کارفرما
                          </th>
                          <th className="border border-black p-2">توضیحات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {PERMIT_DISCIPLINES.map((d, i) => {
                          const p = reportContextData as WorkPermit;
                          const cont = p[
                            `contractor${d.key}` as keyof WorkPermit
                          ] as ApprovalDetail;
                          const cons = p[
                            `consultant${d.key}` as keyof WorkPermit
                          ] as ApprovalDetail;
                          const emp = p[
                            `employer${d.key}` as keyof WorkPermit
                          ] as ApprovalDetail;
                          return (
                            <tr key={d.key}>
                              <td className="border border-black p-2">
                                {i + 1}
                              </td>
                              <td className="border border-black p-2 font-bold text-right pr-4">
                                {d.label}
                              </td>
                              <td className="border border-black p-2">
                                {cont?.isApproved ? (
                                  <span className="font-bold">✓</span>
                                ) : (
                                  "-"
                                )}
                              </td>
                              <td className="border border-black p-2">
                                {cons?.isApproved ? (
                                  <span className="font-bold">✓</span>
                                ) : (
                                  "-"
                                )}
                              </td>
                              <td className="border border-black p-2">
                                {emp?.isApproved ? (
                                  <span className="font-bold">✓</span>
                                ) : (
                                  "-"
                                )}
                              </td>
                              <td className="border border-black p-2 text-right">
                                <div className="space-y-0.5">
                                  {cont?.comment && <div><span className="text-[10px] text-gray-400">پیمانکار:</span> {cont.comment}</div>}
                                  {cons?.comment && <div><span className="text-[10px] text-gray-400">مشاور:</span> {cons.comment}</div>}
                                  {emp?.comment && <div><span className="text-[10px] text-gray-400">کارفرما:</span> {emp.comment}</div>}
                                  {!cont?.comment && !cons?.comment && !emp?.comment && "-"}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="border border-black mt-8 text-xs text-black font-bold">
                    <div className="grid grid-cols-3 divide-x divide-x-reverse divide-black text-center border-b border-black bg-gray-100">
                      <div className="p-2 font-black">پیمانکار عمومی</div>
                      <div className="p-2 font-black border-r border-black">دستگاه نظارت / مشاور</div>
                      <div className="p-2 font-black border-r border-black">کارفرما / مجری طرح</div>
                    </div>
                    <div className="grid grid-cols-3 divide-x divide-x-reverse divide-black text-right text-[10px]">
                      {/* Contractor Col */}
                      <div className="p-3 space-y-3">
                        <div className="border-b border-gray-250 pb-2 min-h-[55px]">
                          <strong>کارشناس دفتر فنی:</strong>
                          {(reportContextData as WorkPermit).contractorExpertApproval?.isApproved ? (
                            <div className="text-emerald-700 font-bold mt-1 text-[9px]">
                              <span>✓ تایید شد</span>
                              {(reportContextData as WorkPermit).contractorExpertApproval.comment && (
                                <span className="text-stone-600 font-normal block mt-1">دیدگاه: {(reportContextData as WorkPermit).contractorExpertApproval.comment}</span>
                              )}
                            </div>
                          ) : <div className="text-stone-400 font-normal mt-1 text-[9px] italic">عدم ثبت تایید</div>}
                        </div>
                        <div className="border-b border-gray-250 pb-2 min-h-[55px]">
                          <strong>سرپرست واحد فنی:</strong>
                          {(reportContextData as WorkPermit).contractorUnitHeadApproval?.isApproved ? (
                            <div className="text-emerald-700 font-bold mt-1 text-[9px]">
                              <span>✓ تایید شد</span>
                              {(reportContextData as WorkPermit).contractorUnitHeadApproval.comment && (
                                <span className="text-stone-600 font-normal block mt-1">دیدگاه: {(reportContextData as WorkPermit).contractorUnitHeadApproval.comment}</span>
                              )}
                            </div>
                          ) : <div className="text-stone-400 font-normal mt-1 text-[9px] italic">عدم ثبت تایید</div>}
                        </div>
                        <div className="min-h-[55px] pt-1">
                          <strong>سرپرست کارگاه پیمانکار:</strong>
                          {(reportContextData as WorkPermit).contractorSiteManagerApproval?.isApproved ? (
                            <div className="text-emerald-700 font-bold mt-1 text-[9px]">
                              <span>✓ تایید شد</span>
                              {(reportContextData as WorkPermit).contractorSiteManagerApproval.comment && (
                                <span className="text-stone-600 font-normal block mt-1">دیدگاه: {(reportContextData as WorkPermit).contractorSiteManagerApproval.comment}</span>
                              )}
                            </div>
                          ) : <div className="text-stone-400 font-normal mt-1 text-[9px] italic">عدم ثبت تایید</div>}
                        </div>
                      </div>

                      {/* Consultant Col */}
                      <div className="p-3 space-y-3 border-r border-black">
                        <div className="pb-2 min-h-[55px] flex flex-col justify-center text-center">
                          <strong>سرپرست دستگاه نظارت / مهندس ناظر</strong>
                          <span className="block mt-4 text-stone-400 text-[9px]">امضاء و مهر</span>
                        </div>
                      </div>

                      {/* Employer Col */}
                      <div className="p-3 space-y-3 border-r border-black">
                        <div className="pb-2 min-h-[55px] flex flex-col justify-center text-center">
                          <strong>نماینده کارفرما / مجری طرح</strong>
                          <span className="block mt-4 text-stone-400 text-[9px]">امضاء و مهر</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {reportModalType === "permits" && !reportContextData && (
                <table className="w-full border-collapse border border-black text-xs text-black">
                  <thead>
                    <tr className="bg-gray-200 text-black">
                      <th className="border border-black p-2 w-10 text-center text-black">
                        ردیف
                      </th>
                      <th className="border border-black p-2 w-32 text-center text-black">
                        موقعیت اجرایی
                      </th>
                      <th className="border border-black p-2 w-24 text-center text-black">
                        شماره مجوز
                      </th>
                      <th className="border border-black p-2 w-24 text-center text-black">
                        تاریخ
                      </th>
                      <th className="border border-black p-2 text-black">
                        موضوع / شرح عملیات
                      </th>
                      <th className="border border-black p-2 w-24 text-center text-black">
                        وضعیت
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {workPermits
                      .filter((p) => p.projectId === selectedProjectId)
                      .map((p, i) => (
                        <tr key={p.id} className="text-black">
                          <td className="border border-black p-2 text-center text-black">
                            {(i + 1).toLocaleString("fa-IR", {
                              minimumIntegerDigits: 2,
                              useGrouping: false,
                            })}
                          </td>
                          <td className="border border-black p-2 font-bold bg-[#faf8f4] text-black">
                            {p.location}
                          </td>
                          <td className="border border-black p-2 text-center text-black">
                            {p.number}
                          </td>
                          <td className="border border-black p-2 text-center text-black">
                            {p.date}
                          </td>
                          <td className="border border-black p-2 text-black">
                            {p.description}
                          </td>
                          <td className="border border-black p-2 text-center text-black">
                            {p.status === WorkflowStatus.APPROVED_INTERNAL ||
                            p.status ===
                              WorkflowStatus.APPROVED_BY_CONSULTANT ? (
                              <span className="font-bold text-black">
                                تایید نهایی
                              </span>
                            ) : (
                              <span>در جریان</span>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}

              {/* Dynamic Signatures Grid */}
              {(() => {
                const renderSigCard = (label: string, data: { name: string; title: string; signature?: string; date?: string } | null) => (
                  <div 
                    className="sig-card border border-stone-200 rounded-md p-1 bg-white flex flex-col justify-between min-h-[105px] text-right overflow-hidden shadow-2xs"
                    style={{ minHeight: '100px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: '1px solid #cbd5e1', borderRadius: '5px', padding: '4px', background: '#ffffff', boxSizing: 'border-box' }}
                  >
                    <div>
                      <div className="font-black text-stone-900 text-[8.5px] leading-tight truncate text-center" title={label}>{label}</div>
                      {data?.name && (
                        <div className="text-[8px] text-stone-700 font-bold mt-0.5 bg-stone-100 px-0.5 py-0.5 rounded text-center truncate" title={data.name}>
                          {data.name}
                        </div>
                      )}
                    </div>

                    {data?.signature ? (
                      <div className="my-0.5 flex flex-col items-center justify-center">
                        <img src={data.signature} alt={label} className="max-h-7 max-w-[75px] object-contain filter contrast-125" style={{ maxHeight: '28px', maxWidth: '75px', objectFit: 'contain' }} />
                        <div className="text-[7px] text-emerald-700 font-bold flex items-center gap-0.5 mt-0.5">
                          <CheckCircle size={8} />
                          <span className="truncate">امضاء معتبر</span>
                        </div>
                      </div>
                    ) : (
                      <div className="my-1 text-center">
                        <div className="text-stone-400 text-[8px] italic">مهر / امضاء</div>
                      </div>
                    )}

                    <div className="border-t border-stone-200 pt-0.5 text-[7.5px] text-stone-500 text-center font-mono truncate" style={{ borderTop: '1px solid #e2e8f0', paddingTop: '2px', fontSize: '7.5px' }}>
                      {data?.date ? data.date : 'نام و امضاء'}
                    </div>
                  </div>
                );

                return (
                  <div className="mt-8 pt-4 border-t-2 border-stone-300 w-full page-break-inside-avoid print:mt-4 print:pt-2 text-right" dir="rtl" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <div className="text-[11px] font-black text-stone-800 mb-2 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      <span>تاییدات و امضاهای ارکان پروژه (گزارش رسمی و مدیریتی)</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 w-full text-right dir-rtl" style={{ display: 'flex', flexDirection: 'row', width: '100%', gap: '6px' }}>
                      {/* 1. پیمانکار */}
                      <div className="sig-org-box border border-blue-200 bg-blue-50/20 rounded-lg p-1.5 flex flex-col justify-between" style={{ flex: '1 1 0%', minWidth: '0', border: '1px solid #bfdbfe', background: '#f8fafc', borderRadius: '6px', padding: '5px' }}>
                        <div className="font-bold text-[9.5px] text-blue-900 border-b border-blue-200 pb-1 mb-1.5 text-center flex items-center justify-center gap-1 truncate" style={{ borderBottom: '1px solid #bfdbfe', paddingBottom: '3px', marginBottom: '4px', fontSize: '9px', fontWeight: 'bold', color: '#1e3a8a' }}>
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 flex-shrink-0"></span>
                          <span className="truncate">پیمانکار: {currentProject?.contractorName || 'سازمان پیمانکار'}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-1" style={{ display: 'flex', flexDirection: 'row', gap: '4px' }}>
                          <div style={{ flex: '1 1 0%', minWidth: '0' }}>{renderSigCard("کارشناس / تنظیم‌کننده", getRoleSignatory("contractor_tech", reportContextData))}</div>
                          <div style={{ flex: '1 1 0%', minWidth: '0' }}>{renderSigCard("سرپرست واحد فنی", getRoleSignatory("contractor_head", reportContextData))}</div>
                          <div style={{ flex: '1 1 0%', minWidth: '0' }}>{renderSigCard("سرپرست کارگاه / مدیر پروژه", getRoleSignatory("contractor_site", reportContextData))}</div>
                        </div>
                      </div>

                      {/* 2. دستگاه نظارت و مشاور */}
                      <div className="sig-org-box border border-emerald-200 bg-emerald-50/20 rounded-lg p-1.5 flex flex-col justify-between" style={{ flex: '1 1 0%', minWidth: '0', border: '1px solid #a7f3d0', background: '#f8fafc', borderRadius: '6px', padding: '5px' }}>
                        <div className="font-bold text-[9.5px] text-emerald-900 border-b border-emerald-200 pb-1 mb-1.5 text-center flex items-center justify-center gap-1 truncate" style={{ borderBottom: '1px solid #a7f3d0', paddingBottom: '3px', marginBottom: '4px', fontSize: '9px', fontWeight: 'bold', color: '#065f46' }}>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 flex-shrink-0"></span>
                          <span className="truncate">مشاور: {currentProject?.consultantName || 'دستگاه نظارت و مشاور'}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-1" style={{ display: 'flex', flexDirection: 'row', gap: '4px' }}>
                          <div style={{ flex: '1 1 0%', minWidth: '0' }}>{renderSigCard("کارشناس / ناظر مقیم", getRoleSignatory("consultant_tech", reportContextData))}</div>
                          <div style={{ flex: '1 1 0%', minWidth: '0' }}>{renderSigCard("سرپرست واحد نظارت", getRoleSignatory("consultant_head", reportContextData))}</div>
                          <div style={{ flex: '1 1 0%', minWidth: '0' }}>{renderSigCard("سرپرست نظارت / مدیر پروژه", getRoleSignatory("consultant", reportContextData))}</div>
                        </div>
                      </div>

                      {/* 3. دستگاه اجرایی و کارفرما */}
                      <div className="sig-org-box border border-purple-200 bg-purple-50/20 rounded-lg p-1.5 flex flex-col justify-between" style={{ flex: '1 1 0%', minWidth: '0', border: '1px solid #e9d5ff', background: '#f8fafc', borderRadius: '6px', padding: '5px' }}>
                        <div className="font-bold text-[9.5px] text-purple-900 border-b border-purple-200 pb-1 mb-1.5 text-center flex items-center justify-center gap-1 truncate" style={{ borderBottom: '1px solid #e9d5ff', paddingBottom: '3px', marginBottom: '4px', fontSize: '9px', fontWeight: 'bold', color: '#581c87' }}>
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-600 flex-shrink-0"></span>
                          <span className="truncate">کارفرما: {currentProject?.employerName || 'دستگاه اجرایی و کارفرما'}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-1" style={{ display: 'flex', flexDirection: 'row', gap: '4px' }}>
                          <div style={{ flex: '1 1 0%', minWidth: '0' }}>{renderSigCard("کارشناس / بررسی‌کننده", getRoleSignatory("employer_tech", reportContextData))}</div>
                          <div style={{ flex: '1 1 0%', minWidth: '0' }}>{renderSigCard("سرپرست واحد / مدیر گروه", getRoleSignatory("employer_head", reportContextData))}</div>
                          <div style={{ flex: '1 1 0%', minWidth: '0' }}>{renderSigCard("مدیر طرح / نماینده کارفرما", getRoleSignatory("employer", reportContextData))}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* MODAL FOOTER WITH OFFICIAL PRINT */}
            <div className="p-5 bg-[#faf8f4] border-t flex justify-between items-center gap-3 rounded-b-[2rem]" dir="rtl">
              <div className="text-xs text-stone-500 font-medium">
                سند رسمی با جدول تاییدات و امضاهای ارکان ۳‌گانه پروژه
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => printReportOfficial()}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-xl transition-all flex items-center gap-2 font-black text-xs cursor-pointer shadow-md shadow-amber-500/20 active:scale-95"
                  title="چاپ رسمی A4 با امضاهای الکترونیکی"
                >
                  <Printer size={16} /> چاپ رسمی (A4)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsReportModalOpen(false);
                    setReportModalType(null);
                    setReportContextData(null);
                  }}
                  className="px-4 py-2.5 bg-white border border-stone-300 hover:bg-stone-100 text-stone-700 rounded-xl font-bold text-xs cursor-pointer"
                >
                  بستن
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Workflow Modal */}
      {workflowModalOpen && workflowItem && workflowActionType && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-[#ece5d8] flex justify-between items-center bg-[#faf8f4]">
              <h3 className="font-black text-stone-800 flex items-center gap-2">
                <Activity size={20} className="text-stone-900" />
                {workflowActionType === "SUBMIT" && "ارسال جهت بررسی"}
                {workflowActionType === "REASSIGN" && "ارجاع به کارشناس دیگر"}
                {workflowActionType === "APPROVE" &&
                  (("periods" in workflowItem &&
                    currentUser &&
                    (SystemAdminService.getOrganization(currentUser.orgId)?.type === OrganizationType.CONSULTANT ||
                     SystemAdminService.getOrganization(currentUser.orgId)?.type === OrganizationType.EMPLOYER))
                    ? "تایید"
                    : "تایید و ارجاع")}
                {workflowActionType === "FINAL_APPROVE" &&
                  (currentUser && SystemAdminService.getOrganization(currentUser.orgId)?.type === OrganizationType.EMPLOYER
                    ? "تایید و ثبت نهایی"
                    : "تایید نهایی")}
                {workflowActionType === "REJECT" && "رد و بازگشت برای اصلاح"}
                {workflowActionType === "SEND_TO_CONSULTANT" &&
                  "ارسال به مشاور"}
                {workflowActionType === "SEND_TO_EMPLOYER" &&
                  (currentUser && SystemAdminService.getOrganization(currentUser.orgId)?.type === OrganizationType.CONSULTANT
                    ? "تایید و ارسال به کارفرما"
                    : "ارسال به کارفرما")}
                {workflowActionType === "RETURN_TO_CONTRACTOR" &&
                  "عودت به پیمانکار"}
                {workflowActionType === "RETURN_TO_CONSULTANT" &&
                  "عودت به مشاور"}
                {workflowActionType === "UNFREEZE_BY_VARIATION" &&
                  "رفع قفل و بازگشایی (Unfreeze)"}
                {workflowBatchItems && (
                  <span className="bg-stone-100 text-amber-700 text-[10px] px-2 py-0.5 rounded-full mr-2">
                    دسته جمعی ({workflowBatchItems.length} مورد)
                  </span>
                )}
              </h3>
              <button
                onClick={() => setWorkflowModalOpen(false)}
                className="p-2 hover:bg-stone-200 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {(() => {
                const ut = (currentUser?.jobTitle || "").trim();
                const ul = (currentUser?.jobLevel || "").trim();
                const isPMOrWorkshopManager =
                  ut.includes("مدیر پروژه") ||
                  ul.includes("مدیر پروژه") ||
                  ut.includes("سرپرست کارگاه") ||
                  ul.includes("سرپرست کارگاه");
                
                const showAssigneeDropdown = 
                  workflowActionType === "SUBMIT" ||
                  workflowActionType === "REASSIGN" ||
                  workflowActionType === "SEND_TO_CONSULTANT" ||
                  workflowActionType === "SEND_TO_EMPLOYER" ||
                  workflowActionType === "APPROVE" ||
                  workflowActionType === "RETURN_TO_CONTRACTOR" ||
                  workflowActionType === "RETURN_TO_CONSULTANT" ||
                  workflowActionType === "REJECT" ||
                  (workflowActionType === "FINAL_APPROVE" && isPMOrWorkshopManager);

                if (showAssigneeDropdown) {
                  const isPermitMultiAssign = activeTab === "permits" && (
                    workflowActionType === "SUBMIT" ||
                    workflowActionType === "REASSIGN" ||
                    (workflowActionType === "APPROVE" && !ut.includes("سرپرست واحد") && !ul.includes("سرپرست واحد") && !ut.includes("سرپرست کارگاه") && !ul.includes("سرپرست کارگاه") && !ut.includes("مدیر پروژه") && !ul.includes("مدیر پروژه"))
                  );

                  if (isPermitMultiAssign) {
                    return (
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-stone-500 block">
                          انتخاب کارشناسان مربوطه (یک یا چند مورد را علامت بزنید)
                        </label>
                        <div className="space-y-1.5 max-h-48 overflow-y-auto p-3 bg-[#faf8f4] border border-[#e5ded0] rounded-xl">
                          {orgUsers.map((u) => {
                            const isChecked = selectedExperts.includes(u.id);
                            return (
                              <label key={u.id} className="flex items-center gap-3 p-2 hover:bg-stone-50 rounded-lg cursor-pointer transition-colors text-right w-full">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    let newSelected;
                                    if (isChecked) {
                                      newSelected = selectedExperts.filter(id => id !== u.id);
                                    } else {
                                      newSelected = [...selectedExperts, u.id];
                                    }
                                    setSelectedExperts(newSelected);
                                    setWorkflowAssignee(newSelected.join(','));
                                  }}
                                  className="rounded text-stone-900 focus:ring-stone-900 w-4 h-4"
                                />
                                <span className="text-sm text-stone-800 font-bold">
                                  {formatUserDisplayFormal(u, SystemAdminService.getOrganization(u.orgId))}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-stone-500 block">
                        {workflowActionType === "SEND_TO_CONSULTANT"
                          ? "انتخاب گیرنده (در مشاور)"
                          : workflowActionType === "SEND_TO_EMPLOYER"
                            ? "انتخاب گیرنده (در کارفرما)"
                            : workflowActionType === "RETURN_TO_CONTRACTOR"
                              ? "انتخاب گیرنده (در پیمانکار)"
                              : workflowActionType === "RETURN_TO_CONSULTANT"
                                ? "انتخاب گیرنده (در مشاور)"
                                : workflowActionType === "APPROVE"
                                  ? "انتخاب گیرنده بعدی (جهت ارجاع)"
                                  : workflowActionType === "REJECT"
                                    ? "انتخاب دریافت‌کننده سند رد شده"
                                    : "انتخاب گیرنده (داخل سازمان)"}
                      </label>
                      <select
                        value={workflowAssignee}
                        onChange={(e) => setWorkflowAssignee(e.target.value)}
                        className="w-full p-3 bg-[#faf8f4] border border-[#e5ded0] rounded-xl text-sm font-bold outline-none focus:border-stone-500 transition-all"
                      >
                        <option value="">انتخاب کنید...</option>
                        {orgUsers.map((u) => (
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

              {(workflowActionType === "REJECT" ||
                workflowActionType === "APPROVE" ||
                workflowActionType === "FINAL_APPROVE" ||
                workflowActionType === "RETURN_TO_CONTRACTOR" ||
                workflowActionType === "RETURN_TO_CONSULTANT" ||
                workflowActionType === "UNFREEZE_BY_VARIATION" ||
                workflowActionType === "SUBMIT" ||
                workflowActionType === "SEND_TO_CONSULTANT" ||
                workflowActionType === "SEND_TO_EMPLOYER" ||
                workflowActionType === "REASSIGN") && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-500 block">
                    {workflowActionType === "REJECT" ||
                    workflowActionType === "RETURN_TO_CONTRACTOR" ||
                    workflowActionType === "RETURN_TO_CONSULTANT" ||
                    workflowActionType === "UNFREEZE_BY_VARIATION"
                      ? "علت رد/عودت/بازگشایی (اجباری)"
                      : "توضیحات (اختیاری)"}
                  </label>
                  <textarea
                    value={workflowComment}
                    onChange={(e) => setWorkflowComment(e.target.value)}
                    className="w-full p-3 bg-[#faf8f4] border border-[#e5ded0] rounded-xl text-sm font-bold outline-none focus:border-stone-500 transition-all min-h-[100px]"
                    placeholder="توضیحات خود را بنویسید..."
                  />
                </div>
              )}

              {/* Electronic Signature Toggle & Status Card */}
              {(() => {
                const isNoSignatureAction =
                  workflowActionType === "REJECT" ||
                  workflowActionType === "REASSIGN" ||
                  workflowActionType === "RETURN_TO_CONTRACTOR" ||
                  workflowActionType === "RETURN_TO_CONSULTANT";

                if (isNoSignatureAction) return null;

                const hrSig = HRService.getUserSignature(currentUser) || currentUser?.signature;
                const isInterOrg =
                  workflowActionType === "SEND_TO_CONSULTANT" ||
                  workflowActionType === "SEND_TO_EMPLOYER" ||
                  workflowActionType === "FINAL_APPROVE";

                return (
                  <div className="space-y-2 border-t border-[#e5ded0] pt-4 mt-2" dir="rtl">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={attachWorkflowSignature}
                          onChange={(e) => setAttachWorkflowSignature(e.target.checked)}
                          className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer accent-amber-600"
                        />
                        <span className="text-xs font-bold text-stone-800">
                          درج امضای الکترونیکی در گزارشات و سند
                        </span>
                      </label>
                      {isInterOrg ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
                          الزامی (بین‌سازمانی)
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
                          اختیاری (درون‌سازمانی)
                        </span>
                      )}
                    </div>

                    {attachWorkflowSignature && (
                      <div className="p-3 bg-[#faf8f4] border border-[#e5ded0] rounded-xl">
                        {hrSig ? (
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="w-16 h-10 bg-white border border-stone-200 rounded-lg p-1 flex items-center justify-center shrink-0 shadow-sm">
                                <img src={hrSig} alt="امضای دیجیتال" className="max-h-full max-w-full object-contain" />
                              </div>
                              <div>
                                <div className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                                  <CheckCircle size={13} /> امضای الکترونیکی آماده درج است
                                </div>
                                <div className="text-[10px] text-stone-500 mt-0.5">
                                  ثبت‌شده در منابع انسانی ({currentUser?.fullName || currentUser?.username})
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start gap-2 text-red-600 text-xs">
                            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                            <div>
                              <p className="font-bold">امضای الکترونیکی شما در سیستم منابع انسانی ثبت نشده است!</p>
                              <p className="text-[10px] text-stone-500 mt-0.5">
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

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setWorkflowModalOpen(false)}
                  className="flex-1 py-3 rounded-xl bg-stone-100 text-stone-600 font-bold hover:bg-stone-200 transition-all"
                >
                  انصراف
                </button>
                <button
                  onClick={handleWorkflowSubmit}
                  disabled={(() => {
                    const ut = (currentUser?.jobTitle || "").trim();
                    const ul = (currentUser?.jobLevel || "").trim();
                    const isPMOrWorkshopManager =
                      ut.includes("مدیر پروژه") ||
                      ul.includes("مدیر پروژه") ||
                      ut.includes("سرپرست کارگاه") ||
                      ul.includes("سرپرست کارگاه");
                    
                    if (workflowActionType === "REJECT" && (!workflowComment.trim() || !workflowAssignee)) {
                      return true;
                    }
                    
                    const actionsRequiringAssignee = [
                      "SUBMIT",
                      "RESUBMIT",
                      "REASSIGN",
                      "SEND_TO_CONSULTANT",
                      "SEND_TO_EMPLOYER",
                      "SEND_TO_CONTRACTOR",
                      "RETURN_TO_CONTRACTOR",
                      "RETURN_TO_CONSULTANT"
                    ];
                    
                    // For non-senior roles, APPROVE still requires an assignee (internal referral)
                    if (workflowActionType === "APPROVE" && !isPMOrWorkshopManager && !workflowAssignee) {
                      return true;
                    }

                    if (actionsRequiringAssignee.includes(workflowActionType as string) && !workflowAssignee) {
                      return true;
                    }

                    if ((workflowActionType === "RETURN_TO_CONTRACTOR" ||
                         workflowActionType === "RETURN_TO_CONSULTANT" ||
                         workflowActionType === "UNFREEZE_BY_VARIATION") &&
                        !workflowComment.trim()) {
                      return true;
                    }

                    return false;
                  })()}
                  className={`flex-1 py-3 rounded-xl text-white font-bold shadow-lg transition-all ${
                    workflowActionType === "REJECT" ||
                    workflowActionType === "RETURN_TO_CONTRACTOR" ||
                    workflowActionType === "RETURN_TO_CONSULTANT"
                      ? "bg-red-500 hover:bg-red-600 shadow-red-500/30"
                      : workflowActionType === "UNFREEZE_BY_VARIATION"
                        ? "bg-amber-500 hover:bg-amber-600 shadow-amber-500/30"
                        : workflowActionType === "APPROVE" ||
                            workflowActionType === "FINAL_APPROVE"
                          ? "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30"
                          : "bg-amber-600 hover:bg-amber-700 shadow-amber-600/30"
                  }`}
                >
                  تایید و انجام
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {historyModalOpen && historyItem && (
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
              {!historyItem.workflowHistory ||
              historyItem.workflowHistory.length === 0 ? (
                <div className="text-center text-stone-400 py-8 text-sm font-bold">
                  هیچ سابقه‌ای ثبت نشده است.
                </div>
              ) : (
                [...historyItem.workflowHistory]
                  .sort((a, b) => b.timestamp - a.timestamp)
                  .map((event, idx) => (
                    <div key={event.id} className="flex gap-4 relative">
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-3 h-3 rounded-full z-10 ${
                            event.action === "APPROVE"
                              ? "bg-emerald-500"
                              : event.action === "REJECT"
                                ? "bg-red-500"
                                : "bg-[#faf8f4]0"
                          }`}
                        />
                        {idx <
                          (historyItem.workflowHistory?.length || 0) - 1 && (
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
                          <div className="text-[10px] text-stone-600 bg-[#faf8f4] p-2.5 rounded-xl border border-[#ece5d8] italic">
                            <span className="block">"{event.comment}"</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[9px] px-2 py-0.5 rounded bg-stone-100 text-stone-500">
                            {WorkflowService.getStatusLabel(event.fromStatus)}
                          </span>
                          <ArrowLeftCircle
                            size={10}
                            className="text-stone-300"
                          />
                          <span className="text-[9px] px-2 py-0.5 rounded bg-stone-100 text-stone-500">
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

      {/* Variation Unlock Modal */}
      {variationUnlockModalOpen && variationUnlockItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-[#ece5d8] flex justify-between items-center bg-amber-50">
              <h3 className="font-black text-amber-800 flex items-center gap-2">
                <Scale size={20} className="text-stone-900" />
                ثبت Variation و بازگشایی سند
              </h3>
              <button
                onClick={() => {
                  setVariationUnlockModalOpen(false);
                  setVariationUnlockItem(null);
                  setVariationReason("");
                }}
                className="p-2 hover:bg-amber-200 rounded-full transition-colors text-amber-700"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 text-amber-800 text-xs font-bold leading-relaxed">
                شما در حال ثبت درخواست بازگشایی برای یک سند قطعی شده (Frozen)
                هستید. این عملیات نیازمند ثبت دلیل تغییر (Variation) است. پس از
                ثبت، این درخواست باید تایید شود تا سند مجدداً به کارتابل کارفرما
                برای بررسی بازگردد.
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-stone-700 flex items-center gap-2">
                  <MessageSquare size={14} className="text-stone-500" />
                  دلیل تغییر / شرح Variation
                </label>
                <textarea
                  value={variationReason}
                  onChange={(e) => setVariationReason(e.target.value)}
                  className="w-full bg-[#faf8f4] border border-[#e5ded0] rounded-2xl px-4 py-3 text-sm font-bold text-stone-700 outline-none focus:border-stone-500 focus:ring-4 focus:ring-stone-500/10 transition-all min-h-[120px] resize-none"
                  placeholder="دلیل بازگشایی و تغییرات مورد نیاز را به صورت کامل شرح دهید..."
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => {
                    setVariationUnlockModalOpen(false);
                    setVariationUnlockItem(null);
                    setVariationReason("");
                  }}
                  className="flex-1 py-3 rounded-xl bg-stone-100 text-stone-700 font-bold hover:bg-stone-200 transition-colors"
                >
                  انصراف
                </button>
                <button
                  onClick={handleVariationUnlockSubmit}
                  disabled={!variationReason.trim()}
                  className="flex-1 py-3 rounded-xl text-white font-bold shadow-lg transition-all bg-amber-500 hover:bg-amber-600 shadow-amber-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ثبت درخواست Variation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-md animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm text-center">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full mx-auto flex items-center justify-center mb-4">
              <AlertTriangle size={32} />
            </div>
            <h3 className="text-lg font-black text-stone-800">حذف آیتم</h3>
            <p className="text-sm text-stone-500 mt-2">
              آیا از حذف این مورد اطمینان دارید؟ عملیات غیرقابل بازگشت است.
            </p>
            <div className="flex gap-4 mt-6">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 py-3 rounded-xl bg-stone-100 text-stone-700 font-bold"
              >
                انصراف
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold"
              >
                تایید و حذف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Toast Notification System */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[200] flex items-center gap-3 bg-stone-900 text-white px-5 py-3.5 rounded-2xl shadow-xl shadow-stone-900/25 border border-stone-800 animate-slideUp" dir="rtl">
          {toast.type === 'success' ? (
            <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Check size={16} />
            </div>
          ) : toast.type === 'error' ? (
            <div className="w-6 h-6 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center shrink-0">
              <AlertTriangle size={16} />
            </div>
          ) : (
            <div className="w-6 h-6 rounded-lg bg-[#faf8f4]0/20 text-amber-400 flex items-center justify-center shrink-0">
              <Info size={16} />
            </div>
          )}
          <p className="text-[11px] font-black font-sans leading-none">{toast.message}</p>
        </div>
      )}
    </div>
  );
}
