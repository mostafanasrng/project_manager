import React, { useState, useMemo, useEffect } from 'react';
import {
  GitCompare,
  Filter,
  Calendar,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Clock,
  Layers,
  ChevronDown,
  ChevronUp,
  Sliders,
  Sparkles,
  Plus,
  RefreshCw,
  Lock,
  Pencil,
  Trash2,
  X,
  Check,
  FileText,
  Printer,
  Building2,
  ShieldCheck,
  FileBarChart2,
  CalendarDays,
  Percent,
  Unlock
} from 'lucide-react';
import { Project, PeriodicComparisonItem, PlanningActivity } from '../../types';
import { EvmEngineService } from '../../services/evmEngineService';
import { SystemAdminService } from '../../services/systemAdminService';
import { PlanningPrintService } from '../../services/planningPrintService';
import { OrganizationType } from '../../systemAdminTypes';

interface PeriodicComparisonTableProps {
  projectId: string;
  project?: Project;
  activities: PlanningActivity[];
  currentUser?: any;
  userOrgType?: OrganizationType;
  onOpenPlanReplanModal?: () => void;
  onOpenProgressTrackingModal?: () => void;
  onOpenReplanModal?: () => void;
  isContractExpired?: boolean;
  canUnlockReplan?: boolean;
  isReplanUnlocked?: boolean;
  onToggleUnlockReplan?: () => void;
}

