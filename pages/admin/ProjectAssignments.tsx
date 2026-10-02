
import React, { useState, useEffect, useMemo } from 'react';
import { SystemAdminService } from '../../services/systemAdminService';
import { Organization, SystemProject, OrgProjectAccess, OrganizationType } from '../../systemAdminTypes';
import { 
  Plus, Trash2, CheckCircle2, XCircle, Edit2, Search, Filter, 
  Building2, Layers, CheckSquare, Square, Check, X, ShieldCheck,
  ToggleLeft, ToggleRight, ArrowRight, RefreshCw, AlertCircle, AlertTriangle
} from 'lucide-react';
import DeleteModal from '../../components/DeleteModal';

const ProjectAssignments: React.FC = () => {
  const [accessList, setAccessList] = useState<OrgProjectAccess[]>([]);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [projects, setProjects] = useState<SystemProject[]>([]);
  
  // Modals & Forms
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccess, setEditingAccess] = useState<OrgProjectAccess | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Multi-assignment Form State
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [initialOrgAssignedIds, setInitialOrgAssignedIds] = useState<string[]>([]);
  const [isAccessActive, setIsAccessActive] = useState<boolean>(true);
  const [projectSearchInModal, setProjectSearchInModal] = useState<string>('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Main Table Filter & Search
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterOrgId, setFilterOrgId] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setAccessList(SystemAdminService.getAccess());
    setOrgs(SystemAdminService.getOrganizations());
    setProjects(SystemAdminService.getProjects());
  };

  // Open modal for new batch assignment or modifying existing assignments
  const handleOpenNewModal = (preselectedOrgId?: string) => {
    setEditingAccess(null);
    const initialOrgId = preselectedOrgId || (orgs.find(o => o.isActive)?.id || '');
    setSelectedOrgId(initialOrgId);
    
    // Pre-select projects currently assigned to this org
    if (initialOrgId) {
      const currentAssigned = accessList
        .filter(a => a.orgId === initialOrgId)
        .map(a => String(a.projectId).trim());
      setSelectedProjectIds(currentAssigned);
      setInitialOrgAssignedIds(currentAssigned);
    } else {
      setSelectedProjectIds([]);
      setInitialOrgAssignedIds([]);
    }
    
    setIsAccessActive(true);
    setProjectSearchInModal('');
    setSaveSuccessMsg(null);
    setIsModalOpen(true);
  };

  // Handle change of org in modal
  const handleOrgChangeInModal = (orgId: string) => {
    setSelectedOrgId(orgId);
    if (orgId) {
      const currentAssigned = accessList
        .filter(a => a.orgId === orgId)
        .map(a => String(a.projectId).trim());
      setSelectedProjectIds(currentAssigned);
      setInitialOrgAssignedIds(currentAssigned);
    } else {
      setSelectedProjectIds([]);
      setInitialOrgAssignedIds([]);
    }
  };

  // Toggle single project selection in modal
  const toggleProjectSelection = (projectId: string) => {
    const pId = String(projectId).trim();
    setSelectedProjectIds(prev => 
      prev.includes(pId) ? prev.filter(id => id !== pId) : [...prev, pId]
    );
  };

  // Select all visible projects in modal
  const handleSelectAllVisible = () => {
    const visibleIds = filteredProjectsInModal.map(p => String(p.id).trim());
    setSelectedProjectIds(prev => Array.from(new Set([...prev, ...visibleIds])));
  };

  // Deselect all visible projects in modal
  const handleDeselectAllVisible = () => {
    const visibleIds = new Set(filteredProjectsInModal.map(p => String(p.id).trim()));
    setSelectedProjectIds(prev => prev.filter(id => !visibleIds.has(id)));
  };

  // Select only unassigned projects for this org
  const handleSelectUnassigned = () => {
    const assignedSet = new Set(
      accessList.filter(a => a.orgId === selectedOrgId).map(a => String(a.projectId).trim())
    );
    const unassignedVisibleIds = filteredProjectsInModal
      .map(p => String(p.id).trim())
      .filter(id => !assignedSet.has(id));
    setSelectedProjectIds(prev => Array.from(new Set([...prev, ...unassignedVisibleIds])));
  };

  // Calculate live changes (added / removed / unchanged)
  const assignmentDiff = useMemo(() => {
    if (!selectedOrgId) return { added: [], removed: [], kept: [] };
    const currentSet = new Set(selectedProjectIds);
    const initialSet = new Set(initialOrgAssignedIds);

    const added = selectedProjectIds.filter(id => !initialSet.has(id));
    const removed = initialOrgAssignedIds.filter(id => !currentSet.has(id));
    const kept = selectedProjectIds.filter(id => initialSet.has(id));

    return { added, removed, kept };
  }, [selectedOrgId, selectedProjectIds, initialOrgAssignedIds]);

  // Save batch or single access (synchronizing additions and removals)
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrgId) {
      return;
    }

    if (editingAccess) {
      // Editing a single assignment
      const updated: OrgProjectAccess = {
        ...editingAccess,
        orgId: selectedOrgId,
        projectId: selectedProjectIds[0] || editingAccess.projectId,
        isActive: isAccessActive
      };
      SystemAdminService.saveAccess(updated);
      setIsModalOpen(false);
      loadData();
      return;
    }

    // If nothing selected and org had no assignments previously, nothing to do
    if (selectedProjectIds.length === 0 && initialOrgAssignedIds.length === 0) {
      return;
    }

    // Synchronize assignments (add checked, remove unchecked, keep existing)
    SystemAdminService.syncOrgProjectsAccess(selectedOrgId, selectedProjectIds, isAccessActive);
    
    const orgName = getOrgName(selectedOrgId);
    const { added, removed } = assignmentDiff;
    
    let summaryText = `تخصیص‌های سازمان "${orgName}" همگام‌سازی شد (مجموعاً ${selectedProjectIds.length.toLocaleString('fa-IR')} پروژه).`;
    if (selectedProjectIds.length === 0 && initialOrgAssignedIds.length > 0) {
      summaryText = `کلیه تخصیص‌های قبلی سازمان "${orgName}" (${initialOrgAssignedIds.length.toLocaleString('fa-IR')} پروژه) با موفقیت لغو و حذف گردید.`;
    } else if (added.length > 0 && removed.length > 0) {
      summaryText = `${added.length.toLocaleString('fa-IR')} پروژه اضافه شد و ${removed.length.toLocaleString('fa-IR')} پروژه از تخصیص سازمان "${orgName}" حذف گردید.`;
    } else if (added.length > 0) {
      summaryText = `${added.length.toLocaleString('fa-IR')} پروژه جدید با موفقیت به سازمان "${orgName}" اضافه گردید.`;
    } else if (removed.length > 0) {
      summaryText = `${removed.length.toLocaleString('fa-IR')} پروژه با موفقیت از تخصیص سازمان "${orgName}" کسر و حذف گردید.`;
    }

    setSaveSuccessMsg(summaryText);
    loadData();

    setTimeout(() => {
      setIsModalOpen(false);
      setSaveSuccessMsg(null);
    }, 1200);
  };

  const toggleSingleAccessStatus = (access: OrgProjectAccess) => {
    const updated = { ...access, isActive: !access.isActive };
    SystemAdminService.saveAccess(updated);
    loadData();
  };

  const confirmDelete = () => {
    if (deleteId) {
      SystemAdminService.deleteAccess(deleteId);
      setDeleteId(null);
      loadData();
    }
  };

  const getOrgName = (id: string) => orgs.find(o => o.id === id)?.name || id;
  const getOrg = (id: string) => orgs.find(o => o.id === id);
  const getProject = (id: string) => projects.find(p => String(p.id).trim() === String(id).trim());
  const getProjectName = (id: string) => getProject(id)?.name || id;

  const handleEdit = (access: OrgProjectAccess) => {
    handleOpenNewModal(access.orgId);
  };

  const handleResetToInitial = () => {
    setSelectedProjectIds(initialOrgAssignedIds);
  };

  // Projects list in modal filtered by search
  const filteredProjectsInModal = useMemo(() => {
    return projects.filter(p => {
      if (!projectSearchInModal.trim()) return true;
      const term = projectSearchInModal.toLowerCase().trim();
      return (
        (p.name || '').toLowerCase().includes(term) ||
        (p.code || '').toLowerCase().includes(term) ||
        (p.createdByUsername || '').toLowerCase().includes(term) ||
        (p.status || '').toLowerCase().includes(term)
      );
    });
  }, [projects, projectSearchInModal]);

  // Existing assignments for selected org
  const existingOrgAssignedIds = useMemo(() => {
    if (!selectedOrgId) return new Set<string>();
    return new Set(
      accessList.filter(a => a.orgId === selectedOrgId).map(a => String(a.projectId).trim())
    );
  }, [accessList, selectedOrgId]);

  // Filtered access list for table
  const filteredAccessList = useMemo(() => {
    return accessList.filter(access => {
      if (filterOrgId !== 'all' && access.orgId !== filterOrgId) return false;
      if (filterStatus === 'active' && !access.isActive) return false;
      if (filterStatus === 'inactive' && access.isActive) return false;
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const orgName = getOrgName(access.orgId).toLowerCase();
        const projName = getProjectName(access.projectId).toLowerCase();
        return orgName.includes(term) || projName.includes(term);
      }
      return true;
    });
  }, [accessList, filterOrgId, filterStatus, searchTerm, orgs, projects]);

  const getOrgTypeBadge = (type?: OrganizationType) => {
    switch (type) {
      case OrganizationType.EMPLOYER:
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-blue-50 text-blue-700 border border-blue-200">کارفرما</span>;
      case OrganizationType.CONSULTANT:
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-purple-50 text-purple-700 border border-purple-200">مشاور</span>;
      case OrganizationType.CONTRACTOR:
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-50 text-amber-700 border border-amber-200">پیمانکار</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn" dir="rtl">
      {/* Header Description */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl">
            <Layers size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-stone-800 dark:text-slate-100">تخصیص پروژه‌ها به سازمان‌ها</h1>
            <p className="text-xs text-stone-500 dark:text-slate-400 font-bold mt-1">
              مدیریت دسترسی چندگانه سازمان‌های کارفرما، مشاور و پیمانکار به پروژه‌ها
            </p>
          </div>
        </div>

        <button 
          onClick={() => handleOpenNewModal()}
          className="bg-amber-600 hover:bg-stone-900 text-white px-5 py-2.5 rounded-2xl font-bold text-xs md:text-sm flex items-center gap-2 shadow-lg shadow-amber-600/20 transition-all cursor-pointer"
        >
          <Plus size={18} />
          <span>تخصیص چندگانه پروژه (چک‌باکس)</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-stone-400 block mb-1">کل تخصیص‌های ثبت شده</span>
            <span className="text-2xl font-black text-stone-800 dark:text-slate-100">{accessList.length.toLocaleString('fa-IR')}</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
            <Layers size={24} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-stone-400 block mb-1">تخصیص‌های فعال</span>
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {accessList.filter(a => a.isActive).length.toLocaleString('fa-IR')}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <CheckCircle2 size={24} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-stone-400 block mb-1">سازمان‌های دارای پروژه</span>
            <span className="text-2xl font-black text-blue-600 dark:text-blue-400">
              {new Set(accessList.map(a => a.orgId)).size.toLocaleString('fa-IR')}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
            <Building2 size={24} />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm mb-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex-1 relative">
          <Search size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="جستجوی سازمان یا نام پروژه..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-4 pr-11 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-stone-800 placeholder-stone-400 focus:bg-white focus:border-amber-500 outline-none transition-all"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
              <X size={16} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-2 rounded-2xl border border-slate-200">
            <Filter size={15} className="text-stone-400" />
            <select
              value={filterOrgId}
              onChange={e => setFilterOrgId(e.target.value)}
              className="bg-transparent text-xs font-bold text-stone-700 outline-none cursor-pointer"
            >
              <option value="all">همه سازمان‌ها</option>
              {orgs.map(org => (
                <option key={org.id} value={org.id}>{org.name} ({org.code})</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-2 rounded-2xl border border-slate-200">
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value as any)}
              className="bg-transparent text-xs font-bold text-stone-700 outline-none cursor-pointer"
            >
              <option value="all">همه وضعیت‌ها</option>
              <option value="active">فقط فعال</option>
              <option value="inactive">فقط غیرفعال</option>
            </select>
          </div>

          {(searchTerm || filterOrgId !== 'all' || filterStatus !== 'all') && (
            <button
              onClick={() => { setSearchTerm(''); setFilterOrgId('all'); setFilterStatus('all'); }}
              className="px-3 py-2 text-xs font-bold text-stone-500 hover:text-stone-800 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all"
            >
              پاکسازی فیلتر
            </button>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="p-5 text-xs font-black text-stone-500">سازمان و نوع</th>
                <th className="p-5 text-xs font-black text-stone-500">پروژه تخصیص‌یافته</th>
                <th className="p-5 text-xs font-black text-stone-500">کد قرارداد / شناسه</th>
                <th className="p-5 text-xs font-black text-stone-500 text-center">وضعیت دسترسی</th>
                <th className="p-5 text-xs font-black text-stone-500 text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAccessList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center">
                    <div className="flex flex-col items-center justify-center text-stone-400 gap-3">
                      <Layers size={36} className="opacity-40" />
                      <p className="font-bold text-sm">هیچ موردی با فیلترهای جاری یافت نشد.</p>
                      <button
                        onClick={() => handleOpenNewModal()}
                        className="text-xs font-black text-amber-600 hover:text-amber-700 underline mt-1"
                      >
                        ایجاد تخصیص جدید برای سازمان
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAccessList.map(access => {
                  const org = getOrg(access.orgId);
                  const proj = getProject(access.projectId);
                  return (
                    <tr key={access.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-black text-xs shrink-0">
                            <Building2 size={16} />
                          </div>
                          <div>
                            <div className="font-black text-xs text-stone-800">{org?.name || access.orgId}</div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-stone-400 font-bold">کد: {org?.code || '-'}</span>
                              {getOrgTypeBadge(org?.type)}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="p-5">
                        <div className="font-black text-xs text-stone-800">{proj?.name || getProjectName(access.projectId)}</div>
                        <div className="text-[10px] text-stone-400 font-bold mt-0.5">شناسه: {access.projectId}</div>
                      </td>

                      <td className="p-5">
                        <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-stone-700 font-mono font-bold text-xs">
                          {proj?.code || access.projectId}
                        </span>
                      </td>

                      <td className="p-5 text-center">
                        <button
                          onClick={() => toggleSingleAccessStatus(access)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black cursor-pointer transition-all ${
                            access.isActive 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100' 
                              : 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
                          }`}
                          title="کلیک برای تغییر وضعیت فعال/غیرفعال"
                        >
                          {access.isActive ? (
                            <>
                              <CheckCircle2 size={14} className="text-emerald-600" />
                              <span>فعال</span>
                            </>
                          ) : (
                            <>
                              <XCircle size={14} className="text-red-500" />
                              <span>غیرفعال</span>
                            </>
                          )}
                        </button>
                      </td>

                      <td className="p-5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button 
                            onClick={() => handleOpenNewModal(access.orgId)} 
                            title="مدیریت تمام پروژه‌های این سازمان"
                            className="p-2 text-stone-500 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-colors"
                          >
                            <Layers size={17} />
                          </button>
                          <button 
                            onClick={() => handleEdit(access)} 
                            title="ویرایش وضعیت این تخصیص"
                            className="p-2 text-stone-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                          >
                            <Edit2 size={17} />
                          </button>
                          <button 
                            onClick={() => setDeleteId(access.id)} 
                            title="حذف تخصیص"
                            className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                          >
                            <Trash2 size={17} />
                          </button>
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

      {/* Multi-Project Assignment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl animate-scaleIn overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-r from-amber-600 to-amber-700 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-2xl">
                  <CheckSquare size={22} className="text-amber-100" />
                </div>
                <div>
                  <h2 className="text-lg font-black">
                    {editingAccess ? 'ویرایش تخصیص پروژه' : 'تخصیص یکجا و چندگانه پروژه‌ها به سازمان'}
                  </h2>
                  <p className="text-xs text-amber-100 font-bold mt-0.5">
                    {editingAccess ? 'تغییر تنظیمات دسترسی پروژه انتخابی' : 'پروژه‌های مدنظر را به صورت چک‌باکس انتخاب و یکجا تخصیص دهید'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-2xl transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSave} className="p-6 overflow-y-auto flex-1 space-y-5">
              {saveSuccessMsg && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 font-bold text-xs flex items-center gap-2 animate-fadeIn">
                  <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                  <span>{saveSuccessMsg}</span>
                </div>
              )}

              {/* Organization Selector */}
              <div>
                <label className="block text-xs font-black text-stone-700 mb-2">
                  سازمان هدف <span className="text-red-500">*</span>
                </label>
                <select 
                  required 
                  value={selectedOrgId} 
                  onChange={e => handleOrgChangeInModal(e.target.value)} 
                  disabled={!!editingAccess}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:border-amber-500 outline-none font-bold text-xs bg-white text-stone-800 transition-all disabled:bg-slate-100"
                >
                  <option value="">-- لطفاً سازمان را انتخاب کنید --</option>
                  {orgs.filter(o => o.isActive).map(org => {
                    const cleanName = (org.name || '').replace(/\s*\((کارفرما|مشاور|پیمانکار)\)\s*$/gi, '').trim();
                    const typeLabel = org.type === OrganizationType.EMPLOYER ? 'کارفرما' : org.type === OrganizationType.CONSULTANT ? 'مشاور' : 'پیمانکار';
                    return (
                      <option key={org.id} value={org.id}>
                        {cleanName} ({org.code}) - {typeLabel}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Multi-Project Checkbox Selection Section */}
              {selectedOrgId && (
                <div className="space-y-3 pt-2">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-black text-stone-700">
                        انتخاب پروژه‌ها (چک‌باکس)
                      </label>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-50 text-amber-700 border border-amber-200">
                        {selectedProjectIds.length.toLocaleString('fa-IR')} پروژه انتخاب شده
                      </span>
                    </div>

                    {!editingAccess && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={handleSelectAllVisible}
                          className="px-2.5 py-1 text-[11px] font-black text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-xl border border-amber-200 transition-all cursor-pointer"
                        >
                          انتخاب همه
                        </button>
                        <button
                          type="button"
                          onClick={handleDeselectAllVisible}
                          className="px-2.5 py-1 text-[11px] font-black text-stone-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
                        >
                          لغو همه
                        </button>
                        <button
                          type="button"
                          onClick={handleSelectUnassigned}
                          className="px-2.5 py-1 text-[11px] font-black text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl border border-blue-200 transition-all cursor-pointer"
                          title="انتخاب پروژه‌هایی که تاکنون به این سازمان تخصیص داده نشده‌اند"
                        >
                          افزودن تخصیص‌نیافته‌ها
                        </button>
                        <button
                          type="button"
                          onClick={handleResetToInitial}
                          className="px-2.5 py-1 text-[11px] font-black text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-xl border border-purple-200 transition-all cursor-pointer"
                          title="بازگرداندن به تخصیص‌های اولیه این سازمان"
                        >
                          بازنشانی تخصیص‌ها
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Diff Summary Indicator (Additions / Removals) */}
                  {!editingAccess && (
                    <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-2 flex-wrap text-xs font-bold">
                      <div className="text-stone-500 text-[11px]">
                        وضعیت تغییرات تخصیص:
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {assignmentDiff.added.length > 0 && (
                          <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 text-[11px] font-black flex items-center gap-1">
                            <span>+{assignmentDiff.added.length.toLocaleString('fa-IR')}</span>
                            <span>پروژه جدید (افزایش)</span>
                          </span>
                        )}
                        {assignmentDiff.removed.length > 0 && (
                          <span className="px-2 py-0.5 rounded-lg bg-rose-100 text-rose-800 text-[11px] font-black flex items-center gap-1">
                            <span>-{assignmentDiff.removed.length.toLocaleString('fa-IR')}</span>
                            <span>پروژه (کسر و حذف)</span>
                          </span>
                        )}
                        {assignmentDiff.kept.length > 0 && (
                          <span className="px-2 py-0.5 rounded-lg bg-stone-200 text-stone-700 text-[11px] font-black">
                            {assignmentDiff.kept.length.toLocaleString('fa-IR')} بدون تغییر
                          </span>
                        )}
                        {assignmentDiff.added.length === 0 && assignmentDiff.removed.length === 0 && (
                          <span className="text-[11px] text-stone-400 font-bold">
                            تغییری نسبت به تخصیص‌های قبلی سازمان ثبت نشده است.
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Project Search inside Modal */}
                  <div className="relative">
                    <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type="text"
                      placeholder="جستجوی سریع بین پروژه‌ها..."
                      value={projectSearchInModal}
                      onChange={e => setProjectSearchInModal(e.target.value)}
                      className="w-full pl-4 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-stone-800 placeholder-stone-400 focus:bg-white focus:border-amber-500 outline-none transition-all"
                    />
                    {projectSearchInModal && (
                      <button type="button" onClick={() => setProjectSearchInModal('')} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {/* Warning banner when all projects are unchecked */}
                  {!editingAccess && selectedProjectIds.length === 0 && initialOrgAssignedIds.length > 0 && (
                    <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-bold flex items-center gap-2.5">
                      <AlertTriangle size={18} className="shrink-0 text-rose-600" />
                      <div>
                        <span>توجه: کلیه پروژه‌ها لغو انتخاب شده‌اند. با کلیک بر روی دکمه ذخیره زیر، </span>
                        <strong className="text-rose-900 font-black">تمام تخصیص‌های قبلی این سازمان ({initialOrgAssignedIds.length.toLocaleString('fa-IR')} پروژه) به‌طور کامل حذف و لغو خواهند شد.</strong>
                      </div>
                    </div>
                  )}

                  {/* Projects Checkbox Grid */}
                  <div className="border border-slate-200 rounded-2xl p-2 bg-slate-50/50 max-h-64 overflow-y-auto space-y-1.5 custom-scrollbar">
                    {filteredProjectsInModal.length === 0 ? (
                      <div className="p-6 text-center text-xs font-bold text-stone-400">
                        پروژه‌ای مطابق با عبارت جستجو یافت نشد.
                      </div>
                    ) : (
                      filteredProjectsInModal.map(proj => {
                        const isChecked = selectedProjectIds.includes(String(proj.id).trim());
                        const wasInitiallyAssigned = initialOrgAssignedIds.includes(String(proj.id).trim());
                        const isNewlyAdded = isChecked && !wasInitiallyAssigned;
                        const isToBeRemoved = !isChecked && wasInitiallyAssigned;

                        return (
                          <div
                            key={proj.id}
                            onClick={() => toggleProjectSelection(proj.id)}
                            className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                              isNewlyAdded
                                ? 'bg-emerald-50/70 border-emerald-300 shadow-xs'
                                : isToBeRemoved
                                ? 'bg-rose-50/40 border-rose-200/80 opacity-70'
                                : isChecked 
                                ? 'bg-amber-50/80 border-amber-300 shadow-xs' 
                                : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`w-5 h-5 rounded-lg flex items-center justify-center transition-all shrink-0 ${
                                isNewlyAdded
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : isChecked 
                                  ? 'bg-amber-600 text-white shadow-xs' 
                                  : isToBeRemoved
                                  ? 'border border-rose-300 bg-rose-50 text-rose-500'
                                  : 'border border-stone-300 bg-white'
                              }`}>
                                {isChecked && <Check size={14} strokeWidth={3} />}
                                {isToBeRemoved && <X size={13} strokeWidth={3} />}
                              </div>

                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-black text-xs text-stone-800 truncate">
                                    {proj.name}
                                  </span>
                                  {proj.status === 'REGISTERED' && (
                                    <span className="px-2 py-0.5 rounded-md text-[9px] font-black bg-blue-50 text-blue-700 border border-blue-200">
                                      ثبت شده
                                    </span>
                                  )}
                                  {proj.status === 'ACTIVE' && (
                                    <span className="px-2 py-0.5 rounded-md text-[9px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                                      فعال
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 text-[10px] text-stone-400 font-bold mt-0.5">
                                  <span>کد پیمان: <span className="font-mono text-stone-600">{proj.code || proj.id}</span></span>
                                  {proj.createdByUsername && (
                                    <span className="text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200/60">
                                      ثبت: {proj.createdByJobLevel || proj.createdByRole || proj.createdByUsername}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="shrink-0 flex items-center gap-1.5">
                              {isNewlyAdded && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  + افزودن جدید
                                </span>
                              )}
                              {isToBeRemoved && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-200">
                                  - حذف خواهد شد
                                </span>
                              )}
                              {isChecked && wasInitiallyAssigned && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-stone-100 text-stone-700 border border-stone-200">
                                  حفظ تخصیص قبلی
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Status Setting */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between bg-slate-50 p-4 rounded-2xl border">
                <div>
                  <div className="font-black text-xs text-stone-800">وضعیت دسترسی پروژه‌های انتخابی</div>
                  <div className="text-[11px] text-stone-400 font-bold mt-0.5">
                    در صورت فعال بودن، کاربران این سازمان به ماژول‌های این پروژه‌ها دسترسی خواهند داشت
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={isAccessActive} 
                    onChange={e => setIsAccessActive(e.target.checked)} 
                    className="w-5 h-5 rounded-lg accent-amber-600 focus:ring-amber-500 cursor-pointer" 
                  />
                  <span className={`text-xs font-black ${isAccessActive ? 'text-emerald-600' : 'text-stone-500'}`}>
                    {isAccessActive ? 'فعال' : 'غیرفعال'}
                  </span>
                </label>
              </div>

              {/* Modal Footer Actions */}
              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="flex-1 py-3 rounded-2xl font-bold text-xs text-stone-500 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  انصراف
                </button>
                <button 
                  type="submit" 
                  disabled={!selectedOrgId || (selectedProjectIds.length === 0 && initialOrgAssignedIds.length === 0)}
                  className={`flex-2 py-3 rounded-2xl font-black text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 ${
                    !editingAccess && selectedProjectIds.length === 0 && initialOrgAssignedIds.length > 0
                      ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20'
                      : 'bg-amber-600 hover:bg-stone-900 text-white shadow-md shadow-amber-600/20 hover:shadow-none'
                  }`}
                >
                  {!editingAccess && selectedProjectIds.length === 0 && initialOrgAssignedIds.length > 0 ? (
                    <Trash2 size={16} />
                  ) : (
                    <Check size={16} />
                  )}
                  <span>
                    {editingAccess 
                      ? 'ذخیره تغییرات تخصیص' 
                      : selectedProjectIds.length === 0 && initialOrgAssignedIds.length > 0
                      ? `لغو و حذف تمامی تخصیص‌های این سازمان (${initialOrgAssignedIds.length.toLocaleString('fa-IR')} پروژه)`
                      : `همگام‌سازی و ذخیره تخصیص‌ها (${selectedProjectIds.length.toLocaleString('fa-IR')} پروژه)`}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteModal 
        isOpen={!!deleteId} 
        onClose={() => setDeleteId(null)} 
        onConfirm={confirmDelete} 
        title="حذف تخصیص پروژه" 
        description="آیا از حذف این تخصیص اطمینان دارید؟ کاربران این سازمان دسترسی به داده‌های این پروژه را از دست خواهند داد." 
      />
    </div>
  );
};

export default ProjectAssignments;

