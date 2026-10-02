import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Flame,
  AlertTriangle,
  Trees,
  Calendar,
  BarChart3,
  Plus,
  Search,
  Filter,
  Printer,
  History,
  Edit3,
  Trash2,
  CheckCircle2,
  Clock,
  Send,
  Building2,
  HardHat,
  FileText,
  TrendingUp,
  Activity,
  ListChecks,
  Settings,
  Eye
} from 'lucide-react';
import { handlePrintOfficialHse } from '../services/hsePrintService';
import { MOCK_PROJECTS } from '../constants';
import { Project, WorkflowStatus, WorkflowAction, SystemUser } from '../types';
import {
  WorkPermit,
  IncidentReport,
  EnvironmentalReport,
  WeeklyMonthlyHseReport,
  HsePlan,
  PERMIT_TYPE_LABELS,
  INCIDENT_TYPE_LABELS,
  ENVIRONMENTAL_ASPECT_LABELS
} from '../types/hse';
import { HseService } from '../services/hseService';
import { WorkflowService } from '../services/workflowService';
import { SystemAdminService } from '../services/systemAdminService';
import { PermitTypesManagerModal } from '../components/hse/PermitTypesManagerModal';
import { ModuleId } from '../systemAdminTypes';
import { formatUserDisplayFormal } from '../src/utils/userFormatter';
import { HseWorkflowModal } from '../components/hse/HseWorkflowModal';
import { HseHistoryModal } from '../components/hse/HseHistoryModal';
import { HsePrintModal } from '../components/hse/HsePrintModal';
import { WorkPermitModal } from '../components/hse/WorkPermitModal';
import { IncidentModal } from '../components/hse/IncidentModal';
import { EnvironmentalModal } from '../components/hse/EnvironmentalModal';
import { PeriodicReportModal } from '../components/hse/PeriodicReportModal';
import { HsePlanModal } from '../components/hse/HsePlanModal';

const loadData = <T,>(key: string, defaultValue: T): T => {
  try {
    const saved = localStorage.getItem(key);
    return saved && saved !== 'undefined' ? JSON.parse(saved) : defaultValue;
  } catch {
    return defaultValue;
  }
};