export default function PeriodicComparisonTable({
  projectId,
  project,
  activities,
  currentUser,
  userOrgType,
  onOpenPlanReplanModal,
  onOpenProgressTrackingModal,
  onOpenReplanModal,
  isContractExpired,
  canUnlockReplan,
  isReplanUnlocked,
  onToggleUnlockReplan
}: PeriodicComparisonTableProps) {
  const [periodFilter, setPeriodFilter] = useState<'ALL' | 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY'>('ALL');
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Active Project resolution
  const currentProject = useMemo<any>(() => {
    if (project) return project;
    try {
      const all = SystemAdminService.getProjects();
      return all.find(p => String(p.id) === String(projectId)) || ({} as any);
    } catch {
      return {} as any;
    }
  }, [project, projectId]);

  // Row Edit & Delete states
  const [deleteItem, setDeleteItem] = useState<PeriodicComparisonItem | null>(null);
  const [editingItem, setEditingItem] = useState<PeriodicComparisonItem | null>(null);
  const [editFormData, setEditFormData] = useState<{
    date: string;
    periodType: 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
    title: string;
    plannedPercent: number;
    actualPercent: number;
    notes: string;
  }>({
    date: '',
    periodType: 'MONTHLY',
    title: '',
    plannedPercent: 0,
    actualPercent: 0,
    notes: ''
  });

  // Listen for storage or external updates
  useEffect(() => {
    const handleRefresh = () => {
      setRefreshKey(prev => prev + 1);
    };
    window.addEventListener('storage', handleRefresh);
    window.addEventListener('progress-tracking-updated', handleRefresh);
    window.addEventListener('periodic-plans-updated', handleRefresh);
    return () => {
      window.removeEventListener('storage', handleRefresh);
      window.removeEventListener('progress-tracking-updated', handleRefresh);
      window.removeEventListener('periodic-plans-updated', handleRefresh);
    };
  }, []);

  // Fetch comparison data directly from EvmEngineService
  const comparisonItems = useMemo(() => {
    return EvmEngineService.getPeriodicComparison(projectId, periodFilter);
  }, [projectId, periodFilter, activities, refreshKey]);

  // Open Edit Modal with selected row data
  const handleOpenEdit = (item: PeriodicComparisonItem) => {
    setEditingItem(item);
    setEditFormData({
      date: item.date || '',
      periodType: item.periodType || 'MONTHLY',
      title: item.planTitle || '',
      plannedPercent: item.plannedPercent ?? 0,
      actualPercent: item.actualPercent ?? 0,
      notes: item.planRecord?.revisionReason || item.trackingRecord?.siteObservations || ''
    });
  };

  // Save changes to EvmEngineService
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    const plannedVal = Math.max(0, Math.min(100, Number(editFormData.plannedPercent) || 0));
    const actualVal = Math.max(0, Math.min(100, Number(editFormData.actualPercent) || 0));

    if (editingItem.planRecord) {
      const updatedPlan = {
        ...editingItem.planRecord,
        date: editFormData.date,
        periodType: editFormData.periodType,
        title: editFormData.title,
        totalWeightedPlannedProgress: plannedVal,
        totalWeightedActualProgress: actualVal,
        revisionReason: editFormData.notes || editingItem.planRecord.revisionReason
      };
      EvmEngineService.savePeriodicPlan(updatedPlan);
    } else if (editingItem.id.startsWith('comp_p_')) {
      const planId = editingItem.id.replace('comp_p_', '');
      const existing = EvmEngineService.getPeriodicPlans(projectId).find(p => p.id === planId);
      if (existing) {
        EvmEngineService.savePeriodicPlan({
          ...existing,
          date: editFormData.date,
          periodType: editFormData.periodType,
          title: editFormData.title,
          totalWeightedPlannedProgress: plannedVal,
          totalWeightedActualProgress: actualVal,
          revisionReason: editFormData.notes
        });
      }
    }

    if (editingItem.trackingRecord) {
      const updatedTrack = {
        ...editingItem.trackingRecord,
        date: editFormData.date,
        reportingPeriod: editFormData.periodType,
        totalWeightedPlannedProgress: plannedVal,
        totalWeightedActualProgress: actualVal,
        siteObservations: editFormData.notes || editingItem.trackingRecord.siteObservations
      };
      EvmEngineService.saveProgressTracking(updatedTrack);
    } else if (editingItem.id.startsWith('comp_t_')) {
      const trackId = editingItem.id.replace('comp_t_', '');
      const existing = EvmEngineService.getProgressTrackings(projectId).find(t => t.id === trackId);
      if (existing) {
        EvmEngineService.saveProgressTracking({
          ...existing,
          date: editFormData.date,
          reportingPeriod: editFormData.periodType,
          totalWeightedPlannedProgress: plannedVal,
          totalWeightedActualProgress: actualVal,
          siteObservations: editFormData.notes
        });
      }
    }

    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new CustomEvent('progress-tracking-updated', { detail: { projectId } }));
    window.dispatchEvent(new CustomEvent('periodic-plans-updated', { detail: { projectId } }));
    setRefreshKey(prev => prev + 1);
    setEditingItem(null);
  };

  // Confirm delete of row
  const handleConfirmDelete = () => {
    if (!deleteItem) return;

    if (deleteItem.planRecord) {
      EvmEngineService.deletePeriodicPlan(deleteItem.planRecord.id);
    } else if (deleteItem.id.startsWith('comp_p_')) {
      const planId = deleteItem.id.replace('comp_p_', '');
      EvmEngineService.deletePeriodicPlan(planId);
    }

    if (deleteItem.trackingRecord) {
      EvmEngineService.deleteProgressTracking(deleteItem.trackingRecord.id);
    } else if (deleteItem.id.startsWith('comp_t_')) {
      const trackId = deleteItem.id.replace('comp_t_', '');
      EvmEngineService.deleteProgressTracking(trackId);
    }

    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new CustomEvent('progress-tracking-updated', { detail: { projectId } }));
    window.dispatchEvent(new CustomEvent('periodic-plans-updated', { detail: { projectId } }));
    setRefreshKey(prev => prev + 1);
    setDeleteItem(null);
  };

  // Summary metrics for the filtered comparison items
  const summary = useMemo(() => {
    if (comparisonItems.length === 0) {
      // Fallback from current activities
      let totalW = 0;
      let wPlan = 0;
      let wAct = 0;
      activities.forEach(a => {
        const w = a.weightPercent || 1;
        totalW += w;
        wPlan += (a.plannedProgress || 0) * w;
        wAct += (a.actualProgress || 0) * w;
      });
      const factor = totalW > 0 ? totalW : 1;
      const planned = Math.round((wPlan / factor) * 100) / 100;
      const actual = Math.round((wAct / factor) * 100) / 100;
      return {
        planned,
        actual,
        variance: Math.round((actual - planned) * 100) / 100,
        spi: planned > 0 ? Math.round((actual / planned) * 100) / 100 : 1,
        count: 0
      };
    }

    const latest = comparisonItems[0];
    const avgSpi =
      comparisonItems.reduce((acc, curr) => acc + curr.spi, 0) / comparisonItems.length;

    return {
      planned: latest.plannedPercent,
      actual: latest.actualPercent,
      variance: latest.variance,
      spi: Math.round(avgSpi * 100) / 100,
      count: comparisonItems.length
    };
  }, [comparisonItems, activities]);

  const toggleExpand = (id: string) => {
    setExpandedItemId(prev => (prev === id ? null : id));
  };

  const getStatusBadge = (item: PeriodicComparisonItem) => {
    switch (item.status) {
      case 'AHEAD':
        return (
          <span className="px-2.5 py-1 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 rounded-xl text-[11px] font-black flex items-center gap-1">
            <CheckCircle2 size={13} />
            جلوتر از برنامه ({item.variance > 0 ? `+${item.variance}` : item.variance}٪)
          </span>
        );
      case 'ON_TRACK':
        return (
          <span className="px-2.5 py-1 bg-blue-500/15 text-blue-700 dark:text-blue-300 rounded-xl text-[11px] font-black flex items-center gap-1">
            <Clock size={13} />
            مطابق برنامه (انحراف {item.variance}٪)
          </span>
        );
      case 'SLIGHT_DELAY':
        return (
          <span className="px-2.5 py-1 bg-amber-500/15 text-amber-700 dark:text-amber-300 rounded-xl text-[11px] font-black flex items-center gap-1">
            <AlertTriangle size={13} />
            تاخیر جزئی ({item.variance}٪)
          </span>
        );
      case 'CRITICAL_DELAY':
      default:
        return (
          <span className="px-2.5 py-1 bg-rose-500/15 text-rose-700 dark:text-rose-300 rounded-xl text-[11px] font-black flex items-center gap-1">
            <AlertCircle size={13} />
            تاخیر بحرانی ({item.variance}٪)
          </span>
        );
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 lg:p-8 border border-stone-200/80 dark:border-slate-800 shadow-sm space-y-6">
      {/* Header & Filter Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-100 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <GitCompare size={22} className="text-amber-500" />
            <h3 className="text-lg font-black text-stone-900 dark:text-white">
              جدول مقایسه دوره‌ای برنامه زمان‌بندی و پیشرفت فیزیکی واقعی
            </h3>
            <span className="px-3 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-black rounded-xl">
              Plan vs. Actual Periodic Tracking
            </span>
          </div>
          <p className="text-xs text-stone-500 dark:text-slate-400 mt-1">
            مقایسه و پایش انحرافات پیشرفت برنامه‌ای (ثبت شده در ثبت/اصلاح برنامه) در برابر پیشرفت واقعی (ثبت شده در پیشرفت فیزیکی دوره‌ای)
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Button 1: Overall Project Status Report - Standard Official Print */}
          <button
            onClick={() => {
              PlanningPrintService.printOfficialOverallStatusReport({
                comparisonItems,
                project: currentProject,
                activities,
                currentUser
              });
            }}
            className="px-3.5 py-2 bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-white text-white dark:text-stone-900 rounded-2xl font-black text-xs transition-all shadow-sm flex items-center gap-1.5 active:scale-95 cursor-pointer"
            title="چاپ رسمی گزارش کلی وضعیت پروژه (استاندارد نظام فنی و اجرایی)"
          >
            <Printer size={15} className="text-amber-400 dark:text-amber-600" />
            <span>گزارش کلی وضعیت پروژه</span>
          </button>

          {/* Button 2: Replan with Contractor lock until contract end and Consultant/Employer unlock ability */}
          {onOpenReplanModal && (
            <div className="flex items-center gap-1">
              <button
                onClick={onOpenReplanModal}
                disabled={!isContractExpired && !isReplanUnlocked && !canUnlockReplan}
                className={`px-3.5 py-2 rounded-2xl font-black text-xs transition-all flex items-center gap-1.5 shadow-sm ${
                  isContractExpired || isReplanUnlocked
                    ? 'bg-amber-500 hover:bg-amber-400 text-stone-950 border border-amber-400 shadow-amber-500/20 active:scale-95 cursor-pointer'
                    : canUnlockReplan
                    ? 'bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800 cursor-pointer active:scale-95'
                    : 'bg-stone-100 dark:bg-slate-800 text-stone-400 dark:text-slate-500 border border-stone-200 dark:border-slate-700 cursor-not-allowed opacity-70'
                }`}
                title={
                  isContractExpired
                    ? 'قرارداد منقضی شده است - بازبرنامه‌ریزی فعال است'
                    : isReplanUnlocked
                    ? 'قفل بازبرنامه‌ریزی توسط مشاور/کارفرما باز شده است'
                    : canUnlockReplan
                    ? 'بازبرنامه‌ریزی (دسترسی ویژه مشاور و کارفرما جهت باز کردن قفل)'
                    : 'دکمه بازبرنامه‌ریزی تا روز پایان قرارداد برای پیمانکار غیرفعال است (قفل)'
                }
              >
                <RefreshCw size={14} className={isContractExpired ? 'text-stone-950 animate-spin-slow' : canUnlockReplan ? 'text-blue-600 dark:text-blue-400' : 'text-stone-400'} />
                <span>بازبرنامه‌ریزی (Replan)</span>
                {isContractExpired ? (
                  <span className="px-1.5 py-0.2 text-[9px] bg-stone-950 text-amber-400 rounded-md font-black">
                    فعال
                  </span>
                ) : isReplanUnlocked ? (
                  <span className="px-1.5 py-0.2 text-[9px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded-md font-black flex items-center gap-0.5">
                    <Unlock size={9} />
                    باز
                  </span>
                ) : canUnlockReplan ? (
                  <span className="px-1.5 py-0.2 text-[9px] bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-200 rounded-md font-bold flex items-center gap-0.5">
                    <Unlock size={9} />
                    مشاور/کارفرما
                  </span>
                ) : (
                  <span className="px-1.5 py-0.2 text-[9px] bg-stone-200 dark:bg-slate-700 text-stone-500 dark:text-slate-400 rounded-md font-bold flex items-center gap-0.5">
                    <Lock size={9} />
                    قفل پیمانکار
                  </span>
                )}
              </button>
              {canUnlockReplan && !isContractExpired && onToggleUnlockReplan && (
                <button
                  onClick={onToggleUnlockReplan}
                  className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-slate-700 transition-all cursor-pointer shadow-xs"
                  title={isReplanUnlocked ? 'بستن مجدد قفل Replan' : 'باز کردن قفل بازبرنامه‌ریزی (Replan) برای ارکان پروژه'}
                >
                  {isReplanUnlocked ? <Lock size={13} className="text-amber-600" /> : <Unlock size={13} className="text-emerald-600" />}
                </button>
              )}
            </div>
          )}

          {/* Button 3: Progress Tracking Modal */}
          {onOpenProgressTrackingModal && (
            <button
              onClick={onOpenProgressTrackingModal}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-600 hover:to-amber-500 text-stone-950 rounded-2xl font-black text-xs transition-all shadow-sm shadow-amber-500/20 flex items-center gap-1.5 active:scale-95 cursor-pointer"
            >
              <Sliders size={14} />
              ثبت پیشرفت فیزیکی دوره‌ای
            </button>
          )}
        </div>
      </div>

      {/* Period Filter Tabs & Comparison KPI Highlights */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-stone-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-stone-200/60 dark:border-slate-700/60">
        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-bold text-stone-500 dark:text-slate-400 ml-1">فیلتر دوره:</span>
          {(
            [
              { id: 'ALL', label: 'همه دوره‌ها' },
              { id: 'DAILY', label: 'روزانه' },
              { id: 'WEEKLY', label: 'هفتگی' },
              { id: 'BIWEEKLY', label: 'دو‌هفتگی' },
              { id: 'MONTHLY', label: 'ماهانه' }
            ] as const
          ).map(tab => (
            <button
              key={tab.id}
              onClick={() => setPeriodFilter(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                periodFilter === tab.id
                  ? 'bg-amber-500 text-stone-950 shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-stone-600 dark:text-slate-400 border border-stone-200/80 dark:border-slate-700 hover:bg-stone-100 dark:hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Live Comparison Metrics */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-stone-400 font-bold">برنامه‌ای:</span>
            <strong className="text-amber-600 dark:text-amber-400 text-sm font-black">
              {summary.planned}٪
            </strong>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-stone-400 font-bold">واقعی:</span>
            <strong className="text-emerald-600 dark:text-emerald-400 text-sm font-black">
              {summary.actual}٪
            </strong>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-stone-400 font-bold">انحراف:</span>
            <strong
              className={`text-sm font-black ${
                summary.variance >= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {summary.variance > 0 ? `+${summary.variance}` : summary.variance}٪
            </strong>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-stone-400 font-bold">شاخص تحقق (SPI):</span>
            <strong
              className={`text-sm font-black ${
                summary.spi >= 1 ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {summary.spi}
            </strong>
          </div>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="overflow-x-auto border border-stone-200/80 dark:border-slate-800 rounded-2xl">
        <table className="w-full text-right text-xs">
          <thead className="bg-stone-50 dark:bg-slate-800/80 text-stone-500 dark:text-slate-400 font-black border-b border-stone-200/80 dark:border-slate-800">
            <tr>
              <th className="p-3.5 w-28">تاریخ دوره</th>
              <th className="p-3.5 w-24 text-center">نوع دوره</th>
              <th className="p-3.5">عنوان برنامه / گزارش دوره</th>
              <th className="p-3.5 w-44 text-center">پیشرفت برنامه‌ای (Plan)</th>
              <th className="p-3.5 w-44 text-center">پیشرفت واقعی (Actual)</th>
              <th className="p-3.5 w-28 text-center">شاخص SPI</th>
              <th className="p-3.5 w-44 text-center">وضعیت انحراف</th>
              <th className="p-3.5 w-28 text-center">عملیات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 dark:divide-slate-800/60">
            {comparisonItems.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-stone-400 space-y-2">
                  <GitCompare size={32} className="mx-auto text-stone-300 dark:text-slate-600" />
                  <p className="font-bold">هیچ رکورد مقایسه‌ای ثبت نشده است.</p>
                  <p className="text-[11px] text-stone-400">
                    با ثبت برنامه زمانی دوره‌ای (Plan) و ثبت پیشرفت فیزیکی دوره‌ای (Actual)، جدول مقایسه‌ای به صورت هوشمند ایجاد می‌شود.
                  </p>
                </td>
              </tr>
            ) : (
              comparisonItems.map(item => {
                const isExpanded = expandedItemId === item.id;
                const periodBadgeColor = {
                  DAILY: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
                  WEEKLY: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
                  BIWEEKLY: 'bg-purple-500/10 text-purple-700 dark:text-purple-300',
                  MONTHLY: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                }[item.periodType] || 'bg-stone-100 text-stone-700';

                return (
                  <React.Fragment key={item.id}>
                    <tr className="hover:bg-stone-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="p-3.5 font-black text-stone-900 dark:text-white dir-ltr text-right">
                        {item.date}
                      </td>
                      <td className="p-3.5 text-center">
                        <span className={`px-2.5 py-1 rounded-xl text-[11px] font-black ${periodBadgeColor}`}>
                          {item.periodLabel}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span className="font-bold text-stone-900 dark:text-white block">
                          {item.planTitle}
                        </span>
                        {item.planRecord?.revisionReason && (
                          <span className="text-[10px] text-stone-400 block mt-0.5 line-clamp-1">
                            علت: {item.planRecord.revisionReason}
                          </span>
                        )}
                      </td>
                      <td className="p-3.5">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-black">
                            <span className="text-amber-600 dark:text-amber-400">{item.plannedPercent}٪</span>
                          </div>
                          <div className="w-full bg-stone-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-amber-500 h-full rounded-full transition-all"
                              style={{ width: `${Math.min(100, item.plannedPercent)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-black">
                            <span className="text-emerald-600 dark:text-emerald-400">{item.actualPercent}٪</span>
                          </div>
                          <div className="w-full bg-stone-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-emerald-500 h-full rounded-full transition-all"
                              style={{ width: `${Math.min(100, item.actualPercent)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5 text-center font-black">
                        <span
                          className={`text-xs px-2 py-1 rounded-lg ${
                            item.spi >= 1
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {item.spi}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        {getStatusBadge(item)}
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => {
                              PlanningPrintService.printOfficialPeriodicReport({
                                item,
                                project: currentProject,
                                activities,
                                currentUser
                              });
                            }}
                            className="p-1.5 text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 rounded-lg hover:bg-stone-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="چاپ رسمی گزارش دوره (استاندارد نظام فنی و اجرایی)"
                          >
                            <Printer size={15} />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 text-stone-400 hover:text-amber-600 dark:hover:text-amber-400 rounded-lg hover:bg-stone-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="ویرایش ردیف مقایسه‌ای"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => setDeleteItem(item)}
                            className="p-1.5 text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-stone-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="حذف ردیف مقایسه‌ای"
                          >
                            <Trash2 size={14} />
                          </button>
                          <button
                            onClick={() => toggleExpand(item.id)}
                            className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-slate-200 rounded-lg hover:bg-stone-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="مشاهده ریز فعالیت‌ها"
                          >
                            {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Accordion Detail: Activity Breakdown for this period */}
                    {isExpanded && (
                      <tr className="bg-stone-50/70 dark:bg-slate-800/40">
                        <td colSpan={8} className="p-4 space-y-3">
                          <div className="text-xs font-black text-stone-800 dark:text-slate-200 flex items-center gap-2">
                            <Layers size={14} className="text-amber-500" />
                            ریز مقایسه فعالیت‌های WBS در این دوره ({item.periodLabel} - {item.date}):
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                            {(item.planRecord?.activityEntries || activities).map(act => {
                              const title = 'activityTitle' in act ? act.activityTitle : act.title;
                              const code = 'activityCode' in act ? act.activityCode : act.code;
                              const plan = 'currentPlannedProgress' in act ? act.currentPlannedProgress : (act.plannedProgress || 0);
                              const actual = 'actualProgressAtPeriod' in act ? (act.actualProgressAtPeriod ?? 0) : (act.actualProgress || 0);
                              const diff = Math.round((actual - plan) * 10) / 10;

                              return (
                                <div
                                  key={act.activityId || (act as any).id}
                                  className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-stone-200/60 dark:border-slate-800 text-xs space-y-1.5"
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                      <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded text-[10px] font-black">
                                        {code}
                                      </span>
                                      <span className="font-bold text-stone-800 dark:text-white truncate max-w-[180px]">
                                        {title}
                                      </span>
                                    </div>
                                    <span
                                      className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                                        diff >= 0
                                          ? 'bg-emerald-500/10 text-emerald-600'
                                          : 'bg-rose-500/10 text-rose-600'
                                      }`}
                                    >
                                      {diff > 0 ? `+${diff}` : diff}٪
                                    </span>
                                  </div>

                                  <div className="flex items-center justify-between text-[11px] text-stone-500 pt-1 border-t border-stone-100 dark:border-slate-800">
                                    <span>برنامه‌ای: <strong className="text-amber-600">{plan}٪</strong></span>
                                    <span>واقعی: <strong className="text-emerald-600">{actual}٪</strong></span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-3 bg-rose-500/10 text-rose-600 rounded-2xl flex-shrink-0">
                <Trash2 size={24} />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-black text-stone-900 dark:text-white">
                  تأیید حذف ردیف مقایسه‌ای
                </h4>
                <p className="text-xs text-stone-600 dark:text-slate-300 leading-relaxed font-bold">
                  آیا از حذف رکورد دوره «{deleteItem.planTitle}» مربوط به تاریخ {deleteItem.date} اطمینان دارید؟
                </p>
                <p className="text-[11px] text-stone-400">
                  این عملیات رکورد برنامه زمانی یا گزارش پیشرفت فیزیکی این دوره را پاکسازی می‌کند.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setDeleteItem(null)}
                className="px-4 py-2 text-xs font-bold text-stone-600 hover:bg-stone-100 dark:text-slate-400 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2 text-xs font-black text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md transition-all cursor-pointer"
              >
                بله، حذف شود
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
                  <Pencil size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-stone-900 dark:text-white">
                    ویرایش ردیف مقایسه دوره‌ای
                  </h4>
                  <span className="text-[11px] text-stone-400">
                    اصلاح پیشرفت‌های ثبت‌شده و اطلاعات دوره
                  </span>
                </div>
              </div>
              <button
                onClick={() => setEditingItem(null)}
                className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-white rounded-lg hover:bg-stone-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs font-bold">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-stone-600 dark:text-slate-300">تاریخ دوره (شمسی)</label>
                  <input
                    type="text"
                    required
                    placeholder="1405/04/15"
                    value={editFormData.date}
                    onChange={e => setEditFormData({ ...editFormData, date: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800 text-stone-900 dark:text-white font-bold text-center ltr"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-stone-600 dark:text-slate-300">نوع دوره</label>
                  <select
                    value={editFormData.periodType}
                    onChange={e => setEditFormData({ ...editFormData, periodType: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800 text-stone-900 dark:text-white font-bold"
                  >
                    <option value="DAILY">روزانه</option>
                    <option value="WEEKLY">هفتگی</option>
                    <option value="BIWEEKLY">دو‌هفتگی</option>
                    <option value="MONTHLY">ماهانه</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-stone-600 dark:text-slate-300">عنوان دوره / برنامه</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: برنامه کاری دو‌هفتگی اول تیرماه"
                  value={editFormData.title}
                  onChange={e => setEditFormData({ ...editFormData, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800 text-stone-900 dark:text-white font-bold"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-stone-50 dark:bg-slate-800/50 rounded-2xl border border-stone-200/60 dark:border-slate-700/60">
                <div className="space-y-1">
                  <label className="text-amber-600 dark:text-amber-400 font-black">
                    پیشرفت برنامه‌ای دوره (٪ Plan)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    required
                    value={editFormData.plannedPercent}
                    onChange={e => setEditFormData({ ...editFormData, plannedPercent: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 font-black text-center text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-emerald-600 dark:text-emerald-400 font-black">
                    پیشرفت واقعی دوره (٪ Actual)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    required
                    value={editFormData.actualPercent}
                    onChange={e => setEditFormData({ ...editFormData, actualPercent: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 font-black text-center text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-stone-600 dark:text-slate-300">علت انحراف / توضیحات تکمیلی</label>
                <textarea
                  rows={2}
                  placeholder="توضیحات یا علل بروز انحرافات..."
                  value={editFormData.notes}
                  onChange={e => setEditFormData({ ...editFormData, notes: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800 text-stone-900 dark:text-white font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 text-stone-600 hover:bg-stone-100 dark:text-slate-400 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-stone-950 font-black rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Check size={16} />
                  ذخیره تغییرات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
