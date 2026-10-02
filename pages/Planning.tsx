import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3, Calendar, Clock, TrendingUp, TrendingDown, ShieldAlert,
  CheckCircle, AlertCircle, AlertTriangle, FileText, Plus, Trash2, Edit3,
  Printer, ArrowRight, ArrowLeft, RefreshCw, Layers, Check, X, Users,
  DollarSign, Activity, FileCheck, Lock, Unlock, Eye, HelpCircle,
  ChevronLeft, Award, Zap, FileSpreadsheet, Send, Filter, ChevronDown, Sliders, Scale, Sparkles
} from 'lucide-react';
import { Project, WorkflowStatus, WorkflowAction, WorkflowEvent, DailyReport, PlanningActivity, PlanningProgressReport, PlanningDelayLog, ProjectBaseline, ProgressTrackingRecord, PeriodicPlanRecord, ReplanRecord } from '../types';
import { WorkflowService } from '../services/workflowService';
import { SystemAdminService } from '../services/systemAdminService';
import { SystemUser, OrganizationType } from '../systemAdminTypes';
import { formatUserDisplayFormal } from '../src/utils/userFormatter';
import { EvmEngineService } from '../services/evmEngineService';
import EvmKpiCards from '../components/evm/EvmKpiCards';
import SCurveChart from '../components/evm/SCurveChart';
import ProgressTrackingModal from '../components/evm/ProgressTrackingModal';
import PlanReplanModal from '../components/evm/PlanReplanModal';
import ProjectReplanModal from '../components/evm/ProjectReplanModal';
import BaselineManagerModal from '../components/evm/BaselineManagerModal';
import WbsControlTable from '../components/evm/WbsControlTable';
import PeriodicComparisonTable from '../components/evm/PeriodicComparisonTable';
import { PlanningPrintService } from '../services/planningPrintService';
import { DelayClaimsManager } from '../components/evm/DelayClaimsManager';
import { LossClaimsManager } from '../components/evm/LossClaimsManager';
import { ShamsiDatePicker } from '../components/ShamsiDatePicker';
import {
  getTodayShamsi,
  calculateActivityPlannedProgress,
  isDatePassed,
  parseShamsiDate,
  jalaliToDayNumber,
  calculateShamsiDayDiff
} from '../utils/dateUtils';

// Local storage helpers
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

