import React, { useState, useEffect } from 'react';
import { SystemAdminService } from '../../services/systemAdminService';
import { SystemUser, Organization, SystemProject, ModuleId, OrganizationType } from '../../systemAdminTypes';
import { Users, Search, Filter, Shield, Building2, CheckCircle2, XCircle, Eye, X, Edit2, Trash2, Lock, AlertTriangle } from 'lucide-react';
import { APP_MODULES } from '../../constants';
import DeleteModal from '../../components/DeleteModal';

export const AllUsers: React.FC = () => {
  const [users, setUsers] = useState<Array<{user: SystemUser, org?: Organization}>>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOrgType, setFilterOrgType] = useState<string>('ALL');
  const [filterRole, setFilterRole] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  
  const [selectedUser, setSelectedUser] = useState<SystemUser | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [toggleActiveUser, setToggleActiveUser] = useState<SystemUser | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Edit Mode State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [formData, setFormData] = useState<Partial<SystemUser>>({
    username: '',
    fullName: '',
    role: 'ORG_USER',
    isActive: true,
    password: '',
    securityCode: '',
    projectIds: [],
    permissions: []
  });
  const [allowedProjects, setAllowedProjects] = useState<SystemProject[]>([]);

  const loadData = () => {
    setUsers(SystemAdminService.getUsersDetailed());
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleActive = (user: SystemUser) => {
    setToggleActiveUser(user);
  };

  const confirmToggleActive = () => {
    if (toggleActiveUser) {
        try {
            const updatedUser = { ...toggleActiveUser, isActive: !toggleActiveUser.isActive };
            SystemAdminService.saveUser(updatedUser);
            setToggleActiveUser(null);
            loadData();
        } catch (error: any) {
            setErrorMsg(error.message);
        }
    }
  };

  const handleDelete = (e: React.MouseEvent, user: SystemUser) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleteId(user.id);
  };

  const confirmDelete = () => {
    if (deleteId) {
        try {
            SystemAdminService.deleteUser(deleteId);
            setDeleteId(null);
            loadData();
        } catch (e: any) {
            alert(e.message);
        }
    }
  };

  const handleEdit = (user: SystemUser) => {
    setEditingUser(user);
    
    // Load org-specific data for the user being edited
    const projectIds = SystemAdminService.getAssignedProjectsForOrg(user.orgId).map(String);
    const allProjects = SystemAdminService.getProjects();
    let allowed = allProjects.filter(p => projectIds.includes(String(p.id)));
    if (allowed.length === 0 && allProjects.length > 0) {
      allowed = allProjects;
    }
    setAllowedProjects(allowed);

    setFormData({
        ...user,
        password: '', // Don't show password
        projectIds: (user.projectIds || []).map(String),
        permissions: (user.permissions && user.permissions.length > 0) ? user.permissions : SystemAdminService.getStandardPermissions(user.jobLevel || '', user.role)
    });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingUser) return;

      const newUser: SystemUser = {
          ...editingUser,
          username: formData.username || editingUser.username,
          fullName: formData.fullName || '',
          jobLevel: formData.jobLevel || '',
          jobTitle: formData.jobTitle || '',
          // orgId is not editable here to prevent consistency issues
          role: (formData.role as any) || editingUser.role,
          isActive: formData.isActive !== undefined ? formData.isActive : true,
          password: formData.password ? formData.password : editingUser.password,
          securityCode: formData.securityCode !== undefined ? formData.securityCode : editingUser.securityCode,
          projectIds: (formData.projectIds || []).map(String),
          permissions: formData.permissions || []
      };

      try {
          SystemAdminService.saveUser(newUser);
          setIsModalOpen(false);
          setEditingUser(null);
          loadData();
      } catch (error: any) {
          alert(error.message);
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

  const filteredUsers = users.filter(({ user, org }) => {
    const matchesSearch = user.username.includes(searchTerm) || (user.fullName && user.fullName.includes(searchTerm));
    const matchesOrgType = filterOrgType === 'ALL' || org?.type === filterOrgType;
    const matchesRole = filterRole === 'ALL' || user.role === filterRole;
    const matchesStatus = filterStatus === 'ALL' || 
      (filterStatus === 'ACTIVE' ? user.isActive : !user.isActive);
      
    return matchesSearch && matchesOrgType && matchesRole && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-fadeIn" dir="rtl">
      {/* Header Description */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl">
            <Users size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-stone-800 dark:text-slate-100">کاربران (همه سازمان‌ها)</h1>
            <p className="text-xs font-semibold text-stone-500 dark:text-slate-400 mt-1">
              مشاهده و مدیریت نظارتی تمام کاربران سیستم
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-800 overflow-hidden mb-8">
        <div className="p-6 border-b border-slate-100 flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="جستجو در نام یا نام کاربری..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-12 pl-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium text-sm"
            />
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 lg:pb-0">
            <select
              value={filterOrgType}
              onChange={(e) => setFilterOrgType(e.target.value)}
              className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-stone-700 outline-none focus:border-amber-500 min-w-[140px]"
            >
              <option value="ALL">همه سازمان‌ها</option>
              <option value="EMPLOYER">کارفرما</option>
              <option value="CONSULTANT">مشاور</option>
              <option value="CONTRACTOR">پیمانکار</option>
            </select>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-stone-700 outline-none focus:border-amber-500 min-w-[140px]"
            >
              <option value="ALL">همه نقش‌ها</option>
              <option value="ORG_ADMIN">مدیر سازمان</option>
              <option value="ORG_MANAGER">مدیر پروژه</option>
              <option value="ORG_USER">کاربر عادی</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-stone-700 outline-none focus:border-amber-500 min-w-[140px]"
            >
              <option value="ALL">وضعیت (همه)</option>
              <option value="ACTIVE">فعال</option>
              <option value="INACTIVE">غیرفعال</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-stone-500 text-xs font-black uppercase tracking-wider">
                <th className="p-4">کاربر</th>
                <th className="p-4">سازمان</th>
                <th className="p-4">نقش</th>
                <th className="p-4 text-center">دسترسی‌ها</th>
                <th className="p-4 text-center">وضعیت</th>
                <th className="p-4 text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 font-bold">هیچ کاربری یافت نشد.</td>
                </tr>
              ) : (
                filteredUsers.map(({ user, org }) => (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 text-amber-600 flex items-center justify-center font-black">
                          {user.fullName ? user.fullName.charAt(0) : user.username.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-stone-800 text-sm">{user.fullName || '-'}</div>
                          <div className="text-xs text-stone-500 font-medium dir-ltr text-right">{user.username}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      {org ? (
                        <div>
                          <div className="font-bold text-stone-700 text-sm">{org.name}</div>
                          <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mt-0.5">
                            {org.type === 'EMPLOYER' ? 'کارفرما' : org.type === 'CONSULTANT' ? 'مشاور' : 'پیمانکار'}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-sm">-</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${
                        user.role === 'ORG_ADMIN' ? 'bg-purple-100 text-purple-700' :
                        user.role === 'ORG_MANAGER' ? 'bg-blue-100 text-stone-900' :
                        'bg-slate-100 text-stone-700'
                      }`}>
                        {user.role === 'ORG_ADMIN' ? 'مدیر سازمان' : user.role === 'ORG_MANAGER' ? 'مدیر پروژه' : 'کاربر عادی'}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-[10px] font-bold text-stone-500 bg-slate-100 px-2 py-0.5 rounded-md">
                          {user.projectIds?.length || 0} پروژه
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${
                        user.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {user.isActive ? <CheckCircle2 size={14}/> : <XCircle size={14}/>}
                        {user.isActive ? 'فعال' : 'غیرفعال'}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedUser(user); }}
                          className="p-2 text-slate-400 hover:text-amber-600 hover:bg-stone-50 rounded-xl transition-colors"
                          title="مشاهده جزئیات"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleToggleActive(user); }}
                          className={`p-2 rounded-xl transition-colors ${user.isActive ? 'text-amber-500 hover:bg-amber-50' : 'text-emerald-500 hover:bg-emerald-50'}`} 
                          title={user.isActive ? "غیرفعال کردن" : "فعال کردن"}
                        >
                          {user.isActive ? <XCircle size={18}/> : <CheckCircle2 size={18}/>}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleEdit(user); }}
                          className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-colors"
                          title="ویرایش"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={(e) => handleDelete(e, user)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                          title="حذف"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-black text-stone-800 flex items-center gap-2">
                <Shield className="text-amber-600" size={20} />
                جزئیات کاربر
              </h3>
              <button 
                onClick={() => setSelectedUser(null)}
                className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-blue-100 text-amber-600 flex items-center justify-center font-black text-2xl">
                  {selectedUser.fullName ? selectedUser.fullName.charAt(0) : selectedUser.username.charAt(0)}
                </div>
                <div>
                  <h4 className="font-black text-lg text-stone-800">{selectedUser.fullName || '-'}</h4>
                  <p className="text-stone-500 font-medium dir-ltr text-right">{selectedUser.username}</p>
                  {selectedUser.jobLevel && (
                    <p className="text-xs font-bold text-stone-500 mt-1">{selectedUser.jobLevel}</p>
                  )}
                  {selectedUser.jobTitle && (
                    <p className="text-xs font-bold text-amber-600 mt-1">{selectedUser.jobTitle}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <span className="text-xs font-bold text-slate-400 block mb-1">نقش</span>
                  <span className="font-black text-stone-700">{selectedUser.role === 'ORG_ADMIN' ? 'مدیر سازمان' : selectedUser.role === 'ORG_MANAGER' ? 'مدیر پروژه' : 'کاربر عادی'}</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <span className="text-xs font-bold text-slate-400 block mb-1">وضعیت</span>
                  <span className={`font-black ${selectedUser.isActive ? 'text-emerald-600' : 'text-red-600'}`}>
                    {selectedUser.isActive ? 'فعال' : 'غیرفعال'}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <h5 className="text-sm font-black text-stone-700 flex items-center gap-2">
                  <Building2 size={16} className="text-slate-400" />
                  اطلاعات سازمان
                </h5>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-stone-500">شناسه سازمان:</span>
                    <span className="text-xs font-mono text-stone-600 font-bold">{selectedUser.orgId}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-stone-500">ادمین سازمان:</span>
                    <span className="text-xs font-bold text-stone-700">
                      {(() => {
                        const orgAdmins = SystemAdminService.getUsers().filter(u => u.orgId === selectedUser.orgId && u.role === 'ORG_ADMIN');
                        return orgAdmins.length > 0 ? orgAdmins.map(a => a.fullName).join('، ') : '-';
                      })()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h5 className="text-sm font-black text-stone-700">پروژه‌های مجاز ({selectedUser.projectIds?.length || 0})</h5>
                <div className="flex flex-wrap gap-2">
                  {selectedUser.projectIds?.map(id => (
                    <span key={id} className="text-[10px] font-bold bg-stone-50 text-stone-900 px-2 py-1 rounded-lg border border-blue-100">
                      {id}
                    </span>
                  ))}
                  {(!selectedUser.projectIds || selectedUser.projectIds.length === 0) && (
                    <span className="text-xs text-slate-400">ندارد</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-4xl p-8 shadow-2xl animate-scaleIn max-h-[90vh] overflow-y-auto flex flex-col gap-8">
            
            <div className="flex flex-col md:flex-row gap-8">
              {/* Left Column: Basic Info */}
              <div className="flex-1 space-y-4">
                  <h2 className="text-xl font-black text-stone-800 mb-6">ویرایش کاربر</h2>
                  <form id="userForm" onSubmit={handleSave} className="space-y-4">
                <div>
                    <label className="block text-sm font-bold text-stone-600 mb-2">نام کاربری</label>
                    <input required value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-amber-500 outline-none font-bold" />
                </div>
                <div>
                    <label className="block text-sm font-bold text-stone-600 mb-2">نام و نام خانوادگی</label>
                    <input required value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-amber-500 outline-none font-bold" />
                </div>
                <div>
                    <label className="block text-sm font-bold text-stone-600 mb-2">سمت</label>
                    <select 
                        value={formData.jobLevel || ''} 
                        onChange={e => {
                            const val = e.target.value;
                            const currentRole = formData.role || 'ORG_USER';
                            let calculatedRole = currentRole;
                            if (val === 'سرپرست کارگاه') {
                                calculatedRole = 'ORG_MANAGER';
                            } else if (val === 'مدیر پروژه') {
                                calculatedRole = 'ORG_ADMIN';
                            }
                            const stdPerms = SystemAdminService.getStandardPermissions(val, calculatedRole);
                            setFormData({
                                ...formData,
                                jobLevel: val,
                                role: calculatedRole as any,
                                permissions: stdPerms
                            });
                        }} 
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-amber-500 outline-none font-bold bg-white"
                    >
                        <option value="">انتخاب کنید...</option>
                        <option value="تکنسین">تکنسین</option>
                        <option value="کارشناس">کارشناس</option>
                        <option value="کارشناس ارشد">کارشناس ارشد</option>
                        <option value="سرپرست واحد">سرپرست واحد</option>
                        <option value="سرپرست کارگاه">سرپرست کارگاه</option>
                        <option value="مدیر پروژه">مدیر پروژه</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-bold text-stone-600 mb-2">عنوان شغلی</label>
                    <input value={formData.jobTitle || ''} onChange={e => setFormData({...formData, jobTitle: e.target.value})} placeholder="مثلاً: مهندس عمران" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-amber-500 outline-none font-bold" />
                </div>
                <div>
                    <label className="block text-sm font-bold text-stone-600 mb-2">نقش کاربری</label>
                    <select 
                        required 
                        value={formData.role} 
                        onChange={e => {
                            const val = e.target.value;
                            const currentJobLevel = formData.jobLevel || '';
                            const stdPerms = SystemAdminService.getStandardPermissions(currentJobLevel, val);
                            setFormData({
                                ...formData, 
                                role: val as any,
                                permissions: stdPerms
                            });
                        }} 
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-amber-500 outline-none font-bold bg-white"
                    >
                        <option value="ORG_USER">کارشناس / کاربر عادی</option>
                        <option value="ORG_MANAGER">مدیر پروژه</option>
                        <option value="ORG_ADMIN">مدیر سازمان</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-bold text-stone-600 mb-2">رمز عبور (در صورت تغییر وارد کنید)</label>
                    <input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-amber-500 outline-none font-bold" placeholder="******" />
                </div>
                <div>
                    <label className="block text-sm font-bold text-stone-600 mb-2">رمز دو مرحله‌ای (برای فراموشی رمز)</label>
                    <input value={formData.securityCode || ''} onChange={e => setFormData({...formData, securityCode: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-amber-500 outline-none font-bold text-center dir-ltr" placeholder="کد امنیتی یا عبارت بازیابی" />
                </div>
                
                <div className="border-t border-slate-100 pt-4 mt-4">
                    <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-bold text-stone-700">دسترسی به پروژه‌ها</label>
                        {allowedProjects.length > 0 && (
                            <div className="flex items-center gap-2 text-xs">
                                <button 
                                    type="button" 
                                    onClick={() => setFormData({ ...formData, projectIds: allowedProjects.map(p => String(p.id)) })}
                                    className="text-amber-600 hover:text-amber-700 font-bold"
                                >
                                    انتخاب همه
                                </button>
                                <span className="text-slate-300">|</span>
                                <button 
                                    type="button" 
                                    onClick={() => setFormData({ ...formData, projectIds: [] })}
                                    className="text-slate-500 hover:text-slate-700 font-bold"
                                >
                                    حذف همه
                                </button>
                            </div>
                        )}
                    </div>
                    {allowedProjects.length === 0 ? (
                        <div className="text-amber-800 text-xs font-bold bg-amber-50 p-3 rounded-xl border border-amber-200">
                            هیچ پروژه‌ای به سازمان این کاربر تخصیص داده نشده است.
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-48 overflow-y-auto p-2 border border-slate-200 rounded-xl bg-slate-50/50">
                            {allowedProjects.map(project => {
                                const isChecked = (formData.projectIds || []).map(String).includes(String(project.id));
                                return (
                                    <label 
                                        key={project.id} 
                                        htmlFor={`proj-${project.id}`} 
                                        className={`flex items-center justify-between p-2.5 rounded-lg border transition-all cursor-pointer select-none ${
                                            isChecked 
                                                ? 'bg-amber-50 border-amber-300 text-amber-950 font-bold shadow-xs' 
                                                : 'bg-white border-slate-200 text-stone-700 hover:bg-slate-50'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <input 
                                                type="checkbox" 
                                                id={`proj-${project.id}`}
                                                checked={isChecked}
                                                onChange={() => toggleProject(project.id)}
                                                className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer accent-amber-600"
                                            />
                                            <span className="text-sm">
                                                {project.name}
                                            </span>
                                        </div>
                                        {project.code && (
                                            <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-500">
                                                {project.code}
                                            </span>
                                        )}
                                    </label>
                                );
                            })}
                        </div>
                    )}
                    {(formData.projectIds || []).length === 0 && (
                        <p className="text-xs text-red-500 font-bold mt-1.5">
                            ⚠️ در صورت عدم انتخاب پروژه، کاربر به هیچ پروژه‌ای در برنامه دسترسی نخواهد داشت.
                        </p>
                    )}
                </div>

                <div className="flex items-center gap-2 mt-4">
                    <input type="checkbox" checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} className="w-5 h-5 rounded text-amber-600 focus:ring-amber-500" />
                    <label className="text-sm font-bold text-stone-600">کاربر فعال باشد</label>
                </div>
                </form>
            </div>

            {/* Right Column: Permissions */}
            <div className="flex-1 border-r border-slate-100 pr-8 space-y-4">
                <div className="flex items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-2">
                        <Shield className="text-amber-600" size={24} />
                        <h3 className="text-lg font-black text-stone-800">دسترسی‌های ماژولی</h3>
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            const val = formData.jobLevel || '';
                            const currentRole = formData.role || 'ORG_USER';
                            const stdPerms = SystemAdminService.getStandardPermissions(val, currentRole);
                            setFormData({
                                ...formData,
                                permissions: stdPerms
                            });
                        }}
                        className="text-xs bg-stone-50 text-amber-600 hover:bg-blue-100 px-3 py-1.5 rounded-lg font-bold transition-all"
                    >
                        اعمال دسترسی استاندارد سمت
                    </button>
                </div>
                <div className="bg-slate-50 rounded-2xl p-4 space-y-4 max-h-[600px] overflow-y-auto">
                    {APP_MODULES.filter(module => {
                        const moduleId = module.id;
                        if (moduleId !== ModuleId.DASHBOARD && moduleId !== ModuleId.PROJECT_DEFINITION) {
                            return true;
                        }
                        if (formData.role === 'SYSTEM_ADMIN') {
                            return true;
                        }
                        const orgId = formData.orgId;
                        if (orgId) {
                            const orgInfo = SystemAdminService.getOrganization(orgId);
                            if (orgInfo && orgInfo.type === OrganizationType.EMPLOYER) {
                                const jobLevel = formData.jobLevel || '';
                                const jobTitle = formData.jobTitle || '';
                                const role = formData.role || '';
                                const isPMOrSupervisor = 
                                    jobLevel === 'مدیر پروژه' || 
                                    jobLevel === 'سرپرست کارگاه' || 
                                    jobTitle === 'مدیر پروژه' || 
                                    jobTitle === 'سرپرست کارگاه' || 
                                    role === 'ORG_ADMIN' || 
                                    role === 'ORG_MANAGER';

                                if (isPMOrSupervisor) {
                                    return true;
                                }
                            }
                        }
                        return false;
                    }).map(module => {
                        const perm = getPermission(module.id);
                        return (
                            <div key={module.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="font-bold text-stone-700">{module.label}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            checked={!!perm.canView} 
                                            onChange={() => togglePermission(module.id, 'view')}
                                            className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                                        />
                                        <span className="text-xs font-bold text-stone-600">مشاهده</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            checked={!!perm.canCreate} 
                                            onChange={() => togglePermission(module.id, 'create')}
                                            className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                                        />
                                        <span className="text-xs font-bold text-stone-600">ایجاد</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            checked={!!perm.canEdit} 
                                            onChange={() => togglePermission(module.id, 'edit')}
                                            className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                                        />
                                        <span className="text-xs font-bold text-stone-600">ویرایش</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            checked={!!perm.canDelete} 
                                            onChange={() => togglePermission(module.id, 'delete')}
                                            className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                                        />
                                        <span className="text-xs font-bold text-stone-600">حذف</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            checked={!!perm.canSend} 
                                            onChange={() => togglePermission(module.id, 'send')}
                                            className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                                        />
                                        <span className="text-xs font-bold text-stone-600">ارسال</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            checked={!!perm.canApprove} 
                                            onChange={() => togglePermission(module.id, 'approve')}
                                            className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                                        />
                                        <span className="text-xs font-bold text-stone-600">تایید</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            checked={!!perm.canReject} 
                                            onChange={() => togglePermission(module.id, 'reject')}
                                            className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                                        />
                                        <span className="text-xs font-bold text-stone-600">رد / عودت</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            checked={!!perm.canFinalApprove} 
                                            onChange={() => togglePermission(module.id, 'finalApprove')}
                                            className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                                        />
                                        <span className="text-xs font-bold text-stone-600">تایید نهایی</span>
                                    </label>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
            
          </div>
          <div className="border-t border-slate-100 pt-6 flex gap-4 w-full">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 rounded-xl font-bold text-stone-500 hover:bg-slate-100 transition-colors">انصراف</button>
                <button type="submit" form="userForm" className="flex-1 py-3 rounded-xl font-bold bg-amber-600 text-white hover:bg-stone-900 transition-colors">ذخیره تغییرات</button>
            </div>
          </div>
        </div>
      )}

      <DeleteModal 
        isOpen={!!deleteId} 
        onClose={() => setDeleteId(null)} 
        onConfirm={confirmDelete} 
        title="حذف کاربر" 
        description="آیا از حذف این کاربر اطمینان دارید؟ این عملیات غیرقابل بازگشت است." 
      />

      {toggleActiveUser && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-md animate-fadeIn" dir="rtl">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm text-center">
            <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full mx-auto flex items-center justify-center mb-4">
              <AlertTriangle size={32}/>
            </div>
            <h3 className="text-lg font-black text-stone-800">
                {toggleActiveUser.isActive ? 'غیرفعال کردن کاربر' : 'فعال کردن کاربر'}
            </h3>
            <p className="text-sm text-stone-500 mt-2">
                آیا از {toggleActiveUser.isActive ? 'غیرفعال' : 'فعال'} کردن کاربر «{toggleActiveUser.fullName}» اطمینان دارید؟
            </p>
            <div className="flex gap-4 mt-6">
              <button onClick={() => setToggleActiveUser(null)} className="flex-1 py-3 rounded-xl bg-slate-100 text-stone-700 font-bold hover:bg-slate-200 transition-colors">انصراف</button>
              <button onClick={confirmToggleActive} className="flex-1 py-3 rounded-xl bg-amber-600 text-white font-bold hover:bg-stone-900 transition-colors">تایید</button>
            </div>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-md animate-fadeIn" dir="rtl">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm text-center">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full mx-auto flex items-center justify-center mb-4">
              <XCircle size={32}/>
            </div>
            <h3 className="text-lg font-black text-stone-800">خطا در عملیات</h3>
            <p className="text-sm text-stone-500 mt-2">{errorMsg}</p>
            <div className="mt-6">
              <button onClick={() => setErrorMsg(null)} className="w-full py-3 rounded-xl bg-slate-100 text-stone-700 font-bold hover:bg-slate-200 transition-colors">باشه</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
