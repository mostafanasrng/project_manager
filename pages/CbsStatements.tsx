
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  FileSignature, 
  Search, 
  Plus, 
  ChevronDown, 
  ChevronUp, 
  Calculator, 
  CheckCircle2, 
  CheckCircle,
  Clock, 
  FileText, 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  Info,
  Trash2,
  Edit3,
  Save,
  Download,
  AlertTriangle,
  Coins,
  ScrollText,
  Printer,
  Activity,
  X,
  ArrowLeftCircle,
  Scale,
  Layers,
  RefreshCw,
  PenTool,
  ShieldCheck,
  Eye,
  FileCheck,
  Building2,
  Copy
} from 'lucide-react';
import { Project, WorkflowStatus, WorkflowAction, WorkflowEvent, Statement, DailyReport } from '../types';
import { MOCK_PROJECTS, DEFAULT_CBS_NODES } from '../constants';
import { WorkflowService } from '../services/workflowService';
import { SystemAdminService } from '../services/systemAdminService';
import { NotificationService } from '../services/notificationService';
import { HRService } from '../services/hrService';
import { OrganizationType, SystemUser } from '../systemAdminTypes';
import { formatUserDisplayFormal } from '../src/utils/userFormatter';
import { ShamsiDatePicker } from '../components/ShamsiDatePicker';

// --- Local Types ---
interface CbsNode {
  id: string;
  projectId?: string;
  code: string;
  title: string;
  parentId: string | null;
  unit: string;
  weightPercent: number;
  budget: number;
  quantity: number;
  unitPrice?: number;
}

interface CbsStatementValue {
  cbsId: string;
  currentProgressPercent: number;
  currentQuantity: number;
  consultantQuantity?: number;
  employerQuantity?: number;
  approvedQuantity?: number;
  previousProgressPercent: number;
  contractorProgressPercent?: number;
  contractorQuantity?: number;
  consultantProgressPercent?: number;
  employerProgressPercent?: number;
}

interface CbsStatement {
  id: string;
  projectId: string;
  number: string;
  date: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  status: WorkflowStatus;
  assigneeName?: string;
  assigneeId?: string;
  values: CbsStatementValue[];
  workflowHistory?: WorkflowEvent[];
  createdById?: string;
  ownerOrgId?: string;
  currentOrgId?: string;
  isFinalFrozen?: boolean;
}

interface CbsStatementsProps {
  selectedProjectIdProp?: string;
  hideProjectSelector?: boolean;
}

