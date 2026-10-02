import React, { useState, useEffect, useMemo } from 'react';
import { SystemAdminService } from '../../services/systemAdminService';
import { HRService } from '../../services/hrService';
import { Organization, OrganizationType, SystemProject, SystemUser } from '../../systemAdminTypes';
import { Personnel } from '../../types';
import { 
  Building2, 
  Plus, 
  Edit2, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Search, 
  Filter, 
  Globe, 
  Phone, 
  Mail, 
  MapPin, 
  Users, 
  Briefcase, 
  ShieldCheck, 
  Eye, 
  Hash, 
  Calendar, 
  FileText, 
  Check, 
  X, 
  LayoutGrid, 
  List, 
  FolderKanban,
  SlidersHorizontal,
  ExternalLink,
  ChevronDown,
  Info,
  Shield,
  Layers,
  Upload,
  Image as ImageIcon
} from 'lucide-react';
import DeleteModal from '../../components/DeleteModal';
import ColorWell from '../../components/ColorWell';

type ViewMode = 'grid' | 'table';
type SortField = 'name' | 'code' | 'type' | 'projects' | 'users';
type ModalTab = 'general' | 'legal' | 'contact' | 'description' | 'projects';
type DossierTab = 'overview' | 'legal' | 'contact' | 'projects' | 'users';

