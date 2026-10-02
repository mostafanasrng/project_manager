
import React, { useState, useEffect } from 'react';
import { HashRouter as Router } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import TechnicalOffice from './pages/TechnicalOffice';
import Materials from './pages/Materials';
import Communications from './pages/Communications';
import Execution from './pages/Execution';
import CbsStatements from './pages/CbsStatements';
import CbsManagement from './pages/CbsManagement';
import CbsContracts from './pages/CbsContracts';
import QualityControl from './pages/QualityControl';
import Planning from './pages/Planning';
import Hse from './pages/Hse';
import DccArchive from './pages/DccArchive';
import Login from './pages/Login';
import { HardHat, ClipboardCheck, BarChart3, ShieldAlert, UserCircle } from 'lucide-react';
import Organizations from './pages/admin/Organizations';
import ProjectAssignments from './pages/admin/ProjectAssignments';
import OrgAdmins from './pages/admin/OrgAdmins';
import OrgUsers from './pages/admin/OrgUsers';
import { AllUsers } from './pages/admin/AllUsers';
import { SystemAuditLogs } from './pages/admin/SystemAuditLogs';
import { HR } from './pages/HR';
import { SystemAdminService } from './services/systemAdminService';
import { NotificationService } from './services/notificationService';
import { applyThemeColor, getSavedThemeColor } from './src/utils/theme';
import CentralNotificationModal from './components/CentralNotificationModal';
import { Notification } from './types';

