
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Plus, X, Trash2, Edit3, Building2, UserCircle, AlertTriangle, Upload, FileSpreadsheet,
  Loader2, Percent, Info, Users, Save, CheckCircle, Calendar, DollarSign, MapPin, 
  Layers, Globe, Clock, Sliders, FileText, Check, Activity, Paperclip, MessageSquare, 
  History, Settings, ShieldCheck, ChevronRight, Download, Network, Printer, Search, FolderKanban, Sparkles
} from 'lucide-react';
import { MOCK_PROJECTS } from '../constants';
import { Project, PriceList, PriceListItem, GeneralCoefficient, ChapterCoefficient, ContractWarranty, ContractRevision, CbsMappingItem, EstimateItem, WorkflowStatus, PlanningActivity } from '../types';
import * as XLSX from 'xlsx';
import { SystemAdminService } from '../services/systemAdminService';
import { ModuleId } from '../systemAdminTypes';
import { formatShamsiDate, calculateShamsiDayDiff, getTodayShamsi, calculateActivityPlannedProgress } from '../utils/dateUtils';
import { ShamsiDatePicker } from '../components/ShamsiDatePicker';

interface FixedCoefficientDescriptor {
  label: string;
  key: 'regional' | 'overhead' | 'contractor' | 'equipment' | 'others';
}

const FIXED_COEFFICIENT_DESCRIPTORS: FixedCoefficientDescriptor[] = [
  { label: 'ضریب منطقه‌ای', key: 'regional' },
  { label: 'ضریب بالاسری', key: 'overhead' },
  { label: 'ضریب پیمانکار', key: 'contractor' },
  { label: 'ضریب تجهیز کارگاه', key: 'equipment' },
  { label: 'سایر ضرایب', key: 'others' },
];

const calculateCbsRootWeightsSum = (items: PriceListItem[]): number => {
  if (!items || items.length === 0) return 0;
  
  const allCodes = items.map(item => String(item.code || '').trim()).filter(Boolean);
  
  const hasParent = (code: string): boolean => {
    if (!code || !code.includes('.')) return false;
    const parts = code.split('.');
    const standardParentCode = parts.slice(0, -1).join('.');
    
    // 1. Try standard (1.01 -> 1)
    if (allCodes.includes(standardParentCode)) return true;
    
    // 2. Try header (1.01 -> 1.00 or 1.0)
    const header00 = standardParentCode + '.00';
    if (allCodes.includes(header00) && header00 !== code) return true;
    
    const header0 = standardParentCode + '.0';
    if (allCodes.includes(header0) && header0 !== code) return true;
    
    return false;
  };
  
  const rootItems = items.filter(item => {
    const code = String(item.code || '').trim();
    return !hasParent(code);
  });
  
  const sum = rootItems.reduce((acc, item) => acc + (item.weightPercent || 0), 0);
  return Math.round(sum * 100) / 100;
};