export default function Planning() {
  // Current user & Project context
  const [currentUser, setCurrentUser] = useState<any>(() => SystemAdminService.getCurrentUser());
  const [userOrgType, setUserOrgType] = useState<OrganizationType | undefined>(undefined);
  const [userOrgName, setUserOrgName] = useState<string>('');
  
  const [projects, setProjects] = useState<Project[]>(() => loadData('hamyar_projects', []));

  const accessibleProjects = useMemo(() => {
    return projects.filter(p => SystemAdminService.canUserAccessProject(p.id, currentUser));
  }, [projects, currentUser]);

  const [selectedProjectId, setSelectedProjectId] = useState<string>(() => {
    const saved = localStorage.getItem("hamyar_selected_project_id");
    if (saved && saved !== 'undefined' && saved !== 'null') return saved;
    const p = loadData('hamyar_projects', []);
    return p.length > 0 ? p[0].id : '1';
  });

  useEffect(() => {
    if (accessibleProjects.length > 0 && !accessibleProjects.some(p => String(p.id) === String(selectedProjectId))) {
      setSelectedProjectId(String(accessibleProjects[0].id));
    }
  }, [accessibleProjects, selectedProjectId]);

  const activeProject: Project = useMemo(() => {
    return accessibleProjects.find(p => p.id === selectedProjectId) || accessibleProjects[0] || projects.find(p => p.id === selectedProjectId) || projects[0] || ({ id: '2', title: 'پروژه نمونه', initialBudget: 40000000000 } as Project);
  }, [accessibleProjects, projects, selectedProjectId]);

  // Main Sub-tabs
  const [activeSubTab, setActiveSubTab] = useState<'gantt' | 'evm' | 'scurve' | 'reports' | 'delays' | 'loss_claims'>('gantt');
  const [delaySubMode, setDelaySubMode] = useState<'claims' | 'logs'>('claims');
  const [syncKey, setSyncKey] = useState<number>(0);

  // Auto-sync statements on window focus or storage changes
  useEffect(() => {
    const handleSync = () => setSyncKey(k => k + 1);
    window.addEventListener('storage', handleSync);
    window.addEventListener('focus', handleSync);
    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('focus', handleSync);
    };
  }, []);

  // Listen for global project change event
  useEffect(() => {
    const handleProjectChanged = (e?: Event) => {
      const customEvent = e as CustomEvent<{ projectId: string }>;
      const newProjId = customEvent?.detail?.projectId || localStorage.getItem("hamyar_selected_project_id");
      if (newProjId && newProjId !== selectedProjectId) {
        setSelectedProjectId(newProjId);
      }
    };
    window.addEventListener("project-changed", handleProjectChanged);
    return () => window.removeEventListener("project-changed", handleProjectChanged);
  }, [selectedProjectId]);

  // Planning Data States
  const [activities, setActivities] = useState<PlanningActivity[]>(() => {
    const saved = loadData<PlanningActivity[]>('hamyar_planning_activities', []);
    if (saved.length > 0) return saved;
    // Default initial mock activities
    return [
      {
        id: 'act_1',
        projectId: '2',
        code: '1.1',
        title: 'تجهیز کارگاه و کارهای مقدماتی اولیه',
        cbsNodeId: 'node_1',
        weightPercent: 5,
        baselineStartDate: '1405/01/05',
        baselineEndDate: '1405/02/05',
        actualStartDate: '1405/01/05',
        actualEndDate: '1405/02/10',
        durationDays: 30,
        plannedProgress: 100,
        actualProgress: 100,
        isCriticalPath: false,
        status: 'COMPLETED',
        unit: 'مقطوع',
        totalQuantity: 1
      },
      {
        id: 'act_2',
        projectId: '2',
        code: '1.2',
        title: 'خاکبرداری، گودبرداری و پی‌کنی',
        cbsNodeId: 'node_2',
        weightPercent: 15,
        baselineStartDate: '1405/02/01',
        baselineEndDate: '1405/03/15',
        actualStartDate: '1405/02/05',
        actualEndDate: '1405/03/25',
        durationDays: 45,
        plannedProgress: 100,
        actualProgress: 88,
        isCriticalPath: true,
        status: 'DELAYED',
        predecessorCodes: '1.1',
        unit: 'متر مکعب',
        totalQuantity: 12000
      },
      {
        id: 'act_3',
        projectId: '2',
        code: '1.3',
        title: 'بتن‌ریزی فونداسیون و آرماتوربندی',
        cbsNodeId: 'node_3',
        weightPercent: 25,
        baselineStartDate: '1405/03/10',
        baselineEndDate: '1405/05/20',
        actualStartDate: '1405/03/20',
        durationDays: 70,
        plannedProgress: 75,
        actualProgress: 60,
        isCriticalPath: true,
        status: 'IN_PROGRESS',
        predecessorCodes: '1.2',
        unit: 'متر مکعب',
        totalQuantity: 4500
      },
      {
        id: 'act_4',
        projectId: '2',
        code: '2.1',
        title: 'اجرای اسکلت فلزی / بتنی سازه اصلی',
        weightPercent: 35,
        baselineStartDate: '1405/05/01',
        baselineEndDate: '1405/09/30',
        durationDays: 150,
        plannedProgress: 20,
        actualProgress: 12,
        isCriticalPath: true,
        status: 'IN_PROGRESS',
        predecessorCodes: '1.3',
        unit: 'تن',
        totalQuantity: 850
      },
      {
        id: 'act_5',
        projectId: '2',
        code: '2.2',
        title: 'سفت‌کاری و دیوارهای محوطه و طبقات',
        weightPercent: 20,
        baselineStartDate: '1405/08/01',
        baselineEndDate: '1405/12/29',
        durationDays: 150,
        plannedProgress: 0,
        actualProgress: 0,
        isCriticalPath: false,
        status: 'NOT_STARTED',
        predecessorCodes: '2.1',
        unit: 'متر مربع',
        totalQuantity: 15000
      }
    ];
  });

  const [reports, setReports] = useState<PlanningProgressReport[]>(() => {
    const saved = loadData<PlanningProgressReport[]>('hamyar_planning_reports', []);
    if (saved.length > 0) return saved;
    return [
      {
        id: 'rep_1',
        projectId: '2',
        reportNumber: 'PR-1405-04',
        reportTitle: 'گزارش پیشرفت دوره تیرماه ۱۴۰۵',
        periodStartDate: '1405/04/01',
        periodEndDate: '1405/04/31',
        plannedPhysicalProgress: 42.5,
        actualPhysicalProgress: 36.2,
        plannedFinancialProgress: 40.0,
        actualFinancialProgress: 34.0,
        ev: 14480000000,
        pv: 17000000000,
        ac: 15200000000,
        cpi: 0.95,
        spi: 0.85,
        description: 'گزارش ماهانه پیشرفت فیزیکی و مالی پروژه. به دلیل تاخیر در جابجایی تاسیسات زیربنایی، پیشرفت واقعی فیزیکی حدود ۶.۳٪ از برنامه عقب‌تر است.',
        delaysSummary: 'تاخیر در جابجایی لوله گاز معارض و کندی تحویل میلگرد توسط کارفرما',
        correctiveActions: 'افزایش شیفت کاری آرماتوربندی به دو شیفت و پیگیری تحویل مصالح تعهدی کارفرما',
        status: WorkflowStatus.APPROVED_BY_CONSULTANT,
        createdById: 'user_contractor_1',
        ownerOrgId: 'org_contractor',
        currentOrgId: 'org_employer',
        workflowHistory: [
          {
            id: 'ev_1',
            timestamp: Date.now() - 864000000,
            action: 'SUBMIT',
            fromStatus: WorkflowStatus.DRAFT,
            toStatus: WorkflowStatus.SENT_TO_CONSULTANT,
            actorUserId: 'user_contractor_1',
            actorName: 'مهندس احمدی (پیمانکار)',
            comment: 'ارسال جهت بررسی و تایید مشاور محترم'
          },
          {
            id: 'ev_2',
            timestamp: Date.now() - 432000000,
            action: 'APPROVE',
            fromStatus: WorkflowStatus.SENT_TO_CONSULTANT,
            toStatus: WorkflowStatus.APPROVED_BY_CONSULTANT,
            actorUserId: 'user_consultant_1',
            actorName: 'مهندس رضایی (دستگاه نظارت/مشاور)',
            comment: 'با محاسبه تاخیرات مجاز تایید گردید و به کارفرما ارسال شد.'
          }
        ]
      }
    ];
  });

  const [delays, setDelays] = useState<PlanningDelayLog[]>(() => {
    const saved = loadData<PlanningDelayLog[]>('hamyar_planning_delays', []);
    if (saved.length > 0) return saved;
    return [
      {
        id: 'delay_1',
        projectId: '2',
        activityCode: '1.2',
        activityTitle: 'خاکبرداری، گودبرداری و پی‌کنی',
        delayDays: 10,
        category: 'EMPLOYER_DELAY',
        rootCause: 'وجود معارض تاسیسات لوله گاز زیرزمینی که در نقشه اولیه‌ای ارائه نشده بود',
        impactAnalysis: 'توقف کار ماشین‌آلات سنگین خاکبرداری به مدت ۱۰ روز کاری و بحرانی شدن مسیر پروژه',
        correctiveAction: 'درخواست ابلاغ زمان اضافه مجاز به کارفرما و استقرار ۲ دستگاه بیل مکانیکی اضافه',
        date: '1405/02/12'
      },
      {
        id: 'delay_2',
        projectId: '2',
        activityCode: '1.3',
        activityTitle: 'بتن‌ریزی فونداسیون و آرماتوربندی',
        delayDays: 8,
        category: 'MATERIALS',
        rootCause: 'کاهش عرضه میلگرد سایز ۲۵ در بازار و عدم تکافوی سهمیه مصالح دپو شده',
        impactAnalysis: 'کندی روند بافت سبد آرماتور فونداسیون',
        correctiveAction: 'تامین بخشی از میلگرد از انبار مرکزی جاده قدیم و شیفت کاری شبانه جهت جبران',
        date: '1405/03/28'
      }
    ];
  });

  // UI Toast message
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Modals & Active Selections
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<PlanningActivity | null>(null);

  const [isPlanReplanModalOpen, setIsPlanReplanModalOpen] = useState(false);
  const [isReplanModalOpen, setIsReplanModalOpen] = useState(false);
  const [tempPlannedProgress, setTempPlannedProgress] = useState<Record<string, number>>({});
  const [tempWeights, setTempWeights] = useState<Record<string, number>>({});

  // System date today
  const todayShamsi = useMemo(() => getTodayShamsi(), []);

  // Contract expiration check
  const contractEndDate = activeProject?.endDate || '1403/12/29';
  const isContractExpired = useMemo(() => {
    return isDatePassed(contractEndDate, todayShamsi);
  }, [contractEndDate, todayShamsi]);

  const contractDaysRemaining = useMemo(() => {
    const today = parseShamsiDate(todayShamsi);
    const end = parseShamsiDate(contractEndDate);
    if (!today || !end) return 0;
    const todayDay = jalaliToDayNumber(today.year, today.month, today.day);
    const endDay = jalaliToDayNumber(end.year, end.month, end.day);
    return endDay - todayDay;
  }, [contractEndDate, todayShamsi]);

  // System Admin check: Only System General Manager can add/edit/delete WBS activities
  const isSystemAdmin = useMemo(() => {
    return (
      currentUser?.role === 'SYSTEM_ADMIN' ||
      localStorage.getItem('user_role') === 'SYSTEM_ADMIN' ||
      currentUser?.username === 'admin' ||
      localStorage.getItem('current_username') === 'admin'
    );
  }, [currentUser]);

  // Supervisory check: Only Consultant and Employer (and System Admin) can unlock/open Replan before contract end
  const canUnlockReplan = useMemo(() => {
    if (isSystemAdmin) return true;
    const role = currentUser?.role || localStorage.getItem('user_role') || '';
    const orgType = userOrgType || currentUser?.orgType || '';
    return (
      role.includes('EMPLOYER') ||
      role.includes('CONSULTANT') ||
      orgType === OrganizationType.EMPLOYER ||
      orgType === OrganizationType.CONSULTANT ||
      orgType === 'EMPLOYER' ||
      orgType === 'CONSULTANT'
    );
  }, [isSystemAdmin, currentUser, userOrgType]);

  // Project-level Replan unlock state (stored per project)
  const [isReplanUnlockedForProject, setIsReplanUnlockedForProject] = useState<boolean>(() => {
    try {
      const pid = localStorage.getItem("hamyar_selected_project_id") || '1';
      return localStorage.getItem(`hamyar_replan_unlocked_${pid}`) === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`hamyar_replan_unlocked_${selectedProjectId}`) === 'true';
      setIsReplanUnlockedForProject(saved);
    } catch {
      setIsReplanUnlockedForProject(false);
    }
  }, [selectedProjectId]);

  const handleToggleReplanLock = () => {
    if (!canUnlockReplan) {
      showToast('دکمه بازبرنامه‌ریزی (Replan) تا روز پایان قرارداد برای پیمانکار غیرفعال است. فقط مشاور و کارفرما صلاحیت باز کردن قفل را دارند.');
      return;
    }
    const nextState = !isReplanUnlockedForProject;
    setIsReplanUnlockedForProject(nextState);
    try {
      localStorage.setItem(`hamyar_replan_unlocked_${selectedProjectId}`, String(nextState));
    } catch (e) {}
    showToast(nextState ? 'قفل بازبرنامه‌ریزی (Replan) توسط مشاور/کارفرما برای این پروژه باز شد.' : 'قفل بازبرنامه‌ریزی (Replan) مجدداً فعال گردید.');
  };

  const handleOpenReplan = () => {
    if (isContractExpired || isReplanUnlockedForProject) {
      setIsReplanModalOpen(true);
      return;
    }
    if (!canUnlockReplan) {
      showToast('دکمه بازبرنامه‌ریزی (Replan) تا روز پایان قرارداد برای پیمانکار غیرفعال است. فقط مشاور و کارفرما صلاحیت باز کردن قفل را دارند.');
      return;
    }
    setIsReplanModalOpen(true);
  };

  const handleOpenPlanReplanModal = () => {
    setIsPlanReplanModalOpen(true);
  };

  const handleSavePlanReplan = (updatedProjectActivities: PlanningActivity[], record?: PeriodicPlanRecord) => {
    const updatedMap = new Map(updatedProjectActivities.map(a => [a.id, a]));
    const updated = activities.map(act => {
      if (updatedMap.has(act.id)) {
        return updatedMap.get(act.id)!;
      }
      return act;
    });
    setActivities(updated);
    saveData('hamyar_planning_activities', updated);
    setIsPlanReplanModalOpen(false);
    setSyncKey(k => k + 1);
    showToast(`برنامه زمان‌بندی دوره‌ای (${record?.title || 'Plan / Replan'}) با پیشرفت برنامه‌ای ${record?.totalWeightedPlannedProgress || 0}٪ با موفقیت ثبت گردید.`);
  };

  // Dedicated Replan application handler
  const handleApplyReplan = (updatedProjectActivities: PlanningActivity[], record: ReplanRecord) => {
    const updatedMap = new Map(updatedProjectActivities.map(a => [a.id, a]));
    const updated = activities.map(act => {
      if (updatedMap.has(act.id)) {
        return updatedMap.get(act.id)!;
      }
      return act;
    });
    setActivities(updated);
    saveData('hamyar_planning_activities', updated);
    setIsReplanModalOpen(false);
    setSyncKey(k => k + 1);
    showToast(`برنامه بازنگری‌شده (Replan نسخه ${record.revisionNumber}) با تاریخ اتمام جدید ${record.newProjectedEndDate} با موفقیت ثبت و اعمال گردید.`);
  };

  // Auto-sync planned progress handler based on current system date
  const handleAutoSyncPlannedProgress = () => {
    const updated = activities.map(act => {
      if (String(act.projectId).trim() === String(selectedProjectId).trim()) {
        const auto = calculateActivityPlannedProgress(act.baselineStartDate, act.baselineEndDate, todayShamsi);
        return {
          ...act,
          plannedProgress: auto.plannedProgress,
          durationDays: act.durationDays || auto.totalDays
        };
      }
      return act;
    });
    setActivities(updated);
    saveData('hamyar_planning_activities', updated);
    setSyncKey(k => k + 1);
    showToast(`پیشرفت برنامه‌ای تمام فعالیت‌ها بر مبنای تاریخ روز سیستم (${todayShamsi}) با موفقیت محاسبه و به‌روزرسانی شد.`);
  };

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<PlanningProgressReport | null>(null);

  const [isDelayModalOpen, setIsDelayModalOpen] = useState(false);
  const [editingDelay, setEditingDelay] = useState<PlanningDelayLog | null>(null);

  // Workflow Modal
  const [isWorkflowModalOpen, setIsWorkflowModalOpen] = useState(false);
  const [workflowTargetReport, setWorkflowTargetReport] = useState<PlanningProgressReport | null>(null);
  const [workflowAction, setWorkflowAction] = useState<WorkflowAction | null>(null);
  const [workflowComment, setWorkflowComment] = useState('');
  const [workflowAssigneeId, setWorkflowAssigneeId] = useState('');
  const [workflowOrgUsers, setWorkflowOrgUsers] = useState<SystemUser[]>([]);

  // History & Print Modals
  const [historyModalReport, setHistoryModalReport] = useState<PlanningProgressReport | null>(null);
  const [printModalReport, setPrintModalReport] = useState<PlanningProgressReport | null>(null);

  // Dedicated EVM & Project Control Modals
  const [isProgressTrackingModalOpen, setIsProgressTrackingModalOpen] = useState(false);
  const [isBaselineManagerModalOpen, setIsBaselineManagerModalOpen] = useState(false);

  // Load User Info & Organization Context
  useEffect(() => {
    const username = localStorage.getItem('current_username');
    const role = localStorage.getItem('user_role');

    if (role === 'SYSTEM_ADMIN') {
      setCurrentUser({
        id: 'admin',
        name: 'مدیر کل سامانه',
        role: 'SYSTEM_ADMIN'
      });
      setUserOrgType(OrganizationType.EMPLOYER);
      setUserOrgName('مدیریت ارشد');
    } else if (username) {
      const users = SystemAdminService.getUsers();
      const user = users.find(u => u.username === username);
      if (user) {
        setCurrentUser(user);
        const orgs = SystemAdminService.getOrganizations();
        const org = orgs.find(o => o.id === user.orgId);
        if (org) {
          setUserOrgType(org.type);
          setUserOrgName(org.name);
        }
      }
    }
  }, []);

  // Live listener to auto-refresh EVM calculations and Planning activities when localStorage updates
  useEffect(() => {
    const handleSync = (e?: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent?.detail?.activities !== undefined) {
        const newActs = customEvent.detail.activities;
        const targetProjId = customEvent.detail.projectId;
        if (targetProjId) {
          setActivities(prev => {
            const others = prev.filter(a => String(a.projectId).trim() !== String(targetProjId).trim());
            return [...others, ...newActs];
          });
        } else {
          setActivities(newActs);
        }
      } else {
        const saved = loadData<PlanningActivity[]>('hamyar_planning_activities', []);
        setActivities(saved);
      }

      const savedProjects = loadData<Project[]>('hamyar_projects', []);
      if (savedProjects && Array.isArray(savedProjects) && savedProjects.length > 0) {
        setProjects(savedProjects);
      }
      setSyncKey(k => k + 1);
    };

    window.addEventListener('storage', handleSync);
    window.addEventListener('focus', handleSync);
    window.addEventListener('planning-activities-updated', handleSync);
    window.addEventListener('wbs-updated', handleSync);
    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('focus', handleSync);
      window.removeEventListener('planning-activities-updated', handleSync);
      window.removeEventListener('wbs-updated', handleSync);
    };
  }, []);

  // Sync state to local storage when changed
  useEffect(() => {
    saveData('hamyar_planning_activities', activities);
  }, [activities]);

  useEffect(() => {
    saveData('hamyar_planning_reports', reports);
  }, [reports]);

  useEffect(() => {
    saveData('hamyar_planning_delays', delays);
  }, [delays]);

  // Automatically sync/import project's uploaded WBS mapping if activities are empty or updated
  useEffect(() => {
    if (!selectedProjectId) return;
    
    setActivities(prev => {
      const activeProj = projects.find(p => String(p.id).trim() === String(selectedProjectId).trim());
      if (!activeProj) return prev;

      const projectWbs = activeProj.wbsScheduleMapping || activeProj.cbsMapping || [];
      const currentProjectActivities = prev.filter(a => String(a.projectId).trim() === String(selectedProjectId).trim());

      // If project WBS was cleared and stored activities are also empty
      if (projectWbs.length === 0 && currentProjectActivities.length > 0) {
        const stored = loadData<PlanningActivity[]>('hamyar_planning_activities', []);
        const storedForProj = stored.filter(a => String(a.projectId).trim() === String(selectedProjectId).trim());
        if (storedForProj.length === 0) {
          return prev.filter(a => String(a.projectId).trim() !== String(selectedProjectId).trim());
        }
      }

      // If activities for current project are empty but project has WBS mapping
      if (currentProjectActivities.length === 0 && projectWbs.length > 0) {
        const mappedActivities: PlanningActivity[] = projectWbs.map((wbs, idx) => {
          const sDate = wbs.baselineStartDate || activeProj.startDate || '1405/01/01';
          const eDate = wbs.baselineEndDate || activeProj.endDate || '1405/12/29';
          const dur = wbs.durationDays || calculateShamsiDayDiff(sDate, eDate) || 30;
          const autoPlan = calculateActivityPlannedProgress(sDate, eDate, todayShamsi);
          const plannedProgress = autoPlan.plannedProgress;
          const status = plannedProgress >= 100 ? 'COMPLETED' : plannedProgress > 0 ? 'IN_PROGRESS' : 'NOT_STARTED';

          return {
            id: `act_${selectedProjectId}_${wbs.cbsCode}_${idx}_${Date.now()}`,
            projectId: selectedProjectId,
            code: wbs.cbsCode,
            title: wbs.description || `فعالیت ${wbs.cbsCode}`,
            cbsNodeId: wbs.cbsCode,
            weightPercent: Number(wbs.weightPercent || 0),
            baselineStartDate: sDate,
            baselineEndDate: eDate,
            durationDays: dur,
            plannedProgress: plannedProgress,
            actualProgress: 0,
            isCriticalPath: false,
            status: status,
            unit: wbs.unit || 'پروژه',
            totalQuantity: Number(wbs.quantity || 1),
            unitPrice: Number(wbs.unitPrice || 0),
            allocatedAmount: Number(wbs.allocatedAmount || 0)
          };
        });
        
        const filtered = prev.filter(a => String(a.projectId).trim() !== String(selectedProjectId).trim());
        return [...filtered, ...mappedActivities];
      }
      return prev;
    });
  }, [selectedProjectId, projects, todayShamsi]);

  // Filter items by current project and sync actualProgress from latest approved CBS / Price List statements
  const projectActivities = useMemo(() => {
    const filtered = activities.filter(a => String(a.projectId).trim() === String(selectedProjectId).trim());
    
    // Load CBS nodes to map activity codes to node IDs
    const savedNodes = loadData<any[]>('hamyar_cbs_nodes', []);
    const projectNodes = savedNodes.filter((n: any) => String(n.projectId).trim() === String(selectedProjectId).trim());
    
    // Load CBS statements and regular contractor statements
    const allCbsStatements = loadData<any[]>('hamyar_cbs_statements', []);
    const allRegularStatements = loadData<any[]>('hamyar_statements', []);
    const allContractorStatements = loadData<any[]>('hamyar_contractor_statements', []);
    
    const combinedStatements = [...allCbsStatements, ...allRegularStatements, ...allContractorStatements];
    const projectStatements = combinedStatements.filter((s: any) => String(s.projectId).trim() === String(selectedProjectId).trim());
    
    // Calculate cumulative totals from statements finally approved by employer
    const approvedStatements = projectStatements.filter((s: any) => {
      const isFrozen = Boolean(s.isFinalFrozen || s.frozen || s.isFrozen || s.finalFrozen);
      const statusRaw = s.status || s.workflowStatus || (s.workflowHistory?.length ? s.workflowHistory[s.workflowHistory.length - 1]?.toStatus : '');
      const status = String(statusRaw || '').trim().toUpperCase();
      const statusFa = String(statusRaw || '').trim();

      const isEmployerApprovedStatus =
        status === WorkflowStatus.APPROVED_BY_EMPLOYER ||
        status === 'APPROVED_BY_EMPLOYER' ||
        status === 'FINAL_APPROVED' ||
        status === 'FINAL_APPROVE' ||
        status === 'PAID' ||
        status === 'APPROVED' ||
        status === 'CONFIRMED' ||
        statusFa.includes('تایید نهایی') ||
        statusFa.includes('تایید کارفرما') ||
        statusFa.includes('مصوب کارفرما') ||
        statusFa.includes('Frozen') ||
        statusFa.includes('منجمد') ||
        statusFa.includes('قطعی');

      const hasEmployerApprovalEvent =
        Array.isArray(s.workflowHistory) &&
        s.workflowHistory.some(
          (ev: any) =>
            ev &&
            (ev.toStatus === WorkflowStatus.APPROVED_BY_EMPLOYER ||
              ev.toStatus === 'APPROVED_BY_EMPLOYER' ||
              ev.toStatus === 'APPROVED' ||
              ev.action === 'FINAL_APPROVE' ||
              ev.action === 'APPROVE_BY_EMPLOYER' ||
              (ev.action === 'APPROVE' && (ev.userRole === 'EMPLOYER' || ev.orgType === 'EMPLOYER' || String(ev.roleKey || '').includes('employer') || ev.toStatus === 'APPROVED_BY_EMPLOYER')) ||
              (ev.comment && (ev.comment.includes('تایید نهایی') || ev.comment.includes('کارفرما'))))
        );

      if (isFrozen || isEmployerApprovedStatus || hasEmployerApprovalEvent) {
        return status !== WorkflowStatus.REJECTED && status !== 'REJECTED' && !statusFa.includes('رد شده');
      }

      return false;
    });
    
    const cumulativeTotals: Record<string, number> = {};
    const cumulativeQuantities: Record<string, number> = {};

    const normalizeKey = (key: any) => String(key || '').trim().toLowerCase().replace(/\s+/g, '');

    approvedStatements.forEach((s: any) => {
      const itemsList = s.values || s.items || s.rows || [];
      if (Array.isArray(itemsList)) {
        itemsList.forEach((v: any) => {
          const idKey = normalizeKey(v.cbsId || v.itemCode || v.code || v.itemId || v.cbsCode);
          if (idKey) {
            const progPercent = Number(v.currentProgressPercent || v.cumulativeProgressPercent || v.progressPercent || 0);
            const qty = Number(v.cumulativeQuantity || v.approvedQuantity || v.currentQuantity || v.quantity || 0);
            
            if (progPercent > 0) {
              cumulativeTotals[idKey] = Math.max(cumulativeTotals[idKey] || 0, progPercent);
            }
            if (qty > 0) {
              cumulativeQuantities[idKey] = (cumulativeQuantities[idKey] || 0) + qty;
            }
          }
        });
      }
    });

    const normalizeCode = (code: string) => String(code || '').trim().toLowerCase().replace(/\s+/g, '');

    return filtered.map(act => {
      const normalizedActCode = normalizeCode(act.code);
      const normalizedActCbsNodeId = act.cbsNodeId ? normalizeCode(act.cbsNodeId) : '';

      // Find matching CBS node for this activity
      const matchingNode = projectNodes.find((n: any) => {
        const normalizedNodeCode = normalizeCode(n.code);
        const normalizedNodeId = normalizeCode(n.id);
        
        return (
          normalizedNodeId === normalizedActCbsNodeId ||
          normalizedNodeCode === normalizedActCode ||
          normalizedNodeId === normalizedActCode ||
          normalizedNodeCode === normalizedActCbsNodeId
        );
      });
      
      let actualProgress = act.actualProgress;
      
      // Check direct matching from statements
      const keysToCheck = [
        normalizedActCode,
        normalizedActCbsNodeId,
        matchingNode ? normalizeCode(matchingNode.id) : '',
        matchingNode ? normalizeCode(matchingNode.code) : ''
      ].filter(Boolean);

      let foundProgress: number | null = null;
      for (const k of keysToCheck) {
        if (cumulativeTotals[k] !== undefined) {
          foundProgress = cumulativeTotals[k];
          break;
        }
      }

      // If no direct percentage, check if we have cumulative quantity vs totalQuantity
      if (foundProgress === null) {
        for (const k of keysToCheck) {
          if (cumulativeQuantities[k] !== undefined && act.totalQuantity && act.totalQuantity > 0) {
            foundProgress = Math.min(100, (cumulativeQuantities[k] / act.totalQuantity) * 100);
            break;
          }
        }
      }

      if (foundProgress !== null) {
        actualProgress = Math.min(100, Math.round(foundProgress * 100) / 100);
      }
      
      // Update status dynamically based on actual progress
      let status = act.status;
      if (actualProgress >= 100) {
        status = 'COMPLETED';
      } else if (actualProgress > 0 && actualProgress < 100) {
        status = 'IN_PROGRESS';
      }

      // Automatically calculate planned progress based on baseline dates and system today
      const autoPlanResult = calculateActivityPlannedProgress(
        act.baselineStartDate,
        act.baselineEndDate,
        todayShamsi
      );
      const plannedProgress = autoPlanResult.plannedProgress;
      
      return {
        ...act,
        actualProgress,
        plannedProgress,
        durationDays: act.durationDays || autoPlanResult.totalDays,
        status
      };
    });
  }, [activities, selectedProjectId, todayShamsi]);

  const projectReports = useMemo(() => {
    return reports.filter(r => r.projectId === selectedProjectId);
  }, [reports, selectedProjectId]);

  const projectDelays = useMemo(() => {
    return delays.filter(d => d.projectId === selectedProjectId);
  }, [delays, selectedProjectId]);

  // Overall Physical Progress Calculation
  const overallPhysicalProgress = useMemo(() => {
    if (projectActivities.length === 0) return { planned: 0, actual: 0 };
    let plannedTotal = 0;
    let actualTotal = 0;
    let totalWeight = 0;

    projectActivities.forEach(act => {
      const w = act.weightPercent || 1;
      totalWeight += w;
      plannedTotal += (act.plannedProgress || 0) * w;
      actualTotal += (act.actualProgress || 0) * w;
    });

    if (totalWeight === 0) return { planned: 0, actual: 0 };
    return {
      planned: Math.min(100, Math.round((plannedTotal / totalWeight) * 10) / 10),
      actual: Math.min(100, Math.round((actualTotal / totalWeight) * 10) / 10)
    };
  }, [projectActivities]);

  // Integration with Daily Reports in Execution
  const syncWithDailyReports = () => {
    const dailyReports = loadData<DailyReport[]>('hamyar_daily_reports', []);
    const projDailyReports = dailyReports.filter(r => r.projectId === selectedProjectId);

    if (projDailyReports.length === 0) {
      showToast('هیچ گزارش روزانه‌ای برای این پروژه ثبت نشده است.');
      return;
    }

    // Accumulate total quantity per work item / code
    const accumMap: Record<string, number> = {};
    projDailyReports.forEach(r => {
      if (r.workItems && Array.isArray(r.workItems)) {
        r.workItems.forEach(wi => {
          if (wi.itemCode || wi.cbsNodeId) {
            const key = wi.itemCode || wi.cbsNodeId || '';
            accumMap[key] = (accumMap[key] || 0) + (wi.quantity || 0);
          }
        });
      }
    });

    let updatedCount = 0;
    const newActs = activities.map(act => {
      if (act.projectId !== selectedProjectId) return act;
      const key = act.code;
      const totalExec = accumMap[key] || 0;
      if (act.totalQuantity && act.totalQuantity > 0 && accumMap[key] !== undefined) {
        const calculatedProgress = Math.min(100, Math.round((totalExec / act.totalQuantity) * 100));
        updatedCount++;
        return {
          ...act,
          actualProgress: calculatedProgress,
          status: calculatedProgress >= 100 ? ('COMPLETED' as const) : calculatedProgress > 0 ? ('IN_PROGRESS' as const) : act.status
        };
      }
      return act;
    });

    setActivities(newActs);
    showToast(`پیشرفت فعالیت‌ها با موفقیت بر اساس ${projDailyReports.length} گزارش روزانه بروزرسانی شد.`);
  };

  // Integration with Financial CBS / Approved Statements (Technical Office) & EVM Engine
  const approvedStatementsInfo = useMemo(() => {
    return EvmEngineService.fetchACFromApprovedStatements(selectedProjectId);
  }, [selectedProjectId, syncKey, activeSubTab]);

  const evmMetrics = useMemo(() => {
    // Contract BAC (Budget at Completion)
    const bac = activeProject.initialBudget || 40000000000;
    
    // Physical progress
    const plannedPhys = overallPhysicalProgress.planned;
    const actualPhys = overallPhysicalProgress.actual;

    const pv = EvmEngineService.calculatePV(bac, plannedPhys);
    const ev = EvmEngineService.calculateEV(bac, actualPhys);

    let ac = approvedStatementsInfo.totalAC;
    if (ac === 0 && approvedStatementsInfo.statementCount === 0) {
      ac = Math.round(ev * 1.03); // Fallback demonstration baseline when statements are pending
    }

    const indices = EvmEngineService.calculateEvmIndices({ bac, pv, ev, ac });

    return {
      bac,
      ev,
      pv,
      ac,
      cv: indices.cv,
      sv: indices.sv,
      cpi: indices.cpi,
      spi: indices.spi,
      eac: indices.eac,
      vac: indices.vac,
      tcpi: indices.tcpi,
      status: indices.status,
      statementCount: approvedStatementsInfo.statementCount,
      statementsSummary: approvedStatementsInfo.statementsSummary
    };
  }, [activeProject, overallPhysicalProgress, selectedProjectId, approvedStatementsInfo]);

  // Cumulative S-Curve time-series data
  const sCurveData = useMemo(() => {
    return EvmEngineService.generateCumulativeSCurveData({
      projectId: selectedProjectId,
      bac: evmMetrics.bac,
      activities: projectActivities
    });
  }, [selectedProjectId, evmMetrics.bac, projectActivities]);

  // Activity Form Handlers
  const handleOpenActivityModal = (act?: PlanningActivity) => {
    if (!isSystemAdmin) {
      showToast('عملیات افزودن یا ویرایش فعالیت‌های ساختار شکست کار (WBS) صرفاً برای مدیر کل سیستم مجاز است.');
      return;
    }
    if (act) {
      setEditingActivity({ ...act });
    } else {
      setEditingActivity({
        id: Math.random().toString(36).substr(2, 9),
        projectId: selectedProjectId,
        code: `${projectActivities.length + 1}.1`,
        title: '',
        weightPercent: 10,
        baselineStartDate: '1405/05/01',
        baselineEndDate: '1405/07/01',
        durationDays: 60,
        plannedProgress: 0,
        actualProgress: 0,
        isCriticalPath: false,
        status: 'NOT_STARTED',
        unit: 'متر مربع',
        totalQuantity: 1000
      });
    }
    setIsActivityModalOpen(true);
  };

  const handleSaveActivity = () => {
    if (!isSystemAdmin) {
      showToast('عملیات ذخیره فعالیت‌های ساختار شکست کار (WBS) صرفاً برای مدیر کل سیستم مجاز است.');
      return;
    }
    if (!editingActivity || !editingActivity.title.trim()) {
      showToast('لطفاً عنوان فعالیت را وارد کنید.');
      return;
    }

    const exists = activities.some(a => a.id === editingActivity.id);
    if (exists) {
      setActivities(activities.map(a => a.id === editingActivity.id ? editingActivity : a));
    } else {
      setActivities([...activities, editingActivity]);
    }

    setIsActivityModalOpen(false);
    setEditingActivity(null);
    showToast('فعالیت جدید با موفقیت ذخیره شد.');
  };

  const handleDeleteActivity = (id: string) => {
    if (!isSystemAdmin) {
      showToast('عملیات حذف فعالیت‌های ساختار شکست کار (WBS) صرفاً برای مدیر کل سیستم مجاز است.');
      return;
    }
    setActivities(activities.filter(a => a.id !== id));
    showToast('فعالیت حذف گردید.');
  };

  // Periodic Progress Report Handlers
  const handleOpenReportModal = (rep?: PlanningProgressReport) => {
    if (rep) {
      setEditingReport({ ...rep });
    } else {
      setEditingReport({
        id: Math.random().toString(36).substr(2, 9),
        projectId: selectedProjectId,
        reportNumber: `PR-1405-0${projectReports.length + 5}`,
        reportTitle: `گزارش پیشرفت دوره ${projectReports.length + 1}`,
        periodStartDate: '1405/05/01',
        periodEndDate: '1405/05/31',
        plannedPhysicalProgress: overallPhysicalProgress.planned,
        actualPhysicalProgress: overallPhysicalProgress.actual,
        plannedFinancialProgress: Math.round((evmMetrics.pv / evmMetrics.bac) * 100),
        actualFinancialProgress: Math.round((evmMetrics.ev / evmMetrics.bac) * 100),
        ev: evmMetrics.ev,
        pv: evmMetrics.pv,
        ac: evmMetrics.ac,
        cpi: evmMetrics.cpi,
        spi: evmMetrics.spi,
        description: '',
        delaysSummary: '',
        correctiveActions: '',
        status: WorkflowStatus.DRAFT,
        createdById: currentUser?.id || 'admin',
        ownerOrgId: currentUser?.orgId || 'org_contractor',
        currentOrgId: currentUser?.orgId || 'org_contractor',
        workflowHistory: []
      });
    }
    setIsReportModalOpen(true);
  };

  const handleSaveReport = () => {
    if (!editingReport || !editingReport.reportTitle.trim()) {
      showToast('لطفاً عنوان گزارش را وارد کنید.');
      return;
    }

    const exists = reports.some(r => r.id === editingReport.id);
    if (exists) {
      setReports(reports.map(r => r.id === editingReport.id ? editingReport : r));
    } else {
      setReports([editingReport, ...reports]);
    }

    setIsReportModalOpen(false);
    setEditingReport(null);
    showToast('گزارش پیشرفت با موفقیت ایجاد شد.');
  };

  // Workflow Modal Actions
  const handleOpenWorkflowModal = (report: PlanningProgressReport, action: WorkflowAction) => {
    setWorkflowTargetReport(report);
    setWorkflowAction(action);
    setWorkflowComment('');
    setWorkflowAssigneeId('');

    let users = SystemAdminService.getUsers().filter(u => u.isActive);
    if (currentUser) {
      const isSystemAdmin = currentUser.role === 'SYSTEM_ADMIN';
      const allOrgs = SystemAdminService.getOrganizations();
      let targetOrgId = currentUser.orgId;

      if (action === "SEND_TO_CONSULTANT" || action === "RETURN_TO_CONSULTANT") {
        targetOrgId = allOrgs.find(o => o.type === OrganizationType.CONSULTANT)?.id;
      } else if (action === "SEND_TO_EMPLOYER") {
        targetOrgId = allOrgs.find(o => o.type === OrganizationType.EMPLOYER)?.id;
      } else if (action === "RETURN_TO_CONTRACTOR") {
        const ownerId = (report as any).ownerOrgId;
        targetOrgId = ownerId || allOrgs.find(o => o.type === OrganizationType.CONTRACTOR)?.id;
      }

      if (!isSystemAdmin && targetOrgId) {
        users = users.filter(u => u.orgId === targetOrgId);
      }
    }
    setWorkflowOrgUsers(users);
    setIsWorkflowModalOpen(true);
  };

  const handleExecuteWorkflow = () => {
    if (!workflowTargetReport || !workflowAction || !currentUser) return;

    try {
      let targetOrgId: string | undefined = undefined;
      const allOrgs = SystemAdminService.getOrganizations();
      if (workflowAction === "SEND_TO_CONSULTANT" || workflowAction === "RETURN_TO_CONSULTANT") {
        targetOrgId = allOrgs.find(o => o.type === OrganizationType.CONSULTANT)?.id;
      } else if (workflowAction === "SEND_TO_EMPLOYER") {
        targetOrgId = allOrgs.find(o => o.type === OrganizationType.EMPLOYER)?.id;
      } else if (workflowAction === "RETURN_TO_CONTRACTOR") {
        const ownerId = (workflowTargetReport as any).ownerOrgId;
        targetOrgId = ownerId || allOrgs.find(o => o.type === OrganizationType.CONTRACTOR)?.id;
      }

      const assigneeUser = workflowOrgUsers.find(u => u.id === workflowAssigneeId) || SystemAdminService.getUsers().find(u => u.id === workflowAssigneeId);
      const assigneeOrg = assigneeUser?.orgId ? SystemAdminService.getOrganization(assigneeUser.orgId) : undefined;
      const assigneeNameWithTitle = assigneeUser ? formatUserDisplayFormal(assigneeUser, assigneeOrg) : undefined;

      const updated = WorkflowService.performAction(
        workflowTargetReport as any,
        workflowAction,
        currentUser,
        {
          comment: workflowComment,
          assigneeId: workflowAssigneeId || undefined,
          assigneeName: assigneeNameWithTitle,
          targetOrgId
        }
      ) as unknown as PlanningProgressReport;

      setReports(reports.map(r => r.id === workflowTargetReport.id ? updated : r));

      // If report is Rebaseline proposal and gets approved, apply proposed activities to project activities
      if (updated.reportType === 'REBASELINE' && updated.proposedActivities && updated.proposedActivities.length > 0) {
        if (updated.status === WorkflowStatus.APPROVED_BY_CONSULTANT || updated.status === WorkflowStatus.APPROVED_BY_EMPLOYER || updated.isFinalFrozen) {
          setActivities(prev => {
            const otherProjActs = prev.filter(a => a.projectId !== selectedProjectId);
            return [...otherProjActs, ...updated.proposedActivities!];
          });
          showToast('برنامه زمان‌بندی اولیه پروژه پس از تایید نهایی با موفقیت بروزرسانی و جایگزین گردید.');
        }
      }

      setIsWorkflowModalOpen(false);
      setWorkflowTargetReport(null);
      setWorkflowAction(null);
      showToast(`عملیات ${WorkflowService.getActionLabel(workflowAction, userOrgType)} با موفقیت انجام شد.`);
    } catch (e: any) {
      showToast(e.message || 'خطا در اجرای گردش کار');
    }
  };

  // Re-baselining Modal & State
  const [isRebaselineModalOpen, setIsRebaselineModalOpen] = useState(false);
  const [rebaselineTitle, setRebaselineTitle] = useState('');
  const [rebaselineReason, setRebaselineReason] = useState('');
  const [rebaselineActivities, setRebaselineActivities] = useState<PlanningActivity[]>([]);

  const handleOpenRebaselineModal = () => {
    setRebaselineTitle(`اصلاح و به روزرسانی برنامه زمان‌بندی اولیه - ویرایش ${reports.filter(r => r.reportType === 'REBASELINE').length + 1}`);
    setRebaselineReason('به‌روزرسانی برنامه زمان‌بندی اولیه بر اساس تغییر مقادیر و احجام مصوب دفتر فنی و تاخیرات مجاز پروژه');
    setRebaselineActivities(JSON.parse(JSON.stringify(projectActivities)));
    setIsRebaselineModalOpen(true);
  };

  const handleSaveRebaselineProposal = () => {
    if (!rebaselineTitle.trim()) {
      showToast('لطفاً عنوان درخواست به‌روزرسانی برنامه زمان‌بندی را وارد نمایید.');
      return;
    }

    const newReport: PlanningProgressReport = {
      id: `rep_rebase_${Date.now()}`,
      projectId: selectedProjectId,
      reportNumber: `BS-REV-${Date.now().toString().slice(-4)}`,
      reportTitle: rebaselineTitle,
      reportType: 'REBASELINE',
      periodStartDate: new Date().toLocaleDateString('fa-IR'),
      periodEndDate: new Date().toLocaleDateString('fa-IR'),
      plannedPhysicalProgress: overallPhysicalProgress.planned,
      actualPhysicalProgress: overallPhysicalProgress.actual,
      plannedFinancialProgress: overallPhysicalProgress.planned,
      actualFinancialProgress: overallPhysicalProgress.actual,
      ev: evmMetrics.ev,
      pv: evmMetrics.pv,
      ac: evmMetrics.ac,
      cpi: evmMetrics.cpi,
      spi: evmMetrics.spi,
      description: rebaselineReason,
      proposedActivities: rebaselineActivities,
      versionTag: `V${reports.filter(r => r.reportType === 'REBASELINE').length + 1}.0`,
      status: WorkflowStatus.SENT_TO_CONSULTANT,
      createdById: currentUser?.id || 'user_contractor_1',
      ownerOrgId: 'org_contractor',
      currentOrgId: 'org_consultant',
      workflowHistory: [
        {
          id: `ev_${Date.now()}`,
          timestamp: Date.now(),
          action: 'SUBMIT',
          fromStatus: WorkflowStatus.DRAFT,
          toStatus: WorkflowStatus.SENT_TO_CONSULTANT,
          actorUserId: currentUser?.id || 'contractor',
          actorName: currentUser?.name || 'پیمانکار (دفتر فنی/کنترل پروژه)',
          comment: rebaselineReason || 'پیشنهاد به‌روزرسانی برنامه زمان‌بندی اولیه جهت بررسی و تایید مشاور ارسال گردید.'
        }
      ]
    };

    setReports([newReport, ...reports]);
    setIsRebaselineModalOpen(false);
    showToast('پیشنهاد به‌روزرسانی برنامه زمان‌بندی اولیه با موفقیت ثبت شد و جهت بررسی به مشاور ارسال گردید.');
  };

  // Sync with Technical Office Variations & CBS Contracts
  const syncWithCbsAndTechnicalOffice = () => {
    const savedContracts = loadData<any[]>('hamyar_cbs_contracts', []);
    const savedCbsNodes = loadData<any[]>('hamyar_cbs_nodes', []);
    const savedVariations = loadData<any[]>('hamyar_variation_orders', []);

    const projContracts = savedContracts.filter(c => String(c.projectId).trim() === String(selectedProjectId).trim());
    const projCbsNodes = savedCbsNodes.filter(n => String(n.projectId).trim() === String(selectedProjectId).trim());

    const cbsMap: Record<string, { title: string; budget: number; weight: number; unit?: string; quantity?: number; unitPrice?: number; baselineStartDate?: string; baselineEndDate?: string; durationDays?: number }> = {};

    projCbsNodes.forEach(node => {
      cbsMap[node.code] = {
        title: node.title,
        budget: node.budget || 0,
        weight: node.weightPercent || 0,
        unit: node.unit || 'مقطوع',
        quantity: node.quantity || 1,
        unitPrice: node.unitPrice || node.budget || 0
      };
    });

    projContracts.forEach(contract => {
      if (contract.cbsMapping && Array.isArray(contract.cbsMapping)) {
        contract.cbsMapping.forEach((item: any) => {
          cbsMap[item.cbsCode] = {
            title: item.description || cbsMap[item.cbsCode]?.title || `فعالیت ${item.cbsCode}`,
            budget: item.allocatedAmount || cbsMap[item.cbsCode]?.budget || 0,
            weight: item.weightPercent || cbsMap[item.cbsCode]?.weight || 0,
            unit: item.unit || cbsMap[item.cbsCode]?.unit || 'مقطوع',
            quantity: item.quantity || cbsMap[item.cbsCode]?.quantity || 1,
            unitPrice: item.unitPrice || cbsMap[item.cbsCode]?.unitPrice || 0
          };
        });
      }
    });

    // Sync with project's own WBS/CBS mapping from hamyar_projects (uploaded via excel)
    const activeProj = projects.find(p => String(p.id).trim() === String(selectedProjectId).trim());
    if (activeProj) {
      const projWbs = activeProj.wbsScheduleMapping || activeProj.cbsMapping || [];
      projWbs.forEach((item: any) => {
        cbsMap[item.cbsCode] = {
          title: item.description || cbsMap[item.cbsCode]?.title || `فعالیت ${item.cbsCode}`,
          budget: item.allocatedAmount || cbsMap[item.cbsCode]?.budget || 0,
          weight: item.weightPercent || cbsMap[item.cbsCode]?.weight || 0,
          unit: item.unit || cbsMap[item.cbsCode]?.unit || 'پروژه',
          quantity: item.quantity !== undefined ? item.quantity : (cbsMap[item.cbsCode]?.quantity || 1),
          unitPrice: item.unitPrice || cbsMap[item.cbsCode]?.unitPrice || 0,
          baselineStartDate: item.baselineStartDate || cbsMap[item.cbsCode]?.baselineStartDate,
          baselineEndDate: item.baselineEndDate || cbsMap[item.cbsCode]?.baselineEndDate,
          durationDays: item.durationDays || cbsMap[item.cbsCode]?.durationDays
        };
      });
    }

    // Sync with Technical Office initial estimates (for Price List contracts)
    const savedEstimates = loadData<any[]>('hamyar_estimates', []);
    const projEstimates = savedEstimates.filter(e => String(e.projectId).trim() === String(selectedProjectId).trim());
    if (projEstimates.length > 0) {
      const totalEstBudget = projEstimates.reduce((acc, it) => acc + (Number(it.totalPrice) || (Number(it.quantity || 1) * Number(it.unitPrice || 0))), 0);
      projEstimates.forEach((est: any) => {
        const code = String(est.code || est.itemCode || '').trim();
        if (code && !cbsMap[code]) {
          const qty = Number(est.quantity) || 1;
          const price = Number(est.unitPrice) || 0;
          const amt = Number(est.totalPrice) || (qty * price);
          const weight = totalEstBudget > 0 ? Math.round((amt / totalEstBudget) * 10000) / 100 : Math.round((100 / projEstimates.length) * 100) / 100;
          cbsMap[code] = {
            title: est.description || est.title || `ردیف برآورد ${code}`,
            budget: amt,
            weight: weight,
            unit: est.unit || 'پروژه',
            quantity: qty,
            unitPrice: price,
            baselineStartDate: activeProj?.startDate || '1403/01/15',
            baselineEndDate: activeProj?.endDate || '1403/12/29',
            durationDays: 180
          };
        }
      });
    }

    // Variations from Technical Office
    savedVariations.filter(v => String(v.projectId).trim() === String(selectedProjectId).trim() && (v.status === 'APPROVED' || v.isFinalFrozen || v.status === WorkflowStatus.APPROVED_BY_EMPLOYER)).forEach(v => {
      if (v.items && Array.isArray(v.items)) {
        v.items.forEach((item: any) => {
          const code = item.itemCode || item.cbsCode;
          if (code && cbsMap[code]) {
            const extraQty = Number(item.quantityDelta || (item.newQuantity && item.oldQuantity ? item.newQuantity - item.oldQuantity : 0));
            const extraAmount = Number(item.amountDelta || 0);
            cbsMap[code].quantity = (cbsMap[code].quantity || 0) + extraQty;
            cbsMap[code].budget = (cbsMap[code].budget || 0) + extraAmount;
          }
        });
      }
    });

    if (Object.keys(cbsMap).length === 0) {
      showToast('اطلاعات CBS/قراردادی جهت همگام‌سازی یافت نشد. لطفاً ابتدا در مدیریت CBS یا مدیریت قراردادها اطلاعات را ثبت نمائید.');
      return;
    }

    let syncCount = 0;
    const updatedActs = activities.map(act => {
      if (act.projectId !== selectedProjectId) return act;
      const cbsData = cbsMap[act.code];
      if (cbsData) {
        syncCount++;
        return {
          ...act,
          title: cbsData.title || act.title,
          unit: cbsData.unit || act.unit,
          totalQuantity: cbsData.quantity !== undefined ? cbsData.quantity : act.totalQuantity,
          unitPrice: cbsData.unitPrice || act.unitPrice,
          allocatedAmount: cbsData.budget || act.allocatedAmount,
          weightPercent: cbsData.weight !== undefined ? cbsData.weight : act.weightPercent,
          baselineStartDate: cbsData.baselineStartDate || act.baselineStartDate,
          baselineEndDate: cbsData.baselineEndDate || act.baselineEndDate,
          durationDays: cbsData.durationDays || act.durationDays
        };
      }
      return act;
    });

    const existingCodes = new Set(updatedActs.filter(a => a.projectId === selectedProjectId).map(a => a.code));
    Object.keys(cbsMap).forEach(code => {
      if (!existingCodes.has(code)) {
        const info = cbsMap[code];
        syncCount++;
        updatedActs.push({
          id: `act_sync_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          projectId: selectedProjectId,
          code: code,
          title: info.title,
          cbsNodeId: code,
          weightPercent: info.weight !== undefined ? info.weight : 5,
          baselineStartDate: info.baselineStartDate || '1405/01/05',
          baselineEndDate: info.baselineEndDate || '1405/06/31',
          durationDays: info.durationDays || 180,
          plannedProgress: 0,
          actualProgress: 0,
          status: 'NOT_STARTED',
          unit: info.unit,
          totalQuantity: info.quantity,
          unitPrice: info.unitPrice,
          allocatedAmount: info.budget
        });
      }
    });

    setActivities(updatedActs);
    setSyncKey(k => k + 1);
    const stmtInfo = EvmEngineService.fetchACFromApprovedStatements(selectedProjectId);
    showToast(`همگام‌سازی انطباق ۱به۱ WBS و CBS انجام شد. ${syncCount} فعالیت به‌روزرسانی و ${stmtInfo.statementCount} صورت‌وضعیت تایید شده با مجموع مبلغ ${(stmtInfo.totalAC / 1000000000).toFixed(2)} میلیارد تومان فراخوانی گردید.`);
  };

  // Delay Log Handlers
  const handleOpenDelayModal = (del?: PlanningDelayLog) => {
    if (del) {
      setEditingDelay({ ...del });
    } else {
      setEditingDelay({
        id: Math.random().toString(36).substr(2, 9),
        projectId: selectedProjectId,
        activityCode: projectActivities[0]?.code || '1.2',
        activityTitle: projectActivities[0]?.title || 'خاکبرداری و گودبرداری',
        delayDays: 5,
        category: 'EMPLOYER_DELAY',
        rootCause: '',
        impactAnalysis: '',
        correctiveAction: '',
        date: '1405/05/10'
      });
    }
    setIsDelayModalOpen(true);
  };

  const handleSaveDelay = () => {
    if (!editingDelay || !editingDelay.rootCause.trim()) {
      showToast('لطفاً علت تاخیر را وارد کنید.');
      return;
    }

    const exists = delays.some(d => d.id === editingDelay.id);
    if (exists) {
      setDelays(delays.map(d => d.id === editingDelay.id ? editingDelay : d));
    } else {
      setDelays([editingDelay, ...delays]);
    }

    setIsDelayModalOpen(false);
    setEditingDelay(null);
    showToast('ثبت انحراف / تاخیر با موفقیت انجام شد.');
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0b0f19] text-stone-900 dark:text-slate-100 p-4 lg:p-8 space-y-8 font-['Vazirmatn'] dir-rtl">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-6 z-[200] bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce">
          <CheckCircle size={20} className="text-emerald-400 dark:text-emerald-600" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-100 rounded-[2.5rem] p-6 lg:p-8 shadow-sm border border-[#ece5d8] dark:border-stone-800 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-100 dark:border-amber-900/40 text-amber-600 dark:text-amber-400">
                <BarChart3 size={28} />
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-stone-900 dark:text-white">کنترل و برنامه‌ریزی پروژه</h1>
                <p className="text-xs lg:text-sm text-stone-500 dark:text-stone-400 font-medium mt-0.5">
                  مدیریت WBS، تحلیل ارزش حاصله (EVM)، نمودار گانت، منحنی S و گردش تایید اسناد پیشرفت
                </p>
              </div>
            </div>
          </div>

          {/* Project Switcher & Quick Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-stone-50 dark:bg-stone-800/70 px-4 py-2.5 rounded-2xl border border-stone-200/80 dark:border-stone-700 flex items-center gap-2">
              <span className="text-xs font-bold text-stone-600 dark:text-stone-300">پروژه فعال:</span>
              <select
                value={selectedProjectId}
                onChange={e => {
                  const val = e.target.value;
                  setSelectedProjectId(val);
                  localStorage.setItem("hamyar_selected_project_id", val);
                  window.dispatchEvent(new Event('storage'));
                  window.dispatchEvent(new CustomEvent('project-changed', { detail: { projectId: val } }));
                }}
                className="bg-transparent text-stone-900 dark:text-white font-black text-xs outline-none cursor-pointer"
              >
                {accessibleProjects.length === 0 ? (
                  <option value="" className="text-stone-900 dark:text-white bg-white dark:bg-stone-900">هیچ پروژه مجازی یافت نشد</option>
                ) : (
                  accessibleProjects.map(p => (
                    <option key={p.id} value={p.id} className="text-stone-900 dark:text-white bg-white dark:bg-stone-900">
                      {p.title}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>
        </div>

        {/* Top Summary Metrics Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-6 border-t border-stone-100 dark:border-stone-800 text-center">
          <div>
            <span className="text-[11px] font-bold text-stone-500 dark:text-stone-400 block">پیشرفت فیزیکی واقعی</span>
            <div className="flex items-baseline justify-center gap-1 mt-1">
              <span className="text-2xl font-black text-stone-900 dark:text-white">{overallPhysicalProgress.actual}٪</span>
              <span className="text-xs text-stone-400 dark:text-stone-500">برنامه‌ای: {overallPhysicalProgress.planned}٪</span>
            </div>
          </div>

          <div>
            <span className="text-[11px] font-bold text-stone-500 dark:text-stone-400 block">شاخص زمان‌بندی (SPI)</span>
            <div className="flex items-baseline justify-center gap-1 mt-1">
              <span className={`text-2xl font-black ${evmMetrics.spi >= 1 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {evmMetrics.spi}
              </span>
              <span className="text-xs text-stone-400 dark:text-stone-500">{evmMetrics.spi >= 1 ? 'مطابق/جلوتر' : 'عقب‌تر از برنامه'}</span>
            </div>
          </div>

          <div>
            <span className="text-[11px] font-bold text-stone-500 dark:text-stone-400 block">شاخص هزینه (CPI)</span>
            <div className="flex items-baseline justify-center gap-1 mt-1">
              <span className={`text-2xl font-black ${evmMetrics.cpi >= 1 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {evmMetrics.cpi}
              </span>
              <span className="text-xs text-stone-400 dark:text-stone-500">{evmMetrics.cpi >= 1 ? 'زیر بودجه' : 'عقب‌تر از بودجه'}</span>
            </div>
          </div>

          <div>
            <span className="text-[11px] font-bold text-stone-500 dark:text-stone-400 block">انحراف هزینه (CV)</span>
            <div className="flex items-baseline justify-center gap-1 mt-1">
              <span className="text-xl font-black dir-ltr text-stone-900 dark:text-white">
                {(evmMetrics.cv / 1000000000).toFixed(2)}B
              </span>
              <span className="text-xs text-stone-400 dark:text-stone-500">تومان</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-[#ece5d8] dark:border-stone-800 pb-4 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('gantt')}
          className={`px-5 py-3 rounded-2xl font-black text-xs transition-all flex items-center gap-2 whitespace-nowrap ${
            activeSubTab === 'gantt'
              ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20'
              : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 hover:bg-stone-100'
          }`}
        >
          <Layers size={18} />
          برنامه زمان‌بندی و WBS
        </button>

        <button
          onClick={() => {
            setActiveSubTab('evm');
            setSyncKey(k => k + 1);
          }}
          className={`px-5 py-3 rounded-2xl font-black text-xs transition-all flex items-center gap-2 whitespace-nowrap ${
            activeSubTab === 'evm'
              ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20'
              : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 hover:bg-stone-100'
          }`}
        >
          <Activity size={18} />
          آنالیز ارزش حاصله (EVM)
        </button>

        <button
          onClick={() => setActiveSubTab('scurve')}
          className={`px-5 py-3 rounded-2xl font-black text-xs transition-all flex items-center gap-2 whitespace-nowrap ${
            activeSubTab === 'scurve'
              ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20'
              : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 hover:bg-stone-100'
          }`}
        >
          <TrendingUp size={18} />
          منحنی S و پیشرفت
        </button>

        <button
          onClick={() => setActiveSubTab('reports')}
          className={`px-5 py-3 rounded-2xl font-black text-xs transition-all flex items-center gap-2 whitespace-nowrap ${
            activeSubTab === 'reports'
              ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20'
              : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 hover:bg-stone-100'
          }`}
        >
          <FileCheck size={18} />
          گزارشات دوره‌ای و گردش کار ({projectReports.length})
        </button>

        <button
          onClick={() => setActiveSubTab('delays')}
          className={`px-5 py-3 rounded-2xl font-black text-xs transition-all flex items-center gap-2 whitespace-nowrap ${
            activeSubTab === 'delays'
              ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20'
              : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 hover:bg-stone-100'
          }`}
        >
          <ShieldAlert size={18} />
          لوایح تاخیرات و ادعای تمدید (EOT)
        </button>

        <button
          onClick={() => setActiveSubTab('loss_claims')}
          className={`px-5 py-3 rounded-2xl font-black text-xs transition-all flex items-center gap-2 whitespace-nowrap ${
            activeSubTab === 'loss_claims'
              ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20'
              : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 hover:bg-stone-100'
          }`}
        >
          <Scale size={18} />
          لوایح ادعای ضرر و زیان و خسارات مالی
        </button>
      </div>

      {/* TAB 1: GANTT & BASELINE WBS */}
      {activeSubTab === 'gantt' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Periodic Comparison Table above WBS */}
          <PeriodicComparisonTable
            projectId={selectedProjectId}
            project={activeProject}
            activities={projectActivities}
            currentUser={currentUser}
            userOrgType={userOrgType}
            onOpenPlanReplanModal={handleOpenPlanReplanModal}
            onOpenProgressTrackingModal={() => setIsProgressTrackingModalOpen(true)}
            onOpenReplanModal={handleOpenReplan}
            isContractExpired={isContractExpired}
            canUnlockReplan={canUnlockReplan}
            isReplanUnlocked={isReplanUnlockedForProject}
            onToggleUnlockReplan={handleToggleReplanLock}
          />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-stone-900 p-6 rounded-3xl border border-[#ece5d8] dark:border-stone-800 shadow-sm">
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-lg font-black text-stone-800 dark:text-stone-100">ساختار شکست کار (WBS) و فعالیت‌ها</h2>
                <span className="text-[10px] px-2.5 py-1 rounded-full font-black bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200 dark:border-blue-900/40 flex items-center gap-1">
                  <Sparkles size={11} className="text-blue-500" />
                  محاسبه خودکار پیشرفت برنامه‌ای (تاریخ روز سیستم: {todayShamsi})
                </span>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                برنامه زمان‌بندی مصوب، وزن فیزیکی و محاسبه بلادرنگ پیشرفت برنامه‌ای طبق تاریخ شروع و پایان هر فعالیت
              </p>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30 mt-2 w-max">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                همگام‌سازی پیشرفت واقعی با آخرین صورت‌وضعیت تایید شده CBS فعال است
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={handleOpenReplan}
                disabled={!isContractExpired && !isReplanUnlockedForProject && !canUnlockReplan}
                className={`px-4 py-2.5 rounded-2xl font-black text-xs transition-all flex items-center gap-2 shadow-sm ${
                  isContractExpired || isReplanUnlockedForProject
                    ? 'bg-amber-500 hover:bg-amber-400 text-stone-950 border border-amber-400 shadow-amber-500/20 active:scale-95 cursor-pointer'
                    : canUnlockReplan
                    ? 'bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800 cursor-pointer active:scale-95'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-400 dark:text-stone-500 border border-stone-200 dark:border-stone-700 cursor-not-allowed opacity-75'
                }`}
                title={
                  isContractExpired
                    ? 'مدت قرارداد منقضی شده است - بازبرنامه‌ریزی فعال است'
                    : isReplanUnlockedForProject
                    ? 'قفل بازبرنامه‌ریزی توسط مشاور/کارفرما باز شده است'
                    : canUnlockReplan
                    ? 'بازبرنامه‌ریزی (دسترسی مشاور و کارفرما جهت باز کردن قفل)'
                    : `مدت قرارداد تا ${contractEndDate} باقی مانده است (قفل برای پیمانکار)`
                }
              >
                <RefreshCw size={15} className={isContractExpired ? 'text-stone-950 animate-spin-slow' : canUnlockReplan ? 'text-blue-600 dark:text-blue-400' : 'text-stone-400'} />
                <span>بازبرنامه‌ریزی (Replan)</span>
                {isContractExpired ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-stone-950 text-amber-400 font-black">
                    فعال (قرارداد منقضی)
                  </span>
                ) : isReplanUnlockedForProject ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-black flex items-center gap-1">
                    <Unlock size={10} />
                    قفل باز است
                  </span>
                ) : canUnlockReplan ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-200 font-bold flex items-center gap-1">
                    <Unlock size={10} />
                    مجوز مشاور/کارفرما
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-stone-200 dark:bg-stone-700 text-stone-500 dark:text-stone-400 font-bold flex items-center gap-1">
                    <Lock size={10} />
                    {contractDaysRemaining > 0 ? `${contractDaysRemaining} روز تا پایان (قفل پیمانکار)` : 'غیرفعال'}
                  </span>
                )}
              </button>

              {/* Quick toggle unlock button for Consultant & Employer */}
              {canUnlockReplan && !isContractExpired && (
                <button
                  onClick={handleToggleReplanLock}
                  className="px-3 py-2 rounded-2xl font-black text-xs bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 border border-stone-300 dark:border-stone-700 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                  title="تغییر وضعیت قفل بازبرنامه‌ریزی برای ارکان پروژه"
                >
                  {isReplanUnlockedForProject ? <Lock size={13} className="text-amber-600" /> : <Unlock size={13} className="text-emerald-600" />}
                  <span>{isReplanUnlockedForProject ? 'قفل مجدد Replan' : 'باز کردن قفل Replan'}</span>
                </button>
              )}

              <button
                onClick={handleAutoSyncPlannedProgress}
                className="px-3.5 py-2.5 rounded-2xl font-black text-xs bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/50 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                title="محاسبه مجدد پیشرفت برنامه‌ای تمام فعالیت‌ها بر اساس تاریخ روز جاری سیستم"
              >
                <Sparkles size={14} className="text-blue-500" />
                محاسبه خودکار پیشرفت
              </button>

              <button
                onClick={() => {
                  const comparisonItems = EvmEngineService.getPeriodicComparison(selectedProjectId, 'ALL');
                  PlanningPrintService.printOfficialOverallStatusReport({
                    comparisonItems,
                    project: activeProject,
                    activities: projectActivities,
                    currentUser
                  });
                }}
                className="px-3.5 py-2.5 rounded-2xl font-black text-xs bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-700 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                title="چاپ رسمی گزارش جامع وضعیت کلی پروژه (استاندارد نظام فنی و اجرایی)"
              >
                <Printer size={15} className="text-amber-600 dark:text-amber-400" />
                <span>گزارش کلی وضعیت پروژه</span>
              </button>

              {isSystemAdmin && (
                <button
                  onClick={() => handleOpenActivityModal()}
                  className="px-3.5 py-2.5 rounded-2xl font-black text-xs bg-stone-900 hover:bg-stone-800 dark:bg-white dark:hover:bg-stone-100 text-white dark:text-stone-900 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                >
                  <Plus size={15} />
                  افزودن فعالیت
                </button>
              )}
            </div>
          </div>

          {/* Table view with visual progress bar */}
          <div className="bg-white dark:bg-stone-900 rounded-3xl border border-[#ece5d8] dark:border-stone-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#fcfaf7] dark:bg-stone-800/50 text-stone-500 dark:text-stone-400 font-black border-b border-[#ece5d8] dark:border-stone-800">
                  <tr>
                    <th className="p-4">کد WBS</th>
                    <th className="p-4">عنوان فعالیت</th>
                    <th className="p-4 text-center">وزن فیزیکی</th>
                    <th className="p-4 text-center">شروع مصوب</th>
                    <th className="p-4 text-center">پایان مصوب</th>
                    <th className="p-4 text-center">مدت (روز)</th>
                    <th className="p-4 text-center">پیشرفت برنامه‌ای</th>
                    <th className="p-4 text-center">پیشرفت واقعی</th>
                    <th className="p-4 text-center">وضعیت / مسیر بحرانی</th>
                    <th className="p-4 text-center">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ece5d8] dark:divide-stone-800">
                  {projectActivities.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-12 text-stone-400 text-xs">
                        هیچ فعالیتی ثبت نشده است.
                      </td>
                    </tr>
                  ) : (
                    projectActivities.map((act) => (
                      <tr key={act.id} className="hover:bg-stone-50/50 dark:hover:bg-stone-800/30 transition-colors">
                        <td className="p-4 font-black text-amber-600">{act.code}</td>
                        <td className="p-4 font-bold text-stone-800 dark:text-stone-200">
                          {act.title}
                          {act.predecessorCodes && (
                            <span className="block text-[10px] text-stone-400 mt-0.5">پیشنیاز: {act.predecessorCodes}</span>
                          )}
                        </td>
                        <td className="p-4 text-center font-bold text-stone-600 dark:text-stone-300">{act.weightPercent}٪</td>
                        <td className="p-4 text-center font-medium text-stone-600 dark:text-stone-300 dir-ltr">{act.baselineStartDate}</td>
                        <td className="p-4 text-center font-medium text-stone-600 dark:text-stone-300 dir-ltr">{act.baselineEndDate}</td>
                        <td className="p-4 text-center font-bold">{act.durationDays}</td>
                        <td className="p-4 text-center">
                          <span className="font-bold text-blue-600 text-sm">{act.plannedProgress}٪</span>
                          <span className="block text-[9px] text-blue-500/80 font-bold mt-0.5">خودکار تا امروز</span>
                        </td>
                        <td className="p-4 text-center">
                          <div className="space-y-1">
                            <span className={`font-black ${act.actualProgress >= act.plannedProgress ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {act.actualProgress}٪
                            </span>
                            <div className="w-20 bg-stone-100 dark:bg-stone-800 h-1.5 rounded-full mx-auto overflow-hidden">
                              <div
                                className={`h-full rounded-full ${act.actualProgress >= act.plannedProgress ? 'bg-emerald-500' : 'bg-rose-500'}`}
                                style={{ width: `${Math.min(100, act.actualProgress)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                            {act.isCriticalPath && (
                              <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-black rounded-lg">
                                مسیر بحرانی
                              </span>
                            )}
                            <span
                              className={`px-2.5 py-1 rounded-xl text-[10px] font-black ${
                                act.status === 'COMPLETED'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : act.status === 'DELAYED'
                                  ? 'bg-rose-100 text-rose-700'
                                  : act.status === 'IN_PROGRESS'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-stone-100 text-stone-600'
                              }`}
                            >
                              {act.status === 'COMPLETED' ? 'تکمیل شده' : act.status === 'DELAYED' ? 'دارای تاخیر' : act.status === 'IN_PROGRESS' ? 'در حال اجرا' : 'شروع نشده'}
                            </span>
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          {isSystemAdmin ? (
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleOpenActivityModal(act)}
                                className="p-1.5 text-stone-500 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors cursor-pointer"
                                title="ویرایش فعالیت"
                              >
                                <Edit3 size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteActivity(act.id)}
                                className="p-1.5 text-stone-500 hover:text-rose-600 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                                title="حذف فعالیت"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-stone-400 dark:text-stone-500 font-medium">
                              فقط مدیر کل سیستم
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: EARNED VALUE MANAGEMENT (EVM) */}
      {activeSubTab === 'evm' && (
        <div className="space-y-8 animate-fadeIn">
          {/* EVM Action Bar */}
          <div className="bg-white dark:bg-slate-900 p-6 lg:p-8 rounded-3xl border border-stone-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-stone-900 dark:text-white flex items-center gap-2">
                  <Activity size={24} className="text-amber-500" />
                  ماژول کنترل پروژه و تحلیل ارزش حاصله (EVM)
                </h2>
                <span className="px-3 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-black rounded-xl">
                  PMBOK / EVM Standard
                </span>
              </div>
              <p className="text-xs text-stone-500 dark:text-slate-400 mt-1">
                ارزیابی یکپارچه عملکرد زمان‌بندی و هزینه‌ای، استخراج خودکار AC از صورت‌وضعیت‌ها و پیش‌بینی وضعیت نهایی
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setIsBaselineManagerModalOpen(true)}
                className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-stone-800 dark:text-white font-black text-xs rounded-2xl transition-all flex items-center gap-1.5"
              >
                <Lock size={16} className="text-amber-500" />
                مدیریت خطوط مبنا (Baseline)
              </button>

              <button
                onClick={syncWithDailyReports}
                className="px-3.5 py-2.5 bg-stone-100 hover:bg-stone-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-stone-600 dark:text-slate-300 font-bold text-xs rounded-2xl transition-all flex items-center gap-1.5"
                title="همگام‌سازی با احجام گزارشات روزانه"
              >
                <RefreshCw size={15} />
                همگام‌سازی گزارش روزانه
              </button>

              <button
                onClick={syncWithCbsAndTechnicalOffice}
                className="px-3.5 py-2.5 bg-stone-100 hover:bg-stone-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-stone-600 dark:text-slate-300 font-bold text-xs rounded-2xl transition-all flex items-center gap-1.5"
                title="همگام‌سازی با دفتر فنی و CBS"
              >
                <DollarSign size={15} />
                همگام‌سازی دفتر فنی
              </button>
            </div>
          </div>

          {/* Primary EVM KPI Cards Component */}
          <EvmKpiCards
            bac={evmMetrics.bac}
            pv={evmMetrics.pv}
            ev={evmMetrics.ev}
            ac={evmMetrics.ac}
            sv={evmMetrics.sv}
            cv={evmMetrics.cv}
            spi={evmMetrics.spi}
            cpi={evmMetrics.cpi}
            eac={evmMetrics.eac}
            vac={evmMetrics.vac}
            tcpi={evmMetrics.tcpi}
            approvedStatementCount={evmMetrics.statementCount}
          />

          {/* Technical Office & CBS Statements AC Link Traceability Section */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 lg:p-8 border border-stone-200/80 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-black text-stone-900 dark:text-white flex items-center gap-2">
                  <DollarSign size={18} className="text-purple-600" />
                  صورت‌وضعیت‌های دارای تایید نهایی کارفرما متصل به هزینه واقعی (AC Connection)
                </h3>
                <p className="text-xs text-stone-500 dark:text-slate-400 mt-0.5">
                  هزینه واقعی (AC) مستقیماً و منحصراً از صورت وضعیت‌های دارای تایید نهایی کارفرما (Approved by Employer) در دفتر فنی و CBS تجمیع می‌گردد.
                </p>
              </div>
              <span className="px-3.5 py-1.5 bg-purple-500/10 text-purple-700 dark:text-purple-300 font-black text-xs rounded-xl">
                مجموع: {(evmMetrics.ac / 1000000000).toFixed(2)} میلیارد تومان ({evmMetrics.statementCount || 0} سند)
              </span>
            </div>

            {evmMetrics.statementsSummary && evmMetrics.statementsSummary.length > 0 ? (
              <div className="overflow-x-auto rounded-2xl border border-stone-200/80 dark:border-slate-800">
                <table className="w-full text-right text-xs">
                  <thead className="bg-stone-50 dark:bg-slate-800/60 text-stone-500 font-black border-b border-stone-200/80 dark:border-slate-800">
                    <tr>
                      <th className="p-3">شماره / عنوان سند</th>
                      <th className="p-3 text-center">نوع ساختار</th>
                      <th className="p-3 text-center">تاریخ تایید</th>
                      <th className="p-3 text-center">مبلغ تایید شده (تومان)</th>
                      <th className="p-3 text-center">وضعیت</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 dark:divide-slate-800">
                    {evmMetrics.statementsSummary.map((st: any, idx: number) => (
                      <tr key={idx} className="hover:bg-stone-50/60 dark:hover:bg-slate-800/40">
                        <td className="p-3 font-black text-stone-800 dark:text-white">{st.number}</td>
                        <td className="p-3 text-center">
                          <span className="px-2 py-0.5 bg-stone-100 dark:bg-slate-800 text-stone-600 dark:text-slate-400 rounded-md text-[10px] font-bold">
                            {st.type === 'CBS' ? 'صورت‌وضعیت CBS' : 'صورت‌وضعیت سنتی'}
                          </span>
                        </td>
                        <td className="p-3 text-center text-stone-500 dir-ltr">{st.date}</td>
                        <td className="p-3 text-center font-black text-purple-600 dark:text-purple-400">
                          {st.amount.toLocaleString('fa-IR')}
                        </td>
                        <td className="p-3 text-center">
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 text-[10px] font-black rounded-md">
                            مصوب و منجمد شده
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 text-center bg-stone-50 dark:bg-slate-800/50 rounded-2xl text-xs text-stone-500">
                هنوز صورت وضعیت تایید شده نهایی برای این پروژه منجمد نگردیده است. در صورت ثبت صورت وضعیت در ماژول دفتر فنی یا CBS، ارقام AC به صورت خودکار محاسبه خواهند شد.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: S-CURVE & PROGRESS VISUALIZATION */}
      {activeSubTab === 'scurve' && (
        <div className="space-y-6 animate-fadeIn">
          {/* High Precision Interactive Recharts S-Curve */}
          <SCurveChart
            data={sCurveData}
            bac={evmMetrics.bac}
            projectTitle={activeProject.title}
          />
        </div>
      )}

      {/* TAB 4: PERIODIC PROGRESS REPORTS & WORKFLOW APPROVALS */}
      {activeSubTab === 'reports' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-stone-900 p-6 rounded-3xl border border-[#ece5d8] dark:border-stone-800 shadow-sm">
            <div>
              <h2 className="text-lg font-black text-stone-800 dark:text-stone-100">گزارشات پیشرفت دوره‌ای و گردش تایید اسناد</h2>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                گردش کار استاندارد ۳ سازمانه (پیمانکار ➔ مشاور ➔ کارفرما) و ثبت رسمی گزارشات ماهانه/دوره‌ای
              </p>
            </div>

            <button
              onClick={() => handleOpenReportModal()}
              className="px-5 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-black text-xs transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
            >
              <Plus size={18} />
              ایجاد گزارش پیشرفت جدید
            </button>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {projectReports.length === 0 ? (
              <div className="bg-white dark:bg-stone-900 p-12 rounded-3xl text-center text-stone-400 text-xs border border-[#ece5d8]">
                هیچ گزارش پیشرفتی برای این پروژه ثبت نشده است.
              </div>
            ) : (
              projectReports.map((report) => {
                const statusStyle = WorkflowService.getStatusStyle(report.status);
                const statusLabel = WorkflowService.getStatusLabel(report.status);
                const availableActions = currentUser ? WorkflowService.getAvailableActions(report as any, currentUser, userOrgType) : [];

                return (
                  <div
                    key={report.id}
                    className="bg-white dark:bg-stone-900 rounded-3xl border border-[#ece5d8] dark:border-stone-800 p-6 shadow-sm space-y-6 hover:shadow-md transition-all"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#ece5d8] dark:border-stone-800 pb-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <span className={`px-3 py-1 rounded-xl text-xs font-black ${statusStyle}`}>
                            {statusLabel}
                          </span>
                          <span className="text-xs font-bold text-amber-600">{report.reportNumber}</span>
                          {report.isFinalFrozen && (
                            <span className="px-2.5 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-black rounded-lg flex items-center gap-1">
                              <Lock size={12} /> قفل نهایی
                            </span>
                          )}
                        </div>
                        <h3 className="text-base font-black text-stone-800 dark:text-stone-100">{report.reportTitle}</h3>
                        <p className="text-xs text-stone-400">
                          بازه گزارش: {report.periodStartDate} الی {report.periodEndDate}
                        </p>
                      </div>

                      {/* Action buttons matching Technical Office standards */}
                      <div className="flex flex-wrap items-center gap-2">
                        {availableActions.map(action => (
                          <button
                            key={action}
                            onClick={() => handleOpenWorkflowModal(report, action)}
                            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${WorkflowService.getActionStyle(action)}`}
                          >
                            {WorkflowService.getActionLabel(action, userOrgType)}
                          </button>
                        ))}

                        <button
                          onClick={() => setPrintModalReport(report)}
                          className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                        >
                          <Printer size={15} />
                          چاپ / PDF
                        </button>

                        <button
                          onClick={() => setHistoryModalReport(report)}
                          className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                        >
                          <Clock size={15} />
                          تاریخچه
                        </button>
                      </div>
                    </div>

                    {/* Progress Metrics snapshot */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-[#faf8f4] dark:bg-stone-800/40 p-4 rounded-2xl text-center text-xs">
                      <div>
                        <span className="text-stone-400 block text-[11px]">پیشرفت فیزیکی برنامه‌ای</span>
                        <span className="font-black text-blue-600 text-sm mt-0.5 block">{report.plannedPhysicalProgress}٪</span>
                      </div>
                      <div>
                        <span className="text-stone-400 block text-[11px]">پیشرفت فیزیکی واقعی</span>
                        <span className="font-black text-emerald-600 text-sm mt-0.5 block">{report.actualPhysicalProgress}٪</span>
                      </div>
                      <div>
                        <span className="text-stone-400 block text-[11px]">شاخص SPI</span>
                        <span className="font-black text-stone-800 dark:text-stone-200 text-sm mt-0.5 block">{report.spi}</span>
                      </div>
                      <div>
                        <span className="text-stone-400 block text-[11px]">شاخص CPI</span>
                        <span className="font-black text-stone-800 dark:text-stone-200 text-sm mt-0.5 block">{report.cpi}</span>
                      </div>
                    </div>

                    {/* Text Details */}
                    {report.description && (
                      <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed bg-stone-50 dark:bg-stone-800/20 p-3 rounded-xl">
                        {report.description}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 5: DELAYS & EOT CLAIMS */}
      {activeSubTab === 'delays' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Sub-mode Switcher */}
          <div className="flex items-center gap-2 p-1.5 bg-stone-100 dark:bg-stone-800/80 rounded-2xl w-fit border border-[#ece5d8] dark:border-stone-700">
            <button
              onClick={() => setDelaySubMode('claims')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                delaySubMode === 'claims'
                  ? 'bg-white dark:bg-stone-900 text-amber-600 shadow-md'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
              }`}
            >
              <FileSpreadsheet size={16} />
              لوایح تاخیرات و ادعای تمدید مدت پیمان (EOT Claims)
            </button>
            <button
              onClick={() => setDelaySubMode('logs')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                delaySubMode === 'logs'
                  ? 'bg-white dark:bg-stone-900 text-amber-600 shadow-md'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
              }`}
            >
              <ShieldAlert size={16} />
              ثبت انحرافات و اقدامات اصلاحی WBS ({projectDelays.length})
            </button>
          </div>

          {delaySubMode === 'claims' ? (
            <DelayClaimsManager
              projectId={selectedProjectId}
              project={activeProject}
              onShowToast={showToast}
            />
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-stone-900 p-6 rounded-3xl border border-[#ece5d8] dark:border-stone-800 shadow-sm">
                <div>
                  <h2 className="text-lg font-black text-stone-800 dark:text-stone-100">ثبت انحرافات و اقدامات اصلاحی WBS</h2>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                    ثبت و رصد سریع انحرافات زمانی در سطح بسته‌های کاری و فعالیت‌های برنامه زمان‌بندی
                  </p>
                </div>

                <button
                  onClick={() => handleOpenDelayModal()}
                  className="px-5 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-black text-xs transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
                >
                  <Plus size={18} />
                  ثبت انحراف جدید
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {projectDelays.length === 0 ? (
                  <div className="bg-white dark:bg-stone-900 p-12 rounded-3xl text-center text-stone-400 text-xs border border-[#ece5d8]">
                    هیچ مورد انحرافی ثبت نشده است.
                  </div>
                ) : (
                  projectDelays.map((delay) => (
                    <div
                      key={delay.id}
                      className="bg-white dark:bg-stone-900 rounded-3xl border border-[#ece5d8] dark:border-stone-800 p-6 shadow-sm space-y-4"
                    >
                      <div className="flex items-center justify-between border-b border-[#ece5d8] dark:border-stone-800 pb-3">
                        <div className="flex items-center gap-3">
                          <span className="px-3 py-1 bg-rose-100 text-rose-700 rounded-xl text-xs font-black">
                            {delay.delayDays} روز تاخیر
                          </span>
                          <h3 className="font-black text-sm text-stone-800 dark:text-stone-100">
                            فعالیت: {delay.activityCode} - {delay.activityTitle}
                          </h3>
                        </div>
                        <span className="text-xs font-medium text-stone-400">تاریخ: {delay.date}</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                        <div className="bg-stone-50 dark:bg-stone-800/30 p-3 rounded-2xl">
                          <span className="font-black text-stone-500 block mb-1">علت ریشه‌ای:</span>
                          <p className="text-stone-700 dark:text-stone-300">{delay.rootCause}</p>
                        </div>

                        <div className="bg-stone-50 dark:bg-stone-800/30 p-3 rounded-2xl">
                          <span className="font-black text-stone-500 block mb-1">تحلیل اثرات:</span>
                          <p className="text-stone-700 dark:text-stone-300">{delay.impactAnalysis}</p>
                        </div>

                        <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-3 rounded-2xl border border-emerald-100 dark:border-emerald-900/40">
                          <span className="font-black text-emerald-700 dark:text-emerald-400 block mb-1">اقدام اصلاحی / جبرانی:</span>
                          <p className="text-emerald-900 dark:text-emerald-200">{delay.correctiveAction}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 6: LOSS & COMPENSATIONAL FINANCIAL CLAIMS */}
      {activeSubTab === 'loss_claims' && (
        <LossClaimsManager
          projectId={selectedProjectId}
          project={activeProject}
          onShowToast={showToast}
        />
      )}

      {/* ACTIVITY EDIT MODAL */}
      {isActivityModalOpen && editingActivity && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-stone-900 rounded-3xl shadow-2xl p-6 lg:p-8 max-w-lg w-full border border-[#ece5d8] dark:border-stone-800 space-y-6">
            <div className="flex items-center justify-between border-b border-[#ece5d8] dark:border-stone-800 pb-4">
              <h3 className="text-lg font-black text-stone-800 dark:text-stone-100">تعریف / ویرایش فعالیت WBS</h3>
              <button onClick={() => setIsActivityModalOpen(false)} className="text-stone-400 hover:text-stone-600">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-stone-600 dark:text-stone-300 mb-1 block">کد WBS</label>
                  <input
                    type="text"
                    value={editingActivity.code}
                    onChange={e => setEditingActivity({ ...editingActivity, code: e.target.value })}
                    className="w-full p-3 bg-stone-50 dark:bg-stone-800 border border-[#ece5d8] dark:border-stone-700 rounded-xl outline-none font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-stone-600 dark:text-stone-300 mb-1 block">درصد وزنی فیزیکی (٪)</label>
                  <input
                    type="number"
                    value={editingActivity.weightPercent}
                    onChange={e => setEditingActivity({ ...editingActivity, weightPercent: Number(e.target.value) })}
                    className="w-full p-3 bg-stone-50 dark:bg-stone-800 border border-[#ece5d8] dark:border-stone-700 rounded-xl outline-none font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-stone-600 dark:text-stone-300 mb-1 block">عنوان فعالیت</label>
                <input
                  type="text"
                  value={editingActivity.title}
                  onChange={e => setEditingActivity({ ...editingActivity, title: e.target.value })}
                  className="w-full p-3 bg-stone-50 dark:bg-stone-800 border border-[#ece5d8] dark:border-stone-700 rounded-xl outline-none font-bold"
                  placeholder="مثلا: بتن‌ریزی فونداسیون"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-stone-600 dark:text-stone-300 mb-1 block">تاریخ شروع مصوب</label>
                  <ShamsiDatePicker
                    value={editingActivity.baselineStartDate}
                    onChange={val => {
                      const auto = calculateActivityPlannedProgress(val, editingActivity.baselineEndDate, todayShamsi);
                      setEditingActivity({
                        ...editingActivity,
                        baselineStartDate: val,
                        durationDays: auto.totalDays,
                        plannedProgress: auto.plannedProgress
                      });
                    }}
                    inputClassName="!p-3 !bg-stone-50 dark:!bg-stone-800 !border-[#ece5d8] dark:!border-stone-700 !rounded-xl outline-none !font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-stone-600 dark:text-stone-300 mb-1 block">تاریخ پایان مصوب</label>
                  <ShamsiDatePicker
                    value={editingActivity.baselineEndDate}
                    onChange={val => {
                      const auto = calculateActivityPlannedProgress(editingActivity.baselineStartDate, val, todayShamsi);
                      setEditingActivity({
                        ...editingActivity,
                        baselineEndDate: val,
                        durationDays: auto.totalDays,
                        plannedProgress: auto.plannedProgress
                      });
                    }}
                    inputClassName="!p-3 !bg-stone-50 dark:!bg-stone-800 !border-[#ece5d8] dark:!border-stone-700 !rounded-xl outline-none !font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-stone-600 dark:text-stone-300 block">پیشرفت برنامه‌ای (٪)</label>
                    <button
                      type="button"
                      onClick={() => {
                        const auto = calculateActivityPlannedProgress(editingActivity.baselineStartDate, editingActivity.baselineEndDate, todayShamsi);
                        setEditingActivity({
                          ...editingActivity,
                          plannedProgress: auto.plannedProgress,
                          durationDays: auto.totalDays
                        });
                      }}
                      className="text-[10px] text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer"
                    >
                      محاسبه خودکار سیستم
                    </button>
                  </div>
                  <input
                    type="number"
                    value={editingActivity.plannedProgress}
                    onChange={e => setEditingActivity({ ...editingActivity, plannedProgress: Number(e.target.value) })}
                    className="w-full p-3 bg-stone-50 dark:bg-stone-800 border border-[#ece5d8] dark:border-stone-700 rounded-xl outline-none font-bold"
                  />
                  <span className="text-[10px] text-stone-400 mt-1 block">
                    محاسبه سیستم تا امروز ({todayShamsi}): {calculateActivityPlannedProgress(editingActivity.baselineStartDate, editingActivity.baselineEndDate, todayShamsi).plannedProgress}٪
                  </span>
                </div>

                <div>
                  <label className="font-bold text-stone-600 dark:text-stone-300 mb-1 block">پیشرفت واقعی (٪)</label>
                  <input
                    type="number"
                    value={editingActivity.actualProgress}
                    onChange={e => setEditingActivity({ ...editingActivity, actualProgress: Number(e.target.value) })}
                    className="w-full p-3 bg-stone-50 dark:bg-stone-800 border border-[#ece5d8] dark:border-stone-700 rounded-xl outline-none font-bold"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="critPath"
                  checked={editingActivity.isCriticalPath || false}
                  onChange={e => setEditingActivity({ ...editingActivity, isCriticalPath: e.target.checked })}
                  className="w-4 h-4 accent-amber-500 rounded"
                />
                <label htmlFor="critPath" className="font-bold text-stone-700 dark:text-stone-300">
                  این فعالیت در مسیر بحرانی (Critical Path) قرار دارد
                </label>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-[#ece5d8] dark:border-stone-800">
              <button
                onClick={() => setIsActivityModalOpen(false)}
                className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-2xl font-black text-xs transition-all"
              >
                انصراف
              </button>
              <button
                onClick={handleSaveActivity}
                className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-black text-xs transition-all shadow-lg shadow-amber-500/20"
              >
                ذخیره فعالیت
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PLAN / REPLAN REGISTRATION MODAL */}
      <PlanReplanModal
        isOpen={isPlanReplanModalOpen}
        onClose={() => setIsPlanReplanModalOpen(false)}
        projectId={selectedProjectId}
        activities={projectActivities}
        currentUser={currentUser}
        onSavePlan={handleSavePlanReplan}
      />

      {/* REPORT CREATE/EDIT MODAL */}
      {isReportModalOpen && editingReport && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-stone-900 rounded-3xl shadow-2xl p-6 lg:p-8 max-w-lg w-full border border-[#ece5d8] dark:border-stone-800 space-y-6">
            <div className="flex items-center justify-between border-b border-[#ece5d8] dark:border-stone-800 pb-4">
              <h3 className="text-lg font-black text-stone-800 dark:text-stone-100">ایجاد / ویرایش گزارش پیشرفت دوره‌ای</h3>
              <button onClick={() => setIsReportModalOpen(false)} className="text-stone-400 hover:text-stone-600">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-stone-600 dark:text-stone-300 mb-1 block">شماره گزارش</label>
                  <input
                    type="text"
                    value={editingReport.reportNumber}
                    onChange={e => setEditingReport({ ...editingReport, reportNumber: e.target.value })}
                    className="w-full p-3 bg-stone-50 dark:bg-stone-800 border border-[#ece5d8] dark:border-stone-700 rounded-xl outline-none font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-stone-600 dark:text-stone-300 mb-1 block">عنوان گزارش</label>
                  <input
                    type="text"
                    value={editingReport.reportTitle}
                    onChange={e => setEditingReport({ ...editingReport, reportTitle: e.target.value })}
                    className="w-full p-3 bg-stone-50 dark:bg-stone-800 border border-[#ece5d8] dark:border-stone-700 rounded-xl outline-none font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-stone-600 dark:text-stone-300 mb-1 block">شروع دوره</label>
                  <input
                    type="text"
                    value={editingReport.periodStartDate}
                    onChange={e => setEditingReport({ ...editingReport, periodStartDate: e.target.value })}
                    className="w-full p-3 bg-stone-50 dark:bg-stone-800 border border-[#ece5d8] dark:border-stone-700 rounded-xl outline-none font-bold dir-ltr"
                  />
                </div>

                <div>
                  <label className="font-bold text-stone-600 dark:text-stone-300 mb-1 block">پایان دوره</label>
                  <input
                    type="text"
                    value={editingReport.periodEndDate}
                    onChange={e => setEditingReport({ ...editingReport, periodEndDate: e.target.value })}
                    className="w-full p-3 bg-stone-50 dark:bg-stone-800 border border-[#ece5d8] dark:border-stone-700 rounded-xl outline-none font-bold dir-ltr"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-stone-600 dark:text-stone-300 mb-1 block">توضیحات و شرح پیشرفت دوره</label>
                <textarea
                  value={editingReport.description || ''}
                  onChange={e => setEditingReport({ ...editingReport, description: e.target.value })}
                  rows={3}
                  className="w-full p-3 bg-stone-50 dark:bg-stone-800 border border-[#ece5d8] dark:border-stone-700 rounded-xl outline-none font-medium resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-[#ece5d8] dark:border-stone-800">
              <button
                onClick={() => setIsReportModalOpen(false)}
                className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-2xl font-black text-xs transition-all"
              >
                انصراف
              </button>
              <button
                onClick={handleSaveReport}
                className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-black text-xs transition-all shadow-lg shadow-amber-500/20"
              >
                ذخیره و ثبت اولیه
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELAY EDIT MODAL */}
      {isDelayModalOpen && editingDelay && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-stone-900 rounded-3xl shadow-2xl p-6 lg:p-8 max-w-lg w-full border border-[#ece5d8] dark:border-stone-800 space-y-6">
            <div className="flex items-center justify-between border-b border-[#ece5d8] dark:border-stone-800 pb-4">
              <h3 className="text-lg font-black text-stone-800 dark:text-stone-100">ثبت انحراف / تاخیر</h3>
              <button onClick={() => setIsDelayModalOpen(false)} className="text-stone-400 hover:text-stone-600">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-stone-600 dark:text-stone-300 mb-1 block">مدت تاخیر (روز)</label>
                  <input
                    type="number"
                    value={editingDelay.delayDays}
                    onChange={e => setEditingDelay({ ...editingDelay, delayDays: Number(e.target.value) })}
                    className="w-full p-3 bg-stone-50 dark:bg-stone-800 border border-[#ece5d8] dark:border-stone-700 rounded-xl outline-none font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-stone-600 dark:text-stone-300 mb-1 block">تاریخ وقوع</label>
                  <ShamsiDatePicker
                    value={editingDelay.date}
                    onChange={val => setEditingDelay({ ...editingDelay, date: val })}
                    inputClassName="!p-3 !bg-stone-50 dark:!bg-stone-800 !border-[#ece5d8] dark:!border-stone-700 !rounded-xl outline-none !font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-stone-600 dark:text-stone-300 mb-1 block">علت ریشه‌ای تاخیر</label>
                <textarea
                  value={editingDelay.rootCause}
                  onChange={e => setEditingDelay({ ...editingDelay, rootCause: e.target.value })}
                  rows={2}
                  className="w-full p-3 bg-stone-50 dark:bg-stone-800 border border-[#ece5d8] dark:border-stone-700 rounded-xl outline-none font-medium resize-none"
                />
              </div>

              <div>
                <label className="font-bold text-stone-600 dark:text-stone-300 mb-1 block">تحلیل اثرات بر پروژه</label>
                <textarea
                  value={editingDelay.impactAnalysis}
                  onChange={e => setEditingDelay({ ...editingDelay, impactAnalysis: e.target.value })}
                  rows={2}
                  className="w-full p-3 bg-stone-50 dark:bg-stone-800 border border-[#ece5d8] dark:border-stone-700 rounded-xl outline-none font-medium resize-none"
                />
              </div>

              <div>
                <label className="font-bold text-stone-600 dark:text-stone-300 mb-1 block">برنامه و اقدام اصلاحی</label>
                <textarea
                  value={editingDelay.correctiveAction}
                  onChange={e => setEditingDelay({ ...editingDelay, correctiveAction: e.target.value })}
                  rows={2}
                  className="w-full p-3 bg-stone-50 dark:bg-stone-800 border border-[#ece5d8] dark:border-stone-700 rounded-xl outline-none font-medium resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-[#ece5d8] dark:border-stone-800">
              <button
                onClick={() => setIsDelayModalOpen(false)}
                className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-2xl font-black text-xs transition-all"
              >
                انصراف
              </button>
              <button
                onClick={handleSaveDelay}
                className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-black text-xs transition-all shadow-lg shadow-amber-500/20"
              >
                ثبت انحراف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WORKFLOW MODAL */}
      {isWorkflowModalOpen && workflowTargetReport && workflowAction && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-stone-900 rounded-3xl shadow-2xl p-6 lg:p-8 max-w-md w-full border border-[#ece5d8] dark:border-stone-800 space-y-6">
            <div className="flex items-center justify-between border-b border-[#ece5d8] dark:border-stone-800 pb-4">
              <h3 className="text-lg font-black text-stone-800 dark:text-stone-100">
                {WorkflowService.getActionLabel(workflowAction, userOrgType)}
              </h3>
              <button onClick={() => setIsWorkflowModalOpen(false)} className="text-stone-400 hover:text-stone-600">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <p className="text-stone-600 dark:text-stone-300 font-medium">
                شما در حال ثبت اقدام{' '}
                <span className="font-black text-amber-600">{WorkflowService.getActionLabel(workflowAction, userOrgType)}</span>{' '}
                برای سند شماره <span className="font-black">{workflowTargetReport.reportNumber}</span> هستید.
              </p>

              {(workflowAction === 'SUBMIT' || workflowAction === 'REASSIGN' || workflowAction === 'APPROVE' || workflowAction === 'SEND_TO_CONSULTANT' || workflowAction === 'SEND_TO_EMPLOYER' || workflowAction === 'RETURN_TO_CONSULTANT' || workflowAction === 'RETURN_TO_CONTRACTOR' || workflowAction === 'REJECT') && (
                <div>
                  <label className="font-bold text-stone-600 dark:text-stone-300 mb-1 block">انتخاب گیرنده (ارجاع به)</label>
                  <select
                    value={workflowAssigneeId}
                    onChange={e => setWorkflowAssigneeId(e.target.value)}
                    className="w-full p-3 bg-stone-50 dark:bg-stone-800 border border-[#ece5d8] dark:border-stone-700 rounded-xl outline-none font-bold text-stone-700 dark:text-stone-200"
                  >
                    <option value="">انتخاب کاربر دریافت‌کننده...</option>
                    {workflowOrgUsers.map(u => (
                      <option key={u.id} value={u.id}>
                        {formatUserDisplayFormal(u, SystemAdminService.getOrganization(u.orgId))}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="font-bold text-stone-600 dark:text-stone-300 mb-1 block">توضیحات و هامش کارشناسی</label>
                <textarea
                  value={workflowComment}
                  onChange={e => setWorkflowComment(e.target.value)}
                  rows={3}
                  className="w-full p-3 bg-stone-50 dark:bg-stone-800 border border-[#ece5d8] dark:border-stone-700 rounded-xl outline-none font-medium resize-none"
                  placeholder="توضیحات خود را در صورت نیاز وارد کنید..."
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-[#ece5d8] dark:border-stone-800">
              <button
                onClick={() => setIsWorkflowModalOpen(false)}
                className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-2xl font-black text-xs transition-all"
              >
                انصراف
              </button>
              <button
                onClick={handleExecuteWorkflow}
                disabled={(workflowAction === 'SUBMIT' || workflowAction === 'RESUBMIT' || workflowAction === 'REASSIGN' || workflowAction === 'SEND_TO_CONSULTANT' || workflowAction === 'SEND_TO_EMPLOYER' || workflowAction === 'SEND_TO_CONTRACTOR' || workflowAction === 'RETURN_TO_CONSULTANT' || workflowAction === 'RETURN_TO_CONTRACTOR') && !workflowAssigneeId}
                className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-stone-300 disabled:cursor-not-allowed text-white rounded-2xl font-black text-xs transition-all shadow-lg shadow-amber-500/20"
              >
                تایید و انجام
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HISTORY MODAL */}
      {historyModalReport && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-stone-900 rounded-3xl shadow-2xl p-6 lg:p-8 max-w-lg w-full border border-[#ece5d8] dark:border-stone-800 space-y-6">
            <div className="flex items-center justify-between border-b border-[#ece5d8] dark:border-stone-800 pb-4">
              <h3 className="text-lg font-black text-stone-800 dark:text-stone-100">تاریخچه و سیر گردش کار سند</h3>
              <button onClick={() => setHistoryModalReport(null)} className="text-stone-400 hover:text-stone-600">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2">
              {(!historyModalReport.workflowHistory || historyModalReport.workflowHistory.length === 0) ? (
                <p className="text-center text-xs text-stone-400 py-6">تاریخچه‌ای ثبت نشده است.</p>
              ) : (
                historyModalReport.workflowHistory.map((ev, idx) => (
                  <div key={ev.id || idx} className="p-3 bg-stone-50 dark:bg-stone-800/40 rounded-2xl border border-[#ece5d8] dark:border-stone-800 space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-amber-600">{WorkflowService.getActionLabel(ev.action)}</span>
                      <span className="text-[10px] text-stone-400">{new Date(ev.timestamp).toLocaleString('fa-IR')}</span>
                    </div>
                    <p className="text-stone-700 dark:text-stone-300 font-bold">توسط: {ev.actorName || 'کاربر سیستم'}</p>
                    {ev.comment && <p className="text-stone-500 text-[11px] italic mt-1">«{ev.comment}»</p>}
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => setHistoryModalReport(null)}
              className="w-full py-3 bg-stone-100 text-stone-700 rounded-2xl font-black text-xs hover:bg-stone-200 transition-all"
            >
              بستن
            </button>
          </div>
        </div>
      )}

      {/* PRINT PREVIEW MODAL */}
      {printModalReport && (
        <div className="fixed inset-0 z-[170] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white text-stone-900 rounded-3xl shadow-2xl p-8 max-w-2xl w-full space-y-6 max-h-[85vh] overflow-y-auto dir-rtl">
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="text-amber-600" size={24} />
                <h3 className="text-lg font-black">گزارش رسمی پیشرفت فیزیکی و ارزش حاصله</h3>
              </div>
              <button onClick={() => setPrintModalReport(null)} className="text-stone-400 hover:text-stone-600">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 bg-stone-50 p-4 rounded-2xl border border-stone-200">
                <div><strong>نام پروژه:</strong> {activeProject.title}</div>
                <div><strong>شماره گزارش:</strong> {printModalReport.reportNumber}</div>
                <div><strong>دوره گزارش:</strong> {printModalReport.periodStartDate} الی {printModalReport.periodEndDate}</div>
                <div><strong>وضعیت سند:</strong> {WorkflowService.getStatusLabel(printModalReport.status)}</div>
              </div>

              <div className="grid grid-cols-2 gap-4 border p-4 rounded-2xl text-center font-bold">
                <div>پیشرفت فیزیکی برنامه‌ای: {printModalReport.plannedPhysicalProgress}٪</div>
                <div>پیشرفت فیزیکی واقعی: {printModalReport.actualPhysicalProgress}٪</div>
                <div>شاخص SPI: {printModalReport.spi}</div>
                <div>شاخص CPI: {printModalReport.cpi}</div>
              </div>

              {printModalReport.description && (
                <div className="border p-4 rounded-2xl space-y-1">
                  <strong>توضیحات و شرح پیشرفت:</strong>
                  <p>{printModalReport.description}</p>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <button
                onClick={() => setPrintModalReport(null)}
                className="flex-1 py-3 bg-stone-100 text-stone-700 rounded-2xl font-black text-xs"
              >
                انصراف
              </button>
              <button
                onClick={() => {
                  window.print();
                }}
                className="flex-1 py-3 bg-amber-500 text-white rounded-2xl font-black text-xs shadow-lg"
              >
                چاپ / دانلود PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REBASELINE MODAL */}
      {isRebaselineModalOpen && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-stone-900 rounded-3xl shadow-2xl p-6 lg:p-8 max-w-4xl w-full border border-[#ece5d8] dark:border-stone-800 space-y-6 max-h-[90vh] overflow-y-auto dir-rtl">
            <div className="flex items-center justify-between border-b border-[#ece5d8] dark:border-stone-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-500 text-white rounded-2xl">
                  <Calendar size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-stone-800 dark:text-stone-100">
                    درخواست به‌روزرسانی / اصلاح برنامه زمان‌بندی اولیه (Re-baseline)
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    تغییر تواریخ شروع و پایان اولیه فعالیت‌ها و ارسال جهت اخذ تاییدیه نهایی از مشاور و کارفرما
                  </p>
                </div>
              </div>
              <button onClick={() => setIsRebaselineModalOpen(false)} className="text-stone-400 hover:text-stone-600">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-stone-600 dark:text-stone-300 mb-1 block">عنوان سند به‌روزرسانی زمان‌بندی *</label>
                  <input
                    type="text"
                    value={rebaselineTitle}
                    onChange={e => setRebaselineTitle(e.target.value)}
                    className="w-full p-3 bg-stone-50 dark:bg-stone-800 border border-[#ece5d8] dark:border-stone-700 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-stone-600 dark:text-stone-300 mb-1 block">علت و دلایل توجیهی بازنگری برنامه *</label>
                  <input
                    type="text"
                    value={rebaselineReason}
                    onChange={e => setRebaselineReason(e.target.value)}
                    className="w-full p-3 bg-stone-50 dark:bg-stone-800 border border-[#ece5d8] dark:border-stone-700 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div className="border border-[#ece5d8] dark:border-stone-800 rounded-2xl p-4 space-y-3">
                <h4 className="font-black text-stone-800 dark:text-stone-200">جدول فعالیت‌های WBS اولیه پیشنهادی:</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 font-bold border-b">
                        <th className="p-2">کد WBS</th>
                        <th className="p-2">عنوان فعالیت</th>
                        <th className="p-2">تاریخ شروع جدید</th>
                        <th className="p-2">تاریخ پایان جدید</th>
                        <th className="p-2">مدت (روز)</th>
                        <th className="p-2">وزن (٪)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                      {rebaselineActivities.map((act, index) => (
                        <tr key={act.id || index} className="hover:bg-stone-50/50">
                          <td className="p-2 font-black text-amber-600">{act.code}</td>
                          <td className="p-2 font-bold">{act.title}</td>
                          <td className="p-2">
                            <ShamsiDatePicker
                              value={act.baselineStartDate}
                              onChange={val => {
                                const newArr = [...rebaselineActivities];
                                newArr[index].baselineStartDate = val;
                                setRebaselineActivities(newArr);
                              }}
                              inputClassName="!w-28 !p-1.5 !bg-white dark:!bg-stone-800 !border !rounded-lg !text-center !font-bold"
                            />
                          </td>
                          <td className="p-2">
                            <ShamsiDatePicker
                              value={act.baselineEndDate}
                              onChange={val => {
                                const newArr = [...rebaselineActivities];
                                newArr[index].baselineEndDate = val;
                                setRebaselineActivities(newArr);
                              }}
                              inputClassName="!w-28 !p-1.5 !bg-white dark:!bg-stone-800 !border !rounded-lg !text-center !font-bold"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              value={act.durationDays}
                              onChange={e => {
                                const newArr = [...rebaselineActivities];
                                newArr[index].durationDays = Number(e.target.value);
                                setRebaselineActivities(newArr);
                              }}
                              className="w-20 p-1.5 bg-white dark:bg-stone-800 border rounded-lg text-center font-bold"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              value={act.weightPercent}
                              onChange={e => {
                                const newArr = [...rebaselineActivities];
                                newArr[index].weightPercent = Number(e.target.value);
                                setRebaselineActivities(newArr);
                              }}
                              className="w-20 p-1.5 bg-white dark:bg-stone-800 border rounded-lg text-center font-bold"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-[#ece5d8] dark:border-stone-800">
              <button
                onClick={() => setIsRebaselineModalOpen(false)}
                className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-2xl font-black text-xs transition-all"
              >
                انصراف
              </button>
              <button
                onClick={handleSaveRebaselineProposal}
                className="flex-1 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl font-black text-xs transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                <Send size={16} />
                <span>ثبت و ارسال جهت تایید مشاور و کارفرما</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DEDICATED PROJECT CONTROL & EVM MODALS */}
      <ProgressTrackingModal
        isOpen={isProgressTrackingModalOpen}
        onClose={() => setIsProgressTrackingModalOpen(false)}
        projectId={selectedProjectId}
        activities={projectActivities}
        currentUser={currentUser}
        onSaveProgress={(updatedActs, record) => {
          setActivities(updatedActs);
          showToast('پیشرفت فیزیکی دوره‌ای با موفقیت ثبت شد و مقادیر EVM به‌روزرسانی گردید.');
        }}
      />

      <BaselineManagerModal
        isOpen={isBaselineManagerModalOpen}
        onClose={() => setIsBaselineManagerModalOpen(false)}
        projectId={selectedProjectId}
        activities={projectActivities}
        totalBAC={evmMetrics.bac}
        currentUser={currentUser}
        onBaselineCreated={(bl) => {
          showToast(`خط مبنای مصوب (نسخه ${bl.version}) با موفقیت ثبت گردید.`);
        }}
      />

      {/* DEDICATED REPLAN & TIMELINE EXTENSION MODAL */}
      <ProjectReplanModal
        isOpen={isReplanModalOpen}
        onClose={() => setIsReplanModalOpen(false)}
        project={activeProject}
        activities={projectActivities}
        currentUser={currentUser}
        onApplyReplan={handleApplyReplan}
        canUnlockReplan={canUnlockReplan}
      />
    </div>
  );
}
