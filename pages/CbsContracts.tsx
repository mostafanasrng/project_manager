import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { 
  FileText, Plus, Search, Filter, Trash2, Edit2, Calendar, FileCheck, AlertTriangle, 
  DollarSign, Landmark, ShieldCheck, ChevronRight, CheckCircle2, History, MessageSquare, 
  Paperclip, ArrowRightLeft, BookOpen, Layers, Users, Download, Eye, ExternalLink, RefreshCw, Clock, FolderKanban,
  FileSpreadsheet, Upload
} from 'lucide-react';
import { MOCK_PROJECTS, INITIAL_CONTRACTS } from '../constants';
import { SystemAdminService } from '../services/systemAdminService';
import { 
  Project, 
  WorkflowStatus, 
  CbsContract, 
  ContractStatus, 
  ContractType, 
  CbsMappingItem, 
  ContractWarranty, 
  ContractRevision, 
  ContractAttachment, 
  ContractNote, 
  ContractAuditLog 
} from '../types';
import { ShamsiDatePicker } from '../components/ShamsiDatePicker';
import { getTodayShamsi, calculateActivityPlannedProgress } from '../utils/dateUtils';

// Initial Mock Contracts Data is now imported from ../constants


export default function CbsContracts() {
  const currentUser = useMemo(() => SystemAdminService.getCurrentUser(), []);
  const [projects, setProjects] = useState<Project[]>(() => {
    try {
      const saved = localStorage.getItem('hamyar_projects');
      if (saved) {
        const loaded = JSON.parse(saved);
        if (Array.isArray(loaded)) {
          return loaded.filter((p: any) => p.id !== '2' && !String(p.title || '').includes('تصفیه‌خانه مرکزی') && !String(p.title || '').includes('تسویه خانه مرکزی') && !String(p.title || '').includes('نیایش'));
        }
      }
    } catch (e) {}
    return MOCK_PROJECTS;
  });

  const isEmployerPmorWS = useMemo(() => {
    if (!currentUser) return false;
    if (currentUser.role === 'SYSTEM_ADMIN') return true;
    const userOrg = SystemAdminService.getOrganization(currentUser.orgId);
    const isEmployer = !userOrg || userOrg.type === 'EMPLOYER';
    const jobLevel = (currentUser.jobLevel || '').trim();
    const jobTitle = (currentUser.jobTitle || '').trim();
    const role = currentUser.role;

    const isPM = role === 'ORG_ADMIN' || jobLevel.includes('مدیر پروژه') || jobTitle.includes('مدیر پروژه') || currentUser.username === 'mostafa' || currentUser.username === 'e-pm' || currentUser.id === 'e-pm';
    const isWS = role === 'ORG_MANAGER' || jobLevel.includes('سرپرست') || jobTitle.includes('سرپرست') || currentUser.username === 'reza' || currentUser.id === 'reza';

    return isEmployer && (isPM || isWS);
  }, [currentUser]);

  const isProjectAllocatedByAdmin = (project: Project | undefined | null): boolean => {
    if (!project) return false;
    if (project.status === 'REGISTERED') {
      const accessList = SystemAdminService.getAccess();
      const hasActiveAccess = accessList.some(a => String(a.projectId).trim() === String(project.id).trim() && a.isActive);
      if (!hasActiveAccess) {
        return false; // Not allocated yet by System Admin
      }
    }
    return true; // Allocated
  };

  const accessibleProjects = useMemo(() => {
    return projects.filter(p => {
      if (currentUser?.role === 'SYSTEM_ADMIN') return true;
      const isAllocated = isProjectAllocatedByAdmin(p);
      
      // Before project allocation by System Admin: ONLY Employer PM and Employer Site Supervisor can see the project and contracts
      if (!isAllocated) {
        return isEmployerPmorWS;
      }
      
      // After project allocation by System Admin:
      return SystemAdminService.canUserAccessProject(p.id, currentUser);
    });
  }, [projects, currentUser, isEmployerPmorWS]);

  const [contracts, setContracts] = useState<CbsContract[]>(() => {
    const saved = localStorage.getItem('hamyar_cbs_contracts');
    if (saved && saved !== '[]') {
      try {
        const loaded = JSON.parse(saved);
        if (Array.isArray(loaded)) {
          const cleaned = loaded.filter((c: any) => c.projectId !== '2' && c.id !== 'con-cbs-main' && !String(c.title || '').includes('تصفیه‌خانه مرکزی') && !String(c.title || '').includes('تسویه خانه مرکزی'));
          return cleaned;
        }
      } catch (e) {
        console.error("Error parsing hamyar_cbs_contracts", e);
      }
    }
    return INITIAL_CONTRACTS;
  });

  useEffect(() => {
    const loadProjects = () => {
      const saved = localStorage.getItem('hamyar_projects');
      if (saved) {
        try {
          const loaded = JSON.parse(saved);
          if (Array.isArray(loaded)) {
            setProjects(loaded.filter((p: any) => p.id !== '2' && !String(p.title || '').includes('تصفیه‌خانه مرکزی') && !String(p.title || '').includes('تسویه خانه مرکزی') && !String(p.title || '').includes('نیایش')));
          }
        } catch (e) {}
      }
    };
    window.addEventListener('storage', loadProjects);
    return () => window.removeEventListener('storage', loadProjects);
  }, []);

  const [selectedProjectId, setSelectedProjectId] = useState<string>(() => {
    const active = localStorage.getItem('hamyar_selected_project_id') || localStorage.getItem('hamyar_active_project_id');
    return (active && active !== '2') ? active : (accessibleProjects[0]?.id || '1');
  });

  useEffect(() => {
    if (accessibleProjects.length > 0 && !accessibleProjects.some(p => String(p.id) === String(selectedProjectId))) {
      setSelectedProjectId(String(accessibleProjects[0].id));
    }
  }, [accessibleProjects, selectedProjectId]);

  useEffect(() => {
    if (selectedProjectId) {
      localStorage.setItem('hamyar_selected_project_id', selectedProjectId);
      localStorage.setItem('hamyar_active_project_id', selectedProjectId);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    const handleProjectChanged = (e?: Event) => {
      const customEvent = e as CustomEvent<{ projectId: string }>;
      const newProjId = customEvent?.detail?.projectId || localStorage.getItem("hamyar_selected_project_id");
      if (newProjId && newProjId !== selectedProjectId) {
        setSelectedProjectId(newProjId);
      }
    };
    window.addEventListener("project-changed", handleProjectChanged);
    window.addEventListener("storage", handleProjectChanged);
    return () => {
      window.removeEventListener("project-changed", handleProjectChanged);
      window.removeEventListener("storage", handleProjectChanged);
    };
  }, [selectedProjectId]);

  const activeProject = useMemo(() => {
    return accessibleProjects.find(p => String(p.id) === String(selectedProjectId)) || projects.find(p => String(p.id) === String(selectedProjectId));
  }, [accessibleProjects, projects, selectedProjectId]);

  const activeCurrency = useMemo(() => {
    return activeProject?.currency || 'تومان';
  }, [activeProject]);

  const cbsNodes = useMemo(() => {
    const saved = localStorage.getItem('hamyar_cbs_nodes');
    if (!saved) return [];
    try {
      return JSON.parse(saved).filter((n: any) => String(n.projectId).trim() === String(selectedProjectId).trim());
    } catch (e) {
      console.error("Error parsing hamyar_cbs_nodes", e);
      return [];
    }
  }, [selectedProjectId]);
  const [activeTab, setActiveTab] = useState<'registry' | 'dashboard' | 'project-list'>('project-list');
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [detailSubTab, setDetailSubTab] = useState<'info' | 'wbs' | 'revisions' | 'warranties' | 'cbs' | 'workflow' | 'docs' | 'notes' | 'audit'>('info');
  
  // Search and Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [wbsSearchQuery, setWbsSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  // Modal / Form States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createModalTab, setCreateModalTab] = useState<'general' | 'wbs'>('general');
  const [modalImportedMapping, setModalImportedMapping] = useState<CbsMappingItem[] | null>(null);

  const handleAddModalWbsRow = () => {
    const current = modalImportedMapping || [];
    const nextNum = current.length + 1;
    const newRow: CbsMappingItem = {
      cbsCode: `WBS-1.${nextNum}`,
      description: `فعالیت ${nextNum}`,
      unit: 'مقطوع',
      quantity: 1,
      unitPrice: 0,
      allocatedAmount: 0,
      weightPercent: 0,
      baselineStartDate: newContractForm.startDate || '1405/01/01',
      baselineEndDate: newContractForm.initialEndDate || '1405/12/29',
      durationDays: 30
    };
    setModalImportedMapping([...current, newRow]);
  };

  const handleUpdateModalWbsRow = (index: number, field: keyof CbsMappingItem, value: any) => {
    if (!modalImportedMapping) return;
    const updated = [...modalImportedMapping];
    updated[index] = { ...updated[index], [field]: value };
    
    if (field === 'quantity' || field === 'unitPrice') {
      const q = Number(updated[index].quantity || 0);
      const p = Number(updated[index].unitPrice || 0);
      updated[index].allocatedAmount = q * p;
    }

    setModalImportedMapping(updated);

    const newTotal = updated.reduce((sum, item) => sum + (item.allocatedAmount || 0), 0);
    if (newTotal > 0) {
      setNewContractForm(prev => ({
        ...prev,
        initialAmount: newTotal,
        baseBudgetAmount: newTotal
      }));
    }
  };

  const handleDeleteModalWbsRow = (index: number) => {
    if (!modalImportedMapping) return;
    const updated = modalImportedMapping.filter((_, i) => i !== index);
    setModalImportedMapping(updated.length > 0 ? updated : null);
  };
  const [newContractForm, setNewContractForm] = useState<Partial<CbsContract>>({
    number: '',
    title: '',
    type: 'EPC',
    status: 'REGISTERED',
    employer: 'شرکت مهندسی آب و فاضلاب استان تهران',
    contractor: '',
    consultant: 'مهندسین مشاور آب‌سازه پایتخت',
    issueDate: '',
    startDate: '',
    duration: 365,
    initialAmount: 0,
    baseBudgetAmount: 0,
    currency: 'تومان',
    exchangeRate: 1,
    paymentTerms: '',
    billingPeriod: 'ماهانه',
    adjustmentPeriod: 'فاقد تعدیل',
    advancePaymentPercent: 10,
    goodPerformanceRetentionPercent: 10,
    insurancePercent: 5.3,
    taxPercent: 9,
    isTaxExempt: false,
    specialConditions: '',
  });

  // Revisions & Guarantees Forms States inside Details
  const [isAddRevisionOpen, setIsAddRevisionOpen] = useState(false);
  const [newRevisionForm, setNewRevisionForm] = useState<Partial<ContractRevision>>({
    version: '',
    type: 'AMENDMENT',
    changesDescription: '',
    amountDifference: 0,
    durationDifference: 0,
    status: 'APPROVED'
  });

  const [isAddWarrantyOpen, setIsAddWarrantyOpen] = useState(false);
  const [newWarrantyForm, setNewWarrantyForm] = useState<Partial<ContractWarranty>>({
    type: 'PERFORMANCE_BOND',
    issuerBank: '',
    referenceNumber: '',
    amount: 0,
    issueDate: '',
    expiryDate: '',
    status: 'ACTIVE',
    description: ''
  });

  // Notes Form State
  const [noteText, setNoteText] = useState('');

  // Editing states for Warranty and Revision
  const [editingWarranty, setEditingWarranty] = useState<ContractWarranty | null>(null);
  const [editingRevision, setEditingRevision] = useState<ContractRevision | null>(null);

  // File Upload Ref
  const docFileInputRef = React.useRef<HTMLInputElement>(null);
  const wbsFileInputRef = React.useRef<HTMLInputElement>(null);

  // Excel Template Export for WBS & Schedule
  const handleDownloadWbsExcelTemplate = () => {
    const templateData = [
      {
        "کد WBS/CBS": "1.1",
        "عنوان فعالیت": "تجهیز کارگاه و کارهای مقدماتی",
        "واحد سنجش": "مقطوع",
        "حجم کل کار": 1,
        "قیمت واحد (تومان)": 2000000000,
        "مبلغ کل (تومان)": 2000000000,
        "وزن فیزیکی (٪)": 5,
        "تاریخ شروع اولیه": "1405/01/05",
        "تاریخ پایان اولیه": "1405/02/05",
        "مدت (روز)": 30,
        "کد پیش‌نیاز": ""
      },
      {
        "کد WBS/CBS": "1.2",
        "عنوان فعالیت": "خاکبرداری و گودبرداری",
        "واحد سنجش": "متر مکعب",
        "حجم کل کار": 12000,
        "قیمت واحد (تومان)": 250000,
        "مبلغ کل (تومان)": 3000000000,
        "وزن فیزیکی (٪)": 15,
        "تاریخ شروع اولیه": "1405/02/01",
        "تاریخ پایان اولیه": "1405/03/15",
        "مدت (روز)": 45,
        "کد پیش‌نیاز": "1.1"
      },
      {
        "کد WBS/CBS": "1.3",
        "عنوان فعالیت": "بتن‌ریزی فونداسیون و آرماتوربندی",
        "واحد سنجش": "متر مکعب",
        "حجم کل کار": 4500,
        "قیمت واحد (تومان)": 1800000,
        "مبلغ کل (تومان)": 8100000000,
        "وزن فیزیکی (٪)": 25,
        "تاریخ شروع اولیه": "1405/03/10",
        "تاریخ پایان اولیه": "1405/05/20",
        "مدت (روز)": 70,
        "کد پیش‌نیاز": "1.2"
      },
      {
        "کد WBS/CBS": "2.1",
        "عنوان فعالیت": "اجرای اسکلت اصلی سازه",
        "واحد سنجش": "تن",
        "حجم کل کار": 850,
        "قیمت واحد (تومان)": 15000000,
        "مبلغ کل (تومان)": 12750000000,
        "وزن فیزیکی (٪)": 35,
        "تاریخ شروع اولیه": "1405/05/01",
        "تاریخ پایان اولیه": "1405/09/30",
        "مدت (روز)": 150,
        "کد پیش‌نیاز": "1.3"
      },
      {
        "کد WBS/CBS": "2.2",
        "عنوان فعالیت": "سفت‌کاری و دیوارهای محوطه",
        "واحد سنجش": "متر مربع",
        "حجم کل کار": 15000,
        "قیمت واحد (تومان)": 800000,
        "مبلغ کل (تومان)": 12000000000,
        "وزن فیزیکی (٪)": 20,
        "تاریخ شروع اولیه": "1405/08/01",
        "تاریخ پایان اولیه": "1405/12/29",
        "مدت (روز)": 150,
        "کد پیش‌نیاز": "2.1"
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "WBS_Schedule");
    XLSX.writeFile(workbook, "WBS_Schedule_Standard_Template.xlsx");
  };

  // Excel Import for WBS & Baseline Schedule
  const handleImportWbsExcel = (e: React.ChangeEvent<HTMLInputElement>, contractId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawRows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });

        if (!rawRows || rawRows.length === 0) {
          alert('فایل اکسل انتخاب شده خالی است یا فرمت آن صحیح نمی‌باشد.');
          return;
        }

        // Find Header Row dynamically
        let headerIndex = -1;
        for (let i = 0; i < Math.min(rawRows.length, 50); i++) {
          const rowStr = (rawRows[i] || []).map((c: any) => String(c || '').trim().toLowerCase());
          if (rowStr.some((c: string) => c.includes('شرح') || c.includes('description') || c.includes('عنوان') || c.includes('activity') || c.includes('کد') || c.includes('wbs') || c.includes('cbs'))) {
            headerIndex = i;
            break;
          }
        }

        if (headerIndex === -1) {
          if (rawRows[0] && rawRows[0].length >= 2) headerIndex = 0;
          else throw new Error("سطر عنوان یافت نشد. لطفا از قالب نمونه استاندارد استفاده نمایید.");
        }

        const headerRow = (rawRows[headerIndex] || []).map((c: any) => String(c || '').trim().toLowerCase());
        
        // Map Columns with robust cleaning
        const cleanStr = (s: string) => s.toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]/g, '');
        const getColIdx = (keywords: string[], excludeKeywords?: string[]) => {
          const cleanKeywords = keywords.map(cleanStr).filter(Boolean);
          const cleanExcludes = excludeKeywords ? excludeKeywords.map(cleanStr).filter(Boolean) : [];
          return headerRow.findIndex((h: string) => {
            const cleanH = cleanStr(h);
            if (!cleanH) return false;
            if (cleanExcludes.some(k => cleanH.includes(k) || k.includes(cleanH))) return false;
            return cleanKeywords.some(k => {
              if (k === cleanH) return true;
              if (k.length > 1 && cleanH.length > 1) {
                return cleanH.includes(k) || k.includes(cleanH);
              }
              return false;
            });
          });
        };

        const codeIdx = getColIdx(['کد', 'code', 'wbs', 'cbs', 'شماره', 'ردیف', 'item'], ['شرح', 'description', 'عنوان']);
        const descIdx = getColIdx(['شرح', 'description', 'عنوان', 'موضوع', 'activity', 'نام'], ['کد', 'code']);
        const unitIdx = getColIdx(['واحد', 'unit']);
        const qtyIdx = getColIdx(['حجم', 'مقدار', 'تعداد', 'quantity', 'qty', 'count', 'q', 'q.t.y', 'qnty', 'qnt', 'qt']);
        const priceIdx = getColIdx(['قیمت واحد', 'بهای واحد', 'نرخ', 'unit price', 'rate', 'unitprice']);
        const amountIdx = getColIdx(['مبلغ کل', 'قیمت کل', 'مبلغ تخصیص', 'بودجه', 'جمع کل', 'مبلغ', 'allocated amount', 'total price', 'amount', 'budget', 'allocatedamount'], ['قیمت واحد', 'بهای واحد', 'نرخ', 'unit price', 'rate']);
        const weightIdx = getColIdx(['وزن', 'weight', 'percent', 'درصد', 'سهم']);
        const startIdx = getColIdx(['شروع', 'start']);
        const endIdx = getColIdx(['پایان', 'end', 'خاتمه']);
        const durationIdx = getColIdx(['مدت', 'duration', 'days', 'روز']);
        const predecessorIdx = getColIdx(['پیش‌نیاز', 'پیشنیاز', 'predecessor', 'predecessors', 'dependency']);

        const importedMapping: CbsMappingItem[] = [];
        const newPlanningActivities: any[] = [];

        let totalContractVal = 0;

        const toEnglishDigits = (str: string): string => {
          return str
            .replace(/[۰-۹]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1776 + 48))
            .replace(/[٠-٩]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1632 + 48));
        };

        const parseNum = (val: any, defaultVal: number): number => {
          if (val === undefined || val === null || val === '') return defaultVal;
          if (typeof val === 'number') return val;
          const cleaned = toEnglishDigits(String(val)).replace(/[^0-9.]/g, '');
          const parsed = parseFloat(cleaned);
          return isNaN(parsed) ? defaultVal : parsed;
        };

        for (let i = headerIndex + 1; i < rawRows.length; i++) {
          const row = rawRows[i];
          if (!row || row.length === 0) continue;

          // Skip if empty row
          const hasData = row.some((c: any) => c !== undefined && c !== null && String(c).trim() !== '');
          if (!hasData) continue;

          const cbsCode = codeIdx !== -1 ? String(row[codeIdx] || '').trim() : `WBS-${i - headerIndex}`;
          const title = descIdx !== -1 ? String(row[descIdx] || '').trim() : `فعالیت ${cbsCode}`;
          
          if (!title && !cbsCode) continue;

          const unit = unitIdx !== -1 ? String(row[unitIdx] || '').trim() : 'عدد';
          const quantity = qtyIdx !== -1 ? parseNum(row[qtyIdx], 1) : 1;
          const unitPrice = priceIdx !== -1 ? parseNum(row[priceIdx], 0) : 0;
          
          let allocatedAmount = amountIdx !== -1 ? parseNum(row[amountIdx], 0) : 0;
          if (!allocatedAmount && quantity && unitPrice) {
            allocatedAmount = quantity * unitPrice;
          } else if (allocatedAmount && quantity > 0 && !unitPrice) {
            // unitPrice = allocatedAmount / quantity
          }
          const finalUnitPrice = unitPrice || (quantity > 0 ? Math.round(allocatedAmount / quantity) : allocatedAmount);

          totalContractVal += allocatedAmount;

          const weightPercent = weightIdx !== -1 ? parseNum(row[weightIdx], 0) : 0;
          const baselineStartDate = startIdx !== -1 ? String(row[startIdx] || '').trim() || '1405/01/01' : '1405/01/01';
          const baselineEndDate = endIdx !== -1 ? String(row[endIdx] || '').trim() || '1405/12/29' : '1405/12/29';
          const durationDays = durationIdx !== -1 ? parseNum(row[durationIdx], 30) : 30;
          const predecessorCodes = predecessorIdx !== -1 ? String(row[predecessorIdx] || '').trim() : '';

          importedMapping.push({
            cbsCode,
            description: title,
            unit,
            quantity,
            unitPrice: finalUnitPrice,
            allocatedAmount,
            weightPercent,
            baselineStartDate,
            baselineEndDate,
            durationDays
          });

          const todayShamsi = getTodayShamsi();
          const autoPlan = calculateActivityPlannedProgress(baselineStartDate, baselineEndDate, todayShamsi);
          const plannedProgress = autoPlan.plannedProgress;
          const status = plannedProgress >= 100 ? 'COMPLETED' : plannedProgress > 0 ? 'IN_PROGRESS' : 'NOT_STARTED';

          newPlanningActivities.push({
            id: `act_imp_${Date.now()}_${i}`,
            projectId: String(selectedProjectId),
            code: cbsCode,
            title: title,
            cbsNodeId: cbsCode,
            weightPercent: weightPercent,
            baselineStartDate: baselineStartDate,
            baselineEndDate: baselineEndDate,
            durationDays: durationDays,
            plannedProgress: plannedProgress,
            actualProgress: 0,
            isCriticalPath: false,
            status: status,
            predecessorCodes: predecessorCodes,
            unit: unit,
            totalQuantity: quantity,
            unitPrice: finalUnitPrice,
            allocatedAmount: allocatedAmount
          });
        }

        if (importedMapping.length === 0) {
          throw new Error("هیچ ردیف معتبری در فایل اکسل یافت نشد.");
        }

        // Recalculate weights if all weights are 0
        const totalWeightSum = importedMapping.reduce((s, i) => s + i.weightPercent, 0);
        if (totalWeightSum === 0 && totalContractVal > 0) {
          importedMapping.forEach(m => {
            m.weightPercent = Number(((m.allocatedAmount / totalContractVal) * 100).toFixed(2));
          });
          newPlanningActivities.forEach(a => {
            a.weightPercent = Number((((a.allocatedAmount || 0) / totalContractVal) * 100).toFixed(2));
          });
        }

        // Update Contract mapping
        setContracts(prev => prev.map(c => {
          if (c.id === contractId) {
            const newAudit = [
              {
                id: `log-${Date.now()}`,
                user: 'Mostafa.nasrollahnejad@gmail.com',
                action: 'واردسازی WBS و زمان‌بندی از اکسل',
                details: `تعداد ${importedMapping.length} ردیف WBS و برنامه زمان‌بندی اولیه از فایل اکسل وارد گردید. همخوانی ۱به۱ CBS و WBS برقرار شد.`,
                date: new Date().toLocaleDateString('fa-IR') + ' ' + new Date().toLocaleTimeString('fa-IR').slice(0, 5)
              },
              ...c.auditLogs
            ];
            return {
              ...c,
              initialAmount: totalContractVal || c.initialAmount,
              cbsMapping: importedMapping,
              auditLogs: newAudit
            };
          }
          return c;
        }));

        // Update Planning Activities in localStorage (merging safely with other projects)
        let allExistingActs: any[] = [];
        try {
          const stored = localStorage.getItem('hamyar_planning_activities');
          if (stored) allExistingActs = JSON.parse(stored);
        } catch (e) {}

        const otherProjectActs = Array.isArray(allExistingActs)
          ? allExistingActs.filter((a: any) => String(a.projectId).trim() !== String(selectedProjectId).trim())
          : [];

        const finalPlanningActivities = [...otherProjectActs, ...newPlanningActivities];
        localStorage.setItem('hamyar_planning_activities', JSON.stringify(finalPlanningActivities));

        // Also update project's initial budget and WBS in hamyar_projects
        try {
          const storedProjectsStr = localStorage.getItem('hamyar_projects');
          if (storedProjectsStr) {
            const projs = JSON.parse(storedProjectsStr);
            const updatedProjs = projs.map((p: any) => {
              if (String(p.id).trim() === String(selectedProjectId).trim()) {
                return {
                  ...p,
                  initialBudget: totalContractVal || p.initialBudget,
                  wbsScheduleMapping: importedMapping,
                  cbsMapping: importedMapping
                };
              }
              return p;
            });
            localStorage.setItem('hamyar_projects', JSON.stringify(updatedProjs));
          }
        } catch (e) {}

        // Also auto update CBS Nodes in hamyar_cbs_nodes so CBS Management matches WBS exactly 1-to-1
        const currentCbsNodesStr = localStorage.getItem('hamyar_cbs_nodes');
        let currentCbsNodes: any[] = [];
        try {
          if (currentCbsNodesStr) currentCbsNodes = JSON.parse(currentCbsNodesStr);
        } catch (e) {
          console.error("Error reading hamyar_cbs_nodes", e);
        }

        const otherProjectNodes = currentCbsNodes.filter((n: any) => String(n.projectId).trim() !== String(selectedProjectId).trim());
        const newCbsNodes = importedMapping.map((item, index) => ({
          id: `node_imp_${Date.now()}_${index}`,
          projectId: String(selectedProjectId),
          code: item.cbsCode,
          title: item.description || `گره ${item.cbsCode}`,
          budget: item.allocatedAmount,
          weightPercent: item.weightPercent,
          unit: item.unit,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          level: item.cbsCode.includes('.') ? item.cbsCode.split('.').length : 1
        }));

        localStorage.setItem('hamyar_cbs_nodes', JSON.stringify([...otherProjectNodes, ...newCbsNodes]));

        // Broadcast events to update Planning module and all active components immediately
        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new CustomEvent('planning-activities-updated', {
          detail: { projectId: selectedProjectId, activities: newPlanningActivities }
        }));
        window.dispatchEvent(new CustomEvent('wbs-updated', {
          detail: { projectId: selectedProjectId, mapping: importedMapping }
        }));
        window.dispatchEvent(new CustomEvent('project-changed', {
          detail: { projectId: selectedProjectId }
        }));

        setConfirmDialog({
          isOpen: true,
          title: 'بارگذاری موفقیت‌آمیز WBS و به‌روزرسانی کنترل پروژه',
          message: `اطلاعات ساختار شکست (WBS) و برنامه زمان‌بندی با موفقیت از فایل اکسل وارد گردید!\n• تعداد ردیف‌های ثبت شده: ${importedMapping.length} فعالیت\n• مبلغ کل پیمان: ${totalContractVal.toLocaleString('fa-IR')} تومان\n• کلیه بخش‌های کنترل و برنامه‌ریزی (WBS، نمودار گانت، شاخص‌های EVM و منحنی S) به صورت اتوماتیک به‌روزرسانی شدند.`,
          confirmText: 'متوجه شدم',
          cancelText: '',
          isDanger: false,
          onConfirm: () => setConfirmDialog(prev => ({ ...prev, isOpen: false }))
        });

      } catch (err: any) {
        console.error("Error reading Excel file:", err);
        setConfirmDialog({
          isOpen: true,
          title: 'خطا در بارگذاری فایل اکسل',
          message: `خطا در پردازش فایل اکسل: ${err.message || 'لطفاً مطمئن شوید ساختار فایل مطابق قالب استاندارد است.'}`,
          confirmText: 'تلاش مجدد',
          cancelText: '',
          isDanger: true,
          onConfirm: () => setConfirmDialog(prev => ({ ...prev, isOpen: false }))
        });
      }
    };
    reader.readAsArrayBuffer(file);
    if (e.target) e.target.value = '';
  };

  // Clear WBS data from contract and Planning module
  const handleClearWbsData = (contractId: string) => {
    const targetContract = contracts.find(c => c.id === contractId);
    const targetProjId = targetContract?.projectId || selectedProjectId;

    // 1. Clear cbsMapping in contract
    const updatedContracts = contracts.map(c => {
      if (c.id === contractId) {
        return {
          ...c,
          cbsMapping: []
        };
      }
      return c;
    });
    setContracts(updatedContracts);
    localStorage.setItem('hamyar_cbs_contracts', JSON.stringify(updatedContracts));

    // 2. Clear activities in hamyar_planning_activities for this project
    try {
      const storedActs = JSON.parse(localStorage.getItem('hamyar_planning_activities') || '[]');
      if (Array.isArray(storedActs)) {
        const remainingActs = storedActs.filter((a: any) => 
          String(a.projectId).trim() !== String(targetProjId).trim() &&
          String(a.projectId).trim() !== String(selectedProjectId).trim()
        );
        localStorage.setItem('hamyar_planning_activities', JSON.stringify(remainingActs));
      }
    } catch (err) {
      console.error(err);
    }

    // 3. Clear wbsScheduleMapping in hamyar_projects for this project
    try {
      const storedProjs = JSON.parse(localStorage.getItem('hamyar_projects') || '[]');
      if (Array.isArray(storedProjs)) {
        const updatedProjs = storedProjs.map((p: any) => {
          if (String(p.id).trim() === String(targetProjId).trim() || String(p.id).trim() === String(selectedProjectId).trim()) {
            return { ...p, wbsScheduleMapping: [], cbsMapping: [] };
          }
          return p;
        });
        localStorage.setItem('hamyar_projects', JSON.stringify(updatedProjs));
      }
    } catch (err) {
      console.error(err);
    }

    // 3.1. Clear cbsNodes in hamyar_cbs_nodes for this project so Technical Office (دفتر فنی) & CBS modules are synced
    try {
      const storedNodes = JSON.parse(localStorage.getItem('hamyar_cbs_nodes') || '[]');
      if (Array.isArray(storedNodes)) {
        const remainingNodes = storedNodes.filter((n: any) => 
          String(n.projectId).trim() !== String(targetProjId).trim() &&
          String(n.projectId).trim() !== String(selectedProjectId).trim()
        );
        localStorage.setItem('hamyar_cbs_nodes', JSON.stringify(remainingNodes));
      }
    } catch (err) {
      console.error(err);
    }

    // 3.2. Clear estimates in hamyar_estimates for this project so Technical Office CBS Engineering is 100% cleared
    try {
      const storedEst = JSON.parse(localStorage.getItem('hamyar_estimates') || '[]');
      if (Array.isArray(storedEst)) {
        const remainingEst = storedEst.filter((e: any) => 
          String(e.projectId).trim() !== String(targetProjId).trim() &&
          String(e.projectId).trim() !== String(selectedProjectId).trim()
        );
        localStorage.setItem('hamyar_estimates', JSON.stringify(remainingEst));
      }
    } catch (err) {
      console.error(err);
    }

    // 4. Reset file input ref
    if (wbsFileInputRef.current) wbsFileInputRef.current.value = '';

    // 5. Broadcast events to notify Planning, Technical Office & all modules
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new CustomEvent('cbs-nodes-updated', {
      detail: { projectId: targetProjId, nodes: [] }
    }));
    window.dispatchEvent(new CustomEvent('cbs-contracts-updated', {
      detail: { projectId: targetProjId }
    }));
    window.dispatchEvent(new CustomEvent('estimates-updated', {
      detail: { projectId: targetProjId }
    }));
    window.dispatchEvent(new CustomEvent('planning-activities-updated', {
      detail: { projectId: targetProjId, activities: [] }
    }));
    window.dispatchEvent(new CustomEvent('wbs-updated', {
      detail: { projectId: targetProjId, mapping: [] }
    }));
    window.dispatchEvent(new CustomEvent('project-changed', {
      detail: { projectId: targetProjId }
    }));

    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
  };

  // Audit Filter States
  const [auditSearchQuery, setAuditSearchQuery] = useState('');
  const [auditUserFilter, setAuditUserFilter] = useState('ALL');

  // Custom Confirmation Dialog (matching CBS page design)
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    isDanger: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: '',
    cancelText: '',
    isDanger: false,
    onConfirm: () => {}
  });

  useEffect(() => {
    localStorage.setItem('hamyar_cbs_contracts', JSON.stringify(contracts));
  }, [contracts]);

  const activeProjectObj = projects.find(p => String(p.id).trim() === String(selectedProjectId).trim());
  const isCbsProject = activeProjectObj?.contractType === 'CBS';
  const isProjectAllocated = isProjectAllocatedByAdmin(activeProjectObj);

  const rawProjectContracts = contracts.filter(c => String(c.projectId).trim() === String(selectedProjectId).trim());
  const projectContracts = useMemo(() => {
    return rawProjectContracts.filter(c => {
      // If project is not allocated yet by System Admin:
      if (!isProjectAllocated) {
        // ONLY Employer PM, Employer Site Supervisor, and System Admin can view registered contracts
        return isEmployerPmorWS || currentUser?.role === 'SYSTEM_ADMIN';
      }
      return true;
    });
  }, [rawProjectContracts, isProjectAllocated, isEmployerPmorWS, currentUser]);

  // Filtered Contracts
  const filteredContracts = projectContracts.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          c.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.contractor.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
    const matchesType = typeFilter === 'ALL' || c.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  // Selected Contract Calculations
  const selectedContract = contracts.find(c => c.id === selectedContractId);

  const calculateContractAmounts = (contract: CbsContract) => {
    const approvedRevisions = contract.revisions.filter(r => r.status === 'APPROVED');
    const amountDifferenceSum = approvedRevisions.reduce((sum, r) => sum + r.amountDifference, 0);
    const durationDifferenceSum = approvedRevisions.reduce((sum, r) => sum + r.durationDifference, 0);
    
    const currentAmount = contract.initialAmount + amountDifferenceSum;
    const currentDuration = contract.duration + durationDifferenceSum;
    
    return {
      currentAmount,
      currentDuration,
      amountDifferenceSum,
      durationDifferenceSum
    };
  };

  // KPI Calculations for active project
  const totalProjectBudgetBaseline = activeProjectObj?.initialBudget || 0;
  const totalContractedAmount = projectContracts.reduce((sum, c) => {
    const { currentAmount } = calculateContractAmounts(c);
    return sum + currentAmount;
  }, 0);
  const remainingBudgetPercent = ((totalProjectBudgetBaseline - totalContractedAmount) / totalProjectBudgetBaseline) * 100;

  const totalWarrantiesValue = projectContracts.reduce((sum, c) => {
    return sum + c.warranties.filter(w => w.status === 'ACTIVE').reduce((wSum, w) => wSum + w.amount, 0);
  }, 0);

  // Handlers
  const handleCreateContract = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContractForm.number || !newContractForm.title || !newContractForm.contractor) {
      alert('لطفاً اطلاعات ستاره‌دار و ضروری را تکمیل کنید.');
      return;
    }

    let initialCbsMapping: CbsMappingItem[] = [];
    let overrideInitialAmount = Number(newContractForm.initialAmount || 0);
    let overrideBaseBudgetAmount = Number(newContractForm.baseBudgetAmount || 0);

    if (modalImportedMapping && modalImportedMapping.length > 0) {
      initialCbsMapping = modalImportedMapping;
      const importedTotal = modalImportedMapping.reduce((sum, item) => sum + (item.allocatedAmount || 0), 0);
      if (importedTotal > 0) {
        overrideInitialAmount = importedTotal;
        overrideBaseBudgetAmount = importedTotal;
      }

      // Sync to planning activities
      const todayShamsi = getTodayShamsi();
      const newPlanningActivities = modalImportedMapping.map((item, idx) => {
        const start = item.baselineStartDate || newContractForm.startDate || '1405/01/01';
        const end = item.baselineEndDate || newContractForm.initialEndDate || '1405/12/29';
        const auto = calculateActivityPlannedProgress(start, end, todayShamsi);
        return {
          id: `act_imp_${Date.now()}_${idx}`,
          projectId: String(selectedProjectId),
          code: item.cbsCode,
          title: item.description || `فعالیت ${item.cbsCode}`,
          cbsNodeId: item.cbsCode,
          weightPercent: item.weightPercent || 0,
          baselineStartDate: start,
          baselineEndDate: end,
          durationDays: item.durationDays || auto.totalDays || 30,
          plannedProgress: auto.plannedProgress,
          actualProgress: 0,
          isCriticalPath: false,
          status: (auto.plannedProgress >= 100 ? 'COMPLETED' : auto.plannedProgress > 0 ? 'IN_PROGRESS' : 'NOT_STARTED') as any,
          unit: item.unit || 'عدد',
          totalQuantity: item.quantity || 1,
          unitPrice: item.unitPrice || 0,
          allocatedAmount: item.allocatedAmount || 0
        };
      });

      let allExistingActs: any[] = [];
      try {
        const stored = localStorage.getItem('hamyar_planning_activities');
        if (stored) allExistingActs = JSON.parse(stored);
      } catch (e) {}

      const otherProjectActs = Array.isArray(allExistingActs)
        ? allExistingActs.filter((a: any) => String(a.projectId).trim() !== String(selectedProjectId).trim())
        : [];

      localStorage.setItem('hamyar_planning_activities', JSON.stringify([...otherProjectActs, ...newPlanningActivities]));

      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('planning-activities-updated', {
        detail: { projectId: selectedProjectId, activities: newPlanningActivities }
      }));
      window.dispatchEvent(new CustomEvent('wbs-updated', {
        detail: { projectId: selectedProjectId, mapping: modalImportedMapping }
      }));
      window.dispatchEvent(new CustomEvent('project-changed', {
        detail: { projectId: selectedProjectId }
      }));

      // Sync to CBS nodes
      const newCbsNodes = modalImportedMapping.map((item, idx) => ({
        id: `node_imp_${Date.now()}_${idx}`,
        projectId: String(selectedProjectId),
        code: item.cbsCode,
        title: item.description || `گره ${item.cbsCode}`,
        budget: item.allocatedAmount,
        weightPercent: item.weightPercent,
        unit: item.unit,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        level: item.cbsCode.includes('.') ? item.cbsCode.split('.').length : 1
      }));
      const currentCbsNodesStr = localStorage.getItem('hamyar_cbs_nodes');
      let currentCbsNodes: any[] = [];
      try {
        if (currentCbsNodesStr) currentCbsNodes = JSON.parse(currentCbsNodesStr);
      } catch (e) {}
      const otherProjectNodes = currentCbsNodes.filter((n: any) => String(n.projectId).trim() !== String(selectedProjectId).trim());
      localStorage.setItem('hamyar_cbs_nodes', JSON.stringify([...otherProjectNodes, ...newCbsNodes]));
    } else if (newContractForm.type === 'CBS' || isCbsProject) {
      const savedNodes = localStorage.getItem('hamyar_cbs_nodes');
      if (savedNodes) {
        try {
          const allNodes = JSON.parse(savedNodes);
          const projectNodes = allNodes.filter((n: any) => String(n.projectId).trim() === String(selectedProjectId).trim());
          if (projectNodes.length > 0) {
            initialCbsMapping = projectNodes.map((node: any) => ({
              cbsCode: node.code,
              allocatedAmount: node.budget || 0,
              weightPercent: node.weightPercent || 0
            }));
            
            // Sum of root node budgets
            const rootNodes = projectNodes.filter((n: any) => !n.parentId);
            const totalCbsBudget = rootNodes.reduce((sum: number, n: any) => sum + (n.budget || 0), 0);
            if (overrideInitialAmount === 0 && totalCbsBudget > 0) {
              overrideInitialAmount = totalCbsBudget;
              overrideBaseBudgetAmount = totalCbsBudget;
            }
          }
        } catch (err) {
          console.error("Error populating initial CBS mapping", err);
        }
      }
    }

    const calculatedAdvanceAmount = (overrideInitialAmount * Number(newContractForm.advancePaymentPercent || 0)) / 100;

    const newContract: CbsContract = {
      id: `con-${Date.now()}`,
      projectId: selectedProjectId,
      number: newContractForm.number || '',
      title: newContractForm.title || '',
      type: (newContractForm.type as ContractType) || (isCbsProject ? 'CBS' : 'EPC'),
      status: (newContractForm.status as ContractStatus) || 'REGISTERED',
      employer: newContractForm.employer || 'کارفرما تایید شده',
      contractor: newContractForm.contractor || '',
      consultant: newContractForm.consultant || 'مشاور تایید شده',
      issueDate: newContractForm.issueDate || '1405/01/01',
      startDate: newContractForm.startDate || '1405/01/01',
      duration: Number(newContractForm.duration || 365),
      initialEndDate: newContractForm.initialEndDate || '1406/01/01',
      currentEndDate: newContractForm.initialEndDate || '1406/01/01',
      initialAmount: overrideInitialAmount,
      baseBudgetAmount: overrideBaseBudgetAmount,
      currency: newContractForm.currency || 'تومان',
      exchangeRate: Number(newContractForm.exchangeRate || 1),
      paymentTerms: newContractForm.paymentTerms || '',
      billingPeriod: newContractForm.billingPeriod || 'ماهانه',
      adjustmentPeriod: newContractForm.adjustmentPeriod || 'فاقد تعدیل',
      advancePaymentPercent: Number(newContractForm.advancePaymentPercent || 10),
      advancePaymentAmount: calculatedAdvanceAmount,
      advanceRetentionPercent: Number(newContractForm.advanceRetentionPercent || 10),
      goodPerformanceRetentionPercent: Number(newContractForm.goodPerformanceRetentionPercent || 10),
      insurancePercent: Number(newContractForm.insurancePercent || 5.3),
      taxPercent: Number(newContractForm.taxPercent || 9),
      isTaxExempt: !!newContractForm.isTaxExempt,
      otherDeductions: newContractForm.otherDeductions || 'طبق مفاد قرارداد',
      specialConditions: newContractForm.specialConditions || '',
      cbsMapping: initialCbsMapping,
      warranties: [],
      revisions: [],
      attachments: [],
      notes: [],
      createdByUserId: currentUser?.id,
      createdByUsername: currentUser?.username,
      createdByOrgId: currentUser?.orgId,
      createdByRole: currentUser?.role,
      createdByJobLevel: currentUser?.jobLevel || currentUser?.jobTitle,
      auditLogs: [
        {
          id: `l-${Date.now()}`,
          user: currentUser?.username || 'Mostafa.nasrollahnejad@gmail.com',
          action: 'ایجاد قرارداد',
          details: `پیمان جدید با شماره ${newContractForm.number} به ثبت اولیه رسید.`,
          date: new Date().toLocaleDateString('fa-IR') + ' ' + new Date().toLocaleTimeString('fa-IR').slice(0, 5)
        }
      ]
    };

    setContracts(prev => [newContract, ...prev]);
    setIsCreateModalOpen(false);
    setCreateModalTab('general');
    setModalImportedMapping(null);
    
    // reset form
    setNewContractForm({
      number: '',
      title: '',
      type: 'EPC',
      status: 'REGISTERED',
      employer: 'شرکت مهندسی آب و فاضلاب استان تهران',
      contractor: '',
      consultant: 'مهندسین مشاور آب‌سازه پایتخت',
      issueDate: '',
      startDate: '',
      duration: 365,
      initialAmount: 0,
      baseBudgetAmount: 0,
      currency: 'تومان',
      exchangeRate: 1,
      paymentTerms: '',
      billingPeriod: 'ماهانه',
      adjustmentPeriod: 'فاقد تعدیل',
      advancePaymentPercent: 10,
      goodPerformanceRetentionPercent: 10,
      insurancePercent: 5.3,
      taxPercent: 9,
      isTaxExempt: false,
      specialConditions: '',
    });
  };

  // Print Contract Summary Report
  const handlePrintContractSummary = (contract: CbsContract) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const { currentAmount, currentDuration, amountDifferenceSum, durationDifferenceSum } = calculateContractAmounts(contract);

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="fa" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>خلاصه مدیریتی قرارداد - ${contract.number}</title>
        <style>
          @font-face { font-family: 'Vazir'; src: url('https://cdn.jsdelivr.net/gh/rastikerdar/vazir-font@v30.1.0/dist/Vazir.woff2') format('woff2'); }
          body { font-family: 'Vazir', Tahoma, sans-serif; padding: 40px; color: #1e293b; line-height: 1.6; }
          .header { border-bottom: 2px solid #3b82f6; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; }
          .title { font-size: 20px; font-weight: 900; }
          .section { margin-bottom: 25px; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; }
          .section-title { font-weight: 900; font-size: 14px; color: #3b82f6; margin-bottom: 15px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
          .label { font-size: 11px; color: #64748b; font-weight: bold; }
          .value { font-size: 13px; font-weight: 900; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
          th { background: #f8fafc; padding: 10px; text-align: right; border-bottom: 2px solid #e2e8f0; }
          td { padding: 10px; border-bottom: 1px solid #f1f5f9; }
          .footer { margin-top: 50px; font-size: 10px; color: #94a3b8; text-align: center; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">شناسنامه و خلاصه مدیریتی قرارداد</div>
          <div style="text-align: left; font-size: 12px;">شماره: ${contract.number}<br>تاریخ چاپ: ${new Date().toLocaleDateString('fa-IR')}</div>
        </div>

        <div class="section">
          <div class="section-title">اطلاعات پایه و طرفین پیمان</div>
          <div class="grid">
            <div><span class="label">عنوان پروژه:</span> <span class="value">${activeProjectObj?.title}</span></div>
            <div><span class="label">موضوع پیمان:</span> <span class="value">${contract.title}</span></div>
            <div><span class="label">کارفرما:</span> <span class="value">${contract.employer}</span></div>
            <div><span class="label">پیمانکار:</span> <span class="value">${contract.contractor}</span></div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">وضعیت مالی و زمانی</div>
          <div class="grid">
            <div><span class="label">مبلغ اولیه:</span> <span class="value">${contract.initialAmount.toLocaleString('fa-IR')} ${contract.currency}</span></div>
            <div><span class="label">مبلغ کل (با الحاقیه‌ها):</span> <span class="value">${currentAmount.toLocaleString('fa-IR')} ${contract.currency}</span></div>
            <div><span class="label">تاریخ شروع:</span> <span class="value">${contract.startDate}</span></div>
            <div><span class="label">تاریخ پایان فعلی:</span> <span class="value">${contract.currentEndDate}</span></div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">الحاقیه‌ها و تغییرات مصوب</div>
          <table>
            <thead>
              <tr><th>عنوان الحاقیه</th><th>نوع</th><th>تغییر مبلغ</th><th>تمدید زمان</th><th>تاریخ ابلاغ</th></tr>
            </thead>
            <tbody>
              ${contract.revisions.map(r => `
                <tr>
                  <td>${r.version}</td>
                  <td>${r.type}</td>
                  <td>${r.amountDifference.toLocaleString('fa-IR')}</td>
                  <td>${r.durationDifference} روز</td>
                  <td>${r.approvedDate}</td>
                </tr>
              `).join('')}
              ${contract.revisions.length === 0 ? '<tr><td colspan="5" style="text-align:center">فاقد الحاقیه</td></tr>' : ''}
            </tbody>
          </table>
        </div>

        <div class="section">
          <div class="section-title">ضمانت‌نامه‌های تسلیمی</div>
          <table>
            <thead>
              <tr><th>نوع ضمانت</th><th>بانک صادرکننده</th><th>شماره مرجع</th><th>مبلغ</th><th>انقضا</th></tr>
            </thead>
            <tbody>
              ${contract.warranties.map(w => `
                <tr>
                  <td>${w.type}</td>
                  <td>${w.issuerBank}</td>
                  <td>${w.referenceNumber}</td>
                  <td>${w.amount.toLocaleString('fa-IR')}</td>
                  <td>${w.expiryDate}</td>
                </tr>
              `).join('')}
              ${contract.warranties.length === 0 ? '<tr><td colspan="5" style="text-align:center">فاقد ضمانت‌نامه ثبت شده</td></tr>' : ''}
            </tbody>
          </table>
        </div>

        <div class="footer">سامانه مدیریت هوشمند پروژه‌های عمرانی همیار - ماژول مدیریت قراردادها (Enterprise)</div>
        <script>window.print();</script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handleDeleteContract = (id: string, name: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'تأیید حذف پیمان',
      message: `آیا از حذف کامل قرارداد "${name}" اطمینان دارید؟ تمامی اسناد، الحاقیه‌ها، ضمانت‌نامه‌ها و سوابق آن به طور کامل پاک خواهند شد.`,
      confirmText: 'بله، حذف شود',
      cancelText: 'انصراف',
      isDanger: true,
      onConfirm: () => {
        const targetContract = contracts.find(c => c.id === id);
        const targetProjId = targetContract?.projectId || selectedProjectId;
        const updated = contracts.filter(c => c.id !== id);
        setContracts(updated);
        localStorage.setItem('hamyar_cbs_contracts', JSON.stringify(updated));

        // Clear cbsNodes for this project if contract was CBS
        try {
          const storedNodes = JSON.parse(localStorage.getItem('hamyar_cbs_nodes') || '[]');
          if (Array.isArray(storedNodes)) {
            const remainingNodes = storedNodes.filter((n: any) => 
              String(n.projectId).trim() !== String(targetProjId).trim()
            );
            localStorage.setItem('hamyar_cbs_nodes', JSON.stringify(remainingNodes));
          }
        } catch (e) {}

        if (selectedContractId === id) setSelectedContractId(null);
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));

        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new CustomEvent('cbs-nodes-updated', { detail: { projectId: targetProjId } }));
        window.dispatchEvent(new CustomEvent('cbs-contracts-updated', { detail: { projectId: targetProjId } }));
        window.dispatchEvent(new CustomEvent('project-changed', { detail: { projectId: targetProjId } }));
      }
    });
  };

  // Add Revision
  const handleAddRevision = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContractId || !newRevisionForm.version) return;

    const revision: ContractRevision = {
      id: `rev-${Date.now()}`,
      version: newRevisionForm.version,
      type: newRevisionForm.type as any || 'AMENDMENT',
      date: new Date().toLocaleDateString('fa-IR'),
      approvedDate: newRevisionForm.approvedDate || new Date().toLocaleDateString('fa-IR'),
      changesDescription: newRevisionForm.changesDescription || '',
      amountDifference: Number(newRevisionForm.amountDifference || 0),
      durationDifference: Number(newRevisionForm.durationDifference || 0),
      status: 'APPROVED'
    };

    setContracts(prev => prev.map(c => {
      if (c.id === selectedContractId) {
        const updatedRevisions = [...c.revisions, revision];
        const { currentDuration } = calculateContractAmounts({ ...c, revisions: updatedRevisions });
        
        // Let's also update the Current End Date. (Simple simulated date advance logic)
        const extendDays = revision.durationDifference;
        let newEndDate = c.currentEndDate;
        if (extendDays > 0) {
          const parts = c.currentEndDate.split('/');
          if (parts.length === 3) {
            let y = parseInt(parts[0]);
            let m = parseInt(parts[1]);
            let d = parseInt(parts[2]);
            m += Math.floor(extendDays / 30);
            d += extendDays % 30;
            if (d > 30) { m += 1; d -= 30; }
            if (m > 12) { y += Math.floor(m / 12); m = m % 12 || 12; }
            newEndDate = `${y}/${String(m).padStart(2, '0')}/${String(d).padStart(2, '0')}`;
          }
        }

        const log: ContractAuditLog = {
          id: `l-${Date.now()}`,
          user: 'Mostafa.nasrollahnejad@gmail.com',
          action: 'افزودن الحاقیه / تمدید',
          details: `سند جدید "${revision.version}" با تاثیر مبلغ ${revision.amountDifference.toLocaleString('fa-IR')} و ${revision.durationDifference} روز ابلاغ شد.`,
          date: new Date().toLocaleDateString('fa-IR') + ' ' + new Date().toLocaleTimeString('fa-IR').slice(0, 5)
        };

        return {
          ...c,
          revisions: updatedRevisions,
          currentEndDate: newEndDate,
          auditLogs: [log, ...c.auditLogs]
        };
      }
      return c;
    }));

    setIsAddRevisionOpen(false);
    setNewRevisionForm({
      version: '',
      type: 'AMENDMENT',
      changesDescription: '',
      amountDifference: 0,
      durationDifference: 0,
      status: 'APPROVED'
    });
  };

  // Add Warranty
  const handleAddWarranty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContractId || !newWarrantyForm.issuerBank || !newWarrantyForm.referenceNumber) return;

    const warranty: ContractWarranty = {
      id: `w-${Date.now()}`,
      type: newWarrantyForm.type as any || 'PERFORMANCE_BOND',
      issuerBank: newWarrantyForm.issuerBank,
      referenceNumber: newWarrantyForm.referenceNumber,
      amount: Number(newWarrantyForm.amount || 0),
      issueDate: newWarrantyForm.issueDate || new Date().toLocaleDateString('fa-IR'),
      expiryDate: newWarrantyForm.expiryDate || new Date().toLocaleDateString('fa-IR'),
      status: 'ACTIVE',
      description: newWarrantyForm.description || ''
    };

    setContracts(prev => prev.map(c => {
      if (c.id === selectedContractId) {
        const log: ContractAuditLog = {
          id: `l-${Date.now()}`,
          user: 'Mostafa.nasrollahnejad@gmail.com',
          action: 'افزودن ضمانت‌نامه',
          details: `ضمانت‌نامه نوع ${warranty.type === 'PERFORMANCE_BOND' ? 'حسن انجام تعهدات' : 'پیش‌پرداخت'} شماره ${warranty.referenceNumber} افزوده شد.`,
          date: new Date().toLocaleDateString('fa-IR') + ' ' + new Date().toLocaleTimeString('fa-IR').slice(0, 5)
        };
        return {
          ...c,
          warranties: [...c.warranties, warranty],
          auditLogs: [log, ...c.auditLogs]
        };
      }
      return c;
    }));

    setIsAddWarrantyOpen(false);
    setNewWarrantyForm({
      type: 'PERFORMANCE_BOND',
      issuerBank: '',
      referenceNumber: '',
      amount: 0,
      issueDate: '',
      expiryDate: '',
      status: 'ACTIVE',
      description: ''
    });
  };

  // Release/Expire Warranty
  const handleToggleWarrantyStatus = (warrantyId: string, newStatus: 'ACTIVE' | 'RELEASED' | 'EXPIRED') => {
    if (!selectedContractId) return;
    setContracts(prev => prev.map(c => {
      if (c.id === selectedContractId) {
        const updated = c.warranties.map(w => w.id === warrantyId ? { ...w, status: newStatus } : w);
        const target = c.warranties.find(w => w.id === warrantyId);
        const log: ContractAuditLog = {
          id: `l-${Date.now()}`,
          user: 'Mostafa.nasrollahnejad@gmail.com',
          action: 'ویرایش وضعیت ضمانت',
          details: `وضعیت ضمانت‌نامه ${target?.referenceNumber} به ${newStatus === 'RELEASED' ? 'آزاد شده' : newStatus === 'EXPIRED' ? 'سررسید شده' : 'فعال'} تغییر یافت.`,
          date: new Date().toLocaleDateString('fa-IR') + ' ' + new Date().toLocaleTimeString('fa-IR').slice(0, 5)
        };
        return {
          ...c,
          warranties: updated,
          auditLogs: [log, ...c.auditLogs]
        };
      }
      return c;
    }));
  };

  // Delete Revision
  const handleDeleteRevision = (revisionId: string) => {
    if (!selectedContractId) return;
    const rev = selectedContract?.revisions.find(r => r.id === revisionId);
    setContracts(prev => prev.map(c => {
      if (c.id === selectedContractId) {
        const updatedRevisions = c.revisions.filter(r => r.id !== revisionId);
        const log: ContractAuditLog = {
          id: `l-${Date.now()}`,
          user: 'Mostafa.nasrollahnejad@gmail.com',
          action: 'حذف الحاقیه',
          details: `الحاقیه/دستورکار شماره ${rev?.version || revisionId} حذف شد.`,
          date: new Date().toLocaleDateString('fa-IR') + ' ' + new Date().toLocaleTimeString('fa-IR').slice(0, 5)
        };
        return {
          ...c,
          revisions: updatedRevisions,
          auditLogs: [log, ...c.auditLogs]
        };
      }
      return c;
    }));
  };

  // Save Edit Revision
  const handleSaveEditRevision = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContractId || !editingRevision) return;

    setContracts(prev => prev.map(c => {
      if (c.id === selectedContractId) {
        const updatedRevisions = c.revisions.map(r => r.id === editingRevision.id ? editingRevision : r);
        const log: ContractAuditLog = {
          id: `l-${Date.now()}`,
          user: 'Mostafa.nasrollahnejad@gmail.com',
          action: 'ویرایش الحاقیه',
          details: `اطلاعات الحاقیه/تغییر شماره ${editingRevision.version} ویرایش و به‌روزرسانی شد.`,
          date: new Date().toLocaleDateString('fa-IR') + ' ' + new Date().toLocaleTimeString('fa-IR').slice(0, 5)
        };
        return {
          ...c,
          revisions: updatedRevisions,
          auditLogs: [log, ...c.auditLogs]
        };
      }
      return c;
    }));
    setEditingRevision(null);
  };

  // Delete Warranty
  const handleDeleteWarranty = (warrantyId: string) => {
    if (!selectedContractId) return;
    const w = selectedContract?.warranties.find(item => item.id === warrantyId);
    setContracts(prev => prev.map(c => {
      if (c.id === selectedContractId) {
        const updated = c.warranties.filter(item => item.id !== warrantyId);
        const log: ContractAuditLog = {
          id: `l-${Date.now()}`,
          user: 'Mostafa.nasrollahnejad@gmail.com',
          action: 'حذف ضمانت‌نامه',
          details: `ضمانت‌نامه شماره ${w?.referenceNumber || warrantyId} حذف گردید.`,
          date: new Date().toLocaleDateString('fa-IR') + ' ' + new Date().toLocaleTimeString('fa-IR').slice(0, 5)
        };
        return {
          ...c,
          warranties: updated,
          auditLogs: [log, ...c.auditLogs]
        };
      }
      return c;
    }));
  };

  // Save Edit Warranty
  const handleSaveEditWarranty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContractId || !editingWarranty) return;

    setContracts(prev => prev.map(c => {
      if (c.id === selectedContractId) {
        const updated = c.warranties.map(w => w.id === editingWarranty.id ? editingWarranty : w);
        const log: ContractAuditLog = {
          id: `l-${Date.now()}`,
          user: 'Mostafa.nasrollahnejad@gmail.com',
          action: 'ویرایش ضمانت‌نامه',
          details: `اطلاعات ضمانت‌نامه شماره ${editingWarranty.referenceNumber} ویرایش شد.`,
          date: new Date().toLocaleDateString('fa-IR') + ' ' + new Date().toLocaleTimeString('fa-IR').slice(0, 5)
        };
        return {
          ...c,
          warranties: updated,
          auditLogs: [log, ...c.auditLogs]
        };
      }
      return c;
    }));
    setEditingWarranty(null);
  };

  // Real File Upload
  const handleDocFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !selectedContractId) return;

    const newAttachments: ContractAttachment[] = Array.from(files).map((f, idx) => ({
      id: `att-${Date.now()}-${idx}`,
      name: f.name,
      size: (f.size / (1024 * 1024)).toFixed(2) + ' MB',
      type: f.name.split('.').pop()?.toUpperCase() || 'DOCUMENT',
      url: URL.createObjectURL(f),
      date: new Date().toLocaleDateString('fa-IR')
    }));

    setContracts(prev => prev.map(c => {
      if (c.id === selectedContractId) {
        const log: ContractAuditLog = {
          id: `l-${Date.now()}`,
          user: 'Mostafa.nasrollahnejad@gmail.com',
          action: 'بارگذاری پیوست فنی',
          details: `${newAttachments.length} فایل جدید به اسناد قرارداد پیوست شد: (${newAttachments.map(a => a.name).join(', ')})`,
          date: new Date().toLocaleDateString('fa-IR') + ' ' + new Date().toLocaleTimeString('fa-IR').slice(0, 5)
        };
        return {
          ...c,
          attachments: [...newAttachments, ...(c.attachments || [])],
          auditLogs: [log, ...c.auditLogs]
        };
      }
      return c;
    }));
  };

  // Delete Attachment
  const handleDeleteAttachment = (attId: string) => {
    if (!selectedContractId) return;
    setContracts(prev => prev.map(c => {
      if (c.id === selectedContractId) {
        const att = c.attachments.find(a => a.id === attId);
        const updated = c.attachments.filter(a => a.id !== attId);
        const log: ContractAuditLog = {
          id: `l-${Date.now()}`,
          user: 'Mostafa.nasrollahnejad@gmail.com',
          action: 'حذف پیوست',
          details: `فایل پیوست ${att?.name || attId} حذف گردید.`,
          date: new Date().toLocaleDateString('fa-IR') + ' ' + new Date().toLocaleTimeString('fa-IR').slice(0, 5)
        };
        return {
          ...c,
          attachments: updated,
          auditLogs: [log, ...c.auditLogs]
        };
      }
      return c;
    }));
  };

  // Transition Workflow
  const handleWorkflowTransition = (targetStatus: ContractStatus, stepName: string) => {
    if (!selectedContractId || !selectedContract) return;

    setConfirmDialog({
      isOpen: true,
      title: 'انتقال گام گردش کار قرارداد',
      message: `آیا تایید می‌کنید که این قرارداد به وضعیت "${targetStatus === 'ACTIVE' ? 'فعال و ابلاغ شده' : targetStatus === 'UNDER_REVIEW' ? 'تحت بررسی کارفرما' : targetStatus}" منتقل شود؟`,
      confirmText: 'تایید انتقال',
      cancelText: 'انصراف',
      isDanger: false,
      onConfirm: () => {
        setContracts(prev => prev.map(c => {
          if (c.id === selectedContractId) {
            const log: ContractAuditLog = {
              id: `l-${Date.now()}`,
              user: 'Mostafa.nasrollahnejad@gmail.com',
              action: 'گردش کار',
              details: `تغییر وضعیت قرارداد از ${c.status} به ${targetStatus} (${stepName}).`,
              date: new Date().toLocaleDateString('fa-IR') + ' ' + new Date().toLocaleTimeString('fa-IR').slice(0, 5)
            };
            return {
              ...c,
              status: targetStatus,
              auditLogs: [log, ...c.auditLogs]
            };
          }
          return c;
        }));
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Add Note
  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContractId || !noteText.trim()) return;

    const note: ContractNote = {
      id: `n-${Date.now()}`,
      author: 'Mostafa.nasrollahnejad@gmail.com',
      text: noteText,
      date: new Date().toLocaleDateString('fa-IR') + ' ' + new Date().toLocaleTimeString('fa-IR').slice(0, 5)
    };

    setContracts(prev => prev.map(c => {
      if (c.id === selectedContractId) {
        return {
          ...c,
          notes: [...c.notes, note]
        };
      }
      return c;
    }));
    setNoteText('');
  };

  // Sync CBS Nodes from Project CBS Definition to Contract Mapping
  const handleSyncCbsNodes = (contractId: string) => {
    const savedNodes = localStorage.getItem('hamyar_cbs_nodes');
    if (!savedNodes) {
      alert('هیچ ساختار شکستی (CBS) برای این پروژه تعریف نشده است. لطفاً ابتدا در منوی «مدیریت CBS» گره‌ها را تعریف کنید.');
      return;
    }
    
    try {
      const allNodes = JSON.parse(savedNodes);
      const projectNodes = allNodes.filter((n: any) => String(n.projectId).trim() === String(selectedProjectId).trim());
      
      if (projectNodes.length === 0) {
        alert('هیچ گره ساختار شکستی (CBS) فعال در این پروژه یافت نشد.');
        return;
      }
      
      // Filter root nodes (nodes without parent)
      const rootNodes = projectNodes.filter((n: any) => !n.parentId);
      
      // Calculate total budget from all root nodes or leaf nodes. Sum of budgets of root nodes is standard.
      const totalCbsBudget = rootNodes.reduce((sum: number, n: any) => sum + (n.budget || 0), 0);

      const newMapping: CbsMappingItem[] = projectNodes.map((node: any) => ({
        cbsCode: node.code,
        allocatedAmount: node.budget || 0,
        weightPercent: node.weightPercent || 0
      }));

      setContracts(prev => prev.map(c => {
        if (c.id === contractId) {
          const updatedAudit = [
            {
              id: `l-${Date.now()}`,
              user: 'Mostafa.nasrollahnejad@gmail.com',
              action: 'همگام‌سازی ساختار شکست CBS',
              details: `تعداد ${projectNodes.length} گره ساختار شکست با مبالغ مصوب با پیمان همگام‌سازی شد. مبلغ جدید پیمان: ${totalCbsBudget.toLocaleString('fa-IR')} تومان`,
              date: new Date().toLocaleDateString('fa-IR') + ' ' + new Date().toLocaleTimeString('fa-IR').slice(0, 5)
            },
            ...c.auditLogs
          ];
          return {
            ...c,
            initialAmount: totalCbsBudget || c.initialAmount,
            baseBudgetAmount: totalCbsBudget || c.baseBudgetAmount,
            cbsMapping: newMapping,
            auditLogs: updatedAudit
          };
        }
        return c;
      }));

      alert(`همگام‌سازی با موفقیت انجام شد!
تعداد گره‌های منتقل شده: ${projectNodes.length} عدد
مبلغ کل پیمان بر اساس بودجه مصوب CBS تنظیم شد: ${totalCbsBudget.toLocaleString('fa-IR')} تومان`);
    } catch (e) {
      console.error("Error syncing CBS nodes", e);
      alert('خطا در خواندن یا پردازش اطلاعات ساختار شکست.');
    }
  };

  // Add Mapping Item
  const [mappingForm, setMappingForm] = useState({ cbsCode: '', allocatedAmount: 0 });
  const handleAddMapping = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContractId || !selectedContract || !mappingForm.cbsCode) return;

    const totalAllocated = selectedContract.cbsMapping.reduce((sum, item) => sum + item.allocatedAmount, 0);
    const { currentAmount } = calculateContractAmounts(selectedContract);
    
    // We should subtract the existing mapping amount if we are overwriting it
    const existingMapping = selectedContract.cbsMapping.find(item => item.cbsCode.trim() === mappingForm.cbsCode.trim());
    const existingAmount = existingMapping ? existingMapping.allocatedAmount : 0;

    if (totalAllocated - existingAmount + Number(mappingForm.allocatedAmount) > currentAmount) {
      alert('مجموع توزیع بودجه در ساختار شکست نمی‌تواند بیشتر از مبلغ کل قرارداد باشد!');
      return;
    }

    // --- CONTROLLING ALLOCATION CEILING BASED ON BASELINE BUDGET ---
    const targetCbsNode = cbsNodes.find((n: any) => String(n.code).trim() === String(mappingForm.cbsCode).trim());
    if (targetCbsNode) {
      // Find all allocations for this CBS code in OTHER contracts of this project
      const totalAllocatedInOtherContracts = contracts
        .filter(c => String(c.projectId).trim() === String(selectedProjectId).trim() && c.id !== selectedContractId)
        .reduce((sum, c) => {
          const mapping = c.cbsMapping?.find((m: any) => String(m.cbsCode).trim() === String(targetCbsNode.code).trim());
          return sum + (mapping?.allocatedAmount || 0);
        }, 0);
      
      const baselineCeiling = targetCbsNode.budget || 0;
      const requestedAmount = Number(mappingForm.allocatedAmount);

      if (totalAllocatedInOtherContracts + requestedAmount > baselineCeiling) {
        alert(`خطای کنترل سقف تخصیص بر اساس بودجه مبنا:
کد ساختار شکست: ${targetCbsNode.code} (${targetCbsNode.title})
بودجه مصوب مبنا (سقف کل مجاز): ${baselineCeiling.toLocaleString('fa-IR')} تومان
مجموع تخصیص یافته در سایر قراردادها: ${totalAllocatedInOtherContracts.toLocaleString('fa-IR')} تومان
مبلغ پیشنهادی جدید در این پیمان: ${requestedAmount.toLocaleString('fa-IR')} تومان
انحراف و سرریز مازاد: ${((totalAllocatedInOtherContracts + requestedAmount) - baselineCeiling).toLocaleString('fa-IR')} تومان مازاد بر بودجه مصوب!

تخصیص متوقف گردید. لطفاً مبلغ تخصیصی را کاهش دهید یا ابتدا بودجه مصوب مبنا را در بخش مدیریت CBS افزایش دهید.`);
        return;
      }
    } else if (cbsNodes.length > 0) {
      alert('کد ساختار شکست وارد شده در تعاریف ساختار شکست (CBS) پروژه یافت نشد! لطفاً از لیست کدهای معتبر انتخاب کنید.');
      return;
    }

    const calculatedWeightPercent = (Number(mappingForm.allocatedAmount) / currentAmount) * 100;

    const newItem: CbsMappingItem = {
      cbsCode: mappingForm.cbsCode.trim(),
      allocatedAmount: Number(mappingForm.allocatedAmount),
      weightPercent: Number(calculatedWeightPercent.toFixed(2))
    };

    setContracts(prev => prev.map(c => {
      if (c.id === selectedContractId) {
        const existingIndex = c.cbsMapping.findIndex(item => item.cbsCode === mappingForm.cbsCode.trim());
        let updatedMapping = [...c.cbsMapping];
        if (existingIndex > -1) {
          updatedMapping[existingIndex] = newItem;
        } else {
          updatedMapping.push(newItem);
        }

        // recalculate weights of all mapped items dynamically
        const newTotalMapped = updatedMapping.reduce((s, m) => s + m.allocatedAmount, 0);
        updatedMapping = updatedMapping.map(m => ({
          ...m,
          weightPercent: Number(((m.allocatedAmount / currentAmount) * 100).toFixed(2))
        }));

        const log: ContractAuditLog = {
          id: `l-${Date.now()}`,
          user: 'Mostafa.nasrollahnejad@gmail.com',
          action: 'تخصیص CBS',
          details: `مبلغ ${Number(mappingForm.allocatedAmount).toLocaleString('fa-IR')} تومان به کد CBS ${mappingForm.cbsCode} تخصیص یافت. (کنترل سقف بودجه مبنا انجام شد)`,
          date: new Date().toLocaleDateString('fa-IR') + ' ' + new Date().toLocaleTimeString('fa-IR').slice(0, 5)
        };

        return {
          ...c,
          cbsMapping: updatedMapping,
          auditLogs: [log, ...c.auditLogs]
        };
      }
      return c;
    }));

    setMappingForm({ cbsCode: '', allocatedAmount: 0 });
  };

  const handleRemoveMapping = (code: string) => {
    if (!selectedContractId) return;
    const targetContract = contracts.find(c => c.id === selectedContractId);
    const targetProjId = targetContract?.projectId || selectedProjectId;

    const updatedContracts = contracts.map(c => {
      if (c.id === selectedContractId) {
        const updated = c.cbsMapping.filter(item => item.cbsCode !== code);
        return {
          ...c,
          cbsMapping: updated
        };
      }
      return c;
    });
    setContracts(updatedContracts);
    localStorage.setItem('hamyar_cbs_contracts', JSON.stringify(updatedContracts));

    // Also remove from hamyar_cbs_nodes for this project if present
    try {
      const storedNodes = JSON.parse(localStorage.getItem('hamyar_cbs_nodes') || '[]');
      if (Array.isArray(storedNodes)) {
        const remainingNodes = storedNodes.filter((n: any) => 
          !( (String(n.projectId).trim() === String(targetProjId).trim() || String(n.projectId).trim() === String(selectedProjectId).trim()) && String(n.code).trim() === String(code).trim() )
        );
        localStorage.setItem('hamyar_cbs_nodes', JSON.stringify(remainingNodes));
      }
    } catch (err) {}

    // Also remove from hamyar_estimates (Technical Office CBS Engineering)
    try {
      const storedEst = JSON.parse(localStorage.getItem('hamyar_estimates') || '[]');
      if (Array.isArray(storedEst)) {
        const remainingEst = storedEst.filter((e: any) => {
          const estProjId = String(e.projectId || '').trim();
          if (estProjId === String(targetProjId).trim() || estProjId === String(selectedProjectId).trim()) {
            const itemCode = String(e.code || e.itemCode || e.cbsCode || '').trim().toLowerCase();
            return itemCode !== String(code).trim().toLowerCase();
          }
          return true;
        });
        localStorage.setItem('hamyar_estimates', JSON.stringify(remainingEst));
      }
    } catch (err) {}

    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new CustomEvent('cbs-nodes-updated', { detail: { projectId: targetProjId } }));
    window.dispatchEvent(new CustomEvent('cbs-contracts-updated', { detail: { projectId: targetProjId } }));
    window.dispatchEvent(new CustomEvent('estimates-updated', { detail: { projectId: targetProjId } }));
  };

  // Status Badge UI helper
  const getStatusBadge = (status: ContractStatus) => {
    switch (status) {
      case 'REGISTERED': return <span className="px-3 py-1 bg-blue-50 text-blue-700 text-[10px] font-black rounded-full border border-blue-200">ثبت شده</span>;
      case 'DRAFT': return <span className="px-3 py-1 bg-stone-100 text-stone-700 text-[10px] font-black rounded-full border border-[#e5ded0]">پیش‌نویس</span>;
      case 'UNDER_REVIEW': return <span className="px-3 py-1 bg-amber-50 text-amber-700 text-[10px] font-black rounded-full border border-amber-200">در حال بررسی</span>;
      case 'APPROVED': return <span className="px-3 py-1 bg-stone-50 text-stone-900 text-[10px] font-black rounded-full border border-blue-200">تصویب‌شده</span>;
      case 'ACTIVE': return <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-black rounded-full border border-emerald-200/60 shadow-sm shadow-emerald-500/10">ابلاغ‌شده و فعال</span>;
      case 'SUSPENDED': return <span className="px-3 py-1 bg-rose-50 text-rose-700 text-[10px] font-black rounded-full border border-rose-200">تعلیق‌شده</span>;
      case 'COMPLETED': return <span className="px-3 py-1 bg-teal-50 text-teal-700 text-[10px] font-black rounded-full border border-teal-200">خاتمه‌یافته</span>;
      case 'CLOSED': return <span className="px-3 py-1 bg-purple-50 text-purple-700 text-[10px] font-black rounded-full border border-purple-200">مختومه</span>;
      default: return <span className="px-3 py-1 bg-stone-100 text-stone-600 text-[10px] font-black rounded-full">{status}</span>;
    }
  };

  const getContractTypeLabel = (type: ContractType) => {
    switch (type) {
      case 'CBS': return 'ساختار شکست یکپارچه (CBS)';
      case 'EPC': return 'طراحی، خرید و ساخت (EPC)';
      case 'UNIT_PRICE': return 'فهرست‌بهایی / آحادبها';
      case 'LUMP_SUM': return 'مقطوع (Lump Sum)';
      case 'COST_PLUS': return 'مدیریت پیمان (Cost Plus)';
      default: return type;
    }
  };

  return (
    <div className="theme-adaptive-module space-y-6 pb-12 text-right text-stone-900 dark:text-slate-100" dir="rtl">
      {/* Top Title and Actions */}
      <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-stone-200/80 dark:border-slate-800 shadow-sm flex flex-col xl:flex-row justify-between items-center gap-8">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-stone-900 dark:bg-slate-800 rounded-[1.5rem] flex items-center justify-center text-amber-500 shadow-2xl shadow-stone-500/20 border border-transparent dark:border-slate-700">
            <FolderKanban size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-stone-900 dark:text-white tracking-tight">
              مدیریت پیمان‌های پروژه‌محور
            </h2>
            <p className="text-stone-500 dark:text-slate-400 text-xs font-bold mt-1">
              یکپارچه‌سازی قراردادها با ساختار شکست هزینه (CBS) و کنترل مالی هوشمند
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-stone-400 dark:text-slate-400 uppercase tracking-widest">پروژه فعال:</span>
            <select 
              value={selectedProjectId}
              onChange={(e) => {
                setSelectedProjectId(e.target.value);
                setSelectedContractId(null);
              }}
              className="text-xs font-black text-stone-900 dark:text-white outline-none bg-transparent border-b border-stone-200 dark:border-slate-700 pb-0.5 focus:border-amber-500 transition-colors"
            >
              {accessibleProjects.length === 0 ? (
                <option value="">هیچ پروژه مجازی یافت نشد</option>
              ) : (
                accessibleProjects.map(p => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))
              )}
            </select>
          </div>

          <button
            onClick={() => {
              if (!isEmployerPmorWS && currentUser?.role !== 'SYSTEM_ADMIN') {
                alert('ثبت قرارداد جدید صرفاً توسط مدیر پروژه کارفرما، سرپرست کارگاه کارفرما و مدیر کل سیستم امکان‌پذیر است.');
                return;
              }
              setNewContractForm(prev => ({
                ...prev,
                type: isCbsProject ? 'CBS' : 'EPC'
              }));
              setIsCreateModalOpen(true);
            }}
            className="flex items-center gap-2 px-6 py-2.5 bg-amber-500 text-stone-950 font-black rounded-xl text-xs font-black shadow-lg shadow-amber-500/20 transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            <Plus size={18} />
            <span>ثبت قرارداد جدید</span>
          </button>
        </div>
      </div>

      {/* Unallocated Project Warning Banner */}
      {!isProjectAllocated && activeProjectObj && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center gap-3 text-amber-950 text-xs font-bold leading-relaxed shadow-sm animate-fadeIn">
          <AlertTriangle size={20} className="text-amber-600 shrink-0" />
          <div>
            <span className="font-black text-amber-950 block">پروژه در وضعیت ثبت اولیه (قبل از تخصیص مدیر کل سیستم)</span>
            این پروژه هنوز توسط مدیر کل سیستم تخصیص داده نشده است. قراردادهای ثبت‌شده صرفاً توسط مدیر پروژه کارفرما، سرپرست کارگاه کارفرما و مدیر کل سیستم قابل مشاهده و مدیریت می‌باشند.
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex bg-stone-100/80 dark:bg-slate-800/80 p-1.5 rounded-[1.5rem] gap-1.5 border border-stone-200/50 dark:border-slate-700 w-fit">
        <button
          onClick={() => { setActiveTab('project-list'); setSelectedContractId(null); }}
          className={`px-6 py-2.5 text-xs font-black rounded-2xl transition-all flex items-center gap-3 ${
            activeTab === 'project-list' && !selectedContractId
              ? 'bg-stone-900 dark:bg-amber-500 text-white dark:text-stone-950 shadow-lg shadow-stone-900/20'
              : 'text-stone-500 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white'
          }`}
        >
          <FolderKanban size={18} />
          <span>لیست پروژه‌ها ({projects.length})</span>
        </button>
        <button
          onClick={() => { setActiveTab('dashboard'); setSelectedContractId(null); }}
          className={`px-6 py-2.5 text-xs font-black rounded-2xl transition-all flex items-center gap-3 ${
            activeTab === 'dashboard' && !selectedContractId
              ? 'bg-stone-900 dark:bg-amber-500 text-white dark:text-stone-950 shadow-lg shadow-stone-900/20'
              : 'text-stone-500 dark:text-slate-400 hover:text-stone-800 dark:hover:text-white'
          }`}
        >
          <Layers size={18} />
          <span>داشبورد و تحلیل مبالغ</span>
        </button>
        <button
          onClick={() => { setActiveTab('registry'); setSelectedContractId(null); }}
          className={`px-6 py-2.5 text-xs font-black rounded-2xl transition-all flex items-center gap-3 ${
            activeTab === 'registry' && !selectedContractId
              ? 'bg-stone-900 dark:bg-amber-500 text-white dark:text-stone-950 shadow-lg shadow-stone-900/20'
              : 'text-stone-500 dark:text-slate-400 hover:text-stone-800 dark:hover:text-white'
          }`}
        >
          <BookOpen size={18} />
          <span>دفتر ثبت قراردادها ({projectContracts.length})</span>
        </button>

        {selectedContractId && selectedContract && (
          <div className="flex items-center gap-1 bg-stone-50/50 dark:bg-slate-800 px-3 py-1 rounded-t-2xl border-b-2 border-amber-600 text-amber-600 dark:text-amber-400">
            <FileText size={14} className="animate-pulse" />
            <span className="text-xs font-black truncate max-w-[200px]">
              جزئیات: {selectedContract.number}
            </span>
            <button 
              onClick={() => setSelectedContractId(null)} 
              className="p-1 hover:bg-blue-100 rounded-full text-amber-600 mr-2"
              title="بستن پنل جزئیات"
            >
              ×
            </button>
          </div>
        )}
      </div>

      {/* RENDER CONTENT */}

      {/* 1. DASHBOARD VIEW */}
      {activeTab === 'dashboard' && !selectedContractId && (
        <div className="space-y-6">
          {/* Warranty alert banner */}
          {projectContracts.some(c => c.warranties.some(w => w.status === 'ACTIVE')) && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/50 rounded-3xl flex items-center gap-3 text-amber-800 dark:text-amber-300 text-xs font-bold leading-relaxed shadow-sm">
              <span className="p-2 bg-amber-100 dark:bg-amber-900/60 rounded-xl text-amber-700 dark:text-amber-300 flex items-center justify-center">
                <AlertTriangle size={18} />
              </span>
              <div>
                <span className="font-black text-stone-800 dark:text-white block">پایش هوشمند تعهدات و ضمانت‌نامه‌ها</span>
                ضمانت‌نامه‌های تسلیمی پیمانکاران این پروژه معتبر و فعال هستند. سامانه ۳۰ روز پیش از موعد انقضا سررسید را اعلام خواهد کرد.
              </div>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-[2rem] border border-[#ece5d8] dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <span className="text-stone-400 dark:text-slate-500 font-bold text-[10px] block uppercase">بودجه کل مصوب مبنا</span>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-xl font-black text-stone-800 dark:text-white">{(totalProjectBudgetBaseline / 1000000000).toLocaleString('fa-IR')}</span>
                <span className="text-[10px] text-stone-500 dark:text-slate-400 font-bold">میلیارد تومان</span>
              </div>
              <div className="text-[9px] text-stone-500 dark:text-slate-400 font-bold mt-2">۱۰۰٪ برآورد پایه کل پروژه</div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-[2rem] border border-[#ece5d8] dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <span className="text-stone-400 dark:text-slate-500 font-bold text-[10px] block uppercase">مجموع مبلغ قراردادهای ابلاغی</span>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-xl font-black text-amber-600 dark:text-amber-400">{(totalContractedAmount / 1000000000).toLocaleString('fa-IR')}</span>
                <span className="text-[10px] text-amber-500 dark:text-amber-400 font-bold">میلیارد تومان</span>
              </div>
              <div className="text-[9px] text-amber-600 dark:text-amber-400 font-bold mt-2">
                {((totalContractedAmount / totalProjectBudgetBaseline) * 100).toFixed(1)}٪ از کل بودجه تعهد شده است.
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-[2rem] border border-[#ece5d8] dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <span className="text-stone-400 dark:text-slate-500 font-bold text-[10px] block uppercase">بودجه باقیمانده آزاد (تخصیص‌نیافته)</span>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">{((totalProjectBudgetBaseline - totalContractedAmount) / 1000000000).toLocaleString('fa-IR')}</span>
                <span className="text-[10px] text-emerald-500 dark:text-emerald-400 font-bold">میلیارد تومان</span>
              </div>
              <div className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold mt-2">
                {remainingBudgetPercent.toFixed(1)}٪ مانده آزاد جهت سایر پیمان‌ها
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-[2rem] border border-[#ece5d8] dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <span className="text-stone-400 dark:text-slate-500 font-bold text-[10px] block uppercase">مجموع مبلغ ضمانت‌نامه‌های فعال</span>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-xl font-black text-purple-600 dark:text-purple-400">{(totalWarrantiesValue / 1000000000).toLocaleString('fa-IR')}</span>
                <span className="text-[10px] text-purple-500 dark:text-purple-400 font-bold">میلیارد تومان</span>
              </div>
              <div className="text-[9px] text-purple-600 dark:text-purple-400 font-bold mt-2">ضمانت‌نامه‌های سپرده نزد کارفرما</div>
            </div>
          </div>

          {/* Charts or detailed list */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-[#ece5d8] dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="font-black text-stone-800 dark:text-white text-sm flex items-center gap-2">
                <Layers size={18} className="text-amber-600 dark:text-amber-400" />
                توزیع مالی مبالغ قراردادها در مقایسه با بودجه پروژه
              </h3>
              
              <div className="space-y-4 pt-2">
                <div>
                  <div className="flex justify-between text-xs font-bold text-stone-600 mb-1">
                    <span>تعهدات مالی قراردادها (مجموع قراردادها)</span>
                    <span>{((totalContractedAmount / totalProjectBudgetBaseline) * 100).toFixed(1)}٪ ({ (totalContractedAmount / 1000000000).toFixed(1) } م.ت)</span>
                  </div>
                  <div className="w-full h-3 bg-stone-100 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-600 rounded-full" style={{ width: `${Math.min((totalContractedAmount / totalProjectBudgetBaseline) * 100, 100)}%` }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold text-stone-600 mb-1">
                    <span>بودجه باقیمانده بدون قرارداد</span>
                    <span>{remainingBudgetPercent.toFixed(1)}٪ ({ ((totalProjectBudgetBaseline - totalContractedAmount) / 1000000000).toFixed(1) } م.ت)</span>
                  </div>
                  <div className="w-full h-3 bg-stone-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.max(remainingBudgetPercent, 0)}%` }}></div>
                  </div>
                </div>
              </div>

              {/* Internal structured list of contracts with progress representation */}
              <div className="border-t border-[#ece5d8] pt-4 mt-6">
                <h4 className="text-xs font-black text-stone-700 mb-4">قراردادهای مصوب تایید شده:</h4>
                <div className="overflow-x-auto rounded-2xl border border-[#ece5d8] shadow-sm">
                  <table className="w-full text-right border-collapse bg-[#faf8f4]/30">
                    <thead>
                      <tr className="bg-stone-100/50 border-b border-[#ece5d8]">
                        <th className="p-3 text-[10px] font-black text-stone-500">عنوان و پیمانکار</th>
                        <th className="p-3 text-[10px] font-black text-stone-500">مبلغ جاری</th>
                        <th className="p-3 text-[10px] font-black text-stone-500">سهم از کل</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {projectContracts.map(c => {
                        const { currentAmount } = calculateContractAmounts(c);
                        const percentOfProject = (currentAmount / totalProjectBudgetBaseline) * 100;
                        return (
                          <tr key={c.id} className="hover:bg-stone-50/30 transition-all">
                            <td className="p-3">
                              <span className="font-black text-xs text-stone-800 block">{c.title}</span>
                              <span className="text-[9px] text-stone-400 font-bold block mt-0.5">پیمانکار: {c.contractor}</span>
                            </td>
                            <td className="p-3">
                              <span className="font-black text-[11px] text-stone-700 block">{currentAmount.toLocaleString('fa-IR')}</span>
                              <span className="text-[9px] text-stone-400 font-bold">تومان</span>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-1.5 bg-stone-200 rounded-full overflow-hidden">
                                  <div className="h-full bg-amber-500" style={{ width: `${Math.min(percentOfProject, 100)}%` }}></div>
                                </div>
                                <span className="text-[10px] font-black text-amber-600 w-8 text-left">{percentOfProject.toFixed(1)}٪</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {projectContracts.length === 0 && (
                        <tr>
                          <td colSpan={3} className="p-6 text-center text-xs text-stone-400 font-bold italic">
                            هیچ قراردادی برای این پروژه یافت نشد.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Quick overview widget / special conditions */}
            <div className="bg-white p-6 rounded-3xl border border-[#ece5d8] shadow-sm space-y-4 flex flex-col justify-between">
              <div>
                <h3 className="font-black text-stone-800 text-sm flex items-center gap-2 mb-4">
                  <ShieldCheck size={18} className="text-emerald-600" />
                  قوانین انضباطی قراردادهای CBS
                </h3>
                <ul className="text-[11px] text-stone-600 font-bold space-y-3 list-disc pr-4 leading-relaxed">
                  <li>هر ردیف ساختار شکست هزینه (CBS) تنها به یک پیمان ابلاغی جهت ثبت و صورت‌وضعیت متصل می‌شود.</li>
                  <li>مجموع تعهدات ارزی و ریالی ریشه‌ها نباید از سقف ردیف‌های متناظر در تعریف ساختار شکست فراتر رود.</li>
                  <li>تغییر مقادیر و مبالغ اولیه صرفاً از طریق گردش کار رسمی الحاقیه (Amendment) یا دستورکار میسر است.</li>
                  <li>ضمانت‌نامه‌های بانکی بر اساس تمدید مدت پیمان باید بلافاصله تمدید و در سامانه کارتابل‌سازی شوند.</li>
                </ul>
              </div>

              <div className="p-4 bg-stone-50/50 border border-blue-100 rounded-2xl flex items-center justify-between mt-4">
                <div>
                  <span className="text-[10px] text-stone-400 block font-bold">تعداد پیمان‌ها</span>
                  <span className="text-lg font-black text-stone-800">{projectContracts.length} قرارداد</span>
                </div>
                <button 
                  onClick={() => setActiveTab('registry')}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-stone-900 text-white rounded-xl text-[10px] font-black"
                >
                  مشاهده همه
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePrintContractSummary(selectedContract)}
                    className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Download size={14} />
                    چاپ شناسنامه پیمان
                  </button>
                  <button
                    onClick={() => setDetailSubTab('audit')}
                    className="px-3 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-500 rounded-xl transition-all"
                    title="مشاهده لاگ تغییرات"
                  >
                    <Clock size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. REGISTRY VIEW */}
      {activeTab === 'registry' && !selectedContractId && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-3xl border border-[#ece5d8] shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-96">
              <Search className="absolute right-4 top-1/2 -transtone-y-1/2 text-stone-400" size={16} />
              <input
                type="text"
                placeholder="جستجو در قراردادها، پیمانکاران، شماره قرارداد..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-11 pl-4 py-2 bg-[#faf8f4] border border-[#ece5d8] rounded-2xl text-xs font-bold text-stone-800 focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:bg-white transition-all"
              />
            </div>

            <div className="flex gap-2 w-full md:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-[#faf8f4] border border-[#ece5d8] rounded-2xl text-[11px] font-bold text-stone-600 focus:outline-none"
              >
                <option value="ALL">همه وضعیت‌ها</option>
                <option value="REGISTERED">ثبت شده</option>
                <option value="DRAFT">پیش‌نویس</option>
                <option value="UNDER_REVIEW">در حال بررسی</option>
                <option value="ACTIVE">ابلاغ‌شده و فعال</option>
                <option value="SUSPENDED">تعلیق‌شده</option>
                <option value="COMPLETED">خاتمه‌یافته</option>
              </select>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 bg-[#faf8f4] border border-[#ece5d8] rounded-2xl text-[11px] font-bold text-stone-600 focus:outline-none"
              >
                <option value="ALL">همه انواع قرارداد</option>
                {isCbsProject && <option value="CBS">CBS (ساختار شکست یکپارچه)</option>}
                <option value="EPC">EPC (طراحی و ساخت)</option>
                <option value="UNIT_PRICE">فهرست‌بهایی / آحادبها</option>
                <option value="LUMP_SUM">مقطوع (Lump Sum)</option>
                <option value="COST_PLUS">مدیریت پیمان (Cost Plus)</option>
              </select>
            </div>
          </div>

          {/* Contracts Table */}
          <div className="bg-white rounded-3xl border border-[#ece5d8] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-[#faf8f4] border-b border-[#ece5d8]">
                    <th className="p-4 text-xs font-black text-stone-500">شماره و عنوان قرارداد</th>
                    <th className="p-4 text-xs font-black text-stone-500">طرفین پیمان</th>
                    <th className="p-4 text-xs font-black text-stone-500">نوع</th>
                    <th className="p-4 text-xs font-black text-stone-500">مبلغ اولیه</th>
                    <th className="p-4 text-xs font-black text-stone-500">مبلغ جاری (با الحاقیه)</th>
                    <th className="p-4 text-xs font-black text-stone-500">تاریخ ابلاغ / پایان جاری</th>
                    <th className="p-4 text-xs font-black text-stone-500">وضعیت</th>
                    <th className="p-4 text-xs font-black text-stone-500 text-center">عملیات مدیریت</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {filteredContracts.map(c => {
                    const { currentAmount } = calculateContractAmounts(c);
                    return (
                      <tr key={c.id} className="hover:bg-[#faf8f4]/50 transition-colors">
                        <td className="p-4">
                          <span className="font-black text-xs text-amber-600 block">{c.number}</span>
                          <span className="text-[11px] text-stone-700 font-bold block mt-1 max-w-[280px] truncate" title={c.title}>
                            {c.title}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="text-[11px] text-stone-800 font-bold block">پیمانکار: {c.contractor}</span>
                          <span className="text-[10px] text-stone-400 font-bold block">کارفرما: {c.employer}</span>
                        </td>
                        <td className="p-4">
                          <span className="px-2 py-1 bg-stone-50 text-stone-900 rounded-lg text-[10px] font-bold border border-blue-100">
                            {getContractTypeLabel(c.type)}
                          </span>
                        </td>
                        <td className="p-4 text-xs font-black text-stone-800">
                          {c.initialAmount.toLocaleString('fa-IR')} {c.currency}
                        </td>
                        <td className="p-4 text-xs font-black text-amber-600">
                          {currentAmount.toLocaleString('fa-IR')} {c.currency}
                        </td>
                        <td className="p-4">
                          <span className="text-[11px] text-stone-700 font-bold block">ابلاغ: {c.issueDate}</span>
                          <span className="text-[10px] text-stone-400 font-bold block mt-0.5">پایان: {c.currentEndDate}</span>
                        </td>
                        <td className="p-4">
                          {getStatusBadge(c.status)}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => { setSelectedContractId(c.id); setDetailSubTab('info'); }}
                              className="p-2 bg-stone-50 text-amber-600 hover:bg-blue-100 rounded-xl transition-all"
                              title="ورود به پنل جامع مدیریت قرارداد"
                            >
                              <ExternalLink size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteContract(c.id, c.title)}
                              className="p-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl transition-all"
                              title="حذف قرارداد"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredContracts.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-xs text-stone-400 font-bold">
                        هیچ قراردادی با مشخصات جستجو شده یافت نشد.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. PROJECT LIST VIEW */}
      {activeTab === 'project-list' && !selectedContractId && (
        <div className="space-y-4 animate-fadeIn">
          {/* Summary Banner for Projects */}
          <div className="p-4 bg-stone-50 border border-blue-100 rounded-3xl flex items-center gap-3 text-stone-950 text-xs font-bold leading-relaxed shadow-sm">
            <span className="p-2 bg-blue-100 rounded-xl text-stone-900 flex items-center justify-center">
              <FolderKanban size={18} />
            </span>
            <div>
              <span className="font-black text-stone-800 block">پرتفوی پروژه‌های سازمانی</span>
              در این بخش تمامی پروژه‌های ثبت شده در سامانه به همراه مشخصات کلی و وضعیت پیمان‌های آن‌ها نمایش داده شده است.
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-[#ece5d8] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-[#faf8f4] border-b border-[#ece5d8]">
                    <th className="p-4 text-xs font-black text-stone-500">کد و عنوان پروژه</th>
                    <th className="p-4 text-xs font-black text-stone-500">کارفرما / مشاور</th>
                    <th className="p-4 text-xs font-black text-stone-500">نوع قرارداد</th>
                    <th className="p-4 text-xs font-black text-stone-500">برآورد اولیه</th>
                    <th className="p-4 text-xs font-black text-stone-500">بازه زمانی</th>
                    <th className="p-4 text-xs font-black text-stone-500">وضعیت</th>
                    <th className="p-4 text-xs font-black text-stone-500 text-center">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {accessibleProjects.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-stone-400 font-bold">
                        شما به هیچ پروژه‌ای دسترسی ندارید.
                      </td>
                    </tr>
                  ) : (
                    accessibleProjects.map(p => (
                    <tr key={p.id} className="hover:bg-[#faf8f4]/50 transition-colors">
                      <td className="p-4">
                        <span className="font-black text-xs text-amber-600 block">{p.contractNumber || `PRJ-${p.id}`}</span>
                        <span className="text-[11px] text-stone-700 font-black block mt-1 max-w-[300px] truncate" title={p.title}>
                          {p.title}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="text-[11px] text-stone-800 font-bold block">کارفرما: {p.employerName}</span>
                        <span className="text-[10px] text-stone-400 font-bold block mt-0.5">مشاور: {p.consultantName}</span>
                      </td>
                      <td className="p-4">
                        <span className="px-3 py-1 bg-stone-50 text-stone-900 rounded-lg text-[10px] font-black border border-blue-100">
                          {p.contractType}
                        </span>
                      </td>
                      <td className="p-4 text-xs font-black text-stone-800">
                        {p.initialBudget.toLocaleString('fa-IR')} تومان
                      </td>
                      <td className="p-4">
                        <span className="text-[11px] text-stone-700 font-bold block">شروع: {p.startDate}</span>
                        <span className="text-[10px] text-stone-400 font-bold block mt-1 bg-stone-100 px-2 py-0.5 rounded-md inline-block">پایان: {p.endDate}</span>
                      </td>
                      <td className="p-4">
                        <span className={`px-3 py-1 text-[10px] font-black rounded-full border ${
                          p.status === 'ACTIVE' 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm shadow-emerald-500/5' 
                            : 'bg-[#faf8f4] text-stone-500 border-[#e5ded0]'
                        }`}>
                          {p.status === 'ACTIVE' ? 'فعال' : 'غیرفعال'}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => { setSelectedProjectId(p.id); setActiveTab('dashboard'); }}
                          className="flex items-center gap-1 mx-auto px-4 py-2 bg-amber-600 hover:bg-stone-900 text-white rounded-xl text-[10px] font-black shadow-lg shadow-amber-500/10 transition-all active:scale-95"
                        >
                          <Eye size={12} />
                          <span>انتخاب پروژه</span>
                        </button>
                      </td>
                    </tr>
                  )))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. DETAILED VIEW / WORKSPACE FOR SELECTED CONTRACT */}
      {selectedContractId && selectedContract && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* Selected Contract Left Panel (General state and Workflow Action center) */}
          <div className="bg-white rounded-3xl border border-[#ece5d8] shadow-sm overflow-hidden p-6 space-y-6">
            <div className="text-center pb-4 border-b border-[#ece5d8]">
              <span className="text-[9px] font-black bg-stone-50 text-amber-600 px-3 py-1 rounded-full uppercase border border-blue-100">
                {selectedContract.number}
              </span>
              <h2 className="font-black text-sm text-stone-800 mt-3 line-clamp-2">
                {selectedContract.title}
              </h2>
              <div className="mt-3">
                {getStatusBadge(selectedContract.status)}
              </div>
            </div>

            {/* Financial summaries */}
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-stone-400 font-bold">مبلغ اولیه پیمان:</span>
                <span className="text-stone-700 font-black">{selectedContract.initialAmount.toLocaleString('fa-IR')} {selectedContract.currency}</span>
              </div>
              <div className="flex justify-between items-center text-xs border-b border-stone-50 pb-2">
                <span className="text-stone-400 font-bold">بودجه مبنای قرارداد:</span>
                <span className="text-amber-600 font-black">{(selectedContract.baseBudgetAmount || 0).toLocaleString('fa-IR')} {selectedContract.currency}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-stone-400 font-bold">تغییرات الحاقیه‌ها:</span>
                <span className="text-amber-600 font-black">
                  { (calculateContractAmounts(selectedContract).amountDifferenceSum >= 0 ? '+' : '') }
                  { calculateContractAmounts(selectedContract).amountDifferenceSum.toLocaleString('fa-IR') } {selectedContract.currency}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs border-t border-stone-50 pt-2">
                <span className="text-stone-500 font-black">مبلغ کل فعلی:</span>
                <span className="text-amber-600 font-black text-sm">
                  {calculateContractAmounts(selectedContract).currentAmount.toLocaleString('fa-IR')} {selectedContract.currency}
                </span>
              </div>
            </div>

            {/* Workflow Action Center */}
            <div className="p-4 bg-[#faf8f4] rounded-2xl border border-[#ece5d8] space-y-3">
              <h4 className="text-xs font-black text-stone-800 flex items-center gap-1.5">
                <Clock size={14} className="text-amber-500" />
                کنترل گام و تاییدات قرارداد
              </h4>
              <p className="text-[10px] text-stone-500 font-bold leading-relaxed">
                این بخش به صورت‌جلسات، WBS و درخت برآوردی برای مدیریت پیشرفت فیزیکی هوشمند متصل است.
              </p>
              
              {selectedContract.status === 'DRAFT' && (
                <button
                  onClick={() => handleWorkflowTransition('UNDER_REVIEW', 'ارسال برای بررسی کارشناسان کارفرما')}
                  className="w-full py-2.5 bg-amber-600 hover:bg-stone-900 text-white rounded-xl text-xs font-black shadow-md transition-all cursor-pointer"
                >
                  ارسال برای بررسی و تایید مشاور
                </button>
              )}

              {selectedContract.status === 'UNDER_REVIEW' && (
                <div className="space-y-2">
                  <button
                    onClick={() => handleWorkflowTransition('ACTIVE', 'ابلاغ نهایی پیمان')}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md transition-all cursor-pointer"
                  >
                    ابلاغ و فعال‌سازی قرارداد
                  </button>
                  <button
                    onClick={() => handleWorkflowTransition('DRAFT', 'بازگرداندن به پیش‌نویس جهت اصلاح')}
                    className="w-full py-2 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-xl text-[10px] font-black transition-all cursor-pointer"
                  >
                    برگشت برای ویرایش
                  </button>
                </div>
              )}

              {selectedContract.status === 'ACTIVE' && (
                <button
                  onClick={() => handleWorkflowTransition('COMPLETED', 'پایان موضوع قرارداد')}
                  className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer"
                >
                  اعلام خاتمه کار و تحویل موقت
                </button>
              )}

              {selectedContract.status === 'COMPLETED' && (
                <button
                  onClick={() => handleWorkflowTransition('CLOSED', 'مختومه نمودن رسمی پرونده')}
                  className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer"
                >
                  مختومه کردن قرارداد
                </button>
              )}
            </div>
          </div>

          {/* Detailed workspace central panel */}
          <div className="lg:col-span-3 bg-white rounded-3xl border border-[#ece5d8] shadow-sm overflow-hidden p-6 space-y-6">
            {/* Detail Navigation Tabs */}
            <div className="flex border-b border-[#e5ded0]/60 overflow-x-auto pb-px gap-1">
              {[
                { id: 'info', label: 'مشخصات عمومی', icon: <FileText size={14} /> },
                { id: 'wbs', label: 'ساختار شکست کار (WBS) و زمان‌بندی', icon: <FolderKanban size={14} /> },
                { id: 'cbs', label: 'تخصیص ساختار شکست (CBS)', icon: <Layers size={14} /> },
                { id: 'revisions', label: 'الحاقیه‌ها و الحاقات', icon: <History size={14} /> },
                { id: 'warranties', label: 'ضمانت‌نامه‌ها و بیمه', icon: <Landmark size={14} /> },
                { id: 'docs', label: 'پیوست‌ها و اسناد', icon: <Paperclip size={14} /> },
                { id: 'notes', label: 'یادداشت‌های داخلی', icon: <MessageSquare size={14} /> },
                { id: 'audit', label: 'تاریخچه سیستم', icon: <Clock size={14} /> },
              ].map(subTab => (
                <button
                  key={subTab.id}
                  onClick={() => setDetailSubTab(subTab.id as any)}
                  className={`px-4 py-2 text-xs font-bold rounded-xl transition-all duration-200 flex items-center gap-2 whitespace-nowrap ${
                    detailSubTab === subTab.id
                      ? 'bg-stone-50 text-amber-600 font-black'
                      : 'text-stone-400 hover:text-stone-800 hover:bg-[#faf8f4]'
                  }`}
                >
                  {subTab.icon}
                  <span>{subTab.label}</span>
                </button>
              ))}
            </div>

            {/* TAB CONTENT */}

            {/* 3.1. GENERAL SPECIFICATIONS */}
            {detailSubTab === 'info' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Row 1 */}
                  <div className="p-4 bg-[#faf8f4] rounded-2xl border border-[#ece5d8]">
                    <span className="text-[10px] text-stone-400 font-bold block">شماره شناسایی قرارداد</span>
                    <span className="text-xs font-black text-stone-800 block mt-1">{selectedContract.number}</span>
                  </div>
                  <div className="p-4 bg-[#faf8f4] rounded-2xl border border-[#ece5d8]">
                    <span className="text-[10px] text-stone-400 font-bold block">نوع الگوی پیمان</span>
                    <span className="text-xs font-black text-stone-800 block mt-1">
                      {getContractTypeLabel(selectedContract.type)}
                    </span>
                  </div>
                  <div className="p-4 bg-[#faf8f4] rounded-2xl border border-[#ece5d8]">
                    <span className="text-[10px] text-stone-400 font-bold block">تاریخ ابلاغ رسمی</span>
                    <span className="text-xs font-black text-stone-800 block mt-1">{selectedContract.issueDate}</span>
                  </div>

                  {/* Row 2 */}
                  <div className="p-4 bg-[#faf8f4] rounded-2xl border border-[#ece5d8]">
                    <span className="text-[10px] text-stone-400 font-bold block">کارفرمای پیمان (Employer)</span>
                    <span className="text-xs font-black text-stone-800 block mt-1">{selectedContract.employer}</span>
                  </div>
                  <div className="p-4 bg-[#faf8f4] rounded-2xl border border-[#ece5d8]">
                    <span className="text-[10px] text-stone-400 font-bold block">پیمانکار اجرایی (Contractor)</span>
                    <span className="text-xs font-black text-stone-800 block mt-1">{selectedContract.contractor}</span>
                  </div>
                  <div className="p-4 bg-[#faf8f4] rounded-2xl border border-[#ece5d8]">
                    <span className="text-[10px] text-stone-400 font-bold block">مشاور نظارت (Consultant)</span>
                    <span className="text-xs font-black text-stone-800 block mt-1">{selectedContract.consultant}</span>
                  </div>

                  {/* Row 3 */}
                  <div className="p-4 bg-[#faf8f4] rounded-2xl border border-[#ece5d8]">
                    <span className="text-[10px] text-stone-400 font-bold block">مدت اولیه زمان قرارداد</span>
                    <span className="text-xs font-black text-stone-800 block mt-1">{selectedContract.duration} روز تقویمی</span>
                  </div>
                  <div className="p-4 bg-[#faf8f4] rounded-2xl border border-[#ece5d8]">
                    <span className="text-[10px] text-stone-400 font-bold block">تاریخ اتمام اولیه تعهد</span>
                    <span className="text-xs font-black text-stone-800 block mt-1">{selectedContract.initialEndDate}</span>
                  </div>
                  <div className="p-4 bg-[#faf8f4] rounded-2xl border border-[#ece5d8]">
                    <span className="text-[10px] text-stone-400 font-bold block">تاریخ اتمام جاری (تمدید شده)</span>
                    <span className="text-xs font-black text-amber-600 block mt-1">{selectedContract.currentEndDate}</span>
                  </div>
                  <div className="p-4 bg-stone-50/40 rounded-2xl border border-blue-100/60">
                    <span className="text-[10px] text-amber-600 font-bold block">مبلغ اولیه کل پیمان</span>
                    <span className="text-xs font-black text-stone-800 block mt-1">{selectedContract.initialAmount.toLocaleString('fa-IR')} {selectedContract.currency}</span>
                  </div>
                  <div className="p-4 bg-emerald-50/40 rounded-2xl border border-emerald-100/60">
                    <span className="text-[10px] text-emerald-600 font-bold block">بودجه مبنای قرارداد</span>
                    <span className="text-xs font-black text-stone-800 block mt-1">{(selectedContract.baseBudgetAmount || 0).toLocaleString('fa-IR')} {selectedContract.currency}</span>
                  </div>
                  <div className="p-4 bg-[#faf8f4] rounded-2xl border border-[#ece5d8]">
                    <span className="text-[10px] text-stone-400 font-bold block">وضعیت مالیات</span>
                    <span className="text-xs font-black text-stone-800 block mt-1">
                      {selectedContract.isTaxExempt ? 'معاف از مالیات' : `مشمول مالیات (${selectedContract.taxPercent}٪)`}
                    </span>
                  </div>
                </div>

                {/* Retentions / Deductions Details */}
                <div className="space-y-4">
                  <h3 className="text-xs font-black text-stone-800 border-r-4 border-amber-600 pr-2">شروط پیش‌پرداخت، حسن کار و کسورات قانونی</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="p-4 border border-[#ece5d8] rounded-2xl">
                      <span className="text-[10px] text-stone-400 font-bold block">پیش‌پرداخت</span>
                      <span className="text-xs font-black text-stone-800 block mt-1">{selectedContract.advancePaymentPercent}٪ معادل {selectedContract.advancePaymentAmount.toLocaleString('fa-IR')} تومان</span>
                    </div>
                    <div className="p-4 border border-[#ece5d8] rounded-2xl">
                      <span className="text-[10px] text-stone-400 font-bold block">نرخ استهلاک پیش‌پرداخت</span>
                      <span className="text-xs font-black text-stone-800 block mt-1">{selectedContract.advanceRetentionPercent}٪ از هر صورت‌وضعیت</span>
                    </div>
                    <div className="p-4 border border-[#ece5d8] rounded-2xl">
                      <span className="text-[10px] text-stone-400 font-bold block">حسن انجام کار (Retainage)</span>
                      <span className="text-xs font-black text-stone-800 block mt-1">{selectedContract.goodPerformanceRetentionPercent}٪ کسری موقت</span>
                    </div>
                    <div className="p-4 border border-[#ece5d8] rounded-2xl">
                      <span className="text-[10px] text-stone-400 font-bold block">بیمه و مالیات پیمان</span>
                      <span className="text-xs font-black text-stone-800 block mt-1">بیمه {selectedContract.insurancePercent}٪ | مالیات {selectedContract.taxPercent}٪</span>
                    </div>
                  </div>
                </div>

                {/* Additional Text Blocks */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border border-[#ece5d8] rounded-2xl space-y-1">
                    <span className="text-[10px] text-stone-400 font-bold block">نحوه پرداخت و دوره‌های تسویه کارکرد</span>
                    <p className="text-xs font-bold text-stone-700 leading-relaxed">{selectedContract.paymentTerms || 'ماهانه بر اساس گواهی پیشرفت فیزیکی CBS'}</p>
                  </div>
                  <div className="p-4 border border-[#ece5d8] rounded-2xl space-y-1">
                    <span className="text-[10px] text-stone-400 font-bold block">شروط و موارد ویژه تعهدی پیمان</span>
                    <p className="text-xs font-bold text-stone-700 leading-relaxed">{selectedContract.specialConditions || 'فاقد شرط ویژه'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* 3.1.5. WBS & BASELINE SCHEDULE (NON-FINANCIAL WORK BREAKDOWN) */}
            {detailSubTab === 'wbs' && (
              <div className="space-y-6 animate-fadeIn">
                {/* WBS Banner */}
                <div className="p-5 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-200 dark:border-amber-800/40 rounded-3xl space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="p-3 bg-amber-500 text-white rounded-2xl shadow-md flex-shrink-0">
                        <FolderKanban size={22} />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-stone-800 dark:text-stone-100">
                          ساختار شکست کار (WBS) و برنامه زمان‌بندی اولیه قرارداد
                        </h4>
                        <p className="text-xs text-stone-600 dark:text-stone-400 font-medium mt-0.5 leading-relaxed">
                          این بخش اختصاصاً جهت مدیریت ساختار شکست کار (بدون اطلاعات مالی) و زمان‌بندی فیزیکی طراحی شده است. تمامی ردیف‌های WBS کاملاً همخوان و ۱به۱ با کدهای CBS مالی پیمان می‌باشند و تغذیه‌کننده مستقیم بخش کنترل و برنامه‌ریزی پروژه هستند.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={handleDownloadWbsExcelTemplate}
                        className="px-4 py-2.5 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 hover:bg-stone-50 text-stone-700 dark:text-stone-200 rounded-2xl text-xs font-black shadow-sm flex items-center gap-2 cursor-pointer transition-all"
                      >
                        <Download size={16} className="text-amber-600" />
                        <span>دانلود قالب اکسل WBS</span>
                      </button>

                      <label className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl text-xs font-black shadow-md flex items-center gap-2 cursor-pointer transition-all">
                        <Upload size={16} />
                        <span>بارگذاری فایل اکسل WBS و زمان‌بندی</span>
                        <input
                          type="file"
                          ref={wbsFileInputRef}
                          onChange={(e) => handleImportWbsExcel(e, selectedContract.id)}
                          accept=".xlsx, .xls"
                          className="hidden"
                        />
                      </label>

                      {selectedContract.cbsMapping && selectedContract.cbsMapping.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setConfirmDialog({
                              isOpen: true,
                              title: 'تأیید حذف و پاکسازی اطلاعات جدول WBS',
                              message: `آیا از حذف کامل اطلاعات جدول ساختار شکست WBS و زمان‌بندی اولیه قرارداد "${selectedContract.title}" اطمینان دارید؟ تمامی ردیف‌ها از جدول قرارداد و تمامی بخش‌های کنترل و برنامه‌ریزی (WBS، نمودار گانت، شاخص‌های EVM و منحنی S) به صورت اتوماتیک پاکسازی خواهند شد.`,
                              confirmText: 'بله، حذف اطلاعات جدول',
                              cancelText: 'انصراف',
                              isDanger: true,
                              onConfirm: () => handleClearWbsData(selectedContract.id)
                            });
                          }}
                          className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-2xl text-xs font-black shadow-sm flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                        >
                          <Trash2 size={16} />
                          <span>حذف اطلاعات جدول WBS</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Search & Sync Status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="relative flex-1 max-w-xs">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                    <input
                      type="text"
                      placeholder="جستجو در ردیف‌های WBS..."
                      value={wbsSearchQuery}
                      onChange={e => setWbsSearchQuery(e.target.value)}
                      className="w-full pr-9 pl-4 py-2 bg-[#faf8f4] dark:bg-stone-800 border border-[#ece5d8] dark:border-stone-700 rounded-xl text-xs font-bold"
                    />
                  </div>

                  <div className="text-xs font-bold text-stone-500 flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-600" />
                    <span>انطباق ۱به۱ ردیف‌های WBS غیرمالی با CBS مالی برقرار است</span>
                  </div>
                </div>

                {/* WBS Table */}
                <div className="border border-[#ece5d8] dark:border-stone-800 rounded-2xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead>
                        <tr className="bg-[#faf8f4] dark:bg-stone-800 text-stone-600 dark:text-stone-300 font-bold border-b border-[#ece5d8] dark:border-stone-700">
                          <th className="p-3 text-center">ردیف</th>
                          <th className="p-3">کد WBS / CBS</th>
                          <th className="p-3">عنوان فعالیت ساختار شکست</th>
                          <th className="p-3 text-center">واحد</th>
                          <th className="p-3 text-center">حجم کل کار</th>
                          <th className="p-3 text-center">وزن فیزیکی (٪)</th>
                          <th className="p-3 text-center">تاریخ شروع اولیه</th>
                          <th className="p-3 text-center">تاریخ پایان اولیه</th>
                          <th className="p-3 text-center">مدت (روز)</th>
                          <th className="p-3 text-center">وضعیت انطباق CBS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#ece5d8] dark:divide-stone-800 font-medium">
                        {selectedContract.cbsMapping
                          .filter(item => 
                            !wbsSearchQuery || 
                            item.cbsCode.includes(wbsSearchQuery) || 
                            (item.description && item.description.includes(wbsSearchQuery))
                          )
                          .map((item, idx) => (
                            <tr key={idx} className="hover:bg-amber-50/30 transition-colors">
                              <td className="p-3 text-center font-bold text-stone-400">{idx + 1}</td>
                              <td className="p-3 font-black text-amber-600 dark:text-amber-400">{item.cbsCode}</td>
                              <td className="p-3 font-bold text-stone-800 dark:text-stone-100">
                                {item.description || `فعالیت ساختاری ${item.cbsCode}`}
                              </td>
                              <td className="p-3 text-center text-stone-600 dark:text-stone-400">{item.unit || 'مقطوع'}</td>
                              <td className="p-3 text-center font-bold text-stone-800 dark:text-stone-200">
                                {item.quantity ? item.quantity.toLocaleString('fa-IR') : '۱'}
                              </td>
                              <td className="p-3 text-center font-black text-emerald-600">
                                {item.weightPercent ? `${item.weightPercent}٪` : '—'}
                              </td>
                              <td className="p-3 text-center font-bold text-stone-600 dark:text-stone-400">
                                {item.baselineStartDate || selectedContract.startDate || '1405/01/01'}
                              </td>
                              <td className="p-3 text-center font-bold text-stone-600 dark:text-stone-400">
                                {item.baselineEndDate || selectedContract.initialEndDate || '1405/12/29'}
                              </td>
                              <td className="p-3 text-center font-bold text-stone-800 dark:text-stone-200">
                                {item.durationDays ? item.durationDays.toLocaleString('fa-IR') : '۳۰'}
                              </td>
                              <td className="p-3 text-center">
                                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-black inline-flex items-center gap-1">
                                  <CheckCircle2 size={12} />
                                  همخوان با CBS
                                </span>
                              </td>
                            </tr>
                          ))}
                        {(!selectedContract.cbsMapping || selectedContract.cbsMapping.length === 0) && (
                          <tr>
                            <td colSpan={10} className="p-8 text-center text-xs font-bold text-stone-400">
                              اطلاعات جدول WBS و زمان‌بندی خالی است. برای افزودن اطلاعات می‌توانید از دکمه «بارگذاری فایل اکسل WBS و زمان‌بندی» استفاده فرمایید.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 3.2. CBS MAPPING */}
            {detailSubTab === 'cbs' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="p-4 bg-[#faf8f4] rounded-2xl border border-[#ece5d8] flex items-center justify-between text-xs font-bold text-stone-700">
                  <span>تخصیص بودجه کلان پیمان به کدهای درختی CBS</span>
                  <span className="text-amber-600 font-black">
                    مجموع تخصیص یافته: {selectedContract.cbsMapping.reduce((sum, item) => sum + item.allocatedAmount, 0).toLocaleString('fa-IR')} تومان از {calculateContractAmounts(selectedContract).currentAmount.toLocaleString('fa-IR')}
                  </span>
                </div>

                {/* EXCEL IMPORT / EXPORT FOR WBS & INITIAL SCHEDULE */}
                <div className="p-5 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-200 dark:border-amber-800/40 rounded-3xl space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="p-3 bg-amber-500 text-white rounded-2xl shadow-md flex-shrink-0">
                        <FileSpreadsheet size={22} />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-stone-800 dark:text-stone-100">
                          واردسازی ساختار شکست (WBS) و برنامه زمان‌بندی اولیه از اکسل
                        </h4>
                        <p className="text-xs text-stone-600 dark:text-stone-400 font-medium mt-0.5 leading-relaxed">
                          با بارگذاری فایل اکسل استاندارد، ردیف‌های WBS، زمان‌بندی اولیه، احجام و اوزان فیزیکی به پیمان اضافه شده و انطباق ۱به۱ WBS و CBS در دفتر فنی و کنترل پروژه برقرار می‌گردد.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={handleDownloadWbsExcelTemplate}
                        className="px-4 py-2.5 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 hover:bg-stone-50 text-stone-700 dark:text-stone-200 rounded-2xl text-xs font-black shadow-sm flex items-center gap-2 cursor-pointer transition-all"
                      >
                        <Download size={16} className="text-amber-600" />
                        <span>دانلود قالب اکسل WBS</span>
                      </button>

                      <label className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl text-xs font-black shadow-md flex items-center gap-2 cursor-pointer transition-all">
                        <Upload size={16} />
                        <span>بارگذاری فایل اکسل WBS و زمان‌بندی</span>
                        <input
                          type="file"
                          ref={wbsFileInputRef}
                          onChange={(e) => handleImportWbsExcel(e, selectedContract.id)}
                          accept=".xlsx, .xls"
                          className="hidden"
                        />
                      </label>

                      {selectedContract.cbsMapping && selectedContract.cbsMapping.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setConfirmDialog({
                              isOpen: true,
                              title: 'تأیید حذف و پاکسازی اطلاعات جدول WBS',
                              message: `آیا از حذف کامل اطلاعات جدول ساختار شکست WBS و زمان‌بندی اولیه قرارداد "${selectedContract.title}" اطمینان دارید؟ تمامی ردیف‌ها از جدول قرارداد و تمامی بخش‌های کنترل و برنامه‌ریزی (WBS، نمودار گانت، شاخص‌های EVM و منحنی S) به صورت اتوماتیک پاکسازی خواهند شد.`,
                              confirmText: 'بله، حذف اطلاعات جدول',
                              cancelText: 'انصراف',
                              isDanger: true,
                              onConfirm: () => handleClearWbsData(selectedContract.id)
                            });
                          }}
                          className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-2xl text-xs font-black shadow-sm flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                        >
                          <Trash2 size={16} />
                          <span>حذف اطلاعات جدول WBS</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {isCbsProject ? (
                  <div className="space-y-4">
                    <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs font-bold text-emerald-800">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <p className="font-extrabold text-stone-800 text-sm">پروژه ساختار شکست یکپارچه (تک‌پیمان CBS)</p>
                          <p className="leading-relaxed text-stone-600 font-medium">
                            این پروژه از نوع ساختار شکست (CBS) و مبتنی بر تک‌پیمان یکپارچه است. تخصیص مبالغ و گره‌ها مستقیماً با تعریف گره‌های CBS در بخش <strong>«مدیریت CBS»</strong> همگام‌سازی شده و ۱۰۰٪ مبلغ پیمان بر اساس این الگو به صورت سیستمی توزیع شده است. تغییر دستی یا ثبت مجزای تخصیص مجاز نمی‌باشد.
                          </p>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handleSyncCbsNodes(selectedContract.id)}
                        className="flex items-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black shadow-lg shadow-emerald-600/10 transition-all duration-200 cursor-pointer self-stretch md:self-auto text-center justify-center whitespace-nowrap"
                      >
                        <RefreshCw size={16} />
                        <span>همگام‌سازی و بروزرسانی با ساختار شکست پروژه</span>
                      </button>
                    </div>

                    {selectedContract.cbsMapping.length === 0 && (
                      <div className="p-5 border border-amber-200 bg-amber-50 rounded-3xl flex flex-col items-center justify-center gap-4 text-center">
                        <AlertTriangle className="text-amber-500" size={32} />
                        <div className="space-y-1">
                          <p className="text-sm font-black text-amber-950">توجه: ساختار شکست این پیمان خالی است!</p>
                          <p className="text-xs text-stone-600 font-bold max-w-md">
                            جهت مقداردهی اولیه و همگام‌سازی جدول بالا با تعریف گره‌ها و مبالغ ساختار شکست (CBS) پروژه، لطفاً دکمه همگام‌سازی بالا را کلیک کنید.
                          </p>
                        </div>
                        <button
                          onClick={() => handleSyncCbsNodes(selectedContract.id)}
                          className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-xl shadow-md cursor-pointer"
                        >
                          شروع همگام‌سازی اولیه CBS
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Allocator Form */
                  <div className="space-y-3">
                    <form onSubmit={handleAddMapping} className="p-4 border border-[#e5ded0]/60 rounded-3xl grid grid-cols-1 md:grid-cols-3 gap-3 items-end bg-[#faf8f4]/40">
                      <div className="space-y-1">
                        <label className="text-[10px] text-stone-500 font-bold pr-2">کد درختی ساختار شکست CBS *</label>
                        {cbsNodes && cbsNodes.length > 0 ? (
                          <select
                            value={mappingForm.cbsCode}
                            onChange={(e) => setMappingForm({ ...mappingForm, cbsCode: e.target.value })}
                            className="w-full px-4 py-2.5 bg-white border border-[#e5ded0] rounded-2xl text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                            required
                          >
                            <option value="">-- انتخاب کد از ساختار شکست پروژه --</option>
                            {cbsNodes.map((node: any) => {
                              const totalAllocatedInOthers = contracts
                                .filter(c => String(c.projectId).trim() === String(selectedProjectId).trim() && c.id !== selectedContractId)
                                .reduce((sum, c) => {
                                  const mapping = c.cbsMapping?.find((m: any) => String(m.cbsCode).trim() === String(node.code).trim());
                                  return sum + (mapping?.allocatedAmount || 0);
                                }, 0);
                              const available = (node.budget || 0) - totalAllocatedInOthers;
                              return (
                                <option key={node.id} value={node.code}>
                                  {node.code} - {node.title} (سقف مبنا: {(node.budget || 0).toLocaleString('fa-IR')} | آزاد: {available.toLocaleString('fa-IR')} تومان)
                                </option>
                              );
                            })}
                          </select>
                        ) : (
                          <input
                            type="text"
                            placeholder="مثال: 01, 01.01, 02"
                            value={mappingForm.cbsCode}
                            onChange={(e) => setMappingForm({ ...mappingForm, cbsCode: e.target.value })}
                            className="w-full px-4 py-2.5 bg-white border border-[#e5ded0] rounded-2xl text-xs font-bold text-stone-800"
                            required
                          />
                        )}
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-stone-500 font-bold pr-2">مبلغ تخصیصی ({activeCurrency}) *</label>
                        <input
                          type="text"
                          placeholder="مبلغ تخصیص یافته..."
                          value={mappingForm.allocatedAmount ? new Intl.NumberFormat('en-US').format(mappingForm.allocatedAmount) : ''}
                          onChange={(e) => {
                            const clean = e.target.value.replace(/,/g, '');
                            const val = clean === '' ? 0 : Number(clean);
                            if (!isNaN(val)) {
                              setMappingForm({ ...mappingForm, allocatedAmount: val });
                            }
                          }}
                          className="w-full px-4 py-2.5 bg-white border border-[#e5ded0] rounded-2xl text-xs font-bold text-stone-800 ltr text-left"
                          required
                        />
                      </div>

                      <button
                        type="submit"
                        className="py-3 bg-amber-600 hover:bg-stone-900 text-white rounded-2xl text-xs font-black shadow-md transition-all cursor-pointer"
                      >
                        ثبت تخصیص بودجه CBS
                      </button>
                    </form>

                    {mappingForm.cbsCode && (
                      (() => {
                        const selectedNode = cbsNodes.find((n: any) => String(n.code).trim() === String(mappingForm.cbsCode).trim());
                        if (!selectedNode) return null;

                        const totalAllocatedInOthers = contracts
                          .filter(c => String(c.projectId).trim() === String(selectedProjectId).trim() && c.id !== selectedContractId)
                          .reduce((sum, c) => {
                            const mapping = c.cbsMapping?.find((m: any) => String(m.cbsCode).trim() === String(selectedNode.code).trim());
                            return sum + (mapping?.allocatedAmount || 0);
                          }, 0);

                        const existingMapping = selectedContract.cbsMapping.find(item => item.cbsCode.trim() === mappingForm.cbsCode.trim());
                        const currentAllocation = existingMapping ? existingMapping.allocatedAmount : 0;
                        const baselineBudget = selectedNode.budget || 0;
                        const freeAllocationLimit = baselineBudget - totalAllocatedInOthers;
                        const isOverLimit = (totalAllocatedInOthers + Number(mappingForm.allocatedAmount || 0)) > baselineBudget;

                        return (
                          <div className={`p-4 rounded-3xl border text-xs font-bold space-y-3 transition-all ${isOverLimit ? 'bg-rose-50/70 border-rose-200 text-rose-950' : 'bg-stone-50/50 border-blue-100 text-stone-700'}`}>
                            <div className="flex items-center justify-between border-b pb-2 border-[#ece5d8]/50">
                              <span className="font-extrabold text-stone-800">📊 کنترل سقف تخصیص بودجه مبنا (بسته کاری {selectedNode.code})</span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] ${isOverLimit ? 'bg-rose-100 text-rose-700 font-extrabold' : 'bg-emerald-100 text-emerald-700'}`}>
                                {isOverLimit ? '⚠️ تجاوز از سقف مجاز' : '✅ در محدوده مجاز بودجه'}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-[11px]">
                              <div className="space-y-1">
                                <span className="text-stone-400 block font-bold">۱. بودجه مصوب مبنای فعالیت:</span>
                                <span className="font-black text-stone-800">{baselineBudget.toLocaleString('fa-IR')} تومان</span>
                              </div>
                              <div className="space-y-1">
                                <span className="text-stone-400 block font-bold">۲. تخصیص‌یافته در سایر پیمان‌ها:</span>
                                <span className="font-black text-stone-700">{totalAllocatedInOthers.toLocaleString('fa-IR')} تومان</span>
                              </div>
                              <div className="space-y-1">
                                <span className="text-stone-400 block font-bold">۳. سقف آزاد باقیمانده:</span>
                                <span className={`font-black ${freeAllocationLimit < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{freeAllocationLimit.toLocaleString('fa-IR')} تومان</span>
                              </div>
                              <div className="space-y-1">
                                <span className="text-stone-400 block font-bold">۴. مبلغ تخصیص پیشنهادی جدید:</span>
                                <span className={`font-black ${isOverLimit ? 'text-rose-600' : 'text-amber-600'}`}>{(mappingForm.allocatedAmount || 0).toLocaleString('fa-IR')} تومان</span>
                              </div>
                            </div>
                            {isOverLimit && (
                              <p className="text-[10px] text-rose-600 font-extrabold mt-1 leading-relaxed">
                                ⚠️ خطا: مبلغ وارد شده به میزان {((totalAllocatedInOthers + Number(mappingForm.allocatedAmount || 0)) - baselineBudget).toLocaleString('fa-IR')} تومان بیشتر از سقف مصوب بودجه مبنا برای این کد CBS است!
                              </p>
                            )}
                          </div>
                        );
                      })()
                    )}
                  </div>
                )}

                {/* Mapping Items list */}
                <div className="border border-[#ece5d8] rounded-3xl overflow-hidden shadow-sm">
                  <table className="w-full text-right border-collapse">
                    <thead>
                      <tr className="bg-[#faf8f4] border-b border-[#ece5d8]">
                        <th className="p-3 text-xs font-black text-stone-500">کد CBS</th>
                        <th className="p-3 text-xs font-black text-stone-500">مبلغ تخصیص یافته ({activeCurrency})</th>
                        <th className="p-3 text-xs font-black text-stone-500">سهم وزنی از کل پیمان (٪)</th>
                        <th className="p-3 text-xs font-black text-stone-500 text-center">حذف</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-50">
                      {selectedContract.cbsMapping.map(item => (
                        <tr key={item.cbsCode} className="hover:bg-[#faf8f4]/50 transition-all text-xs font-bold">
                          <td className="p-3 font-black text-amber-600">{item.cbsCode}</td>
                          <td className="p-3 text-stone-700">{item.allocatedAmount.toLocaleString('fa-IR')} تومان</td>
                          <td className="p-3 text-emerald-600">{item.weightPercent}٪</td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => {
                                setConfirmDialog({
                                  isOpen: true,
                                  title: 'تأیید حذف ردیف CBS',
                                  message: `آیا از حذف تخصیص کد ${item.cbsCode} از قرارداد اطمینان دارید؟ بخش دفتر فنی نیز به‌روزرسانی خواهد شد.`,
                                  confirmText: 'بله، حذف',
                                  cancelText: 'انصراف',
                                  isDanger: true,
                                  onConfirm: () => {
                                    handleRemoveMapping(item.cbsCode);
                                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                                  }
                                });
                              }}
                              className="text-rose-600 hover:text-rose-800 p-1 cursor-pointer transition-colors"
                              title="حذف ردیف ساختار شکست هزینه"
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {selectedContract.cbsMapping.length === 0 && (
                        <tr>
                          <td colSpan={4} className="p-6 text-center text-xs text-stone-400">
                            هنوز هیچ مبلغی به کدهای ساختار شکست CBS تخصیص نیافته است.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {selectedContract.cbsMapping && selectedContract.cbsMapping.length > 0 && (
                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmDialog({
                          isOpen: true,
                          title: 'تأیید حذف کامل ساختار شکست CBS',
                          message: `آیا از حذف کامل اطلاعات ساختار شکست هزینه (CBS) و WBS قرارداد "${selectedContract.title}" اطمینان دارید؟ تمامی ردیف‌ها پاک شده و بخش دفتر فنی و کنترل و برنامه‌ریزی به‌روزرسانی خواهند شد.`,
                          confirmText: 'بله، حذف اطلاعات جدول CBS',
                          cancelText: 'انصراف',
                          isDanger: true,
                          onConfirm: () => handleClearWbsData(selectedContract.id)
                        });
                      }}
                      className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-2xl text-xs font-black shadow-sm flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                    >
                      <Trash2 size={16} />
                      <span>حذف اطلاعات جدول ساختار شکست هزینه (CBS)</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 3.3. AMENDMENTS & REVISIONS */}
            {detailSubTab === 'revisions' && (
              <div className="space-y-4 animate-fadeIn">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-black text-stone-800">تاریخچه ابلاغ الحاقیه‌ها، تمدید مدت و تغییر احجام</h3>
                  <button
                    onClick={() => setIsAddRevisionOpen(!isAddRevisionOpen)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-stone-50 hover:bg-blue-100 text-amber-600 rounded-xl text-xs font-black transition-all"
                  >
                    <Plus size={14} />
                    <span>ثبت سند الحاقیه جدید</span>
                  </button>
                </div>

                {isAddRevisionOpen && (
                  <form onSubmit={handleAddRevision} className="p-5 border border-[#e5ded0]/60 rounded-[2rem] bg-[#faf8f4]/40 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div className="space-y-1">
                      <label className="text-[10px] text-stone-500 font-bold pr-2">عنوان الحاقیه / سند اصلاحی *</label>
                      <input
                        type="text"
                        placeholder="مثال: الحاقیه شماره ۲"
                        value={newRevisionForm.version}
                        onChange={(e) => setNewRevisionForm({ ...newRevisionForm, version: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-[#e5ded0] rounded-xl text-xs font-bold text-stone-800"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-stone-500 font-bold pr-2">نوع سند *</label>
                      <select
                        value={newRevisionForm.type}
                        onChange={(e) => setNewRevisionForm({ ...newRevisionForm, type: e.target.value as any })}
                        className="w-full px-3 py-2 bg-white border border-[#e5ded0] rounded-xl text-xs font-bold text-stone-800"
                      >
                        <option value="AMENDMENT">الحاقیه تغییر احجام و مبالغ</option>
                        <option value="TIME_EXTENSION">تمدید مدت پیمان</option>
                        <option value="PRICE_ADJUSTMENT">تعدیل آحاد بها</option>
                        <option value="SCOPE_CHANGE">تغییر اسکوپ و نقشه</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-stone-500 font-bold pr-2">تاریخ ابلاغ کارفرما</label>
                      <ShamsiDatePicker
                        placeholder="مثال: 1403/12/20"
                        value={newRevisionForm.approvedDate}
                        onChange={(val) => setNewRevisionForm({ ...newRevisionForm, approvedDate: val })}
                        inputClassName="!px-3 !py-2 !bg-white !border-[#e5ded0] !rounded-xl !text-xs !font-bold !text-stone-800"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-stone-500 font-bold pr-2">تغییرات مبلغ پیمان ({activeCurrency} - منفی/مثبت) *</label>
                      <input
                        type="text"
                        placeholder="مثال: ۱,۲۰۰,۰۰۰,۰۰۰"
                        value={newRevisionForm.amountDifference ? new Intl.NumberFormat('en-US').format(newRevisionForm.amountDifference) : ''}
                        onChange={(e) => {
                          const clean = e.target.value.replace(/,/g, '');
                          const isNegative = clean.startsWith('-');
                          const digitsOnly = clean.replace(/-/g, '');
                          const val = digitsOnly === '' ? 0 : Number(digitsOnly);
                          if (!isNaN(val)) {
                            setNewRevisionForm({ ...newRevisionForm, amountDifference: isNegative ? -val : val });
                          }
                        }}
                        className="w-full px-3 py-2 bg-white border border-[#e5ded0] rounded-xl text-xs font-bold text-stone-800 ltr text-left"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-stone-500 font-bold pr-2">تمدید زمان تعهد (روز تقویمی) *</label>
                      <input
                        type="number"
                        placeholder="مثال: 45"
                        value={newRevisionForm.durationDifference || ''}
                        onChange={(e) => setNewRevisionForm({ ...newRevisionForm, durationDifference: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-white border border-[#e5ded0] rounded-xl text-xs font-bold text-stone-800"
                        required
                      />
                    </div>

                    <div className="md:col-span-3 space-y-1">
                      <label className="text-[10px] text-stone-500 font-bold pr-2">شرح تفصیلی تغییرات موضوع ابلاغ</label>
                      <textarea
                        rows={2}
                        placeholder="علل ابلاغ الحاقیه و اصلاحات مربوطه..."
                        value={newRevisionForm.changesDescription}
                        onChange={(e) => setNewRevisionForm({ ...newRevisionForm, changesDescription: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-[#e5ded0] rounded-xl text-xs font-bold text-stone-800 focus:outline-none resize-none"
                      />
                    </div>

                    <div className="md:col-span-3 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setIsAddRevisionOpen(false)}
                        className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold"
                      >
                        انصراف
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 bg-amber-600 hover:bg-stone-900 text-white rounded-xl text-xs font-black shadow-md cursor-pointer"
                      >
                        ثبت و اعمال الحاقیه
                      </button>
                    </div>
                  </form>
                )}

                {/* Editing Revision Form */}
                {editingRevision && (
                  <form onSubmit={handleSaveEditRevision} className="p-5 border border-amber-200 rounded-[2rem] bg-amber-50/30 grid grid-cols-1 md:grid-cols-3 gap-4 items-end mb-4 animate-fadeIn">
                    <div className="md:col-span-3 text-xs font-black text-amber-800 border-b border-amber-200/60 pb-2 mb-1 flex justify-between items-center">
                      <span>✏️ ویرایش اطلاعات الحاقیه / ابلاغیه</span>
                      <button type="button" onClick={() => setEditingRevision(null)} className="text-stone-400 hover:text-stone-700">✕</button>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-stone-500 font-bold pr-2">عنوان الحاقیه / سند اصلاحی *</label>
                      <input
                        type="text"
                        value={editingRevision.version}
                        onChange={(e) => setEditingRevision({ ...editingRevision, version: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-[#e5ded0] rounded-xl text-xs font-bold text-stone-800"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-stone-500 font-bold pr-2">نوع سند *</label>
                      <select
                        value={editingRevision.type}
                        onChange={(e) => setEditingRevision({ ...editingRevision, type: e.target.value as any })}
                        className="w-full px-3 py-2 bg-white border border-[#e5ded0] rounded-xl text-xs font-bold text-stone-800"
                      >
                        <option value="AMENDMENT">الحاقیه تغییر احجام و مبالغ</option>
                        <option value="TIME_EXTENSION">تمدید مدت پیمان</option>
                        <option value="PRICE_ADJUSTMENT">تعدیل آحاد بها</option>
                        <option value="SCOPE_CHANGE">تغییر اسکوپ و نقشه</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-stone-500 font-bold pr-2">تاریخ ابلاغ کارفرما</label>
                      <ShamsiDatePicker
                        value={editingRevision.approvedDate || ''}
                        onChange={(val) => setEditingRevision({ ...editingRevision, approvedDate: val })}
                        inputClassName="!px-3 !py-2 !bg-white !border-[#e5ded0] !rounded-xl !text-xs !font-bold !text-stone-800"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-stone-500 font-bold pr-2">تغییرات مبلغ پیمان ({activeCurrency}) *</label>
                      <input
                        type="text"
                        value={editingRevision.amountDifference ? new Intl.NumberFormat('en-US').format(editingRevision.amountDifference) : ''}
                        onChange={(e) => {
                          const clean = e.target.value.replace(/,/g, '');
                          const isNegative = clean.startsWith('-');
                          const digitsOnly = clean.replace(/-/g, '');
                          const val = digitsOnly === '' ? 0 : Number(digitsOnly);
                          if (!isNaN(val)) {
                            setEditingRevision({ ...editingRevision, amountDifference: isNegative ? -val : val });
                          }
                        }}
                        className="w-full px-3 py-2 bg-white border border-[#e5ded0] rounded-xl text-xs font-bold text-stone-800 ltr text-left"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-stone-500 font-bold pr-2">تمدید زمان تعهد (روز) *</label>
                      <input
                        type="number"
                        value={editingRevision.durationDifference || 0}
                        onChange={(e) => setEditingRevision({ ...editingRevision, durationDifference: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-white border border-[#e5ded0] rounded-xl text-xs font-bold text-stone-800"
                        required
                      />
                    </div>
                    <div className="md:col-span-3 space-y-1">
                      <label className="text-[10px] text-stone-500 font-bold pr-2">شرح تفصیلی تغییرات موضوع ابلاغ</label>
                      <textarea
                        rows={2}
                        value={editingRevision.changesDescription || ''}
                        onChange={(e) => setEditingRevision({ ...editingRevision, changesDescription: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-[#e5ded0] rounded-xl text-xs font-bold text-stone-800 focus:outline-none resize-none"
                      />
                    </div>
                    <div className="md:col-span-3 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingRevision(null)}
                        className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold"
                      >
                        انصراف
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black shadow-md cursor-pointer"
                      >
                        ذخیره تغییرات الحاقیه
                      </button>
                    </div>
                  </form>
                )}

                {/* Revisions timeline list */}
                <div className="space-y-3">
                  {selectedContract.revisions.map(rev => (
                    <div key={rev.id} className="p-4 border border-[#ece5d8] rounded-2xl bg-white shadow-sm hover:border-blue-200 transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-600"></span>
                          <span className="font-black text-xs text-stone-800">{rev.version}</span>
                          <span className="px-2 py-0.5 bg-stone-100 text-stone-600 text-[9px] font-black rounded-full">
                            {rev.type === 'AMENDMENT' ? 'تغییر احجام و مبلغ' : rev.type === 'TIME_EXTENSION' ? 'تمدید زمان' : rev.type === 'PRICE_ADJUSTMENT' ? 'تعدیل آحاد بها' : 'تغییر مشخصات'}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-600 font-bold leading-relaxed">{rev.changesDescription}</p>
                        <span className="text-[9px] text-stone-400 font-bold block">تاریخ ابلاغ رسمی: {rev.approvedDate || 'ثبت شده'}</span>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="flex gap-4 text-left font-black text-xs">
                          <div>
                            <span className="text-[10px] text-stone-400 font-bold block">تاثیر مالی:</span>
                            <span className={rev.amountDifference >= 0 ? 'text-amber-600' : 'text-rose-600'}>
                              {rev.amountDifference > 0 ? '+' : ''}{rev.amountDifference.toLocaleString('fa-IR')} تومان
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-stone-400 font-bold block">تمدید زمان:</span>
                            <span className="text-amber-600">{rev.durationDifference} روز</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 border-r border-stone-200 pr-3 mr-2">
                          <button
                            type="button"
                            onClick={() => setEditingRevision(rev)}
                            className="p-2 text-stone-500 hover:text-amber-600 hover:bg-stone-100 rounded-xl transition-all"
                            title="ویرایش الحاقیه"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRevision(rev.id)}
                            className="p-2 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                            title="حذف الحاقیه"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {selectedContract.revisions.length === 0 && (
                    <div className="p-8 text-center text-xs text-stone-400 font-bold">
                      تاکنون هیچ الحاقیه یا سند تمدید رسمی برای این پیمان ابلاغ نشده است.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 3.4. WARRANTIES & GUARANTEES */}
            {detailSubTab === 'warranties' && (
              <div className="space-y-4 animate-fadeIn">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-black text-stone-800">مدیریت ضمانت‌نامه‌های تسلیمی (تضمین انجام تعهدات و پیش‌پرداخت)</h3>
                  <button
                    onClick={() => setIsAddWarrantyOpen(!isAddWarrantyOpen)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-amber-600 text-white hover:bg-amber-700 rounded-xl text-xs font-black transition-all shadow-sm"
                  >
                    <Plus size={14} />
                    <span>ثبت ضمانت‌نامه جدید</span>
                  </button>
                </div>

                {isAddWarrantyOpen && (
                  <form onSubmit={handleAddWarranty} className="p-5 border border-[#e5ded0]/60 rounded-[2rem] bg-[#faf8f4]/40 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div className="space-y-1">
                      <label className="text-[10px] text-stone-500 font-bold pr-2">نوع ضمانت‌نامه *</label>
                      <select
                        value={newWarrantyForm.type}
                        onChange={(e) => setNewWarrantyForm({ ...newWarrantyForm, type: e.target.value as any })}
                        className="w-full px-3 py-2 bg-white border border-[#e5ded0] rounded-xl text-xs font-bold text-stone-800"
                      >
                        <option value="PERFORMANCE_BOND">ضمانت حسن انجام تعهدات بانکی</option>
                        <option value="ADVANCE_PAYMENT">ضمانت‌نامه پیش‌پرداخت</option>
                        <option value="BID_BOND">شرکت در مناقصه</option>
                        <option value="RETAINAGE">حسن انجام کار آزاد شده</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-stone-500 font-bold pr-2">بانک صادرکننده *</label>
                      <input
                        type="text"
                        placeholder="مثال: بانک ملی - شعبه مرکزی"
                        value={newWarrantyForm.issuerBank}
                        onChange={(e) => setNewWarrantyForm({ ...newWarrantyForm, issuerBank: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-[#e5ded0] rounded-xl text-xs font-bold text-stone-800"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-stone-500 font-bold pr-2">شماره ضمانت‌نامه بانکی *</label>
                      <input
                        type="text"
                        placeholder="مثال: BG-1403-998"
                        value={newWarrantyForm.referenceNumber}
                        onChange={(e) => setNewWarrantyForm({ ...newWarrantyForm, referenceNumber: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-[#e5ded0] rounded-xl text-xs font-bold text-stone-800"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-stone-500 font-bold pr-2">مبلغ ضمانت‌نامه ({activeCurrency}) *</label>
                      <input
                        type="text"
                        placeholder="مثال: ۵۰۰,۰۰۰,۰۰۰"
                        value={newWarrantyForm.amount ? new Intl.NumberFormat('en-US').format(newWarrantyForm.amount) : ''}
                        onChange={(e) => {
                          const clean = e.target.value.replace(/,/g, '');
                          const val = clean === '' ? 0 : Number(clean);
                          if (!isNaN(val)) {
                            setNewWarrantyForm({ ...newWarrantyForm, amount: val });
                          }
                        }}
                        className="w-full px-3 py-2 bg-white border border-[#e5ded0] rounded-xl text-xs font-bold text-stone-800 ltr text-left"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-stone-500 font-bold pr-2">تاریخ صدور</label>
                      <ShamsiDatePicker
                        placeholder="مثال: 1403/01/15"
                        value={newWarrantyForm.issueDate}
                        onChange={(val) => setNewWarrantyForm({ ...newWarrantyForm, issueDate: val })}
                        inputClassName="!px-3 !py-2 !bg-white !border-[#e5ded0] !rounded-xl !text-xs !font-bold !text-stone-800"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-stone-500 font-bold pr-2">تاریخ سررسید / انقضا</label>
                      <ShamsiDatePicker
                        placeholder="مثال: 1404/10/15"
                        value={newWarrantyForm.expiryDate}
                        onChange={(val) => setNewWarrantyForm({ ...newWarrantyForm, expiryDate: val })}
                        inputClassName="!px-3 !py-2 !bg-white !border-[#e5ded0] !rounded-xl !text-xs !font-bold !text-stone-800"
                      />
                    </div>

                    <div className="md:col-span-3 space-y-1">
                      <label className="text-[10px] text-stone-500 font-bold pr-2">توضیحات و ذینفعان ضمانت</label>
                      <textarea
                        rows={2}
                        placeholder="توضیحات ضمانت‌نامه یا شرایط تسویه و ابطال..."
                        value={newWarrantyForm.description}
                        onChange={(e) => setNewWarrantyForm({ ...newWarrantyForm, description: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-[#e5ded0] rounded-xl text-xs font-bold text-stone-800 focus:outline-none resize-none"
                      />
                    </div>

                    <div className="md:col-span-3 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setIsAddWarrantyOpen(false)}
                        className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold"
                      >
                        انصراف
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 bg-amber-600 hover:bg-stone-900 text-white rounded-xl text-xs font-black shadow-md cursor-pointer"
                      >
                        ثبت ضمانت‌نامه
                      </button>
                    </div>
                  </form>
                )}

                {/* Editing Warranty Form */}
                {editingWarranty && (
                  <form onSubmit={handleSaveEditWarranty} className="p-5 border border-amber-200 rounded-[2rem] bg-amber-50/30 grid grid-cols-1 md:grid-cols-3 gap-4 items-end mb-4 animate-fadeIn">
                    <div className="md:col-span-3 text-xs font-black text-amber-800 border-b border-amber-200/60 pb-2 mb-1 flex justify-between items-center">
                      <span>✏️ ویرایش اطلاعات ضمانت‌نامه</span>
                      <button type="button" onClick={() => setEditingWarranty(null)} className="text-stone-400 hover:text-stone-700">✕</button>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-stone-500 font-bold pr-2">نوع ضمانت‌نامه *</label>
                      <select
                        value={editingWarranty.type}
                        onChange={(e) => setEditingWarranty({ ...editingWarranty, type: e.target.value as any })}
                        className="w-full px-3 py-2 bg-white border border-[#e5ded0] rounded-xl text-xs font-bold text-stone-800"
                      >
                        <option value="PERFORMANCE_BOND">حسن انجام تعهدات</option>
                        <option value="ADVANCE_PAYMENT">پیش‌پرداخت</option>
                        <option value="BID_BOND">شرکت در مناقصه</option>
                        <option value="RETAINAGE">کسورات وجه‌الضمان</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-stone-500 font-bold pr-2">بانک صادرکننده *</label>
                      <input
                        type="text"
                        value={editingWarranty.issuerBank}
                        onChange={(e) => setEditingWarranty({ ...editingWarranty, issuerBank: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-[#e5ded0] rounded-xl text-xs font-bold text-stone-800"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-stone-500 font-bold pr-2">شماره ضمانت‌نامه *</label>
                      <input
                        type="text"
                        value={editingWarranty.referenceNumber}
                        onChange={(e) => setEditingWarranty({ ...editingWarranty, referenceNumber: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-[#e5ded0] rounded-xl text-xs font-bold text-stone-800"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-stone-500 font-bold pr-2">مبلغ ضمانت‌نامه ({activeCurrency}) *</label>
                      <input
                        type="text"
                        value={editingWarranty.amount ? new Intl.NumberFormat('en-US').format(editingWarranty.amount) : ''}
                        onChange={(e) => {
                          const clean = e.target.value.replace(/,/g, '');
                          const val = clean === '' ? 0 : Number(clean);
                          if (!isNaN(val)) {
                            setEditingWarranty({ ...editingWarranty, amount: val });
                          }
                        }}
                        className="w-full px-3 py-2 bg-white border border-[#e5ded0] rounded-xl text-xs font-bold text-stone-800 ltr text-left"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-stone-500 font-bold pr-2">تاریخ صدور</label>
                      <ShamsiDatePicker
                        value={editingWarranty.issueDate}
                        onChange={(val) => setEditingWarranty({ ...editingWarranty, issueDate: val })}
                        inputClassName="!px-3 !py-2 !bg-white !border-[#e5ded0] !rounded-xl !text-xs !font-bold !text-stone-800"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-stone-500 font-bold pr-2">تاریخ انقضا</label>
                      <ShamsiDatePicker
                        value={editingWarranty.expiryDate}
                        onChange={(val) => setEditingWarranty({ ...editingWarranty, expiryDate: val })}
                        inputClassName="!px-3 !py-2 !bg-white !border-[#e5ded0] !rounded-xl !text-xs !font-bold !text-stone-800"
                      />
                    </div>
                    <div className="md:col-span-3 space-y-1">
                      <label className="text-[10px] text-stone-500 font-bold pr-2">توضیحات ضمانت‌نامه</label>
                      <textarea
                        rows={2}
                        value={editingWarranty.description || ''}
                        onChange={(e) => setEditingWarranty({ ...editingWarranty, description: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-[#e5ded0] rounded-xl text-xs font-bold text-stone-800 focus:outline-none resize-none"
                      />
                    </div>
                    <div className="md:col-span-3 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingWarranty(null)}
                        className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold"
                      >
                        انصراف
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black shadow-md cursor-pointer"
                      >
                        ذخیره تغییرات ضمانت‌نامه
                      </button>
                    </div>
                  </form>
                )}

                {/* Warranties Full Comprehensive Table */}
                <div className="bg-white border border-[#ece5d8] rounded-3xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-[#faf8f4] border-b border-[#ece5d8] text-stone-600 font-black text-[11px]">
                        <tr>
                          <th className="p-3">نوع ضمانت‌نامه</th>
                          <th className="p-3">شماره مرجع / سند</th>
                          <th className="p-3">صادرکننده (بانک/موسسه)</th>
                          <th className="p-3">مبلغ ضمانت‌نامه</th>
                          <th className="p-3 text-center">تاریخ صدور</th>
                          <th className="p-3 text-center">تاریخ سررسید/انقضا</th>
                          <th className="p-3">توضیحات و ذینفعان</th>
                          <th className="p-3 text-center">وضعیت</th>
                          <th className="p-3 text-center w-28">عملیات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#f2ebd9] font-bold">
                        {selectedContract.warranties.map(w => (
                          <tr key={w.id} className="hover:bg-[#faf8f4]/60 transition-colors">
                            <td className="p-3 text-stone-900 font-black">
                              {w.type === 'PERFORMANCE_BOND' ? 'حسن انجام تعهدات' :
                               w.type === 'ADVANCE_PAYMENT' ? 'پیش‌پرداخت' :
                               w.type === 'BID_BOND' ? 'شرکت در مناقصه' :
                               w.type === 'RETAINAGE' ? 'کسورات وجه‌الضمان' : w.type}
                            </td>
                            <td className="p-3 font-mono text-stone-700">{w.referenceNumber}</td>
                            <td className="p-3 text-stone-600">{w.issuerBank}</td>
                            <td className="p-3 text-amber-600 font-black whitespace-nowrap">
                              {w.amount.toLocaleString('fa-IR')} تومان
                            </td>
                            <td className="p-3 text-center text-stone-500 font-mono text-[11px]">{w.issueDate}</td>
                            <td className="p-3 text-center text-stone-500 font-mono text-[11px]">{w.expiryDate}</td>
                            <td className="p-3 text-stone-500 text-[10px] max-w-xs truncate">{w.description || '-'}</td>
                            <td className="p-3 text-center whitespace-nowrap">
                              <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black ${
                                w.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-stone-100 text-stone-500'
                              }`}>
                                {w.status === 'ACTIVE' ? 'معتبر و فعال' : 'آزاد شده / ابطال'}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => setEditingWarranty(w)}
                                  className="p-1.5 text-stone-500 hover:text-amber-600 hover:bg-stone-100 rounded-lg transition-colors"
                                  title="ویرایش کامل ضمانت‌نامه"
                                >
                                  <Edit2 size={14} />
                                </button>
                                {w.status === 'ACTIVE' && (
                                  <button
                                    type="button"
                                    onClick={() => handleToggleWarrantyStatus(w.id, 'RELEASED')}
                                    className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                    title="آزادسازی / ابطال سند"
                                  >
                                    <FileCheck size={14} />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteWarranty(w.id)}
                                  className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                  title="حذف ضمانت‌نامه"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {selectedContract.warranties.length === 0 && (
                          <tr>
                            <td colSpan={9} className="p-8 text-center text-stone-400 italic font-bold">
                              هیچ سند ضمانتی یا تعهدی بانکی برای این قرارداد ثبت نشده است.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 3.5. ATTACHMENTS & DOCUMENT CONTROL */}
            {detailSubTab === 'docs' && (
              <div className="space-y-6 animate-fadeIn">
                <input
                  type="file"
                  ref={docFileInputRef}
                  onChange={handleDocFileUpload}
                  multiple
                  className="hidden"
                />
                <div
                  onClick={() => docFileInputRef.current?.click()}
                  className="p-8 border-2 border-dashed border-[#e5ded0] hover:border-amber-500 rounded-3xl bg-[#faf8f4]/50 flex flex-col items-center justify-center text-center cursor-pointer group transition-all"
                >
                  <div className="w-14 h-14 bg-white rounded-2xl border border-[#ece5d8] shadow-sm flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform mb-3">
                    <Paperclip size={24} />
                  </div>
                  <span className="text-xs font-black text-stone-800">افزودن اسناد منضم، الحاقیه یا ضمانت‌نامه قرارداد (عملیاتی)</span>
                  <span className="text-[10px] text-stone-500 font-bold mt-1">جهت انتخاب و پیوست واقعی فایل‌های پروژه کلیک کنید</span>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xs font-black text-stone-800">اسناد ثبت شده قرارداد:</h3>
                  <div className="space-y-2">
                    {selectedContract.attachments.map(att => (
                      <div key={att.id} className="p-3 bg-[#faf8f4] rounded-2xl border border-[#ece5d8] hover:border-blue-100 transition-all flex justify-between items-center text-xs font-bold">
                        <div className="flex items-center gap-3">
                          <span className="p-2 bg-stone-50 text-amber-600 rounded-xl flex items-center justify-center">
                            <FileText size={16} />
                          </span>
                          <div>
                            <span className="text-stone-800 font-black block">{att.name}</span>
                            <span className="text-[10px] text-stone-400 font-bold">نوع: {att.type} | تاریخ بارگذاری: {att.date}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-stone-400 font-bold">{att.size}</span>
                          {att.url && (
                            <a
                              href={att.url}
                              download={att.name}
                              className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                              title="دانلود فایل"
                            >
                              <Download size={14} />
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteAttachment(att.id)}
                            className="p-2 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="حذف پیوست"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {selectedContract.attachments.length === 0 && (
                      <p className="text-center text-xs text-stone-400 italic py-6">هیچ فایلی ضمیمه نشده است.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 3.6. INTERNAL NOTES */}
            {detailSubTab === 'notes' && (
              <div className="space-y-6 animate-fadeIn">
                <form onSubmit={handleAddNote} className="space-y-3">
                  <textarea
                    rows={3}
                    placeholder="ثبت توضیحات، مکاتبات داخلی و یادداشت‌های مدیریتی قرارداد..."
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    className="w-full p-4 bg-[#faf8f4] border border-[#ece5d8] rounded-3xl text-xs font-bold text-stone-800 focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:bg-white resize-none transition-all"
                    required
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="px-5 py-2 bg-amber-600 hover:bg-stone-900 text-white rounded-2xl text-xs font-black shadow-md cursor-pointer"
                    >
                      ثبت یادداشت داخلی
                    </button>
                  </div>
                </form>

                <div className="space-y-3">
                  {selectedContract.notes.map(note => (
                    <div key={note.id} className="p-4 bg-[#faf8f4] border border-[#ece5d8] rounded-2xl space-y-2 text-xs">
                      <div className="flex justify-between items-center text-[10px] text-stone-400 font-bold">
                        <span>نویسنده: {note.author}</span>
                        <span>{note.date}</span>
                      </div>
                      <p className="text-stone-700 font-bold leading-relaxed">{note.text}</p>
                    </div>
                  ))}
                  {selectedContract.notes.length === 0 && (
                    <p className="text-center text-xs text-stone-400 font-bold py-6">هیچ یادداشت یا توضیح داخلی برای این قرارداد ثبت نشده است.</p>
                  )}
                </div>
              </div>
            )}

            {/* 3.7. AUDIT TRAIL / LOGS */}
            {detailSubTab === 'audit' && (
              <div className="space-y-4 animate-fadeIn">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 bg-[#faf8f4] p-4 rounded-2xl border border-[#ece5d8]">
                  <h3 className="text-xs font-black text-stone-800">تاریخچه تغییرات سیستمی (Audit Trail)</h3>
                  
                  <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                    {/* User filter dropdown */}
                    <div className="relative">
                      <select
                        value={auditUserFilter}
                        onChange={e => setAuditUserFilter(e.target.value)}
                        className="p-2 pr-3 bg-white border border-[#ece5d8] rounded-xl text-xs font-bold text-stone-700"
                      >
                        <option value="ALL">همه کاربران</option>
                        {Array.from(new Set(selectedContract.auditLogs.map(l => l.user))).map(usr => (
                          <option key={usr} value={usr}>{usr}</option>
                        ))}
                      </select>
                    </div>

                    {/* Search query box */}
                    <div className="relative flex-1 md:w-64">
                      <input
                        type="text"
                        placeholder="جستجوی نام کاربر یا عنوان رویداد..."
                        value={auditSearchQuery}
                        onChange={e => setAuditSearchQuery(e.target.value)}
                        className="w-full p-2 pr-8 bg-white border border-[#ece5d8] rounded-xl text-xs font-bold text-stone-700"
                      />
                      <Search size={14} className="absolute right-2.5 top-2.5 text-stone-400" />
                    </div>
                  </div>
                </div>

                <div className="border border-[#ece5d8] rounded-3xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-right border-collapse text-xs font-bold">
                      <thead>
                        <tr className="bg-[#faf8f4] border-b border-[#ece5d8] text-[10px] text-stone-400">
                          <th className="p-3">کاربر انجام دهنده</th>
                          <th className="p-3">نوع تغییر / رویداد</th>
                          <th className="p-3">جزئیات تغییرات و عملیات</th>
                          <th className="p-3">تاریخ و زمان دقیق</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-50 text-stone-700">
                        {selectedContract.auditLogs
                          .filter(log => {
                            const matchesUser = auditUserFilter === 'ALL' || log.user === auditUserFilter;
                            const matchesSearch = auditSearchQuery === '' || 
                              log.user.toLowerCase().includes(auditSearchQuery.toLowerCase()) ||
                              log.action.toLowerCase().includes(auditSearchQuery.toLowerCase()) ||
                              log.details.toLowerCase().includes(auditSearchQuery.toLowerCase());
                            return matchesUser && matchesSearch;
                          })
                          .map(log => (
                            <tr key={log.id} className="hover:bg-[#faf8f4]/50">
                              <td className="p-3 font-black text-amber-700">{log.user}</td>
                              <td className="p-3">
                                <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-100 rounded-md text-[9px] font-black">
                                  {log.action}
                                </span>
                              </td>
                              <td className="p-3 text-[11px] font-bold text-stone-600">{log.details}</td>
                              <td className="p-3 text-stone-400 text-[10px] font-mono">{log.date}</td>
                            </tr>
                          ))}
                        {selectedContract.auditLogs.length === 0 && (
                          <tr>
                            <td colSpan={4} className="p-6 text-center text-stone-400 italic">هیچ لاگی ثبت نشده است.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================== MODALS ===================== */}

      {/* CREATE NEW CONTRACT MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={() => setIsCreateModalOpen(false)}></div>
          <div className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden animate-scaleIn border border-[#ece5d8] flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 bg-[#faf8f4] border-b border-[#ece5d8] flex items-center justify-between">
              <div>
                <h3 className="font-black text-stone-800 text-sm flex items-center gap-2">
                  <FileCheck className="text-amber-600" size={18} />
                  تعریف و ثبت قرارداد جدید (مبتنی بر CBS و WBS پروژه)
                </h3>
                <p className="text-[11px] text-stone-500 font-medium mt-0.5 pr-6">
                  اطلاعات مالی، حقوقی و ساختار شکست کار (WBS) را جهت انطباق ۱به۱ در سیستم وارد نمائید.
                </p>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="p-2 text-stone-400 hover:text-stone-700 font-bold text-xl cursor-pointer">×</button>
            </div>

            {/* Modal Subtabs Header */}
            <div className="flex border-b border-[#ece5d8] bg-[#faf8f4] shrink-0">
              <button
                type="button"
                onClick={() => setCreateModalTab('general')}
                className={`flex-1 py-3 px-4 text-xs font-black flex items-center justify-center gap-2 border-b-2 transition-all cursor-pointer ${
                  createModalTab === 'general'
                    ? 'border-amber-600 text-amber-800 bg-white shadow-sm'
                    : 'border-transparent text-stone-500 hover:text-stone-800'
                }`}
              >
                <FileText size={16} />
                <span>۱. مشخصات عمومی و مالی قرارداد</span>
              </button>

              <button
                type="button"
                onClick={() => setCreateModalTab('wbs')}
                className={`flex-1 py-3 px-4 text-xs font-black flex items-center justify-center gap-2 border-b-2 transition-all cursor-pointer ${
                  createModalTab === 'wbs'
                    ? 'border-amber-600 text-amber-800 bg-white shadow-sm'
                    : 'border-transparent text-stone-500 hover:text-stone-800'
                }`}
              >
                <FolderKanban size={16} />
                <span>۲. ساختار شکست کار (WBS) و زمان‌بندی اولیه</span>
                {modalImportedMapping && modalImportedMapping.length > 0 ? (
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-black">
                    {modalImportedMapping.length} ردیف WBS
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-[10px] font-bold">
                    جدید / خالی
                  </span>
                )}
              </button>
            </div>

            <form onSubmit={handleCreateContract} className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* TAB 1: GENERAL & FINANCIAL SPECS */}
              {createModalTab === 'general' && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Contract Number */}
                    <div className="space-y-1">
                      <label className="text-[10px] text-stone-500 font-bold pr-2">شماره قرارداد *</label>
                      <input
                        type="text"
                        placeholder="مثال: CON-1403/01"
                        value={newContractForm.number}
                        onChange={(e) => setNewContractForm({ ...newContractForm, number: e.target.value })}
                        className="w-full px-4 py-2.5 bg-[#faf8f4] border border-[#e5ded0]/60 rounded-2xl text-xs font-bold text-stone-800"
                        required
                      />
                    </div>

                    {/* Contract Title */}
                    <div className="space-y-1 md:col-span-2">
                      <label className="text-[10px] text-stone-500 font-bold pr-2">عنوان رسمی قرارداد *</label>
                      <input
                        type="text"
                        placeholder="شرح کامل موضوع پیمان..."
                        value={newContractForm.title}
                        onChange={(e) => setNewContractForm({ ...newContractForm, title: e.target.value })}
                        className="w-full px-4 py-2.5 bg-[#faf8f4] border border-[#e5ded0]/60 rounded-2xl text-xs font-bold text-stone-800"
                        required
                      />
                    </div>

                    {/* Contract Type */}
                    <div className="space-y-1">
                      <label className="text-[10px] text-stone-500 font-bold pr-2">نوع الگوی پرداخت *</label>
                      <select
                        value={newContractForm.type}
                        onChange={(e) => setNewContractForm({ ...newContractForm, type: e.target.value as any })}
                        className="w-full px-4 py-2.5 bg-[#faf8f4] border border-[#e5ded0]/60 rounded-2xl text-xs font-bold text-stone-800"
                      >
                        {isCbsProject && <option value="CBS">CBS (ساختار شکست یکپارچه)</option>}
                        <option value="EPC">EPC (طراحی، تامین تجهیزات و ساخت)</option>
                        <option value="UNIT_PRICE">فهرست‌بهایی / آحادبها</option>
                        <option value="LUMP_SUM">مقطوع (Lump Sum)</option>
                        <option value="COST_PLUS">مدیریت پیمان (Cost Plus)</option>
                      </select>
                    </div>

                    {/* Contractor */}
                    <div className="space-y-1">
                      <label className="text-[10px] text-stone-500 font-bold pr-2">پیمانکار اجرایی *</label>
                      <input
                        type="text"
                        placeholder="نام شرکت پیمانکار..."
                        value={newContractForm.contractor}
                        onChange={(e) => setNewContractForm({ ...newContractForm, contractor: e.target.value })}
                        className="w-full px-4 py-2.5 bg-[#faf8f4] border border-[#e5ded0]/60 rounded-2xl text-xs font-bold text-stone-800"
                        required
                      />
                    </div>

                    {/* Initial Amount */}
                    <div className="space-y-1">
                      <label className="text-[10px] text-stone-500 font-bold pr-2">مبلغ اولیه قرارداد ({activeCurrency}) *</label>
                      <input
                        type="text"
                        placeholder="مثال: ۵۰,۰۰۰,۰۰۰,۰۰۰"
                        value={newContractForm.initialAmount ? new Intl.NumberFormat('en-US').format(newContractForm.initialAmount) : ''}
                        onChange={(e) => {
                          const clean = e.target.value.replace(/,/g, '');
                          const val = clean === '' ? 0 : Number(clean);
                          if (!isNaN(val)) {
                            setNewContractForm({ ...newContractForm, initialAmount: val });
                          }
                        }}
                        className="w-full px-4 py-2.5 bg-[#faf8f4] border border-[#e5ded0]/60 rounded-2xl text-xs font-bold text-stone-800 ltr text-left"
                        required
                      />
                    </div>

                    {/* Base Budget Amount */}
                    <div className="space-y-1">
                      <label className="text-[10px] text-stone-500 font-bold pr-2">بودجه مبنای قرارداد ({activeCurrency}) *</label>
                      <input
                        type="text"
                        placeholder="مثال: ۴۵,۰۰۰,۰۰۰,۰۰۰"
                        value={newContractForm.baseBudgetAmount ? new Intl.NumberFormat('en-US').format(newContractForm.baseBudgetAmount) : ''}
                      />
                    </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] text-stone-500 font-bold pr-2">درصد پیش‌پرداخت</label>
                        <input
                          type="number"
                          placeholder="مثال: 15"
                          value={newContractForm.advancePaymentPercent}
                          onChange={(e) => setNewContractForm({ ...newContractForm, advancePaymentPercent: Number(e.target.value) })}
                          className="w-full px-4 py-2.5 bg-[#faf8f4] border border-[#e5ded0]/60 rounded-2xl text-xs font-bold text-stone-800"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-stone-500 font-bold pr-2">درصد حسن انجام کار</label>
                        <input
                          type="number"
                          placeholder="مثال: 10"
                          value={newContractForm.goodPerformanceRetentionPercent}
                          onChange={(e) => setNewContractForm({ ...newContractForm, goodPerformanceRetentionPercent: Number(e.target.value) })}
                          className="w-full px-4 py-2.5 bg-[#faf8f4] border border-[#e5ded0]/60 rounded-2xl text-xs font-bold text-stone-800"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-stone-500 font-bold pr-2">درصد کسری بیمه</label>
                        <input
                          type="number"
                          placeholder="مثال: 5.3"
                          value={newContractForm.insurancePercent}
                          onChange={(e) => setNewContractForm({ ...newContractForm, insurancePercent: Number(e.target.value) })}
                          className="w-full px-4 py-2.5 bg-[#faf8f4] border border-[#e5ded0]/60 rounded-2xl text-xs font-bold text-stone-800"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-stone-500 font-bold pr-2">درصد علی‌الحساب مالیات</label>
                        <input
                          type="number"
                          placeholder="مثال: 9"
                          value={newContractForm.taxPercent}
                          onChange={(e) => setNewContractForm({ ...newContractForm, taxPercent: Number(e.target.value) })}
                          className="w-full px-4 py-2.5 bg-[#faf8f4] border border-[#e5ded0]/60 rounded-2xl text-xs font-bold text-stone-800"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Text Areas */}
                  <div className="space-y-4 pt-4 border-t border-[#ece5d8]">
                    <div className="space-y-1">
                      <label className="text-[10px] text-stone-500 font-bold pr-2">نحوه پرداخت و دوره‌های تسویه مالی</label>
                      <textarea
                        rows={2}
                        placeholder="شرح جزئیات شرایط مالی..."
                        value={newContractForm.paymentTerms}
                        onChange={(e) => setNewContractForm({ ...newContractForm, paymentTerms: e.target.value })}
                        className="w-full p-4 bg-[#faf8f4] border border-[#e5ded0]/60 rounded-3xl text-xs font-bold text-stone-800 focus:outline-none resize-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-stone-500 font-bold pr-2">شروط ویژه و تضامین کلی قرارداد</label>
                      <textarea
                        rows={2}
                        placeholder="سایر شرایط..."
                        value={newContractForm.specialConditions}
                        onChange={(e) => setNewContractForm({ ...newContractForm, specialConditions: e.target.value })}
                        className="w-full p-4 bg-[#faf8f4] border border-[#e5ded0]/60 rounded-3xl text-xs font-bold text-stone-800 focus:outline-none resize-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: WBS & BASELINE SCHEDULE */}
              {createModalTab === 'wbs' && (
                <div className="space-y-6 animate-fadeIn">
                  {/* WBS Top Info Banner */}
                  <div className="p-5 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-200 dark:border-amber-800/40 rounded-3xl space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="p-3 bg-amber-500 text-white rounded-2xl shadow-md flex-shrink-0">
                          <FolderKanban size={22} />
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-stone-800 dark:text-stone-100">
                            ساختار شکست کار (WBS) و زمان‌بندی اولیه پیمان
                          </h4>
                          <p className="text-xs text-stone-600 dark:text-stone-400 font-medium mt-0.5 leading-relaxed">
                            در این بخش می‌توانید ساختار شکست کار، وزن‌های فیزیکی، زمان‌بندی اولیه و حجم کار را از طریق بارگذاری اکسل مشاهده نمایید.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={handleDownloadWbsExcelTemplate}
                          className="px-3.5 py-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 hover:bg-stone-50 text-stone-700 dark:text-stone-200 rounded-xl text-xs font-black shadow-sm flex items-center gap-1.5 cursor-pointer transition-all"
                        >
                          <Download size={14} className="text-amber-600" />
                          <span>دانلود قالب اکسل</span>
                        </button>

                        <label className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-1.5 cursor-pointer transition-all">
                          <Upload size={14} />
                          <span>بارگذاری اکسل WBS</span>
                          <input
                            type="file"
                            accept=".xlsx, .xls"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                try {
                                  const data = new Uint8Array(event.target?.result as ArrayBuffer);
                                  const workbook = XLSX.read(data, { type: 'array' });
                                  const firstSheetName = workbook.SheetNames[0];
                                  const worksheet = workbook.Sheets[firstSheetName];
                                  const rawRows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });

                                  if (!rawRows || rawRows.length === 0) {
                                    alert('فایل اکسل انتخاب شده خالی است.');
                                    return;
                                  }

                                  // Find Header Row dynamically
                                  let headerIndex = -1;
                                  for (let i = 0; i < Math.min(rawRows.length, 50); i++) {
                                    const rowStr = (rawRows[i] || []).map((c: any) => String(c || '').trim().toLowerCase());
                                    if (rowStr.some((c: string) => c.includes('شرح') || c.includes('description') || c.includes('عنوان') || c.includes('activity') || c.includes('کد') || c.includes('wbs') || c.includes('cbs'))) {
                                      headerIndex = i;
                                      break;
                                    }
                                  }

                                  if (headerIndex === -1) {
                                    if (rawRows[0] && rawRows[0].length >= 2) headerIndex = 0;
                                    else throw new Error("سطر عنوان یافت نشد. لطفا از قالب نمونه استاندارد استفاده نمایید.");
                                  }

                                  const headerRow = (rawRows[headerIndex] || []).map((c: any) => String(c || '').trim().toLowerCase());
                                  
                                  // Map Columns with robust cleaning
                                  const cleanStr = (s: string) => s.toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]/g, '');
                                  const getColIdx = (keywords: string[], excludeKeywords?: string[]) => {
                                    const cleanKeywords = keywords.map(cleanStr).filter(Boolean);
                                    const cleanExcludes = excludeKeywords ? excludeKeywords.map(cleanStr).filter(Boolean) : [];
                                    return headerRow.findIndex((h: string) => {
                                      const cleanH = cleanStr(h);
                                      if (!cleanH) return false;
                                      if (cleanExcludes.some(k => cleanH.includes(k) || k.includes(cleanH))) return false;
                                      return cleanKeywords.some(k => {
                                        if (k === cleanH) return true;
                                        if (k.length > 1 && cleanH.length > 1) {
                                          return cleanH.includes(k) || k.includes(cleanH);
                                        }
                                        return false;
                                      });
                                    });
                                  };

                                  const codeIdx = getColIdx(['کد', 'code', 'wbs', 'cbs', 'شماره', 'ردیف', 'item'], ['شرح', 'description', 'عنوان']);
                                  const descIdx = getColIdx(['شرح', 'description', 'عنوان', 'موضوع', 'activity', 'نام'], ['کد', 'code']);
                                  const unitIdx = getColIdx(['واحد', 'unit']);
                                  const qtyIdx = getColIdx(['حجم', 'مقدار', 'تعداد', 'quantity', 'qty', 'count', 'q', 'q.t.y', 'qnty', 'qnt', 'qt']);
                                  const priceIdx = getColIdx(['قیمت واحد', 'بهای واحد', 'نرخ', 'unit price', 'rate', 'unitprice']);
                                  const amountIdx = getColIdx(['مبلغ کل', 'قیمت کل', 'مبلغ تخصیص', 'بودجه', 'جمع کل', 'مبلغ', 'allocated amount', 'total price', 'amount', 'budget', 'allocatedamount'], ['قیمت واحد', 'بهای واحد', 'نرخ', 'unit price', 'rate']);
                                  const weightIdx = getColIdx(['وزن', 'weight', 'percent', 'درصد', 'سهم']);
                                  const startIdx = getColIdx(['شروع', 'start']);
                                  const endIdx = getColIdx(['پایان', 'end', 'خاتمه']);
                                  const durationIdx = getColIdx(['مدت', 'duration', 'days', 'روز']);

                                  const toEnglishDigits = (str: string): string => {
                                    return str
                                      .replace(/[۰-۹]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1776 + 48))
                                      .replace(/[٠-٩]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1632 + 48));
                                  };

                                  const parseNum = (val: any, defaultVal: number): number => {
                                    if (val === undefined || val === null || val === '') return defaultVal;
                                    if (typeof val === 'number') return val;
                                    const cleaned = toEnglishDigits(String(val)).replace(/[^0-9.]/g, '');
                                    const parsed = parseFloat(cleaned);
                                    return isNaN(parsed) ? defaultVal : parsed;
                                  };

                                  let totalAmount = 0;
                                  const mapping: CbsMappingItem[] = [];

                                  for (let i = headerIndex + 1; i < rawRows.length; i++) {
                                    const row = rawRows[i];
                                    if (!row || row.length === 0) continue;

                                    const hasData = row.some((c: any) => c !== undefined && c !== null && String(c).trim() !== '');
                                    if (!hasData) continue;

                                    const code = codeIdx !== -1 ? String(row[codeIdx] || '').trim() : `WBS-${i - headerIndex}`;
                                    const title = descIdx !== -1 ? String(row[descIdx] || '').trim() : `فعالیت ${code}`;

                                    if (!title && !code) continue;

                                    const unit = unitIdx !== -1 ? String(row[unitIdx] || '').trim() : 'عدد';
                                    const qty = qtyIdx !== -1 ? parseNum(row[qtyIdx], 1) : 1;
                                    const uPrice = priceIdx !== -1 ? parseNum(row[priceIdx], 0) : 0;
                                    
                                    let amt = amountIdx !== -1 ? parseNum(row[amountIdx], 0) : 0;
                                    if (!amt && qty && uPrice) {
                                      amt = qty * uPrice;
                                    }
                                    const finalUnitPrice = uPrice || (qty > 0 ? Math.round(amt / qty) : amt);
                                    
                                    totalAmount += amt;

                                    const weightPercent = weightIdx !== -1 ? parseNum(row[weightIdx], 0) : 0;
                                    const baselineStartDate = startIdx !== -1 ? String(row[startIdx] || '').trim() || newContractForm.startDate || '1405/01/01' : (newContractForm.startDate || '1405/01/01');
                                    const baselineEndDate = endIdx !== -1 ? String(row[endIdx] || '').trim() || '1405/12/29' : '1405/12/29';
                                    const durationDays = durationIdx !== -1 ? parseNum(row[durationIdx], 30) : 30;

                                    mapping.push({
                                      cbsCode: code,
                                      description: title,
                                      unit: unit,
                                      quantity: qty,
                                      unitPrice: finalUnitPrice,
                                      allocatedAmount: amt,
                                      weightPercent: weightPercent,
                                      baselineStartDate: baselineStartDate,
                                      baselineEndDate: baselineEndDate,
                                      durationDays: durationDays
                                    });
                                  }

                                  if (mapping.length === 0) {
                                    throw new Error("هیچ ردیف معتبری در فایل اکسل یافت نشد.");
                                  }

                                  setModalImportedMapping(mapping);
                                  if (totalAmount > 0) {
                                    setNewContractForm(prev => ({
                                      ...prev,
                                      initialAmount: totalAmount,
                                      baseBudgetAmount: totalAmount
                                    }));
                                  }
                                  alert(`فایل اکسل با موفقیت بارگذاری گردید (${mapping.length} ردیف WBS استخراج شد).`);
                                } catch (err: any) {
                                  alert(`خطا در خواندن فایل اکسل WBS: ${err.message || ''}`);
                                }
                              };
                              reader.readAsArrayBuffer(file);
                            }}
                            className="hidden"
                          />
                        </label>

                        {modalImportedMapping && modalImportedMapping.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setConfirmDialog({
                                isOpen: true,
                                title: 'تأیید پاکسازی اطلاعات جدول WBS',
                                message: 'آیا از حذف اطلاعات جدول WBS بارگذاری‌شده از اکسل اطمینان دارید؟',
                                confirmText: 'بله، حذف اطلاعات جدول',
                                cancelText: 'انصراف',
                                isDanger: true,
                                onConfirm: () => {
                                  setModalImportedMapping([]);
                                  setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                                }
                              });
                            }}
                            className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl text-xs font-black shadow-sm flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                          >
                            <Trash2 size={14} />
                            <span>حذف اطلاعات جدول</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Display WBS Table */}
                  {modalImportedMapping && modalImportedMapping.length > 0 ? (
                    <div className="border border-[#ece5d8] dark:border-stone-800 rounded-2xl overflow-hidden shadow-sm bg-white dark:bg-stone-900">
                      <div className="overflow-x-auto max-h-[40vh]">
                        <table className="w-full text-right text-xs">
                          <thead className="sticky top-0 bg-[#faf8f4] dark:bg-stone-800 text-stone-600 dark:text-stone-300 font-bold border-b border-[#ece5d8] z-10">
                            <tr>
                              <th className="p-2.5 text-center w-10">#</th>
                              <th className="p-2.5 w-28 text-center font-mono">کد WBS</th>
                              <th className="p-2.5 min-w-[160px]">عنوان فعالیت ساختاری</th>
                              <th className="p-2.5 w-20 text-center">واحد</th>
                              <th className="p-2.5 w-20 text-center">حجم</th>
                              <th className="p-2.5 w-24 text-center">وزن (٪)</th>
                              <th className="p-2.5 w-28 text-center">تاریخ شروع</th>
                              <th className="p-2.5 w-28 text-center">تاریخ پایان</th>
                              <th className="p-2.5 w-20 text-center">مدت (روز)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#ece5d8] dark:divide-stone-800 font-medium">
                            {modalImportedMapping.map((item, idx) => (
                              <tr key={idx} className="hover:bg-amber-50/20 transition-colors">
                                <td className="p-2.5 text-center font-bold text-stone-400">{idx + 1}</td>
                                <td className="p-2.5 text-center">
                                  <span className="font-mono font-black text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md">
                                    {item.cbsCode}
                                  </span>
                                </td>
                                <td className="p-2.5 font-bold text-stone-800 dark:text-stone-100">
                                  {item.description || `فعالیت ${item.cbsCode}`}
                                </td>
                                <td className="p-2.5 text-center text-stone-600 dark:text-stone-400">
                                  {item.unit || 'عدد'}
                                </td>
                                <td className="p-2.5 text-center font-bold text-stone-800 dark:text-stone-200">
                                  {item.quantity ? item.quantity.toLocaleString('fa-IR') : '۱'}
                                </td>
                                <td className="p-2.5 text-center">
                                  <span className="font-mono font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                                    {item.weightPercent ? `${item.weightPercent}٪` : '—'}
                                  </span>
                                </td>
                                <td className="p-2.5 text-center font-mono text-stone-600 dark:text-stone-400">
                                  {item.baselineStartDate || '1405/01/01'}
                                </td>
                                <td className="p-2.5 text-center font-mono text-stone-600 dark:text-stone-400">
                                  {item.baselineEndDate || '1405/12/29'}
                                </td>
                                <td className="p-2.5 text-center font-mono font-bold text-stone-800 dark:text-stone-200">
                                  {item.durationDays ? `${item.durationDays.toLocaleString('fa-IR')} روز` : '۳۰ روز'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 border-2 border-dashed border-[#ece5d8] rounded-3xl text-center space-y-3 bg-[#faf8f4]/50">
                      <FolderKanban size={32} className="mx-auto text-stone-300" />
                      <div>
                        <span className="text-xs font-black text-stone-700 block">هنوز ردیف WBS تعریف نشده است</span>
                        <span className="text-[11px] text-stone-500 font-medium">
                          می‌توانید فایل اکسل ساختار شکست را بارگذاری کنید یا اولین ردیف را به صورت دستی اضافه نمایید.
                        </span>
                      </div>
                      <div className="flex items-center justify-center gap-3 pt-2">
                        <button
                          type="button"
                          onClick={handleAddModalWbsRow}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-2 cursor-pointer"
                        >
                          <Plus size={14} />
                          <span>افزودن اولین ردیف WBS</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Actions Footer */}
              <div className="p-4 bg-[#faf8f4] border-t border-[#ece5d8] flex items-center justify-between gap-2 rounded-b-[2.5rem]">
                <div className="flex items-center gap-2">
                  {createModalTab === 'general' ? (
                    <button
                      type="button"
                      onClick={() => setCreateModalTab('wbs')}
                      className="px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl font-black text-xs flex items-center gap-2 cursor-pointer"
                    >
                      <span>گام بعدی: ساختار شکست کار (WBS)</span>
                      <ChevronRight size={14} className="rotate-180" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setCreateModalTab('general')}
                      className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-bold text-xs flex items-center gap-2 cursor-pointer"
                    >
                      <ChevronRight size={14} />
                      <span>گام قبلی: مشخصات عمومی</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl cursor-pointer"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-amber-600 hover:bg-stone-900 text-white font-black text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-2"
                  >
                    <CheckCircle2 size={16} />
                    <span>ثبت نهایی قرارداد در سامانه</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CUSTOM CONFIRMATION DIALOG MODAL */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}></div>
          <div className="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-[#ece5d8]">
            <div className="p-5 bg-[#faf8f4] border-b border-[#ece5d8] flex items-center gap-3">
              <span className={`p-2 rounded-xl flex items-center justify-center ${confirmDialog.isDanger ? 'bg-rose-50 text-rose-600' : 'bg-stone-50 text-amber-600'}`}>
                <AlertTriangle size={18} />
              </span>
              <h3 className="font-black text-stone-800 text-sm">
                {confirmDialog.title}
              </h3>
            </div>

            <div className="p-6">
              <p className="text-xs text-stone-600 font-bold leading-relaxed text-right">
                {confirmDialog.message}
              </p>
            </div>

            <div className="p-4 bg-[#faf8f4] border-t border-[#ece5d8] flex justify-end gap-2">
              <button
                onClick={confirmDialog.onConfirm}
                className={`px-5 py-2.5 text-white font-black text-xs rounded-xl shadow-md cursor-pointer transition-all ${
                  confirmDialog.isDanger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-amber-600 hover:bg-stone-900'
                }`}
              >
                {confirmDialog.confirmText}
              </button>
              <button
                onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl"
              >
                {confirmDialog.cancelText}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * ENTERPRISE CONTRACT MANAGEMENT API SPECIFICATION (V1)
 * ---------------------------------------------------
 * This module is designed to integrate with the following enterprise services:
 * 
 * 1. GET /api/contracts/:id/cbs-allocation
 *    Returns the mapping of contract amounts to CBS nodes for progress measurement.
 * 
 * 2. POST /api/contracts/:id/revisions
 *    Registers a new Amendment (الحاقیه) or Time Extension (تمدید).
 *    Integrates with: Budget Management (to update project baseline).
 * 
 * 3. GET /api/contracts/:id/warranties
 *    Retrieves bank guarantees status. 
 *    Integrates with: Finance/Accounting (for tracking performance bonds).
 * 
 * 4. GET /api/contracts/kpi/summary
 *    Returns project-wide financial metrics (Total Contracted vs. Budget).
 * 
 * 5. POST /api/contracts/:id/workflow/transition
 *    Moves the contract through enterprise approval steps (Draft -> Under Review -> Active).
 */