const calculateCbsRootBudgetSum = (items: PriceListItem[]): number => {
  if (!items || items.length === 0) return 0;
  
  const allCodes = items.map(item => String(item.code || '').trim()).filter(Boolean);
  
  const hasParent = (code: string): boolean => {
    if (!code || !code.includes('.')) return false;
    const parts = code.split('.');
    const standardParentCode = parts.slice(0, -1).join('.');
    
    // 1. Try standard (1.01 -> 1)
    if (allCodes.includes(standardParentCode)) return true;
    
    // 2. Try header (1.01 -> 1.00 or 1.0)
    const header00 = standardParentCode + '.00';
    if (allCodes.includes(header00) && header00 !== code) return true;
    
    const header0 = standardParentCode + '.0';
    if (allCodes.includes(header0) && header0 !== code) return true;
    
    return false;
  };
  
  const rootItems = items.filter(item => {
    const code = String(item.code || '').trim();
    return !hasParent(code);
  });
  
  return rootItems.reduce((acc, item) => acc + (item.price || 0), 0);
};

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>(() => {
    try {
      const saved = localStorage.getItem('hamyar_projects');
      if (saved) {
        const loaded = JSON.parse(saved);
        if (Array.isArray(loaded)) {
          const cleaned = loaded.filter((p: any) => p.id !== '2' && !String(p.title || '').includes('تصفیه‌خانه مرکزی') && !String(p.title || '').includes('تسویه خانه مرکزی') && !String(p.title || '').includes('نیایش'));
          localStorage.setItem('hamyar_projects', JSON.stringify(cleaned));
          return cleaned.length > 0 ? cleaned : MOCK_PROJECTS;
        }
      }
    } catch(e) {}
    return MOCK_PROJECTS;
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const currentUser = useMemo(() => SystemAdminService.getCurrentUser(), []);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [cbsUploadSuccessMsg, setCbsUploadSuccessMsg] = useState<string | null>(null);
  const [wbsUploadSuccessMsg, setWbsUploadSuccessMsg] = useState<string | null>(null);
  const [isClearWbsModalOpen, setIsClearWbsModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const wbsFileInputRef = useRef<HTMLInputElement>(null);
  const [activeModalTab, setActiveModalTab] = useState<string>('info');
  const [canCreate, setCanCreate] = useState(false);
  const [plTitleInput, setPlTitleInput] = useState('');
  const [plYearInput, setPlYearInput] = useState('1403');

  // Estimate upload states & refs
  const estimateFileInputRef = useRef<HTMLInputElement>(null);
  const [estimateUploadSuccessMsg, setEstimateUploadSuccessMsg] = useState<string | null>(null);
  const [isUploadingEstimate, setIsUploadingEstimate] = useState(false);
  const [estimateTitleInput, setEstimateTitleInput] = useState('');
  const [estimateYearInput, setEstimateYearInput] = useState('1403');
  const [uploadedEstimateItems, setUploadedEstimateItems] = useState<EstimateItem[]>([]);

  // Interactive CBS inputs state
  const [newArea, setNewArea] = useState('');
  const [newZone, setNewZone] = useState('');
  const [newFacility, setNewFacility] = useState('');
  const [newDiscipline, setNewDiscipline] = useState('');
  const [newSystem, setNewSystem] = useState('');
  const [newSubsystem, setNewSubsystem] = useState('');
  const [newProjectCode, setNewProjectCode] = useState('');
  const [newCostCenter, setNewCostCenter] = useState('');
  const [newNote, setNewNote] = useState('');

  useEffect(() => {
    const user = SystemAdminService.getCurrentUser();
    if (user) {
      const userOrg = SystemAdminService.getOrganization(user.orgId);
      const isEmployer = userOrg?.type === 'EMPLOYER';
      const isEmployerProjectManager = isEmployer && 
        (user.role === 'ORG_ADMIN' || user.jobTitle === 'مدیر پروژه' || user.jobLevel === 'مدیر پروژه' || user.username === 'mostafa' || user.username === 'e-pm' || user.id === 'e-pm');
      const isEmployerWorkshopSupervisor = isEmployer &&
        (user.role === 'ORG_MANAGER' || user.jobTitle === 'سرپرست کارگاه' || user.jobLevel === 'سرپرست کارگاه' || user.username === 'reza' || user.id === 'reza');
      setCanCreate(user.role === 'SYSTEM_ADMIN' || !!isEmployerProjectManager || !!isEmployerWorkshopSupervisor);
    }
  }, []);
  
  const initialFormState: Project = {
    id: '',
    title: '',
    contractNumber: '',
    startDate: '',
    endDate: '',
    siteDeliveryDate: '',
    contractType: 'فهرست بهایی',
    priceLists: [],
    employerName: '',
    consultantName: '',
    contractorName: '',
    initialBudget: 0,
    baseBudget: 0,
    status: 'REGISTERED',
    resources: [],
    coefficients: { regional: 1, overhead: 1.3, contractor: 1, equipment: 1, others: 1, generalCoefficients: [], chapterCoefficients: [] },
    allowConsultantEmployerCreation: false,

    // CBS Specific defaults
    projectType: 'EPC',
    location: '',
    calendar: 'تقویم کارگاهی (۶ روزه - ۴۴ ساعت در هفته)',
    currency: 'تومان ایران',
    uom: 'مترمکعب',
    language: 'فارسی',
    timezone: 'UTC+03:30 (Tehran)',
    areas: [],
    zones: [],
    facilities: [],
    disciplines: [],
    systems: [],
    subsystems: [],
    projectCodes: [],
    costCenters: [],
    notesList: [],
    attachmentsList: [],
    revisionHistoryList: [
      { id: 'rev_1', version: 'V1.0', author: 'مدیر پروژه', changes: 'تعریف و راه‌اندازی اولیه پروژه', date: new Date().toLocaleDateString('fa-IR') }
    ],
    auditLogsList: [
      { id: 'log_1', user: 'مدیر پروژه', action: 'CREATE_PROJECT', details: 'اطلاعات اولیه پروژه و ساختار شکست هزینه پایه‌ریزی شد.', date: new Date().toLocaleDateString('fa-IR') }
    ],
    defaultSettings: {
      allowOverBudget: false,
      requireWorkflowApproval: true,
      autoLockFrozenItems: true,
      notifyOnStatusChange: true
    }
  };

  const [formData, setFormData] = useState<Project>(initialFormState);

  // Unified Contract warranties and revisions forms state
  const [isAddWarrantyOpen, setIsAddWarrantyOpen] = useState(false);
  const [warrantyForm, setWarrantyForm] = useState<Partial<ContractWarranty>>({
    type: 'PERFORMANCE_BOND',
    issuerBank: '',
    referenceNumber: '',
    amount: 0,
    issueDate: '',
    expiryDate: '',
    status: 'ACTIVE',
    description: ''
  });

  const [isAddRevisionOpen, setIsAddRevisionOpen] = useState(false);
  const [revisionForm, setRevisionForm] = useState<Partial<ContractRevision>>({
    version: '',
    type: 'AMENDMENT',
    date: '',
    approvedDate: '',
    changesDescription: '',
    amountDifference: 0,
    durationDifference: 0,
    status: 'APPROVED'
  });

  // Editing state for Warranty & Revision
  const [editingWarranty, setEditingWarranty] = useState<ContractWarranty | null>(null);
  const [editingRevision, setEditingRevision] = useState<ContractRevision | null>(null);

  // File Upload State
  const [attachmentPurpose, setAttachmentPurpose] = useState('');
  const attachmentFileInputRef = useRef<HTMLInputElement>(null);

  // Audit Filters
  const [auditSearchQuery, setAuditSearchQuery] = useState('');
  const [auditUserFilter, setAuditUserFilter] = useState('ALL');
  const [expandedPlId, setExpandedPlId] = useState<string | null>(null);

  const handleSaveEditWarranty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWarranty) return;
    setFormData(prev => {
      const updated = (prev.warranties || []).map(w => w.id === editingWarranty.id ? editingWarranty : w);
      const newAudit = {
        id: `log_${Date.now()}`,
        user: 'Mostafa.nasrollahnejad',
        action: 'EDIT_WARRANTY',
        details: `اطلاعات ضمانت‌نامه شماره ${editingWarranty.referenceNumber} ویرایش شد.`,
        date: new Date().toLocaleDateString('fa-IR') + ' ' + new Date().toLocaleTimeString('fa-IR').substring(0, 5)
      };
      return {
        ...prev,
        warranties: updated,
        auditLogsList: [newAudit, ...(prev.auditLogsList || [])]
      };
    });
    setEditingWarranty(null);
  };

  const handleSaveEditRevision = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRevision) return;
    setFormData(prev => {
      const updated = (prev.revisions || []).map(r => r.id === editingRevision.id ? editingRevision : r);
      const newAudit = {
        id: `log_${Date.now()}`,
        user: 'Mostafa.nasrollahnejad',
        action: 'EDIT_REVISION',
        details: `سند الحاقیه شماره ${editingRevision.version} ویرایش گردید.`,
        date: new Date().toLocaleDateString('fa-IR') + ' ' + new Date().toLocaleTimeString('fa-IR').substring(0, 5)
      };
      return {
        ...prev,
        revisions: updated,
        auditLogsList: [newAudit, ...(prev.auditLogsList || [])]
      };
    });
    setEditingRevision(null);
  };

  const handleRealFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newItems = Array.from(files).map((f, idx) => ({
      id: `att_${Date.now()}_${idx}`,
      name: f.name,
      size: (f.size / (1024 * 1024)).toFixed(2) + ' MB',
      date: new Date().toLocaleDateString('fa-IR'),
      purpose: attachmentPurpose || 'اسناد و مدارک فنی پیمان',
      url: URL.createObjectURL(f)
    }));

    setFormData(prev => ({
      ...prev,
      attachmentsList: [...newItems, ...(prev.attachmentsList || [])]
    }));
    setAttachmentPurpose('');
  };

  const handleExportAuditPDF = (logsList: any[], titleStr: string, selectedUser: string) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const filtered = selectedUser && selectedUser !== 'ALL' 
      ? logsList.filter(l => l.user === selectedUser)
      : logsList;

    const html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="fa">
      <head>
        <meta charset="utf-8" />
        <title>گزارش سوابق و لاگ حسابرسی - ${titleStr}</title>
        <style>
          body { font-family: Tahoma, 'IRANSans', Vazir, sans-serif; direction: rtl; padding: 25px; color: #1e293b; background: #fff; }
          .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 20px; }
          .header h1 { font-size: 18px; margin: 0 0 6px 0; color: #0f172a; }
          .header p { font-size: 11px; color: #64748b; margin: 0; }
          .meta { display: flex; justify-content: space-between; font-size: 11px; color: #334155; margin-bottom: 15px; background: #f8fafc; padding: 10px 15px; border-radius: 8px; border: 1px solid #e2e8f0; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
          th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: right; }
          th { background-color: #f1f5f9; font-weight: bold; color: #0f172a; }
          tr:nth-child(even) { background-color: #f8fafc; }
          .badge { display: inline-block; padding: 2px 6px; background-color: #e2e8f0; border-radius: 4px; font-size: 10px; font-weight: bold; }
          .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>گزارش لاگ حسابرسی و ردپای امنیتی کاربر (Audit Trail)</h1>
          <p>${titleStr}</p>
        </div>
        <div class="meta">
          <span><strong>فیلتر کاربر:</strong> ${selectedUser && selectedUser !== 'ALL' ? selectedUser : 'همه کاربران'}</span>
          <span><strong>تاریخ ثبت خروجی:</strong> ${new Date().toLocaleDateString('fa-IR')} - ${new Date().toLocaleTimeString('fa-IR').substring(0, 5)}</span>
          <span><strong>تعداد رکوردها:</strong> ${filtered.length} مورد</span>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 5%;">#</th>
              <th style="width: 20%;">تاریخ و زمان</th>
              <th style="width: 22%;">نام کاربر</th>
              <th style="width: 18%;">نوع اقدام</th>
              <th>شرح و جزئیات دقیق تغییرات</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.map((log, index) => `
              <tr>
                <td>${index + 1}</td>
                <td style="font-family: monospace; text-align: center;">${log.date || ''}</td>
                <td style="font-weight: bold; color: #d97706;">${log.user || ''}</td>
                <td><span class="badge">${log.action || ''}</span></td>
                <td>${log.details || ''}</td>
              </tr>
            `).join('')}
            ${filtered.length === 0 ? `<tr><td colSpan="5" style="text-align: center; color: #94a3b8; padding: 20px;">هیچ رکوردی یافت نشد.</td></tr>` : ''}
          </tbody>
        </table>
        <div class="footer">
          این سند به صورت اتوماتیک صادر شده و معتبر می‌باشد.
        </div>
        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleAddWarranty = () => {
    if (!warrantyForm.referenceNumber || !warrantyForm.issuerBank || !warrantyForm.amount) {
      alert('لطفاً مشخصات اصلی ضمانت‌نامه (بانک، شماره مرجع و مبلغ) را وارد کنید.');
      return;
    }
    const newW: ContractWarranty = {
      id: `w_${Date.now()}`,
      type: warrantyForm.type || 'PERFORMANCE_BOND',
      issuerBank: warrantyForm.issuerBank || '',
      referenceNumber: warrantyForm.referenceNumber || '',
      amount: Number(warrantyForm.amount || 0),
      issueDate: warrantyForm.issueDate || new Date().toLocaleDateString('fa-IR'),
      expiryDate: warrantyForm.expiryDate || new Date().toLocaleDateString('fa-IR'),
      status: warrantyForm.status || 'ACTIVE',
      description: warrantyForm.description || ''
    };
    setFormData(prev => {
      const updatedWarranties = [...(prev.warranties || []), newW];
      const newAudit = {
        id: `log_${Date.now()}`,
        user: 'Mostafa.nasrollahnejad',
        action: 'ADD_WARRANTY',
        details: `ضمانت‌نامه جدید به شماره ${newW.referenceNumber} ثبت گردید.`,
        date: new Date().toLocaleDateString('fa-IR') + ' ' + new Date().toLocaleTimeString('fa-IR').substring(0, 5)
      };
      return {
        ...prev,
        warranties: updatedWarranties,
        auditLogsList: [newAudit, ...(prev.auditLogsList || [])]
      };
    });
    setWarrantyForm({
      type: 'PERFORMANCE_BOND',
      issuerBank: '',
      referenceNumber: '',
      amount: 0,
      issueDate: '',
      expiryDate: '',
      status: 'ACTIVE',
      description: ''
    });
    setIsAddWarrantyOpen(false);
  };

  const handleRemoveWarranty = (wId: string, refNum: string) => {
    setFormData(prev => {
      const updatedWarranties = (prev.warranties || []).filter(w => w.id !== wId);
      const newAudit = {
        id: `log_${Date.now()}`,
        user: 'Mostafa.nasrollahnejad',
        action: 'REMOVE_WARRANTY',
        details: `ضمانت‌نامه شماره ${refNum} حذف گردید.`,
        date: new Date().toLocaleDateString('fa-IR') + ' ' + new Date().toLocaleTimeString('fa-IR').substring(0, 5)
      };
      return {
        ...prev,
        warranties: updatedWarranties,
        auditLogsList: [newAudit, ...(prev.auditLogsList || [])]
      };
    });
  };

  const handleAddRevision = () => {
    if (!revisionForm.version || !revisionForm.changesDescription) {
      alert('لطفاً عنوان مصوبه/نسخه و شرح مختصر تغییرات را وارد کنید.');
      return;
    }
    const newRev: ContractRevision = {
      id: `rev_${Date.now()}`,
      version: revisionForm.version || '',
      type: revisionForm.type || 'AMENDMENT',
      date: revisionForm.date || new Date().toLocaleDateString('fa-IR'),
      approvedDate: revisionForm.approvedDate || new Date().toLocaleDateString('fa-IR'),
      changesDescription: revisionForm.changesDescription || '',
      amountDifference: Number(revisionForm.amountDifference || 0),
      durationDifference: Number(revisionForm.durationDifference || 0),
      status: revisionForm.status || 'APPROVED'
    };
    setFormData(prev => {
      const updatedRevs = [...(prev.revisions || []), newRev];
      const newAudit = {
        id: `log_${Date.now()}`,
        user: 'Mostafa.nasrollahnejad',
        action: 'ADD_REVISION',
        details: `سند مصوبه جدید "${newRev.version}" ثبت گردید.`,
        date: new Date().toLocaleDateString('fa-IR') + ' ' + new Date().toLocaleTimeString('fa-IR').substring(0, 5)
      };
      return {
        ...prev,
        revisions: updatedRevs,
        auditLogsList: [newAudit, ...(prev.auditLogsList || [])]
      };
    });
    setRevisionForm({
      version: '',
      type: 'AMENDMENT',
      date: '',
      approvedDate: '',
      changesDescription: '',
      amountDifference: 0,
      durationDifference: 0,
      status: 'APPROVED'
    });
    setIsAddRevisionOpen(false);
  };

  const handleRemoveRevision = (revId: string, versionStr: string) => {
    setFormData(prev => {
      const updatedRevs = (prev.revisions || []).filter(r => r.id !== revId);
      const newAudit = {
        id: `log_${Date.now()}`,
        user: 'Mostafa.nasrollahnejad',
        action: 'REMOVE_REVISION',
        details: `سند مصوبه "${versionStr}" از لیست سوابق حذف گردید.`,
        date: new Date().toLocaleDateString('fa-IR') + ' ' + new Date().toLocaleTimeString('fa-IR').substring(0, 5)
      };
      return {
        ...prev,
        revisions: updatedRevs,
        auditLogsList: [newAudit, ...(prev.auditLogsList || [])]
      };
    });
  };

  useEffect(() => {
    localStorage.setItem('hamyar_projects', JSON.stringify(projects));
  }, [projects]);

  const handleAddHierarchyItem = (field: 'areas' | 'zones' | 'facilities' | 'disciplines' | 'systems' | 'subsystems' | 'projectCodes' | 'costCenters', value: string, setValue: (v: string) => void) => {
    if (!value.trim()) return;
    const currentList = formData[field] || [];
    if (!currentList.includes(value.trim())) {
      const updated = [...currentList, value.trim()];
      setFormData(prev => {
        const next = { ...prev, [field]: updated };
        const newAudit = {
          id: `log_${Date.now()}`,
          user: 'Mostafa.nasrollahnejad',
          action: 'ADD_PBS_ITEM',
          details: `آیتم "${value.trim()}" به ساختار ${field} اضافه شد.`,
          date: new Date().toLocaleDateString('fa-IR') + ' ' + new Date().toLocaleTimeString('fa-IR').substring(0, 5)
        };
        next.auditLogsList = [newAudit, ...(prev.auditLogsList || [])];
        return next;
      });
    }
    setValue('');
  };

  const handleRemoveHierarchyItem = (field: 'areas' | 'zones' | 'facilities' | 'disciplines' | 'systems' | 'subsystems' | 'projectCodes' | 'costCenters', indexToRemove: number, itemValue: string) => {
    const currentList = formData[field] || [];
    const updated = currentList.filter((_, idx) => idx !== indexToRemove);
    setFormData(prev => {
      const next = { ...prev, [field]: updated };
      const newAudit = {
        id: `log_${Date.now()}`,
        user: 'Mostafa.nasrollahnejad',
        action: 'REMOVE_PBS_ITEM',
        details: `آیتم "${itemValue}" از ساختار ${field} حذف شد.`,
        date: new Date().toLocaleDateString('fa-IR') + ' ' + new Date().toLocaleTimeString('fa-IR').substring(0, 5)
      };
      next.auditLogsList = [newAudit, ...(prev.auditLogsList || [])];
      return next;
    });
  };

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    const newNoteObj = {
      id: `note_${Date.now()}`,
      author: 'Mostafa.nasrollahnejad',
      text: newNote.trim(),
      date: new Date().toLocaleDateString('fa-IR')
    };
    setFormData(prev => {
      const next = {
        ...prev,
        notesList: [newNoteObj, ...(prev.notesList || [])]
      };
      const newAudit = {
        id: `log_${Date.now()}`,
        user: 'Mostafa.nasrollahnejad',
        action: 'ADD_NOTE',
        details: 'یک یادداشت جدید برای پروژه ثبت شد.',
        date: new Date().toLocaleDateString('fa-IR') + ' ' + new Date().toLocaleTimeString('fa-IR').substring(0, 5)
      };
      next.auditLogsList = [newAudit, ...(prev.auditLogsList || [])];
      return next;
    });
    setNewNote('');
  };

  const handleAddAttachmentSim = (fileName: string) => {
    const newAtt = {
      id: `att_${Date.now()}`,
      name: fileName,
      size: '1.2 MB',
      date: new Date().toLocaleDateString('fa-IR')
    };
    setFormData(prev => {
      const next = {
        ...prev,
        attachmentsList: [...(prev.attachmentsList || []), newAtt]
      };
      const newAudit = {
        id: `log_${Date.now()}`,
        user: 'Mostafa.nasrollahnejad',
        action: 'ADD_ATTACHMENT',
        details: `پیوست "${fileName}" به پروژه اضافه شد.`,
        date: new Date().toLocaleDateString('fa-IR') + ' ' + new Date().toLocaleTimeString('fa-IR').substring(0, 5)
      };
      next.auditLogsList = [newAudit, ...(prev.auditLogsList || [])];
      return next;
    });
  };

  const handleOpenModal = (project: Project | null) => {
    setEditingProject(project);

    if (project?.id) {
      localStorage.setItem('hamyar_selected_project_id', project.id);
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('project-changed', { detail: { projectId: project.id } }));
    }

    setFormData(project ? { 
      ...project,
      wbsScheduleMapping: project.wbsScheduleMapping || [],
      cbsMapping: project.cbsMapping || []
    } : { 
      ...initialFormState, 
      id: Math.random().toString(36).substr(2, 9),
      wbsScheduleMapping: [],
      cbsMapping: []
    });
    setWbsUploadSuccessMsg(null);
    setCbsUploadSuccessMsg(null);
    setPlTitleInput('');
    setPlYearInput('1403');
    setActiveModalTab('info');
    setIsModalOpen(true);
    if (project && project.priceLists && project.priceLists.length > 0) {
      setExpandedPlId(project.priceLists[0].id);
    } else {
      setExpandedPlId(null);
    }

    // Load existing estimates if editing
    if (project) {
      try {
        const existingRaw = localStorage.getItem('hamyar_estimates');
        if (existingRaw) {
          const allEst = JSON.parse(existingRaw);
          const projectEst = allEst.filter((e: any) => String(e.projectId) === String(project.id));
          setUploadedEstimateItems(projectEst);
        } else {
          setUploadedEstimateItems([]);
        }
      } catch (err) {
        setUploadedEstimateItems([]);
      }
    } else {
      setUploadedEstimateItems([]);
    }
    setEstimateUploadSuccessMsg(null);
    setEstimateTitleInput('');
    setEstimateYearInput('1403');
  };

  const handleEstimateUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingEstimate(true);
    setEstimateUploadSuccessMsg(null);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          throw new Error("فایل اکسل خالی است.");
        }

        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

        if (!rows || rows.length === 0) throw new Error("شیت خالی است.");

        // 1. Find Header Row
        let headerIndex = -1;
        for (let i = 0; i < Math.min(rows.length, 50); i++) {
          const rowStr = rows[i].map(c => String(c || '').trim().toLowerCase());
          if (rowStr.some(c => c.includes('شرح') || c.includes('description') || c.includes('عنوان') || c.includes('موضوع') || c.includes('آیتم'))) {
            headerIndex = i;
            break;
          }
        }

        if (headerIndex === -1) {
          if (rows[0].length >= 2) headerIndex = 0;
          else throw new Error("سطر عنوان (شامل 'شرح' یا 'Description') یافت نشد.");
        }

        const headerRow = rows[headerIndex].map(c => String(c || '').trim().toLowerCase());

        const cleanStr = (s: string) => s.toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]/g, '');
        const getColIdx = (keywords: string[]) => {
          const cleanKeywords = keywords.map(cleanStr).filter(Boolean);
          return headerRow.findIndex(h => {
            const cleanH = cleanStr(h);
            if (!cleanH) return false;
            return cleanKeywords.some(k => {
              if (k === cleanH) return true;
              if (k.length > 1 && cleanH.length > 1) {
                return cleanH.includes(k) || k.includes(cleanH);
              }
              return false;
            });
          });
        };

        const codeIdx = getColIdx(['کد', 'code', 'شماره', 'ردیف', 'آیتم', 'item']);
        const descIdx = getColIdx(['شرح', 'description', 'عنوان', 'موضوع', 'شرح عملیات']);
        const unitIdx = getColIdx(['واحد', 'unit', 'واحد سنجش']);
        const qtyIdx = getColIdx(['مقدار', 'تعداد', 'quantity', 'qty', 'count', 'حجم', 'عملیات']);
        const unitPriceIdx = getColIdx(['بهای واحد', 'قیمت واحد', 'unit price', 'unitprice', 'fee', 'rate', 'بها']);
        const totalIdx = getColIdx(['مبلغ کل', 'جمع کل', 'amount', 'total', 'price', 'قیمت کل', 'مبلغ']);
        const typeIdx = getColIdx(['نوع', 'type', 'نوع آیتم', 'itemtype', 'item type']);

        if (descIdx === -1) throw new Error("ستون 'شرح' در فایل اکسل شناسایی نشد.");

        const items: EstimateItem[] = [];
        for (let i = headerIndex + 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;

          const code = codeIdx !== -1 ? String(row[codeIdx] || '') : '';
          const description = String(row[descIdx] || '').trim();
          const unit = unitIdx !== -1 ? String(row[unitIdx] || '') : 'پروژه';

          const toEnglishDigits = (str: string): string => {
            return str
              .replace(/[۰-۹]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1776 + 48))
              .replace(/[٠-٩]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1632 + 48));
          };

          let qtyStr = '1';
          if (qtyIdx !== -1 && row[qtyIdx] !== undefined && row[qtyIdx] !== null && row[qtyIdx] !== '') {
            qtyStr = toEnglishDigits(String(row[qtyIdx]));
          }
          qtyStr = qtyStr.replace(/[^0-9.]/g, '');
          const quantity = parseFloat(qtyStr) || 1;

          let unitPriceStr = '0';
          if (unitPriceIdx !== -1 && row[unitPriceIdx] !== undefined && row[unitPriceIdx] !== null && row[unitPriceIdx] !== '') {
            unitPriceStr = toEnglishDigits(String(row[unitPriceIdx]));
          }
          unitPriceStr = unitPriceStr.replace(/[^0-9.]/g, '');
          let unitPrice = parseFloat(unitPriceStr) || 0;

          let totalStr = '0';
          if (totalIdx !== -1 && row[totalIdx] !== undefined && row[totalIdx] !== null && row[totalIdx] !== '') {
            totalStr = toEnglishDigits(String(row[totalIdx]));
          }
          totalStr = totalStr.replace(/[^0-9.]/g, '');
          let total = parseFloat(totalStr) || 0;

          if (unitPrice === 0 && total > 0) {
            unitPrice = quantity > 0 ? total / quantity : total;
          } else if (total === 0 && unitPrice > 0) {
            total = quantity * unitPrice;
          }

          let parsedType: 'NORMAL' | 'STARRED' | 'INVOICE' = 'NORMAL';
          if (typeIdx !== -1 && row[typeIdx] !== undefined && row[typeIdx] !== null && row[typeIdx] !== '') {
            const val = String(row[typeIdx]).trim().toLowerCase();
            if (val.includes('ستاره') || val.includes('starred') || val === '*' || val === 'star') {
              parsedType = 'STARRED';
            } else if (val.includes('فاکتور') || val.includes('invoice') || val.includes('fact')) {
              parsedType = 'INVOICE';
            }
          } else {
            // Fallback: check code or description
            const lowerCode = code.toLowerCase().trim();
            const lowerDesc = description.toLowerCase().trim();
            if (lowerCode.includes('*') || lowerCode.includes('ستاره') || lowerDesc.includes('ستاره دار') || lowerDesc.includes('ستاره‌دار')) {
              parsedType = 'STARRED';
            } else if (lowerCode.startsWith('ف') || lowerCode.startsWith('f') || lowerDesc.includes('فاکتوری') || lowerDesc.includes('فاکتور')) {
              parsedType = 'INVOICE';
            }
          }

          if (description && (code || total > 0 || unitPrice > 0)) {
            items.push({
              id: `est_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              projectId: formData.id,
              code,
              description,
              unit,
              quantity,
              unitPrice,
              total,
              status: WorkflowStatus.APPROVED_BY_EMPLOYER,
              itemType: parsedType,
              isFinalFrozen: true
            });
          }
        }

        if (items.length === 0) {
          throw new Error('هیچ ردیف معتبری استخراج نشد.');
        }

        setUploadedEstimateItems(items);
        setEstimateUploadSuccessMsg(`برآورد پیمان با ${items.length} ردیف با موفقیت بارگذاری شد.`);
        
        // Update initialBudget / baseBudget of project and auto-populate wbsScheduleMapping for Price-List contracts
        const totalBudgetSum = items.reduce((acc, item) => acc + (item.total || 0), 0);
        const baseStart = formData.startDate || '1403/01/15';
        const baseEnd = formData.endDate || '1403/12/29';
        const autoDuration = calculateShamsiDayDiff(baseStart, baseEnd) || 180;

        const autoScheduleItems: CbsMappingItem[] = items.map((item, idx) => {
          const qty = Number(item.quantity) || 1;
          const price = Number(item.unitPrice) || 0;
          const amt = Number(item.total) || (qty * price);
          const weight = totalBudgetSum > 0 ? Math.round((amt / totalBudgetSum) * 10000) / 100 : Math.round((100 / items.length) * 100) / 100;
          return {
            cbsCode: String(item.code || `0${idx + 1}`).trim(),
            description: item.description || `ردیف برآورد ${item.code}`,
            unit: item.unit || 'پروژه',
            quantity: qty,
            unitPrice: price || (qty > 0 ? amt / qty : 0),
            allocatedAmount: amt,
            weightPercent: weight,
            baselineStartDate: baseStart,
            baselineEndDate: baseEnd,
            durationDays: autoDuration
          };
        });

        setFormData(prev => ({
          ...prev,
          initialBudget: totalBudgetSum || prev.initialBudget,
          baseBudget: totalBudgetSum || prev.baseBudget,
          wbsScheduleMapping: prev.contractType === 'فهرست بهایی' ? autoScheduleItems : (prev.wbsScheduleMapping || [])
        }));

      } catch (error: any) {
        console.error("Estimate Excel Error:", error);
        alert(`خطا: ${error.message || 'مشکل در پردازش فایل برآورد'}`);
      } finally {
        setIsUploadingEstimate(false);
        if (estimateFileInputRef.current) estimateFileInputRef.current.value = '';
      }
    };

    reader.onerror = () => {
      alert('خطا در خواندن فایل از روی سیستم.');
      setIsUploadingEstimate(false);
    };

    reader.readAsArrayBuffer(file);
  };

  const handlePriceListUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setCbsUploadSuccessMsg(null);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          throw new Error("فایل اکسل خالی است.");
        }

        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Read as array of arrays to find header row manually
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

        if (!rows || rows.length === 0) throw new Error("شیت خالی است.");

        // 1. Find Header Row
        let headerIndex = -1;
        for(let i = 0; i < Math.min(rows.length, 50); i++) {
           const rowStr = rows[i].map(c => String(c).trim().toLowerCase());
           // Look for key columns: description is usually mandatory
           if (rowStr.some(c => c.includes('شرح') || c.includes('description') || c.includes('عنوان'))) {
              headerIndex = i;
              break;
           }
        }

        if (headerIndex === -1) {
           // If we can't find a header, try to assume row 0 if it has data
           if (rows[0].length >= 2) headerIndex = 0;
           else throw new Error("سطر عنوان (شامل 'شرح' یا 'Description') یافت نشد.");
        }

        const headerRow = rows[headerIndex].map(c => String(c || '').trim().toLowerCase());
        
        // 2. Map Columns with robust cleaning (stripping non-alphanumeric, e.g., q.t.y -> qty)
        const cleanStr = (s: string) => s.toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]/g, '');
        const getColIdx = (keywords: string[]) => {
          const cleanKeywords = keywords.map(cleanStr).filter(Boolean);
          return headerRow.findIndex(h => {
            const cleanH = cleanStr(h);
            if (!cleanH) return false;
            return cleanKeywords.some(k => {
              if (k === cleanH) return true;
              if (k.length > 1 && cleanH.length > 1) {
                return cleanH.includes(k) || k.includes(cleanH);
              }
              return false;
            });
          });
        };
        
        const codeIdx = getColIdx(['کد', 'code', 'شماره', 'ردیف', 'item']);
        const descIdx = getColIdx(['شرح', 'description', 'عنوان', 'موضوع']);
        const unitIdx = getColIdx(['واحد', 'unit']);
        const priceIdx = getColIdx(['بها', 'قیمت', 'price', 'amount', 'مبلغ', 'rate', 'budget', 'برآورد', 'هزینه']);
        const weightIdx = getColIdx(['وزن', 'weight', 'percent', 'درصد', 'سهم']);
        const qtyIdx = getColIdx(['مقدار', 'تعداد', 'quantity', 'qty', 'count', 'q', 'q.t.y', 'qnty', 'qnt', 'qt']);

        if (descIdx === -1) throw new Error("ستون 'شرح' در فایل اکسل شناسایی نشد.");

        // 3. Extract Data
        const items: PriceListItem[] = [];
        for(let i = headerIndex + 1; i < rows.length; i++) {
           const row = rows[i];
           if (!row || row.length === 0) continue;

           const code = codeIdx !== -1 ? String(row[codeIdx] || '') : '';
           const description = String(row[descIdx] || '').trim();
           const unit = unitIdx !== -1 ? String(row[unitIdx] || '') : '';
           
           const toEnglishDigits = (str: string): string => {
             return str
               .replace(/[۰-۹]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1776 + 48))
               .replace(/[٠-٩]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1632 + 48));
           };

           let priceStr = '0';
           if (priceIdx !== -1 && row[priceIdx] !== undefined && row[priceIdx] !== null && row[priceIdx] !== '') {
             priceStr = toEnglishDigits(String(row[priceIdx]));
           }
           // Remove thousand separators and non-numeric chars (keep dot)
           priceStr = priceStr.replace(/[^0-9.]/g, '');
           const price = parseFloat(priceStr) || 0;

           let weightStr = '0';
           if (weightIdx !== -1 && row[weightIdx] !== undefined && row[weightIdx] !== null && row[weightIdx] !== '') {
             weightStr = toEnglishDigits(String(row[weightIdx]));
           }
           weightStr = weightStr.replace(/[^0-9.]/g, '');
           const weightPercent = parseFloat(weightStr) || 0;

           let qtyStr = '1';
           if (qtyIdx !== -1 && row[qtyIdx] !== undefined && row[qtyIdx] !== null && row[qtyIdx] !== '') {
             qtyStr = toEnglishDigits(String(row[qtyIdx]));
           }
           qtyStr = qtyStr.replace(/[^0-9.]/g, '');
           const quantity = parseFloat(qtyStr) || 1;

           if (description && (code || price > 0)) {
              items.push({ code, description, unit, price, weightPercent, quantity });
           }
        }

        if (items.length === 0) {
          throw new Error('هیچ ردیف معتبری استخراج نشد.');
        }

        const targetTitle = plTitleInput.trim() || (formData.contractType === 'CBS' ? 'ساختار شکست CBS' : file.name.replace(/\.[^/.]+$/, ""));
        const targetYear = plYearInput.trim() || new Date().toLocaleDateString('fa-IR').substring(0,4);
        const newPriceList: PriceList = {
          id: `pl_${Date.now()}`,
          title: targetTitle,
          year: targetYear,
          type: formData.contractType || 'CBS',
          fileName: file.name,
          uploadDate: new Date().toLocaleDateString('fa-IR'),
          items: items,
        };
        
        setFormData(prev => {
          const updatedPriceLists = [...(prev.priceLists || []), newPriceList];
          if (prev.contractType === 'CBS') {
            // Immediately sync CBS nodes to localStorage so they are available in Technical Office
            updateCbsNodesFromProject(prev.id, updatedPriceLists);

            const mappedCbsItems: CbsMappingItem[] = items.map(item => ({
              cbsCode: item.code || '',
              description: item.description || '',
              unit: item.unit || 'پروژه',
              quantity: item.quantity !== undefined ? item.quantity : 1,
              unitPrice: item.quantity && item.quantity > 0 ? (item.price / item.quantity) : item.price,
              allocatedAmount: item.price,
              weightPercent: item.weightPercent || 0,
              baselineStartDate: '1403/01/15',
              baselineEndDate: '1403/06/30',
              durationDays: 60
            }));

            const totalBudgetSum = items.reduce((acc, item) => acc + (item.price || 0), 0);

            return {
              ...prev,
              priceLists: updatedPriceLists,
              cbsMapping: mappedCbsItems,
              initialBudget: totalBudgetSum || prev.initialBudget,
              baseBudget: totalBudgetSum || prev.baseBudget
            };
          }
          return { ...prev, priceLists: updatedPriceLists };
        });
        setExpandedPlId(newPriceList.id);
        setCbsUploadSuccessMsg(`فهرست بها/ساختار شکست "${targetTitle}" با ${items.length} ردیف با موفقیت بارگذاری شد.`);
        setPlTitleInput('');

      } catch (error: any) {
        console.error("Excel Error:", error);
        alert(`خطا: ${error.message || 'مشکل در پردازش فایل'}`);
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.onerror = () => {
      alert('خطا در خواندن فایل از روی سیستم.');
      setIsUploading(false);
    };

    reader.readAsArrayBuffer(file);
  };

  const handleLoadDefaultCBS = () => {
    const title = plTitleInput.trim() || "ساختار شکست پروژه";
    const year = plYearInput.trim() || "1403";
    
    const budget = formData.initialBudget || 10000000000; // default to 10B Rials if not set
    
    // Default CBS items with Weight Percents and computed prices
    const defaultCBSItems = [
      { code: "01", description: "تجهیز کارگاه", unit: "پروژه", weightPercent: 5, price: budget * 0.05 },
      { code: "02", description: "عملیات تخریب و خاکبرداری", unit: "مترمکعب", weightPercent: 10, price: budget * 0.10 },
      { code: "03", description: "اجرای فونداسیون و بتن‌ریزی", unit: "مترمکعب", weightPercent: 20, price: budget * 0.20 },
      { code: "04", description: "اجرای اسکلت فلزی/بتنی", unit: "کیلوگرم/مترمکعب", weightPercent: 25, price: budget * 0.25 },
      { code: "05", description: "سفت‌کاری و دیوارچینی", unit: "مترمربع", weightPercent: 15, price: budget * 0.15 },
      { code: "06", description: "نازک‌کاری و نصب درب و پنجره‌ها", unit: "مترمربع", weightPercent: 15, price: budget * 0.15 },
      { code: "07", description: "تاسیسات مکانیکی و برقی", unit: "شعله/متر", weightPercent: 8, price: budget * 0.08 },
      { code: "08", description: "برچیدن کارگاه", unit: "پروژه", weightPercent: 2, price: budget * 0.02 },
    ];

    const newCBSList: PriceList = {
      id: `cbs_${Date.now()}`,
      title: title,
      year: year,
      type: formData.contractType,
      fileName: `ساختار_شکست_${title.replace(/\s+/g, '_')}.xlsx`,
      uploadDate: new Date().toLocaleDateString('fa-IR'),
      items: defaultCBSItems,
    };

    const mappedCbsItems: CbsMappingItem[] = defaultCBSItems.map(item => ({
      cbsCode: item.code,
      description: item.description,
      unit: item.unit,
      quantity: 1,
      unitPrice: item.price,
      allocatedAmount: item.price,
      weightPercent: item.weightPercent,
      baselineStartDate: '1403/01/15',
      baselineEndDate: '1403/06/30',
      durationDays: 60
    }));

    setFormData(prev => {
      const updatedPriceLists = [...(prev.priceLists || []), newCBSList];
      if (prev.contractType === 'CBS') {
        // Immediately sync CBS nodes to localStorage so they are available in Technical Office
        updateCbsNodesFromProject(prev.id, updatedPriceLists);
        return {
          ...prev,
          priceLists: updatedPriceLists,
          cbsMapping: mappedCbsItems,
          initialBudget: budget || prev.initialBudget,
          baseBudget: budget || prev.baseBudget
        };
      }
      return { ...prev, priceLists: updatedPriceLists };
    });
    setExpandedPlId(newCBSList.id);
    setCbsUploadSuccessMsg(`ساختار شکست هزینه با عنوان "${title}" شامل ${defaultCBSItems.length} فعالیت با موفقیت ایجاد شد.`);
    setPlTitleInput('');
  };

  const handleDeletePriceList = (plId: string) => {
    setCbsUploadSuccessMsg(null);
    setFormData(prev => {
      const updatedPriceLists = (prev.priceLists || []).filter(l => l.id !== plId);
      if (prev.contractType === 'CBS') {
        updateCbsNodesFromProject(prev.id, updatedPriceLists);
      }
      return { 
        ...prev, 
        priceLists: updatedPriceLists,
        cbsMapping: updatedPriceLists.length === 0 ? [] : prev.cbsMapping
      };
    });
  };

  const handleCoeffChange = (type: 'general' | 'chapter', index: number, field: string, value: any) => {
    const list = type === 'general' ? formData.coefficients!.generalCoefficients : formData.coefficients!.chapterCoefficients;
    const updatedList = [...(list || [])];
    updatedList[index] = { ...updatedList[index], [field]: value };
    setFormData(prev => ({
      ...prev,
      coefficients: { ...prev.coefficients!, [type === 'general' ? 'generalCoefficients' : 'chapterCoefficients']: updatedList }
    }));
  };

  const addCoeff = (type: 'general' | 'chapter') => {
    const newItem = type === 'general' ? { id: `g_${Date.now()}`, name: '', value: 1 } : { id: `c_${Date.now()}`, chapterCode: '', multiplier: 1 };
    const list = type === 'general' 
      ? [...(formData.coefficients?.generalCoefficients || []), newItem as GeneralCoefficient] 
      : [...(formData.coefficients?.chapterCoefficients || []), newItem as ChapterCoefficient];
    setFormData(prev => ({ ...prev, coefficients: { ...prev.coefficients!, [type === 'general' ? 'generalCoefficients' : 'chapterCoefficients']: list } }));
  };
  
  const removeCoeff = (type: 'general' | 'chapter', id: string) => {
    const list = type === 'general' ? formData.coefficients?.generalCoefficients : formData.coefficients?.chapterCoefficients;
    const updatedList = (list || []).filter(item => item.id !== id);
    setFormData(prev => ({...prev, coefficients: {...prev.coefficients!, [type === 'general' ? 'generalCoefficients' : 'chapterCoefficients']: updatedList }}));
  };

// Helper to find parent by code and handle 1.00 / 1.0 conventions
const findParentIdByCode = (code: string, codeToIdMap: Record<string, string>) => {
  if (!code || !code.includes('.')) return null;
  const parts = code.split('.');
  const standardParentCode = parts.slice(0, -1).join('.');
  
  // 1. Try standard (1.01 -> 1)
  if (codeToIdMap[standardParentCode]) return codeToIdMap[standardParentCode];
  
  // 2. Try header (1.01 -> 1.00 or 1.0)
  const header00 = standardParentCode + '.00';
  if (codeToIdMap[header00] && header00 !== code) return codeToIdMap[header00];
  
  const header0 = standardParentCode + '.0';
  if (codeToIdMap[header0] && header0 !== code) return codeToIdMap[header0];
  
  return null;
};

  const updateCbsNodesFromProject = (projId: string, priceLists: PriceList[]) => {
    const saved = localStorage.getItem("hamyar_cbs_nodes");
    let existingNodes: any[] = [];
    if (saved) {
      try {
        existingNodes = JSON.parse(saved);
      } catch (e) {
        existingNodes = [];
      }
    }
    const projectExistingNodes = existingNodes.filter((n: any) => n.projectId === projId);
    const filteredNodes = existingNodes.filter((n: any) => n.projectId !== projId);

    const cbsPriceList = priceLists?.find(
      pl => pl.type === 'CBS' || pl.title?.includes('CBS') || pl.title?.includes('ساختار شکست') || pl.title?.includes('ساختار')
    );

    if (!cbsPriceList || !cbsPriceList.items || cbsPriceList.items.length === 0) {
      localStorage.setItem("hamyar_cbs_nodes", JSON.stringify(filteredNodes));

      // Root purge of estimates in hamyar_estimates for this project
      try {
        const storedEst = JSON.parse(localStorage.getItem('hamyar_estimates') || '[]');
        if (Array.isArray(storedEst)) {
          const cleanEst = storedEst.filter((e: any) => String(e.projectId || '').trim() !== String(projId).trim());
          localStorage.setItem('hamyar_estimates', JSON.stringify(cleanEst));
        }
      } catch (err) {}

      // Root purge of cbsMapping in hamyar_cbs_contracts for this project
      try {
        const storedContracts = JSON.parse(localStorage.getItem('hamyar_cbs_contracts') || '[]');
        if (Array.isArray(storedContracts)) {
          const updatedContracts = storedContracts.map((c: any) => {
            if (String(c.projectId || '').trim() === String(projId).trim()) {
              return { ...c, cbsMapping: [] };
            }
            return c;
          });
          localStorage.setItem('hamyar_cbs_contracts', JSON.stringify(updatedContracts));
        }
      } catch (err) {}

      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('cbs-nodes-updated', { detail: { projectId: projId } }));
      window.dispatchEvent(new CustomEvent('estimates-updated', { detail: { projectId: projId } }));
      window.dispatchEvent(new CustomEvent('cbs-contracts-updated', { detail: { projectId: projId } }));
      return;
    }

    const items = cbsPriceList.items;
    const sortedItems = [...items].sort((a, b) => {
      const codeA = a.code || "";
      const codeB = b.code || "";
      return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' });
    });

    const codeToIdMap: Record<string, string> = {};
    const idToLevelMap: Record<string, number> = {};

    // First pass: populate ID map from existing nodes to preserve stable IDs
    sortedItems.forEach((item, index) => {
      const code = item.code || "";
      const existing = projectExistingNodes.find((n: any) => n.code === code);
      if (existing) {
        codeToIdMap[code] = existing.id;
        idToLevelMap[existing.id] = existing.level || 0;
      } else {
        const id = `node_auto_${projId}_${code.replace(/\./g, '_')}_${Date.now()}_${index}`;
        codeToIdMap[code] = id;
      }
    });

    const autoNodes = sortedItems.map((item, index) => {
      const code = item.code || "";
      const existing = projectExistingNodes.find((n: any) => n.code === code);
      
      const parentId = findParentIdByCode(code, codeToIdMap);
      const level = parentId ? (idToLevelMap[parentId] + 1) : 0;
      
      const budget = item.price || 0;
      const weightPercent = item.weightPercent || 0;

      if (existing) {
        idToLevelMap[existing.id] = level;
        return {
          ...existing,
          title: item.description || existing.title,
          description: item.description || existing.description || "",
          parentId,
          level,
          budget: budget,
          weightPercent: weightPercent,
          unit: item.unit || existing.unit || "پروژه",
          quantity: item.quantity !== undefined ? item.quantity : existing.quantity !== undefined ? existing.quantity : 1,
          unitPrice: (item.quantity && item.quantity > 0) ? (budget / item.quantity) : existing.unitPrice || budget,
        };
      }

      const id = codeToIdMap[code];
      idToLevelMap[id] = level;
      
      return {
        id,
        projectId: projId,
        code,
        title: item.description || `فعالیت ${code}`,
        description: item.description || "",
        parentId,
        level,
        sortOrder: (index + 1) * 10,
        isActive: true,
        status: "ACTIVE" as const,
        weightPercent: weightPercent,
        budget: budget,
        unit: item.unit || "پروژه",
        quantity: item.quantity !== undefined ? item.quantity : 1,
        unitPrice: (item.quantity && item.quantity > 0) ? (budget / item.quantity) : budget,
        responsibleUser: "مدیر پروژه",
        notes: [],
        attachments: [],
        auditLogs: [{
          id: `log_auto_${Date.now()}_${index}`,
          user: "سیستم",
          action: "بارگذاری خودکار",
          details: "بارگذاری خودکار ساختار شکست ثبت شده از مشخصات پروژه",
          date: new Date().toLocaleDateString('fa-IR')
        }]
      };
    });

    const merged = [...filteredNodes, ...autoNodes];
    localStorage.setItem("hamyar_cbs_nodes", JSON.stringify(merged));
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new CustomEvent('cbs-nodes-updated', { detail: { projectId: projId } }));
    window.dispatchEvent(new CustomEvent('estimates-updated', { detail: { projectId: projId } }));
    window.dispatchEvent(new CustomEvent('cbs-contracts-updated', { detail: { projectId: projId } }));
    window.dispatchEvent(new CustomEvent('wbs-updated', { detail: { projectId: projId } }));
  };

  const handleDownloadSampleExcel = () => {
    try {
      const data = [
        { "کد فعالیت (WBS/CBS Code)": "01", "شرح فعالیت (Activity Title)": "تجهیز کارگاه تفصیلی", "واحد سنجش (Unit)": "پروژه", "مقدار (Quantity)": 1, "درصد وزن فیزیکی (Weight Percent)": 5, "برآورد هزینه مبنا - ریال (Budget - Rials)": 4000000000 },
        { "کد فعالیت (WBS/CBS Code)": "01.01", "شرح فعالیت (Activity Title)": "احداث دفاتر کارگاهی و فنس‌کشی", "واحد سنجش (Unit)": "مترمربع", "مقدار (Quantity)": 250, "درصد وزن فیزیکی (Weight Percent)": 3, "برآورد هزینه مبنا - ریال (Budget - Rials)": 2400000000 },
        { "کد فعالیت (WBS/CBS Code)": "01.02", "شرح فعالیت (Activity Title)": "پاکسازی نهایی و برچیدن کارگاه", "واحد سنجش (Unit)": "پروژه", "مقدار (Quantity)": 1, "درصد وزن فیزیکی (Weight Percent)": 2, "برآورد هزینه مبنا - ریال (Budget - Rials)": 1600000000 },
        { "کد فعالیت (WBS/CBS Code)": "02", "شرح فعالیت (Activity Title)": "عملیات اسکلت و سازه اصلی بتنی", "واحد سنجش (Unit)": "مترمکعب", "مقدار (Quantity)": 1200, "درصد وزن فیزیکی (Weight Percent)": 50, "برآورد هزینه مبنا - ریال (Budget - Rials)": 40000000000 },
        { "کد فعالیت (WBS/CBS Code)": "02.01", "شرح فعالیت (Activity Title)": "خاکبرداری، پی‌کنی و فونداسیون سازه‌ای", "واحد سنجش (Unit)": "مترمکعب", "مقدار (Quantity)": 450, "درصد وزن فیزیکی (Weight Percent)": 15, "برآورد هزینه مبنا - ریال (Budget - Rials)": 12000000000 }
      ];

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "قالب استاندارد CBS");
      
      worksheet['!cols'] = [
        { wch: 25 },
        { wch: 45 },
        { wch: 15 },
        { wch: 15 },
        { wch: 25 },
        { wch: 35 }
      ];

      XLSX.writeFile(workbook, "CBS_Standard_Template.xlsx");
    } catch (err: any) {
      alert(`خطا در ایجاد فایل نمونه: ${err.message}`);
    }
  };

  const handleDownloadWbsScheduleTemplate = () => {
    try {
      const isPriceList = formData.contractType === 'فهرست بهایی';
      
      if (isPriceList) {
        // Fetch existing estimates from uploadedEstimateItems or localStorage
        const existingEstimatesRaw = localStorage.getItem('hamyar_estimates');
        let allEstimates: any[] = [];
        if (existingEstimatesRaw) {
          try {
            allEstimates = JSON.parse(existingEstimatesRaw);
          } catch (e) {
            allEstimates = [];
          }
        }
        
        const projectEstimates = [
          ...uploadedEstimateItems,
          ...allEstimates.filter((e: any) => String(e.projectId).trim() === String(formData.id).trim())
        ];

        const uniqueEstimatesMap = new Map<string, any>();
        projectEstimates.forEach(e => {
          const code = String(e.code || e.itemCode || '').trim();
          if (code && !uniqueEstimatesMap.has(code)) {
            uniqueEstimatesMap.set(code, e);
          }
        });
        const uniqueEstimates = Array.from(uniqueEstimatesMap.values());

        let priceListRows: any[] = [];

        if (uniqueEstimates.length > 0) {
          const totalBudget = uniqueEstimates.reduce((acc, item) => {
            const qty = Number(item.quantity) || 1;
            const price = Number(item.unitPrice) || 0;
            const amt = Number(item.totalPrice) || Number(item.total) || (qty * price);
            return acc + amt;
          }, 0);

          const baseStart = formData.startDate || '1403/01/15';
          const baseEnd = formData.endDate || '1403/12/29';
          const autoDays = calculateShamsiDayDiff(baseStart, baseEnd) || 180;

          priceListRows = uniqueEstimates.map((item, idx) => {
            const qty = Number(item.quantity) || 1;
            const price = Number(item.unitPrice) || 0;
            const amt = Number(item.totalPrice) || Number(item.total) || (qty * price);
            const weight = totalBudget > 0 ? Math.round((amt / totalBudget) * 10000) / 100 : Math.round((100 / uniqueEstimates.length) * 100) / 100;
            
            // Check existing dates if already set in wbsScheduleMapping
            const existingRow = (formData.wbsScheduleMapping || []).find(w => String(w.cbsCode).trim() === String(item.code || item.itemCode).trim());
            const startDate = existingRow?.baselineStartDate || baseStart;
            const endDate = existingRow?.baselineEndDate || baseEnd;
            const duration = calculateShamsiDayDiff(startDate, endDate) || autoDays;

            return {
              "ردیف": idx + 1,
              "کد ردیف": String(item.code || item.itemCode || `0${idx + 1}`).trim(),
              "شرح فعالیت / ردیف برآورد": item.description || item.title || `ردیف برآورد ${item.code}`,
              "واحد": item.unit || 'پروژه',
              "حجم برآورد": qty,
              "بهای واحد (ریال)": price,
              "بهای کل برآورد (ریال)": amt,
              "وزن فیزیکی (٪)": weight,
              "تاریخ شروع مبنا": startDate,
              "تاریخ پایان مبنا": endDate,
              "مدت اجرای مبنا (روز)": duration
            };
          });
        } else {
          // Standard sample price list rows
          priceListRows = [
            {
              "ردیف": 1,
              "کد ردیف": "01",
              "شرح فعالیت / ردیف برآورد": "فصل اول - عملیات تخریب، بوته‌کنی و آماده‌سازی بستر",
              "واحد": "مترمکعب",
              "حجم برآورد": 1500,
              "بهای واحد (ریال)": 850000,
              "بهای کل برآورد (ریال)": 1275000000,
              "وزن فیزیکی (٪)": 5,
              "تاریخ شروع مبنا": "1403/01/15",
              "تاریخ پایان مبنا": "1403/02/15",
              "مدت اجرای مبنا (روز)": 31
            },
            {
              "ردیف": 2,
              "کد ردیف": "02",
              "شرح فعالیت / ردیف برآورد": "فصل دوم - عملیات خاکی، پی‌کنی، گودبرداری و خاکریزی",
              "واحد": "مترمکعب",
              "حجم برآورد": 12000,
              "بهای واحد (ریال)": 650000,
              "بهای کل برآورد (ریال)": 7800000000,
              "وزن فیزیکی (٪)": 15,
              "تاریخ شروع مبنا": "1403/02/16",
              "تاریخ پایان مبنا": "1403/04/15",
              "مدت اجرای مبنا (روز)": 60
            },
            {
              "ردیف": 3,
              "کد ردیف": "03",
              "شرح فعالیت / ردیف برآورد": "فصل سوم - قالب‌بندی چوبی و فلزی سازه و فونداسیون",
              "واحد": "مترمربع",
              "حجم برآورد": 4500,
              "بهای واحد (ریال)": 1800000,
              "بهای کل برآورد (ریال)": 8100000000,
              "وزن فیزیکی (٪)": 12,
              "تاریخ شروع مبنا": "1403/03/01",
              "تاریخ پایان مبنا": "1403/06/30",
              "مدت اجرای مبنا (روز)": 122
            },
            {
              "ردیف": 4,
              "کد ردیف": "04",
              "شرح فعالیت / ردیف برآورد": "فصل چهارم - آرماتوربندی، تهیه و برش میلگردها",
              "واحد": "کیلوگرم",
              "حجم برآورد": 95000,
              "بهای واحد (ریال)": 480000,
              "بهای کل برآورد (ریال)": 45600000000,
              "وزن فیزیکی (٪)": 28,
              "تاریخ شروع مبنا": "1403/03/15",
              "تاریخ پایان مبنا": "1403/07/30",
              "مدت اجرای مبنا (روز)": 138
            },
            {
              "ردیف": 5,
              "کد ردیف": "08",
              "شرح فعالیت / ردیف برآورد": "فصل هشتم - بتن درجا، عیار ۳۵۰ و ۴۰۰ کیلوگرم در مترمکعب",
              "واحد": "مترمکعب",
              "حجم برآورد": 2800,
              "بهای واحد (ریال)": 4200000,
              "بهای کل برآورد (ریال)": 11760000000,
              "وزن فیزیکی (٪)": 22,
              "تاریخ شروع مبنا": "1403/04/01",
              "تاریخ پایان مبنا": "1403/09/30",
              "مدت اجرای مبنا (روز)": 183
            },
            {
              "ردیف": 6,
              "کد ردیف": "11",
              "شرح فعالیت / ردیف برآورد": "فصل یازدهم - کارهای بنایی، دیوارچینی و تیغه‌کشی",
              "واحد": "مترمربع",
              "حجم برآورد": 3200,
              "بهای واحد (ریال)": 1200000,
              "بهای کل برآورد (ریال)": 3840000000,
              "وزن فیزیکی (٪)": 8,
              "تاریخ شروع مبنا": "1403/07/01",
              "تاریخ پایان مبنا": "1403/11/30",
              "مدت اجرای مبنا (روز)": 150
            },
            {
              "ردیف": 7,
              "کد ردیف": "28",
              "شرح فعالیت / ردیف برآورد": "فصل بیست و هشتم - تجهیز و برچیدن کارگاه",
              "واحد": "پروژه",
              "حجم برآورد": 1,
              "بهای واحد (ریال)": 4500000000,
              "بهای کل برآورد (ریال)": 4500000000,
              "وزن فیزیکی (٪)": 10,
              "تاریخ شروع مبنا": "1403/01/15",
              "تاریخ پایان مبنا": "1403/12/29",
              "مدت اجرای مبنا (روز)": 349
            }
          ];
        }

        const worksheet = XLSX.utils.json_to_sheet(priceListRows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "برنامه_زمانبندی_برآورد");
        worksheet['!cols'] = [
          { wch: 8 },
          { wch: 20 },
          { wch: 55 },
          { wch: 15 },
          { wch: 18 },
          { wch: 22 },
          { wch: 25 },
          { wch: 18 },
          { wch: 20 },
          { wch: 20 },
          { wch: 22 }
        ];
        XLSX.writeFile(workbook, "PriceList_Estimate_Schedule_Template.xlsx");
      } else {
        const sampleRows = [
          {
            "کد فعالیت (WBS Code)": "01",
            "شرح فعالیت (Activity Description)": "تجهیز کارگاه و بسترسازی اولیه",
            "واحد سنجش (Unit)": "پروژه",
            "حجم کار (Quantity)": 1,
            "درصد وزن فیزیکی (Weight Percent)": 10,
            "تاریخ شروع مبنا (Baseline Start Date)": "1403/01/15",
            "تاریخ پایان مبنا (Baseline End Date)": "1403/03/15",
            "مدت اجرای مبنا - روز (Duration Days)": 60
          },
          {
            "کد فعالیت (WBS Code)": "01.01",
            "شرح فعالیت (Activity Description)": "احداث ساختمان‌های موقت کارگاهی",
            "واحد سنجش (Unit)": "مترمربع",
            "حجم کار (Quantity)": 300,
            "درصد وزن فیزیکی (Weight Percent)": 6,
            "تاریخ شروع مبنا (Baseline Start Date)": "1403/01/15",
            "تاریخ پایان مبنا (Baseline End Date)": "1403/02/15",
            "مدت اجرای مبنا - روز (Duration Days)": 30
          },
          {
            "کد فعالیت (WBS Code)": "02",
            "شرح فعالیت (Activity Description)": "عملیات خاکبرداری و تحکیم بستر",
            "واحد سنجش (Unit)": "مترمکعب",
            "حجم کار (Quantity)": 15000,
            "درصد وزن فیزیکی (Weight Percent)": 30,
            "تاریخ شروع مبنا (Baseline Start Date)": "1403/02/16",
            "تاریخ پایان مبنا (Baseline End Date)": "1403/06/15",
            "مدت اجرای مبنا - روز (Duration Days)": 120
          },
          {
            "کد فعالیت (WBS Code)": "03",
            "شرح فعالیت (Activity Description)": "کارهای سیویل و بتن‌ریزی سازه‌ها",
            "واحد سنجش (Unit)": "مترمکعب",
            "حجم کار (Quantity)": 4000,
            "درصد وزن فیزیکی (Weight Percent)": 42,
            "تاریخ شروع مبنا (Baseline Start Date)": "1403/05/01",
            "تاریخ پایان مبنا (Baseline End Date)": "1403/11/30",
            "مدت اجرای مبنا - روز (Duration Days)": 210
          },
          {
            "کد فعالیت (WBS Code)": "04",
            "شرح فعالیت (Activity Description)": "نصب تجهیزات مکانیکی و تست برقی",
            "واحد سنجش (Unit)": "دستگاه",
            "حجم کار (Quantity)": 20,
            "درصد وزن فیزیکی (Weight Percent)": 12,
            "تاریخ شروع مبنا (Baseline Start Date)": "1403/10/01",
            "تاریخ پایان مبنا (Baseline End Date)": "1404/01/30",
            "مدت اجرای مبنا - روز (Duration Days)": 120
          }
        ];
        const worksheet = XLSX.utils.json_to_sheet(sampleRows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "WBS_Baseline_Schedule");
        worksheet['!cols'] = [
          { wch: 20 },
          { wch: 45 },
          { wch: 15 },
          { wch: 15 },
          { wch: 22 },
          { wch: 22 },
          { wch: 22 },
          { wch: 22 }
        ];
        XLSX.writeFile(workbook, "Project_WBS_Baseline_Schedule_Template.xlsx");
      }
    } catch (err: any) {
      alert(`خطا در ایجاد قالب اکسل: ${err.message}`);
    }
  };

  const handleGenerateScheduleFromEstimates = () => {
    try {
      const existingEstimatesRaw = localStorage.getItem('hamyar_estimates');
      let allEstimates: any[] = [];
      if (existingEstimatesRaw) {
        try {
          allEstimates = JSON.parse(existingEstimatesRaw);
        } catch (e) {
          allEstimates = [];
        }
      }
      
      const projectEstimates = [
        ...uploadedEstimateItems,
        ...allEstimates.filter((e: any) => String(e.projectId).trim() === String(formData.id).trim())
      ];

      const uniqueEstimatesMap = new Map<string, any>();
      projectEstimates.forEach(e => {
        const code = String(e.code || e.itemCode || '').trim();
        if (code && !uniqueEstimatesMap.has(code)) {
          uniqueEstimatesMap.set(code, e);
        }
      });
      const uniqueEstimates = Array.from(uniqueEstimatesMap.values());

      if (uniqueEstimates.length === 0) {
        alert('هیچ ردیف برآوردی برای این پروژه در تب «آپلود برآورد پیمان» یا دفتر فنی یافت نشد. لطفاً ابتدا فایل برآورد پیمان را آپلود نمایید یا از فایل اکسل برنامه زمان‌بندی استفاده فرمایید.');
        return;
      }

      const totalBudget = uniqueEstimates.reduce((acc, item) => {
        const qty = Number(item.quantity) || 1;
        const price = Number(item.unitPrice) || 0;
        const amt = Number(item.totalPrice) || Number(item.total) || (qty * price);
        return acc + amt;
      }, 0);

      const baseStart = formData.startDate || '1403/01/15';
      const baseEnd = formData.endDate || '1403/12/29';
      const autoDays = calculateShamsiDayDiff(baseStart, baseEnd) || 180;

      const generatedSchedule: CbsMappingItem[] = uniqueEstimates.map((item, idx) => {
        const qty = Number(item.quantity) || 1;
        const price = Number(item.unitPrice) || 0;
        const amt = Number(item.totalPrice) || Number(item.total) || (qty * price);
        const weight = totalBudget > 0 ? Math.round((amt / totalBudget) * 10000) / 100 : Math.round((100 / uniqueEstimates.length) * 100) / 100;
        
        // Preserve existing dates if already set
        const existing = (formData.wbsScheduleMapping || []).find(w => String(w.cbsCode).trim() === String(item.code || item.itemCode).trim());
        const sDate = existing?.baselineStartDate || baseStart;
        const eDate = existing?.baselineEndDate || baseEnd;
        const dur = calculateShamsiDayDiff(sDate, eDate) || autoDays;

        return {
          cbsCode: String(item.code || item.itemCode || `0${idx + 1}`).trim(),
          description: item.description || item.title || `ردیف برآورد ${item.code}`,
          unit: item.unit || 'پروژه',
          quantity: qty,
          unitPrice: price || (qty > 0 ? amt / qty : 0),
          allocatedAmount: amt,
          weightPercent: weight,
          baselineStartDate: sDate,
          baselineEndDate: eDate,
          durationDays: dur
        };
      });

      setFormData(prev => ({
        ...prev,
        wbsScheduleMapping: generatedSchedule
      }));

      setWbsUploadSuccessMsg(`تعداد ${generatedSchedule.length} ردیف فعالیت زمان‌بندی دقیقاً مطابق فایل برآورد پیمان همراه با محاسبه خودکار اوزان فیزیکی و مدت زمان استخراج گردید.`);
    } catch (err: any) {
      alert(`خطا در استخراج زمان‌بندی از برآورد: ${err.message}`);
    }
  };

  const handleDownloadEstimateTemplate = () => {
    try {
      const sampleRows = [
        {
          "کد آیتم (Item Code)": "010101",
          "شرح ردیف (Item Description)": "عملیات تخریب بتن غیر مسلح با وسایل دستی",
          "واحد سنجش (Unit)": "مترمکعب",
          "مقدار (Quantity)": 150,
          "بهای واحد (Unit Price - Rials)": 850000,
          "بهای کل (Total Price - Rials)": 127500000,
          "نوع آیتم (Item Type - اختیاری)": "NORMAL"
        },
        {
          "کد آیتم (Item Code)": "170501*",
          "شرح ردیف (Item Description)": "تهیه و نصب شیرآلات برنجی سایز متوسط (ستاره‌دار)",
          "واحد سنجش (Unit)": "عدد",
          "مقدار (Quantity)": 45,
          "بهای واحد (Unit Price - Rials)": 1800000,
          "بهای کل (Total Price - Rials)": 81000000,
          "نوع آیتم (Item Type - اختیاری)": "STARRED"
        },
        {
          "کد آیتم (Item Code)": "F-02",
          "شرح ردیف (Item Description)": "خرید ورق ژئوممبران خارجی از بازار طبق فاکتور",
          "واحد سنجش (Unit)": "مترمربع",
          "مقدار (Quantity)": 1200,
          "بهای واحد (Unit Price - Rials)": 350000,
          "بهای کل (Total Price - Rials)": 420000000,
          "نوع آیتم (Item Type - اختیاری)": "INVOICE"
        },
        {
          "کد آیتم (Item Code)": "030101",
          "شرح ردیف (Item Description)": "تهیه و اجرای بتن با عیار ۱۵۰ کیلوگرم سیمان در مترمکعب بستر",
          "واحد سنجش (Unit)": "مترمکعب",
          "مقدار (Quantity)": 450,
          "بهای واحد (Unit Price - Rials)": 2850000,
          "بهای کل (Total Price - Rials)": 1282500000,
          "نوع آیتم (Item Type - اختیاری)": "معمولی"
        },
        {
          "کد آیتم (Item Code)": "030102*",
          "شرح ردیف (Item Description)": "تهیه، حمل و ریختن بتن با عیار ۳۵۰ کیلوگرم ستاره‌دار",
          "واحد سنجش (Unit)": "مترمکعب",
          "مقدار (Quantity)": 1200,
          "بهای واحد (Unit Price - Rials)": 4900000,
          "بهای کل (Total Price - Rials)": 5880000000,
          "نوع آیتم (Item Type - اختیاری)": "ستاره دار"
        }
      ];
      const worksheet = XLSX.utils.json_to_sheet(sampleRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "برآورد پیمان");
      worksheet['!cols'] = [
        { wch: 20 },
        { wch: 60 },
        { wch: 15 },
        { wch: 15 },
        { wch: 25 },
        { wch: 30 },
        { wch: 25 }
      ];
      XLSX.writeFile(workbook, "Contract_Estimate_Template.xlsx");
    } catch (err: any) {
      alert(`خطا در ایجاد قالب اکسل برآورد: ${err.message}`);
    }
  };

  const handleUploadWbsScheduleExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setWbsUploadSuccessMsg(null);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        if (!workbook.SheetNames || workbook.SheetNames.length === 0) throw new Error("فایل اکسل تهی است.");
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        if (!rows || rows.length === 0) throw new Error("شیت اکسل خالی است.");

        let headerIdx = -1;
        for (let i = 0; i < Math.min(rows.length, 50); i++) {
          const rowStr = (rows[i] || []).map(cell => String(cell || '').trim().toLowerCase()).join(' ');
          if (
            rowStr.includes('wbs') ||
            rowStr.includes('cbs') ||
            rowStr.includes('کد') ||
            rowStr.includes('شرح') ||
            rowStr.includes('عنوان') ||
            rowStr.includes('فعالیت') ||
            rowStr.includes('شروع') ||
            rowStr.includes('پایان') ||
            rowStr.includes('فصل') ||
            rowStr.includes('آیتم')
          ) {
            headerIdx = i;
            break;
          }
        }
        if (headerIdx === -1) headerIdx = 0;

        const headerRow = (rows[headerIdx] || []).map(cell => String(cell || '').trim().toLowerCase());
        const findCol = (terms: string[], excludeTerms?: string[]) => {
          return headerRow.findIndex(h => 
            terms.some(t => h.includes(t.toLowerCase())) &&
            !(excludeTerms && excludeTerms.some(e => h.includes(e.toLowerCase())))
          );
        };

        const codeCol = findCol(['کد', 'wbs', 'cbs', 'شماره', 'ردیف', 'فصل', 'آیتم', 'بند', 'code', 'item'], ['شرح', 'description', 'title', 'عنوان']);
        const descCol = findCol(['شرح', 'عنوان', 'فعالیت', 'توضیحات', 'عملیات', 'عمليات', 'موضوع', 'بسته', 'description', 'title', 'name', 'activity'], ['کد', 'code']);
        const unitCol = findCol(['واحد', 'unit', 'سنجش']);
        const qtyCol = findCol(['حجم', 'مقدار', 'تعداد', 'مقادیر', 'quantity', 'qty', 'count']);
        const priceCol = findCol(['قیمت واحد', 'بهای واحد', 'نرخ', 'فی', 'unit price', 'unitprice', 'rate'], ['کل', 'مبلغ کل', 'جمع']);
        const budgetCol = findCol(['مبلغ کل', 'قیمت کل', 'برآورد', 'هزینه', 'مبلغ برآورد', 'مبلغ', 'جمع کل', 'budget', 'total', 'amount'], ['قیمت واحد', 'بهای واحد', 'فی', 'نرخ']);
        const weightCol = findCol(['وزن', 'درصد', 'ضریب', 'وزنی', 'وزن فیزیکی', 'سهم', 'weight', 'percent']);
        const startCol = findCol(['شروع', 'آغاز', 'تاریخ شروع', 'تاریخ آغاز', 'start', 'startdate']);
        const endCol = findCol(['پایان', 'خاتمه', 'تاریخ پایان', 'تاریخ خاتمه', 'end', 'enddate']);
        const durCol = findCol(['مدت', 'روز', 'زمان', 'duration', 'days']);

        const toEnglishDigits = (str: string): string => {
          return str
            .replace(/[۰-۹]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1776 + 48))
            .replace(/[٠-٩]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1632 + 48));
        };

        const parseNum = (val: any, defaultVal: number = 0): number => {
          if (val === undefined || val === null || val === '') return defaultVal;
          if (typeof val === 'number') return isNaN(val) ? defaultVal : val;
          const cleaned = toEnglishDigits(String(val)).replace(/,/g, '').replace(/[^0-9.-]/g, '');
          const parsed = parseFloat(cleaned);
          return isNaN(parsed) ? defaultVal : parsed;
        };

        // Extract raw rows from uploaded excel
        const rawExcelRows: Array<{
          code: string;
          desc: string;
          unit: string;
          qty: number;
          unitPrice: number;
          budget: number;
          weight: number;
          startDate: string;
          endDate: string;
          duration: number;
        }> = [];

        for (let i = headerIdx + 1; i < rows.length; i++) {
          const r = rows[i];
          if (!r || r.length === 0) continue;

          // Skip if empty row
          const hasData = r.some((c: any) => c !== undefined && c !== null && String(c).trim() !== '');
          if (!hasData) continue;

          const code = codeCol !== -1 ? String(r[codeCol] || '').trim() : '';
          const desc = descCol !== -1 ? String(r[descCol] || '').trim() : '';
          const startVal = startCol !== -1 ? String(r[startCol] || '').trim() : '';
          const endVal = endCol !== -1 ? String(r[endCol] || '').trim() : '';
          
          if (!code && !desc && !startVal && !endVal) continue;

          const unit = unitCol !== -1 ? String(r[unitCol] || '').trim() : 'پروژه';
          const qty = qtyCol !== -1 ? parseNum(r[qtyCol], 1) : 1;
          const unitPrice = priceCol !== -1 ? parseNum(r[priceCol], 0) : 0;
          let budget = budgetCol !== -1 ? parseNum(r[budgetCol], 0) : 0;
          if (budget === 0 && unitPrice > 0) budget = qty * unitPrice;
          const weight = weightCol !== -1 ? parseNum(r[weightCol], 0) : 0;
          const startDate = startVal ? formatShamsiDate(startVal) : '';
          const endDate = endVal ? formatShamsiDate(endVal) : '';
          const duration = durCol !== -1 ? parseNum(r[durCol], 0) : 0;

          rawExcelRows.push({
            code,
            desc,
            unit,
            qty,
            unitPrice,
            budget,
            weight,
            startDate,
            endDate,
            duration
          });
        }

        if (rawExcelRows.length === 0) throw new Error("هیچ ردیف معتبری در فایل اکسل زمان‌بندی یافت نشد.");

        const baseStart = formData.startDate || '1403/01/15';
        const baseEnd = formData.endDate || '1403/12/29';
        const totalExcelBudget = rawExcelRows.reduce((acc, r) => acc + (r.budget || (r.qty * r.unitPrice) || 0), 0);

        const parsedItems: CbsMappingItem[] = rawExcelRows.map((r, idx) => {
          const code = r.code || `0${idx + 1}`;
          const desc = r.desc || `فعالیت ${code}`;
          const qty = r.qty || 1;
          const price = r.unitPrice || 0;
          let amt = r.budget || (qty * price);
          if (amt === 0 && price > 0) amt = qty * price;

          let weight = r.weight;
          if (weight <= 0 && totalExcelBudget > 0) {
            weight = Math.round((amt / totalExcelBudget) * 10000) / 100;
          } else if (weight <= 0) {
            weight = Math.round((100 / rawExcelRows.length) * 100) / 100;
          }

          const sDate = r.startDate ? formatShamsiDate(r.startDate) : baseStart;
          const eDate = r.endDate ? formatShamsiDate(r.endDate) : baseEnd;
          const dur = calculateShamsiDayDiff(sDate, eDate) || (r.duration > 0 ? r.duration : 60);

          return {
            cbsCode: code,
            description: desc,
            unit: r.unit || 'پروژه',
            quantity: qty,
            unitPrice: price || (qty > 0 ? Math.round(amt / qty) : amt),
            allocatedAmount: amt,
            weightPercent: weight,
            baselineStartDate: sDate,
            baselineEndDate: eDate,
            durationDays: dur
          };
        });

        setFormData(prev => ({
          ...prev,
          wbsScheduleMapping: parsedItems
        }));

        const targetProjId = String(formData.id || editingProject?.id || '').trim();
        const today = getTodayShamsi();

        // Convert WBS schedule mapping items to PlanningActivity items with automated planned progress
        const newPlanningActivities: PlanningActivity[] = parsedItems.map((item, idx) => {
          const sDate = item.baselineStartDate || formData.startDate || '1405/01/01';
          const eDate = item.baselineEndDate || formData.endDate || '1405/12/29';
          const dur = item.durationDays || calculateShamsiDayDiff(sDate, eDate) || 30;
          const autoPlan = calculateActivityPlannedProgress(sDate, eDate, today);
          const plannedProgress = autoPlan.plannedProgress;
          const status = plannedProgress >= 100 ? 'COMPLETED' : plannedProgress > 0 ? 'IN_PROGRESS' : 'NOT_STARTED';

          return {
            id: `act_${targetProjId || 'p'}_${item.cbsCode}_${idx}_${Date.now()}`,
            projectId: targetProjId,
            code: item.cbsCode,
            title: item.description || `فعالیت ${item.cbsCode}`,
            cbsNodeId: item.cbsCode,
            weightPercent: Number(item.weightPercent || 0),
            baselineStartDate: sDate,
            baselineEndDate: eDate,
            durationDays: dur,
            plannedProgress: plannedProgress,
            actualProgress: 0,
            isCriticalPath: false,
            status: status,
            unit: item.unit || 'پروژه',
            totalQuantity: Number(item.quantity || 1),
            unitPrice: Number(item.unitPrice || 0),
            allocatedAmount: Number(item.allocatedAmount || 0)
          };
        });

        if (targetProjId) {
          // 1. Update project in projects state and hamyar_projects
          setProjects(currentProjects => {
            const next = currentProjects.map(p => {
              if (String(p.id).trim() === targetProjId) {
                return {
                  ...p,
                  wbsScheduleMapping: parsedItems,
                  cbsMapping: parsedItems
                };
              }
              return p;
            });
            localStorage.setItem('hamyar_projects', JSON.stringify(next));
            return next;
          });

          // 2. Persist new activities to hamyar_planning_activities for this project
          try {
            const storedActs = JSON.parse(localStorage.getItem('hamyar_planning_activities') || '[]');
            const otherActs = Array.isArray(storedActs)
              ? storedActs.filter((a: any) => String(a.projectId).trim() !== targetProjId)
              : [];
            const finalActs = [...otherActs, ...newPlanningActivities];
            localStorage.setItem('hamyar_planning_activities', JSON.stringify(finalActs));
          } catch (err) {
            console.error("Error saving hamyar_planning_activities:", err);
          }

          // 3. If CBS contract, also update hamyar_cbs_nodes
          if (formData.contractType === 'CBS' || isCbs) {
            try {
              const storedNodesStr = localStorage.getItem('hamyar_cbs_nodes');
              let currentNodes: any[] = [];
              if (storedNodesStr) currentNodes = JSON.parse(storedNodesStr);
              const otherNodes = currentNodes.filter((n: any) => String(n.projectId).trim() !== targetProjId);
              const newCbsNodes = parsedItems.map((item, index) => ({
                id: `node_${targetProjId}_${index}_${Date.now()}`,
                projectId: targetProjId,
                code: item.cbsCode,
                title: item.description || `گره ${item.cbsCode}`,
                budget: item.allocatedAmount,
                weightPercent: item.weightPercent,
                unit: item.unit,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                level: item.cbsCode.includes('.') ? item.cbsCode.split('.').length : 1
              }));
              localStorage.setItem('hamyar_cbs_nodes', JSON.stringify([...otherNodes, ...newCbsNodes]));
            } catch (e) {
              console.error("Error updating hamyar_cbs_nodes:", e);
            }
          }

          // 4. Broadcast events to notify Planning module and other components instantly
          window.dispatchEvent(new Event('storage'));
          window.dispatchEvent(new CustomEvent('planning-activities-updated', {
            detail: { projectId: targetProjId, activities: newPlanningActivities }
          }));
          window.dispatchEvent(new CustomEvent('wbs-updated', {
            detail: { projectId: targetProjId, mapping: parsedItems }
          }));
          window.dispatchEvent(new CustomEvent('project-changed', {
            detail: { projectId: targetProjId }
          }));
        }

        setWbsUploadSuccessMsg(`برنامه زمان‌بندی مبنا برای ${parsedItems.length} فعالیت با موفقیت بارگذاری شد و تمامی بخش‌های کنترل و برنامه‌ریزی (WBS، نمودار گانت، شاخص‌های ارزش کسب‌شده EVM و منحنی S) به صورت اتوماتیک به‌روزرسانی شدند.`);
      } catch (err: any) {
        alert(`خطا در پردازش فایل اکسل زمان‌بندی: ${err.message}`);
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleClearWbsTable = () => {
    setIsClearWbsModalOpen(true);
  };

  const confirmClearWbsTable = () => {
    const targetProjId = String(formData.id || editingProject?.id || '').trim();

    // 1. Clear wbsScheduleMapping in formData
    setFormData(prev => ({
      ...prev,
      wbsScheduleMapping: []
    }));

    // 2. Clear in projects state & hamyar_projects
    if (targetProjId) {
      setProjects(currentProjects => {
        const next = currentProjects.map(p => String(p.id).trim() === targetProjId ? { ...p, wbsScheduleMapping: [], cbsMapping: [] } : p);
        localStorage.setItem('hamyar_projects', JSON.stringify(next));
        return next;
      });

      // 3. Clear activities in hamyar_planning_activities for this project
      try {
        const storedActs = JSON.parse(localStorage.getItem('hamyar_planning_activities') || '[]');
        if (Array.isArray(storedActs)) {
          const remainingActs = storedActs.filter((a: any) => String(a.projectId).trim() !== targetProjId);
          localStorage.setItem('hamyar_planning_activities', JSON.stringify(remainingActs));
        }
      } catch (err) {
        console.error("Error clearing planning activities:", err);
      }
    }

    // 4. Reset file input ref and UI feedback
    setWbsUploadSuccessMsg(null);
    if (wbsFileInputRef.current) {
      wbsFileInputRef.current.value = '';
    }
    setIsClearWbsModalOpen(false);

    // 5. Broadcast events to notify Planning & all modules
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new CustomEvent('planning-activities-updated', {
      detail: { projectId: targetProjId, activities: [] }
    }));
    window.dispatchEvent(new CustomEvent('wbs-updated', {
      detail: { projectId: targetProjId, mapping: [] }
    }));
    window.dispatchEvent(new CustomEvent('project-changed', {
      detail: { projectId: targetProjId }
    }));
  };

  const handleAddWbsRow = () => {
    setFormData(prev => {
      const currentMapping = prev.wbsScheduleMapping || [];
      const newCode = `0${currentMapping.length + 1}`;
      const newRow: CbsMappingItem = {
        cbsCode: newCode,
        description: 'فعالیت جدید ساختار شکست',
        unit: 'پروژه',
        quantity: 1,
        unitPrice: 1000000000,
        allocatedAmount: 1000000000,
        weightPercent: 5,
        baselineStartDate: '1403/01/15',
        baselineEndDate: '1403/03/15',
        durationDays: 60
      };
      const updated = [...currentMapping, newRow];
      return {
        ...prev,
        wbsScheduleMapping: updated
      };
    });
  };

  const handleUpdateWbsRow = (index: number, field: keyof CbsMappingItem, value: any) => {
    setFormData(prev => {
      const current = [...(prev.wbsScheduleMapping || [])];
      if (!current[index]) return prev;

      const item = { ...current[index], [field]: value };

      if (field === 'baselineStartDate' || field === 'baselineEndDate') {
        item[field] = formatShamsiDate(String(value || ''));
        item.durationDays = calculateShamsiDayDiff(item.baselineStartDate, item.baselineEndDate);
      }

      if (field === 'quantity' || field === 'unitPrice') {
        const qty = field === 'quantity' ? Number(value || 0) : Number(item.quantity || 0);
        const uPrice = field === 'unitPrice' ? Number(value || 0) : Number(item.unitPrice || 0);
        item.allocatedAmount = qty * uPrice;
      }

      current[index] = item;

      // Recalculate weights if financial numbers changed
      if (field === 'quantity' || field === 'unitPrice' || field === 'allocatedAmount') {
        const totalSum = current.reduce((acc, it) => acc + (Number(it.allocatedAmount) || 0), 0);
        if (totalSum > 0) {
          current.forEach(it => {
            const amt = Number(it.allocatedAmount) || 0;
            it.weightPercent = Math.round((amt / totalSum) * 10000) / 100;
          });
        }
      }

      return {
        ...prev,
        wbsScheduleMapping: current
      };
    });
  };

  const handleRemoveWbsRow = (index: number) => {
    setFormData(prev => {
      const current = [...(prev.wbsScheduleMapping || [])];
      const updated = current.filter((_, idx) => idx !== index);
      return {
        ...prev,
        wbsScheduleMapping: updated
      };
    });
  };

  const isEmployerPmorWS = useMemo(() => {
    if (!currentUser) return false;
    if (currentUser.role === 'SYSTEM_ADMIN') return true;
    const userOrg = SystemAdminService.getOrganization(currentUser.orgId);
    const isEmployer = userOrg?.type === 'EMPLOYER';
    const isPM = isEmployer && (currentUser.role === 'ORG_ADMIN' || currentUser.jobTitle === 'مدیر پروژه' || currentUser.jobLevel === 'مدیر پروژه' || currentUser.username === 'mostafa' || currentUser.username === 'e-pm' || currentUser.id === 'e-pm');
    const isWS = isEmployer && (currentUser.role === 'ORG_MANAGER' || currentUser.jobTitle === 'سرپرست کارگاه' || currentUser.jobLevel === 'سرپرست کارگاه' || currentUser.username === 'reza' || currentUser.id === 'reza');
    return isPM || isWS;
  }, [currentUser]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreate) {
      alert('خطا: شما دسترسی لازم برای ایجاد یا ویرایش پروژه را ندارید.');
      return;
    }

    const finalFormData: Project = {
      ...formData,
      status: formData.status || 'REGISTERED',
      createdByUserId: editingProject ? (editingProject.createdByUserId || currentUser?.id) : (currentUser?.id || 'admin'),
      createdByUsername: editingProject ? (editingProject.createdByUsername || currentUser?.username) : (currentUser?.username || 'admin'),
      createdByOrgId: editingProject ? (editingProject.createdByOrgId || currentUser?.orgId) : currentUser?.orgId,
      createdByRole: editingProject ? (editingProject.createdByRole || currentUser?.role) : currentUser?.role,
      createdByJobLevel: editingProject ? (editingProject.createdByJobLevel || currentUser?.jobLevel || currentUser?.jobTitle) : (currentUser?.jobLevel || currentUser?.jobTitle),
    };

    updateCbsNodesFromProject(finalFormData.id, finalFormData.priceLists || []);

    if (finalFormData.contractType === 'فهرست بهایی') {
      try {
        const existingEstimatesRaw = localStorage.getItem('hamyar_estimates');
        let existingEstimates: any[] = [];
        if (existingEstimatesRaw) {
          existingEstimates = JSON.parse(existingEstimatesRaw);
        }
        // Filter out existing estimates for this project to prevent duplicates
        const cleanEstimates = existingEstimates.filter((e: any) => String(e.projectId) !== String(finalFormData.id));
        
        // Map current uploadedEstimateItems with the correct finalFormData.id
        const finalEstimates = uploadedEstimateItems.map(item => ({
          ...item,
          projectId: finalFormData.id
        }));

        const mergedEstimates = [...finalEstimates, ...cleanEstimates];
        localStorage.setItem('hamyar_estimates', JSON.stringify(mergedEstimates));
        window.dispatchEvent(new Event('storage'));
      } catch (err) {
        console.error("Error saving estimates during submit:", err);
      }
    }

    if (editingProject) {
      setProjects(projects.map(p => p.id === editingProject.id ? finalFormData : p));
    } else {
      setProjects([finalFormData, ...projects]);
    }

    // Also sync WBS schedule mapping to hamyar_planning_activities if present
    if (finalFormData.wbsScheduleMapping && finalFormData.wbsScheduleMapping.length > 0) {
      try {
        const today = getTodayShamsi();
        const targetProjId = String(finalFormData.id).trim();
        const storedActs = JSON.parse(localStorage.getItem('hamyar_planning_activities') || '[]');
        const otherActs = Array.isArray(storedActs)
          ? storedActs.filter((a: any) => String(a.projectId).trim() !== targetProjId)
          : [];
        const currentActs = Array.isArray(storedActs)
          ? storedActs.filter((a: any) => String(a.projectId).trim() === targetProjId)
          : [];

        if (currentActs.length === 0) {
          const newActivities: PlanningActivity[] = finalFormData.wbsScheduleMapping.map((item, idx) => {
            const sDate = item.baselineStartDate || finalFormData.startDate || '1405/01/01';
            const eDate = item.baselineEndDate || finalFormData.endDate || '1405/12/29';
            const dur = item.durationDays || calculateShamsiDayDiff(sDate, eDate) || 30;
            const autoPlan = calculateActivityPlannedProgress(sDate, eDate, today);
            return {
              id: `act_${targetProjId}_${item.cbsCode}_${idx}_${Date.now()}`,
              projectId: targetProjId,
              code: item.cbsCode,
              title: item.description || `فعالیت ${item.cbsCode}`,
              cbsNodeId: item.cbsCode,
              weightPercent: Number(item.weightPercent || 0),
              baselineStartDate: sDate,
              baselineEndDate: eDate,
              durationDays: dur,
              plannedProgress: autoPlan.plannedProgress,
              actualProgress: 0,
              isCriticalPath: false,
              status: autoPlan.plannedProgress >= 100 ? 'COMPLETED' : autoPlan.plannedProgress > 0 ? 'IN_PROGRESS' : 'NOT_STARTED',
              unit: item.unit || 'پروژه',
              totalQuantity: Number(item.quantity || 1),
              unitPrice: Number(item.unitPrice || 0),
              allocatedAmount: Number(item.allocatedAmount || 0)
            };
          });
          localStorage.setItem('hamyar_planning_activities', JSON.stringify([...otherActs, ...newActivities]));
          window.dispatchEvent(new CustomEvent('planning-activities-updated', {
            detail: { projectId: targetProjId, activities: newActivities }
          }));
        }
      } catch (e) {
        console.error("Error syncing activities in handleSubmit:", e);
      }
    }

    try {
      SystemAdminService.saveProject({
        id: String(finalFormData.id),
        name: finalFormData.title,
        code: finalFormData.contractNumber || '',
        isActive: true,
        status: finalFormData.status || 'REGISTERED',
        employerName: finalFormData.employerName,
        consultantName: finalFormData.consultantName,
        contractorName: finalFormData.contractorName,
        createdByUsername: finalFormData.createdByUsername,
        createdByRole: finalFormData.createdByRole,
        createdByJobLevel: finalFormData.createdByJobLevel,
      });
    } catch (e) {
      console.error("Error syncing project with SystemAdminService:", e);
    }

    setIsModalOpen(false);
  };

  const handleDelete = () => {
    if (!canCreate) {
      alert('خطا: شما دسترسی لازم برای حذف پروژه را ندارید.');
      return;
    }
    if (projectToDelete) {
      setProjects(projects.filter(p => p.id !== projectToDelete));
      setIsDeleteModalOpen(false);
      setProjectToDelete(null);
    }
  };

  const displayedProjects = useMemo(() => {
    return projects.filter(p => {
      // 1. Standard project access check (already assigned by System Admin)
      if (SystemAdminService.canUserAccessProject(p.id, currentUser)) {
        return true;
      }

      // 2. Exception specifically for Contract Management ("مدیریت قراردادها"):
      // When Employer PM or Employer Workshop Supervisor registered a contract/project,
      // display it here in Contract Management for them even before System Admin assigns it!
      if (isEmployerPmorWS) {
        if (p.createdByUserId && currentUser?.id && String(p.createdByUserId) === String(currentUser.id)) {
          return true;
        }
        if (p.createdByUsername && currentUser?.username && String(p.createdByUsername) === String(currentUser.username)) {
          return true;
        }
        if (p.createdByOrgId && currentUser?.orgId && String(p.createdByOrgId) === String(currentUser.orgId)) {
          return true;
        }
        if (p.status === 'REGISTERED') {
          return true;
        }
      }

      return false;
    });
  }, [projects, currentUser, isEmployerPmorWS]);

  const isCbs = formData.contractType === 'CBS';
  const isBreakdownContract = formData.contractType === 'CBS' || formData.contractType === 'LUMP_SUM' || formData.contractType === 'COST_PLUS';
  const isPriceList = formData.contractType === 'فهرست بهایی' || !isBreakdownContract;

  const modalTabs = [
    { id: 'info', label: 'اطلاعات پایه و زمان‌بندی', icon: <Info size={18}/> },
    { id: 'stakeholders_finance', label: 'ارکان و شرایط مالی', icon: <Users size={18}/> },
    { id: 'warranties', label: 'ضمانت‌نامه‌های پیمان', icon: <ShieldCheck size={18}/> },
    { id: 'revisions', label: 'الحاقیه‌ها و تمدیدها', icon: <History size={18}/> },
    ...(formData.contractType === 'فهرست بهایی' ? [{
      id: 'wbs_schedule',
      label: 'برنامه زمان‌بندی طبق برآورد اولیه',
      icon: <FolderKanban size={18}/>
    }] : isBreakdownContract ? [{
      id: 'wbs_schedule',
      label: 'ساختار شکست WBS و زمان‌بندی اولیه',
      icon: <FolderKanban size={18}/>
    }] : []),
    { 
      id: 'structure', 
      label: isCbs 
        ? 'ساختار شکست هزینه (CBS)' 
        : formData.contractType === 'LUMP_SUM' 
          ? 'ساختار شکست مقطوع (WBS)' 
          : formData.contractType === 'COST_PLUS' 
            ? 'ساختار شکست هزینه‌های هدف' 
            : 'فهارس بهای پیمان', 
      icon: <Layers size={18}/> 
    },
    ...(formData.contractType === 'فهرست بهایی' ? [{
      id: 'estimate_upload',
      label: 'آپلود برآورد پیمان',
      icon: <FileSpreadsheet size={18}/>
    }] : []),
    ...(isCbs ? [{
      id: 'pbs',
      label: 'ساختار درختی مهندسی (PBS)',
      icon: <Network size={18}/>
    }] : []),
    ...(isCbs ? [] : [{ 
      id: 'technical', 
      label: formData.contractType === 'LUMP_SUM' 
        ? 'ضرایب و ملحقات سرجمع' 
        : formData.contractType === 'COST_PLUS' 
          ? 'حق‌العمل و درصد مدیریت' 
          : 'ضرایب پیمان', 
      icon: <Percent size={18}/> 
    }]),
    { id: 'settings', label: 'تنظیمات و تقویم پروژه', icon: <Settings size={18}/> },
    { id: 'notes_attach', label: 'یادداشت‌ها و پیوست‌ها', icon: <MessageSquare size={18}/> },
  ];

  return (
    <div className="space-y-8 pb-12 text-right" dir="rtl">
      
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 md:p-10 rounded-[2.5rem] border border-stone-200/60 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-32 h-32 bg-amber-500/5 rounded-br-[5rem] -translate-x-10 -translate-y-10"></div>
        
        <div className="flex items-center gap-6 relative z-10">
          <div className="w-16 h-16 bg-amber-500 text-stone-900 rounded-[1.5rem] flex items-center justify-center shadow-lg shadow-amber-500/20 border border-amber-500/20">
            <Building2 size={32} strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-stone-900 tracking-tight">مدیریت قراردادها</h2>
            <p className="text-stone-400 text-sm font-bold mt-2 flex items-center gap-2">
              <Layers size={14} />
              مدیریت یکپارچه پیمان‌ها، تضامین و ساختار شکست هزینه
            </p>
          </div>
        </div>

        {canCreate && (
          <button 
            onClick={() => handleOpenModal(null)} 
            className="flex items-center justify-center gap-3 bg-stone-900 text-white px-8 py-4 rounded-2xl shadow-xl shadow-stone-900/20 hover:scale-[1.02] active:scale-95 transition-all font-black text-sm relative z-10"
          >
            <Plus size={20} strokeWidth={3} />
            ثبت قرارداد جدید
          </button>
        )}
      </div>

      <div className="bg-white rounded-[2.5rem] border border-stone-200/60 shadow-sm overflow-hidden text-right">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-stone-50/50 border-b border-stone-100">
                <th className="p-6 text-xs font-black text-stone-400">کد و عنوان پروژه</th>
                <th className="p-6 text-xs font-black text-stone-400">نوع پیمان</th>
                <th className="p-6 text-xs font-black text-stone-400">ارکان پروژه</th>
                <th className="p-6 text-xs font-black text-stone-400">وضعیت</th>
                {canCreate && <th className="p-6 text-xs font-black text-stone-400 text-center">عملیات</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {displayedProjects.length === 0 ? (
                <tr>
                  <td colSpan={canCreate ? 5 : 4} className="p-8 text-center text-stone-400 font-bold">
                    شما به هیچ پروژه‌ای در این بخش دسترسی ندارید.
                  </td>
                </tr>
              ) : (
                displayedProjects.map((p) => (
                <tr key={p.id} className="hover:bg-stone-50/40 transition-colors group">
                  <td className="p-6">
                    <span className="font-black text-sm text-stone-900 block tracking-tight">{p.contractNumber || `PRJ-${p.id.toUpperCase().substring(0, 4)}`}</span>
                    <span className="text-xs text-stone-400 font-bold block mt-1.5">{p.title}</span>
                  </td>
                  <td className="p-6">
                    <span className={`px-4 py-1.5 text-[10px] font-black rounded-xl inline-block shadow-sm ${
                      p.contractType === 'CBS' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                      p.contractType === 'LUMP_SUM' ? 'bg-stone-900 text-white' :
                      p.contractType === 'COST_PLUS' ? 'bg-stone-100 text-stone-700 border border-stone-200' :
                      'bg-gold-400/10 text-stone-900 border border-gold-400/20'
                    }`}>
                      {p.contractType === 'CBS' ? 'CBS (ساختار شکست)' :
                       p.contractType === 'LUMP_SUM' ? 'سرجمع (Lump Sum)' :
                       p.contractType === 'COST_PLUS' ? 'مدیریت پیمان' :
                       'فهرست بهایی'}
                    </span>
                  </td>
                  <td className="p-6">
                    <div className="space-y-2">
                      <div className="text-[11px] text-stone-400 flex items-center gap-2 font-bold">
                        <Building2 size={14} className="text-stone-300"/> 
                        کارفرما: <span className="text-stone-700">{p.employerName}</span>
                      </div>
                      <div className="text-[11px] text-stone-400 flex items-center gap-2 font-bold">
                        <UserCircle size={14} className="text-stone-300"/> 
                        پیمانکار: <span className="text-stone-700">{p.contractorName}</span>
                      </div>
                    </div>
                  </td>
                  <td className="p-6">
                    <span className={`px-4 py-1.5 text-[10px] font-black rounded-full border shadow-sm ${
                      p.status === 'REGISTERED'
                        ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-blue-500/10'
                        : p.status === 'ACTIVE' 
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                          : p.status === 'PENDING'
                            ? 'bg-amber-50 text-amber-600 border-amber-200'
                            : p.status === 'COMPLETED'
                              ? 'bg-purple-50 text-purple-600 border-purple-200'
                              : 'bg-stone-50 text-stone-400 border-stone-200'
                    }`}>
                      {p.status === 'REGISTERED' ? 'ثبت شده' :
                       p.status === 'ACTIVE' ? 'فعال' :
                       p.status === 'PENDING' ? 'در حال تعلیق' :
                       p.status === 'COMPLETED' ? 'تکمیل شده' : 'بایگانی'}
                    </span>
                  </td>
                  {canCreate && (
                    <td className="p-6 text-center">
                      <div className="flex items-center justify-center gap-3">
                        <button 
                          onClick={() => handleOpenModal(p)} 
                          className="p-3 text-stone-400 hover:text-stone-900 hover:bg-stone-100 rounded-2xl transition-all border border-transparent hover:border-stone-200 shadow-sm hover:shadow-md" 
                          title="ویرایش پروژه"
                        >
                          <Edit3 size={18}/>
                        </button>
                        <button 
                          onClick={() => { setProjectToDelete(p.id); setIsDeleteModalOpen(true); }} 
                          className="p-3 text-red-300 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all border border-transparent hover:border-red-100 shadow-sm hover:shadow-md" 
                          title="حذف پروژه"
                        >
                          <Trash2 size={18}/>
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-md animate-fadeIn">
          <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh] text-right border border-stone-200/50">
            <div className="p-6 flex justify-between items-center border-b border-stone-100 bg-[#faf8f4] rounded-t-3xl">
              <h3 className="text-xl font-black text-stone-900">
                {editingProject ? 'ویرایش اطلاعات پروژه' : 'تعریف پروژه جدید'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-stone-400 hover:bg-stone-200 rounded-full transition-all"><X size={24}/></button>
            </div>
            
            <div className="flex flex-1 min-h-0">
              <nav className="w-64 border-l border-stone-100 p-6 space-y-2 bg-[#faf8f4]/50">
                {modalTabs.map(tab => (
                  <button 
                    key={tab.id} 
                    onClick={() => {
                      setActiveModalTab(tab.id as any);
                      setCbsUploadSuccessMsg(null);
                      setWbsUploadSuccessMsg(null);
                    }} 
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-black transition-all ${activeModalTab === tab.id ? 'bg-stone-900 text-white shadow-md' : 'text-stone-500 hover:bg-stone-100'}`}
                  >
                    {tab.icon} {tab.label}
                  </button>
                ))}
              </nav>

              <form onSubmit={handleSubmit} className="flex-1 p-8 overflow-y-auto space-y-6">
                {activeModalTab === 'info' && (
                  <div className="space-y-6 animate-fadeIn text-right" dir="rtl">
                    {formData.contractType === 'CBS' ? (
                      <div className="p-4 bg-amber-50 border border-amber-100 rounded-3xl text-right">
                        <span className="text-xs font-black text-amber-800 block mb-1">🛠️ پیکربندی مدیریت پروژه بر اساس ساختار شکست هزینه (CBS)</span>
                        <p className="text-[10px] text-stone-500 font-bold leading-relaxed">این پروژه با پیمان ساختار شکست هزینه (CBS) مدیریت می‌شود. این متدولوژی برای ابرپروژه‌های مهندسی، تدارک و ساخت (EPC)، صنعتی، نفت و گاز، فولادی و زیرساختی بسیار مناسب بوده و تمرکز آن بر پیشرفت فیزیکی مبتنی بر وزن مالی فعالیت‌هاست.</p>
                      </div>
                    ) : formData.contractType === 'LUMP_SUM' ? (
                      <div className="p-4 bg-stone-900 text-white border border-stone-900 rounded-3xl text-right">
                        <span className="text-xs font-black text-gold-400 block mb-1">🛠️ پیکربندی مدیریت پروژه بر اساس قرارداد سرجمع (Lump Sum)</span>
                        <p className="text-[10px] text-stone-300 font-bold leading-relaxed">این پروژه با قرارداد سرجمع (Lump Sum / مقطوع) مدیریت می‌شود. در این نوع پیمان، مبلغ نهایی برای انجام کل کارها ثابت بوده و پرداخت‌ها معمولاً بر اساس پیشرفت فیزیکی ساختار شکست کار (WBS) یا مایلستون‌های مصوب انجام می‌شود.</p>
                      </div>
                    ) : formData.contractType === 'COST_PLUS' ? (
                      <div className="p-4 bg-[#efe8db] border border-[#e5ded0] rounded-3xl text-right">
                        <span className="text-xs font-black text-stone-800 block mb-1">🛠️ پیکربندی مدیریت پروژه بر اساس پیمان مدیریت پیمان (Cost-Plus)</span>
                        <p className="text-[10px] text-stone-600 font-bold leading-relaxed">این پروژه با الگوی مدیریت پیمان (Cost-Plus / هزینه به علاوه کارمزد) مدیریت می‌شود. در این قراردادها هزینه‌های واقعی خرید مصالح و اجرا ردیابی شده و درصد مدیریت مصوب پیمانکار (حق‌العمل) به صورت شفاف محاسبه و پرداخت می‌گردد.</p>
                      </div>
                    ) : (
                      <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-3xl text-right">
                        <span className="text-xs font-black text-emerald-800 block mb-1">🛠️ پیکربندی مدیریت پروژه بر اساس قرارداد فهرست بهایی</span>
                        <p className="text-[10px] text-stone-500 font-bold leading-relaxed">این پروژه با پیمان فهرست بهایی سازمان برنامه و بودجه مدیریت می‌شود. این ساختار برای پروژه‌های متعارف کشور که متره، برآورد مقادیر، صورت‌وضعیت‌نویسی بر پایه ردیف‌ها و فصول فهارس بهای ابلاغی است، یا برای ارتباط با دفتر فنی، ایده‌آل می‌باشد.</p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black text-stone-400 block mb-1">عنوان قرارداد / پروژه</label>
                        <input required placeholder="مثال: احداث مجتمع اداری تجاری سپهر" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full p-3.5 bg-[#faf8f4] border border-stone-200/60 rounded-2xl text-xs font-bold text-stone-800 outline-none focus:border-gold-400"/>
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-stone-400 block mb-1">کد یونیک سیستمی</label>
                        <input placeholder="کد خودکار پروژه" value={formData.id ? `PRJ-${formData.contractType === 'CBS' ? 'CBS' : formData.contractType === 'LUMP_SUM' ? 'LS' : formData.contractType === 'COST_PLUS' ? 'CP' : 'PL'}-${formData.id.toUpperCase().substring(0, 4)}` : 'تولید خودکار در سیستم'} disabled className="w-full p-3.5 bg-stone-100 border border-stone-200/60 rounded-2xl text-xs font-bold text-stone-500 cursor-not-allowed"/>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="text-[10px] font-black text-stone-400 block mb-1">شماره قرارداد پیمان</label>
                        <input placeholder="مثال: 1403/CBS/99" value={formData.contractNumber} onChange={e => setFormData({...formData, contractNumber: e.target.value})} className="w-full p-3.5 bg-[#faf8f4] border border-stone-200/60 rounded-2xl text-xs font-bold text-stone-800 outline-none focus:border-gold-400"/>
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-stone-400 block mb-1">نوع کاربری پیمان</label>
                        <select
                          value={formData.projectType || 'EPC'}
                          onChange={e => setFormData({...formData, projectType: e.target.value})}
                          className="w-full p-3.5 bg-[#faf8f4] border border-stone-200/60 rounded-2xl text-xs font-bold text-stone-700 outline-none focus:border-gold-400"
                        >
                          <option value="EPC">طرح و ساخت (EPC)</option>
                          <option value="Industrial">پروژه صنعتی / کارخانجات</option>
                          <option value="Oil & Gas">صنایع نفت، گاز و پتروشیمی</option>
                          <option value="Steel Plant">احداث کارخانه فولاد و صنایع سنگین</option>
                          <option value="Infrastructure">پروژه‌های زیرساختی و عمرانی</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-stone-400 block mb-1">ساختار محاسباتی (نوع پیمان)</label>
                        <select
                          value={formData.contractType || 'فهرست بهایی'}
                          onChange={e => setFormData({...formData, contractType: e.target.value as any})}
                          className="w-full p-3.5 bg-[#faf8f4] border border-stone-200/60 rounded-2xl text-xs font-bold text-stone-700 outline-none focus:border-gold-400"
                        >
                          <option value="فهرست بهایی">فهرست بهایی (فهرست بها پایه)</option>
                          <option value="CBS">ساختار شکست هزینه (CBS)</option>
                          <option value="LUMP_SUM">سرجمع (Lump Sum / مقطوع)</option>
                          <option value="COST_PLUS">مدیریت پیمان (Cost-Plus)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="text-[10px] font-black text-stone-400 block mb-1">تاریخ شروع واقعی پیمان</label>
                        <ShamsiDatePicker
                          placeholder="1403/01/15"
                          value={formData.startDate}
                          onChange={val => setFormData({ ...formData, startDate: val })}
                          inputClassName="!p-3.5 !bg-[#faf8f4] !border-stone-200/60 !rounded-2xl !text-xs !font-bold !text-stone-800 !text-center focus:!border-gold-400"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-stone-400 block mb-1">تاریخ پایان اولیه پیمان</label>
                        <ShamsiDatePicker
                          placeholder="1404/07/15"
                          value={formData.endDate}
                          onChange={val => setFormData({ ...formData, endDate: val })}
                          inputClassName="!p-3.5 !bg-[#faf8f4] !border-stone-200/60 !rounded-2xl !text-xs !font-bold !text-stone-800 !text-center focus:!border-gold-400"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-stone-400 block mb-1">تاریخ تحویل زمین کارگاه</label>
                        <ShamsiDatePicker
                          placeholder="1403/01/30"
                          value={formData.siteDeliveryDate}
                          onChange={val => setFormData({ ...formData, siteDeliveryDate: val })}
                          inputClassName="!p-3.5 !bg-[#faf8f4] !border-stone-200/60 !rounded-2xl !text-xs !font-bold !text-stone-800 !text-center focus:!border-gold-400"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black text-stone-400 block mb-1">محل و موقعیت اجرای پروژه</label>
                        <div className="relative">
                          <input placeholder="مثال: تهران - کیلومتر ۱۵ جاده مخصوص کرج" value={formData.location || ''} onChange={e => setFormData({...formData, location: e.target.value})} className="w-full p-3.5 pr-10 bg-[#faf8f4] border border-stone-200/60 rounded-2xl text-xs font-bold text-stone-800 outline-none focus:border-gold-400"/>
                          <MapPin size={16} className="absolute right-3.5 top-4 text-stone-400" />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-stone-400 block mb-1">منطقه زمانی سیستم</label>
                        <div className="relative">
                          <select
                            value={formData.timezone || 'UTC+03:30 (Tehran)'}
                            onChange={e => setFormData({...formData, timezone: e.target.value})}
                            className="w-full p-3.5 pr-10 bg-[#faf8f4] border border-stone-200/60 rounded-2xl text-xs font-bold text-stone-700 outline-none focus:border-gold-400"
                          >
                            <option value="UTC+03:30 (Tehran)">تهران - UTC+03:30</option>
                            <option value="UTC+04:00 (Dubai)">دبی - UTC+04:00</option>
                            <option value="UTC+00:00 (GMT)">لندن - UTC+00:00</option>
                          </select>
                          <Globe size={16} className="absolute right-3.5 top-4 text-stone-400 pointer-events-none" />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="text-[10px] font-black text-stone-400 block mb-1">واحد پول مرجع سنجش</label>
                        <select
                          value={formData.currency || 'تومان'}
                          onChange={e => setFormData({...formData, currency: e.target.value})}
                          className="w-full p-3.5 bg-slate-50 border border-slate-200/60 rounded-2xl text-xs font-bold text-stone-700 outline-none"
                        >
                          <option value="تومان">تومان ایران (IRT)</option>
                          <option value="ریال">ریال ایران (IRR)</option>
                          <option value="USD">دلار آمریکا ($)</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-400 block mb-1">واحد اندازه‌گیری مرجع (UOM)</label>
                        <input placeholder="دستگاه/مترمکعب/مترمربع" value={formData.uom || ''} onChange={e => setFormData({...formData, uom: e.target.value})} className="w-full p-3.5 bg-slate-50 border border-slate-200/60 rounded-2xl text-xs font-bold text-stone-900"/>
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-400 block mb-1">وضعیت اجرای پروژه</label>
                        <select
                          value={formData.status || 'REGISTERED'}
                          onChange={e => setFormData({...formData, status: e.target.value as any})}
                          className="w-full p-3.5 bg-slate-50 border border-slate-200/60 rounded-2xl text-xs font-bold text-stone-700 outline-none"
                        >
                          <option value="REGISTERED">ثبت شده (REGISTERED)</option>
                          <option value="ACTIVE">فعال (ACTIVE)</option>
                          <option value="PENDING">در حال تعلیق (PENDING)</option>
                          <option value="COMPLETED">تکمیل شده (COMPLETED)</option>
                          <option value="ARCHIVED">بایگانی شده (ARCHIVED)</option>
                        </select>
                      </div>
                    </div>

                    <div className="p-6 rounded-[2rem] bg-amber-50/40 border border-amber-200/50 text-right space-y-3" dir="rtl">
                      <div className="flex items-center justify-between gap-4">
                        <div className="space-y-1 flex-1">
                          <label className="text-xs font-black text-amber-800 flex items-center gap-2">
                            🛡️ مجوز استثنایی ثبت اسناد توسط مشاور و کارفرما
                          </label>
                          <p className="text-[10px] text-stone-900 font-bold max-w-xl leading-relaxed">
                            به صورت پیش‌فرض، ثبت و ورود اطلاعات اسناد فنی (مانند ریزمتره، صورت‌جلسه، صورت‌وضعیت، مجوز کار و تعدیل) مخصوص پیمانکار است. با فعال‌سازی این مجوز اضطراری و خاص توسط بالاترین مقام کارفرما، مشاور و کارفرما نیز قادر به ثبت و ایجاد اسناد خام از صفر خواهند بود.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, allowConsultantEmployerCreation: !formData.allowConsultantEmployerCreation })}
                          className={`w-14 h-8 flex items-center rounded-full p-1 transition-all duration-300 outline-none shrink-0 ${formData.allowConsultantEmployerCreation ? 'bg-amber-600 justify-end' : 'bg-slate-300 justify-start'}`}
                        >
                          <span className="bg-white w-6 h-6 rounded-full shadow-md"></span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {activeModalTab === 'stakeholders_finance' && (
                  <div className="space-y-6 animate-fadeIn text-right" dir="rtl">
                    <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-3xl text-right">
                      <span className="text-xs font-black text-stone-700 block mb-1">👥 ارکان پیمان و شرایط مالی قرارداد</span>
                      <p className="text-[10px] text-stone-500 font-bold leading-relaxed">تعریف اطلاعات ذینفعان رسمی پروژه به همراه مفاد مالی کلیدی پیمان نظیر پیش‌پرداخت، حسن انجام کار و ثبت دقیق مبلغ پیمان که به عنوان بودجه مبنا عمل می‌کند.</p>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="text-[10px] font-black text-slate-400 block mb-1">نام سازمان کارفرما (Client)</label>
                        <input required placeholder="مثال: شرکت ملی نفت ایران" value={formData.employerName || ''} onChange={e => setFormData({...formData, employerName: e.target.value})} className="w-full p-3.5 bg-slate-50 border border-slate-200/60 rounded-2xl text-xs font-bold text-stone-900"/>
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-400 block mb-1">نام مهندسین مشاور (Consultant)</label>
                        <input placeholder="مثال: شرکت مهندسی سازه" value={formData.consultantName || ''} onChange={e => setFormData({...formData, consultantName: e.target.value})} className="w-full p-3.5 bg-slate-50 border border-slate-200/60 rounded-2xl text-xs font-bold text-stone-900"/>
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-400 block mb-1">نام شرکت پیمانکار (Contractor)</label>
                        <input required placeholder="مثال: شرکت ساختمانی البرز" value={formData.contractorName || ''} onChange={e => setFormData({...formData, contractorName: e.target.value})} className="w-full p-3.5 bg-slate-50 border border-slate-200/60 rounded-2xl text-xs font-bold text-stone-900"/>
                      </div>
                    </div>

                    <div className="p-6 bg-[#faf8f4]/20 border border-stone-100 rounded-[2rem] space-y-4">
                      <h4 className="text-xs font-black text-blue-950">💰 مدیریت مبالغ مالی پروژه</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-black text-stone-950 block mb-1">مبلغ اولیه کل پیمان (مبلغ قرارداد)</label>
                          <div className="relative">
                            <input
                              type="text"
                              required
                              placeholder="مثال: ۵۰,۰۰۰,۰۰۰,۰۰۰"
                              value={formData.initialBudget ? new Intl.NumberFormat('en-US').format(formData.initialBudget) : ''}
                              onChange={e => {
                                const clean = e.target.value.replace(/,/g, '');
                                const val = clean === '' ? 0 : Number(clean);
                                if (!isNaN(val)) {
                                  setFormData({
                                    ...formData,
                                    initialBudget: val
                                  });
                                }
                              }}
                              className="w-full p-4 pl-14 bg-white border border-stone-100 rounded-2xl text-sm font-black text-stone-900 text-left ltr"
                            />
                            <div className="absolute left-4 top-4 text-xs font-bold text-amber-400">{formData.currency || 'تومان'}</div>
                          </div>
                        </div>

                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="text-[10px] font-black text-slate-400 block mb-1">شاخص مبنای تعدیل قرارداد (دوره مبنا)</label>
                        <input placeholder="مثال: سه ماهه چهارم ۱۴۰۲" value={formData.priceIndexPeriod || ''} onChange={e => setFormData({...formData, priceIndexPeriod: e.target.value})} className="w-full p-3.5 bg-slate-50 border border-slate-200/60 rounded-2xl text-xs font-bold text-stone-900 text-center"/>
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-400 block mb-1">درصد علی‌الحساب پیش‌پرداخت پیمان</label>
                        <div className="relative">
                          <input type="number" max="100" placeholder="مثال: ۲۰" value={formData.advancePaymentPercent !== undefined ? formData.advancePaymentPercent : 20} onChange={e => setFormData({...formData, advancePaymentPercent: Number(e.target.value)})} className="w-full p-3.5 pl-10 bg-slate-50 border border-slate-200/60 rounded-2xl text-xs font-bold text-stone-900 text-center"/>
                          <span className="absolute left-3.5 top-4 text-xs font-bold text-slate-400">%</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-400 block mb-1">درصد کسر حسن انجام کار (سپرده بیمه)</label>
                        <div className="relative">
                          <input type="number" max="100" placeholder="مثال: ۱۰" value={formData.performanceBondPercent !== undefined ? formData.performanceBondPercent : 10} onChange={e => setFormData({...formData, performanceBondPercent: Number(e.target.value)})} className="w-full p-3.5 pl-10 bg-slate-50 border border-slate-200/60 rounded-2xl text-xs font-bold text-stone-900 text-center"/>
                          <span className="absolute left-3.5 top-4 text-xs font-bold text-slate-400">%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeModalTab === 'wbs_schedule' && (
                  <div className="space-y-6 animate-fadeIn text-right" dir="rtl">
                    {/* Banner */}
                    <div className="p-6 bg-gradient-to-br from-amber-50/90 via-orange-50/70 to-amber-100/40 dark:from-stone-800 dark:via-stone-850 dark:to-stone-800 border border-amber-300/70 dark:border-stone-700 rounded-3xl text-right flex flex-col gap-4 shadow-sm">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-amber-950 dark:text-amber-300 font-black text-sm">
                          <FolderKanban size={22} className="text-amber-600 dark:text-amber-400 shrink-0"/>
                          <span>{formData.contractType === 'فهرست بهایی' ? 'برنامه زمان‌بندی مبنا طبق برآورد اولیه منضم به پیمان (Baseline Schedule)' : 'ساختار شکست کار (WBS) و برنامه زمان‌بندی مبنا (Baseline Schedule)'}</span>
                        </div>
                        <p className="text-xs text-stone-700 dark:text-stone-300 font-medium leading-relaxed">
                          {formData.contractType === 'فهرست بهایی' 
                            ? 'ستون‌های ردیف، کد ردیف، شرح فعالیت، واحد سنجش، حجم و بهای واحد به صورت کاملاً اتوماتیک مطابق با فایل برآورد پیمان خوانده شده و درصد وزن هر ردیف محاسبه می‌گردد. تاریخ‌های شروع و پایان مبنا را از طریق قالب اکسل یا استخراج خودکار تنظیم نمایید تا مدت زمان اجرا و خروجی‌های کنترل و برنامه‌ریزی به صورت خودکار شکل گیرند.'
                            : 'تعریف ساختار شکست کار (WBS)، اوزان فیزیکی، حجم کار و تاریخ‌های شروع و پایان اولیه زمان‌بندی مبنا. اطلاعات این بخش مستقیماً در داشبورد کنترل و برنامه‌ریزی، محاسبات پیشرفت فیزیکی، نمودار S و گزارش‌های ارزش حاصله (EVM) اعمال می‌گردد.'}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-amber-200/60 dark:border-stone-700/80 flex flex-wrap items-center gap-3">
                        {formData.contractType === 'فهرست بهایی' && (
                          <button
                            type="button"
                            onClick={handleGenerateScheduleFromEstimates}
                            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black flex items-center gap-2 transition-all shadow-sm hover:shadow-md cursor-pointer active:scale-95"
                            title="ساخت خودکار زمان‌بندی بر اساس اقلام برآورد اولیه ثبت شده در سیستم"
                          >
                            <Sparkles size={16}/>
                            <span>استخراج خودکار از برآورد پیمان</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={handleDownloadWbsScheduleTemplate}
                          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black flex items-center gap-2 transition-all shadow-sm hover:shadow-md cursor-pointer active:scale-95"
                        >
                          <Download size={16}/>
                          <span>{formData.contractType === 'فهرست بهایی' ? 'دانلود قالب اکسل زمان‌بندی برآورد' : 'دانلود قالب اکسل WBS'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => wbsFileInputRef.current?.click()}
                          disabled={isUploading}
                          className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl text-xs font-black flex items-center gap-2 transition-all shadow-sm hover:shadow-md cursor-pointer active:scale-95"
                        >
                          {isUploading ? <Loader2 size={16} className="animate-spin"/> : <Upload size={16}/>}
                          <span>{formData.contractType === 'فهرست بهایی' ? 'بارگذاری اکسل زمان‌بندی برآورد' : 'بارگذاری اکسل WBS'}</span>
                        </button>
                        <input type="file" ref={wbsFileInputRef} onChange={handleUploadWbsScheduleExcel} className="hidden" accept=".xlsx, .xls"/>
                      </div>
                    </div>

                    {wbsUploadSuccessMsg && (
                      <div className="bg-emerald-50 text-emerald-700 p-4 rounded-2xl border border-emerald-200 flex items-center gap-2 text-xs font-black animate-fadeIn">
                        <CheckCircle size={18} /> {wbsUploadSuccessMsg}
                      </div>
                    )}

                    {/* Metric Cards Summary */}
                    {(formData.wbsScheduleMapping || []).length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="bg-stone-50 dark:bg-stone-800/80 p-3.5 rounded-2xl border border-stone-200/80 dark:border-stone-700">
                          <span className="text-[10px] font-bold text-stone-500 block mb-1">تعداد کل فعالیت‌ها / فصول</span>
                          <span className="text-sm font-black text-stone-900 dark:text-white">{(formData.wbsScheduleMapping || []).length.toLocaleString('fa-IR')} فعالیت</span>
                        </div>
                        <div className="bg-stone-50 dark:bg-stone-800/80 p-3.5 rounded-2xl border border-stone-200/80 dark:border-stone-700">
                          <span className="text-[10px] font-bold text-stone-500 block mb-1">مجموع اوزان فیزیکی مبنا</span>
                          {(() => {
                            const totalW = (formData.wbsScheduleMapping || []).reduce((acc, it) => acc + (Number(it.weightPercent) || 0), 0);
                            const isBalanced = Math.abs(totalW - 100) < 0.1 || totalW === 100;
                            return (
                              <div className="flex items-center gap-1.5">
                                <span className={`text-sm font-black ${isBalanced ? 'text-emerald-600' : 'text-amber-600'}`}>
                                  {totalW.toLocaleString('fa-IR')}٪
                                </span>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${isBalanced ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'}`}>
                                  {isBalanced ? 'تراز کامل ۱۰۰٪' : 'نیازمند تراز'}
                                </span>
                              </div>
                            );
                          })()}
                        </div>
                        <div className="bg-stone-50 dark:bg-stone-800/80 p-3.5 rounded-2xl border border-stone-200/80 dark:border-stone-700">
                          <span className="text-[10px] font-bold text-stone-500 block mb-1">مجموع کل برآورد مالی مبنا</span>
                          <span className="text-sm font-black text-stone-900 dark:text-white dir-ltr text-right block">
                            {((formData.wbsScheduleMapping || []).reduce((acc, it) => acc + (Number(it.allocatedAmount) || 0), 0) / 10000000).toLocaleString('fa-IR')} میلیون تومان
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Toolbar / Section Title */}
                    <div className="flex justify-between items-center bg-stone-50 dark:bg-stone-800/60 p-3.5 rounded-2xl border border-stone-200/80 dark:border-stone-700">
                      <span className="text-xs font-black text-stone-800 dark:text-stone-200 flex items-center gap-2">
                        <Sliders size={16} className="text-amber-600"/>
                        <span>{formData.contractType === 'فهرست بهایی' ? 'جدول اقلام و فصول زمان‌بندی برآورد اولیه' : 'جدول فعالیت‌ها و برنامه زمان‌بندی مبنا'}</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-stone-500 bg-stone-200/60 dark:bg-stone-700 px-3 py-1 rounded-full">
                          تعداد ردیف‌ها: {(formData.wbsScheduleMapping || []).length.toLocaleString('fa-IR')} فعالیت
                        </span>
                        {(formData.wbsScheduleMapping || []).length > 0 && (
                          <button
                            type="button"
                            onClick={handleClearWbsTable}
                            className="px-3 py-1 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl text-[10px] font-black flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                            title="حذف و پاکسازی کل اطلاعات جدول"
                          >
                            <Trash2 size={13} />
                            <span>حذف اطلاعات جدول</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Display-Only Table */}
                    <div className="border border-stone-200 dark:border-stone-700 rounded-2xl overflow-x-auto overflow-y-auto max-h-[380px] bg-white dark:bg-stone-900 shadow-sm custom-scrollbar">
                      <table className="w-full min-w-[850px] text-right text-xs">
                        <thead className="bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-black sticky top-0 border-b border-stone-200 dark:border-stone-700 z-10 text-[11px]">
                          <tr>
                            <th className="p-3 w-12 text-center">ردیف</th>
                            <th className="p-3 w-28 text-center font-mono">{formData.contractType === 'فهرست بهایی' ? 'کد ردیف/فصل' : 'کد WBS'}</th>
                            <th className="p-3 min-w-[180px]">{formData.contractType === 'فهرست بهایی' ? 'شرح فعالیت / ردیف برآورد' : 'عنوان فعالیت ساختاری'}</th>
                            <th className="p-3 w-24 text-center">واحد</th>
                            <th className="p-3 w-24 text-center">{formData.contractType === 'فهرست بهایی' ? 'حجم برآورد' : 'حجم کار'}</th>
                            <th className="p-3 w-28 text-center">بهای واحد (ریال)</th>
                            <th className="p-3 w-28 text-center">وزن فیزیکی (٪)</th>
                            <th className="p-3 w-32 text-center">تاریخ شروع مبنا</th>
                            <th className="p-3 w-32 text-center">تاریخ پایان مبنا</th>
                            <th className="p-3 w-28 text-center">مدت اجرای مبنا</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100 dark:divide-stone-800 font-bold text-stone-700 dark:text-stone-300">
                          {(formData.wbsScheduleMapping || []).length > 0 ? (
                            (formData.wbsScheduleMapping as CbsMappingItem[]).map((row, idx) => (
                              <tr key={idx} className="hover:bg-amber-50/20 dark:hover:bg-stone-800/40 transition-colors">
                                <td className="p-3 text-center text-stone-400 text-[11px] font-mono">{idx + 1}</td>
                                <td className="p-3 text-center">
                                  <span className="font-mono font-black text-amber-800 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-md text-xs border border-amber-200/50 dark:border-amber-900/30">
                                    {row.cbsCode}
                                  </span>
                                </td>
                                <td className="p-3 font-bold text-stone-900 dark:text-stone-100 text-xs">
                                  {row.description || `فعالیت ${row.cbsCode}`}
                                </td>
                                <td className="p-3 text-center text-stone-600 dark:text-stone-400 text-xs">
                                  {row.unit || 'پروژه'}
                                </td>
                                <td className="p-3 text-center font-mono font-bold text-stone-800 dark:text-stone-200 text-xs">
                                  {row.quantity !== undefined ? row.quantity.toLocaleString('fa-IR') : '۱'}
                                </td>
                                <td className="p-3 text-center font-mono text-stone-600 dark:text-stone-400 text-xs">
                                  {row.unitPrice ? row.unitPrice.toLocaleString('fa-IR') : '—'}
                                </td>
                                <td className="p-3 text-center">
                                  <span className="font-mono font-black text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-md text-xs border border-emerald-200/50 dark:border-emerald-900/30">
                                    {row.weightPercent !== undefined ? `${row.weightPercent}٪` : '—'}
                                  </span>
                                </td>
                                <td className="p-3 text-center font-mono text-stone-700 dark:text-stone-300 text-xs">
                                  {row.baselineStartDate || '1403/01/15'}
                                </td>
                                <td className="p-3 text-center font-mono text-stone-700 dark:text-stone-300 text-xs">
                                  {row.baselineEndDate || '1403/06/30'}
                                </td>
                                <td className="p-3 text-center font-mono font-bold text-stone-800 dark:text-stone-200 text-xs">
                                  {row.durationDays ? `${row.durationDays.toLocaleString('fa-IR')} روز` : '۶۰ روز'}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={10} className="p-8 text-center text-stone-400 text-xs italic bg-stone-50/50 dark:bg-stone-850">
                                {formData.contractType === 'فهرست بهایی' 
                                  ? 'هیچ فعالیتی برای زمان‌بندی برآورد اولیه ثبت نشده است. می‌توانید از طریق «استخراج خودکار از برآورد» یا «بارگذاری اکسل زمان‌بندی برآورد» اقدام فرمایید.'
                                  : 'هیچ فعالیتی برای ساختار شکست WBS و زمان‌بندی ثبت نشده است. لطفاً از طریق دکمه «بارگذاری اکسل WBS» فایل خود را آپلود نمایید.'}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Gantt / Schedule Visualizer Preview */}
                    <div className="bg-white dark:bg-stone-900 p-5 rounded-3xl border border-stone-200 dark:border-stone-700 shadow-sm space-y-4">
                      <div className="flex justify-between items-center border-b border-stone-100 dark:border-stone-800 pb-3">
                        <span className="text-xs font-black text-stone-900 dark:text-white flex items-center gap-2">
                          <Calendar size={18} className="text-amber-600"/>
                          <span>پیش‌نمایش بصری گانت و برنامه زمان‌بندی مبنا</span>
                        </span>
                        <span className="text-[10px] text-stone-500 font-bold bg-stone-100 dark:bg-stone-800 px-2.5 py-1 rounded-full">
                          نمایش تمامی {(formData.wbsScheduleMapping || []).length.toLocaleString('fa-IR')} فعالیت
                        </span>
                      </div>

                      {(formData.wbsScheduleMapping || []).length > 0 ? (
                        <div className="space-y-3 pt-1 max-h-[360px] overflow-y-auto custom-scrollbar pl-1 pr-1">
                          {(formData.wbsScheduleMapping as CbsMappingItem[]).map((item, idx) => {
                            const weight = item.weightPercent || 5;
                            return (
                              <div key={idx} className="space-y-1 bg-stone-50/60 dark:bg-stone-800/40 p-2.5 rounded-2xl border border-stone-100 dark:border-stone-750 hover:border-amber-200 transition-colors">
                                <div className="flex justify-between text-[10px] font-black text-stone-700 dark:text-stone-300">
                                  <span className="font-mono text-amber-800 dark:text-amber-400">{item.cbsCode} - {item.description}</span>
                                  <span className="text-stone-500 font-mono">{item.baselineStartDate || '1403/01/15'} تا {item.baselineEndDate || '1403/06/30'} ({item.durationDays || 60} روز) | وزن: {weight}%</span>
                                </div>
                                <div className="w-full bg-stone-200 dark:bg-stone-700 rounded-full h-3.5 overflow-hidden p-0.5 relative">
                                  <div 
                                    className="bg-gradient-to-r from-amber-500 to-amber-600 h-2.5 rounded-full shadow-inner transition-all duration-500"
                                    style={{ width: `${Math.min(100, Math.max(15, weight * 2.5))}%` }}
                                  ></div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-6 text-center text-stone-400 text-xs italic bg-stone-50/50 dark:bg-stone-850 rounded-2xl border border-dashed border-stone-200 dark:border-stone-700">
                          برنامه زمان‌بندی مبنا و نمودار گانت پس از بارگذاری فایل اکسل نمایش داده خواهد شد.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeModalTab === 'warranties' && (
                  <div className="space-y-6 animate-fadeIn text-right" dir="rtl">
                    <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-3xl text-right flex justify-between items-center">
                      <div className="space-y-1">
                        <span className="text-xs font-black text-stone-700 block">🛡️ مدیریت و ردیابی ضمانت‌نامه‌های قرارداد</span>
                        <p className="text-[10px] text-stone-500 font-bold">ثبت، تمدید، آزاد‌سازی یا ضبط ضمانت‌نامه‌های معتبر بانکی و شرکتی شامل پیش‌پرداخت، حسن انجام تعهدات و سپرده‌ها.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsAddWarrantyOpen(!isAddWarrantyOpen)}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-black rounded-xl flex items-center gap-1.5 transition-colors"
                      >
                        {isAddWarrantyOpen ? 'بستن فرم ثبت' : '➕ ثبت ضمانت‌نامه جدید'}
                      </button>
                    </div>

                    {isAddWarrantyOpen && (
                      <div className="p-5 bg-[#faf8f4]/25 border border-stone-100 rounded-[2rem] space-y-4 animate-fadeIn">
                        <h4 className="text-xs font-black text-blue-900">📝 فرم ثبت ضمانت‌نامه جدید</h4>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className="text-[10px] font-black text-slate-400 block mb-1">نوع ضمانت‌نامه</label>
                            <select
                              value={warrantyForm.type}
                              onChange={e => setWarrantyForm({...warrantyForm, type: e.target.value as any})}
                              className="w-full p-3 bg-white border border-stone-100 rounded-xl text-xs font-bold"
                            >
                              <option value="PREPAYMENT">پیش‌پرداخت (Advance Payment)</option>
                              <option value="PERFORMANCE_BOND">حسن انجام تعهدات (Performance Bond)</option>
                              <option value="BID_BOND">شرکت در مناقصه (Tender)</option>
                              <option value="RETAINAGE">کسورات وجه‌الضمان (Retention)</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-slate-400 block mb-1">شماره ضمانت‌نامه (مرجع)</label>
                            <input
                              placeholder="مثال: ض/12345"
                              value={warrantyForm.referenceNumber || ''}
                              onChange={e => setWarrantyForm({...warrantyForm, referenceNumber: e.target.value})}
                              className="w-full p-3 bg-white border border-stone-100 rounded-xl text-xs font-bold text-center"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-slate-400 block mb-1">مبلغ ضمانت‌نامه</label>
                            <div className="relative">
                              <input
                                type="text"
                                placeholder="مبلغ ریالی/تومانی"
                                value={warrantyForm.amount ? new Intl.NumberFormat('en-US').format(warrantyForm.amount) : ''}
                                onChange={e => {
                                  const clean = e.target.value.replace(/,/g, '');
                                  const val = clean === '' ? 0 : Number(clean);
                                  if (!isNaN(val)) {
                                    setWarrantyForm({...warrantyForm, amount: val});
                                  }
                                }}
                                className="w-full p-3 pl-12 bg-white border border-stone-100 rounded-xl text-xs font-black text-left ltr"
                              />
                              <span className="absolute left-3.5 top-3.5 text-[9px] font-bold text-slate-400">{formData.currency || 'تومان'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className="text-[10px] font-black text-slate-400 block mb-1">بانک / موسسه صادرکننده</label>
                            <input
                              placeholder="مثال: بانک تجارت شعبه مرکزی"
                              value={warrantyForm.issuerBank || ''}
                              onChange={e => setWarrantyForm({...warrantyForm, issuerBank: e.target.value})}
                              className="w-full p-3 bg-white border border-stone-100 rounded-xl text-xs font-bold"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-slate-400 block mb-1">تاریخ صدور</label>
                            <ShamsiDatePicker
                              placeholder="1403/02/01"
                              value={warrantyForm.issueDate || ''}
                              onChange={val => setWarrantyForm({ ...warrantyForm, issueDate: val })}
                              inputClassName="!p-3 !bg-white !border-stone-100 !rounded-xl !text-xs !font-bold !text-center"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-slate-400 block mb-1">تاریخ انقضا اعتبار</label>
                            <ShamsiDatePicker
                              placeholder="1404/02/01"
                              value={warrantyForm.expiryDate || ''}
                              onChange={val => setWarrantyForm({ ...warrantyForm, expiryDate: val })}
                              inputClassName="!p-3 !bg-white !border-stone-100 !rounded-xl !text-xs !font-bold !text-center"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                          <button
                            type="button"
                            onClick={handleAddWarranty}
                            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-xl shadow-md transition-all"
                          >
                            ✅ افزودن ضمانت‌نامه به لیست
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Form for Editing Warranty */}
                    {editingWarranty && (
                      <form onSubmit={handleSaveEditWarranty} className="p-4 bg-amber-50/50 border border-amber-200 rounded-2xl space-y-3 animate-fadeIn">
                        <div className="flex justify-between items-center border-b border-amber-200 pb-2">
                          <span className="text-xs font-black text-amber-900">✏️ ویرایش اطلاعات ضمانت‌نامه</span>
                          <button type="button" onClick={() => setEditingWarranty(null)} className="text-stone-400 hover:text-stone-700 text-xs font-bold">✕ انصراف</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="text-[10px] font-bold text-stone-500 block mb-1">نوع ضمانت‌نامه</label>
                            <select
                              value={editingWarranty.type}
                              onChange={e => setEditingWarranty({...editingWarranty, type: e.target.value as any})}
                              className="w-full p-2.5 bg-white border border-stone-200 rounded-xl text-xs font-bold"
                            >
                              <option value="PERFORMANCE_BOND">حسن انجام تعهدات</option>
                              <option value="ADVANCE_PAYMENT">پیش‌پرداخت</option>
                              <option value="BID_BOND">شرکت در مناقصه</option>
                              <option value="RETAINAGE">کسورات وجه‌الضمان</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-stone-500 block mb-1">شماره مرجع/سند</label>
                            <input
                              value={editingWarranty.referenceNumber}
                              onChange={e => setEditingWarranty({...editingWarranty, referenceNumber: e.target.value})}
                              className="w-full p-2.5 bg-white border border-stone-200 rounded-xl text-xs font-bold"
                              required
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-stone-500 block mb-1">بانک صادرکننده</label>
                            <input
                              value={editingWarranty.issuerBank}
                              onChange={e => setEditingWarranty({...editingWarranty, issuerBank: e.target.value})}
                              className="w-full p-2.5 bg-white border border-stone-200 rounded-xl text-xs font-bold"
                              required
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-stone-500 block mb-1">مبلغ ({formData.currency || 'تومان'})</label>
                            <input
                              type="number"
                              value={editingWarranty.amount}
                              onChange={e => setEditingWarranty({...editingWarranty, amount: Number(e.target.value)})}
                              className="w-full p-2.5 bg-white border border-stone-200 rounded-xl text-xs font-bold"
                              required
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-stone-500 block mb-1">تاریخ صدور</label>
                            <ShamsiDatePicker
                              value={editingWarranty.issueDate}
                              onChange={val => setEditingWarranty({ ...editingWarranty, issueDate: val })}
                              inputClassName="!p-2.5 !bg-white !border-stone-200 !rounded-xl !text-xs !font-bold !text-center"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-stone-500 block mb-1">تاریخ انقضا</label>
                            <ShamsiDatePicker
                              value={editingWarranty.expiryDate}
                              onChange={val => setEditingWarranty({ ...editingWarranty, expiryDate: val })}
                              inputClassName="!p-2.5 !bg-white !border-stone-200 !rounded-xl !text-xs !font-bold !text-center"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                          <button type="button" onClick={() => setEditingWarranty(null)} className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl">انصراف</button>
                          <button type="submit" className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-xl shadow-sm">ذخیره تغییرات ضمانت‌نامه</button>
                        </div>
                      </form>
                    )}

                    <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
                      <div className="overflow-x-auto">
                        <table className="w-full text-right text-xs min-w-[800px]">
                          <thead className="bg-slate-50 text-stone-500 font-black">
                            <tr>
                              <th className="p-3">نوع ضمانت‌نامه</th>
                              <th className="p-3">شماره مرجع</th>
                              <th className="p-3">صادرکننده</th>
                              <th className="p-3">مبلغ</th>
                              <th className="p-3 text-center">تاریخ صدور</th>
                              <th className="p-3 text-center">تاریخ انقضا</th>
                              <th className="p-3 text-center">وضعیت</th>
                              <th className="p-3 text-center w-20">عملیات</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-bold">
                            {(formData.warranties || []).map(w => (
                              <tr key={w.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="p-3 text-stone-900">
                                  {w.type === 'PERFORMANCE_BOND' ? 'حسن انجام تعهدات' :
                                   w.type === 'ADVANCE_PAYMENT' ? 'پیش‌پرداخت' :
                                   w.type === 'BID_BOND' ? 'شرکت در مناقصه' :
                                   w.type === 'RETAINAGE' ? 'کسورات وجه‌الضمان' : w.type}
                                </td>
                                <td className="p-3 font-mono text-stone-600">{w.referenceNumber}</td>
                                <td className="p-3 text-stone-600">{w.issuerBank}</td>
                                <td className="p-3 text-amber-700 font-black">{(w.amount || 0).toLocaleString('fa-IR')} {formData.currency || 'تومان'}</td>
                                <td className="p-3 text-center text-stone-500">{w.issueDate}</td>
                                <td className="p-3 text-center text-stone-500">{w.expiryDate}</td>
                                <td className="p-3 text-center">
                                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black ${
                                    w.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                    w.status === 'RELEASED' ? 'bg-slate-100 text-stone-500' :
                                    'bg-amber-50 text-stone-900 border border-amber-100'
                                  }`}>
                                    {w.status === 'ACTIVE' ? 'معتبر/فعال' :
                                     w.status === 'RELEASED' ? 'آزاد شده' :
                                     w.status === 'EXPIRED' ? 'منقضی شده' : w.status}
                                  </span>
                                </td>
                                <td className="p-3 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => setEditingWarranty(w)}
                                      className="p-1 text-stone-600 hover:text-amber-600 hover:bg-stone-100 rounded-lg transition-colors"
                                      title="ویرایش ضمانت‌نامه"
                                    >
                                      <Edit3 size={14} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveWarranty(w.id, w.referenceNumber)}
                                      className="p-1 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                      title="حذف ضمانت‌نامه"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                            {(formData.warranties || []).length === 0 && (
                              <tr>
                                <td colSpan={8} className="p-8 text-center text-slate-400 italic">هیچ ضمانت‌نامه‌ای برای این پیمان ثبت نشده است.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {activeModalTab === 'revisions' && (
                  <div className="space-y-6 animate-fadeIn text-right" dir="rtl">
                    <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-3xl text-right flex justify-between items-center">
                      <div className="space-y-1">
                        <span className="text-xs font-black text-stone-700 block">📝 مدیریت ابلاغیه‌ها، الحاقیه‌ها و دستور کارها</span>
                        <p className="text-[10px] text-stone-500 font-bold">ثبت مستند تغییرات مالی (کاهش/افزایش ۲۵ درصد مبلغ پیمان) و تغییرات زمانی مجاز و غیرمجاز (تمدید مدت زمان قرارداد).</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsAddRevisionOpen(!isAddRevisionOpen)}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-black rounded-xl flex items-center gap-1.5 transition-colors"
                      >
                        {isAddRevisionOpen ? 'بستن فرم ثبت' : '➕ ثبت الحاقیه جدید'}
                      </button>
                    </div>

                    {isAddRevisionOpen && (
                      <div className="p-5 bg-[#faf8f4]/25 border border-stone-100 rounded-[2rem] space-y-4 animate-fadeIn">
                        <h4 className="text-xs font-black text-blue-900">📝 فرم ابلاغ الحاقیه یا دستور کار جدید</h4>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className="text-[10px] font-black text-slate-400 block mb-1">نوع ابلاغیه</label>
                            <select
                              value={revisionForm.type}
                              onChange={e => setRevisionForm({...revisionForm, type: e.target.value as any})}
                              className="w-full p-3 bg-white border border-stone-100 rounded-xl text-xs font-bold"
                            >
                              <option value="TIME_EXTENSION">تمدید مدت زمان پیمان</option>
                              <option value="AMENDMENT">الحاقیه افزایش/کاهش مبلغ (+-۲۵٪)</option>
                              <option value="PRICE_ADJUSTMENT">تعدیل آحاد بها (Price Adjustment)</option>
                              <option value="SCOPE_CHANGE">تغییر احجام و مشخصات فنی (Scope Change)</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-slate-400 block mb-1">عنوان / شماره الحاقیه رسمی</label>
                            <input
                              placeholder="مثال: الحاقیه-01"
                              value={revisionForm.version || ''}
                              onChange={e => setRevisionForm({...revisionForm, version: e.target.value})}
                              className="w-full p-3 bg-white border border-stone-100 rounded-xl text-xs font-bold text-center"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-slate-400 block mb-1">تاریخ ابلاغ کارفرما</label>
                            <ShamsiDatePicker
                              placeholder="1403/05/15"
                              value={revisionForm.date || ''}
                              onChange={val => setRevisionForm({ ...revisionForm, date: val })}
                              inputClassName="!p-3 !bg-white !border-stone-100 !rounded-xl !text-xs !font-bold !text-center"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-[10px] font-black text-slate-400 block mb-1">اثر مالی الحاقیه (تغییر مبلغ)</label>
                            <div className="relative">
                              <input
                                type="text"
                                placeholder="مبلغ اضافه یا کسر شده"
                                value={revisionForm.amountDifference ? new Intl.NumberFormat('en-US').format(revisionForm.amountDifference) : ''}
                                onChange={e => {
                                  const clean = e.target.value.replace(/,/g, '');
                                  const val = clean === '' ? 0 : Number(clean);
                                  if (!isNaN(val)) {
                                    setRevisionForm({...revisionForm, amountDifference: val});
                                  }
                                }}
                                className="w-full p-3 pl-12 bg-white border border-stone-100 rounded-xl text-xs font-black text-left ltr"
                              />
                              <span className="absolute left-3.5 top-3.5 text-[9px] font-bold text-slate-400">{formData.currency || 'تومان'}</span>
                            </div>
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-slate-400 block mb-1">اثر زمانی الحاقیه (تمدید مجاز)</label>
                            <div className="relative">
                              <input
                                type="number"
                                placeholder="تعداد روزهای اضافه شده"
                                value={revisionForm.durationDifference || ''}
                                onChange={e => setRevisionForm({...revisionForm, durationDifference: Number(e.target.value)})}
                                className="w-full p-3 pl-10 bg-white border border-stone-100 rounded-xl text-xs font-bold text-center"
                              />
                              <span className="absolute left-3.5 top-3.5 text-[10px] font-bold text-slate-400">روز</span>
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-black text-slate-400 block mb-1">شرح علت و موضوع ابلاغیه تغییرات</label>
                          <textarea
                            rows={2}
                            placeholder="علت ابلاغ الحاقیه یا دستور کار را به طور خلاصه شرح دهید..."
                            value={revisionForm.changesDescription || ''}
                            onChange={e => setRevisionForm({...revisionForm, changesDescription: e.target.value})}
                            className="w-full p-3 bg-white border border-stone-100 rounded-xl text-xs font-bold"
                          />
                        </div>

                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={handleAddRevision}
                            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-xl shadow-md transition-all"
                          >
                            ✅ افزودن الحاقیه به پیمان
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Form for Editing Revision */}
                    {editingRevision && (
                      <form onSubmit={handleSaveEditRevision} className="p-4 bg-blue-50/50 border border-blue-200 rounded-2xl space-y-3 animate-fadeIn">
                        <div className="flex justify-between items-center border-b border-blue-200 pb-2">
                          <span className="text-xs font-black text-blue-900">✏️ ویرایش الحاقیه / دستور کار</span>
                          <button type="button" onClick={() => setEditingRevision(null)} className="text-stone-400 hover:text-stone-700 text-xs font-bold">✕ انصراف</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="text-[10px] font-bold text-stone-500 block mb-1">نوع ابلاغیه</label>
                            <select
                              value={editingRevision.type}
                              onChange={e => setEditingRevision({...editingRevision, type: e.target.value as any})}
                              className="w-full p-2.5 bg-white border border-stone-200 rounded-xl text-xs font-bold"
                            >
                              <option value="TIME_EXTENSION">تمدید مدت زمان پیمان</option>
                              <option value="AMENDMENT">الحاقیه تغییر مبلغ (+-۲۵٪)</option>
                              <option value="PRICE_ADJUSTMENT">تعدیل آحاد بها</option>
                              <option value="SCOPE_CHANGE">تغییر احجام و مشخصات فنی</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-stone-500 block mb-1">شماره ابلاغ/عنوان</label>
                            <input
                              value={editingRevision.version}
                              onChange={e => setEditingRevision({...editingRevision, version: e.target.value})}
                              className="w-full p-2.5 bg-white border border-stone-200 rounded-xl text-xs font-bold"
                              required
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-stone-500 block mb-1">تاریخ ابلاغ</label>
                            <ShamsiDatePicker
                              value={editingRevision.date}
                              onChange={val => setEditingRevision({ ...editingRevision, date: val })}
                              inputClassName="!p-2.5 !bg-white !border-stone-200 !rounded-xl !text-xs !font-bold !text-center"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-stone-500 block mb-1">تغییر مبلغ ({formData.currency || 'تومان'})</label>
                            <input
                              type="number"
                              value={editingRevision.amountDifference}
                              onChange={e => setEditingRevision({...editingRevision, amountDifference: Number(e.target.value)})}
                              className="w-full p-2.5 bg-white border border-stone-200 rounded-xl text-xs font-bold"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-stone-500 block mb-1">تغییر زمان (روز)</label>
                            <input
                              type="number"
                              value={editingRevision.durationDifference}
                              onChange={e => setEditingRevision({...editingRevision, durationDifference: Number(e.target.value)})}
                              className="w-full p-2.5 bg-white border border-stone-200 rounded-xl text-xs font-bold text-center"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-stone-500 block mb-1">شرح موضوع</label>
                            <input
                              value={editingRevision.changesDescription}
                              onChange={e => setEditingRevision({...editingRevision, changesDescription: e.target.value})}
                              className="w-full p-2.5 bg-white border border-stone-200 rounded-xl text-xs font-bold"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                          <button type="button" onClick={() => setEditingRevision(null)} className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl">انصراف</button>
                          <button type="submit" className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl shadow-sm">ذخیره تغییرات الحاقیه</button>
                        </div>
                      </form>
                    )}

                    <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
                      <div className="overflow-x-auto">
                        <table className="w-full text-right text-xs min-w-[800px]">
                          <thead className="bg-slate-50 text-stone-500 font-black">
                            <tr>
                              <th className="p-3">نوع ابلاغیه</th>
                              <th className="p-3">شماره ابلاغ</th>
                              <th className="p-3">تاریخ ابلاغ</th>
                              <th className="p-3 text-left">تغییر مالی پیمان</th>
                              <th className="p-3 text-center">تغییر زمانی (روز)</th>
                              <th className="p-3">شرح تغییرات</th>
                              <th className="p-3 text-center w-20">عملیات</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-bold">
                            {(formData.revisions || []).map(r => (
                              <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="p-3 text-stone-900">
                                  {r.type === 'TIME_EXTENSION' ? 'تمدید مدت زمان پیمان' :
                                   r.type === 'AMENDMENT' ? 'الحاقیه تغییر مبلغ' :
                                   r.type === 'PRICE_ADJUSTMENT' ? 'تعدیل آحاد بها' :
                                   r.type === 'SCOPE_CHANGE' ? 'تغییر احجام و مشخصات' : r.type}
                                </td>
                                <td className="p-3 font-mono text-stone-600">{r.version}</td>
                                <td className="p-3 text-stone-500">{r.date}</td>
                                <td className={`p-3 text-left font-black ${r.amountDifference > 0 ? 'text-emerald-600' : r.amountDifference < 0 ? 'text-red-500' : 'text-stone-500'}`}>
                                  {r.amountDifference > 0 ? '+' : ''}{(r.amountDifference || 0).toLocaleString('fa-IR')} {formData.currency || 'تومان'}
                                </td>
                                <td className="p-3 text-center text-amber-700 font-black">{r.durationDifference ? `${r.durationDifference} روز` : 'بدون اثر زمانی'}</td>
                                <td className="p-3 text-stone-500 text-[10px] max-w-xs truncate">{r.changesDescription || 'بدون شرح'}</td>
                                <td className="p-3 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => setEditingRevision(r)}
                                      className="p-1 text-stone-600 hover:text-amber-600 hover:bg-stone-100 rounded-lg transition-colors"
                                      title="ویرایش الحاقیه"
                                    >
                                      <Edit3 size={14} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveRevision(r.id, r.version)}
                                      className="p-1 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                      title="حذف الحاقیه"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                            {(formData.revisions || []).length === 0 && (
                              <tr>
                                <td colSpan={7} className="p-8 text-center text-slate-400 italic">هیچ تغییرات ابلاغ شده یا الحاقیه‌ای برای این پیمان ثبت نشده است.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {activeModalTab === 'pbs' && formData.contractType === 'CBS' && <div className="space-y-6 animate-fadeIn text-right border-b border-slate-200 pb-6 mb-6" dir="rtl">
                  <div className="p-4 bg-[#faf8f4]/50 border border-stone-100 rounded-3xl text-right">
                    <span className="text-xs font-black text-amber-700 block mb-1">🌿 ساختار درختی شکست پروژه مهندسی (PBS - Project Breakdown Structure)</span>
                    <p className="text-[10px] text-stone-500 font-bold leading-relaxed">برای طبقه‌بندی منظم و پیشرفته فضاها، دیسیپلین‌ها و کدهای یونیک در پروژه‌های EPC و صنعتی، سلسله‌مراتب درختی زیر را تعریف کنید. این اقلام جهت ساختاردهی در دفتر فنی و سیستم ریزمتره استفاده خواهند شد.</p>
                  </div>

                  {/* Areas tag manager */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 space-y-3 shadow-sm">
                    <label className="text-xs font-black text-stone-700 block">📍 تعریف نواحی پروژه (Areas)</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="مثال: Area 100 - آبگیر خام" 
                        value={newArea} 
                        onChange={e => setNewArea(e.target.value)} 
                        className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                      />
                      <button 
                        type="button" 
                        onClick={() => handleAddHierarchyItem('areas', newArea, setNewArea)} 
                        className="px-4 py-2.5 bg-amber-600 text-white rounded-xl text-xs font-bold hover:bg-amber-700"
                      >
                        افزودن
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {(formData.areas || []).map((item, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1.5 bg-slate-100 text-stone-700 px-3 py-1 rounded-full text-[10px] font-bold border border-slate-200">
                          {item}
                          <button type="button" onClick={() => handleRemoveHierarchyItem('areas', idx, item)} className="text-slate-400 hover:text-red-500 font-bold text-xs">×</button>
                        </span>
                      ))}
                      {(formData.areas || []).length === 0 && <span className="text-[10px] text-slate-400 italic">هیچ ناحیه‌ای تعریف نشده است.</span>}
                    </div>
                  </div>

                  {/* Zones tag manager */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 space-y-3 shadow-sm">
                    <label className="text-xs font-black text-stone-700 block">🌐 تعریف زون‌های پروژه (Zones)</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="مثال: Zone A - محدوده غربی" 
                        value={newZone} 
                        onChange={e => setNewZone(e.target.value)} 
                        className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                      />
                      <button 
                        type="button" 
                        onClick={() => handleAddHierarchyItem('zones', newZone, setNewZone)} 
                        className="px-4 py-2.5 bg-amber-600 text-white rounded-xl text-xs font-bold hover:bg-amber-700"
                      >
                        افزودن
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {(formData.zones || []).map((item, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1.5 bg-slate-100 text-stone-700 px-3 py-1 rounded-full text-[10px] font-bold border border-slate-200">
                          {item}
                          <button type="button" onClick={() => handleRemoveHierarchyItem('zones', idx, item)} className="text-slate-400 hover:text-red-500 font-bold text-xs">×</button>
                        </span>
                      ))}
                      {(formData.zones || []).length === 0 && <span className="text-[10px] text-slate-400 italic">هیچ زونی تعریف نشده است.</span>}
                    </div>
                  </div>

                  {/* Facilities tag manager */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 space-y-3 shadow-sm">
                    <label className="text-xs font-black text-stone-700 block">🏢 تعریف تسهیلات و واحدها (Facilities / Units)</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="مثال: Facility 201 - ایستگاه پمپاژ ثانویه" 
                        value={newFacility} 
                        onChange={e => setNewFacility(e.target.value)} 
                        className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                      />
                      <button 
                        type="button" 
                        onClick={() => handleAddHierarchyItem('facilities', newFacility, setNewFacility)} 
                        className="px-4 py-2.5 bg-amber-600 text-white rounded-xl text-xs font-bold hover:bg-amber-700"
                      >
                        افزودن
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {(formData.facilities || []).map((item, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1.5 bg-slate-100 text-stone-700 px-3 py-1 rounded-full text-[10px] font-bold border border-slate-200">
                          {item}
                          <button type="button" onClick={() => handleRemoveHierarchyItem('facilities', idx, item)} className="text-slate-400 hover:text-red-500 font-bold text-xs">×</button>
                        </span>
                      ))}
                      {(formData.facilities || []).length === 0 && <span className="text-[10px] text-slate-400 italic">هیچ تسهیلاتی تعریف نشده است.</span>}
                    </div>
                  </div>

                  {/* Disciplines tag manager */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 space-y-3 shadow-sm">
                    <label className="text-xs font-black text-stone-700 block">📐 دیسیپلین‌های کاری پروژه (Disciplines)</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="مثال: Civil, Piping, Electrical, Mechanical, Instrumentation" 
                        value={newDiscipline} 
                        onChange={e => setNewDiscipline(e.target.value)} 
                        className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                      />
                      <button 
                        type="button" 
                        onClick={() => handleAddHierarchyItem('disciplines', newDiscipline, setNewDiscipline)} 
                        className="px-4 py-2.5 bg-amber-600 text-white rounded-xl text-xs font-bold hover:bg-amber-700"
                      >
                        افزودن
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {(formData.disciplines || []).map((item, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1.5 bg-slate-100 text-stone-700 px-3 py-1 rounded-full text-[10px] font-bold border border-slate-200">
                          {item}
                          <button type="button" onClick={() => handleRemoveHierarchyItem('disciplines', idx, item)} className="text-slate-400 hover:text-red-500 font-bold text-xs">×</button>
                        </span>
                      ))}
                      {(formData.disciplines || []).length === 0 && <span className="text-[10px] text-slate-400 italic">هیچ دیسیپلینی تعریف نشده است.</span>}
                    </div>
                  </div>

                  {/* Systems & Subsystems tag manager */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 space-y-4 shadow-sm">
                    <div>
                      <label className="text-xs font-black text-stone-700 block mb-2">⛓️ سیستم‌ها و زیرسیستم‌ها (Systems & Subsystems)</label>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-2">
                          <span className="text-[10px] text-slate-400 font-bold">افزودن سیستم اصلی:</span>
                          <div className="flex gap-2">
                            <input 
                              type="text" 
                              placeholder="مثال: سیستم توزیع مواد شیمیایی" 
                              value={newSystem} 
                              onChange={e => setNewSystem(e.target.value)} 
                              className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                            />
                            <button 
                              type="button" 
                              onClick={() => handleAddHierarchyItem('systems', newSystem, setNewSystem)} 
                              className="px-3 bg-amber-600 text-white rounded-xl text-[11px] font-bold"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <span className="text-[10px] text-slate-400 font-bold">افزودن زیرسیستم:</span>
                          <div className="flex gap-2">
                            <input 
                              type="text" 
                              placeholder="مثال: لوپ کلرزنی دوزینگ" 
                              value={newSubsystem} 
                              onChange={e => setNewSubsystem(e.target.value)} 
                              className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                            />
                            <button 
                              type="button" 
                              onClick={() => handleAddHierarchyItem('subsystems', newSubsystem, setNewSubsystem)} 
                              className="px-3 bg-amber-600 text-white rounded-xl text-[11px] font-bold"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-t pt-3">
                      <div>
                        <span className="text-[10px] font-bold text-stone-500 block mb-1">سیستم‌ها:</span>
                        <div className="flex flex-wrap gap-1">
                          {(formData.systems || []).map((item, idx) => (
                            <span key={idx} className="inline-flex items-center gap-1 bg-slate-50 text-stone-600 px-2.5 py-0.5 rounded-lg text-[9px] font-bold border border-slate-100">
                              {item}
                              <button type="button" onClick={() => handleRemoveHierarchyItem('systems', idx, item)} className="text-slate-400 hover:text-red-500 text-[10px]">×</button>
                            </span>
                          ))}
                          {(formData.systems || []).length === 0 && <span className="text-[9px] text-slate-400 italic">تعریف نشده</span>}
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-stone-500 block mb-1">زیرسیستم‌ها:</span>
                        <div className="flex flex-wrap gap-1">
                          {(formData.subsystems || []).map((item, idx) => (
                            <span key={idx} className="inline-flex items-center gap-1 bg-slate-50 text-stone-600 px-2.5 py-0.5 rounded-lg text-[9px] font-bold border border-slate-100">
                              {item}
                              <button type="button" onClick={() => handleRemoveHierarchyItem('subsystems', idx, item)} className="text-slate-400 hover:text-red-500 text-[10px]">×</button>
                            </span>
                          ))}
                          {(formData.subsystems || []).length === 0 && <span className="text-[9px] text-slate-400 italic">تعریف نشده</span>}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Cost Centers & Project Codes */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 space-y-4 shadow-sm">
                    <label className="text-xs font-black text-stone-700 block mb-1">💼 کدهای سیستم و مراکز هزینه (Cost Centers)</label>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold text-stone-500">کدهای اختصاصی پروژه (Project Codes):</span>
                        <div className="flex gap-2">
                          <input type="text" placeholder="WBS-ST-02" value={newProjectCode} onChange={e => setNewProjectCode(e.target.value)} className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold" />
                          <button type="button" onClick={() => handleAddHierarchyItem('projectCodes', newProjectCode, setNewProjectCode)} className="px-3 bg-amber-600 text-white rounded-xl text-[11px] font-bold">+</button>
                        </div>
                        <div className="flex flex-wrap gap-1 pt-1">
                          {(formData.projectCodes || []).map((c, idx) => (
                            <span key={idx} className="bg-slate-100 text-stone-600 px-2.5 py-0.5 rounded text-[9px] font-mono font-bold flex items-center gap-1 border border-slate-200">
                              {c}
                              <button type="button" onClick={() => handleRemoveHierarchyItem('projectCodes', idx, c)} className="text-slate-400">×</button>
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <span className="text-[10px] font-bold text-stone-500">مراکز هزینه مالی (Cost Centers):</span>
                        <div className="flex gap-2">
                          <input type="text" placeholder="CC-101-CIVIL" value={newCostCenter} onChange={e => setNewCostCenter(e.target.value)} className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold" />
                          <button type="button" onClick={() => handleAddHierarchyItem('costCenters', newCostCenter, setNewCostCenter)} className="px-3 bg-amber-600 text-white rounded-xl text-[11px] font-bold">+</button>
                        </div>
                        <div className="flex flex-wrap gap-1 pt-1">
                          {(formData.costCenters || []).map((cc, idx) => (
                            <span key={idx} className="bg-slate-100 text-stone-600 px-2.5 py-0.5 rounded text-[9px] font-mono font-bold flex items-center gap-1 border border-slate-200">
                              {cc}
                              <button type="button" onClick={() => handleRemoveHierarchyItem('costCenters', idx, cc)} className="text-slate-400">×</button>
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>}

                {activeModalTab === 'structure' && <div className="space-y-4 animate-fadeIn">
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200/60 space-y-4">
                    <h4 className="text-xs font-black text-stone-700">
                      {(formData.contractType === 'CBS' || formData.contractType === 'LUMP_SUM' || formData.contractType === 'COST_PLUS') ? `تعریف یا بارگذاری ساختار شکست تفصیلی (${formData.contractType === 'CBS' ? 'CBS' : formData.contractType === 'LUMP_SUM' ? 'WBS' : 'هزینه‌ای'}) جدید` : 'تعریف یا بارگذاری فهرست بهای جدید'}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-stone-500 mb-1 block">
                          {(formData.contractType === 'CBS' || formData.contractType === 'LUMP_SUM' || formData.contractType === 'COST_PLUS') ? 'عنوان ساختار شکست پروژه (مثال: شکست کار ابنیه و محوطه)' : 'عنوان فهرست بها (مثال: ابنیه، راه و باند)'}
                        </label>
                        <input 
                          type="text" 
                          placeholder={(formData.contractType === 'CBS' || formData.contractType === 'LUMP_SUM' || formData.contractType === 'COST_PLUS') ? 'مثلاً: ساختار شکست ابنیه، ساختار شکست تاسیسات' : 'مثلاً: ابنیه، راه و باند، تاسیسات برقی'} 
                          value={plTitleInput} 
                          onChange={e => setPlTitleInput(e.target.value)} 
                          className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-stone-500 mb-1 block">
                          {(formData.contractType === 'CBS' || formData.contractType === 'LUMP_SUM' || formData.contractType === 'COST_PLUS') ? 'سال ابلاغ ساختار شکست' : 'سال فهرست بها پایه'}
                        </label>
                        <input 
                          type="text" 
                          placeholder="1403" 
                          value={plYearInput} 
                          onChange={e => setPlYearInput(e.target.value)} 
                          className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-center"
                        />
                      </div>
                    </div>

                     {formData.contractType === 'CBS' ? (
                      <div className="border border-slate-200 bg-white p-5 rounded-2xl pt-4 space-y-4 col-span-2">
                        <div className="flex items-center gap-2 text-amber-700">
                          <FileSpreadsheet size={18} />
                          <span className="text-xs font-black">مدیریت و بارگذاری قالب استاندارد اکسل (CBS)</span>
                        </div>
                        <p className="text-[10px] text-stone-500 font-bold leading-relaxed">
                          جهت تعریف سریع و ساختاریافته فعالیت‌های ساختار شکست هزینه (CBS)، ابتدا فایل قالب اکسل استاندارد را دانلود نموده، اطلاعات را تکمیل کرده و سپس بارگذاری نمایید.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <button 
                            type="button" 
                            onClick={handleDownloadSampleExcel} 
                            className="flex items-center justify-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 p-3 rounded-xl text-xs font-bold transition-all"
                          >
                            <Download size={14} />
                            <span>دانلود قالب نمونه اکسل</span>
                          </button>

                          <button 
                            type="button" 
                            onClick={() => fileInputRef.current?.click()} 
                            disabled={isUploading} 
                            className="flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white p-3 rounded-xl text-xs font-bold transition-all shadow-md shadow-stone-500/10"
                          >
                            {isUploading ? (
                              <><Loader2 size={14} className="animate-spin"/> در حال پردازش...</>
                            ) : (
                              <><Upload size={14}/> <span>آپلود اکسل با قالب استاندارد</span></>
                            )}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 w-full col-span-2">
                        {(formData.contractType === 'CBS' || formData.contractType === 'LUMP_SUM' || formData.contractType === 'COST_PLUS') && (
                          <button 
                            type="button" 
                            onClick={handleLoadDefaultCBS} 
                            className="flex items-center justify-center gap-2 bg-[#faf8f4] text-amber-700 border border-blue-200 hover:bg-stone-100 p-3.5 rounded-xl text-xs font-bold transition-all"
                          >
                            ⚡ بارگذاری ساختار شکست پیش‌فرض ({formData.contractType === 'CBS' ? 'CBS' : formData.contractType === 'LUMP_SUM' ? 'WBS' : 'هزینه‌ای'})
                          </button>
                        )}
                        <button 
                          type="button" 
                          onClick={() => fileInputRef.current?.click()} 
                          disabled={isUploading} 
                          className={`flex items-center justify-center gap-2 bg-stone-950 text-white hover:bg-black p-3.5 rounded-xl text-xs font-bold transition-all ${(formData.contractType !== 'CBS' && formData.contractType !== 'LUMP_SUM' && formData.contractType !== 'COST_PLUS') ? 'col-span-2' : ''}`}
                        >
                          {isUploading ? <><Loader2 size={16} className="animate-spin"/> در حال پردازش...</> : <><Upload size={16}/> {(formData.contractType === 'CBS' || formData.contractType === 'LUMP_SUM' || formData.contractType === 'COST_PLUS') ? 'بارگذاری فایل ساختار شکست (اکسل)' : 'بارگذاری فایل اکسل فهرست بها'}</>}
                        </button>
                      </div>
                    )}
                  </div>

                  <input type="file" ref={fileInputRef} onChange={handlePriceListUpload} className="hidden" accept=".xlsx, .xls"/>
                  
                  {cbsUploadSuccessMsg && (
                    <div className="bg-emerald-50 text-emerald-600 p-4 rounded-2xl border border-emerald-200 flex items-center gap-2 text-sm font-bold animate-fadeIn">
                       <CheckCircle size={18} /> {cbsUploadSuccessMsg}
                    </div>
                  )}

                  <div className="space-y-2 pt-4">
                    <h4 className="text-xs font-black text-stone-600 border-b pb-2">
                      {(formData.contractType === 'CBS' || formData.contractType === 'LUMP_SUM' || formData.contractType === 'COST_PLUS') ? 'ساختار شکست‌های تعریف شده برای این پروژه:' : 'فهارس بهای بارگذاری شده برای این پروژه:'}
                    </h4>
                    {formData.priceLists && formData.priceLists.length > 0 ? (
                      formData.priceLists.map(pl => {
                        const isExpanded = expandedPlId === pl.id || (expandedPlId === null && formData.priceLists.length === 1);
                        return (
                          <div key={pl.id} className="bg-white border p-5 rounded-[2rem] flex flex-col gap-4 shadow-sm border-slate-200">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <div className="flex items-center gap-3">
                                 <FileSpreadsheet className="text-emerald-500" size={24}/>
                                 <div>
                                   <span className="text-xs font-black block text-stone-900">{pl.title} ({pl.year}) {(pl.type === 'CBS' || pl.type === 'LUMP_SUM' || pl.type === 'COST_PLUS') && <span className="bg-stone-100 text-amber-700 px-2.5 py-0.5 rounded-full text-[9px] mr-2 font-black">{pl.type === 'CBS' ? 'CBS' : pl.type === 'LUMP_SUM' ? 'WBS' : 'Target Costs'}</span>}</span>
                                   <span className="text-[10px] text-slate-400 font-medium block mt-1">تعداد ردیف‌ها: {pl.items?.length || 0} ردیف | فایل: {pl.fileName || 'تولید پیش‌فرض'}</span>
                                 </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {formData.contractType !== 'فهرست بهایی' && pl.items && pl.items.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => setExpandedPlId(isExpanded ? "NONE_COLLAPSED" : pl.id)}
                                    className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-[10px] font-black rounded-xl flex items-center gap-1 transition-all"
                                  >
                                    {isExpanded ? 'بستن پیش‌نمایش' : 'مشاهده پیش‌نمایش ساختار شکست'}
                                  </button>
                                )}
                                <button 
                                  type="button" 
                                  onClick={() => setFormData({ ...formData, priceLists: (formData.priceLists || []).filter(p => p.id !== pl.id) })}
                                  className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>

                            {/* Searchable and scrollable structure preview */}
                            {formData.contractType !== 'فهرست بهایی' && isExpanded && pl.items && pl.items.length > 0 && (
                              <div className="border-t border-slate-100 pt-3 mt-2 space-y-3 animate-fadeIn text-right" dir="rtl">
                                <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 flex-wrap gap-2">
                                  <span className="text-[10px] font-black text-stone-700">📋 پیش‌نمایش ردیف‌های کشف شده جهت ورود:</span>
                                </div>
                                <div className="border border-slate-200/80 rounded-xl overflow-hidden max-h-[320px] overflow-y-auto custom-scrollbar">
                                <table className="w-full text-right text-[10px]">
                                  <thead className="bg-stone-100 text-stone-700 font-black sticky top-0 border-b border-stone-200 z-10">
                                    <tr>
                                      <th className="p-2.5 font-mono w-24">CBS Code</th>
                                      <th className="p-2.5">شرح فعالیت</th>
                                      <th className="p-2.5 text-center w-16">واحد</th>
                                      <th className="p-2.5 text-center w-16">مقدار</th>
                                      <th className="p-2.5 text-left w-20">وزن ٪</th>
                                      <th className="p-2.5 text-left w-32">برآورد ({formData.currency || 'تومان'})</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-stone-100 text-stone-600 font-bold">
                                    {pl.items.map((row, i) => (
                                      <tr key={i} className="hover:bg-amber-50/10 transition-colors">
                                        <td className="p-2.5 font-mono text-stone-800 font-black">{row.code || '-'}</td>
                                        <td className="p-2.5 text-stone-700">{row.description}</td>
                                        <td className="p-2.5 text-center text-stone-400">{row.unit || 'پروژه'}</td>
                                        <td className="p-2.5 text-center text-stone-500 font-mono">{row.quantity !== undefined ? row.quantity.toLocaleString('fa-IR') : '۱'}</td>
                                        <td className="p-2.5 text-left text-amber-700 font-mono">{row.weightPercent !== undefined ? `${row.weightPercent}%` : '-'}</td>
                                        <td className="p-2.5 text-left text-stone-700 font-mono">{row.price ? row.price.toLocaleString('fa-IR') : '۰'}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                              <div className="flex flex-col md:flex-row gap-2 bg-emerald-50/50 p-3 border border-emerald-100 rounded-xl text-[10px] font-black text-emerald-800 justify-between items-center">
                                <div className="flex gap-4 flex-wrap">
                                  <span>مجموع درصد وزنی فعالیت‌ها (ریشه): {calculateCbsRootWeightsSum(pl.items)}٪</span>
                                  <span>مجموع کل برآورد هزینه مبنا (ریشه): {calculateCbsRootBudgetSum(pl.items).toLocaleString('fa-IR')} تومان</span>
                                </div>
                                <span className="text-[9px] text-stone-400 font-bold">روابط درختی بر اساس کدهای سلسله‌مراتبی پیوند داده شده‌اند.</span>
                              </div>
                            </div>
                          )}
                        </div>
                        );
                      })
                    ) : (
                      <p className="text-xs text-stone-400 italic text-center py-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        {formData.contractType === 'CBS' 
                          ? 'هیچ ساختار شکست هزینه‌ای (CBS) برای این پروژه بارگذاری نشده است. لطفاً فایل اکسل CBS را بارگذاری نمایید.' 
                          : (formData.contractType === 'LUMP_SUM' || formData.contractType === 'COST_PLUS')
                            ? 'هیچ ساختار شکستی برای این پروژه بارگذاری نشده است.'
                            : 'هیچ فهرست بهایی برای این پروژه بارگذاری نشده است.'}
                      </p>
                    )}
                  </div>
                </div>}

                {activeModalTab === 'estimate_upload' && <div className="space-y-4 animate-fadeIn">
                  <div className="bg-[#faf8f4] p-6 rounded-2xl border border-slate-200/60 space-y-4 text-right" dir="rtl">
                    <div className="flex items-center gap-2 text-amber-700">
                      <FileSpreadsheet size={18} />
                      <h4 className="text-xs font-black text-stone-700">تعریف یا بارگذاری برآورد پیمان (قرارداد فهرست بهایی)</h4>
                    </div>
                    <p className="text-[10px] text-stone-500 font-bold leading-relaxed">
                      جهت تعریف سریع و ساختاریافته اقلام برآورد اولیه قرارداد فهرست بهایی، فایل اکسل برآورد را بارگذاری نمایید. این اطلاعات به صورت خودکار در بخش برآورد پیمان دفتر فنی ثبت خواهند شد.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-stone-500 mb-1 block">عنوان برآورد (مثال: برآورد اولیه ابنیه)</label>
                        <input 
                          type="text" 
                          placeholder="مثلاً: برآورد اولیه کل قرارداد" 
                          value={estimateTitleInput} 
                          onChange={e => setEstimateTitleInput(e.target.value)} 
                          className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-stone-700"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-stone-500 mb-1 block">سال برآورد پایه</label>
                        <input 
                          type="text" 
                          placeholder="1403" 
                          value={estimateYearInput} 
                          onChange={e => setEstimateYearInput(e.target.value)} 
                          className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-stone-700 text-center"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      <button 
                        type="button"
                        onClick={handleDownloadEstimateTemplate}
                        className="flex items-center justify-center gap-2 bg-amber-50 hover:bg-amber-100 text-amber-800 p-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm border border-amber-200/50"
                      >
                        <Download size={16}/> <span>دانلود قالب اکسل برآورد پیمان</span>
                      </button>

                      <button 
                        type="button" 
                        onClick={() => estimateFileInputRef.current?.click()} 
                        disabled={isUploadingEstimate} 
                        className="flex items-center justify-center gap-2 bg-stone-950 hover:bg-black text-white p-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
                      >
                        {isUploadingEstimate ? (
                          <><Loader2 size={16} className="animate-spin"/> در حال پردازش...</>
                        ) : (
                          <><Upload size={16}/> <span>بارگذاری فایل اکسل برآورد پیمان</span></>
                        )}
                      </button>
                    </div>

                    {/* Detailed guide block */}
                    <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-200/40 text-[10px] text-stone-600 space-y-2 leading-relaxed" dir="rtl">
                      <div className="font-black text-stone-700 flex items-center gap-1">
                        <span>💡 راهنمای ثبت آیتم‌های ستاره‌دار و فاکتوری در فایل اکسل:</span>
                      </div>
                      <p className="font-bold">
                        نرم‌افزار به صورت هوشمند از دو روش زیر آیتم‌های ستاره‌دار و فاکتوری را تشخیص می‌دهد:
                      </p>
                      <ul className="list-disc list-inside space-y-1 font-semibold pr-2">
                        <li>
                          <strong className="text-amber-800">روش اول (ستون نوع آیتم - توصیه شده):</strong> ستونی با عنوان <code className="bg-white px-1.5 py-0.5 rounded border">نوع آیتم</code> در اکسل ایجاد کرده و برای ردیف‌های ستاره‌دار مقدار <code className="bg-white px-1.5 py-0.5 rounded border text-amber-700">STARRED</code> یا <code className="bg-white px-1.5 py-0.5 rounded border text-amber-700">ستاره دار</code> و برای ردیف‌های فاکتوری مقدار <code className="bg-white px-1.5 py-0.5 rounded border text-blue-700">INVOICE</code> یا <code className="bg-white px-1.5 py-0.5 rounded border text-blue-700">فاکتوری</code> را بنویسید.
                        </li>
                        <li>
                          <strong className="text-amber-800">روش دوم (تشخیص هوشمند از روی کد یا شرح):</strong> در صورتی که ستون نوع آیتم وجود نداشته باشد:
                          <ul className="list-circle list-inside pr-4 mt-1 space-y-1">
                            <li>کدهایی که دارای علامت ستاره هستند (مانند <code className="bg-white px-1.5 py-0.5 rounded border">170501*</code>) یا در شرح ردیف آن‌ها عبارت <code className="bg-white px-1.5 py-0.5 rounded border">ستاره دار</code> ذکر شده باشد، به عنوان **ستاره‌دار** تشخیص داده می‌شوند.</li>
                            <li>کدهایی که با حرف <code className="bg-white px-1.5 py-0.5 rounded border">ف</code> یا <code className="bg-white px-1.5 py-0.5 rounded border">F</code> شروع می‌شوند یا در شرح ردیف آن‌ها واژه <code className="bg-white px-1.5 py-0.5 rounded border">فاکتوری</code> وجود دارد، به عنوان **فاکتوری** تشخیص داده می‌شوند.</li>
                          </ul>
                        </li>
                      </ul>
                    </div>
                  </div>

                  <input type="file" ref={estimateFileInputRef} onChange={handleEstimateUpload} className="hidden" accept=".xlsx, .xls"/>

                  {estimateUploadSuccessMsg && (
                    <div className="bg-emerald-50 text-emerald-600 p-4 rounded-2xl border border-emerald-200 flex items-center gap-2 text-sm font-bold animate-fadeIn">
                       <CheckCircle size={18} /> {estimateUploadSuccessMsg}
                    </div>
                  )}

                  <div className="space-y-2 pt-4">
                    <h4 className="text-xs font-black text-stone-600 border-b pb-2">
                      اقلام برآورد پیمان بارگذاری شده برای این پروژه:
                    </h4>
                    {uploadedEstimateItems && uploadedEstimateItems.length > 0 ? (
                      <div className="bg-white border p-5 rounded-[2rem] flex flex-col gap-4 shadow-sm border-slate-200">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-3">
                            <FileSpreadsheet className="text-emerald-500" size={24}/>
                            <div>
                              <span className="text-xs font-black block text-stone-900">برآورد منضم به پیمان ({estimateYearInput})</span>
                              <span className="text-[10px] text-slate-400 font-medium block mt-1">
                                تعداد ردیف‌ها: {uploadedEstimateItems.length} ردیف | جمع کل برآورد: {uploadedEstimateItems.reduce((acc, item) => acc + (item.total || 0), 0).toLocaleString('fa-IR')} ریال
                              </span>
                            </div>
                          </div>
                          <button 
                            type="button" 
                            onClick={() => {
                              setUploadedEstimateItems([]);
                              setEstimateUploadSuccessMsg(null);
                            }}
                            className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl cursor-pointer"
                            title="حذف برآورد"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>

                        {/* Preview table */}
                        <div className="border-t border-slate-100 pt-3 mt-2 space-y-3 animate-fadeIn text-right" dir="rtl">
                          <div className="border border-slate-200/80 rounded-xl overflow-hidden max-h-[240px] overflow-y-auto custom-scrollbar">
                            <table className="w-full text-right text-[10px]">
                              <thead className="bg-stone-100 text-stone-700 font-black sticky top-0 border-b border-stone-200 z-10">
                                <tr>
                                  <th className="p-2.5 font-mono w-24">کد آیتم</th>
                                  <th className="p-2.5">شرح ردیف</th>
                                  <th className="p-2.5 text-center w-16">واحد</th>
                                  <th className="p-2.5 text-center w-16">مقدار</th>
                                  <th className="p-2.5 text-left w-24">بهای واحد (ریال)</th>
                                  <th className="p-2.5 text-left w-32">بهای کل (ریال)</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-stone-100 text-stone-600 font-bold">
                                {uploadedEstimateItems.slice(0, 100).map((row, i) => (
                                  <tr key={i} className="hover:bg-amber-50/10 transition-colors">
                                    <td className="p-2.5 font-mono text-stone-800 font-black flex items-center gap-1.5 flex-wrap">
                                      <span>{row.code || '-'}</span>
                                      {row.itemType === 'STARRED' && (
                                        <span className="bg-amber-100 text-amber-800 text-[8px] px-1.5 py-0.5 rounded-md font-sans font-black">ستاره‌دار</span>
                                      )}
                                      {row.itemType === 'INVOICE' && (
                                        <span className="bg-blue-100 text-blue-800 text-[8px] px-1.5 py-0.5 rounded-md font-sans font-black">فاکتوری</span>
                                      )}
                                    </td>
                                    <td className="p-2.5 text-stone-700">{row.description}</td>
                                    <td className="p-2.5 text-center text-stone-400">{row.unit || 'پروژه'}</td>
                                    <td className="p-2.5 text-center text-stone-500 font-mono">{row.quantity !== undefined ? row.quantity.toLocaleString('fa-IR') : '۱'}</td>
                                    <td className="p-2.5 text-left text-stone-700 font-mono">{row.unitPrice ? row.unitPrice.toLocaleString('fa-IR') : '۰'}</td>
                                    <td className="p-2.5 text-left text-stone-800 font-black font-mono">{row.total ? row.total.toLocaleString('fa-IR') : '۰'}</td>
                                  </tr>
                                ))}
                                {uploadedEstimateItems.length > 100 && (
                                  <tr>
                                    <td colSpan={6} className="p-3 text-center text-stone-400 italic">
                                      و {uploadedEstimateItems.length - 100} ردیف دیگر...
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-stone-400 italic text-center py-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        هیچ فایل برآورد پیمانی بارگذاری نشده است.
                      </p>
                    )}
                  </div>
                </div>}

                {activeModalTab === 'settings' && <div className="space-y-6 animate-fadeIn text-right" dir="rtl">
                  <div className="p-4 bg-slate-50 rounded-3xl border border-slate-200 text-right">
                    <span className="text-xs font-black text-stone-700 block mb-1">⚙️ تنظیمات و تقویم پروژه</span>
                    <p className="text-[10px] text-slate-400 font-bold">تنظیم پارامترهای پایه‌ای تقویم کاری و زمان کارگاه برای دفتر فنی</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-black text-stone-600 block mb-1">تقویم کاری استاندارد پروژه (Working Calendar)</label>
                      <select 
                        value={formData.calendar || 'تقویم کارگاهی (۶ روزه - ۴۴ ساعت در هفته)'} 
                        onChange={e => setFormData({...formData, calendar: e.target.value})}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-stone-700"
                      >
                        <option value="تقویم کارگاهی (۶ روزه - ۴۴ ساعت در هفته)">تقویم کارگاهی استاندارد (شنبه تا پنجشنبه - ۸ ساعت روزانه)</option>
                        <option value="تقویم کارگاهی فشرده (۶ روزه - ۶۰ ساعت در هفته)">تقویم فشرده کارگاه صنعتی (شنبه تا پنجشنبه - ۱۰ ساعت روزانه)</option>
                        <option value="تقویم رسمی کشور">تقویم اداری رسمی کل کشور (پنج روز کاری در هفته)</option>
                        <option value="تقویم نوبتی (شیفت شب و روز)">تقویم نوبتی ۲۴ ساعته (۷ روز هفته - شیفت‌های چرخشی)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-black text-stone-600 block mb-1">ساعات کاری استاندار روزانه (ساعت مفید)</label>
                      <input 
                        type="number" 
                        placeholder="8" 
                        value={(formData.defaultSettings as any)?.dailyHours || 8} 
                        onChange={e => setFormData({
                          ...formData, 
                          defaultSettings: { ...formData.defaultSettings, dailyHours: Number(e.target.value) } as any
                        })}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-stone-700 text-center" 
                      />
                    </div>
                  </div>
                </div>}

                {activeModalTab === 'notes_attach' && <div className="space-y-6 animate-fadeIn text-right" dir="rtl">
                  <div className="p-4 bg-slate-50 rounded-3xl border border-slate-200 text-right">
                    <span className="text-xs font-black text-stone-700 block mb-1">📝 یادداشت‌ها و مستندات رسمی پیوست پروژه</span>
                    <p className="text-[10px] text-slate-400 font-bold">بخش تعاملی ثبت تذکرات، الزامات قراردادی، ابلاغیه‌ها و بارگذاری مستندات فنی</p>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-100 space-y-3 shadow-sm">
                    <label className="text-xs font-black text-stone-700 block">💬 ثبت یادداشت یا ابلاغیه جدید</label>
                    <div className="flex gap-2">
                      <textarea 
                        rows={2}
                        placeholder="متن یادداشت یا مصوبه قراردادی را وارد کنید..." 
                        value={newNote} 
                        onChange={e => setNewNote(e.target.value)} 
                        className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold resize-none"
                      />
                    </div>
                    <div className="flex justify-end">
                      <button 
                        type="button" 
                        onClick={handleAddNote} 
                        className="px-5 py-2 bg-amber-600 text-white rounded-xl text-xs font-bold hover:bg-amber-700 transition-all"
                      >
                        ثبت و ذخیره یادداشت
                      </button>
                    </div>

                    <div className="border-t pt-3 space-y-2 max-h-48 overflow-y-auto">
                      <span className="text-[10px] font-black text-slate-400 block">یادداشت‌های ثبت شده پیشین:</span>
                      {(formData.notesList || []).map((n) => (
                        <div key={n.id} className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-right relative">
                          <div className="flex justify-between items-center mb-1.5">
                            <span className="text-[10px] font-black text-amber-700">{n.author}</span>
                            <span className="text-[9px] text-slate-400 font-mono font-bold">{n.date}</span>
                          </div>
                          <p className="text-xs font-bold text-stone-700 leading-relaxed">{n.text}</p>
                          <button 
                            type="button" 
                            onClick={() => setFormData(prev => ({ ...prev, notesList: (prev.notesList || []).filter(item => item.id !== n.id) }))}
                            className="absolute left-2.5 top-2.5 text-slate-300 hover:text-red-500 text-xs font-bold"
                          >
                            حذف
                          </button>
                        </div>
                      ))}
                      {(formData.notesList || []).length === 0 && <p className="text-[10px] text-slate-400 italic text-center py-2">هیچ یادداشتی ثبت نشده است.</p>}
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-100 space-y-3 shadow-sm">
                    <label className="text-xs font-black text-stone-700 block flex items-center gap-1.5">📎 بارگذاری فایل‌ها و پیوست‌های فنی قرارداد (Attachments)</label>

                    {/* Real File Upload Section */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                      <div>
                        <label className="text-[10px] font-black text-stone-600 block mb-1">اطلاعات اولیه و بابت/کاربرد فایل</label>
                        <input
                          type="text"
                          placeholder="مثال: نقشه جانمایی جانبی، ابلاغیه تخصیص زمین، اسناد تضمین..."
                          value={attachmentPurpose}
                          onChange={e => setAttachmentPurpose(e.target.value)}
                          className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                        />
                      </div>
                      <input
                        type="file"
                        ref={attachmentFileInputRef}
                        onChange={handleRealFileUpload}
                        multiple
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => attachmentFileInputRef.current?.click()}
                        className="w-full p-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
                      >
                        <Upload size={16}/> بارگذاری فایل از درایوهای کامپیوتر
                      </button>
                    </div>

                    <div className="border-t pt-3 space-y-2">
                      <span className="text-[10px] font-black text-slate-400 block">پیوست‌های ثبت شده پروژه:</span>
                      {(formData.attachmentsList || []).map((att: any) => (
                        <div key={att.id} className="bg-white border p-3 rounded-xl flex items-center justify-between text-xs hover:shadow-sm transition-all">
                          <div className="flex items-center gap-3">
                            <FileText size={18} className="text-amber-600 shrink-0" />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-black text-stone-800">{att.name}</span>
                                <span className="text-[9px] text-slate-400 font-bold">({att.size})</span>
                              </div>
                              <p className="text-[10px] text-stone-500 font-bold mt-0.5">📌 بابت / توضیحات: {att.purpose || 'اسناد فنی پیمان'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[9px] text-slate-400 font-mono font-bold">{att.date}</span>
                            {att.url && (
                              <a
                                href={att.url}
                                download={att.name}
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-stone-700 text-[10px] font-black rounded-lg flex items-center gap-1"
                              >
                                <Download size={12}/> دانلود
                              </a>
                            )}
                            <button 
                              type="button" 
                              onClick={() => setFormData(p => ({ ...p, attachmentsList: (p.attachmentsList || []).filter((item: any) => item.id !== att.id) }))} 
                              className="text-red-500 hover:text-red-700 font-bold p-1 hover:bg-red-50 rounded"
                            >
                              حذف
                            </button>
                          </div>
                        </div>
                      ))}
                      {(formData.attachmentsList || []).length === 0 && <p className="text-[10px] text-slate-400 italic text-center py-2">هیچ فایلی ضمیمه نشده است.</p>}
                    </div>
                  </div>
                </div>}

                {activeModalTab === 'technical' && formData.contractType !== 'CBS' && <div className="space-y-6 animate-fadeIn">
                    <div className="grid grid-cols-3 gap-4">
                      {FIXED_COEFFICIENT_DESCRIPTORS.map(d => (
                         <div key={d.key} className="bg-slate-50 p-3 rounded-xl">
                            <label className="text-xs font-bold text-stone-500">{d.label}</label>
                            <input type="number" step="0.01" value={(formData.coefficients as any)?.[d.key] || 1} onChange={e => setFormData({...formData, coefficients: {...formData.coefficients!, [d.key]: Number(e.target.value)}})} className="w-full bg-white p-2 rounded-lg mt-1 text-center font-bold"/>
                         </div>
                      ))}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm mb-2">ضرایب کلی</h4>
                      {formData.coefficients?.generalCoefficients?.map((gc, i) => (
                        <div key={gc.id} className="flex items-center gap-2 mb-2">
                          <input placeholder="نام ضریب" value={gc.name} onChange={e => handleCoeffChange('general', i, 'name', e.target.value)} className="w-full p-2 bg-slate-50 rounded-lg"/>
                          <input type="number" step="0.01" value={gc.value} onChange={e => handleCoeffChange('general', i, 'value', Number(e.target.value))} className="w-32 p-2 bg-slate-50 rounded-lg text-center"/>
                          <button type="button" onClick={() => removeCoeff('general', gc.id)} className="p-2 text-red-500"><Trash2 size={16}/></button>
                        </div>
                      ))}
                      <button type="button" onClick={() => addCoeff('general')} className="text-xs font-bold text-amber-600 mt-2">+ افزودن ضریب کلی</button>
                    </div>
                    <div>
                      <h4 className="font-bold text-sm mb-2">ضرایب فصلی</h4>
                      {formData.coefficients?.chapterCoefficients?.map((cc, i) => (
                        <div key={cc.id} className="flex items-center gap-2 mb-2">
                          <input placeholder="کد فصل" value={cc.chapterCode} onChange={e => handleCoeffChange('chapter', i, 'chapterCode', e.target.value)} className="w-full p-2 bg-slate-50 rounded-lg"/>
                          <input type="number" step="0.01" value={cc.multiplier} onChange={e => handleCoeffChange('chapter', i, 'multiplier', Number(e.target.value))} className="w-32 p-2 bg-slate-50 rounded-lg text-center"/>
                           <button type="button" onClick={() => removeCoeff('chapter', cc.id)} className="p-2 text-red-500"><Trash2 size={16}/></button>
                        </div>
                      ))}
                      <button type="button" onClick={() => addCoeff('chapter')} className="text-xs font-bold text-amber-600 mt-2">+ افزودن ضریب فصلی</button>
                    </div>
                </div>}

              </form>
            </div>

            <div className="p-6 flex justify-end gap-4 border-t border-slate-200 bg-slate-50/50 rounded-b-[3rem]">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 text-stone-600 font-bold rounded-xl hover:bg-slate-200 transition-all">انصراف</button>
              <button type="submit" onClick={handleSubmit} className="px-8 py-3 bg-amber-600 text-white font-bold rounded-xl shadow-lg shadow-stone-500/20 active:scale-95 transition-all">
                <div className="flex items-center gap-2">
                  <Save size={18}/> {editingProject ? 'ذخیره تغییرات' : 'ایجاد پروژه'}
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {isDeleteModalOpen && (
         <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-md animate-fadeIn">
            <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm text-center">
               <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full mx-auto flex items-center justify-center mb-4"><AlertTriangle size={32}/></div>
               <h3 className="text-lg font-black text-stone-900">حذف پروژه</h3>
               <p className="text-sm text-stone-500 mt-2">آیا از حذف این پروژه اطمینان دارید؟</p>
               <div className="flex gap-4 mt-6">
                  <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 py-3 rounded-xl bg-slate-100 text-stone-700 font-bold">انصراف</button>
                  <button onClick={handleDelete} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold">تایید و حذف</button>
               </div>
            </div>
         </div>
      )}

      {isClearWbsModalOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-md animate-fadeIn" dir="rtl">
          <div className="bg-white dark:bg-stone-900 rounded-3xl shadow-2xl p-6 sm:p-8 max-w-md w-full text-center border border-stone-200 dark:border-stone-800">
            <div className="w-16 h-16 bg-red-50 dark:bg-red-950/40 text-red-500 rounded-2xl mx-auto flex items-center justify-center mb-4">
              <Trash2 size={32} />
            </div>
            <h3 className="text-base font-black text-stone-900 dark:text-white">
              تأیید حذف اطلاعات جدول ساختار شکست WBS
            </h3>
            <p className="text-xs text-stone-600 dark:text-stone-400 mt-2 leading-relaxed font-bold">
              آیا از حذف کامل اطلاعات جدول ساختار شکست WBS و برنامه زمان‌بندی اولیه این پیمان اطمینان دارید؟
              تمامی ردیف‌ها از جدول و تمامی بخش‌های کنترل و برنامه‌ریزی (WBS، نمودار گانت، شاخص‌های ارزش کسب‌شده EVM و منحنی S) به صورت اتوماتیک پاکسازی خواهند شد.
            </p>
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setIsClearWbsModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-bold text-xs hover:bg-stone-200 cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={confirmClearWbsTable}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs shadow-md cursor-pointer transition-all active:scale-95"
              >
                بله، حذف اطلاعات جدول
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
