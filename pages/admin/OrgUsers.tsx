import React, { useState, useEffect, useMemo } from 'react';
import { SystemAdminService } from '../../services/systemAdminService';
import { HRService } from '../../services/hrService';
import { SystemUser, SystemProject, ModuleId, UserPermission, Organization, OrganizationType } from '../../systemAdminTypes';
import { Personnel } from '../../types';
import Organizations from './Organizations';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  UserPlus, 
  Lock, 
  Shield, 
  Users, 
  Building2, 
  KeyRound, 
  Search, 
  Filter, 
  UserCheck, 
  FolderKanban, 
  BadgeCheck, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  Settings,
  RefreshCw,
  Edit3,
  ShieldCheck,
  Globe
} from 'lucide-react';
import { APP_MODULES } from '../../constants';
import DeleteModal from '../../components/DeleteModal';

export type AdminTab = 'org-details' | 'all-orgs';

interface OrgUsersProps {
  onPersonnelCreated?: () => void;
  initialAdminTab?: AdminTab;
}

export const OrgUsers: React.FC<OrgUsersProps> = ({ onPersonnelCreated, initialAdminTab }) => {
  const [activeAdminTab, setActiveAdminTab] = useState<AdminTab>(initialAdminTab || 'org-details');
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [allowedProjects, setAllowedProjects] = useState<SystemProject[]>([]);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);

  useEffect(() => {
    if (initialAdminTab) {
      setActiveAdminTab(initialAdminTab);
    }
  }, [initialAdminTab]);
  
  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  
  // Forms State
  const [formData, setFormData] = useState<Partial<SystemUser>>({
    username: '',
    fullName: '',
    jobLevel: '',
    jobTitle: '',
    department: '',
    role: 'ORG_USER',
    isActive: true,
    password: '',
    securityCode: '',
    projectIds: [],
    permissions: []
  });

  const [resetPassId, setResetPassId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [toggleActiveUser, setToggleActiveUser] = useState<SystemUser | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  const [availablePersonnel, setAvailablePersonnel] = useState<Personnel[]>([]);
  const [unassignedPersonnelList, setUnassignedPersonnelList] = useState<Personnel[]>([]);
  
  const currentUser = SystemAdminService.getCurrentUser();
  const userRole = currentUser?.role || localStorage.getItem('user_role');
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(() => {
    if (currentUser?.orgId && currentUser.orgId !== 'SYSTEM') {
      return currentUser.orgId;
    }
    return localStorage.getItem('user_org_id') || null;
  });

  const canEditUser = (user: SystemUser): boolean => {
      // If the target user role is ORG_ADMIN (مدیر ارشد سازمان/مدیر پروژه), ONLY SYSTEM_ADMIN can edit or delete them
      if (user.role === 'ORG_ADMIN' || user.jobLevel === 'مدیر پروژه' || user.jobLevel === 'مدیر ارشد سازمان') {
          return userRole === 'SYSTEM_ADMIN';
      }

      if (userRole === 'SYSTEM_ADMIN' || userRole === 'ORG_ADMIN') return true;
      if (userRole === 'ORG_MANAGER' || currentUser?.jobLevel === 'سرپرست کارگاه' || currentUser?.jobTitle === 'سرپرست کارگاه') {
          if (user.id === currentUser?.id) return true;
          // Workshop Manager can edit users in their organization (except ORG_ADMIN)
          const targetUserOrgId = user.orgId || '';
          const myOrgId = currentOrgId || currentUser?.orgId || '';
          if (targetUserOrgId && myOrgId && targetUserOrgId === myOrgId) {
            return true;
          }
          return false;
      }
      return false;
  };

  useEffect(() => {
    const orgs = SystemAdminService.getOrganizations();
    setOrganizations(orgs);

    if (orgs.length > 0) {
      if (!currentOrgId || !orgs.some(o => o.id === currentOrgId)) {
        if (currentUser?.orgId && currentUser.orgId !== 'SYSTEM' && orgs.some(o => o.id === currentUser.orgId)) {
          setCurrentOrgId(currentUser.orgId);
        } else {
          setCurrentOrgId(orgs[0].id);
        }
      }
    }
  }, [userRole]);

  useEffect(() => {
    if (currentOrgId) {
        loadData();
    }
  }, [currentOrgId, isModalOpen]);

  const loadData = () => {
      const targetOrgId = currentOrgId || (currentUser?.orgId !== 'SYSTEM' ? currentUser?.orgId : organizations[0]?.id);
      if (!targetOrgId) return;
      
      const org = SystemAdminService.getOrganization(targetOrgId);
      if (org) {
        setCurrentOrg(org);
      }

      const orgUsers = SystemAdminService.getUsersByOrg(targetOrgId);
      setUsers(orgUsers);
      
      // Load projects assigned to this org
      const allProjects = SystemAdminService.getProjects();
      if (userRole === 'SYSTEM_ADMIN') {
        // System Admin has full rights across all system projects
        setAllowedProjects(allProjects);
      } else {
        const userProjects = SystemAdminService.getUserAccessibleProjectIds(currentUser);
        const orgProjectIds = SystemAdminService.getAssignedProjectsForOrg(targetOrgId).map(String);
        const projectIds = Array.from(new Set([...userProjects, ...orgProjectIds]));
        let allowed = allProjects.filter(p => projectIds.includes(String(p.id)));
        if (allowed.length === 0 && allProjects.length > 0) {
          allowed = allProjects;
        }
        setAllowedProjects(allowed);
      }

      // Load personnel available for user creation
      const list = HRService.getAvailablePersonnelForUserCreation(targetOrgId, editingUser?.personnelId);
      setAvailablePersonnel(list);

      // Load all personnel for this org to find unassigned ones
      const allOrgPersonnel = HRService.getPersonnelByOrg(targetOrgId);
      const assignedPersonnelIds = new Set(orgUsers.map(u => u.personnelId).filter(Boolean));
      const unassigned = allOrgPersonnel.filter(p => !assignedPersonnelIds.has(p.id));
      setUnassignedPersonnelList(unassigned);
  };

  // Open User creation pre-filled for a specific personnel
  const handleCreateUserForPersonnel = (p: Personnel) => {
    if ((p.jobLevel === 'مدیر پروژه' || p.jobLevel === 'مدیر ارشد سازمان') && userRole !== 'SYSTEM_ADMIN') {
      setErrorMsg('ساخت حساب کاربری برای مدیر ارشد سازمان (مدیر پروژه) فقط توسط مدیر کل سیستم امکان‌پذیر است.');
      return;
    }

    setEditingUser(null);
    setModalError(null);
    
    let calculatedRole: 'ORG_ADMIN' | 'ORG_MANAGER' | 'ORG_USER' = 'ORG_USER';
    if (p.jobLevel === 'سرپرست کارگاه') calculatedRole = 'ORG_MANAGER';
    else if ((p.jobLevel === 'مدیر پروژه' || p.jobLevel === 'مدیر ارشد سازمان') && userRole === 'SYSTEM_ADMIN') calculatedRole = 'ORG_ADMIN';

    const stdPerms = SystemAdminService.getStandardPermissions(p.jobLevel, calculatedRole);

    setFormData({
      username: p.personnelCode ? `user_${p.personnelCode}` : '',
      fullName: p.fullName,
      jobLevel: p.jobLevel,
      jobTitle: p.jobTitle || '',
      department: p.department || '',
      personnelId: p.id,
      role: calculatedRole,
      isActive: true,
      password: '',
      securityCode: '',
      projectIds: allowedProjects.map(proj => String(proj.id)),
      permissions: stdPerms
    });
    setIsModalOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
      e.preventDefault();
      setModalError(null);
      
      const targetOrgId = editingUser?.orgId || currentOrgId || (currentUser?.orgId !== 'SYSTEM' ? currentUser?.orgId : organizations[0]?.id);
      if (!targetOrgId) {
          setModalError('سازمانی برای ذخیره حساب کاربری تعیین نشده است. لطفاً ابتدا یک سازمان انتخاب یا ایجاد کنید.');
          return;
      }

      const activePersonnelId = formData.personnelId || editingUser?.personnelId;
      let linkedPersonnel: Personnel | undefined = undefined;
      if (activePersonnelId) {
          linkedPersonnel = HRService.getPersonnelById(activePersonnelId);
      }

      // Only strictly require HR personnel linkage when creating a NEW user
      if (!editingUser) {
          if (!activePersonnelId) {
              setModalError('خطا: ایجاد کاربر جدید بدون انتساب به پرسنل ثبت‌شده در منابع انسانی مجاز نیست. لطفاً ابتدا پرسنل را در بخش کارگزینی و پرونده‌های پرسنلی ثبت کنید.');
              return;
          }

          if (!linkedPersonnel) {
              setModalError('خطا: پرونده پرسنلی انتخاب‌شده در سامانه منابع انسانی یافت نشد.');
              return;
          }
      }

      if (!formData.username || !formData.username.trim()) {
          setModalError('ورود نام کاربری (انگلیسی) الزامی است.');
          return;
      }

      if (!editingUser && (!formData.password || !formData.password.trim())) {
          setModalError('ورود رمز عبور الزامی است.');
          return;
      }

      if (formData.role === 'ORG_ADMIN' && userRole !== 'SYSTEM_ADMIN') {
          setModalError('تعریف یا ثبت نقش مدیر پروژه (ادمین سازمان) فقط توسط مدیر کل سیستم امکان‌پذیر است.');
          return;
      }

      let targetProjectIds = (formData.projectIds || []).map(String);
      if (!editingUser && targetProjectIds.length === 0 && allowedProjects.length > 0) {
          targetProjectIds = allowedProjects.map(p => String(p.id));
      }

      const newUser: SystemUser = {
          id: editingUser ? editingUser.id : (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : 'usr-' + Math.random().toString(36).substr(2, 9)),
          username: formData.username.trim(),
          fullName: linkedPersonnel ? linkedPersonnel.fullName : (formData.fullName || editingUser?.fullName || formData.username.trim()),
          jobLevel: linkedPersonnel ? linkedPersonnel.jobLevel : (formData.jobLevel || editingUser?.jobLevel || ''),
          jobTitle: linkedPersonnel ? (linkedPersonnel.jobTitle || '') : (formData.jobTitle || editingUser?.jobTitle || ''),
          department: linkedPersonnel ? (linkedPersonnel.department || '') : (formData.department || editingUser?.department || ''),
          orgId: targetOrgId,
          personnelId: linkedPersonnel ? linkedPersonnel.id : (formData.personnelId || editingUser?.personnelId),
          role: (formData.role as any) || editingUser?.role || 'ORG_USER',
          isActive: formData.isActive !== undefined ? formData.isActive : (editingUser?.isActive !== undefined ? editingUser.isActive : true),
          password: formData.password || (editingUser ? editingUser.password : '123456'),
          securityCode: formData.securityCode !== undefined ? formData.securityCode : (editingUser?.securityCode || ''),
          projectIds: targetProjectIds,
          permissions: formData.permissions || editingUser?.permissions || SystemAdminService.getStandardPermissions('', 'ORG_USER'),
          signature: editingUser?.signature
      };

      if (userRole === 'ORG_MANAGER' || currentUser?.jobLevel === 'سرپرست کارگاه' || currentUser?.jobTitle === 'سرپرست کارگاه') {
          if (newUser.role === 'ORG_ADMIN' && userRole !== 'SYSTEM_ADMIN') {
              setModalError('شما مجاز به تعیین یا تغییر نقش کاربر به مدیر ارشد سازمان (مدیر پروژه) نیستید.');
              return;
          }
          if ((newUser.jobLevel === 'مدیر پروژه' || newUser.jobLevel === 'مدیر ارشد سازمان') && newUser.id !== currentUser?.id) {
              setModalError('شما مجاز به تعیین سمت مدیر پروژه نیستید.');
              return;
          }
          if (editingUser && !canEditUser(editingUser)) {
              setModalError('شما مجاز به ویرایش این کاربر نیستید.');
              return;
          }
      }

      try {
          SystemAdminService.saveUser(newUser);
          setIsModalOpen(false);
          setEditingUser(null);
          setModalError(null);
          setFormData({ username: '', fullName: '', jobLevel: '', jobTitle: '', department: '', role: 'ORG_USER', isActive: true, password: '', securityCode: '', projectIds: [], permissions: SystemAdminService.getStandardPermissions('', 'ORG_USER') });
          setSuccessMsg('حساب کاربری و دسترسی‌ها با موفقیت ذخیره شد.');
          setTimeout(() => setSuccessMsg(null), 3500);
          loadData();
      } catch (error: any) {
          setModalError(error.message || 'خطا در ذخیره حساب کاربری.');
      }
  };

  const handleEditUser = (user: SystemUser) => {
    setEditingUser(user);
    setModalError(null);
    let linkedP: Personnel | undefined;
    if (user.personnelId) {
      linkedP = HRService.getPersonnelById(user.personnelId);
    }

    const allProjects = SystemAdminService.getProjects();
    if (userRole === 'SYSTEM_ADMIN') {
      // System Admin has full rights across all system projects
      setAllowedProjects(allProjects);
    } else {
      const targetOrgId = user.orgId || currentOrgId || '';
      const userProjects = SystemAdminService.getUserAccessibleProjectIds(currentUser);
      const orgProjectIds = SystemAdminService.getAssignedProjectsForOrg(targetOrgId).map(String);
      const userProjectIds = (user.projectIds || []).map(String);
      const allowedIds = Array.from(new Set([...userProjects, ...orgProjectIds, ...userProjectIds]));
      const allowed = allProjects.filter(p => allowedIds.includes(String(p.id)));
      setAllowedProjects(allowed.length > 0 ? allowed : allProjects);
    }

    setFormData({
        ...user,
        jobLevel: linkedP?.jobLevel || user.jobLevel || '',
        jobTitle: linkedP?.jobTitle || user.jobTitle || '',
        department: linkedP?.department || user.department || '',
        password: '',
        securityCode: user.securityCode || '',
        projectIds: (user.projectIds || []).map(String),
        permissions: user.permissions || SystemAdminService.getStandardPermissions(user.jobLevel || '', user.role)
    });
    setIsModalOpen(true);
  };

  const confirmDeactivate = () => {
      if (toggleActiveUser) {
          if (!canEditUser(toggleActiveUser)) {
              setErrorMsg('شما مجاز به تغییر وضعیت کاربر مدیر ارشد سازمان نیستید. تنها مدیر کل سیستم مجاز به انجام این عملیات است.');
              return;
          }
          try {
              const updatedUser = { ...toggleActiveUser, isActive: !toggleActiveUser.isActive };
              SystemAdminService.saveUser(updatedUser);
              setToggleActiveUser(null);
              loadData();
          } catch (e: any) {
              setErrorMsg(e.message);
          }
      }
  };

  const confirmDelete = () => {
      if (deleteUserId) {
          const userToDelete = users.find(u => u.id === deleteUserId);
          if (userToDelete && !canEditUser(userToDelete)) {
              setErrorMsg('شما مجاز به حذف کاربر مدیر ارشد سازمان نیستید. کاربران مدیر ارشد سازمان فقط توسط مدیر کل سیستم قابل حذف هستند.');
              return;
          }
          try {
              SystemAdminService.deleteUser(deleteUserId);
              setDeleteUserId(null);
              loadData();
          } catch (e: any) {
              setErrorMsg(e.message);
          }
      }
  };

  const handleResetPassword = () => {
      if (resetPassId && newPassword && currentOrgId) {
          const target = users.find(u => u.id === resetPassId);
          if (target && !canEditUser(target)) {
              alert('شما مجاز به تغییر رمز عبور کاربر مدیر ارشد سازمان نیستید. تنها مدیر کل سیستم مجاز به تغییر رمز این حساب است.');
              return;
          }
          try {
              SystemAdminService.resetPassword(resetPassId, newPassword, (userRole as string) || 'ORG_ADMIN', currentOrgId);
              alert('رمز عبور با موفقیت تغییر کرد.');
              setResetPassId(null);
              setNewPassword('');
          } catch (e: any) {
              alert(e.message);
          }
      }
  };

  const toggleProject = (projectId: string) => {
      const currentProjects = (formData.projectIds || []).map(String);
      const targetId = String(projectId).trim();
      if (currentProjects.includes(targetId)) {
          setFormData({ ...formData, projectIds: currentProjects.filter(id => id !== targetId) });
      } else {
          setFormData({ ...formData, projectIds: [...currentProjects, targetId] });
      }
  };

  const togglePermission = (moduleId: ModuleId, type: 'view' | 'create' | 'edit' | 'delete' | 'send' | 'approve' | 'reject' | 'finalApprove') => {
      const currentPermissions = formData.permissions || [];
      const existingPermIndex = currentPermissions.findIndex(p => p.moduleId === moduleId);
      
      let newPermissions = [...currentPermissions];

      if (existingPermIndex >= 0) {
          const perm = { ...newPermissions[existingPermIndex] };
          if (type === 'view') perm.canView = !perm.canView;
          if (type === 'create') perm.canCreate = !perm.canCreate;
          if (type === 'edit') perm.canEdit = !perm.canEdit;
          if (type === 'delete') perm.canDelete = !perm.canDelete;
          if (type === 'send') perm.canSend = !perm.canSend;
          if (type === 'approve') perm.canApprove = !perm.canApprove;
          if (type === 'reject') perm.canReject = !perm.canReject;
          if (type === 'finalApprove') perm.canFinalApprove = !perm.canFinalApprove;
          newPermissions[existingPermIndex] = perm;
      } else {
          newPermissions.push({
              moduleId,
              canView: type === 'view',
              canCreate: type === 'create',
              canEdit: type === 'edit',
              canDelete: type === 'delete',
              canSend: type === 'send',
              canApprove: type === 'approve',
              canReject: type === 'reject',
              canFinalApprove: type === 'finalApprove'
          });
      }
      setFormData({ ...formData, permissions: newPermissions });
  };

  const getPermission = (moduleId: ModuleId) => {
      return (formData.permissions || []).find(p => p.moduleId === moduleId) || { 
          canView: false, 
          canCreate: false,
          canEdit: false,
          canDelete: false,
          canSend: false,
          canApprove: false,
          canReject: false,
          canFinalApprove: false
      };
  };

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesSearch = 
        u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.jobTitle || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.jobLevel || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
      const matchesStatus = statusFilter === 'ALL' || (statusFilter === 'ACTIVE' ? u.isActive : !u.isActive);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchTerm, roleFilter, statusFilter]);

  const getOrgTypeLabel = (type?: OrganizationType) => {
    switch (type) {
      case OrganizationType.EMPLOYER: return 'کارفرما';
      case OrganizationType.CONTRACTOR: return 'پیمانکار';
      case OrganizationType.CONSULTANT: return 'مشاور';
      default: return 'سازمان';
    }
  };

  const getOrgTypeBadge = (type?: OrganizationType) => {
    switch (type) {
      case OrganizationType.EMPLOYER: return 'bg-amber-100 text-amber-800 border-amber-300';
      case OrganizationType.CONTRACTOR: return 'bg-blue-100 text-blue-800 border-blue-300';
      case OrganizationType.CONSULTANT: return 'bg-purple-100 text-purple-800 border-purple-300';
      default: return 'bg-stone-100 text-stone-800 border-stone-300';
    }
  };

  if (!currentOrgId && userRole !== 'SYSTEM_ADMIN') {
      return <div className="p-8 text-center text-red-500 font-bold">سازمان شما مشخص نشده است. لطفا مجددا وارد شوید.</div>;
  }

  return (
    <div className="space-y-6 animate-fadeIn" dir="rtl">
      
      {/* Alert Messages */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-2xl font-bold flex items-center justify-between shadow-sm animate-fadeIn">
          <span className="flex items-center gap-2"><CheckCircle2 size={18} /> {successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-900"><XCircle size={18} /></button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-50 text-red-800 border border-red-200 rounded-2xl font-bold flex items-center justify-between shadow-sm animate-fadeIn">
          <span className="flex items-center gap-2"><AlertCircle size={18} /> {errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="text-red-600 hover:text-red-900"><XCircle size={18} /></button>
        </div>
      )}

      {/* Header Card matching HR styling */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div 
                  className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl shadow-md border-2 border-white/20 shrink-0"
                  style={{ backgroundColor: currentOrg?.brandColor || '#d97706' }}
                >
                  <Building2 size={28} className="text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="text-2xl font-black text-stone-800 dark:text-slate-100 tracking-tight">
                      {currentOrg?.name || 'سازمان منتخب'}
                    </h1>
                    <span className={`px-3 py-1 rounded-full text-xs font-black border ${getOrgTypeBadge(currentOrg?.type)}`}>
                      {getOrgTypeLabel(currentOrg?.type)}
                    </span>
                    {currentOrg?.code && (
                      <span className="bg-stone-100 dark:bg-slate-800 text-stone-600 dark:text-slate-300 px-3 py-1 rounded-full text-xs font-mono font-bold border border-stone-200 dark:border-slate-700">
                        کد: {currentOrg.code}
                      </span>
                    )}
                  </div>
                  <p className="text-stone-500 dark:text-slate-400 text-xs md:text-sm mt-1 flex items-center gap-2">
                    <Shield size={14} className="text-amber-500" />
                    مدیریت ساختار سازمانی، اکانت‌ها و سطح دسترسی‌های کاربران سیستم
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-wrap w-full lg:w-auto">
                {userRole === 'SYSTEM_ADMIN' && organizations.length > 0 && (
                  <div className="bg-stone-50 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center gap-2">
                    <span className="text-xs font-bold text-stone-500 dark:text-slate-400 pr-2">سازمان:</span>
                    <select 
                        value={currentOrgId || ''} 
                        onChange={e => setCurrentOrgId(e.target.value)}
                        className="px-3 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 text-stone-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 outline-none focus:border-amber-500 cursor-pointer"
                    >
                        {organizations.map(org => {
                            const cleanName = (org.name || '').replace(/\s*\((کارفرما|مشاور|پیمانکار)\)\s*$/gi, '').trim();
                            return (
                              <option key={org.id} value={org.id}>{cleanName} ({getOrgTypeLabel(org.type)})</option>
                            );
                        })}
                    </select>
                  </div>
                )}

                <button 
                  onClick={() => { 
                    setEditingUser(null);
                    setModalError(null);
                    setFormData({ 
                      username: '', 
                      fullName: '', 
                      jobLevel: '',
                      jobTitle: '',
                      department: '',
                      role: 'ORG_USER', 
                      isActive: true, 
                      password: '', 
                      securityCode: '',
                      projectIds: allowedProjects.map(p => String(p.id)), 
                      permissions: SystemAdminService.getStandardPermissions('', 'ORG_USER') 
                    }); 
                    setIsModalOpen(true); 
                  }}
                  className="bg-amber-600 hover:bg-stone-900 text-white font-bold px-5 py-2.5 rounded-2xl text-xs md:text-sm flex items-center gap-2 shadow-lg shadow-amber-600/20 transition-all hover:scale-[1.02]"
                >
                  <UserPlus size={18} />
                  تعریف کاربر جدید سیستم
                </button>
              </div>
            </div>
          </div>

          {/* Key Organization Metrics matching HR Stats cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-stone-100 dark:bg-slate-800 text-stone-700 dark:text-slate-300 rounded-2xl">
                <Users size={24} />
              </div>
              <div>
                <div className="text-2xl font-black text-stone-800 dark:text-slate-100">{users.length.toLocaleString('fa-IR')}</div>
                <div className="text-xs font-bold text-stone-500 dark:text-slate-400">حساب‌های کاربری فعال</div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl">
                <UserCheck size={24} />
              </div>
              <div>
                <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
                  {HRService.getPersonnelByOrg(currentOrgId || '').length.toLocaleString('fa-IR')}
                </div>
                <div className="text-xs font-bold text-stone-500 dark:text-slate-400">پرونده‌های پرسنلی HR</div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl">
                <FolderKanban size={24} />
              </div>
              <div>
                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{allowedProjects.length.toLocaleString('fa-IR')}</div>
                <div className="text-xs font-bold text-stone-500 dark:text-slate-400">پروژه‌های تخصیص‌یافته</div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-2xl">
                <Sparkles size={24} />
              </div>
              <div>
                <div className="text-2xl font-black text-purple-600 dark:text-purple-400">{unassignedPersonnelList.length.toLocaleString('fa-IR')}</div>
                <div className="text-xs font-bold text-stone-500 dark:text-slate-400">پرسنل آماده ساخت اکانت</div>
              </div>
            </div>
          </div>

      {/* SECTION 2: Unassigned Personnel Banner (Professional HR & System Users Integration) */}
      {unassignedPersonnelList.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-amber-500/10 border-2 border-amber-300 dark:border-amber-500/30 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-500 text-stone-950 rounded-xl font-black">
                <Sparkles size={18} />
              </div>
              <div>
                <h3 className="text-base font-black text-amber-950 dark:text-amber-200">
                  پرسنل ثبت‌شده در منابع انسانی (در انتظار تخصیص حساب کاربر سیستم)
                </h3>
                <p className="text-xs font-bold text-amber-800 dark:text-amber-300">
                  افراد زیر در منابع انسانی ثبت شده‌اند اما هنوز اکانت ورود به سامانه ندارند. با کلیک بر روی دکمه، حساب کاربری برایشان ایجاد کنید.
                </p>
              </div>
            </div>
            <span className="bg-amber-600 text-white text-xs font-black px-3 py-1 rounded-full">
              {unassignedPersonnelList.length} فرد جدید
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {unassignedPersonnelList.slice(0, 6).map(p => (
              <div key={p.id} className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-slate-800 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-xs hover:border-amber-400 transition-all">
                <div className="min-w-0 flex-1">
                  <div className="font-black text-stone-800 dark:text-stone-100 text-xs truncate">
                    {p.fullName}
                  </div>
                  <div className="text-[11px] font-bold text-stone-500 truncate mt-0.5">
                    سمت: <span className="text-amber-700 dark:text-amber-400">{p.jobLevel}</span> ({p.jobTitle || 'بدون عنوان'})
                  </div>
                </div>

                {(p.jobLevel === 'مدیر پروژه' || p.jobLevel === 'مدیر ارشد سازمان') && userRole !== 'SYSTEM_ADMIN' ? (
                  <span 
                    className="text-[10px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1.5 rounded-xl border border-amber-200 dark:border-amber-800/50 flex items-center gap-1 font-bold shrink-0"
                    title="ساخت حساب کاربری برای مدیر ارشد فقط توسط مدیر کل سیستم امکان‌پذیر است"
                  >
                    <Lock size={12} className="text-amber-600 dark:text-amber-400" />
                    توسط مدیر کل
                  </span>
                ) : (
                  <button
                    onClick={() => handleCreateUserForPersonnel(p)}
                    className="bg-amber-500 hover:bg-amber-600 text-stone-950 text-xs font-black px-3 py-2 rounded-xl flex items-center gap-1.5 shrink-0 shadow-xs transition-all hover:scale-105"
                    title="ساخت سریع کاربر سیستم"
                  >
                    <UserPlus size={14} />
                    ساخت اکانت
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 3: Main Organization Users Directory Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-stone-200 dark:border-slate-800 overflow-hidden">
        
        {/* Table Header Controls */}
        <div className="p-6 border-b border-stone-100 dark:border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 text-amber-600 rounded-2xl">
              <Users size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-stone-800 dark:text-stone-100">کاربران دارای حساب در سازمان</h2>
              <p className="text-xs font-bold text-stone-500">لیست و سطح دسترسی تمامی اعضای دارای اکانت ورود</p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Search Input */}
            <div className="relative flex-1 md:w-64">
              <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                placeholder="جستجو در کاربران..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800 text-xs font-bold outline-none focus:border-amber-500"
              />
            </div>

            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800 text-xs font-bold outline-none focus:border-amber-500"
            >
              <option value="ALL">همه نقش‌ها</option>
              <option value="ORG_ADMIN">مدیر پروژه / ادمین</option>
              <option value="ORG_MANAGER">سرپرست کارگاه / مدیر</option>
              <option value="ORG_USER">کاربر عادی / کارشناس</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800 text-xs font-bold outline-none focus:border-amber-500"
            >
              <option value="ALL">همه وضعیت‌ها</option>
              <option value="ACTIVE">فقط فعال‌ها</option>
              <option value="INACTIVE">فقط غیرفعال‌ها</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead className="bg-stone-50 dark:bg-slate-800/60 border-b border-stone-100 dark:border-slate-800">
              <tr>
                <th className="p-4 md:p-5 text-xs font-black text-stone-500">کاربر و نام کاربری</th>
                <th className="p-4 md:p-5 text-xs font-black text-stone-500">نام و نام خانوادگی</th>
                <th className="p-4 md:p-5 text-xs font-black text-stone-500">سمت و عنوان شغلی</th>
                <th className="p-4 md:p-5 text-xs font-black text-stone-500">نقش در سامانه</th>
                <th className="p-4 md:p-5 text-xs font-black text-stone-500">پروژه‌های مجاز</th>
                <th className="p-4 md:p-5 text-xs font-black text-stone-500">وضعیت</th>
                <th className="p-4 md:p-5 text-xs font-black text-stone-500 text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-slate-800">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-stone-400 font-bold">
                    هیچ کاربری با مشخصات فیلترشده یافت نشد.
                  </td>
                </tr>
              ) : (
                filteredUsers.map(user => (
                  <tr key={user.id} className="hover:bg-amber-50/30 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-4 md:p-5 font-bold text-stone-800 dark:text-stone-200">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 font-black text-xs flex items-center justify-center shrink-0">
                          {user.fullName.slice(0, 1)}
                        </div>
                        <div>
                          <div className="font-mono text-xs text-stone-900 dark:text-stone-100 font-black">{user.username}</div>
                          <div className="text-[10px] text-stone-400">کد کاربر: {user.id.slice(0, 8)}</div>
                        </div>
                      </div>
                    </td>

                    <td className="p-4 md:p-5 font-black text-stone-900 dark:text-stone-100 text-xs md:text-sm">
                      {user.fullName}
                    </td>

                    <td className="p-4 md:p-5 font-bold text-stone-600 dark:text-stone-300 text-xs">
                      <div className="font-black text-stone-800 dark:text-stone-100">{user.jobLevel || '-'}</div>
                      <div className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">{user.jobTitle || 'بدون عنوان شغلی'}</div>
                      {user.department && (
                        <div className="text-[10px] text-stone-500 dark:text-stone-400 font-bold mt-0.5">واحد: {user.department}</div>
                      )}
                      {user.securityCode && (
                        <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">کد امنیتی: {user.securityCode}</div>
                      )}
                    </td>

                    <td className="p-4 md:p-5">
                      {user.role === 'ORG_ADMIN' && <span className="bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 px-2.5 py-1 rounded-lg text-xs font-black border border-purple-200">مدیر پروژه (ادمین)</span>}
                      {user.role === 'ORG_MANAGER' && <span className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 px-2.5 py-1 rounded-lg text-xs font-black border border-amber-200">سرپرست کارگاه</span>}
                      {user.role === 'ORG_USER' && <span className="bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 px-2.5 py-1 rounded-lg text-xs font-black border border-slate-200">کاربر کارشناس</span>}
                    </td>

                    <td className="p-4 md:p-5 text-xs text-stone-600">
                      {user.projectIds && user.projectIds.length > 0 ? (
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {user.projectIds.map(pid => {
                            const proj = allowedProjects.find(p => p.id === pid);
                            return proj ? (
                              <span key={pid} className="bg-stone-100 dark:bg-slate-800 text-stone-800 dark:text-stone-200 px-2 py-0.5 rounded text-[11px] font-bold border border-stone-200 dark:border-slate-700">
                                {proj.name}
                              </span>
                            ) : null;
                          })}
                        </div>
                      ) : (
                        <span className="text-stone-400 text-xs font-bold">بدون پروژه تخصیصی</span>
                      )}
                    </td>

                    <td className="p-4 md:p-5">
                      {user.isActive ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 px-2.5 py-1 rounded-full text-xs font-black border border-emerald-200">
                          <CheckCircle size={12} /> فعال
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-400 px-2.5 py-1 rounded-full text-xs font-black border border-red-200">
                          <XCircle size={12} /> غیرفعال
                        </span>
                      )}
                    </td>

                    <td className="p-4 md:p-5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {canEditUser(user) ? (
                          <>
                            <button 
                              onClick={() => handleEditUser(user)} 
                              className="p-2 text-amber-600 hover:bg-amber-50 dark:hover:bg-slate-800 rounded-xl transition-colors" 
                              title="ویرایش و دسترسی‌ها"
                            >
                              <Edit2 size={16} />
                            </button>

                            <button 
                              onClick={() => { setResetPassId(user.id); setNewPassword(''); }} 
                              className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-xl transition-colors" 
                              title="تغییر رمز عبور"
                            >
                              <KeyRound size={16} />
                            </button>

                            <button 
                              onClick={() => setToggleActiveUser(user)} 
                              className={`p-2 rounded-xl transition-colors ${user.isActive ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'}`} 
                              title={user.isActive ? "غیرفعال‌سازی حساب" : "فعال‌سازی حساب"}
                            >
                              {user.isActive ? <XCircle size={16}/> : <CheckCircle size={16}/>}
                            </button>

                            <button 
                              onClick={() => setDeleteUserId(user.id)} 
                              className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-slate-800 rounded-xl transition-colors" 
                              title="حذف کاربر"
                            >
                              <Trash2 size={16}/>
                            </button>
                          </>
                        ) : (
                          <span 
                            className="text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-xl border border-amber-200 dark:border-amber-800/50 flex items-center justify-center gap-1 font-semibold"
                            title="ویرایش و حذف مدیر ارشد سازمان فقط توسط مدیر کل سیستم امکان‌پذیر است"
                          >
                            <Lock size={12} className="text-amber-600 dark:text-amber-400" />
                            مدیریت توسط مدیر کل سیستم
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Create / Edit System User with Permissions Matrix */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-stone-950/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full p-6 md:p-8 shadow-2xl border border-stone-200 dark:border-slate-800 my-8 max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="flex justify-between items-center mb-6 border-b border-stone-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500 text-stone-950 rounded-2xl font-black">
                  <UserPlus size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-stone-900 dark:text-stone-100">
                    {editingUser ? 'ویرایش اطلاعات و دسترسی‌های کاربر' : 'تعریف کاربر جدید در سازمان'}
                  </h2>
                  <p className="text-xs text-stone-500 font-bold">اتصال مستقیم حساب به پرونده پرسنلی منابع انسانی</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-stone-400 hover:text-stone-700"><XCircle size={20}/></button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-6">
              {modalError && (
                <div className="p-4 bg-red-50 dark:bg-red-950/50 border-2 border-red-200 dark:border-red-800/80 rounded-2xl text-xs font-bold text-red-700 dark:text-red-300 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-2.5">
                    <AlertCircle size={20} className="shrink-0 text-red-500" />
                    <span>{modalError}</span>
                  </div>
                  <button type="button" onClick={() => setModalError(null)} className="text-red-400 hover:text-red-700 p-1">
                    <XCircle size={18} />
                  </button>
                </div>
              )}
              
              {/* Personnel Picker (Mandatory linkage to HR) */}
              {editingUser ? (
                <div className="p-4 bg-emerald-50/80 dark:bg-emerald-950/30 rounded-2xl border-2 border-emerald-300 dark:border-emerald-500/30 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
                      <UserCheck size={22} />
                    </div>
                    <div>
                      <div className="text-xs font-black text-emerald-950 dark:text-emerald-200">
                        متصل به پرونده پرسنلی: {formData.fullName || editingUser.fullName}
                      </div>
                      <div className="text-[11px] text-emerald-800 dark:text-emerald-300 font-semibold mt-0.5">
                        سمت: {formData.jobLevel || editingUser.jobLevel} {formData.jobTitle ? `(${formData.jobTitle})` : ''} {formData.department ? `| واحد: ${formData.department}` : ''}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 font-bold px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                    پرونده تاییدشده
                  </span>
                </div>
              ) : (
                <div className="p-4 bg-amber-50/80 dark:bg-amber-950/30 rounded-2xl border-2 border-amber-300 dark:border-amber-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-amber-950 dark:text-amber-200 flex items-center gap-1.5">
                      <Users size={16} className="text-amber-700 dark:text-amber-400" />
                      انتخاب پرسنل ثبت‌شده از منابع انسانی (الزامی) *
                    </label>
                    <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 bg-amber-200/60 dark:bg-amber-900/40 px-2 py-0.5 rounded-md">
                      عدم امکان تعریف پرسنل آزاد
                    </span>
                  </div>
                  
                  {availablePersonnel.length === 0 ? (
                    <div className="p-4 bg-amber-100/70 dark:bg-amber-950/60 rounded-xl border border-amber-300 dark:border-amber-700/50 space-y-2 text-stone-800 dark:text-stone-200">
                      <div className="flex items-center gap-2 text-xs font-black text-amber-900 dark:text-amber-300">
                        <AlertCircle size={16} className="text-amber-600 shrink-0" />
                        <span>هیچ پرسنل ثبت‌شده‌ای بدون حساب کاربری در این سازمان موجود نیست</span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-stone-600 dark:text-stone-300">
                        تعریف حساب کاربری آزاد و متفرقه بدون داشتن پرونده پرسنلی مسدود است. برای ایجاد کاربر جدید، ابتدا فرد مورد نظر را در بخش <strong>«پرونده‌های پرسنلی و کارگزینی»</strong> ثبت نمایید.
                      </p>
                    </div>
                  ) : (
                    <>
                      <select 
                        required 
                        value={formData.personnelId || ''} 
                        onChange={e => {
                          const pId = e.target.value;
                          const selected = availablePersonnel.find(p => p.id === pId);
                          if (selected) {
                            let calculatedRole: 'ORG_ADMIN' | 'ORG_MANAGER' | 'ORG_USER' = (formData.role === 'ORG_ADMIN' || formData.role === 'ORG_MANAGER' || formData.role === 'ORG_USER') ? formData.role : 'ORG_USER';
                            if (selected.jobLevel === 'سرپرست کارگاه') calculatedRole = 'ORG_MANAGER';
                            else if (selected.jobLevel === 'مدیر پروژه' && userRole === 'SYSTEM_ADMIN') calculatedRole = 'ORG_ADMIN';
                            else if (selected.jobLevel === 'مدیر پروژه' && userRole !== 'SYSTEM_ADMIN') calculatedRole = 'ORG_USER';

                            const stdPerms = SystemAdminService.getStandardPermissions(selected.jobLevel, calculatedRole);

                            const autoUsername = formData.username || (selected.personnelCode ? `user_${selected.personnelCode}` : `user_${selected.id.slice(0, 5)}`);

                            setFormData({
                              ...formData,
                              personnelId: selected.id,
                              username: autoUsername,
                              fullName: selected.fullName,
                              jobLevel: selected.jobLevel,
                              jobTitle: selected.jobTitle || '',
                              department: selected.department || '',
                              role: calculatedRole,
                              permissions: stdPerms
                            });
                          } else {
                            setFormData({ ...formData, personnelId: '', fullName: '', jobLevel: '', jobTitle: '', department: '' });
                          }
                        }}
                        className="w-full px-4 py-3 rounded-xl border-2 border-amber-400 focus:border-amber-600 outline-none font-bold bg-white dark:bg-slate-800 text-stone-800 dark:text-stone-100 text-xs md:text-sm"
                      >
                        <option value="">-- لطفاً پرسنل ثبت‌شده را از لیست انتخاب کنید --</option>
                        {availablePersonnel.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.fullName} - سمت: {p.jobLevel} ({p.jobTitle || 'بدون عنوان'}) {p.department ? `| واحد: ${p.department}` : ''} [کد پرسنلی: {p.personnelCode}]
                          </option>
                        ))}
                      </select>

                      {formData.personnelId && (
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-300 dark:border-emerald-700/50 flex items-center justify-between text-xs font-bold text-emerald-900 dark:text-emerald-200">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 size={16} className="text-emerald-600" />
                            <span>پرسنل انتخاب‌شده: {formData.fullName} ({formData.jobLevel})</span>
                          </div>
                          <span className="text-[10px] bg-emerald-200/60 dark:bg-emerald-900/60 px-2 py-0.5 rounded text-emerald-800 dark:text-emerald-200">
                            اطلاعات شغلی همگام شد
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Account Details Form Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-600 dark:text-stone-300 mb-2">نام کاربری ورود (انگلیسی) *</label>
                  <input 
                    required 
                    value={formData.username || ''} 
                    onChange={e => setFormData({...formData, username: e.target.value})} 
                    className="w-full px-4 py-3 rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-stone-800 dark:text-stone-100 font-mono text-sm outline-none focus:border-amber-500" 
                    placeholder="مثال: m_nasrollah" 
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-600 dark:text-stone-300 mb-2">رمز عبور ورود *</label>
                  <input 
                    type="password"
                    required={!editingUser} 
                    value={formData.password || ''} 
                    onChange={e => setFormData({...formData, password: e.target.value})} 
                    className="w-full px-4 py-3 rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-stone-800 dark:text-stone-100 font-mono text-sm outline-none focus:border-amber-500" 
                    placeholder={editingUser ? 'فقط در صورت نیاز به تغییر وارد کنید' : 'حداقل ۶ کاراکتر'} 
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-600 dark:text-stone-300 mb-2">رمز دو مرحله‌ای / کد امنیتی (جهت بازیابی رمز عبور)</label>
                  <input 
                    type="text"
                    value={formData.securityCode || ''} 
                    onChange={e => setFormData({...formData, securityCode: e.target.value})} 
                    className="w-full px-4 py-3 rounded-xl border border-amber-300 dark:border-amber-500/40 bg-amber-50/50 dark:bg-slate-800 text-stone-900 dark:text-stone-100 font-mono text-sm outline-none focus:border-amber-500 font-bold" 
                    placeholder="کد امنیتی دلخواه (مثلاً: 1234)" 
                  />
                  <span className="text-[10px] text-amber-700 dark:text-amber-400 mt-1 block font-bold">
                    * جهت احراز هویت در فرم فراموشی رمز عبور در صفحه لاگین
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-600 dark:text-stone-300 mb-2">نام و نام خانوادگی (خوانی از HR)</label>
                  <input 
                    readOnly 
                    value={formData.fullName || ''} 
                    className="w-full px-4 py-3 rounded-xl border border-stone-200 dark:border-slate-800 bg-stone-100 dark:bg-slate-800 text-stone-700 dark:text-stone-300 font-bold outline-none cursor-not-allowed text-xs md:text-sm" 
                    placeholder="دریافت خودکار از HR"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-600 dark:text-stone-300 mb-2">واحد سازمانی / مدیریت (خوانی از HR)</label>
                  <input 
                    readOnly 
                    value={formData.department || ''} 
                    className="w-full px-4 py-3 rounded-xl border border-stone-200 dark:border-slate-800 bg-stone-100 dark:bg-slate-800 text-stone-700 dark:text-stone-300 font-bold outline-none cursor-not-allowed text-xs md:text-sm" 
                    placeholder="دریافت خودکار از HR"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-600 dark:text-stone-300 mb-2">سمت سازمانی (خوانی از HR)</label>
                  <input 
                    readOnly 
                    value={formData.jobLevel || ''} 
                    className="w-full px-4 py-3 rounded-xl border border-stone-200 dark:border-slate-800 bg-stone-100 dark:bg-slate-800 text-stone-700 dark:text-stone-300 font-bold outline-none cursor-not-allowed text-xs md:text-sm" 
                    placeholder="دریافت خودکار از HR"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-stone-600 dark:text-stone-300 mb-2">عنوان شغلی دقیق (خوانی از HR)</label>
                  <input 
                    readOnly 
                    value={formData.jobTitle || ''} 
                    className="w-full px-4 py-3 rounded-xl border border-stone-200 dark:border-slate-800 bg-stone-100 dark:bg-slate-800 text-stone-700 dark:text-stone-300 font-bold outline-none cursor-not-allowed text-xs md:text-sm" 
                    placeholder="دریافت خودکار از HR"
                  />
                </div>
              </div>

              {/* System Role Picker */}
              <div>
                <label className="block text-xs font-bold text-stone-600 dark:text-stone-300 mb-2">نقش سیستمی کاربر در سازمان</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      const std = SystemAdminService.getStandardPermissions(formData.jobLevel || '', 'ORG_USER');
                      setFormData({ ...formData, role: 'ORG_USER', permissions: std });
                    }}
                    className={`p-3.5 rounded-2xl border text-right transition-all ${formData.role === 'ORG_USER' ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-950 dark:text-amber-200 font-black' : 'border-stone-200 dark:border-slate-800 text-stone-600 dark:text-stone-400'}`}
                  >
                    <div className="text-xs font-black">کاربر عادی (کارشناس)</div>
                    <div className="text-[10px] opacity-75 mt-0.5">دسترسی استاندارد ماژول‌های مجاز</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const std = SystemAdminService.getStandardPermissions(formData.jobLevel || 'سرپرست کارگاه', 'ORG_MANAGER');
                      setFormData({ ...formData, role: 'ORG_MANAGER', permissions: std });
                    }}
                    className={`p-3.5 rounded-2xl border text-right transition-all ${formData.role === 'ORG_MANAGER' ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-950 dark:text-amber-200 font-black' : 'border-stone-200 dark:border-slate-800 text-stone-600 dark:text-stone-400'}`}
                  >
                    <div className="text-xs font-black">سرپرست (مدیر واحد/کارگاه)</div>
                    <div className="text-[10px] opacity-75 mt-0.5">اختیارات تایید اولیه و نظارت</div>
                  </button>

                  <button
                    type="button"
                    disabled={userRole !== 'SYSTEM_ADMIN'}
                    onClick={() => {
                      if (userRole !== 'SYSTEM_ADMIN') return;
                      const std = SystemAdminService.getStandardPermissions(formData.jobLevel || 'مدیر پروژه', 'ORG_ADMIN');
                      setFormData({ ...formData, role: 'ORG_ADMIN', permissions: std });
                    }}
                    className={`p-3.5 rounded-2xl border text-right transition-all relative ${
                      userRole !== 'SYSTEM_ADMIN'
                        ? 'opacity-50 cursor-not-allowed bg-stone-100 dark:bg-slate-800/60 border-stone-200 dark:border-slate-800 text-stone-400'
                        : formData.role === 'ORG_ADMIN'
                          ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-950 dark:text-amber-200 font-black'
                          : 'border-stone-200 dark:border-slate-800 text-stone-600 dark:text-stone-400'
                    }`}
                  >
                    <div className="text-xs font-black flex items-center justify-between">
                      <span>مدیر پروژه (ادمین سازمان)</span>
                      {userRole !== 'SYSTEM_ADMIN' && <Lock size={12} className="text-stone-400 shrink-0" />}
                    </div>
                    <div className="text-[10px] opacity-75 mt-0.5">
                      {userRole === 'SYSTEM_ADMIN' ? 'دسترسی کامل مدیریتی و تایید نهایی' : 'فقط توسط مدیر کل سیستم قابل تعیین است'}
                    </div>
                  </button>
                </div>
              </div>

              {/* Project Assignments */}
              <div>
                <label className="block text-xs font-bold text-stone-600 dark:text-stone-300 mb-2">تخصیص پروژه‌های مجاز برای این کاربر</label>
                <div className="p-4 bg-stone-50 dark:bg-slate-800 rounded-2xl border border-stone-200 dark:border-slate-700 flex flex-wrap gap-2">
                  {allowedProjects.map(proj => {
                    const isAssigned = (formData.projectIds || []).map(String).includes(String(proj.id));
                    return (
                      <button
                        key={proj.id}
                        type="button"
                        onClick={() => toggleProject(String(proj.id))}
                        className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                          isAssigned 
                            ? 'bg-amber-500 text-stone-950 shadow-sm font-black' 
                            : 'bg-white dark:bg-slate-900 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-slate-700'
                        }`}
                      >
                        {isAssigned ? <CheckCircle size={14} /> : <div className="w-3.5 h-3.5 rounded-full border border-stone-400" />}
                        {proj.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Module Permissions Matrix */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="text-xs font-black text-stone-800 dark:text-stone-200 flex items-center gap-2">
                    <Shield size={16} className="text-amber-500" />
                    ماتریس ریز دسترسی به ماژول‌های سامانه
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const std = SystemAdminService.getStandardPermissions(formData.jobLevel || '', formData.role || 'ORG_USER');
                      setFormData({ ...formData, permissions: std });
                    }}
                    className="text-[11px] font-bold text-amber-600 hover:text-amber-700 underline"
                  >
                    بازنشانی به استاندارد
                  </button>
                </div>

                <div className="border border-stone-200 dark:border-slate-800 rounded-2xl overflow-hidden text-xs">
                  <table className="w-full text-right border-collapse">
                    <thead className="bg-stone-100 dark:bg-slate-800 text-stone-600 dark:text-stone-300">
                      <tr>
                        <th className="p-3 font-black">عنوان ماژول</th>
                        <th className="p-3 text-center font-bold">مشاهده</th>
                        <th className="p-3 text-center font-bold">ایجاد</th>
                        <th className="p-3 text-center font-bold">ویرایش</th>
                        <th className="p-3 text-center font-bold">حذف</th>
                        <th className="p-3 text-center font-bold">ارسال/تایید</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 dark:divide-slate-800">
                      {APP_MODULES.map(mod => {
                        const perm = getPermission(mod.id);
                        return (
                          <tr key={mod.id} className="hover:bg-stone-50 dark:hover:bg-slate-800/50">
                            <td className="p-3 font-bold text-stone-800 dark:text-stone-200">{mod.label}</td>
                            
                            <td className="p-3 text-center">
                              <input 
                                type="checkbox" 
                                checked={perm.canView || false} 
                                onChange={() => togglePermission(mod.id, 'view')} 
                                className="w-4 h-4 accent-amber-500 cursor-pointer" 
                              />
                            </td>

                            <td className="p-3 text-center">
                              <input 
                                type="checkbox" 
                                checked={perm.canCreate || false} 
                                onChange={() => togglePermission(mod.id, 'create')} 
                                className="w-4 h-4 accent-amber-500 cursor-pointer" 
                              />
                            </td>

                            <td className="p-3 text-center">
                              <input 
                                type="checkbox" 
                                checked={perm.canEdit || false} 
                                onChange={() => togglePermission(mod.id, 'edit')} 
                                className="w-4 h-4 accent-amber-500 cursor-pointer" 
                              />
                            </td>

                            <td className="p-3 text-center">
                              <input 
                                type="checkbox" 
                                checked={perm.canDelete || false} 
                                onChange={() => togglePermission(mod.id, 'delete')} 
                                className="w-4 h-4 accent-amber-500 cursor-pointer" 
                              />
                            </td>

                            <td className="p-3 text-center">
                              <input 
                                type="checkbox" 
                                checked={perm.canApprove || perm.canSend || false} 
                                onChange={() => togglePermission(mod.id, 'approve')} 
                                className="w-4 h-4 accent-amber-500 cursor-pointer" 
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Submit Controls */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-slate-800"
                >
                  انصراف
                </button>

                <button
                  type="submit"
                  disabled={!formData.personnelId && !editingUser}
                  className={`font-black px-6 py-2.5 rounded-xl text-xs md:text-sm shadow-md transition-all ${
                    !formData.personnelId && !editingUser
                      ? 'bg-stone-200 dark:bg-slate-800 text-stone-400 dark:text-stone-500 cursor-not-allowed border border-stone-300 dark:border-slate-700'
                      : 'bg-amber-500 hover:bg-amber-600 text-stone-950 cursor-pointer hover:shadow-lg'
                  }`}
                >
                  ذخیره حساب کاربری و دسترسی‌ها
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Reset Password */}
      {resetPassId && (
        <div className="fixed inset-0 bg-stone-950/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 dark:border-slate-800">
            <h3 className="text-base font-black text-stone-900 dark:text-stone-100 mb-4 flex items-center gap-2">
              <KeyRound size={20} className="text-amber-500" />
              تغییر رمز عبور کاربر
            </h3>
            
            <input 
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="رمز عبور جدید را وارد کنید"
              className="w-full px-4 py-3 rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-sm font-bold mb-6 outline-none focus:border-amber-500"
            />

            <div className="flex items-center justify-end gap-2">
              <button 
                onClick={() => setResetPassId(null)}
                className="px-4 py-2 text-xs font-bold text-stone-600 dark:text-stone-300"
              >
                انصراف
              </button>
              <button 
                onClick={handleResetPassword}
                className="bg-amber-500 text-stone-950 font-black px-5 py-2 rounded-xl text-xs"
              >
                ثبت رمز عبور جدید
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete and Toggle Active Modals */}
      <DeleteModal
        isOpen={!!deleteUserId}
        title="حذف کاربر سازمان"
        description="آیا از حذف این حساب کاربری اطمینان دارید؟ این عمل غیرقابل بازگشت است."
        onConfirm={confirmDelete}
        onClose={() => setDeleteUserId(null)}
      />

      <DeleteModal
        isOpen={!!toggleActiveUser}
        title={toggleActiveUser?.isActive ? "غیرفعال‌سازی کاربر" : "فعال‌سازی کاربر"}
        description={`آیا از ${toggleActiveUser?.isActive ? 'غیرفعال‌سازی' : 'فعال‌سازی'} حساب کاربری ${toggleActiveUser?.fullName} اطمینان دارید؟`}
        onConfirm={confirmDeactivate}
        onClose={() => setToggleActiveUser(null)}
      />

    </div>
  );
};

export default OrgUsers;
