import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Calendar,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Clock,
  History,
  Sparkles,
  RefreshCw,
  Layers,
  ArrowUpDown,
  FileText,
  TrendingUp,
  Percent,
  Trash2,
  Eye,
  Check
} from 'lucide-react';
import { PlanningActivity, PeriodicPlanRecord, ActivityPlanEntry, ProgressTrackingRecord } from '../../types';
import { EvmEngineService } from '../../services/evmEngineService';
import { ShamsiDatePicker } from '../ShamsiDatePicker';

interface PlanReplanModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  activities: PlanningActivity[];
  currentUser: any;
  onSavePlan: (updatedActivities: PlanningActivity[], record: PeriodicPlanRecord) => void;
}

export default function PlanReplanModal({
  isOpen,
  onClose,
  projectId,
  activities,
  currentUser,
  onSavePlan
}: PlanReplanModalProps) {
  const [activeTab, setActiveTab] = useState<'EDIT' | 'HISTORY'>('EDIT');
  const [periodType, setPeriodType] = useState<'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY'>('WEEKLY');
  const [planDate, setPlanDate] = useState(() => new Date().toLocaleDateString('fa-IR'));
  const [planTitle, setPlanTitle] = useState('');
  const [planNumber, setPlanNumber] = useState('');
  const [revisionReason, setRevisionReason] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Local state for planned progress and weights
  const [plannedValues, setPlannedValues] = useState<Record<string, number>>({});
  const [weightValues, setWeightValues] = useState<Record<string, number>>({});

  // History list of periodic plans
  const [historyPlans, setHistoryPlans] = useState<PeriodicPlanRecord[]>([]);

  // Load progress tracking records to display actuals side-by-side
  const [progressTrackings, setProgressTrackings] = useState<ProgressTrackingRecord[]>([]);

  // Initialize values when opening
  useEffect(() => {
    if (isOpen) {
      const initialPlans: Record<string, number> = {};
      const initialWeights: Record<string, number> = {};

      activities.forEach(act => {
        initialPlans[act.id] = act.plannedProgress || 0;
        initialWeights[act.id] = act.weightPercent || 0;
      });

      setPlannedValues(initialPlans);
      setWeightValues(initialWeights);

      const periodLabels: Record<string, string> = {
        DAILY: 'روزانه',
        WEEKLY: 'هفتگی',
        BIWEEKLY: 'دو‌هفتگی',
        MONTHLY: 'ماهانه'
      };

      const existingPlans = EvmEngineService.getPeriodicPlans(projectId);
      setHistoryPlans(existingPlans);
      const trackings = EvmEngineService.getProgressTrackings(projectId);
      setProgressTrackings(trackings);

      const count = existingPlans.filter(p => p.periodType === periodType).length + 1;
      setPlanNumber(`PLN-${periodType.substring(0, 2)}-${String(count).padStart(2, '0')}`);
      setPlanTitle(`برنامه زمان‌بندی ${periodLabels[periodType]} دوره ${count}`);
    }
  }, [isOpen, activities, projectId]);

  // Update default title/number when periodType changes
  const handlePeriodTypeChange = (type: 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY') => {
    setPeriodType(type);
    const periodLabels: Record<string, string> = {
      DAILY: 'روزانه',
      WEEKLY: 'هفتگی',
      BIWEEKLY: 'دو‌هفتگی',
      MONTHLY: 'ماهانه'
    };
    const count = historyPlans.filter(p => p.periodType === type).length + 1;
    setPlanNumber(`PLN-${type.substring(0, 2)}-${String(count).padStart(2, '0')}`);
    setPlanTitle(`برنامه زمان‌بندی ${periodLabels[type]} دوره ${count}`);
  };

  // Find matching progress tracking record for this period type to compare actuals
  const matchingTrackingRecord = useMemo(() => {
    const matching = progressTrackings.find(
      t => t.reportingPeriod === periodType && t.date === planDate
    );
    if (matching) return matching;

    // Fallback: closest matching period type
    return progressTrackings.find(t => t.reportingPeriod === periodType) || progressTrackings[0] || null;
  }, [progressTrackings, periodType, planDate]);

  // Calculate live weighted planned progress and live variance
  const liveSummary = useMemo(() => {
    let totalWeight = 0;
    let weightedPlanned = 0;
    let weightedActual = 0;

    activities.forEach(act => {
      const w = weightValues[act.id] ?? (act.weightPercent || 1);
      const planned = plannedValues[act.id] ?? (act.plannedProgress || 0);

      // Find actual progress from matching tracking or from activity directly
      const trackingEntry = matchingTrackingRecord?.activityEntries?.find(e => e.activityId === act.id);
      const actual = trackingEntry ? trackingEntry.currentProgress : (act.actualProgress || 0);

      totalWeight += w;
      weightedPlanned += planned * w;
      weightedActual += actual * w;
    });

    const factor = totalWeight > 0 ? totalWeight : 1;
    const finalPlanned = Math.min(100, Math.round((weightedPlanned / factor) * 100) / 100);
    const finalActual = Math.min(100, Math.round((weightedActual / factor) * 100) / 100);
    const variance = Math.round((finalActual - finalPlanned) * 100) / 100;

    return {
      planned: finalPlanned,
      actual: finalActual,
      variance,
      totalWeight: Math.round(totalWeight * 100) / 100,
      isWeightBalanced: Math.abs(totalWeight - 100) < 0.1
    };
  }, [activities, plannedValues, weightValues, matchingTrackingRecord]);

  if (!isOpen) return null;

  const handleSliderChange = (id: string, val: number) => {
    const clamped = Math.min(100, Math.max(0, val));
    setPlannedValues(prev => ({ ...prev, [id]: clamped }));
  };

  const handleWeightChange = (id: string, val: number) => {
    const clamped = Math.max(0, val);
    setWeightValues(prev => ({ ...prev, [id]: clamped }));
  };

  // Auto calculate planned progress according to dates
  const handleAutoDistributeByDate = () => {
    const newPlans: Record<string, number> = {};
    // Extract target timestamp from jalali or use current
    activities.forEach(act => {
      if (act.durationDays && act.durationDays > 0) {
        // Linear approximate distribution
        const current = plannedValues[act.id] ?? act.plannedProgress ?? 0;
        newPlans[act.id] = Math.min(100, Math.max(0, current + 5));
      } else {
        newPlans[act.id] = plannedValues[act.id] ?? act.plannedProgress ?? 0;
      }
    });
    setPlannedValues(newPlans);
  };

  // Reset to initial baseline
  const handleResetToBaseline = () => {
    const initialPlans: Record<string, number> = {};
    activities.forEach(act => {
      initialPlans[act.id] = act.plannedProgress || 0;
    });
    setPlannedValues(initialPlans);
  };

  // Save Plan / Replan
  const handleSave = () => {
    const activityEntries: ActivityPlanEntry[] = activities.map(act => {
      const currentPlan = plannedValues[act.id] ?? (act.plannedProgress || 0);
      const prevPlan = act.plannedProgress || 0;
      const w = weightValues[act.id] ?? (act.weightPercent || 0);

      const trackingEntry = matchingTrackingRecord?.activityEntries?.find(e => e.activityId === act.id);
      const actual = trackingEntry ? trackingEntry.currentProgress : (act.actualProgress || 0);

      return {
        activityId: act.id,
        activityCode: act.code,
        activityTitle: act.title,
        weightPercent: w,
        previousPlannedProgress: prevPlan,
        currentPlannedProgress: currentPlan,
        plannedDelta: Math.round((currentPlan - prevPlan) * 100) / 100,
        actualProgressAtPeriod: actual,
        variancePercent: Math.round((actual - currentPlan) * 100) / 100,
        notes: ''
      };
    });

    const updatedActivities: PlanningActivity[] = activities.map(act => {
      const currentPlan = plannedValues[act.id] ?? (act.plannedProgress || 0);
      const w = weightValues[act.id] ?? (act.weightPercent || 0);
      return {
        ...act,
        plannedProgress: currentPlan,
        weightPercent: w
      };
    });

    const record: PeriodicPlanRecord = {
      id: `plan_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      projectId,
      planNumber: planNumber || `PLN-${Date.now().toString().slice(-4)}`,
      title: planTitle || 'برنامه زمان‌بندی دوره‌ای',
      date: planDate,
      periodType,
      recordedBy: currentUser?.name || 'مدیر برنامه‌ریزی و کنترل پروژه',
      recordedByRole: currentUser?.role || 'کنترل پروژه',
      totalWeightedPlannedProgress: liveSummary.planned,
      totalWeightedActualProgress: liveSummary.actual,
      overallVariance: liveSummary.variance,
      activityEntries,
      revisionReason,
      status: 'APPROVED',
      createdAt: new Date().toISOString()
    };

    // Save in EVM engine & parent
    EvmEngineService.savePeriodicPlan(record);
    onSavePlan(updatedActivities, record);
    onClose();
  };

  // Filter activities
  const filteredActivities = activities.filter(
    act =>
      act.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      act.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-6 lg:p-8 max-w-5xl w-full border border-stone-200/80 dark:border-slate-800 space-y-6 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 dark:border-slate-800 pb-4 shrink-0">
          <div>
            <h3 className="text-lg font-black text-stone-900 dark:text-white flex items-center gap-2">
              <Calendar size={22} className="text-amber-500" />
              ثبت و اصلاح دوره‌ای برنامه زمانی (Plan / Replan)
            </h3>
            <p className="text-xs text-stone-500 dark:text-slate-400 mt-0.5">
              تنظیم درصد پیشرفت برنامه‌ای مصوب به صورت دوره‌ای (روزانه، هفتگی، دو‌هفتگی، ماهانه) و مقایسه بلادرنگ با پیشرفت فیزیکی واقعی
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 dark:hover:text-slate-200 rounded-xl bg-stone-100 dark:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Switch: Form / History */}
        <div className="flex items-center justify-between border-b border-stone-100 dark:border-slate-800 pb-2 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('EDIT')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                activeTab === 'EDIT'
                  ? 'bg-amber-500 text-stone-950 shadow-sm'
                  : 'text-stone-600 dark:text-slate-400 hover:bg-stone-100 dark:hover:bg-slate-800'
              }`}
            >
              <Sliders size={15} />
              ثبت و اصلاح برنامه دوره جاری
            </button>
            <button
              onClick={() => setActiveTab('HISTORY')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                activeTab === 'HISTORY'
                  ? 'bg-amber-500 text-stone-950 shadow-sm'
                  : 'text-stone-600 dark:text-slate-400 hover:bg-stone-100 dark:hover:bg-slate-800'
              }`}
            >
              <History size={15} />
              سوابق برنامه‌های دوره‌ای ثبت شده ({historyPlans.length})
            </button>
          </div>

          {activeTab === 'EDIT' && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetToBaseline}
                className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-stone-700 dark:text-slate-300 text-[11px] font-bold rounded-xl transition-all flex items-center gap-1"
                title="بازنشانی مقادیر به برنامه مبنا"
              >
                <RefreshCw size={12} />
                بازیابی خط مبنا
              </button>
              <button
                type="button"
                onClick={handleAutoDistributeByDate}
                className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[11px] font-black rounded-xl transition-all flex items-center gap-1"
                title="تنظیم خودکار پیشرفت برنامه‌ای متناسب با دوره"
              >
                <Sparkles size={12} />
                توزیع متناسب با دوره
              </button>
            </div>
          )}
        </div>

        {/* TAB 1: EDIT FORM */}
        {activeTab === 'EDIT' ? (
          <div className="space-y-4 flex-1 flex flex-col overflow-hidden">
            {/* Period Selector & Meta Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-stone-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-stone-200/60 dark:border-slate-700/60 shrink-0">
              {/* Period Type Selection */}
              <div>
                <label className="text-[11px] font-black text-stone-500 dark:text-slate-400 mb-1 block">
                  نوع دوره برنامه زمان‌بندی
                </label>
                <div className="grid grid-cols-4 gap-1 p-1 bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-700 rounded-xl">
                  {(['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY'] as const).map(type => {
                    const labels = { DAILY: 'روزانه', WEEKLY: 'هفتگی', BIWEEKLY: '۲هفته', MONTHLY: 'ماهانه' };
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => handlePeriodTypeChange(type)}
                        className={`py-1 text-[10px] font-black rounded-lg transition-all text-center ${
                          periodType === type
                            ? 'bg-amber-500 text-stone-950 shadow-sm'
                            : 'text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white'
                        }`}
                      >
                        {labels[type]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Plan Date */}
              <div>
                <label className="text-[11px] font-black text-stone-500 dark:text-slate-400 mb-1 block">
                  تاریخ مبنای دوره برنامه
                </label>
                <ShamsiDatePicker
                  value={planDate}
                  onChange={setPlanDate}
                  placeholder="1405/06/01"
                  inputClassName="!px-3 !py-2 !bg-white dark:!bg-slate-900 !border-stone-200 dark:!border-slate-700 !rounded-xl !text-xs !font-bold outline-none !text-center"
                />
              </div>

              {/* Plan Title */}
              <div>
                <label className="text-[11px] font-black text-stone-500 dark:text-slate-400 mb-1 block">
                  عنوان برنامه دوره‌ای
                </label>
                <input
                  type="text"
                  value={planTitle}
                  onChange={e => setPlanTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none"
                  placeholder="برنامه هفتگی دوره..."
                />
              </div>

              {/* Revision Reason */}
              <div>
                <label className="text-[11px] font-black text-stone-500 dark:text-slate-400 mb-1 block">
                  علت اصلاح یا توضیحات Replan
                </label>
                <input
                  type="text"
                  value={revisionReason}
                  onChange={e => setRevisionReason(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-700 rounded-xl text-xs font-medium outline-none"
                  placeholder="تنظیم برنامه مبنای هفتگی..."
                />
              </div>
            </div>

            {/* Live Progress & Variance Summary Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 shrink-0">
              <div className="bg-amber-500/10 border border-amber-500/30 p-3.5 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-black text-amber-800 dark:text-amber-300 block">
                    پیشرفت برنامه‌ای دوره (Plan)
                  </span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-xl font-black text-amber-600 dark:text-amber-400">
                      {liveSummary.planned}٪
                    </span>
                    <span className="text-[10px] text-stone-400">مجموع وزنی</span>
                  </div>
                </div>
                <TrendingUp size={24} className="text-amber-500/50" />
              </div>

              <div className="bg-emerald-500/10 border border-emerald-500/30 p-3.5 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-black text-emerald-800 dark:text-emerald-300 block">
                    پیشرفت واقعی ثبت شده در این دوره (Actual)
                  </span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                      {liveSummary.actual}٪
                    </span>
                    <span className="text-[10px] text-stone-400">از ماژول پیشرفت فیزیکی</span>
                  </div>
                </div>
                <CheckCircle2 size={24} className="text-emerald-500/50" />
              </div>

              <div
                className={`border p-3.5 rounded-2xl flex items-center justify-between ${
                  liveSummary.variance >= 0
                    ? 'bg-blue-500/10 border-blue-500/30 text-blue-900 dark:text-blue-200'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-900 dark:text-rose-200'
                }`}
              >
                <div>
                  <span className="text-[11px] font-black block">انحراف برنامه و واقعیت (Variance)</span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-xl font-black">
                      {liveSummary.variance > 0 ? `+${liveSummary.variance}` : liveSummary.variance}٪
                    </span>
                    <span className="text-[10px] font-bold">
                      {liveSummary.variance >= 0 ? 'مطابق / جلوتر از برنامه' : 'دارای تاخیر زمانی'}
                    </span>
                  </div>
                </div>
                <AlertCircle size={24} className="opacity-60" />
              </div>
            </div>

            {/* Activities Table Header with Search */}
            <div className="flex items-center justify-between pt-1 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-stone-700 dark:text-slate-200">
                  اقلام ساختار شکست کار (WBS) و تنظیم پیشرفت برنامه‌ای
                </span>
                <span className="text-[11px] text-stone-400">({filteredActivities.length} فعالیت)</span>
              </div>
              <div className="w-56">
                <input
                  type="text"
                  placeholder="جستجوی کد یا شرح فعالیت..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-1.5 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl text-xs outline-none"
                />
              </div>
            </div>

            {/* Scrollable Activities Table */}
            <div className="flex-1 overflow-y-auto border border-stone-200/80 dark:border-slate-800 rounded-2xl pr-1">
              <table className="w-full text-right text-xs">
                <thead className="bg-stone-50 dark:bg-slate-800/80 text-stone-500 dark:text-slate-400 font-black border-b border-stone-200/80 dark:border-slate-800 sticky top-0 z-10 backdrop-blur-md">
                  <tr>
                    <th className="p-3 w-20">کد WBS</th>
                    <th className="p-3">شرح فعالیت</th>
                    <th className="p-3 text-center w-28">وزن فیزیکی (٪)</th>
                    <th className="p-3 text-center w-64">پیشرفت برنامه‌ای دوره (Plan)</th>
                    <th className="p-3 text-center w-24">پیشرفت واقعی</th>
                    <th className="p-3 text-center w-28">انحراف (Variance)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-slate-800/60">
                  {filteredActivities.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-stone-400">
                        فعالیتی یافت نشد.
                      </td>
                    </tr>
                  ) : (
                    filteredActivities.map(act => {
                      const curPlan = plannedValues[act.id] ?? (act.plannedProgress || 0);
                      const curWeight = weightValues[act.id] ?? (act.weightPercent || 0);

                      const trackingEntry = matchingTrackingRecord?.activityEntries?.find(
                        e => e.activityId === act.id
                      );
                      const actual = trackingEntry ? trackingEntry.currentProgress : (act.actualProgress || 0);
                      const diff = Math.round((actual - curPlan) * 10) / 10;

                      return (
                        <tr key={act.id} className="hover:bg-stone-50/50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="p-3 font-black text-amber-600 dark:text-amber-400">
                            {act.code}
                          </td>
                          <td className="p-3">
                            <div className="font-bold text-stone-900 dark:text-white">{act.title}</div>
                            {act.isCriticalPath && (
                              <span className="text-[10px] text-rose-600 dark:text-rose-400 font-black">
                                مسیر بحرانی
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={curWeight}
                              onChange={e => handleWeightChange(act.id, Number(e.target.value))}
                              className="w-18 p-1.5 text-center bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl font-bold text-xs outline-none focus:ring-1 focus:ring-amber-500"
                            />
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-3">
                              <input
                                type="range"
                                min="0"
                                max="100"
                                step="0.5"
                                value={curPlan}
                                onChange={e => handleSliderChange(act.id, Number(e.target.value))}
                                className="flex-1 accent-amber-500 cursor-pointer h-1.5 bg-stone-200 dark:bg-slate-700 rounded-lg"
                              />
                              <div className="flex items-center gap-1 shrink-0">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.1"
                                  value={curPlan}
                                  onChange={e => handleSliderChange(act.id, Number(e.target.value))}
                                  className="w-16 p-1 text-center bg-amber-50/50 dark:bg-amber-950/20 border border-amber-300/60 dark:border-amber-800/50 rounded-xl font-black text-amber-900 dark:text-amber-200 text-xs outline-none"
                                />
                                <span className="text-[11px] font-bold text-stone-400">٪</span>
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-center font-black text-stone-700 dark:text-slate-300">
                            {actual}٪
                          </td>
                          <td className="p-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-lg text-[11px] font-black ${
                                diff >= 0
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                              }`}
                            >
                              {diff > 0 ? `+${diff}` : diff}٪
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-3 border-t border-stone-100 dark:border-slate-800 shrink-0">
              <span className="text-xs text-stone-400">
                ثبت‌کننده: <strong className="text-stone-700 dark:text-stone-300">{currentUser?.name || 'کنترل پروژه'}</strong>
              </span>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 bg-stone-100 hover:bg-stone-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-stone-700 dark:text-slate-300 rounded-2xl font-black text-xs transition-all"
                >
                  انصراف
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-600 hover:to-amber-500 text-stone-950 rounded-2xl font-black text-xs transition-all shadow-md shadow-amber-500/20 flex items-center gap-1.5 active:scale-95 cursor-pointer"
                >
                  <Check size={16} />
                  ثبت نهایی و به‌روزرسانی برنامه زمانی دوره‌ای
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* TAB 2: HISTORY LIST */
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {historyPlans.length === 0 ? (
              <div className="text-center py-16 bg-stone-50 dark:bg-slate-800/40 rounded-3xl border border-dashed border-stone-200 dark:border-slate-700 space-y-2">
                <Calendar size={36} className="mx-auto text-amber-500/50" />
                <h4 className="text-sm font-black text-stone-800 dark:text-white">
                  هنوز برنامه دوره‌ای ثبت نشده است.
                </h4>
                <p className="text-xs text-stone-400">
                  از تب «ثبت و اصلاح برنامه دوره جاری»، اولین برنامه دوره‌ای (روزانه، هفتگی، ماهانه) را ذخیره نمایید.
                </p>
              </div>
            ) : (
              historyPlans.map(hp => {
                const periodLabels: Record<string, string> = {
                  DAILY: 'روزانه',
                  WEEKLY: 'هفتگی',
                  BIWEEKLY: 'دو‌هفتگی',
                  MONTHLY: 'ماهانه'
                };

                return (
                  <div
                    key={hp.id}
                    className="p-5 bg-stone-50 dark:bg-slate-800/50 rounded-2xl border border-stone-200/70 dark:border-slate-700/60 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="px-2.5 py-1 bg-amber-500 text-stone-950 font-black text-xs rounded-xl">
                          {periodLabels[hp.periodType] || hp.periodType}
                        </span>
                        <span className="font-black text-sm text-stone-900 dark:text-white">
                          {hp.title || hp.planNumber}
                        </span>
                        <span className="text-xs text-stone-400">({hp.planNumber})</span>
                      </div>

                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-stone-400 font-bold dir-ltr">{hp.date}</span>
                        <button
                          onClick={() => {
                            EvmEngineService.deletePeriodicPlan(hp.id);
                            setHistoryPlans(prev => prev.filter(p => p.id !== hp.id));
                          }}
                          className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg transition-colors"
                          title="حذف این رکورد برنامه"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {hp.revisionReason && (
                      <p className="text-xs text-stone-600 dark:text-slate-300 bg-white/60 dark:bg-slate-900/60 p-2.5 rounded-xl border border-stone-200/40 dark:border-slate-800">
                        {hp.revisionReason}
                      </p>
                    )}

                    <div className="grid grid-cols-3 gap-3 pt-2 border-t border-stone-200/50 dark:border-slate-700/50 text-xs">
                      <div>
                        <span className="text-stone-400 text-[10px] block">پیشرفت برنامه‌ای کل</span>
                        <strong className="text-amber-600 dark:text-amber-400 text-sm">
                          {hp.totalWeightedPlannedProgress}٪
                        </strong>
                      </div>
                      <div>
                        <span className="text-stone-400 text-[10px] block">پیشرفت واقعی متناظر</span>
                        <strong className="text-emerald-600 dark:text-emerald-400 text-sm">
                          {hp.totalWeightedActualProgress ?? hp.activityEntries?.[0]?.actualProgressAtPeriod ?? 0}٪
                        </strong>
                      </div>
                      <div>
                        <span className="text-stone-400 text-[10px] block">انحراف کلی</span>
                        <strong
                          className={`text-sm ${
                            (hp.overallVariance ?? 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {(hp.overallVariance ?? 0) > 0
                            ? `+${hp.overallVariance}`
                            : (hp.overallVariance ?? 0)}٪
                        </strong>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
