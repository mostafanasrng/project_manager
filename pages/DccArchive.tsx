import React, { useState, useEffect, useMemo } from 'react';
import { 
  FolderArchive, 
  Search, 
  Filter, 
  Printer, 
  Download, 
  Plus, 
  RefreshCw, 
  History, 
  Eye, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  XCircle, 
  FileText, 
  Building2, 
  Layers, 
  Paperclip, 
  Calendar, 
  User, 
  ChevronDown, 
  ExternalLink, 
  Sparkles, 
  SlidersHorizontal,
  TableProperties,
  LayoutGrid,
  Trash2,
  Tag
} from 'lucide-react';
import { DccDocument, DccModule, DccDocumentType, DccFilterState, DccKpis } from '../types/dcc';
import { DccService, DCC_MODULE_LABELS, DCC_DOCTYPE_LABELS } from '../services/dccService';
import { SystemAdminService } from '../services/systemAdminService';
import { printDccStandardReport } from '../services/dccPrintService';
import { DccWorkflowHistoryModal } from '../components/dcc/DccWorkflowHistoryModal';
import { DccNewDocumentModal } from '../components/dcc/DccNewDocumentModal';
import { DccAttachmentsModal } from '../components/dcc/DccAttachmentsModal';
import { ShamsiDatePicker } from '../components/ShamsiDatePicker';
import { Project, WorkflowStatus } from '../types';

