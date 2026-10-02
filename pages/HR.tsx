import React, { useState, useEffect, useMemo } from 'react';
import { HRService } from '../services/hrService';
import { SystemAdminService } from '../services/systemAdminService';
import { Personnel, WorkExperience, PersonnelSkill } from '../types';
import { Organization, SystemUser, SystemProject } from '../systemAdminTypes';
import { SignaturePad } from '../src/components/SignaturePad';
import { PersonnelDossierModal } from '../src/components/PersonnelDossierModal';
import { ShamsiDatePicker } from '../components/ShamsiDatePicker';
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  Edit3, 
  Trash2, 
  Building2, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Briefcase, 
  UserCheck, 
  KeyRound, 
  ShieldCheck, 
  Plus, 
  User, 
  Phone, 
  Mail, 
  FileText, 
  AlertCircle,
  ExternalLink,
  Layers,
  Link as LinkIcon,
  Lock,
  Eye,
  GraduationCap,
  Award,
  PenTool,
  Calendar,
  Sparkles,
  Heart,
  ChevronLeft,
  ChevronRight,
  Printer
} from 'lucide-react';
import DeleteModal from '../components/DeleteModal';

export interface HRProps {
  onNavigateToUsers?: (prefillPersonnelId?: string) => void;
}

export const HR: React.FC<HRProps> = ({ onNavigateToUsers }) => {
  const [personnelList, setPersonnelList] = useState<Personnel[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([]);
  const [projects, setProjects] = useState<SystemProject[]>([]);
  
  // Selected Project State
  const [selectedProjectId, setSelectedProjectId] = useState<string>(() => {
    const saved = localStorage.getItem("hamyar_selected_project_id");
    return saved && saved !== "undefined" ? saved : 'ALL';
  });

  const currentUser = useMemo(() => SystemAdminService.getCurrentUser(), []);
  const userRole = currentUser?.role || localStorage.getItem('user_role');
  const userOrgId = currentUser?.orgId || localStorage.getItem('user_org_id') || '';

  const canManagePersonnel = useMemo(() => {
    return userRole === 'SYSTEM_ADMIN' || userRole === 'ORG_ADMIN' || userRole === 'ORG_MANAGER' || 
      currentUser?.jobLevel === 'سرپرست کارگاه' || currentUser?.jobLevel === 'سرپرست کارگاه (مسئول پروژه)' ||
      currentUser?.jobLevel === 'مدیر پروژه' || currentUser?.jobLevel === 'مدیر ارشد سازمان' ||
      currentUser?.jobTitle === 'سرپرست کارگاه' || currentUser?.jobTitle === 'مدیر پروژه';
  }, [userRole, currentUser]);

  const canEditPersonnel = (p?: Personnel): boolean => {
    if (!p) return canManagePersonnel;
    return HRService.canManagePersonnel(userRole, p);
  };

  const accessibleProjects = useMemo(() => {
    const all = SystemAdminService.getProjects();
    return all.filter(p => SystemAdminService.canUserAccessProject(p.id, currentUser));
  }, [currentUser]);

  const accessibleProjectIds = useMemo(() => {
    return accessibleProjects.map(p => String(p.id).trim());
  }, [accessibleProjects]);

  useEffect(() => {
    localStorage.setItem("hamyar_selected_project_id", selectedProjectId);
  }, [selectedProjectId]);

  // Listen for global project-changed events
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
  
  // Search and Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOrgId, setFilterOrgId] = useState<string>('ALL');
  const [filterJobLevel, setFilterJobLevel] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterUserAccount, setFilterUserAccount] = useState<string>('ALL');
  const [filterSignature, setFilterSignature] = useState<string>('ALL');

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'personal' | 'education_org' | 'experience' | 'skills' | 'signature'>('personal');
  const [editingPersonnel, setEditingPersonnel] = useState<Personnel | null>(null);
  const [dossierPersonnel, setDossierPersonnel] = useState<Personnel | null>(null);
  const [deletePersonnelId, setDeletePersonnelId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Personnel Form State
  const [formData, setFormData] = useState<Partial<Personnel>>({
    personnelCode: '',
    nationalCode: '',
    firstName: '',
    lastName: '',
    fatherName: '',
    birthCertificateNumber: '',
    maritalStatus: 'SINGLE',
    militaryStatus: 'COMPLETED',
    educationDegree: 'BACHELOR',
    fieldOfStudy: '',
    university: '',
    graduationDate: '',
    workExperiences: [],
    skills: [],
    signature: undefined,
    signatureDate: undefined,
    orgId: '',
    projectId: '',
    jobLevel: 'کارشناس',
    jobTitle: '',
    department: 'دفتر فنی',
    mobile: '',
    email: '',
    gender: 'male',
    employmentStatus: 'ACTIVE',
    hireDate: new Date().toLocaleDateString('fa-IR'),
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const orgs = SystemAdminService.getOrganizations();
    setOrganizations(orgs);

    const users = SystemAdminService.getUsers();
    setSystemUsers(users);

    const allProj = SystemAdminService.getProjects();
    setProjects(allProj);

    let orgFilter = 'ALL';
    if (userRole !== 'SYSTEM_ADMIN' && userOrgId) {
      orgFilter = userOrgId;
      setFilterOrgId(userOrgId);
    }

    const list = HRService.getPersonnelList(orgFilter !== 'ALL' ? orgFilter : undefined);
    setPersonnelList(list);
  };

  // Generate next available personnel code
  const generateNextPersonnelCode = (orgIdVal?: string) => {
    const list = HRService.getPersonnelList();
    const codes = list
      .map(p => parseInt(p.personnelCode, 10))
      .filter(c => !isNaN(c));
    const maxCode = codes.length > 0 ? Math.max(...codes) : 1000;
    return String(maxCode + 1);
  };

  const handleOpenCreateModal = () => {
    if (!canManagePersonnel) {
      setErrorMessage('ثبت پرونده‌های پرسنلی فقط توسط مدیران ارشد سازمان، مدیر کل سیستم و سرپرستان کارگاه امکان‌پذیر است.');
      return;
    }
    setEditingPersonnel(null);
    setModalTab('personal');
    const targetOrg = (userRole !== 'SYSTEM_ADMIN' && userOrgId) ? userOrgId : (organizations[0]?.id || '');
    const defaultProjIds = (selectedProjectId !== 'ALL' && accessibleProjects.some(p => String(p.id) === String(selectedProjectId)))
      ? [String(selectedProjectId)]
      : (accessibleProjects[0] ? [String(accessibleProjects[0].id)] : []);

    setFormData({
      personnelCode: generateNextPersonnelCode(targetOrg),
      nationalCode: '',
      firstName: '',
      lastName: '',
      fatherName: '',
      birthCertificateNumber: '',
      maritalStatus: 'SINGLE',
      militaryStatus: 'COMPLETED',
      educationDegree: 'BACHELOR',
      fieldOfStudy: '',
      university: '',
      graduationDate: '',
      workExperiences: [],
      skills: [],
      signature: undefined,
      signatureDate: undefined,
      orgId: targetOrg,
      projectId: defaultProjIds[0] || '',
      projectIds: defaultProjIds,
      jobLevel: 'کارشناس',
      jobTitle: '',
      department: 'دفتر فنی',
      mobile: '',
      email: '',
      gender: 'male',
      employmentStatus: 'ACTIVE',
      hireDate: new Date().toLocaleDateString('fa-IR'),
      notes: ''
    });
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const handleEdit = (p: Personnel) => {
    if (!canEditPersonnel(p)) {
      setErrorMessage('ویرایش پرونده پرسنلی مدیر ارشد سازمان فقط توسط مدیر کل سیستم امکان‌پذیر است.');
      return;
    }
    setEditingPersonnel(p);
    setModalTab('personal');
    const existingProjectIds = (p.projectIds && p.projectIds.length > 0)
      ? p.projectIds.map(String)
      : (p.projectId ? [String(p.projectId)] : []);

    setFormData({
      ...p,
      fatherName: p.fatherName || '',
      birthCertificateNumber: p.birthCertificateNumber || '',
      maritalStatus: p.maritalStatus || 'SINGLE',
      militaryStatus: p.militaryStatus || (p.gender === 'female' ? 'EXEMPT_FEMALE' : 'COMPLETED'),
      educationDegree: p.educationDegree || 'BACHELOR',
      fieldOfStudy: p.fieldOfStudy || '',
      university: p.university || '',
      graduationDate: p.graduationDate || '',
      workExperiences: p.workExperiences ? [...p.workExperiences] : [],
      skills: p.skills ? [...p.skills] : [],
      signature: p.signature,
      signatureDate: p.signatureDate,
      projectIds: existingProjectIds,
      projectId: existingProjectIds[0] || ''
    });
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  // Work Experience Row Handlers
  const handleAddWorkExperience = () => {
    const newExp: WorkExperience = {
      id: 'exp-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      jobTitle: '',
      companyName: '',
      startDate: '',
      endDate: '',
      description: ''
    };
    setFormData(prev => ({
      ...prev,
      workExperiences: [...(prev.workExperiences || []), newExp]
    }));
  };

  const handleUpdateWorkExperience = (index: number, field: keyof WorkExperience, value: string) => {
    setFormData(prev => {
      const list = [...(prev.workExperiences || [])];
      if (list[index]) {
        list[index] = { ...list[index], [field]: value };
      }
      return { ...prev, workExperiences: list };
    });
  };

  const handleRemoveWorkExperience = (index: number) => {
    setFormData(prev => {
      const list = [...(prev.workExperiences || [])];
      list.splice(index, 1);
      return { ...prev, workExperiences: list };
    });
  };

  // Skill Row Handlers
  const handleAddSkill = () => {
    const newSkill: PersonnelSkill = {
      id: 'sk-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      title: '',
      level: 'INTERMEDIATE',
      description: ''
    };
    setFormData(prev => ({
      ...prev,
      skills: [...(prev.skills || []), newSkill]
    }));
  };

  const handleUpdateSkill = (index: number, field: keyof PersonnelSkill, value: any) => {
    setFormData(prev => {
      const list = [...(prev.skills || [])];
      if (list[index]) {
        list[index] = { ...list[index], [field]: value };
      }
      return { ...prev, skills: list };
    });
  };

  const handleRemoveSkill = (index: number) => {
    setFormData(prev => {
      const list = [...(prev.skills || [])];
      list.splice(index, 1);
      return { ...prev, skills: list };
    });
  };

  const handleSavePersonnel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditPersonnel(editingPersonnel || undefined)) {
      setErrorMessage('ویرایش یا تغییر پرونده پرسنلی مدیر ارشد سازمان فقط توسط مدیر کل سیستم امکان‌پذیر است.');
      return;
    }
    if (!formData.firstName?.trim() || !formData.lastName?.trim()) {
      setErrorMessage('نام و نام خانوادگی الزامی است.');
      setModalTab('personal');
      return;
    }
    if (!formData.orgId) {
      setErrorMessage('انتخاب سازمان متبوع الزامی است.');
      setModalTab('education_org');
      return;
    }
    if (!formData.jobLevel) {
      setErrorMessage('انتخاب سمت سازمانی الزامی است.');
      setModalTab('education_org');
      return;
    }

    const selectedProjectIds = formData.projectIds || (formData.projectId ? [formData.projectId] : []);

    // Filter valid work experiences and skills
    const cleanedWorkExp = (formData.workExperiences || []).filter(w => w.jobTitle.trim() || w.companyName.trim());
    const cleanedSkills = (formData.skills || []).filter(s => s.title.trim());

    try {
      const signatureDate = formData.signature 
        ? (formData.signatureDate || new Date().toLocaleDateString('fa-IR')) 
        : undefined;

      const saved = HRService.savePersonnel({
        id: editingPersonnel ? editingPersonnel.id : 'pers-' + (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).substr(2, 8)),
        personnelCode: formData.personnelCode || generateNextPersonnelCode(formData.orgId),
        nationalCode: formData.nationalCode || '',
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        fullName: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
        fatherName: formData.fatherName?.trim() || '',
        birthCertificateNumber: formData.birthCertificateNumber?.trim() || '',
        maritalStatus: formData.maritalStatus || 'SINGLE',
        militaryStatus: formData.gender === 'female' ? 'EXEMPT_FEMALE' : (formData.militaryStatus || 'COMPLETED'),
        educationDegree: formData.educationDegree || 'BACHELOR',
        fieldOfStudy: formData.fieldOfStudy?.trim() || '',
        university: formData.university?.trim() || '',
        graduationDate: formData.graduationDate?.trim() || '',
        workExperiences: cleanedWorkExp,
        skills: cleanedSkills,
        signature: formData.signature,
        signatureDate: signatureDate,
        orgId: formData.orgId,
        projectId: selectedProjectIds[0] || '',
        projectIds: selectedProjectIds,
        jobLevel: formData.jobLevel,
        jobTitle: formData.jobTitle?.trim() || '',
        department: formData.department?.trim() || 'عمومی',
        mobile: formData.mobile?.trim() || '',
        email: formData.email?.trim() || '',
        gender: formData.gender || 'male',
        employmentStatus: formData.employmentStatus || 'ACTIVE',
        hireDate: formData.hireDate || new Date().toLocaleDateString('fa-IR'),
        notes: formData.notes || '',
        userId: editingPersonnel?.userId,
        createdAt: editingPersonnel?.createdAt || new Date().toLocaleDateString('fa-IR')
      });

      // If personnel exists and linked to a system user, update that user
      if (saved.userId) {
        const linkedUser = systemUsers.find(u => u.id === saved.userId);
        if (linkedUser) {
          SystemAdminService.saveUser({
            ...linkedUser,
            fullName: saved.fullName,
            jobLevel: saved.jobLevel,
            jobTitle: saved.jobTitle,
            mobile: saved.mobile,
            email: saved.email,
            signature: saved.signature,
            signatureDate: saved.signatureDate,
            projectIds: saved.projectIds || []
          });
        }
      }

      setIsModalOpen(false);
      setEditingPersonnel(null);
      setSuccessMessage('اطلاعات و شناسنامه پرسنلی با موفقیت ذخیره شد.');
      setTimeout(() => setSuccessMessage(null), 3000);
      loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'خطا در ثبت اطلاعات');
    }
  };

  const handleDelete = (id: string) => {
    const target = HRService.getPersonnelById(id);
    if (target && !canEditPersonnel(target)) {
      alert('حذف پرونده پرسنلی مدیر ارشد سازمان فقط توسط مدیر کل سیستم امکان‌پذیر است.');
      return;
    }
    setDeletePersonnelId(id);
  };

  const confirmDelete = () => {
    if (deletePersonnelId) {
      const target = HRService.getPersonnelById(deletePersonnelId);
      if (target && !canEditPersonnel(target)) {
        alert('حذف پرونده پرسنلی مدیر ارشد سازمان فقط توسط مدیر کل سیستم امکان‌پذیر است.');
        return;
      }
      try {
        HRService.deletePersonnel(deletePersonnelId);
        setDeletePersonnelId(null);
        setSuccessMessage('پرونده پرسنلی حذف شد.');
        setTimeout(() => setSuccessMessage(null), 3000);
        loadData();
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  // Filter Personnel List
  const filteredPersonnel = useMemo(() => {
    return personnelList.filter(p => {
      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.trim().toLowerCase();
        const matchName = p.fullName.toLowerCase().includes(term);
        const matchCode = p.personnelCode.toLowerCase().includes(term);
        const matchNational = (p.nationalCode || '').toLowerCase().includes(term);
        const matchFather = (p.fatherName || '').toLowerCase().includes(term);
        const matchTitle = (p.jobTitle || '').toLowerCase().includes(term);
        const matchDept = (p.department || '').toLowerCase().includes(term);
        const matchStudy = (p.fieldOfStudy || '').toLowerCase().includes(term);
        const matchSkill = (p.skills || []).some(s => s.title.toLowerCase().includes(term));
        if (!matchName && !matchCode && !matchNational && !matchFather && !matchTitle && !matchDept && !matchStudy && !matchSkill) return false;
      }

      // Org Filter
      if (userRole !== 'SYSTEM_ADMIN' && userOrgId) {
        if (p.orgId !== userOrgId) return false;
      } else if (filterOrgId !== 'ALL' && p.orgId !== filterOrgId) {
        return false;
      }

      // Project Filter
      const pProjectIds = (p.projectIds && p.projectIds.length > 0)
        ? p.projectIds.map(String)
        : (p.projectId ? [String(p.projectId)] : []);

      if (selectedProjectId !== 'ALL') {
        const targetProjIdStr = String(selectedProjectId);
        const hasDirectProject = pProjectIds.includes(targetProjIdStr);
        
        // Organization's personnel roster who were registered in the organization's accessible projects
        // should also be displayed when the organization's new/accessible project is selected
        const orgAssignedProjects = p.orgId ? SystemAdminService.getAssignedProjectsForOrg(p.orgId).map(String) : [];
        const orgHasProjectAccess = orgAssignedProjects.includes(targetProjIdStr);

        if (!hasDirectProject && !orgHasProjectAccess) return false;
      } else {
        if (pProjectIds.length > 0 && !pProjectIds.some(id => accessibleProjectIds.includes(id))) {
          const orgAssignedProjects = p.orgId ? SystemAdminService.getAssignedProjectsForOrg(p.orgId).map(String) : [];
          if (!orgAssignedProjects.some(id => accessibleProjectIds.includes(id))) {
            return false;
          }
        }
      }

      // Position Filter
      if (filterJobLevel !== 'ALL' && p.jobLevel !== filterJobLevel) return false;

      // Status Filter
      if (filterStatus !== 'ALL' && p.employmentStatus !== filterStatus) return false;

      // User Account Filter
      if (filterUserAccount === 'LINKED' && !p.userId) return false;
      if (filterUserAccount === 'UNLINKED' && p.userId) return false;

      // Signature Filter
      if (filterSignature === 'HAS_SIGNATURE' && !p.signature) return false;
      if (filterSignature === 'NO_SIGNATURE' && !!p.signature) return false;

      return true;
    });
  }, [personnelList, searchTerm, filterOrgId, userRole, userOrgId, selectedProjectId, accessibleProjectIds, filterJobLevel, filterStatus, filterUserAccount, filterSignature]);

  // Statistics
  const stats = useMemo(() => {
    const total = filteredPersonnel.length;
    const active = filteredPersonnel.filter(p => p.employmentStatus === 'ACTIVE').length;
    const withAccount = filteredPersonnel.filter(p => !!p.userId).length;
    const withSignature = filteredPersonnel.filter(p => !!p.signature).length;
    return { total, active, withAccount, withSignature };
  }, [filteredPersonnel]);

  const getOrgName = (orgId: string) => {
    const found = organizations.find(o => o.id === orgId);
    return found ? found.name : 'نامشخص';
  };

  const getLinkedUser = (userId?: string) => {
    if (!userId) return null;
    return systemUsers.find(u => u.id === userId);
  };

  const getEducationDegreeLabel = (deg?: string) => {
    switch (deg) {
      case 'BELOW_DIPLOMA': return 'زیر دیپلم';
      case 'DIPLOMA': return 'دیپلم';
      case 'ASSOCIATE': return 'کاردانی';
      case 'BACHELOR': return 'کارشناسی';
      case 'MASTER': return 'ارشد';
      case 'DOCTORATE': return 'دکتری';
      default: return 'نامشخص';
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn dir-rtl" dir="rtl">
      {/* Header Description & Action Controls */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl shrink-0">
              <Users size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-stone-800 dark:text-slate-100 tracking-tight">کارگزینی، پرونده‌های پرسنلی و امضای الکترونیکی</h1>
              <p className="text-xs font-semibold text-stone-500 dark:text-slate-400 mt-1">
                ثبت مشخصات هویتی، سوابق تحصیلی، تجارب کاری، مهارت‌ها و امضای دیجیتال پرسنل جهت استناد در تمامی گردش‌کارهای سیستمی
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap w-full lg:w-auto">
            {/* Project Selector */}
            <div className="flex items-center gap-2 bg-amber-500/10 dark:bg-amber-500/20 px-3.5 py-2 rounded-2xl border border-amber-500/30">
              <Briefcase size={18} className="text-amber-600 dark:text-amber-400 shrink-0" />
              <select
                value={selectedProjectId}
                onChange={e => {
                  const val = e.target.value;
                  setSelectedProjectId(val);
                  localStorage.setItem("hamyar_selected_project_id", val);
                  window.dispatchEvent(new Event('storage'));
                  window.dispatchEvent(new CustomEvent('project-changed', { detail: { projectId: val } }));
                }}
                className="bg-transparent text-xs font-bold text-amber-800 dark:text-amber-300 outline-none cursor-pointer"
              >
                <option value="ALL">همه پروژه‌های مجاز ({accessibleProjects.length})</option>
                {accessibleProjects.map(proj => (
                  <option key={proj.id} value={proj.id}>
                    پروژه {proj.name} {proj.code ? `(${proj.code})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {userRole === 'SYSTEM_ADMIN' && (
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-700">
                <Building2 size={18} className="text-stone-500" />
                <select
                  value={filterOrgId}
                  onChange={e => setFilterOrgId(e.target.value)}
                  className="bg-transparent text-xs font-bold text-stone-700 dark:text-slate-200 outline-none cursor-pointer"
                >
                  <option value="ALL">همه سازمان‌ها</option>
                  {organizations.map(org => (
                    <option key={org.id} value={org.id}>{org.name}</option>
                  ))}
                </select>
              </div>
            )}

            {canManagePersonnel && (
              <button
                onClick={handleOpenCreateModal}
                className="bg-amber-600 hover:bg-stone-900 text-white px-5 py-2.5 rounded-2xl font-bold text-xs md:text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-600/20 transition-all hover:scale-[1.02]"
              >
                <UserPlus size={18} />
                ثبت پرسنل جدید
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 rounded-2xl font-bold text-sm flex items-center gap-3 animate-scaleIn">
          <CheckCircle2 size={20} />
          {successMessage}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-stone-100 dark:bg-slate-800 text-stone-700 dark:text-slate-300 rounded-2xl">
            <Users size={24} />
          </div>
          <div>
            <div className="text-2xl font-black text-stone-800 dark:text-slate-100">{stats.total.toLocaleString('fa-IR')}</div>
            <div className="text-xs font-bold text-stone-500 dark:text-slate-400">کل پرونده‌های پرسنلی</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl">
            <UserCheck size={24} />
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{stats.active.toLocaleString('fa-IR')}</div>
            <div className="text-xs font-bold text-stone-500 dark:text-slate-400">پرسنل فعال</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl">
            <ShieldCheck size={24} />
          </div>
          <div>
            <div className="text-2xl font-black text-blue-600 dark:text-blue-400">{stats.withAccount.toLocaleString('fa-IR')}</div>
            <div className="text-xs font-bold text-stone-500 dark:text-slate-400">دارای حساب کاربری</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl">
            <PenTool size={24} />
          </div>
          <div>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400">{stats.withSignature.toLocaleString('fa-IR')}</div>
            <div className="text-xs font-bold text-stone-500 dark:text-slate-400">دارای امضای الکترونیکی</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search Input */}
          <div className="flex-1 relative">
            <Search size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="جستجو بر اساس نام، نام پدر، کد پرسنلی، کد ملی، عنوان شغلی، رشته، مهارت..."
              className="w-full pr-11 pl-4 py-3 bg-stone-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700 text-sm font-bold text-stone-800 dark:text-slate-100 outline-none focus:border-amber-500 transition-all"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={filterJobLevel}
              onChange={e => setFilterJobLevel(e.target.value)}
              className="px-4 py-3 bg-stone-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-stone-700 dark:text-slate-200 outline-none focus:border-amber-500"
            >
              <option value="ALL">همه سمت‌ها</option>
              <option value="تکنسین">تکنسین</option>
              <option value="کارشناس">کارشناس</option>
              <option value="کارشناس ارشد">کارشناس ارشد</option>
              <option value="سرپرست واحد">سرپرست واحد</option>
              <option value="سرپرست کارگاه">سرپرست کارگاه</option>
              <option value="مدیر پروژه">مدیر پروژه</option>
            </select>

            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="px-4 py-3 bg-stone-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-stone-700 dark:text-slate-200 outline-none focus:border-amber-500"
            >
              <option value="ALL">همه وضعیت‌های اشتغال</option>
              <option value="ACTIVE">شاغل (فعال)</option>
              <option value="ON_LEAVE">مرخصی / تعلیق</option>
              <option value="TERMINATED">قطع همکاری</option>
            </select>

            <select
              value={filterSignature}
              onChange={e => setFilterSignature(e.target.value)}
              className="px-4 py-3 bg-stone-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-stone-700 dark:text-slate-200 outline-none focus:border-amber-500"
            >
              <option value="ALL">همه وضعیت‌های امضا</option>
              <option value="HAS_SIGNATURE">دارای امضای رسمی</option>
              <option value="NO_SIGNATURE">فاقد امضا</option>
            </select>

            <select
              value={filterUserAccount}
              onChange={e => setFilterUserAccount(e.target.value)}
              className="px-4 py-3 bg-stone-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-stone-700 dark:text-slate-200 outline-none focus:border-amber-500"
            >
              <option value="ALL">همه حساب‌های کاربری</option>
              <option value="LINKED">دارای حساب کاربری سیستم</option>
              <option value="UNLINKED">بدون حساب کاربری</option>
            </select>
          </div>
        </div>
      </div>

      {/* Personnel Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200/80 dark:border-slate-700/80">
                <th className="p-4 text-xs font-black text-stone-600 dark:text-slate-400">کد</th>
                <th className="p-4 text-xs font-black text-stone-600 dark:text-slate-400">نام و نام خانوادگی</th>
                <th className="p-4 text-xs font-black text-stone-600 dark:text-slate-400">مشخصات هویتی و تحصیلی</th>
                <th className="p-4 text-xs font-black text-stone-600 dark:text-slate-400">سازمان و سمت</th>
                <th className="p-4 text-xs font-black text-stone-600 dark:text-slate-400">اطلاعات تماس</th>
                <th className="p-4 text-xs font-black text-stone-600 dark:text-slate-400">امضای الکترونیکی</th>
                <th className="p-4 text-xs font-black text-stone-600 dark:text-slate-400">حساب کاربری</th>
                <th className="p-4 text-xs font-black text-stone-600 dark:text-slate-400 text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredPersonnel.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-stone-400 dark:text-slate-500 font-bold text-sm">
                    هیچ پرسنلی با مشخصات درخواستی یافت نشد.
                  </td>
                </tr>
              ) : (
                filteredPersonnel.map(personnel => {
                  const linkedUser = getLinkedUser(personnel.userId);
                  const org = organizations.find(o => o.id === personnel.orgId);
                  return (
                    <tr key={personnel.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="p-4 font-mono font-bold text-xs text-amber-700 dark:text-amber-400">
                        #{personnel.personnelCode}
                      </td>

                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-2xl flex items-center justify-center font-bold text-xs shrink-0 ${
                            personnel.gender === 'female' 
                              ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400' 
                              : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                          }`}>
                            {personnel.firstName.slice(0, 1)}
                          </div>
                          <div>
                            <div className="font-black text-sm text-stone-800 dark:text-slate-100 flex items-center gap-1.5">
                              {personnel.fullName}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-stone-400 dark:text-slate-500 mt-0.5">
                              {personnel.fatherName && <span>فرزند: {personnel.fatherName}</span>}
                              {personnel.nationalCode && <span className="font-mono">ک.م: {personnel.nationalCode}</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center gap-1.5 text-stone-700 dark:text-slate-300 font-medium">
                            <GraduationCap size={13} className="text-stone-400" />
                            <span>{getEducationDegreeLabel(personnel.educationDegree)}</span>
                            {personnel.fieldOfStudy && <span className="text-stone-500">({personnel.fieldOfStudy})</span>}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-stone-400">
                            {personnel.maritalStatus === 'MARRIED' ? 'متأهل' : 'مجرد'}
                            {personnel.skills && personnel.skills.length > 0 && (
                              <span className="bg-stone-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px] text-stone-600 dark:text-slate-300">
                                {personnel.skills.length} مهارت
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="font-bold text-xs text-stone-800 dark:text-slate-100">
                          {getOrgName(personnel.orgId)}
                        </div>
                        <div className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold mt-0.5">
                          {personnel.jobLevel} {personnel.jobTitle ? `— ${personnel.jobTitle}` : ''}
                        </div>
                        <div className="text-[10px] text-stone-400">
                          بخش: {personnel.department || 'عمومی'}
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="space-y-1 text-xs">
                          {personnel.mobile ? (
                            <div className="flex items-center gap-1.5 font-mono text-stone-700 dark:text-slate-300 dir-ltr justify-end">
                              <span>{personnel.mobile}</span>
                              <Phone size={12} className="text-stone-400" />
                            </div>
                          ) : (
                            <span className="text-stone-300 dark:text-slate-600">---</span>
                          )}
                          {personnel.email && (
                            <div className="text-[11px] text-stone-400 font-mono truncate max-w-[150px] dir-ltr text-right">
                              {personnel.email}
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="p-4">
                        {personnel.signature ? (
                          <div className="flex items-center gap-2">
                            <div className="w-12 h-7 bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-center p-0.5 overflow-hidden shadow-xs">
                              <img
                                src={personnel.signature}
                                alt="امضا"
                                className="max-h-full max-w-full object-contain filter dark:invert"
                              />
                            </div>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              <ShieldCheck size={11} />
                              معتبر
                            </span>
                          </div>
                        ) : (
                          <span className="inline-block px-2.5 py-1 rounded-xl text-[11px] font-medium bg-stone-100 dark:bg-slate-800/80 text-stone-400 dark:text-slate-500">
                            بدون امضا
                          </span>
                        )}
                      </td>

                      <td className="p-4">
                        {linkedUser ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-blue-500/10 text-blue-700 dark:text-blue-400">
                              <CheckCircle2 size={13} />
                              {linkedUser.username}
                            </span>
                            <div className="text-[10px] text-stone-400 font-semibold">
                              نقش: {linkedUser.role === 'ORG_ADMIN' ? 'مدیر ارشد' : linkedUser.role === 'ORG_MANAGER' ? 'مدیر واحد' : 'کاربر عادی'}
                            </div>
                          </div>
                        ) : (
                          <span className="inline-block px-2.5 py-1 rounded-xl text-xs font-semibold bg-stone-100 dark:bg-slate-800/80 text-stone-400 dark:text-slate-500">
                            فاقد حساب
                          </span>
                        )}
                      </td>

                      <td className="p-4">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setDossierPersonnel(personnel)}
                            className="p-2 text-stone-600 hover:text-blue-600 hover:bg-blue-50 dark:text-slate-400 dark:hover:bg-slate-800 rounded-xl transition-all"
                            title="مشاهده شناسنامه و پرونده کامل پرسنل"
                          >
                            <Eye size={16} />
                          </button>

                          {canEditPersonnel(personnel) ? (
                            <>
                              <button
                                onClick={() => handleEdit(personnel)}
                                className="p-2 text-stone-600 hover:text-amber-600 hover:bg-amber-50 dark:text-slate-400 dark:hover:bg-slate-800 rounded-xl transition-all"
                                title="ویرایش پرونده"
                              >
                                <Edit3 size={16} />
                              </button>
                              <button
                                onClick={() => handleDelete(personnel.id)}
                                className="p-2 text-stone-600 hover:text-red-600 hover:bg-red-50 dark:text-slate-400 dark:hover:bg-slate-800 rounded-xl transition-all"
                                title="حذف پرسنل"
                              >
                                <Trash2 size={16} />
                              </button>
                            </>
                          ) : (
                            <span 
                              className="text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-1 rounded-xl border border-amber-200 dark:border-amber-800/50 flex items-center justify-center gap-1 font-semibold"
                              title="مدیریت توسط مدیر کل سیستم"
                            >
                              <Lock size={12} className="text-amber-600 dark:text-amber-400" />
                            </span>
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

      {/* Comprehensive Personnel Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-4xl shadow-2xl animate-scaleIn max-h-[92vh] flex flex-col border border-slate-200 dark:border-slate-800 overflow-hidden">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl">
                  <UserPlus size={22} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-stone-800 dark:text-slate-100">
                    {editingPersonnel ? 'ویرایش پرونده و شناسنامه پرسنلی' : 'ثبت پرسنل جدید در منابع انسانی'}
                  </h2>
                  <p className="text-xs text-stone-500 dark:text-slate-400">
                    تکمیل اطلاعات فردی، سوابق تحصیلی و شغلی، مهارت‌ها و امضای الکترونیکی رسمی
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-stone-400 hover:text-stone-700 dark:hover:text-slate-200 rounded-xl"
              >
                <XCircle size={22} />
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="flex items-center gap-1 px-6 pt-3 border-b border-slate-100 dark:border-slate-800 bg-stone-50/50 dark:bg-slate-800/30 overflow-x-auto shrink-0">
              <button
                type="button"
                onClick={() => setModalTab('personal')}
                className={`px-4 py-2.5 text-xs font-bold rounded-t-2xl transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
                  modalTab === 'personal'
                    ? 'border-amber-500 text-amber-600 dark:text-amber-400 bg-white dark:bg-slate-900 shadow-xs'
                    : 'border-transparent text-stone-500 dark:text-slate-400 hover:text-stone-800 dark:hover:text-slate-200'
                }`}
              >
                <User size={15} />
                ۱. اطلاعات هویتی و فردی
              </button>

              <button
                type="button"
                onClick={() => setModalTab('education_org')}
                className={`px-4 py-2.5 text-xs font-bold rounded-t-2xl transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
                  modalTab === 'education_org'
                    ? 'border-amber-500 text-amber-600 dark:text-amber-400 bg-white dark:bg-slate-900 shadow-xs'
                    : 'border-transparent text-stone-500 dark:text-slate-400 hover:text-stone-800 dark:hover:text-slate-200'
                }`}
              >
                <GraduationCap size={15} />
                ۲. تحصیلات و سازمانی
              </button>

              <button
                type="button"
                onClick={() => setModalTab('experience')}
                className={`px-4 py-2.5 text-xs font-bold rounded-t-2xl transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
                  modalTab === 'experience'
                    ? 'border-amber-500 text-amber-600 dark:text-amber-400 bg-white dark:bg-slate-900 shadow-xs'
                    : 'border-transparent text-stone-500 dark:text-slate-400 hover:text-stone-800 dark:hover:text-slate-200'
                }`}
              >
                <Briefcase size={15} />
                ۳. سوابق کاری ({formData.workExperiences?.length || 0})
              </button>

              <button
                type="button"
                onClick={() => setModalTab('skills')}
                className={`px-4 py-2.5 text-xs font-bold rounded-t-2xl transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
                  modalTab === 'skills'
                    ? 'border-amber-500 text-amber-600 dark:text-amber-400 bg-white dark:bg-slate-900 shadow-xs'
                    : 'border-transparent text-stone-500 dark:text-slate-400 hover:text-stone-800 dark:hover:text-slate-200'
                }`}
              >
                <Award size={15} />
                ۴. مهارت‌ها ({formData.skills?.length || 0})
              </button>

              <button
                type="button"
                onClick={() => setModalTab('signature')}
                className={`px-4 py-2.5 text-xs font-bold rounded-t-2xl transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
                  modalTab === 'signature'
                    ? 'border-amber-500 text-amber-600 dark:text-amber-400 bg-white dark:bg-slate-900 shadow-xs'
                    : 'border-transparent text-stone-500 dark:text-slate-400 hover:text-stone-800 dark:hover:text-slate-200'
                }`}
              >
                <PenTool size={15} />
                ۵. امضای الکترونیکی
                {formData.signature && <span className="w-2 h-2 rounded-full bg-emerald-500"></span>}
              </button>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="mx-6 mt-4 p-3.5 bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 rounded-2xl font-bold text-xs flex items-center gap-2 shrink-0">
                <AlertCircle size={18} />
                {errorMessage}
              </div>
            )}

            {/* Form Body */}
            <form onSubmit={handleSavePersonnel} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 md:p-8 space-y-6 overflow-y-auto flex-1">
                
                {/* TAB 1: اطلاعات هویتی و فردی */}
                {modalTab === 'personal' && (
                  <div className="space-y-5 animate-fadeIn">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-stone-600 dark:text-slate-300 mb-2">کد پرسنلی *</label>
                        <input
                          type="text"
                          required
                          value={formData.personnelCode || ''}
                          onChange={e => setFormData({ ...formData, personnelCode: e.target.value })}
                          className="w-full px-4 py-3 bg-stone-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-stone-800 dark:text-slate-100 outline-none focus:border-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-stone-600 dark:text-slate-300 mb-2">کد ملی</label>
                        <input
                          type="text"
                          value={formData.nationalCode || ''}
                          onChange={e => setFormData({ ...formData, nationalCode: e.target.value })}
                          placeholder="۱۰ رقم کد ملی"
                          className="w-full px-4 py-3 bg-stone-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-stone-800 dark:text-slate-100 outline-none focus:border-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-stone-600 dark:text-slate-300 mb-2">شماره شناسنامه</label>
                        <input
                          type="text"
                          value={formData.birthCertificateNumber || ''}
                          onChange={e => setFormData({ ...formData, birthCertificateNumber: e.target.value })}
                          placeholder="شماره شناسنامه"
                          className="w-full px-4 py-3 bg-stone-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-stone-800 dark:text-slate-100 outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-stone-600 dark:text-slate-300 mb-2">نام *</label>
                        <input
                          type="text"
                          required
                          value={formData.firstName || ''}
                          onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                          placeholder="مثلاً: علی"
                          className="w-full px-4 py-3 bg-stone-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-stone-800 dark:text-slate-100 outline-none focus:border-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-stone-600 dark:text-slate-300 mb-2">نام خانوادگی *</label>
                        <input
                          type="text"
                          required
                          value={formData.lastName || ''}
                          onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                          placeholder="مثلاً: احمدی"
                          className="w-full px-4 py-3 bg-stone-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-stone-800 dark:text-slate-100 outline-none focus:border-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-stone-600 dark:text-slate-300 mb-2">نام پدر</label>
                        <input
                          type="text"
                          value={formData.fatherName || ''}
                          onChange={e => setFormData({ ...formData, fatherName: e.target.value })}
                          placeholder="نام پدر"
                          className="w-full px-4 py-3 bg-stone-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-stone-800 dark:text-slate-100 outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-stone-600 dark:text-slate-300 mb-2">جنسیت</label>
                        <select
                          value={formData.gender || 'male'}
                          onChange={e => {
                            const gen = e.target.value as 'male' | 'female';
                            setFormData(prev => ({
                              ...prev,
                              gender: gen,
                              militaryStatus: gen === 'female' ? 'EXEMPT_FEMALE' : (prev.militaryStatus === 'EXEMPT_FEMALE' ? 'COMPLETED' : prev.militaryStatus)
                            }));
                          }}
                          className="w-full px-4 py-3 bg-stone-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-stone-800 dark:text-slate-100 outline-none focus:border-amber-500"
                        >
                          <option value="male">مرد</option>
                          <option value="female">زن</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-stone-600 dark:text-slate-300 mb-2">وضعیت تأهل</label>
                        <select
                          value={formData.maritalStatus || 'SINGLE'}
                          onChange={e => setFormData({ ...formData, maritalStatus: e.target.value as any })}
                          className="w-full px-4 py-3 bg-stone-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-stone-800 dark:text-slate-100 outline-none focus:border-amber-500"
                        >
                          <option value="SINGLE">مجرد</option>
                          <option value="MARRIED">متأهل</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-stone-600 dark:text-slate-300 mb-2">وضعیت نظام وظیفه</label>
                        <select
                          disabled={formData.gender === 'female'}
                          value={formData.gender === 'female' ? 'EXEMPT_FEMALE' : (formData.militaryStatus || 'COMPLETED')}
                          onChange={e => setFormData({ ...formData, militaryStatus: e.target.value as any })}
                          className="w-full px-4 py-3 bg-stone-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-stone-800 dark:text-slate-100 outline-none focus:border-amber-500 disabled:opacity-60"
                        >
                          {formData.gender === 'female' ? (
                            <option value="EXEMPT_FEMALE">عدم شمولیت (بانوان)</option>
                          ) : (
                            <>
                              <option value="COMPLETED">کارت پایان خدمت</option>
                              <option value="PERMANENT_EXEMPTION">معافیت دائم</option>
                              <option value="EDUCATIONAL_EXEMPTION">معافیت تحصیلی</option>
                              <option value="MEDICAL_EXEMPTION">معافیت پزشکی</option>
                              <option value="SUBJECT">مشمول خدمت</option>
                            </>
                          )}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: تحصیلات و مشخصات سازمانی */}
                {modalTab === 'education_org' && (
                  <div className="space-y-5 animate-fadeIn">
                    
                    {/* Education Fields */}
                    <div className="p-4 bg-blue-50/40 dark:bg-slate-800/40 rounded-2xl border border-blue-100 dark:border-slate-700 space-y-4">
                      <h4 className="text-xs font-black text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                        <GraduationCap size={16} />
                        اطلاعات تحصیلی و دانشگاهی
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-stone-600 dark:text-slate-300 mb-1.5">مدرک تحصیلی</label>
                          <select
                            value={formData.educationDegree || 'BACHELOR'}
                            onChange={e => setFormData({ ...formData, educationDegree: e.target.value as any })}
                            className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-stone-800 dark:text-slate-100 outline-none focus:border-amber-500"
                          >
                            <option value="BELOW_DIPLOMA">زیر دیپلم</option>
                            <option value="DIPLOMA">دیپلم</option>
                            <option value="ASSOCIATE">کاردانی (فوق دیپلم)</option>
                            <option value="BACHELOR">کارشناسی (لیسانس)</option>
                            <option value="MASTER">کارشناسی ارشد (فوق لیسانس)</option>
                            <option value="DOCTORATE">دکتری تخصصی (PhD)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-stone-600 dark:text-slate-300 mb-1.5">رشته تحصیلی</label>
                          <input
                            type="text"
                            value={formData.fieldOfStudy || ''}
                            onChange={e => setFormData({ ...formData, fieldOfStudy: e.target.value })}
                            placeholder="مثلاً: مهندسی عمران"
                            className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-stone-800 dark:text-slate-100 outline-none focus:border-amber-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-stone-600 dark:text-slate-300 mb-1.5">دانشگاه / مؤسسه آموزشی</label>
                          <input
                            type="text"
                            value={formData.university || ''}
                            onChange={e => setFormData({ ...formData, university: e.target.value })}
                            placeholder="مثلاً: دانشگاه تهران"
                            className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-stone-800 dark:text-slate-100 outline-none focus:border-amber-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-stone-600 dark:text-slate-300 mb-1.5">تاریخ فارغ‌التحصیلی</label>
                          <ShamsiDatePicker
                            value={formData.graduationDate || ''}
                            onChange={val => setFormData({ ...formData, graduationDate: val })}
                            placeholder="مثلاً: ۱۳۹۸/۰۶/۳۱"
                            inputClassName="!px-3.5 !py-2.5 !bg-white dark:!bg-slate-900 !rounded-xl !border-slate-200 dark:!border-slate-700 !text-xs !font-mono !font-bold !text-stone-800 dark:!text-slate-100 outline-none focus:!border-amber-500 !text-center"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Org and Job */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-stone-600 dark:text-slate-300 mb-2">سازمان متبوع *</label>
                        <select
                          required
                          value={formData.orgId || ''}
                          disabled={userRole !== 'SYSTEM_ADMIN'}
                          onChange={e => setFormData({ ...formData, orgId: e.target.value })}
                          className="w-full px-4 py-3 bg-stone-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-stone-800 dark:text-slate-100 outline-none focus:border-amber-500 disabled:opacity-60"
                        >
                          <option value="">انتخاب سازمان...</option>
                          {organizations.map(org => (
                            <option key={org.id} value={org.id}>{org.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-stone-600 dark:text-slate-300 mb-2">سمت سازمانی *</label>
                        <select
                          required
                          value={formData.jobLevel || 'کارشناس'}
                          onChange={e => setFormData({ ...formData, jobLevel: e.target.value })}
                          className="w-full px-4 py-3 bg-stone-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-stone-800 dark:text-slate-100 outline-none focus:border-amber-500"
                        >
                          <option value="تکنسین">تکنسین</option>
                          <option value="کارشناس">کارشناس</option>
                          <option value="کارشناس ارشد">کارشناس ارشد</option>
                          <option value="سرپرست واحد">سرپرست واحد</option>
                          <option value="سرپرست کارگاه">سرپرست کارگاه</option>
                          <option value="مدیر پروژه" disabled={userRole !== 'SYSTEM_ADMIN'}>
                            مدیر پروژه {userRole !== 'SYSTEM_ADMIN' ? '(فقط مدیر کل سیستم)' : ''}
                          </option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-stone-600 dark:text-slate-300 mb-2">واحد / دپارتمان</label>
                        <input
                          type="text"
                          value={formData.department || ''}
                          onChange={e => setFormData({ ...formData, department: e.target.value })}
                          placeholder="مثلاً: دفتر فنی، کارگاه، HSE"
                          className="w-full px-4 py-3 bg-stone-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-stone-800 dark:text-slate-100 outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-stone-600 dark:text-slate-300 mb-2">عنوان شغلی دقیق</label>
                        <input
                          type="text"
                          value={formData.jobTitle || ''}
                          onChange={e => setFormData({ ...formData, jobTitle: e.target.value })}
                          placeholder="مثلاً: مهندس ناظر سازه"
                          className="w-full px-4 py-3 bg-stone-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-stone-800 dark:text-slate-100 outline-none focus:border-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-stone-600 dark:text-slate-300 mb-2">شماره همراه</label>
                        <input
                          type="text"
                          value={formData.mobile || ''}
                          onChange={e => setFormData({ ...formData, mobile: e.target.value })}
                          placeholder="۰۹۱۲..."
                          className="w-full px-4 py-3 bg-stone-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-stone-800 dark:text-slate-100 outline-none focus:border-amber-500 text-left dir-ltr"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-stone-600 dark:text-slate-300 mb-2">پست الکترونیک</label>
                        <input
                          type="email"
                          value={formData.email || ''}
                          onChange={e => setFormData({ ...formData, email: e.target.value })}
                          placeholder="user@example.com"
                          className="w-full px-4 py-3 bg-stone-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-stone-800 dark:text-slate-100 outline-none focus:border-amber-500 text-left dir-ltr"
                        />
                      </div>
                    </div>

                    {/* Multi-Project Selection */}
                    <div className="bg-stone-50 dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-stone-700 dark:text-slate-200 flex items-center gap-1.5">
                          <Briefcase size={16} className="text-amber-500" />
                          پروژه‌های تخصیص‌یافته (امکان انتخاب یک یا چند پروژه)
                        </label>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const allIds = accessibleProjects.map(p => String(p.id));
                              setFormData(prev => ({ ...prev, projectIds: allIds, projectId: allIds[0] || '' }));
                            }}
                            className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline"
                          >
                            انتخاب همه
                          </button>
                          <span className="text-stone-300 dark:text-slate-600">|</span>
                          <button
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({ ...prev, projectIds: [], projectId: '' }));
                            }}
                            className="text-[11px] font-bold text-stone-500 dark:text-slate-400 hover:underline"
                          >
                            حذف همه
                          </button>
                        </div>
                      </div>

                      {accessibleProjects.length === 0 ? (
                        <p className="text-xs text-stone-400 dark:text-slate-500 italic">پروژه‌ای برای انتخاب در دسترس نیست.</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-44 overflow-y-auto p-1 custom-scrollbar">
                          {accessibleProjects.map(proj => {
                            const projIdStr = String(proj.id);
                            const currentSelected = formData.projectIds || (formData.projectId ? [formData.projectId] : []);
                            const isChecked = currentSelected.map(String).includes(projIdStr);

                            return (
                              <label
                                key={proj.id}
                                className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer ${
                                  isChecked
                                    ? 'bg-amber-500/10 border-amber-500 text-amber-900 dark:text-amber-300 font-bold shadow-sm'
                                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-stone-700 dark:text-slate-300 hover:border-amber-300'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={e => {
                                    const activeList = formData.projectIds || (formData.projectId ? [formData.projectId] : []);
                                    let updated: string[];
                                    if (e.target.checked) {
                                      updated = Array.from(new Set([...activeList.map(String), projIdStr]));
                                    } else {
                                      updated = activeList.map(String).filter(id => id !== projIdStr);
                                    }
                                    setFormData(prev => ({
                                      ...prev,
                                      projectIds: updated,
                                      projectId: updated[0] || ''
                                    }));
                                  }}
                                  className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-stone-300"
                                />
                                <span className="text-xs truncate" title={proj.name}>
                                  {proj.name} {proj.code ? `(${proj.code})` : ''}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-stone-600 dark:text-slate-300 mb-2">وضعیت اشتغال</label>
                        <select
                          value={formData.employmentStatus || 'ACTIVE'}
                          onChange={e => setFormData({ ...formData, employmentStatus: e.target.value as any })}
                          className="w-full px-4 py-3 bg-stone-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-stone-800 dark:text-slate-100 outline-none focus:border-amber-500"
                        >
                          <option value="ACTIVE">شاغل (فعال)</option>
                          <option value="ON_LEAVE">مرخصی / تعلیق موقت</option>
                          <option value="TERMINATED">قطع همکاری</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-stone-600 dark:text-slate-300 mb-2">تاریخ استخدام</label>
                        <ShamsiDatePicker
                          value={formData.hireDate || ''}
                          onChange={val => setFormData({ ...formData, hireDate: val })}
                          placeholder="۱۴۰۲/۰۱/۰۱"
                          inputClassName="!px-4 !py-3 !bg-stone-50 dark:!bg-slate-800 !rounded-2xl !border-slate-200 dark:!border-slate-700 !text-xs !font-bold !text-stone-800 dark:!text-slate-100 outline-none focus:!border-amber-500 !text-center"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-600 dark:text-slate-300 mb-2">توضیحات پرونده</label>
                      <textarea
                        rows={2}
                        value={formData.notes || ''}
                        onChange={e => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="یادداشت‌های کارگزینی..."
                        className="w-full p-3 bg-stone-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-stone-800 dark:text-slate-100 outline-none focus:border-amber-500 resize-none"
                      />
                    </div>
                  </div>
                )}

                {/* TAB 3: سوابق کاری (Dynamic Rows) */}
                {modalTab === 'experience' && (
                  <div className="space-y-4 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-black text-stone-800 dark:text-slate-200 flex items-center gap-2">
                          <Briefcase size={16} className="text-amber-500" />
                          سوابق کاری و تجارب پیشین
                        </h4>
                        <p className="text-[11px] text-stone-500 dark:text-slate-400 mt-0.5">
                          ردیف‌های سابقه شغلی، شرکت‌ها و پروژه‌های قبلی پرسنل را در این بخش اضافه کنید.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddWorkExperience}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                      >
                        <Plus size={15} />
                        افزودن ردیف سابقه کاری
                      </button>
                    </div>

                    {(!formData.workExperiences || formData.workExperiences.length === 0) ? (
                      <div className="p-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl text-center space-y-2">
                        <Briefcase size={32} className="mx-auto text-stone-300 dark:text-slate-600" />
                        <p className="text-xs font-bold text-stone-500 dark:text-slate-400">هنوز سابقه کاری اضافه نشده است.</p>
                        <button
                          type="button"
                          onClick={handleAddWorkExperience}
                          className="text-xs text-amber-600 dark:text-amber-400 font-bold hover:underline"
                        >
                          + اولین ردیف سابقه کاری را اضافه کنید
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {formData.workExperiences.map((exp, idx) => (
                          <div
                            key={exp.id || idx}
                            className="p-4 bg-stone-50/80 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-3 relative group"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-black text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950 px-2 py-0.5 rounded-lg">
                                ردیف {idx + 1}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveWorkExperience(idx)}
                                className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-all"
                                title="حذف این ردیف"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                              <div>
                                <label className="block text-[11px] font-bold text-stone-600 dark:text-slate-300 mb-1">سمت / شغل</label>
                                <input
                                  type="text"
                                  value={exp.jobTitle}
                                  onChange={e => handleUpdateWorkExperience(idx, 'jobTitle', e.target.value)}
                                  placeholder="مثلاً: سرپرست کارگاه"
                                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold outline-none focus:border-amber-500"
                                />
                              </div>

                              <div>
                                <label className="block text-[11px] font-bold text-stone-600 dark:text-slate-300 mb-1">نام شرکت / کارفرما / پروژه</label>
                                <input
                                  type="text"
                                  value={exp.companyName}
                                  onChange={e => handleUpdateWorkExperience(idx, 'companyName', e.target.value)}
                                  placeholder="مثلاً: شرکت ساختمانی تدبیر"
                                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold outline-none focus:border-amber-500"
                                />
                              </div>

                              <div>
                                <label className="block text-[11px] font-bold text-stone-600 dark:text-slate-300 mb-1">تاریخ شروع</label>
                                <ShamsiDatePicker
                                  value={exp.startDate || ''}
                                  onChange={val => handleUpdateWorkExperience(idx, 'startDate', val)}
                                  placeholder="مثلاً: ۱۳۹۹/۰۱/۰۱"
                                  inputClassName="!px-3 !py-2 !bg-white dark:!bg-slate-900 !rounded-xl !border-slate-200 dark:!border-slate-700 !text-xs !font-mono !font-bold outline-none focus:!border-amber-500 !text-center"
                                />
                              </div>

                              <div>
                                <label className="block text-[11px] font-bold text-stone-600 dark:text-slate-300 mb-1">تاریخ پایان</label>
                                <ShamsiDatePicker
                                  value={exp.endDate || ''}
                                  onChange={val => handleUpdateWorkExperience(idx, 'endDate', val)}
                                  placeholder="مثلاً: ۱۴۰۱/۱۲/۲۹"
                                  inputClassName="!px-3 !py-2 !bg-white dark:!bg-slate-900 !rounded-xl !border-slate-200 dark:!border-slate-700 !text-xs !font-bold outline-none focus:!border-amber-500 !text-center"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-stone-600 dark:text-slate-300 mb-1">شرح وظایف و دستاوردها</label>
                              <input
                                type="text"
                                value={exp.description || ''}
                                onChange={e => handleUpdateWorkExperience(idx, 'description', e.target.value)}
                                placeholder="خلاصه‌ای از مسئولیت‌ها و دستاوردهای این دوره کاری..."
                                className="w-full px-3 py-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-xs outline-none focus:border-amber-500"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 4: مهارت‌ها و تخصص‌ها (Dynamic Rows) */}
                {modalTab === 'skills' && (
                  <div className="space-y-4 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-black text-stone-800 dark:text-slate-200 flex items-center gap-2">
                          <Award size={16} className="text-indigo-500" />
                          مهارت‌ها، نرم‌افزارها و تخصص‌ها
                        </h4>
                        <p className="text-[11px] text-stone-500 dark:text-slate-400 mt-0.5">
                          تخصص‌های فنی، نرم‌افزارهای مهندسی، استانداردها و سطوح تسلط پرسنل را مشخص نمایید.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddSkill}
                        className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                      >
                        <Plus size={15} />
                        افزودن مهارت جدید
                      </button>
                    </div>

                    {(!formData.skills || formData.skills.length === 0) ? (
                      <div className="p-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl text-center space-y-2">
                        <Award size={32} className="mx-auto text-stone-300 dark:text-slate-600" />
                        <p className="text-xs font-bold text-stone-500 dark:text-slate-400">هنوز مهارتی اضافه نشده است.</p>
                        <button
                          type="button"
                          onClick={handleAddSkill}
                          className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                        >
                          + اولین مهارت یا تخصص را اضافه کنید
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {formData.skills.map((sk, idx) => (
                          <div
                            key={sk.id || idx}
                            className="p-3.5 bg-stone-50/80 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-2.5 relative"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[11px] font-black text-indigo-700 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-950 px-2 py-0.5 rounded-lg">
                                مهارت {idx + 1}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveSkill(idx)}
                                className="p-1 text-stone-400 hover:text-red-600 rounded-lg transition-all"
                                title="حذف"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[10px] font-bold text-stone-600 dark:text-slate-300 mb-1">عنوان مهارت / نرم‌افزار</label>
                                <input
                                  type="text"
                                  value={sk.title}
                                  onChange={e => handleUpdateSkill(idx, 'title', e.target.value)}
                                  placeholder="مثلاً: AutoCAD, Primavera P6"
                                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold outline-none focus:border-amber-500"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold text-stone-600 dark:text-slate-300 mb-1">سطح تسلط</label>
                                <select
                                  value={sk.level}
                                  onChange={e => handleUpdateSkill(idx, 'level', e.target.value)}
                                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold outline-none focus:border-amber-500"
                                >
                                  <option value="BEGINNER">مقدماتی</option>
                                  <option value="INTERMEDIATE">متوسط</option>
                                  <option value="ADVANCED">پیشرفته</option>
                                  <option value="EXPERT">متخصص / ارشد</option>
                                </select>
                              </div>
                            </div>

                            <div>
                              <input
                                type="text"
                                value={sk.description || ''}
                                onChange={e => handleUpdateSkill(idx, 'description', e.target.value)}
                                placeholder="سابقه کار یا توضیحات تکمیلی..."
                                className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] outline-none focus:border-amber-500"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 5: امضای الکترونیکی رسمی پرسنل */}
                {modalTab === 'signature' && (
                  <div className="space-y-4 animate-fadeIn">
                    <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-xs text-amber-900 dark:text-amber-300 leading-relaxed font-semibold">
                      📌 <strong className="font-black">نکته مهم سیستمی:</strong> امضای الکترونیکی ثبت‌شده در این بخش، به‌صورت خودکار در تمام فرم‌ها، صورتجلسات، صورت‌وضعیت‌ها، مجوزهای کارگاهی و گردش‌کارهایی که این پرسنل (یا کاربر متناظر وی) تأیید یا امضا می‌کند درج خواهد شد.
                    </div>

                    <SignaturePad
                      value={formData.signature}
                      onChange={sig => setFormData(prev => ({
                        ...prev,
                        signature: sig,
                        signatureDate: sig ? (prev.signatureDate || new Date().toLocaleDateString('fa-IR')) : undefined
                      }))}
                      label="امضای الکترونیکی پرسنل"
                      helperText="با ماوس یا قلم نوری در کادر زیر امضا کنید، یا فایل اسکن‌شده امضا (با پس‌زمینه شفاف) را بارگذاری نمایید."
                      signerName={`${formData.firstName || ''} ${formData.lastName || ''}`}
                      signatureDate={formData.signatureDate}
                    />
                  </div>
                )}

              </div>

              {/* Modal Footer Controls */}
              <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 p-4 bg-stone-50/70 dark:bg-slate-800/40 shrink-0">
                <div className="flex items-center gap-2">
                  {modalTab !== 'personal' && (
                    <button
                      type="button"
                      onClick={() => {
                        if (modalTab === 'signature') setModalTab('skills');
                        else if (modalTab === 'skills') setModalTab('experience');
                        else if (modalTab === 'experience') setModalTab('education_org');
                        else if (modalTab === 'education_org') setModalTab('personal');
                      }}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-stone-600 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800 transition-all flex items-center gap-1"
                    >
                      <ChevronRight size={14} />
                      مرحله قبل
                    </button>
                  )}

                  {modalTab !== 'signature' && (
                    <button
                      type="button"
                      onClick={() => {
                        if (modalTab === 'personal') setModalTab('education_org');
                        else if (modalTab === 'education_org') setModalTab('experience');
                        else if (modalTab === 'experience') setModalTab('skills');
                        else if (modalTab === 'skills') setModalTab('signature');
                      }}
                      className="px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-900 text-white text-xs font-bold transition-all flex items-center gap-1"
                    >
                      مرحله بعد
                      <ChevronLeft size={14} />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-xs text-stone-600 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800 transition-all"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    className="px-8 py-2.5 bg-amber-600 hover:bg-stone-900 text-white rounded-xl font-bold text-xs shadow-lg shadow-amber-600/20 transition-all"
                  >
                    ذخیره نهایی پرونده پرسنلی
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Comprehensive Dossier View Modal */}
      <PersonnelDossierModal
        isOpen={!!dossierPersonnel}
        onClose={() => setDossierPersonnel(null)}
        personnel={dossierPersonnel}
        organization={organizations.find(o => o.id === dossierPersonnel?.orgId)}
        onEdit={p => handleEdit(p)}
        canEdit={canEditPersonnel(dossierPersonnel || undefined)}
      />

      {/* Delete Confirmation Modal */}
      <DeleteModal
        isOpen={!!deletePersonnelId}
        title="حذف پرونده پرسنلی"
        description="آیا از حذف این پرونده پرسنلی اطمینان دارید؟ در صورت داشتن حساب کاربری فعال، ابتدا باید حساب کاربری وی غیرفعال شود."
        onConfirm={confirmDelete}
        onClose={() => setDeletePersonnelId(null)}
      />
    </div>
  );
};
