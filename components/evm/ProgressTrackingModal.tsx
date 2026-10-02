import React, { useState, useMemo, useEffect } from 'react';
import { X, Check, RefreshCw, Calendar, User, FileText, Percent, AlertCircle, Sparkles, Layers, Sliders, CheckCircle2, TrendingUp, FileCheck } from 'lucide-react';
import { PlanningActivity, ProgressTrackingRecord, ActivityProgressEntry, PeriodicPlanRecord } from '../../types';
import { EvmEngineService } from '../../services/evmEngineService';
import { ShamsiDatePicker } from '../ShamsiDatePicker';

interface ProgressTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  activities: PlanningActivity[];
  onSaveProgress: (updatedActivities: PlanningActivity[], record: ProgressTrackingRecord) => void;
  currentUser: any;
  onSyncFromDailyReports?: () => void;
}

export default function ProgressTrackingModal({
  isOpen,
  onClose,
  projectId,
  activities,
  onSaveProgress,
  currentUser,
  onSyncFromDailyReports
}: ProgressTrackingModalProps) {
  const [reportDate, setReportDate] = useState(() => new Date().toLocaleDateString('fa-IR'));
  const [periodType, setPeriodType] = useState<'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY'>('WEEKLY');
  const [observations, setObservations] = useState('');
  const [periodicPlans, setPeriodicPlans] = useState<PeriodicPlanRecord[]>([]);

  // Load existing periodic plans to show matched targets
  useEffect(() => {
    if (isOpen) {
      setPeriodicPlans(EvmEngineService.getPeriodicPlans(projectId));
    }
  }, [isOpen, projectId]);

  // Find matching periodic plan for this period type
  const matchingPlan = useMemo(() => {
    return periodicPlans.find(p => p.periodType === periodType && p.date === reportDate) ||
      periodicPlans.find(p => p.periodType === periodType) ||
      null;
  }, [periodicPlans, periodType, reportDate]);

  // Local state of activity actual progress percentages
  const [progressValues, setProgressValues] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    activities.forEach(act => {
      initial[act.id] = act.actualProgress || 0;
    });
    return initial;
  });

  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  // Function to fetch weighted physical progress from latest approved & locked statement
  const handleSyncFromApprovedStatement = () => {
    try {
      const cbsStmts = JSON.parse(localStorage.getItem('hamyar_cbs_statements') || '[]');
      const regStmts = JSON.parse(localStorage.getItem('hamyar_statements') || '[]');
      const conStmts = JSON.parse(localStorage.getItem('hamyar_contractor_statements') || '[]');

      const allStatements = [...cbsStmts, ...regStmts, ...conStmts];
      const projectStatements = allStatements.filter((s: any) =>
        String(s.projectId).trim() === String(projectId).trim()
      );

      if (projectStatements.length === 0) {
        setSyncNotice('هیچ صورت‌وضعیت ثبت‌شده‌ای برای این پروژه یافت نشد.');
        return;
      }

      // Filter for approved and/or locked statements
      const approvedAndLocked = projectStatements.filter((s: any) => {
        const isLocked = Boolean(s.isFinalFrozen || s.frozen || s.isFrozen || s.finalFrozen || s.isLocked || s.locked);
        const statusRaw = s.status || s.workflowStatus || (s.workflowHistory?.length ? s.workflowHistory[s.workflowHistory.length - 1]?.toStatus : '');
        const status = String(statusRaw || '').trim().toUpperCase();
        const statusFa = String(statusRaw || '').trim();

        const isApproved =
          status === 'APPROVED_BY_EMPLOYER' ||
          status === 'FINAL_APPROVED' ||
          status === 'FINAL_APPROVE' ||
          status === 'PAID' ||
          status === 'APPROVED' ||
          status === 'CONFIRMED' ||
          statusFa.includes('تایید نهایی') ||
          statusFa.includes('تایید کارفرما') ||
          statusFa.includes('مصوب کارفرما') ||
          statusFa.includes('Frozen') ||
          statusFa.includes('منجمد') ||
          statusFa.includes('قطعی') ||
          isLocked;

        return isApproved && status !== 'REJECTED' && !statusFa.includes('رد شده');
      });

      const candidateList = approvedAndLocked.length > 0 ? approvedAndLocked : projectStatements;

      // Sort by date / number descending to find latest
      const sorted = [...candidateList].sort((a: any, b: any) => {
        const dateA = a.date || a.statementDate || a.periodEndDate || a.createdAt || '';
        const dateB = b.date || b.statementDate || b.periodEndDate || b.createdAt || '';
        return dateB.localeCompare(dateA);
      });

      const latestStmt = sorted[0];

      if (!latestStmt) {
        setSyncNotice('هیچ صورت‌وضعیت معتبری یافت نشد.');
        return;
      }

      // Read cbsNodes to resolve titles/codes
      const cbsNodes = JSON.parse(localStorage.getItem('hamyar_cbs_nodes') || '[]');
      const projNodes = cbsNodes.filter((n: any) => String(n.projectId).trim() === String(projectId).trim());

      const progressMap: Record<string, number> = {};

      // If CBS statements, calculate cumulative progress up to latest statement
      const targetCbsStmts = cbsStmts
        .filter((s: any) => String(s.projectId).trim() === String(projectId).trim())
        .sort((a: any, b: any) => (a.number || 0) - (b.number || 0));

      targetCbsStmts.forEach((s: any) => {
        const items = s.values || s.items || s.rows || [];
        if (Array.isArray(items)) {
          items.forEach((v: any) => {
            const node = projNodes.find((n: any) => n.id === v.cbsId);
            const code = node ? node.code : v.cbsCode;
            const val = Number(
              v.employerProgressPercent !== undefined && v.employerProgressPercent !== null
                ? v.employerProgressPercent
                : (v.consultantProgressPercent !== undefined && v.consultantProgressPercent !== null
                    ? v.consultantProgressPercent
                    : (v.currentProgressPercent || 0))
            );
            
            if (code) {
              const normCode = String(code).trim().toLowerCase();
              progressMap[normCode] = (progressMap[normCode] || 0) + val;
            }
            if (v.cbsId) {
              progressMap[v.cbsId] = (progressMap[v.cbsId] || 0) + val;
            }
          });
        }
      });

      // Also check items directly in latestStmt
      const rawItems = latestStmt.values || latestStmt.items || latestStmt.rows || [];
      if (Array.isArray(rawItems)) {
        rawItems.forEach((v: any) => {
          const code = v.cbsCode || v.itemCode || v.code || v.cbsId;
          const cumP = Number(
            v.cumulativeProgressPercent ||
            v.employerProgressPercent ||
            v.consultantProgressPercent ||
            v.currentProgressPercent ||
            0
          );
          if (code && cumP > 0) {
            const normCode = String(code).trim().toLowerCase();
            progressMap[normCode] = Math.max(progressMap[normCode] || 0, cumP);
          }
        });
      }

      // Map to progressValues for each activity
      const newProgress: Record<string, number> = { ...progressValues };
      let updatedCount = 0;

      activities.forEach(act => {
        const cleanCode = String(act.code || '').trim().toLowerCase();
        const cleanTitle = String(act.title || '').trim().toLowerCase();
        
        let foundVal: number | undefined = undefined;

        if (progressMap[cleanCode] !== undefined) {
          foundVal = progressMap[cleanCode];
        } else if (act.cbsNodeId && progressMap[act.cbsNodeId] !== undefined) {
          foundVal = progressMap[act.cbsNodeId];
        } else {
          const node = projNodes.find((n: any) =>
            String(n.code).trim().toLowerCase() === cleanCode ||
            String(n.title).trim().toLowerCase() === cleanTitle
          );
          if (node) {
            if (progressMap[node.id] !== undefined) foundVal = progressMap[node.id];
            else if (progressMap[String(node.code).trim().toLowerCase()] !== undefined) foundVal = progressMap[String(node.code).trim().toLowerCase()];
          }
        }

        if (foundVal !== undefined) {
          newProgress[act.id] = Math.min(100, Math.max(0, Math.round(foundVal * 10) / 10));
          updatedCount++;
        }
      });

      setProgressValues(newProgress);
      const stmtNum = latestStmt.number || latestStmt.recordNumber || latestStmt.id;
      setSyncNotice(`درصد پیشرفت ${updatedCount} ردیف فعالیت بر اساس آخرین صورت‌وضعیت مصوب کارفرما (شماره ${stmtNum}) فراخوانی و درج گردید.`);
    } catch (err) {
      console.error('Error syncing from approved statement:', err);
      setSyncNotice('خطا در فراخوانی اطلاعات صورت‌وضعیت.');
    }
  };

  // Calculate live weighted physical progress
  const liveWeightedProgress = useMemo(() => {
    let totalWeight = 0;
    let weightedActual = 0;
    let weightedPlanned = 0;

    activities.forEach(act => {
      const w = act.weightPercent || 1;
      const actActual = progressValues[act.id] ?? (act.actualProgress || 0);

      // Extract planned progress from matching periodic plan or default activity plannedProgress
      const planEntry = matchingPlan?.activityEntries?.find(e => e.activityId === act.id);
      const actPlanned = planEntry ? planEntry.currentPlannedProgress : (act.plannedProgress || 0);

      totalWeight += w;
      weightedActual += actActual * w;
      weightedPlanned += actPlanned * w;
    });

    const factor = totalWeight > 0 ? totalWeight : 1;
    const finalActual = Math.min(100, Math.round((weightedActual / factor) * 100) / 100);
    const finalPlanned = Math.min(100, Math.round((weightedPlanned / factor) * 100) / 100);
    const variance = Math.round((finalActual - finalPlanned) * 100) / 100;

    return {
      actual: finalActual,
      planned: finalPlanned,
      variance,
      totalWeight: Math.round(totalWeight * 100) / 100
    };
  }, [activities, progressValues, matchingPlan]);

  if (!isOpen) return null;

  const handleSliderChange = (id: string, val: number) => {
    const clamped = Math.min(100, Math.max(0, val));
    setProgressValues(prev => ({ ...prev, [id]: clamped }));
  };

  const handleSave = () => {
    const activityEntries: ActivityProgressEntry[] = activities.map(act => {
      const current = progressValues[act.id] ?? (act.actualProgress || 0);
      const prev = act.actualProgress || 0;
      return {
        activityId: act.id,
        activityCode: act.code,
        activityTitle: act.title,
        weightPercent: act.weightPercent || 0,
        previousProgress: prev,
        currentProgress: current,
        progressDelta: Math.round((current - prev) * 100) / 100,
        notes: ''
      };
    });

    const updatedActivities: PlanningActivity[] = activities.map(act => {
      const current = progressValues[act.id] ?? (act.actualProgress || 0);
      let status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'DELAYED' = act.status;
      if (current >= 100) {
        status = 'COMPLETED';
      } else if (current > 0) {
        status = current < act.plannedProgress - 10 ? 'DELAYED' : 'IN_PROGRESS';
      } else {
        status = 'NOT_STARTED';
      }

      return {
        ...act,
        actualProgress: current,
        status
      };
    });

    const record: ProgressTrackingRecord = {
      id: `ptr_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      projectId,
      recordNumber: `PT-${Date.now().toString().slice(-5)}`,
      date: reportDate,
      recordedBy: currentUser?.name || 'مدیر کنترل پروژه / سرپرست کارگاه',
      recordedByRole: currentUser?.role || 'کنترل پروژه',
      reportingPeriod: periodType,
      totalWeightedPlannedProgress: liveWeightedProgress.planned,
      totalWeightedActualProgress: liveWeightedProgress.actual,
      activityEntries,
      siteObservations: observations,
      status: 'APPROVED',
      createdAt: new Date().toISOString()
    };

    // Save through engine service and parent callback
    EvmEngineService.saveProgressTracking(record);
    onSaveProgress(updatedActivities, record);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-6 lg:p-8 max-w-4xl w-full border border-stone-200/80 dark:border-slate-800 space-y-6 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 dark:border-slate-800 pb-4 shrink-0">
          <div>
            <h3 className="text-lg font-black text-stone-900 dark:text-white flex items-center gap-2">
              <Sliders size={20} className="text-amber-500" />
              فرم ثبت و ردیابی پیشرفت فیزیکی فعالیت‌ها (Progress Tracking)
            </h3>
            <p className="text-xs text-stone-500 dark:text-slate-400 mt-0.5">
              ثبت پیشرفت فیزیکی دوره‌ای توسط مدیر سایت و کنترل پروژه و محاسبه وزن‌دار پیشرفت کل
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 dark:hover:text-slate-200 rounded-xl bg-stone-100 dark:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Top Controls & Live Summary Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0 bg-stone-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-stone-200/60 dark:border-slate-700/60">
          <div>
            <label className="text-[11px] font-black text-stone-500 dark:text-slate-400 mb-1 block">تاریخ ثبت گزارش</label>
            <ShamsiDatePicker
              value={reportDate}
              onChange={setReportDate}
              inputClassName="!px-3 !py-2 !bg-white dark:!bg-slate-900 !border-stone-200 dark:!border-slate-700 !rounded-xl !text-xs !font-bold outline-none !text-center"
            />
          </div>

          <div>
            <label className="text-[11px] font-black text-stone-500 dark:text-slate-400 mb-1 block">دوره گزارش‌گیری</label>
            <select
              value={periodType}
              onChange={e => setPeriodType(e.target.value as any)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none"
            >
              <option value="DAILY">روزانه</option>
              <option value="WEEKLY">هفتگی</option>
              <option value="BIWEEKLY">دو‌هفتگی</option>
              <option value="MONTHLY">ماهانه</option>
            </select>
          </div>

          {/* Live Progress Preview & Actions */}
          <div className="bg-gradient-to-r from-amber-500/10 to-amber-600/10 border border-amber-500/30 p-3 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-black text-amber-700 dark:text-amber-300 block">پیشرفت فیزیکی کل (وزن‌دار)</span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-xl font-black text-amber-600 dark:text-amber-400">{liveWeightedProgress.actual}٪</span>
                <span className="text-[10px] text-stone-400">برنامه‌ای: {liveWeightedProgress.planned}٪</span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap justify-end">
              <button
                type="button"
                onClick={handleSyncFromApprovedStatement}
                className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white font-black text-[10px] rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                title="فراخوانی درصد وزنی و پیشرفت ردیف‌ها از آخرین صورت‌وضعیت تایید شده و قفل شده"
              >
                <FileCheck size={14} />
                فراخوانی از آخرین صورت‌وضعیت تاییدشده
              </button>
            </div>
          </div>
        </div>

        {/* Sync Notification Banner */}
        {syncNotice && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-2xl text-xs font-bold flex items-center justify-between gap-2 shrink-0 animate-fadeIn">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-emerald-600 flex-shrink-0" />
              <span>{syncNotice}</span>
            </div>
            <button
              onClick={() => setSyncNotice(null)}
              className="text-emerald-500 hover:text-emerald-800 p-1 cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Activity Progress Inputs List (Scrollable) */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {activities.length === 0 ? (
            <div className="text-center py-12 text-stone-400 text-xs">
              فعالیتی برای این پروژه ثبت نشده است.
            </div>
          ) : (
            activities.map(act => {
              const currentVal = progressValues[act.id] ?? (act.actualProgress || 0);
              const prevVal = act.actualProgress || 0;
              const delta = currentVal - prevVal;

              const planEntry = matchingPlan?.activityEntries?.find(e => e.activityId === act.id);
              const targetPlanned = planEntry ? planEntry.currentPlannedProgress : (act.plannedProgress || 0);
              const diffFromPlan = Math.round((currentVal - targetPlanned) * 10) / 10;

              return (
                <div
                  key={act.id}
                  className="p-4 bg-stone-50/70 dark:bg-slate-800/40 rounded-2xl border border-stone-200/70 dark:border-slate-800 hover:border-amber-400/40 transition-all space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="px-2.5 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-black rounded-lg">
                        {act.code}
                      </span>
                      <h4 className="text-xs font-black text-stone-900 dark:text-white">{act.title}</h4>
                      <span className="text-[10px] font-bold text-stone-400">
                        (وزن فیزیکی: {act.weightPercent}٪)
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-[11px] text-stone-500 dark:text-slate-400">
                        برنامه‌ای ({matchingPlan ? matchingPlan.planNumber : 'مبنا'}): <strong className="text-amber-600 dark:text-amber-400">{targetPlanned}٪</strong>
                      </span>
                      <span className="text-[11px] text-stone-400">قبلی: {prevVal}٪</span>
                      <span
                        className={`text-[11px] font-black px-1.5 py-0.5 rounded-md ${
                          diffFromPlan >= 0
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                        }`}
                        title="انحراف از برنامه زمان‌بندی این دوره"
                      >
                        انحراف: {diffFromPlan > 0 ? `+${diffFromPlan}` : diffFromPlan}٪
                      </span>
                    </div>
                  </div>

                  {/* Slider & Direct Input */}
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="0.5"
                      value={currentVal}
                      onChange={e => handleSliderChange(act.id, Number(e.target.value))}
                      className="flex-1 accent-amber-500 cursor-pointer h-2 bg-stone-200 dark:bg-slate-700 rounded-lg"
                    />
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={currentVal}
                        onChange={e => handleSliderChange(act.id, Number(e.target.value))}
                        className="w-16 px-2 py-1 text-center bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-700 rounded-xl text-xs font-black text-stone-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500/30"
                      />
                      <span className="text-xs font-bold text-stone-500">٪</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Notes & Observations */}
        <div className="shrink-0 space-y-1.5">
          <label className="text-xs font-black text-stone-600 dark:text-slate-300">
            توضیحات و مشاهدات سرپرست کارگاه / کنترل پروژه
          </label>
          <input
            type="text"
            value={observations}
            onChange={e => setObservations(e.target.value)}
            placeholder="مثال: بتن‌ریزی پارت ۲ فونداسیون به اتمام رسید و آرماتوربندی ستون‌ها آغاز گردید..."
            className="w-full px-4 py-2.5 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-2xl text-xs font-bold outline-none"
          />
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100 dark:border-slate-800 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-stone-100 hover:bg-stone-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-stone-700 dark:text-slate-300 text-xs font-black rounded-2xl transition-all"
          >
            انصراف
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-600 hover:to-amber-500 text-stone-950 font-black text-xs rounded-2xl shadow-md shadow-amber-500/20 transition-all flex items-center gap-2 active:scale-95"
          >
            <CheckCircle2 size={16} />
            ثبت پیشرفت فیزیکی و به‌روزرسانی EVM
          </button>
        </div>
      </div>
    </div>
  );
}