export default function Hse() {
  const [currentUser, setCurrentUser] = useState<SystemUser | null>(() => {
    return SystemAdminService.getCurrentUser();
  });

  const [projects, setProjects] = useState<Project[]>(() => {
    const loaded = loadData('hamyar_projects', MOCK_PROJECTS);
    if (Array.isArray(loaded)) {
      const cleaned = loaded.filter((p: any) => p.id !== '2' && !String(p.title || '').includes('تصفیه‌خانه مرکزی') && !String(p.title || '').includes('تسویه خانه مرکزی') && !String(p.title || '').includes('نیایش'));
      if (cleaned.length > 0) return cleaned;
    }
    const sysProjects = SystemAdminService.getProjects();
    if (sysProjects.length > 0) {
      return sysProjects.map(p => ({
        id: p.id,
        title: p.name,
        contractNumber: p.code,
        employerName: p.employerName,
        consultantName: p.consultantName,
        contractorName: p.contractorName,
        status: p.status,
        startDate: (p as any).startDate || '',
        endDate: (p as any).endDate || '',
        siteDeliveryDate: (p as any).siteDeliveryDate || '',
        contractType: 'فهرست بهایی',
        initialBudget: 50000000000,
        priceLists: [],
        resources: [],
        coefficients: { regional: 1, overhead: 1.3, contractor: 1.15, equipment: 1, others: 1, generalCoefficients: [], chapterCoefficients: [] }
      } as Project));
    }
    return [];
  });

  const accessibleProjects = useMemo(() => {
    const targetUser = currentUser || SystemAdminService.getCurrentUser();
    const filtered = projects.filter(p => SystemAdminService.canUserAccessProject(p.id, targetUser));
    return filtered.length > 0 ? filtered : projects;
  }, [projects, currentUser]);

  const [selectedProjectId, setSelectedProjectId] = useState<string>(() => {
    const saved = localStorage.getItem('hamyar_selected_project_id');
    const p = loadData('hamyar_projects', []);
    if (saved && Array.isArray(p) && p.some((item: any) => String(item.id) === String(saved))) {
      return String(saved);
    }
    if (Array.isArray(p) && p.length > 0) {
      return String(p[0].id);
    }
    return saved || '1';
  });

  useEffect(() => {
    if (accessibleProjects.length > 0 && !accessibleProjects.some(p => String(p.id) === String(selectedProjectId))) {
      const newId = String(accessibleProjects[0].id);
      setSelectedProjectId(newId);
      localStorage.setItem('hamyar_selected_project_id', newId);
    }
  }, [accessibleProjects, selectedProjectId]);

  const handleProjectChange = (newProjectId: string) => {
    setSelectedProjectId(newProjectId);
    localStorage.setItem('hamyar_selected_project_id', newProjectId);
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new CustomEvent('project-changed', { detail: { projectId: newProjectId } }));
  };

  // Sync with storage and project-changed events
  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('hamyar_selected_project_id');
      if (saved && saved !== selectedProjectId) {
        setSelectedProjectId(saved);
      }
      const loaded = loadData('hamyar_projects', []);
      if (Array.isArray(loaded)) {
        const cleaned = loaded.filter((p: any) => p.id !== '2' && !String(p.title || '').includes('تصفیه‌خانه مرکزی') && !String(p.title || '').includes('تسویه خانه مرکزی') && !String(p.title || '').includes('نیایش'));
        if (cleaned.length > 0) {
          setProjects(cleaned);
        }
      }
      const usr = SystemAdminService.getCurrentUser();
      setCurrentUser(usr);
    };

    const handleProjectChanged = (e?: Event) => {
      const customEvent = e as CustomEvent<{ projectId: string }>;
      const newProjId = customEvent?.detail?.projectId || localStorage.getItem('hamyar_selected_project_id');
      if (newProjId && newProjId !== selectedProjectId) {
        setSelectedProjectId(newProjId);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('project-changed', handleProjectChanged);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('project-changed', handleProjectChanged);
    };
  }, [selectedProjectId]);

  const [activeTab, setActiveTab] = useState<'PERMITS' | 'INCIDENTS' | 'ENVIRONMENTAL' | 'PERIODIC' | 'PLAN'>('PERMITS');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Data states
  const [permits, setPermits] = useState<WorkPermit[]>([]);
  const [incidents, setIncidents] = useState<IncidentReport[]>([]);
  const [environmentalReports, setEnvironmentalReports] = useState<EnvironmentalReport[]>([]);
  const [periodicReports, setPeriodicReports] = useState<WeeklyMonthlyHseReport[]>([]);
  const [hsePlans, setHsePlans] = useState<HsePlan[]>([]);

  // Workflow Modal states
  const [isWorkflowModalOpen, setIsWorkflowModalOpen] = useState(false);
  const [workflowTarget, setWorkflowTarget] = useState<any>(null);
  const [workflowActionType, setWorkflowActionType] = useState<WorkflowAction | null>(null);
  const [workflowAssignee, setWorkflowAssignee] = useState('');
  const [workflowComment, setWorkflowComment] = useState('');
  const [attachWorkflowSignature, setAttachWorkflowSignature] = useState(true);

  // History Modal states
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyTarget, setHistoryTarget] = useState<any>(null);

  // Print Modal states
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printTarget, setPrintTarget] = useState<any>(null);
  const [printDocType, setPrintDocType] = useState<'PERMIT' | 'INCIDENT' | 'ENVIRONMENTAL' | 'PERIODIC' | 'PLAN' | 'COMPREHENSIVE'>('PERMIT');

  // Edit/Create Modal states
  const [isPermitModalOpen, setIsPermitModalOpen] = useState(false);
  const [editingPermit, setEditingPermit] = useState<WorkPermit | null>(null);
  const [isPermitTypesManagerOpen, setIsPermitTypesManagerOpen] = useState(false);

  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false);
  const [editingIncident, setEditingIncident] = useState<IncidentReport | null>(null);

  const [isEnvironmentalModalOpen, setIsEnvironmentalModalOpen] = useState(false);
  const [editingEnvironmental, setEditingEnvironmental] = useState<EnvironmentalReport | null>(null);

  const [isPeriodicModalOpen, setIsPeriodicModalOpen] = useState(false);
  const [editingPeriodic, setEditingPeriodic] = useState<WeeklyMonthlyHseReport | null>(null);

  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<HsePlan | null>(null);

  // Load Current User
  useEffect(() => {
    const username = localStorage.getItem('current_username') || 'admin';
    const users = SystemAdminService.getUsers();
    const found = users.find(u => u.username === username) || null;
    setCurrentUser(found);
  }, []);

  // Load Data
  const refreshData = () => {
    setPermits(HseService.getWorkPermits(selectedProjectId));
    setIncidents(HseService.getIncidentReports(selectedProjectId));
    setEnvironmentalReports(HseService.getEnvironmentalReports(selectedProjectId));
    setPeriodicReports(HseService.getPeriodicReports(selectedProjectId));
    setHsePlans(HseService.getHsePlans(selectedProjectId));
  };

  useEffect(() => {
    refreshData();
  }, [selectedProjectId]);

  const currentProject = useMemo(() => {
    return accessibleProjects.find(p => String(p.id) === String(selectedProjectId)) ||
      projects.find(p => String(p.id) === String(selectedProjectId)) ||
      accessibleProjects[0] ||
      projects[0] ||
      ({
        id: selectedProjectId || '1',
        title: 'پروژه جاری کارگاهی',
        contractNumber: 'PRJ-101',
        employerName: 'دستگاه کارفرما',
        consultantName: 'مهندسین مشاور',
        contractorName: 'شرکت پیمانکار'
      } as Project);
  }, [accessibleProjects, projects, selectedProjectId]);

  const [highlightedRecordId, setHighlightedRecordId] = useState<string | null>(null);

  // Notification redirect listener for HSE
  useEffect(() => {
    const handleGlobalClick = (e: Event) => {
      const customEvent = e as CustomEvent<any>;
      if (customEvent.detail && (customEvent.detail.module === "HSE" || customEvent.detail.module === "hse")) {
        const recId = customEvent.detail.recordId;
        if (customEvent.detail.projectId) {
          setSelectedProjectId(customEvent.detail.projectId);
        }

        const notifDocCode = customEvent.detail.documentCode || '';
        const notifTitle = customEvent.detail.documentTitle || customEvent.detail.message || '';

        let targetTab: 'PERMITS' | 'INCIDENTS' | 'ENVIRONMENTAL' | 'PERIODIC' | 'PLAN' = 'PERMITS';

        if (permits.some(p => String(p.id) === String(recId))) targetTab = 'PERMITS';
        else if (incidents.some(i => String(i.id) === String(recId))) targetTab = 'INCIDENTS';
        else if (environmentalReports.some(e => String(e.id) === String(recId))) targetTab = 'ENVIRONMENTAL';
        else if (periodicReports.some(r => String(r.id) === String(recId))) targetTab = 'PERIODIC';
        else if (hsePlans.some(p => String(p.id) === String(recId))) targetTab = 'PLAN';
        else if (notifTitle.includes('حادثه') || notifDocCode.startsWith('INC')) targetTab = 'INCIDENTS';
        else if (notifTitle.includes('زیست') || notifDocCode.startsWith('ENV')) targetTab = 'ENVIRONMENTAL';
        else if (notifTitle.includes('دوره‌ای') || notifDocCode.startsWith('REP')) targetTab = 'PERIODIC';
        else if (notifTitle.includes('برنامه') || notifTitle.includes('Plan')) targetTab = 'PLAN';

        setActiveTab(targetTab);
        if (recId) {
          setHighlightedRecordId(recId);
          setTimeout(() => {
            const el = document.getElementById(`record-${recId}`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 200);
          setTimeout(() => setHighlightedRecordId(null), 3500);
        }
      }
    };
    window.addEventListener("hamyar-notification-clicked", handleGlobalClick);

    // Also check URL parameters
    const params = new URLSearchParams(window.location.search);
    const recId = params.get('recordId');
    const tab = params.get('tab');
    const projId = params.get('projectId');
    if (projId) {
      setSelectedProjectId(projId);
    }
    if (recId) {
      let targetTab: 'PERMITS' | 'INCIDENTS' | 'ENVIRONMENTAL' | 'PERIODIC' | 'PLAN' = 'PERMITS';
      if (tab === 'INCIDENTS' || tab === 'incidents') targetTab = 'INCIDENTS';
      else if (tab === 'ENVIRONMENTAL' || tab === 'environmental') targetTab = 'ENVIRONMENTAL';
      else if (tab === 'PERIODIC' || tab === 'periodic') targetTab = 'PERIODIC';
      else if (tab === 'PLAN' || tab === 'plan') targetTab = 'PLAN';
      else if (tab === 'PERMITS' || tab === 'permits') targetTab = 'PERMITS';
      else {
        if (permits.some(p => String(p.id) === String(recId))) targetTab = 'PERMITS';
        else if (incidents.some(i => String(i.id) === String(recId))) targetTab = 'INCIDENTS';
        else if (environmentalReports.some(e => String(e.id) === String(recId))) targetTab = 'ENVIRONMENTAL';
        else if (periodicReports.some(r => String(r.id) === String(recId))) targetTab = 'PERIODIC';
        else if (hsePlans.some(p => String(p.id) === String(recId))) targetTab = 'PLAN';
      }
      setActiveTab(targetTab);
      setHighlightedRecordId(recId);
      setTimeout(() => {
        const el = document.getElementById(`record-${recId}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 200);
      setTimeout(() => {
        setHighlightedRecordId(null);
        window.history.replaceState({}, "", window.location.pathname);
      }, 3500);
    }

    return () => {
      window.removeEventListener("hamyar-notification-clicked", handleGlobalClick);
    };
  }, [permits, incidents, environmentalReports, periodicReports, hsePlans]);

  // Overall HSE Statistics
  const stats = useMemo(() => {
    return HseService.calculateHseStatistics(selectedProjectId);
  }, [permits, incidents, periodicReports, selectedProjectId]);

  // Workflow Handlers
  const handleOpenWorkflowModal = (item: any, action: WorkflowAction) => {
    setWorkflowTarget(item);
    setWorkflowActionType(action);
    setWorkflowAssignee('');
    setWorkflowComment('');
    setAttachWorkflowSignature(true);
    setIsWorkflowModalOpen(true);
  };

  const handleConfirmWorkflow = () => {
    if (!workflowTarget || !workflowActionType || !currentUser) return;

    try {
      const updated = WorkflowService.transition(
        workflowTarget,
        workflowActionType,
        currentUser,
        workflowComment,
        workflowAssignee || undefined
      );

      // Save updated entity
      if ('permitType' in workflowTarget) {
        HseService.saveWorkPermit(updated as WorkPermit);
      } else if ('incidentType' in workflowTarget) {
        HseService.saveIncidentReport(updated as IncidentReport);
      } else if ('environmentalAspect' in workflowTarget || 'aspect' in workflowTarget) {
        HseService.saveEnvironmentalReport(updated as EnvironmentalReport);
      } else if ('kpiStats' in workflowTarget) {
        HseService.savePeriodicReport(updated as WeeklyMonthlyHseReport);
      } else if ('policyStatement' in workflowTarget || 'hsePolicy' in workflowTarget) {
        HseService.saveHsePlan(updated as HsePlan);
      }

      setIsWorkflowModalOpen(false);
      setWorkflowTarget(null);
      refreshData();
    } catch (e: any) {
      alert(e.message || 'خطا در ثبت اقدام گردش کار');
    }
  };

  // Open History Modal
  const handleOpenHistory = (item: any) => {
    setHistoryTarget(item);
    setIsHistoryModalOpen(true);
  };

  // Standard Official Print - Exactly matching handlePrintOfficial in Technical Office
  const handlePrintOfficial = (docType: 'PERMIT' | 'INCIDENT' | 'ENVIRONMENTAL' | 'PERIODIC' | 'PLAN' | 'COMPREHENSIVE', item: any) => {
    handlePrintOfficialHse(docType, item, currentProject);
  };

  // Open Preview Modal
  const handleOpenPrint = (item: any, docType: 'PERMIT' | 'INCIDENT' | 'ENVIRONMENTAL' | 'PERIODIC' | 'PLAN' | 'COMPREHENSIVE') => {
    setPrintTarget(item);
    setPrintDocType(docType);
    setIsPrintModalOpen(true);
  };

  const handleOpenComprehensivePrint = () => {
    const comprehensiveData = {
      id: `HSE-COMP-${currentProject?.contractNumber || 'ALL'}-${Date.now().toString().slice(-4)}`,
      reportNumber: `HSE-AUDIT-${new Date().toLocaleDateString('fa-IR').replace(/\//g, '')}`,
      reportDate: new Date().toLocaleDateString('fa-IR'),
      workflowStatus: 'تایید نهایی و معتبر',
      safeManHours: stats.safeManHours,
      ltifr: stats.ltifr,
      totalPermitsCount: permits.length,
      activePermitsCount: stats.activePermitsCount,
      totalIncidentsCount: incidents.length,
      openIncidentsCount: stats.openIncidentsCount,
      totalEnvironmentalAudits: environmentalReports.length,
      environmentalComplianceRate: stats.environmentalComplianceRate,
      permitsList: permits,
      incidentsList: incidents,
      environmentalList: environmentalReports,
      location: 'کلیه زون‌ها و کارگاه‌های فعال پروژه'
    };
    handlePrintOfficial('COMPREHENSIVE', comprehensiveData);
  };

  // Delete Item
  const handleDeleteItem = (item: any, type: 'PERMIT' | 'INCIDENT' | 'ENVIRONMENTAL' | 'PERIODIC' | 'PLAN') => {
    if (!window.confirm('آیا از حذف این سند اطمینان دارید؟')) return;

    if (type === 'PERMIT') {
      HseService.deleteWorkPermit(item.id);
    } else if (type === 'INCIDENT') {
      HseService.deleteIncidentReport(item.id);
    } else if (type === 'ENVIRONMENTAL') {
      HseService.deleteEnvironmentalReport(item.id);
    } else if (type === 'PERIODIC') {
      HseService.deletePeriodicReport(item.id);
    } else if (type === 'PLAN') {
      HseService.deleteHsePlan(item.id);
    }
    refreshData();
  };

  // User Permissions Check
  const canCreate = currentUser ? SystemAdminService.checkPermission(currentUser.id, ModuleId.HSE, 'create') : false;
  const canDelete = currentUser ? SystemAdminService.checkPermission(currentUser.id, ModuleId.HSE, 'delete') : false;

  // Filtered lists
  const filteredPermits = useMemo(() => {
    return permits.filter(p => {
      const matchSearch =
        p.permitNumber.includes(searchQuery) ||
        p.location.includes(searchQuery) ||
        p.description.includes(searchQuery) ||
        HseService.getPermitTypeLabel(p.permitType).includes(searchQuery);
      const matchStatus = statusFilter === 'ALL' || p.workflowStatus === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [permits, searchQuery, statusFilter]);

  const filteredIncidents = useMemo(() => {
    return incidents.filter(i => {
      const matchSearch =
        i.incidentNumber.includes(searchQuery) ||
        i.title.includes(searchQuery) ||
        i.location.includes(searchQuery) ||
        (INCIDENT_TYPE_LABELS[i.incidentType] || '').includes(searchQuery);
      const matchStatus = statusFilter === 'ALL' || i.workflowStatus === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [incidents, searchQuery, statusFilter]);

  const filteredEnvironmental = useMemo(() => {
    return environmentalReports.filter(e => {
      const matchSearch =
        e.reportNumber.includes(searchQuery) ||
        e.title.includes(searchQuery) ||
        e.location.includes(searchQuery) ||
        (ENVIRONMENTAL_ASPECT_LABELS[e.aspect] || '').includes(searchQuery);
      const matchStatus = statusFilter === 'ALL' || e.workflowStatus === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [environmentalReports, searchQuery, statusFilter]);

  const filteredPeriodic = useMemo(() => {
    return periodicReports.filter(r => {
      const matchSearch =
        r.reportNumber.includes(searchQuery) ||
        r.summary.includes(searchQuery) ||
        r.periodStart.includes(searchQuery) ||
        r.periodEnd.includes(searchQuery);
      const matchStatus = statusFilter === 'ALL' || r.workflowStatus === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [periodicReports, searchQuery, statusFilter]);

  return (
    <div className="space-y-6 animate-fadeIn font-['Vazirmatn'] text-right" dir="rtl">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-stone-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-3xl flex items-center justify-center font-black border border-amber-500/20 shadow-xs">
            <ShieldAlert size={30} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-black text-stone-900 dark:text-white tracking-tight">
                مدیریت بهداشت، ایمنی و محیط زیست (HSE)
              </h1>
              <span className="px-3 py-1 bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 rounded-full text-xs font-black">
                استاندارد ISO 45001 & 14001
              </span>
            </div>
            <p className="text-stone-500 dark:text-slate-400 text-xs md:text-sm font-bold mt-1.5 flex items-center gap-2">
              <ShieldCheck size={15} className="text-emerald-600" />
              صدور مجوزهای کار (PTW)، ثبت حوادث، گزارشات محیط زیست، گزارشات دوره‌ای و برنامه جامع HSE
            </p>
          </div>
        </div>

        {/* Actions & Project Selector */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleOpenComprehensivePrint}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white rounded-2xl text-xs font-black shadow-sm transition-all cursor-pointer"
            title="چاپ رسمی کارنامه و عملکرد تجمیعی HSE با سربرگ استاندارد مهندسی و امضاهای سازمانی"
          >
            <Printer size={16} />
            <span>چاپ رسمی کارنامه جامع HSE</span>
          </button>

          <button
            onClick={() => {
              const comprehensiveData = {
                id: `HSE-COMP-${currentProject?.contractNumber || 'ALL'}-${Date.now().toString().slice(-4)}`,
                reportNumber: `HSE-AUDIT-${new Date().toLocaleDateString('fa-IR').replace(/\//g, '')}`,
                reportDate: new Date().toLocaleDateString('fa-IR'),
                workflowStatus: 'تایید نهایی و معتبر',
                safeManHours: stats.safeManHours,
                ltifr: stats.ltifr,
                totalPermitsCount: permits.length,
                activePermitsCount: stats.activePermitsCount,
                totalIncidentsCount: incidents.length,
                openIncidentsCount: stats.openIncidentsCount,
                totalEnvironmentalAudits: environmentalReports.length,
                environmentalComplianceRate: stats.environmentalComplianceRate,
                permitsList: permits,
                incidentsList: incidents,
                environmentalList: environmentalReports,
                location: 'کلیه زون‌ها و کارگاه‌های فعال پروژه'
              };
              handleOpenPrint(comprehensiveData, 'COMPREHENSIVE');
            }}
            className="flex items-center gap-1.5 px-3 py-2.5 bg-stone-100 hover:bg-stone-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-stone-700 dark:text-slate-200 rounded-2xl text-xs font-black shadow-xs transition-all cursor-pointer"
            title="پیش‌نمایش کارنامه جامع HSE"
          >
            <Eye size={15} />
            <span>پیش‌نمایش</span>
          </button>

          {/* Project Selector */}
          <div className="flex items-center gap-2 bg-stone-50 dark:bg-slate-800 p-2.5 rounded-2xl border border-stone-200 dark:border-slate-700 shadow-xs">
            <Building2 size={18} className="text-amber-600 mr-1 shrink-0" />
            <span className="text-xs font-bold text-stone-500 dark:text-slate-400 shrink-0">پروژه:</span>
            <select
              value={selectedProjectId}
              onChange={(e) => handleProjectChange(e.target.value)}
              className="bg-transparent text-xs font-black text-stone-900 dark:text-white outline-none cursor-pointer pl-3 max-w-[220px] md:max-w-[320px] truncate"
            >
              {(accessibleProjects.length > 0 ? accessibleProjects : projects).length === 0 ? (
                <option value="" className="bg-white dark:bg-slate-900 text-stone-900 dark:text-white">
                  هیچ پروژه‌ای یافت نشد
                </option>
              ) : (
                (accessibleProjects.length > 0 ? accessibleProjects : projects).map((p) => (
                  <option key={p.id} value={p.id} className="bg-white dark:bg-slate-900 text-stone-900 dark:text-white font-bold">
                    {p.title} {p.contractNumber ? `(${p.contractNumber})` : ''}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat 1: Safe Man-Hours */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-stone-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-stone-400 dark:text-slate-500 text-xs font-black block">نفر-ساعت ایمن بدون حادثه</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {stats.safeManHours.toLocaleString('fa-IR')}
              </span>
              <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                Zero LTI
              </span>
            </div>
            <span className="text-[11px] text-stone-500 font-bold block">
              ضریب تکرار حادثه (LTIFR): {stats.ltifr}
            </span>
          </div>
          <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 rounded-2xl flex items-center justify-center border border-emerald-100 dark:border-emerald-800">
            <ShieldCheck size={24} />
          </div>
        </div>

        {/* Stat 2: Active Work Permits */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-stone-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-stone-400 dark:text-slate-500 text-xs font-black block">مجوزهای کار ایمن (PTW)</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-amber-600 dark:text-amber-400">{stats.activePermitsCount}</span>
              <span className="text-[10px] font-black text-stone-500 bg-stone-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                از مجموع {permits.length}
              </span>
            </div>
            <span className="text-[11px] text-stone-500 font-bold block">
              پرمیت‌های فعال تحت نظارت کارگاهی
            </span>
          </div>
          <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950/40 text-amber-600 rounded-2xl flex items-center justify-center border border-amber-100 dark:border-amber-800">
            <Flame size={24} />
          </div>
        </div>

        {/* Stat 3: Incidents & Near Misses */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-stone-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-stone-400 dark:text-slate-500 text-xs font-black block">رویدادها و شبه‌حوادث</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-stone-900 dark:text-white">{incidents.length}</span>
              <span className="text-[10px] font-black text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-md">
                {stats.openIncidentsCount} اقدام باز
              </span>
            </div>
            <span className="text-[11px] text-stone-500 font-bold block">
              شبه‌حوادث ثبت شده جهت درس‌آموزی
            </span>
          </div>
          <div className="w-12 h-12 bg-rose-50 dark:bg-rose-950/40 text-rose-600 rounded-2xl flex items-center justify-center border border-rose-100 dark:border-rose-800">
            <AlertTriangle size={24} />
          </div>
        </div>

        {/* Stat 4: Environmental Audits */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-stone-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-stone-400 dark:text-slate-500 text-xs font-black block">پایش محیط زیست (ISO 14001)</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {environmentalReports.length}
              </span>
              <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                {stats.environmentalComplianceRate}% انطباق
              </span>
            </div>
            <span className="text-[11px] text-stone-500 font-bold block">
              کنترل پسماند، گرد و غبار و نشتی
            </span>
          </div>
          <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 rounded-2xl flex items-center justify-center border border-emerald-100 dark:border-emerald-800">
            <Trees size={24} />
          </div>
        </div>
      </div>

      {/* Module Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 dark:border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('PERMITS')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-xs transition-all cursor-pointer ${
            activeTab === 'PERMITS'
              ? 'bg-amber-600 text-white shadow-md'
              : 'bg-white dark:bg-slate-900 text-stone-600 dark:text-slate-300 border border-stone-200/80 dark:border-slate-800 hover:bg-stone-50'
          }`}
        >
          <Flame size={16} />
          مجوزهای کار ایمن (Work Permits - PTW)
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-black/10 text-white font-bold">
            {permits.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('INCIDENTS')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-xs transition-all cursor-pointer ${
            activeTab === 'INCIDENTS'
              ? 'bg-amber-600 text-white shadow-md'
              : 'bg-white dark:bg-slate-900 text-stone-600 dark:text-slate-300 border border-stone-200/80 dark:border-slate-800 hover:bg-stone-50'
          }`}
        >
          <AlertTriangle size={16} />
          گزارشات حوادث و شبه‌حوادث (Incident Reports)
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-black/10 text-white font-bold">
            {incidents.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('ENVIRONMENTAL')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-xs transition-all cursor-pointer ${
            activeTab === 'ENVIRONMENTAL'
              ? 'bg-amber-600 text-white shadow-md'
              : 'bg-white dark:bg-slate-900 text-stone-600 dark:text-slate-300 border border-stone-200/80 dark:border-slate-800 hover:bg-stone-50'
          }`}
        >
          <Trees size={16} />
          گزارشات محیط زیست (ISO 14001)
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-black/10 text-white font-bold">
            {environmentalReports.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('PERIODIC')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-xs transition-all cursor-pointer ${
            activeTab === 'PERIODIC'
              ? 'bg-amber-600 text-white shadow-md'
              : 'bg-white dark:bg-slate-900 text-stone-600 dark:text-slate-300 border border-stone-200/80 dark:border-slate-800 hover:bg-stone-50'
          }`}
        >
          <Calendar size={16} />
          گزارشات دوره‌ای (هفتگی و ماهانه)
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-black/10 text-white font-bold">
            {periodicReports.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('PLAN')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-xs transition-all cursor-pointer ${
            activeTab === 'PLAN'
              ? 'bg-amber-600 text-white shadow-md'
              : 'bg-white dark:bg-slate-900 text-stone-600 dark:text-slate-300 border border-stone-200/80 dark:border-slate-800 hover:bg-stone-50'
          }`}
        >
          <ShieldCheck size={16} />
          برنامه جامع HSE پروژه (HSE Plan)
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-black/10 text-white font-bold">
            {hsePlans.length}
          </span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-stone-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 w-full md:w-auto flex-1">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="جستجو در شماره، شرح، موقعیت..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-3 pr-9 py-2 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl text-xs font-bold text-stone-900 dark:text-white outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <Filter size={15} className="text-stone-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl text-xs font-bold text-stone-900 dark:text-white px-3 py-2 outline-none cursor-pointer"
            >
              <option value="ALL">همه وضعیت‌ها</option>
              <option value="DRAFT">پیش‌نویس</option>
              <option value="IN_REVIEW">در حال بررسی داخلی</option>
              <option value="APPROVED_INTERNAL">تایید داخلی پیمانکار</option>
              <option value="SENT_TO_CONSULTANT">ارسال شده به مشاور</option>
              <option value="SENT_TO_EMPLOYER">ارسال شده به کارفرما</option>
              <option value="APPROVED_FINAL">تایید نهایی و معتبر</option>
              <option value="REJECTED">رد شده</option>
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="w-full md:w-auto flex flex-col sm:flex-row items-center justify-end gap-2">
          {activeTab === 'PERMITS' && (
            <>
              <button
                onClick={() => setIsPermitTypesManagerOpen(true)}
                className="w-full sm:w-auto px-3.5 py-2.5 bg-stone-100 dark:bg-slate-800 hover:bg-stone-200 dark:hover:bg-slate-700 text-stone-800 dark:text-slate-200 border border-stone-200 dark:border-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
              >
                <ListChecks size={16} className="text-amber-600" />
                مدیریت نوع پرمیت و چک‌لیست‌ها
              </button>
              {canCreate && (
                <button
                  onClick={() => {
                    setEditingPermit(null);
                    setIsPermitModalOpen(true);
                  }}
                  className="w-full sm:w-auto px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-md shadow-amber-600/20 transition-all cursor-pointer"
                >
                  <Plus size={16} />
                  صدور مجوز کار جدید (PTW)
                </button>
              )}
            </>
          )}

          {canCreate && activeTab === 'INCIDENTS' && (
            <button
              onClick={() => {
                setEditingIncident(null);
                setIsIncidentModalOpen(true);
              }}
              className="w-full md:w-auto px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-md shadow-rose-600/20 transition-all cursor-pointer"
            >
              <Plus size={16} />
              ثبت گزارش رویداد / حادثه
            </button>
          )}

          {canCreate && activeTab === 'ENVIRONMENTAL' && (
            <button
              onClick={() => {
                setEditingEnvironmental(null);
                setIsEnvironmentalModalOpen(true);
              }}
              className="w-full md:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <Plus size={16} />
              ثبت گزارش پایش محیط زیست
            </button>
          )}

          {canCreate && activeTab === 'PERIODIC' && (
            <button
              onClick={() => {
                setEditingPeriodic(null);
                setIsPeriodicModalOpen(true);
              }}
              className="w-full md:w-auto px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
            >
              <Plus size={16} />
              ثبت گزارش دوره‌ای HSE
            </button>
          )}

          {canCreate && activeTab === 'PLAN' && (
            <button
              onClick={() => {
                setEditingPlan(null);
                setIsPlanModalOpen(true);
              }}
              className="w-full md:w-auto px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-md shadow-amber-600/20 transition-all cursor-pointer"
            >
              <Plus size={16} />
              تدوین برنامه HSE جدید
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: WORK PERMITS TABLE */}
      {activeTab === 'PERMITS' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-stone-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right border-collapse">
              <thead>
                <tr className="bg-stone-50 dark:bg-slate-800/60 border-b border-stone-200 dark:border-slate-800 font-black text-stone-600 dark:text-slate-400">
                  <th className="p-3.5 w-12 text-center">ردیف</th>
                  <th className="p-3.5">شماره پرمیت</th>
                  <th className="p-3.5">نوع مجوز کار</th>
                  <th className="p-3.5">موقعیت و شرح فعالیت</th>
                  <th className="p-3.5">ساعت مجاز</th>
                  <th className="p-3.5">چک‌لیست‌ها</th>
                  <th className="p-3.5">وضعیت گردش کار</th>
                  <th className="p-3.5 text-center">عملیات و اقدامات گردش کار</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-slate-800 font-bold">
                {filteredPermits.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-stone-400">
                      هیچ مجوز کاری در این پروژه ثبت نشده است.
                    </td>
                  </tr>
                ) : (
                  filteredPermits.map((permit, idx) => {
                    const actions = currentUser ? WorkflowService.getAvailableActions(permit, currentUser) : [];
                    const statusColor = WorkflowService.getStatusColor(permit.workflowStatus);

                    return (
                      <tr
                        key={permit.id}
                        id={`record-${permit.id}`}
                        className={`hover:bg-stone-50/70 dark:hover:bg-slate-800/40 transition-all duration-500 ${
                          highlightedRecordId === permit.id
                            ? 'bg-yellow-100/80 dark:bg-yellow-950/50 scale-[1.005] shadow-md z-10 relative ring-2 ring-amber-400'
                            : ''
                        }`}
                      >
                        <td className="p-3.5 text-center text-stone-400">{idx + 1}</td>
                        <td className="p-3.5 font-mono font-black text-stone-900 dark:text-white">
                          {permit.permitNumber}
                        </td>
                        <td className="p-3.5">
                          <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[11px] font-black">
                            {HseService.getPermitTypeLabel(permit.permitType)}
                          </span>
                        </td>
                        <td className="p-3.5 max-w-xs">
                          <div className="font-black text-stone-800 dark:text-slate-200 truncate">{permit.location}</div>
                          <div className="text-[11px] text-stone-500 dark:text-slate-400 truncate">{permit.description}</div>
                        </td>
                        <td className="p-3.5 font-mono text-[11px] text-stone-600 dark:text-slate-300">
                          {permit.startTime} تا {permit.endTime}
                        </td>
                        <td className="p-3.5">
                          <span className="text-[11px] text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded font-black">
                            {permit.checklists?.filter(c => c.status === 'YES').length || 0} / {permit.checklists?.length || 0} تایید
                          </span>
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${statusColor}`}>
                            {WorkflowService.getStatusLabel(permit.workflowStatus)}
                          </span>
                        </td>
                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            {/* Workflow action buttons */}
                            {actions.map((act) => (
                              <button
                                key={act}
                                onClick={() => handleOpenWorkflowModal(permit, act)}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer shadow-xs ${
                                  act === 'APPROVE' || act === 'FINAL_APPROVE'
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                    : act === 'REJECT'
                                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                                    : act === 'SEND_TO_CONSULTANT' || act === 'SEND_TO_EMPLOYER'
                                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                    : 'bg-amber-600 hover:bg-amber-700 text-white'
                                }`}
                              >
                                {WorkflowService.getActionLabel(act)}
                              </button>
                            ))}

                            {/* History button */}
                            <button
                              onClick={() => handleOpenHistory(permit)}
                              title="تاریخچه گردش کار"
                              className="p-1.5 bg-stone-100 dark:bg-slate-800 hover:bg-stone-200 dark:hover:bg-slate-700 text-stone-600 dark:text-slate-300 rounded-lg transition-colors cursor-pointer"
                            >
                              <History size={14} />
                            </button>

                            {/* Standard Official Print Button */}
                            <button
                              onClick={() => handlePrintOfficial('PERMIT', permit)}
                              title="چاپ رسمی پرمیت (استاندارد نظام فنی و اجرایی)"
                              className="p-1.5 bg-stone-100 dark:bg-slate-800 hover:bg-amber-100 hover:text-amber-800 dark:hover:bg-slate-700 text-stone-600 dark:text-slate-300 rounded-lg transition-colors cursor-pointer"
                            >
                              <Printer size={14} />
                            </button>

                            {/* Preview button */}
                            <button
                              onClick={() => handleOpenPrint(permit, 'PERMIT')}
                              title="پیش‌نمایش فرم پرمیت"
                              className="p-1.5 bg-stone-100 dark:bg-slate-800 hover:bg-stone-200 dark:hover:bg-slate-700 text-stone-600 dark:text-slate-300 rounded-lg transition-colors cursor-pointer"
                            >
                              <Eye size={14} />
                            </button>

                            {/* Edit button */}
                            {canCreate && (permit.workflowStatus === 'DRAFT' || permit.workflowStatus === 'REJECTED') && (
                              <button
                                onClick={() => {
                                  setEditingPermit(permit);
                                  setIsPermitModalOpen(true);
                                }}
                                title="ویرایش"
                                className="p-1.5 bg-stone-100 dark:bg-slate-800 hover:bg-stone-200 dark:hover:bg-slate-700 text-amber-600 rounded-lg transition-colors cursor-pointer"
                              >
                                <Edit3 size={14} />
                              </button>
                            )}

                            {/* Delete button */}
                            {canDelete && (permit.workflowStatus === 'DRAFT' || permit.workflowStatus === 'REJECTED') && (
                              <button
                                onClick={() => handleDeleteItem(permit, 'PERMIT')}
                                title="حذف"
                                className="p-1.5 bg-stone-100 dark:bg-slate-800 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: INCIDENT REPORTS TABLE */}
      {activeTab === 'INCIDENTS' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-stone-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right border-collapse">
              <thead>
                <tr className="bg-stone-50 dark:bg-slate-800/60 border-b border-stone-200 dark:border-slate-800 font-black text-stone-600 dark:text-slate-400">
                  <th className="p-3.5 w-12 text-center">ردیف</th>
                  <th className="p-3.5">شماره حادثه</th>
                  <th className="p-3.5">طبقه‌بندی رویداد</th>
                  <th className="p-3.5">عنوان و موقعیت</th>
                  <th className="p-3.5">تاریخ و ساعت</th>
                  <th className="p-3.5">شدت / روز تلف شده</th>
                  <th className="p-3.5">وضعیت گردش کار</th>
                  <th className="p-3.5 text-center">عملیات و اقدامات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-slate-800 font-bold">
                {filteredIncidents.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-stone-400">
                      هیچ رویدادی در این پروژه ثبت نشده است.
                    </td>
                  </tr>
                ) : (
                  filteredIncidents.map((inc, idx) => {
                    const actions = currentUser ? WorkflowService.getAvailableActions(inc, currentUser) : [];
                    const statusColor = WorkflowService.getStatusColor(inc.workflowStatus);

                    return (
                      <tr
                        key={inc.id}
                        id={`record-${inc.id}`}
                        className={`hover:bg-stone-50/70 dark:hover:bg-slate-800/40 transition-all duration-500 ${
                          highlightedRecordId === inc.id
                            ? 'bg-yellow-100/80 dark:bg-yellow-950/50 scale-[1.005] shadow-md z-10 relative ring-2 ring-amber-400'
                            : ''
                        }`}
                      >
                        <td className="p-3.5 text-center text-stone-400">{idx + 1}</td>
                        <td className="p-3.5 font-mono font-black text-stone-900 dark:text-white">
                          {inc.incidentNumber}
                        </td>
                        <td className="p-3.5">
                          <span className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-700 dark:text-rose-400 text-[11px] font-black">
                            {INCIDENT_TYPE_LABELS[inc.incidentType] || inc.incidentType}
                          </span>
                        </td>
                        <td className="p-3.5 max-w-xs">
                          <div className="font-black text-stone-800 dark:text-slate-200 truncate">{inc.title}</div>
                          <div className="text-[11px] text-stone-500 dark:text-slate-400 truncate">{inc.location}</div>
                        </td>
                        <td className="p-3.5 font-mono text-[11px] text-stone-600 dark:text-slate-300">
                          {inc.incidentDate} - {inc.incidentTime}
                        </td>
                        <td className="p-3.5">
                          <span className="text-[11px] font-black text-stone-800 dark:text-slate-200">
                            {inc.severity} | {inc.lostWorkDays || 0} روز
                          </span>
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${statusColor}`}>
                            {WorkflowService.getStatusLabel(inc.workflowStatus)}
                          </span>
                        </td>
                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            {actions.map((act) => (
                              <button
                                key={act}
                                onClick={() => handleOpenWorkflowModal(inc, act)}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer shadow-xs ${
                                  act === 'APPROVE' || act === 'FINAL_APPROVE'
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                    : act === 'REJECT'
                                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                                    : act === 'SEND_TO_CONSULTANT' || act === 'SEND_TO_EMPLOYER'
                                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                    : 'bg-amber-600 hover:bg-amber-700 text-white'
                                }`}
                              >
                                {WorkflowService.getActionLabel(act)}
                              </button>
                            ))}

                            <button
                              onClick={() => handleOpenHistory(inc)}
                              title="تاریخچه گردش کار"
                              className="p-1.5 bg-stone-100 dark:bg-slate-800 hover:bg-stone-200 dark:hover:bg-slate-700 text-stone-600 dark:text-slate-300 rounded-lg transition-colors cursor-pointer"
                            >
                              <History size={14} />
                            </button>

                            {/* Standard Official Print Button */}
                            <button
                              onClick={() => handlePrintOfficial('INCIDENT', inc)}
                              title="چاپ رسمی گزارش حادثه (استاندارد نظام فنی و اجرایی)"
                              className="p-1.5 bg-stone-100 dark:bg-slate-800 hover:bg-amber-100 hover:text-amber-800 dark:hover:bg-slate-700 text-stone-600 dark:text-slate-300 rounded-lg transition-colors cursor-pointer"
                            >
                              <Printer size={14} />
                            </button>

                            {/* Preview button */}
                            <button
                              onClick={() => handleOpenPrint(inc, 'INCIDENT')}
                              title="پیش‌نمایش فرم حادثه"
                              className="p-1.5 bg-stone-100 dark:bg-slate-800 hover:bg-stone-200 dark:hover:bg-slate-700 text-stone-600 dark:text-slate-300 rounded-lg transition-colors cursor-pointer"
                            >
                              <Eye size={14} />
                            </button>

                            {canCreate && (inc.workflowStatus === 'DRAFT' || inc.workflowStatus === 'REJECTED') && (
                              <button
                                onClick={() => {
                                  setEditingIncident(inc);
                                  setIsIncidentModalOpen(true);
                                }}
                                title="ویرایش"
                                className="p-1.5 bg-stone-100 dark:bg-slate-800 hover:bg-stone-200 dark:hover:bg-slate-700 text-amber-600 rounded-lg transition-colors cursor-pointer"
                              >
                                <Edit3 size={14} />
                              </button>
                            )}

                            {canDelete && (inc.workflowStatus === 'DRAFT' || inc.workflowStatus === 'REJECTED') && (
                              <button
                                onClick={() => handleDeleteItem(inc, 'INCIDENT')}
                                title="حذف"
                                className="p-1.5 bg-stone-100 dark:bg-slate-800 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: ENVIRONMENTAL REPORTS TABLE */}
      {activeTab === 'ENVIRONMENTAL' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-stone-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right border-collapse">
              <thead>
                <tr className="bg-stone-50 dark:bg-slate-800/60 border-b border-stone-200 dark:border-slate-800 font-black text-stone-600 dark:text-slate-400">
                  <th className="p-3.5 w-12 text-center">ردیف</th>
                  <th className="p-3.5">شماره گزارش</th>
                  <th className="p-3.5">جنبه زیست‌محیطی</th>
                  <th className="p-3.5">عنوان و موقعیت</th>
                  <th className="p-3.5">تاریخ بازرسی</th>
                  <th className="p-3.5">وضعیت انطباق</th>
                  <th className="p-3.5">وضعیت گردش کار</th>
                  <th className="p-3.5 text-center">عملیات و اقدامات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-slate-800 font-bold">
                {filteredEnvironmental.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-stone-400">
                      هیچ گزارش زیست‌محیطی در این پروژه ثبت نشده است.
                    </td>
                  </tr>
                ) : (
                  filteredEnvironmental.map((env, idx) => {
                    const actions = currentUser ? WorkflowService.getAvailableActions(env, currentUser) : [];
                    const statusColor = WorkflowService.getStatusColor(env.workflowStatus);

                    return (
                      <tr
                        key={env.id}
                        id={`record-${env.id}`}
                        className={`hover:bg-stone-50/70 dark:hover:bg-slate-800/40 transition-all duration-500 ${
                          highlightedRecordId === env.id
                            ? 'bg-yellow-100/80 dark:bg-yellow-950/50 scale-[1.005] shadow-md z-10 relative ring-2 ring-amber-400'
                            : ''
                        }`}
                      >
                        <td className="p-3.5 text-center text-stone-400">{idx + 1}</td>
                        <td className="p-3.5 font-mono font-black text-stone-900 dark:text-white">
                          {env.reportNumber}
                        </td>
                        <td className="p-3.5">
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[11px] font-black">
                            {ENVIRONMENTAL_ASPECT_LABELS[env.aspect] || env.aspect}
                          </span>
                        </td>
                        <td className="p-3.5 max-w-xs">
                          <div className="font-black text-stone-800 dark:text-slate-200 truncate">{env.title}</div>
                          <div className="text-[11px] text-stone-500 dark:text-slate-400 truncate">{env.location}</div>
                        </td>
                        <td className="p-3.5 font-mono text-[11px] text-stone-600 dark:text-slate-300">
                          {env.reportDate}
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-black ${
                              env.complianceStatus === 'COMPLIANT'
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
                                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400'
                            }`}
                          >
                            {env.complianceStatus === 'COMPLIANT' ? 'منطبق و استاندارد ✓' : 'عدم انطباق ✕'}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${statusColor}`}>
                            {WorkflowService.getStatusLabel(env.workflowStatus)}
                          </span>
                        </td>
                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            {actions.map((act) => (
                              <button
                                key={act}
                                onClick={() => handleOpenWorkflowModal(env, act)}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer shadow-xs ${
                                  act === 'APPROVE' || act === 'FINAL_APPROVE'
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                    : act === 'REJECT'
                                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                                    : act === 'SEND_TO_CONSULTANT' || act === 'SEND_TO_EMPLOYER'
                                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                    : 'bg-amber-600 hover:bg-amber-700 text-white'
                                }`}
                              >
                                {WorkflowService.getActionLabel(act)}
                              </button>
                            ))}

                            <button
                              onClick={() => handleOpenHistory(env)}
                              title="تاریخچه گردش کار"
                              className="p-1.5 bg-stone-100 dark:bg-slate-800 hover:bg-stone-200 dark:hover:bg-slate-700 text-stone-600 dark:text-slate-300 rounded-lg transition-colors cursor-pointer"
                            >
                              <History size={14} />
                            </button>

                            {/* Standard Official Print Button */}
                            <button
                              onClick={() => handlePrintOfficial('ENVIRONMENTAL', env)}
                              title="چاپ رسمی پایش زیست‌محیطی (استاندارد نظام فنی و اجرایی)"
                              className="p-1.5 bg-stone-100 dark:bg-slate-800 hover:bg-amber-100 hover:text-amber-800 dark:hover:bg-slate-700 text-stone-600 dark:text-slate-300 rounded-lg transition-colors cursor-pointer"
                            >
                              <Printer size={14} />
                            </button>

                            {/* Preview button */}
                            <button
                              onClick={() => handleOpenPrint(env, 'ENVIRONMENTAL')}
                              title="پیش‌نمایش فرم پایش زیست‌محیطی"
                              className="p-1.5 bg-stone-100 dark:bg-slate-800 hover:bg-stone-200 dark:hover:bg-slate-700 text-stone-600 dark:text-slate-300 rounded-lg transition-colors cursor-pointer"
                            >
                              <Eye size={14} />
                            </button>

                            {canCreate && (env.workflowStatus === 'DRAFT' || env.workflowStatus === 'REJECTED') && (
                              <button
                                onClick={() => {
                                  setEditingEnvironmental(env);
                                  setIsEnvironmentalModalOpen(true);
                                }}
                                title="ویرایش"
                                className="p-1.5 bg-stone-100 dark:bg-slate-800 hover:bg-stone-200 dark:hover:bg-slate-700 text-amber-600 rounded-lg transition-colors cursor-pointer"
                              >
                                <Edit3 size={14} />
                              </button>
                            )}

                            {canDelete && (env.workflowStatus === 'DRAFT' || env.workflowStatus === 'REJECTED') && (
                              <button
                                onClick={() => handleDeleteItem(env, 'ENVIRONMENTAL')}
                                title="حذف"
                                className="p-1.5 bg-stone-100 dark:bg-slate-800 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: PERIODIC REPORTS TABLE */}
      {activeTab === 'PERIODIC' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-stone-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right border-collapse">
              <thead>
                <tr className="bg-stone-50 dark:bg-slate-800/60 border-b border-stone-200 dark:border-slate-800 font-black text-stone-600 dark:text-slate-400">
                  <th className="p-3.5 w-12 text-center">ردیف</th>
                  <th className="p-3.5">شماره گزارش</th>
                  <th className="p-3.5">نوع دوره</th>
                  <th className="p-3.5">بازه زمانی</th>
                  <th className="p-3.5">نفر-ساعت ایمن</th>
                  <th className="p-3.5">ضریب LTIFR</th>
                  <th className="p-3.5">وضعیت گردش کار</th>
                  <th className="p-3.5 text-center">عملیات و اقدامات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-slate-800 font-bold">
                {filteredPeriodic.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-stone-400">
                      هیچ گزارش دوره‌ای در این پروژه ثبت نشده است.
                    </td>
                  </tr>
                ) : (
                  filteredPeriodic.map((rep, idx) => {
                    const actions = currentUser ? WorkflowService.getAvailableActions(rep, currentUser) : [];
                    const statusColor = WorkflowService.getStatusColor(rep.workflowStatus);

                    return (
                      <tr
                        key={rep.id}
                        id={`record-${rep.id}`}
                        className={`hover:bg-stone-50/70 dark:hover:bg-slate-800/40 transition-all duration-500 ${
                          highlightedRecordId === rep.id
                            ? 'bg-yellow-100/80 dark:bg-yellow-950/50 scale-[1.005] shadow-md z-10 relative ring-2 ring-amber-400'
                            : ''
                        }`}
                      >
                        <td className="p-3.5 text-center text-stone-400">{idx + 1}</td>
                        <td className="p-3.5 font-mono font-black text-stone-900 dark:text-white">
                          {rep.reportNumber}
                        </td>
                        <td className="p-3.5">
                          <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 text-[11px] font-black">
                            {rep.reportType === 'MONTHLY' ? 'ماهانه' : 'هفتگی'}
                          </span>
                        </td>
                        <td className="p-3.5 font-mono text-[11px] text-stone-700 dark:text-slate-300">
                          {rep.periodStart} تا {rep.periodEnd}
                        </td>
                        <td className="p-3.5 font-mono font-black text-emerald-600">
                          {rep.kpiStats?.safeManHours?.toLocaleString('fa-IR') || '۰'}
                        </td>
                        <td className="p-3.5 font-mono font-black text-stone-900 dark:text-white">
                          {rep.kpiStats?.ltifr || '۰.۰۰'}
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${statusColor}`}>
                            {WorkflowService.getStatusLabel(rep.workflowStatus)}
                          </span>
                        </td>
                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            {actions.map((act) => (
                              <button
                                key={act}
                                onClick={() => handleOpenWorkflowModal(rep, act)}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer shadow-xs ${
                                  act === 'APPROVE' || act === 'FINAL_APPROVE'
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                    : act === 'REJECT'
                                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                                    : act === 'SEND_TO_CONSULTANT' || act === 'SEND_TO_EMPLOYER'
                                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                    : 'bg-amber-600 hover:bg-amber-700 text-white'
                                }`}
                              >
                                {WorkflowService.getActionLabel(act)}
                              </button>
                            ))}

                            <button
                              onClick={() => handleOpenHistory(rep)}
                              title="تاریخچه گردش کار"
                              className="p-1.5 bg-stone-100 dark:bg-slate-800 hover:bg-stone-200 dark:hover:bg-slate-700 text-stone-600 dark:text-slate-300 rounded-lg transition-colors cursor-pointer"
                            >
                              <History size={14} />
                            </button>

                            {/* Standard Official Print Button */}
                            <button
                              onClick={() => handlePrintOfficial('PERIODIC', rep)}
                              title="چاپ رسمی گزارش ادواری (استاندارد نظام فنی و اجرایی)"
                              className="p-1.5 bg-stone-100 dark:bg-slate-800 hover:bg-amber-100 hover:text-amber-800 dark:hover:bg-slate-700 text-stone-600 dark:text-slate-300 rounded-lg transition-colors cursor-pointer"
                            >
                              <Printer size={14} />
                            </button>

                            {/* Preview button */}
                            <button
                              onClick={() => handleOpenPrint(rep, 'PERIODIC')}
                              title="پیش‌نمایش فرم ادواری"
                              className="p-1.5 bg-stone-100 dark:bg-slate-800 hover:bg-stone-200 dark:hover:bg-slate-700 text-stone-600 dark:text-slate-300 rounded-lg transition-colors cursor-pointer"
                            >
                              <Eye size={14} />
                            </button>

                            {canCreate && (rep.workflowStatus === 'DRAFT' || rep.workflowStatus === 'REJECTED') && (
                              <button
                                onClick={() => {
                                  setEditingPeriodic(rep);
                                  setIsPeriodicModalOpen(true);
                                }}
                                title="ویرایش"
                                className="p-1.5 bg-stone-100 dark:bg-slate-800 hover:bg-stone-200 dark:hover:bg-slate-700 text-amber-600 rounded-lg transition-colors cursor-pointer"
                              >
                                <Edit3 size={14} />
                              </button>
                            )}

                            {canDelete && (rep.workflowStatus === 'DRAFT' || rep.workflowStatus === 'REJECTED') && (
                              <button
                                onClick={() => handleDeleteItem(rep, 'PERIODIC')}
                                title="حذف"
                                className="p-1.5 bg-stone-100 dark:bg-slate-800 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: HSE PLAN VIEW */}
      {activeTab === 'PLAN' && (
        <div className="space-y-6">
          {hsePlans.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 p-12 rounded-3xl border border-stone-200/80 dark:border-slate-800 text-center text-stone-400">
              هیچ برنامه جامع HSE برای این پروژه ثبت نشده است.
            </div>
          ) : (
            hsePlans.map((plan) => {
              const actions = currentUser ? WorkflowService.getAvailableActions(plan, currentUser) : [];
              const statusColor = WorkflowService.getStatusColor(plan.workflowStatus);

              return (
                <div
                  key={plan.id}
                  id={`record-${plan.id}`}
                  className={`bg-white dark:bg-slate-900 rounded-3xl border border-stone-200/80 dark:border-slate-800 p-6 md:p-8 space-y-6 shadow-sm transition-all duration-500 ${
                    highlightedRecordId === plan.id
                      ? 'ring-2 ring-amber-400 bg-yellow-50/60 dark:bg-yellow-950/20 shadow-md'
                      : ''
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-stone-200 dark:border-slate-800 pb-5">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg md:text-xl font-black text-stone-900 dark:text-white">{plan.title}</h2>
                        <span className="px-2.5 py-0.5 bg-stone-100 dark:bg-slate-800 text-stone-600 dark:text-slate-300 rounded-lg text-xs font-mono font-bold">
                          ویرایش: {plan.revision}
                        </span>
                      </div>
                      <p className="text-xs text-stone-500 mt-1 font-bold">
                        شماره سند: {plan.planNumber} | تاریخ بازنگری: {plan.revisionDate}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-black ${statusColor}`}>
                        {WorkflowService.getStatusLabel(plan.workflowStatus)}
                      </span>

                      {actions.map((act) => (
                        <button
                          key={act}
                          onClick={() => handleOpenWorkflowModal(plan, act)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs ${
                            act === 'APPROVE' || act === 'FINAL_APPROVE'
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              : act === 'REJECT'
                              ? 'bg-rose-600 hover:bg-rose-700 text-white'
                              : act === 'SEND_TO_CONSULTANT' || act === 'SEND_TO_EMPLOYER'
                              ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                              : 'bg-amber-600 hover:bg-amber-700 text-white'
                          }`}
                        >
                          {WorkflowService.getActionLabel(act)}
                        </button>
                      ))}

                      <button
                        onClick={() => handleOpenHistory(plan)}
                        className="px-3 py-1.5 bg-stone-100 dark:bg-slate-800 text-stone-600 dark:text-slate-300 rounded-xl text-xs font-black flex items-center gap-1 cursor-pointer"
                      >
                        <History size={14} /> تاریخچه
                      </button>

                      {/* Standard Official Print Button */}
                      <button
                        onClick={() => handlePrintOfficial('PLAN', plan)}
                        title="چاپ رسمی طرح جامع HSE (استاندارد نظام فنی و اجرایی)"
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Printer size={14} /> چاپ رسمی سند
                      </button>

                      {/* Preview button */}
                      <button
                        onClick={() => handleOpenPrint(plan, 'PLAN')}
                        title="پیش‌نمایش سند طرح جامع HSE"
                        className="px-2.5 py-1.5 bg-stone-100 dark:bg-slate-800 text-stone-600 dark:text-slate-300 hover:bg-stone-200 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Eye size={14} /> پیش‌نمایش
                      </button>

                      {canCreate && (plan.workflowStatus === 'DRAFT' || plan.workflowStatus === 'REJECTED') && (
                        <button
                          onClick={() => {
                            setEditingPlan(plan);
                            setIsPlanModalOpen(true);
                          }}
                          className="px-3 py-1.5 bg-amber-500/10 text-amber-600 rounded-xl text-xs font-black flex items-center gap-1 cursor-pointer"
                        >
                          <Edit3 size={14} /> ویرایش
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Policy Statement Box */}
                  <div className="p-4 bg-stone-50 dark:bg-slate-800/50 rounded-2xl border border-stone-200/80 dark:border-slate-800 space-y-1.5">
                    <span className="text-xs font-black text-stone-800 dark:text-white flex items-center gap-1.5">
                      <ShieldCheck size={16} className="text-amber-600" />
                      خط‌مشی و بیانیه رسمی بهداشت، ایمنی و محیط زیست (HSE Policy):
                    </span>
                    <p className="text-xs font-bold text-stone-600 dark:text-slate-300 leading-relaxed">
                      {plan.policyStatement}
                    </p>
                  </div>

                  {/* Risk Assessment Matrix */}
                  <div className="space-y-3">
                    <span className="text-xs font-black text-stone-800 dark:text-white block">
                      ماتریس شناسایی خطرات و اقدامات کنترلی ریسک (Risk Assessment Matrix):
                    </span>
                    <div className="border border-stone-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                      <table className="w-full text-xs text-right border-collapse">
                        <thead>
                          <tr className="bg-stone-50 dark:bg-slate-800/60 border-b border-stone-200 dark:border-slate-800 font-black text-stone-600 dark:text-slate-400">
                            <th className="p-3 w-10 text-center">ردیف</th>
                            <th className="p-3">فعالیت اجرایی</th>
                            <th className="p-3">خطرات شناسایی شده</th>
                            <th className="p-3 w-28 text-center">ریسک اولیه</th>
                            <th className="p-3">اقدامات کنترلی و پیشگیرانه</th>
                            <th className="p-3 w-28 text-center">ریسک باقیمانده</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100 dark:divide-slate-800 font-bold">
                          {plan.riskMatrix.map((rm, rIdx) => (
                            <tr key={rm.id || rIdx} className="hover:bg-stone-50/50 dark:hover:bg-slate-800/30">
                              <td className="p-3 text-center text-stone-400">{rIdx + 1}</td>
                              <td className="p-3 font-black text-stone-900 dark:text-white">{rm.activity}</td>
                              <td className="p-3 text-stone-600 dark:text-slate-300">{rm.hazard}</td>
                              <td className="p-3 text-center text-rose-600 font-black">{rm.initialRisk}</td>
                              <td className="p-3 text-stone-700 dark:text-slate-200">{rm.controlMeasure}</td>
                              <td className="p-3 text-center text-emerald-600 font-black">{rm.residualRisk}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Emergency Scenarios & Contacts Strip */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-bold">
                    <div className="p-4 bg-stone-50 dark:bg-slate-800/50 rounded-2xl border border-stone-200/80 dark:border-slate-800">
                      <span className="text-stone-400 text-[10px] block">نقطه تجمع اضطراری:</span>
                      <span className="text-stone-800 dark:text-white font-black">{plan.emergencyAssemblyPoint}</span>
                    </div>
                    <div className="p-4 bg-stone-50 dark:bg-slate-800/50 rounded-2xl border border-stone-200/80 dark:border-slate-800">
                      <span className="text-stone-400 text-[10px] block">تلفن بحران و امداد کارگاه:</span>
                      <span className="text-stone-800 dark:text-white font-mono font-black">{plan.emergencyPhone}</span>
                    </div>
                    <div className="p-4 bg-stone-50 dark:bg-slate-800/50 rounded-2xl border border-stone-200/80 dark:border-slate-800">
                      <span className="text-stone-400 text-[10px] block">بیمارستان پشتیبان:</span>
                      <span className="text-stone-800 dark:text-white font-black">{plan.hospitalSupport}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ALL MODALS */}

      {/* 1. Workflow Modal */}
      <HseWorkflowModal
        isOpen={isWorkflowModalOpen}
        onClose={() => {
          setIsWorkflowModalOpen(false);
          setWorkflowTarget(null);
        }}
        onConfirm={handleConfirmWorkflow}
        actionType={workflowActionType}
        item={workflowTarget}
        assignee={workflowAssignee}
        onAssigneeChange={setWorkflowAssignee}
        comment={workflowComment}
        onCommentChange={setWorkflowComment}
        currentUser={currentUser}
        attachWorkflowSignature={attachWorkflowSignature}
        setAttachWorkflowSignature={setAttachWorkflowSignature}
      />

      {/* 2. History Modal */}
      <HseHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => {
          setIsHistoryModalOpen(false);
          setHistoryTarget(null);
        }}
        history={historyTarget?.workflowHistory || []}
        title={historyTarget?.permitNumber || historyTarget?.incidentNumber || historyTarget?.reportNumber || historyTarget?.planNumber || ''}
      />

      {/* 3. Print Modal */}
      <HsePrintModal
        isOpen={isPrintModalOpen}
        onClose={() => {
          setIsPrintModalOpen(false);
          setPrintTarget(null);
        }}
        documentType={printDocType}
        item={printTarget}
        project={currentProject}
        currentUser={currentUser}
      />

      {/* 4. Work Permit Modal */}
      <WorkPermitModal
        isOpen={isPermitModalOpen}
        onClose={() => {
          setIsPermitModalOpen(false);
          setEditingPermit(null);
        }}
        onSave={(permit) => {
          HseService.saveWorkPermit(permit);
          setIsPermitModalOpen(false);
          setEditingPermit(null);
          refreshData();
        }}
        initialPermit={editingPermit}
        projectId={selectedProjectId}
        currentUser={currentUser}
      />

      {/* 5. Incident Modal */}
      <IncidentModal
        isOpen={isIncidentModalOpen}
        onClose={() => {
          setIsIncidentModalOpen(false);
          setEditingIncident(null);
        }}
        onSave={(incident) => {
          HseService.saveIncidentReport(incident);
          setIsIncidentModalOpen(false);
          setEditingIncident(null);
          refreshData();
        }}
        initialIncident={editingIncident}
        projectId={selectedProjectId}
        currentUser={currentUser}
      />

      {/* 6. Environmental Modal */}
      <EnvironmentalModal
        isOpen={isEnvironmentalModalOpen}
        onClose={() => {
          setIsEnvironmentalModalOpen(false);
          setEditingEnvironmental(null);
        }}
        onSave={(report) => {
          HseService.saveEnvironmentalReport(report);
          setIsEnvironmentalModalOpen(false);
          setEditingEnvironmental(null);
          refreshData();
        }}
        initialReport={editingEnvironmental}
        projectId={selectedProjectId}
        currentUser={currentUser}
      />

      {/* 7. Periodic Report Modal */}
      <PeriodicReportModal
        isOpen={isPeriodicModalOpen}
        onClose={() => {
          setIsPeriodicModalOpen(false);
          setEditingPeriodic(null);
        }}
        onSave={(report) => {
          HseService.savePeriodicReport(report);
          setIsPeriodicModalOpen(false);
          setEditingPeriodic(null);
          refreshData();
        }}
        initialReport={editingPeriodic}
        projectId={selectedProjectId}
        currentUser={currentUser}
      />

      {/* 8. HSE Plan Modal */}
      <HsePlanModal
        isOpen={isPlanModalOpen}
        onClose={() => {
          setIsPlanModalOpen(false);
          setEditingPlan(null);
        }}
        onSave={(plan) => {
          HseService.saveHsePlan(plan);
          setIsPlanModalOpen(false);
          setEditingPlan(null);
          refreshData();
        }}
        initialPlan={editingPlan}
        projectId={selectedProjectId}
        currentUser={currentUser}
      />

      {/* 9. Permit Types & Specialized Checklists Manager Modal */}
      <PermitTypesManagerModal
        isOpen={isPermitTypesManagerOpen}
        onClose={() => {
          setIsPermitTypesManagerOpen(false);
          refreshData();
        }}
      />
    </div>
  );
}
