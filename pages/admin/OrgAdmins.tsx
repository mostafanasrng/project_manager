
import React, { useState, useEffect } from 'react';
import { SystemAdminService } from '../../services/systemAdminService';
import { Organization, SystemUser } from '../../systemAdminTypes';
import { Plus, Edit2, Trash2, CheckCircle, XCircle, Lock, AlertTriangle, ShieldCheck, Building2 } from 'lucide-react';
import DeleteModal from '../../components/DeleteModal';

const OrgAdmins: React.FC = () => {
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [formData, setFormData] = useState<Partial<SystemUser>>({
    username: '',
    fullName: '',
    orgId: '',
    role: 'ORG_ADMIN',
    isActive: true,
    password: ''
  });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [resetPassId, setResetPassId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [toggleActiveUser, setToggleActiveUser] = useState<SystemUser | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const allUsers = SystemAdminService.getUsers();
    setUsers(allUsers.filter(u => u.role === 'ORG_ADMIN'));
    setOrgs(SystemAdminService.getOrganizations());
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.orgId) {
      alert('لطفاً سازمان را انتخاب کنید.');
      return;
    }

    const newUser: SystemUser = {
      id: editingUser ? editingUser.id : Math.random().toString(36).substr(2, 9),
      username: formData.username || '',
      fullName: formData.fullName || '',
      jobLevel: formData.jobLevel || '',
      jobTitle: formData.jobTitle || '',
      orgId: formData.orgId,
      role: 'ORG_ADMIN',
      isActive: formData.isActive || false,
      password: formData.password || (editingUser ? editingUser.password : '123456') // Default or keep existing
    };
    try {
      SystemAdminService.saveUser(newUser);
      setIsModalOpen(false);
      setEditingUser(null);
      setFormData({ username: '', fullName: '', orgId: '', role: 'ORG_ADMIN', isActive: true, password: '' });
      loadData();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleEdit = (user: SystemUser) => {
    setEditingUser(user);
    setFormData(user);
    setIsModalOpen(true);
  };
  
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
      } catch (e: any) {
        setErrorMsg(e.message);
      }
    }
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

  const handleResetPassword = () => {
      if (resetPassId && newPassword) {
          try {
              SystemAdminService.resetPassword(resetPassId, newPassword, 'SYSTEM_ADMIN');
              alert('رمز عبور با موفقیت تغییر کرد.');
              setResetPassId(null);
              setNewPassword('');
          } catch (e: any) {
              alert(e.message);
          }
      }
  };

  const getOrgName = (id: string) => orgs.find(o => o.id === id)?.name || id;

  return (
    <div className="space-y-6 animate-fadeIn" dir="rtl">
      {/* Header Description */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl">
            <ShieldCheck size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-stone-800 dark:text-slate-100">مدیریت ادمین‌های سازمانی</h1>
            <p className="text-xs font-semibold text-stone-500 dark:text-slate-400 mt-1">
              تعریف و تخصیص مدیران ارشد و ادمین‌های هر شرکت و سازمان
            </p>
          </div>
        </div>

        <button 
          onClick={() => { setEditingUser(null); setFormData({ username: '', fullName: '', orgId: '', role: 'ORG_ADMIN', isActive: true, password: '' }); setIsModalOpen(true); }}
          className="bg-amber-600 text-white px-5 py-2.5 rounded-2xl font-bold text-xs md:text-sm flex items-center gap-2 hover:bg-stone-900 shadow-lg shadow-amber-600/20 transition-all"
        >
          <Plus size={18} />
          افزودن ادمین جدید
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-800 overflow-hidden">
        <table className="w-full text-right">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="p-6 text-sm font-black text-stone-500">نام کاربری</th>
              <th className="p-6 text-sm font-black text-stone-500">نام و نام خانوادگی</th>
              <th className="p-6 text-sm font-black text-stone-500">سمت</th>
              <th className="p-6 text-sm font-black text-stone-500">عنوان شغلی</th>
              <th className="p-6 text-sm font-black text-stone-500">سازمان</th>
              <th className="p-6 text-sm font-black text-stone-500">وضعیت</th>
              <th className="p-6 text-sm font-black text-stone-500">عملیات</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                <td className="p-6 font-bold text-stone-700">{user.username}</td>
                <td className="p-6 font-bold text-stone-800">{user.fullName}</td>
                <td className="p-6 font-bold text-stone-600">{user.jobLevel || '-'}</td>
                <td className="p-6 font-bold text-stone-600">{user.jobTitle || '-'}</td>
                <td className="p-6 font-bold text-stone-600">{getOrgName(user.orgId)}</td>
                <td className="p-6">
                  {user.isActive ? 
                    <span className="flex items-center gap-1 text-emerald-600 font-bold text-xs"><CheckCircle size={14}/> فعال</span> : 
                    <span className="flex items-center gap-1 text-red-500 font-bold text-xs"><XCircle size={14}/> غیرفعال</span>
                  }
                </td>
                <td className="p-6 flex gap-2">
                  <button onClick={() => handleToggleActive(user)} className={`p-2 rounded-lg transition-colors ${user.isActive ? 'text-amber-500 hover:bg-amber-50' : 'text-emerald-500 hover:bg-emerald-50'}`} title={user.isActive ? "غیرفعال کردن" : "فعال کردن"}>
                    {user.isActive ? <XCircle size={18}/> : <CheckCircle size={18}/>}
                  </button>
                  <button onClick={() => handleEdit(user)} className="p-2 text-amber-600 hover:bg-stone-50 rounded-lg transition-colors"><Edit2 size={18}/></button>
                  <button onClick={() => setResetPassId(user.id)} className="p-2 text-amber-500 hover:bg-amber-50 rounded-lg transition-colors" title="تغییر رمز عبور"><Lock size={18}/></button>
                  <button onClick={() => setDeleteId(user.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={18}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg p-8 shadow-2xl animate-scaleIn">
            <h2 className="text-xl font-black text-stone-800 mb-6">{editingUser ? 'ویرایش ادمین سازمانی' : 'افزودن ادمین جدید'}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-stone-600 mb-2">سازمان مربوطه</label>
                <select required value={formData.orgId} onChange={e => setFormData({...formData, orgId: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-amber-500 outline-none font-bold bg-white">
                  <option value="">انتخاب کنید...</option>
                  {orgs.filter(o => o.isActive).map(org => {
                    const cleanName = (org.name || '').replace(/\s*\((کارفرما|مشاور|پیمانکار)\)\s*$/gi, '').trim();
                    return (
                      <option key={org.id} value={org.id}>{cleanName} ({org.code})</option>
                    );
                  })}
                </select>
              </div>
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
                <select value={formData.jobLevel || ''} onChange={e => setFormData({...formData, jobLevel: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-amber-500 outline-none font-bold bg-white">
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
                <input value={formData.jobTitle || ''} onChange={e => setFormData({...formData, jobTitle: e.target.value})} placeholder="مثلاً: ادمین سیستم" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-amber-500 outline-none font-bold" />
              </div>
              <div>
                <label className="block text-sm font-bold text-stone-600 mb-2">رمز عبور {editingUser && '(در صورت تغییر وارد کنید)'}</label>
                <input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-amber-500 outline-none font-bold" placeholder={editingUser ? '******' : ''} />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} className="w-5 h-5 rounded text-amber-600 focus:ring-amber-500" />
                <label className="text-sm font-bold text-stone-600">کاربر فعال باشد</label>
              </div>
              <div className="flex gap-4 mt-8">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 rounded-xl font-bold text-stone-500 hover:bg-slate-100 transition-colors">انصراف</button>
                <button type="submit" className="flex-1 py-3 rounded-xl font-bold bg-amber-600 text-white hover:bg-stone-900 transition-colors">ذخیره</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {resetPassId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-8 shadow-2xl animate-scaleIn">
            <h2 className="text-xl font-black text-stone-800 mb-6">تغییر رمز عبور</h2>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-bold text-stone-600 mb-2">رمز عبور جدید</label>
                    <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-amber-500 outline-none font-bold" />
                </div>
                <div className="flex gap-4 mt-8">
                    <button onClick={() => { setResetPassId(null); setNewPassword(''); }} className="flex-1 py-3 rounded-xl font-bold text-stone-500 hover:bg-slate-100 transition-colors">انصراف</button>
                    <button onClick={handleResetPassword} className="flex-1 py-3 rounded-xl font-bold bg-amber-500 text-white hover:bg-amber-600 transition-colors">تغییر رمز</button>
                </div>
            </div>
          </div>
        </div>
      )}

      <DeleteModal 
        isOpen={!!deleteId} 
        onClose={() => setDeleteId(null)} 
        onConfirm={confirmDelete} 
        title="حذف ادمین" 
        description="آیا از حذف این ادمین اطمینان دارید؟ این عملیات غیرقابل بازگشت است." 
      />

      {toggleActiveUser && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-md animate-fadeIn" dir="rtl">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm text-center">
            <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full mx-auto flex items-center justify-center mb-4">
              <AlertTriangle size={32}/>
            </div>
            <h3 className="text-lg font-black text-stone-800">
                {toggleActiveUser.isActive ? 'غیرفعال کردن ادمین' : 'فعال کردن ادمین'}
            </h3>
            <p className="text-sm text-stone-500 mt-2">
                آیا از {toggleActiveUser.isActive ? 'غیرفعال' : 'فعال'} کردن ادمین «{toggleActiveUser.fullName}» اطمینان دارید؟
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

export default OrgAdmins;