const Organizations: React.FC = () => {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [allProjects, setAllProjects] = useState<SystemProject[]>([]);
  const [allUsers, setAllUsers] = useState<SystemUser[]>([]);
  const [allPersonnel, setAllPersonnel] = useState<Personnel[]>([]);
  
  // View & Filter States
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortAsc, setSortAsc] = useState(true);

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [activeFormTab, setActiveFormTab] = useState<ModalTab>('general');
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [selectedInitialProjects, setSelectedInitialProjects] = useState<string[]>([]);
  
  const [formData, setFormData] = useState<Partial<Organization>>({
    name: '',
    code: '',
    type: OrganizationType.EMPLOYER,
    isActive: true,
    brandColor: '#2563eb',
    nationalId: '',
    economicCode: '',
    registrationNumber: '',
    ceoName: '',
    phone: '',
    email: '',
    website: '',
    address: '',
    postalCode: '',
    establishedYear: '',
    description: ''
  });

  // Dossier Modal
  const [dossierOrg, setDossierOrg] = useState<Organization | null>(null);
  const [activeDossierTab, setActiveDossierTab] = useState<DossierTab>('overview');

  // Quick Project Assignment Modal
  const [projectAssignOrg, setProjectAssignOrg] = useState<Organization | null>(null);
  const [tempAssignedProjectIds, setTempAssignedProjectIds] = useState<string[]>([]);

  // Delete State
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteWarning, setDeleteWarning] = useState<string | null>(null);

  // Form Validation & Alerts
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = () => {
    const loadedOrgs = SystemAdminService.getOrganizations();
    const loadedProjects = SystemAdminService.getProjects();
    const loadedUsers = SystemAdminService.getUsers();
    const loadedPersonnel = HRService.getPersonnelList();

    setOrgs(loadedOrgs);
    setAllProjects(loadedProjects);
    setAllUsers(loadedUsers);
    setAllPersonnel(loadedPersonnel);
  };

  // Helper stats per organization
  const getOrgProjects = (orgId: string): SystemProject[] => {
    const assignedIds = SystemAdminService.getAssignedProjectsForOrg(orgId);
    return allProjects.filter(p => assignedIds.includes(String(p.id)));
  };

  const getOrgUsers = (orgId: string): SystemUser[] => {
    return allUsers.filter(u => u.orgId === orgId);
  };

  const getOrgPersonnel = (orgId: string): Personnel[] => {
    return allPersonnel.filter(p => p.orgId === orgId);
  };

  // Top KPI Metrics
  const stats = useMemo(() => {
    const total = orgs.length;
    const active = orgs.filter(o => o.isActive).length;
    const employers = orgs.filter(o => o.type === OrganizationType.EMPLOYER).length;
    const consultants = orgs.filter(o => o.type === OrganizationType.CONSULTANT).length;
    const contractors = orgs.filter(o => o.type === OrganizationType.CONTRACTOR).length;
    const totalUsers = allUsers.filter(u => u.orgId && u.orgId !== 'SYSTEM').length;
    const totalPersonnel = allPersonnel.length;

    return {
      total,
      active,
      inactive: total - active,
      employers,
      consultants,
      contractors,
      totalUsers,
      totalPersonnel
    };
  }, [orgs, allUsers, allPersonnel]);

  // Filtered & Sorted Organizations
  const filteredOrgs = useMemo(() => {
    return orgs
      .filter(org => {
        const matchesSearch = 
          (org.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (org.code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (org.nationalId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (org.ceoName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (org.phone || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (org.address || '').toLowerCase().includes(searchTerm.toLowerCase());

        const matchesType = typeFilter === 'ALL' || org.type === typeFilter;
        const matchesStatus = 
          statusFilter === 'ALL' ||
          (statusFilter === 'ACTIVE' && org.isActive) ||
          (statusFilter === 'INACTIVE' && !org.isActive);

        return matchesSearch && matchesType && matchesStatus;
      })
      .sort((a, b) => {
        let valA: any = '';
        let valB: any = '';

        if (sortField === 'name') {
          valA = a.name || '';
          valB = b.name || '';
        } else if (sortField === 'code') {
          valA = a.code || '';
          valB = b.code || '';
        } else if (sortField === 'type') {
          valA = a.type || '';
          valB = b.type || '';
        } else if (sortField === 'projects') {
          valA = getOrgProjects(a.id).length;
          valB = getOrgProjects(b.id).length;
        } else if (sortField === 'users') {
          valA = getOrgUsers(a.id).length;
          valB = getOrgUsers(b.id).length;
        }

        if (typeof valA === 'string') {
          return sortAsc ? valA.localeCompare(valB, 'fa') : valB.localeCompare(valA, 'fa');
        }
        return sortAsc ? (valA - valB) : (valB - valA);
      });
  }, [orgs, searchTerm, typeFilter, statusFilter, sortField, sortAsc, allProjects, allUsers]);

  // Handle Quick Toggle Status
  const handleToggleStatus = (org: Organization) => {
    const updated: Organization = {
      ...org,
      isActive: !org.isActive
    };
    SystemAdminService.saveOrganization(updated);
    loadAllData();
  };

  // Handle Logo Upload
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      setFormError('حجم فایل تصویر لوگو نباید بیشتر از ۳ مگابایت باشد.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (!result) return;

      // Optimize and resize image for optimal localStorage storage
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 260;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/png', 0.9);
          setFormData(prev => ({ ...prev, logo: compressed }));
        } else {
          setFormData(prev => ({ ...prev, logo: result }));
        }
      };
      img.onerror = () => {
        setFormData(prev => ({ ...prev, logo: result }));
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingOrg(null);
    setActiveFormTab('general');
    setFormError(null);
    setFormData({
      name: '',
      code: '',
      type: OrganizationType.EMPLOYER,
      isActive: true,
      brandColor: '#2563eb',
      logo: '',
      nationalId: '',
      economicCode: '',
      registrationNumber: '',
      ceoName: '',
      phone: '',
      email: '',
      website: '',
      address: '',
      postalCode: '',
      establishedYear: '',
      description: ''
    });
    setSelectedInitialProjects(allProjects.map(p => String(p.id)));
    setIsFormModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (org: Organization) => {
    setEditingOrg(org);
    setActiveFormTab('general');
    setFormError(null);
    setFormData({ ...org });
    const assigned = SystemAdminService.getAssignedProjectsForOrg(org.id);
    setSelectedInitialProjects(assigned);
    setIsFormModalOpen(true);
  };

  // Save Organization Form
  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const name = (formData.name || '').trim();
    const code = (formData.code || '').trim();

    if (!name) {
      setFormError('لطفاً نام رسمی سازمان را وارد فرمایید.');
      setActiveFormTab('general');
      return;
    }

    if (!code) {
      setFormError('لطفاً کد یکتای سازمان را وارد فرمایید.');
      setActiveFormTab('general');
      return;
    }

    // Check unique code
    const isDuplicate = orgs.some(o => o.code.toLowerCase() === code.toLowerCase() && o.id !== (editingOrg?.id || ''));
    if (isDuplicate) {
      setFormError(`کد سازمان "${code}" قبلاً برای سازمان دیگری ثبت شده است. لطفاً کد دیگری وارد فرمایید.`);
      setActiveFormTab('general');
      return;
    }

    const orgId = editingOrg ? editingOrg.id : 'org-' + Math.random().toString(36).substr(2, 9);
    const orgToSave: Organization = {
      id: orgId,
      name,
      code,
      type: formData.type || OrganizationType.EMPLOYER,
      isActive: formData.isActive ?? true,
      brandColor: formData.brandColor || '#2563eb',
      logo: formData.logo || '',
      nationalId: formData.nationalId || '',
      economicCode: formData.economicCode || '',
      registrationNumber: formData.registrationNumber || '',
      ceoName: formData.ceoName || '',
      phone: formData.phone || '',
      email: formData.email || '',
      website: formData.website || '',
      address: formData.address || '',
      postalCode: formData.postalCode || '',
      establishedYear: formData.establishedYear || '',
      description: formData.description || '',
      createdAt: editingOrg?.createdAt || new Date().toLocaleDateString('fa-IR')
    };

    SystemAdminService.saveOrganization(orgToSave);

    // Save project assignments if modified
    SystemAdminService.syncOrgProjectsAccess(orgId, selectedInitialProjects, orgToSave.isActive);

    setIsFormModalOpen(false);
    setEditingOrg(null);
    loadAllData();
  };

  // Open Quick Project Assignment Modal
  const handleOpenProjectAssign = (org: Organization) => {
    setProjectAssignOrg(org);
    const assigned = SystemAdminService.getAssignedProjectsForOrg(org.id);
    setTempAssignedProjectIds(assigned);
  };

  const handleSaveProjectAssignments = () => {
    if (!projectAssignOrg) return;
    SystemAdminService.syncOrgProjectsAccess(projectAssignOrg.id, tempAssignedProjectIds, projectAssignOrg.isActive);
    setProjectAssignOrg(null);
    loadAllData();
  };

  // Open Delete Confirmation
  const handleRequestDelete = (org: Organization) => {
    const userCount = getOrgUsers(org.id).length;
    const personnelCount = getOrgPersonnel(org.id).length;
    const projectCount = getOrgProjects(org.id).length;

    let warning = '';
    if (userCount > 0 || personnelCount > 0) {
      warning = `توجه: این سازمان دارای ${userCount} کاربر فعال و ${personnelCount} پرونده پرسنلی است. حذف سازمان باعث قطع دسترسی آنها خواهد شد.`;
    } else if (projectCount > 0) {
      warning = `این سازمان به ${projectCount} پروژه تخصیص داده شده است.`;
    }

    setDeleteWarning(warning || null);
    setDeleteId(org.id);
  };

  const confirmDelete = () => {
    if (deleteId) {
      SystemAdminService.deleteOrganization(deleteId);
      setDeleteId(null);
      setDeleteWarning(null);
      loadAllData();
    }
  };

  const getTypeBadge = (type: OrganizationType) => {
    switch (type) {
      case OrganizationType.EMPLOYER:
        return {
          label: 'کارفرما',
          bg: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300',
          dot: 'bg-blue-500'
        };
      case OrganizationType.CONSULTANT:
        return {
          label: 'مهندس مشاور',
          bg: 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300',
          dot: 'bg-purple-500'
        };
      case OrganizationType.CONTRACTOR:
        return {
          label: 'پیمانکار اجرایی',
          bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300',
          dot: 'bg-amber-500'
        };
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn dir-rtl pb-16" dir="rtl">
      
      {/* 1. Top Header Card */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl shrink-0 shadow-inner">
              <Building2 size={32} />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-black text-stone-900 dark:text-white tracking-tight">
                  مدیریت سازمان‌ها و ارکان پروژه
                </h1>
                <span className="bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-xs font-black px-3 py-1 rounded-full border border-amber-200 dark:border-amber-800/60">
                  {orgs.length} شرکت ثبت‌شده
                </span>
              </div>
              <p className="text-xs md:text-sm font-bold text-stone-500 dark:text-slate-400 mt-1">
                تعریف هویت حقوقی، مدیریت ارکان کارفرما، مهندسین مشاور و پیمانکاران، تخصیص پروژه و پایش پرسنل
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2.5 w-full lg:w-auto">
            <button
              onClick={handleOpenCreate}
              className="bg-amber-600 hover:bg-amber-700 text-white px-5 py-2.5 rounded-2xl font-black text-xs md:text-sm flex items-center gap-2 shadow-lg shadow-amber-600/25 transition-all active:scale-95"
            >
              <Plus size={18} />
              <span>ثبت سازمان جدید</span>
            </button>
          </div>
        </div>

        {/* 2. Top Analytics KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-6 border-t border-slate-100 dark:border-slate-800/80">
          <div className="bg-stone-50/80 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-stone-200/60 dark:border-slate-800">
            <span className="text-[11px] font-black text-stone-500 dark:text-slate-400 block mb-1">کل سازمان‌ها</span>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-black text-stone-900 dark:text-white">{stats.total}</span>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded-md">
                {stats.active} فعال
              </span>
            </div>
          </div>

          <div className="bg-blue-50/50 dark:bg-blue-950/20 p-3.5 rounded-2xl border border-blue-100 dark:border-blue-900/40">
            <span className="text-[11px] font-black text-blue-700 dark:text-blue-300 block mb-1">کارفرمایان</span>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-black text-blue-900 dark:text-blue-100">{stats.employers}</span>
              <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
                {stats.total > 0 ? Math.round((stats.employers / stats.total) * 100) : 0}%
              </span>
            </div>
          </div>

          <div className="bg-purple-50/50 dark:bg-purple-950/20 p-3.5 rounded-2xl border border-purple-100 dark:border-purple-900/40">
            <span className="text-[11px] font-black text-purple-700 dark:text-purple-300 block mb-1">مهندسین مشاور</span>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-black text-purple-900 dark:text-purple-100">{stats.consultants}</span>
              <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400">
                {stats.total > 0 ? Math.round((stats.consultants / stats.total) * 100) : 0}%
              </span>
            </div>
          </div>

          <div className="bg-amber-50/50 dark:bg-amber-950/20 p-3.5 rounded-2xl border border-amber-100 dark:border-amber-900/40">
            <span className="text-[11px] font-black text-amber-700 dark:text-amber-300 block mb-1">پیمانکاران اجرایی</span>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-black text-amber-900 dark:text-amber-100">{stats.contractors}</span>
              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                {stats.total > 0 ? Math.round((stats.contractors / stats.total) * 100) : 0}%
              </span>
            </div>
          </div>

          <div className="bg-stone-50/80 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-stone-200/60 dark:border-slate-800">
            <span className="text-[11px] font-black text-stone-500 dark:text-slate-400 block mb-1">پروژه‌های تحت مدیریت</span>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-black text-stone-900 dark:text-white">{allProjects.length}</span>
              <FolderKanban size={15} className="text-stone-400" />
            </div>
          </div>

          <div className="bg-stone-50/80 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-stone-200/60 dark:border-slate-800">
            <span className="text-[11px] font-black text-stone-500 dark:text-slate-400 block mb-1">پرسنل کل سازمان‌ها</span>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-black text-stone-900 dark:text-white">{stats.totalPersonnel}</span>
              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded-md">
                {stats.totalUsers} کاربر
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Filter & Control Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 dark:text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="جستجوی نام شرکت، کد یکتا، شناسه ملی، مدیرعامل یا تلفن..."
            className="w-full pl-4 pr-10 py-2.5 rounded-2xl bg-stone-50 dark:bg-slate-800/60 border border-stone-200/80 dark:border-slate-700/80 text-xs md:text-sm font-bold text-stone-800 dark:text-slate-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')} 
              className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filter Controls */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Type Filter */}
          <div className="relative">
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="appearance-none bg-stone-50 dark:bg-slate-800/60 border border-stone-200/80 dark:border-slate-700/80 text-stone-700 dark:text-slate-200 text-xs font-black rounded-2xl pr-3 pl-8 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500/20 cursor-pointer"
            >
              <option value="ALL">همه ارکان ({orgs.length})</option>
              <option value={OrganizationType.EMPLOYER}>کارفرمایان ({stats.employers})</option>
              <option value={OrganizationType.CONSULTANT}>مهندسین مشاور ({stats.consultants})</option>
              <option value={OrganizationType.CONTRACTOR}>پیمانکاران ({stats.contractors})</option>
            </select>
            <ChevronDown size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="appearance-none bg-stone-50 dark:bg-slate-800/60 border border-stone-200/80 dark:border-slate-700/80 text-stone-700 dark:text-slate-200 text-xs font-black rounded-2xl pr-3 pl-8 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500/20 cursor-pointer"
            >
              <option value="ALL">همه وضعیت‌ها</option>
              <option value="ACTIVE">فقط فعال‌ها</option>
              <option value="INACTIVE">فقط غیرفعال‌ها</option>
            </select>
            <ChevronDown size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
          </div>

          {/* Sort Dropdown */}
          <div className="relative">
            <select
              value={sortField}
              onChange={e => setSortField(e.target.value as SortField)}
              className="appearance-none bg-stone-50 dark:bg-slate-800/60 border border-stone-200/80 dark:border-slate-700/80 text-stone-700 dark:text-slate-200 text-xs font-black rounded-2xl pr-3 pl-8 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500/20 cursor-pointer"
            >
              <option value="name">مرتب‌سازی: نام شرکت</option>
              <option value="code">مرتب‌سازی: کد یکتا</option>
              <option value="projects">مرتب‌سازی: بیشترین پروژه</option>
              <option value="users">مرتب‌سازی: بیشترین پرسنل</option>
            </select>
            <ChevronDown size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
          </div>

          {/* Sort Direction Toggle */}
          <button
            onClick={() => setSortAsc(!sortAsc)}
            className="p-2.5 bg-stone-50 dark:bg-slate-800/60 border border-stone-200/80 dark:border-slate-700/80 text-stone-600 dark:text-slate-300 rounded-2xl hover:bg-stone-100 dark:hover:bg-slate-700 transition-all text-xs font-bold"
            title={sortAsc ? 'ترتیب صعودی' : 'ترتیب نزولی'}
          >
            <SlidersHorizontal size={16} className={sortAsc ? '' : 'rotate-180 transform'} />
          </button>

          {/* View Mode Switcher (Grid vs Table) */}
          <div className="flex items-center bg-stone-100 dark:bg-slate-800 p-1 rounded-2xl border border-stone-200 dark:border-slate-700">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-xl transition-all ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-sm'
                  : 'text-stone-500 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white'
              }`}
              title="نمایش کارتی"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-xl transition-all ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-sm'
                  : 'text-stone-500 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white'
              }`}
              title="نمایش جدولی"
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Organizations Display (Grid or Table) */}
      {filteredOrgs.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 p-12 rounded-3xl border border-slate-200/80 dark:border-slate-800 text-center shadow-sm">
          <div className="w-16 h-16 bg-amber-500/10 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Building2 size={32} />
          </div>
          <h3 className="text-lg font-black text-stone-800 dark:text-white">هیچ سازمانی با این مشخصات یافت نشد</h3>
          <p className="text-xs text-stone-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
            عبارت جستجو یا فیلترهای اعمال شده را تغییر دهید، یا سازمان جدیدی در سیستم ثبت نمایید.
          </p>
          <button
            onClick={handleOpenCreate}
            className="mt-5 inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-5 py-2.5 rounded-2xl font-black text-xs transition-all shadow-md"
          >
            <Plus size={16} />
            ثبت اولین سازمان جدید
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredOrgs.map(org => {
            const typeBadge = getTypeBadge(org.type);
            const orgProjects = getOrgProjects(org.id);
            const orgUsers = getOrgUsers(org.id);
            const orgPersonnel = getOrgPersonnel(org.id);
            const brandColor = org.brandColor || '#2563eb';

            return (
              <div
                key={org.id}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden relative group"
              >
                {/* Brand Color Top Stripe */}
                <div 
                  className="h-2 w-full" 
                  style={{ backgroundColor: brandColor }} 
                />

                <div className="p-5 flex-1 flex flex-col justify-between">
                  {/* Org Header */}
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-white text-base shadow-sm shrink-0 overflow-hidden bg-white border border-stone-200/80 dark:border-slate-700"
                        >
                          {org.logo ? (
                            <img src={org.logo} alt={org.name} className="w-full h-full object-contain p-1" />
                          ) : (
                            <div 
                              className="w-full h-full flex items-center justify-center font-black text-white text-base"
                              style={{ backgroundColor: brandColor }}
                            >
                              {org.name.slice(0, 2)}
                            </div>
                          )}
                        </div>
                        <div>
                          <h2 className="text-base font-black text-stone-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors line-clamp-1">
                            {org.name}
                          </h2>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[11px] font-extrabold text-stone-500 dark:text-slate-400 bg-stone-100 dark:bg-slate-800 px-2 py-0.5 rounded-md font-mono">
                              {org.code}
                            </span>
                            <span className={`inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-0.5 rounded-lg border ${typeBadge.bg}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${typeBadge.dot}`} />
                              {typeBadge.label}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Status Toggle Badge */}
                      <button
                        onClick={() => handleToggleStatus(org)}
                        className={`text-[11px] font-black px-2.5 py-1 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                          org.isActive 
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                            : 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/60'
                        }`}
                        title="کلیک برای تغییر وضعیت فعالیت سازمان"
                      >
                        {org.isActive ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                        <span>{org.isActive ? 'فعال' : 'غیرفعال'}</span>
                      </button>
                    </div>

                    {/* Quick Info & Legal details */}
                    <div className="space-y-2 mt-4 text-xs text-stone-600 dark:text-slate-300 bg-stone-50/70 dark:bg-slate-800/40 p-3 rounded-2xl border border-stone-200/60 dark:border-slate-800">
                      <div className="flex items-center justify-between">
                        <span className="text-stone-400 dark:text-slate-500 font-bold flex items-center gap-1.5">
                          <Shield size={13} /> شناسه ملی:
                        </span>
                        <span className="font-mono font-bold text-stone-800 dark:text-slate-200">
                          {org.nationalId || 'ثبت نشده'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-stone-400 dark:text-slate-500 font-bold flex items-center gap-1.5">
                          <Briefcase size={13} /> مدیرعامل:
                        </span>
                        <span className="font-bold text-stone-800 dark:text-slate-200">
                          {org.ceoName || 'ثبت نشده'}
                        </span>
                      </div>

                      {org.phone && (
                        <div className="flex items-center justify-between">
                          <span className="text-stone-400 dark:text-slate-500 font-bold flex items-center gap-1.5">
                            <Phone size={13} /> تلفن تماس:
                          </span>
                          <span className="font-mono font-bold text-stone-800 dark:text-slate-200" dir="ltr">
                            {org.phone}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Statistics Strip */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-3 gap-2 text-center">
                    <div 
                      onClick={() => handleOpenProjectAssign(org)}
                      className="p-2 rounded-xl bg-stone-50 dark:bg-slate-800/60 hover:bg-amber-50 dark:hover:bg-amber-950/30 cursor-pointer transition-all border border-stone-200/40 dark:border-slate-800"
                      title="مشاهده و ویرایش پروژه‌های مجاز"
                    >
                      <span className="text-[10px] font-black text-stone-400 dark:text-slate-400 block">پروژه‌ها</span>
                      <span className="text-sm font-black text-stone-800 dark:text-white mt-0.5 inline-flex items-center gap-1">
                        <FolderKanban size={13} className="text-amber-500" />
                        {orgProjects.length}
                      </span>
                    </div>

                    <div className="p-2 rounded-xl bg-stone-50 dark:bg-slate-800/60 border border-stone-200/40 dark:border-slate-800">
                      <span className="text-[10px] font-black text-stone-400 dark:text-slate-400 block">کاربران سیستم</span>
                      <span className="text-sm font-black text-stone-800 dark:text-white mt-0.5 inline-flex items-center gap-1">
                        <ShieldCheck size={13} className="text-blue-500" />
                        {orgUsers.length}
                      </span>
                    </div>

                    <div className="p-2 rounded-xl bg-stone-50 dark:bg-slate-800/60 border border-stone-200/40 dark:border-slate-800">
                      <span className="text-[10px] font-black text-stone-400 dark:text-slate-400 block">پرسنل کارگزینی</span>
                      <span className="text-sm font-black text-stone-800 dark:text-white mt-0.5 inline-flex items-center gap-1">
                        <Users size={13} className="text-purple-500" />
                        {orgPersonnel.length}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Card Action Footer */}
                <div className="p-3 bg-stone-50/90 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <button
                    onClick={() => {
                      setDossierOrg(org);
                      setActiveDossierTab('overview');
                    }}
                    className="flex-1 py-2 px-3 rounded-xl bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-700 text-stone-700 dark:text-slate-200 hover:text-amber-600 dark:hover:text-amber-400 text-xs font-black flex items-center justify-center gap-1.5 shadow-sm hover:shadow transition-all"
                  >
                    <Eye size={15} />
                    <span>شناسنامه کامل</span>
                  </button>

                  <button
                    onClick={() => handleOpenProjectAssign(org)}
                    className="p-2 rounded-xl text-stone-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-900 hover:text-amber-600 transition-all border border-transparent hover:border-stone-200 dark:hover:border-slate-700"
                    title="تخصیص پروژه‌های مجاز به سازمان"
                  >
                    <Layers size={16} />
                  </button>

                  <button
                    onClick={() => handleOpenEdit(org)}
                    className="p-2 rounded-xl text-stone-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-900 hover:text-amber-600 transition-all border border-transparent hover:border-stone-200 dark:hover:border-slate-700"
                    title="ویرایش مشخصات سازمان"
                  >
                    <Edit2 size={16} />
                  </button>

                  <button
                    onClick={() => handleRequestDelete(org)}
                    className="p-2 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-all border border-transparent hover:border-red-200 dark:hover:border-red-900/60"
                    title="حذف سازمان"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-stone-50/90 dark:bg-slate-800/80 border-b border-stone-200/80 dark:border-slate-700/80 text-[11px] font-black text-stone-500 dark:text-slate-400">
                  <th className="py-4 px-5">کد و نشان</th>
                  <th className="py-4 px-5">نام رسمی سازمان</th>
                  <th className="py-4 px-5">نوع رکن</th>
                  <th className="py-4 px-5">شناسه ملی / ثبت</th>
                  <th className="py-4 px-5">مدیرعامل / تلفن</th>
                  <th className="py-4 px-5 text-center">پروژه‌های مجاز</th>
                  <th className="py-4 px-5 text-center">کاربران / پرسنل</th>
                  <th className="py-4 px-5 text-center">وضعیت</th>
                  <th className="py-4 px-5 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-slate-800/80 text-xs font-bold text-stone-800 dark:text-slate-200">
                {filteredOrgs.map(org => {
                  const typeBadge = getTypeBadge(org.type);
                  const orgProjects = getOrgProjects(org.id);
                  const orgUsers = getOrgUsers(org.id);
                  const orgPersonnel = getOrgPersonnel(org.id);
                  const brandColor = org.brandColor || '#2563eb';

                  return (
                    <tr key={org.id} className="hover:bg-stone-50/80 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-4 px-5 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div 
                            className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-white text-[10px] shadow-sm shrink-0 overflow-hidden bg-white border border-stone-200/80 dark:border-slate-700"
                          >
                            {org.logo ? (
                              <img src={org.logo} alt={org.name} className="w-full h-full object-contain p-0.5" />
                            ) : (
                              <div 
                                className="w-full h-full flex items-center justify-center font-black text-white text-[10px]"
                                style={{ backgroundColor: brandColor }}
                              >
                                {org.name.slice(0, 1)}
                              </div>
                            )}
                          </div>
                          <span className="font-mono font-black text-stone-700 dark:text-slate-300">
                            {org.code}
                          </span>
                        </div>
                      </td>

                      <td className="py-4 px-5 font-black text-stone-900 dark:text-white">
                        <button
                          onClick={() => {
                            setDossierOrg(org);
                            setActiveDossierTab('overview');
                          }}
                          className="hover:text-amber-600 dark:hover:text-amber-400 text-right transition-colors"
                        >
                          {org.name}
                        </button>
                      </td>

                      <td className="py-4 px-5 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-lg border ${typeBadge.bg}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${typeBadge.dot}`} />
                          {typeBadge.label}
                        </span>
                      </td>

                      <td className="py-4 px-5 font-mono text-[11px] text-stone-600 dark:text-slate-400 whitespace-nowrap">
                        <div>{org.nationalId ? `ش.م: ${org.nationalId}` : '—'}</div>
                        {org.registrationNumber && (
                          <div className="text-[10px] text-stone-400">ثبت: {org.registrationNumber}</div>
                        )}
                      </td>

                      <td className="py-4 px-5 whitespace-nowrap">
                        <div>{org.ceoName || '—'}</div>
                        {org.phone && (
                          <div className="font-mono text-[10px] text-stone-400" dir="ltr">
                            {org.phone}
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-5 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleOpenProjectAssign(org)}
                          className="inline-flex items-center gap-1.5 bg-stone-100 dark:bg-slate-800 hover:bg-amber-100 hover:text-amber-700 dark:hover:bg-amber-950/40 dark:hover:text-amber-300 px-3 py-1 rounded-xl text-xs font-black transition-all"
                        >
                          <FolderKanban size={13} className="text-amber-500" />
                          <span>{orgProjects.length} پروژه</span>
                        </button>
                      </td>

                      <td className="py-4 px-5 text-center whitespace-nowrap font-mono text-xs">
                        <span className="text-blue-600 font-bold" title="کاربران سامانه">{orgUsers.length} کاربر</span>
                        <span className="text-stone-300 dark:text-slate-600 mx-1">/</span>
                        <span className="text-purple-600 font-bold" title="پرسنل کارگزینی">{orgPersonnel.length} پرسنل</span>
                      </td>

                      <td className="py-4 px-5 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleToggleStatus(org)}
                          className={`text-[11px] font-black px-2.5 py-1 rounded-xl inline-flex items-center gap-1 transition-all ${
                            org.isActive
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                              : 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/60'
                          }`}
                        >
                          {org.isActive ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                          <span>{org.isActive ? 'فعال' : 'غیرفعال'}</span>
                        </button>
                      </td>

                      <td className="py-4 px-5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => {
                              setDossierOrg(org);
                              setActiveDossierTab('overview');
                            }}
                            className="p-1.5 text-stone-600 hover:text-amber-600 hover:bg-stone-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            title="مشاهده شناسنامه جامع"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(org)}
                            className="p-1.5 text-stone-600 hover:text-amber-600 hover:bg-stone-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            title="ویرایش سازمان"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleRequestDelete(org)}
                            className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
                            title="حذف سازمان"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. CREATE / EDIT MODAL */}
      {isFormModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden animate-scaleIn">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-stone-50/50 dark:bg-slate-800/40">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl">
                  <Building2 size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-stone-900 dark:text-white">
                    {editingOrg ? `ویرایش سازمان: ${editingOrg.name}` : 'ثبت و تعریف سازمان جدید'}
                  </h2>
                  <p className="text-xs text-stone-500 dark:text-slate-400 mt-0.5">
                    تکمیل اطلاعات هویتی، حقوقی، راه‌های ارتباطی و تعیین پروژه‌های مجاز
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsFormModalOpen(false)}
                className="p-2 text-stone-400 hover:text-stone-700 dark:hover:text-white rounded-xl transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form Tabs */}
            <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-100 dark:border-slate-800 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setActiveFormTab('general')}
                className={`pb-3 px-3 text-xs font-black border-b-2 transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  activeFormTab === 'general'
                    ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                    : 'border-transparent text-stone-500 hover:text-stone-800 dark:text-slate-400'
                }`}
              >
                <Building2 size={15} />
                <span>۱. هویت و مشخصات اصلی</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveFormTab('legal')}
                className={`pb-3 px-3 text-xs font-black border-b-2 transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  activeFormTab === 'legal'
                    ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                    : 'border-transparent text-stone-500 hover:text-stone-800 dark:text-slate-400'
                }`}
              >
                <Shield size={15} />
                <span>۲. اطلاعات حقوقی و ثبتی</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveFormTab('contact')}
                className={`pb-3 px-3 text-xs font-black border-b-2 transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  activeFormTab === 'contact'
                    ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                    : 'border-transparent text-stone-500 hover:text-stone-800 dark:text-slate-400'
                }`}
              >
                <Phone size={15} />
                <span>۳. اطلاعات تماس و نشانی</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveFormTab('projects')}
                className={`pb-3 px-3 text-xs font-black border-b-2 transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  activeFormTab === 'projects'
                    ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                    : 'border-transparent text-stone-500 hover:text-stone-800 dark:text-slate-400'
                }`}
              >
                <FolderKanban size={15} />
                <span>۴. پروژه‌های مجاز ({selectedInitialProjects.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveFormTab('description')}
                className={`pb-3 px-3 text-xs font-black border-b-2 transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  activeFormTab === 'description'
                    ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                    : 'border-transparent text-stone-500 hover:text-stone-800 dark:text-slate-400'
                }`}
              >
                <FileText size={15} />
                <span>۵. شرح فعالیت</span>
              </button>
            </div>

            {/* Error Banner */}
            {formError && (
              <div className="mx-6 mt-4 p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/80 rounded-2xl flex items-center gap-2 text-xs font-bold text-red-700 dark:text-red-300">
                <Info size={16} className="shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Form Body */}
            <form id="orgForm" onSubmit={handleSaveForm} className="p-6 overflow-y-auto flex-1 space-y-5">
              {/* TAB 1: GENERAL */}
              {activeFormTab === 'general' && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black text-stone-700 dark:text-slate-300 mb-1.5">
                        نام رسمی سازمان / شرکت <span className="text-red-500">*</span>
                      </label>
                      <input
                        required
                        type="text"
                        value={formData.name || ''}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        placeholder="مثال: شرکت مهندسی توسعه سازه و بنا"
                        className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-stone-900 dark:text-white text-xs md:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black text-stone-700 dark:text-slate-300 mb-1.5">
                        کد یکتای سازمانی <span className="text-red-500">*</span>
                      </label>
                      <input
                        required
                        type="text"
                        value={formData.code || ''}
                        onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                        placeholder="مثال: TSB-CO یا 1001"
                        className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-stone-900 dark:text-white text-xs md:text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black text-stone-700 dark:text-slate-300 mb-1.5">
                        نوع رکن در پروژه <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.type}
                        onChange={e => setFormData({ ...formData, type: e.target.value as OrganizationType })}
                        className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-stone-900 dark:text-white text-xs md:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 cursor-pointer"
                      >
                        <option value={OrganizationType.EMPLOYER}>کارفرما (Employer)</option>
                        <option value={OrganizationType.CONSULTANT}>مهندس مشاور (Consultant)</option>
                        <option value={OrganizationType.CONTRACTOR}>پیمانکار اجرایی (Contractor)</option>
                      </select>
                    </div>

                    <div>
                      <ColorWell
                        label="رنگ برند و نشان سازمانی"
                        color={formData.brandColor || '#2563eb'}
                        onChange={c => setFormData({ ...formData, brandColor: c })}
                        size="md"
                      />
                    </div>
                  </div>

                  {/* Organization Logo Upload Field */}
                  <div className="p-4 bg-stone-50/90 dark:bg-slate-800/60 rounded-2xl border border-stone-200/80 dark:border-slate-700/80">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5">
                        <div 
                          className="w-16 h-16 rounded-2xl border-2 flex items-center justify-center p-1 bg-white dark:bg-slate-900 shadow-sm shrink-0 overflow-hidden"
                          style={{ borderColor: formData.brandColor || '#2563eb' }}
                        >
                          {formData.logo ? (
                            <img src={formData.logo} alt="لوگوی سازمان" className="w-full h-full object-contain" />
                          ) : (
                            <div 
                              className="w-full h-full rounded-xl flex items-center justify-center font-black text-white text-lg"
                              style={{ backgroundColor: formData.brandColor || '#2563eb' }}
                            >
                              {(formData.name || 'سازمان').slice(0, 2)}
                            </div>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-black text-stone-900 dark:text-white mb-0.5">
                            آرم و لوگوی رسمی سازمان
                          </label>
                          <p className="text-[11px] text-stone-500 dark:text-slate-400">
                            این لوگو در تمامی اسناد، سربرگ نامه‌ها، صورت‌جلسات، صورت‌وضعیت‌ها و گزارشات مدیریتی درج می‌شود.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <label className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black rounded-xl text-xs transition-all shadow-sm cursor-pointer flex items-center gap-1.5 active:scale-95">
                          <Upload size={14} />
                          <span>{formData.logo ? "تغییر تصویر لوگو" : "بارگذاری لوگوی سازمان"}</span>
                          <input 
                            type="file" 
                            accept="image/png,image/jpeg,image/webp,image/svg+xml" 
                            onChange={handleLogoUpload} 
                            className="hidden" 
                          />
                        </label>

                        {formData.logo && (
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, logo: '' }))}
                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-all border border-red-200 dark:border-red-900/50 cursor-pointer"
                            title="حذف لوگو"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-stone-50 dark:bg-slate-800/60 rounded-2xl border border-stone-200/80 dark:border-slate-700/80 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-black text-stone-800 dark:text-slate-200 block">وضعیت فعالیت سازمان</span>
                      <p className="text-[11px] text-stone-500 dark:text-slate-400 mt-0.5">
                        در صورت غیرفعال بودن، پرسنل و کاربران این سازمان امکان ورود به پروژه‌ها را نخواهند داشت.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isActive ?? true}
                        onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                    </label>
                  </div>
                </div>
              )}

              {/* TAB 2: LEGAL */}
              {activeFormTab === 'legal' && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black text-stone-700 dark:text-slate-300 mb-1.5">
                        شناسه ملی (۱۱ رقمی)
                      </label>
                      <input
                        type="text"
                        maxLength={11}
                        value={formData.nationalId || ''}
                        onChange={e => setFormData({ ...formData, nationalId: e.target.value })}
                        placeholder="مثال: 10103254890"
                        className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-stone-900 dark:text-white text-xs md:text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black text-stone-700 dark:text-slate-300 mb-1.5">
                        شماره ثبت شرکت
                      </label>
                      <input
                        type="text"
                        value={formData.registrationNumber || ''}
                        onChange={e => setFormData({ ...formData, registrationNumber: e.target.value })}
                        placeholder="مثال: 45210"
                        className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-stone-900 dark:text-white text-xs md:text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black text-stone-700 dark:text-slate-300 mb-1.5">
                        کد اقتصادی (۱۲ رقمی)
                      </label>
                      <input
                        type="text"
                        maxLength={12}
                        value={formData.economicCode || ''}
                        onChange={e => setFormData({ ...formData, economicCode: e.target.value })}
                        placeholder="مثال: 411589324561"
                        className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-stone-900 dark:text-white text-xs md:text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black text-stone-700 dark:text-slate-300 mb-1.5">
                        نام و نام خانوادگی مدیرعامل / نماینده قانونی
                      </label>
                      <input
                        type="text"
                        value={formData.ceoName || ''}
                        onChange={e => setFormData({ ...formData, ceoName: e.target.value })}
                        placeholder="مثال: مهندس علی رضایی"
                        className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-stone-900 dark:text-white text-xs md:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-stone-700 dark:text-slate-300 mb-1.5">
                      سال تأسیس شرکت
                    </label>
                    <input
                      type="text"
                      maxLength={4}
                      value={formData.establishedYear || ''}
                      onChange={e => setFormData({ ...formData, establishedYear: e.target.value })}
                      placeholder="مثال: 1385"
                      className="w-full md:w-1/2 px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-stone-900 dark:text-white text-xs md:text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    />
                  </div>
                </div>
              )}

              {/* TAB 3: CONTACT */}
              {activeFormTab === 'contact' && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black text-stone-700 dark:text-slate-300 mb-1.5">
                        تلفن تماس ثابت
                      </label>
                      <input
                        type="text"
                        value={formData.phone || ''}
                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="مثال: 021-88776655"
                        className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-stone-900 dark:text-white text-xs md:text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                        dir="ltr"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black text-stone-700 dark:text-slate-300 mb-1.5">
                        پست الکترونیک رسمی (ایمیل)
                      </label>
                      <input
                        type="email"
                        value={formData.email || ''}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                        placeholder="info@company.com"
                        className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-stone-900 dark:text-white text-xs md:text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                        dir="ltr"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black text-stone-700 dark:text-slate-300 mb-1.5">
                        وب‌سایت اینترنتی
                      </label>
                      <input
                        type="text"
                        value={formData.website || ''}
                        onChange={e => setFormData({ ...formData, website: e.target.value })}
                        placeholder="https://company.ir"
                        className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-stone-900 dark:text-white text-xs md:text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                        dir="ltr"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black text-stone-700 dark:text-slate-300 mb-1.5">
                        کد پستی (۱۰ رقمی)
                      </label>
                      <input
                        type="text"
                        maxLength={10}
                        value={formData.postalCode || ''}
                        onChange={e => setFormData({ ...formData, postalCode: e.target.value })}
                        placeholder="مثال: 1985923411"
                        className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-stone-900 dark:text-white text-xs md:text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-stone-700 dark:text-slate-300 mb-1.5">
                      نشانی دفتر مرکزی / کارگاه
                    </label>
                    <textarea
                      rows={2}
                      value={formData.address || ''}
                      onChange={e => setFormData({ ...formData, address: e.target.value })}
                      placeholder="تهران، خیابان ولیعصر، بعد از تقاطع میرداماد، پلاک..."
                      className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-stone-900 dark:text-white text-xs md:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    />
                  </div>
                </div>
              )}

              {/* TAB 4: PROJECTS ASSIGNMENT */}
              {activeFormTab === 'projects' && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-2xl flex items-center justify-between text-xs text-amber-800 dark:text-amber-300 font-bold">
                    <span>پروژه‌هایی که این سازمان مجاز به فعالیت در آنها می‌باشد را انتخاب نمایید:</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedInitialProjects(allProjects.map(p => String(p.id)))}
                        className="underline hover:text-amber-950"
                      >
                        انتخاب همه
                      </button>
                      <span>|</span>
                      <button
                        type="button"
                        onClick={() => setSelectedInitialProjects([])}
                        className="underline hover:text-amber-950"
                      >
                        عدم انتخاب
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1">
                    {allProjects.map(project => {
                      const isChecked = selectedInitialProjects.includes(String(project.id));
                      return (
                        <label
                          key={project.id}
                          className={`p-3 rounded-2xl border flex items-center gap-3 cursor-pointer transition-all ${
                            isChecked
                              ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-700'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                setSelectedInitialProjects(selectedInitialProjects.filter(id => id !== String(project.id)));
                              } else {
                                setSelectedInitialProjects([...selectedInitialProjects, String(project.id)]);
                              }
                            }}
                            className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                          />
                          <div className="flex-1">
                            <span className="text-xs font-black text-stone-800 dark:text-white block">
                              {project.name}
                            </span>
                            <span className="text-[10px] font-mono text-stone-400">
                              کد قرارداد: {project.code || 'بدون کد'}
                            </span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 5: DESCRIPTION */}
              {activeFormTab === 'description' && (
                <div className="space-y-4 animate-fadeIn">
                  <div>
                    <label className="block text-xs font-black text-stone-700 dark:text-slate-300 mb-1.5">
                      زمینه تخصصی فعالیت و سوابق کلیدی شرکت
                    </label>
                    <textarea
                      rows={5}
                      value={formData.description || ''}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                      placeholder="توضیحات تکمیلی پیرامون رتبه‌بندی، گواهینامه‌های صلاحیت پیمانکاری/مشاوره، ظرفیت‌های اجرایی و سوابق پروژه‌ای..."
                      className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-stone-900 dark:text-white text-xs md:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    />
                  </div>
                </div>
              )}
            </form>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-stone-50/50 dark:bg-slate-800/40 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setIsFormModalOpen(false)}
                className="px-5 py-2.5 rounded-2xl font-bold text-stone-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs transition-colors"
              >
                انصراف
              </button>

              <div className="flex gap-2">
                {activeFormTab !== 'general' && (
                  <button
                    type="button"
                    onClick={() => {
                      if (activeFormTab === 'legal') setActiveFormTab('general');
                      else if (activeFormTab === 'contact') setActiveFormTab('legal');
                      else if (activeFormTab === 'projects') setActiveFormTab('contact');
                      else if (activeFormTab === 'description') setActiveFormTab('projects');
                    }}
                    className="px-4 py-2.5 rounded-2xl border border-stone-200 dark:border-slate-700 text-stone-700 dark:text-slate-300 text-xs font-black hover:bg-stone-100 transition-all"
                  >
                    مرحله قبل
                  </button>
                )}

                {activeFormTab !== 'description' ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (activeFormTab === 'general') setActiveFormTab('legal');
                      else if (activeFormTab === 'legal') setActiveFormTab('contact');
                      else if (activeFormTab === 'contact') setActiveFormTab('projects');
                      else if (activeFormTab === 'projects') setActiveFormTab('description');
                    }}
                    className="px-5 py-2.5 rounded-2xl bg-stone-900 dark:bg-slate-700 text-white text-xs font-black hover:bg-stone-800 transition-all"
                  >
                    مرحله بعد
                  </button>
                ) : null}

                <button
                  type="submit"
                  form="orgForm"
                  className="px-6 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black shadow-lg shadow-amber-600/20 transition-all flex items-center gap-1.5"
                >
                  <Check size={16} />
                  <span>ذخیره سازمان</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. DOSSIER (ORGANIZATION PROFILE) MODAL */}
      {dossierOrg && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-4xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden animate-scaleIn">
            {/* Dossier Header */}
            <div 
              className="p-6 text-white relative"
              style={{ backgroundColor: dossierOrg.brandColor || '#2563eb' }}
            >
              <button
                onClick={() => setDossierOrg(null)}
                className="absolute left-4 top-4 p-2 bg-black/20 hover:bg-black/40 rounded-xl text-white transition-all"
              >
                <X size={20} />
              </button>

              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center font-black text-2xl text-stone-900 border border-white/30 shadow-md shrink-0 overflow-hidden p-1">
                  {dossierOrg.logo ? (
                    <img src={dossierOrg.logo} alt={dossierOrg.name} className="w-full h-full object-contain" />
                  ) : (
                    <div 
                      className="w-full h-full rounded-xl flex items-center justify-center font-black text-white text-xl"
                      style={{ backgroundColor: dossierOrg.brandColor || '#2563eb' }}
                    >
                      {dossierOrg.name.slice(0, 2)}
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold bg-white/20 px-2.5 py-0.5 rounded-md backdrop-blur-sm">
                      کد: {dossierOrg.code}
                    </span>
                    <span className="text-xs font-black bg-white text-stone-900 px-3 py-0.5 rounded-md">
                      {dossierOrg.type === OrganizationType.EMPLOYER ? 'کارفرما' : dossierOrg.type === OrganizationType.CONSULTANT ? 'مهندس مشاور' : 'پیمانکار اجرایی'}
                    </span>
                    <span className={`text-xs font-black px-2.5 py-0.5 rounded-md ${dossierOrg.isActive ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                      {dossierOrg.isActive ? 'فعال' : 'غیرفعال'}
                    </span>
                  </div>
                  <h2 className="text-2xl font-black mt-1.5">{dossierOrg.name}</h2>
                </div>
              </div>
            </div>

            {/* Dossier Navigation Tabs */}
            <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-100 dark:border-slate-800 bg-stone-50/50 dark:bg-slate-800/40 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setActiveDossierTab('overview')}
                className={`pb-3 px-3 text-xs font-black border-b-2 transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  activeDossierTab === 'overview'
                    ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                    : 'border-transparent text-stone-500 hover:text-stone-800 dark:text-slate-400'
                }`}
              >
                <Building2 size={15} />
                <span>شناسنامه و مشخصات حقوقی</span>
              </button>

              <button
                onClick={() => setActiveDossierTab('projects')}
                className={`pb-3 px-3 text-xs font-black border-b-2 transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  activeDossierTab === 'projects'
                    ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                    : 'border-transparent text-stone-500 hover:text-stone-800 dark:text-slate-400'
                }`}
              >
                <FolderKanban size={15} />
                <span>پروژه‌های تخصیص‌یافته ({getOrgProjects(dossierOrg.id).length})</span>
              </button>

              <button
                onClick={() => setActiveDossierTab('users')}
                className={`pb-3 px-3 text-xs font-black border-b-2 transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  activeDossierTab === 'users'
                    ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                    : 'border-transparent text-stone-500 hover:text-stone-800 dark:text-slate-400'
                }`}
              >
                <Users size={15} />
                <span>کاربران و پرسنل ({getOrgUsers(dossierOrg.id).length + getOrgPersonnel(dossierOrg.id).length})</span>
              </button>
            </div>

            {/* Dossier Content Body */}
            <div className="p-6 overflow-y-auto flex-1">
              {activeDossierTab === 'overview' && (
                <div className="space-y-6 animate-fadeIn">
                  {/* Grid Stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 bg-stone-50 dark:bg-slate-800/60 rounded-2xl border border-stone-200/80 dark:border-slate-700/80">
                      <span className="text-[10px] font-black text-stone-400 block mb-1">شناسه ملی</span>
                      <span className="font-mono font-black text-xs md:text-sm text-stone-800 dark:text-white">
                        {dossierOrg.nationalId || '—'}
                      </span>
                    </div>

                    <div className="p-3.5 bg-stone-50 dark:bg-slate-800/60 rounded-2xl border border-stone-200/80 dark:border-slate-700/80">
                      <span className="text-[10px] font-black text-stone-400 block mb-1">شماره ثبت</span>
                      <span className="font-mono font-black text-xs md:text-sm text-stone-800 dark:text-white">
                        {dossierOrg.registrationNumber || '—'}
                      </span>
                    </div>

                    <div className="p-3.5 bg-stone-50 dark:bg-slate-800/60 rounded-2xl border border-stone-200/80 dark:border-slate-700/80">
                      <span className="text-[10px] font-black text-stone-400 block mb-1">کد اقتصادی</span>
                      <span className="font-mono font-black text-xs md:text-sm text-stone-800 dark:text-white">
                        {dossierOrg.economicCode || '—'}
                      </span>
                    </div>

                    <div className="p-3.5 bg-stone-50 dark:bg-slate-800/60 rounded-2xl border border-stone-200/80 dark:border-slate-700/80">
                      <span className="text-[10px] font-black text-stone-400 block mb-1">سال تأسیس</span>
                      <span className="font-mono font-black text-xs md:text-sm text-stone-800 dark:text-white">
                        {dossierOrg.establishedYear || '—'}
                      </span>
                    </div>
                  </div>

                  {/* Legal & Contacts Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-stone-50/60 dark:bg-slate-800/40 p-4 rounded-2xl border border-stone-200/60 dark:border-slate-800 space-y-3">
                      <h3 className="text-xs font-black text-stone-800 dark:text-white flex items-center gap-2">
                        <Briefcase size={16} className="text-amber-500" />
                        <span>مدیریت و اطلاعات ثبتی</span>
                      </h3>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between py-1 border-b border-stone-200/60 dark:border-slate-700/60">
                          <span className="text-stone-500">مدیرعامل / نماینده:</span>
                          <span className="font-bold text-stone-800 dark:text-white">{dossierOrg.ceoName || 'ثبت نشده'}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-stone-200/60 dark:border-slate-700/60">
                          <span className="text-stone-500">تاریخ ثبت در سامانه:</span>
                          <span className="font-mono font-bold text-stone-800 dark:text-white">{dossierOrg.createdAt || 'پیش‌فرض'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-stone-50/60 dark:bg-slate-800/40 p-4 rounded-2xl border border-stone-200/60 dark:border-slate-800 space-y-3">
                      <h3 className="text-xs font-black text-stone-800 dark:text-white flex items-center gap-2">
                        <Phone size={16} className="text-blue-500" />
                        <span>راه‌های ارتباطی و نشانی</span>
                      </h3>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between py-1 border-b border-stone-200/60 dark:border-slate-700/60">
                          <span className="text-stone-500">تلفن تماس:</span>
                          <span className="font-mono font-bold text-stone-800 dark:text-white" dir="ltr">{dossierOrg.phone || '—'}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-stone-200/60 dark:border-slate-700/60">
                          <span className="text-stone-500">ایمیل:</span>
                          <span className="font-mono font-bold text-stone-800 dark:text-white" dir="ltr">{dossierOrg.email || '—'}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-stone-200/60 dark:border-slate-700/60">
                          <span className="text-stone-500">وب‌سایت:</span>
                          <span className="font-mono font-bold text-stone-800 dark:text-white" dir="ltr">{dossierOrg.website || '—'}</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-stone-500">نشانی دفتر:</span>
                          <span className="font-bold text-stone-800 dark:text-white text-right max-w-xs">{dossierOrg.address || '—'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  {dossierOrg.description && (
                    <div className="bg-stone-50/60 dark:bg-slate-800/40 p-4 rounded-2xl border border-stone-200/60 dark:border-slate-800">
                      <h3 className="text-xs font-black text-stone-800 dark:text-white mb-2">زمینه فعالیت و توضیحات</h3>
                      <p className="text-xs text-stone-600 dark:text-slate-300 leading-relaxed">
                        {dossierOrg.description}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {activeDossierTab === 'projects' && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-stone-700 dark:text-slate-300">
                      لیست پروژه‌هایی که این سازمان به عنوان رکن مجاز در آنها تعیین شده است:
                    </span>
                    <button
                      onClick={() => {
                        const org = dossierOrg;
                        setDossierOrg(null);
                        handleOpenProjectAssign(org);
                      }}
                      className="text-xs font-black text-amber-600 hover:text-amber-700 flex items-center gap-1 underline"
                    >
                      <Edit2 size={13} />
                      ویرایش دسترسی پروژه‌ها
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {getOrgProjects(dossierOrg.id).map(proj => (
                      <div
                        key={proj.id}
                        className="p-4 rounded-2xl bg-stone-50 dark:bg-slate-800/60 border border-stone-200/80 dark:border-slate-700/80 flex items-center gap-3"
                      >
                        <div className="p-2.5 bg-amber-500/10 text-amber-600 rounded-xl shrink-0">
                          <FolderKanban size={20} />
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-stone-900 dark:text-white">{proj.name}</h4>
                          <span className="text-[10px] font-mono text-stone-500 dark:text-slate-400 mt-0.5 block">
                            کد قرارداد: {proj.code || 'بدون کد'}
                          </span>
                        </div>
                      </div>
                    ))}
                    {getOrgProjects(dossierOrg.id).length === 0 && (
                      <div className="col-span-2 p-8 text-center text-xs text-stone-400">
                        هنوز هیچ پروژه‌ای به این سازمان تخصیص داده نشده است.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeDossierTab === 'users' && (
                <div className="space-y-4 animate-fadeIn">
                  <h3 className="text-xs font-black text-stone-800 dark:text-white">
                    کاربران سامانه ذیل این سازمان:
                  </h3>
                  <div className="space-y-2">
                    {getOrgUsers(dossierOrg.id).map(user => (
                      <div
                        key={user.id}
                        className="p-3 rounded-2xl bg-stone-50 dark:bg-slate-800/60 border border-stone-200/80 dark:border-slate-700/80 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 font-bold flex items-center justify-center">
                            {user.fullName ? user.fullName.slice(0, 1) : 'U'}
                          </div>
                          <div>
                            <span className="font-black text-stone-900 dark:text-white block">{user.fullName || user.username}</span>
                            <span className="text-[10px] text-stone-400 font-mono">@{user.username} - {user.jobTitle || user.jobLevel || 'کاربر'}</span>
                          </div>
                        </div>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${user.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                          {user.isActive ? 'فعال' : 'غیرفعال'}
                        </span>
                      </div>
                    ))}
                    {getOrgUsers(dossierOrg.id).length === 0 && (
                      <div className="p-6 text-center text-xs text-stone-400">
                        هیچ کاربر سیستمی برای این سازمان تعریف نشده است.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Dossier Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-stone-50/50 dark:bg-slate-800/40 flex items-center justify-between">
              <button
                onClick={() => {
                  const org = dossierOrg;
                  setDossierOrg(null);
                  handleOpenEdit(org);
                }}
                className="px-5 py-2.5 rounded-2xl bg-amber-600 text-white text-xs font-black flex items-center gap-2 hover:bg-amber-700 transition-all shadow-md shadow-amber-600/20"
              >
                <Edit2 size={16} />
                <span>ویرایش شناسنامه سازمان</span>
              </button>

              <button
                onClick={() => setDossierOrg(null)}
                className="px-5 py-2.5 rounded-2xl bg-stone-200 dark:bg-slate-700 text-stone-700 dark:text-slate-200 text-xs font-bold hover:bg-stone-300 transition-all"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. QUICK PROJECT ASSIGNMENT MODAL */}
      {projectAssignOrg && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 animate-scaleIn">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-500/10 text-amber-600 rounded-2xl">
                  <FolderKanban size={24} />
                </div>
                <div>
                  <h3 className="text-base font-black text-stone-900 dark:text-white">
                    تخصیص پروژه‌ها به سازمان: {projectAssignOrg.name}
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    تعیین پروژه‌هایی که کاربران و پرسنل این سازمان به آنها دسترسی خواهند داشت
                  </p>
                </div>
              </div>
              <button onClick={() => setProjectAssignOrg(null)} className="p-2 text-stone-400 hover:text-stone-600">
                <X size={20} />
              </button>
            </div>

            <div className="p-3 bg-stone-50 dark:bg-slate-800/60 rounded-2xl border border-stone-200/80 dark:border-slate-700/80 mb-4 flex items-center justify-between text-xs font-bold text-stone-700 dark:text-slate-300">
              <span>تعداد کل پروژه‌ها: {allProjects.length} | پروژه‌های منتخب: {tempAssignedProjectIds.length}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setTempAssignedProjectIds(allProjects.map(p => String(p.id)))}
                  className="text-amber-600 hover:underline"
                >
                  انتخاب همه
                </button>
                <span>|</span>
                <button
                  onClick={() => setTempAssignedProjectIds([])}
                  className="text-stone-500 hover:underline"
                >
                  حذف همه
                </button>
              </div>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2 pr-1 mb-6">
              {allProjects.map(project => {
                const isSelected = tempAssignedProjectIds.includes(String(project.id));
                return (
                  <label
                    key={project.id}
                    className={`p-3 rounded-2xl border flex items-center gap-3 cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-300 dark:border-amber-700'
                        : 'bg-white dark:bg-slate-800/50 border-stone-200 dark:border-slate-700 hover:bg-stone-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {
                        if (isSelected) {
                          setTempAssignedProjectIds(tempAssignedProjectIds.filter(id => id !== String(project.id)));
                        } else {
                          setTempAssignedProjectIds([...tempAssignedProjectIds, String(project.id)]);
                        }
                      }}
                      className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                    />
                    <div className="flex-1">
                      <span className="text-xs font-black text-stone-900 dark:text-white block">
                        {project.name}
                      </span>
                      <span className="text-[10px] font-mono text-stone-400">
                        کد قرارداد: {project.code || 'بدون کد'}
                      </span>
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setProjectAssignOrg(null)}
                className="flex-1 py-2.5 rounded-2xl border border-stone-200 dark:border-slate-700 text-stone-600 dark:text-slate-300 font-bold text-xs hover:bg-stone-100 transition-colors"
              >
                انصراف
              </button>
              <button
                onClick={handleSaveProjectAssignments}
                className="flex-1 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs shadow-md shadow-amber-600/20 transition-all"
              >
                ذخیره تخصیص پروژه‌ها
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. DELETE MODAL */}
      <DeleteModal 
        isOpen={!!deleteId} 
        onClose={() => {
          setDeleteId(null);
          setDeleteWarning(null);
        }} 
        onConfirm={confirmDelete} 
        title="حذف سازمان" 
        description={
          deleteWarning 
            ? `${deleteWarning} آیا با وجود این از حذف سازمان اطمینان دارید؟`
            : "آیا از حذف این سازمان اطمینان دارید؟ این عملیات غیرقابل بازگشت است."
        }
      />

    </div>
  );
};

export default Organizations;
