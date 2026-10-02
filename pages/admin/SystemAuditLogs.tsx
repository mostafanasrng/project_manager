import React, { useState, useEffect } from 'react';
import { SystemAdminService } from '../../services/systemAdminService';
import { Activity, Search, Filter, Printer, Clock, User, FileText, ChevronDown, CheckCircle2, AlertCircle, Shield, LogIn, LogOut, Download } from 'lucide-react';

interface AuditLogItem {
  id: string;
  user: string;
  userFullName?: string;
  userRole?: string;
  userOrg?: string;
  action: string;
  details: string;
  date: string;
  source: string;
  sourceType: string;
}

export const SystemAuditLogs: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [orgs, setOrgs] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [allLogs, setAllLogs] = useState<AuditLogItem[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLogItem[]>([]);

  // Load all system users and organizations
  const loadUsersAndOrgs = () => {
    try {
      const systemUsers = SystemAdminService.getUsers();
      const systemOrgs = SystemAdminService.getOrganizations();
      
      // Ensure root admin user is included if not present
      if (!systemUsers.some(u => u.username === 'admin')) {
        systemUsers.unshift({
          id: 'admin',
          username: 'admin',
          fullName: 'مدیر کل سیستم',
          role: 'SYSTEM_ADMIN',
          orgId: 'SYSTEM',
          isActive: true
        });
      }

      setUsers(systemUsers);
      setOrgs(systemOrgs);
      return { systemUsers, systemOrgs };
    } catch (e) {
      console.error('Error loading users or orgs', e);
      return { systemUsers: [], systemOrgs: [] };
    }
  };

  // Helper to resolve user details by username or name
  const resolveUserInfo = (usernameOrName: string, systemUsers: any[], systemOrgs: any[]) => {
    if (!usernameOrName) return { fullName: 'کاربر ناشناس', username: 'unknown', role: 'ناشناس', orgName: 'سیستم' };

    const lower = usernameOrName.toLowerCase().trim();
    const found = systemUsers.find(
      (u) => u.username?.toLowerCase() === lower || u.fullName?.toLowerCase() === lower || u.id?.toLowerCase() === lower
    );

    if (found) {
      const org = systemOrgs.find((o) => o.id === found.orgId);
      const orgName = found.orgId === 'SYSTEM' ? 'مدیریت کل سیستم' : (org?.name || 'سازمان ثبت شده');
      const roleLabel = found.jobTitle || (found.role === 'SYSTEM_ADMIN' ? 'مدیر کل سیستم' : found.role === 'ORG_ADMIN' ? 'مدیر ارشد سازمان' : 'کارشناس / کاربر');
      return {
        fullName: found.fullName || found.username,
        username: found.username,
        role: roleLabel,
        orgName
      };
    }

    // Special cases fallback
    if (lower === 'admin') {
      return { fullName: 'مدیر کل سیستم', username: 'admin', role: 'مدیر کل سیستم', orgName: 'مرکزی' };
    }

    return {
      fullName: usernameOrName,
      username: usernameOrName,
      role: 'کاربر سیستم',
      orgName: 'سازمان پروژه'
    };
  };

  // Load all logs from multiple sources in localstorage
  const loadSystemLogs = (systemUsers: any[], systemOrgs: any[]) => {
    const rawLogs: any[] = [];

    // 1. Logs from System Admin Audit Service (hamyar_system_audit_logs)
    try {
      const sysLogs = SystemAdminService.getSystemAuditLogs();
      if (Array.isArray(sysLogs)) {
        sysLogs.forEach((l) => rawLogs.push(l));
      }
    } catch (e) {
      console.error('Error reading system audit logs', e);
    }

    // 2. Logs from Projects (hamyar_projects)
    try {
      const savedProjects = localStorage.getItem('hamyar_projects');
      if (savedProjects) {
        const projs = JSON.parse(savedProjects);
        if (Array.isArray(projs)) {
          projs.forEach((p: any) => {
            if (Array.isArray(p.auditLogsList)) {
              p.auditLogsList.forEach((log: any) => {
                rawLogs.push({
                  id: log.id || `proj_log_${Math.random()}`,
                  user: log.user || 'ناشناس',
                  action: log.action || 'اقدام',
                  details: log.details || '',
                  date: log.date || '',
                  source: `قرارداد: ${p.title || p.name || 'نامشخص'}`,
                  sourceType: 'PROJECT'
                });
              });
            }
          });
        }
      }
    } catch (e) {
      console.error('Error reading project audit logs', e);
    }

    // 3. Logs from CBS Contracts (hamyar_cbs_contracts)
    try {
      const savedContracts = localStorage.getItem('hamyar_cbs_contracts');
      if (savedContracts) {
        const contracts = JSON.parse(savedContracts);
        if (Array.isArray(contracts)) {
          contracts.forEach((c: any) => {
            if (Array.isArray(c.auditLogs)) {
              c.auditLogs.forEach((log: any) => {
                rawLogs.push({
                  id: log.id || `cbs_contract_log_${Math.random()}`,
                  user: log.user || 'ناشناس',
                  action: log.action || 'اقدام',
                  details: log.details || '',
                  date: log.date || '',
                  source: `پیمان CBS: ${c.contractNumber || c.title || 'نامشخص'}`,
                  sourceType: 'CBS_CONTRACT'
                });
              });
            }
          });
        }
      }
    } catch (e) {
      console.error('Error reading CBS contract audit logs', e);
    }

    // 4. Logs from CBS Nodes (hamyar_cbs_nodes)
    try {
      const savedNodes = localStorage.getItem('hamyar_cbs_nodes');
      if (savedNodes) {
        const nodesList = JSON.parse(savedNodes);
        if (Array.isArray(nodesList)) {
          nodesList.forEach((n: any) => {
            if (Array.isArray(n.auditLogs)) {
              n.auditLogs.forEach((log: any) => {
                rawLogs.push({
                  id: log.id || `cbs_node_log_${Math.random()}`,
                  user: log.user || 'ناشناس',
                  action: log.action || 'اقدام',
                  details: log.details || '',
                  date: log.date || '',
                  source: `گره CBS: ${n.title || 'نامشخص'} (${n.code})`,
                  sourceType: 'CBS_NODE'
                });
              });
            }
          });
        }
      }
    } catch (e) {
      console.error('Error reading CBS node audit logs', e);
    }

    // Enrich logs with full user details
    const enrichedLogs: AuditLogItem[] = rawLogs.map((log) => {
      const info = resolveUserInfo(log.user, systemUsers, systemOrgs);
      return {
        id: log.id || `log_${Math.random()}`,
        user: info.username,
        userFullName: info.fullName,
        userRole: info.role,
        userOrg: info.orgName,
        action: log.action || 'اقدام',
        details: log.details || '',
        date: log.date || '',
        source: log.source || 'سیستم عمومی',
        sourceType: log.sourceType || 'GENERAL'
      };
    });

    // Deduplicate by ID
    const uniqueMap = new Map<string, AuditLogItem>();
    enrichedLogs.forEach((l) => uniqueMap.set(l.id, l));

    // Sort logs by date string (newest first)
    const sorted = Array.from(uniqueMap.values()).sort((a, b) => {
      const dateA = a.date || '';
      const dateB = b.date || '';
      return dateB.localeCompare(dateA);
    });

    setAllLogs(sorted);
  };

  useEffect(() => {
    const { systemUsers, systemOrgs } = loadUsersAndOrgs();
    loadSystemLogs(systemUsers, systemOrgs);
  }, []);

  // Filter logs based on selection & search query
  useEffect(() => {
    const query = searchQuery.toLowerCase().trim();

    const filtered = allLogs.filter((log) => {
      // Check user filter (match username, full name, or ID)
      let matchesUser = false;
      if (selectedUser === 'ALL') {
        matchesUser = true;
      } else {
        const selLower = selectedUser.toLowerCase();
        matchesUser =
          log.user.toLowerCase() === selLower ||
          (log.userFullName && log.userFullName.toLowerCase() === selLower);
      }

      // Check search box query
      const matchesSearch =
        !query ||
        (log.user && log.user.toLowerCase().includes(query)) ||
        (log.userFullName && log.userFullName.toLowerCase().includes(query)) ||
        (log.userRole && log.userRole.toLowerCase().includes(query)) ||
        (log.userOrg && log.userOrg.toLowerCase().includes(query)) ||
        (log.action && log.action.toLowerCase().includes(query)) ||
        (log.details && log.details.toLowerCase().includes(query)) ||
        (log.source && log.source.toLowerCase().includes(query));

      return matchesUser && matchesSearch;
    });

    setFilteredLogs(filtered);
  }, [selectedUser, searchQuery, allLogs]);

  // Export Filtered Logs to PDF (for selected user or all)
  const handleExportPDF = (targetUsername?: string) => {
    const userToExport = targetUsername || selectedUser;
    
    let exportLogs = filteredLogs;
    if (userToExport !== 'ALL') {
      exportLogs = allLogs.filter(
        (l) => l.user.toLowerCase() === userToExport.toLowerCase() || l.userFullName?.toLowerCase() === userToExport.toLowerCase()
      );
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    let targetUserInfo = null;
    if (userToExport !== 'ALL') {
      targetUserInfo = resolveUserInfo(userToExport, users, orgs);
    }

    const titleText = targetUserInfo
      ? `گزارش سوابق و رهگیری عملکرد کاربر: ${targetUserInfo.fullName} (${targetUserInfo.username})`
      : 'گزارش جامع حسابرسی و لاگ تمامی کاربران سیستم';

    const html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="fa">
      <head>
        <meta charset="utf-8" />
        <title>${titleText}</title>
        <style>
          body { font-family: Tahoma, Arial, sans-serif; direction: rtl; padding: 25px; color: #1e293b; background: #fff; line-height: 1.5; }
          .header { text-align: center; border-bottom: 2px solid #ea580c; padding-bottom: 12px; margin-bottom: 20px; }
          .header h1 { font-size: 17px; margin: 0 0 6px 0; color: #0f172a; }
          .header p { font-size: 11px; color: #64748b; margin: 0; }
          .meta-box { background: #fff7ed; border: 1px solid #ffedd5; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; display: flex; flex-wrap: wrap; justify-content: space-between; font-size: 11px; color: #9a3412; }
          .meta-item { margin: 4px 10px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
          th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: right; }
          th { background-color: #f1f5f9; font-weight: bold; color: #0f172a; }
          tr:nth-child(even) { background-color: #f8fafc; }
          .badge { display: inline-block; padding: 2px 6px; background-color: #fef3c7; color: #b45309; border-radius: 4px; font-size: 10px; font-weight: bold; }
          .badge-auth { background-color: #dbeafe; color: #1e40af; }
          .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>سامانه یکپارچه همیار - گزارش ممیزی امنیتی و سوابق اقدامات کاربران (Audit Trail)</h1>
          <p>پایش زنجیره رویدادها، ورود و خروج‌ها و تغییرات داده‌ها در سیستم</p>
        </div>

        <div class="meta-box">
          ${
            targetUserInfo
              ? `
            <div class="meta-item"><strong>نام کاربر:</strong> ${targetUserInfo.fullName}</div>
            <div class="meta-item"><strong>شناسه کاربری:</strong> ${targetUserInfo.username}</div>
            <div class="meta-item"><strong>سمت / نقش:</strong> ${targetUserInfo.role}</div>
            <div class="meta-item"><strong>سازمان / بخش:</strong> ${targetUserInfo.orgName}</div>
            <div class="meta-item"><strong>تعداد سوابق ثبت شده:</strong> ${exportLogs.length} مورد</div>
            <div class="meta-item"><strong>تاریخ گزارش‌گیری:</strong> ${new Date().toLocaleDateString('fa-IR')} - ${new Date().toLocaleTimeString('fa-IR').substring(0, 5)}</div>
          `
              : `
            <div class="meta-item"><strong>محدوده گزارش:</strong> تمامی کاربران فعال سیستم</div>
            <div class="meta-item"><strong>تعداد کل سوابق:</strong> ${exportLogs.length} مورد</div>
            <div class="meta-item"><strong>تاریخ گزارش‌گیری:</strong> ${new Date().toLocaleDateString('fa-IR')} - ${new Date().toLocaleTimeString('fa-IR').substring(0, 5)}</div>
          `
          }
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 5%; text-align: center;">#</th>
              <th style="width: 15%;">تاریخ و زمان</th>
              <th style="width: 18%;">نام کاربر (شناسه)</th>
              <th style="width: 22%;">مرجع / بخش مرتبط</th>
              <th style="width: 15%;">رویداد (Event)</th>
              <th>شرح کامل اقدام و تغییرات</th>
            </tr>
          </thead>
          <tbody>
            ${exportLogs
              .map(
                (log, index) => `
              <tr>
                <td style="text-align: center; font-weight: bold;">${index + 1}</td>
                <td style="font-family: monospace; text-align: center;">${log.date || ''}</td>
                <td style="font-weight: bold; color: #9a3412;">
                  ${log.userFullName || log.user} <br/><small style="color:#64748b;">(@${log.user})</small>
                </td>
                <td style="color: #475569;">${log.source || ''}</td>
                <td><span class="badge ${log.action === 'LOGIN' || log.action === 'LOGOUT' ? 'badge-auth' : ''}">${log.action || ''}</span></td>
                <td>${log.details || ''}</td>
              </tr>
            `
              )
              .join('')}
            ${
              exportLogs.length === 0
                ? `<tr><td colSpan="6" style="text-align: center; color: #94a3b8; padding: 20px;">هیچ سابقه و فعالیتی برای این کاربر ثبت نشده است.</td></tr>`
                : ''
            }
          </tbody>
        </table>

        <div class="footer">
          این سند ممیزی به صورت خودکار توسط سامانه مدیریت کل همیار تولید شده است و معتبر می‌باشد.
        </div>

        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  // Get metrics
  const totalLogsCount = filteredLogs.length;
  const uniqueUsersWithActions = new Set(filteredLogs.map((l) => l.user)).size;

  // Selected user info
  const selectedUserInfo = selectedUser !== 'ALL' ? resolveUserInfo(selectedUser, users, orgs) : null;

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[2rem] border border-stone-200/60 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-32 h-32 bg-amber-500/5 rounded-br-[5rem] -translate-x-10 -translate-y-10"></div>
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-14 h-14 bg-stone-900 text-amber-500 rounded-2xl flex items-center justify-center shadow-md">
            <Activity size={28} />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-black text-stone-900">لاگ‌ها و رهگیری تغییرات سیستم</h2>
            <p className="text-xs text-stone-500 font-bold mt-1">
              سیستم جامع پایش زنجیره رویدادها، حسابرسی امنیتی (Audit Trail) و ممیزی ورود/خروج و اقدامات تمامی کاربران
            </p>
          </div>
        </div>

        <button
          onClick={() => handleExportPDF()}
          disabled={filteredLogs.length === 0}
          className="px-4 py-2.5 bg-amber-600 hover:bg-stone-900 text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all relative z-10 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          <Printer size={16} />
          خروجی PDF گزارش فعلی
        </button>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-[1.5rem] border border-stone-200/60 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <FileText size={20} />
          </div>
          <div>
            <span className="text-[10px] text-stone-400 font-bold block">تعداد کل لاگ‌های نمایش‌داده‌شده</span>
            <span className="text-xl font-black text-stone-800 mt-1 block">{totalLogsCount} رویداد</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-[1.5rem] border border-stone-200/60 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
            <User size={20} />
          </div>
          <div>
            <span className="text-[10px] text-stone-400 font-bold block">تعداد کاربران دارای فعالیت</span>
            <span className="text-xl font-black text-stone-800 mt-1 block">{uniqueUsersWithActions} کاربر</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-[1.5rem] border border-stone-200/60 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Shield size={20} />
          </div>
          <div>
            <span className="text-[10px] text-stone-400 font-bold block">وضعیت پایش و ممیزی امنیتی</span>
            <span className="text-xl font-black text-emerald-600 mt-1 block">فعال و در حال ثبت (100%)</span>
          </div>
        </div>
      </div>

      {/* Selected User Banner (if specific user filtered) */}
      {selectedUserInfo && (
        <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-600 text-white rounded-xl flex items-center justify-center font-black">
              <User size={20} />
            </div>
            <div>
              <span className="text-xs font-black text-stone-900 block">
                نمایش سوابق اختصاصی کاربر: {selectedUserInfo.fullName} ({selectedUserInfo.username})
              </span>
              <span className="text-[11px] text-stone-600 font-bold block">
                نقش: {selectedUserInfo.role} | سازمان: {selectedUserInfo.orgName}
              </span>
            </div>
          </div>
          <button
            onClick={() => handleExportPDF(selectedUser)}
            className="px-3.5 py-2 bg-stone-900 hover:bg-amber-700 text-white font-black text-xs rounded-xl flex items-center gap-2 shadow-xs transition-all shrink-0"
          >
            <Download size={14} />
            دریافت اختصاصی PDF کاربر ({selectedUserInfo.username})
          </button>
        </div>
      )}

      {/* Filters and Search panel */}
      <div className="bg-white p-5 rounded-2xl border border-stone-200/60 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <span className="text-xs font-black text-stone-800">🛠️ فیلتر بر اساس کاربر و جستجو در کلیه لاگ‌ها</span>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            {/* User Dropdown */}
            <div className="relative min-w-[260px]">
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 hover:border-stone-300 rounded-xl px-3 py-2 text-xs font-bold text-stone-800 appearance-none outline-none focus:ring-2 focus:ring-amber-500/20"
              >
                <option value="ALL">📋 تمامی کاربران سیستم (نمایش کلیه لاگ‌ها)</option>
                {users.map((usr) => {
                  const org = orgs.find((o) => o.id === usr.orgId);
                  const orgLabel = usr.orgId === 'SYSTEM' ? 'مدیریت کل' : org ? org.name : 'سازمان';
                  return (
                    <option key={usr.id || usr.username} value={usr.username}>
                      👤 {usr.fullName || usr.username} ({usr.username}) - {orgLabel}
                    </option>
                  );
                })}
              </select>
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-stone-500">
                <ChevronDown size={14} />
              </div>
            </div>

            {/* Keyword Search */}
            <div className="relative flex-1 sm:w-72">
              <input
                type="text"
                placeholder="جستجو در نام کاربر، نام خانوادگی، رویداد، متن لاگ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 hover:border-stone-300 rounded-xl pl-9 pr-3 py-2 text-xs font-bold text-right outline-none focus:ring-2 focus:ring-amber-500/20"
              />
              <Search size={14} className="absolute left-3 top-2.5 text-stone-400" />
            </div>
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="border border-stone-100 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto max-h-[550px] overflow-y-auto custom-scrollbar">
            <table className="w-full text-right text-xs">
              <thead className="bg-stone-50 text-stone-500 font-black sticky top-0 border-b border-stone-100 z-10">
                <tr>
                  <th className="p-3 text-center w-12">#</th>
                  <th className="p-3 w-36">تاریخ و زمان</th>
                  <th className="p-3 w-48">کاربر و نام خانوادگی</th>
                  <th className="p-3 w-48">مرجع / بخش مرتبط</th>
                  <th className="p-3 w-36">رویداد (Event)</th>
                  <th className="p-3">شرح کامل اقدام و جزئیات تغییرات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-semibold text-stone-700">
                {filteredLogs.map((log, index) => (
                  <tr key={log.id || index} className="hover:bg-amber-500/5 transition-colors">
                    <td className="p-3 text-center text-stone-400 font-mono text-[10px]">{index + 1}</td>
                    <td className="p-3 text-stone-500 font-mono text-[10px]">
                      <div className="flex items-center gap-1.5">
                        <Clock size={12} className="text-stone-400 shrink-0" />
                        <span>{log.date}</span>
                      </div>
                    </td>
                    <td className="p-3 font-bold text-stone-900">
                      <div className="flex flex-col">
                        <span className="text-amber-800 font-black text-xs">{log.userFullName || log.user}</span>
                        <span className="text-stone-400 font-mono text-[10px]">@{log.user}</span>
                      </div>
                    </td>
                    <td className="p-3 text-stone-600 text-[11px]">{log.source}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-1 rounded-lg text-[9px] font-black tracking-wider inline-flex items-center gap-1 ${
                          log.action === 'LOGIN'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : log.action === 'LOGOUT'
                            ? 'bg-slate-100 text-stone-600 border border-stone-200'
                            : log.action.includes('CREATE') || log.action.includes('ADD')
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : log.action.includes('EDIT') || log.action.includes('UPDATE')
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : log.action.includes('REMOVE') || log.action.includes('DELETE')
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-stone-100 text-stone-600 border border-stone-200'
                        }`}
                      >
                        {log.action === 'LOGIN' && <LogIn size={11} />}
                        {log.action === 'LOGOUT' && <LogOut size={11} />}
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3 text-stone-600 text-[11px] leading-relaxed">{log.details}</td>
                  </tr>
                ))}
                {filteredLogs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center p-8 text-stone-400 italic">
                      <div className="flex flex-col items-center gap-2">
                        <AlertCircle size={24} className="text-stone-300" />
                        <span>هیچ موردی منطبق با فیلترها و عبارت جستجوی فعلی یافت نشد.</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
