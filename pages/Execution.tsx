import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  HardHat,
  CloudSun,
  Calendar,
  Users,
  Hammer,
  Plus,
  Trash2,
  Edit3,
  Save,
  Eye,
  ClipboardCheck,
  Building2,
  ArrowLeftRight,
  BarChart3,
  TrendingUp,
  Info,
  Printer,
  X,
  PlusCircle,
  MinusCircle,
  CheckCircle,
  FileText,
  AlertTriangle,
  Layers,
  Sparkles,
  RefreshCw,
  Search,
  ScrollText,
  Bell,
  ArrowLeftCircle,
  User,
  Send,
  Check,
  RotateCcw,
  CornerUpLeft,
  Undo2,
  ShieldCheck
} from "lucide-react";
import { 
  Project, 
  EstimateItem, 
  ProjectMinute, 
  MetreRow,
  WorkflowStatus, 
  WorkflowEvent, 
  WorkflowAction,
  DailyReport,
  DailyReportLabor,
  DailyReportMachine,
  DailyReportMaterial,
  DailyReportWorkItem,
  DailyReportProblem,
  MivRecord,
  MivMaterialItem,
  Notification
} from "../types";
import { MOCK_PROJECTS, MOCK_PRICE_LISTS, DEFAULT_CBS_NODES, CbsNode } from "../constants";
import { SystemAdminService } from "../services/systemAdminService";
import { WorkflowService } from "../services/workflowService";
import { HRService } from "../services/hrService";
import { formatUserDisplayFormal } from "../src/utils/userFormatter";
import { ModuleId, OrganizationType, SystemUser } from "../systemAdminTypes";
import { NotificationService } from "../services/notificationService";
import { ShamsiDatePicker } from "../components/ShamsiDatePicker";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Line,
  Area,
  AreaChart
} from "recharts";

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
  // 2. Remove all non-numeric characters (dots, slashes, spaces, etc.)
  cleaned = cleaned.replace(/[^0-9]/g, "");
  return cleaned;
};