function ComingSoon({ title, icon: Icon, desc }: { title: string, icon: any, desc: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] bg-white dark:bg-slate-900 rounded-3xl border border-stone-200/70 dark:border-slate-800 shadow-sm text-stone-400 dark:text-slate-500 p-12 text-center animate-fadeIn">
      <div className="w-24 h-24 bg-stone-50 dark:bg-slate-800/80 rounded-3xl flex items-center justify-center mb-6 text-amber-500 dark:text-amber-400 border border-stone-100 dark:border-slate-700 shadow-xs">
        <Icon size={48} strokeWidth={1.75} />
      </div>
      <h2 className="font-black text-2xl md:text-3xl text-stone-800 dark:text-white tracking-tight">{title}</h2>
      <p className="text-stone-500 dark:text-slate-400 text-sm md:text-base mt-3 max-w-sm leading-relaxed font-bold">{desc}</p>
      <div className="mt-8 px-6 py-2 bg-amber-500/10 dark:bg-amber-400/10 text-amber-600 dark:text-amber-400 rounded-full text-[11px] font-black uppercase tracking-widest border border-amber-500/20 dark:border-amber-400/20">
        در حال توسعه و پیاده‌سازی
      </div>
    </div>
  );
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught runtime error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-red-200 dark:border-red-900/50 shadow-sm my-6">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-950/60 rounded-2xl flex items-center justify-center text-red-600 dark:text-red-400 mb-4">
            <ShieldAlert size={32} />
          </div>
          <h3 className="text-lg font-black text-stone-800 dark:text-white mb-2">خطایی در بارگذاری این بخش رخ داده است</h3>
          <p className="text-xs text-stone-500 dark:text-slate-400 max-w-md mb-6 leading-relaxed">
            سیستم با یک خطای غیرمنتظره مواجه شد. می‌توانید با بارگذاری مجدد یا بازگشت به داشبورد ادامه دهید.
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black rounded-xl text-xs transition-all shadow-md shadow-amber-500/20 cursor-pointer"
          >
            تلاش مجدد و بارگذاری صفحه
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('hamyar_sidebar_open');
      if (saved !== null) {
        return saved === 'true';
      }
      return window.innerWidth >= 1024;
    }
    return true;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('hamyar_sidebar_open', String(isSidebarOpen));
    }
  }, [isSidebarOpen]);

  const [userRole, setUserRole] = useState<string>('USER');
  const [isCentralNotificationOpen, setIsCentralNotificationOpen] = useState(false);

  const currentUser = SystemAdminService.getCurrentUser();

  // Real-time online document notification subscription
  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = NotificationService.subscribeToOnlineNotifications(
      currentUser.id,
      () => {
        // Recipient is online and received a new document notification:
        // Automatically pop up the central notification dialog!
        NotificationService.playChimeSound();
        setIsCentralNotificationOpen(true);
      }
    );

    const handleOpenCenter = () => {
      setIsCentralNotificationOpen(true);
    };
    window.addEventListener('open-central-notifications', handleOpenCenter);

    return () => {
      unsubscribe();
      window.removeEventListener('open-central-notifications', handleOpenCenter);
    };
  }, [currentUser?.id]);

  const handleNavigateToDocument = (notification: Notification) => {
    NotificationService.markAsRead(notification.id);

    if (notification.projectId) {
      localStorage.setItem('hamyar_selected_project_id', notification.projectId);
      window.dispatchEvent(new Event('project-changed'));
    }

    const mod = (notification.module || '').toUpperCase();
    let targetMainTab = 'technical-office';
    let targetSubTab = 'minutes';

    if (
      mod === 'HSE' ||
      notification.documentTitle?.includes('PTW') ||
      notification.documentTitle?.includes('مجوز کار') ||
      notification.documentTitle?.includes('پرمیت') ||
      notification.documentTitle?.includes('ایمنی') ||
      notification.message?.includes('PTW') ||
      notification.message?.includes('ایمنی') ||
      notification.documentCode?.startsWith('PTW')
    ) {
      targetMainTab = 'hse';
      if (
        notification.documentTitle?.includes('حادثه') ||
        notification.documentCode?.startsWith('INC')
      ) {
        targetSubTab = 'INCIDENTS';
      } else if (
        notification.documentTitle?.includes('زیست') ||
        notification.documentCode?.startsWith('ENV')
      ) {
        targetSubTab = 'ENVIRONMENTAL';
      } else if (
        notification.documentTitle?.includes('دوره‌ای') ||
        notification.documentCode?.startsWith('REP')
      ) {
        targetSubTab = 'PERIODIC';
      } else if (
        notification.documentTitle?.includes('برنامه') ||
        notification.documentTitle?.includes('Plan')
      ) {
        targetSubTab = 'PLAN';
      } else {
        targetSubTab = 'PERMITS';
      }
    } else if (mod === 'COMMUNICATIONS') {
      targetMainTab = 'communications-letters';
      targetSubTab = 'letters';
    } else if (mod === 'STATEMENTS') {
      try {
        const rawCbs = localStorage.getItem('hamyar_cbs_statements');
        const cbsList = rawCbs ? JSON.parse(rawCbs) : [];
        if (cbsList.some((s: any) => String(s.id) === String(notification.recordId))) {
          targetMainTab = 'cbs-statements';
          targetSubTab = 'details';
        } else {
          targetMainTab = 'technical-office';
          targetSubTab = 'statements';
        }
      } catch {
        targetMainTab = 'cbs-statements';
        targetSubTab = 'details';
      }
    } else if (mod === 'EXECUTION') {
      targetMainTab = 'execution';
      targetSubTab = 'reports';
    } else if (mod === 'QC') {
      targetMainTab = 'quality-control';
      targetSubTab = 'ncrs';
    } else if (mod === 'MATERIALS') {
      targetMainTab = 'technical-office';
      targetSubTab = 'materials';
    } else if (mod === 'DCC') {
      targetMainTab = 'dcc-archive';
      targetSubTab = 'archive';
    } else if (mod === 'VARIATIONS') {
      targetMainTab = 'technical-office';
      targetSubTab = 'variation';
    } else if (mod === 'ESTIMATES') {
      targetMainTab = 'technical-office';
      targetSubTab = 'estimate';
    } else if (mod === 'PERMITS') {
      targetMainTab = 'technical-office';
      targetSubTab = 'permits';
    } else if (mod === 'ADJUSTMENT') {
      targetMainTab = 'technical-office';
      targetSubTab = 'adjustment';
    } else if (mod === 'MINUTES') {
      targetMainTab = 'technical-office';
      targetSubTab = 'minutes';
    } else {
      targetMainTab = 'technical-office';
      targetSubTab = mod.toLowerCase();
    }

    const newUrl = `${window.location.pathname}?tab=${targetSubTab}&recordId=${notification.recordId}&projectId=${notification.projectId || ''}`;
    window.history.pushState({}, '', newUrl);

    setActiveTab(targetMainTab);

    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('hamyar-notification-clicked', { detail: notification }));
      window.dispatchEvent(new CustomEvent('hamyar-focus-record', { detail: { recordId: notification.recordId, module: mod } }));
    }, 150);
  };

  const handleLogout = () => {
    const activeUser = localStorage.getItem('current_username') || 'admin';
    SystemAdminService.addAuditLog({
      user: activeUser,
      action: 'LOGOUT',
      details: `خروج کاربر ${activeUser} از سامانه`,
      source: 'احراز هویت و خروج',
      sourceType: 'AUTH'
    });
    localStorage.removeItem('hamyar_session');
    localStorage.removeItem('user_role');
    localStorage.removeItem('current_username');
    setIsAuthenticated(false);
    setUserRole('USER');
    setActiveTab('dashboard');
  };

  useEffect(() => {
    applyThemeColor(getSavedThemeColor());
  }, []);

  useEffect(() => {
    const session = localStorage.getItem('hamyar_session');
    const role = localStorage.getItem('user_role') || 'USER';
    const username = localStorage.getItem('current_username');
    
    if (session === 'true') {
      if (username && username !== 'admin') {
        const users = SystemAdminService.getUsers();
        const foundUser = users.find(u => u.username === username);
        if (foundUser && foundUser.isActive === false) {
          localStorage.setItem('login_error', 'حساب کاربری شما غیرفعال شده است.');
          handleLogout();
          return;
        }
      }

      setIsAuthenticated(true);
      setUserRole(role);
      if (role === 'SYSTEM_ADMIN' || role === 'ORG_ADMIN') {
        SystemAdminService.seedData();
      }

      // Check if user has unread document notifications upon opening session
      setTimeout(() => {
        const activeUser = SystemAdminService.getCurrentUser();
        if (activeUser && NotificationService.getUnreadCount(activeUser.id) > 0) {
          setIsCentralNotificationOpen(true);
        }
      }, 700);
    }
  }, []);

  const handleLogin = () => {
    const role = localStorage.getItem('user_role') || 'USER';
    setUserRole(role);
    setIsAuthenticated(true);
    setActiveTab('dashboard');
    setIsSidebarOpen(false);
    if (role === 'SYSTEM_ADMIN' || role === 'ORG_ADMIN') {
      SystemAdminService.seedData();
    }

    // Automatically open central notification popup upon login if there are pending notifications
    setTimeout(() => {
      const activeUser = SystemAdminService.getCurrentUser();
      if (activeUser && NotificationService.getUnreadCount(activeUser.id) > 0) {
        NotificationService.playChimeSound();
        setIsCentralNotificationOpen(true);
      }
    }, 600);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard onNavigate={(tab: string) => setActiveTab(tab)} />;
      case 'projects':
      case 'project-definition': return <Projects />;
      case 'cbs-management': return <div className="theme-adaptive-module w-full min-h-full"><CbsManagement /></div>;
      case 'cbs-contracts': return <div className="theme-adaptive-module w-full min-h-full"><CbsContracts /></div>;
      case 'technical-office': return <div className="theme-adaptive-module w-full min-h-full"><TechnicalOffice /></div>;
      case 'cbs-statements': return <div className="theme-adaptive-module w-full min-h-full"><CbsStatements /></div>;
      case 'materials': return <div className="theme-adaptive-module w-full min-h-full"><Materials /></div>;
      case 'communications':
      case 'communications-secretariat':
      case 'communications-letters':
      case 'communications-meetings':
      case 'communications-chats':
        return (
          <div className="theme-adaptive-module w-full min-h-full">
            <Communications activeSubTab={activeTab} onSubTabChange={setActiveTab} />
          </div>
        );
      case 'execution': return <div className="theme-adaptive-module w-full min-h-full"><Execution /></div>;
      case 'quality-control': return <QualityControl />;
      case 'planning': return <Planning />;
      case 'hse': return <Hse />;
      case 'dcc-archive': return <div className="theme-adaptive-module w-full min-h-full"><DccArchive /></div>;
      case 'hr':
      case 'hr-personnel': return SystemAdminService.canUserAccessHR() ? <HR onNavigateToUsers={() => setActiveTab('org-users')} /> : <Dashboard />;
      case 'org-users': return SystemAdminService.canUserAccessHR() ? <OrgUsers /> : <Dashboard />;
      case 'admin-orgs': return userRole === 'SYSTEM_ADMIN' ? <Organizations /> : <Dashboard />;
      case 'admin-assignments': return userRole === 'SYSTEM_ADMIN' ? <ProjectAssignments /> : <Dashboard />;
      case 'admin-users': return userRole === 'SYSTEM_ADMIN' ? <OrgAdmins /> : <Dashboard />;
      case 'admin-all-users': return userRole === 'SYSTEM_ADMIN' ? <AllUsers /> : <Dashboard />;
      case 'system-audit': return userRole === 'SYSTEM_ADMIN' ? <SystemAuditLogs /> : <Dashboard />;
      default: return <Dashboard />;
    }
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Router>
      <div className="flex h-screen bg-[#f8fafc] dark:bg-[#0b0f19] text-stone-900 dark:text-slate-100 font-['Vazirmatn'] overflow-hidden selection:bg-amber-400/30 selection:text-stone-900 transition-colors duration-300" dir="rtl">
        <Sidebar 
          activeTab={activeTab} 
          onTabChange={(id) => { 
            setActiveTab(id); 
            if (window.innerWidth < 1024) {
              setIsSidebarOpen(false); 
            }
          }} 
          isOpen={isSidebarOpen} 
          onClose={() => setIsSidebarOpen(false)}
          onLogout={handleLogout}
          userRole={userRole}
        />
        <div className="flex-1 flex flex-col min-w-0 h-full relative">
          <Header 
            activeTab={activeTab} 
            onMenuClick={() => setIsSidebarOpen(prev => !prev)} 
            onTabChange={setActiveTab} 
            onOpenNotificationCenter={() => setIsCentralNotificationOpen(true)}
          />
          <main className="flex-1 overflow-y-auto pb-12 relative scroll-smooth bg-stone-50/60 dark:bg-slate-950/40">
            <div className="p-4 md:p-8">
              <div className="max-w-[1700px] mx-auto animate-fadeIn">
                <ErrorBoundary>
                  {renderContent()}
                </ErrorBoundary>
              </div>
            </div>
          </main>
        </div>
      </div>

      <CentralNotificationModal
        isOpen={isCentralNotificationOpen}
        onClose={() => setIsCentralNotificationOpen(false)}
        onNavigateToDocument={handleNavigateToDocument}
        currentUser={currentUser}
      />
    </Router>
  );
}
