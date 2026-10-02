import React, { useState, useEffect } from 'react';
import {
  Bell,
  X,
  FileText,
  Send,
  CheckCircle,
  ArrowRight,
  ExternalLink,
  Sparkles,
  AlertCircle,
  Building2,
  User,
  Shield,
  Layers,
  FileCheck,
  FolderKanban,
  ChevronDown,
  ChevronUp,
  Inbox,
  Clock
} from 'lucide-react';
import { NotificationService, ExtendedNotification } from '../services/notificationService';
import { SystemAdminService } from '../services/systemAdminService';

interface CentralNotificationPopupProps {
  onNavigateToTab?: (tab: string, recordId?: string) => void;
}

export const CentralNotificationPopup: React.FC<CentralNotificationPopupProps> = ({
  onNavigateToTab
}) => {
  const [activePopups, setActivePopups] = useState<ExtendedNotification[]>([]);
  const [dismissedNotificationIds, setDismissedNotificationIds] = useState<Set<string>>(() => new Set());
  const [isCollapsed, setIsCollapsed] = useState(false);
  const currentUser = SystemAdminService.getCurrentUser();
  const allProjects = SystemAdminService.getProjects();

  useEffect(() => {
    if (!currentUser) return;

    // Check for offline/unseen notifications upon login / mount / user switch
    const checkOfflineNotifications = () => {
      const userNotifs = NotificationService.getUserNotifications(currentUser.id, currentUser.orgId);
      // Strictly only notifications where currentUser is the RECIPIENT and NOT the sender
      const unreadReceived = userNotifs.filter(
        (n) => n.status === 'UNREAD' && n.fromUserId !== currentUser.id && !NotificationService.isDocumentRead(n.recordId || n.id, currentUser.id)
      );

      if (unreadReceived.length > 0) {
        setActivePopups((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const newPopups = unreadReceived.filter((n) => !existingIds.has(n.id) && !dismissedNotificationIds.has(n.id));
          if (newPopups.length === 0) return prev;
          // Play chime sound when new offline unread popups are displayed
          NotificationService.playNotificationSound();
          return [...newPopups, ...prev].slice(0, 8);
        });
      } else {
        setActivePopups([]);
      }
    };

    checkOfflineNotifications();

    const handleNewNotification = (event: any) => {
      const notif: ExtendedNotification = event.detail;
      if (!notif) return;

      const myUserId = currentUser.id;
      const myOrgId = currentUser.orgId;

      // RULE: SENDER NEVER RECEIVES THE POPUP (User request: "برای فرستنده نیاز نیست نوتیف پاپ اپ ظاهر بشه")
      if (notif.fromUserId === myUserId) {
        return;
      }

      // Check if current user is the intended recipient ONLY
      const isRecipient =
        notif.toUserId === myUserId ||
        (notif.toUserId === 'ALL' && (!notif.orgId || notif.orgId === myOrgId || currentUser.role === 'SYSTEM_ADMIN'));

      if (isRecipient && notif.fromUserId !== myUserId) {
        // Play soft synthesized chime audio
        NotificationService.playNotificationSound();

        // Add to active popups
        setActivePopups((prev) => {
          if (prev.some((p) => p.id === notif.id) || dismissedNotificationIds.has(notif.id)) return prev;
          return [notif, ...prev].slice(0, 8);
        });
      }
    };

    const handleBroadcastMessage = (e: MessageEvent) => {
      if (e.data && e.data.type === 'NEW_NOTIFICATION' && e.data.notification) {
        handleNewNotification({ detail: e.data.notification });
      } else if (e.data && e.data.type === 'DOC_MARKED_READ' && e.data.docId) {
        setActivePopups((prev) => prev.filter((p) => p.recordId !== e.data.docId && p.id !== e.data.docId));
      }
    };

    // Listen for custom local events and storage sync
    window.addEventListener('hamyar_realtime_notification', handleNewNotification);
    window.addEventListener('notification-updated', checkOfflineNotifications);
    window.addEventListener('hamyar_notification_sync', checkOfflineNotifications);
    window.addEventListener('storage', checkOfflineNotifications);

    // Listen for BroadcastChannel multi-tab event
    let channel: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        channel = new BroadcastChannel('hamyar_notifications_channel');
        channel.onmessage = handleBroadcastMessage;
      } catch (err) {
        console.warn('BroadcastChannel listener error:', err);
      }
    }

    return () => {
      window.removeEventListener('hamyar_realtime_notification', handleNewNotification);
      window.removeEventListener('notification-updated', checkOfflineNotifications);
      window.removeEventListener('hamyar_notification_sync', checkOfflineNotifications);
      window.removeEventListener('storage', checkOfflineNotifications);
      if (channel) channel.close();
    };
  }, [currentUser?.id, currentUser?.orgId, dismissedNotificationIds]);

  const dismissPopup = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDismissedNotificationIds((prev) => new Set([...prev, id]));
    setActivePopups((prev) => prev.filter((p) => p.id !== id));
  };

  const dismissAll = () => {
    setActivePopups((prev) => {
      prev.forEach((p) => setDismissedNotificationIds((s) => new Set([...s, p.id])));
      return [];
    });
  };

  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  const handleOpenDocument = (popup: ExtendedNotification) => {
    // 1. Mark as read immediately in storage
    NotificationService.markAsRead(popup.id);
    if (popup.recordId) {
      NotificationService.markDocumentAsRead(popup.recordId, currentUser?.id || 'guest');
    }
    dismissPopup(popup.id);

    // 2. Select corresponding project
    if (popup.projectId) {
      localStorage.setItem('hamyar_selected_project_id', popup.projectId);
      window.dispatchEvent(new Event('project-changed'));
      window.dispatchEvent(new Event('storage'));
    }

    // 3. Resolve authoritative destination tab (guaranteed to be correct section)
    const docInfo = NotificationService.resolveDocumentInfo(popup.recordId, popup.module, popup.targetModuleTab, popup);
    const targetTab = docInfo.tab;

    try {
      sessionStorage.setItem(
        'hamyar_pending_open_doc',
        JSON.stringify({
          recordId: popup.recordId,
          module: popup.module,
          tab: targetTab,
          projectId: popup.projectId
        })
      );
    } catch {}

    if (onNavigateToTab) {
      onNavigateToTab(targetTab, popup.recordId);
    }

    // 4. Dispatch document open and live count sync events
    setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent('hamyar_open_document', {
          detail: { recordId: popup.recordId, module: popup.module, tab: targetTab, projectId: popup.projectId }
        })
      );
      window.dispatchEvent(
        new CustomEvent('hamyar-notification-clicked', {
          detail: popup
        })
      );
      window.dispatchEvent(new Event('notification-updated'));
      window.dispatchEvent(new CustomEvent('hamyar_notification_sync'));
      window.dispatchEvent(new Event('storage'));
    }, 120);
  };

  if (activePopups.length === 0) return null;

  const getModuleBadgeIcon = (tab: string) => {
    switch (tab) {
      case 'technical-office':
        return <Layers size={13} />;
      case 'quality-control':
        return <FileCheck size={13} />;
      case 'execution':
        return <Send size={13} />;
      case 'communications':
        return <FileText size={13} />;
      case 'cbs-statements':
        return <Layers size={13} />;
      case 'planning':
        return <Sparkles size={13} />;
      case 'hse':
        return <Shield size={13} />;
      default:
        return <Bell size={13} />;
    }
  };

  return (
    <div
      className="fixed top-20 left-4 md:left-8 z-[9999] flex flex-col max-w-sm md:max-w-md w-full pointer-events-none font-['Vazirmatn'] animate-slideInLeft"
      dir="rtl"
    >
      {/* Main Popup Frame Container */}
      <div className="pointer-events-auto bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border-2 border-amber-500/80 dark:border-amber-500 rounded-3xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300 ring-4 ring-amber-500/10">
        
        {/* Top Header Bar */}
        <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 text-stone-950 px-4 py-3 flex items-center justify-between gap-3 shadow-sm select-none">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-stone-950/20 flex items-center justify-center shrink-0">
              <Inbox size={18} className="text-stone-950 animate-bounce" />
            </div>
            <div>
              <h4 className="font-black text-xs md:text-sm text-stone-950 flex items-center gap-2">
                <span>اسناد ارجاع‌شده آنلاین</span>
                <span className="bg-stone-950 text-amber-400 text-[10px] px-2 py-0.5 rounded-full font-black font-mono">
                  {activePopups.length}
                </span>
              </h4>
              <p className="text-[10.5px] font-bold text-stone-900/80">برای مشاهده روی سند مربوطه کلیک کنید</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1.5 hover:bg-stone-950/15 rounded-xl transition-colors cursor-pointer text-stone-950"
              title={isCollapsed ? 'باز کردن' : 'بستن لیست'}
            >
              {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
            </button>
            <button
              onClick={dismissAll}
              className="p-1.5 hover:bg-stone-950/15 rounded-xl transition-colors cursor-pointer text-stone-950"
              title="بستن همه"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* List of Referred Documents Frame */}
        {!isCollapsed && (
          <div className="p-3 space-y-3 max-h-[70vh] overflow-y-auto divide-y divide-stone-100 dark:divide-stone-800/60 custom-scrollbar">
            {activePopups.map((popup) => {
              const docInfo = NotificationService.resolveDocumentInfo(popup.recordId, popup.module, popup.targetModuleTab, popup);
              const matchedProject = popup.projectId ? allProjects.find((p) => String(p.id) === String(popup.projectId)) : null;
              const projectName = matchedProject?.name || (popup.projectId ? `پروژه کد ${popup.projectId}` : 'پروژه عمومی');
              const badgeIcon = getModuleBadgeIcon(docInfo.tab);
              const isSelected = selectedDocId === popup.id;

              return (
                <div
                  key={popup.id}
                  onClick={() => handleOpenDocument(popup)}
                  onMouseEnter={() => setSelectedDocId(popup.id)}
                  className="pt-3 first:pt-0 group/item cursor-pointer block"
                >
                  <div className={`border-2 rounded-2xl p-3.5 transition-all duration-200 relative overflow-hidden group-hover/item:shadow-lg ${
                    isSelected
                      ? 'border-amber-500 bg-amber-50/90 dark:bg-amber-950/30 ring-2 ring-amber-400/40 shadow-md'
                      : 'bg-stone-50/80 hover:bg-amber-500/10 dark:bg-stone-800/60 dark:hover:bg-amber-400/10 border-stone-200/80 hover:border-amber-400/80 dark:border-stone-700/80 dark:hover:border-amber-500/80'
                  }`}>
                    
                    {/* Top Row: Module Badge & Project */}
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <span className={`px-2.5 py-1 rounded-xl text-[10.5px] font-black flex items-center gap-1.5 shadow-xs ${docInfo.badgeColor}`}>
                        {badgeIcon}
                        <span>{docInfo.label}</span>
                      </span>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold text-stone-400 dark:text-stone-500 flex items-center gap-1">
                          <Clock size={11} />
                          {new Date(popup.createdAt).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <button
                          onClick={(e) => dismissPopup(popup.id, e)}
                          className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 p-0.5 rounded-md hover:bg-stone-200/50 dark:hover:bg-stone-700/50"
                          title="رد کردن این اعلان"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Project Name Badge */}
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/15 dark:bg-amber-400/15 text-amber-950 dark:text-amber-200 rounded-lg text-[11px] font-black mb-2">
                      <FolderKanban size={13} className="text-amber-600 dark:text-amber-400 shrink-0" />
                      <span className="truncate">پروژه: {projectName}</span>
                    </div>

                    {/* Document Info */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2 text-stone-900 dark:text-white font-black text-xs md:text-sm">
                        <div className="flex items-center gap-1.5 truncate">
                          <Bell size={14} className="text-amber-500 shrink-0" />
                          <span className="truncate group-hover/item:text-amber-600 dark:group-hover/item:text-amber-400 transition-colors">
                            {popup.documentTitle || 'دریافت سند جدید'}
                          </span>
                        </div>
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-black border ${
                          isSelected ? 'bg-amber-500 text-stone-950 border-amber-600' : 'bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300 border-transparent'
                        }`}>
                          {isSelected ? '✓ انتخاب‌شده' : 'انتخاب'}
                        </span>
                      </div>

                      <p className="text-[11.5px] text-stone-600 dark:text-stone-300 font-bold leading-relaxed line-clamp-2">
                        {popup.message}
                      </p>

                      {/* Sender Info & Doc Code */}
                      <div className="flex flex-wrap items-center gap-2 pt-1 text-[10px] text-stone-500 dark:text-stone-400 font-medium">
                        <span className="flex items-center gap-1 font-bold text-stone-800 dark:text-stone-200">
                          <User size={11} className="text-amber-600" />
                          فرستنده: {popup.fromUserName}
                        </span>
                        {popup.senderOrgName && (
                          <span className="flex items-center gap-1 font-bold text-stone-600 dark:text-stone-400">
                            <Building2 size={11} className="text-stone-400" />
                            ({popup.senderOrgName})
                          </span>
                        )}
                        {popup.documentNumber && popup.documentNumber !== '---' && (
                          <span className="bg-stone-200/80 dark:bg-stone-700/80 text-stone-800 dark:text-stone-200 px-1.5 py-0.5 rounded font-mono text-[9px] font-bold">
                            کد: {popup.documentNumber}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Line & Real-time Decrement Notice */}
                    <div className="mt-2.5 pt-2 border-t border-stone-200/60 dark:border-stone-700/60 flex items-center justify-between text-xs font-black text-amber-600 dark:text-amber-400">
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-black flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                        هدایت مستقیم به {docInfo.label}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDocument(popup);
                        }}
                        className="flex items-center gap-1 px-3 py-1 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-xl text-[10px] font-black transition-all shadow-xs active:scale-95 cursor-pointer"
                      >
                        <span>مشاهده سند</span>
                        <ArrowRight size={12} className="rotate-180" />
                      </button>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
};
