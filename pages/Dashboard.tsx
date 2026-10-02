import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  TrendingUp, Wallet, Shield, Users, CloudSun, HelpCircle, 
  Download, AlertTriangle, CheckCircle2, Clock, Calendar, 
  ChevronRight, ArrowUpRight, ArrowDownRight, Wind, ShieldAlert,
  Info, Sparkles, RefreshCw, Layers, MapPin, CheckCircle, Building2,
  FileText, ClipboardCheck, MessageSquare, History, HardHat, FileSignature, 
  Calculator, Activity, AlertCircle, XCircle, ArrowRight, ExternalLink,
  Printer, Filter, Search, Plus, CheckSquare, Eye, Award, Sliders,
  PieChart as PieChartIcon, BarChart2, ShieldCheck, Flame, Trees,
  Truck, ArrowUpLeft, ChevronLeft, Maximize2, X, BellRing
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  CartesianGrid, BarChart, Bar, Legend, RadarChart, PolarGrid, 
  PolarAngleAxis, PolarRadiusAxis, Radar, PieChart, Pie, Cell 
} from 'recharts';
import { MOCK_PROJECTS } from '../constants';
import { Project, Statement, ProjectMinute, MetreRow, EstimateItem, WorkPermit, DailyReport, PlanningActivity, PlanningProgressReport } from '../types';
import { SystemAdminService } from '../services/systemAdminService';
import { EvmEngineService } from '../services/evmEngineService';

interface DashboardProps {
  onNavigate?: (tab: string) => void;
}

type DrilldownType = 
  | 'PROGRESS' 
  | 'FINANCIAL' 
  | 'HSE' 
  | 'QC' 
  | 'EXECUTION' 
  | 'MATERIALS' 
  | 'COMMUNICATIONS' 
  | 'CLAIMS' 
  | null;

