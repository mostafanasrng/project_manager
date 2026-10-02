import React, { useState, useMemo, useEffect } from 'react';
import {
  Bell,
  X,
  CheckCheck,
  Trash2,
  ArrowLeft,
  Search,
  Volume2,
  VolumeX,
  FileText,
  ClipboardList,
  FileSpreadsheet,
  ShieldAlert,
  Shield,
  HardHat,
  Package,
  Layers,
  Clock,
  Sparkles,
  Building
} from 'lucide-react';
import { Notification } from '../types';
import { NotificationService } from '../services/notificationService';
import { SystemUser } from '../systemAdminTypes';
import { SystemAdminService } from '../services/systemAdminService';

interface CentralNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToDocument: (notification: Notification) => void;
  currentUser: SystemUser | null;
}

export default function CentralNotificationModal({
  isOpen,
  onClose,
  onNavigateToDocument,
  currentUser
}: CentralNotificationModalProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'UNREAD' | 'LETTERS' | 'MINUTES' | 'STATEMENTS' | 'QC_EXEC' | 'HSE'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSoundOn, setIsSoundOn] = useState(() => NotificationService.isSoundEnabled());

  // Load notifications for current user
  const reloadNotifications = () => {
    if (currentUser) {
      const userNotifs = NotificationService.getUserNotifications(currentUser.id);
      setNotifications(userNotifs);
    }
  };

  useEffect(() => {
    if (isOpen && currentUser) {
      reloadNotifications();
    }
  }, [isOpen, currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    const unsubscribe = NotificationService.subscribeToOnlineNotifications(
      currentUser.id,
      () => {
        reloadNotifications();
      },
      () => {
        reloadNotifications();
      }
    );
    return () => unsubscribe();
  }, [currentUser]);

  const handleToggleSound = () => {
    const nextState = !isSoundOn;
    setIsSoundOn(nextState);
    NotificationService.setSoundEnabled(nextState);
    if (nextState) {
      NotificationService.playChimeSound();
    }
  };

  const handleMarkAllAsRead = () => {
    if (currentUser) {
      NotificationService.markAllAsRead(currentUser.id);
      reloadNotifications();
    }
  };

  const handleClearAll = () => {
    if (currentUser && confirm('آیا از پاک‌سازی تمام تاریخچه اعلان‌های خود اطمینان دارید؟')) {
      NotificationService.clearAll(currentUser.id);
      reloadNotifications();
    }
  };

  const handleToggleRead = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    NotificationService.toggleReadStatus(id);
    reloadNotifications();
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    NotificationService.deleteNotification(id);
    reloadNotifications();
  };

  const handleDocumentClick = (notification: Notification) => {
    NotificationService.markAsRead(notification.id);
    reloadNotifications();
    onClose();
    onNavigateToDocument(notification);
  };

  // Filter and Search logic
  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      // Tab filter
      if (activeFilter === 'UNREAD' && n.status !== 'UNREAD') return false;
      if (activeFilter === 'LETTERS' && n.module !== 'COMMUNICATIONS') return false;
      if (activeFilter === 'MINUTES' && n.module !== 'MINUTES') return false;
      if (activeFilter === 'STATEMENTS' && n.module !== 'STATEMENTS') return false;
      if (activeFilter === 'QC_EXEC' && n.module !== 'QC' && n.module !== 'EXECUTION') return false;
      if (activeFilter === 'HSE' && n.module !== 'HSE') return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const msg = (n.message || '').toLowerCase();
        const title = (n.documentTitle || '').toLowerCase();
        const code = (n.documentCode || '').toLowerCase();
        const sender = (n.fromUserName || '').toLowerCase();
        return (
          msg.includes(query) ||
          title.includes(query) ||
          code.includes(query) ||
          sender.includes(query)
        );
      }
      return true;
    });
  }, [notifications, activeFilter, searchQuery]);

  const unreadTotal = useMemo(() => {
    return notifications.filter((n) => n.status === 'UNREAD').length;
  }, [notifications]);

  const getModuleMeta = (module: string, notif?: Notification) => {
    if (!notif) {
      return {
        label: 'سند فنی و اجرایی',
        icon: <Sparkles size={16} className="text-amber-500" />,
        color: 'bg-stone-100 dark:bg-slate-800 text-stone-700 dark:text-slate-300 border-stone-200 dark:border-slate-700',
        badgeText: 'سند اداری'
      };
    }

    const docInfo = NotificationService.resolveDocumentInfo(notif.recordId, notif.module, undefined, notif);
    const tab = docInfo.tab;
    const badgeText = docInfo.label;

    let label = 'سند فنی و اجرایی';
    let icon = <Sparkles size={16} className="text-amber-500" />;
    let color = 'bg-stone-100 dark:bg-slate-800 text-stone-700 dark:text-slate-300 border-stone-200 dark:border-slate-700';

    if (tab === 'hse') {
      label = 'ایمنی و بهداشت (HSE)';
      color = 'bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400 border-green-200/60 dark:border-green-900/60';
      icon = <Shield size={16} className="text-green-500" />;
      if (badgeText.includes('حادثه')) {
        color = 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border-red-200/60 dark:border-red-900/60';
        icon = <ShieldAlert size={16} className="text-red-500" />;
      }
    } else if (tab === 'quality-control') {
      label = 'کنترل کیفیت (QC)';
      color = 'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 border-orange-200/60 dark:border-orange-900/60';
      if (badgeText.includes('NCR')) {
        icon = <ShieldAlert size={16} className="text-rose-500" />;
        color = 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200/60 dark:border-rose-900/60';
      } else {
        icon = <ClipboardList size={16} className="text-amber-500" />;
      }
    } else if (tab === 'execution') {
      label = 'اجرای کارگاه';
      color = 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-400 border-cyan-200/60 dark:border-cyan-900/60';
      icon = <HardHat size={16} className="text-cyan-500" />;
    } else if (tab === 'cbs-statements') {
      label = 'مدیریت مالی و CBS';
      color = 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-900/60';
      icon = <FileSpreadsheet size={16} className="text-emerald-500" />;
    } else if (tab === 'communications-letters') {
      label = 'نامه رسمی و مکاتبات';
      color = 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200/60 dark:border-blue-900/60';
      icon = <FileText size={16} className="text-blue-500" />;
    } else if (tab === 'communications-meetings') {
      label = 'جلسات و صورت‌جلسات';
      color = 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200/60 dark:border-amber-900/60';
      icon = <ClipboardList size={16} className="text-amber-500" />;
    } else if (tab === 'dcc-archive') {
      label = 'بایگانی اسناد DCC';
      color = 'bg-stone-50 dark:bg-stone-950/40 text-stone-700 dark:text-stone-300 border-stone-200/60 dark:border-stone-900/60';
      icon = <Building size={16} className="text-stone-500" />;
    } else if (tab === 'planning') {
      label = 'برنامه‌ریزی و کنترل پروژه';
      color = 'bg-fuchsia-50 dark:bg-fuchsia-950/40 text-fuchsia-700 dark:text-fuchsia-400 border-fuchsia-200/60 dark:border-fuchsia-900/60';
      icon = <Sparkles size={16} className="text-fuchsia-500" />;
    } else if (tab === 'technical-office') {
      label = 'دفتر فنی و مهندسی';
      if (badgeText.includes('مصالح') || badgeText.includes('MIV') || badgeText.includes('MRS')) {
        color = 'bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-400 border-violet-200/60 dark:border-violet-900/60';
        icon = <Package size={16} className="text-violet-500" />;
      } else if (badgeText.includes('تغییر') || badgeText.includes('Variation')) {
        color = 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 border-purple-200/60 dark:border-purple-900/60';
        icon = <Layers size={16} className="text-purple-500" />;
      } else if (badgeText.includes('مجوز') || badgeText.includes('عملیات')) {
        color = 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-400 border-cyan-200/60 dark:border-cyan-900/60';
        icon = <Shield size={16} className="text-cyan-500" />;
      } else {
        color = 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200/60 dark:border-amber-900/60';
        icon = <Layers size={16} className="text-orange-500" />;
      }
    }

    return { label, icon, color, badgeText };
  };

  const formatRelativeTime = (timestamp: number) => {
    const diffSeconds = Math.floor((Date.now() - timestamp) / 1000);
    if (diffSeconds < 60) return 'هم‌اکنون';
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes} دقیقه پیش`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} ساعت پیش`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} روز پیش`;
    return new Date(timestamp).toLocaleDateString('fa-IR');
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-stone-950/60 dark:bg-black/75 backdrop-blur-sm overflow-hidden animate-fadeIn"
      dir="rtl"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-[540px] bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-stone-200/80 dark:border-slate-800 flex flex-col max-h-[85vh] sm:max-h-[600px] overflow-hidden">
        {/* Compact Header */}
        <div className="p-3 sm:p-4 border-b border-stone-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-stone-50/80 dark:bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 dark:from-amber-500 dark:to-amber-600 flex items-center justify-center text-stone-950 shadow-md shadow-amber-500/20 border border-amber-300/40 shrink-0">
              <Bell size={18} />
              {unreadTotal > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center shadow-xs animate-pulse">
                  {unreadTotal}
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-stone-900 dark:text-white tracking-tight">
                  مرکز اعلان‌ها
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  برخط
                </span>
              </div>
              <p className="text-[10px] font-bold text-stone-500 dark:text-slate-400 mt-0.5">
                اسناد ارجاعی و تغییر وضعیت‌ها
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Sound Toggle */}
            <button
              onClick={handleToggleSound}
              className={`p-1.5 sm:p-2 rounded-xl border transition-all cursor-pointer ${
                isSoundOn
                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200/60'
                  : 'bg-stone-100 dark:bg-slate-800 text-stone-400 dark:text-slate-500 border-stone-200 dark:border-slate-700'
              }`}
              title={isSoundOn ? 'اعلان صوتی فعال است' : 'اعلان صوتی بی‌صدا است'}
            >
              {isSoundOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 text-stone-400 hover:text-stone-700 dark:text-slate-400 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
              aria-label="بستن پنجره اعلان‌ها"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Compact Search & Quick Bulk Actions */}
        <div className="p-2.5 sm:p-3 border-b border-stone-100 dark:border-slate-800 bg-white dark:bg-slate-900/50 flex items-center gap-2">
          {/* Search */}
          <div className="relative flex-1">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو در اعلان‌ها..."
              className="w-full pr-8 pl-6 py-1.5 bg-stone-100 dark:bg-slate-800/80 text-stone-800 dark:text-slate-100 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/40 transition-all border border-stone-200/50 dark:border-slate-700/60"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-1 shrink-0">
            {unreadTotal > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 rounded-xl text-[11px] font-black transition-all border border-emerald-200/60 cursor-pointer"
                title="خواندن همه اعلان‌ها"
              >
                <CheckCheck size={13} />
                <span>خواندن همه</span>
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={handleClearAll}
                className="p-1.5 text-stone-400 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-all cursor-pointer"
                title="پاکسازی تاریخچه"
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
        </div>

        {/* Filter Categories Chips (Scrollable row) */}
        <div className="px-3 py-2 bg-stone-50/60 dark:bg-slate-900/30 border-b border-stone-100 dark:border-slate-800/80 flex items-center gap-1.5 overflow-x-auto scrollbar-none text-[11px]">
          <button
            onClick={() => setActiveFilter('ALL')}
            className={`px-2.5 py-1 rounded-lg font-black transition-all cursor-pointer shrink-0 ${
              activeFilter === 'ALL'
                ? 'bg-amber-500 text-stone-950 shadow-xs'
                : 'bg-white dark:bg-slate-800 text-stone-600 dark:text-slate-300 hover:bg-stone-100 border border-stone-200/60 dark:border-slate-700'
            }`}
          >
            همه ({notifications.length})
          </button>
          <button
            onClick={() => setActiveFilter('UNREAD')}
            className={`px-2.5 py-1 rounded-lg font-black transition-all cursor-pointer shrink-0 ${
              activeFilter === 'UNREAD'
                ? 'bg-amber-500 text-stone-950 shadow-xs'
                : 'bg-white dark:bg-slate-800 text-stone-600 dark:text-slate-300 hover:bg-stone-100 border border-stone-200/60 dark:border-slate-700'
            }`}
          >
            دیده‌نشده ({unreadTotal})
          </button>
          <button
            onClick={() => setActiveFilter('LETTERS')}
            className={`px-2.5 py-1 rounded-lg font-black transition-all cursor-pointer shrink-0 ${
              activeFilter === 'LETTERS'
                ? 'bg-amber-500 text-stone-950 shadow-xs'
                : 'bg-white dark:bg-slate-800 text-stone-600 dark:text-slate-300 hover:bg-stone-100 border border-stone-200/60 dark:border-slate-700'
            }`}
          >
            مکاتبات
          </button>
          <button
            onClick={() => setActiveFilter('MINUTES')}
            className={`px-2.5 py-1 rounded-lg font-black transition-all cursor-pointer shrink-0 ${
              activeFilter === 'MINUTES'
                ? 'bg-amber-500 text-stone-950 shadow-xs'
                : 'bg-white dark:bg-slate-800 text-stone-600 dark:text-slate-300 hover:bg-stone-100 border border-stone-200/60 dark:border-slate-700'
            }`}
          >
            صورت‌جلسات
          </button>
          <button
            onClick={() => setActiveFilter('STATEMENTS')}
            className={`px-2.5 py-1 rounded-lg font-black transition-all cursor-pointer shrink-0 ${
              activeFilter === 'STATEMENTS'
                ? 'bg-amber-500 text-stone-950 shadow-xs'
                : 'bg-white dark:bg-slate-800 text-stone-600 dark:text-slate-300 hover:bg-stone-100 border border-stone-200/60 dark:border-slate-700'
            }`}
          >
            صورت‌وضعیت
          </button>
          <button
            onClick={() => setActiveFilter('QC_EXEC')}
            className={`px-2.5 py-1 rounded-lg font-black transition-all cursor-pointer shrink-0 ${
              activeFilter === 'QC_EXEC'
                ? 'bg-amber-500 text-stone-950 shadow-xs'
                : 'bg-white dark:bg-slate-800 text-stone-600 dark:text-slate-300 hover:bg-stone-100 border border-stone-200/60 dark:border-slate-700'
            }`}
          >
            کیفیت و اجرا
          </button>
          <button
            onClick={() => setActiveFilter('HSE')}
            className={`px-2.5 py-1 rounded-lg font-black transition-all cursor-pointer shrink-0 ${
              activeFilter === 'HSE'
                ? 'bg-amber-500 text-stone-950 shadow-xs'
                : 'bg-white dark:bg-slate-800 text-stone-600 dark:text-slate-300 hover:bg-stone-100 border border-stone-200/60 dark:border-slate-700'
            }`}
          >
            ایمنی (HSE)
          </button>
        </div>

        {/* Scrollable Notifications List */}
        <div className="flex-1 overflow-y-auto max-h-[380px] p-3 sm:p-3.5 space-y-2.5 custom-scrollbar bg-stone-50/40 dark:bg-slate-950/40">
          {filteredNotifications.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-2xl bg-stone-100 dark:bg-slate-800 flex items-center justify-center text-stone-400 dark:text-slate-500 mb-2 border border-stone-200/60 dark:border-slate-700">
                <Bell size={22} />
              </div>
              <h4 className="text-xs sm:text-sm font-black text-stone-700 dark:text-slate-300">
                هیچ اعلانی در این بخش وجود ندارد
              </h4>
              <p className="text-[11px] font-bold text-stone-400 dark:text-slate-500 mt-0.5 max-w-xs">
                ارجاعات و تغییرات کارتابل در این بخش نمایش داده می‌شوند.
              </p>
            </div>
          ) : (
            filteredNotifications.map((notif) => {
              const meta = getModuleMeta(notif.module, notif);
              const isUnread = notif.status === 'UNREAD';

              return (
                <div
                  key={notif.id}
                  onClick={() => handleDocumentClick(notif)}
                  className={`group relative p-3 rounded-xl border transition-all duration-200 cursor-pointer ${
                    isUnread
                      ? 'bg-amber-50/70 dark:bg-amber-950/25 border-amber-300/80 dark:border-amber-900/50 shadow-xs hover:border-amber-400 dark:hover:border-amber-600'
                      : 'bg-white dark:bg-slate-900 border-stone-200/70 dark:border-slate-800 hover:border-stone-300 dark:hover:border-slate-700 shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2.5">
                    {/* Icon & Details */}
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <div className="p-2 rounded-lg bg-stone-50 dark:bg-slate-800 shadow-xs border border-stone-200/60 dark:border-slate-700 shrink-0 mt-0.5">
                        {meta.icon}
                      </div>

                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`text-[9px] font-black px-2 py-0.5 rounded-md border ${meta.color}`}
                          >
                            {meta.badgeText}
                          </span>

                          {notif.documentCode && (
                            <span className="text-[9px] font-mono font-black text-stone-500 dark:text-slate-400 bg-stone-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                              #{notif.documentCode}
                            </span>
                          )}

                          {isUnread && (
                            <span className="flex items-center gap-1 text-[9px] font-black text-amber-700 dark:text-amber-400 bg-amber-100/70 dark:bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-300/40">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                              دیده نشده
                            </span>
                          )}

                          <span className="flex items-center gap-1 text-[9px] font-bold text-stone-400 dark:text-slate-500 mr-auto">
                            <Clock size={10} />
                            {formatRelativeTime(notif.createdAt)}
                          </span>
                        </div>

                        {/* Title and Message */}
                        <h4
                          className={`text-xs ${
                            isUnread
                              ? 'font-black text-stone-900 dark:text-white'
                              : 'font-extrabold text-stone-800 dark:text-slate-200'
                          } truncate`}
                          title={notif.documentTitle || notif.message}
                        >
                          {notif.documentTitle || notif.message}
                        </h4>

                        {notif.documentTitle && (
                          <p className="text-[11px] font-bold text-stone-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                            {notif.message}
                          </p>
                        )}

                        {/* Sender info */}
                        <div className="flex items-center gap-2 pt-0.5 text-[10px] font-bold text-stone-500 dark:text-slate-400">
                          <div className="flex items-center gap-1">
                            <div className="w-4 h-4 rounded-full bg-stone-200 dark:bg-slate-700 flex items-center justify-center text-[9px] text-stone-700 dark:text-slate-300 font-black">
                              {(notif.fromUserName || 'ک')[0]}
                            </div>
                            <span className="truncate max-w-[120px]">فرستنده: <strong className="text-stone-800 dark:text-slate-200">{notif.fromUserName}</strong></span>
                          </div>

                          {notif.projectId && (() => {
                            const proj = SystemAdminService.getProjects().find(p => p.id === notif.projectId);
                            const pName = proj ? proj.name : `پروژه ${notif.projectId}`;
                            return (
                              <div className="flex items-center gap-1 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded mr-auto shrink-0 border border-amber-200/50" title={pName}>
                                <Building size={11} />
                                <span className="truncate max-w-[120px] font-black">{pName}</span>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>

                    {/* Actions Column */}
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => handleToggleRead(notif.id, e)}
                          className="p-1 text-stone-400 hover:text-stone-700 dark:text-slate-400 dark:hover:text-white rounded-md hover:bg-stone-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                          title={isUnread ? 'علامت‌گذاری به عنوان خوانده شده' : 'علامت‌گذاری به عنوان خوانده‌نشده'}
                        >
                          <CheckCheck size={14} />
                        </button>

                        <button
                          onClick={(e) => handleDelete(notif.id, e)}
                          className="p-1 text-stone-400 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 rounded-md hover:bg-stone-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                          title="حذف اعلان"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDocumentClick(notif);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black rounded-lg text-[11px] transition-all shadow-xs active:scale-95 cursor-pointer group-hover:ring-1 ring-amber-400/40"
                      >
                        <span>هدایت به سند</span>
                        <ArrowLeft size={12} className="transition-transform group-hover:-translate-x-0.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Compact Footer */}
        <div className="p-2.5 px-4 bg-stone-50 dark:bg-slate-900 border-t border-stone-100 dark:border-slate-800 flex items-center justify-between text-[11px] font-bold text-stone-400 dark:text-slate-500">
          <div className="flex items-center gap-1.5">
            <span>کل: {notifications.length}</span>
            <span>•</span>
            <span className="text-amber-600 dark:text-amber-400 font-black">
              دیده نشده: {unreadTotal}
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-3 py-1 bg-stone-200 dark:bg-slate-800 text-stone-800 dark:text-slate-200 rounded-lg hover:bg-stone-300 dark:hover:bg-slate-700 transition-all font-black text-xs cursor-pointer"
          >
            بستن
          </button>
        </div>
      </div>
    </div>
  );
}