export default function Execution() {
  // --- Standard LocalStorage Loader ---
  const loadData = (key: string, defaultValue: any) => {
    try {
      const saved = localStorage.getItem(key);
      return saved && saved !== "undefined" ? JSON.parse(saved) : defaultValue;
    } catch (e) {
      return defaultValue;
    }
  };

  const getStatusBadgeClass = (status: WorkflowStatus) => {
    switch (status) {
      case WorkflowStatus.DRAFT:
        return "bg-stone-100 text-stone-700";
      case WorkflowStatus.IN_REVIEW:
      case WorkflowStatus.IN_CONSULTANT_REVIEW:
      case WorkflowStatus.IN_EMPLOYER_REVIEW:
      case WorkflowStatus.SENT_TO_CONSULTANT:
      case WorkflowStatus.SENT_TO_EMPLOYER:
        return "bg-amber-150 text-amber-800 bg-amber-50";
      case WorkflowStatus.REJECTED:
        return "bg-rose-50 text-rose-700";
      case WorkflowStatus.APPROVED_BY_CONSULTANT:
      case WorkflowStatus.APPROVED_INTERNAL:
        return "bg-emerald-50 text-emerald-700 font-black";
      default:
        return "bg-stone-100 text-stone-700";
    }
  };

  // --- Loaded users & active session context ---
  const [currentUser, setCurrentUser] = useState<SystemUser | null>(() => SystemAdminService.getCurrentUser());

  useEffect(() => {
    const handleUserChange = () => {
      setCurrentUser(SystemAdminService.getCurrentUser());
    };
    window.addEventListener("storage", handleUserChange);
    window.addEventListener("user-changed", handleUserChange);
    return () => {
      window.removeEventListener("storage", handleUserChange);
      window.removeEventListener("user-changed", handleUserChange);
    };
  }, []);

  const [projects, setProjects] = useState<Project[]>(() => {
    const loaded = loadData("hamyar_projects", MOCK_PROJECTS);
    if (Array.isArray(loaded)) {
      return loaded.filter((p: any) => p.id !== '2' && !String(p.title || '').includes('تصفیه‌خانه مرکزی') && !String(p.title || '').includes('تسویه خانه مرکزی') && !String(p.title || '').includes('نیایش'));
    }
    return loaded || [];
  });

  const accessibleProjects = useMemo(() => {
    return projects.filter((p: any) => SystemAdminService.canUserAccessProject(p.id, currentUser));
  }, [projects, currentUser]);

  // --- Core States ---
  const [selectedProjectId, setSelectedProjectId] = useState<string>(() => {
    const saved = localStorage.getItem("hamyar_selected_project_id");
    if (saved && saved !== "undefined" && saved !== "null") return saved;
    return "1";
  });

  useEffect(() => {
    if (accessibleProjects.length > 0 && !accessibleProjects.some(p => String(p.id) === String(selectedProjectId))) {
      setSelectedProjectId(String(accessibleProjects[0].id));
    }
  }, [accessibleProjects, selectedProjectId]);

  useEffect(() => {
    localStorage.setItem("hamyar_selected_project_id", selectedProjectId);
  }, [selectedProjectId]);

  const [activeTab, setActiveTab] = useState<"reports" | "materials" | "tech_office">("reports");
  const [reports, setReports] = useState<DailyReport[]>(() => loadData("hamyar_daily_reports", []));
  
  // Reload estimates whenever project changes or we switch to tech_office tab
  const [allEstimates, setAllEstimates] = useState<EstimateItem[]>([]);
  useEffect(() => {
    setAllEstimates(loadData("hamyar_estimates", []));
  }, [selectedProjectId, activeTab]);

  const estimates = useMemo(() => {
    return allEstimates.filter((e: any) => String(e.projectId) === String(selectedProjectId));
  }, [allEstimates, selectedProjectId]);

  const cbsNodes = useMemo<CbsNode[]>(() => {
    try {
      const saved = localStorage.getItem("hamyar_cbs_nodes");
      const allNodes: CbsNode[] = saved ? JSON.parse(saved) : DEFAULT_CBS_NODES;
      return allNodes.filter(n => (!selectedProjectId || n.projectId === selectedProjectId) && n.isActive !== false);
    } catch (e) {
      return DEFAULT_CBS_NODES;
    }
  }, [selectedProjectId]);

  const [mivList, setMivList] = useState<MivRecord[]>(() => loadData("hamyar_mivs", []));
  const [reportsSearchTerm, setReportsSearchTerm] = useState("");
  
  // Modal controllers
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<DailyReport | null>(null);
  const [viewingReport, setViewingReport] = useState<DailyReport | null>(null);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyItem, setHistoryItem] = useState<DailyReport | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [reportToDeleteId, setReportToDeleteId] = useState<string | null>(null);

  // Execution-specific Notifications State
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [highlightedRecordId, setHighlightedRecordId] = useState<string | null>(null);
  const unreadCount = useMemo(
    () => notifications.filter((n) => n.status === "UNREAD").length,
    [notifications]
  );

  // Load user execution-specific notifications
  useEffect(() => {
    if (currentUser) {
      setNotifications(
        NotificationService.getUserNotifications(currentUser.id).filter(
          (n) => n.module === "EXECUTION"
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
            (n) => n.module === "EXECUTION"
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

  const handleReportRowClick = (reportId: string) => {
    if (currentUser && unreadRecordIds.has(String(reportId))) {
      NotificationService.markRecordAsRead(String(reportId), currentUser.id);
      setUnreadRecordIds((prev) => {
        const next = new Set(prev);
        next.delete(String(reportId));
        return next;
      });
    }
  };

  // Listen for project change event
  useEffect(() => {
    const handleProjectChanged = (e?: Event) => {
      const customEvent = e as CustomEvent<{ projectId: string }>;
      const newProjId = customEvent?.detail?.projectId || localStorage.getItem("hamyar_selected_project_id");
      if (newProjId) {
        setSelectedProjectId(newProjId);
      }
    };
    window.addEventListener("project-changed", handleProjectChanged);
    return () => window.removeEventListener("project-changed", handleProjectChanged);
  }, []);

  // Listen for global notification clicks and load/deep link on mount
  useEffect(() => {
    const handleGlobalClick = (e: Event) => {
      const customEvent = e as CustomEvent<Notification>;
      if (customEvent.detail && customEvent.detail.module === "EXECUTION") {
        handleNotificationClick(customEvent.detail);
      }
    };
    window.addEventListener("hamyar-notification-clicked", handleGlobalClick);
    return () => {
      window.removeEventListener("hamyar-notification-clicked", handleGlobalClick);
    };
  }, [reports, currentUser]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const recordId = params.get("recordId");
    const projectId = params.get("projectId");
    const tab = params.get("tab");
    if (recordId && (tab === "reports" || !tab)) {
      if (projectId) {
        setSelectedProjectId(projectId);
      }
      const report = reports.find((r) => r.id === recordId);
      if (report) {
        setActiveTab("reports");
        setHighlightedRecordId(recordId);
        setTimeout(() => {
          const el = document.getElementById(`record-${recordId}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 200);
        setTimeout(() => {
          setHighlightedRecordId(null);
          window.history.replaceState({}, "", window.location.pathname);
        }, 3500);
      }
    }
  }, [reports]);

  const handleNotificationClick = (notification: Notification) => {
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
    }

    // Check if report exists
    const report = reports.find((r) => r.id === notification.recordId);
    if (!report) {
      NotificationService.markAsRead(notification.id);
      alert("این گزارش روزانه دیگر در دسترس نیست یا حذف شده است.");
      return;
    }

    // Mark as read
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

    // Set project ID and tab
    if (notification.projectId) {
      setSelectedProjectId(notification.projectId);
    }
    setActiveTab('reports');
    setHighlightedRecordId(notification.recordId);

    // Scroll to the row in the table
    setTimeout(() => {
      const el = document.getElementById(`record-${notification.recordId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 200);

    // Remove highlight after 3.5 seconds
    setTimeout(() => {
      setHighlightedRecordId(null);
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

  // Workflow Action Modal
  const [isWorkflowModalOpen, setIsWorkflowModalOpen] = useState(false);
  const [workflowTarget, setWorkflowTarget] = useState<DailyReport | null>(null);
  const [workflowActionType, setWorkflowActionType] = useState<WorkflowAction | null>(null);
  const [workflowComment, setWorkflowComment] = useState("");
  const [workflowAssignee, setWorkflowAssignee] = useState("");
  const [orgUsers, setOrgUsers] = useState<any[]>([]);
  const [attachWorkflowSignature, setAttachWorkflowSignature] = useState(true);

  // Integration states
  const [isMinuteGenerationOpen, setIsMinuteGenerationOpen] = useState(false);
  const [selectedWorkItemIds, setSelectedWorkItemIds] = useState<string[]>([]);
  const [minuteNumber, setMinuteNumber] = useState("");
  const [minuteDate, setMinuteDate] = useState("");
  const [minuteDesc, setMinuteDesc] = useState("");
  const [minuteLoc, setMinuteLoc] = useState("");
  const [minuteRecipient, setMinuteRecipient] = useState("");

  const currentProject = useMemo(() => {
    return projects.find((proj: any) => proj.id === selectedProjectId) || projects[0] || ({} as Project);
  }, [projects, selectedProjectId]);

  // Helper to extract role key from user title and organization
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
    if (titleLower.includes('سرپرست واحد') || titleLower.includes('سرپرست دفتر') || titleLower.includes('رئیس دفتر') || titleLower.includes('مدیر دفتر') || titleLower.includes('رئیس واحد') || titleLower.includes('سرپرست دفتر فنی') || titleLower.includes('مسئول دفتر فنی')) {
      return 'contractor_head';
    }
    return 'contractor_tech';
  }, []);

  // Resolve digital signature boxes for printing & report preview
  const getRoleSignatory = useCallback((roleKey: string, customData?: any) => {
    const users = SystemAdminService.getUsers();
    const proj = currentProject || projects.find((p: any) => String(p.id) === String(selectedProjectId)) || {};
    const targetObj = customData || viewingReport || {};
    const history = (targetObj?.workflowHistory || []) as any[];
    const isUnsigned = !!targetObj?.unsignedSession;

    if (isUnsigned) {
      if (roleKey === 'contractor_tech' || roleKey === 'permit_expert') {
        return { name: 'کارشناس / تنظیم‌کننده گزارش', title: 'بخش اجرایی و مهندسی کارگاه', signature: undefined, date: undefined };
      }
      if (roleKey === 'contractor_head' || roleKey === 'permit_head') {
        return { name: 'سرپرست واحد اجرایی', title: 'سرپرست واحد اجرایی پیمانکار', signature: undefined, date: undefined };
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
        return { name: 'کارشناس دستگاه کارفرما', title: 'دستگاه اجرایی و کارفرما', signature: undefined, date: undefined };
      }
      if (roleKey === 'employer_head') {
        return { name: 'سرپرست واحد / مدیر گروه', title: 'دستگاه اجرایی و کارفرما', signature: undefined, date: undefined };
      }
      if (roleKey === 'employer' || roleKey === 'employer_site') {
        return { name: 'مدیر طرح / نماینده کارفرما', title: 'دستگاه اجرایی و کارفرما', signature: undefined, date: undefined };
      }
      return null;
    }

    const reportSigs = (targetObj?.signatures || {}) as Record<string, any>;

    const findEventForRole = (targetRoleKey: string) => {
      const matchEvent = (e: any) => {
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
            return title.includes('کارشناس') || title.includes('دفتر فنی') || title.includes('اجرا') || title.includes('تهیه') || title.includes('عضو');
          }
          return false;
        }

        if (targetRoleKey === 'contractor_head' || targetRoleKey === 'permit_head') {
          if (e.action === 'APPROVE' && e.fromStatus === WorkflowStatus.DRAFT) return true;
          if (e.action === 'SIGN' || e.action === 'REPORT_SIGNATURE') {
            if (!isContractorOrg) return false;
            if (title.includes('سرپرست کارگاه') || title.includes('مدیر پروژه') || title.includes('رئیس کارگاه')) return false;
            return title.includes('سرپرست واحد') || title.includes('سرپرست دفتر') || title.includes('رئیس دفتر') || title.includes('مدیر دفتر') || title.includes('رئیس واحد');
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
            if (isEmployerOrg) return true;
            return title.includes('کارفرما') || title.includes('مدیر طرح') || title.includes('نماینده') || title.includes('مدیر پروژه');
          }
          return false;
        }

        return false;
      };

      const signedEv = [...history].reverse().find(e => matchEvent(e) && e.signature && e.action !== 'CREATE' && !(e.fromStatus === WorkflowStatus.DRAFT && e.toStatus === WorkflowStatus.DRAFT));
      if (signedEv) return signedEv;
      return [...history].reverse().find(e => matchEvent(e));
    };

    const matchedEv = findEventForRole(roleKey);
    if (matchedEv) {
      const allUsers = SystemAdminService.getUsers();
      const actorUser = allUsers.find(u => u.id === matchedEv.actorUserId || u.fullName === matchedEv.actorName || u.username === matchedEv.actorName);
      const actorOrg = actorUser?.orgId ? SystemAdminService.getOrganization(actorUser.orgId) : undefined;
      const formalName = actorUser ? formatUserDisplayFormal(actorUser, actorOrg) : (matchedEv.actorName || 'امضاء کننده گزارش');
      
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
      return { name: 'کارشناس / تنظیم‌کننده گزارش', title: 'بخش اجرایی و مهندسی کارگاه', signature: undefined, date: undefined };
    }
    if (roleKey === 'contractor_head' || roleKey === 'permit_head') {
      return { name: 'سرپرست واحد اجرایی', title: 'سرپرست واحد اجرایی پیمانکار', signature: undefined, date: undefined };
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
      return { name: 'کارشناس دستگاه کارفرما', title: 'دستگاه اجرایی و کارفرما', signature: undefined, date: undefined };
    }
    if (roleKey === 'employer_head') {
      return { name: 'سرپرست واحد / مدیر گروه', title: 'دستگاه اجرایی و کارفرما', signature: undefined, date: undefined };
    }
    if (roleKey === 'employer' || roleKey === 'employer_site') {
      return { name: 'مدیر طرح / نماینده کارفرما', title: 'دستگاه اجرایی و کارفرما', signature: undefined, date: undefined };
    }
    return null;
  }, [currentProject, projects, selectedProjectId, viewingReport]);

  // Extract unique approved materials from MIV for the current active project
  const approvedMivMaterials = useMemo(() => {
    const approvedMivs = mivList.filter(
      (m) =>
        m.projectId === selectedProjectId &&
        (m.status === WorkflowStatus.APPROVED_INTERNAL ||
         m.status === WorkflowStatus.APPROVED_BY_CONSULTANT ||
         m.status === ("APPROVED" as any))
    );
    
    // Group unique items by materialName
    const materialsMap: { [name: string]: { materialName: string; unit: string; approvedQty: number } } = {};
    
    approvedMivs.forEach(m => {
      (m.items || []).forEach(it => {
        if (!it.materialName) return;
        const key = `${it.materialName.trim()}_${(it.unit || "").trim()}`;
        if (!materialsMap[key]) {
          materialsMap[key] = {
            materialName: it.materialName.trim(),
            unit: (it.unit || "").trim(),
            approvedQty: 0
          };
        }
        materialsMap[key].approvedQty += it.quantity || 0;
      });
    });
    
    return Object.values(materialsMap);
  }, [mivList, selectedProjectId]);

  // Calculate total consumed quantity and remaining quantity for each approved material
  const mivConsumptionSummary = useMemo(() => {
    const consumptionMap: { [name: string]: number } = {};
    
    // Aggregate consumedQty from reports in the selected project
    reports
      .filter((r) => r.projectId === selectedProjectId)
      .forEach((r) => {
        (r.materials || []).forEach((m) => {
          if (!m.materialName) return;
          const key = m.materialName.trim();
          consumptionMap[key] = (consumptionMap[key] || 0) + (m.consumedQty || 0);
        });
      });

    return approvedMivMaterials.map((m) => {
      const consumed = consumptionMap[m.materialName.trim()] || 0;
      const remaining = Math.max(0, m.approvedQty - consumed);
      return {
        ...m,
        consumedQty: consumed,
        remainingQty: remaining,
      };
    });
  }, [approvedMivMaterials, reports, selectedProjectId]);

  // General Material Report aggregation across all reports (even non-MIV)
  const materialsGeneralReport = useMemo(() => {
    const reportMap: { [name: string]: { name: string; unit: string; totalReceived: number; totalConsumed: number } } = {};
    
    reports
      .filter((r) => r.projectId === selectedProjectId)
      .forEach((r) => {
        (r.materials || []).forEach((m) => {
          if (!m.materialName) return;
          const key = m.materialName.trim();
          if (!reportMap[key]) {
            reportMap[key] = {
              name: key,
              unit: m.unit || "واحد",
              totalReceived: 0,
              totalConsumed: 0
            };
          }
          reportMap[key].totalReceived += (m.receivedQty || 0);
          reportMap[key].totalConsumed += (m.consumedQty || 0);
        });
      });

    return Object.values(reportMap);
  }, [reports, selectedProjectId]);

  const handlePrintMaterialsReport = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const projectTitle = currentProject?.title || "---";
    const contractNumber = currentProject?.contractNumber || (currentProject as any)?.contractNumber || "---";
    const employerName = currentProject?.employerName || (currentProject as any)?.employer || "---";
    const consultantName = currentProject?.consultantName || (currentProject as any)?.consultant || "---";
    const contractorName = currentProject?.contractorName || (currentProject as any)?.contractor || "---";
    const reportDate = new Date().toLocaleDateString("fa-IR");

    const totalTypes = materialsGeneralReport.length;
    const totalReceivedSum = materialsGeneralReport.reduce((sum, m) => sum + m.totalReceived, 0);
    const totalConsumedSum = materialsGeneralReport.reduce((sum, m) => sum + m.totalConsumed, 0);
    const totalBalanceSum = totalReceivedSum - totalConsumedSum;

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

    const rows = materialsGeneralReport.map((m, idx) => {
      const balance = m.totalReceived - m.totalConsumed;
      return `
        <tr>
          <td style="text-align: center; font-weight: bold;">${(idx + 1).toLocaleString("fa-IR")}</td>
          <td style="font-weight: 800; text-align: right; color: #0f172a;">${m.name}</td>
          <td style="font-weight: bold; color: #059669; text-align: center;">${m.totalReceived.toLocaleString("fa-IR")}</td>
          <td style="font-weight: bold; color: #dc2626; text-align: center;">${m.totalConsumed.toLocaleString("fa-IR")}</td>
          <td style="font-weight: 900; color: #0f172a; text-align: center; background-color: #f1f5f9;">${balance.toLocaleString("fa-IR")}</td>
          <td style="text-align: center; color: #475569;">${m.unit}</td>
        </tr>
      `;
    }).join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="fa">
        <head>
          <meta charset="utf-8" />
          <title>گزارش تراز و گردش کلان مصالح پروژه - ${projectTitle}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;700;800;900&display=swap');
            @page {
              size: A4 portrait;
              margin: 10mm;
            }
            * { box-sizing: border-box; }
            body { 
              font-family: 'Vazirmatn', 'Tahoma', 'Segoe UI', Arial, sans-serif; 
              padding: 10px; 
              color: #0f172a; 
              line-height: 1.6; 
              direction: rtl; 
              text-align: right;
              background: #fff;
              font-size: 11px;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .header { 
              border: 2px solid #0f172a;
              border-radius: 6px;
              padding: 10px 16px;
              display: flex; 
              justify-content: space-between; 
              align-items: center; 
              margin-bottom: 12px;
              background: #fafafa;
            }
            .project-banner { 
              background-color: #f8fafc; 
              border: 1px solid #cbd5e1; 
              border-radius: 6px; 
              padding: 8px 12px; 
              font-size: 10.5px; 
              margin-bottom: 12px; 
              display: grid; 
              grid-template-columns: repeat(4, 1fr); 
              gap: 8px; 
            }
            .kpi-row {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 8px;
              margin-bottom: 12px;
            }
            .kpi-card {
              background: #ffffff;
              border: 1px solid #cbd5e1;
              border-radius: 6px;
              padding: 8px;
              text-align: center;
            }
            .kpi-label { font-size: 9px; color: #64748b; font-weight: bold; }
            .kpi-value { font-size: 14px; font-weight: 900; color: #0f172a; margin-top: 2px; }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-top: 8px; 
              margin-bottom: 16px; 
            }
            th, td { 
              border: 1px solid #94a3b8; 
              padding: 6px 8px; 
              font-size: 10px; 
            }
            th { 
              background-color: #f1f5f9; 
              font-weight: 900; 
              color: #0f172a;
              text-align: center;
            }
            tr:nth-child(even) { background-color: #f8fafc; }
            .signatures-container {
              border-top: 2px solid #0f172a;
              padding-top: 14px;
              margin-top: 24px;
              page-break-inside: avoid;
            }
            .sig-pillars {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 10px;
            }
            .sig-pillar-card {
              border: 1px solid #cbd5e1;
              border-radius: 6px;
              padding: 8px;
              background: #fafafa;
              text-align: center;
            }
            .sig-pillar-title {
              font-size: 10.5px;
              font-weight: 900;
              margin-bottom: 6px;
              padding-bottom: 4px;
              border-bottom: 1px solid #cbd5e1;
            }
            .sig-box-inner {
              border: 1px dashed #cbd5e1;
              background: #fff;
              border-radius: 4px;
              padding: 6px;
              min-height: 75px;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              margin-top: 6px;
            }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div style="font-size: 10px; font-weight: bold; line-height: 1.6;">
              <div>جمهوری اسلامی ایران</div>
              <div>سامانه جامع مدیریت و کنترل پروژه همیار</div>
            </div>
            <div style="text-align: center;">
              <h1 style="font-size: 15px; font-weight: 900; margin: 0 0 3px 0; color: #0f172a;">گزارش جامع تراز و گردش مصالح کارگاهی</h1>
              <div style="font-size: 11px; font-weight: bold; color: #1e40af;">واحد کنترل اجرای پروژه و مدیریت کارگاه</div>
            </div>
            <div style="text-align: left; font-size: 10px; font-weight: bold; line-height: 1.6;">
              <div>تاریخ چاپ: ${reportDate}</div>
              <div>وضعیت انبار: به‌روزرسانی نهایی</div>
            </div>
          </div>

          <div class="project-banner">
            <div><strong style="color: #64748b;">نام پروژه:</strong> <span style="font-weight: 800; color: #0f172a;">${projectTitle}</span></div>
            <div><strong style="color: #64748b;">شماره پیمان:</strong> <span style="font-weight: 800; color: #0f172a;">${contractNumber}</span></div>
            <div><strong style="color: #64748b;">کارفرما:</strong> <span style="font-weight: 800; color: #0f172a;">${employerName}</span></div>
            <div><strong style="color: #64748b;">مشاور / نظارت:</strong> <span style="font-weight: 800; color: #0f172a;">${consultantName}</span></div>
          </div>

          <div class="kpi-row">
            <div class="kpi-card">
              <div class="kpi-label">تعداد اقلام ثبت‌شده</div>
              <div class="kpi-value">${totalTypes.toLocaleString("fa-IR")} قلم</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">مجموع احجام وارده به کارگاه</div>
              <div class="kpi-value" style="color: #059669;">${totalReceivedSum.toLocaleString("fa-IR")}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">مجموع احجام مصرفی پای کار</div>
              <div class="kpi-value" style="color: #dc2626;">${totalConsumedSum.toLocaleString("fa-IR")}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">مانده موجودی کل انبار</div>
              <div class="kpi-value" style="color: #1e40af;">${totalBalanceSum.toLocaleString("fa-IR")}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 40px;">ردیف</th>
                <th style="text-align: right;">نام و شرح رده مصالح</th>
                <th style="width: 110px;">کل وارده به کارگاه</th>
                <th style="width: 110px;">کل مصرف‌شده</th>
                <th style="width: 120px;">مانده موجودی پای کار</th>
                <th style="width: 90px;">واحد سنجش</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>

          <div class="footer" style="margin-top: 25px; border-top: 2px solid #64748b; padding-top: 10px; width: 100%; page-break-inside: avoid; break-inside: avoid;">
            <div style="display: flex; flex-direction: row; justify-content: space-between; gap: 6px; width: 100%; box-sizing: border-box;">
              <!-- 1. پیمانکار -->
              <div style="flex: 1 1 0%; min-width: 0; border: 1px solid #93c5fd; background: #eff6ff; border-radius: 6px; padding: 4px; box-sizing: border-box;">
                <div style="font-weight: bold; font-size: 9px; color: #1e40af; text-align: center; border-bottom: 1px solid #bfdbfe; padding-bottom: 2px; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  پیمانکار: ${contractorName}
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
                  مشاور: ${consultantName}
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
                  کارفرما: ${employerName}
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
            window.onload = function() {
              setTimeout(() => {
                window.print();
              }, 350);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const userOrgType = useMemo(() => {
    if (!currentUser) return null;
    return SystemAdminService.getOrganization(currentUser.orgId)?.type;
  }, [currentUser]);

  // Candidates in own organization (following organization visibility rules)
  const techOfficeRecipientCandidates = useMemo(() => {
    if (!currentUser) return [];
    
    const isUserPm = (currentUser.jobTitle || "").includes("مدیر پروژه") || 
                     (currentUser.jobLevel || "").includes("مدیر پروژه") || 
                     (currentUser.role as string) === "PROJECT_MANAGER" || 
                     (currentUser.username || "").toLowerCase().includes("pm");
                     
    const isUserSuperintendent = (currentUser.jobTitle || "").includes("سرپرست کارگاه") || 
                                 (currentUser.jobLevel || "").includes("سرپرست کارگاه") || 
                                 (currentUser.username || "").toLowerCase().includes("superintendent");

    return SystemAdminService.getUsers().filter(u => {
      if (!u.isActive) return false;
      
      // Rule 1: "فقط کاربرهای سازمان خودش رو ببینه" (only see users of their own organization)
      if (u.orgId !== currentUser.orgId) return false;
      
      const isTargetPm = (u.jobTitle || "").includes("مدیر پروژه") || 
                         (u.jobLevel || "").includes("مدیر پروژه") || 
                         (u.role as string) === "PROJECT_MANAGER" || 
                         (u.username || "").toLowerCase().includes("pm");
                         
      // Rule 2: "مدیر پروژه سازمان کاربرهای خودش رو ببینه" (PM can see everyone in their org)
      // Rule 3: "سرپرست کارگاه هم همه کاربر ها رو ببینه در سازمان" (Superintendent can see everyone in their org)
      // Rule 4: "بقیه کاربرها مدیر پروژه سازمان رو نبینند" (Others can NOT see PM)
      if (!isUserPm && !isUserSuperintendent) {
        if (isTargetPm) return false;
      }
      
      return true;
    });
  }, [currentUser]);

  // Seeding initial Daily Reports if empty
  useEffect(() => {
    if (reports.length === 0 && selectedProjectId) {
      const mockReports: DailyReport[] = [
        {
          id: "rep-1",
          projectId: selectedProjectId,
          reportNumber: "1405-04-01",
          date: "1405/04/01",
          weather: "آفتابی",
          minTemp: 22,
          maxTemp: 34,
          dayShift: "DAY",
          preparedBy: "مجید",
          description: "عملیات خاکبرداری و آرماتوربندی فونداسیون زون A شروع گردید.",
          status: WorkflowStatus.APPROVED_BY_CONSULTANT,
          createdById: "majid",
          ownerOrgId: "org-3",
          currentOrgId: "org-2",
          workflowHistory: [
            {
              id: "ev-1",
              timestamp: Date.now() - 172800000,
              action: "SUBMIT",
              fromStatus: WorkflowStatus.DRAFT,
              toStatus: WorkflowStatus.SENT_TO_CONSULTANT,
              actorUserId: "majid",
              actorName: "مجید (کارشناس پیمانکار)"
            },
            {
              id: "ev-2",
              timestamp: Date.now() - 86400000,
              action: "APPROVE",
              fromStatus: WorkflowStatus.SENT_TO_CONSULTANT,
              toStatus: WorkflowStatus.APPROVED_BY_CONSULTANT,
              actorUserId: "iman",
              actorName: "ایمان (کارشناس مشاور)"
            }
          ],
          labor: [
            { id: "l-1", role: "کارگر ساده", count: 8, workHours: 8, organization: "پیمانکار عمومی" },
            { id: "l-2", role: "استادکار آرماتوربند", count: 4, workHours: 8, organization: "اکیپ آرماتوربندی قاسمی" },
            { id: "l-3", role: "جوشکار", count: 2, workHours: 8, organization: "پیمانکار عمومی" }
          ],
          machinery: [
            { id: "m-1", machineType: "بیل مکانیکی", count: 1, activeHours: 6, standbyHours: 2, status: "ACTIVE" },
            { id: "m-2", machineType: "کمپرسی", count: 2, activeHours: 5, standbyHours: 3, status: "ACTIVE" }
          ],
          materials: [
            { id: "mat-1", materialName: "میلگرد سایز ۱۸", receivedQty: 12, consumedQty: 4.5, unit: "تن" },
            { id: "mat-2", materialName: "بتن آماده C25", receivedQty: 0, consumedQty: 80, unit: "مترمکعب" }
          ],
          workItems: [
            { id: "wi-1", itemCode: "010101", description: "خاکبرداری در زمین‌های نرم", unit: "مترمکعب", quantity: 180, location: "فونداسیون زون A" },
            { id: "wi-2", itemCode: "030101", description: "تهیه و نصب میلگرد ساده آجدار", unit: "کیلوگرم", quantity: 4500, location: "ستون‌های همکف" }
          ],
          problems: [
            { id: "pr-1", description: "کاهش فشار آب کارگاهی جهت مرطوب‌سازی بتن", category: "TECHNICAL", impact: "LOW", resolved: true }
          ]
        },
        {
          id: "rep-2",
          projectId: selectedProjectId,
          reportNumber: "1405-04-02",
          date: "1405/04/02",
          weather: "غبارآلود",
          minTemp: 24,
          maxTemp: 36,
          dayShift: "DAY",
          preparedBy: "مجید",
          description: "ادامه اجرای آرماتوربندی زون B و قالب‌بندی دیواره‌ها.",
          status: WorkflowStatus.DRAFT,
          createdById: "majid",
          ownerOrgId: "org-3",
          currentOrgId: "org-3",
          workflowHistory: [],
          labor: [
            { id: "l-4", role: "کارگر ساده", count: 10, workHours: 8, organization: "پیمانکار عمومی" },
            { id: "l-5", role: "استادکار آرماتوربند", count: 5, workHours: 8, organization: "اکیپ قاسمی" }
          ],
          machinery: [
            { id: "m-3", machineType: "جرثقیل کارگاهی", count: 1, activeHours: 4, standbyHours: 4, status: "ACTIVE" }
          ],
          materials: [
            { id: "mat-3", materialName: "سیم آرماتوربندی", receivedQty: 100, consumedQty: 40, unit: "کیلوگرم" }
          ],
          workItems: [
            { id: "wi-3", itemCode: "010101", description: "خاکبرداری در زمین‌های نرم", unit: "مترمکعب", quantity: 120, location: "کانال تاسیسات شرقی" }
          ],
          problems: []
        }
      ];
      setReports(mockReports);
      localStorage.setItem("hamyar_daily_reports", JSON.stringify(mockReports));
    }
  }, [selectedProjectId, reports]);

  // Remove the redundant useEffect that uses setEstimates
  const saveReports = (newReports: DailyReport[]) => {
    setReports(newReports);
    localStorage.setItem("hamyar_daily_reports", JSON.stringify(newReports));
  };

  // --- Dynamic Form Handler States ---
  const [formNumber, setFormNumber] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formWeather, setFormWeather] = useState("آفتابی");
  const [formMinTemp, setFormMinTemp] = useState<number>(20);
  const [formMaxTemp, setFormMaxTemp] = useState<number>(30);
  const [formShift, setFormShift] = useState<"DAY" | "NIGHT" | "BOTH">("DAY");
  const [formDescriptionRows, setFormDescriptionRows] = useState<{ id: string; text: string }[]>([]);

  const [formLabor, setFormLabor] = useState<DailyReportLabor[]>([]);
  const [formMachinery, setFormMachinery] = useState<DailyReportMachine[]>([]);
  const [formMaterials, setFormMaterials] = useState<DailyReportMaterial[]>([]);
  const [formWorkItems, setFormWorkItems] = useState<DailyReportWorkItem[]>([]);
  const [formProblems, setFormProblems] = useState<DailyReportProblem[]>([]);

  // Search states for physical work items
  const [workItemSearchStates, setWorkItemSearchStates] = useState<{
    [rowId: string]: {
      isSearching: boolean;
      results: EstimateItem[];
    }
  }>({});

  // Helpers to add dynamic rows in form
  const addDescriptionRow = () => {
    setFormDescriptionRows([...formDescriptionRows, { id: "desc-" + Date.now(), text: "" }]);
  };
  const removeDescriptionRow = (id: string) => {
    setFormDescriptionRows(formDescriptionRows.filter(r => r.id !== id));
  };

  const addLaborRow = () => {
    setFormLabor([...formLabor, { id: "l-" + Date.now(), role: "", count: 1, workHours: 8, organization: "" }]);
  };
  const removeLaborRow = (id: string) => setFormLabor(formLabor.filter(r => r.id !== id));

  const addMachineryRow = () => {
    setFormMachinery([...formMachinery, { id: "m-" + Date.now(), machineType: "", count: 1, activeHours: 8, standbyHours: 0, status: "ACTIVE" }]);
  };
  const removeMachineryRow = (id: string) => setFormMachinery(formMachinery.filter(r => r.id !== id));

  const addMaterialRow = () => {
    setFormMaterials([...formMaterials, { id: "mat-" + Date.now(), materialName: "", receivedQty: 0, consumedQty: 0, unit: "" }]);
  };
  const removeMaterialRow = (id: string) => setFormMaterials(formMaterials.filter(r => r.id !== id));

  const addWorkItemRow = () => {
    setFormWorkItems([...formWorkItems, { id: "wi-" + Date.now(), itemCode: "", description: "", unit: "", quantity: 0, location: "", cbsNodeId: "", weightPercent: 0 }]);
  };
  const removeWorkItemRow = (id: string) => {
    const rowId = id;
    setFormWorkItems(formWorkItems.filter(r => r.id !== id));
    setWorkItemSearchStates(prev => {
      const copy = { ...prev };
      delete copy[rowId];
      return copy;
    });
  };

  const addProblemRow = () => {
    setFormProblems([...formProblems, { id: "pr-" + Date.now(), description: "", category: "TECHNICAL", impact: "LOW", resolved: false }]);
  };
  const removeProblemRow = (id: string) => setFormProblems(formProblems.filter(r => r.id !== id));

  const handleWorkItemSearch = (rowId: string, idx: number, query: string, priceListId?: string) => {
    const updated = [...formWorkItems];
    updated[idx].itemCode = query;
    if (priceListId !== undefined) {
      updated[idx].priceListId = priceListId;
    }
    setFormWorkItems(updated);

    if (query.trim().length >= 1) {
      const qLower = query.toLowerCase();
      const qClean = cleanCode(query);
      
      const targetPlId = priceListId || updated[idx].priceListId || "all";

      // Get all estimates for current project with safe ID comparisons
      let projEstimates = estimates.filter(est => String(est.projectId) === String(selectedProjectId));
      if (targetPlId !== "all") {
        projEstimates = projEstimates.filter(est => est.priceListId === targetPlId);
      }
      
      // Get all price list items for current project as well as system-wide standard price lists
      const priceListItems: EstimateItem[] = [];
      const rawPriceLists = [
        ...(currentProject?.priceLists || []),
        ...MOCK_PRICE_LISTS
      ];

      const combinedPriceLists = targetPlId !== "all"
        ? rawPriceLists.filter(pl => pl.id === targetPlId || pl.title === targetPlId)
        : rawPriceLists;

      combinedPriceLists.forEach((pl: any) => {
        if (pl.items) {
          pl.items.forEach((item: any) => {
            priceListItems.push({
              id: `pl-item-${item.code}`,
              projectId: selectedProjectId,
              code: item.code,
              description: item.description,
              unit: item.unit,
              quantity: 0,
              unitPrice: item.price || 0
            });
          });
        }
      });

      // Merge them, prioritizing project estimates to get real estimated quantities if available
      const mergedMap = new Map<string, EstimateItem>();
      priceListItems.forEach(item => {
        mergedMap.set(cleanCode(item.code), item);
      });
      projEstimates.forEach(est => {
        mergedMap.set(cleanCode(est.code), est);
      });

      const allSearchable = Array.from(mergedMap.values());

      const filtered = allSearchable.filter(est => 
        (est.code && cleanCode(est.code).includes(qClean)) || 
        (est.description && est.description.toLowerCase().includes(qLower))
      ).slice(0, 15);
      
      setWorkItemSearchStates(prev => ({
        ...prev,
        [rowId]: { isSearching: true, results: filtered }
      }));
    } else {
      setWorkItemSearchStates(prev => ({
        ...prev,
        [rowId]: { isSearching: false, results: [] }
      }));
    }
  };

  const selectWorkItemEstimate = (rowId: string, idx: number, est: EstimateItem) => {
    const updated = [...formWorkItems];
    updated[idx].itemCode = est.code;
    updated[idx].description = est.description;
    updated[idx].unit = est.unit;
    setFormWorkItems(updated);

    setWorkItemSearchStates(prev => ({
      ...prev,
      [rowId]: { isSearching: false, results: [] }
    }));
  };

  // --- Modal Openers ---
  const openCreateModal = () => {
    setMivList(loadData("hamyar_mivs", []));
    setEditingReport(null);
    setFormNumber(`1405-04-${(reports.length + 1).toString().padStart(2, '0')}`);
    setFormDate(`1405/04/${(reports.length + 1).toString().padStart(2, '0')}`);
    setFormWeather("آفتابی");
    setFormMinTemp(22);
    setFormMaxTemp(33);
    setFormShift("DAY");
    setFormDescriptionRows([{ id: "desc-seed-1", text: "" }]);
    
    // All sections start empty by default for a new daily report
    setFormLabor([]);
    setFormMachinery([]);
    setFormMaterials([]);
    setFormWorkItems([]);
    setFormProblems([]);
    
    setIsFormOpen(true);
  };

  const openEditModal = (report: DailyReport) => {
    setMivList(loadData("hamyar_mivs", []));
    setEditingReport(report);
    setFormNumber(report.reportNumber);
    setFormDate(report.date);
    setFormWeather(report.weather);
    setFormMinTemp(report.minTemp || 20);
    setFormMaxTemp(report.maxTemp || 30);
    setFormShift(report.dayShift);
    if (report.description) {
      setFormDescriptionRows(report.description.split("\n").map((text, idx) => ({ id: `desc-${idx}-${Date.now()}`, text })));
    } else {
      setFormDescriptionRows([{ id: "desc-seed-1", text: "" }]);
    }
    setFormLabor(report.labor || []);
    setFormMachinery(report.machinery || []);
    setFormMaterials(report.materials || []);
    setFormWorkItems(report.workItems || []);
    setFormProblems(report.problems || []);
    
    setIsFormOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    const joinedDesc = formDescriptionRows.map(r => r.text).filter(t => t.trim() !== "").join("\n");

    const reportData: DailyReport = {
      id: editingReport ? editingReport.id : "rep-" + Date.now(),
      projectId: selectedProjectId,
      reportNumber: formNumber,
      date: formDate,
      weather: formWeather,
      minTemp: formMinTemp,
      maxTemp: formMaxTemp,
      dayShift: formShift,
      preparedBy: editingReport ? editingReport.preparedBy : currentUser.fullName,
      description: joinedDesc,
      labor: formLabor,
      machinery: formMachinery,
      materials: formMaterials,
      workItems: formWorkItems,
      problems: formProblems,
      status: editingReport ? editingReport.status : WorkflowStatus.DRAFT,
      assigneeId: editingReport ? editingReport.assigneeId : undefined,
      createdById: editingReport ? editingReport.createdById : currentUser.id,
      ownerOrgId: editingReport ? editingReport.ownerOrgId : currentUser.orgId,
      currentOrgId: editingReport ? editingReport.currentOrgId : currentUser.orgId,
      workflowHistory: editingReport ? editingReport.workflowHistory : []
    };

    if (editingReport) {
      saveReports(reports.map(r => r.id === editingReport.id ? reportData : r));
      SystemAdminService.addAuditLog({
        user: currentUser?.id || 'admin',
        action: 'EDIT_DAILY_REPORT',
        details: `ویرایش گزارش روزانه شماره ${reportData.reportNumber || ''} مورخ ${reportData.date || ''}`,
        source: 'مدیریت اجرا (گزارش روزانه)',
        sourceType: 'EXECUTION'
      });
      alert(`گزارش روزانه شماره ${reportData.reportNumber} با موفقیت به روزرسانی شد.`);
    } else {
      saveReports([...reports, reportData]);
      SystemAdminService.addAuditLog({
        user: currentUser?.id || 'admin',
        action: 'CREATE_DAILY_REPORT',
        details: `ثبت گزارش روزانه جدید شماره ${reportData.reportNumber || ''} مورخ ${reportData.date || ''}`,
        source: 'مدیریت اجرا (گزارش روزانه)',
        sourceType: 'EXECUTION'
      });
      alert(`گزارش روزانه جدید شماره ${reportData.reportNumber} با موفقیت در وضعیت «پیش‌نویس» ثبت شد. هیچ‌گونه ارجاع خودکاری صورت نگرفت و دکمه‌های ارسال، ارجاع، ویرایش و حذف در دسترس شما قرار دارند.`);
    }
    setIsFormOpen(false);
  };

  // --- Deletion Handler ---
  const confirmDelete = (id: string) => {
    setReportToDeleteId(id);
    setIsDeleteModalOpen(true);
  };

  const executeDelete = () => {
    if (reportToDeleteId) {
      const targetReport = reports.find(r => r.id === reportToDeleteId);
      saveReports(reports.filter(r => r.id !== reportToDeleteId));
      if (targetReport) {
        SystemAdminService.addAuditLog({
          user: currentUser?.id || 'admin',
          action: 'DELETE_DAILY_REPORT',
          details: `حذف گزارش روزانه شماره ${targetReport.reportNumber || ''} مورخ ${targetReport.date || ''}`,
          source: 'مدیریت اجرا (گزارش روزانه)',
          sourceType: 'EXECUTION'
        });
      }
      setIsDeleteModalOpen(false);
      setReportToDeleteId(null);
    }
  };

  // --- Official Print Generator ---
  const printReportOfficial = () => {
    if (viewingReport) {
      handlePrintReport(viewingReport);
    }
  };

  // --- Dynamic Direct Print Generator ---
  const handlePrintReport = (report: DailyReport) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const projectTitle = currentProject?.title || "---";
    const projectEmployer = currentProject?.employerName || (currentProject as any)?.employer || "---";
    const projectConsultant = currentProject?.consultantName || (currentProject as any)?.consultant || "---";
    const projectContractor = currentProject?.contractorName || (currentProject as any)?.contractor || "---";
    const statusLabel = WorkflowService.getStatusLabel(report.status);
    const title = `گزارش رسمی روزانه کارگاه - شماره ${report.reportNumber || '---'} - ${projectTitle}`;

    // Build Labor rows
    const laborRows = report.labor.map((row, idx) => `
      <tr>
        <td style="padding: 5px; border: 1px solid #ddd;">${(idx + 1).toLocaleString("fa-IR")}</td>
        <td style="padding: 5px; border: 1px solid #ddd; font-weight: bold; text-align: right;">${row.role}</td>
        <td style="padding: 5px; border: 1px solid #ddd; font-weight: bold;">${row.count.toLocaleString("fa-IR")}</td>
        <td style="padding: 5px; border: 1px solid #ddd; font-weight: bold;">${row.workHours.toLocaleString("fa-IR")} ساعت</td>
        <td style="padding: 5px; border: 1px solid #ddd;">${row.organization || "پیمانکار اصلی"}</td>
      </tr>
    `).join("");

    // Build Machinery rows
    const machineryRows = report.machinery.map((row, idx) => `
      <tr>
        <td style="padding: 5px; border: 1px solid #ddd;">${(idx + 1).toLocaleString("fa-IR")}</td>
        <td style="padding: 5px; border: 1px solid #ddd; font-weight: bold; text-align: right;">${row.machineType}</td>
        <td style="padding: 5px; border: 1px solid #ddd; font-weight: bold;">${row.count.toLocaleString("fa-IR")}</td>
        <td style="padding: 5px; border: 1px solid #ddd; font-weight: bold;">${row.activeHours.toLocaleString("fa-IR")} ساعت</td>
        <td style="padding: 5px; border: 1px solid #ddd; font-weight: bold;">${row.standbyHours.toLocaleString("fa-IR")} ساعت</td>
        <td style="padding: 5px; border: 1px solid #ddd; font-weight: bold;">
          ${row.status === "ACTIVE" ? "فعال و آماده به خدمت" : row.status === "STANDBY" ? "آماده‌به‌کار پای رینگ" : "خراب / نیاز به تعمیرات"}
        </td>
      </tr>
    `).join("");

    // Build Work Items rows
    const workItemsRows = report.workItems.map((row, idx) => `
      <tr>
        <td style="padding: 5px; border: 1px solid #ddd;">${(idx + 1).toLocaleString("fa-IR")}</td>
        <td style="padding: 5px; border: 1px solid #ddd; font-family: monospace; font-weight: bold; color: #2563eb;">${row.itemCode || "آیتم آزاد"}</td>
        <td style="padding: 5px; border: 1px solid #ddd; font-weight: bold; text-align: right;">${row.description}</td>
        <td style="padding: 5px; border: 1px solid #ddd; font-weight: bold;">${row.quantity.toLocaleString("fa-IR")}</td>
        <td style="padding: 5px; border: 1px solid #ddd;">${row.unit}</td>
        <td style="padding: 5px; border: 1px solid #ddd; text-align: right;">${row.location}</td>
      </tr>
    `).join("");

    // Build Materials rows
    const materialsRows = (report.materials || []).map((row, idx) => `
      <tr>
        <td style="padding: 5px; border: 1px solid #ddd;">${(idx + 1).toLocaleString("fa-IR")}</td>
        <td style="padding: 5px; border: 1px solid #ddd; font-weight: bold; text-align: right;">${row.materialName}</td>
        <td style="padding: 5px; border: 1px solid #ddd; font-weight: bold; color: #059669;">${row.receivedQty > 0 ? row.receivedQty.toLocaleString("fa-IR") : "-"}</td>
        <td style="padding: 5px; border: 1px solid #ddd; font-weight: bold; color: #dc2626;">${row.consumedQty > 0 ? row.consumedQty.toLocaleString("fa-IR") : "-"}</td>
        <td style="padding: 5px; border: 1px solid #ddd;">${row.unit}</td>
      </tr>
    `).join("");

    const materialsSection = (report.materials && report.materials.length > 0) ? `
      <div style="margin-top: 25px; border: 1px solid #ccc; border-radius: 8px; overflow: hidden; background: #fff;">
        <div style="background: #f1f5f9; padding: 10px; font-weight: bold; font-size: 11px; border-bottom: 1px solid #ccc; display: flex; justify-content: space-between;">
          <span>📦 دریافت و مصرف مصالح ساختمانی پای کار</span>
          <span>تعداد اقلام: ${report.materials.length.toLocaleString("fa-IR")}</span>
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 10px; text-align: center; margin: 0;">
          <thead>
            <tr style="background: #f8fafc;">
              <th style="padding: 5px; border: 1px solid #ddd; width: 50px;">ردیف</th>
              <th style="padding: 5px; border: 1px solid #ddd;">عنوان و شرح مصالح</th>
              <th style="padding: 5px; border: 1px solid #ddd; width: 140px;">مقدار وارده امروز</th>
              <th style="padding: 5px; border: 1px solid #ddd; width: 140px;">مقدار مصرفی امروز</th>
              <th style="padding: 5px; border: 1px solid #ddd; width: 90px;">واحد سنجش</th>
            </tr>
          </thead>
          <tbody>
            ${materialsRows}
          </tbody>
        </table>
      </div>
    ` : "";

    // Build Problems rows if any
    let problemsSection = "";
    if (report.problems && report.problems.length > 0) {
      const problemsRows = report.problems.map((row, idx) => `
        <tr>
          <td style="padding: 5px; border: 1px solid #ddd;">${(idx + 1).toLocaleString("fa-IR")}</td>
          <td style="padding: 5px; border: 1px solid #ddd; font-weight: bold; color: #991b1b; text-align: right;">${row.description}</td>
          <td style="padding: 5px; border: 1px solid #ddd;">${row.category === "TECHNICAL" ? "فنی" : row.category === "MATERIAL" ? "تامین مصالح" : "ماشین‌آلات/سایر"}</td>
          <td style="padding: 5px; border: 1px solid #ddd; font-weight: bold;">
            ${row.impact === "HIGH" ? "بسیار شدید" : row.impact === "MEDIUM" ? "متوسط" : "کم‌اثر"}
          </td>
          <td style="padding: 5px; border: 1px solid #ddd;">
            ${row.resolved ? "بله برطرف شد" : "خیر - کماکان فعال"}
          </td>
        </tr>
      `).join("");

      problemsSection = `
        <div style="margin-top: 25px; border: 1px solid #fca5a5; border-radius: 8px; overflow: hidden; background: #fff;">
          <div style="background: #fef2f2; padding: 10px; font-weight: bold; font-size: 11px; border-bottom: 1px solid #fca5a5; color: #991b1b; display: flex; justify-content: space-between;">
            <span>⚠️ موانع، مشکلات اجرایی و تاخیرات روزانه</span>
            <span>تعداد موارد: ${report.problems.length.toLocaleString("fa-IR")}</span>
          </div>
          <table style="width: 100%; border-collapse: collapse; font-size: 10px; text-align: center; margin: 0;">
            <thead>
              <tr style="background: #fff5f5;">
                <th style="padding: 5px; border: 1px solid #ddd; width: 50px;">ردیف</th>
                <th style="padding: 5px; border: 1px solid #ddd;">رویداد / شرح مکتوب مانع</th>
                <th style="padding: 5px; border: 1px solid #ddd; width: 110px;">طبقه‌بندی</th>
                <th style="padding: 5px; border: 1px solid #ddd; width: 100px;">شدت اثر</th>
                <th style="padding: 5px; border: 1px solid #ddd; width: 120px;">رفع اثر شد؟</th>
              </tr>
            </thead>
            <tbody>
              ${problemsRows}
            </tbody>
          </table>
        </div>
      `;
    }

    const descriptionLines = report.description ? report.description.split("\n").map((line, idx) => `
      <div style="display: flex; gap: 8px; margin-bottom: 6px; font-size: 11.5px; line-height: 1.6;">
        <span style="color: #64748b; font-weight: bold;">${(idx + 1).toLocaleString("fa-IR")}.</span>
        <p style="margin: 0; flex: 1;">${line}</p>
      </div>
    `).join("") : `<p style="margin: 0; color: #94a3b8; font-style: italic; font-size: 11.5px;">شرح مکتوبی برای این روز ثبت نشده است.</p>`;

    const renderPrintSignatureBox = (roleHeader: string, roleKey: string) => {
      const signatory = getRoleSignatory(roleKey, report);
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

    const contentHtml = `
      <div style="border-bottom: 2px solid #1e40af; padding-bottom: 15px; margin-bottom: 20px;">
        <h2 style="margin: 0; color: #1e40af; text-align: center; font-size: 16px;">گزارش رسمی روزانه عملیات کارگاهی</h2>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 15px; font-size: 11px; background: #f8fafc; padding: 10px; border-radius: 8px; border: 1px solid #e2e8f0;">
          <div><strong>پروژه:</strong> ${projectTitle}</div>
          <div><strong>شماره پیمان:</strong> ${currentProject?.contractNumber || "---"}</div>
          <div><strong>کارفرما:</strong> ${projectEmployer}</div>
          <div><strong>مشاور:</strong> ${projectConsultant}</div>
          <div><strong>پیمانکار:</strong> ${projectContractor}</div>
          <div><strong>شماره گزارش:</strong> <span style="font-family: monospace; font-weight: bold;">${report.reportNumber || "---"}</span></div>
          <div><strong>تاریخ صدور:</strong> ${report.date || "---"}</div>
          <div><strong>وضعیت جوی:</strong> ${report.weather || "---"}</div>
          <div><strong>دمای هوای کارگاه:</strong> ${report.minTemp ?? "---"}°C الی ${report.maxTemp ?? "---"}°C</div>
          <div><strong>شیفت فعالیت:</strong> ${report.dayShift === "DAY" ? "روزکار" : report.dayShift === "NIGHT" ? "شب‌کار" : "دو شیفت"}</div>
          <div><strong>وضعیت تایید سند:</strong> ${statusLabel}</div>
        </div>
      </div>

      <div style="margin-top: 20px;">
        <h3 style="border-bottom: 1px solid #eee; padding-bottom: 5px; font-size: 12px; color: #334155;">📝 شرح کلی کارها و مشاهدات مکتوب روزانه</h3>
        <div style="padding: 12px; background: #fff; border: 1px solid #eee; border-radius: 8px; min-height: 45px;">
          ${descriptionLines}
        </div>
      </div>

      <!-- 1. اکیپ‌های نیروی انسانی -->
      <div style="margin-top: 25px; border: 1px solid #ccc; border-radius: 8px; overflow: hidden; background: #fff;">
        <div style="background: #f1f5f9; padding: 10px; font-weight: bold; font-size: 11px; border-bottom: 1px solid #ccc; display: flex; justify-content: space-between;">
          <span>👷‍♂️ آمار و اکیپ‌های نیروی انسانی</span>
          <span>تعداد ردیف‌ها: ${report.labor.length.toLocaleString("fa-IR")}</span>
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 10px; text-align: center; margin: 0;">
          <thead>
            <tr style="background: #f8fafc;">
              <th style="padding: 5px; border: 1px solid #ddd; width: 50px;">ردیف</th>
              <th style="padding: 5px; border: 1px solid #ddd;">نقش / تخصص</th>
              <th style="padding: 5px; border: 1px solid #ddd; width: 90px;">تعداد (نفر)</th>
              <th style="padding: 5px; border: 1px solid #ddd; width: 140px;">ساعت کارکرد روزانه</th>
              <th style="padding: 5px; border: 1px solid #ddd;">سازمان / پیمانکار فرعی</th>
            </tr>
          </thead>
          <tbody>
            ${laborRows}
          </tbody>
        </table>
      </div>

      <!-- 2. ماشین‌آلات کارگاهی -->
      <div style="margin-top: 25px; border: 1px solid #ccc; border-radius: 8px; overflow: hidden; background: #fff;">
        <div style="background: #f1f5f9; padding: 10px; font-weight: bold; font-size: 11px; border-bottom: 1px solid #ccc; display: flex; justify-content: space-between;">
          <span>🚜 وضعیت و ساعت کار ماشین‌آلات کارگاهی</span>
          <span>تعداد دستگاه‌ها: ${report.machinery.length.toLocaleString("fa-IR")}</span>
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 10px; text-align: center; margin: 0;">
          <thead>
            <tr style="background: #f8fafc;">
              <th style="padding: 5px; border: 1px solid #ddd; width: 50px;">ردیف</th>
              <th style="padding: 5px; border: 1px solid #ddd;">دستگاه / خودرو</th>
              <th style="padding: 5px; border: 1px solid #ddd; width: 80px;">تعداد</th>
              <th style="padding: 5px; border: 1px solid #ddd; width: 110px;">ساعت کارکرد</th>
              <th style="padding: 5px; border: 1px solid #ddd; width: 110px;">ساعت آماده‌به‌کار</th>
              <th style="padding: 5px; border: 1px solid #ddd;">وضعیت فنی و کارگاهی</th>
            </tr>
          </thead>
          <tbody>
            ${machineryRows}
          </tbody>
        </table>
      </div>

      <!-- 3. احجام عملیات و کارکرد فیزیکی -->
      <div style="margin-top: 25px; border: 1px solid #ccc; border-radius: 8px; overflow: hidden; background: #fff;">
        <div style="background: #f1f5f9; padding: 10px; font-weight: bold; font-size: 11px; border-bottom: 1px solid #ccc; display: flex; justify-content: space-between;">
          <span>📐 احجام عملیات و کارکرد فیزیکی روزانه</span>
          <span>تعداد ردیف‌ها: ${report.workItems.length.toLocaleString("fa-IR")}</span>
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 10px; text-align: center; margin: 0;">
          <thead>
            <tr style="background: #f8fafc;">
              <th style="padding: 5px; border: 1px solid #ddd; width: 50px;">ردیف</th>
              <th style="padding: 5px; border: 1px solid #ddd; width: 110px;">کد آیتم فهرست</th>
              <th style="padding: 5px; border: 1px solid #ddd;">تفصیل شرح کارکرد فیزیکی اجرایی</th>
              <th style="padding: 5px; border: 1px solid #ddd; width: 120px;">حجم / مقدار اجرا شده</th>
              <th style="padding: 5px; border: 1px solid #ddd; width: 70px;">واحد</th>
              <th style="padding: 5px; border: 1px solid #ddd;">موقعیت دقیق ساختمانی در پروژه</th>
            </tr>
          </thead>
          <tbody>
            ${workItemsRows}
          </tbody>
        </table>
      </div>

      ${materialsSection}
      ${problemsSection}
    `;

    const execLogos = SystemAdminService.getProjectOrgLogos(currentProject);
    const execLogoHtml = [
      execLogos.employerLogo ? `<img src="${execLogos.employerLogo}" style="height: 40px; max-width: 90px; object-fit: contain;" alt="کارفرما" />` : '',
      execLogos.consultantLogo ? `<img src="${execLogos.consultantLogo}" style="height: 40px; max-width: 90px; object-fit: contain;" alt="مشاور" />` : '',
      execLogos.contractorLogo ? `<img src="${execLogos.contractorLogo}" style="height: 40px; max-width: 90px; object-fit: contain;" alt="پیمانکار" />` : ''
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
            table { width: 100%; border-collapse: collapse; font-size: 10px; text-align: center; margin: 0; }
            th, td { border: 1px solid #ddd; padding: 5px; }
            th { background: #f8fafc; font-weight: bold; }
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
              ${execLogoHtml || '<div class="logo-box"></div>'}
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
            window.onload = function() {
              setTimeout(() => {
                window.print();
                window.close();
              }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // --- Cumulative/General Print Generator ---
  const handlePrintAllReports = () => {
    const projectReports = reports.filter(r => r.projectId === selectedProjectId);
    if (projectReports.length === 0) return;

    // Sort reports by date
    const sortedReports = [...projectReports].sort((a, b) => a.date.localeCompare(b.date));

    // Aggregations
    const laborTotals: { [key: string]: { count: number, workHours: number, orgs: Set<string> } } = {};
    const machineTotals: { [key: string]: { count: number, activeHours: number, standbyHours: number } } = {};
    const workItemTotals: { [key: string]: { desc: string, quantity: number, unit: string, locations: Set<string> } } = {};
    let totalProblems = 0;
    let resolvedProblems = 0;

    sortedReports.forEach(report => {
      // Labor
      report.labor.forEach(l => {
        const key = l.role;
        if (!laborTotals[key]) {
          laborTotals[key] = { count: 0, workHours: 0, orgs: new Set() };
        }
        laborTotals[key].count += l.count;
        laborTotals[key].workHours += l.workHours;
        if (l.organization) laborTotals[key].orgs.add(l.organization);
      });

      // Machinery
      report.machinery.forEach(m => {
        const key = m.machineType;
        if (!machineTotals[key]) {
          machineTotals[key] = { count: 0, activeHours: 0, standbyHours: 0 };
        }
        machineTotals[key].count += m.count;
        machineTotals[key].activeHours += m.activeHours;
        machineTotals[key].standbyHours += m.standbyHours;
      });

      // Work Items
      report.workItems.forEach(w => {
        const key = w.itemCode || w.description;
        if (!workItemTotals[key]) {
          workItemTotals[key] = { desc: w.description, quantity: 0, unit: w.unit, locations: new Set() };
        }
        workItemTotals[key].quantity += w.quantity;
        if (w.location) workItemTotals[key].locations.add(w.location);
      });

      // Problems
      if (report.problems) {
        report.problems.forEach(p => {
          totalProblems++;
          if (p.resolved) resolvedProblems++;
        });
      }
    });

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const projectTitle = currentProject?.title || "---";

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
            <div style="font-size: 6.5px; color: #64748b;">${signatory.date || new Date().toLocaleDateString("fa-IR")}</div>
          </div>
        `;
      }
      
      const personName = signatory?.name ? `<div style="font-size: 7.5px; font-weight: bold; color: #334155; margin-bottom: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${signatory.name}">${signatory.name}</div>` : "";

      return `
        <div class="sig-box" style="flex: 1 1 0%; min-width: 0; text-align: center; background: #ffffff; border: 1px dashed #cbd5e1; border-radius: 4px; padding: 3px 2px; box-sizing: border-box; overflow: hidden;">
          <p style="font-weight: bold; font-size: 8px; margin: 0 0 1px 0; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${roleHeader}">${roleHeader}</p>
          ${personName}
          <div style="height: 26px; display: flex; align-items: center; justify-content: center; font-size: 7px; color: #94a3b8; font-style: italic;">مهر / امضاء</div>
          <div class="sig-line" style="border-top: 1px dashed #cbd5e1; padding-top: 1px; font-size: 7px; color: #64748b;">نام و امضاء</div>
        </div>
      `;
    };

    // Build summary rows for each daily report
    const summaryRows = sortedReports.map((r, idx) => `
      <tr>
        <td>${(idx + 1).toLocaleString("fa-IR")}</td>
        <td style="font-weight: bold;">${r.reportNumber}</td>
        <td>${r.date}</td>
        <td>${r.weather}</td>
        <td>${r.minTemp}° الی ${r.maxTemp}°</td>
        <td>${r.dayShift === "DAY" ? "روزکار" : r.dayShift === "NIGHT" ? "شب‌کار" : "دو شیفت"}</td>
        <td style="text-align: right; max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${r.description || "---"}</td>
        <td>${r.labor.length.toLocaleString("fa-IR")} ردیف</td>
        <td>${r.workItems.length.toLocaleString("fa-IR")} آیتم</td>
        <td style="font-weight: bold;">${WorkflowService.getStatusLabel(r.status)}</td>
      </tr>
    `).join("");

    // Build Labor rows
    const laborRows = Object.entries(laborTotals).map(([role, data], idx) => `
      <tr>
        <td>${(idx + 1).toLocaleString("fa-IR")}</td>
        <td style="font-weight: bold; text-align: right;">${role}</td>
        <td style="font-weight: bold;">${data.count.toLocaleString("fa-IR")} نفر-روز</td>
        <td style="font-weight: bold;">${data.workHours.toLocaleString("fa-IR")} ساعت</td>
        <td style="text-align: right;">${Array.from(data.orgs).join("، ") || "پیمانکار اصلی"}</td>
      </tr>
    `).join("");

    // Build Machinery rows
    const machineryRows = Object.entries(machineTotals).map(([machineType, data], idx) => `
      <tr>
        <td>${(idx + 1).toLocaleString("fa-IR")}</td>
        <td style="font-weight: bold; text-align: right;">${machineType}</td>
        <td style="font-weight: bold;">${data.count.toLocaleString("fa-IR")} دستگاه-روز</td>
        <td style="font-weight: bold;">${data.activeHours.toLocaleString("fa-IR")} ساعت</td>
        <td style="font-weight: bold;">${data.standbyHours.toLocaleString("fa-IR")} ساعت</td>
      </tr>
    `).join("");

    // Build Work Items rows
    const workItemsRows = Object.entries(workItemTotals).map(([code, data], idx) => `
      <tr>
        <td>${(idx + 1).toLocaleString("fa-IR")}</td>
        <td style="font-family: monospace;">${code}</td>
        <td style="font-weight: bold; text-align: right;">${data.desc}</td>
        <td style="font-weight: bold; color: #1e3a8a;">${data.quantity.toLocaleString("fa-IR")}</td>
        <td>${data.unit}</td>
        <td style="text-align: right;">${Array.from(data.locations).join("، ") || "بدون مشخصه"}</td>
      </tr>
    `).join("");

    const contractorName = currentProject?.contractorName || (currentProject as any)?.contractor || "---";
    const consultantName = currentProject?.consultantName || (currentProject as any)?.consultant || "---";
    const employerName = currentProject?.employerName || (currentProject as any)?.employer || "---";
    const contractNumber = currentProject?.contractNumber || (currentProject as any)?.contractNumber || "---";

    const totalLaborDays = Object.values(laborTotals).reduce((acc, curr) => acc + curr.count, 0);
    const totalLaborHours = Object.values(laborTotals).reduce((acc, curr) => acc + curr.workHours, 0);
    const totalMachineActiveHours = Object.values(machineTotals).reduce((acc, curr) => acc + curr.activeHours, 0);
    const title = `گزارش کلی و آمار تجمیعی کارگاه - ${projectTitle}`;

    const contentHtml = `
      <div style="border-bottom: 2px solid #1e40af; padding-bottom: 15px; margin-bottom: 20px;">
        <h2 style="margin: 0; color: #1e40af; text-align: center; font-size: 16px;">گزارش کلی و آمار تجمیعی کارگاهی عملیات اجرایی</h2>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 15px; font-size: 11px; background: #f8fafc; padding: 10px; border-radius: 8px; border: 1px solid #e2e8f0;">
          <div><strong>پروژه:</strong> ${projectTitle}</div>
          <div><strong>شماره پیمان:</strong> ${contractNumber}</div>
          <div><strong>کارفرما:</strong> ${employerName}</div>
          <div><strong>مشاور:</strong> ${consultantName}</div>
          <div><strong>پیمانکار:</strong> ${contractorName}</div>
          <div><strong>بازه زمانی گزارشات:</strong> از ${sortedReports[0]?.date || "---"} الی ${sortedReports[sortedReports.length - 1]?.date || "---"}</div>
          <div><strong>تعداد کل روزهای گزارش شده:</strong> ${projectReports.length.toLocaleString("fa-IR")} روز</div>
          <div><strong>کل کارکرد نیروی انسانی:</strong> ${totalLaborDays.toLocaleString("fa-IR")} نفر-روز (${totalLaborHours.toLocaleString("fa-IR")} ساعت)</div>
          <div><strong>کارکرد ماشین‌آلات فعال:</strong> ${totalMachineActiveHours.toLocaleString("fa-IR")} ساعت</div>
          <div><strong>کل موانع ثبت‌شده / رفع‌شده:</strong> ${totalProblems.toLocaleString("fa-IR")} / ${resolvedProblems.toLocaleString("fa-IR")}</div>
        </div>
      </div>

      <!-- 1. خلاصه وضعیت گزارشات روزانه -->
      <div style="margin-top: 20px; border: 1px solid #ccc; border-radius: 8px; overflow: hidden; background: #fff;">
        <div style="background: #f1f5f9; padding: 10px; font-weight: bold; font-size: 11px; border-bottom: 1px solid #ccc; display: flex; justify-content: space-between;">
          <span>📋 ۱. لیست عمومی گزارشات روزانه ثبت شده</span>
          <span>تعداد روزها: ${projectReports.length.toLocaleString("fa-IR")}</span>
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 10px; text-align: center; margin: 0;">
          <thead>
            <tr style="background: #f8fafc;">
              <th style="padding: 5px; border: 1px solid #ddd; width: 40px;">ردیف</th>
              <th style="padding: 5px; border: 1px solid #ddd; width: 90px;">شماره گزارش</th>
              <th style="padding: 5px; border: 1px solid #ddd; width: 80px;">تاریخ صدور</th>
              <th style="padding: 5px; border: 1px solid #ddd; width: 80px;">وضعیت جوی</th>
              <th style="padding: 5px; border: 1px solid #ddd; width: 80px;">محدوده دما</th>
              <th style="padding: 5px; border: 1px solid #ddd; width: 60px;">شیفت</th>
              <th style="padding: 5px; border: 1px solid #ddd; text-align: right;">خلاصه گزارش و توصیفات</th>
              <th style="padding: 5px; border: 1px solid #ddd; width: 70px;">نیروی کار</th>
              <th style="padding: 5px; border: 1px solid #ddd; width: 70px;">احجام کار</th>
              <th style="padding: 5px; border: 1px solid #ddd; width: 90px;">وضعیت تایید</th>
            </tr>
          </thead>
          <tbody>
            ${summaryRows}
          </tbody>
        </table>
      </div>

      <!-- 2. خلاصه کارکرد نیروی انسانی -->
      <div style="margin-top: 25px; border: 1px solid #ccc; border-radius: 8px; overflow: hidden; background: #fff;">
        <div style="background: #f1f5f9; padding: 10px; font-weight: bold; font-size: 11px; border-bottom: 1px solid #ccc; display: flex; justify-content: space-between;">
          <span>👷‍♂️ ۲. آمار و خلاصه کارکرد تجمیعی نیروی انسانی</span>
          <span>مجموع: ${totalLaborDays.toLocaleString("fa-IR")} نفر-روز</span>
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 10px; text-align: center; margin: 0;">
          <thead>
            <tr style="background: #f8fafc;">
              <th style="padding: 5px; border: 1px solid #ddd; width: 50px;">ردیف</th>
              <th style="padding: 5px; border: 1px solid #ddd; text-align: right;">نقش / تخصص نیروها</th>
              <th style="padding: 5px; border: 1px solid #ddd; width: 140px;">مجموع کارکرد</th>
              <th style="padding: 5px; border: 1px solid #ddd; width: 140px;">مجموع ساعت فعالیت</th>
              <th style="padding: 5px; border: 1px solid #ddd; text-align: right;">پیمانکاران همکار</th>
            </tr>
          </thead>
          <tbody>
            ${laborRows}
          </tbody>
        </table>
      </div>

      <!-- 3. خلاصه کارکرد ماشین‌آلات -->
      <div style="margin-top: 25px; border: 1px solid #ccc; border-radius: 8px; overflow: hidden; background: #fff;">
        <div style="background: #f1f5f9; padding: 10px; font-weight: bold; font-size: 11px; border-bottom: 1px solid #ccc; display: flex; justify-content: space-between;">
          <span>🚜 ۳. آمار و خلاصه کارکرد تجمیعی ماشین‌آلات کارگاهی</span>
          <span>ساعت فعال: ${totalMachineActiveHours.toLocaleString("fa-IR")} ساعت</span>
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 10px; text-align: center; margin: 0;">
          <thead>
            <tr style="background: #f8fafc;">
              <th style="padding: 5px; border: 1px solid #ddd; width: 50px;">ردیف</th>
              <th style="padding: 5px; border: 1px solid #ddd; text-align: right;">نوع دستگاه و ماشین‌آلات</th>
              <th style="padding: 5px; border: 1px solid #ddd; width: 140px;">مجموع دستگاه-روز</th>
              <th style="padding: 5px; border: 1px solid #ddd; width: 140px;">ساعت فعال</th>
              <th style="padding: 5px; border: 1px solid #ddd; width: 140px;">ساعت آماده‌به‌کار (Standby)</th>
            </tr>
          </thead>
          <tbody>
            ${machineryRows}
          </tbody>
        </table>
      </div>

      <!-- 4. احجام عملیات فیزیکی -->
      <div style="margin-top: 25px; border: 1px solid #ccc; border-radius: 8px; overflow: hidden; background: #fff;">
        <div style="background: #f1f5f9; padding: 10px; font-weight: bold; font-size: 11px; border-bottom: 1px solid #ccc; display: flex; justify-content: space-between;">
          <span>📐 ۴. احجام کلی عملیات فیزیکی اجرا شده</span>
          <span>تعداد اقلام: ${Object.keys(workItemTotals).length.toLocaleString("fa-IR")}</span>
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 10px; text-align: center; margin: 0;">
          <thead>
            <tr style="background: #f8fafc;">
              <th style="padding: 5px; border: 1px solid #ddd; width: 50px;">ردیف</th>
              <th style="padding: 5px; border: 1px solid #ddd; width: 110px;">کد ردیف / آیتم</th>
              <th style="padding: 5px; border: 1px solid #ddd; text-align: right;">تفصیل شرح و موضوع عملیات فیزیکی اجرایی</th>
              <th style="padding: 5px; border: 1px solid #ddd; width: 120px;">مجموع مقدار</th>
              <th style="padding: 5px; border: 1px solid #ddd; width: 80px;">واحد کالا</th>
              <th style="padding: 5px; border: 1px solid #ddd; text-align: right;">جبهه‌های فعال مصرفی</th>
            </tr>
          </thead>
          <tbody>
            ${workItemsRows}
          </tbody>
        </table>
      </div>
    `;

    const summaryLogos = SystemAdminService.getProjectOrgLogos(currentProject);
    const summaryLogoHtml = [
      summaryLogos.employerLogo ? `<img src="${summaryLogos.employerLogo}" style="height: 40px; max-width: 90px; object-fit: contain;" alt="کارفرما" />` : '',
      summaryLogos.consultantLogo ? `<img src="${summaryLogos.consultantLogo}" style="height: 40px; max-width: 90px; object-fit: contain;" alt="مشاور" />` : '',
      summaryLogos.contractorLogo ? `<img src="${summaryLogos.contractorLogo}" style="height: 40px; max-width: 90px; object-fit: contain;" alt="پیمانکار" />` : ''
    ].filter(Boolean).join('');

    printWindow.document.write(`
      <html dir="rtl">
        <head>
          <meta charset="utf-8" />
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
            table { width: 100%; border-collapse: collapse; font-size: 10px; text-align: center; margin: 0; }
            th, td { border: 1px solid #ddd; padding: 5px; }
            th { background: #f8fafc; font-weight: bold; }
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
              ${summaryLogoHtml || '<div class="logo-box"></div>'}
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
                  پیمانکار: ${contractorName}
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
                  مشاور: ${consultantName}
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
                  کارفرما: ${employerName}
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
            window.onload = function() {
              setTimeout(() => {
                window.print();
                window.close();
              }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // --- Workflow Handlers ---
  const handleWorkflowClick = (item: DailyReport, action: WorkflowAction) => {
    setWorkflowTarget(item);
    setWorkflowActionType(action);
    setWorkflowComment("");
    
    const userHrSig = currentUser ? (HRService.getUserSignature(currentUser) || currentUser?.signature) : undefined;
    setAttachWorkflowSignature(!!userHrSig);
    
    // Resolve candidates with organization and role-based visibility filters
    let users = SystemAdminService.getUsers().filter(u => u.isActive);
    
    if (currentUser) {
      users = users.filter(u => u.id !== currentUser.id && u.username !== currentUser.username);

      const isPmOrSuperintendent = (u: any) => {
        const title = (u.jobTitle || "").trim();
        const level = (u.jobLevel || "").trim();
        const role = (u.role as string) || "";
        return title.includes("مدیر پروژه") || 
               level.includes("مدیر پروژه") || 
               role === "PROJECT_MANAGER" ||
               title.includes("سرپرست کارگاه") || 
               level.includes("سرپرست کارگاه") ||
               (u.username || "").toLowerCase().includes("pm") ||
               (u.username || "").toLowerCase().includes("superintendent");
      };

      const isInterOrgAction = 
        action === "SEND_TO_CONSULTANT" || 
        action === "SEND_TO_EMPLOYER" || 
        action === "RETURN_TO_CONTRACTOR" || 
        action === "RETURN_TO_CONSULTANT";

      if (isInterOrgAction) {
        // Rule: Send to higher/other organization's superintendent and project manager
        const orgs = SystemAdminService.getOrganizations();
        let targetOrgId: string | undefined;

        if (action === "SEND_TO_CONSULTANT" || action === "RETURN_TO_CONSULTANT") {
          targetOrgId = orgs.find(o => o.type === OrganizationType.CONSULTANT)?.id;
        } else if (action === "SEND_TO_EMPLOYER") {
          targetOrgId = orgs.find(o => o.type === OrganizationType.EMPLOYER)?.id;
        } else if (action === "RETURN_TO_CONTRACTOR") {
          targetOrgId = orgs.find(o => o.type === OrganizationType.CONTRACTOR)?.id;
        }

        if (targetOrgId) {
          users = users.filter(u => u.orgId === targetOrgId && isPmOrSuperintendent(u));
        } else {
          users = [];
        }
      } else {
        // Intra-organizational actions: Submit, Reassign, Resubmit, Approve, Reject, etc.
        // Rule 1: "فقط کاربرهای سازمان خودش رو ببینه" (only see users of their own organization)
        users = users.filter(u => u.orgId === currentUser.orgId);

        const isUserPm = (currentUser.jobTitle || "").includes("مدیر پروژه") || 
                         (currentUser.jobLevel || "").includes("مدیر پروژه") || 
                         (currentUser.role as string) === "PROJECT_MANAGER" || 
                         (currentUser.username || "").toLowerCase().includes("pm");
                         
        const isUserSuperintendent = (currentUser.jobTitle || "").includes("سرپرست کارگاه") || 
                                     (currentUser.jobLevel || "").includes("سرپرست کارگاه") || 
                                     (currentUser.username || "").toLowerCase().includes("superintendent");

        users = users.filter(u => {
          const isTargetPm = (u.jobTitle || "").includes("مدیر پروژه") || 
                             (u.jobLevel || "").includes("مدیر پروژه") || 
                             (u.role as string) === "PROJECT_MANAGER" || 
                             (u.username || "").toLowerCase().includes("pm");
                             
          // Rule 2 & 3: PM and Superintendent see all users in their own org
          // Rule 4: "بقیه کاربرهای مدیر پروژه سازمان رو نبینند" (Others can NOT see PM)
          if (!isUserPm && !isUserSuperintendent) {
            if (isTargetPm) return false;
          }
          return true;
        });
      }
    }
    
    setOrgUsers(users);
    setWorkflowAssignee(""); // Always start as empty so they have to choose if required
    setIsWorkflowModalOpen(true);
  };

  const submitWorkflowTransition = () => {
    if (!workflowTarget || !workflowActionType || !currentUser) return;

    try {
      let targetOrgId: string | undefined;
      const orgs = SystemAdminService.getOrganizations();
      if (workflowActionType === "SEND_TO_CONSULTANT" || workflowActionType === "RETURN_TO_CONSULTANT") {
        const consultantOrg = orgs.find(o => o.type === OrganizationType.CONSULTANT);
        if (consultantOrg) targetOrgId = consultantOrg.id;
      } else if (workflowActionType === "SEND_TO_EMPLOYER") {
        const employerOrg = orgs.find(o => o.type === OrganizationType.EMPLOYER);
        if (employerOrg) targetOrgId = employerOrg.id;
      } else if (workflowActionType === "RETURN_TO_CONTRACTOR") {
        const contractorOrg = orgs.find(o => o.type === OrganizationType.CONTRACTOR);
        if (contractorOrg) targetOrgId = contractorOrg.id;
      } else {
        targetOrgId = currentUser.orgId;
      }

      const assigneeUser = SystemAdminService.getUsers().find(u => u.id === workflowAssignee) || orgUsers.find(u => u.id === workflowAssignee);
      const assigneeOrg = assigneeUser?.orgId ? SystemAdminService.getOrganization(assigneeUser.orgId) : undefined;
      const assigneeName = assigneeUser ? formatUserDisplayFormal(assigneeUser, assigneeOrg) : undefined;

      const hrSig = HRService.getUserSignature(currentUser) || currentUser?.signature;
      const selectedSignature = attachWorkflowSignature && hrSig ? hrSig : undefined;

      const payload = {
        assigneeId: workflowAssignee,
        assigneeName,
        comment: workflowComment,
        targetOrgId,
        signature: selectedSignature,
        attachSignature: !!attachWorkflowSignature,
        roleKey: getRoleKeyForUser(currentUser)
      };

      const updated = WorkflowService.performAction(
        workflowTarget,
        workflowActionType,
        currentUser,
        payload
      );

      saveReports(reports.map(r => r.id === workflowTarget.id ? (updated as DailyReport) : r));

      SystemAdminService.addAuditLog({
        user: currentUser?.id || 'admin',
        action: workflowActionType,
        details: `تغییر وضعیت گردش کار به [${workflowActionType}] برای گزارش روزانه شماره ${workflowTarget.reportNumber || ''} مورخ ${workflowTarget.date || ''}${workflowAssignee ? ` - ارجاع به: ${assigneeName || workflowAssignee}` : ''}`,
        source: 'مدیریت اجرا (گزارش روزانه)',
        sourceType: 'EXECUTION'
      });

      setIsWorkflowModalOpen(false);
      setWorkflowTarget(null);
      setWorkflowActionType(null);
    } catch (err: any) {
      alert("خطا در انجام عملیات گردش کار: " + err.message);
    }
  };

  // --- Integration with Technical Office ---
  const findPriceListItem = (code: string) => {
    if (!code) return null;
    
    const normalizedCode = cleanCode(code);
    if (!normalizedCode) return null;

    const stripZeros = (s: string) => s.replace(/^0+/, "");
    const strippedCode = stripZeros(normalizedCode);

    // 1. Search in current project estimates first (highest priority)
    const est = estimates.find((e) => {
      const ec = cleanCode(e.code);
      return ec === normalizedCode || (ec && stripZeros(ec) === strippedCode);
    });
    if (est)
      return {
        description: est.description,
        unit: est.unit,
        price: est.unitPrice,
      };

    // 2. Search in current project's price lists
    if (currentProject?.priceLists) {
      for (const pl of currentProject.priceLists) {
        if (!pl.items) continue;
        const item = pl.items.find((i) => {
          const ic = cleanCode(i.code);
          return ic === normalizedCode || (ic && stripZeros(ic) === strippedCode);
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
        return ic === normalizedCode || (ic && stripZeros(ic) === strippedCode);
      });
      if (item)
        return {
          description: item.description,
          unit: item.unit,
          price: item.price,
        };
    }

    // 4. Search in ALL estimates as a fallback (maybe from another project)
    const anyEst = allEstimates.find((e) => cleanCode(e.code) === normalizedCode);
    if (anyEst)
      return {
        description: anyEst.description,
        unit: anyEst.unit,
        price: anyEst.unitPrice,
      };

    // 5. Fallback: partial match in ALL estimates
    const partialEst = allEstimates.find((e) => cleanCode(e.code).includes(normalizedCode) || normalizedCode.includes(cleanCode(e.code)));
    if (partialEst)
      return {
        description: partialEst.description,
        unit: partialEst.unit,
        price: partialEst.unitPrice,
      };

    return null;
  };

  // Approved Work Items that can be turned into a Minute (صورت‌جلسه)
  const availableIntegratedItems = useMemo(() => {
    // Collect all workItems from reports regardless of status (as requested, so newly registered reports show up)
    const approvedReports = reports.filter(r => 
      String(r.projectId) === String(selectedProjectId)
    );

    const itemsList: {
      id: string;
      reportId: string;
      reportNumber: string;
      reportDate: string;
      itemCode: string;
      description: string;
      unit: string;
      quantity: number;
      location: string;
      isImported: boolean;
      importedMinuteId?: string;
      unitPrice?: number;
      officialDescription?: string;
      cbsNodeId?: string;
      weightPercent?: number;
    }[] = [];

    // Let's load imported link record to check if already generated
    const importedLogs = loadData("hamyar_execution_imported_items", {});

    approvedReports.forEach(rep => {
      rep.workItems.forEach(wi => {
        const itemInfo = findPriceListItem(wi.itemCode);
        itemsList.push({
          id: wi.id,
          reportId: rep.id,
          reportNumber: rep.reportNumber,
          reportDate: rep.date,
          itemCode: wi.itemCode,
          description: wi.description,
          unit: itemInfo ? itemInfo.unit : wi.unit,
          quantity: wi.quantity,
          location: wi.location,
          isImported: !!importedLogs[wi.id],
          importedMinuteId: importedLogs[wi.id],
          unitPrice: itemInfo ? itemInfo.price : 0,
          officialDescription: itemInfo ? itemInfo.description : "",
          cbsNodeId: wi.cbsNodeId,
          weightPercent: wi.weightPercent || 0
        });
      });
    });

    return itemsList;
  }, [reports, selectedProjectId, estimates]);

  // Open generation window
  const openMinuteGeneration = () => {
    if (selectedWorkItemIds.length === 0) {
      alert("لطفاً حداقل یک ردیف کارکرد تایید شده برای تجمیع انتخاب کنید.");
      return;
    }
    const sampleItem = availableIntegratedItems.find(i => selectedWorkItemIds.includes(i.id));
    
    // Fetch minutes registered in the Technical Office for the active project
    const existingMinutes: ProjectMinute[] = loadData("hamyar_minutes", []);
    const projectMinutes = existingMinutes.filter(m => m.projectId === selectedProjectId);
    
    let nextNum = "01";
    if (projectMinutes.length > 0) {
      // Find the maximum number from existing minutes and increment by 1
      const max = projectMinutes.reduce((acc, curr) => {
        let valStr = String(curr.number || "");
        // Convert Persian/Arabic digits to English digits
        const persianDigits = [/۰/g, /۱/g, /۲/g, /۳/g, /۴/g, /۵/g, /۶/g, /۷/g, /۸/g, /۹/g];
        const arabicDigits = [/٠/g, /١/g, /٢/g, /٣/g, /٤/g, /٥/g, /٦/g, /٧/g, /٨/g, /٩/g];
        for (let i = 0; i < 10; i++) {
          valStr = valStr.replace(persianDigits[i], String(i)).replace(arabicDigits[i], String(i));
        }
        const num = parseInt(valStr.replace(/[^0-9]/g, ""), 10) || 0;
        return Math.max(acc, num);
      }, 0);
      nextNum = (max + 1).toString().padStart(2, "0");
    }
    
    setMinuteNumber(nextNum);

    setMinuteDate(sampleItem ? sampleItem.reportDate : "1405/04/01");
    setMinuteDesc(`تجمیع کارکرد روزانه گزارشات کارگاهی`);
    setMinuteLoc(sampleItem ? sampleItem.location : "کارگاه مرکزی");
    
    // Do not auto-select recipient - require explicit user choice
    setMinuteRecipient("");
    
    setIsMinuteGenerationOpen(true);
  };

  // Generate the Technical Office Project Minute!
  const executeMinuteGeneration = () => {
    if (!minuteNumber.trim() || !currentUser) return;
    if (!minuteRecipient) {
      alert("لطفاً گیرنده را برای ارسال در سازمان انتخاب کنید.");
      return;
    }

    if (currentProject?.contractType === 'CBS') {
      try {
        const transferId = "cbs-tr-" + Date.now();
        const recipientUser = SystemAdminService.getUsers().find(u => u.id === minuteRecipient);
        const recipientOrg = recipientUser?.orgId ? SystemAdminService.getOrganization(recipientUser.orgId) : undefined;
        const recipientName = recipientUser ? formatUserDisplayFormal(recipientUser, recipientOrg) : "";

        // Collect selected items
        const selectedItems = availableIntegratedItems
          .filter(wi => selectedWorkItemIds.includes(wi.id))
          .map(wi => ({
            id: wi.id,
            reportId: wi.reportId,
            reportNumber: wi.reportNumber,
            reportDate: wi.reportDate,
            itemCode: wi.itemCode,
            cbsNodeId: wi.cbsNodeId,
            description: wi.description,
            unit: wi.unit,
            quantity: wi.quantity,
            location: wi.location,
            weightPercent: wi.weightPercent || 0,
          }));

        // Load existing CBS transfers
        const existingTransfers = loadData("hamyar_cbs_sent_transfers", []);
        const newTransfer = {
          id: transferId,
          projectId: selectedProjectId,
          sentBy: currentUser.id,
          sentByName: currentUser.fullName,
          recipientId: minuteRecipient,
          recipientName: recipientName,
          date: minuteDate,
          description: minuteDesc,
          status: 'SENT', // SENT or USED
          workItemIds: selectedWorkItemIds,
          items: selectedItems
        };

        localStorage.setItem("hamyar_cbs_sent_transfers", JSON.stringify([...existingTransfers, newTransfer]));

        // Mark these work items as imported in hamyar_execution_imported_items so they show as "Sent" in Execution tab
        const importedLogs = loadData("hamyar_execution_imported_items", {});
        selectedWorkItemIds.forEach(id => {
          importedLogs[id] = transferId;
        });
        localStorage.setItem("hamyar_execution_imported_items", JSON.stringify(importedLogs));

        // Send Notification to recipient in Technical Office
        if (minuteRecipient && minuteRecipient !== currentUser.id) {
          const recUser = SystemAdminService.getUsers().find(u => u.id === minuteRecipient);
          NotificationService.createNotification(
            'WORKFLOW',
            'SUBMIT',
            'STATEMENTS',
            {
              id: transferId,
              projectId: selectedProjectId,
              title: `کارکردهای ارسالی کارگاه (${selectedItems.length} ردیف)`,
              number: transferId,
              date: minuteDate
            },
            currentUser,
            minuteRecipient,
            recUser?.orgId || currentUser.orgId,
            `کارکردهای اجرایی کارگاه (${selectedItems.length} آیتم) مورخ ${minuteDate} توسط ${currentUser.fullName} جهت اعمال در صورت‌وضعیت به شما ارسال گردید.`
          );
        }

        alert(`کارکردهای انتخاب شده با موفقیت به بخش دفتر فنی برای کاربر ${recipientName} ارسال گردید!`);

        // Reset
        setSelectedWorkItemIds([]);
        setIsMinuteGenerationOpen(false);

        // Reload reports to refresh UI state
        const reloaded = loadData("hamyar_daily_reports", []);
        setReports(reloaded);
        return;
      } catch (err: any) {
        alert("خطا در ارسال کارکردها: " + err.message);
        return;
      }
    }

    try {
      const recipientUser = SystemAdminService.getUsers().find(u => u.id === minuteRecipient);
      const recipientOrg = recipientUser?.orgId ? SystemAdminService.getOrganization(recipientUser.orgId) : undefined;
      const recipientName = recipientUser ? formatUserDisplayFormal(recipientUser, recipientOrg) : "";

      // 1. Create the ProjectMinute Object in IN_REVIEW status
      const newMinuteId = "min-gen-" + Date.now();
      const newMinute: ProjectMinute = {
        id: newMinuteId,
        projectId: selectedProjectId,
        number: minuteNumber,
        date: minuteDate,
        description: minuteDesc,
        location: minuteLoc,
        status: WorkflowStatus.IN_REVIEW,
        assigneeId: minuteRecipient,
        assigneeName: recipientName,
        createdById: currentUser.id,
        ownerOrgId: currentUser.orgId,
        currentOrgId: currentUser.orgId,
        workflowHistory: [
          {
            id: "ev-" + Date.now(),
            timestamp: Date.now(),
            action: "SUBMIT",
            fromStatus: WorkflowStatus.DRAFT,
            toStatus: WorkflowStatus.IN_REVIEW,
            actorUserId: currentUser.id,
            actorName: `${currentUser.fullName} (ارسال خودکار از بخش اجرا)`
          }
        ]
      };

      // 2. Map selected Daily Work Items to MetreRows
      const existingMetres = loadData("hamyar_metres", []);
      const newMetres: MetreRow[] = availableIntegratedItems
        .filter(wi => selectedWorkItemIds.includes(wi.id))
        .map((wi, idx) => {
          // Find the official info using the helper
          const itemInfo = findPriceListItem(wi.itemCode);
          
          return {
            id: `metre-gen-${wi.id}-${idx}`,
            projectId: selectedProjectId,
            minuteId: newMinuteId,
            itemCode: toEnglishDigits(wi.itemCode),
            description: itemInfo ? itemInfo.description : `کارکرد روزانه گزارش ${wi.reportNumber} - محل: ${wi.location}`,
            unit: itemInfo ? itemInfo.unit : wi.unit,
            unitPrice: itemInfo ? itemInfo.price : 0,
            count: 1,
            length: wi.quantity, // map executed quantity to length as a single direct row
            width: 1,
            height: 1,
            multiplier: 1,
            partialTotal: wi.quantity,
            contractorCount: 1,
            contractorLength: wi.quantity,
            contractorTotal: wi.quantity,
            isManualPartialTotal: true
          };
        });

      // 3. Save into hamyar_minutes & hamyar_metres
      const existingMinutes = loadData("hamyar_minutes", []);
      localStorage.setItem("hamyar_minutes", JSON.stringify([...existingMinutes, newMinute]));
      localStorage.setItem("hamyar_metres", JSON.stringify([...existingMetres, ...newMetres]));

      // 4. Mark these work items as imported in hamyar_execution_imported_items
      const importedLogs = loadData("hamyar_execution_imported_items", {});
      selectedWorkItemIds.forEach(id => {
        importedLogs[id] = newMinuteId;
      });
      localStorage.setItem("hamyar_execution_imported_items", JSON.stringify(importedLogs));

      // Send Notification to recipient in Technical Office
      if (minuteRecipient && minuteRecipient !== currentUser.id) {
        const recUser = SystemAdminService.getUsers().find(u => u.id === minuteRecipient);
        NotificationService.createNotification(
          'WORKFLOW',
          'SUBMIT',
          'MINUTES',
          newMinute,
          currentUser,
          minuteRecipient,
          recUser?.orgId || currentUser.orgId,
          `صورت‌جلسه کارگاهی جدید شماره «${newMinute.number}» با تجمیع کارکردهای بخش اجرا توسط ${currentUser.fullName} صادر و به شما ارجاع گردید.`
        );
      }

      alert(`صورت‌جلسه کارگاهی با شماره ${minuteNumber} به صورت پیش‌نویس در بخش دفتر فنی با موفقیت ایجاد گردید!`);
      
      // Reset
      setSelectedWorkItemIds([]);
      setIsMinuteGenerationOpen(false);
      
      // Reload reports to refresh UI state
      const reloaded = loadData("hamyar_daily_reports", []);
      setReports(reloaded);
    } catch (err: any) {
      alert("خطا در صدور صورت‌جلسه: " + err.message);
    }
  };

  // Toggle selection
  const toggleWorkItemSelection = (id: string) => {
    if (selectedWorkItemIds.includes(id)) {
      setSelectedWorkItemIds(selectedWorkItemIds.filter(x => x !== id));
    } else {
      setSelectedWorkItemIds([...selectedWorkItemIds, id]);
    }
  };

  // --- Integration with Planning & Control ---
  // Physical Progress data based on Approved executed Quantities compared to Estimate Quantities!
  const progressMetrics = useMemo(() => {
    if (estimates.length === 0) return [];

    // 1. Load formal quantities from Project Minutes (MetreRows)
    // These take precedence if the minute is approved
    const minutes: ProjectMinute[] = loadData("hamyar_minutes", []);
    const allMetres: MetreRow[] = loadData("hamyar_metres", []);
    const importedLogs = loadData("hamyar_execution_imported_items", {}); // wi.id -> minuteId

    // Map Minute ID to its status
    const minuteStatusMap: { [id: string]: ProjectMinute } = {};
    minutes.forEach(m => { minuteStatusMap[m.id] = m; });

    // Aggregate totals from Daily Reports (for non-formalized or pre-formalized work)
    const totalsByCode: { [code: string]: number } = {};

    // Helper to check if a status is "Approved enough" to count towards progress
    const isApprovedStatus = (status: WorkflowStatus | undefined) => {
      if (!status) return false;
      return [
        WorkflowStatus.APPROVED_BY_CONSULTANT,
        WorkflowStatus.SENT_TO_EMPLOYER,
        WorkflowStatus.IN_EMPLOYER_REVIEW,
        WorkflowStatus.APPROVED_INTERNAL // Could be final employer approval
      ].includes(status as any);
    };

    // First, process all Daily Reports
    reports
      .filter(r => String(r.projectId) === String(selectedProjectId))
      .forEach(r => {
        const isReportApproved = isApprovedStatus(r.status);
        
        r.workItems.forEach(wi => {
          if (!wi.itemCode) return;

          const minuteId = importedLogs[wi.id];
          const minute = minuteId ? minuteStatusMap[minuteId] : null;

          if (minute) {
            // This item is formalized in a Minute.
            // Check if the Minute itself is approved.
            const isMinuteApproved = isApprovedStatus(minute.status) || minute.isFinalFrozen;

            if (isMinuteApproved) {
              // We should count the quantity from the MetreRow (formal quantity) 
              // to reflect any edits made in technical office.
              // We'll find the linked metre row.
              const linkedMetre = allMetres.find(m => m.minuteId === minuteId && m.itemCode === wi.itemCode && m.id.includes(wi.id));
              if (linkedMetre) {
                // Determine the most "final" quantity available
                let formalQty = linkedMetre.partialTotal || linkedMetre.contractorTotal || wi.quantity;
                
                if (minute.isFinalFrozen || minute.status === WorkflowStatus.APPROVED_INTERNAL) {
                   // Employer approval
                   formalQty = linkedMetre.employerTotal ?? linkedMetre.consultantTotal ?? formalQty;
                } else if (minute.status === WorkflowStatus.APPROVED_BY_CONSULTANT || 
                           minute.status === WorkflowStatus.SENT_TO_EMPLOYER || 
                           minute.status === WorkflowStatus.IN_EMPLOYER_REVIEW) {
                   // Consultant approved
                   formalQty = linkedMetre.consultantTotal ?? formalQty;
                }

                totalsByCode[wi.itemCode] = (totalsByCode[wi.itemCode] || 0) + formalQty;
                return; // Stop here for this work item, we used the formal quantity
              }
            }
          }

          // If we reach here, it's either not in a minute, or the minute isn't approved yet.
          // Use the daily report quantity if the report is approved.
          if (isReportApproved) {
            totalsByCode[wi.itemCode] = (totalsByCode[wi.itemCode] || 0) + wi.quantity;
          }
        });
      });

    return estimates.map(e => {
      const executed = totalsByCode[e.code] || 0;
      const progressPercent = e.quantity > 0 ? (executed / e.quantity) * 100 : 0;
      return {
        code: e.code,
        description: e.description,
        unit: e.unit,
        estimateQty: e.quantity,
        executedQty: executed,
        percent: parseFloat(progressPercent.toFixed(1)),
        isExceeded: executed > e.quantity
      };
    });
  }, [reports, estimates, selectedProjectId]);

  // --- Charts Data Aggregations ---
  const laborChartData = useMemo(() => {
    // Accumulate total labor workforce (headcount) per report date
    const sortedReports = [...reports]
      .filter(r => r.projectId === selectedProjectId)
      .sort((a, b) => a.date.localeCompare(b.date));

    return sortedReports.map(r => {
      const totalWorkers = r.labor.reduce((sum, l) => sum + l.count, 0);
      const totalHours = r.labor.reduce((sum, l) => sum + (l.count * l.workHours), 0);
      return {
        date: r.date,
        'نفرات (تعداد)': totalWorkers,
        'نفر-ساعت کارکرد': totalHours
      };
    });
  }, [reports, selectedProjectId]);

  const machineryChartData = useMemo(() => {
    const sortedReports = [...reports]
      .filter(r => r.projectId === selectedProjectId)
      .sort((a, b) => a.date.localeCompare(b.date));

    return sortedReports.map(r => {
      const totalActive = r.machinery.reduce((sum, m) => sum + m.activeHours, 0);
      const totalStandby = r.machinery.reduce((sum, m) => sum + m.standbyHours, 0);
      return {
        date: r.date,
        'ساعت فعال': totalActive,
        'ساعت آماده‌به‌کار': totalStandby
      };
    });
  }, [reports, selectedProjectId]);

  return (
    <div className="theme-adaptive-module space-y-6 pb-12 text-right text-stone-900 dark:text-slate-100" dir="rtl">
      {/* HEADER BAR */}
      <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-stone-200/80 dark:border-slate-800 shadow-sm flex flex-col xl:flex-row justify-between items-center gap-8">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-stone-900 dark:bg-slate-800 rounded-[1.5rem] flex items-center justify-center text-amber-500 shadow-2xl shadow-stone-500/20 border border-transparent dark:border-slate-700">
            <HardHat size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-stone-900 dark:text-white tracking-tight">
              میز عملیات اجرایی هوشمند
            </h2>
            <p className="text-stone-500 dark:text-slate-400 text-xs font-bold mt-1">
              گزارشات روزانه، مدیریت نیروی انسانی و ماشین‌آلات کارگاهی
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
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

          <button
            onClick={handlePrintAllReports}
            className="flex items-center gap-2 bg-stone-100 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 text-stone-700 dark:text-slate-200 px-4 py-2.5 rounded-xl text-xs font-black hover:bg-stone-200 dark:hover:bg-slate-700 transition-all shadow-sm cursor-pointer"
          >
            <Printer size={18} /> چاپ رسمی گزارش کلی
          </button>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex flex-wrap gap-1.5 p-1.5 bg-stone-100/80 dark:bg-slate-800/80 rounded-[1.8rem] border border-stone-200/50 dark:border-slate-700/60">
        <button
          onClick={() => setActiveTab("reports")}
          className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-black transition-all cursor-pointer ${
            activeTab === "reports"
              ? "bg-stone-900 text-white shadow-sm scale-105"
              : "text-stone-600 dark:text-slate-300 hover:text-stone-900 dark:hover:text-white"
          }`}
        >
          <FileText size={16} /> گزارشات روزانه کارگاهی
        </button>
        <button
          onClick={() => setActiveTab("materials")}
          className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-black transition-all ${
            activeTab === "materials"
              ? "bg-stone-900 text-white shadow-sm scale-105"
              : "text-stone-600 hover:text-stone-900"
          }`}
        >
          <Layers size={16} /> کنترل مصالح مصرفی
        </button>
        <button
          onClick={() => setActiveTab("tech_office")}
          className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-black transition-all relative ${
            activeTab === "tech_office"
              ? "bg-stone-900 text-white shadow-sm scale-105"
              : "text-stone-600 hover:text-stone-900"
          }`}
        >
          <ArrowLeftRight size={16} /> انطباق با دفتر فنی
          <span className="absolute -top-1 -left-1 px-1.5 py-0.5 bg-rose-500 text-white text-[8px] font-black rounded-full animate-bounce">
            جدید
          </span>
        </button>
      </div>

      {/* --- CONTENT AREA --- */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-[#ece5d8] shadow-sm min-h-[500px]">
        {/* TAB 1: REPORTS */}
        {activeTab === "reports" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#ece5d8] pb-4">
              <h3 className="font-black text-stone-800 text-lg flex items-center gap-2">
                <FileText size={20} className="text-stone-500" /> لیست گزارشات روزانه کارگاه
              </h3>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs bg-stone-100 px-3 py-1.5 rounded-full font-bold text-stone-500 hidden sm:inline-block">
                  پروژه فعال: {currentProject?.title}
                </span>
                <button
                  onClick={handlePrintAllReports}
                  className="flex items-center gap-2 bg-stone-100 border border-[#e5ded0] text-stone-700 px-4 py-2 rounded-xl text-xs font-black hover:bg-stone-200 transition-all shadow-sm cursor-pointer"
                >
                  <Printer size={16} /> چاپ رسمی گزارش کلی
                </button>
                <button
                  onClick={openCreateModal}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-stone-950 font-black rounded-xl text-xs shadow-md shadow-amber-500/20 hover:bg-amber-600 transition-all cursor-pointer"
                >
                  <Plus size={16} /> ثبت گزارش جدید
                </button>
              </div>
            </div>

            {reports.filter(r => r.projectId === selectedProjectId).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-stone-400 border border-dashed border-[#e5ded0] rounded-3xl">
                <CloudSun size={54} className="mb-4 text-stone-300 stroke-[1.5]" />
                <p className="font-bold">هیچ گزارش روزانه‌ای برای این پروژه ثبت نشده است.</p>
                <p className="text-xs mt-2">با زدن دکمه ثبت گزارش جدید در بالا، اولین گزارش کارگاهی را صادر کنید.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Search Bar matching Technical Office style */}
                <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-[#faf8f4]/50 p-4 rounded-[2rem] border border-[#ece5d8]">
                  <div className="relative flex-1 max-w-md group/search">
                    <Search
                      className="absolute right-4 top-1/2 -transtone-y-1/2 text-stone-400 group-focus-within:text-stone-500 transition-colors"
                      size={18}
                    />
                    <input
                      type="text"
                      placeholder="جستجوی سریع در شماره، تاریخ، شرح، جبهه کاری، تخصص و..."
                      value={reportsSearchTerm}
                      onChange={(e) => setReportsSearchTerm(e.target.value)}
                      className="w-full bg-white pr-11 pl-4 py-2.5 rounded-2xl text-xs font-bold outline-none border border-[#e5ded0] focus:border-stone-500 focus:ring-4 focus:ring-stone-50 transition-all shadow-sm"
                    />
                  </div>
                  {reportsSearchTerm && (
                    <button
                      onClick={() => setReportsSearchTerm("")}
                      className="text-xs text-rose-500 hover:text-rose-700 font-bold transition-colors text-right"
                    >
                      پاک کردن فیلتر جستجو ×
                    </button>
                  )}
                  <div className="text-[10px] font-bold text-stone-400 text-left md:text-right">
                    تعداد کل گزارشات یافت شده: {
                      reports
                        .filter(r => r.projectId === selectedProjectId)
                        .filter(r => {
                          if (!reportsSearchTerm.trim()) return true;
                          const q = reportsSearchTerm.toLowerCase();
                          return (
                            r.reportNumber.toLowerCase().includes(q) ||
                            r.date.includes(q) ||
                            (r.weather || "").toLowerCase().includes(q) ||
                            (r.description || "").toLowerCase().includes(q) ||
                            (r.preparedBy || "").toLowerCase().includes(q) ||
                            r.labor.some(l => l.role.toLowerCase().includes(q) || (l.organization || "").toLowerCase().includes(q)) ||
                            r.workItems.some(w => w.description.toLowerCase().includes(q) || (w.itemCode || "").toLowerCase().includes(q) || (w.location || "").toLowerCase().includes(q))
                          );
                        }).length.toLocaleString("fa-IR")
                    } مورد
                  </div>
                </div>

                <div className="bg-white rounded-3xl border border-[#ece5d8] shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead>
                        <tr className="text-stone-400 font-black border-b bg-[#faf8f4]/50 uppercase tracking-widest">
                          <th className="p-4 w-12 text-center">ردیف</th>
                          <th className="p-4 w-28">شماره گزارش</th>
                          <th className="p-4 w-28 text-center">تاریخ صدور</th>
                          <th className="p-4 w-28 text-center">وضعیت جوی</th>
                          <th className="p-4 w-24 text-center">دما (C°)</th>
                          <th className="p-4 w-20 text-center">شیفت</th>
                          <th className="p-4">شرح کلی کارها و مشاهدات</th>
                          <th className="p-4 w-40 text-center">آمار اجرایی</th>
                          <th className="p-4 w-32 text-center">وضعیت تایید</th>
                          <th className="p-4 w-56 text-center">عملیات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const filtered = reports
                            .filter(r => r.projectId === selectedProjectId)
                            .filter(r => {
                              if (!reportsSearchTerm.trim()) return true;
                              const q = reportsSearchTerm.toLowerCase();
                              return (
                                r.reportNumber.toLowerCase().includes(q) ||
                                r.date.includes(q) ||
                                (r.weather || "").toLowerCase().includes(q) ||
                                (r.description || "").toLowerCase().includes(q) ||
                                (r.preparedBy || "").toLowerCase().includes(q) ||
                                r.labor.some(l => l.role.toLowerCase().includes(q) || (l.organization || "").toLowerCase().includes(q)) ||
                                r.workItems.some(w => w.description.toLowerCase().includes(q) || (w.itemCode || "").toLowerCase().includes(q) || (w.location || "").toLowerCase().includes(q))
                              );
                            });

                          if (filtered.length === 0) {
                            return (
                              <tr>
                                <td colSpan={10} className="p-12 text-center text-stone-400 font-bold">
                                  هیچ گزارش روزانه‌ای مطابق با عبارت جستجوی شما یافت نشد.
                                </td>
                              </tr>
                            );
                          }

                          return filtered.map((report, idx) => {
                            const statusLabel = WorkflowService.getStatusLabel(report.status);
                            const statusColor = getStatusBadgeClass(report.status);
                            const actions = currentUser ? WorkflowService.getAvailableActions(report, currentUser, userOrgType || undefined) : [];
                            
                            const isUnread = unreadRecordIds.has(String(report.id));
                            
                            return (
                              <tr
                                key={report.id}
                                id={`record-${report.id}`}
                                onClick={() => handleReportRowClick(report.id)}
                                className={`border-b last:border-0 transition-all duration-500 cursor-pointer group ${
                                  isUnread ? 'bg-amber-100/50 dark:bg-amber-950/30 border-r-4 border-r-amber-500 shadow-xs ring-1 ring-amber-400/30' : ''
                                } ${
                                  highlightedRecordId === report.id
                                    ? 'bg-yellow-100/80 dark:bg-yellow-950/50 scale-[1.005] shadow-md z-10 relative ring-2 ring-amber-400'
                                    : 'hover:bg-[#faf8f4]'
                                }`}
                              >
                                <td className="p-4 text-center font-bold text-stone-300">
                                  {(idx + 1).toLocaleString("fa-IR")}
                                </td>
                                <td className="p-4 font-black text-stone-800">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span>{report.reportNumber}</span>
                                    {isUnread && (
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                        دیده نشده
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="p-4 text-center">
                                  <div className="inline-flex items-center gap-1 bg-stone-100 px-2.5 py-1 rounded-full font-bold text-stone-600">
                                    <Calendar size={12} className="text-stone-500" />
                                    {report.date}
                                  </div>
                                </td>
                                <td className="p-4 text-center font-bold text-stone-700">
                                  {report.weather}
                                </td>
                                <td className="p-4 text-center font-bold text-stone-600">
                                  {report.minTemp}° الی {report.maxTemp}°
                                </td>
                                <td className="p-4 text-center text-stone-700">
                                  {report.dayShift === "DAY" ? "روزکار" : report.dayShift === "NIGHT" ? "شب‌کار" : "دو شیفت"}
                                </td>
                                <td className="p-4">
                                  <p className="text-stone-500 line-clamp-1 max-w-xs leading-relaxed" title={report.description || ""}>
                                    {report.description || "---"}
                                  </p>
                                </td>
                                <td className="p-4 text-center text-stone-500 font-bold">
                                  <div className="flex flex-col gap-0.5 text-[10px]">
                                    <span>{report.workItems.length.toLocaleString("fa-IR")} آیتم کارکرد</span>
                                  </div>
                                </td>
                                <td className="p-4 text-center">
                                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black inline-block ${statusColor}`}>
                                    {statusLabel}
                                  </span>
                                  {report.assigneeId && (
                                    <div className="text-[10px] text-stone-600 font-bold mt-1 max-w-[150px] truncate mx-auto" title={(() => {
                                      const assignee = SystemAdminService.getUsers().find((u) => u.id === report.assigneeId);
                                      return assignee ? formatUserDisplayFormal(assignee, SystemAdminService.getOrganization(assignee.orgId)) : "";
                                    })()}>
                                      {(() => {
                                        const assignee = SystemAdminService.getUsers().find((u) => u.id === report.assigneeId);
                                        return assignee ? `گیرنده: ${formatUserDisplayFormal(assignee, SystemAdminService.getOrganization(assignee.orgId))}` : "";
                                      })()}
                                    </div>
                                  )}
                                </td>
                                <td className="p-4">
                                  <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                    <button
                                      onClick={() => setViewingReport(report)}
                                      className="p-1.5 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-lg transition-colors"
                                      title="مشاهده جزئیات کامل"
                                    >
                                      <Eye size={14} />
                                    </button>
                                    <button
                                      onClick={() => handlePrintReport(report)}
                                      className="p-3 text-stone-400 hover:text-stone-900 hover:bg-[#faf8f4] rounded-2xl transition-all shadow-sm hover:shadow-md"
                                      title="چاپ رسمی گزارش روزانه"
                                    >
                                      <Printer size={18} />
                                    </button>
                                    <button
                                      onClick={() => {
                                        setHistoryItem(report);
                                        setHistoryModalOpen(true);
                                      }}
                                      className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-all"
                                      title="تاریخچه"
                                    >
                                      <ScrollText size={16} />
                                    </button>
                                    {currentUser && WorkflowService.canEdit(report, currentUser) && (
                                      <button
                                        onClick={() => openEditModal(report)}
                                        className="p-1.5 bg-[#faf8f4] hover:bg-stone-100 text-stone-900 rounded-lg transition-colors"
                                        title="ویرایش گزارش"
                                      >
                                        <Edit3 size={14} />
                                      </button>
                                    )}
                                    {currentUser && WorkflowService.canDelete(report, currentUser) && (
                                      <button
                                        onClick={() => confirmDelete(report.id)}
                                        className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors"
                                        title="حذف گزارش"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    )}
                                    {actions.map((act) => (
                                      <button
                                        key={act}
                                        onClick={() => handleWorkflowClick(report, act)}
                                        className={`px-2 py-1 rounded-lg text-[9px] font-black shadow-sm transition-all hover:scale-105 ${WorkflowService.getActionStyle(act)}`}
                                      >
                                        {WorkflowService.getActionLabel(act, userOrgType || undefined)}
                                      </button>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: MATERIALS CONSUMPTION */}
        {activeTab === "materials" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#ece5d8] pb-4">
              <div>
                <h3 className="font-black text-stone-800 text-lg flex items-center gap-2">
                  <Layers size={20} className="text-stone-500" /> کنترل روزانه وارده و مصرف مصالح پای کار
                </h3>
                <p className="text-stone-400 text-xs mt-1">تراز روزانه ورود و خروج مصالح کلیدی کارگاه بر اساس گزارشات کارگاهی تایید شده</p>
              </div>
              <button
                onClick={handlePrintMaterialsReport}
                className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black shadow-sm transition-all active:scale-95"
              >
                <Printer size={16} /> گزارش جامع تراز مصالح
              </button>
            </div>

            {/* MIV APPROVED ALLOCATIONS SUMMARY CARD */}
            <div className="bg-gradient-to-r from-stone-50 to-stone-50 p-6 rounded-[2rem] border border-stone-100/50 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h4 className="font-black text-indigo-900 text-sm flex items-center gap-2">
                    <Layers size={18} className="text-amber-600" /> کنترل سهمیه‌های مصوب مصالح (MIV) کارگاه
                  </h4>
                  <p className="text-amber-700/70 text-xs mt-1 font-bold">
                    مقایسه سهمیه‌های خروج تایید شده در دفتر فنی با مقادیر مصرف شده در گزارش‌های روزانه کارگاه
                  </p>
                </div>
                <span className="shrink-0 text-xs bg-stone-100/80 text-indigo-800 px-3 py-1.5 rounded-xl font-black">
                  تغذیه هوشمند از دفتر فنی
                </span>
              </div>

              {mivConsumptionSummary.length === 0 ? (
                <div className="bg-white/80 p-6 rounded-2xl border border-stone-100 text-center text-xs text-stone-500 font-bold">
                  هیچ سهمیه مصالح مصوبی (حواله خروج تایید شده) برای این پروژه یافت نشد. مصالح به صورت آزاد ثبت می‌شوند.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {mivConsumptionSummary.map((item, idx) => {
                    const pct = item.approvedQty > 0 ? Math.min(100, (item.consumedQty / item.approvedQty) * 100) : 0;
                    return (
                      <div key={idx} className="bg-white p-4 rounded-2xl border border-stone-50/50 shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow">
                        <div className="space-y-1.5">
                          <span className="text-xs bg-stone-50 text-amber-700 px-2.5 py-1 rounded-lg font-black inline-block">
                            {item.materialName}
                          </span>
                          <div className="text-[11px] text-stone-400 font-bold flex justify-between">
                            <span>واحد سنجش:</span>
                            <span>{item.unit}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 border-t border-stone-50 pt-3 text-center">
                          <div>
                            <span className="block text-[9px] text-stone-400 font-bold">کل سهمیه</span>
                            <span className="text-xs font-black text-stone-700">{item.approvedQty.toLocaleString("fa-IR")}</span>
                          </div>
                          <div>
                            <span className="block text-[9px] text-stone-400 font-bold">کل مصرف</span>
                            <span className="text-xs font-black text-amber-700">{item.consumedQty.toLocaleString("fa-IR")}</span>
                          </div>
                          <div>
                            <span className="block text-[9px] text-stone-400 font-bold">باقیمانده</span>
                            <span className={`text-xs font-black ${item.remainingQty <= 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                              {item.remainingQty.toLocaleString("fa-IR")}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-1 pt-1">
                          <div className="flex justify-between text-[9px] text-stone-400 font-bold">
                            <span>میزان مصرف شده:</span>
                            <span className="font-mono">{pct.toFixed(0)}%</span>
                          </div>
                          <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${pct >= 100 ? 'bg-rose-500' : pct > 80 ? 'bg-amber-500' : 'bg-amber-600'}`} 
                              style={{ width: `${pct}%` }} 
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="overflow-x-auto rounded-[1.8rem] border border-[#ece5d8]">
              <table className="w-full text-right text-sm">
                <thead className="bg-[#faf8f4] text-stone-500 font-black">
                  <tr>
                    <th className="p-4">تاریخ گزارش</th>
                    <th className="p-4">عنوان و شرح مصالح</th>
                    <th className="p-4">مقدار وارده روزانه</th>
                    <th className="p-4">مقدار مصرفی روزانه</th>
                    <th className="p-4">واحد سنجش</th>
                    <th className="p-4">تراز خالص انباشته</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-stone-700">
                  {reports
                    .filter(r => r.projectId === selectedProjectId)
                    .flatMap(r => r.materials.map(m => ({ ...m, date: r.date })))
                    .map((m, idx) => {
                      const net = m.receivedQty - m.consumedQty;
                      return (
                        <tr key={idx} className="hover:bg-[#faf8f4]/50 transition-colors">
                          <td className="p-4 font-mono text-xs">{m.date}</td>
                          <td className="p-4 font-bold">{m.materialName}</td>
                          <td className="p-4 text-emerald-600 font-bold">{m.receivedQty > 0 ? `+${m.receivedQty}` : "۰"}</td>
                          <td className="p-4 text-rose-500 font-bold">{m.consumedQty > 0 ? `-${m.consumedQty}` : "۰"}</td>
                          <td className="p-4 text-xs text-stone-500">{m.unit}</td>
                          <td className={`p-4 font-black ${net >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                            {net > 0 ? `+${net}` : net === 0 ? "۰" : net} {m.unit}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: INTEGRATION WITH TECHNICAL OFFICE */}
        {activeTab === "tech_office" && (
          <div className="space-y-6">
            <div className="bg-amber-600 p-6 rounded-3xl text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-amber-700/20 shadow-sm">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-white/20 rounded-lg text-white">
                    <Sparkles size={18} className="animate-bounce" />
                  </span>
                  <h4 className="font-black text-lg">
                    {currentProject?.contractType === 'CBS' 
                      ? "موتور انتقال کارکردها به بخش دفتر فنی (CBS)" 
                      : "موتور صدور هوشمند صورت‌جلسات کارگاهی (Integration)"}
                  </h4>
                </div>
                <p className="text-white/80 text-xs">
                  {currentProject?.contractType === 'CBS'
                    ? "ردیف‌های کارکرد تایید شده بر اساس ساختار شکست (CBS) را انتخاب کنید تا آنها را مستقیماً برای کاربر گیرنده منتخب در دفتر فنی ارسال کنید!"
                    : "ردیف‌های کارکرد تایید شده در گزارشات روزانه را انتخاب کنید و آنها را با هم تجمیع کرده و به صورت‌جلسه کارگاهی (Draft Project Minute) تبدیل کنید تا مستقیماً به پنل دفتر فنی اضافه گردند!"
                  }
                </p>
              </div>
              <button
                onClick={openMinuteGeneration}
                disabled={selectedWorkItemIds.length === 0}
                className="px-5 py-3 bg-white hover:bg-[#faf8f4] text-stone-900 rounded-2xl text-xs font-black shadow-md transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {currentProject?.contractType === 'CBS'
                  ? `ارسال کارکردها به دفتر فنی (${selectedWorkItemIds.length} ردیف)`
                  : `ایجاد پیش‌نویس صورت‌جلسه (${selectedWorkItemIds.length} ردیف)`
                }
              </button>
            </div>

            <div className="overflow-x-auto rounded-[1.8rem] border border-[#ece5d8]">
              <table className="w-full text-right text-sm">
                <thead className="bg-[#faf8f4] text-stone-500 font-black">
                  <tr>
                    <th className="p-4 w-12 text-center">انتخاب</th>
                    <th className="p-4">منشا (گزارش روزانه)</th>
                    <th className="p-4">آیتم برآورد</th>
                    <th className="p-4">شرح (فهرست بها / اجرایی)</th>
                    <th className="p-4 text-center">حجم کار</th>
                    <th className="p-4 text-center">واحد</th>
                    <th className="p-4 text-center">بهای واحد (ریال)</th>
                    <th className="p-4">موقعیت ساختمانی</th>
                    <th className="p-4 text-center">وضعیت</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-stone-700">
                  {availableIntegratedItems.map((item) => (
                    <tr key={item.id} className="hover:bg-[#faf8f4]/50 transition-colors">
                      <td className="p-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectedWorkItemIds.includes(item.id)}
                          onChange={() => toggleWorkItemSelection(item.id)}
                          disabled={item.isImported}
                          className="w-4 h-4 text-stone-900 rounded focus:ring-stone-500 disabled:opacity-30 disabled:cursor-not-allowed"
                        />
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-stone-800 text-[10px]">گزارش {item.reportNumber}</div>
                        <div className="text-[10px] text-stone-400 font-mono">{item.reportDate}</div>
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-1 bg-stone-100 font-mono text-[10px] rounded-lg font-black text-stone-600">
                          {item.itemCode || "آیتم آزاد"}
                        </span>
                      </td>
                      <td className="p-4 text-[10px] font-bold text-stone-600 max-w-xs">
                        {item.officialDescription ? (
                          <div className="flex flex-col gap-1">
                            <span className="text-amber-700">{item.officialDescription}</span>
                            {item.description && 
                             item.description.trim() !== item.officialDescription.trim() && 
                             !item.officialDescription.includes(item.description.trim()) && (
                              <span className="text-stone-400 text-[9px] italic border-r-2 border-[#e5ded0] pr-2">
                                {item.description}
                              </span>
                            )}
                          </div>
                        ) : (
                          item.description
                        )}
                      </td>
                      <td className="p-4 text-center font-black text-stone-800">{item.quantity.toLocaleString("fa-IR")}</td>
                      <td className="p-4 text-center text-[10px] text-stone-400">{item.unit}</td>
                      <td className="p-4 text-center font-mono text-[10px] text-emerald-600 font-bold">
                        {item.unitPrice ? item.unitPrice.toLocaleString("fa-IR") : "---"}
                      </td>
                      <td className="p-4 text-[10px] text-stone-500">{item.location}</td>
                      <td className="p-4 text-center">
                        {item.isImported ? (
                          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg text-[10px] font-black inline-flex items-center gap-1">
                            <CheckCircle size={10} /> صادر شده به دفتر فنی
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-amber-50 text-stone-900 border border-amber-100 rounded-lg text-[10px] font-black inline-flex items-center gap-1">
                            <RefreshCw size={10} className="animate-spin" /> آماده صدور
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {availableIntegratedItems.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-12 text-center text-stone-400">
                        <Info size={36} className="mx-auto mb-2 text-stone-300" />
                        <p className="font-bold">هیچ حجم کارکرد تایید شده‌ای یافت نشد.</p>
                        <p className="text-xs mt-1 text-stone-400">گزارشات روزانه باید به تایید مشاور یا کارفرما برسند تا قابلیت انطباق پیدا کنند.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* --- FORM MODAL FOR CREATING/EDITING REPORTS --- */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-stone-900/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white w-full max-w-6xl max-h-[92vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-scaleIn text-stone-700">
            {/* Header */}
            <div className="p-6 bg-[#faf8f4] border-b border-[#ece5d8] flex justify-between items-center">
              <div>
                <h3 className="font-black text-lg text-stone-800 flex items-center gap-2">
                  <HardHat size={20} className="text-stone-500" />
                  {editingReport ? "ویرایش گزارش روزانه کارگاهی" : "ثبت گزارش روزانه کارگاهی جدید"}
                </h3>
                <p className="text-stone-500 text-xs mt-1 font-bold">
                  گزارش پس از ثبت در وضعیت «پیش‌نویس» قرار گرفته و به هیچ کاربری ارسال یا ارجاع خودکار نخواهد شد.
                </p>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-2 hover:bg-stone-200 rounded-full transition-colors text-stone-400 hover:text-stone-700"
              >
                <X size={20} />
              </button>
            </div>

            {/* Form Fields body */}
            <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8">
              {/* General details group */}
              <div className="grid gap-6 md:grid-cols-4 bg-[#faf8f4] p-6 rounded-[2rem] border border-[#ece5d8]">
                <div>
                  <label className="block text-xs font-black text-stone-500 mb-2">شماره گزارش</label>
                  <input
                    type="text"
                    required
                    value={formNumber}
                    onChange={(e) => setFormNumber(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-[#e5ded0] rounded-xl text-sm font-bold focus:ring-2 focus:ring-stone-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-stone-500 mb-2">تاریخ روزنامه کارگاهی</label>
                  <ShamsiDatePicker
                    required
                    value={formDate}
                    onChange={setFormDate}
                    inputClassName="!px-4 !py-2.5 !bg-white !border-[#e5ded0] !rounded-xl !text-sm !font-bold focus:!ring-2 focus:!ring-stone-500 !text-center"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-stone-500 mb-2">وضعیت هوا</label>
                  <select
                    value={formWeather}
                    onChange={(e) => setFormWeather(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-[#e5ded0] rounded-xl text-sm font-bold focus:ring-2 focus:ring-stone-500"
                  >
                    <option value="آفتابی">آفتابی</option>
                    <option value="ابری">ابری</option>
                    <option value="بارانی">بارانی</option>
                    <option value="برفی">برفی</option>
                    <option value="غبارآلود">غبارآلود</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-black text-stone-500 mb-2">حداقل دما (C)</label>
                    <input
                      type="number"
                      value={formMinTemp}
                      onChange={(e) => setFormMinTemp(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2.5 bg-white border border-[#e5ded0] rounded-xl text-sm font-bold focus:ring-2 focus:ring-stone-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-stone-500 mb-2">حداکثر دما (C)</label>
                    <input
                      type="number"
                      value={formMaxTemp}
                      onChange={(e) => setFormMaxTemp(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2.5 bg-white border border-[#e5ded0] rounded-xl text-sm font-bold focus:ring-2 focus:ring-stone-500"
                    />
                  </div>
                </div>
              </div>

              {/* Description box (Dynamic Rows) */}
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-[#ece5d8] pb-2">
                  <label className="block text-xs font-black text-stone-500">شرح کلی کارها و مشاهدات اصلی روزانه (ردیف به ردیف)</label>
                  <button
                    type="button"
                    onClick={addDescriptionRow}
                    className="text-xs bg-stone-50 text-amber-600 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 hover:bg-stone-100"
                  >
                    <Plus size={14} /> افزودن ردیف شرح کار
                  </button>
                </div>
                
                <div className="space-y-2">
                  {formDescriptionRows.map((row, idx) => (
                    <div key={row.id} className="flex items-center gap-3 bg-[#faf8f4] p-3 rounded-2xl border border-[#ece5d8]">
                      <span className="shrink-0 bg-stone-200 text-stone-600 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black">
                        {(idx + 1).toLocaleString("fa-IR")}
                      </span>
                      <div className="flex-1">
                        <input
                          type="text"
                          required
                          placeholder="مثلاً بتن‌ریزی فونداسیون زون A، خاکبرداری کانال تأسیسات شرقی..."
                          value={row.text}
                          onChange={(e) => {
                            const updated = [...formDescriptionRows];
                            updated[idx].text = e.target.value;
                            setFormDescriptionRows(updated);
                          }}
                          className="w-full px-4 py-2.5 bg-white border border-[#e5ded0] rounded-xl text-xs font-bold focus:ring-2 focus:ring-stone-500"
                        />
                      </div>
                      {formDescriptionRows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeDescriptionRow(row.id)}
                          className="text-rose-500 hover:bg-rose-50 p-2 rounded-xl transition-colors"
                          title="حذف ردیف"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* DYNAMIC FIELDSET 1: LABOR */}
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-[#ece5d8] pb-2">
                  <h4 className="font-black text-stone-800 text-sm flex items-center gap-2">
                    <Users size={16} className="text-teal-600" /> آمار و اکیپ‌های نیروی انسانی (نفرات)
                  </h4>
                  <button
                    type="button"
                    onClick={addLaborRow}
                    className="text-xs bg-teal-50 text-teal-600 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 hover:bg-teal-100"
                  >
                    <Plus size={14} /> افزودن ردیف نیروی انسانی
                  </button>
                </div>

                <div className="space-y-2">
                  {formLabor.length === 0 ? (
                    <div className="bg-[#faf8f4] p-4 rounded-2xl border border-dashed border-[#ece5d8] text-center text-xs text-stone-400 font-bold">
                      هیچ ردیفی برای آمار نیروی انسانی ثبت نشده است. برای ثبت، روی دکمه «افزودن ردیف نیروی انسانی» کلیک کنید.
                    </div>
                  ) : (
                    formLabor.map((row, idx) => (
                    <div key={row.id} className="flex flex-wrap md:flex-nowrap items-center gap-3 bg-[#faf8f4] p-4 rounded-2xl border border-[#ece5d8]">
                      <div className="flex-1 min-w-[150px]">
                        <input
                          type="text"
                          required
                          placeholder="نقش / تخصص (مثلاً آرماتوربند)"
                          value={row.role}
                          onChange={(e) => {
                            const updated = [...formLabor];
                            updated[idx].role = e.target.value;
                            setFormLabor(updated);
                          }}
                          className="w-full px-3 py-2 bg-white border border-[#e5ded0] rounded-xl text-xs font-bold"
                        />
                      </div>
                      <div className="w-24">
                        <input
                          type="number"
                          required
                          min={1}
                          placeholder="تعداد"
                          value={row.count || ""}
                          onChange={(e) => {
                            const updated = [...formLabor];
                            updated[idx].count = parseInt(e.target.value) || 0;
                            setFormLabor(updated);
                          }}
                          className="w-full px-3 py-2 bg-white border border-[#e5ded0] rounded-xl text-xs font-black text-center"
                        />
                      </div>
                      <div className="w-28">
                        <input
                          type="number"
                          required
                          min={1}
                          placeholder="ساعت کار"
                          value={row.workHours || ""}
                          onChange={(e) => {
                            const updated = [...formLabor];
                            updated[idx].workHours = parseInt(e.target.value) || 0;
                            setFormLabor(updated);
                          }}
                          className="w-full px-3 py-2 bg-white border border-[#e5ded0] rounded-xl text-xs font-black text-center"
                        />
                      </div>
                      <div className="flex-1 min-w-[150px]">
                        <input
                          type="text"
                          placeholder="سازمان / پیمانکار فرعی"
                          value={row.organization}
                          onChange={(e) => {
                            const updated = [...formLabor];
                            updated[idx].organization = e.target.value;
                            setFormLabor(updated);
                          }}
                          className="w-full px-3 py-2 bg-white border border-[#e5ded0] rounded-xl text-xs font-bold"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeLaborRow(row.id)}
                        className="text-rose-500 hover:bg-rose-50 p-2 rounded-xl transition-colors"
                        title="حذف ردیف"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))
                  )}
                </div>
              </div>

              {/* DYNAMIC FIELDSET 2: MACHINERY */}
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-[#ece5d8] pb-2">
                  <h4 className="font-black text-stone-800 text-sm flex items-center gap-2">
                    <Hammer size={16} className="text-orange-600" /> وضعیت و ساعت کار ماشین‌آلات کارگاهی
                  </h4>
                  <button
                    type="button"
                    onClick={addMachineryRow}
                    className="text-xs bg-orange-50 text-orange-600 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 hover:bg-orange-100"
                  >
                    <Plus size={14} /> افزودن ردیف ماشین‌آلات
                  </button>
                </div>

                <div className="space-y-2">
                  {formMachinery.length === 0 ? (
                    <div className="bg-[#faf8f4] p-4 rounded-2xl border border-dashed border-[#ece5d8] text-center text-xs text-stone-400 font-bold">
                      هیچ ردیفی برای وضعیت و ساعت کار ماشین‌آلات ثبت نشده است. برای ثبت، روی دکمه «افزودن ردیف ماشین‌آلات» کلیک کنید.
                    </div>
                  ) : (
                    formMachinery.map((row, idx) => (
                    <div key={row.id} className="flex flex-wrap md:flex-nowrap items-center gap-3 bg-[#faf8f4] p-4 rounded-2xl border border-[#ece5d8]">
                      <div className="flex-1 min-w-[150px]">
                        <input
                          type="text"
                          required
                          placeholder="نام دستگاه (مثلاً بیل مکانیکی)"
                          value={row.machineType}
                          onChange={(e) => {
                            const updated = [...formMachinery];
                            updated[idx].machineType = e.target.value;
                            setFormMachinery(updated);
                          }}
                          className="w-full px-3 py-2 bg-white border border-[#e5ded0] rounded-xl text-xs font-bold"
                        />
                      </div>
                      <div className="w-20">
                        <input
                          type="number"
                          required
                          min={1}
                          placeholder="تعداد"
                          value={row.count || ""}
                          onChange={(e) => {
                            const updated = [...formMachinery];
                            updated[idx].count = parseInt(e.target.value) || 0;
                            setFormMachinery(updated);
                          }}
                          className="w-full px-3 py-2 bg-white border border-[#e5ded0] rounded-xl text-xs font-black text-center"
                        />
                      </div>
                      <div className="w-24">
                        <input
                          type="number"
                          required
                          min={0}
                          placeholder="ساعت کار"
                          value={row.activeHours || ""}
                          onChange={(e) => {
                            const updated = [...formMachinery];
                            updated[idx].activeHours = parseInt(e.target.value) || 0;
                            setFormMachinery(updated);
                          }}
                          className="w-full px-3 py-2 bg-white border border-[#e5ded0] rounded-xl text-xs font-black text-center"
                        />
                      </div>
                      <div className="w-24">
                        <input
                          type="number"
                          required
                          min={0}
                          placeholder="آماده‌بکار"
                          value={row.standbyHours || ""}
                          onChange={(e) => {
                            const updated = [...formMachinery];
                            updated[idx].standbyHours = parseInt(e.target.value) || 0;
                            setFormMachinery(updated);
                          }}
                          className="w-full px-3 py-2 bg-white border border-[#e5ded0] rounded-xl text-xs font-black text-center"
                        />
                      </div>
                      <div className="w-36">
                        <select
                          value={row.status}
                          onChange={(e) => {
                            const updated = [...formMachinery];
                            updated[idx].status = e.target.value as any;
                            setFormMachinery(updated);
                          }}
                          className="w-full px-3 py-2 bg-white border border-[#e5ded0] rounded-xl text-[10px] font-bold"
                        >
                          <option value="ACTIVE">فعال و آماده بخدمت</option>
                          <option value="STANDBY">آماده‌به‌کار پای رینگ</option>
                          <option value="REPAIR">خراب / نیاز به تعمیر</option>
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeMachineryRow(row.id)}
                        className="text-rose-500 hover:bg-rose-50 p-2 rounded-xl transition-colors"
                        title="حذف ردیف"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))
                  )}
                </div>
              </div>

              {/* DYNAMIC FIELDSET 3: WORK ITEMS (THE CORE OF INTEGRATION) */}
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-[#ece5d8] pb-2">
                  <h4 className="font-black text-stone-800 text-sm flex items-center gap-2">
                    {currentProject?.contractType === 'CBS' ? (
                      <><Layers size={16} className="text-amber-600" /> کارکرد احجام عملیاتی ساختار شکست (CBS)</>
                    ) : (
                      <><CheckCircle size={16} className="text-stone-500" /> کارکرد احجام عملیاتی (فهرست بها / برآورد)</>
                    )}
                  </h4>
                  <button
                    type="button"
                    onClick={addWorkItemRow}
                    className="text-xs bg-[#faf8f4] text-stone-900 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 hover:bg-stone-100 border border-[#ece5d8]"
                  >
                    <Plus size={14} /> {currentProject?.contractType === 'CBS' ? "افزودن ردیف کارکرد CBS" : "افزودن ردیف کارکرد فیزیکی"}
                  </button>
                </div>

                <div className="space-y-3">
                  {formWorkItems.length === 0 ? (
                    <div className="bg-[#faf8f4] p-4 rounded-2xl border border-dashed border-[#ece5d8] text-center text-xs text-stone-400 font-bold">
                      هیچ ردیفی برای کارکرد احجام عملیاتی ثبت نشده است. برای ثبت، روی دکمه «{currentProject?.contractType === 'CBS' ? "افزودن ردیف کارکرد CBS" : "افزودن ردیف کارکرد فیزیکی"}» کلیک کنید.
                    </div>
                  ) : (
                    formWorkItems.map((row, idx) => (
                    <div key={row.id} className="bg-[#faf8f4] p-4 rounded-2xl border border-[#ece5d8] relative space-y-3">
                      {currentProject?.contractType === 'CBS' ? (
                        <>
                          {/* CBS Approved Selection Row */}
                          <div className="flex flex-wrap md:flex-nowrap items-center gap-2 bg-amber-50/70 p-2.5 rounded-xl border border-amber-200/80">
                            <span className="text-xs font-black text-amber-900 shrink-0 flex items-center gap-1">
                              <Layers size={14} className="text-amber-600" /> انتخاب آیتم ساختار شکست (CBS):
                            </span>
                            <select
                              value={row.cbsNodeId || ''}
                              onChange={(e) => {
                                const selectedId = e.target.value;
                                const node = cbsNodes.find(n => n.id === selectedId);
                                const updated = [...formWorkItems];
                                if (node) {
                                  updated[idx].cbsNodeId = node.id;
                                  updated[idx].itemCode = node.code;
                                  updated[idx].description = node.title;
                                  updated[idx].unit = node.unit || updated[idx].unit || '';
                                  if (node.quantity && node.weightPercent && updated[idx].quantity > 0) {
                                    updated[idx].weightPercent = Number(((updated[idx].quantity / node.quantity) * node.weightPercent).toFixed(3));
                                  }
                                } else {
                                  updated[idx].cbsNodeId = '';
                                }
                                setFormWorkItems(updated);
                              }}
                              className="flex-1 px-3 py-1.5 bg-white border border-[#e5ded0] rounded-lg text-xs font-bold text-stone-800 outline-none focus:border-stone-500 shadow-sm"
                            >
                              <option value="">-- انتخاب از ساختار شکست مصوب CBS --</option>
                              {cbsNodes.map(node => (
                                <option key={node.id} value={node.id}>
                                  [{node.code}] {node.title} {node.unit ? `(واحد: ${node.unit})` : ''} {node.quantity ? `| برآورد: ${node.quantity.toLocaleString('fa-IR')}` : ''} | وزن: {node.weightPercent}%
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Item Details Row for CBS */}
                          <div className="flex flex-wrap md:flex-nowrap items-center gap-3">
                            <div className="w-32">
                              <input
                                type="text"
                                placeholder="کد CBS..."
                                value={row.itemCode}
                                onChange={(e) => {
                                  const updated = [...formWorkItems];
                                  updated[idx].itemCode = e.target.value;
                                  setFormWorkItems(updated);
                                }}
                                className="w-full px-3 py-2 bg-white border border-[#e5ded0] rounded-xl text-xs font-black font-mono"
                              />
                            </div>
                            <div className="flex-1">
                              <input
                                type="text"
                                placeholder="شرح و عنوان آیتم CBS"
                                value={row.description}
                                onChange={(e) => {
                                  const updated = [...formWorkItems];
                                  updated[idx].description = e.target.value;
                                  setFormWorkItems(updated);
                                }}
                                className="w-full px-3 py-2 bg-white border border-[#e5ded0] rounded-xl text-xs font-bold"
                              />
                            </div>
                            <div className="w-20">
                              <input
                                type="text"
                                placeholder="واحد"
                                value={row.unit}
                                onChange={(e) => {
                                  const updated = [...formWorkItems];
                                  updated[idx].unit = e.target.value;
                                  setFormWorkItems(updated);
                                }}
                                className="w-full px-3 py-2 bg-white border border-[#e5ded0] rounded-xl text-xs font-bold text-center"
                              />
                            </div>
                            {/* Quantity */}
                            <div className="w-28">
                              <input
                                type="number"
                                step="any"
                                min={0}
                                placeholder="مقدار"
                                value={row.quantity || ""}
                                onChange={(e) => {
                                  const newQty = parseFloat(toEnglishDigits(e.target.value)) || 0;
                                  const updated = [...formWorkItems];
                                  updated[idx].quantity = newQty;
                                  if (row.cbsNodeId) {
                                    const node = cbsNodes.find(n => n.id === row.cbsNodeId);
                                    if (node && node.quantity > 0 && node.weightPercent > 0) {
                                      updated[idx].weightPercent = Number(((newQty / node.quantity) * node.weightPercent).toFixed(3));
                                    }
                                  }
                                  setFormWorkItems(updated);
                                }}
                                className="w-full px-3 py-2 bg-white border border-[#e5ded0] rounded-xl text-xs font-black text-center"
                                title="مقدار کارکرد روزانه"
                              />
                            </div>
                            {/* Weight Percentage */}
                            <div className="w-28 relative">
                              <input
                                type="number"
                                step="any"
                                min={0}
                                max={100}
                                placeholder="درصد وزنی"
                                value={row.weightPercent !== undefined && row.weightPercent !== null ? row.weightPercent : ""}
                                onChange={(e) => {
                                  const newWeight = parseFloat(toEnglishDigits(e.target.value)) || 0;
                                  const updated = [...formWorkItems];
                                  updated[idx].weightPercent = newWeight;
                                  if (row.cbsNodeId) {
                                    const node = cbsNodes.find(n => n.id === row.cbsNodeId);
                                    if (node && node.weightPercent > 0 && node.quantity > 0) {
                                      updated[idx].quantity = Number(((newWeight / node.weightPercent) * node.quantity).toFixed(2));
                                    }
                                  }
                                  setFormWorkItems(updated);
                                }}
                                className="w-full pl-6 pr-2 py-2 bg-white border border-[#e5ded0] rounded-xl text-xs font-black text-center text-amber-700"
                                title="درصد وزنی کارکرد روزانه"
                              />
                              <span className="absolute left-2 top-2.5 text-[10px] font-black text-amber-600 pointer-events-none">%</span>
                            </div>
                            <div className="w-36">
                              <input
                                type="text"
                                placeholder="موقعیت (سازه/طبقه)"
                                value={row.location}
                                onChange={(e) => {
                                  const updated = [...formWorkItems];
                                  updated[idx].location = e.target.value;
                                  setFormWorkItems(updated);
                                }}
                                className="w-full px-3 py-2 bg-white border border-[#e5ded0] rounded-xl text-xs font-bold"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => removeWorkItemRow(row.id)}
                              className="text-rose-500 hover:bg-rose-50 p-2 rounded-xl transition-colors shrink-0"
                              title="حذف ردیف"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          {/* Item Details Row for Price List */}
                          <div className="flex flex-wrap md:flex-nowrap items-center gap-3">
                            <div className="w-36 shrink-0">
                              <select
                                value={row.priceListId || 'all'}
                                onChange={(e) => {
                                  const updated = [...formWorkItems];
                                  updated[idx].priceListId = e.target.value;
                                  setFormWorkItems(updated);
                                  if (row.itemCode) {
                                    handleWorkItemSearch(row.id, idx, row.itemCode, e.target.value);
                                  }
                                }}
                                className="w-full px-2 py-2 bg-white border border-[#e5ded0] rounded-xl text-[10px] font-black outline-none focus:border-stone-500 text-right cursor-pointer shadow-sm"
                              >
                                <option value="all">🔍 تمامی فهارس</option>
                                {currentProject?.priceLists?.map((pl: any) => (
                                  <option key={pl.id} value={pl.id}>
                                    {pl.title}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="w-44 relative">
                              {/* Selector of estimate items with code search */}
                              <div className="relative group/input">
                                <input
                                  type="text"
                                  placeholder="کد آیتم فهرست بها..."
                                  value={row.itemCode}
                                  onChange={(e) => handleWorkItemSearch(row.id, idx, e.target.value)}
                                  onFocus={() => {
                                    if (row.itemCode.trim().length >= 1) {
                                      handleWorkItemSearch(row.id, idx, row.itemCode);
                                    }
                                  }}
                                  className="w-full pl-8 pr-3 py-2 bg-white border border-[#e5ded0] rounded-xl text-xs font-black font-mono focus:border-stone-500 focus:ring-2 focus:ring-stone-100"
                                />
                                <Search size={14} className="absolute left-2.5 top-3 text-stone-400 pointer-events-none" />
                                
                                {workItemSearchStates[row.id]?.isSearching && (
                                  <div className="absolute top-full right-0 w-[min(90vw,480px)] mt-2 bg-white border border-[#e5ded0] rounded-2xl shadow-2xl z-[150] overflow-hidden">
                                    <div className="p-2 bg-[#faf8f4] text-[9px] font-black text-stone-400 uppercase pr-4 border-b border-[#ece5d8] flex justify-between items-center">
                                      <span>آیتم‌های برآورد و فهرست بها ({workItemSearchStates[row.id].results.length} مورد)</span>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setWorkItemSearchStates(prev => ({
                                            ...prev,
                                            [row.id]: { isSearching: false, results: [] }
                                          }));
                                        }}
                                        className="text-[9px] text-rose-500 hover:underline font-bold"
                                      >
                                        بستن لیست
                                      </button>
                                    </div>
                                    <div className="max-h-52 overflow-y-auto custom-scrollbar">
                                      {workItemSearchStates[row.id].results.length > 0 ? (
                                        workItemSearchStates[row.id].results.map((est) => (
                                          <div
                                            key={est.id}
                                            onClick={() => selectWorkItemEstimate(row.id, idx, est)}
                                            className="p-3 hover:bg-[#faf8f4] cursor-pointer border-b last:border-0 flex items-start gap-3 transition-colors text-right"
                                          >
                                            <span className="shrink-0 bg-[#faf8f4] text-stone-900 px-2 py-1 rounded-lg font-black text-[9px] border border-stone-100 text-center min-w-[70px]">
                                              {est.code}
                                            </span>
                                            <div className="flex-1">
                                              <span className="text-[11px] font-bold text-stone-700 block leading-relaxed">{est.description}</span>
                                              <span className="text-[9px] text-stone-400 mt-0.5 block">واحد: {est.unit} | برآورد: {est.quantity.toLocaleString("fa-IR")}</span>
                                            </div>
                                          </div>
                                        ))
                                      ) : (
                                        <div className="p-4 text-center text-xs text-stone-400 font-bold">موردی منطبق یافت نشد</div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex-1">
                              <input
                                type="text"
                                placeholder="شرح و تفصیل کار صورت گرفته"
                                value={row.description}
                                onChange={(e) => {
                                  const updated = [...formWorkItems];
                                  updated[idx].description = e.target.value;
                                  setFormWorkItems(updated);
                                }}
                                className="w-full px-3 py-2 bg-white border border-[#e5ded0] rounded-xl text-xs font-bold"
                              />
                            </div>
                            <div className="w-20">
                              <input
                                type="text"
                                placeholder="واحد"
                                value={row.unit}
                                onChange={(e) => {
                                  const updated = [...formWorkItems];
                                  updated[idx].unit = e.target.value;
                                  setFormWorkItems(updated);
                                }}
                                className="w-full px-3 py-2 bg-white border border-[#e5ded0] rounded-xl text-xs font-bold text-center"
                              />
                            </div>
                            {/* Quantity */}
                            <div className="w-28">
                              <input
                                type="number"
                                step="any"
                                min={0}
                                placeholder="مقدار/حجم"
                                value={row.quantity || ""}
                                onChange={(e) => {
                                  const newQty = parseFloat(toEnglishDigits(e.target.value)) || 0;
                                  const updated = [...formWorkItems];
                                  updated[idx].quantity = newQty;
                                  setFormWorkItems(updated);
                                }}
                                className="w-full px-3 py-2 bg-white border border-[#e5ded0] rounded-xl text-xs font-black text-center"
                                title="مقدار کارکرد روزانه"
                              />
                            </div>
                            <div className="w-36">
                              <input
                                type="text"
                                placeholder="موقعیت (سازه/طبقه)"
                                value={row.location}
                                onChange={(e) => {
                                  const updated = [...formWorkItems];
                                  updated[idx].location = e.target.value;
                                  setFormWorkItems(updated);
                                }}
                                className="w-full px-3 py-2 bg-white border border-[#e5ded0] rounded-xl text-xs font-bold"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => removeWorkItemRow(row.id)}
                              className="text-rose-500 hover:bg-rose-50 p-2 rounded-xl transition-colors shrink-0"
                              title="حذف ردیف"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                  )}
                </div>
              </div>

              {/* DYNAMIC FIELDSET 4: MATERIALS */}
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-[#ece5d8] pb-2">
                  <h4 className="font-black text-stone-800 text-sm flex items-center gap-2">
                    <Layers size={16} className="text-stone-500" /> دریافت و مصرف مصالح ساختمانی پای کار
                  </h4>
                  <button
                    type="button"
                    onClick={addMaterialRow}
                    className="text-xs bg-stone-50 text-amber-600 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 hover:bg-stone-100"
                  >
                    <Plus size={14} /> افزودن ردیف مصالح
                  </button>
                </div>

                <div className="space-y-3">
                  {approvedMivMaterials.length === 0 && (
                    <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-2xl text-xs flex items-center gap-2 font-bold mb-3">
                      <AlertTriangle size={16} className="text-stone-900 shrink-0" />
                      <span>هیچ حواله خروج مصالح (MIV) تایید شده‌ای برای این پروژه در بخش دفتر فنی یافت نشد. لطفاً ابتدا در دفتر فنی یک حواله خروج تایید شده ایجاد کنید تا به عنوان سهمیه مصرف کارگاه بارگذاری شود.</span>
                    </div>
                  )}
                  {formMaterials.length === 0 ? (
                    <div className="bg-[#faf8f4] p-4 rounded-2xl border border-dashed border-[#ece5d8] text-center text-xs text-stone-400 font-bold">
                      هیچ ردیفی برای دریافت و مصرف مصالح پای کار ثبت نشده است. برای ثبت، روی دکمه «افزودن ردیف مصالح» کلیک کنید.
                    </div>
                  ) : (
                    formMaterials.map((row, idx) => {
                    const selectedSummary = mivConsumptionSummary.find(s => s.materialName === row.materialName);
                    const isOverLimit = selectedSummary && row.consumedQty > selectedSummary.remainingQty;
                    
                    return (
                      <div key={row.id} className="bg-[#faf8f4] p-4 rounded-2xl border border-[#ece5d8] space-y-3">
                        <div className="flex flex-wrap md:flex-nowrap items-center gap-3">
                          <div className="flex-1 min-w-[200px]">
                            <label className="block text-[10px] text-stone-500 font-black mb-1">انتخاب مصالح تایید شده از MIV</label>
                            <select
                              required
                              value={row.materialName}
                              onChange={(e) => {
                                const selectedName = e.target.value;
                                const found = approvedMivMaterials.find(m => m.materialName === selectedName);
                                const updated = [...formMaterials];
                                updated[idx].materialName = selectedName;
                                if (found) {
                                  updated[idx].unit = found.unit;
                                }
                                setFormMaterials(updated);
                              }}
                              className="w-full px-3 py-2 bg-white border border-[#e5ded0] rounded-xl text-xs font-bold focus:border-stone-500 outline-none"
                            >
                              <option value="">-- انتخاب مصالح مصوب (MIV) --</option>
                              {mivConsumptionSummary.map((m, mIdx) => (
                                <option key={mIdx} value={m.materialName}>
                                  {m.materialName} ({m.unit}) - باقیمانده مجاز: {m.remainingQty.toLocaleString("fa-IR")}
                                </option>
                              ))}
                              {row.materialName && !mivConsumptionSummary.some(m => m.materialName === row.materialName) && (
                                <option value={row.materialName}>
                                  {row.materialName} ({row.unit || ""}) [ثبت سابق]
                                </option>
                              )}
                            </select>
                          </div>
                          <div className="w-24">
                            <label className="block text-[10px] text-stone-500 font-black mb-1 text-center">ورود امروز</label>
                            <input
                              type="number"
                              required
                              min={0}
                              placeholder="وارده"
                              value={row.receivedQty}
                              onChange={(e) => {
                                const updated = [...formMaterials];
                                updated[idx].receivedQty = parseFloat(toEnglishDigits(e.target.value)) || 0;
                                setFormMaterials(updated);
                              }}
                              className="w-full px-3 py-2 bg-white border border-[#e5ded0] rounded-xl text-xs font-bold text-center"
                            />
                          </div>
                          <div className="w-24">
                            <label className="block text-[10px] text-stone-500 font-black mb-1 text-center">مصرف امروز</label>
                            <input
                              type="number"
                              required
                              min={0}
                              placeholder="مصرفی"
                              value={row.consumedQty}
                              onChange={(e) => {
                                const updated = [...formMaterials];
                                updated[idx].consumedQty = parseFloat(toEnglishDigits(e.target.value)) || 0;
                                setFormMaterials(updated);
                              }}
                              className="w-full px-3 py-2 bg-white border border-[#e5ded0] rounded-xl text-xs font-bold text-center"
                            />
                          </div>
                          <div className="w-20">
                            <label className="block text-[10px] text-stone-500 font-black mb-1 text-center">واحد</label>
                            <input
                              type="text"
                              readOnly
                              disabled
                              placeholder="واحد"
                              value={row.unit}
                              className="w-full px-3 py-2 bg-stone-100 border border-[#e5ded0] rounded-xl text-xs font-bold text-center text-stone-500"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeMaterialRow(row.id)}
                            className="text-rose-500 hover:bg-rose-50 p-2 rounded-xl transition-colors mt-4 md:mt-0"
                            title="حذف ردیف"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>

                        {/* Real-time MIV balance validation display */}
                        {row.materialName && selectedSummary && (
                          <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${isOverLimit ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-stone-50/70 text-indigo-800'}`}>
                            <Layers size={14} className="shrink-0 text-stone-500" />
                            <div className="flex-1 flex flex-wrap gap-x-4">
                              <span>کل سهمیه مصوب (MIV): <strong className="font-mono">{selectedSummary.approvedQty.toLocaleString("fa-IR")}</strong> {selectedSummary.unit}</span>
                              <span>کل مصرف کارگاه تا کنون: <strong className="font-mono">{selectedSummary.consumedQty.toLocaleString("fa-IR")}</strong> {selectedSummary.unit}</span>
                              <span>باقیمانده مجاز: <strong className="font-mono">{selectedSummary.remainingQty.toLocaleString("fa-IR")}</strong> {selectedSummary.unit}</span>
                            </div>
                            {isOverLimit && (
                              <span className="text-rose-600 font-black animate-pulse flex items-center gap-1 shrink-0">
                                <AlertTriangle size={14} />
                                مقدار وارد شده بیش از سهمیه باقیمانده است!
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                  )}
                </div>
              </div>

              {/* DYNAMIC FIELDSET 5: PROBLEMS & OBSTACLES */}
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-[#ece5d8] pb-2">
                  <h4 className="font-black text-stone-800 text-sm flex items-center gap-2">
                    <AlertTriangle size={16} className="text-rose-500" /> موانع، مشکلات اجرایی و حوادث کارگاه
                  </h4>
                  <button
                    type="button"
                    onClick={addProblemRow}
                    className="text-xs bg-rose-50 text-rose-600 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 hover:bg-rose-100"
                  >
                    <Plus size={14} /> افزودن رویداد/مشکل جدید
                  </button>
                </div>

                <div className="space-y-2">
                  {formProblems.map((row, idx) => (
                    <div key={row.id} className="flex flex-wrap md:flex-nowrap items-center gap-3 bg-[#faf8f4] p-3 rounded-2xl border border-[#ece5d8]">
                      <div className="flex-1">
                        <input
                          type="text"
                          required
                          placeholder="شرح کامل حادثه یا مشکل، مثلاً کمبود متریال جوشکاری"
                          value={row.description}
                          onChange={(e) => {
                            const updated = [...formProblems];
                            updated[idx].description = e.target.value;
                            setFormProblems(updated);
                          }}
                          className="w-full px-3 py-2 bg-white border border-[#e5ded0] rounded-xl text-xs font-bold"
                        />
                      </div>
                      <div className="w-36">
                        <select
                          value={row.category}
                          onChange={(e) => {
                            const updated = [...formProblems];
                            updated[idx].category = e.target.value as any;
                            setFormProblems(updated);
                          }}
                          className="w-full px-3 py-2 bg-white border border-[#e5ded0] rounded-xl text-xs font-bold"
                        >
                          <option value="TECHNICAL">فنی (Technical)</option>
                          <option value="MATERIAL">تامین مصالح</option>
                          <option value="MACHINERY">خرابی ماشین‌آلات</option>
                          <option value="WEATHER">وضعیت جوی</option>
                          <option value="ADMINISTRATIVE">اداری و مجوزها</option>
                        </select>
                      </div>
                      <div className="w-32">
                        <select
                          value={row.impact}
                          onChange={(e) => {
                            const updated = [...formProblems];
                            updated[idx].impact = e.target.value as any;
                            setFormProblems(updated);
                          }}
                          className="w-full px-3 py-2 bg-white border border-[#e5ded0] rounded-xl text-xs font-bold"
                        >
                          <option value="LOW">کم (Low)</option>
                          <option value="MEDIUM">متوسط</option>
                          <option value="HIGH">زیاد (High)</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={row.resolved}
                          onChange={(e) => {
                            const updated = [...formProblems];
                            updated[idx].resolved = e.target.checked;
                            setFormProblems(updated);
                          }}
                          className="w-4 h-4 text-stone-900 rounded"
                        />
                        <span className="text-xs text-stone-500 font-bold">برطرف شد</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeProblemRow(row.id)}
                        className="text-rose-500 hover:bg-rose-50 p-2 rounded-xl"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom save actions */}
              <div className="flex items-center gap-4 border-t border-[#ece5d8] pt-6">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-[#ffc745] text-stone-950 font-black rounded-2xl shadow-md shadow-stone-500/20 flex items-center justify-center gap-2 hover:bg-[#f5be38] transition-colors"
                >
                  <Save size={18} /> ذخیره به عنوان پیش‌نویس (بدون ارسال خودکار)
                </button>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-8 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-black rounded-2xl"
                >
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- DETAIL PREVIEW MODAL --- */}
      {viewingReport && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-stone-900/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white w-full max-w-5xl max-h-[95vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden text-stone-700">
            {/* Header */}
            <div className="p-6 bg-[#faf8f4] border-b border-[#ece5d8] flex justify-between items-center">
              <h3 className="font-black text-stone-800 text-lg flex items-center gap-2">
                <FileText size={20} className="text-stone-500" /> پیش‌نمایش کامل شناسنامه گزارش روزانه کارگاه
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={printReportOfficial}
                  className="p-3 text-stone-400 hover:text-stone-900 hover:bg-[#faf8f4] rounded-2xl transition-all shadow-sm hover:shadow-md"
                  title="چاپ رسمی گزارش روزانه"
                >
                  <Printer size={18} />
                </button>
                <button
                  onClick={() => setViewingReport(null)}
                  className="p-2 hover:bg-stone-200 rounded-full transition-colors text-stone-400 hover:text-stone-700"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Document sheet body */}
            <div className="flex-1 overflow-y-auto p-8 bg-stone-100/50">
              <div id="daily-report-sheet" className="bg-white p-8 md:p-12 rounded-[2rem] border border-[#ece5d8] shadow-sm max-w-4xl mx-auto space-y-8">
                {/* Visual Header */}
                <div className="border-b-4 border-double border-stone-300 pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="space-y-1">
                    <h1 className="font-black text-xl text-stone-800">گزارش روزانه عملیات کارگاهی</h1>
                    <p className="text-xs text-stone-400">پروژه: <span className="font-bold text-stone-600">{currentProject?.title}</span></p>
                  </div>
                  <div className="text-right space-y-1 font-bold text-xs text-stone-500">
                    <div>شماره گزارش: <span className="font-mono text-stone-800 font-black">{viewingReport.reportNumber}</span></div>
                    <div>تاریخ صدور: <span className="text-stone-800 font-black">{viewingReport.date}</span></div>
                    <div>صادر کننده: <span className="text-stone-800 font-black">{viewingReport.preparedBy}</span></div>
                  </div>
                </div>

                {/* Weather details */}
                <div className="grid grid-cols-4 gap-4 bg-[#faf8f4] p-4 rounded-2xl border border-[#ece5d8] text-xs">
                  <div>
                    <span className="text-stone-400 block mb-1">وضعیت جوی</span>
                    <span className="font-black text-stone-700">{viewingReport.weather}</span>
                  </div>
                  <div>
                    <span className="text-stone-400 block mb-1">دمای هوای کارگاه</span>
                    <span className="font-black text-stone-700">{viewingReport.minTemp}°C الی {viewingReport.maxTemp}°C</span>
                  </div>
                  <div>
                    <span className="text-stone-400 block mb-1">شیفت فعالیت</span>
                    <span className="font-black text-stone-700">
                      {viewingReport.dayShift === "DAY" ? "روزکار" : viewingReport.dayShift === "NIGHT" ? "شب‌کار" : "دو شیفت روز و شب"}
                    </span>
                  </div>
                  <div>
                    <span className="text-stone-400 block mb-1">وضعیت تایید سند</span>
                    <span className="font-black text-stone-900">{WorkflowService.getStatusLabel(viewingReport.status)}</span>
                  </div>
                </div>

                {/* Description (Work Log Summary) */}
                <div className="space-y-3 bg-[#faf8f4] p-5 rounded-2xl border border-[#ece5d8]">
                  <h4 className="font-black text-stone-800 text-xs flex items-center gap-2 border-b border-[#e5ded0]/60 pb-2">
                    <FileText size={15} className="text-stone-500" /> شرح کلی کارها و مشاهدات مکتوب روزانه
                  </h4>
                  <div className="space-y-2 text-xs font-medium text-stone-600 leading-relaxed pr-2">
                    {viewingReport.description ? (
                      viewingReport.description.split("\n").map((line, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <span className="text-stone-400 mt-0.5 font-bold shrink-0">{(idx + 1).toLocaleString("fa-IR")}.</span>
                          <p className="flex-1">{line}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-stone-400 italic">شرح مکتوبی برای این روز ثبت نشده است.</p>
                    )}
                  </div>
                </div>

                {/* Sub-table 1: Labor */}
                <div className="space-y-3">
                  <h4 className="font-black text-stone-800 text-sm flex items-center gap-2 border-b border-[#ece5d8] pb-2">
                    <Users size={16} className="text-teal-600" /> آمار و اکیپ‌های نیروی انسانی
                  </h4>
                  <table className="w-full text-right text-xs">
                    <thead className="bg-[#faf8f4] text-stone-500 font-bold">
                      <tr>
                        <th className="p-3 w-12 text-center">ردیف</th>
                        <th className="p-3">نقش / تخصص</th>
                        <th className="p-3 text-center">تعداد (نفر)</th>
                        <th className="p-3 text-center">ساعت کارکرد روزانه</th>
                        <th className="p-3">سازمان / پیمانکار فرعی</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 text-stone-700">
                      {viewingReport.labor.map((row, idx) => (
                        <tr key={row.id}>
                          <td className="p-3 text-center text-stone-400 font-bold">{idx + 1}</td>
                          <td className="p-3 font-bold">{row.role}</td>
                          <td className="p-3 text-center font-black">{row.count}</td>
                          <td className="p-3 text-center font-black">{row.workHours} ساعت</td>
                          <td className="p-3 text-stone-500">{row.organization || "پیمانکار اصلی"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Sub-table 2: Machinery */}
                <div className="space-y-3">
                  <h4 className="font-black text-stone-800 text-sm flex items-center gap-2 border-b border-[#ece5d8] pb-2">
                    <Hammer size={16} className="text-orange-600" /> وضعیت و ساعت کار ماشین‌آلات کارگاهی
                  </h4>
                  <table className="w-full text-right text-xs">
                    <thead className="bg-[#faf8f4] text-stone-500 font-bold">
                      <tr>
                        <th className="p-3 w-12 text-center">ردیف</th>
                        <th className="p-3">دستگاه / خودرو</th>
                        <th className="p-3 text-center">تعداد</th>
                        <th className="p-3 text-center">ساعت کارکرد</th>
                        <th className="p-3 text-center">ساعت آماده‌به‌کار</th>
                        <th className="p-3">وضعیت فنی و فیلد</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 text-stone-700">
                      {viewingReport.machinery.map((row, idx) => (
                        <tr key={row.id}>
                          <td className="p-3 text-center text-stone-400 font-bold">{idx + 1}</td>
                          <td className="p-3 font-bold">{row.machineType}</td>
                          <td className="p-3 text-center font-black">{row.count}</td>
                          <td className="p-3 text-center font-black">{row.activeHours} ساعت</td>
                          <td className="p-3 text-center font-black">{row.standbyHours} ساعت</td>
                          <td className="p-3 font-bold">
                            {row.status === "ACTIVE" ? (
                              <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg">فعال و آماده به خدمت</span>
                            ) : row.status === "STANDBY" ? (
                              <span className="text-stone-500 bg-[#faf8f4] px-2 py-0.5 rounded-lg">آماده‌به‌کار پای رینگ</span>
                            ) : (
                              <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded-lg">خراب / نیاز به تعمیرات</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Sub-table 3: Work Items (Execution output) */}
                {(() => {
                  const repProj = projects.find(p => String(p.id) === String(viewingReport.projectId)) || currentProject;
                  const isCbs = repProj?.contractType === 'CBS';
                  return (
                    <div className="space-y-3">
                      <h4 className="font-black text-stone-800 text-sm flex items-center gap-2 border-b border-[#ece5d8] pb-2">
                        {isCbs ? <Layers size={16} className="text-amber-600" /> : <CheckCircle size={16} className="text-stone-900" />} 
                        {isCbs ? "احجام عملیات و کارکرد فیزیکی روزانه ساختار شکست (CBS)" : "احجام عملیات و کارکرد فیزیکی روزانه (فهرست بها)"}
                      </h4>
                      <table className="w-full text-right text-xs">
                        <thead className="bg-[#faf8f4] text-stone-500 font-bold">
                          <tr>
                            <th className="p-3 w-12 text-center">ردیف</th>
                            <th className="p-3">{isCbs ? "کد CBS" : "کد آیتم فهرست بها"}</th>
                            <th className="p-3">{isCbs ? "شرح آیتم CBS" : "تفصیل شرح کارکرد فیزیکی اجرایی"}</th>
                            <th className="p-3 text-center">حجم / مقدار اجرا شده</th>
                            {isCbs && <th className="p-3 text-center">درصد وزنی</th>}
                            <th className="p-3 text-center">واحد</th>
                            <th className="p-3">موقعیت دقیق ساختمانی در پروژه</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100 text-stone-700">
                          {viewingReport.workItems.map((row, idx) => (
                            <tr key={row.id}>
                              <td className="p-3 text-center text-stone-400 font-bold">{idx + 1}</td>
                              <td className="p-3 font-mono text-stone-500 font-black">{row.itemCode || "آیتم آزاد"}</td>
                              <td className="p-3 font-bold">{row.description}</td>
                              <td className="p-3 text-center font-black text-stone-800">{row.quantity ? row.quantity.toLocaleString("fa-IR") : "-"}</td>
                              {isCbs && <td className="p-3 text-center font-black text-amber-700">{row.weightPercent ? `${row.weightPercent.toLocaleString("fa-IR")}%` : "-"}</td>}
                              <td className="p-3 text-center text-stone-500">{row.unit}</td>
                              <td className="p-3 text-stone-500">{row.location}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}

                {/* Sub-table 4: Materials (Received and Consumed) */}
                <div className="space-y-3">
                  <h4 className="font-black text-stone-800 text-sm flex items-center gap-2 border-b border-[#ece5d8] pb-2">
                    <Layers size={16} className="text-amber-600" /> دریافت و مصرف مصالح ساختمانی پای کار
                  </h4>
                  {(!viewingReport.materials || viewingReport.materials.length === 0) ? (
                    <p className="text-xs text-stone-400 italic font-bold">هیچ موردی برای دریافت یا مصرف مصالح در این روز ثبت نشده است.</p>
                  ) : (
                    <table className="w-full text-right text-xs">
                      <thead className="bg-[#faf8f4] text-stone-500 font-bold">
                        <tr>
                          <th className="p-3 w-12 text-center">ردیف</th>
                          <th className="p-3">عنوان و شرح مصالح</th>
                          <th className="p-3 text-center">مقدار وارده امروز</th>
                          <th className="p-3 text-center">مقدار مصرفی امروز</th>
                          <th className="p-3 text-center">واحد سنجش</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100 text-stone-700">
                        {viewingReport.materials.map((row, idx) => (
                          <tr key={row.id || idx}>
                            <td className="p-3 text-center text-stone-400 font-bold">{idx + 1}</td>
                            <td className="p-3 font-bold">{row.materialName}</td>
                            <td className="p-3 text-center font-black text-emerald-600 font-mono">
                              {row.receivedQty > 0 ? row.receivedQty.toLocaleString("fa-IR") : "-"}
                            </td>
                            <td className="p-3 text-center font-black text-stone-900 font-mono">
                              {row.consumedQty > 0 ? row.consumedQty.toLocaleString("fa-IR") : "-"}
                            </td>
                            <td className="p-3 text-center text-stone-500 font-bold">{row.unit}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Problems and issues */}
                {viewingReport.problems && viewingReport.problems.length > 0 && (
                  <div className="space-y-3 bg-rose-50/50 p-5 rounded-3xl border border-rose-100/50">
                    <h4 className="font-black text-rose-800 text-sm flex items-center gap-2 border-b border-rose-200/50 pb-2">
                      <AlertTriangle size={16} /> موانع، مشکلات اجرایی و تاخیرات روزانه
                    </h4>
                    <table className="w-full text-right text-xs">
                      <thead className="text-stone-500 font-bold">
                        <tr>
                          <th className="p-2 w-12 text-center">ردیف</th>
                          <th className="p-2">رویداد / شرح مکتوب مانع</th>
                          <th className="p-2 text-center">طبقه‌بندی</th>
                          <th className="p-2 text-center">شدت اثر</th>
                          <th className="p-2 text-center">رفع اثر شد؟</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-rose-100/30 text-stone-700">
                        {viewingReport.problems.map((row, idx) => (
                          <tr key={row.id}>
                            <td className="p-2 text-center text-rose-400 font-bold">{idx + 1}</td>
                            <td className="p-2 font-bold text-rose-900">{row.description}</td>
                            <td className="p-2 text-center font-bold">{row.category === "TECHNICAL" ? "فنی" : row.category === "MATERIAL" ? "تامین مصالح" : "ماشین‌آلات/سایر"}</td>
                            <td className="p-2 text-center font-bold">
                              {row.impact === "HIGH" ? (
                                <span className="text-rose-700">بسیار شدید</span>
                              ) : row.impact === "MEDIUM" ? (
                                <span className="text-amber-700">متوسط</span>
                              ) : (
                                <span className="text-stone-600">کم‌اثر</span>
                              )}
                            </td>
                            <td className="p-2 text-center">
                              {row.resolved ? (
                                <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">بله برطرف شد</span>
                              ) : (
                                <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded font-black animate-pulse">خیر - کماکان فعال</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Workflow History Timeline */}
                <div className="space-y-4 pt-6 border-t border-[#e5ded0] no-print">
                  <h4 className="font-black text-stone-800 text-sm flex items-center gap-2">
                    <RefreshCw size={16} className="text-amber-600 animate-spin-slow" /> تاریخچه گردش کار و امضاهای مکتوب سند
                  </h4>
                  <div className="bg-[#faf8f4] p-6 rounded-3xl border border-[#ece5d8] space-y-4">
                    {!viewingReport.workflowHistory || viewingReport.workflowHistory.length === 0 ? (
                      <div className="text-center text-stone-400 py-4 text-xs font-bold">
                        هیچ سابقه‌ای برای این گزارش ثبت نشده است (در وضعیت پیش‌نویس اولیه).
                      </div>
                    ) : (
                      <div className="space-y-4 relative pr-4">
                        {/* Vertical Line */}
                        <div className="absolute right-1.5 top-2 bottom-2 w-0.5 bg-stone-200" />
                        
                        {[...viewingReport.workflowHistory]
                          .sort((a, b) => b.timestamp - a.timestamp)
                          .map((event, idx) => (
                            <div key={event.id} className="flex gap-4 relative">
                              <div className="flex flex-col items-center">
                                <div
                                  className={`w-3.5 h-3.5 rounded-full z-10 border-2 border-white ring-2 ${
                                    event.action === ("APPROVE" as any) || event.action === ("APPROVE_BY_CONSULTANT" as any) || event.action === ("APPROVE_INTERNAL" as any)
                                      ? "ring-emerald-500 bg-emerald-500"
                                      : event.action === "REJECT" || event.action === "RETURN_TO_CONTRACTOR" || event.action === "RETURN_TO_CONSULTANT"
                                        ? "ring-rose-500 bg-rose-500"
                                        : "ring-stone-500 bg-[#faf8f4]0"
                                  }`}
                                />
                              </div>
                              <div className="flex-1 pb-2 text-right">
                                <div className="flex flex-wrap justify-between items-start gap-1">
                                  <span className="font-black text-stone-800 text-xs">
                                    {WorkflowService.getActionLabel(event.action, undefined, event.actorUserId)}
                                  </span>
                                  <span className="text-[10px] text-stone-400 font-bold font-mono">
                                    {new Date(event.timestamp).toLocaleString("fa-IR")}
                                  </span>
                                </div>
                                <div className="text-[10px] text-stone-500 mt-1">
                                  توسط: <span className="font-bold text-stone-700">{event.actorName}</span>
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
                                      <>
                                        {" "} ➔ ارجاع به: <span className="font-bold text-stone-900">{fullAssigneeName}</span>
                                      </>
                                    ) : null;
                                  })()}
                                </div>
                                {event.comment && (
                                  <div className="mt-1.5 p-2 bg-white rounded-lg border border-[#ece5d8]/80 text-[10px] text-stone-600 font-medium italic">
                                    توضیحات: {event.comment}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- CONFIRM WORKFLOW ACTION MODAL --- */}
      {isWorkflowModalOpen && workflowTarget && workflowActionType && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-stone-900/80 backdrop-blur-sm animate-fadeIn text-stone-700">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden p-6 space-y-6">
            <h3 className="font-black text-lg text-stone-800 border-b border-[#ece5d8] pb-3 flex items-center gap-2">
              <ClipboardCheck className="text-stone-500" />
              {workflowActionType === "SUBMIT" && "ارسال جهت بررسی"}
              {workflowActionType === "REASSIGN" && "ارجاع به کارشناس دیگر"}
              {workflowActionType === "APPROVE" &&
                (userOrgType === OrganizationType.CONSULTANT || userOrgType === OrganizationType.EMPLOYER
                  ? "تایید"
                  : "تایید و ارجاع")}
              {workflowActionType === "FINAL_APPROVE" &&
                (userOrgType === OrganizationType.EMPLOYER
                  ? "تایید و ثبت نهایی"
                  : "تایید نهایی")}
              {workflowActionType === "REJECT" && "رد و بازگشت برای اصلاح"}
              {workflowActionType === "SEND_TO_CONSULTANT" && "ارسال به مشاور"}
              {workflowActionType === "SEND_TO_EMPLOYER" &&
                (userOrgType === OrganizationType.CONSULTANT
                  ? "تایید و ارسال به کارفرما"
                  : "ارسال به کارفرما")}
              {workflowActionType === "RETURN_TO_CONTRACTOR" && "عودت به پیمانکار"}
              {workflowActionType === "RETURN_TO_CONSULTANT" && "عودت به مشاور"}
              {workflowActionType === "UNFREEZE_BY_VARIATION" && "رفع قفل و بازگشایی (Unfreeze)"}
            </h3>

            <div className="space-y-4">
              <div>
                <span className="text-stone-400 text-xs font-bold block mb-1">اقدام انتخابی شما:</span>
                <span className={`px-3 py-1.5 rounded-xl text-xs font-black inline-block ${WorkflowService.getActionStyle(workflowActionType)}`}>
                  {WorkflowService.getActionLabel(workflowActionType, userOrgType || undefined)}
                </span>
              </div>

              {(() => {
                const showAssigneeDropdown = 
                  workflowActionType === "SUBMIT" ||
                  workflowActionType === "REASSIGN" ||
                  workflowActionType === "SEND_TO_CONSULTANT" ||
                  workflowActionType === "SEND_TO_EMPLOYER" ||
                  workflowActionType === "APPROVE" ||
                  workflowActionType === "RETURN_TO_CONTRACTOR" ||
                  workflowActionType === "RETURN_TO_CONSULTANT" ||
                  workflowActionType === "REJECT";

                if (!showAssigneeDropdown) return null;

                return (
                  <div>
                    <label className="block text-xs font-black text-stone-500 mb-2">
                      {workflowActionType === "SEND_TO_CONSULTANT"
                        ? "انتخاب گیرنده (در مشاور)"
                        : workflowActionType === "SEND_TO_EMPLOYER"
                          ? "انتخاب گیرنده (در کارفرما)"
                          : workflowActionType === "RETURN_TO_CONTRACTOR"
                            ? "انتخاب گیرنده (در پیمانکار)"
                            : workflowActionType === "RETURN_TO_CONSULTANT"
                              ? "انتخاب گیرنده (در مشاور)"
                              : workflowActionType === "APPROVE"
                                ? "انتخاب گیرنده بعدی (جهت ارجاع - اختیاری برای مدیر پروژه و سرپرست کارگاه)"
                                : workflowActionType === "REJECT"
                                  ? "انتخاب دریافت‌کننده سند رد شده"
                                  : "گیرنده سند در گردش کار"}
                    </label>
                    <select
                      value={workflowAssignee}
                      onChange={(e) => setWorkflowAssignee(e.target.value)}
                      className="w-full px-4 py-2.5 bg-[#faf8f4] border border-[#e5ded0] rounded-xl text-stone-700 text-sm font-bold focus:ring-2 focus:ring-stone-500"
                    >
                      <option value="">انتخاب کنید...</option>
                      {orgUsers.map((u) => {
                        const org = SystemAdminService.getOrganization(u.orgId);
                        return (
                          <option key={u.id} value={u.id}>
                            {formatUserDisplayFormal(u, org)}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                );
              })()}

              <div>
                <label className="block text-xs font-black text-stone-500 mb-2">
                  {workflowActionType === "REJECT" ||
                  workflowActionType === "RETURN_TO_CONTRACTOR" ||
                  workflowActionType === "RETURN_TO_CONSULTANT"
                    ? "علت رد/عودت (اجباری)"
                    : "توضیحات و هامش اداری (Comment - اختیاری)"}
                </label>
                <textarea
                  rows={3}
                  value={workflowComment}
                  onChange={(e) => setWorkflowComment(e.target.value)}
                  placeholder="هامش اداری، یادداشت‌های فنی یا دلایل تایید/عودت سند را اینجا بنویسید..."
                  className="w-full px-4 py-3 border border-[#e5ded0] rounded-2xl text-sm font-bold focus:ring-2 focus:ring-stone-500 focus:outline-none"
                />
              </div>

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
            </div>

            {(() => {
              const ut = (currentUser?.jobTitle || "").trim();
              const ul = (currentUser?.jobLevel || "").trim();
              const isPMOrWorkshopManager =
                ut.includes("مدیر پروژه") ||
                ul.includes("مدیر پروژه") ||
                (currentUser?.role as string) === "PROJECT_MANAGER" ||
                ut.includes("سرپرست کارگاه") ||
                ul.includes("سرپرست کارگاه") ||
                (currentUser?.username || "").toLowerCase().includes("pm") ||
                (currentUser?.username || "").toLowerCase().includes("superintendent");

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

              const isRejectAction = workflowActionType === "REJECT";
              
              // For non-senior roles, APPROVE still requires an assignee (internal referral)
              const isApproveMissingAssignee = workflowActionType === "APPROVE" && !isPMOrWorkshopManager && !workflowAssignee;
              const isActionMissingAssignee = actionsRequiringAssignee.includes(workflowActionType as string) && !workflowAssignee;
              const isRejectMissingCommentOrAssignee = isRejectAction && (!workflowComment.trim() || !workflowAssignee);
              
              const isReturnMissingComment = (workflowActionType === "RETURN_TO_CONTRACTOR" ||
                                              workflowActionType === "RETURN_TO_CONSULTANT") &&
                                             !workflowComment.trim();

              const isDisabled = isApproveMissingAssignee || 
                                 isActionMissingAssignee || 
                                 isRejectMissingCommentOrAssignee || 
                                 isReturnMissingComment;

              return (
                <div className="flex gap-3 pt-4 border-t border-[#ece5d8]">
                  <button
                    onClick={submitWorkflowTransition}
                    disabled={isDisabled}
                    className={`flex-1 py-3 font-black rounded-2xl shadow-md transition-all active:scale-[0.98] text-white ${
                      isDisabled
                        ? "bg-stone-300 cursor-not-allowed shadow-none"
                        : workflowActionType === "REJECT" ||
                          workflowActionType === "RETURN_TO_CONTRACTOR" ||
                          workflowActionType === "RETURN_TO_CONSULTANT"
                          ? "bg-red-500 hover:bg-red-600 shadow-red-500/20"
                          : workflowActionType === "UNFREEZE_BY_VARIATION"
                            ? "bg-amber-500 hover:bg-amber-600 shadow-amber-500/30"
                            : workflowActionType === "APPROVE" ||
                              workflowActionType === "FINAL_APPROVE"
                              ? "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30"
                              : "bg-amber-600 hover:bg-amber-700"
                    }`}
                  >
                    {workflowActionType === "SEND_TO_CONSULTANT"
                      ? "تایید و ارسال به مشاور"
                      : workflowActionType === "SEND_TO_EMPLOYER"
                        ? "تایید و ارسال به کارفرما"
                        : workflowActionType === "RETURN_TO_CONTRACTOR"
                          ? "تایید و عودت به پیمانکار"
                          : workflowActionType === "RETURN_TO_CONSULTANT"
                            ? "تایید و عودت به مشاور"
                            : workflowActionType === "APPROVE"
                              ? "تایید و ارجاع پرونده"
                              : workflowActionType === "REJECT"
                                ? "تایید و عودت جهت اصلاح"
                                : workflowActionType === "FINAL_APPROVE"
                                  ? "تایید و ثبت نهایی"
                                  : workflowActionType === "UNFREEZE_BY_VARIATION"
                                    ? "تایید و بازگشایی سند"
                                    : "تایید و ثبت اقدام"}
                  </button>
                  <button
                    onClick={() => setIsWorkflowModalOpen(false)}
                    className="px-6 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-black rounded-2xl"
                  >
                    انصراف
                  </button>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* --- CONFIRM GENERAL DELETE MODAL --- */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-stone-900/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 text-center space-y-6">
            <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto">
              <Trash2 size={28} />
            </div>
            <div>
              <h3 className="font-black text-stone-800 text-lg">آیا از حذف این گزارش مطمئنید؟</h3>
              <p className="text-stone-400 text-xs mt-2">کلیه آمار نیروی انسانی، ماشین‌آلات و احجام کارکرد ذیل این گزارش روزانه به صورت دائمی پاک خواهند شد.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={executeDelete}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-2xl"
              >
                بله، حذف کن
              </button>
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 py-3 bg-stone-100 text-stone-700 font-black rounded-2xl"
              >
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- CONFIRM MINUTE GENERATION MODAL --- */}
      {isMinuteGenerationOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-stone-900/80 backdrop-blur-sm animate-fadeIn text-stone-700">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden p-6 space-y-6">
            <h3 className="font-black text-lg text-stone-800 border-b border-[#ece5d8] pb-3 flex items-center gap-2">
              <Sparkles className="text-amber-500 animate-pulse" /> {currentProject?.contractType === 'CBS' ? "ارسال کارکردها به بخش دفتر فنی (CBS)" : "صدور مستقیم صورت‌جلسه به دفتر فنی"}
            </h3>

            <div className="space-y-4">
              <div className="p-4 bg-[#faf8f4] text-stone-950 text-xs rounded-2xl leading-relaxed">
                {currentProject?.contractType === 'CBS'
                  ? "شما در حال ارسال کارکردهای انتخابی به بخش دفتر فنی هستید. این کارکردها بر اساس ساختار شکست (CBS) بسته‌بندی شده و مستقیماً به کارتابل کاربر گیرنده منتخب در دفتر فنی جهت اعمال در صورت‌وضعیت CBS ارسال می‌شوند."
                  : "شما در حال صدور هوشمند صورت‌جلسه کارگاهی در قالب پیش‌نویس (Draft) هستید. کلیه کارکردهای انتخابی به تفکیک آیتم برآورد تجمیع شده و مستقیماً وارد کارتابل دفتر فنی خواهند شد."
                }
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-stone-500 mb-2">
                    {currentProject?.contractType === 'CBS' ? "شماره بسته ارسالی" : "شماره صورت‌جلسه"}
                  </label>
                  <input
                    type="text"
                    required
                    value={minuteNumber}
                    onChange={(e) => setMinuteNumber(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#faf8f4] border border-[#e5ded0] rounded-xl text-stone-700 text-sm font-bold focus:ring-2 focus:ring-stone-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-stone-500 mb-2">
                    {currentProject?.contractType === 'CBS' ? "تاریخ ارسال کارکرد" : "تاریخ ثبت صورت‌جلسه"}
                  </label>
                  <ShamsiDatePicker
                    required
                    value={minuteDate}
                    onChange={setMinuteDate}
                    inputClassName="!px-4 !py-2.5 !bg-[#faf8f4] !border-[#e5ded0] !rounded-xl !text-stone-700 !text-sm !font-bold focus:!ring-2 focus:!ring-stone-500 !text-center"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-stone-500 mb-2">
                  {currentProject?.contractType === 'CBS' ? "موقعیت پروژه / جبهه کاری" : "موقعیت دقیق جغرافیایی / ساختمانی"}
                </label>
                <input
                  type="text"
                  value={minuteLoc}
                  onChange={(e) => setMinuteLoc(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#faf8f4] border border-[#e5ded0] rounded-xl text-stone-700 text-sm font-bold focus:ring-2 focus:ring-stone-500"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-stone-500 mb-2">انتخاب گیرنده در سازمان (دفتر فنی)</label>
                <select
                  required
                  value={minuteRecipient}
                  onChange={(e) => setMinuteRecipient(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#faf8f4] border border-[#e5ded0] rounded-xl text-stone-700 text-sm font-bold focus:ring-2 focus:ring-stone-500"
                >
                  <option value="">-- انتخاب گیرنده --</option>
                  {techOfficeRecipientCandidates.map((u) => {
                    const org = SystemAdminService.getOrganization(u.orgId);
                    return (
                      <option key={u.id} value={u.id}>
                        {formatUserDisplayFormal(u, org)}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-stone-500 mb-2">
                  {currentProject?.contractType === 'CBS' ? "شرح و جزئیات ارسالی" : "شرح مختصر صورت‌جلسه"}
                </label>
                <textarea
                  rows={2}
                  value={minuteDesc}
                  onChange={(e) => setMinuteDesc(e.target.value)}
                  className="w-full px-4 py-3 border border-[#e5ded0] rounded-2xl text-sm font-bold focus:ring-2 focus:ring-stone-500"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-[#ece5d8]">
              <button
                onClick={executeMinuteGeneration}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl shadow-md transition-all active:scale-[0.98]"
              >
                {currentProject?.contractType === 'CBS' ? "تایید و ارسال کارکردها به دفتر فنی" : "تایید و صدور قطعی به دفتر فنی"}
              </button>
              <button
                onClick={() => setIsMinuteGenerationOpen(false)}
                className="px-6 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-black rounded-2xl"
              >
                انصراف
              </button>
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
                تاریخچه تغییرات گزارش شماره {historyItem.reportNumber}
              </h3>
              <button
                onClick={() => setHistoryModalOpen(false)}
                className="p-2 hover:bg-stone-200 rounded-full transition-colors text-stone-500"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4 text-right" dir="rtl">
              {!historyItem.workflowHistory || historyItem.workflowHistory.length === 0 ? (
                <div className="text-center text-stone-400 py-8 text-sm font-bold">
                  هیچ سابقه‌ای برای این گزارش ثبت نشده است.
                </div>
              ) : (
                [...historyItem.workflowHistory]
                  .sort((a, b) => b.timestamp - a.timestamp)
                  .map((event, idx) => (
                    <div key={event.id} className="flex gap-4 relative">
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-3 h-3 rounded-full z-10 ${
                            event.action === "APPROVE" || event.action === "FINAL_APPROVE"
                              ? "bg-emerald-500"
                              : event.action === "REJECT" || event.action === "RETURN_TO_CONTRACTOR" || event.action === "RETURN_TO_CONSULTANT"
                                ? "bg-red-500"
                                : "bg-[#faf8f4]0"
                          }`}
                        />
                        {idx < (historyItem.workflowHistory?.length || 0) - 1 && (
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
                        {event.comment && (
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
    </div>
  );
}
