
import React, { useState, useEffect } from 'react';
import { Bell, Search, Settings, Menu, Moon, Sun, Sparkles, User, Palette } from 'lucide-react';
import { NAV_ITEMS } from '../constants';
import { SystemAdminService } from '../services/systemAdminService';
import { NotificationService } from '../services/notificationService';
import { Notification } from '../types';
import { applyThemeColor, getSavedThemeColor, setSavedThemeColor, CURATED_THEMES } from '../src/utils/theme';
import ThemeSelectorModal from './ThemeSelectorModal';

interface HeaderProps {
  activeTab: string;
  onMenuClick: () => void;
  onTabChange?: (tab: string) => void;
  onOpenNotificationCenter?: () => void;
}

export default function Header({ activeTab, onMenuClick, onTabChange, onOpenNotificationCenter }: HeaderProps) {
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [themeColor, setThemeColor] = useState(() => getSavedThemeColor());
  const [isFormOrModalOpen, setIsFormOrModalOpen] = useState(false);
  const [isHoveringTop, setIsHoveringTop] = useState(false);

  const getProjectTitle = (selectedId: string): string => {
    try {
      const raw = localStorage.getItem("hamyar_projects");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const match = parsed.find((p: any) => String(p.id) === String(selectedId));
          if (match) return match.title || match.name || "پروژه فعال";
        }
      }
      const projects = SystemAdminService.getProjects();
      const matched = projects.find((p) => String(p.id) === String(selectedId));
      if (matched) return matched.name || (matched as any).title || "پروژه فعال";
      if (projects.length > 0) return projects[0].name || (projects[0] as any).title || "پروژه فعال";
      return "پروژه فعال";
    } catch {
      return "پروژه فعال";
    }
  };

  const [activeProjectTitle, setActiveProjectTitle] = useState<string>(() => {
    const selectedId = localStorage.getItem("hamyar_selected_project_id") || "1";
    return getProjectTitle(selectedId);
  });

  useEffect(() => {
    const updateActiveProject = (e?: Event) => {
      try {
        const customEvent = e as CustomEvent<{ projectId: string }>;
        const selectedId = customEvent?.detail?.projectId || localStorage.getItem("hamyar_selected_project_id") || "1";
        setActiveProjectTitle(getProjectTitle(selectedId));
      } catch (err) {
        console.error("Error updating active project in Header", err);
      }
    };

    updateActiveProject();

    window.addEventListener("project-changed", updateActiveProject);
    window.addEventListener("projects-updated", updateActiveProject);
    window.addEventListener("storage", updateActiveProject);

    return () => {
      window.removeEventListener("project-changed", updateActiveProject);
      window.removeEventListener("projects-updated", updateActiveProject);
      window.removeEventListener("storage", updateActiveProject);
    };
  }, []);

  const [isDarkMode, setIsDarkMode] = useState(() => {
    return document.documentElement.classList.contains('dark') || 
      localStorage.getItem('theme') === 'dark';
  });

  // Observe whether any data entry form or modal is open across the entire app
  useEffect(() => {
    const checkModalOpen = () => {
      const modalElements = document.querySelectorAll(
        '.fixed.inset-0, [class*="fixed"][class*="inset-0"], [data-modal="true"], [role="dialog"]'
      );
      let openModalFound = false;
      modalElements.forEach((el) => {
        const htmlEl = el as HTMLElement;
        if (
          htmlEl.id !== 'toast-container' &&
          !htmlEl.classList.contains('ai-assistant-modal') &&
          (htmlEl.offsetParent !== null || htmlEl.offsetHeight > 0 || htmlEl.offsetWidth > 0)
        ) {
          const rect = htmlEl.getBoundingClientRect();
          if (rect.width > 280 && rect.height > 160) {
            openModalFound = true;
          }
        }
      });
      setIsFormOrModalOpen(openModalFound);
    };

    checkModalOpen();

    const observer = new MutationObserver(() => {
      checkModalOpen();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'data-modal']
    });

    // Detect mouse approaching top edge to reveal header
    const handleMouseMove = (e: MouseEvent) => {
      if (e.clientY <= 24) {
        setIsHoveringTop(true);
      } else if (e.clientY > 90) {
        setIsHoveringTop(false);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      observer.disconnect();
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const handleColorChange = (newColor: string) => {
    setThemeColor(newColor);
    setSavedThemeColor(newColor);
  };

  useEffect(() => {
    applyThemeColor(themeColor);
  }, [themeColor]);

  const toggleDarkMode = () => {
    setIsDarkMode(prev => !prev);
  };

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const currentUser = SystemAdminService.getCurrentUser();
  const unreadCount = notifications.filter(n => n.status === 'UNREAD').length;

  useEffect(() => {
    if (currentUser) {
      setNotifications(NotificationService.getUserNotifications(currentUser.id));
    }
  }, []);

  useEffect(() => {
    const handleNotificationUpdate = () => {
      if (currentUser) {
        setNotifications(NotificationService.getUserNotifications(currentUser.id));
      }
    };
    window.addEventListener('notification-updated', handleNotificationUpdate);
    return () => {
      window.removeEventListener('notification-updated', handleNotificationUpdate);
    };
  }, []);

  const getModuleLabel = (module: string) => {
    switch (module) {
      case 'MINUTES': return 'صورت‌جلسه';
      case 'STATEMENTS': return 'صورت‌وضعیت';
      case 'ESTIMATES': return 'برآورد';
      case 'PERMITS': return 'مجوزها';
      case 'MATERIALS': return 'مصالح';
      case 'VARIATIONS': return 'تغییر مقادیر';
      case 'ADJUSTMENT': return 'تعدیل';
      case 'EXECUTION': return 'گزارش روزانه';
      case 'COMMUNICATIONS': return 'مکاتبات و جلسات';
      case 'DCC': return 'کنترل مدارک (DCC)';
      default: return 'اعلان';
    }
  };

  const getModuleColor = (module: string) => {
    switch (module) {
      case 'STATEMENTS':
        return 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200/50';
      case 'MINUTES':
        return 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200/50';
      case 'EXECUTION':
        return 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200/50';
      default:
        return 'bg-stone-50 dark:bg-slate-800 text-stone-600 dark:text-slate-300 border-stone-200/50';
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    NotificationService.markAsRead(notification.id);

    if (notification.projectId) {
      localStorage.setItem("hamyar_selected_project_id", notification.projectId);
      window.dispatchEvent(new Event('project-changed'));
    }

    let mainTab = 'technical-office';
    let subTab = 'statements';

    if (
      notification.module === 'HSE' ||
      notification.module === 'hse' ||
      notification.documentTitle?.includes('PTW') ||
      notification.documentTitle?.includes('مجوز کار') ||
      notification.documentTitle?.includes('پرمیت') ||
      notification.documentTitle?.includes('ایمنی') ||
      notification.message?.includes('PTW') ||
      notification.message?.includes('ایمنی') ||
      notification.documentCode?.startsWith('PTW')
    ) {
      mainTab = 'hse';
      if (
        notification.documentTitle?.includes('حادثه') ||
        notification.documentCode?.startsWith('INC')
      ) {
        subTab = 'INCIDENTS';
      } else if (
        notification.documentTitle?.includes('زیست') ||
        notification.documentCode?.startsWith('ENV')
      ) {
        subTab = 'ENVIRONMENTAL';
      } else if (
        notification.documentTitle?.includes('دوره‌ای') ||
        notification.documentCode?.startsWith('REP')
      ) {
        subTab = 'PERIODIC';
      } else if (
        notification.documentTitle?.includes('برنامه') ||
        notification.documentTitle?.includes('Plan')
      ) {
        subTab = 'PLAN';
      } else {
        subTab = 'PERMITS';
      }
    } else if (notification.module === 'EXECUTION') {
      mainTab = 'execution';
      subTab = 'reports';
    } else if (notification.module === 'COMMUNICATIONS') {
      mainTab = 'communications';
      subTab = notification.documentTitle?.includes('صورت‌جلسه') || notification.message?.includes('جلسه') ? 'meetings' : 'letters';
    } else if (notification.module === 'QC' || notification.module === 'QUALITY_CONTROL') {
      mainTab = 'quality-control';
      if (notification.documentTitle?.includes('RFI') || notification.documentTitle?.includes('بازرسی') || notification.message?.includes('RFI') || notification.message?.includes('بازرسی') || notification.documentCode?.startsWith('RFI')) {
        subTab = 'inspections';
      } else if (notification.documentTitle?.includes('آزمایش') || notification.message?.includes('آزمایش') || notification.documentCode?.startsWith('LAB')) {
        subTab = 'lab_tests';
      } else {
        subTab = 'ncrs';
      }
    } else if (notification.module === 'STATEMENTS') {
      mainTab = 'cbs-statements';
      subTab = 'statements';
    } else if (notification.module === 'DCC') {
      mainTab = 'dcc-archive';
      subTab = 'archive';
    } else {
      mainTab = 'technical-office';
      subTab = notification.module === 'MINUTES' ? 'minutes' : notification.module.toLowerCase();
    }

    const newUrl = `${window.location.pathname}?tab=${subTab}&recordId=${notification.recordId}&projectId=${notification.projectId}`;
    window.history.pushState({}, "", newUrl);

    if (onTabChange) {
      onTabChange(mainTab);
    }

    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('hamyar-notification-clicked', { detail: notification }));
    }, 100);
  };

  const handleClearAll = () => {
    if (currentUser) {
      NotificationService.clearAll(currentUser.id);
    }
  };
  
  let currentItem = NAV_ITEMS.find(item => item.id === activeTab);
  
  if (!currentItem) {
    for (const parent of NAV_ITEMS) {
      if (parent.children) {
        const child = parent.children.find(c => c.id === activeTab);
        if (child) {
          currentItem = child;
          break;
        }
      }
    }
  }

  return (
    <>
      {isFormOrModalOpen && (
        <div 
          className="fixed top-0 inset-x-0 h-4 z-[290] pointer-events-auto cursor-pointer"
          onMouseEnter={() => setIsHoveringTop(true)}
          aria-hidden="true"
        />
      )}
      <header 
        onMouseEnter={() => setIsHoveringTop(true)}
        onMouseLeave={() => setIsHoveringTop(false)}
        className={`h-16 md:h-20 bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border-b border-stone-200/70 dark:border-slate-800 flex items-center justify-between px-4 md:px-8 transition-all duration-300 shrink-0 ${
          isFormOrModalOpen
            ? `fixed top-0 inset-x-0 w-full z-[300] shadow-2xl ${
                isHoveringTop
                  ? 'translate-y-0 opacity-100 pointer-events-auto'
                  : '-translate-y-full opacity-0 pointer-events-none'
              }`
            : 'sticky top-0 z-30 translate-y-0 opacity-100 pointer-events-auto shadow-sm'
        }`}
      >
      <div className="flex items-center gap-2 md:gap-5">
        <button 
          onClick={onMenuClick}
          className="p-2.5 hover:bg-stone-100 dark:hover:bg-slate-800 rounded-2xl text-stone-700 dark:text-slate-300 transition-all active:scale-95 flex items-center justify-center"
          aria-label="باز و بسته کردن منو"
          title="باز و بسته کردن منوی اصلی"
        >
          <Menu size={22} />
        </button>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex p-3 bg-gradient-to-br from-amber-400 to-amber-500 dark:from-amber-500 dark:to-amber-600 text-stone-950 rounded-2xl shadow-md shadow-amber-500/20 border border-amber-300/40">
            {currentItem?.icon}
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-base md:text-xl font-black text-stone-900 dark:text-white tracking-tight">
                {currentItem?.label}
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-[10px] font-black px-3 py-1 rounded-full border border-emerald-200/60 dark:border-emerald-800/60 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse"></span>
                برخط
              </span>
            </div>
            <p className="text-[10px] font-bold text-stone-400 dark:text-slate-400 hidden sm:flex items-center gap-1 mt-0.5 tracking-wide">
              <span>پروژه فعال:</span>
              <span className="text-stone-700 dark:text-slate-200 font-extrabold">{activeProjectTitle}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 md:gap-4">
        {/* Search input with shortcut indicator */}
        <div className="relative group hidden md:block">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 dark:text-slate-500 group-focus-within:text-amber-500 transition-colors" size={17} />
          <input
            type="text"
            placeholder="جستجو در سامانه..."
            className="bg-stone-100/80 dark:bg-slate-800/80 pr-11 pl-12 py-2.5 rounded-2xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:bg-white dark:focus:bg-slate-900 w-64 lg:w-72 transition-all border border-transparent focus:border-amber-500/50 text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-slate-500"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[9px] font-mono font-bold bg-stone-200/60 dark:bg-slate-700 text-stone-500 dark:text-slate-400 rounded-md border border-stone-300/40 dark:border-slate-600/50">
            ⌘K
          </span>
        </div>

        <div className="flex items-center gap-2 md:gap-3 pl-1 md:pl-0">
          {/* Dark / Light Theme Toggle */}
          <button
            onClick={toggleDarkMode}
            className="p-3 bg-stone-100/80 dark:bg-slate-800/80 hover:bg-stone-200/80 dark:hover:bg-slate-700 rounded-2xl text-stone-700 dark:text-slate-200 transition-all active:scale-95 border border-stone-200/50 dark:border-slate-700/60 shadow-xs cursor-pointer"
            title={isDarkMode ? 'تغییر به تم روشن' : 'تغییر به تم تیره'}
          >
            {isDarkMode ? <Sun size={19} className="text-amber-400 animate-scaleIn" /> : <Moon size={19} className="text-stone-700 animate-scaleIn" />}
          </button>

          {/* Curated Themes & Color Palette Button */}
          <button
            onClick={() => setShowThemeModal(true)}
            className="flex items-center gap-2 bg-stone-100/80 dark:bg-slate-800/80 hover:bg-stone-200/80 dark:hover:bg-slate-700 px-3 py-2.5 rounded-2xl border border-stone-200/50 dark:border-slate-700/60 shadow-xs transition-all active:scale-95 cursor-pointer group"
            title="انتخاب از بین تم‌ها و پالت‌های رنگی جذاب سامانه"
          >
            <div
              className="w-5 h-5 rounded-full border border-black/10 shadow-sm shrink-0 transition-transform group-hover:scale-110 flex items-center justify-center text-white"
              style={{ backgroundColor: themeColor }}
            >
              <Palette size={11} strokeWidth={2.5} />
            </div>
            <span className="text-xs font-black text-stone-700 dark:text-slate-200 hidden sm:inline select-none">
              تم و رنگ‌بندی
            </span>
          </button>

          {/* Notifications Trigger */}
          <div className="relative">
            <button 
              onClick={() => {
                if (onOpenNotificationCenter) {
                  onOpenNotificationCenter();
                } else {
                  window.dispatchEvent(new Event('open-central-notifications'));
                }
              }}
              className="p-3 bg-stone-100/80 dark:bg-slate-800/80 hover:bg-stone-200/80 dark:hover:bg-slate-700 rounded-2xl text-stone-700 dark:text-slate-200 relative transition-all active:scale-95 border border-stone-200/50 dark:border-slate-700/60 shadow-xs cursor-pointer group"
              title="مرکز اعلان‌ها و اسناد ارجاعی (پاپ‌آپ مرکزی)"
            >
              <Bell size={19} className="group-hover:text-amber-500 transition-colors" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-sm animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>

          <button 
            className="hidden md:flex p-3 bg-stone-100/80 dark:bg-slate-800/80 hover:bg-stone-200/80 dark:hover:bg-slate-700 rounded-2xl text-stone-700 dark:text-slate-200 transition-all active:scale-95 border border-stone-200/50 dark:border-slate-700/60 shadow-xs"
            title="تنظیمات"
          >
            <Settings size={19} />
          </button>
        </div>
      </div>
    </header>

    <ThemeSelectorModal
      isOpen={showThemeModal}
      onClose={() => setShowThemeModal(false)}
      currentColor={themeColor}
      onSelectColor={handleColorChange}
      isDarkMode={isDarkMode}
      onToggleDarkMode={toggleDarkMode}
    />
    </>
  );
}

