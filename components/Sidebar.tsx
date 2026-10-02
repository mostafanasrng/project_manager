
import React, { useState, useEffect } from 'react';
import { NAV_ITEMS } from '../constants';
import { X, LogOut, ChevronDown, ChevronLeft, ShieldCheck, Building2, Link, Users, Lock, Activity } from 'lucide-react';
import { SystemAdminService } from '../services/systemAdminService';
import { NotificationService } from '../services/notificationService';
import { formatUserDisplayFormal } from '../src/utils/userFormatter';

interface SidebarProps {
  activeTab: string;
  onTabChange: (id: string) => void;
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  userRole?: string;
}

export default function Sidebar({ activeTab, onTabChange, isOpen, onClose, onLogout, userRole }: SidebarProps) {
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({ projects: false, hr: false, admin: false, 'org-admin': false, communications: false });
  const [userInfo, setUserInfo] = useState<{ name: string }>({ name: '' });
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  const currentUser = SystemAdminService.getCurrentUser();

  const refreshUnreadCounts = () => {
    if (currentUser) {
      const counts = NotificationService.getUnreadCountsPerModule(currentUser.id, currentUser.orgId, currentUser.role);
      setUnreadCounts(counts);
    }
  };

  useEffect(() => {
    refreshUnreadCounts();

    const handleSync = () => refreshUnreadCounts();
    window.addEventListener('notification-updated', handleSync);
    window.addEventListener('hamyar_notification_sync', handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      window.removeEventListener('notification-updated', handleSync);
      window.removeEventListener('hamyar_notification_sync', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [currentUser?.id, currentUser?.orgId]);

  const handleTabSelect = (tabId: string) => {
    refreshUnreadCounts();
    onTabChange(tabId);
  };

  useEffect(() => {
    if (activeTab === 'hr' || activeTab === 'hr-personnel' || activeTab === 'org-users' || activeTab === 'admin-orgs') {
      setExpandedItems(prev => prev.hr ? prev : { ...prev, hr: true });
    } else if (['projects', 'project-definition', 'technical-office', 'cbs-statements', 'execution', 'quality-control', 'planning', 'hse', 'dcc-archive'].includes(activeTab)) {
      setExpandedItems(prev => prev.projects ? prev : { ...prev, projects: true });
    } else if (['communications', 'communications-secretariat', 'communications-letters', 'communications-meetings', 'communications-chats'].includes(activeTab)) {
      setExpandedItems(prev => prev.communications ? prev : { ...prev, communications: true });
    }
  }, [activeTab]);

  useEffect(() => {
    const loadUserInfo = () => {
      if (userRole === 'SYSTEM_ADMIN') {
        setUserInfo({ name: 'مدیر کل سامانه (راهبر سیستم)' });
      } else {
        const username = localStorage.getItem('current_username');
        if (username) {
            const users = SystemAdminService.getUsers();
            const user = users.find(u => u.username === username);
            if (user) {
                const orgs = SystemAdminService.getOrganizations();
                const org = orgs.find(o => o.id === user.orgId);
                setUserInfo({
                    name: formatUserDisplayFormal(user, org),
                });
            }
        } else {
             setUserInfo({ name: 'کاربر مهمان' });
        }
      }
    };
    loadUserInfo();
  }, [userRole]);

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleChangePassword = () => {
      const username = localStorage.getItem('current_username');
      setPasswordError('');
      setPasswordSuccess('');

      if (!username) return;
      if (!passwordForm.oldPassword || !passwordForm.newPassword) {
          setPasswordError('تمام فیلدها الزامی است.');
          return;
      }
      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
          setPasswordError('تکرار رمز عبور مطابقت ندارد.');
          return;
      }

      try {
          SystemAdminService.changePassword(username, passwordForm.oldPassword, passwordForm.newPassword);
          setPasswordSuccess('رمز عبور تغییر کرد.');
          setTimeout(() => {
              setIsPasswordModalOpen(false);
              setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
              setPasswordSuccess('');
          }, 2000);
      } catch (e: any) {
          setPasswordError(e.message);
      }
  };

  let items = NAV_ITEMS.map(item => {
    if (item.children) {
      return {
        ...item,
        children: item.children.filter(child => child.id !== 'cbs-statements')
      };
    }
    return item;
  });

  if (userRole === 'SYSTEM_ADMIN') {
    items = [
      ...items,
      { id: 'system-audit', label: 'لاگ و رهگیری تغییرات', icon: <Activity size={20} /> }
    ];
  }

  if (userRole !== 'SYSTEM_ADMIN') {
      const username = localStorage.getItem('current_username');
      const users = SystemAdminService.getUsers();
      const user = (username ? users.find(u => u.username === username) : null) || SystemAdminService.getCurrentUser();
      const canAccessHR = SystemAdminService.canUserAccessHR(user);

      items = items.map(item => {
          if (item.children) {
              const filteredChildren = item.children.filter(child => {
                  if (child.id === 'hr' || child.id === 'hr-personnel' || child.id === 'org-users') {
                      return canAccessHR;
                  }
                  if (child.id === 'admin-orgs') {
                      return userRole === 'SYSTEM_ADMIN';
                  }
                  if (child.id === 'communications-secretariat') {
                      if (!user) return false;
                      if (userRole === 'SYSTEM_ADMIN' || user.role === 'ORG_ADMIN') return true;
                      const title = (user.jobTitle || '').trim();
                      const level = (user.jobLevel || '').trim();
                      const isAuth = title.includes('مدیر پروژه') || level.includes('مدیر پروژه') ||
                                     title.includes('سرپرست کارگاه') || level.includes('سرپرست کارگاه') ||
                                     user.username === 'c-pm' || user.username === 'cs-pm' || user.username === 'e-pm';
                      return isAuth && SystemAdminService.checkPermission(user.id, 'communications', 'view');
                  }
                  if (user) {
                      return SystemAdminService.checkPermission(user.id, child.id, 'view');
                  }
                  return true;
              });
              return { ...item, children: filteredChildren };
          }
          return item;
      }).filter(item => {
          if (item.id === 'dashboard' || item.id === 'communications') return true;
          if (item.id === 'hr' || item.id === 'hr-personnel' || item.id === 'org-users') {
              return canAccessHR;
          }
          if (item.children) {
              return item.children.length > 0;
          }
          if (user) {
              return SystemAdminService.checkPermission(user.id, item.id, 'view');
          }
          return true;
      });
  }

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-stone-950/70 z-40 lg:hidden backdrop-blur-md transition-opacity" onClick={onClose} />
      )}

      <aside className={`fixed inset-y-0 right-0 z-50 bg-white dark:bg-slate-900 border-stone-200/70 dark:border-slate-800 flex flex-col shadow-2xl lg:shadow-none transition-all duration-300 ease-in-out lg:static
        ${isOpen 
          ? 'w-80 translate-x-0 border-l lg:w-80 lg:opacity-100' 
          : 'w-80 translate-x-full lg:w-0 lg:opacity-0 lg:translate-x-0 lg:border-l-0 overflow-hidden'
        }
      `}>
        <div className="w-80 h-full flex flex-col shrink-0">
          <div className="p-6 md:p-7 flex items-center justify-between border-b border-stone-100 dark:border-slate-800/80">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 bg-gradient-to-br from-amber-400 to-amber-500 text-stone-950 rounded-2xl flex items-center justify-center font-black text-xl shadow-md shadow-amber-500/25 border border-amber-300/40">
                H
              </div>
              <div>
                <span className="text-xl font-black text-stone-900 dark:text-white tracking-tight block">همیار</span>
                <span className="text-[9px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest mt-0.5 block">مدیریت هوشمند پروژه</span>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-stone-400 hover:text-stone-700 dark:hover:text-slate-200 transition-colors bg-stone-100 dark:bg-slate-800 rounded-xl flex" title="بستن منو"><X size={18} /></button>
          </div>
        
        <nav className="flex-1 p-4 md:p-5 space-y-1.5 overflow-y-auto no-scrollbar">
          {items.map((item) => {
            const hasChildren = item.children && item.children.length > 0;
            const isExpanded = expandedItems[item.id];
            const isActive = activeTab === item.id || (item.children?.some(child => child.id === activeTab));
            const itemUnread = (unreadCounts[item.id] || 0) + (item.children?.reduce((sum, c) => sum + (unreadCounts[c.id] || 0), 0) || 0);

            return (
              <div key={item.id} className="space-y-1">
                <button
                  onClick={() => {
                    if (hasChildren) {
                      toggleExpand(item.id);
                    } else {
                      handleTabSelect(item.id);
                    }
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all duration-200 group ${
                    !hasChildren && activeTab === item.id
                      ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-stone-950 font-black shadow-md shadow-amber-500/20 scale-[1.01]'
                      : isActive 
                        ? 'bg-amber-500/10 dark:bg-amber-400/10 text-amber-600 dark:text-amber-400 font-black border border-amber-500/20 dark:border-amber-400/20' 
                        : 'text-stone-600 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800/80 hover:text-stone-900 dark:hover:text-white font-bold'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <span className={!hasChildren && activeTab === item.id ? 'text-stone-950' : isActive ? 'text-amber-600 dark:text-amber-400' : 'text-stone-400 dark:text-slate-500 group-hover:text-amber-500 transition-colors'}>{item.icon}</span>
                    <span className="text-xs md:text-sm">{item.label}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {hasChildren && (
                      <span className="text-stone-400 dark:text-slate-500">
                        {isExpanded ? <ChevronDown size={15} /> : <ChevronLeft size={15} />}
                      </span>
                    )}
                  </div>
                </button>

                {hasChildren && isExpanded && (
                  <div className="mr-5 pr-4 border-r-2 border-stone-200/70 dark:border-slate-800 space-y-1 py-1.5 animate-fadeIn">
                    {item.children?.map(child => {
                      return (
                        <button
                          key={child.id}
                          onClick={() => handleTabSelect(child.id)}
                          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition-all duration-200 ${
                            activeTab === child.id
                              ? 'bg-amber-500 text-stone-950 font-black shadow-sm shadow-amber-500/20'
                              : 'text-stone-500 dark:text-slate-400 hover:bg-stone-100 dark:hover:bg-slate-800 hover:text-stone-900 dark:hover:text-slate-200 font-bold'
                          }`}
                        >
                          <div className="flex items-center gap-3.5">
                            <span className={activeTab === child.id ? 'text-stone-950' : 'text-stone-400 dark:text-slate-500'}>{child.icon}</span>
                            <span>{child.label}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="p-5 border-t border-stone-100 dark:border-slate-800 space-y-3">
          <div className="flex items-center gap-3.5 bg-stone-50 dark:bg-slate-800/70 p-3.5 rounded-2xl border border-stone-200/60 dark:border-slate-700/60 group hover:border-amber-400/40 transition-all">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 text-stone-950 flex items-center justify-center font-black text-base shadow-xs shrink-0">
              {userInfo.name?.charAt(0) || 'ک'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black text-stone-900 dark:text-white truncate">{userInfo.name || 'کاربر مهمان'}</p>
              <button onClick={() => setIsPasswordModalOpen(true)} className="text-[10px] font-extrabold text-stone-400 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 mt-1 flex items-center gap-1 transition-colors">
                <Lock size={10} /> تغییر رمز عبور
              </button>
            </div>
          </div>
          <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all text-xs md:text-sm font-black active:scale-95">
            <LogOut size={18} />
            <span>خروج از حساب</span>
          </button>
        </div>
        </div>
      </aside>

      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fadeIn">
          <div className="absolute inset-0 bg-stone-950/60 backdrop-blur-md" onClick={() => setIsPasswordModalOpen(false)}></div>
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-6 md:p-8 border border-stone-200/70 dark:border-slate-800 animate-scaleIn">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-stone-900 dark:text-white">تغییر رمز عبور</h3>
              <button onClick={() => setIsPasswordModalOpen(false)} className="p-2 hover:bg-stone-100 dark:hover:bg-slate-800 rounded-xl transition-colors"><X size={20} className="text-stone-400 dark:text-slate-400" /></button>
            </div>
            <div className="space-y-4">
              {passwordError && <div className="bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 p-3.5 rounded-2xl text-xs font-black border border-rose-200 dark:border-rose-900">{passwordError}</div>}
              {passwordSuccess && <div className="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 p-3.5 rounded-2xl text-xs font-black border border-emerald-200 dark:border-emerald-900">{passwordSuccess}</div>}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-stone-500 dark:text-slate-400 pr-1">رمز عبور فعلی</label>
                <input type="password" value={passwordForm.oldPassword} onChange={(e) => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })} className="w-full px-4 py-3 bg-stone-50 dark:bg-slate-800 border border-stone-200/80 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-amber-500/30 focus:bg-white dark:focus:bg-slate-900 transition-all text-xs font-bold outline-none text-stone-900 dark:text-white" placeholder="••••••••" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-black text-stone-500 dark:text-slate-400 pr-1">رمز عبور جدید</label>
                <input type="password" value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} className="w-full px-4 py-3 bg-stone-50 dark:bg-slate-800 border border-stone-200/80 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-amber-500/30 focus:bg-white dark:focus:bg-slate-900 transition-all text-xs font-bold outline-none text-stone-900 dark:text-white" placeholder="••••••••" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-black text-stone-500 dark:text-slate-400 pr-1">تکرار رمز جدید</label>
                <input type="password" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} className="w-full px-4 py-3 bg-stone-50 dark:bg-slate-800 border border-stone-200/80 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-amber-500/30 focus:bg-white dark:focus:bg-slate-900 transition-all text-xs font-bold outline-none text-stone-900 dark:text-white" placeholder="••••••••" />
              </div>
              <button onClick={handleChangePassword} className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-stone-950 rounded-2xl font-black shadow-md shadow-amber-500/20 transition-all active:scale-95 mt-2 text-xs">بروزرسانی رمز عبور</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