export default function DccArchive() {
  const currentUser = useMemo(() => SystemAdminService.getCurrentUser(), []);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('ALL');
  const [allDocuments, setAllDocuments] = useState<DccDocument[]>([]);
  const [viewMode, setViewMode] = useState<'TABLE' | 'GRID'>('TABLE');

  // Accessible projects based on user roles and permissions
  const accessibleProjects = useMemo(() => {
    return projects.filter(p => SystemAdminService.canUserAccessProject(p.id, currentUser));
  }, [projects, currentUser]);
  
  // Modals
  const [selectedDocForHistory, setSelectedDocForHistory] = useState<DccDocument | null>(null);
  const [selectedDocForAttachments, setSelectedDocForAttachments] = useState<DccDocument | null>(null);
  const [isNewDocModalOpen, setIsNewDocModalOpen] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Filters
  const [moduleFilter, setModuleFilter] = useState<DccModule | 'ALL'>('ALL');
  const [docTypeFilter, setDocTypeFilter] = useState<DccDocumentType | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [disciplineFilter, setDisciplineFilter] = useState<string>('ALL');
  const [startDateFilter, setStartDateFilter] = useState<string>('');
  const [endDateFilter, setEndDateFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [hasAttachmentOnly, setHasAttachmentOnly] = useState<boolean>(false);
  const [isFiltersExpanded, setIsFiltersExpanded] = useState<boolean>(false);

  // Load projects & documents
  const loadData = () => {
    setIsRefreshing(true);
    try {
      const projList = DccService.getProjects();
      setProjects(projList);

      const user = SystemAdminService.getCurrentUser();
      const userAccessibleList = projList.filter(p => SystemAdminService.canUserAccessProject(p.id, user));

      // Check saved project preference with permission check
      const savedProjId = localStorage.getItem('hamyar_selected_project_id');
      if (savedProjId && userAccessibleList.some(p => String(p.id) === String(savedProjId))) {
        setSelectedProjectId(savedProjId);
      } else if (selectedProjectId !== 'ALL' && !userAccessibleList.some(p => String(p.id) === String(selectedProjectId))) {
        setSelectedProjectId('ALL');
      }

      const docs = DccService.getAllDocuments();
      setAllDocuments(docs);
    } catch (e) {
      console.error('Error loading DCC documents', e);
    } finally {
      setTimeout(() => setIsRefreshing(false), 300);
    }
  };

  useEffect(() => {
    loadData();

    const handleUpdate = () => loadData();
    window.addEventListener('dcc-documents-updated', handleUpdate);
    window.addEventListener('project-changed', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('dcc-documents-updated', handleUpdate);
      window.removeEventListener('project-changed', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  // Filter documents accessible to current user
  const userAccessibleDocuments = useMemo(() => {
    return allDocuments.filter((doc) => {
      if (!doc.projectId) return true;
      return SystemAdminService.canUserAccessProject(doc.projectId, currentUser);
    });
  }, [allDocuments, currentUser]);

  // Filtered documents
  const filteredDocuments = useMemo(() => {
    return userAccessibleDocuments.filter((doc) => {
      // Project filter
      if (selectedProjectId !== 'ALL' && String(doc.projectId) !== String(selectedProjectId)) {
        return false;
      }

      // Module filter
      if (moduleFilter !== 'ALL' && doc.module !== moduleFilter) {
        return false;
      }

      // Doc Type filter
      if (docTypeFilter !== 'ALL' && doc.documentType !== docTypeFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'ALL') {
        const st = String(doc.status).toUpperCase();
        if (statusFilter === 'APPROVED' && !(st.includes('APPROV') || st === 'PASS')) return false;
        if (statusFilter === 'IN_REVIEW' && !(st.includes('REVIEW') || st.includes('PENDING') || st.includes('SENT'))) return false;
        if (statusFilter === 'REJECTED' && !(st.includes('REJECT') || st.includes('FAIL'))) return false;
        if (statusFilter === 'DRAFT' && !st.includes('DRAFT')) return false;
      }

      // Discipline filter
      if (disciplineFilter !== 'ALL' && doc.discipline !== disciplineFilter) {
        return false;
      }

      // Attachments filter
      if (hasAttachmentOnly && (!doc.attachments || doc.attachments.length === 0)) {
        return false;
      }

      // Date range filter
      if (startDateFilter && doc.documentDate && doc.documentDate < startDateFilter) {
        return false;
      }
      if (endDateFilter && doc.documentDate && doc.documentDate > endDateFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchNumber = doc.documentNumber?.toLowerCase().includes(q);
        const matchTitle = doc.title?.toLowerCase().includes(q);
        const matchAuthor = doc.authorName?.toLowerCase().includes(q);
        const matchContractor = doc.contractorName?.toLowerCase().includes(q);
        const matchDesc = doc.description?.toLowerCase().includes(q);
        const matchTags = doc.tags?.some(t => t.toLowerCase().includes(q));

        if (!matchNumber && !matchTitle && !matchAuthor && !matchContractor && !matchDesc && !matchTags) {
          return false;
        }
      }

      return true;
    });
  }, [
    userAccessibleDocuments,
    selectedProjectId,
    moduleFilter,
    docTypeFilter,
    statusFilter,
    disciplineFilter,
    startDateFilter,
    endDateFilter,
    searchQuery,
    hasAttachmentOnly
  ]);

  // KPIs
  const kpis: DccKpis = useMemo(() => {
    return DccService.getKpis(filteredDocuments);
  }, [filteredDocuments]);

  // Unique disciplines for filter dropdown
  const uniqueDisciplines = useMemo(() => {
    const set = new Set<string>();
    userAccessibleDocuments.forEach((d) => {
      if (d.discipline) set.add(d.discipline);
    });
    return Array.from(set);
  }, [userAccessibleDocuments]);

  // Reset all filters
  const handleResetFilters = () => {
    setModuleFilter('ALL');
    setDocTypeFilter('ALL');
    setStatusFilter('ALL');
    setDisciplineFilter('ALL');
    setStartDateFilter('');
    setEndDateFilter('');
    setSearchQuery('');
    setHasAttachmentOnly(false);
  };

  // Export to Excel / CSV
  const handleExportMdr = () => {
    const projName = selectedProjectId === 'ALL' ? 'همه پروژه‌های مجاز' : DccService.getProjectName(selectedProjectId, accessibleProjects);
    DccService.exportMdrCsv(filteredDocuments, projName);
  };

  // Standard Official Print matching standard application modules
  const handlePrintOfficial = (doc: DccDocument) => {
    const project = projects.find(p => String(p.id) === String(doc.projectId)) || null;
    printDccStandardReport(doc, project);
  };

  // Delete custom document
  const handleDeleteDoc = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('آیا از حذف این مدرک از بایگانی مهندسی DCC اطمینان دارید؟')) {
      DccService.deleteCustomDocument(id);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-stone-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-gradient-to-br from-amber-500 to-amber-600 text-stone-950 rounded-2xl shadow-lg shadow-amber-500/20">
            <FolderArchive size={32} />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl md:text-2xl font-black text-stone-900 dark:text-white tracking-tight">
                مرکز کنترل و بایگانی مدارک مهندسی (DCC)
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                سیستم یکپارچه اسناد
              </span>
            </div>
            <p className="text-xs text-stone-500 dark:text-slate-400 font-bold mt-1 max-w-2xl leading-relaxed">
              بایگانی، جستجو، ردیابی گردش کار و صدور شناسنامه مهندسی برای تمامی مدارک ثبت شده در پروژه‌ها (دفتر فنی، کنترل کیفیت، HSE، برنامه‌ریزی، اجرا و مکاتبات)
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          <button
            onClick={() => setIsNewDocModalOpen(true)}
            className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black rounded-xl text-xs transition-all shadow-md shadow-amber-500/20 cursor-pointer active:scale-95"
          >
            <Plus size={16} strokeWidth={3} />
            <span>ثبت مدرک در بایگانی</span>
          </button>

          <button
            onClick={handleExportMdr}
            className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-stone-100 hover:bg-stone-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-stone-800 dark:text-slate-200 font-bold rounded-xl text-xs transition-all border border-stone-200/60 dark:border-slate-700 cursor-pointer"
            title="خروجی فایل اکسل فهرست مدارک مهندسی (MDR)"
          >
            <Download size={15} />
            <span>خروجی اکسل (MDR)</span>
          </button>

          <button
            onClick={loadData}
            disabled={isRefreshing}
            className="p-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-stone-600 dark:text-slate-300 transition-all border border-stone-200/60 dark:border-slate-700 cursor-pointer"
            title="بروزرسانی داده‌ها"
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin text-amber-500' : ''} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Total */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-stone-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3">
          <div className="p-3 rounded-xl bg-stone-100 dark:bg-slate-800 text-stone-700 dark:text-slate-300">
            <Layers size={20} />
          </div>
          <div>
            <span className="text-[10px] text-stone-400 dark:text-slate-500 font-bold block">کل مدارک بایگانی:</span>
            <span className="text-lg md:text-xl font-black text-stone-900 dark:text-white font-mono">
              {kpis.totalCount}
            </span>
          </div>
        </div>

        {/* Approved */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-emerald-200/50 dark:border-emerald-900/30 shadow-xs flex items-center gap-3">
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <span className="text-[10px] text-stone-400 dark:text-slate-500 font-bold block">تایید شده / مصوب:</span>
            <span className="text-lg md:text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {kpis.approvedCount}
            </span>
          </div>
        </div>

        {/* In Review */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-amber-200/50 dark:border-amber-900/30 shadow-xs flex items-center gap-3">
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
            <Clock size={20} />
          </div>
          <div>
            <span className="text-[10px] text-stone-400 dark:text-slate-500 font-bold block">در گردش / بررسی:</span>
            <span className="text-lg md:text-xl font-black text-amber-600 dark:text-amber-400 font-mono">
              {kpis.pendingCount}
            </span>
          </div>
        </div>

        {/* Rejected */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-rose-200/50 dark:border-rose-900/30 shadow-xs flex items-center gap-3">
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
            <XCircle size={20} />
          </div>
          <div>
            <span className="text-[10px] text-stone-400 dark:text-slate-500 font-bold block">مردود / اصلاح:</span>
            <span className="text-lg md:text-xl font-black text-rose-600 dark:text-rose-400 font-mono">
              {kpis.rejectedCount}
            </span>
          </div>
        </div>

        {/* Attachments */}
        <div className="col-span-2 sm:col-span-1 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-blue-200/50 dark:border-blue-900/30 shadow-xs flex items-center gap-3">
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
            <Paperclip size={20} />
          </div>
          <div>
            <span className="text-[10px] text-stone-400 dark:text-slate-500 font-bold block">ضمائم و نقشه‌ها:</span>
            <span className="text-lg md:text-xl font-black text-blue-600 dark:text-blue-400 font-mono">
              {kpis.attachmentsCount}
            </span>
          </div>
        </div>
      </div>

      {/* Main Filter & Search Control Bar */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-stone-200/80 dark:border-slate-800 shadow-xs space-y-4">
        {/* Row 1: Project Selector, Search Input, Quick Module Tabs */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Project Dropdown */}
          <div className="flex items-center gap-2 min-w-[240px]">
            <Building2 size={16} className="text-amber-500 shrink-0" />
            <select
              value={selectedProjectId}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedProjectId(val);
                if (val !== 'ALL') {
                  localStorage.setItem('hamyar_selected_project_id', val);
                  window.dispatchEvent(new Event('project-changed'));
                }
              }}
              className="w-full p-2.5 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl text-xs font-bold text-stone-900 dark:text-white outline-none"
            >
              <option value="ALL">
                {accessibleProjects.length > 1 ? 'تمامی پروژه‌های مجاز (مرکز جامع)' : 'همه پروژه‌های مجاز'}
              </option>
              {accessibleProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title || (p as any).name || 'پروژه'}
                </option>
              ))}
            </select>
          </div>

          {/* Search Box */}
          <div className="relative flex-1">
            <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو بر اساس شماره مدرک، عنوان، صادرکننده، تگ یا توضیحات..."
              className="w-full pr-10 pl-4 py-2.5 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl text-xs font-bold text-stone-900 dark:text-white outline-none placeholder-stone-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-0.5"
              >
                ✕
              </button>
            )}
          </div>

          {/* Expand Advanced Filters & View Toggle */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer border ${
                isFiltersExpanded || moduleFilter !== 'ALL' || docTypeFilter !== 'ALL' || statusFilter !== 'ALL' || startDateFilter
                  ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30'
                  : 'bg-stone-100 hover:bg-stone-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-stone-700 dark:text-slate-300 border-stone-200 dark:border-slate-700'
              }`}
            >
              <SlidersHorizontal size={14} />
              <span>فیلترهای پیشرفته</span>
              <ChevronDown size={14} className={`transition-transform duration-200 ${isFiltersExpanded ? 'rotate-180' : ''}`} />
            </button>

            {/* View Switcher */}
            <div className="flex items-center bg-stone-100 dark:bg-slate-800 p-1 rounded-xl border border-stone-200 dark:border-slate-700">
              <button
                onClick={() => setViewMode('TABLE')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'TABLE'
                    ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs'
                    : 'text-stone-500 dark:text-slate-400 hover:text-stone-900'
                }`}
                title="نمای جدولی فهرست مدارک (MDR)"
              >
                <TableProperties size={16} />
              </button>
              <button
                onClick={() => setViewMode('GRID')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'GRID'
                    ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs'
                    : 'text-stone-500 dark:text-slate-400 hover:text-stone-900'
                }`}
                title="نمای کارت‌ها"
              >
                <LayoutGrid size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Row 2: Module Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-bold scrollbar-none">
          <span className="text-stone-400 dark:text-slate-500 text-[11px] shrink-0 pl-1">تفکیک بخش:</span>
          {(['ALL', 'TECHNICAL_OFFICE', 'QUALITY_CONTROL', 'HSE', 'PLANNING', 'EXECUTION', 'COMMUNICATIONS', 'CONTRACTS', 'CUSTOM_ARCHIVE'] as const).map((mod) => {
            const isActive = moduleFilter === mod;
            return (
              <button
                key={mod}
                onClick={() => setModuleFilter(mod)}
                className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all cursor-pointer text-xs font-black ${
                  isActive
                    ? 'bg-amber-500 text-stone-950 shadow-sm shadow-amber-500/20'
                    : 'bg-stone-100 hover:bg-stone-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-stone-600 dark:text-slate-300'
                }`}
              >
                {DCC_MODULE_LABELS[mod]}
              </button>
            );
          })}
        </div>

        {/* Collapsible Advanced Filters */}
        {isFiltersExpanded && (
          <div className="pt-3 border-t border-stone-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs font-bold animate-fadeIn">
            {/* Doc Type */}
            <div>
              <label className="block text-stone-500 dark:text-slate-400 mb-1 text-[11px]">نوع مدرک:</label>
              <select
                value={docTypeFilter}
                onChange={(e) => setDocTypeFilter(e.target.value as any)}
                className="w-full p-2 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl outline-none"
              >
                <option value="ALL">همه انواع مدارک</option>
                {Object.entries(DCC_DOCTYPE_LABELS).map(([k, lbl]) => (
                  <option key={k} value={k}>{lbl}</option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-stone-500 dark:text-slate-400 mb-1 text-[11px]">وضعیت گردش کار:</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full p-2 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl outline-none"
              >
                <option value="ALL">همه وضعیت‌ها</option>
                <option value="APPROVED">تایید شده / مصوب</option>
                <option value="IN_REVIEW">در جریان بررسی</option>
                <option value="REJECTED">مردود / نیاز به اصلاح</option>
                <option value="DRAFT">پیش‌نویس اولیه</option>
              </select>
            </div>

            {/* Discipline */}
            <div>
              <label className="block text-stone-500 dark:text-slate-400 mb-1 text-[11px]">دیسیپلین مهندسی:</label>
              <select
                value={disciplineFilter}
                onChange={(e) => setDisciplineFilter(e.target.value)}
                className="w-full p-2 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl outline-none"
              >
                <option value="ALL">همه دیسیپلین‌ها</option>
                {uniqueDisciplines.map((disc) => (
                  <option key={disc} value={disc}>{disc}</option>
                ))}
              </select>
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-stone-500 dark:text-slate-400 mb-1 text-[11px]">از تاریخ مدرک:</label>
              <ShamsiDatePicker
                value={startDateFilter}
                onChange={setStartDateFilter}
                placeholder="1403/01/01"
                inputClassName="!p-2 !bg-stone-50 dark:!bg-slate-800 !border-stone-200 dark:!border-slate-700 !rounded-xl !text-xs !font-bold !text-center"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-stone-500 dark:text-slate-400 mb-1 text-[11px]">تا تاریخ مدرک:</label>
              <ShamsiDatePicker
                value={endDateFilter}
                onChange={setEndDateFilter}
                placeholder="1403/12/29"
                inputClassName="!p-2 !bg-stone-50 dark:!bg-slate-800 !border-stone-200 dark:!border-slate-700 !rounded-xl !text-xs !font-bold !text-center"
              />
            </div>

            {/* Quick Actions */}
            <div className="sm:col-span-2 lg:col-span-5 flex items-center justify-between pt-2">
              <label className="flex items-center gap-2 cursor-pointer select-none text-stone-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={hasAttachmentOnly}
                  onChange={(e) => setHasAttachmentOnly(e.target.checked)}
                  className="rounded text-amber-500 focus:ring-amber-400 w-4 h-4 cursor-pointer"
                />
                <span>فقط مدارک دارای فایل پیوست و نقشه</span>
              </label>

              <button
                onClick={handleResetFilters}
                className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
              >
                پاکسازی همه فیلترها
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Content Section: Table View or Grid View */}
      {filteredDocuments.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-stone-200/80 dark:border-slate-800 p-12 text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-stone-100 dark:bg-slate-800 text-stone-400 mx-auto flex items-center justify-center">
            <FolderArchive size={32} />
          </div>
          <h3 className="text-base font-black text-stone-800 dark:text-white">
            مدرکی با این مشخصات یافت نشد
          </h3>
          <p className="text-xs text-stone-500 dark:text-slate-400 max-w-sm mx-auto font-medium">
            فیلترهای انتخابی یا عبارت جستجو را تغییر دهید یا مدرک جدیدی در این پروژه ثبت نمایید.
          </p>
          <button
            onClick={handleResetFilters}
            className="mt-2 px-4 py-2 bg-stone-100 hover:bg-stone-200 dark:bg-slate-800 text-stone-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            حذف فیلترها
          </button>
        </div>
      ) : viewMode === 'TABLE' ? (
        /* MDR Table View */
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-stone-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-stone-200/80 dark:border-slate-800 flex items-center justify-between text-xs font-bold bg-stone-50/50 dark:bg-slate-800/40">
            <div className="flex items-center gap-2">
              <span className="text-stone-900 dark:text-white font-black">
                فهرست جامع مدارک مهندسی (Master Document Register)
              </span>
              <span className="font-mono text-[11px] text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
                {filteredDocuments.length} مدرک
              </span>
            </div>
            <span className="text-stone-400 dark:text-slate-500 text-[11px]">
              مرتب‌سازی: جدیدترین مدارک صادر شده
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-stone-100/70 dark:bg-slate-800/80 text-stone-600 dark:text-slate-400 font-black border-b border-stone-200 dark:border-slate-800 select-none text-[11px]">
                <tr>
                  <th className="p-3 w-12 text-center">ردیف</th>
                  <th className="p-3 w-40">شماره و کد سند</th>
                  <th className="p-3">عنوان مدرک</th>
                  <th className="p-3 w-36">بخش / واحد</th>
                  <th className="p-3 w-32">نوع مدرک</th>
                  <th className="p-3 w-28">دیسیپلین</th>
                  <th className="p-3 w-20 text-center">ویرایش</th>
                  <th className="p-3 w-28 text-center">تاریخ سند</th>
                  <th className="p-3 w-36">صادرکننده</th>
                  <th className="p-3 w-36">وضعیت گردش کار</th>
                  <th className="p-3 w-16 text-center">پیوست</th>
                  <th className="p-3 w-28 text-center">اقدامات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-slate-800/60 font-bold">
                {filteredDocuments.map((doc, idx) => (
                  <tr
                    key={doc.id}
                    onClick={() => setSelectedDocForHistory(doc)}
                    className="hover:bg-amber-500/[0.03] dark:hover:bg-amber-400/[0.03] transition-colors cursor-pointer group"
                  >
                    <td className="p-3 text-center text-stone-400 font-mono text-[11px]">
                      {idx + 1}
                    </td>

                    <td className="p-3 font-mono text-[11px] text-stone-900 dark:text-white font-black dir-ltr text-right">
                      <span className="hover:text-amber-500 transition-colors">
                        {doc.documentNumber}
                      </span>
                    </td>

                    <td className="p-3">
                      <div className="text-stone-900 dark:text-slate-100 font-black text-xs line-clamp-1 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                        {doc.title}
                      </div>
                      <div className="text-[10px] text-stone-400 dark:text-slate-500 line-clamp-1 mt-0.5">
                        {doc.projectName} {doc.description ? `• ${doc.description}` : ''}
                      </div>
                    </td>

                    <td className="p-3 text-stone-700 dark:text-slate-300">
                      <span className="text-[11px]">{doc.moduleLabel}</span>
                    </td>

                    <td className="p-3 text-stone-600 dark:text-slate-400 text-[11px]">
                      {doc.documentTypeLabel}
                    </td>

                    <td className="p-3 text-stone-600 dark:text-slate-400 text-[11px]">
                      {doc.discipline || '-'}
                    </td>

                    <td className="p-3 text-center font-mono font-black text-[11px] text-amber-600 dark:text-amber-400">
                      {doc.revision}
                    </td>

                    <td className="p-3 text-center font-mono text-stone-600 dark:text-slate-400 text-[11px]">
                      {doc.documentDate}
                    </td>

                    <td className="p-3 text-stone-700 dark:text-slate-300 text-[11px]">
                      <div className="line-clamp-1">{doc.authorName}</div>
                    </td>

                    <td className="p-3">
                      <span className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-black border ${doc.statusBadgeColor}`}>
                        {doc.statusLabel}
                      </span>
                    </td>

                    <td className="p-3 text-center">
                      {doc.attachments && doc.attachments.length > 0 ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDocForAttachments(doc);
                          }}
                          className="inline-flex items-center gap-1 font-mono text-[10px] font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-900 transition-colors cursor-pointer"
                          title="مشاهده و دانلود فایل‌های پیوست"
                        >
                          <Paperclip size={10} />
                          {doc.attachments.length}
                        </button>
                      ) : (
                        <span className="text-stone-300 dark:text-slate-600 text-[10px]">-</span>
                      )}
                    </td>

                    <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1">
                        {doc.attachments && doc.attachments.length > 0 && (
                          <button
                            onClick={() => setSelectedDocForAttachments(doc)}
                            className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 transition-colors"
                            title="دانلود پیوست‌ها"
                          >
                            <Download size={14} />
                          </button>
                        )}

                        <button
                          onClick={() => handlePrintOfficial(doc)}
                          className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-stone-700 dark:text-slate-300 transition-colors"
                          title="چاپ شناسنامه مدرک"
                        >
                          <Printer size={14} />
                        </button>

                        <button
                          onClick={() => setSelectedDocForHistory(doc)}
                          className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 transition-colors"
                          title="تاریخچه گردش کار"
                        >
                          <History size={14} />
                        </button>

                        {doc.isCustomArchived && (
                          <button
                            onClick={(e) => handleDeleteDoc(doc.id, e)}
                            className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-stone-400 hover:text-rose-600 transition-colors"
                            title="حذف سند"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Card Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredDocuments.map((doc) => (
            <div
              key={doc.id}
              onClick={() => handlePrintOfficial(doc)}
              className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-stone-200/80 dark:border-slate-800 shadow-xs hover:border-amber-400 dark:hover:border-amber-500 transition-all cursor-pointer flex flex-col justify-between group space-y-4"
            >
              {/* Card Top */}
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-black text-stone-900 dark:text-white px-2 py-0.5 rounded-md bg-stone-100 dark:bg-slate-800 dir-ltr">
                      {doc.documentNumber}
                    </span>
                    <span className="font-mono text-[11px] font-black text-amber-600 dark:text-amber-400">
                      {doc.revision}
                    </span>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black border ${doc.statusBadgeColor}`}>
                    {doc.statusLabel}
                  </span>
                </div>

                <h3 className="font-black text-sm text-stone-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors line-clamp-2">
                  {doc.title}
                </h3>
                <p className="text-[11px] text-stone-500 dark:text-slate-400 font-bold mt-1 line-clamp-2">
                  {doc.description || 'توضیحات تکمیلی ثبت نشده است.'}
                </p>
              </div>

              {/* Card Meta */}
              <div className="pt-3 border-t border-stone-100 dark:border-slate-800 text-[11px] font-bold space-y-1.5 text-stone-600 dark:text-slate-400">
                <div className="flex justify-between items-center">
                  <span className="text-stone-400">پروژه:</span>
                  <span className="text-stone-800 dark:text-slate-200">{doc.projectName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-stone-400">بخش / دیسیپلین:</span>
                  <span>{doc.moduleLabel} ({doc.discipline || 'عمومی'})</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-stone-400">تاریخ مدرک:</span>
                  <span className="font-mono">{doc.documentDate}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-stone-400">صادرکننده:</span>
                  <span>{doc.authorName}</span>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="pt-3 border-t border-stone-100 dark:border-slate-800 flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-1.5">
                  {doc.attachments && doc.attachments.length > 0 && (
                    <button
                      onClick={() => setSelectedDocForAttachments(doc)}
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 px-2 py-1 rounded-lg border border-blue-200 dark:border-blue-900 transition-colors cursor-pointer"
                      title="دانلود و مشاهده پیوست‌ها"
                    >
                      <Paperclip size={12} />
                      {doc.attachments.length} پیوست (دانلود)
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handlePrintOfficial(doc)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-stone-700 dark:text-slate-300 text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Printer size={13} />
                    چاپ
                  </button>

                  <button
                    onClick={() => setSelectedDocForHistory(doc)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold transition-colors cursor-pointer"
                  >
                    <History size={13} />
                    گردش کار
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Attachments Modal */}
      <DccAttachmentsModal
        isOpen={!!selectedDocForAttachments}
        onClose={() => setSelectedDocForAttachments(null)}
        document={selectedDocForAttachments}
      />

      {/* Workflow History Modal */}
      <DccWorkflowHistoryModal
        isOpen={!!selectedDocForHistory}
        onClose={() => setSelectedDocForHistory(null)}
        document={selectedDocForHistory}
      />

      {/* New Document Modal */}
      <DccNewDocumentModal
        isOpen={isNewDocModalOpen}
        onClose={() => setIsNewDocModalOpen(false)}
        onSave={() => loadData()}
        projects={accessibleProjects}
        defaultProjectId={selectedProjectId !== 'ALL' && accessibleProjects.some(p => String(p.id) === String(selectedProjectId)) ? selectedProjectId : accessibleProjects[0]?.id}
      />
    </div>
  );
}