export default function CbsStatements({ selectedProjectIdProp, hideProjectSelector = false }: CbsStatementsProps) {
  // --- Data Loading ---
  const loadData = (key: string, defaultValue: any) => {
    try {
      const saved = localStorage.getItem(key);
      return saved && saved !== 'undefined' ? JSON.parse(saved) : defaultValue;
    } catch (e) {
      return defaultValue;
    }
  };

  // --- States ---
  const [projects] = useState<Project[]>(() => {
    const loaded = loadData('hamyar_projects', MOCK_PROJECTS);
    if (Array.isArray(loaded)) {
      return loaded.filter((p: any) => p.id !== '2' && !String(p.title || '').includes('تصفیه‌خانه مرکزی') && !String(p.title || '').includes('تسویه خانه مرکزی') && !String(p.title || '').includes('نیایش'));
    }
    return loaded;
  });
  const [selectedProjectId, setSelectedProjectId] = useState<string>(() => {
    if (selectedProjectIdProp) return selectedProjectIdProp;
    const saved = localStorage.getItem("hamyar_selected_project_id");
    if (saved && saved !== '2') return saved;
    const cbsProjects = projects.filter(p => p.contractType === 'CBS' && p.id !== '2');
    if (cbsProjects.length > 0) return cbsProjects[0].id;
    return projects[0]?.id || '';
  });

  useEffect(() => {
    if (selectedProjectIdProp) {
      setSelectedProjectId(selectedProjectIdProp);
      localStorage.setItem("hamyar_selected_project_id", selectedProjectIdProp);
    }
  }, [selectedProjectIdProp]);

  useEffect(() => {
    if (selectedProjectId) {
      localStorage.setItem("hamyar_selected_project_id", selectedProjectId);
    }
  }, [selectedProjectId]);

  const [currentUser, setCurrentUser] = useState<SystemUser | null>(() => SystemAdminService.getCurrentUser());
  const [orgUsers, setOrgUsers] = useState<SystemUser[]>(() => SystemAdminService.getUsers().filter(u => u.isActive));

  useEffect(() => {
    const updateUser = () => {
      const user = SystemAdminService.getCurrentUser();
      setCurrentUser(user);
      setOrgUsers(SystemAdminService.getUsers().filter(u => u.isActive));
    };
    updateUser();
    window.addEventListener('storage', updateUser);
    window.addEventListener('focus', updateUser);
    return () => {
      window.removeEventListener('storage', updateUser);
      window.removeEventListener('focus', updateUser);
    };
  }, []);

  const [allStatements, setAllStatements] = useState<CbsStatement[]>(() => {
    const raw = loadData('hamyar_cbs_statements', []);
    let migrated = false;
    const clean = raw.map((s: any) => {
      let changed = false;
      
      if (!s.startDate) { s.startDate = s.date || new Date().toLocaleDateString('fa-IR'); changed = true; }
      if (!s.endDate) { s.endDate = s.date || new Date().toLocaleDateString('fa-IR'); changed = true; }
      if (!s.description) { s.description = `صورت وضعیت شکست کار شماره ${s.number}`; changed = true; }
      if (!s.ownerOrgId) { s.ownerOrgId = 'org-3'; changed = true; }
      if (!s.currentOrgId) { s.currentOrgId = s.currentOrgId || 'org-3'; changed = true; }
      if (!s.createdById) { s.createdById = currentUser?.id || 'majid'; changed = true; }
      if (!s.workflowHistory) { s.workflowHistory = []; changed = true; }
      
      if (s.status === 'DRAFT' || !s.status) {
        s.status = WorkflowStatus.DRAFT;
        if (!s.assigneeId) {
          s.assigneeId = s.createdById || currentUser?.id || 'majid';
          s.assigneeName = s.assigneeName || 'کارشناس دفتر فنی (پیمانکار)';
        }
        changed = true;
      } else if ((s.status as any) === 'APPROVED') {
        s.status = WorkflowStatus.APPROVED_INTERNAL;
        s.isFinalFrozen = true;
        changed = true;
      }
      
      if (changed) migrated = true;
      return s;
    });
    
    if (migrated) {
      localStorage.setItem('hamyar_cbs_statements', JSON.stringify(clean));
    }
    return clean;
  });

  // Workflow Modal States
  const [workflowModalOpen, setWorkflowModalOpen] = useState(false);
  const [workflowItem, setWorkflowItem] = useState<CbsStatement | null>(null);
  const [workflowActionType, setWorkflowActionType] = useState<WorkflowAction | null>(null);
  const [workflowAssignee, setWorkflowAssignee] = useState<string>('');
  const [workflowComment, setWorkflowComment] = useState<string>('');
  
  // History Modal State
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyItem, setHistoryItem] = useState<CbsStatement | null>(null);

  const [activeStatementId, setActiveStatementId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'history' | 'details'>('history');
  const [isCreating, setIsCreating] = useState(false);
  const [draftNewStatement, setDraftNewStatement] = useState<CbsStatement | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [formNumber, setFormNumber] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showComparisonMode, setShowComparisonMode] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Edit Statement Info Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingStatement, setEditingStatement] = useState<CbsStatement | null>(null);
  const [editNumber, setEditNumber] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStatus, setEditStatus] = useState<WorkflowStatus>(WorkflowStatus.DRAFT);
  const [editIsFinalFrozen, setEditIsFinalFrozen] = useState<boolean>(false);
  const [editAssigneeId, setEditAssigneeId] = useState<string>('');

  // Save Confirmation Modal State
  const [isSaveConfirmModalOpen, setIsSaveConfirmModalOpen] = useState(false);

  // Official Report Preview Modal State
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportModalStatement, setReportModalStatement] = useState<CbsStatement | null>(null);

  // Digital Signature Toggle State
  const [attachWorkflowSignature, setAttachWorkflowSignature] = useState(true);

  // Import from Daily Reports State
  const [isImportDailyReportsModalOpen, setIsImportDailyReportsModalOpen] = useState(false);
  const [importApplyType, setImportApplyType] = useState<'percent' | 'quantity'>('percent');

  const [sentTransfers, setSentTransfers] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem("hamyar_cbs_sent_transfers");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem("hamyar_cbs_sent_transfers");
      if (saved) {
        setSentTransfers(JSON.parse(saved));
      }
    } catch (e) {
      console.error(e);
    }
  }, [selectedProjectId, isImportDailyReportsModalOpen]);

  const [highlightedRecordId, setHighlightedRecordId] = useState<string | null>(null);

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

  // Deep-link & notification redirect to specific statement (highlights row in list without forcing into detail edit modal)
  useEffect(() => {
    const handleGlobalClick = (e: Event) => {
      const customEvent = e as CustomEvent<any>;
      if (customEvent.detail && (customEvent.detail.module === "STATEMENTS" || customEvent.detail.module === "cbs-statements")) {
        const recordId = customEvent.detail.recordId;
        if (customEvent.detail.projectId) {
          setSelectedProjectId(customEvent.detail.projectId);
        }
        if (recordId) {
          setActiveTab('history');
          setHighlightedRecordId(recordId);
          setTimeout(() => {
            const el = document.getElementById(`record-${recordId}`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 200);
          setTimeout(() => setHighlightedRecordId(null), 3500);
        }
      }
    };
    window.addEventListener("hamyar-notification-clicked", handleGlobalClick);

    // Check URL query parameters
    const params = new URLSearchParams(window.location.search);
    const urlRecordId = params.get('recordId');
    const projId = params.get('projectId');
    if (projId) {
      setSelectedProjectId(projId);
    }
    if (urlRecordId) {
      setActiveTab('history');
      setHighlightedRecordId(urlRecordId);
      setTimeout(() => {
        const el = document.getElementById(`record-${urlRecordId}`);
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
  }, [allStatements]);

  const [unreadRecordIds, setUnreadRecordIds] = useState<Set<string>>(() => {
    return currentUser ? NotificationService.getUnreadRecordIds(currentUser.id) : new Set();
  });

  useEffect(() => {
    const updateUnread = () => {
      if (currentUser) {
        setUnreadRecordIds(NotificationService.getUnreadRecordIds(currentUser.id));
      }
    };
    window.addEventListener('notification-updated', updateUnread);
    return () => window.removeEventListener('notification-updated', updateUnread);
  }, [currentUser]);

  const handleStatementRowClick = (statementId: string) => {
    if (currentUser && unreadRecordIds.has(String(statementId))) {
      NotificationService.markRecordAsRead(String(statementId), currentUser.id);
      setUnreadRecordIds((prev) => {
        const next = new Set(prev);
        next.delete(String(statementId));
        return next;
      });
    }
  };

  const isCbsRecipient = useMemo(() => {
    if (!currentUser) return false;
    const projectTransfers = sentTransfers.filter((t: any) => 
      String(t.projectId) === String(selectedProjectId) && 
      t.recipientId === currentUser.id && 
      t.status === 'SENT'
    );
    return projectTransfers.length > 0;
  }, [selectedProjectId, currentUser, sentTransfers]);

  // CBS Nodes for the project
  const [nodes] = useState<CbsNode[]>(() => {
    return loadData('hamyar_cbs_nodes', []);
  });

  // --- Derived Data ---
  const currentProject = projects.find(p => p.id === selectedProjectId);
  const activeCurrency = currentProject?.currency || 'تومان';
  
  const projectNodes = useMemo(() => {
    return nodes.filter(n => n.projectId === selectedProjectId);
  }, [nodes, selectedProjectId]);
  
  const projectStatements = useMemo(() => 
    allStatements.filter(s => s.projectId === selectedProjectId),
  [allStatements, selectedProjectId]);

  const currentUserOrg = useMemo(() => 
    currentUser ? SystemAdminService.getOrganization(currentUser.orgId) : null,
  [currentUser]);

  const activeStatement = useMemo(() => {
    if (activeStatementId === 'TEMP_DRAFT') return draftNewStatement;
    return allStatements.find(s => s.id === activeStatementId);
  }, [allStatements, activeStatementId, draftNewStatement]);

  const dailyReportAggregatedCbsData = useMemo(() => {
    if (!selectedProjectId || !currentUser) return [];
    try {
      // Filter sent transfers to this user with status 'SENT'
      const userTransfers = sentTransfers.filter((t: any) => 
        String(t.projectId) === String(selectedProjectId) && 
        t.recipientId === currentUser.id && 
        t.status === 'SENT'
      );

      const nodeMap: Record<string, { cbsNodeId?: string; itemCode?: string; totalQty: number; totalWeightPercent: number; count: number }> = {};

      userTransfers.forEach((t: any) => {
        (t.items || []).forEach((wi: any) => {
          let key = wi.cbsNodeId;
          if (!key && wi.itemCode) {
            const matched = projectNodes.find(n => n.code === wi.itemCode);
            if (matched) key = matched.id;
          }
          if (!key) return;

          if (!nodeMap[key]) {
            nodeMap[key] = { cbsNodeId: key, itemCode: wi.itemCode, totalQty: 0, totalWeightPercent: 0, count: 0 };
          }
          nodeMap[key].totalQty += (wi.quantity || 0);
          nodeMap[key].totalWeightPercent += (wi.weightPercent || 0);
          nodeMap[key].count += 1;
        });
      });

      return Object.entries(nodeMap).map(([cbsId, data]) => {
        const node = projectNodes.find(n => n.id === cbsId);
        return {
          cbsId,
          node,
          ...data
        };
      }).filter((item): item is { cbsId: string; node: CbsNode; cbsNodeId?: string; itemCode?: string; totalQty: number; totalWeightPercent: number; count: number } => Boolean(item.node));
    } catch (e) {
      return [];
    }
  }, [selectedProjectId, projectNodes, currentUser, sentTransfers]);

  // Auto-expand all nodes when loaded
  useEffect(() => {
    if (projectNodes.length > 0) {
      setExpandedNodes(new Set(projectNodes.map(n => n.id)));
    }
  }, [projectNodes]);

  // Pre-calculated roll-up values (quantity, unit price, budget) for all nodes
  const cbsCalculatedValues = useMemo(() => {
    const calcMap: Record<string, { quantity: number; unitPrice: number; budget: number }> = {};

    const calculateValues = (nodeId: string): { quantity: number; unitPrice: number; budget: number } => {
      if (calcMap[nodeId]) return calcMap[nodeId];

      const node = projectNodes.find(n => n.id === nodeId);
      if (!node) return { quantity: 0, unitPrice: 0, budget: 0 };

      const children = projectNodes.filter(n => n.parentId === nodeId);
      if (children.length === 0) {
        // Leaf node
        const budget = node.budget || 0;
        let qty = node.quantity ?? 0;
        let uPrice = node.unitPrice ?? 0;

        if (qty === 0 && budget > 0 && uPrice > 0) {
          qty = budget / uPrice;
        } else if (uPrice === 0 && qty > 0 && budget > 0) {
          uPrice = budget / qty;
        } else if (qty === 0 && uPrice === 0 && budget > 0) {
          qty = 1;
          uPrice = budget;
        } else if (uPrice === 0 && qty === 0 && budget === 0) {
          qty = 0;
          uPrice = 0;
        } else if (uPrice === 0 && qty > 0) {
          uPrice = budget / qty;
        }
        
        const res = { quantity: qty, unitPrice: uPrice, budget: budget };
        calcMap[nodeId] = res;
        return res;
      } else {
        // Parent node
        let totalBudget = 0;
        let totalUnitPrice = 0;
        let totalQuantity = 0;

        children.forEach(child => {
          const vals = calculateValues(child.id);
          totalBudget += vals.budget;
          totalUnitPrice += vals.unitPrice;
          totalQuantity += vals.quantity;
        });

        const res = {
          quantity: totalQuantity,
          unitPrice: totalUnitPrice,
          budget: totalBudget
        };
        calcMap[nodeId] = res;
        return res;
      }
    };

    projectNodes.forEach(node => {
      calculateValues(node.id);
    });

    return calcMap;
  }, [projectNodes]);

  // Comprehensive Metrics Calculation (Real-time and Historical)
  const nodeMetrics = useMemo(() => {
    if (!activeStatement || projectNodes.length === 0) return {};

    const metrics: Record<string, {
      prevCumulativePercent: number;
      lastPeriodPercent: number;
      currentPeriodPercent: number;
      totalCumulativePercent: number;
      cumulativeFinancialValue: number;
      currentPeriodValue: number;
      currentPeriodQuantity: number;
      prevCumulativeQuantity: number;
      totalCumulativeQuantity: number;
      contractorPercent: number;
      contractorQuantity: number;
      consultantPercent: number;
      consultantQuantity: number;
      employerPercent: number;
      employerQuantity: number;
      contractorValue: number;
      consultantValue: number;
      employerValue: number;
    }> = {};

    const currentNum = parseInt(activeStatement.number) || 1;
    // Include all previous statements in sequence to calculate cumulative progress
    const prevStatements = projectStatements
      .filter(s => (parseInt(s.number) || 0) < currentNum)
      .sort((a, b) => (parseInt(a.number) || 0) - (parseInt(b.number) || 0));
    
    const lastStatement = prevStatements[prevStatements.length - 1];

    const calculate = (nodeId: string) => {
      const node = projectNodes.find(n => n.id === nodeId);
      if (!node) return { 
        prev: 0, 
        last: 0, 
        curr: 0, 
        prevQty: 0, 
        currQty: 0,
        contP: 0,
        contQ: 0,
        consP: 0,
        consQ: 0,
        empP: 0,
        empQ: 0
      };

      const children = projectNodes.filter(n => n.parentId === nodeId);
      let prev = 0;
      let last = 0;
      let curr = 0;
      let prevQty = 0;
      let currQty = 0;
      let contP = 0;
      let contQ = 0;
      let consP = 0;
      let consQ = 0;
      let empP = 0;
      let empQ = 0;

      if (children.length === 0) {
        // Leaf Node: Accumulate percentages and quantities from all previous periods
        prevStatements.forEach(s => {
          const v = s.values.find(val => val.cbsId === nodeId);
          if (v) {
            prev += v.currentProgressPercent || 0;
            prevQty += (v.currentQuantity || 0);
          }
        });
        
        // Value from immediately preceding statement (for Last Period column)
        if (lastStatement) {
          const v = lastStatement.values.find(val => val.cbsId === nodeId);
          if (v) last = v.currentProgressPercent || 0;
        }
        
        // Current period values from the active statement
        const v = activeStatement.values.find(val => val.cbsId === nodeId);
        if (v) {
          curr = v.currentProgressPercent || 0;
          currQty = v.currentQuantity || 0;
          contP = v.contractorProgressPercent !== undefined ? v.contractorProgressPercent : curr;
          contQ = v.contractorQuantity !== undefined ? v.contractorQuantity : currQty;
          consP = v.consultantProgressPercent !== undefined ? v.consultantProgressPercent : contP;
          consQ = v.consultantQuantity !== undefined ? v.consultantQuantity : contQ;
          empP = v.employerProgressPercent !== undefined ? v.employerProgressPercent : consP;
          empQ = v.employerQuantity !== undefined ? v.employerQuantity : consQ;
        }
      } else {
        // Parent Node: Aggregate child financial values to determine weighted percentages
        let totalPrevVal = 0;
        let totalLastVal = 0;
        let totalCurrVal = 0;
        let totalContVal = 0;
        let totalConsVal = 0;
        let totalEmpVal = 0;
        let nodePrevQty = 0;
        let nodeCurrQty = 0;

        children.forEach(child => {
          const res = calculate(child.id);
          totalPrevVal += (res.prev / 100) * child.budget;
          totalLastVal += (res.last / 100) * child.budget;
          totalCurrVal += (res.curr / 100) * child.budget;
          totalContVal += (res.contP / 100) * child.budget;
          totalConsVal += (res.consP / 100) * child.budget;
          totalEmpVal += (res.empP / 100) * child.budget;
          nodePrevQty += res.prevQty;
          nodeCurrQty += res.currQty;
        });

        if (node.budget > 0) {
          prev = (totalPrevVal / node.budget) * 100;
          last = (totalLastVal / node.budget) * 100;
          curr = (totalCurrVal / node.budget) * 100;
          contP = (totalContVal / node.budget) * 100;
          consP = (totalConsVal / node.budget) * 100;
          empP = (totalEmpVal / node.budget) * 100;
        }
        prevQty = nodePrevQty;
        currQty = nodeCurrQty;
      }

      const totalCum = prev + curr;
      metrics[nodeId] = {
        prevCumulativePercent: prev,
        lastPeriodPercent: last,
        currentPeriodPercent: curr,
        totalCumulativePercent: totalCum,
        cumulativeFinancialValue: (totalCum / 100) * node.budget,
        currentPeriodValue: (curr / 100) * node.budget,
        currentPeriodQuantity: currQty,
        prevCumulativeQuantity: prevQty,
        totalCumulativeQuantity: prevQty + currQty,
        contractorPercent: contP,
        contractorQuantity: contQ,
        consultantPercent: consP,
        consultantQuantity: consQ,
        employerPercent: empP,
        employerQuantity: empQ,
        contractorValue: (contP / 100) * node.budget,
        consultantValue: (consP / 100) * node.budget,
        employerValue: (empP / 100) * node.budget
      };

      return { 
        prev, 
        last, 
        curr, 
        prevQty, 
        currQty,
        contP,
        contQ,
        consP,
        consQ,
        empP,
        empQ
      };
    };

    const rootNodes = projectNodes.filter(n => !n.parentId);
    rootNodes.forEach(rn => calculate(rn.id));

    return metrics;
  }, [activeStatement, projectStatements, projectNodes]);

  // Helper to calculate totals for a specific statement (History Tab)
  const getStatementStats = (statement: CbsStatement) => {
    let currentTotal = 0;
    let weightedProgress = 0;

    statement.values.forEach(v => {
      const node = projectNodes.find(n => n.id === v.cbsId);
      if (node) {
        // Only leaf nodes contribute to the direct sum of progress
        const isLeaf = !projectNodes.some(child => child.parentId === node.id);
        if (isLeaf) {
          currentTotal += (v.currentProgressPercent / 100) * node.budget;
          weightedProgress += (v.currentProgressPercent * node.weightPercent) / 100;
        }
      }
    });

    return { currentTotal, weightedProgress };
  };

  // Stats for the active statement (Details Tab)
  const stats = useMemo(() => {
    if (!activeStatement || Object.keys(nodeMetrics).length === 0) return {
      currentTotal: 0,
      totalProgress: 0,
      contractorTotal: 0,
      contractorProgress: 0,
      consultantTotal: 0,
      consultantProgress: 0,
      employerTotal: 0,
      employerProgress: 0
    };
    
    let currentTotal = 0;
    let totalWeightedProgress = 0;
    let contractorTotal = 0;
    let contractorProgress = 0;
    let consultantTotal = 0;
    let consultantProgress = 0;
    let employerTotal = 0;
    let employerProgress = 0;

    projectNodes.forEach(node => {
      const isLeaf = !projectNodes.some(n => n.parentId === node.id);
      if (isLeaf) {
        const m = nodeMetrics[node.id];
        if (m) {
          currentTotal += m.currentPeriodValue || 0;
          totalWeightedProgress += ((m.currentPeriodPercent || 0) * (node.weightPercent || 0)) / 100;
          contractorTotal += m.contractorValue || 0;
          contractorProgress += ((m.contractorPercent || 0) * (node.weightPercent || 0)) / 100;
          consultantTotal += m.consultantValue || 0;
          consultantProgress += ((m.consultantPercent || 0) * (node.weightPercent || 0)) / 100;
          employerTotal += m.employerValue || 0;
          employerProgress += ((m.employerPercent || 0) * (node.weightPercent || 0)) / 100;
        }
      }
    });

    return {
      currentTotal,
      totalProgress: totalWeightedProgress,
      contractorTotal,
      contractorProgress,
      consultantTotal,
      consultantProgress,
      employerTotal,
      employerProgress
    };
  }, [nodeMetrics, projectNodes, activeStatement]);

  // Real-time summary statistics for the history section
  const historyStats = useMemo(() => {
    // Total Contract Amount (based on CBS root nodes)
    const rootNodes = projectNodes.filter(n => !n.parentId);
    const calculatedBudget = rootNodes.reduce((sum, n) => sum + (n.budget || 0), 0);
    const totalContract = calculatedBudget > 0 ? calculatedBudget : (currentProject?.initialBudget || 0);

    // Cumulative total of all statements (sum of their current periods)
    let cumulativeAmount = 0;
    projectStatements.forEach(s => {
      const { currentTotal } = getStatementStats(s);
      cumulativeAmount += currentTotal;
    });

    // Overall progress percent
    const overallProgress = totalContract > 0 ? (cumulativeAmount / totalContract) * 100 : 0;

    // Remaining amount of contract
    const remainingAmount = Math.max(0, totalContract - cumulativeAmount);

    return {
      totalContract,
      cumulativeAmount,
      overallProgress,
      remainingAmount
    };
  }, [projectNodes, currentProject, projectStatements]);

  const isEditable = useMemo(() => {
    if (!activeStatement || !currentUser) return false;
    if (activeStatementId === 'TEMP_DRAFT') return true;

    // SYSTEM_ADMIN can always edit in any condition
    if (currentUser.role === 'SYSTEM_ADMIN') return true;

    if (activeStatement.isFinalFrozen) return false;

    // Only the current assignee can edit
    // This ensures that when a statement is sent (and the assigneeId changes), 
    // the sender (previous assignee) can still see the details but cannot edit them.
    if (activeStatement.assigneeId === currentUser.id) {
      return true;
    }

    // If there is no assignee at all (e.g., initial state), check if user is in owner org
    if (!activeStatement.assigneeId && activeStatement.ownerOrgId === currentUser.orgId) {
      return true;
    }

    return false;
  }, [activeStatement, currentUser, activeStatementId]);

  // Determine role key from user title and organization (identical to TechnicalOffice)
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

  const filterWorkflowUsers = useCallback((users: SystemUser[], targetUser?: SystemUser | null) => {
    const userToEvaluate = targetUser !== undefined ? targetUser : currentUser;
    if (!userToEvaluate) return users;
    
    const isCurrentUser = (u: SystemUser) =>
      u.id === userToEvaluate.id ||
      (userToEvaluate.username && u.username === userToEvaluate.username);

    const isSystemAdmin = userToEvaluate.role === 'SYSTEM_ADMIN';
    if (isSystemAdmin) {
      return users.filter(u => u.id !== 'admin' && !isCurrentUser(u));
    }

    const ut = (userToEvaluate.jobTitle || "").trim();
    const ul = (userToEvaluate.jobLevel || "").trim();
    
    const isCurrentUserPM = userToEvaluate.role === 'ORG_ADMIN' || ut.includes('مدیر پروژه') || ul.includes('مدیر پروژه') || userToEvaluate.username === 'e-pm' || userToEvaluate.id === 'e-pm';
    const isCurrentUserWorkshopManager = ut.includes('سرپرست کارگاه') || ul.includes('سرپرست کارگاه');
    
    const isExpertOrUnitSupervisor = (
      ut.includes("کارشناس") || ul.includes("کارشناس") ||
      ut.includes("سرپرست واحد") || ul.includes("سرپرست واحد")
    );

    return users.filter(u => {
      if (u.id === 'admin') return false;
      if (isCurrentUser(u)) return false;
      
      const isSameOrg = u.orgId === userToEvaluate.orgId;
      const isTargetPM = u.role === 'ORG_ADMIN' || (u.jobTitle || '').includes('مدیر پروژه') || (u.jobLevel || '').includes('مدیر پروژه') || u.username === 'e-pm' || u.id === 'e-pm';
      const isTargetWorkshopManager = (u.jobTitle || '').includes('سرپرست کارگاه') || (u.jobLevel || '').includes('سرپرست کارگاه');

      // Rule: In all organizations, except for the Workshop Manager, no other users should see the Project Manager in the recipient section.
      // Exception: Project Managers sending to another organization must see the other organization's Project Manager.
      if (isTargetPM && !isCurrentUserWorkshopManager && !(isCurrentUserPM && !isSameOrg)) {
        return false;
      }

      if (isSameOrg) {
        if (isExpertOrUnitSupervisor) {
          // Experts and Unit Supervisors see all users of their organization except the Project Manager
          return !isTargetPM;
        }
        if (isCurrentUserPM || isCurrentUserWorkshopManager) {
          // Workshop Managers and Project Managers see all users of their organization
          return true;
        }
        // Fallback for same-organization
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
  }, [currentUser]);

  const eligibleUsers = useMemo(() => {
    if (!workflowActionType || !currentUser) return [];
    
    const allSystemUsers = SystemAdminService.getUsers().filter(u => u.isActive);
    const orgs = SystemAdminService.getOrganizations();
    const isSystemAdmin = currentUser.role === 'SYSTEM_ADMIN';

    if (
      workflowActionType === "SUBMIT" ||
      workflowActionType === "REASSIGN" ||
      workflowActionType === "APPROVE" ||
      workflowActionType === "REJECT" ||
      workflowActionType === "FINAL_APPROVE" ||
      workflowActionType === "UNFREEZE_BY_VARIATION"
    ) {
      let users = allSystemUsers;
      if (!isSystemAdmin) {
        users = users.filter(u => u.orgId === currentUser.orgId);
      }
      return filterWorkflowUsers(users, currentUser);
    } else if (
      workflowActionType === "SEND_TO_CONSULTANT" ||
      workflowActionType === "RETURN_TO_CONSULTANT"
    ) {
      if (isSystemAdmin) {
        return filterWorkflowUsers(allSystemUsers, currentUser);
      } else {
        const consultantOrg = orgs.find(o => o.type === OrganizationType.CONSULTANT);
        if (consultantOrg) {
          const users = allSystemUsers.filter(u => u.orgId === consultantOrg.id);
          return filterWorkflowUsers(users, currentUser);
        }
      }
    } else if (workflowActionType === "SEND_TO_EMPLOYER") {
      if (isSystemAdmin) {
        return filterWorkflowUsers(allSystemUsers, currentUser);
      } else {
        const employerOrg = orgs.find(o => o.type === OrganizationType.EMPLOYER);
        if (employerOrg) {
          const users = allSystemUsers.filter(u => u.orgId === employerOrg.id);
          return filterWorkflowUsers(users, currentUser);
        }
      }
    } else if (workflowActionType === "RETURN_TO_CONTRACTOR") {
      if (isSystemAdmin) {
        return filterWorkflowUsers(allSystemUsers, currentUser);
      } else {
        const targetOrgId = workflowItem?.ownerOrgId;
        const contractorOrg = targetOrgId
          ? orgs.find(o => o.id === targetOrgId)
          : orgs.find(o => o.type === OrganizationType.CONTRACTOR);
        if (contractorOrg) {
          const users = allSystemUsers.filter(u => u.orgId === contractorOrg.id);
          return filterWorkflowUsers(users, currentUser);
        }
      }
    }

    return [];
  }, [workflowActionType, workflowItem, currentUser, filterWorkflowUsers]);



  // --- Handlers ---
  const handleDelete = () => {
    if (!deleteId) return;
    
    setAllStatements(prev => {
      const updated = prev.filter(s => s.id !== deleteId);
      localStorage.setItem('hamyar_cbs_statements', JSON.stringify(updated));
      return updated;
    });

    if (activeStatementId === deleteId) {
      setActiveStatementId(null);
      setActiveTab('history');
    }
    
    setIsDeleteModalOpen(false);
    setDeleteId(null);
    showToast('صورت‌وضعیت مورد نظر با موفقیت حذف گردید.', 'success');
  };

  const openEditModal = (statement: CbsStatement) => {
    setEditingStatement(statement);
    setEditNumber(statement.number || '');
    setEditDate(statement.date || '');
    setEditStartDate(statement.startDate || statement.date || '');
    setEditEndDate(statement.endDate || statement.date || '');
    setEditDescription(statement.description || '');
    setEditStatus(statement.status || WorkflowStatus.DRAFT);
    setEditIsFinalFrozen(!!statement.isFinalFrozen);
    setEditAssigneeId(statement.assigneeId || '');
    setIsEditModalOpen(true);
  };

  const handleConfirmEdit = () => {
    if (!editingStatement) return;
    if (!editNumber.trim()) {
      showToast('لطفاً شماره صورت‌وضعیت را وارد کنید.', 'error');
      return;
    }

    const assigneeUser = orgUsers.find(u => u.id === editAssigneeId);
    const assigneeOrg = assigneeUser?.orgId ? SystemAdminService.getOrganization(assigneeUser.orgId) : undefined;
    const assigneeNameWithTitle = assigneeUser ? formatUserDisplayFormal(assigneeUser, assigneeOrg) : undefined;

    setAllStatements(prev => {
      const updated = prev.map(s => {
        if (s.id === editingStatement.id) {
          return {
            ...s,
            number: editNumber,
            date: editDate,
            startDate: editStartDate,
            endDate: editEndDate,
            description: editDescription,
            status: currentUser?.role === 'SYSTEM_ADMIN' ? editStatus : s.status,
            isFinalFrozen: currentUser?.role === 'SYSTEM_ADMIN' ? editIsFinalFrozen : s.isFinalFrozen,
            assigneeId: currentUser?.role === 'SYSTEM_ADMIN' ? (editAssigneeId || undefined) : s.assigneeId,
            assigneeName: currentUser?.role === 'SYSTEM_ADMIN' ? (assigneeNameWithTitle || (editAssigneeId ? s.assigneeName : undefined)) : s.assigneeName,
          };
        }
        return s;
      });
      localStorage.setItem('hamyar_cbs_statements', JSON.stringify(updated));
      return updated;
    });

    if (draftNewStatement && editingStatement.id === 'TEMP_DRAFT') {
      setDraftNewStatement(prev => prev ? {
        ...prev,
        number: editNumber,
        date: editDate,
        startDate: editStartDate,
        endDate: editEndDate,
        description: editDescription,
      } : null);
    }

    setIsEditModalOpen(false);
    setEditingStatement(null);
    showToast('مشخصات صورت‌وضعیت با موفقیت ویرایش گردید.', 'success');
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  const handleToggleExpand = (id: string) => {
    const next = new Set(expandedNodes);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedNodes(next);
  };

  const handleDateInput = (value: string, setter: (val: string) => void) => {
    let clean = value.replace(/[^0-9/]/g, '');
    const digits = clean.replace(/\//g, '');
    let formatted = '';
    if (digits.length > 0) {
      formatted += digits.slice(0, 4);
    }
    if (digits.length > 4) {
      formatted += '/' + digits.slice(4, 6);
    }
    if (digits.length > 6) {
      formatted += '/' + digits.slice(6, 8);
    }
    setter(formatted);
  };

  const createNewStatement = () => {
    // Check if any previous statement is not final frozen (bypassed for SYSTEM_ADMIN)
    if (currentUser?.role !== 'SYSTEM_ADMIN') {
      const unapprovedStatements = projectStatements.filter(s => !s.isFinalFrozen);
      if (unapprovedStatements.length > 0) {
        const pendingNums = unapprovedStatements.map(s => s.number).sort((a, b) => parseInt(a) - parseInt(b)).join('، ');
        showToast(`تا زمانی که صورت‌وضعیت‌های قبلی (شماره ${pendingNums}) به تایید نهایی (کارفرما) نرسیده باشند، امکان ثبت صورت‌وضعیت جدید وجود ندارد.`, 'error');
        return;
      }
    }

    const nextNum = projectStatements.length + 1;
    setFormNumber(nextNum.toString());
    setFormDate(new Date().toLocaleDateString('fa-IR'));
    setFormStartDate(new Date().toLocaleDateString('fa-IR'));
    setFormEndDate(new Date().toLocaleDateString('fa-IR'));
    setFormDescription(`صورت وضعیت شکست کار شماره ${nextNum}`);
    setIsCreateModalOpen(true);
  };

  const handleConfirmCreate = () => {
    if (!formNumber.trim()) {
      showToast('لطفاً شماره صورت‌وضعیت را وارد کنید.', 'error');
      return;
    }
    
    // Calculate cumulative totals from all approved statements up to now
    const approvedStatements = projectStatements.filter(s => s.isFinalFrozen || (s.status as any) === 'APPROVED' || s.status === WorkflowStatus.APPROVED_INTERNAL || s.status === WorkflowStatus.APPROVED_BY_CONSULTANT || s.status === WorkflowStatus.IN_EMPLOYER_REVIEW);
    const cumulativeTotals: Record<string, number> = {};
    approvedStatements.forEach(s => {
      s.values.forEach(v => {
        cumulativeTotals[v.cbsId] = (cumulativeTotals[v.cbsId] || 0) + v.currentProgressPercent;
      });
    });

    const orgs = SystemAdminService.getOrganizations();
    const contractorOrg = orgs.find(o => o.type === OrganizationType.CONTRACTOR);
    const activeUser = currentUser || SystemAdminService.getCurrentUser();
    const userOrg = activeUser?.orgId ? SystemAdminService.getOrganization(activeUser.orgId) : undefined;
    const isContractorUser = userOrg?.type === OrganizationType.CONTRACTOR;
    const initialOrgId = isContractorUser ? activeUser!.orgId : (contractorOrg?.id || 'org-3');

    const newStatement: CbsStatement = {
      id: 'TEMP_DRAFT',
      projectId: selectedProjectId,
      number: formNumber,
      date: formDate,
      startDate: formStartDate,
      endDate: formEndDate,
      description: formDescription,
      status: WorkflowStatus.DRAFT,
      values: projectNodes.map(n => ({
        cbsId: n.id,
        currentProgressPercent: 0,
        currentQuantity: 0,
        previousProgressPercent: cumulativeTotals[n.id] || 0,
        contractorProgressPercent: 0,
        contractorQuantity: 0,
        consultantProgressPercent: 0,
        consultantQuantity: 0,
        employerProgressPercent: 0,
        employerQuantity: 0
      })),
      ownerOrgId: initialOrgId,
      currentOrgId: initialOrgId,
      createdById: activeUser?.id || 'majid',
      assigneeId: activeUser?.id || 'majid',
      assigneeName: activeUser ? formatUserDisplayFormal(activeUser, userOrg) : 'کارشناس دفتر فنی',
      workflowHistory: [],
      isFinalFrozen: false
    };

    setDraftNewStatement(newStatement);
    setActiveStatementId('TEMP_DRAFT');
    setActiveTab('details');
    setIsCreateModalOpen(false);
  };

  const updateProgress = (cbsId: string, value: number, type: 'percent' | 'quantity', targetRole?: 'CONTRACTOR' | 'CONSULTANT' | 'EMPLOYER') => {
    if (!activeStatement) return;

    const currentNum = parseInt(activeStatement.number) || 1;
    const prevStatements = projectStatements
      .filter(s => (parseInt(s.number) || 0) < currentNum);
    
    let prevPercent = 0;
    prevStatements.forEach(s => {
      const v = s.values.find(val => val.cbsId === cbsId);
      if (v) {
        prevPercent += v.currentProgressPercent || 0;
      }
    });

    const node = projectNodes.find(n => n.id === cbsId);
    if (!node) return;

    const calcVals = cbsCalculatedValues[node.id] || { quantity: 0, unitPrice: 0, budget: 0 };
    const nodeTotalQty = (node.quantity && node.quantity > 0) ? node.quantity : calcVals.quantity;

    const maxAllowedPercent = Math.max(0, 100 - prevPercent);

    let finalPercent = 0;
    let finalQuantity = 0;

    if (type === 'percent') {
      if (value > maxAllowedPercent) {
        alert(`درصد پیشرفت تجمعی این فعالیت نمی‌تواند از ۱۰۰٪ بیشتر شود. حداکثر درصد مجاز برای این دوره: ${maxAllowedPercent.toFixed(1)}٪`);
        finalPercent = maxAllowedPercent;
      } else if (value < 0) {
        finalPercent = 0;
      } else {
        finalPercent = value;
      }
      finalQuantity = nodeTotalQty > 0 ? (finalPercent / 100) * nodeTotalQty : 0;
    } else {
      const maxAllowedQuantity = nodeTotalQty > 0 ? (maxAllowedPercent / 100) * nodeTotalQty : 0;
      if (maxAllowedQuantity > 0 && value > maxAllowedQuantity) {
        alert(`درصد پیشرفت تجمعی این فعالیت نمی‌تواند از ۱۰۰٪ بیشتر شود. حداکثر مقدار مجاز برای این دوره: ${maxAllowedQuantity.toFixed(2)}`);
        finalQuantity = maxAllowedQuantity;
        finalPercent = maxAllowedPercent;
      } else if (value < 0) {
        finalQuantity = 0;
        finalPercent = 0;
      } else {
        finalQuantity = value;
        finalPercent = nodeTotalQty > 0 ? (value / nodeTotalQty) * 100 : 0;
        if (finalPercent > maxAllowedPercent) {
          finalPercent = maxAllowedPercent;
          finalQuantity = (maxAllowedPercent / 100) * nodeTotalQty;
        }
      }
    }

    const defaultUserOrgType = (currentUser ? SystemAdminService.getOrganization(currentUser.orgId)?.type : 'CONTRACTOR') as 'CONTRACTOR' | 'CONSULTANT' | 'EMPLOYER';
    const effectiveRole = targetRole || defaultUserOrgType || 'CONTRACTOR';

    if (activeStatementId === 'TEMP_DRAFT' && draftNewStatement) {
      setDraftNewStatement(prev => {
        if (!prev) return prev;
        const exists = prev.values.some(v => v.cbsId === cbsId);
        let newValues: CbsStatementValue[];
        if (exists) {
          newValues = prev.values.map(v => {
            if (v.cbsId === cbsId) {
              let updated = { ...v };
              if (effectiveRole === 'CONTRACTOR') {
                updated.contractorProgressPercent = finalPercent;
                updated.contractorQuantity = finalQuantity;
                updated.currentProgressPercent = finalPercent;
                updated.currentQuantity = finalQuantity;
              } else if (effectiveRole === 'CONSULTANT') {
                updated.consultantProgressPercent = finalPercent;
                updated.consultantQuantity = finalQuantity;
                updated.currentProgressPercent = finalPercent;
                updated.currentQuantity = finalQuantity;
              } else if (effectiveRole === 'EMPLOYER') {
                updated.employerProgressPercent = finalPercent;
                updated.employerQuantity = finalQuantity;
                updated.currentProgressPercent = finalPercent;
                updated.currentQuantity = finalQuantity;
              }
              return updated;
            }
            return v;
          });
        } else {
          const newItem: CbsStatementValue = {
            cbsId,
            currentProgressPercent: finalPercent,
            currentQuantity: finalQuantity,
            previousProgressPercent: prevPercent,
            contractorProgressPercent: effectiveRole === 'CONTRACTOR' ? finalPercent : 0,
            contractorQuantity: effectiveRole === 'CONTRACTOR' ? finalQuantity : 0,
            consultantProgressPercent: effectiveRole === 'CONSULTANT' ? finalPercent : undefined,
            consultantQuantity: effectiveRole === 'CONSULTANT' ? finalQuantity : undefined,
            employerProgressPercent: effectiveRole === 'EMPLOYER' ? finalPercent : undefined,
            employerQuantity: effectiveRole === 'EMPLOYER' ? finalQuantity : undefined,
          };
          newValues = [...prev.values, newItem];
        }
        return { ...prev, values: newValues };
      });
      return;
    }

    setAllStatements(prev => prev.map(s => {
      if (s.id === activeStatementId) {
        const exists = s.values.some(v => v.cbsId === cbsId);
        let newValues: CbsStatementValue[];
        if (exists) {
          newValues = s.values.map(v => {
            if (v.cbsId === cbsId) {
              let updated = { ...v };
              if (effectiveRole === 'CONTRACTOR') {
                updated.contractorProgressPercent = finalPercent;
                updated.contractorQuantity = finalQuantity;
                if (!s.status || s.status === WorkflowStatus.DRAFT || s.status === WorkflowStatus.IN_REVIEW || s.status === WorkflowStatus.APPROVED_INTERNAL) {
                  updated.currentProgressPercent = finalPercent;
                  updated.currentQuantity = finalQuantity;
                }
              } else if (effectiveRole === 'CONSULTANT') {
                updated.consultantProgressPercent = finalPercent;
                updated.consultantQuantity = finalQuantity;
                if (s.status === WorkflowStatus.SENT_TO_CONSULTANT || s.status === WorkflowStatus.IN_CONSULTANT_REVIEW || s.status === WorkflowStatus.APPROVED_BY_CONSULTANT) {
                  updated.currentProgressPercent = finalPercent;
                  updated.currentQuantity = finalQuantity;
                }
              } else if (effectiveRole === 'EMPLOYER') {
                updated.employerProgressPercent = finalPercent;
                updated.employerQuantity = finalQuantity;
                updated.currentProgressPercent = finalPercent;
                updated.currentQuantity = finalQuantity;
              }
              return updated;
            }
            return v;
          });
        } else {
          const newItem: CbsStatementValue = {
            cbsId,
            currentProgressPercent: finalPercent,
            currentQuantity: finalQuantity,
            previousProgressPercent: prevPercent,
            contractorProgressPercent: effectiveRole === 'CONTRACTOR' ? finalPercent : 0,
            contractorQuantity: effectiveRole === 'CONTRACTOR' ? finalQuantity : 0,
            consultantProgressPercent: effectiveRole === 'CONSULTANT' ? finalPercent : undefined,
            consultantQuantity: effectiveRole === 'CONSULTANT' ? finalQuantity : undefined,
            employerProgressPercent: effectiveRole === 'EMPLOYER' ? finalPercent : undefined,
            employerQuantity: effectiveRole === 'EMPLOYER' ? finalQuantity : undefined,
          };
          newValues = [...s.values, newItem];
        }
        return { ...s, values: newValues };
      }
      return s;
    }));
  };

  const handleSyncAllContractorToConsultant = () => {
    if (!activeStatement) return;
    if (!window.confirm('آیا مایلید کلیه مقادیر و درصدهای ادعایی پیمانکار عیناً به عنوان تایید مشاور ثبت شود؟')) return;

    const updater = (values: CbsStatementValue[]) => {
      return values.map(v => ({
        ...v,
        consultantProgressPercent: v.contractorProgressPercent !== undefined ? v.contractorProgressPercent : v.currentProgressPercent,
        consultantQuantity: v.contractorQuantity !== undefined ? v.contractorQuantity : v.currentQuantity,
        currentProgressPercent: v.contractorProgressPercent !== undefined ? v.contractorProgressPercent : v.currentProgressPercent,
        currentQuantity: v.contractorQuantity !== undefined ? v.contractorQuantity : v.currentQuantity
      }));
    };

    if (activeStatementId === 'TEMP_DRAFT' && draftNewStatement) {
      setDraftNewStatement(prev => prev ? { ...prev, values: updater(prev.values) } : prev);
    } else {
      setAllStatements(prev => prev.map(s => s.id === activeStatementId ? { ...s, values: updater(s.values) } : s));
    }
    showToast('کلیه مقادیر ادعایی پیمانکار به بخش تایید مشاور کپی شد.', 'success');
  };

  const handleSyncAllConsultantToEmployer = () => {
    if (!activeStatement) return;
    if (!window.confirm('آیا مایلید کلیه مقادیر و درصدهای تایید مشاور عیناً به عنوان تایید کارفرما ثبت شود؟')) return;

    const updater = (values: CbsStatementValue[]) => {
      return values.map(v => {
        const p = v.consultantProgressPercent !== undefined ? v.consultantProgressPercent : (v.contractorProgressPercent !== undefined ? v.contractorProgressPercent : v.currentProgressPercent);
        const q = v.consultantQuantity !== undefined ? v.consultantQuantity : (v.contractorQuantity !== undefined ? v.contractorQuantity : v.currentQuantity);
        return {
          ...v,
          employerProgressPercent: p,
          employerQuantity: q,
          currentProgressPercent: p,
          currentQuantity: q
        };
      });
    };

    if (activeStatementId === 'TEMP_DRAFT' && draftNewStatement) {
      setDraftNewStatement(prev => prev ? { ...prev, values: updater(prev.values) } : prev);
    } else {
      setAllStatements(prev => prev.map(s => s.id === activeStatementId ? { ...s, values: updater(s.values) } : s));
    }
    showToast('کلیه مقادیر تایید مشاور به بخش مصوب کارفرما کپی شد.', 'success');
  };

  const saveStatements = () => {
    const activeUser = currentUser || SystemAdminService.getCurrentUser();
    const activeUserOrg = activeUser?.orgId ? SystemAdminService.getOrganization(activeUser.orgId) : undefined;
    const formalName = activeUser ? formatUserDisplayFormal(activeUser, activeUserOrg) : 'کارشناس دفتر فنی';

    if (activeStatementId === 'TEMP_DRAFT' && draftNewStatement) {
      const realId = Math.random().toString(36).substr(2, 9);
      const savedStatement: CbsStatement = {
        ...draftNewStatement,
        id: realId,
        createdById: activeUser?.id || draftNewStatement.createdById || 'majid',
        assigneeId: activeUser?.id || draftNewStatement.assigneeId,
        assigneeName: formalName,
        status: WorkflowStatus.DRAFT,
      };
      const updatedStatements = [...allStatements, savedStatement];
      setAllStatements(updatedStatements);
      localStorage.setItem('hamyar_cbs_statements', JSON.stringify(updatedStatements));
      setDraftNewStatement(null);
      setActiveStatementId(realId);
      
      const successMsg = 'ثبت اطلاعات با موفقیت انجام شد و صورت وضعیت جدید به تاریخچه افزوده شد.';
      showToast(successMsg, 'success');
      try {
        alert(successMsg);
      } catch (e) {
        console.warn('Native alert blocked inside iframe sandbox:', e);
      }
    } else {
      const updated = allStatements.map(s => {
        if (s.id === activeStatementId) {
          const isDraft = (s.status === WorkflowStatus.DRAFT || !s.status);
          return {
            ...s,
            assigneeId: s.assigneeId || (isDraft ? activeUser?.id : s.assigneeId),
            assigneeName: s.assigneeName || (isDraft ? formalName : s.assigneeName),
            createdById: s.createdById || activeUser?.id,
          };
        }
        return s;
      });
      setAllStatements(updated);
      localStorage.setItem('hamyar_cbs_statements', JSON.stringify(updated));
      const successMsg = 'تغییرات صورت وضعیت با موفقیت ذخیره شد.';
      showToast(successMsg, 'success');
      try {
        alert(successMsg);
      } catch (e) {
        console.warn('Native alert blocked inside iframe sandbox:', e);
      }
    }
    setActiveTab('history');
  };

  const openWorkflowModal = (item: CbsStatement, action: WorkflowAction) => {
    setWorkflowItem(item);
    setWorkflowActionType(action);
    setWorkflowComment("");
    setWorkflowAssignee("");
    const isNoSigAction = action === 'REASSIGN' || action === 'REJECT' || action === 'RETURN_TO_CONTRACTOR' || action === 'RETURN_TO_CONSULTANT';
    const hrSig = HRService.getUserSignature(currentUser) || currentUser?.signature;
    setAttachWorkflowSignature(!isNoSigAction && !!hrSig);
    setWorkflowModalOpen(true);

    const isSystemAdmin = currentUser?.role === "SYSTEM_ADMIN";

    if (
      action === "SUBMIT" ||
      action === "REASSIGN" ||
      action === "APPROVE" ||
      action === "REJECT" ||
      action === "FINAL_APPROVE"
    ) {
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
          if (action !== "RETURN_TO_CONSULTANT") {
            showToast("سازمان مشاور تعریف نشده است.", 'error');
          }
        }
      }
    } else if (action === "SEND_TO_EMPLOYER") {
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
          showToast("سازمان کارفرما تعریف نشده است.", 'error');
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

  const getRoleSignatory = useCallback((roleKey: string, customStatement?: any) => {
    const users = SystemAdminService.getUsers();
    const proj = projects.find(p => String(p.id) === String(selectedProjectId)) || currentProject || {};
    const targetObj = customStatement || activeStatement || {};
    const history = (targetObj?.workflowHistory || []) as any[];

    const findEventForRole = (targetRoleKey: string): any => {
      const matchEvent = (e: any): boolean => {
        if (!e) return false;
        // Reassignment or Rejection is an internal task routing/status change, never an approval or signature
        if (e.action === 'REASSIGN' || e.action === 'REJECT') return false;

        const actorUser = users.find(u => u.id === e.actorUserId || u.fullName === e.actorName || u.username === e.actorName);
        const orgId = e.actorOrgId || actorUser?.orgId;
        const orgType = e.actorOrgType || (actorUser as any)?.orgType || (orgId ? SystemAdminService.getOrganization(orgId)?.type : undefined);

        const isConsultantOrg = orgType === OrganizationType.CONSULTANT || ((proj as any)?.consultantOrgId && String(orgId) === String((proj as any).consultantOrgId));
        const isEmployerOrg = orgType === OrganizationType.EMPLOYER || ((proj as any)?.employerOrgId && String(orgId) === String((proj as any).employerOrgId));
        const isContractorOrg = !isConsultantOrg && !isEmployerOrg;

        if ((e.action === 'RESUBMIT' || e.action === 'SUBMIT') && !isContractorOrg) return false;

        if (e.roleKey) {
          if (e.roleKey === targetRoleKey) return true;
          if (targetRoleKey === 'contractor_tech' && (e.roleKey === 'contractor_tech' || e.roleKey === 'permit_expert')) return true;
          if (targetRoleKey === 'contractor_head' && (e.roleKey === 'contractor_head' || e.roleKey === 'permit_head')) return true;
          if (targetRoleKey === 'contractor_site' && (e.roleKey === 'contractor_site' || e.roleKey === 'permit_site')) return true;
          if (targetRoleKey === 'consultant_tech' && e.roleKey === 'consultant_tech') return true;
          if (targetRoleKey === 'consultant_head' && e.roleKey === 'consultant_head') return true;
          if (targetRoleKey === 'consultant' && (e.roleKey === 'consultant' || e.roleKey === 'consultant_site' || e.roleKey === 'permit_consultant')) return true;
          if (targetRoleKey === 'employer_tech' && e.roleKey === 'employer_tech') return true;
          if (targetRoleKey === 'employer_head' && e.roleKey === 'employer_head') return true;
          if (targetRoleKey === 'employer' && (e.roleKey === 'employer' || e.roleKey === 'employer_site')) return true;
          return false;
        }

        const title = ((e.actorTitle || actorUser?.jobTitle || e.actorName || '') + ' ' + (actorUser?.jobLevel || '')).toLowerCase();

        // Strict boundary: If actor is expert / technical office, they can ONLY match contractor_tech
        const isExpertActor = title.includes('کارشناس') || title.includes('دفتر فنی') || title.includes('تهیه');
        if (isExpertActor) {
          if (targetRoleKey !== 'contractor_tech' && targetRoleKey !== 'permit_expert') return false;
        }

        if (targetRoleKey === 'contractor_tech') {
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

        if (targetRoleKey === 'contractor_head') {
          if (e.roleKey === 'contractor_head' || e.roleKey === 'permit_head') return true;
          if (e.action === 'CREATE' || e.action === 'SUBMIT' || e.action === 'RESUBMIT') return false;
          if (title.includes('کارشناس') || title.includes('دفتر فنی') || title.includes('تهیه') || title.includes('تنظیم')) return false;
          if (e.action === 'APPROVE' || e.action === 'SIGN' || e.action === 'REPORT_SIGNATURE') {
            if (!isContractorOrg) return false;
            if (title.includes('سرپرست کارگاه') || title.includes('مدیر پروژه') || title.includes('رئیس کارگاه')) return false;
            return title.includes('سرپرست واحد') || title.includes('سرپرست دفتر') || title.includes('رئیس دفتر') || title.includes('مدیر دفتر') || title.includes('رئیس واحد') || title.includes('سرپرست دفتر فنی');
          }
          return false;
        }

        if (targetRoleKey === 'contractor_site') {
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

        if (targetRoleKey === 'consultant') {
          if (e.roleKey === 'consultant' || e.roleKey === 'consultant_site' || e.roleKey === 'permit_consultant') return true;
          if (e.action === 'SEND_TO_EMPLOYER' || (e.action === 'APPROVE' && (e.toStatus === WorkflowStatus.APPROVED_BY_CONSULTANT || e.toStatus === WorkflowStatus.SENT_TO_EMPLOYER)) || e.action === 'RETURN_TO_CONTRACTOR' || e.action === 'SIGN' || e.action === 'REPORT_SIGNATURE') {
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

        if (targetRoleKey === 'employer') {
          if (e.roleKey === 'employer' || e.roleKey === 'employer_site') return true;
          if (e.action === 'FINAL_APPROVE' || (e.action === 'APPROVE' && (e.toStatus === WorkflowStatus.APPROVED_BY_EMPLOYER || targetObj?.isFinalFrozen)) || e.action === 'SIGN' || e.action === 'REPORT_SIGNATURE' || e.action === 'RETURN_TO_CONSULTANT' || e.action === 'REASSIGN') {
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
      const allUsers = SystemAdminService.getUsers();
      const actorUser = allUsers.find(u => u.id === matchedEv.actorUserId || u.fullName === matchedEv.actorName);
      const actorOrg = actorUser?.orgId ? SystemAdminService.getOrganization(actorUser.orgId) : undefined;
      const formalName = actorUser ? formatUserDisplayFormal(actorUser, actorOrg) : (matchedEv.actorName || 'امضاء کننده گزارش');
      const sig = matchedEv.signature;
      return {
        name: formalName,
        title: matchedEv.actorTitle || actorUser?.jobTitle || 'امضاء الکترونیکی',
        signature: sig,
        date: new Date(matchedEv.timestamp).toLocaleDateString('fa-IR')
      };
    }

    if (roleKey === 'contractor_tech') {
      return { name: 'کارشناس / سرپرست دفتر فنی', title: 'بخش مهندسی و دفتر فنی پیمانکار', signature: undefined, date: undefined };
    }
    if (roleKey === 'contractor_head') {
      return { name: 'سرپرست واحد فنی', title: 'سرپرست واحد فنی پیمانکار', signature: undefined, date: undefined };
    }
    if (roleKey === 'contractor_site') {
      return { name: 'سرپرست کارگاه / مدیر پروژه', title: 'سرپرست کارگاه پیمانکار', signature: undefined, date: undefined };
    }
    if (roleKey === 'consultant_tech') {
      return { name: 'کارشناس / ناظر مقیم', title: 'دستگاه نظارت و مشاور', signature: undefined, date: undefined };
    }
    if (roleKey === 'consultant_head') {
      return { name: 'سرپرست واحد نظارت', title: 'دستگاه نظارت و مشاور', signature: undefined, date: undefined };
    }
    if (roleKey === 'consultant') {
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
  }, [selectedProjectId, projects, currentProject, activeStatement]);

  const renderSigCard = (label: string, data: { name?: string; title?: string; signature?: string; date?: string } | null) => (
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
            <CheckCircle2 size={8} />
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

  const handleOpenReportModal = (statement: CbsStatement) => {
    setReportModalStatement(statement);
    setIsReportModalOpen(true);
  };

  const handleWorkflowSubmit = () => {
    if (!workflowItem || !workflowActionType || !currentUser) return;

    const hrSig = HRService.getUserSignature(currentUser) || currentUser?.signature;

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
        const contractOrgId = workflowItem.ownerOrgId;
        const contractorOrg = contractOrgId
          ? orgs.find((o) => o.id === contractOrgId)
          : orgs.find((o) => o.type === OrganizationType.CONTRACTOR);
        if (contractorOrg) targetOrgId = contractorOrg.id;
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
        const assigneeUser = eligibleUsers.find((u) => u.id === workflowAssignee) || orgUsers.find((u) => u.id === workflowAssignee) || SystemAdminService.getUsers().find((u) => u.id === workflowAssignee);
        const assigneeOrg = assigneeUser?.orgId ? SystemAdminService.getOrganization(assigneeUser.orgId) : undefined;
        assigneeNameWithTitle = assigneeUser
          ? formatUserDisplayFormal(assigneeUser, assigneeOrg)
          : undefined;
      }

      const sigToAttach = attachWorkflowSignature && hrSig ? hrSig : undefined;

      const payload = {
        assigneeId: workflowAssignee,
        assigneeName: assigneeNameWithTitle,
        comment: workflowComment,
        targetOrgId: targetOrgId,
        attachSignature: !!attachWorkflowSignature,
        signature: sigToAttach,
        roleKey: getRoleKeyForUser(currentUser),
      };

      // Perform the action via central WorkflowService
      const updatedItem = WorkflowService.performAction(
        workflowItem as any,
        workflowActionType,
        currentUser,
        payload,
      ) as any;

      // Update state & localStorage
      const updatedStatements = allStatements.map((s) =>
        s.id === updatedItem.id ? (updatedItem as CbsStatement) : s,
      );
      setAllStatements(updatedStatements);
      localStorage.setItem(
        "hamyar_cbs_statements",
        JSON.stringify(updatedStatements),
      );

      // Close modal
      setWorkflowModalOpen(false);
      
      // Update activeStatement if currently selected
      if (activeStatementId === updatedItem.id) {
        setActiveStatementId(updatedItem.id);
      }
      
      const successMsg = `عملیات گردش کار (${WorkflowService.getActionLabel(workflowActionType, SystemAdminService.getOrganization(currentUser.orgId)?.type)}) با موفقیت انجام شد.`;
      showToast(successMsg, 'success');
    } catch (error: any) {
      showToast("خطا در انجام عملیات: " + error.message, 'error');
    }
  };

  const handlePrintCbsStatement = (statement: CbsStatement) => {
    const title = `گزارش تایید کارکرد صورت‌وضعیت شکست کار (CBS) شماره ${statement.number}`;
    
    // 1. Gather project details
    const projectTitle = currentProject?.title || "---";
    const projectEmployer = currentProject?.employerName || "---";
    const projectConsultant = currentProject?.consultantName || "---";
    const projectContractor = currentProject?.contractorName || "---";
    const projectBudget = currentProject?.initialBudget
      ? currentProject.initialBudget.toLocaleString("fa-IR") + " " + activeCurrency
      : "---";
    const projectTimeline =
      (currentProject?.startDate || "---") +
      " الی " +
      (currentProject?.endDate || "---");

    const statementPeriodStr = (statement.startDate && statement.endDate)
      ? `از ${statement.startDate} تا ${statement.endDate}`
      : (statement.startDate || statement.endDate || statement.date || "---");

    // 2. Compute statement metrics specifically for 'statement'
    const metrics: Record<string, {
      prevCumulativePercent: number;
      lastPeriodPercent: number;
      currentPeriodPercent: number;
      totalCumulativePercent: number;
      cumulativeFinancialValue: number;
      currentPeriodValue: number;
      currentPeriodQuantity: number;
      contractorPercent: number;
      contractorQuantity: number;
      consultantPercent: number;
      consultantQuantity: number;
      employerPercent: number;
      employerQuantity: number;
      contractorValue: number;
      consultantValue: number;
      employerValue: number;
    }> = {};

    const currentNum = parseInt(statement.number) || 1;
    const prevStatements = projectStatements
      .filter(s => (parseInt(s.number) || 0) < currentNum)
      .sort((a, b) => (parseInt(a.number) || 0) - (parseInt(b.number) || 0));
    
    const lastStatement = prevStatements[prevStatements.length - 1];

    const calculateNodeMetrics = (nodeId: string) => {
      const node = projectNodes.find(n => n.id === nodeId);
      if (!node) return { 
        prev: 0, 
        last: 0, 
        curr: 0,
        contP: 0,
        contQ: 0,
        consP: 0,
        consQ: 0,
        empP: 0,
        empQ: 0
      };

      const children = projectNodes.filter(n => n.parentId === nodeId);
      let prev = 0;
      let last = 0;
      let curr = 0;
      let currQty = 0;
      let contP = 0;
      let contQ = 0;
      let consP = 0;
      let consQ = 0;
      let empP = 0;
      let empQ = 0;

      if (children.length === 0) {
        prevStatements.forEach(s => {
          const v = s.values.find(val => val.cbsId === nodeId);
          if (v) {
            prev += v.currentProgressPercent || 0;
          }
        });
        
        if (lastStatement) {
          const v = lastStatement.values.find(val => val.cbsId === nodeId);
          if (v) last = v.currentProgressPercent || 0;
        }
        
        const v = statement.values.find(val => val.cbsId === nodeId);
        if (v) {
          curr = v.currentProgressPercent || 0;
          currQty = v.currentQuantity || 0;
          contP = v.contractorProgressPercent !== undefined ? v.contractorProgressPercent : curr;
          contQ = v.contractorQuantity !== undefined ? v.contractorQuantity : currQty;
          consP = v.consultantProgressPercent !== undefined ? v.consultantProgressPercent : contP;
          consQ = v.consultantQuantity !== undefined ? v.consultantQuantity : contQ;
          empP = v.employerProgressPercent !== undefined ? v.employerProgressPercent : consP;
          empQ = v.employerQuantity !== undefined ? v.employerQuantity : consQ;
        }
      } else {
        let totalPrevVal = 0;
        let totalLastVal = 0;
        let totalCurrVal = 0;
        let totalContVal = 0;
        let totalConsVal = 0;
        let totalEmpVal = 0;

        children.forEach(child => {
          const res = calculateNodeMetrics(child.id);
          totalPrevVal += (res.prev / 100) * child.budget;
          totalLastVal += (res.last / 100) * child.budget;
          totalCurrVal += (res.curr / 100) * child.budget;
          totalContVal += (res.contP / 100) * child.budget;
          totalConsVal += (res.consP / 100) * child.budget;
          totalEmpVal += (res.empP / 100) * child.budget;
        });

        if (node.budget > 0) {
          prev = (totalPrevVal / node.budget) * 100;
          last = (totalLastVal / node.budget) * 100;
          curr = (totalCurrVal / node.budget) * 100;
          contP = (totalContVal / node.budget) * 100;
          consP = (totalConsVal / node.budget) * 100;
          empP = (totalEmpVal / node.budget) * 100;
        }
      }

      const totalCum = prev + curr;
      metrics[nodeId] = {
        prevCumulativePercent: prev,
        lastPeriodPercent: last,
        currentPeriodPercent: curr,
        totalCumulativePercent: totalCum,
        cumulativeFinancialValue: (totalCum / 100) * node.budget,
        currentPeriodValue: (curr / 100) * node.budget,
        currentPeriodQuantity: currQty,
        contractorPercent: contP,
        contractorQuantity: contQ,
        consultantPercent: consP,
        consultantQuantity: consQ,
        employerPercent: empP,
        employerQuantity: empQ,
        contractorValue: (contP / 100) * node.budget,
        consultantValue: (consP / 100) * node.budget,
        employerValue: (empP / 100) * node.budget
      };

      return { 
        prev, 
        last, 
        curr, 
        contP, 
        contQ, 
        consP, 
        consQ, 
        empP, 
        empQ 
      };
    };

    const rootNodes = projectNodes.filter(n => !n.parentId);
    rootNodes.forEach(rn => calculateNodeMetrics(rn.id));

    // Calculate sum metrics
    let grossValueThisPeriod = 0;
    let contractorGrossValue = 0;
    let consultantGrossValue = 0;
    let employerGrossValue = 0;
    let weightedProgressThisPeriod = 0;

    projectNodes.forEach(node => {
      const isLeaf = !projectNodes.some(n => n.parentId === node.id);
      if (isLeaf) {
        const m = metrics[node.id];
        if (m) {
          grossValueThisPeriod += m.currentPeriodValue;
          contractorGrossValue += m.contractorValue;
          consultantGrossValue += m.consultantValue;
          employerGrossValue += m.employerValue;
          weightedProgressThisPeriod += (m.currentPeriodPercent * node.weightPercent) / 100;
        }
      }
    });

    // 3. Build HTML output
    const buildTreeHtmlRows = (parentId: string | null, depth = 0): string => {
      const children = projectNodes.filter(n => n.parentId === parentId);
      if (children.length === 0) return "";

      return children.map(node => {
        const hasChildren = projectNodes.some(n => n.parentId === node.id);
        const m = metrics[node.id] || {
          prevCumulativePercent: 0,
          lastPeriodPercent: 0,
          currentPeriodPercent: 0,
          totalCumulativePercent: 0,
          cumulativeFinancialValue: 0,
          currentPeriodValue: 0,
          currentPeriodQuantity: 0,
          contractorPercent: 0,
          contractorQuantity: 0,
          consultantPercent: 0,
          consultantQuantity: 0,
          employerPercent: 0,
          employerQuantity: 0
        };

        const isLeafNode = !projectNodes.some(n => n.parentId === node.id);
        const displayUnitStr = isLeafNode ? (node.unit || "---") : "---";
        const calcVals = cbsCalculatedValues[node.id] || { quantity: 0, unitPrice: 0, budget: 0 };
        const displayQtyStr = calcVals.quantity > 0 ? (Number(calcVals.quantity.toFixed(2))).toLocaleString('fa-IR') : "---";
        const displayPriceStr = calcVals.unitPrice;
        const displayPriceFormatted = displayPriceStr > 0 ? Math.round(displayPriceStr).toLocaleString('fa-IR') : "---";
        const indentStyle = `padding-right: ${depth * 14}px;`;

        return `
          <tr style="border-bottom: 1px solid #e2e8f0; font-size: 10.5px; ${hasChildren ? 'background-color: #f8fafc; font-weight: bold;' : ''}">
            <td style="padding: 6px 8px; text-align: right; ${indentStyle}">
              <span style="font-size: 9.5px; font-family: monospace; background: #e2e8f0; padding: 1px 4px; border-radius: 4px; margin-left: 4px;">${node.code}</span>
              ${node.title}
            </td>
            <td style="padding: 6px 4px; text-align: center;">${displayUnitStr}</td>
            <td style="padding: 6px 4px; text-align: center;">${displayQtyStr}</td>
            <td style="padding: 6px 4px; text-align: center;">${displayPriceFormatted}</td>
            <td style="padding: 6px 4px; text-align: center; color: #475569;">${(node.weightPercent ?? 0).toFixed(2)}٪</td>
            <td style="padding: 6px 4px; text-align: center; color: #64748b;">${m.prevCumulativePercent.toFixed(1)}٪</td>
            
            <!-- ادعایی پیمانکار -->
            <td style="padding: 6px 4px; text-align: center; background-color: #eff6ff; color: #1d4ed8;">
              <div>${m.contractorPercent.toFixed(1)}٪</div>
              ${isLeafNode && m.contractorQuantity > 0 ? `<div style="font-size: 8.5px; color: #3b82f6;">(${m.contractorQuantity.toLocaleString('fa-IR')})</div>` : ''}
            </td>

            <!-- تایید مشاور -->
            <td style="padding: 6px 4px; text-align: center; background-color: #fefce8; color: #a16207;">
              <div>${m.consultantPercent.toFixed(1)}٪</div>
              ${isLeafNode && m.consultantQuantity > 0 ? `<div style="font-size: 8.5px; color: #ca8a04;">(${m.consultantQuantity.toLocaleString('fa-IR')})</div>` : ''}
            </td>

            <!-- تایید کارفرما -->
            <td style="padding: 6px 4px; text-align: center; background-color: #faf5ff; color: #7e22ce;">
              <div>${m.employerPercent.toFixed(1)}٪</div>
              ${isLeafNode && m.employerQuantity > 0 ? `<div style="font-size: 8.5px; color: #9333ea;">(${m.employerQuantity.toLocaleString('fa-IR')})</div>` : ''}
            </td>

            <!-- مصوب این دوره -->
            <td style="padding: 6px 4px; text-align: center; font-weight: bold; background-color: #ecfdf5; color: #047857;">
              <div>${m.currentPeriodPercent.toFixed(1)}٪</div>
              ${isLeafNode && m.currentPeriodQuantity > 0 ? `<div style="font-size: 8.5px; color: #059669;">(${m.currentPeriodQuantity.toLocaleString('fa-IR')})</div>` : ''}
            </td>

            <!-- کل تجمعی -->
            <td style="padding: 6px 4px; text-align: center; font-weight: bold;">${m.totalCumulativePercent.toFixed(1)}٪</td>
            
            <!-- ارزش ناخالص مالی -->
            <td style="padding: 6px 8px; text-align: left; font-weight: bold; font-family: monospace;">${Math.round(m.currentPeriodValue).toLocaleString('fa-IR')}</td>
          </tr>
          ${buildTreeHtmlRows(node.id, depth + 1)}
        `;
      }).join("");
    };

    const tableRowsHtml = buildTreeHtmlRows(null);

    // 4. Resolve digital signatures for all 9 boxes
    const sigContractorTech = getRoleSignatory('contractor_tech', statement);
    const sigContractorHead = getRoleSignatory('contractor_head', statement);
    const sigContractorSite = getRoleSignatory('contractor_site', statement);

    const sigConsultantTech = getRoleSignatory('consultant_tech', statement);
    const sigConsultantHead = getRoleSignatory('consultant_head', statement);
    const sigConsultant = getRoleSignatory('consultant', statement);

    const sigEmployerTech = getRoleSignatory('employer_tech', statement);
    const sigEmployerHead = getRoleSignatory('employer_head', statement);
    const sigEmployer = getRoleSignatory('employer', statement);

    const renderPrintSigItem = (roleHeader: string, signatory: any) => {
      const isSigned = !!(signatory && signatory.signature);
      if (isSigned) {
        return `
          <div class="sig-box" style="flex: 1 1 0%; min-width: 0; text-align: center; background: #ffffff; border: 1px solid #10b981; border-radius: 4px; padding: 4px 3px; box-sizing: border-box; overflow: hidden; display: flex; flex-direction: column; justify-content: space-between; min-height: 80px;">
            <p style="font-weight: bold; font-size: 8px; margin: 0 0 1px 0; color: #047857; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${roleHeader}">${roleHeader}</p>
            <div style="font-size: 7.5px; font-weight: bold; color: #1e293b; margin-bottom: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${signatory.name}">${signatory.name}</div>
            <div style="height: 28px; display: flex; align-items: center; justify-content: center;">
              <img src="${signatory.signature}" style="max-height: 26px; max-width: 65px; object-fit: contain;" alt="امضا" />
            </div>
            <div style="font-size: 6.5px; color: #059669; font-weight: bold;">✓ امضاء معتبر</div>
            <div style="font-size: 6.5px; color: #64748b;">${signatory.date || new Date().toLocaleDateString('fa-IR')}</div>
          </div>
        `;
      }
      
      const personName = signatory?.name ? `<div style="font-size: 7.5px; font-weight: bold; color: #334155; margin-bottom: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${signatory.name}">${signatory.name}</div>` : '';

      return `
        <div class="sig-box" style="flex: 1 1 0%; min-width: 0; text-align: center; background: #ffffff; border: 1px dashed #cbd5e1; border-radius: 4px; padding: 4px 3px; box-sizing: border-box; overflow: hidden; display: flex; flex-direction: column; justify-content: space-between; min-height: 80px;">
          <p style="font-weight: bold; font-size: 8px; margin: 0 0 1px 0; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${roleHeader}">${roleHeader}</p>
          ${personName}
          <div style="height: 28px; display: flex; align-items: center; justify-content: center; font-size: 7px; color: #94a3b8; font-style: italic;">مهر / امضاء</div>
          <div class="sig-line" style="border-top: 1px dashed #cbd5e1; padding-top: 1px; font-size: 7px; color: #64748b;">نام و امضاء</div>
        </div>
      `;
    };

    // Print Window execution
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const cbsLogos = SystemAdminService.getProjectOrgLogos(currentProject);
    const cbsLogoHtml = [
      cbsLogos.employerLogo ? `<img src="${cbsLogos.employerLogo}" style="height: 40px; max-width: 90px; object-fit: contain;" alt="کارفرما" />` : '',
      cbsLogos.consultantLogo ? `<img src="${cbsLogos.consultantLogo}" style="height: 40px; max-width: 90px; object-fit: contain;" alt="مشاور" />` : '',
      cbsLogos.contractorLogo ? `<img src="${cbsLogos.contractorLogo}" style="height: 40px; max-width: 90px; object-fit: contain;" alt="پیمانکار" />` : ''
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
            table { page-break-inside: auto; }
            tr { page-break-inside: avoid; break-inside: avoid; }
            @media print { 
              .no-print { display: none; } 
              body { padding: 5mm; margin: 0; width: 100%; } 
              @page { size: A4 landscape; margin: 8mm; }
            }
          </style>
        </head>
        <body>
          <!-- Standard Official Header -->
          <div class="header">
            <div class="logo-section">
              ${cbsLogoHtml || '<div class="logo-box"></div>'}
              <h1 style="margin: 0; color: #1e40af; font-size: 22px;">سامانه مدیریت پروژه همیار</h1>
            </div>
            <div style="text-align: left; font-size: 11px;">
              <p style="margin: 0;">تاریخ چاپ: ${new Date().toLocaleDateString("fa-IR")}</p>
              <p style="margin: 0;">نسخه: ۱.۴.۰</p>
            </div>
          </div>

          <div class="content">
            <!-- Project Header Banner (matching Technical Office standard) -->
            <div style="border-bottom: 2px solid #1e40af; padding-bottom: 15px; margin-bottom: 20px;">
              <h2 style="margin: 0; color: #1e40af; text-align: center; font-size: 18px;">صورت‌وضعیت کارکرد ساختار شکست هزینه (CBS)</h2>
              <div style="text-align: center; margin-top: 6px;">
                <span style="display: inline-block; background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; padding: 2px 12px; border-radius: 12px; font-size: 10px; font-weight: bold;">
                  دفتر فنی پروژه - دوره صورت‌وضعیت شماره ${statement.number}
                </span>
                ${statement.isFinalFrozen ? '<span style="display: inline-block; background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; padding: 2px 10px; border-radius: 12px; font-size: 10px; font-weight: bold; margin-right: 6px;">🔒 مصوب قطعی و قفل‌شده</span>' : ''}
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 15px; font-size: 12px; background: #f8fafc; padding: 10px; border-radius: 8px; border: 1px solid #e2e8f0;">
                <div><strong>پروژه:</strong> ${projectTitle}</div>
                <div><strong>شماره پیمان:</strong> ${currentProject?.contractNumber || "---"}</div>
                <div><strong>کارفرما:</strong> ${projectEmployer}</div>
                <div><strong>مشاور:</strong> ${projectConsultant}</div>
                <div><strong>پیمانکار:</strong> ${projectContractor}</div>
                <div><strong>مبلغ کل قرارداد:</strong> ${projectBudget}</div>
                <div><strong>مدت پیمان:</strong> ${projectTimeline}</div>
                <div><strong>دوره کارکرد:</strong> ${statementPeriodStr}</div>
              </div>
            </div>

            <!-- Statement Metadata Table -->
            <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px;">
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; width: 25%; background: #f8fafc;">شماره صورت‌وضعیت:</td>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; color: #1e40af; width: 25%;">صورت‌وضعیت شماره ${statement.number}</td>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; width: 25%; background: #f8fafc;">تاریخ تنظیم:</td>
                <td style="padding: 8px; border: 1px solid #ddd; width: 25%;">${statement.date || "---"}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background: #f8fafc;">دوره کارکرد:</td>
                <td style="padding: 8px; border: 1px solid #ddd; color: #0284c7; font-weight: bold;">${statementPeriodStr}</td>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background: #f8fafc;">وضعیت سند در گردش کار:</td>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${WorkflowService.getStatusLabel(statement as any)}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background: #f8fafc;">ارزش ناخالص موثر دوره:</td>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; color: #047857;">${Math.round(grossValueThisPeriod).toLocaleString('fa-IR')} ${activeCurrency}</td>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background: #f8fafc;">پیشرفت فیزیکی موزون دوره:</td>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; color: #2563eb;">${weightedProgressThisPeriod.toFixed(2)}٪</td>
              </tr>
            </table>

            <!-- Summary Breakdown Section -->
            <div style="margin-top: 20px;">
              <h3 style="border-bottom: 2px solid #1e40af; padding-bottom: 5px; color: #1e40af; font-size: 13px; font-weight: bold;">
                خلاصه مالی و تفکیک ارزش کارکرد دوره
              </h3>
              <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-top: 10px; font-size: 11px; text-align: center;">
                <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 10px 8px;">
                  <div style="font-size: 9.5px; color: #1e40af; font-weight: bold; margin-bottom: 4px;">ارزش ادعایی پیمانکار</div>
                  <div style="font-size: 13px; font-weight: 900; color: #1d4ed8;">${Math.round(contractorGrossValue).toLocaleString('fa-IR')} <span style="font-size: 9px;">${activeCurrency}</span></div>
                </div>
                <div style="background: #fefce8; border: 1px solid #fde047; border-radius: 8px; padding: 10px 8px;">
                  <div style="font-size: 9.5px; color: #854d0e; font-weight: bold; margin-bottom: 4px;">ارزش تایید مشاور</div>
                  <div style="font-size: 13px; font-weight: 900; color: #a16207;">${Math.round(consultantGrossValue).toLocaleString('fa-IR')} <span style="font-size: 9px;">${activeCurrency}</span></div>
                </div>
                <div style="background: #faf5ff; border: 1px solid #e9d5ff; border-radius: 8px; padding: 10px 8px;">
                  <div style="font-size: 9.5px; color: #6b21a8; font-weight: bold; margin-bottom: 4px;">ارزش مصوب کارفرما</div>
                  <div style="font-size: 13px; font-weight: 900; color: #7e22ce;">${Math.round(employerGrossValue).toLocaleString('fa-IR')} <span style="font-size: 9px;">${activeCurrency}</span></div>
                </div>
                <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 10px 8px;">
                  <div style="font-size: 9.5px; color: #065f46; font-weight: bold; margin-bottom: 4px;">ارزش ناخالص موثر دوره</div>
                  <div style="font-size: 13px; font-weight: 900; color: #047857;">${Math.round(grossValueThisPeriod).toLocaleString('fa-IR')} <span style="font-size: 9px;">${activeCurrency}</span></div>
                </div>
                <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 8px;">
                  <div style="font-size: 9.5px; color: #475569; font-weight: bold; margin-bottom: 4px;">پیشرفت فیزیکی موزون</div>
                  <div style="font-size: 13px; font-weight: 900; color: #2563eb;">${weightedProgressThisPeriod.toFixed(2)}٪</div>
                </div>
              </div>
            </div>

            <!-- CBS Items Breakdown Table -->
            <div style="margin-top: 25px;">
              <h3 style="border-bottom: 2px solid #1e40af; padding-bottom: 5px; color: #1e40af; font-size: 13px; font-weight: bold;">
                ریز محاسبات و احجام ساختار شکست هزینه (CBS)
              </h3>
              <table style="width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 10px; text-align: center;">
                <thead>
                  <tr style="background: #f1f5f9;">
                    <th style="padding: 6px; border: 1px solid #ddd; text-align: right;">کد و شرح فعالیت ساختار شکست (CBS)</th>
                    <th style="padding: 6px; border: 1px solid #ddd; width: 42px;">واحد</th>
                    <th style="padding: 6px; border: 1px solid #ddd; width: 65px;">مقدار کل</th>
                    <th style="padding: 6px; border: 1px solid #ddd; width: 75px;">بهای واحد (${activeCurrency})</th>
                    <th style="padding: 6px; border: 1px solid #ddd; width: 55px;">وزن ٪</th>
                    <th style="padding: 6px; border: 1px solid #ddd; width: 55px;">تجمعی قبل</th>
                    <th style="padding: 6px; border: 1px solid #ddd; width: 75px; background-color: #dbeafe; color: #1e40af;">ادعایی پیمانکار</th>
                    <th style="padding: 6px; border: 1px solid #ddd; width: 75px; background-color: #fef9c3; color: #854d0e;">تایید مشاور</th>
                    <th style="padding: 6px; border: 1px solid #ddd; width: 75px; background-color: #f3e8ff; color: #6b21a8;">تایید کارفرما</th>
                    <th style="padding: 6px; border: 1px solid #ddd; width: 75px; background-color: #d1fae5; color: #065f46;">مصوب این دوره</th>
                    <th style="padding: 6px; border: 1px solid #ddd; width: 55px;">کل تجمعی</th>
                    <th style="padding: 6px; border: 1px solid #ddd; width: 95px;">ارزش دوره (${activeCurrency})</th>
                  </tr>
                </thead>
                <tbody>
                  ${tableRowsHtml}
                  <tr style="background: #fafafc; font-weight: bold; font-size: 11px; page-break-inside: avoid; break-inside: avoid;">
                    <td colspan="11" style="padding: 8px; border: 1px solid #ddd; text-align: left;">جمع کل ارزش ناخالص کارکرد این دوره:</td>
                    <td style="padding: 8px; border: 1px solid #ddd; color: #1e40af; font-family: monospace;">${Math.round(grossValueThisPeriod).toLocaleString('fa-IR')} ${activeCurrency}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Footer / Official 9-Box Tripartite Signatures Area (matching Technical Office standard) -->
          <div class="footer">
            <div style="font-size: 10px; font-weight: bold; color: #334155; margin-bottom: 8px; text-align: center;">
              این صورت‌وضعیت بر اساس ساختار شکست کار (CBS) و اسناد پیمان تهیه، بررسی و به تایید رسمی ارکان ذیربط پروژه رسیده است.
            </div>
            <div style="display: flex; flex-direction: row; justify-content: space-between; gap: 6px; width: 100%; box-sizing: border-box;">
              <!-- 1. پیمانکار -->
              <div style="flex: 1 1 0%; min-width: 0; border: 1px solid #93c5fd; background: #eff6ff; border-radius: 6px; padding: 4px; box-sizing: border-box;">
                <div style="font-weight: bold; font-size: 9px; color: #1e40af; text-align: center; border-bottom: 1px solid #bfdbfe; padding-bottom: 2px; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  پیمانکار: ${projectContractor}
                </div>
                <div style="display: flex; flex-direction: row; gap: 3px; width: 100%;">
                  ${renderPrintSigItem('کارشناس / تنظیم‌کننده', sigContractorTech)}
                  ${renderPrintSigItem('سرپرست واحد فنی', sigContractorHead)}
                  ${renderPrintSigItem('سرپرست کارگاه / مدیر پروژه', sigContractorSite)}
                </div>
              </div>

              <!-- 2. دستگاه نظارت و مشاور -->
              <div style="flex: 1 1 0%; min-width: 0; border: 1px solid #6ee7b7; background: #ecfdf5; border-radius: 6px; padding: 4px; box-sizing: border-box;">
                <div style="font-weight: bold; font-size: 9px; color: #065f46; text-align: center; border-bottom: 1px solid #a7f3d0; padding-bottom: 2px; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  مشاور: ${projectConsultant}
                </div>
                <div style="display: flex; flex-direction: row; gap: 3px; width: 100%;">
                  ${renderPrintSigItem('کارشناس / ناظر مقیم', sigConsultantTech)}
                  ${renderPrintSigItem('سرپرست واحد نظارت', sigConsultantHead)}
                  ${renderPrintSigItem('سرپرست نظارت / مدیر پروژه', sigConsultant)}
                </div>
              </div>

              <!-- 3. دستگاه اجرایی و کارفرما -->
              <div style="flex: 1 1 0%; min-width: 0; border: 1px solid #d8b4fe; background: #faf5ff; border-radius: 6px; padding: 4px; box-sizing: border-box;">
                <div style="font-weight: bold; font-size: 9px; color: #6b21a8; text-align: center; border-bottom: 1px solid #e9d5ff; padding-bottom: 2px; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  کارفرما: ${projectEmployer}
                </div>
                <div style="display: flex; flex-direction: row; gap: 3px; width: 100%;">
                  ${renderPrintSigItem('کارشناس / بررسی‌کننده', sigEmployerTech)}
                  ${renderPrintSigItem('سرپرست واحد / مدیر گروه', sigEmployerHead)}
                  ${renderPrintSigItem('مدیر طرح / نماینده کارفرما', sigEmployer)}
                </div>
              </div>
            </div>
          </div>

          <script>
            window.onload = () => {
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

  // Recursive calculation for aggregated values (Roll-up)
  // nodeMetrics handles this now

  // Tree Rendering Logic
  const renderTreeRows = (parentId: string | null, depth = 0) => {
    const children = projectNodes.filter(n => n.parentId === parentId);
    if (children.length === 0) return null;

    const isSysAdmin = currentUser?.role === 'SYSTEM_ADMIN';
    const userOrg = currentUser ? SystemAdminService.getOrganization(currentUser.orgId) : null;
    const userOrgType = userOrg?.type || 'CONTRACTOR';

    const canEditContractor = isEditable && (isSysAdmin || userOrgType === OrganizationType.CONTRACTOR);
    const canEditConsultant = isEditable && (isSysAdmin || userOrgType === OrganizationType.CONSULTANT);
    const canEditEmployer = isEditable && (isSysAdmin || userOrgType === OrganizationType.EMPLOYER);

    return children.map(node => {
      const isExpanded = expandedNodes.has(node.id);
      const hasChildren = projectNodes.some(n => n.parentId === node.id);
      const val = activeStatement?.values.find(v => v.cbsId === node.id);
      
      const metrics = nodeMetrics[node.id] || {
        prevCumulativePercent: 0,
        lastPeriodPercent: 0,
        currentPeriodPercent: 0,
        totalCumulativePercent: 0,
        cumulativeFinancialValue: 0,
        currentPeriodValue: 0,
        currentPeriodQuantity: 0,
        prevCumulativeQuantity: 0,
        totalCumulativeQuantity: 0,
        contractorPercent: 0,
        contractorQuantity: 0,
        contractorValue: 0,
        consultantPercent: 0,
        consultantQuantity: 0,
        consultantValue: 0,
        employerPercent: 0,
        employerQuantity: 0,
        employerValue: 0
      };
      
      const matchesSearch = searchTerm === '' || 
        node.title.includes(searchTerm) || 
        node.code.includes(searchTerm);

      if (!matchesSearch && !hasChildren) return null;

      const isLeaf = !projectNodes.some(n => n.parentId === node.id);
      const displayUnit = isLeaf ? (node.unit || "---") : "---";
      const calcVals = cbsCalculatedValues[node.id] || { quantity: 0, unitPrice: 0, budget: 0 };
      const displayQty = calcVals.quantity;
      const displayUnitPrice = calcVals.unitPrice;

      return (
        <React.Fragment key={node.id}>
          <tr className={`border-b border-stone-50 transition-colors ${!isEditable ? 'bg-[#faf8f4]/50' : 'hover:bg-stone-50/30'} ${hasChildren ? 'bg-[#faf8f4]/40 font-black' : ''}`}>
            {/* CBS Code and Title */}
            <td className="p-3">
              <div className="flex items-center gap-2" style={{ paddingRight: `${depth * 20}px` }}>
                {hasChildren ? (
                  <button onClick={() => handleToggleExpand(node.id)} className="p-1 hover:bg-stone-100 rounded-lg transition-colors">
                    {isExpanded ? <ChevronDown size={14} className="text-stone-400" /> : <ChevronUp size={14} className="text-stone-400" />}
                  </button>
                ) : (
                  <div className="w-5" />
                )}
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${hasChildren ? 'text-stone-700 bg-stone-200' : 'text-amber-700 bg-amber-50'}`}>{node.code}</span>
                <span className={`text-xs ${hasChildren ? 'font-black text-stone-900' : 'font-bold text-stone-700'}`}>{node.title}</span>
              </div>
            </td>

            {/* Unit */}
            <td className="p-3 text-center text-[10px] font-bold text-stone-500">{displayUnit}</td>

            {/* Total Quantity */}
            <td className="p-3 text-center text-xs font-black text-stone-800">
              {displayQty > 0 ? (Number(displayQty.toFixed(2))).toLocaleString('fa-IR') : "---"}
            </td>

            {/* Unit Price */}
            <td className="p-3 text-center text-xs font-black text-stone-400">
              {displayUnitPrice > 0 ? Math.round(displayUnitPrice).toLocaleString('fa-IR') : "---"}
            </td>

            {/* Weight % */}
            <td className="p-3 text-center text-xs font-bold text-stone-600">
              {(node.weightPercent ?? 0).toFixed(2)}٪
            </td>

            {/* Prev Cumulative % */}
            <td className="p-3 text-center">
               <div className="text-[10px] font-bold text-stone-400">
                 {metrics.prevCumulativePercent.toFixed(1)}٪
               </div>
            </td>

            {/* If Comparison Mode is Active: Show Contractor, Consultant, Employer Separate Columns */}
            {showComparisonMode ? (
              <>
                {/* Contractor Claim Column */}
                <td className="p-3 bg-blue-50/20 border-x border-blue-100/40">
                  {hasChildren ? (
                    <div className="flex flex-col items-center justify-center text-center">
                      <span className="text-xs font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {metrics.contractorPercent.toFixed(1)}٪
                      </span>
                      <span className="text-[9px] font-bold text-blue-500 mt-0.5">
                        {metrics.contractorValue.toLocaleString('fa-IR')}
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1.5 justify-center">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          disabled={!canEditContractor}
                          value={val?.currentProgressPercent !== undefined && val?.currentProgressPercent !== null ? val.currentProgressPercent : 0}
                          onChange={(e) => {
                            const raw = e.target.value;
                            const num = raw === '' ? 0 : parseFloat(raw);
                            updateProgress(node.id, isNaN(num) ? 0 : num, 'percent', 'CONTRACTOR');
                          }}
                          className="w-14 bg-white border border-blue-200 rounded-lg px-1.5 py-0.5 text-center text-xs font-black text-blue-900 focus:border-blue-500 outline-none disabled:bg-transparent disabled:border-transparent disabled:text-blue-800"
                          title="درصد ادعایی پیمانکار"
                        />
                        <span className="text-[9px] font-bold text-blue-400">٪</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          disabled={!canEditContractor}
                          value={val?.currentQuantity !== undefined && val?.currentQuantity !== null ? val.currentQuantity : 0}
                          onChange={(e) => {
                            const raw = e.target.value;
                            const num = raw === '' ? 0 : parseFloat(raw);
                            updateProgress(node.id, isNaN(num) ? 0 : num, 'quantity', 'CONTRACTOR');
                          }}
                          className="w-16 bg-white border border-blue-200 rounded-lg px-1 py-0.5 text-center text-[10px] font-bold text-blue-900 focus:border-blue-500 outline-none disabled:bg-transparent disabled:border-transparent disabled:text-blue-700"
                          placeholder="مقدار"
                          title="مقدار ادعایی پیمانکار"
                        />
                      </div>
                    </div>
                  )}
                </td>

                {/* Consultant Approval/Correction Column */}
                <td className="p-3 bg-amber-50/20 border-x border-amber-100/40">
                  {hasChildren ? (
                    <div className="flex flex-col items-center justify-center text-center">
                      <span className="text-xs font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        {metrics.consultantPercent.toFixed(1)}٪
                      </span>
                      <span className="text-[9px] font-bold text-amber-600 mt-0.5">
                        {metrics.consultantValue.toLocaleString('fa-IR')}
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1.5 justify-center">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          disabled={!canEditConsultant}
                          value={val?.consultantProgressPercent !== undefined && val?.consultantProgressPercent !== null ? val.consultantProgressPercent : (val?.currentProgressPercent ?? 0)}
                          onChange={(e) => {
                            const raw = e.target.value;
                            const num = raw === '' ? 0 : parseFloat(raw);
                            updateProgress(node.id, isNaN(num) ? 0 : num, 'percent', 'CONSULTANT');
                          }}
                          className="w-14 bg-white border border-amber-300 rounded-lg px-1.5 py-0.5 text-center text-xs font-black text-amber-900 focus:border-amber-500 outline-none disabled:bg-transparent disabled:border-transparent disabled:text-amber-800"
                          title="درصد تایید/اصلاح مشاور"
                        />
                        <span className="text-[9px] font-bold text-amber-400">٪</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          disabled={!canEditConsultant}
                          value={val?.consultantQuantity !== undefined && val?.consultantQuantity !== null ? val.consultantQuantity : (val?.currentQuantity ?? 0)}
                          onChange={(e) => {
                            const raw = e.target.value;
                            const num = raw === '' ? 0 : parseFloat(raw);
                            updateProgress(node.id, isNaN(num) ? 0 : num, 'quantity', 'CONSULTANT');
                          }}
                          className="w-16 bg-white border border-amber-300 rounded-lg px-1 py-0.5 text-center text-[10px] font-bold text-amber-900 focus:border-amber-500 outline-none disabled:bg-transparent disabled:border-transparent disabled:text-amber-700"
                          placeholder="مقدار"
                          title="مقدار تایید مشاور"
                        />
                      </div>
                    </div>
                  )}
                </td>

                {/* Employer Approval Column */}
                <td className="p-3 bg-purple-50/20 border-x border-purple-100/40">
                  {hasChildren ? (
                    <div className="flex flex-col items-center justify-center text-center">
                      <span className="text-xs font-black text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                        {metrics.employerPercent.toFixed(1)}٪
                      </span>
                      <span className="text-[9px] font-bold text-purple-600 mt-0.5">
                        {metrics.employerValue.toLocaleString('fa-IR')}
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1.5 justify-center">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          disabled={!canEditEmployer}
                          value={val?.employerProgressPercent !== undefined && val?.employerProgressPercent !== null ? val.employerProgressPercent : (val?.consultantProgressPercent ?? val?.currentProgressPercent ?? 0)}
                          onChange={(e) => {
                            const raw = e.target.value;
                            const num = raw === '' ? 0 : parseFloat(raw);
                            updateProgress(node.id, isNaN(num) ? 0 : num, 'percent', 'EMPLOYER');
                          }}
                          className="w-14 bg-white border border-purple-300 rounded-lg px-1.5 py-0.5 text-center text-xs font-black text-purple-900 focus:border-purple-500 outline-none disabled:bg-transparent disabled:border-transparent disabled:text-purple-800"
                          title="درصد تایید کارفرما"
                        />
                        <span className="text-[9px] font-bold text-purple-400">٪</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          disabled={!canEditEmployer}
                          value={val?.employerQuantity !== undefined && val?.employerQuantity !== null ? val.employerQuantity : (val?.consultantQuantity ?? val?.currentQuantity ?? 0)}
                          onChange={(e) => {
                            const raw = e.target.value;
                            const num = raw === '' ? 0 : parseFloat(raw);
                            updateProgress(node.id, isNaN(num) ? 0 : num, 'quantity', 'EMPLOYER');
                          }}
                          className="w-16 bg-white border border-purple-300 rounded-lg px-1 py-0.5 text-center text-[10px] font-bold text-purple-900 focus:border-purple-500 outline-none disabled:bg-transparent disabled:border-transparent disabled:text-purple-700"
                          placeholder="مقدار"
                          title="مقدار تایید کارفرما"
                        />
                      </div>
                    </div>
                  )}
                </td>

                {/* Final Approved Period Column */}
                <td className="p-3 bg-emerald-50/30 text-center border-x border-emerald-100/40">
                  <div className="flex flex-col items-center justify-center">
                    <span className="text-xs font-black text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded border border-emerald-200">
                      {metrics.currentPeriodPercent.toFixed(1)}٪
                    </span>
                    <span className="text-[9px] font-bold text-emerald-700 mt-0.5">
                      {metrics.currentPeriodQuantity.toLocaleString('fa-IR')}
                    </span>
                  </div>
                </td>
              </>
            ) : (
              <>
                {/* Standard Compact View */}
                <td className="p-3 text-center">
                   <div className="text-[10px] font-black text-amber-500 bg-stone-50 px-2 py-1 rounded-lg">
                     {metrics.lastPeriodPercent.toFixed(1)}٪
                   </div>
                </td>
                <td className="p-3">
                   {hasChildren ? (
                     <div className="flex flex-col items-center gap-1 justify-center">
                       <div className="text-xs font-black text-amber-600 bg-stone-50 px-3 py-1.5 rounded-xl border border-blue-100">
                         {metrics.currentPeriodPercent.toFixed(1)}٪
                       </div>
                     </div>
                   ) : (
                     <div className="flex flex-col items-center gap-1 justify-center">
                        <div className="flex items-center gap-1">
                          <input 
                            type="number"
                            disabled={!isEditable}
                            value={val?.currentProgressPercent !== undefined && val?.currentProgressPercent !== null ? val.currentProgressPercent : 0}
                            onChange={(e) => {
                              const raw = e.target.value;
                              const num = raw === '' ? 0 : parseFloat(raw);
                              updateProgress(node.id, isNaN(num) ? 0 : num, 'percent');
                            }}
                            className="w-16 bg-white border border-[#e5ded0] rounded-lg px-2 py-1 text-center text-xs font-black focus:border-amber-500 outline-none transition-all disabled:bg-[#faf8f4] disabled:text-stone-400"
                          />
                          <span className="text-[10px] font-black text-stone-400">٪</span>
                        </div>
                     </div>
                   )}
                </td>
                <td className="p-3">
                  {hasChildren ? (
                     <div className="flex flex-col items-center gap-1 justify-center text-center">
                       <div className="text-xs font-bold text-stone-700">
                         {metrics.currentPeriodValue.toLocaleString('fa-IR')}
                       </div>
                     </div>
                   ) : (
                     <div className="flex flex-col items-center gap-1 justify-center">
                        <input 
                          type="number"
                          disabled={!isEditable}
                          value={val?.currentQuantity !== undefined && val?.currentQuantity !== null ? val.currentQuantity : 0}
                          onChange={(e) => {
                            const raw = e.target.value;
                            const num = raw === '' ? 0 : parseFloat(raw);
                            updateProgress(node.id, isNaN(num) ? 0 : num, 'quantity');
                          }}
                          className="w-20 bg-white border border-[#e5ded0] rounded-lg px-2 py-1 text-center text-xs font-black focus:border-amber-500 outline-none transition-all disabled:bg-[#faf8f4] disabled:text-stone-400"
                        />
                     </div>
                   )}
                </td>
              </>
            )}

            {/* Total Cumulative % */}
            <td className="p-3 text-center">
               <div className="text-xs font-black text-stone-800">
                 {metrics.totalCumulativePercent.toFixed(1)}٪
               </div>
            </td>

            {/* Cumulative Financial Value */}
            <td className="p-3 text-center">
               <div className={`text-xs font-black px-3 py-1.5 rounded-xl inline-block ${hasChildren ? 'text-stone-900 bg-stone-100 border border-stone-200' : 'text-emerald-700 bg-emerald-50 border border-emerald-100'}`}>
                 {metrics.cumulativeFinancialValue.toLocaleString('fa-IR')}
               </div>
            </td>
          </tr>
          {isExpanded && renderTreeRows(node.id, depth + 1)}
        </React.Fragment>
      );
    });
  };

  const getOrgTypeLabel = (type?: string) => {
    switch (type) {
      case 'CONTRACTOR': return 'پیمانکار';
      case 'CONSULTANT': return 'مشاور';
      case 'EMPLOYER': return 'کارفرما';
      default: return 'سایر';
    }
  };

  const WorkflowProgressStage = ({
    status,
    isFinalFrozen,
  }: {
    status: WorkflowStatus;
  assigneeName?: string;
  assigneeId?: string;
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
                      : "bg-amber-500"
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
                  : "bg-stone-50 text-stone-900 border-blue-100"
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

  return (
    <div className="space-y-6 pb-12 text-right" dir="rtl">
      {/* Header Section */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-stone-200 shadow-sm flex flex-col xl:flex-row justify-between items-center gap-8">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-stone-900 rounded-[1.5rem] flex items-center justify-center text-amber-500 shadow-2xl shadow-stone-500/20">
            <FileSignature size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-stone-900 tracking-tight">مدیریت صورت‌وضعیت‌های CBS</h2>
            <p className="text-stone-500 text-xs font-bold mt-1">ارزیابی پیشرفت فیزیکی و تایید کارکرد دوره‌ای بر اساس ساختار شکست</p>
          </div>
        </div>
        
        {!hideProjectSelector && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">پروژه فعال:</span>
              <select 
                value={selectedProjectId}
                onChange={(e) => {
                  if (activeStatementId === 'TEMP_DRAFT') {
                    if (!window.confirm('تغییرات صورت‌وضعیت جدید ذخیره نشده است. آیا مایل به تغییر پروژه و لغو صورت‌وضعیت جدید هستید؟')) {
                      return;
                    }
                    setDraftNewStatement(null);
                    setActiveStatementId(null);
                  }
                  setSelectedProjectId(e.target.value);
                }}
                className="text-xs font-black text-stone-900 outline-none bg-transparent border-b border-stone-200 pb-0.5 focus:border-amber-500 transition-all"
              >
                {projects.filter(p => p.contractType === 'CBS').map(p => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Tabs Navigation & Create Action Row */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex bg-stone-100/80 p-1.5 rounded-[1.5rem] gap-1.5 border border-stone-200/50 w-fit">
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer ${
              activeTab === 'history' 
                ? 'bg-stone-900 text-white shadow-lg shadow-stone-900/20' 
                : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            <Clock size={18} />
            تاریخچه صورت‌وضعیت‌ها
          </button>
          <button
            onClick={() => {
              if (activeStatementId) setActiveTab('details');
              else alert('لطفاً ابتدا یک صورت‌وضعیت را از تاریخچه انتخاب کنید.');
            }}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer ${
              activeTab === 'details' 
                ? 'bg-stone-900 text-white shadow-lg shadow-stone-900/20' 
                : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            <FileText size={18} />
            ریز صورت‌وضعیت
          </button>
        </div>

        <button 
          disabled={
            currentUser && (
              currentUserOrg?.type !== OrganizationType.CONTRACTOR && 
              !currentProject?.allowConsultantEmployerCreation &&
              currentUser.role !== 'SYSTEM_ADMIN'
            )
          }
          onClick={createNewStatement}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black transition-all shadow-lg shadow-amber-500/20 hover:scale-105 active:scale-95 cursor-pointer ${
            currentUser && (currentUserOrg?.type !== OrganizationType.CONTRACTOR && !currentProject?.allowConsultantEmployerCreation && currentUser.role !== 'SYSTEM_ADMIN')
              ? 'bg-stone-100 text-stone-400 cursor-not-allowed opacity-70 grayscale'
              : 'bg-amber-500 text-stone-950'
          }`}
        >
          <Plus size={18} />
          ایجاد صورت‌وضعیت جدید
        </button>
      </div>

      {activeTab === 'history' ? (
        <div className="space-y-6 animate-fadeIn">
          {/* Real-time Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 1: Total Contract Amount */}
            <div className="bg-white rounded-3xl p-8 border border-[#ece5d8] shadow-sm flex items-center justify-between group hover:shadow-md transition-all duration-300">
              <div className="space-y-2">
                <span className="text-xs font-bold text-stone-400">مبلغ کل پیمان (CBS)</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-stone-800 tracking-tight">
                    {historyStats.totalContract.toLocaleString('fa-IR')}
                  </span>
                  <span className="text-[10px] font-black text-stone-400">{activeCurrency}</span>
                </div>
                <p className="text-[10px] font-bold text-stone-400/80">مجموع بودجه مصوب ساختار شکست</p>
              </div>
              <div className="w-14 h-14 bg-stone-50 text-amber-600 rounded-[1.5rem] flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shrink-0">
                <DollarSign size={26} />
              </div>
            </div>

            {/* Card 2: Cumulative Total Amount */}
            <div className="bg-white rounded-3xl p-8 border border-[#ece5d8] shadow-sm flex items-center justify-between group hover:shadow-md transition-all duration-300">
              <div className="space-y-2">
                <span className="text-xs font-bold text-stone-400">مبلغ تجمعی کل صورت‌وضعیت‌ها</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-emerald-600 tracking-tight">
                    {historyStats.cumulativeAmount.toLocaleString('fa-IR')}
                  </span>
                  <span className="text-[10px] font-black text-emerald-400">{activeCurrency}</span>
                </div>
                <p className="text-[10px] font-bold text-stone-400/80">مجموع کارکرد ناخالص دوره‌های ثبت شده</p>
              </div>
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-[1.5rem] flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shrink-0">
                <Calculator size={26} />
              </div>
            </div>

            {/* Card 3: Remaining Contract Amount */}
            <div className="bg-white rounded-3xl p-8 border border-[#ece5d8] shadow-sm flex items-center justify-between group hover:shadow-md transition-all duration-300">
              <div className="space-y-2">
                <span className="text-xs font-bold text-stone-400">مبلغ باقی‌مانده پیمان</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-amber-600 tracking-tight">
                    {historyStats.remainingAmount.toLocaleString('fa-IR')}
                  </span>
                  <span className="text-[10px] font-black text-amber-400">{activeCurrency}</span>
                </div>
                <p className="text-[10px] font-bold text-stone-400/80">مبلغ باقی‌مانده از کل بودجه پروژه</p>
              </div>
              <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-[1.5rem] flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shrink-0">
                <Coins size={26} />
              </div>
            </div>

            {/* Card 4: Overall Progress Percentage */}
            <div className="bg-white rounded-3xl p-8 border border-[#ece5d8] shadow-sm flex items-center justify-between group hover:shadow-md transition-all duration-300">
              <div className="space-y-2 w-full pl-4">
                <span className="text-xs font-bold text-stone-400">درصد پیشرفت کل پیمان</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-amber-600 tracking-tight">
                    {historyStats.overallProgress.toLocaleString('fa-IR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}٪
                  </span>
                </div>
                <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden mt-2">
                  <div 
                    className="bg-amber-500 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min(historyStats.overallProgress, 100)}%` }}
                  ></div>
                </div>
              </div>
              <div className="w-14 h-14 bg-stone-50 text-amber-600 rounded-[1.5rem] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                <TrendingUp size={26} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[3rem] border border-[#e5ded0] shadow-xl overflow-hidden min-h-[500px]">
             <div className="p-8 border-b border-[#ece5d8] flex justify-between items-center bg-[#faf8f4]/30">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-white border border-[#ece5d8] rounded-2xl flex items-center justify-center text-stone-600 shadow-sm">
                     <FileText size={24} />
                   </div>
                   <div>
                     <h3 className="text-base font-black text-stone-800">سوابق ابلاغ شده و پیش‌نویس‌ها</h3>
                     <p className="text-[10px] font-bold text-stone-400">نمای کلی کارکردهای دوره‌ای ثبت شده در سامانه</p>
                   </div>
                </div>
             </div>
             
             <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-[#faf8f4] border-b border-[#ece5d8]">
                      <th className="p-6 text-[10px] font-black text-stone-500 uppercase tracking-widest">شماره صورت‌وضعیت</th>
                      <th className="p-6 text-[10px] font-black text-stone-500 uppercase tracking-widest">تاریخ تنظیم</th>
                      <th className="p-6 text-[10px] font-black text-stone-500 uppercase tracking-widest text-center min-w-[160px]">وضعیت گردش کار</th>
                      <th className="p-6 text-[10px] font-black text-stone-500 uppercase tracking-widest text-center">دستِ (ارجاع به)</th>
                      <th className="p-6 text-[10px] font-black text-stone-500 uppercase tracking-widest text-center">ارزش ناخالص دوره</th>
                      <th className="p-6 text-[10px] font-black text-stone-500 uppercase tracking-widest text-center">پیشرفت فیزیکی دوره</th>
                      <th className="p-6 text-[10px] font-black text-stone-500 uppercase tracking-widest text-center min-w-[280px]">عملیات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projectStatements.sort((a, b) => parseInt(b.number) - parseInt(a.number)).map(s => {
                      const { currentTotal, weightedProgress } = getStatementStats(s);
                      const isUnread = unreadRecordIds.has(String(s.id));
                      return (
                        <tr 
                          key={s.id} 
                          id={`record-${s.id}`}
                          onClick={() => handleStatementRowClick(s.id)}
                          className={`border-b border-stone-50 transition-all duration-500 cursor-pointer ${
                            isUnread ? 'bg-amber-100/50 dark:bg-amber-950/30 border-r-4 border-r-amber-500 shadow-xs ring-1 ring-amber-400/30' : ''
                          } ${
                            highlightedRecordId === s.id
                              ? 'bg-yellow-100/80 dark:bg-yellow-950/50 scale-[1.005] shadow-md z-10 relative ring-2 ring-amber-400'
                              : 'hover:bg-[#faf8f4]/50'
                          }`}
                        >
                          <td className="p-6">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-sm font-black text-stone-800 tracking-tight">صورت‌وضعیت شماره {s.number}</span>
                              {isUnread && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                  دیده نشده
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-6">
                            <span className="text-xs font-bold text-stone-500">{s.date}</span>
                          </td>
                          <td className="p-6 text-center">
                            <div className="flex justify-center">
                              <WorkflowProgressStage status={WorkflowService.getStatus(s as any)} isFinalFrozen={s.isFinalFrozen} />
                            </div>
                          </td>
                          <td className="p-6 text-center text-xs font-bold text-stone-700">
                            {s.assigneeId ? (
                              <div className="flex flex-col items-center">
                                <span className="text-stone-800">{s.assigneeName || 'کاربر سیستم'}</span>
                                <span className="text-[9px] text-stone-400 font-bold mt-0.5">
                                  ({SystemAdminService.getOrganization(orgUsers.find(u => u.id === s.assigneeId)?.orgId || '')?.name || 'سازمان'})
                                </span>
                              </div>
                            ) : s.isFinalFrozen ? (
                              <span className="text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg text-[10px]">تایید و ابلاغ نهایی</span>
                            ) : (
                              <span className="text-stone-400 font-normal font-sans">---</span>
                            )}
                          </td>
                          <td className="p-6 text-center">
                             <div className="flex items-center justify-center gap-1.5">
                               <span className="text-sm font-black text-stone-800">{currentTotal.toLocaleString('fa-IR')}</span>
                               <span className="text-[10px] font-bold text-stone-400">{activeCurrency}</span>
                             </div>
                          </td>
                          <td className="p-6 text-center">
                             <div className="flex flex-col items-center gap-2">
                               <span className="text-sm font-black text-amber-600">{weightedProgress.toFixed(2)}٪</span>
                               <div className="w-24 bg-stone-100 h-1 rounded-full overflow-hidden">
                                 <div className="bg-amber-500 h-full" style={{ width: `${weightedProgress}%` }}></div>
                               </div>
                             </div>
                          </td>
                          <td className="p-6">
                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                              {/* Workflow Action Buttons - Driven directly by WorkflowService.getAvailableActions */}
                              {currentUser &&
                                WorkflowService.getAvailableActions(
                                  s as any,
                                  currentUser,
                                  SystemAdminService.getOrganization(currentUser.orgId)?.type,
                                ).map((action) => (
                                  <button
                                    key={action}
                                    onClick={() => openWorkflowModal(s, action)}
                                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black transition-all ${WorkflowService.getActionStyle(action)}`}
                                  >
                                    {WorkflowService.getActionLabel(
                                      action,
                                      SystemAdminService.getOrganization(currentUser.orgId)?.type,
                                    )}
                                  </button>
                                ))}

                              {/* Preview official report button */}
                              <button
                                onClick={() => handleOpenReportModal(s)}
                                className="p-2 bg-stone-50 text-stone-700 rounded-lg hover:bg-stone-900 hover:text-white transition-all border border-stone-200"
                                title="پیش‌نمایش گزارش رسمی و امضاها"
                              >
                                <Eye size={14} />
                              </button>

                              {/* Print button */}
                              <button
                                onClick={() => handlePrintCbsStatement(s)}
                                className="p-2 bg-stone-50 text-amber-600 rounded-lg hover:bg-amber-600 hover:text-white transition-all border border-blue-100"
                                title="چاپ استاندارد گزارش"
                              >
                                <Printer size={14} />
                              </button>

                              {/* History modal button */}
                              <button
                                onClick={() => {
                                  setHistoryItem(s);
                                  setHistoryModalOpen(true);
                                }}
                                className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-all"
                                title="تاریخچه"
                              >
                                <ScrollText size={16} />
                              </button>

                              {/* Detail button */}
                              <button
                                onClick={() => {
                                  if (activeStatementId === 'TEMP_DRAFT') {
                                    if (!window.confirm('تغییرات صورت‌وضعیت جدید ذخیره نشده است. آیا مایل به ترک و لغو آن هستید؟')) {
                                      return;
                                    }
                                    setDraftNewStatement(null);
                                  }
                                  setActiveStatementId(s.id);
                                  setActiveTab('details');
                                }}
                                className="px-4 py-2 bg-stone-900 text-white rounded-lg text-[10px] font-black hover:bg-stone-800 transition-all shadow-md shadow-stone-100"
                              >
                                ریز محاسبات
                              </button>

                              {/* Edit statement info button */}
                              {currentUser && (currentUser.role === 'SYSTEM_ADMIN' || (s.assigneeId === currentUser.id && !s.isFinalFrozen)) && (
                                <button
                                  onClick={() => openEditModal(s)}
                                  className="p-2 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-600 hover:text-white transition-all border border-amber-200"
                                  title="ویرایش مشخصات صورت‌وضعیت"
                                >
                                  <Edit3 size={14} />
                                </button>
                              )}

                              {/* Delete button - Visible to current assignee (if workflow allows) OR System Admin under any condition */}
                              {currentUser && ((s.assigneeId === currentUser.id && WorkflowService.canDelete(s as any, currentUser)) || currentUser.role === 'SYSTEM_ADMIN') && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteId(s.id);
                                    setIsDeleteModalOpen(true);
                                  }}
                                  className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all border border-red-100"
                                  title="حذف صورت‌وضعیت"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {projectStatements.length === 0 && (
                  <div className="p-24 text-center">
                    <div className="w-20 h-20 bg-[#faf8f4] rounded-full flex items-center justify-center mx-auto mb-6 text-stone-200">
                      <Clock size={40} />
                    </div>
                    <p className="font-bold text-stone-400">هیچ صورت‌وضعیتی برای این پروژه ثبت نشده است.</p>
                  </div>
                )}
             </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {activeStatement ? (
            <div className="space-y-6">
              {/* Horizontal Financial Summary Bar - Multi-Actor Comparison Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Final Approved Period Card */}
                <div className="bg-stone-900 rounded-[2rem] p-5 text-white shadow-lg relative overflow-hidden flex flex-col justify-between border border-stone-800">
                  <div className="absolute -right-4 -top-4 w-16 h-16 bg-emerald-500/10 rounded-full blur-xl"></div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider">مصوب نهایی این دوره</span>
                    <div className="w-8 h-8 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400 border border-emerald-500/30">
                      <Calculator size={16} />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xl font-black text-emerald-400 tracking-tight">{stats.currentTotal.toLocaleString('fa-IR')}</span>
                      <span className="text-[10px] font-bold text-stone-400">{activeCurrency}</span>
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-stone-800/80 text-[10px] text-stone-400 font-bold">
                      <span>پیشرفت وزنی مصوب:</span>
                      <span className="font-black text-emerald-400">{stats.totalProgress.toFixed(2)}٪</span>
                    </div>
                  </div>
                </div>

                {/* 2. Contractor Claim Card */}
                <div className="bg-white rounded-[2rem] p-5 border border-blue-200 shadow-sm relative overflow-hidden flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black text-blue-800 uppercase tracking-wider">ادعایی پیمانکار</span>
                    <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 border border-blue-200">
                      <TrendingUp size={16} />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xl font-black text-blue-900 tracking-tight">{stats.contractorTotal.toLocaleString('fa-IR')}</span>
                      <span className="text-[10px] font-bold text-stone-400">{activeCurrency}</span>
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-stone-100 text-[10px] text-stone-500 font-bold">
                      <span>پیشرفت وزنی ادعایی:</span>
                      <span className="font-black text-blue-700">{stats.contractorProgress.toFixed(2)}٪</span>
                    </div>
                  </div>
                </div>

                {/* 3. Consultant Approval Card */}
                <div className="bg-white rounded-[2rem] p-5 border border-amber-200 shadow-sm relative overflow-hidden flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black text-amber-800 uppercase tracking-wider">تایید / اصلاح مشاور</span>
                    <div className="w-8 h-8 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 border border-amber-200">
                      <FileCheck size={16} />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xl font-black text-amber-900 tracking-tight">{stats.consultantTotal.toLocaleString('fa-IR')}</span>
                      <span className="text-[10px] font-bold text-stone-400">{activeCurrency}</span>
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-stone-100 text-[10px] text-stone-500 font-bold">
                      <span>پیشرفت وزنی مشاور:</span>
                      <span className="font-black text-amber-700">{stats.consultantProgress.toFixed(2)}٪</span>
                    </div>
                  </div>
                </div>

                {/* 4. Employer Approval Card */}
                <div className="bg-white rounded-[2rem] p-5 border border-purple-200 shadow-sm relative overflow-hidden flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black text-purple-800 uppercase tracking-wider">تایید کارفرما</span>
                    <div className="w-8 h-8 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 border border-purple-200">
                      <Building2 size={16} />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xl font-black text-purple-900 tracking-tight">{stats.employerTotal.toLocaleString('fa-IR')}</span>
                      <span className="text-[10px] font-bold text-stone-400">{activeCurrency}</span>
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-stone-100 text-[10px] text-stone-500 font-bold">
                      <span>پیشرفت وزنی کارفرما:</span>
                      <span className="font-black text-purple-700">{stats.employerProgress.toFixed(2)}٪</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Grid Section - Full Width */}
              <div className="bg-white rounded-3xl border border-[#e5ded0] shadow-xl overflow-hidden min-h-[600px] flex flex-col">
                  {/* Controls Bar */}
                  <div className="p-5 border-b border-[#ece5d8] flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center bg-[#faf8f4]/30">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white border border-[#ece5d8] rounded-xl flex items-center justify-center text-emerald-600 shadow-sm">
                        <TrendingUp size={20} />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-stone-800">ریز محاسبات CBS دوره {activeStatement.number}</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-bold text-stone-400">{activeStatement.date}</span>
                          <span className={`px-2 py-0.2 rounded-md text-[9px] font-black border ${
                            activeStatement.isFinalFrozen
                              ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                              : activeStatement.status === 'REJECTED'
                                ? "bg-red-50 text-red-600 border-red-100"
                                : "bg-stone-50 text-stone-900 border-blue-100"
                          }`}>
                            {activeStatement.isFinalFrozen
                              ? "تایید نهایی و قطعی"
                              : WorkflowService.getStatusLabel(activeStatement.status as any)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      {/* Workflow Action Buttons for Active Statement (matches Technical Office) */}
                      {activeStatement && activeStatementId !== 'TEMP_DRAFT' && currentUser && (
                        <div className="flex flex-wrap items-center gap-1.5 border-l border-[#e5ded0] pl-2.5 ml-1">
                          {WorkflowService.getAvailableActions(
                            activeStatement as any,
                            currentUser,
                            SystemAdminService.getOrganization(currentUser.orgId)?.type
                          ).map((action) => (
                            <button
                              key={action}
                              onClick={() => openWorkflowModal(activeStatement, action)}
                              className={`px-3 py-2 rounded-xl text-[10px] font-black transition-all flex items-center gap-1.5 shadow-sm ${WorkflowService.getActionStyle(action)}`}
                              title={WorkflowService.getActionLabel(
                                action,
                                SystemAdminService.getOrganization(currentUser.orgId)?.type
                              )}
                            >
                              <Activity size={13} />
                              {WorkflowService.getActionLabel(
                                action,
                                SystemAdminService.getOrganization(currentUser.orgId)?.type
                              )}
                            </button>
                          ))}
                        </div>
                      )}

                      <button
                        onClick={() => setShowComparisonMode(!showComparisonMode)}
                        className={`px-3.5 py-2 rounded-xl text-[10px] font-black transition-all flex items-center gap-2 border ${
                          showComparisonMode 
                            ? 'bg-amber-600 text-white border-amber-600 shadow-md shadow-amber-600/20' 
                            : 'bg-white text-stone-700 border-[#e5ded0] hover:bg-[#faf8f4]'
                        }`}
                        title="نمایش مقایسه بین پیمانکار، مشاور و کارفرما"
                      >
                        <Layers size={14} />
                        {showComparisonMode ? "حالت نمایش تفکیکی و مقایسه (فعال)" : "فعال‌سازی تفکیک پیمانکار/مشاور/کارفرما"}
                      </button>

                      {/* Quick Sync Workflow Buttons */}
                      {isEditable && (currentUser?.role === 'SYSTEM_ADMIN' || SystemAdminService.getOrganization(currentUser?.orgId || '')?.type === OrganizationType.CONSULTANT) && (
                        <button
                          onClick={handleSyncAllContractorToConsultant}
                          className="px-3 py-2 rounded-xl text-[10px] font-black bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 transition-all flex items-center gap-1.5"
                          title="کپی تمامی مقادیر ادعایی پیمانکار به ستون تایید مشاور"
                        >
                          <Copy size={13} />
                          کپی ادعای پیمانکار به مشاور
                        </button>
                      )}

                      {isEditable && (currentUser?.role === 'SYSTEM_ADMIN' || SystemAdminService.getOrganization(currentUser?.orgId || '')?.type === OrganizationType.EMPLOYER) && (
                        <button
                          onClick={handleSyncAllConsultantToEmployer}
                          className="px-3 py-2 rounded-xl text-[10px] font-black bg-purple-50 text-purple-800 border border-purple-300 hover:bg-purple-100 transition-all flex items-center gap-1.5"
                          title="کپی تمامی مقادیر تایید مشاور به ستون تایید کارفرما"
                        >
                          <Copy size={13} />
                          کپی تایید مشاور به کارفرما
                        </button>
                      )}

                      <div className="relative group w-40">
                        <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400" />
                        <input 
                          placeholder="جستجو..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full bg-white border border-[#e5ded0] rounded-xl py-2 pr-8 pl-2.5 text-[10px] font-bold outline-none focus:border-amber-500 transition-all"
                        />
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {activeStatement && (currentUser?.role === 'SYSTEM_ADMIN' || isEditable) && (
                          <button
                            onClick={() => openEditModal(activeStatement)}
                            className="flex items-center gap-1.5 bg-white text-stone-600 px-3 py-2 rounded-xl text-[10px] font-black hover:bg-[#faf8f4] transition-all border border-[#e5ded0]"
                            title="ویرایش مشخصات و دوره صورت‌وضعیت"
                          >
                            <Edit3 size={14} />
                            ویرایش مشخصات
                          </button>
                        )}
                        {isEditable && (
                          <>
                            <button 
                              onClick={() => {
                                if (!isCbsRecipient) {
                                  setToast({ message: "شما کاربر گیرنده کارکردهای ارسالی از بخش اجرا نیستید یا هیچ کارکرد ارسالی در انتظار دریافت ندارید.", type: 'error' });
                                  return;
                                }
                                setIsImportDailyReportsModalOpen(true);
                              }}
                              disabled={!isCbsRecipient}
                              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black transition-all shadow-sm border ${
                                isCbsRecipient 
                                  ? "bg-amber-500 text-stone-950 hover:bg-amber-400 border-amber-600/30 cursor-pointer" 
                                  : "bg-stone-100 text-stone-400 border-stone-200/50 cursor-not-allowed opacity-60"
                              }`}
                              title={isCbsRecipient 
                                ? "فراخوانی اختیاری مقادیر و درصدهای کارکرد از گزارشات روزانه اجرا" 
                                : "این قابلیت فقط برای کاربر گیرنده کارکردهای ارسالی از بخش اجرا فعال می‌باشد."}
                            >
                              <RefreshCw size={13} className={isCbsRecipient ? "text-stone-900" : "text-stone-400"} />
                              فراخوانی از اجرا
                            </button>
                            <button 
                              onClick={() => setIsSaveConfirmModalOpen(true)}
                              className="flex items-center gap-1.5 bg-amber-500 text-stone-950 px-4 py-2 rounded-xl text-[10px] font-black hover:bg-amber-400 transition-all border border-amber-600/30 shadow-sm"
                            >
                              <Save size={14} />
                              ذخیره تغییرات
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Grid Table */}
                  <div className="flex-1 overflow-x-auto">
                    <table className="w-full text-right border-collapse table-fixed min-w-[1200px]">
                      <thead>
                        <tr className="bg-[#faf8f4] border-b border-[#ece5d8] sticky top-0 z-10">
                          <th className="p-3 text-[8px] font-black text-stone-500 uppercase tracking-widest w-[240px]">کد و شرح CBS</th>
                          <th className="p-3 text-[8px] font-black text-stone-500 uppercase tracking-widest text-center w-14">واحد</th>
                          <th className="p-3 text-[8px] font-black text-stone-500 uppercase tracking-widest text-center w-20">مقدار کل</th>
                          <th className="p-3 text-[8px] font-black text-stone-500 uppercase tracking-widest text-center w-24">بهای واحد</th>
                          <th className="p-3 text-[8px] font-black text-stone-500 uppercase tracking-widest text-center w-16">وزن ٪</th>
                          <th className="p-3 text-[8px] font-black text-stone-500 uppercase tracking-widest text-center w-16">تجمعی قبل</th>
                          
                          {showComparisonMode ? (
                            <>
                              <th className="p-3 text-[8px] font-black text-blue-900 uppercase tracking-widest text-center w-36 bg-blue-50/70 border-x border-blue-200">
                                ادعایی پیمانکار (٪ / مقدار)
                              </th>
                              <th className="p-3 text-[8px] font-black text-amber-900 uppercase tracking-widest text-center w-36 bg-amber-50/70 border-x border-amber-200">
                                تایید / اصلاح مشاور (٪ / مقدار)
                              </th>
                              <th className="p-3 text-[8px] font-black text-purple-900 uppercase tracking-widest text-center w-36 bg-purple-50/70 border-x border-purple-200">
                                تایید کارفرما (٪ / مقدار)
                              </th>
                              <th className="p-3 text-[8px] font-black text-emerald-900 uppercase tracking-widest text-center w-28 bg-emerald-50/70 border-x border-emerald-200">
                                مصوب نهایی دوره
                              </th>
                            </>
                          ) : (
                            <>
                              <th className="p-3 text-[8px] font-black text-amber-500 uppercase tracking-widest text-center w-16">دوره قبل</th>
                              <th className="p-3 text-[8px] font-black text-emerald-600 uppercase tracking-widest text-center w-24 bg-emerald-50/50">٪ این دوره</th>
                              <th className="p-3 text-[8px] font-black text-emerald-600 uppercase tracking-widest text-center w-24 bg-emerald-50/50">مقدار این دوره</th>
                            </>
                          )}

                          <th className="p-3 text-[8px] font-black text-stone-500 uppercase tracking-widest text-center w-16">کل تجمعی</th>
                          <th className="p-3 text-[8px] font-black text-stone-500 uppercase tracking-widest text-center w-28">ارزش مالی</th>
                        </tr>
                      </thead>
                      <tbody>
                        {projectNodes.length > 0 ? (
                          renderTreeRows(null)
                        ) : (
                          <tr>
                            <td colSpan={showComparisonMode ? 12 : 11} className="p-20 text-center">
                              <div className="flex flex-col items-center justify-center text-stone-300">
                                <AlertTriangle size={48} className="mb-4 opacity-20" />
                                <p className="font-bold text-sm text-stone-400">هیچ ساختار شکستی (CBS) برای این پروژه تعریف نشده است.</p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
          ) : (
            <div className="bg-white rounded-[3rem] border-2 border-dashed border-[#e5ded0] min-h-[500px] flex flex-col items-center justify-center p-20 text-center">
              <div className="w-32 h-32 bg-[#faf8f4] rounded-3xl flex items-center justify-center mb-8 text-stone-200">
                <FileSignature size={64} />
              </div>
              <h3 className="text-2xl font-black text-stone-800">منتظر انتخاب صورت‌وضعیت</h3>
              <p className="text-stone-500 text-sm mt-4 max-w-sm font-bold leading-relaxed">
                لطفاً از تب «تاریخچه صورت‌وضعیت‌ها» یکی از دوره‌ها را انتخاب کنید تا ریز محاسبات آن در این بخش نمایش داده شود.
              </p>
              <button 
                onClick={() => setActiveTab('history')}
                className="mt-8 bg-stone-900 text-white px-8 py-3 rounded-2xl text-xs font-black shadow-lg shadow-stone-100"
              >
                بازگشت به تاریخچه
              </button>
            </div>
          )}
        </div>
      )}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-md animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm text-center">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full mx-auto flex items-center justify-center mb-4">
              <AlertTriangle size={32} />
            </div>
            <h3 className="text-lg font-black text-stone-800 font-sans">حذف آیتم</h3>
            <p className="text-sm text-stone-500 mt-2 font-sans">
              آیا از حذف این مورد اطمینان دارید؟ عملیات غیرقابل بازگشت است.
            </p>
            <div className="flex gap-4 mt-6 font-sans">
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setDeleteId(null);
                }}
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

      {/* Save Confirmation Modal */}
      {isSaveConfirmModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-md animate-fadeIn" dir="rtl">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm text-center border border-[#ece5d8]">
            <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-full mx-auto flex items-center justify-center mb-4">
              <Save size={32} />
            </div>
            <h3 className="text-lg font-black text-stone-800 font-sans">ذخیره تغییرات صورت‌وضعیت</h3>
            <p className="text-sm text-stone-500 mt-2 font-sans">
              آیا از ذخیره تغییرات صورت‌وضعیت اطمینان دارید؟
            </p>
            <div className="flex gap-4 mt-6 font-sans">
              <button
                onClick={() => setIsSaveConfirmModalOpen(false)}
                className="flex-1 py-3 rounded-xl bg-stone-100 text-stone-700 font-bold hover:bg-stone-200 transition-colors"
              >
                انصراف
              </button>
              <button
                onClick={() => {
                  setIsSaveConfirmModalOpen(false);
                  saveStatements();
                }}
                className="flex-1 py-3 rounded-xl bg-amber-500 text-stone-950 font-bold hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20"
              >
                تایید و ذخیره
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Daily Reports Modal */}
      {isImportDailyReportsModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-md animate-fadeIn" dir="rtl">
          <div className="bg-white rounded-3xl border border-[#ece5d8] shadow-2xl max-w-2xl w-full overflow-hidden animate-slideUp text-right">
            {/* Modal Header */}
            <div className="bg-[#faf8f4] border-b border-[#ece5d8] p-6 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 text-amber-800 rounded-xl flex items-center justify-center">
                  <RefreshCw size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-stone-800">فراخوانی از گزارشات روزانه اجرا</h3>
                  <p className="text-xs text-stone-500 font-bold mt-0.5">انتقال اختیاری مقادیر و درصدهای کارکرد احجام عملیاتی به صورت‌وضعیت CBS</p>
                </div>
              </div>
              <button 
                onClick={() => setIsImportDailyReportsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-stone-200/50 hover:bg-stone-200 text-stone-600 flex items-center justify-center transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 text-xs font-bold text-amber-900 space-y-2">
                <div className="flex items-center gap-2 font-black text-amber-800">
                  <Info size={16} /> راهنمای همگام‌سازی:
                </div>
                <p className="leading-relaxed">
                  احجام کارکرد فیزیکی و درصد‌های وزنی ثبت‌شده در گزارشات روزانه بخش اجرا بر اساس ساختار شکست مصوب (CBS) جمع‌آوری شده‌اند. مبنای اعمال در این صورت‌وضعیت را انتخاب کنید:
                </p>
              </div>

              {/* Mode Selection */}
              <div className="flex items-center gap-6 bg-[#faf8f4] p-4 rounded-2xl border border-[#ece5d8]">
                <span className="text-xs font-black text-stone-700">مبنای بروزرسانی:</span>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-stone-800">
                  <input
                    type="radio"
                    name="importApplyType"
                    checked={importApplyType === 'percent'}
                    onChange={() => setImportApplyType('percent')}
                    className="accent-amber-600"
                  />
                  درصد پیشرفت وزنی (%)
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-stone-800">
                  <input
                    type="radio"
                    name="importApplyType"
                    checked={importApplyType === 'quantity'}
                    onChange={() => setImportApplyType('quantity')}
                    className="accent-amber-600"
                  />
                  مقدار فیزیکی کارکرد (حجم)
                </label>
              </div>

              {/* Aggregated CBS Items List */}
              <div className="space-y-2">
                <h4 className="text-xs font-black text-stone-700 flex justify-between items-center">
                  <span>لیست آیتم‌های CBS دارای کارکرد در گزارشات روزانه ({dailyReportAggregatedCbsData.length} مورد)</span>
                </h4>
                {dailyReportAggregatedCbsData.length === 0 ? (
                  <div className="p-8 text-center bg-[#faf8f4] rounded-2xl border border-dashed border-[#ece5d8] text-xs font-bold text-stone-400">
                    هیچ کارکردی بر اساس ساختار شکست مصوب (CBS) در گزارشات روزانه این پروژه ثبت نشده است.
                  </div>
                ) : (
                  <div className="border border-[#ece5d8] rounded-2xl overflow-hidden">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-[#faf8f4] text-stone-500 font-bold border-b border-[#ece5d8]">
                        <tr>
                          <th className="p-3">کد و عنوان CBS</th>
                          <th className="p-3 text-center">تعداد گزارشات</th>
                          <th className="p-3 text-center">مجموع مقدار اجرا</th>
                          <th className="p-3 text-center">مجموع درصد وزنی</th>
                          <th className="p-3 text-center">وضعیت اعمال</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100 text-stone-800 font-bold">
                        {dailyReportAggregatedCbsData.map((item) => (
                          <tr key={item.cbsId} className="hover:bg-stone-50/80">
                            <td className="p-3">
                              <span className="font-mono text-stone-500 text-[11px] block">{item.node.code}</span>
                              <span className="text-stone-900 font-bold">{item.node.title}</span>
                            </td>
                            <td className="p-3 text-center text-stone-500 font-mono">{item.count} روز</td>
                            <td className="p-3 text-center text-stone-900 font-black">
                              {item.totalQty.toLocaleString("fa-IR")} {item.node.unit}
                            </td>
                            <td className="p-3 text-center text-amber-700 font-black font-mono">
                              {item.totalWeightPercent ? item.totalWeightPercent.toFixed(3) : 0}%
                            </td>
                            <td className="p-3 text-center text-emerald-600 text-[10px]">
                              آماده جایگزینی
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-[#faf8f4] border-t border-[#ece5d8] p-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsImportDailyReportsModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-stone-100 text-stone-700 text-xs font-bold hover:bg-stone-200 transition-colors"
              >
                انصراف
              </button>
              {dailyReportAggregatedCbsData.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    dailyReportAggregatedCbsData.forEach(item => {
                      const valToApply = importApplyType === 'percent' ? item.totalWeightPercent : item.totalQty;
                      if (valToApply > 0) {
                        updateProgress(item.cbsId, valToApply, importApplyType);
                      }
                    });

                    // Mark the user's active transfers as 'USED'
                    try {
                      const savedTransfers = localStorage.getItem("hamyar_cbs_sent_transfers");
                      const transfers = savedTransfers ? JSON.parse(savedTransfers) : [];
                      const updatedTransfers = transfers.map((t: any) => {
                        if (String(t.projectId) === String(selectedProjectId) && 
                            t.recipientId === currentUser?.id && 
                            t.status === 'SENT') {
                          return { ...t, status: 'USED' };
                        }
                        return t;
                      });
                      localStorage.setItem("hamyar_cbs_sent_transfers", JSON.stringify(updatedTransfers));
                      setSentTransfers(updatedTransfers);
                    } catch (e) {
                      console.error("Error updating transfer status", e);
                    }

                    setIsImportDailyReportsModalOpen(false);
                    setToast({ message: "مقادیر گزارشات روزانه با موفقیت به صورت‌وضعیت متصل و اعمال گردید.", type: 'success' });
                  }}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 text-stone-950 text-xs font-black hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20 flex items-center gap-1.5"
                >
                  <RefreshCw size={14} />
                  تایید و اعمال در صورت‌وضعیت
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Statement Info Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-md animate-fadeIn">
          <div className="bg-white rounded-3xl border border-[#ece5d8] shadow-2xl max-w-md w-full overflow-hidden animate-slideUp text-right" dir="rtl">
            {/* Modal Header */}
            <div className="bg-[#faf8f4] border-b border-[#ece5d8] p-6 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-stone-800">اطلاعات اولیه صورت‌وضعیت جدید</h3>
                  <p className="text-[10px] text-stone-400 font-bold mt-0.5">لطفاً مشخصات دوره صورت‌وضعیت را وارد کنید</p>
                </div>
              </div>
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="p-2 hover:bg-stone-100 rounded-lg transition-colors text-stone-400 hover:text-stone-600"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-stone-500 mb-1.5">شماره صورت‌وضعیت</label>
                  <input
                    type="text"
                    value={formNumber}
                    onChange={(e) => setFormNumber(e.target.value)}
                    className="w-full bg-[#faf8f4] border border-[#e5ded0] rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-emerald-500 transition-all text-center"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-stone-500 mb-1.5">تاریخ ثبت</label>
                  <ShamsiDatePicker
                    value={formDate}
                    onChange={setFormDate}
                    inputClassName="!bg-[#faf8f4] !border-[#e5ded0] !rounded-xl !px-4 !py-2.5 !text-xs !font-bold outline-none focus:!border-emerald-500 transition-all !text-center"
                    placeholder="۱۴۰۲/۰۶/۳۱"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-stone-500 mb-1.5">تاریخ شروع دوره</label>
                  <ShamsiDatePicker
                    value={formStartDate}
                    onChange={setFormStartDate}
                    inputClassName="!bg-[#faf8f4] !border-[#e5ded0] !rounded-xl !px-4 !py-2.5 !text-xs !font-bold outline-none focus:!border-emerald-500 transition-all !text-center"
                    placeholder="۱۴۰۲/۰۶/۰۱"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-stone-500 mb-1.5">تاریخ پایان دوره</label>
                  <ShamsiDatePicker
                    value={formEndDate}
                    onChange={setFormEndDate}
                    inputClassName="!bg-[#faf8f4] !border-[#e5ded0] !rounded-xl !px-4 !py-2.5 !text-xs !font-bold outline-none focus:!border-emerald-500 transition-all !text-center"
                    placeholder="۱۴۰۲/۰۶/۳۱"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-stone-500 mb-1.5">توضیحات صورت‌وضعیت</label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full bg-[#faf8f4] border border-[#e5ded0] rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-emerald-500 transition-all"
                  placeholder="مثال: صورت وضعیت موقت شماره ۳ دوره شهریور ماه"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-[#faf8f4] border-t border-[#ece5d8] p-6 flex justify-end gap-2">
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="px-5 py-2.5 rounded-xl text-[10px] font-black text-stone-500 hover:bg-stone-100 transition-all"
              >
                انصراف
              </button>
              <button
                onClick={handleConfirmCreate}
                className="px-6 py-2.5 rounded-xl text-[10px] font-black bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-md shadow-emerald-100"
              >
                تایید و ورود ریز صورت‌وضعیت
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Statement Info Modal */}
      {isEditModalOpen && editingStatement && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-md animate-fadeIn" dir="rtl">
          <div className="bg-white rounded-3xl border border-[#ece5d8] shadow-2xl max-w-lg w-full overflow-hidden animate-slideUp text-right">
            {/* Modal Header */}
            <div className="bg-[#faf8f4] border-b border-[#ece5d8] p-6 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 text-amber-700 rounded-xl flex items-center justify-center">
                  <Edit3 size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-stone-800">ویرایش مشخصات صورت‌وضعیت شماره {editingStatement.number}</h3>
                  <p className="text-[10px] text-stone-400 font-bold mt-0.5">
                    {currentUser?.role === 'SYSTEM_ADMIN' 
                      ? 'مدیریت و ویرایش کامل مشخصات، وضعیت و ارجاع توسط مدیر کل سیستم' 
                      : 'ویرایش مشخصات و بازه زمانی دوره صورت‌وضعیت'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingStatement(null);
                }}
                className="p-2 hover:bg-stone-100 rounded-lg transition-colors text-stone-400 hover:text-stone-600"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-stone-500 mb-1.5">شماره صورت‌وضعیت</label>
                  <input
                    type="text"
                    value={editNumber}
                    onChange={(e) => setEditNumber(e.target.value)}
                    className="w-full bg-[#faf8f4] border border-[#e5ded0] rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-amber-500 transition-all text-center"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-stone-500 mb-1.5">تاریخ ثبت</label>
                  <input
                    type="text"
                    value={editDate}
                    onChange={(e) => handleDateInput(e.target.value, setEditDate)}
                    className="w-full bg-[#faf8f4] border border-[#e5ded0] rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-amber-500 transition-all text-center"
                    placeholder="۱۴۰۲/۰۶/۳۱"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-stone-500 mb-1.5">تاریخ شروع دوره</label>
                  <input
                    type="text"
                    value={editStartDate}
                    onChange={(e) => handleDateInput(e.target.value, setEditStartDate)}
                    className="w-full bg-[#faf8f4] border border-[#e5ded0] rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-amber-500 transition-all text-center"
                    placeholder="۱۴۰۲/۰۶/۰۱"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-stone-500 mb-1.5">تاریخ پایان دوره</label>
                  <input
                    type="text"
                    value={editEndDate}
                    onChange={(e) => handleDateInput(e.target.value, setEditEndDate)}
                    className="w-full bg-[#faf8f4] border border-[#e5ded0] rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-amber-500 transition-all text-center"
                    placeholder="۱۴۰۲/۰۶/۳۱"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-stone-500 mb-1.5">توضیحات صورت‌وضعیت</label>
                <input
                  type="text"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full bg-[#faf8f4] border border-[#e5ded0] rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-amber-500 transition-all"
                  placeholder="توضیحات دوره صورت وضعیت..."
                />
              </div>

              {/* System Admin Specific Controls */}
              {currentUser?.role === 'SYSTEM_ADMIN' && (
                <div className="border-t border-[#ece5d8] pt-4 mt-2 space-y-4">
                  <div className="bg-amber-50/70 p-3 rounded-2xl border border-amber-200/60 text-[11px] font-black text-amber-800 flex items-center gap-2">
                    <Info size={16} className="shrink-0" />
                    تنظیمات اختصاصی مدیر کل سیستم (تغییر وضعیت گردش‌کار و ارجاع در هر شرایط):
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-stone-500 mb-1.5">وضعیت گردش کار</label>
                      <select
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value as WorkflowStatus)}
                        className="w-full bg-[#faf8f4] border border-[#e5ded0] rounded-xl px-3 py-2.5 text-xs font-bold outline-none focus:border-amber-500 transition-all"
                      >
                        <option value={WorkflowStatus.DRAFT}>پیش‌نویس (DRAFT)</option>
                        <option value={WorkflowStatus.IN_REVIEW}>در حال بررسی داخلی (IN_REVIEW)</option>
                        <option value={WorkflowStatus.APPROVED_INTERNAL}>تایید داخلی پیمانکار (APPROVED_INTERNAL)</option>
                        <option value={WorkflowStatus.SENT_TO_CONSULTANT}>ارسال شده به مشاور (SENT_TO_CONSULTANT)</option>
                        <option value={WorkflowStatus.IN_CONSULTANT_REVIEW}>در حال بررسی مشاور (IN_CONSULTANT_REVIEW)</option>
                        <option value={WorkflowStatus.APPROVED_BY_CONSULTANT}>تایید شده توسط مشاور (APPROVED_BY_CONSULTANT)</option>
                        <option value={WorkflowStatus.SENT_TO_EMPLOYER}>ارسال شده به کارفرما (SENT_TO_EMPLOYER)</option>
                        <option value={WorkflowStatus.IN_EMPLOYER_REVIEW}>در حال بررسی کارفرما (IN_EMPLOYER_REVIEW)</option>
                        <option value={WorkflowStatus.APPROVED_BY_EMPLOYER}>تایید نهایی کارفرما (APPROVED_BY_EMPLOYER)</option>
                        <option value={WorkflowStatus.REJECTED}>رد شده (REJECTED)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-stone-500 mb-1.5">کاربر مسئول (ارجاع فعلی)</label>
                      <select
                        value={editAssigneeId}
                        onChange={(e) => setEditAssigneeId(e.target.value)}
                        className="w-full bg-[#faf8f4] border border-[#e5ded0] rounded-xl px-3 py-2.5 text-xs font-bold outline-none focus:border-amber-500 transition-all"
                      >
                        <option value="">بدون ارجاع مستقیم (پیش‌فرض)</option>
                        {orgUsers.filter(u => u.isActive).map((u) => {
                          const uOrg = SystemAdminService.getOrganization(u.orgId);
                          return (
                            <option key={u.id} value={u.id}>
                              {formatUserDisplayFormal(u, uOrg)}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 bg-[#faf8f4] p-3.5 rounded-2xl border border-[#ece5d8]">
                    <input
                      type="checkbox"
                      id="editIsFinalFrozen"
                      checked={editIsFinalFrozen}
                      onChange={(e) => setEditIsFinalFrozen(e.target.checked)}
                      className="w-4 h-4 rounded accent-amber-600 cursor-pointer"
                    />
                    <label htmlFor="editIsFinalFrozen" className="text-xs font-bold text-stone-700 cursor-pointer">
                      سند قفل و نهایی شده است (Final Frozen)
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-[#faf8f4] border-t border-[#ece5d8] p-6 flex justify-end gap-2">
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingStatement(null);
                }}
                className="px-5 py-2.5 rounded-xl text-[10px] font-black text-stone-500 hover:bg-stone-100 transition-all"
              >
                انصراف
              </button>
              <button
                onClick={handleConfirmEdit}
                className="px-6 py-2.5 rounded-xl text-[10px] font-black bg-amber-500 text-stone-950 hover:bg-amber-400 transition-all shadow-md shadow-amber-500/20"
              >
                ذخیره مشخصات
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Workflow Modal */}
      {workflowModalOpen && workflowActionType && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fadeIn" dir="rtl">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-[#ece5d8] flex justify-between items-center bg-[#faf8f4]">
              <h3 className="font-black text-stone-800 flex items-center gap-2">
                <Activity size={20} className="text-stone-900" />
                {workflowActionType === "SUBMIT" && "ارسال جهت بررسی"}
                {workflowActionType === "REASSIGN" && "ارجاع به کارشناس دیگر"}
                {workflowActionType === "APPROVE" &&
                  (currentUser &&
                  (SystemAdminService.getOrganization(currentUser.orgId)?.type === OrganizationType.CONSULTANT ||
                   SystemAdminService.getOrganization(currentUser.orgId)?.type === OrganizationType.EMPLOYER)
                    ? "تایید"
                    : "تایید و ارجاع")}
                {workflowActionType === "FINAL_APPROVE" &&
                  (currentUser && SystemAdminService.getOrganization(currentUser.orgId)?.type === OrganizationType.EMPLOYER
                    ? "تایید و ثبت نهایی"
                    : "تایید نهایی")}
                {workflowActionType === "REJECT" && "رد و بازگشت برای اصلاح"}
                {workflowActionType === "SEND_TO_CONSULTANT" && "ارسال به مشاور"}
                {workflowActionType === "SEND_TO_EMPLOYER" &&
                  (currentUser && SystemAdminService.getOrganization(currentUser.orgId)?.type === OrganizationType.CONSULTANT
                    ? "تایید و ارسال به کارفرما"
                    : "ارسال به کارفرما")}
                {workflowActionType === "RETURN_TO_CONTRACTOR" && "عودت به پیمانکار"}
                {workflowActionType === "RETURN_TO_CONSULTANT" && "عودت به مشاور"}
                {workflowActionType === "UNFREEZE_BY_VARIATION" && "رفع قفل و بازگشایی (Unfreeze)"}
              </h3>
              <button
                onClick={() => {
                  setWorkflowModalOpen(false);
                  setWorkflowActionType(null);
                  setWorkflowComment('');
                }}
                className="p-2 hover:bg-stone-200 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Assignee selection */}
              {(() => {
                const ut = (currentUser?.jobTitle || "").trim();
                const ul = (currentUser?.jobLevel || "").trim();
                const isPMOrWorkshopManager =
                  currentUser?.role === "SYSTEM_ADMIN" ||
                  ut.includes("مدیر پروژه") ||
                  ut.includes("سرپرست کارگاه") ||
                  ul.includes("مدیر پروژه") ||
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
                        className="w-full p-3 bg-[#faf8f4] border border-[#e5ded0] rounded-xl text-sm font-bold outline-none focus:border-stone-500 transition-all font-sans"
                      >
                        <option value="">انتخاب کنید...</option>
                        {eligibleUsers.map((u) => (
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

              {/* Comments textarea */}
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

              {/* Electronic Signature Toggle & Status Card (Identical to Technical Office) */}
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
                          <div className="flex items-center gap-3">
                            <div className="w-16 h-10 bg-white border border-stone-200 rounded-lg p-1 flex items-center justify-center shrink-0 shadow-sm">
                              <img src={hrSig} alt="امضای دیجیتال" className="max-h-full max-w-full object-contain" />
                            </div>
                            <div>
                              <div className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                                <CheckCircle size={13} /> امضای الکترونیکی آماده درج است
                              </div>
                              <div className="text-[10px] text-stone-500 mt-0.5">
                                امضای تاییدشده و ثبت‌شده در منابع انسانی ({currentUser?.fullName || currentUser?.username})
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start gap-2 text-amber-700 text-xs bg-amber-50/70 p-2.5 rounded-lg border border-amber-200/60">
                            <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-600" />
                            <div>
                              <p className="font-bold text-stone-800">امضای الکترونیکی شما در سیستم منابع انسانی ثبت نشده است</p>
                              <p className="text-[10px] text-stone-500 mt-0.5">
                                جهت درج امضا روی اسناد، امضای رسمی خود را در بخش منابع انسانی ثبت نمایید.
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
                  onClick={() => {
                    setWorkflowModalOpen(false);
                    setWorkflowActionType(null);
                    setWorkflowComment('');
                  }}
                  className="flex-1 py-3 rounded-xl bg-stone-100 text-stone-600 font-bold hover:bg-stone-200 transition-all text-sm"
                >
                  انصراف
                </button>
                <button
                  onClick={() => handleWorkflowSubmit()}
                  disabled={(() => {
                    const ut = (currentUser?.jobTitle || "").trim();
                    const ul = (currentUser?.jobLevel || "").trim();
                    const isPMOrWorkshopManager =
                      currentUser?.role === "SYSTEM_ADMIN" ||
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
                  className={`flex-1 py-3 rounded-xl text-white font-bold shadow-lg transition-all text-sm ${
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

      {/* History Timeline Modal */}
      {historyModalOpen && historyItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fadeIn" dir="rtl">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl max-h-[80vh] flex flex-col text-stone-700">
            <div className="p-6 border-b border-[#ece5d8] flex justify-between items-center bg-[#faf8f4]">
              <h3 className="font-black text-stone-800 flex items-center gap-2 text-sm md:text-base">
                <ScrollText size={20} className="text-stone-600" />
                تاریخچه گردش کار صورت‌وضعیت شماره {historyItem.number}
              </h3>
              <button
                onClick={() => {
                  setHistoryModalOpen(false);
                  setHistoryItem(null);
                }}
                className="p-2 hover:bg-stone-200 rounded-full transition-colors text-stone-500"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4 text-right" dir="rtl">
              {(!historyItem.workflowHistory || historyItem.workflowHistory.length === 0) ? (
                <div className="text-center text-stone-400 py-8 text-sm font-bold">
                  هیچ رویدادی برای این صورت‌وضعیت ثبت نشده است. (پیش‌نویس اولیه)
                </div>
              ) : (
                [...historyItem.workflowHistory]
                  .sort((a, b) => b.timestamp - a.timestamp)
                  .map((event: any, idx: number) => (
                    <div key={event.id || idx} className="flex gap-4 relative">
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-3 h-3 rounded-full z-10 ${
                            event.action === "APPROVE"
                              ? "bg-emerald-500"
                              : event.action === "REJECT"
                                ? "bg-red-500"
                                : "bg-amber-500"
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
                            {event.timestamp ? new Date(event.timestamp).toLocaleString("fa-IR") : event.date}
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
                            <div className="text-[10px] text-amber-600 bg-stone-50 px-2 py-1 rounded-lg w-fit mb-1">
                              گیرنده: {fullAssigneeName}
                            </div>
                          ) : null;
                        })()}
                        {(event.comment || event.comments) && (
                          <div className="text-[10px] text-stone-600 bg-[#faf8f4] p-2.5 rounded-xl border border-[#ece5d8] italic">
                            <span className="block">"{event.comment || event.comments}"</span>
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

      {/* Official Report Preview Modal */}
      {isReportModalOpen && reportModalStatement && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-2 sm:p-4 animate-fadeIn" dir="rtl">
          <div className="bg-white rounded-3xl w-full max-w-5xl overflow-hidden shadow-2xl max-h-[92vh] flex flex-col text-stone-800 border border-stone-200">
            {/* Modal Header */}
            <div className="p-4 border-b border-stone-200 flex justify-between items-center bg-stone-50">
              <div className="flex items-center gap-2">
                <FileText size={20} className="text-stone-700" />
                <h3 className="font-black text-stone-800 text-sm md:text-base">
                  پیش‌نمایش گزارش رسمی و مدیریتی صورت‌وضعیت CBS شماره {reportModalStatement.number}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePrintCbsStatement(reportModalStatement)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer size={15} />
                  چاپ گزارش
                </button>
                <button
                  onClick={() => {
                    setIsReportModalOpen(false);
                    setReportModalStatement(null);
                  }}
                  className="p-2 hover:bg-stone-200 rounded-full transition-colors text-stone-500 cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Content - Exact matching report layout */}
            <div className="p-6 overflow-y-auto flex-1 bg-stone-100/50 space-y-4" dir="rtl">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 space-y-4 max-w-4xl mx-auto">
                {/* Standard System Header */}
                <div className="border border-stone-300 rounded-2xl p-4 bg-white space-y-3 shadow-sm">
                  <div className="flex justify-between items-center border-b border-stone-200 pb-3">
                    <div className="w-1/3 text-right">
                      <p className="font-bold text-[10px] text-stone-500">جمهوری اسلامی ایران</p>
                      <p className="font-bold text-xs text-stone-800 mt-0.5">{currentProject?.employerName || "دستگاه اجرایی / کارفرما"}</p>
                    </div>
                    <div className="w-1/3 text-center">
                      <h2 className="text-sm md:text-base font-black text-stone-900 m-0">صورت‌وضعیت کارکرد ساختار شکست هزینه (CBS)</h2>
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-3 py-0.5 rounded-full inline-block border border-amber-200 mt-1">
                        دفتر فنی پروژه - صورت‌وضعیت شماره {reportModalStatement.number}
                      </span>
                    </div>
                    <div className="w-1/3 text-left text-[10.5px] text-stone-600 font-mono space-y-0.5" dir="rtl">
                      <div><strong>تاریخ تنظیم:</strong> {reportModalStatement.date || "---"}</div>
                      <div>
                        <strong>دوره کارکرد:</strong>{" "}
                        <span className="text-blue-700 font-bold">
                          {reportModalStatement.startDate && reportModalStatement.endDate
                            ? `از ${reportModalStatement.startDate} تا ${reportModalStatement.endDate}`
                            : reportModalStatement.startDate || reportModalStatement.endDate || reportModalStatement.date || "---"}
                        </span>
                      </div>
                      <div><strong>وضعیت:</strong> {WorkflowService.getStatusLabel(WorkflowService.getStatus(reportModalStatement as any))}</div>
                    </div>
                  </div>

                  {/* Project Specs Table Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-stone-700 pt-1">
                    <div><strong>پروژه / پیمان:</strong> <span className="font-bold text-stone-900">{currentProject?.title || "---"}</span></div>
                    <div><strong>شماره پیمان:</strong> <span className="font-mono font-bold text-stone-900">{currentProject?.contractNumber || "---"}</span></div>
                    <div><strong>دستگاه اجرایی:</strong> <span className="font-bold text-stone-900">{currentProject?.employerName || "---"}</span></div>
                    <div><strong>مهندس مشاور:</strong> <span className="font-bold text-stone-900">{currentProject?.consultantName || "---"}</span></div>
                    <div><strong>پیمانکار:</strong> <span className="font-bold text-stone-900">{currentProject?.contractorName || "---"}</span></div>
                    <div><strong>مبلغ کل پیمان:</strong> <span className="font-mono font-bold text-stone-900">{currentProject?.initialBudget ? currentProject.initialBudget.toLocaleString("fa-IR") + " " + activeCurrency : "---"}</span></div>
                    <div><strong>شماره صورت‌وضعیت:</strong> <span className="font-bold text-amber-700">صورت‌وضعیت شماره {reportModalStatement.number}</span></div>
                    <div><strong>تاریخ تنظیم:</strong> <span className="font-bold text-stone-800">{reportModalStatement.date || "---"}</span></div>
                    <div>
                      <strong>دوره صورت وضعیت (کارکرد):</strong>{" "}
                      <span className="font-bold text-blue-700 font-mono bg-blue-50 px-2 py-0.5 rounded border border-blue-200 inline-block">
                        {reportModalStatement.startDate && reportModalStatement.endDate
                          ? `از ${reportModalStatement.startDate} تا ${reportModalStatement.endDate}`
                          : reportModalStatement.startDate || reportModalStatement.endDate || reportModalStatement.date || "---"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Summary Progress */}
                {(() => {
                  let grossVal = 0;
                  let weightProg = 0;

                  projectNodes.forEach(node => {
                    const isLeaf = !projectNodes.some(n => n.parentId === node.id);
                    if (isLeaf) {
                      const v = reportModalStatement.values.find(val => val.cbsId === node.id);
                      if (v) {
                        grossVal += (v.currentProgressPercent / 100) * node.budget;
                        weightProg += (v.currentProgressPercent * node.weightPercent) / 100;
                      }
                    }
                  });

                  return (
                    <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 flex justify-around items-center">
                      <div>
                        <span className="text-xs text-stone-500 font-bold block">ارزش ناخالص کارکرد این دوره:</span>
                        <span className="text-base font-black text-emerald-600">{Math.round(grossVal).toLocaleString('fa-IR')} {activeCurrency}</span>
                      </div>
                      <div className="h-8 w-px bg-stone-200"></div>
                      <div>
                        <span className="text-xs text-stone-500 font-bold block">پیشرفت فیزیکی موزون این دوره:</span>
                        <span className="text-base font-black text-blue-600">{weightProg.toFixed(2)}٪</span>
                      </div>
                    </div>
                  );
                })()}

                {/* 9-Box Signature Cards (Matching Standard Statements & Minutes) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-3">
                  {/* Contractor Box */}
                  <div className="border border-blue-200 rounded-xl p-2 bg-blue-50/30">
                    <div className="text-[10px] font-black text-blue-900 border-b border-blue-200 pb-1 mb-2 text-center">
                      پیمانکار: {currentProject?.contractorName || "---"}
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {renderSigCard("تنظیم‌کننده", getRoleSignatory("contractor_tech", reportModalStatement))}
                      {renderSigCard("سرپرست واحد", getRoleSignatory("contractor_head", reportModalStatement))}
                      {renderSigCard("سرپرست کارگاه", getRoleSignatory("contractor_site", reportModalStatement))}
                    </div>
                  </div>

                  {/* Consultant Box */}
                  <div className="border border-emerald-200 rounded-xl p-2 bg-emerald-50/30">
                    <div className="text-[10px] font-black text-emerald-900 border-b border-emerald-200 pb-1 mb-2 text-center">
                      مشاور: {currentProject?.consultantName || "---"}
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {renderSigCard("ناظر مقیم", getRoleSignatory("consultant_tech", reportModalStatement))}
                      {renderSigCard("سرپرست واحد", getRoleSignatory("consultant_head", reportModalStatement))}
                      {renderSigCard("سرپرست نظارت", getRoleSignatory("consultant", reportModalStatement))}
                    </div>
                  </div>

                  {/* Employer Box */}
                  <div className="border border-purple-200 rounded-xl p-2 bg-purple-50/30">
                    <div className="text-[10px] font-black text-purple-900 border-b border-purple-200 pb-1 mb-2 text-center">
                      کارفرما: {currentProject?.employerName || "---"}
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {renderSigCard("کارشناس بررسی", getRoleSignatory("employer_tech", reportModalStatement))}
                      {renderSigCard("سرپرست واحد", getRoleSignatory("employer_head", reportModalStatement))}
                      {renderSigCard("مدیر طرح", getRoleSignatory("employer", reportModalStatement))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Toast Notification System */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[200] flex items-center gap-3 bg-stone-900 text-white px-5 py-3.5 rounded-2xl shadow-xl shadow-stone-900/25 border border-stone-850 animate-slideUp" dir="rtl">
          {toast.type === 'success' ? (
            <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 size={16} />
            </div>
          ) : toast.type === 'error' ? (
            <div className="w-6 h-6 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center shrink-0">
              <AlertTriangle size={16} />
            </div>
          ) : (
            <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-blue-400 flex items-center justify-center shrink-0">
              <Info size={16} />
            </div>
          )}
          <p className="text-[11px] font-black font-sans leading-none">{toast.message}</p>
        </div>
      )}
    </div>
  );
}