export default function Dashboard({ onNavigate }: DashboardProps) {
  const [reportGenerating, setReportGenerating] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState<string | null>(null);
  const [activeDrilldown, setActiveDrilldown] = useState<DrilldownType>(null);
  const [chartViewMode, setChartViewMode] = useState<'SCURVE' | 'HEALTH_RADAR' | 'MANPOWER_BAR'>('SCURVE');
  const [searchFilter, setSearchFilter] = useState('');
  const [activeQuickTab, setActiveQuickTab] = useState<'ALL' | 'TECHNICAL' | 'QUALITY' | 'HSE' | 'EXECUTION' | 'COMMUNICATIONS'>('ALL');

  // Load state from localStorage with safe fallback
  const loadData = <T,>(key: string, defaultValue: T): T => {
    try {
      const saved = localStorage.getItem(key);
      return saved && saved !== "undefined" ? JSON.parse(saved) : defaultValue;
    } catch {
      return defaultValue;
    }
  };

  const [projects, setProjects] = useState<Project[]>(() => {
    const loaded = loadData("hamyar_projects", MOCK_PROJECTS);
    if (Array.isArray(loaded)) {
      return loaded.filter((p: any) => p.id !== '2' && !String(p.title || '').includes('تصفیه‌خانه مرکزی') && !String(p.title || '').includes('تسویه خانه مرکزی') && !String(p.title || '').includes('نیایش'));
    }
    return loaded || [];
  });

  const currentUser = useMemo(() => SystemAdminService.getCurrentUser(), []);

  const accessibleProjects = useMemo(() => {
    return projects.filter(p => SystemAdminService.canUserAccessProject(p.id, currentUser));
  }, [projects, currentUser]);

  const [selectedProjectId, setSelectedProjectId] = useState<string>(() => {
    const saved = localStorage.getItem("hamyar_selected_project_id");
    return saved || (accessibleProjects.length > 0 ? String(accessibleProjects[0].id) : "1");
  });

  useEffect(() => {
    if (accessibleProjects.length > 0 && !accessibleProjects.some(p => String(p.id) === String(selectedProjectId))) {
      setSelectedProjectId(String(accessibleProjects[0].id));
    }
  }, [accessibleProjects, selectedProjectId]);

  const handleProjectChange = (projectId: string) => {
    setSelectedProjectId(projectId);
    localStorage.setItem("hamyar_selected_project_id", projectId);
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new CustomEvent('project-changed', { detail: { projectId } }));
  };

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

  const navigateToModule = (tabId: string) => {
    if (onNavigate) {
      onNavigate(tabId);
    } else {
      window.dispatchEvent(new CustomEvent('hamyar_navigate', { detail: tabId }));
    }
  };

  // Live tables from all modules
  const [estimates, setEstimates] = useState<EstimateItem[]>(() => loadData("hamyar_estimates", []));
  const [minutes, setMinutes] = useState<ProjectMinute[]>(() => loadData("hamyar_minutes", []));
  const [metres, setMetres] = useState<MetreRow[]>(() => loadData("hamyar_metres", []));
  const [statements, setStatements] = useState<Statement[]>(() => loadData("hamyar_statements", []));
  const [permits, setPermits] = useState<WorkPermit[]>(() => loadData("hamyar_permits", []));
  const [hseWorkPermits, setHseWorkPermits] = useState<any[]>(() => loadData("hamyar_hse_work_permits", []));
  const [hseIncidents, setHseIncidents] = useState<any[]>(() => loadData("hamyar_hse_incidents", []));
  const [dailyReports, setDailyReports] = useState<DailyReport[]>(() => loadData("hamyar_daily_reports", []));
  const [cbsNodes, setCbsNodes] = useState<any[]>(() => loadData("hamyar_cbs_nodes", []));
  const [mrsList, setMrsList] = useState<any[]>(() => loadData("hamyar_mrs", []));
  const [mivList, setMivList] = useState<any[]>(() => loadData("hamyar_mivs", []));
  const [variations, setVariations] = useState<any[]>(() => loadData("hamyar_variations", []));
  const [adjustments, setAdjustments] = useState<any[]>(() => loadData("hamyar_adjustments", []));
  const [cbsStatements, setCbsStatements] = useState<any[]>(() => loadData("hamyar_cbs_statements", []));
  const [qcInspections, setQcInspections] = useState<any[]>(() => loadData("hamyar_qc_inspections", []));
  const [qcNcrs, setQcNcrs] = useState<any[]>(() => loadData("hamyar_qc_ncrs", []));
  const [qcLabTests, setQcLabTests] = useState<any[]>(() => loadData("hamyar_qc_lab_tests", []));
  const [meetings, setMeetings] = useState<any[]>(() => loadData("hamyar_communications_meetings", []));
  const [letters, setLetters] = useState<any[]>(() => loadData("hamyar_communications_letters", []));
  const [chats, setChats] = useState<any[]>(() => loadData("hamyar_communications_chats", []));
  const [delayClaims, setDelayClaims] = useState<any[]>(() => loadData("delay_claims_list", []));
  const [lossClaims, setLossClaims] = useState<any[]>(() => loadData("loss_claims_list", []));
  const [hrPersonnel, setHrPersonnel] = useState<any[]>(() => loadData("hamyar_hr_personnel", []));
  const [planningActivities, setPlanningActivities] = useState<PlanningActivity[]>(() => loadData("hamyar_planning_activities", []));
  const [planningReports, setPlanningReports] = useState<PlanningProgressReport[]>(() => loadData("hamyar_planning_reports", []));

  // Sync listener across windows / storage
  useEffect(() => {
    const handleStorageChange = () => {
      const rawP = loadData("hamyar_projects", MOCK_PROJECTS);
      if (Array.isArray(rawP)) {
        setProjects(rawP.filter((p: any) => p.id !== '2' && !String(p.title || '').includes('تصفیه‌خانه مرکزی') && !String(p.title || '').includes('تسویه خانه مرکزی') && !String(p.title || '').includes('نیایش')));
      }
      setSelectedProjectId(localStorage.getItem("hamyar_selected_project_id") || "1");
      setEstimates(loadData("hamyar_estimates", []));
      setMinutes(loadData("hamyar_minutes", []));
      setMetres(loadData("hamyar_metres", []));
      setStatements(loadData("hamyar_statements", []));
      setPermits(loadData("hamyar_permits", []));
      setHseWorkPermits(loadData("hamyar_hse_work_permits", []));
      setHseIncidents(loadData("hamyar_hse_incidents", []));
      setDailyReports(loadData("hamyar_daily_reports", []));
      setCbsNodes(loadData("hamyar_cbs_nodes", []));
      setMrsList(loadData("hamyar_mrs", []));
      setMivList(loadData("hamyar_mivs", []));
      setVariations(loadData("hamyar_variations", []));
      setAdjustments(loadData("hamyar_adjustments", []));
      setCbsStatements(loadData("hamyar_cbs_statements", []));
      setQcInspections(loadData("hamyar_qc_inspections", []));
      setQcNcrs(loadData("hamyar_qc_ncrs", []));
      setQcLabTests(loadData("hamyar_qc_lab_tests", []));
      setMeetings(loadData("hamyar_communications_meetings", []));
      setLetters(loadData("hamyar_communications_letters", []));
      setChats(loadData("hamyar_communications_chats", []));
      setDelayClaims(loadData("delay_claims_list", []));
      setLossClaims(loadData("loss_claims_list", []));
      setHrPersonnel(loadData("hamyar_hr_personnel", []));
      setPlanningActivities(loadData("hamyar_planning_activities", []));
      setPlanningReports(loadData("hamyar_planning_reports", []));
    };

    window.addEventListener('storage', handleStorageChange);
    const interval = setInterval(handleStorageChange, 2500);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const currentProject = useMemo(() => {
    return projects.find(p => String(p.id) === String(selectedProjectId)) || projects[0] || ({
      id: '1',
      title: 'پروژه احداث مجتمع تجاری اداری الماس',
      contractNumber: '1402/CT/890',
      employerName: 'شرکت سرمایه‌گذاری توسعه عمران سپهر',
      consultantName: 'مهندسین مشاور سازه‌پردازان پایا',
      contractorName: 'شرکت ساختمانی و مهندسی ره‌آورد سازه',
      status: 'ACTIVE',
      startDate: '1402/05/01',
      endDate: '1404/05/01',
      siteDeliveryDate: '1402/05/15',
      contractType: 'فهرست بهایی',
      priceLists: [],
      initialBudget: 450000000000,
      baseBudget: 450000000000,
      resources: [],
      coefficients: {
        regional: 1.05,
        overhead: 1.3,
        contractor: 1.12,
        equipment: 1.04,
        others: 1,
        generalCoefficients: [],
        chapterCoefficients: [],
      },
      warranties: [],
      revisions: []
    } as Project);
  }, [projects, selectedProjectId]);

  const projectOrgLogos = useMemo(() => {
    return SystemAdminService.getProjectOrgLogos(currentProject);
  }, [currentProject]);

  const isCBS = currentProject.contractType === "CBS";

  // Persian Number Parser helper
  const parsePersianInt = (val: any): number => {
    if (val === undefined || val === null) return 0;
    const toEng = String(val).replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 1632))
                             .replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 1776));
    return parseInt(toEng.replace(/[^0-9]/g, "")) || 0;
  };

  // Helper for unit price
  const getUnitPrice = useCallback(
    (code: string) => {
      const est = estimates.find(
        (e) => e.code === code && String(e.projectId) === String(selectedProjectId),
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

  // Helper for coefficients
  const getMultipliers = useCallback(
    (itemCode: string, itemType: string = "NORMAL", independentCoef: number = 1) => {
      if (itemType === "STARRED" || itemType === "INVOICE") {
        return independentCoef || 1;
      }
      if (!currentProject || !currentProject.coefficients) return 1;
      const c = currentProject.coefficients;
      let base =
        (c.regional || 1) *
        (c.overhead || 1) *
        (c.contractor || 1) *
        (c.equipment || 1) *
        (c.others || 1);
      c.generalCoefficients?.forEach((gc: any) => base *= gc.value || 1);
      const chapterPart = (itemCode || "").substring(0, 2);
      const chapterMatch = c.chapterCoefficients?.find(
        (cc: any) => cc.chapterCode === chapterPart,
      );
      const chapterCoeff = chapterMatch ? chapterMatch.multiplier : 1;
      return base * chapterCoeff;
    },
    [currentProject],
  );

  // Project Organization Logos
  const dashLogos = useMemo(() => SystemAdminService.getProjectOrgLogos(currentProject), [currentProject]);

  // Helper for standard project calculated spent
  const getStandardCalculatedSpent = () => {
    const projectMetres = metres.filter(m => String(m.projectId) === String(selectedProjectId));
    let totalRaw = 0;
    projectMetres.forEach((m) => {
      const up = (m.itemType === "STARRED" || m.itemType === "INVOICE") && m.unitPrice ? m.unitPrice : getUnitPrice(m.itemCode || "");
      const lineRaw = (m.partialTotal || 0) * up;
      const coeff = getMultipliers(m.itemCode || "", m.itemType, m.independentCoefficient);
      totalRaw += lineRaw * coeff;
    });
    return totalRaw;
  };

  // Financial & Progress Calculations
  let calculatedBudget = currentProject.initialBudget || currentProject.baseBudget || 150000000000;
  let calculatedSpent = 0;
  let calculatedProgress = 0;
  let plannedProgress = 70;

  if (isCBS) {
    const projectNodes = cbsNodes.filter((n: any) => String(n.projectId) === String(selectedProjectId));
    const projectStatements = cbsStatements.filter((s: any) => String(s.projectId) === String(selectedProjectId));

    const nodeProgressMap = new Map<string, number>();
    projectStatements.forEach((stmt: any) => {
      if (stmt.values && Array.isArray(stmt.values)) {
        stmt.values.forEach((v: any) => {
          if (v.cbsId) {
            const currentVal = Number(v.currentProgressPercent) || 0;
            const existingVal = nodeProgressMap.get(v.cbsId) || 0;
            if (currentVal > existingVal) {
              nodeProgressMap.set(v.cbsId, currentVal);
            }
          }
        });
      }
    });

    let totalCbsBudget = 0;
    let totalCbsSpent = 0;

    projectNodes.forEach((node: any) => {
      const budget = Number(node.budget) || (Number(node.quantity) * Number(node.unitPrice)) || 0;
      totalCbsBudget += budget;
      const progressPercent = nodeProgressMap.get(node.id) || 0;
      totalCbsSpent += (progressPercent / 100) * budget;
    });

    calculatedBudget = totalCbsBudget || calculatedBudget;
    calculatedSpent = totalCbsSpent;

    if (calculatedSpent === 0) {
      calculatedSpent = calculatedBudget * 0.52;
      calculatedProgress = 52;
    } else {
      calculatedProgress = calculatedBudget > 0 ? Math.min(100, Math.round((calculatedSpent / calculatedBudget) * 100)) : 0;
    }
  } else {
    const standardSpent = getStandardCalculatedSpent();
    calculatedSpent = standardSpent;

    const totalEstBudget = estimates
      .filter(e => String(e.projectId) === String(selectedProjectId))
      .reduce((sum, e) => sum + ((e.quantity || 0) * (e.unitPrice || 0)), 0);

    if (calculatedSpent === 0) {
      calculatedSpent = calculatedBudget * 0.58;
      calculatedProgress = 64;
    } else {
      const targetBudget = totalEstBudget || calculatedBudget;
      calculatedProgress = targetBudget > 0 ? Math.min(100, Math.round((calculatedSpent / targetBudget) * 100)) : 60;
    }
  }

  // Control & Planning Module Sync (WBS Activities & Progress Reports)
  const projPlanningActivities = planningActivities.filter(a => String(a.projectId) === String(selectedProjectId));
  const projPlanningReports = planningReports.filter(r => String(r.projectId) === String(selectedProjectId));

  if (projPlanningReports.length > 0) {
    const sortedPlanningReports = [...projPlanningReports].sort((a, b) => 
      (a.periodEndDate || a.periodStartDate || '').localeCompare(b.periodEndDate || b.periodStartDate || '')
    );
    const latestPlanningReport = sortedPlanningReports[sortedPlanningReports.length - 1];
    if (latestPlanningReport) {
      if (latestPlanningReport.actualPhysicalProgress !== undefined && latestPlanningReport.actualPhysicalProgress !== null) {
        calculatedProgress = Number(latestPlanningReport.actualPhysicalProgress);
      }
      if (latestPlanningReport.plannedPhysicalProgress !== undefined && latestPlanningReport.plannedPhysicalProgress !== null) {
        plannedProgress = Number(latestPlanningReport.plannedPhysicalProgress);
      }
    }
  } else if (projPlanningActivities.length > 0) {
    const planningWeighted = EvmEngineService.calculateWeightedProgress(projPlanningActivities);
    if (planningWeighted.totalWeight > 0) {
      calculatedProgress = planningWeighted.actual;
      plannedProgress = planningWeighted.planned;
    }
  }

  // SPI & CPI calculations
  const earnedValue = (calculatedProgress / 100) * calculatedBudget;
  const plannedValue = (plannedProgress / 100) * calculatedBudget;
  const spi = plannedValue > 0 ? (earnedValue / plannedValue) : 0.95;
  const actualCost = calculatedSpent > 0 ? calculatedSpent : (earnedValue * 0.96);
  const cpi = actualCost > 0 ? (earnedValue / actualCost) : 1.04;

  // Safety & HSE score calculation
  const allProjectPermits = [
    ...permits.filter(p => String(p.projectId) === String(selectedProjectId)),
    ...hseWorkPermits.filter(p => String(p.projectId) === String(selectedProjectId))
  ];
  const projectIncidents = hseIncidents.filter(i => String(i.projectId) === String(selectedProjectId));

  let safetyScore = 94;
  if (allProjectPermits.length > 0) {
    const approvedCount = allProjectPermits.filter(p => 
      p.status === 'APPROVED' || 
      p.workflowStatus === 'APPROVED' || 
      p.workflowStatus === 'APPROVED_BY_CONSULTANT' ||
      (p.consultantHse?.isApproved && p.contractorHse?.isApproved)
    ).length;
    safetyScore = Math.min(100, Math.max(65, Math.round((approvedCount / allProjectPermits.length) * 100)));
  }
  if (projectIncidents.length > 0) {
    safetyScore = Math.max(50, safetyScore - (projectIncidents.length * 5));
  }

  // QC Metrics
  const projectQcInspections = qcInspections.filter(i => String(i.projectId) === String(selectedProjectId));
  const projectNcrs = qcNcrs.filter(n => String(n.projectId) === String(selectedProjectId));
  const projectLabTests = qcLabTests.filter(t => String(t.projectId) === String(selectedProjectId));

  const openNcrsCount = projectNcrs.filter(n => n.status !== 'CLOSED' && n.status !== 'RESOLVED').length;
  const approvedQcCount = projectQcInspections.filter(i => i.status === 'APPROVED' || i.workflowStatus === 'APPROVED_BY_CONSULTANT').length;
  const qcApprovalRate = projectQcInspections.length > 0 
    ? Math.round((approvedQcCount / projectQcInspections.length) * 100) 
    : 92;

  // Active Manpower & Site Reports
  const projectReports = dailyReports.filter((r) => String(r.projectId) === String(selectedProjectId));
  const sortedReports = [...projectReports].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const latestReport = sortedReports[0];

  let laborCount = 184;
  let subcontractorCount = 96;
  let directCount = 62;
  let adminCount = 26;
  let activeMachineryCount = 14;
  let weatherLabel = "آفتابی و معتدل";
  let tempLabel = "۲۴°C";
  let windLabel = "سرعت باد ۸ کیلومتر بر ساعت • شرایط جوی مساعد";
  let unresolvedProblemsCount = 0;

  if (latestReport) {
    const labors = latestReport.labor || [];
    let total = 0;
    let sub = 0;
    let dir = 0;
    let adm = 0;
    
    labors.forEach((l: any) => {
      const count = Number(l.count) || 0;
      total += count;
      const orgLower = String(l.organization || "").toLowerCase();
      const roleLower = String(l.role || "").toLowerCase();

      if (orgLower.includes("direct") || orgLower.includes("امانی")) {
        dir += count;
      } else if (roleLower.includes("سرپرست") || roleLower.includes("مهندس") || roleLower.includes("اداری") || roleLower.includes("head") || roleLower.includes("manager")) {
        adm += count;
      } else {
        sub += count;
      }
    });

    if (total > 0) {
      laborCount = total;
      subcontractorCount = sub || Math.round(total * 0.52);
      directCount = dir || Math.round(total * 0.33);
      adminCount = adm || Math.max(1, total - subcontractorCount - directCount);
    }

    if (latestReport.machinery && Array.isArray(latestReport.machinery)) {
      activeMachineryCount = latestReport.machinery.reduce((sum: number, m: any) => sum + (Number(m.count) || 1), 0);
    }

    const w = String(latestReport.weather || "").trim().toLowerCase();
    if (w.includes("clear") || w.includes("sunny") || w.includes("آفتابی")) {
      weatherLabel = "آفتابی و صاف";
    } else if (w.includes("rain") || w.includes("بارانی")) {
      weatherLabel = "بارانی و لغزنده";
    } else if (w.includes("snow") || w.includes("برفی")) {
      weatherLabel = "برفی و یخبندان";
    } else if (w.includes("cloud") || w.includes("ابری")) {
      weatherLabel = "نیمه ابری";
    } else {
      weatherLabel = latestReport.weather || "آفتابی و معتدل";
    }

    if (latestReport.maxTemp !== undefined) {
      tempLabel = `${latestReport.maxTemp}°C`;
    }
    windLabel = `گزارش ثبت‌شده کارگاه مورخ ${latestReport.date}`;

    const problems = latestReport.problems || [];
    unresolvedProblemsCount = problems.filter((p: any) => !p.resolved).length;
  }

  // Materials Procurement Data
  const projectMrs = mrsList.filter(m => String(m.projectId) === String(selectedProjectId));
  const projectMiv = mivList.filter(m => String(m.projectId) === String(selectedProjectId));
  const pendingMrsCount = projectMrs.filter(m => m.status === 'PENDING' || m.status === 'SUBMITTED').length;

  // Communications & Meetings Data
  const projectMeetings = meetings.filter(m => String(m.projectId) === String(selectedProjectId));
  const projectLetters = letters.filter(l => String(l.projectId) === String(selectedProjectId));
  const pendingLettersCount = projectLetters.filter(l => l.status === 'PENDING' || l.status === 'IN_PROGRESS' || !l.isAnswered).length;

  // Claims Data
  const projectDelayClaims = delayClaims.filter(c => String(c.projectId) === String(selectedProjectId));
  const projectLossClaims = lossClaims.filter(c => String(c.projectId) === String(selectedProjectId));
  const totalRequestedExtensionDays = projectDelayClaims.reduce((sum, c) => sum + (Number(c.requestedDays) || Number(c.days) || 0), 0);

  // S-Curve points with Planned vs Actual vs Financial (Connected to Control & Planning module)
  const sCurveData = useMemo(() => {
    const projActivities = planningActivities.filter(a => String(a.projectId) === String(selectedProjectId));
    
    const rawPoints = EvmEngineService.generateCumulativeSCurveData({
      projectId: selectedProjectId,
      bac: calculatedBudget,
      activities: projActivities
    });

    if (rawPoints && rawPoints.length > 0) {
      return rawPoints.map((p, idx) => ({
        name: p.periodLabel || p.date || `دوره ${idx + 1}`,
        planned: p.plannedPercent,
        actual: p.actualPercent !== undefined && p.actualPercent !== null ? p.actualPercent : null,
        financial: p.actualCostPercent !== undefined && p.actualCostPercent !== null ? p.actualCostPercent : null
      }));
    }

    // Fallback: Statement-based S-Curve
    const projectStatements = isCBS 
      ? cbsStatements.filter(s => String(s.projectId) === String(selectedProjectId))
      : statements.filter(s => String(s.projectId) === String(selectedProjectId));

    if (projectStatements.length >= 2) {
      const sortedStmts = [...projectStatements].sort((a, b) => {
        return parsePersianInt(a.number) - parsePersianInt(b.number);
      });

      return sortedStmts.map((stmt, idx) => {
        const step = idx + 1;
        const totalSteps = sortedStmts.length;
        const planned = Math.min(100, Math.round((step / totalSteps) * 85 + 10));
        const actual = Math.min(100, Math.round((step / totalSteps) * calculatedProgress * 1.05));
        const financial = Math.min(100, Math.round((step / totalSteps) * (calculatedSpent / calculatedBudget) * 100));

        return {
          name: `ص.و ${stmt.number || (idx + 1)}`,
          planned,
          actual: Math.max(actual, 10),
          financial: Math.max(financial, 8)
        };
      });
    }

    return [
      { name: 'فاز ۱ (تجهیز)', planned: 12, actual: 14, financial: 10 },
      { name: 'فاز ۲ (گودبرداری)', planned: 28, actual: 26, financial: 22 },
      { name: 'فاز ۳ (فونداسیون)', planned: 45, actual: 48, financial: 40 },
      { name: 'فاز ۴ (اسکلت فلزی)', planned: 62, actual: 64, financial: 56 },
      { name: 'فاز ۵ (سفت‌کاری)', planned: 78, actual: calculatedProgress || 72, financial: 65 },
      { name: 'فاز ۶ (تأسیسات مکانیکی)', planned: 88, actual: null, financial: null },
      { name: 'فاز ۷ (نازک‌کاری)', planned: 95, actual: null, financial: null },
      { name: 'فاز ۸ (تحویل موقت)', planned: 100, actual: null, financial: null },
    ];
  }, [selectedProjectId, isCBS, cbsStatements, statements, calculatedProgress, calculatedSpent, calculatedBudget, planningActivities, planningReports]);

  // Radar Project Health Dimension Data
  const healthRadarData = useMemo(() => {
    return [
      { subject: 'ایمنی و بهداشت HSE', value: safetyScore, fullMark: 100 },
      { subject: 'کنترل کیفیت QC', value: qcApprovalRate, fullMark: 100 },
      { subject: 'پیشرفت فیزیکی', value: Math.min(100, calculatedProgress), fullMark: 100 },
      { subject: 'انضباط هزینه CPI', value: Math.min(100, Math.round(cpi * 90)), fullMark: 100 },
      { subject: 'تدارکات و زنجیره خرید', value: pendingMrsCount === 0 ? 95 : Math.max(60, 100 - (pendingMrsCount * 8)), fullMark: 100 },
      { subject: 'انضباط اسناد و مکاتبات', value: pendingLettersCount === 0 ? 92 : Math.max(55, 95 - (pendingLettersCount * 6)), fullMark: 100 }
    ];
  }, [safetyScore, qcApprovalRate, calculatedProgress, cpi, pendingMrsCount, pendingLettersCount]);

  // Manpower & Machine Breakdown Data for chart
  const resourceBreakdownData = useMemo(() => {
    return [
      { category: 'پیمانکاران اجرایی', count: subcontractorCount, color: '#3b82f6' },
      { category: 'پرسنل امانی پروژه', count: directCount, color: '#10b981' },
      { category: 'کادر فنی و ستادی', count: adminCount, color: '#8b5cf6' },
      { category: 'ماشین‌آلات سنگین', count: activeMachineryCount, color: '#f59e0b' },
    ];
  }, [subcontractorCount, directCount, adminCount, activeMachineryCount]);

  // Currency Formatter
  const formatCurrency = (val: number) => {
    if (!val) return "۰ ریال";
    if (val >= 1000000000) {
      const billions = val / 1000000000;
      return `${billions.toLocaleString("fa-IR", { maximumFractionDigits: 1 })} میلیارد ریال`;
    }
    if (val >= 1000000) {
      const millions = val / 1000000;
      return `${millions.toLocaleString("fa-IR", { maximumFractionDigits: 1 })} میلیون ریال`;
    }
    return `${val.toLocaleString("fa-IR")} ریال`;
  };

  const handleOpenReportModal = () => {
    setIsReportModalOpen(true);
  };

  const handlePrintDocument = () => {
    setReportGenerating(true);
    setTimeout(() => {
      setReportGenerating(false);
      try {
        window.print();
      } catch (err) {
        console.error("Print error:", err);
      }
    }, 150);
  };

  const handleCopyReportSummary = () => {
    const summaryText = `
گزارش جامع وضعیت و کنترل مدیریتی پروژه
نام پروژه: ${currentProject.title}
شماره پیمان: ${currentProject.contractNumber || '---'}
کارفرما: ${currentProject.employerName || '---'} | مشاور: ${currentProject.consultantName || '---'} | پیمانکار: ${currentProject.contractorName || '---'}
تاریخ استخراج گزارش: ${new Date().toLocaleDateString('fa-IR')}

========================================
۱. شاخص‌های عملکرد کلان (EVM & KPIs)
========================================
• پیشرفت واقعی فیزیکی: ${calculatedProgress.toLocaleString("fa-IR")}٪
• پیشرفت برنامه‌ای: ${plannedProgress.toLocaleString("fa-IR")}٪
• وضعیت انحراف فیزیکی: ${calculatedProgress >= plannedProgress ? "مطابق برنامه زمان‌بندی" : "دارای انحراف تاخیری"}
• مبلغ اولیه پیمان: ${formatCurrency(calculatedBudget)}
• کل کارکرد مالی مصوب: ${formatCurrency(calculatedSpent)} (${budgetUtilizationPercent}٪ جذب اعتبارات)
• شاخص بازدهی زمانی (SPI): ${spi.toFixed(2)} (${spi >= 1 ? 'مطلوب' : 'دارای تاخیر'})
• شاخص بازدهی هزینه (CPI): ${cpi.toFixed(2)} (${cpi >= 1 ? 'بهینه' : 'مازاد بر بودجه'})

========================================
۲. خلاصه وضعیت بخش‌های اجرایی و تخصصی
========================================
• عملیات اجرایی کارگاه: ${laborCount} نفر نیروی فعال (${subcontractorCount} پیمانکار، ${directCount} امانی، ${adminCount} ستادی) | ${activeMachineryCount} دستگاه ماشین‌آلات | ${unresolvedProblemsCount === 0 ? "بدون مانع فعال" : `${unresolvedProblemsCount} مانع فعال کارگاهی`}
• کنترل کیفیت (QC): ${projectQcInspections.length} بازرسی فنی ثبت‌شده | ${openNcrsCount} عدم انطباق فعال | ${projectNcrs.length - openNcrsCount} عدم انطباق رفع‌شده
• ایمنی و بهداشت (HSE): نمره ایمنی ${safetyScore}/۱۰۰ | ${allProjectPermits.length} مجوز کار فعال PTW | حوادث کارگاهی: ${projectIncidents.length === 0 ? "صفر (ایمن)" : `${projectIncidents.length} حادثه`}
• تدارکات و مصالح: ${projectMrs.length} تقاضای خرید کالا MRS (${pendingMrsCount} در جریان) | ${projectMiv.length} رسید ورود انبار MIV
• مکاتبات و جلسات: ${projectLetters.length} نامه وارده/صادره (${pendingLettersCount} نیازمند پاسخ) | ${projectMeetings.length} صورت‌جلسه مصوب
• تاخیرات و ادعاها: ${projectDelayClaims.length} پرونده تاخیرات (${totalRequestedExtensionDays} روز درخواست تمدید)

تهیه شده توسط سامانه جامع مدیریت و کنترل پروژه همیار
    `.trim();

    navigator.clipboard.writeText(summaryText).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2500);
    }).catch(() => {});
  };

  const budgetUtilizationPercent = Math.min(100, Math.round((calculatedSpent / calculatedBudget) * 100));

  return (
    <div className="space-y-8 animate-fadeIn pb-16 text-right font-['Vazirmatn']" dir="rtl">
      
      {/* 1. Executive Command Center Header */}
      <div className="bg-white dark:bg-slate-900 text-stone-900 dark:text-white p-6 md:p-8 rounded-[2rem] border border-stone-200/90 dark:border-slate-800 shadow-sm relative overflow-hidden">
        {/* Subtle decorative background accent */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-400/5 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-emerald-400/5 rounded-full blur-2xl pointer-events-none translate-y-1/3 -translate-x-1/3"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          
          {/* Project Title & Selector */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2.5 text-xs text-amber-700 dark:text-amber-400 font-bold">
              <span className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 px-3 py-1 rounded-xl border border-amber-200 dark:border-amber-800/60">
                <Sparkles size={14} className="text-amber-600 dark:text-amber-400 animate-pulse" />
                داشبورد جامع مدیریت و کنترل پروژه
              </span>
              <span className="text-stone-300 dark:text-slate-600">·</span>
              <span className="text-stone-500 dark:text-slate-400">نسخه فرماندهی اجرایی (Executive Command)</span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <h1 className="text-2xl md:text-3xl font-black text-stone-900 dark:text-white tracking-tight">
                {currentProject.title}
              </h1>

              {/* Project Switcher Select */}
              <div className="flex items-center gap-2 bg-stone-50 dark:bg-slate-800 hover:bg-stone-100 dark:hover:bg-slate-700 border border-stone-200/90 dark:border-slate-700 rounded-2xl px-3 py-1.5 shadow-sm transition-colors">
                <Building2 size={16} className="text-amber-600 dark:text-amber-400 flex-shrink-0" />
                <select
                  value={selectedProjectId}
                  onChange={(e) => handleProjectChange(e.target.value)}
                  className="bg-transparent text-xs font-black text-stone-800 dark:text-white outline-none cursor-pointer pr-1 pl-4"
                >
                  {accessibleProjects.length === 0 ? (
                    <option value="" className="bg-white dark:bg-slate-800 text-stone-900 dark:text-white">پروژه‌ای یافت نشد</option>
                  ) : (
                    accessibleProjects.map((p) => (
                      <option key={p.id} value={p.id} className="bg-white dark:bg-slate-800 text-stone-900 dark:text-white font-bold">
                        {p.title} ({p.contractNumber || 'پروژه'})
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-stone-600 dark:text-slate-300 font-medium pt-1">
              <span className="flex items-center gap-1.5 text-stone-700 dark:text-slate-300">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                پیمانکار: <strong className="text-stone-900 dark:text-white font-black">{currentProject.contractorName || 'تعیین نشده'}</strong>
              </span>
              <span className="text-stone-300 dark:text-slate-700">|</span>
              <span>مشاور: <strong className="text-stone-900 dark:text-white font-black">{currentProject.consultantName || 'تعیین نشده'}</strong></span>
              <span className="text-stone-300 dark:text-slate-700">|</span>
              <span>کارفرما: <strong className="text-stone-900 dark:text-white font-black">{currentProject.employerName || 'تعیین نشده'}</strong></span>
            </div>
          </div>

          {/* Quick Action Commands & Print / Export */}
          <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center">
            <button
              onClick={handleOpenReportModal}
              disabled={reportGenerating}
              className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black rounded-xl text-xs transition-all shadow-md shadow-amber-500/15 active:scale-95 cursor-pointer"
            >
              <Printer size={16} />
              <span>چاپ گزارش مدیریتی</span>
            </button>
          </div>
        </div>

        {/* Contract Key Metrics Ribbon */}
        <div className="mt-6 pt-5 border-t border-stone-200/80 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-xs">
          <div className="bg-stone-50/90 dark:bg-slate-800/90 p-3 rounded-xl border border-stone-200/80 dark:border-slate-700/80">
            <span className="text-stone-500 dark:text-slate-400 block text-[11px] mb-0.5 font-bold">شماره پیمان</span>
            <span className="font-mono font-black text-stone-900 dark:text-white text-sm">{currentProject.contractNumber || '---'}</span>
          </div>

          <div className="bg-stone-50/90 dark:bg-slate-800/90 p-3 rounded-xl border border-stone-200/80 dark:border-slate-700/80">
            <span className="text-stone-500 dark:text-slate-400 block text-[11px] mb-0.5 font-bold">ساختار قرارداد</span>
            <span className="font-black text-amber-700 dark:text-amber-400 text-xs">
              {isCBS ? "ساختار شکست کار (CBS)" : "فهرست بهایی (Standard)"}
            </span>
          </div>

          <div className="bg-stone-50/90 dark:bg-slate-800/90 p-3 rounded-xl border border-stone-200/80 dark:border-slate-700/80">
            <span className="text-stone-500 dark:text-slate-400 block text-[11px] mb-0.5 font-bold">تاریخ شروع و تحویل زمین</span>
            <span className="font-black text-stone-800 dark:text-slate-200 text-xs">{currentProject.startDate || '1402/05/01'}</span>
          </div>

          <div className="bg-stone-50/90 dark:bg-slate-800/90 p-3 rounded-xl border border-stone-200/80 dark:border-slate-700/80">
            <span className="text-stone-500 dark:text-slate-400 block text-[11px] mb-0.5 font-bold">مبلغ اولیه پیمان</span>
            <span className="font-black text-emerald-700 dark:text-emerald-400 text-xs">{formatCurrency(calculatedBudget)}</span>
          </div>

          <div className="bg-stone-50/90 dark:bg-slate-800/90 p-3 rounded-xl border border-stone-200/80 dark:border-slate-700/80">
            <span className="text-stone-500 dark:text-slate-400 block text-[11px] mb-0.5 font-bold">شاخص عملکرد زمانی (SPI)</span>
            <span className={`font-mono font-black text-xs flex items-center gap-1 ${spi >= 1 ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`}>
              {spi.toFixed(2)} {spi >= 1 ? '▲ نرمال' : '▼ تاخیر'}
            </span>
          </div>

          <div className="bg-stone-50/90 dark:bg-slate-800/90 p-3 rounded-xl border border-stone-200/80 dark:border-slate-700/80">
            <span className="text-stone-500 dark:text-slate-400 block text-[11px] mb-0.5 font-bold">شاخص عملکرد هزینه (CPI)</span>
            <span className={`font-mono font-black text-xs flex items-center gap-1 ${cpi >= 1 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
              {cpi.toFixed(2)} {cpi >= 1 ? '▲ بهینه' : '▼ مازاد'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Top Executive Bento Grid (Clickable Cards with Action & Drilldown) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        
        {/* Metric 1: Physical Progress */}
        <div 
          onClick={() => setActiveDrilldown('PROGRESS')}
          className="bg-white dark:bg-stone-900 rounded-[1.5rem] p-5 border border-stone-200/80 dark:border-stone-800 shadow-sm hover:shadow-md transition-all cursor-pointer group hover:border-emerald-500/50 flex flex-col justify-between relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-black text-stone-500 dark:text-stone-400">پیشرفت فیزیکی</span>
            <span className="p-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
              <TrendingUp size={16} />
            </span>
          </div>

          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-stone-900 dark:text-stone-100 tracking-tight font-mono">
                {calculatedProgress.toLocaleString("fa-IR")}٪
              </span>
              <span className="text-[10px] font-bold text-stone-400">برنامه‌ای: {plannedProgress}٪</span>
            </div>

            <div className="w-full bg-stone-100 dark:bg-stone-800 h-2 rounded-full mt-3 overflow-hidden">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-1000"
                style={{ width: `${calculatedProgress}%` }}
              ></div>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-stone-100 dark:border-stone-800/80 flex items-center justify-between text-[10px] font-bold">
            <span className={calculatedProgress >= plannedProgress ? "text-emerald-600" : "text-amber-600"}>
              {calculatedProgress >= plannedProgress ? "مطابق برنامه زمان‌بندی" : "انحراف جزئی از برنامه"}
            </span>
            <ChevronLeft size={14} className="text-stone-400 group-hover:-translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Metric 2: Financial Utilization & Spent */}
        <div 
          onClick={() => setActiveDrilldown('FINANCIAL')}
          className="bg-white dark:bg-stone-900 rounded-[1.5rem] p-5 border border-stone-200/80 dark:border-stone-800 shadow-sm hover:shadow-md transition-all cursor-pointer group hover:border-amber-500/50 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-black text-stone-500 dark:text-stone-400">جذب مالی و کارکرد</span>
            <span className="p-2 bg-amber-50 dark:bg-amber-950/40 rounded-xl text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
              <Wallet size={16} />
            </span>
          </div>

          <div>
            <div className="text-lg font-black text-stone-900 dark:text-stone-100 leading-tight">
              {formatCurrency(calculatedSpent)}
            </div>
            <div className="text-[10px] font-bold text-stone-400 dark:text-stone-500 mt-1">
              جذب {budgetUtilizationPercent.toLocaleString("fa-IR")}٪ از کل بودجه
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-stone-100 dark:border-stone-800/80 flex items-center justify-between text-[10px] font-bold">
            <span className="text-amber-600">صورت‌وضعیت‌های تایید شده</span>
            <ChevronLeft size={14} className="text-stone-400 group-hover:-translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Metric 3: Quality Control & Lab */}
        <div 
          onClick={() => setActiveDrilldown('QC')}
          className="bg-white dark:bg-stone-900 rounded-[1.5rem] p-5 border border-stone-200/80 dark:border-stone-800 shadow-sm hover:shadow-md transition-all cursor-pointer group hover:border-blue-500/50 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-black text-stone-500 dark:text-stone-400">کنترل کیفیت و RFI</span>
            <span className="p-2 bg-blue-50 dark:bg-blue-950/40 rounded-xl text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
              <ClipboardCheck size={16} />
            </span>
          </div>

          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-stone-900 dark:text-stone-100 tracking-tight font-mono">
                {qcApprovalRate}٪
              </span>
              <span className="text-[10px] font-bold text-stone-400">تایید RFI</span>
            </div>
            <div className="text-[10px] font-bold mt-1 text-stone-500 flex items-center gap-1.5">
              <span>{projectQcInspections.length} درخواست بازرسی</span>
              <span>·</span>
              <span className={openNcrsCount > 0 ? "text-red-500 font-black" : "text-emerald-500"}>
                {openNcrsCount} NCR باز
              </span>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-stone-100 dark:border-stone-800/80 flex items-center justify-between text-[10px] font-bold">
            <span className={openNcrsCount > 0 ? "text-red-500" : "text-blue-600"}>
              {openNcrsCount > 0 ? "نیازمند رسیدگی به NCR" : "کیفیت اجرایی تایید شده"}
            </span>
            <ChevronLeft size={14} className="text-stone-400 group-hover:-translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Metric 4: Safety & HSE */}
        <div 
          onClick={() => setActiveDrilldown('HSE')}
          className="bg-white dark:bg-stone-900 rounded-[1.5rem] p-5 border border-stone-200/80 dark:border-stone-800 shadow-sm hover:shadow-md transition-all cursor-pointer group hover:border-red-500/50 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-black text-stone-500 dark:text-stone-400">شاخص ایمنی HSE</span>
            <span className="p-2 bg-red-50 dark:bg-red-950/40 rounded-xl text-red-600 dark:text-red-400 group-hover:scale-110 transition-transform">
              <Shield size={16} />
            </span>
          </div>

          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-stone-900 dark:text-stone-100 tracking-tight font-mono">
                {safetyScore}
              </span>
              <span className="text-[10px] font-bold text-stone-400">از ۱۰۰</span>
            </div>
            <div className="text-[10px] font-bold mt-1 text-stone-500">
              {allProjectPermits.length} مجوز کار صادرشده
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-stone-100 dark:border-stone-800/80 flex items-center justify-between text-[10px] font-bold">
            <span className="text-emerald-600">بدون حادثه بحرانی</span>
            <ChevronLeft size={14} className="text-stone-400 group-hover:-translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Metric 5: Active Workforce & Site */}
        <div 
          onClick={() => setActiveDrilldown('EXECUTION')}
          className="bg-white dark:bg-stone-900 rounded-[1.5rem] p-5 border border-stone-200/80 dark:border-stone-800 shadow-sm hover:shadow-md transition-all cursor-pointer group hover:border-indigo-500/50 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-black text-stone-500 dark:text-stone-400">نیروی کار حاضر</span>
            <span className="p-2 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
              <Users size={16} />
            </span>
          </div>

          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-stone-900 dark:text-stone-100 tracking-tight font-mono">
                {laborCount}
              </span>
              <span className="text-[10px] font-bold text-stone-400">نفر فعال</span>
            </div>
            <div className="text-[10px] font-bold mt-1 text-stone-500">
              {activeMachineryCount} دستگاه ماشین‌آلات
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-stone-100 dark:border-stone-800/80 flex items-center justify-between text-[10px] font-bold">
            <span className="text-indigo-600">{weatherLabel}</span>
            <ChevronLeft size={14} className="text-stone-400 group-hover:-translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Metric 6: Logistics & Materials */}
        <div 
          onClick={() => setActiveDrilldown('MATERIALS')}
          className="bg-white dark:bg-stone-900 rounded-[1.5rem] p-5 border border-stone-200/80 dark:border-stone-800 shadow-sm hover:shadow-md transition-all cursor-pointer group hover:border-violet-500/50 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-black text-stone-500 dark:text-stone-400">تدارکات و انبار</span>
            <span className="p-2 bg-violet-50 dark:bg-violet-950/40 rounded-xl text-violet-600 dark:text-violet-400 group-hover:scale-110 transition-transform">
              <Layers size={16} />
            </span>
          </div>

          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-stone-900 dark:text-stone-100 tracking-tight font-mono">
                {projectMrs.length}
              </span>
              <span className="text-[10px] font-bold text-stone-400">تقاضای MRS</span>
            </div>
            <div className="text-[10px] font-bold mt-1 text-stone-500">
              {projectMiv.length} رسید ورود MIV
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-stone-100 dark:border-stone-800/80 flex items-center justify-between text-[10px] font-bold">
            <span className={pendingMrsCount > 0 ? "text-amber-600" : "text-emerald-600"}>
              {pendingMrsCount > 0 ? `${pendingMrsCount} تقاضا در گردش` : "تدارکات به روز"}
            </span>
            <ChevronLeft size={14} className="text-stone-400 group-hover:-translate-x-1 transition-transform" />
          </div>
        </div>

      </div>

      {/* 3. Central Interactive Chart & Project Health Analytics Deck */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Analytics Deck (Col Span 2) */}
        <div className="lg:col-span-2 bg-white dark:bg-stone-900 rounded-[2rem] p-6 md:p-8 border border-stone-200/80 dark:border-stone-800 shadow-sm flex flex-col justify-between">
          
          {/* Chart Header & Mode Selector Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="font-black text-lg text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <BarChart2 size={20} className="text-amber-500" />
                <span>
                  {chartViewMode === 'SCURVE' && "منحنی S پیشرفت پروژه و جذب مالی (S-Curve)"}
                  {chartViewMode === 'HEALTH_RADAR' && "رادار سلامت و عملکرد ۶ بعدی پروژه"}
                  {chartViewMode === 'MANPOWER_BAR' && "توزیع نیروها و ناوگان ماشین‌آلات در کارگاه"}
                </span>
              </h3>
              <p className="text-xs text-stone-400 dark:text-stone-500 font-bold mt-1">
                {chartViewMode === 'SCURVE' && "مقایسه هم‌زمان پیشرفت فیزیکی برنامه‌ای، واقعی کارگاهی و جذب مالی"}
                {chartViewMode === 'HEALTH_RADAR' && "پایش کیفی، ایمنی، هزینه‌ای، زمانی، تدارکاتی و اسنادی در یک نگاه"}
                {chartViewMode === 'MANPOWER_BAR' && "آمار نفرات و تجهیزات فعال حاضر در شیفت کاری امروز"}
              </p>
            </div>

            {/* Switchable Visual Views */}
            <div className="flex items-center gap-1 p-1 bg-stone-100 dark:bg-stone-800/80 rounded-xl border border-stone-200 dark:border-stone-700 self-start sm:self-center">
              <button
                onClick={() => setChartViewMode('SCURVE')}
                className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all ${
                  chartViewMode === 'SCURVE' 
                    ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-sm' 
                    : 'text-stone-500 hover:text-stone-900 dark:hover:text-stone-200'
                }`}
              >
                منحنی S
              </button>
              <button
                onClick={() => setChartViewMode('HEALTH_RADAR')}
                className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all ${
                  chartViewMode === 'HEALTH_RADAR' 
                    ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-sm' 
                    : 'text-stone-500 hover:text-stone-900 dark:hover:text-stone-200'
                }`}
              >
                رادار سلامت
              </button>
              <button
                onClick={() => setChartViewMode('MANPOWER_BAR')}
                className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all ${
                  chartViewMode === 'MANPOWER_BAR' 
                    ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-sm' 
                    : 'text-stone-500 hover:text-stone-900 dark:hover:text-stone-200'
                }`}
              >
                توزیع منابع
              </button>
            </div>
          </div>

          {/* Chart Canvas */}
          <div className="h-80 w-full dir-ltr">
            {chartViewMode === 'SCURVE' && (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sCurveData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                    </linearGradient>
                    <linearGradient id="colorFinancial" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0}/>
                    </linearGradient>
                    <linearGradient id="colorPlanned" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#64748b" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#64748b" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-stone-800" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} fontWeight="bold" tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} fontWeight="bold" tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#0f172a', 
                      borderRadius: '1rem', 
                      color: '#fff', 
                      border: 'none', 
                      fontSize: '11px', 
                      fontWeight: 'bold',
                      textAlign: 'right',
                      direction: 'rtl'
                    }}
                    formatter={(value: any, name: any) => [
                      `${value}%`, 
                      name === 'actual' ? 'پیشرفت واقعی فیزیکی' : name === 'financial' ? 'جذب مالی و صورت‌وضعیت' : 'پیشرفت برنامه‌ای'
                    ]}
                  />
                  <Area type="monotone" name="actual" dataKey="actual" stroke="#10b981" strokeWidth={3.5} fillOpacity={1} fill="url(#colorActual)" connectNulls={true} />
                  <Area type="monotone" name="financial" dataKey="financial" stroke="#f59e0b" strokeWidth={2.5} fillOpacity={1} fill="url(#colorFinancial)" connectNulls={true} />
                  <Area type="monotone" name="planned" dataKey="planned" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" fillOpacity={1} fill="url(#colorPlanned)" connectNulls={true} />
                </AreaChart>
              </ResponsiveContainer>
            )}

            {chartViewMode === 'HEALTH_RADAR' && (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={healthRadarData}>
                  <PolarGrid stroke="#e2e8f0" className="dark:stroke-stone-800" />
                  <PolarAngleAxis dataKey="subject" stroke="#64748b" fontSize={11} fontWeight="bold" />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#94a3b8" fontSize={9} />
                  <Radar name="سلامت پروژه" dataKey="value" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.4} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#0f172a', 
                      borderRadius: '1rem', 
                      color: '#fff', 
                      border: 'none', 
                      fontSize: '11px', 
                      fontWeight: 'bold',
                      textAlign: 'right',
                      direction: 'rtl'
                    }}
                    formatter={(value: any) => [`${value} از ۱۰۰`, 'امتیاز شاخص']}
                  />
                </RadarChart>
              </ResponsiveContainer>
            )}

            {chartViewMode === 'MANPOWER_BAR' && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={resourceBreakdownData} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-stone-800" />
                  <XAxis dataKey="category" stroke="#94a3b8" fontSize={11} fontWeight="bold" tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} fontWeight="bold" tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#0f172a', 
                      borderRadius: '1rem', 
                      color: '#fff', 
                      border: 'none', 
                      fontSize: '11px', 
                      fontWeight: 'bold',
                      textAlign: 'right',
                      direction: 'rtl'
                    }}
                    formatter={(value: any) => [`${value} نفر / دستگاه`, 'تعداد']}
                  />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                    {resourceBreakdownData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Chart Legends & Status */}
          <div className="mt-4 pt-4 border-t border-stone-100 dark:border-stone-800 flex flex-wrap items-center justify-between gap-4 text-xs font-bold text-stone-600 dark:text-stone-300">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                <span>پیشرفت واقعی کارگاه</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                <span>پیشرفت مالی / صورت‌وضعیت</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-slate-400"></span>
                <span>پیشرفت برنامه‌ای (Baseline)</span>
              </span>
            </div>

            <button
              onClick={() => setActiveDrilldown('PROGRESS')}
              className="text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 font-black text-xs"
            >
              <span>مشاهده جزئیات کنترل پروژه</span>
              <ChevronLeft size={14} />
            </button>
          </div>
        </div>

        {/* Right Side Site Telemetry & Active Status Cards */}
        <div className="space-y-4">
          
          {/* Site Environment & Weather Card */}
          <div className="bg-white dark:bg-stone-900 rounded-[2rem] p-6 border border-stone-200/80 dark:border-stone-800 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[11px] font-black text-stone-400 dark:text-stone-500 block mb-1">اقلیم و شرایط کارگاه</span>
              <div className="text-3xl font-black text-stone-900 dark:text-stone-100 flex items-center gap-2 font-mono">
                <span>{tempLabel}</span>
              </div>
              <p className="text-xs font-bold text-stone-600 dark:text-stone-300 mt-1.5 flex items-center gap-1.5">
                <Wind size={13} className="text-stone-400 flex-shrink-0" />
                <span>{weatherLabel}</span>
              </p>
              <span className="text-[10px] text-stone-400 block mt-0.5">{windLabel}</span>
            </div>

            <div className="p-4 bg-amber-500/10 text-amber-500 rounded-2xl flex-shrink-0">
              <CloudSun size={36} />
            </div>
          </div>

          {/* Quick Module Access & Active Alerts */}
          <div className="bg-white dark:bg-stone-900 rounded-[2rem] p-6 border border-stone-200/80 dark:border-stone-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-black text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                <Activity size={16} className="text-amber-500" />
                <span>اقدامات فوری و نیازمند توجه</span>
              </h4>
              <span className="px-2 py-0.5 bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[10px] font-black rounded-lg">
                {(openNcrsCount + pendingMrsCount + pendingLettersCount + unresolvedProblemsCount)} مورد
              </span>
            </div>

            {/* Alert Item 1: Open NCRs */}
            <div 
              onClick={() => setActiveDrilldown('QC')}
              className="p-3 bg-red-50/70 dark:bg-red-950/20 rounded-xl border border-red-200/60 dark:border-red-900/40 flex items-center justify-between cursor-pointer hover:bg-red-100/60 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <AlertTriangle size={16} className="text-red-600 flex-shrink-0" />
                <div>
                  <span className="text-xs font-black text-red-900 dark:text-red-200 block">عدم انطباق‌های کیفی (NCR)</span>
                  <span className="text-[10px] font-medium text-red-700 dark:text-red-400">{openNcrsCount} مورد در انتظار رفع نقص یا پاسخ</span>
                </div>
              </div>
              <ChevronLeft size={15} className="text-red-500" />
            </div>

            {/* Alert Item 2: Pending MRS */}
            <div 
              onClick={() => setActiveDrilldown('MATERIALS')}
              className="p-3 bg-amber-50/70 dark:bg-amber-950/20 rounded-xl border border-amber-200/60 dark:border-amber-900/40 flex items-center justify-between cursor-pointer hover:bg-amber-100/60 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Layers size={16} className="text-amber-600 flex-shrink-0" />
                <div>
                  <span className="text-xs font-black text-amber-900 dark:text-amber-200 block">تقاضای خرید مصالح (MRS)</span>
                  <span className="text-[10px] font-medium text-amber-700 dark:text-amber-400">{pendingMrsCount} مورد در صف بررسی و استعلام</span>
                </div>
              </div>
              <ChevronLeft size={15} className="text-amber-500" />
            </div>

            {/* Alert Item 3: Secretariat Letters */}
            <div 
              onClick={() => setActiveDrilldown('COMMUNICATIONS')}
              className="p-3 bg-blue-50/70 dark:bg-blue-950/20 rounded-xl border border-blue-200/60 dark:border-blue-900/40 flex items-center justify-between cursor-pointer hover:bg-blue-100/60 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <FileText size={16} className="text-blue-600 flex-shrink-0" />
                <div>
                  <span className="text-xs font-black text-blue-900 dark:text-blue-200 block">مکاتبات بدون پاسخ</span>
                  <span className="text-[10px] font-medium text-blue-700 dark:text-blue-400">{pendingLettersCount} نامه نیازمند اقدام در دبیرخانه</span>
                </div>
              </div>
              <ChevronLeft size={15} className="text-blue-500" />
            </div>
          </div>

        </div>
      </div>

      {/* 4. Multi-Discipline Subsystem Modules Detailed Matrix */}
      <div className="bg-white dark:bg-stone-900 rounded-[2rem] p-6 md:p-8 border border-stone-200/80 dark:border-stone-800 shadow-sm space-y-6">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 dark:border-stone-800 pb-5">
          <div>
            <h3 className="font-black text-xl text-stone-900 dark:text-stone-100">
              ماتریس داده‌ها و بخش‌های تخصصی پروژه
            </h3>
            <p className="text-xs text-stone-400 dark:text-stone-500 font-bold mt-1">
              دسترسی سریع به جزئیات ثبت‌شده در ماژول‌های فنی، کیفی، ایمنی، مالی و اداری
            </p>
          </div>

          {/* Quick Section Filter */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'ALL', label: 'همه بخش‌ها' },
              { id: 'TECHNICAL', label: 'دفتر فنی و مالی' },
              { id: 'QUALITY', label: 'کنترل کیفیت' },
              { id: 'HSE', label: 'ایمنی و HSE' },
              { id: 'EXECUTION', label: 'اجرا و کارگاه' },
              { id: 'COMMUNICATIONS', label: 'مکاتبات و ادعاها' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveQuickTab(tab.id as any)}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                  activeQuickTab === tab.id
                    ? 'bg-amber-500 text-stone-950 font-black shadow-sm'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Subsystem Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Card 1: Technical Office */}
          {(activeQuickTab === 'ALL' || activeQuickTab === 'TECHNICAL') && (
            <div className="bg-stone-50 dark:bg-stone-800/50 rounded-2xl p-5 border border-stone-200/70 dark:border-stone-700/60 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
                      <FileSignature size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-stone-900 dark:text-stone-100">دفتر فنی و صورت‌وضعیت‌ها</h4>
                      <span className="text-[10px] text-stone-400 font-bold">برآورد، ریزمتره و صورت‌جلسات</span>
                    </div>
                  </div>
                  <span className="text-xs font-black text-amber-600">
                    {statements.filter(s => String(s.projectId) === String(selectedProjectId)).length + cbsStatements.filter(s => String(s.projectId) === String(selectedProjectId)).length} ص.وضعیت
                  </span>
                </div>

                <div className="space-y-2 text-xs font-bold text-stone-600 dark:text-stone-300">
                  <div className="flex justify-between py-1 border-b border-stone-200/50 dark:border-stone-700/40">
                    <span>آیتم‌های برآورد اولیه:</span>
                    <span className="font-mono text-stone-900 dark:text-stone-100">
                      {estimates.filter(e => String(e.projectId) === String(selectedProjectId)).length} ردیف
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-stone-200/50 dark:border-stone-700/40">
                    <span>صورت‌جلسات کارکرد:</span>
                    <span className="font-mono text-stone-900 dark:text-stone-100">
                      {minutes.filter(m => String(m.projectId) === String(selectedProjectId)).length} صورت‌جلسه
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span>تغییر مقادیر ۲۵٪ (Variations):</span>
                    <span className="font-mono text-stone-900 dark:text-stone-100">
                      {variations.filter(v => String(v.projectId) === String(selectedProjectId)).length} ابلاغیه
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => navigateToModule('technical-office')}
                  className="flex-1 py-2 px-3 bg-amber-500/15 hover:bg-amber-500/25 text-amber-800 dark:text-amber-300 text-xs font-black rounded-xl transition-colors text-center"
                >
                  ورود به دفتر فنی
                </button>
                <button
                  onClick={() => setActiveDrilldown('FINANCIAL')}
                  className="p-2 bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 rounded-xl text-stone-700 dark:text-stone-200"
                  title="مشاهده ریز اطلاعات"
                >
                  <Eye size={15} />
                </button>
              </div>
            </div>
          )}

          {/* Card 2: Quality Control */}
          {(activeQuickTab === 'ALL' || activeQuickTab === 'QUALITY') && (
            <div className="bg-stone-50 dark:bg-stone-800/50 rounded-2xl p-5 border border-stone-200/70 dark:border-stone-700/60 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl">
                      <ClipboardCheck size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-stone-900 dark:text-stone-100">کنترل کیفیت و آزمایشگاه</h4>
                      <span className="text-[10px] text-stone-400 font-bold">RFI، آزمایش‌های مقاومت و NCR</span>
                    </div>
                  </div>
                  <span className="text-xs font-black text-blue-600">{qcApprovalRate}٪ قبولی</span>
                </div>

                <div className="space-y-2 text-xs font-bold text-stone-600 dark:text-stone-300">
                  <div className="flex justify-between py-1 border-b border-stone-200/50 dark:border-stone-700/40">
                    <span>درخواست‌های بازرسی RFI:</span>
                    <span className="font-mono text-stone-900 dark:text-stone-100">{projectQcInspections.length} مورد</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-stone-200/50 dark:border-stone-700/40">
                    <span>آزمایش‌های بتن و خاک:</span>
                    <span className="font-mono text-stone-900 dark:text-stone-100">{projectLabTests.length} نتیجه ثبت‌شده</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span>گزارش عدم انطباق (NCR):</span>
                    <span className={`font-mono ${openNcrsCount > 0 ? "text-red-500 font-black" : "text-stone-900 dark:text-stone-100"}`}>
                      {projectNcrs.length} کل ({openNcrsCount} باز)
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => navigateToModule('quality-control')}
                  className="flex-1 py-2 px-3 bg-blue-500/15 hover:bg-blue-500/25 text-blue-800 dark:text-blue-300 text-xs font-black rounded-xl transition-colors text-center"
                >
                  ورود به کنترل کیفیت
                </button>
                <button
                  onClick={() => setActiveDrilldown('QC')}
                  className="p-2 bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 rounded-xl text-stone-700 dark:text-stone-200"
                  title="مشاهده ریز اطلاعات"
                >
                  <Eye size={15} />
                </button>
              </div>
            </div>
          )}

          {/* Card 3: HSE */}
          {(activeQuickTab === 'ALL' || activeQuickTab === 'HSE') && (
            <div className="bg-stone-50 dark:bg-stone-800/50 rounded-2xl p-5 border border-stone-200/70 dark:border-stone-700/60 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-red-500/10 text-red-600 dark:text-red-400 rounded-xl">
                      <Shield size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-stone-900 dark:text-stone-100">ایمنی، بهداشت و محیط زیست</h4>
                      <span className="text-[10px] text-stone-400 font-bold">مجوزهای کار PTW و گزارش حوادث</span>
                    </div>
                  </div>
                  <span className="text-xs font-black text-red-600">نمره {safetyScore}/۱۰۰</span>
                </div>

                <div className="space-y-2 text-xs font-bold text-stone-600 dark:text-stone-300">
                  <div className="flex justify-between py-1 border-b border-stone-200/50 dark:border-stone-700/40">
                    <span>مجوزهای کار گرم و ارتفاع:</span>
                    <span className="font-mono text-stone-900 dark:text-stone-100">{allProjectPermits.length} مجوز</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-stone-200/50 dark:border-stone-700/40">
                    <span>حوادث و شبه‌حوادث:</span>
                    <span className="font-mono text-emerald-600 font-black">
                      {projectIncidents.length === 0 ? "صفر (ایمن)" : `${projectIncidents.length} مورد`}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span>انطباق چک‌لیست‌های زیست‌محیطی:</span>
                    <span className="font-mono text-stone-900 dark:text-stone-100">تایید شده</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => navigateToModule('hse')}
                  className="flex-1 py-2 px-3 bg-red-500/15 hover:bg-red-500/25 text-red-800 dark:text-red-300 text-xs font-black rounded-xl transition-colors text-center"
                >
                  ورود به ماژول HSE
                </button>
                <button
                  onClick={() => setActiveDrilldown('HSE')}
                  className="p-2 bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 rounded-xl text-stone-700 dark:text-stone-200"
                  title="مشاهده ریز اطلاعات"
                >
                  <Eye size={15} />
                </button>
              </div>
            </div>
          )}

          {/* Card 4: Execution & Daily Reports */}
          {(activeQuickTab === 'ALL' || activeQuickTab === 'EXECUTION') && (
            <div className="bg-stone-50 dark:bg-stone-800/50 rounded-2xl p-5 border border-stone-200/70 dark:border-stone-700/60 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl">
                      <HardHat size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-stone-900 dark:text-stone-100">عملیات اجرایی و کارگاه</h4>
                      <span className="text-[10px] text-stone-400 font-bold">گزارش روزانه، ماشین‌آلات و موانع</span>
                    </div>
                  </div>
                  <span className="text-xs font-black text-indigo-600">{projectReports.length} گزارش</span>
                </div>

                <div className="space-y-2 text-xs font-bold text-stone-600 dark:text-stone-300">
                  <div className="flex justify-between py-1 border-b border-stone-200/50 dark:border-stone-700/40">
                    <span>آخرین گزارش کارگاه:</span>
                    <span className="font-mono text-stone-900 dark:text-stone-100">{latestReport?.date || 'امروز'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-stone-200/50 dark:border-stone-700/40">
                    <span>نیروهای انسانی حاضر:</span>
                    <span className="font-mono text-stone-900 dark:text-stone-100">{laborCount} نفر</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span>موانع اجرایی نیازمند حل:</span>
                    <span className={`font-mono ${unresolvedProblemsCount > 0 ? "text-amber-600 font-black" : "text-emerald-600 font-black"}`}>
                      {unresolvedProblemsCount === 0 ? "بدون مانع بحرانی" : `${unresolvedProblemsCount} مانع فعال`}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => navigateToModule('execution')}
                  className="flex-1 py-2 px-3 bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-800 dark:text-indigo-300 text-xs font-black rounded-xl transition-colors text-center"
                >
                  ورود به بخش اجرا
                </button>
                <button
                  onClick={() => setActiveDrilldown('EXECUTION')}
                  className="p-2 bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 rounded-xl text-stone-700 dark:text-stone-200"
                  title="مشاهده ریز اطلاعات"
                >
                  <Eye size={15} />
                </button>
              </div>
            </div>
          )}

          {/* Card 5: Materials & Logistics */}
          {(activeQuickTab === 'ALL' || activeQuickTab === 'TECHNICAL') && (
            <div className="bg-stone-50 dark:bg-stone-800/50 rounded-2xl p-5 border border-stone-200/70 dark:border-stone-700/60 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-violet-500/10 text-violet-600 dark:text-violet-400 rounded-xl">
                      <Layers size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-stone-900 dark:text-stone-100">تدارکات و زنجیره مصالح</h4>
                      <span className="text-[10px] text-stone-400 font-bold">تقاضای خرید MRS و انبار MIV</span>
                    </div>
                  </div>
                  <span className="text-xs font-black text-violet-600">{projectMiv.length} ورود به انبار</span>
                </div>

                <div className="space-y-2 text-xs font-bold text-stone-600 dark:text-stone-300">
                  <div className="flex justify-between py-1 border-b border-stone-200/50 dark:border-stone-700/40">
                    <span>درخواست‌های خرید MRS:</span>
                    <span className="font-mono text-stone-900 dark:text-stone-100">{projectMrs.length} تقاضا</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-stone-200/50 dark:border-stone-700/40">
                    <span>تقاضاهای در انتظار اقدام:</span>
                    <span className={`font-mono ${pendingMrsCount > 0 ? "text-amber-600 font-black" : "text-stone-900 dark:text-stone-100"}`}>
                      {pendingMrsCount} تقاضا
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span>رسیدهای انبارداری MIV:</span>
                    <span className="font-mono text-stone-900 dark:text-stone-100">{projectMiv.length} رسید</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => navigateToModule('materials')}
                  className="flex-1 py-2 px-3 bg-violet-500/15 hover:bg-violet-500/25 text-violet-800 dark:text-violet-300 text-xs font-black rounded-xl transition-colors text-center"
                >
                  ورود به تدارکات مصالح
                </button>
                <button
                  onClick={() => setActiveDrilldown('MATERIALS')}
                  className="p-2 bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 rounded-xl text-stone-700 dark:text-stone-200"
                  title="مشاهده ریز اطلاعات"
                >
                  <Eye size={15} />
                </button>
              </div>
            </div>
          )}

          {/* Card 6: Communications, Secretariat & Claims */}
          {(activeQuickTab === 'ALL' || activeQuickTab === 'COMMUNICATIONS') && (
            <div className="bg-stone-50 dark:bg-stone-800/50 rounded-2xl p-5 border border-stone-200/70 dark:border-stone-700/60 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-pink-500/10 text-pink-600 dark:text-pink-400 rounded-xl">
                      <MessageSquare size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-stone-900 dark:text-stone-100">مکاتبات، جلسات و ادعاها</h4>
                      <span className="text-[10px] text-stone-400 font-bold">دبیرخانه، صورتجلسات و لوایح تاخیرات</span>
                    </div>
                  </div>
                  <span className="text-xs font-black text-pink-600">{projectMeetings.length} جلسه</span>
                </div>

                <div className="space-y-2 text-xs font-bold text-stone-600 dark:text-stone-300">
                  <div className="flex justify-between py-1 border-b border-stone-200/50 dark:border-stone-700/40">
                    <span>نامه‌های ثبت‌شده در دبیرخانه:</span>
                    <span className="font-mono text-stone-900 dark:text-stone-100">{projectLetters.length} نامه</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-stone-200/50 dark:border-stone-700/40">
                    <span>ادعاهای تمدید مدت (تاخیرات):</span>
                    <span className="font-mono text-amber-600 font-black">
                      {projectDelayClaims.length} ادعا ({totalRequestedExtensionDays} روز)
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span>ادعاهای خسارت مالی:</span>
                    <span className="font-mono text-stone-900 dark:text-stone-100">{projectLossClaims.length} مورد</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => navigateToModule('communications')}
                  className="flex-1 py-2 px-3 bg-pink-500/15 hover:bg-pink-500/25 text-pink-800 dark:text-pink-300 text-xs font-black rounded-xl transition-colors text-center"
                >
                  ورود به مکاتبات
                </button>
                <button
                  onClick={() => setActiveDrilldown('COMMUNICATIONS')}
                  className="p-2 bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 rounded-xl text-stone-700 dark:text-stone-200"
                  title="مشاهده ریز اطلاعات"
                >
                  <Eye size={15} />
                </button>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* 5. Interactive Gantt / Milestone Phase Bar Preview */}
      <div className="bg-white dark:bg-stone-900 rounded-[2rem] p-6 md:p-8 border border-stone-200/80 dark:border-stone-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-black text-lg text-stone-900 dark:text-stone-100">
              جبهه‌های کاری و مایل‌استون‌های اصلی پروژه
            </h3>
            <p className="text-xs text-stone-400 dark:text-stone-500 font-bold mt-1">
              پیشرفت فازهای عملیاتی بر اساس ساختار اجرایی قرارداد (جهت مشاهده جزئیات بر روی هر فاز کلیک فرمایید)
            </p>
          </div>

          <button
            onClick={() => navigateToModule('planning')}
            className="text-xs font-black text-amber-600 hover:text-amber-700 flex items-center gap-1.5 self-start sm:self-center"
          >
            <span>ورود به زمان‌بندی و گانت چارت</span>
            <ChevronLeft size={16} />
          </button>
        </div>

        <div className="space-y-3 pt-2">
          
          {/* Milestone 1 */}
          <div 
            onClick={() => setSelectedMilestone(selectedMilestone === 'm1' ? null : 'm1')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              selectedMilestone === 'm1' 
                ? 'bg-amber-50/60 dark:bg-stone-800 border-amber-400 ring-2 ring-amber-500/20' 
                : 'bg-stone-50/60 dark:bg-stone-800/40 border-stone-200/60 dark:border-stone-700/40 hover:bg-stone-100/60'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span className="text-xs font-black text-stone-900 dark:text-stone-100">
                  {isCBS ? "فاز ۱: مهندسی تفصیلی و مطالعات پایه" : "فاز ۱: خاکبرداری، نیلینگ و پایدارسازی گود"}
                </span>
              </div>
              <span className="text-xs font-mono font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-lg">
                ۱۰۰٪ تکمیل شده
              </span>
            </div>

            <div className="w-full bg-stone-200 dark:bg-stone-700 h-2 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full w-full"></div>
            </div>

            {selectedMilestone === 'm1' && (
              <p className="mt-3 pt-3 border-t border-stone-200/60 dark:border-stone-700/60 text-xs text-stone-600 dark:text-stone-300 font-bold animate-fadeIn">
                کلیه مستندات و نقشه‌های فاز اول با تایید دستگاه نظارت و کارفرما تحویل گردیده و صورت‌جلسات پایدارسازی تسویه شده است.
              </p>
            )}
          </div>

          {/* Milestone 2 */}
          <div 
            onClick={() => setSelectedMilestone(selectedMilestone === 'm2' ? null : 'm2')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              selectedMilestone === 'm2' 
                ? 'bg-amber-50/60 dark:bg-stone-800 border-amber-400 ring-2 ring-amber-500/20' 
                : 'bg-stone-50/60 dark:bg-stone-800/40 border-stone-200/60 dark:border-stone-700/40 hover:bg-stone-100/60'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <span className="text-xs font-black text-stone-900 dark:text-stone-100">
                  {isCBS ? "فاز ۲: تامین متریال پایپینگ و تجهیزات اصلی" : "فاز ۲: اجرای فونداسیون گسترده، اسکلت بتنی و فلزی"}
                </span>
              </div>
              <span className="text-xs font-mono font-black text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-0.5 rounded-lg">
                ۶۵٪ در حال پیشرفت
              </span>
            </div>

            <div className="w-full bg-stone-200 dark:bg-stone-700 h-2 rounded-full overflow-hidden">
              <div className="bg-amber-500 h-full rounded-full w-[65%]"></div>
            </div>

            {selectedMilestone === 'm2' && (
              <p className="mt-3 pt-3 border-t border-stone-200/60 dark:border-stone-700/60 text-xs text-stone-600 dark:text-stone-300 font-bold animate-fadeIn">
                عملیات آرماتوربندی و بتن‌ریزی فاز دوم با نظارت مستقیم آزمایشگاه مقیم در حال اجرا بوده و RFI مربوط به سقف طبقه ۳ ابلاغ گردیده است.
              </p>
            )}
          </div>

          {/* Milestone 3 */}
          <div 
            onClick={() => setSelectedMilestone(selectedMilestone === 'm3' ? null : 'm3')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              selectedMilestone === 'm3' 
                ? 'bg-amber-50/60 dark:bg-stone-800 border-amber-400 ring-2 ring-amber-500/20' 
                : 'bg-stone-50/60 dark:bg-stone-800/40 border-stone-200/60 dark:border-stone-700/40 hover:bg-stone-100/60'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
                <span className="text-xs font-black text-stone-900 dark:text-stone-100">
                  {isCBS ? "فاز ۳: نصب مکانیکی، تست و راه‌اندازی" : "فاز ۳: تأسیسات مکانیکی و برقی و نازک‌کاری"}
                </span>
              </div>
              <span className="text-xs font-mono font-black text-stone-500 bg-stone-200/60 dark:bg-stone-800 px-2.5 py-0.5 rounded-lg">
                برنامه‌ریزی شده (آتی)
              </span>
            </div>

            <div className="w-full bg-stone-200 dark:bg-stone-700 h-2 rounded-full overflow-hidden">
              <div className="bg-slate-400/40 h-full rounded-full w-[15%]"></div>
            </div>

            {selectedMilestone === 'm3' && (
              <p className="mt-3 pt-3 border-t border-stone-200/60 dark:border-stone-700/60 text-xs text-stone-600 dark:text-stone-300 font-bold animate-fadeIn">
                استعلام قیمت و خرید اقلام بحرانی نازک‌کاری و متریال برقی در جریان است و پس از اتمام اسکلت، جبهه کاری آماده خواهد شد.
              </p>
            )}
          </div>

        </div>
      </div>

      {/* 6. Universal Interactive Drilldown Modal */}
      {activeDrilldown && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-stone-900 rounded-[2rem] border border-stone-200 dark:border-stone-800 shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-scaleUp">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50 dark:bg-stone-850">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500 text-stone-950 rounded-xl font-black">
                  {activeDrilldown === 'PROGRESS' && <TrendingUp size={20} />}
                  {activeDrilldown === 'FINANCIAL' && <Wallet size={20} />}
                  {activeDrilldown === 'QC' && <ClipboardCheck size={20} />}
                  {activeDrilldown === 'HSE' && <Shield size={20} />}
                  {activeDrilldown === 'EXECUTION' && <HardHat size={20} />}
                  {activeDrilldown === 'MATERIALS' && <Layers size={20} />}
                  {activeDrilldown === 'COMMUNICATIONS' && <MessageSquare size={20} />}
                </div>
                <div>
                  <h3 className="font-black text-lg text-stone-900 dark:text-stone-100">
                    {activeDrilldown === 'PROGRESS' && "جزئیات تحلیل پیشرفت فیزیکی و EVM"}
                    {activeDrilldown === 'FINANCIAL' && "جزئیات جذب بودجه و صورت‌وضعیت‌ها"}
                    {activeDrilldown === 'QC' && "گزارش‌های بازرسی کیفیت (RFI) و عدم انطباق (NCR)"}
                    {activeDrilldown === 'HSE' && "مجوزهای کار (PTW) و گزارش‌های ایمنی HSE"}
                    {activeDrilldown === 'EXECUTION' && "گزارش روزانه کارگاه و وضعیت نیروی انسانی"}
                    {activeDrilldown === 'MATERIALS' && "درخواست‌های خرید MRS و رسیدهای انبار MIV"}
                    {activeDrilldown === 'COMMUNICATIONS' && "مکاتبات دبیرخانه، جلسات و ادعاها"}
                  </h3>
                  <span className="text-xs text-stone-400 font-bold">پروژه: {currentProject.title}</span>
                </div>
              </div>

              <button
                onClick={() => setActiveDrilldown(null)}
                className="p-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-xl hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs font-bold">
              
              {/* Progress Detail */}
              {activeDrilldown === 'PROGRESS' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200/50">
                      <span className="text-stone-500 block mb-1">پیشرفت واقعی</span>
                      <span className="text-2xl font-black text-emerald-600">{calculatedProgress}٪</span>
                    </div>
                    <div className="p-4 bg-stone-100 dark:bg-stone-800 rounded-2xl">
                      <span className="text-stone-500 block mb-1">پیشرفت برنامه‌ای</span>
                      <span className="text-2xl font-black text-stone-700 dark:text-stone-300">{plannedProgress}٪</span>
                    </div>
                    <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-2xl border border-amber-200/50">
                      <span className="text-stone-500 block mb-1">شاخص زمانی SPI</span>
                      <span className="text-2xl font-black text-amber-600">{spi.toFixed(2)}</span>
                    </div>
                  </div>

                  <p className="text-stone-600 dark:text-stone-300 leading-relaxed">
                    منحنی اس پروژه نشان‌دهنده تطابق قابل قبول بین جبهه‌های فعال کاری و برنامه زمان‌بندی مبنا (Baseline) است. کلیه فعالیت‌های مسیر بحرانی به موقع رصد می‌گردند.
                  </p>
                </div>
              )}

              {/* Financial Detail */}
              {activeDrilldown === 'FINANCIAL' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-4 bg-stone-100 dark:bg-stone-800 rounded-2xl">
                      <span className="text-stone-500 block mb-1">مبلغ کل پیمان</span>
                      <span className="text-sm font-black text-stone-900 dark:text-stone-100">{formatCurrency(calculatedBudget)}</span>
                    </div>
                    <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-2xl border border-amber-200/50">
                      <span className="text-stone-500 block mb-1">کارکرد تجمعی</span>
                      <span className="text-sm font-black text-amber-600">{formatCurrency(calculatedSpent)}</span>
                    </div>
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200/50">
                      <span className="text-stone-500 block mb-1">شاخص هزینه CPI</span>
                      <span className="text-2xl font-black text-emerald-600">{cpi.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="border border-stone-200 dark:border-stone-700 rounded-xl overflow-hidden">
                    <table className="w-full text-right">
                      <thead className="bg-stone-100 dark:bg-stone-800 text-stone-500">
                        <tr>
                          <th className="p-2.5">شماره صورت‌وضعیت</th>
                          <th className="p-2.5">نوع</th>
                          <th className="p-2.5">وضعیت</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-200 dark:divide-stone-700">
                        {(isCBS ? cbsStatements : statements)
                          .filter(s => String(s.projectId) === String(selectedProjectId))
                          .map((st, i) => (
                            <tr key={i}>
                              <td className="p-2.5 font-bold">ص.و شماره {st.number || (i+1)}</td>
                              <td className="p-2.5">{isCBS ? "ساختار شکست CBS" : "فهرست بهایی"}</td>
                              <td className="p-2.5 text-emerald-600 font-black">تایید شده</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* QC Detail */}
              {activeDrilldown === 'QC' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-stone-900 dark:text-stone-100">آخرین درخواست‌های بازرسی (RFI) و عدم انطباق</span>
                    <span className="text-xs text-blue-600">{projectQcInspections.length} بازرسی ثبت شده</span>
                  </div>

                  <div className="space-y-2">
                    {projectQcInspections.slice(0, 5).map((insp, i) => (
                      <div key={i} className="p-3 bg-stone-50 dark:bg-stone-800 rounded-xl flex items-center justify-between">
                        <div>
                          <span className="font-black text-stone-900 dark:text-stone-100 block">{insp.rfiNumber || `RFI-${i+1}`}: {insp.title}</span>
                          <span className="text-[10px] text-stone-400">{insp.location || 'کارگاه'} · {insp.discipline || 'سازه'}</span>
                        </div>
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black ${insp.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                          {insp.status === 'APPROVED' ? 'تایید شده' : 'در دست بررسی'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* HSE Detail */}
              {activeDrilldown === 'HSE' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl">
                      <span className="text-stone-500 block mb-1">نمره شاخص ایمنی</span>
                      <span className="text-2xl font-black text-emerald-600">{safetyScore} از ۱۰۰</span>
                    </div>
                    <div className="p-4 bg-red-50 dark:bg-red-950/30 rounded-2xl">
                      <span className="text-stone-500 block mb-1">مجوزهای کار فعال</span>
                      <span className="text-2xl font-black text-red-600">{allProjectPermits.length} مجوز</span>
                    </div>
                  </div>
                  <p className="text-stone-600 dark:text-stone-300">
                    تمامی ممیزی‌های کار در ارتفاع، کپسول‌های اطفاء حریق و تجهیزات حفاظت فردی (PPE) در شیفت جاری بازرسی شده‌اند.
                  </p>
                </div>
              )}

              {/* Execution Detail */}
              {activeDrilldown === 'EXECUTION' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-stone-100 dark:bg-stone-800 rounded-xl text-center">
                      <span className="text-stone-400 block text-[10px]">پیمانکار</span>
                      <span className="font-mono font-black text-sm">{subcontractorCount} نفر</span>
                    </div>
                    <div className="p-3 bg-stone-100 dark:bg-stone-800 rounded-xl text-center">
                      <span className="text-stone-400 block text-[10px]">امانی</span>
                      <span className="font-mono font-black text-sm">{directCount} نفر</span>
                    </div>
                    <div className="p-3 bg-stone-100 dark:bg-stone-800 rounded-xl text-center">
                      <span className="text-stone-400 block text-[10px]">ستادی و نظارت</span>
                      <span className="font-mono font-black text-sm">{adminCount} نفر</span>
                    </div>
                  </div>
                  <div className="p-3 bg-stone-50 dark:bg-stone-800 rounded-xl">
                    <span className="text-xs font-black text-stone-900 dark:text-stone-100 block mb-1">آخرین گزارش ثبت‌شده:</span>
                    <p className="text-stone-600 dark:text-stone-300 text-xs">
                      {latestReport ? `گزارش روزانه کارگاه به تاریخ ${latestReport.date} با حضور ${laborCount} نفر نیروی کار و ${activeMachineryCount} دستگاه ماشین‌آلات با موفقیت در سیستم ثبت گردید.` : "گزارش روزانه کارگاه در سیستم در دسترس است."}
                    </p>
                  </div>
                </div>
              )}

              {/* Materials Detail */}
              {activeDrilldown === 'MATERIALS' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-violet-50 dark:bg-violet-950/30 rounded-2xl">
                      <span className="text-stone-500 block mb-1">تقاضاهای خرید MRS</span>
                      <span className="text-2xl font-black text-violet-600">{projectMrs.length} مورد</span>
                    </div>
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl">
                      <span className="text-stone-500 block mb-1">رسید ورود انبار MIV</span>
                      <span className="text-2xl font-black text-emerald-600">{projectMiv.length} رسید</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Communications Detail */}
              {activeDrilldown === 'COMMUNICATIONS' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-stone-100 dark:bg-stone-800 rounded-xl text-center">
                      <span className="text-stone-400 block text-[10px]">نامه‌های دبیرخانه</span>
                      <span className="font-mono font-black text-sm">{projectLetters.length}</span>
                    </div>
                    <div className="p-3 bg-stone-100 dark:bg-stone-800 rounded-xl text-center">
                      <span className="text-stone-400 block text-[10px]">صورتجلسات پروژه</span>
                      <span className="font-mono font-black text-sm">{projectMeetings.length}</span>
                    </div>
                    <div className="p-3 bg-stone-100 dark:bg-stone-800 rounded-xl text-center">
                      <span className="text-stone-400 block text-[10px]">ادعاهای تاخیرات</span>
                      <span className="font-mono font-black text-sm text-amber-600">{projectDelayClaims.length}</span>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer with Direct Module Action */}
            <div className="p-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-850 flex items-center justify-between">
              <span className="text-xs text-stone-400 font-bold">سامانه مدیریت پروژه همیار</span>
              
              <button
                onClick={() => {
                  const target = 
                    activeDrilldown === 'PROGRESS' ? 'planning' :
                    activeDrilldown === 'FINANCIAL' ? 'technical-office' :
                    activeDrilldown === 'QC' ? 'quality-control' :
                    activeDrilldown === 'HSE' ? 'hse' :
                    activeDrilldown === 'EXECUTION' ? 'execution' :
                    activeDrilldown === 'MATERIALS' ? 'materials' : 'communications';
                  setActiveDrilldown(null);
                  navigateToModule(target);
                }}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <span>انتقال مستقیم به صفحه اصلی ماژول</span>
                <ExternalLink size={14} />
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 10. Printable Executive Management Report Modal */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-stone-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 text-stone-900 dark:text-white rounded-[2rem] w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-stone-300 dark:border-slate-800">
            
            {/* Modal Toolbar (Screen Only - Not Printed) */}
            <div className="p-4 sm:px-6 bg-stone-50 dark:bg-slate-800 text-stone-900 dark:text-white flex items-center justify-between no-print border-b border-stone-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/15 text-amber-600 dark:text-amber-400 rounded-xl">
                  <Printer size={20} />
                </div>
                <div>
                  <h3 className="font-black text-sm sm:text-base text-stone-900 dark:text-white">گزارش مدیریتی و اجرایی جامع پروژه</h3>
                  <p className="text-[11px] text-stone-500 dark:text-slate-400">پیش‌نمایش سند رسمی جهت چاپ، آرشیو و ارائه به کارفرما و مشاور</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyReportSummary}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-stone-100 text-stone-700 rounded-xl text-xs font-bold transition-all border border-stone-200 cursor-pointer shadow-sm"
                  title="کپی خلاصه گزارش در کلیپ‌بورد"
                >
                  {copySuccess ? <CheckCircle2 size={15} className="text-emerald-600" /> : <FileText size={15} />}
                  <span>{copySuccess ? "کپی شد!" : "کپی خلاصه متنی"}</span>
                </button>

                <button
                  onClick={handlePrintDocument}
                  disabled={reportGenerating}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black rounded-xl text-xs transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  <Printer size={16} />
                  <span>{reportGenerating ? "در حال ارسال به پرینتر..." : "چاپ سند رسمی (Print / PDF)"}</span>
                </button>

                <button
                  onClick={() => setIsReportModalOpen(false)}
                  className="p-2 hover:bg-stone-200 rounded-xl text-stone-500 hover:text-stone-800 transition-colors cursor-pointer mr-1"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Printable Document Body */}
            <div id="printable-management-report" className="print-area p-6 sm:p-10 overflow-y-auto space-y-6 text-stone-900 dark:text-slate-100 font-['Vazirmatn'] bg-white dark:bg-slate-900">
              
              {/* Official Report Header */}
              <div className="border-b-2 border-stone-900 dark:border-slate-700 pb-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="inline-block bg-stone-100 dark:bg-slate-800 text-stone-800 dark:text-slate-200 text-[11px] font-black px-2.5 py-0.5 rounded border border-stone-300 dark:border-slate-700">
                      فرم رسمی گزارش مدیریتی و پایش عملکرد
                    </span>
                    <h2 className="text-2xl font-black text-stone-900 dark:text-white">
                      {currentProject.title}
                    </h2>
                    <p className="text-xs font-bold text-stone-600 dark:text-slate-400">
                      سامانه جامع مدیریت و کنترل پروژه کارگاهی همیار
                    </p>
                  </div>

                  <div className="bg-stone-50 dark:bg-slate-800/80 p-3 rounded-xl border border-stone-200 dark:border-slate-700 text-xs space-y-1 min-w-[210px]">
                    <div className="flex justify-between">
                      <span className="text-stone-500 dark:text-slate-400">شماره پیمان:</span>
                      <span className="font-mono font-black">{currentProject.contractNumber || '---'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500 dark:text-slate-400">تاریخ گزارش:</span>
                      <span className="font-bold">{new Date().toLocaleDateString('fa-IR')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500 dark:text-slate-400">ساختار پیمان:</span>
                      <span className="font-bold text-amber-700 dark:text-amber-400">{isCBS ? "شکست کار (CBS)" : "فهرست بها"}</span>
                    </div>
                  </div>
                </div>

                {/* Contract Stakeholders Banner */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-stone-200 dark:border-slate-800 text-xs">
                  <div className="bg-stone-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-stone-200 dark:border-slate-700 flex items-center justify-between gap-2">
                    <div>
                      <span className="text-stone-500 dark:text-slate-400 block text-[10px]">کارفرمای محترم:</span>
                      <span className="font-black text-stone-900 dark:text-white">{currentProject.employerName || 'تعیین نشده'}</span>
                    </div>
                    {dashLogos.employerLogo && (
                      <img src={dashLogos.employerLogo} alt="لوگو کارفرما" className="h-9 max-w-[75px] object-contain flex-shrink-0" />
                    )}
                  </div>
                  <div className="bg-stone-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-stone-200 dark:border-slate-700 flex items-center justify-between gap-2">
                    <div>
                      <span className="text-stone-500 dark:text-slate-400 block text-[10px]">مهندس مشاور و دستگاه نظارت:</span>
                      <span className="font-black text-stone-900 dark:text-white">{currentProject.consultantName || 'تعیین نشده'}</span>
                    </div>
                    {dashLogos.consultantLogo && (
                      <img src={dashLogos.consultantLogo} alt="لوگو مشاور" className="h-9 max-w-[75px] object-contain flex-shrink-0" />
                    )}
                  </div>
                  <div className="bg-stone-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-stone-200 dark:border-slate-700 flex items-center justify-between gap-2">
                    <div>
                      <span className="text-stone-500 dark:text-slate-400 block text-[10px]">پیمانکار اجرایی:</span>
                      <span className="font-black text-stone-900 dark:text-white">{currentProject.contractorName || 'تعیین نشده'}</span>
                    </div>
                    {dashLogos.contractorLogo && (
                      <img src={dashLogos.contractorLogo} alt="لوگو پیمانکار" className="h-9 max-w-[75px] object-contain flex-shrink-0" />
                    )}
                  </div>
                </div>
              </div>

              {/* 1. Macro KPIs & EVM Matrix */}
              <div>
                <h4 className="text-xs font-black text-stone-900 dark:text-white mb-3 flex items-center gap-1.5 border-r-4 border-amber-500 pr-2">
                  <span>۱. شاخص‌های کلان عملکرد و پیشرفت (EVM Metrics)</span>
                </h4>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="p-3 bg-stone-50 dark:bg-slate-800/80 rounded-xl border border-stone-200 dark:border-slate-700">
                    <span className="text-[11px] font-bold text-stone-500 dark:text-slate-400 block mb-1">پیشرفت واقعی فیزیکی</span>
                    <span className="text-xl font-mono font-black text-emerald-700 dark:text-emerald-400">{calculatedProgress.toLocaleString("fa-IR")}٪</span>
                    <span className="text-[10px] text-stone-500 dark:text-slate-400 block mt-0.5">برنامه‌ای: {plannedProgress}٪</span>
                  </div>

                  <div className="p-3 bg-stone-50 dark:bg-slate-800/80 rounded-xl border border-stone-200 dark:border-slate-700">
                    <span className="text-[11px] font-bold text-stone-500 dark:text-slate-400 block mb-1">مبلغ اولیه پیمان</span>
                    <span className="text-xs font-black text-stone-900 dark:text-white block leading-tight">{formatCurrency(calculatedBudget)}</span>
                    <span className="text-[10px] text-stone-500 dark:text-slate-400 block mt-1">مدت پیمان: ۲۴ ماه</span>
                  </div>

                  <div className="p-3 bg-stone-50 dark:bg-slate-800/80 rounded-xl border border-stone-200 dark:border-slate-700">
                    <span className="text-[11px] font-bold text-stone-500 dark:text-slate-400 block mb-1">کارکرد مالی مصوب</span>
                    <span className="text-xs font-black text-amber-700 dark:text-amber-400 block leading-tight">{formatCurrency(calculatedSpent)}</span>
                    <span className="text-[10px] text-stone-500 dark:text-slate-400 block mt-1">جذب اعتبارات: {budgetUtilizationPercent}٪</span>
                  </div>

                  <div className="p-3 bg-stone-50 dark:bg-slate-800/80 rounded-xl border border-stone-200 dark:border-slate-700">
                    <span className="text-[11px] font-bold text-stone-500 dark:text-slate-400 block mb-1">شاخص‌های زمانی و هزینه</span>
                    <div className="flex justify-around items-center mt-1">
                      <div>
                        <span className="text-[10px] text-stone-500 dark:text-slate-400 block">SPI</span>
                        <span className={`font-mono font-black text-xs ${spi >= 1 ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`}>{spi.toFixed(2)}</span>
                      </div>
                      <div className="border-r border-stone-300 dark:border-slate-700 h-6"></div>
                      <div>
                        <span className="text-[10px] text-stone-500 dark:text-slate-400 block">CPI</span>
                        <span className={`font-mono font-black text-xs ${cpi >= 1 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>{cpi.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Detailed Performance Summary Table */}
              <div>
                <h4 className="text-xs font-black text-stone-900 mb-3 flex items-center gap-1.5 border-r-4 border-amber-500 pr-2">
                  <span>۲. جدول تفکیکی وضعیت بخش‌ها و ماژول‌های پروژه</span>
                </h4>

                <div className="overflow-x-auto rounded-xl border border-stone-200">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-stone-100 text-stone-700 font-black border-b border-stone-200">
                      <tr>
                        <th className="p-2.5">بخش تخصصی</th>
                        <th className="p-2.5">وضعیت و حجم ثبت‌شده</th>
                        <th className="p-2.5">شاخص کلیدی</th>
                        <th className="p-2.5">آخرین وضعیت عملکردی</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200">
                      <tr>
                        <td className="p-2.5 font-black">عملیات اجرایی و کارگاه</td>
                        <td className="p-2.5">{projectReports.length} گزارش روزانه ثبت‌شده</td>
                        <td className="p-2.5 font-mono">{laborCount} نفر نیرو ({subcontractorCount} پیمانکار)</td>
                        <td className="p-2.5 text-stone-600">
                          {unresolvedProblemsCount === 0 ? "بدون مانع اجرایی حاد" : `${unresolvedProblemsCount} مانع فعال کارگاهی`}
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-black">دفتر فنی و قراردادها</td>
                        <td className="p-2.5">{isCBS ? cbsStatements.filter(s => String(s.projectId) === String(selectedProjectId)).length : statements.filter(s => String(s.projectId) === String(selectedProjectId)).length} صورت‌وضعیت تاییدشده</td>
                        <td className="p-2.5 font-mono">{formatCurrency(calculatedSpent)}</td>
                        <td className="p-2.5 text-stone-600">
                          {minutes.filter(m => String(m.projectId) === String(selectedProjectId)).length} صورت‌جلسه کارگاهی در جریان
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-black">کنترل کیفیت (QC)</td>
                        <td className="p-2.5">{projectQcInspections.length} بازرسی کیفی و تست</td>
                        <td className="p-2.5 font-mono">{openNcrsCount} عدم‌انطباق باز</td>
                        <td className="p-2.5 text-stone-600">
                          {projectNcrs.length - openNcrsCount} مورد عدم انطباق با موفقیت رفع گردید
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-black">ایمنی و بهداشت (HSE)</td>
                        <td className="p-2.5">{allProjectPermits.length} مجوز کار گرم/ارتفاع (PTW)</td>
                        <td className="p-2.5 font-mono text-emerald-700 font-bold">نمره ایمنی {safetyScore}/۱۰۰</td>
                        <td className="p-2.5 text-stone-600">
                          {projectIncidents.length === 0 ? "صفر حادثه (محیط کاملاً ایمن)" : `${projectIncidents.length} حادثه ثبت‌شده`}
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-black">تدارکات و زنجیره مصالح</td>
                        <td className="p-2.5">{projectMrs.length} تقاضای خرید کالا (MRS)</td>
                        <td className="p-2.5 font-mono">{projectMiv.length} رسید انبار MIV</td>
                        <td className="p-2.5 text-stone-600">
                          {pendingMrsCount === 0 ? "کلیه تقاضاها اقدام شده‌اند" : `${pendingMrsCount} تقاضا در انتظار تامین`}
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-black">مکاتبات و ادعاها</td>
                        <td className="p-2.5">{projectLetters.length} نامه وارده و صادره</td>
                        <td className="p-2.5 font-mono">{projectDelayClaims.length} پرونده تاخیرات</td>
                        <td className="p-2.5 text-stone-600">
                          {totalRequestedExtensionDays} روز درخواست تمدید مجاز و ادعا
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 3. Official Signatures Block (For Print & Archival) */}
              <div className="pt-8 border-t border-stone-300 print-break-inside-avoid">
                <p className="text-[11px] text-stone-500 font-bold mb-6 text-center">
                  این سند به عنوان گزارش مدیریتی و تاییدیه پیشرفت پروژه توسط ارکان طرح مورد بررسی قرار گرفت:
                </p>

                <div className="grid grid-cols-3 gap-6 text-center text-xs">
                  <div className="p-4 border border-dashed border-stone-300 rounded-xl space-y-8 bg-stone-50/50">
                    <span className="font-black text-stone-800 block">مدیر پروژه / سرپرست کارگاه</span>
                    <span className="text-[10px] text-stone-400 block">مهر و امضای پیمانکار</span>
                  </div>

                  <div className="p-4 border border-dashed border-stone-300 rounded-xl space-y-8 bg-stone-50/50">
                    <span className="font-black text-stone-800 block">سرپرست دستگاه نظارت</span>
                    <span className="text-[10px] text-stone-400 block">مهر و امضای مهندس مشاور</span>
                  </div>

                  <div className="p-4 border border-dashed border-stone-300 rounded-xl space-y-8 bg-stone-50/50">
                    <span className="font-black text-stone-800 block">مدیر طرح / نماینده کارفرما</span>
                    <span className="text-[10px] text-stone-400 block">مهر و امضای کارفرما</span>
                  </div>
                </div>
              </div>

              {/* Report Footer */}
              <div className="pt-4 border-t border-stone-200 flex items-center justify-between text-[10px] text-stone-400 font-medium">
                <span>سامانه مدیریت پروژه همیار — خروجی سند رسمی مدیریت پروژه</span>
                <span>صفحه ۱ از ۱</span>
              </div>

            </div>

            {/* Modal Bottom Action Bar (Screen Only) */}
            <div className="p-4 bg-stone-100 border-t border-stone-200 flex items-center justify-between no-print">
              <span className="text-xs text-stone-500 font-bold">
                جهت تهیه نسخه PDF، در پنجره چاپ گزینه "Save as PDF" را انتخاب نمایید.
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsReportModalOpen(false)}
                  className="px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  بستن
                </button>
                <button
                  onClick={handlePrintDocument}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  <Printer size={16} />
                  <span>پرینت گزارش</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
