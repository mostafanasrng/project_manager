import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Calendar,
  AlertTriangle,
  Clock,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  CheckCircle2,
  Lock,
  Unlock,
  Sliders,
  History,
  Info,
  CalendarDays,
  FileCheck2,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { PlanningActivity, Project, ReplanRecord, ReplanActivityEntry } from '../../types';
import {
  getTodayShamsi,
  parseShamsiDate,
  jalaliToDayNumber,
  dayNumberToJalali,
  addDaysToShamsiDate,
  calculateShamsiDayDiff,
  compareShamsiDates
} from '../../utils/dateUtils';
import { ShamsiDatePicker } from '../ShamsiDatePicker';

interface ProjectReplanModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  activities: PlanningActivity[];
  currentUser: any;
  onApplyReplan: (updatedActivities: PlanningActivity[], record: ReplanRecord) => void;
  canUnlockReplan?: boolean;
}

export default function ProjectReplanModal({
  isOpen,
  onClose,
  project,
  activities,
  currentUser,
  onApplyReplan,
  canUnlockReplan
}: ProjectReplanModalProps) {
  const [activeTab, setActiveTab] = useState<'REPLAN' | 'HISTORY'>('REPLAN');
  const [approvedNoticeNumber, setApprovedNoticeNumber] = useState('');
  const [reason, setReason] = useState('تمدید مدت اولیه پیمان و بازتنظیم زمان‌بندی فعالیت‌های باقیمانده ناشی از تاخیرات پروژه');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);
  const [forceUnlocked, setForceUnlocked] = useState(() => {
    try {
      return localStorage.getItem(`hamyar_replan_unlocked_${project?.id}`) === 'true';
    } catch {
      return false;
    }
  });

  const isSupervisoryRole = useMemo(() => {
    if (canUnlockReplan !== undefined) return canUnlockReplan;
    const r = currentUser?.role || localStorage.getItem('user_role') || '';
    const ot = currentUser?.orgType || '';
    return r === 'SYSTEM_ADMIN' || r.includes('EMPLOYER') || r.includes('CONSULTANT') || ot === 'EMPLOYER' || ot === 'CONSULTANT' || localStorage.getItem('current_username') === 'admin';
  }, [canUnlockReplan, currentUser]);

  // Today's system date
  const todayShamsi = useMemo(() => getTodayShamsi(), []);

  // Contract end date evaluation
  const contractEndDate = project?.endDate || '1403/12/29';
  const contractStatus = useMemo(() => {
    const today = parseShamsiDate(todayShamsi);
    const end = parseShamsiDate(contractEndDate);

    if (!today || !end) {
      return { isExpired: true, daysDiff: 0 };
    }

    const todayDay = jalaliToDayNumber(today.year, today.month, today.day);
    const endDay = jalaliToDayNumber(end.year, end.month, end.day);
    const diff = todayDay - endDay;

    return {
      isExpired: diff >= 0,
      daysDiff: Math.abs(diff)
    };
  }, [todayShamsi, contractEndDate]);

  // Is Replan unlocked? Either contract is expired or user manually unlocked
  const isReplanUnlocked = contractStatus.isExpired || forceUnlocked;

  // Stored state for editable activities in Replan
  const [replanEntries, setReplanEntries] = useState<Record<string, {
    revisedStartDate: string;
    revisedEndDate: string;
    revisedDuration: number;
    extensionDays: number;
    isCustomized: boolean;
  }>>({});

  // History of Replan records
  const [replanHistory, setReplanHistory] = useState<ReplanRecord[]>([]);

  // Calculate default smart suggested dates for an incomplete activity
  const calculateSmartSuggestedDates = (act: PlanningActivity) => {
    const actual = act.actualProgress || 0;
    const remaining = Math.max(0, 100 - actual);
    const origDuration = act.durationDays || calculateShamsiDayDiff(act.baselineStartDate, act.baselineEndDate) || 30;

    // Remaining duration needed based on remaining percentage
    const neededDays = Math.max(10, Math.ceil(origDuration * (remaining / 100)));

    // Revised start date:
    // If activity not started (0%), starts today.
    // If activity in progress (>0%), work continues from today or actual start.
    let revisedStart = todayShamsi;
    if (actual > 0 && act.actualStartDate) {
      // Check if actual start is earlier than today
      if (compareShamsiDates(act.actualStartDate, todayShamsi) <= 0) {
        revisedStart = todayShamsi; // remaining portion scheduled from today
      }
    }

    const revisedEnd = addDaysToShamsiDate(revisedStart, neededDays);
    const extension = calculateShamsiDayDiff(act.baselineEndDate, revisedEnd);

    return {
      revisedStartDate: revisedStart,
      revisedEndDate: revisedEnd,
      revisedDuration: neededDays,
      extensionDays: extension,
      isCustomized: false
    };
  };

  // Initialize or reset entries when modal opens or activities change
  useEffect(() => {
    if (isOpen) {
      const initial: Record<string, any> = {};
      activities.forEach(act => {
        if ((act.actualProgress || 0) < 100) {
          // If already has revised dates from prior replan, use them; otherwise smart calculate
          if (act.revisedStartDate && act.revisedEndDate) {
            initial[act.id] = {
              revisedStartDate: act.revisedStartDate,
              revisedEndDate: act.revisedEndDate,
              revisedDuration: act.durationDays || calculateShamsiDayDiff(act.revisedStartDate, act.revisedEndDate),
              extensionDays: calculateShamsiDayDiff(act.baselineEndDate, act.revisedEndDate),
              isCustomized: true
            };
          } else {
            initial[act.id] = calculateSmartSuggestedDates(act);
          }
        }
      });
      setReplanEntries(initial);

      // Load history
      try {
        const savedHistory = localStorage.getItem(`hamyar_replan_records_${project.id}`);
        if (savedHistory) {
          setReplanHistory(JSON.parse(savedHistory));
        } else {
          setReplanHistory([]);
        }
      } catch (e) {
        setReplanHistory([]);
      }
    }
  }, [isOpen, activities, project.id, todayShamsi]);

  // Separate incomplete and completed activities
  const incompleteActivities = useMemo(() => {
    return activities.filter(a => (a.actualProgress || 0) < 100);
  }, [activities]);

  const completedActivities = useMemo(() => {
    return activities.filter(a => (a.actualProgress || 0) >= 100);
  }, [activities]);

  // Handlers for manual modifications
  const handleStartDateChange = (actId: string, newStart: string) => {
    setReplanEntries(prev => {
      const current = prev[actId];
      if (!current) return prev;
      const duration = current.revisedDuration || 30;
      const newEnd = addDaysToShamsiDate(newStart, duration);
      const act = activities.find(a => a.id === actId);
      const origEnd = act?.baselineEndDate || newEnd;
      const extension = calculateShamsiDayDiff(origEnd, newEnd);

      return {
        ...prev,
        [actId]: {
          ...current,
          revisedStartDate: newStart,
          revisedEndDate: newEnd,
          extensionDays: extension,
          isCustomized: true
        }
      };
    });
  };

  const handleEndDateChange = (actId: string, newEnd: string) => {
    setReplanEntries(prev => {
      const current = prev[actId];
      if (!current) return prev;
      const start = current.revisedStartDate;
      const newDuration = Math.max(1, calculateShamsiDayDiff(start, newEnd));
      const act = activities.find(a => a.id === actId);
      const origEnd = act?.baselineEndDate || newEnd;
      const extension = calculateShamsiDayDiff(origEnd, newEnd);

      return {
        ...prev,
        [actId]: {
          ...current,
          revisedEndDate: newEnd,
          revisedDuration: newDuration,
          extensionDays: extension,
          isCustomized: true
        }
      };
    });
  };

  const handleDurationChange = (actId: string, duration: number) => {
    const val = Math.max(1, duration || 1);
    setReplanEntries(prev => {
      const current = prev[actId];
      if (!current) return prev;
      const newEnd = addDaysToShamsiDate(current.revisedStartDate, val);
      const act = activities.find(a => a.id === actId);
      const origEnd = act?.baselineEndDate || newEnd;
      const extension = calculateShamsiDayDiff(origEnd, newEnd);

      return {
        ...prev,
        [actId]: {
          ...current,
          revisedDuration: val,
          revisedEndDate: newEnd,
          extensionDays: extension,
          isCustomized: true
        }
      };
    });
  };

  // Reset a single activity to smart auto calculation
  const handleResetActivity = (act: PlanningActivity) => {
    const smart = calculateSmartSuggestedDates(act);
    setReplanEntries(prev => ({
      ...prev,
      [act.id]: smart
    }));
  };

  // Reset all activities to smart auto calculation
  const handleResetAllToSmart = () => {
    const recalculated: Record<string, any> = {};
    incompleteActivities.forEach(act => {
      recalculated[act.id] = calculateSmartSuggestedDates(act);
    });
    setReplanEntries(recalculated);
  };

  // Overall Replan Metrics
  const replanSummary = useMemo(() => {
    let maxEndDate = contractEndDate;
    let maxExtension = 0;
    let totalAffected = 0;

    incompleteActivities.forEach(act => {
      const entry = replanEntries[act.id];
      if (entry) {
        totalAffected++;
        if (compareShamsiDates(entry.revisedEndDate, maxEndDate) > 0) {
          maxEndDate = entry.revisedEndDate;
        }
        if (entry.extensionDays > maxExtension) {
          maxExtension = entry.extensionDays;
        }
      }
    });

    const overallExtension = calculateShamsiDayDiff(contractEndDate, maxEndDate);

    return {
      newProjectedEndDate: maxEndDate,
      overallExtensionDays: overallExtension,
      maxActivityExtension: maxExtension,
      affectedCount: totalAffected,
      completedCount: completedActivities.length
    };
  }, [incompleteActivities, completedActivities, replanEntries, contractEndDate]);

  // Apply Replan
  const handleApply = () => {
    const activityEntries: ReplanActivityEntry[] = incompleteActivities.map(act => {
      const entry = replanEntries[act.id] || calculateSmartSuggestedDates(act);
      return {
        activityId: act.id,
        code: act.code,
        title: act.title,
        originalStartDate: act.originalBaselineStartDate || act.baselineStartDate,
        originalEndDate: act.originalBaselineEndDate || act.baselineEndDate,
        originalDuration: act.originalDurationDays || act.durationDays,
        actualProgressAtReplan: act.actualProgress || 0,
        remainingProgress: Math.max(0, 100 - (act.actualProgress || 0)),
        revisedStartDate: entry.revisedStartDate,
        revisedEndDate: entry.revisedEndDate,
        revisedDuration: entry.revisedDuration,
        extensionDays: entry.extensionDays,
        weightPercent: act.weightPercent || 0
      };
    });

    const nextRevisionNum = replanHistory.length + 1;

    const record: ReplanRecord = {
      id: `replan_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      projectId: project.id,
      revisionNumber: nextRevisionNum,
      replanDate: todayShamsi,
      contractEndDateOriginal: contractEndDate,
      newProjectedEndDate: replanSummary.newProjectedEndDate,
      totalExtensionDays: replanSummary.overallExtensionDays,
      approvedNoticeNumber: approvedNoticeNumber.trim() || `REPLAN-${String(nextRevisionNum).padStart(2, '0')}`,
      reason: reason.trim(),
      recordedBy: currentUser?.name || 'مدیر برنامه‌ریزی و کنترل پروژه',
      recordedByRole: currentUser?.role || 'کنترل پروژه',
      affectedActivitiesCount: incompleteActivities.length,
      activityEntries,
      createdAt: new Date().toISOString()
    };

    // Save history
    const updatedHistory = [record, ...replanHistory];
    setReplanHistory(updatedHistory);
    try {
      localStorage.setItem(`hamyar_replan_records_${project.id}`, JSON.stringify(updatedHistory));
    } catch (e) {
      console.error(e);
    }

    // Map updated activities
    const updatedActivities: PlanningActivity[] = activities.map(act => {
      const entry = replanEntries[act.id];
      if (entry && (act.actualProgress || 0) < 100) {
        return {
          ...act,
          originalBaselineStartDate: act.originalBaselineStartDate || act.baselineStartDate,
          originalBaselineEndDate: act.originalBaselineEndDate || act.baselineEndDate,
          originalDurationDays: act.originalDurationDays || act.durationDays,
          baselineStartDate: entry.revisedStartDate,
          baselineEndDate: entry.revisedEndDate,
          durationDays: entry.revisedDuration,
          revisedStartDate: entry.revisedStartDate,
          revisedEndDate: entry.revisedEndDate,
          replanRevisionCount: (act.replanRevisionCount || 0) + 1,
          status: act.actualProgress > 0 ? 'IN_PROGRESS' : 'NOT_STARTED'
        };
      }
      return act;
    });

    onApplyReplan(updatedActivities, record);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-3 sm:p-4 bg-stone-950/75 backdrop-blur-md animate-fadeIn text-right" dir="rtl">
      <div className="bg-white dark:bg-stone-900 rounded-3xl shadow-2xl p-5 sm:p-7 max-w-6xl w-full border border-stone-200/90 dark:border-stone-800 space-y-5 max-h-[94vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 dark:bg-amber-400/10 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
              <RefreshCw size={24} className="animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-stone-900 dark:text-white">
                  بازبرنامه‌ریزی پروژه و تمدید زمان‌بندی (Replan)
                </h3>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full font-black bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
                  نسخه {replanHistory.length + 1}
                </span>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                شناسایی هوشمند فعالیت‌های ناتمام، محاسبه خودکار میزان جلو رفتن تاریخ‌ها بر اساس پیشرفت واقعی و امکان ویرایش دستی
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-xl bg-stone-100 dark:bg-stone-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs: Replan Workspace / History */}
        <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-2 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('REPLAN')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'REPLAN'
                  ? 'bg-amber-500 text-stone-950 shadow-md shadow-amber-500/20'
                  : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
              }`}
            >
              <Sliders size={15} />
              میز کار بازبرنامه‌ریزی (Replan Workspace)
            </button>
            <button
              onClick={() => setActiveTab('HISTORY')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'HISTORY'
                  ? 'bg-amber-500 text-stone-950 shadow-md shadow-amber-500/20'
                  : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
              }`}
            >
              <History size={15} />
              سوابق و نسخه‌های مصوب ({replanHistory.length})
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-stone-400 font-bold">تاریخ روز سیستم:</span>
            <span className="font-black px-2.5 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 rounded-lg border border-amber-200 dark:border-amber-900/40">
              {todayShamsi}
            </span>
          </div>
        </div>

        {/* TAB 1: REPLAN WORKSPACE */}
        {activeTab === 'REPLAN' && (
          <div className="flex-1 overflow-y-auto space-y-4 pr-1 pl-1">
            
            {/* Contract Expiration Status Banner */}
            <div className={`p-4 rounded-2xl border transition-all ${
              contractStatus.isExpired
                ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50'
                : forceUnlocked
                ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/50'
                : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start sm:items-center gap-3">
                  <div className={`p-2.5 rounded-xl shrink-0 ${
                    contractStatus.isExpired
                      ? 'bg-amber-500 text-stone-950'
                      : forceUnlocked
                      ? 'bg-blue-500 text-white'
                      : 'bg-rose-500 text-white'
                  }`}>
                    {contractStatus.isExpired ? (
                      <AlertTriangle size={20} />
                    ) : forceUnlocked ? (
                      <Unlock size={20} />
                    ) : (
                      <Lock size={20} />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-xs text-stone-900 dark:text-white">
                        {contractStatus.isExpired ? (
                          'وضعیت قرارداد: مدت اولیه به اتمام رسیده است (بخش Replan فعال شد)'
                        ) : forceUnlocked ? (
                          'بازبرنامه‌ریزی دستی (Replan پیش از انقضای قرارداد با مجوز مدیر)'
                        ) : (
                          'بخش Replan غیرفعال است (مدت اولیه قرارداد هنوز به اتمام نرسیده است)'
                        )}
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-600 dark:text-stone-300 mt-0.5 leading-relaxed">
                      تاریخ پایان مصوب قرارداد: <strong className="font-bold">{contractEndDate}</strong>
                      {contractStatus.isExpired ? (
                        <> — مدت اولیه قرارداد به پایان رسیده و پروژه نیازمند زمان‌بندی جبرانی است (<strong className="text-amber-700 dark:text-amber-300">{contractStatus.daysDiff} روز تاخیر زمانی</strong>).</>
                      ) : (
                        <> — هنوز <strong className="text-rose-700 dark:text-rose-300">{contractStatus.daysDiff} روز</strong> تا اتمام مدت اولیه قرارداد باقی مانده است.</>
                      )}
                    </p>
                  </div>
                </div>

                {!contractStatus.isExpired && isSupervisoryRole && (
                  <button
                    onClick={() => {
                      const next = !forceUnlocked;
                      setForceUnlocked(next);
                      try {
                        localStorage.setItem(`hamyar_replan_unlocked_${project.id}`, String(next));
                      } catch (e) {}
                    }}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 self-end sm:self-center cursor-pointer border shadow-xs bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 border-stone-300 dark:border-stone-700 hover:border-amber-400"
                  >
                    {forceUnlocked ? <Lock size={14} /> : <Unlock size={14} className="text-amber-500" />}
                    {forceUnlocked ? 'قفل مجدد' : 'باز کردن قفل Replan (مشاور / کارفرما)'}
                  </button>
                )}
              </div>
            </div>

            {/* If Locked, show guidance notice */}
            {!isReplanUnlocked && (
              <div className="p-8 text-center bg-stone-50 dark:bg-stone-800/50 rounded-3xl border border-stone-200 dark:border-stone-800 space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-stone-200 dark:bg-stone-700 flex items-center justify-center mx-auto text-stone-500 dark:text-stone-300">
                  <Lock size={28} />
                </div>
                <h4 className="font-black text-sm text-stone-800 dark:text-stone-200">
                  ماژول بازبرنامه‌ریزی (Replan) تا روز پایان مدت قرارداد برای پیمانکار قفل است
                </h4>
                <p className="text-xs text-stone-500 dark:text-stone-400 max-w-lg mx-auto leading-relaxed">
                  طبق ضوابط نظام فنی و اجرایی، بازبرنامه‌ریزی جامع (Replan) برای پیمانکار تا موعد اتمام تاریخ قرارداد منقضی و قفل است.
                  {isSupervisoryRole ? (
                    <> شما به عنوان نماینده مشاور/کارفرما می‌توانید از دکمه «باز کردن قفل Replan» در بالا جهت صدور مجوز استفاده فرمایید.</>
                  ) : (
                    <> تنها دستگاه نظارت (مهندس مشاور) و کارفرما صلاحیت بازگشایی قفل بازبرنامه‌ریزی پیش از موعد را دارند.</>
                  )}
                </p>
              </div>
            )}

            {/* Replan Content when unlocked */}
            {isReplanUnlocked && (
              <>
                {/* Metric Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 bg-stone-50 dark:bg-stone-800/60 rounded-2xl border border-stone-200/80 dark:border-stone-800">
                    <span className="text-[10px] text-stone-500 dark:text-stone-400 font-bold block">فعالیت‌های ناتمام</span>
                    <span className="text-base font-black text-amber-600 dark:text-amber-400 mt-0.5 block">
                      {incompleteActivities.length} فعالیت
                    </span>
                    <span className="text-[9px] text-stone-400 font-medium mt-0.5 block">
                      {completedActivities.length} فعالیت کامل شده (۱۰۰٪)
                    </span>
                  </div>

                  <div className="p-3.5 bg-stone-50 dark:bg-stone-800/60 rounded-2xl border border-stone-200/80 dark:border-stone-800">
                    <span className="text-[10px] text-stone-500 dark:text-stone-400 font-bold block">تاریخ اولیه قرارداد</span>
                    <span className="text-base font-black text-stone-800 dark:text-stone-200 mt-0.5 block">
                      {contractEndDate}
                    </span>
                    <span className="text-[9px] text-stone-400 font-medium mt-0.5 block">
                      پایان مصوب اولیه
                    </span>
                  </div>

                  <div className="p-3.5 bg-stone-50 dark:bg-stone-800/60 rounded-2xl border border-stone-200/80 dark:border-stone-800">
                    <span className="text-[10px] text-stone-500 dark:text-stone-400 font-bold block">تاریخ جدید پیشنهادی اتمام</span>
                    <span className="text-base font-black text-blue-600 dark:text-blue-400 mt-0.5 block">
                      {replanSummary.newProjectedEndDate}
                    </span>
                    <span className="text-[9px] text-blue-500/80 font-bold mt-0.5 block">
                      بر مبنای دورترین مسیر
                    </span>
                  </div>

                  <div className="p-3.5 bg-stone-50 dark:bg-stone-800/60 rounded-2xl border border-stone-200/80 dark:border-stone-800">
                    <span className="text-[10px] text-stone-500 dark:text-stone-400 font-bold block">تمدید زمان مورد نیاز</span>
                    <span className="text-base font-black text-rose-600 dark:text-rose-400 mt-0.5 block">
                      +{replanSummary.overallExtensionDays} روز
                    </span>
                    <span className="text-[9px] text-stone-400 font-medium mt-0.5 block">
                      جلو رفتن تاریخ نهایی
                    </span>
                  </div>
                </div>

                {/* Form metadata (Notice Number & Reason) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-stone-50/70 dark:bg-stone-800/40 rounded-2xl border border-stone-200/80 dark:border-stone-800">
                  <div>
                    <label className="text-[11px] font-black text-stone-700 dark:text-stone-300 block mb-1">
                      شماره مصوبه / ابلاغیه تمدید قرارداد:
                    </label>
                    <input
                      type="text"
                      value={approvedNoticeNumber}
                      onChange={e => setApprovedNoticeNumber(e.target.value)}
                      placeholder="مثال: ۱۲۴۰/ص/۱۴۰۵ (اختیاری)"
                      className="w-full text-xs font-bold p-2.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-black text-stone-700 dark:text-stone-300 block mb-1">
                      علت و مبنای بازبرنامه‌ریزی:
                    </label>
                    <input
                      type="text"
                      value={reason}
                      onChange={e => setReason(e.target.value)}
                      placeholder="علت تمدید و بازتنظیم برنامه"
                      className="w-full text-xs font-bold p-2.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Table Control Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-xs text-stone-900 dark:text-white">
                      لیست فعالیت‌های نیازمند بازبرنامه‌ریزی ({incompleteActivities.length})
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold">
                      محاسبه خودکار سیستم فعال است
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleResetAllToSmart}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 transition-all flex items-center gap-1.5 cursor-pointer"
                      title="محاسبه مجدد خودکار سیستم برای تمام فعالیت‌ها"
                    >
                      <RotateCcw size={13} className="text-amber-500" />
                      محاسبه مجدد هوشمند همه
                    </button>

                    <button
                      onClick={() => setShowCompleted(!showCompleted)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 transition-all flex items-center gap-1 cursor-pointer"
                    >
                      {showCompleted ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      {showCompleted ? 'مخفی‌سازی تکمیل‌شده‌ها' : 'مشاهده تکمیل‌شده‌ها'}
                    </button>
                  </div>
                </div>

                {/* Replan Incomplete Activities Table */}
                <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-stone-50 dark:bg-stone-800/70 text-stone-600 dark:text-stone-300 font-black border-b border-stone-200 dark:border-stone-800">
                        <tr>
                          <th className="p-3 w-16">کد</th>
                          <th className="p-3 min-w-[160px]">عنوان فعالیت</th>
                          <th className="p-3 text-center w-24">پیشرفت واقعی</th>
                          <th className="p-3 text-center w-28">شروع و پایان اولیه</th>
                          <th className="p-3 text-center min-w-[140px]">تاریخ شروع جدید</th>
                          <th className="p-3 text-center min-w-[140px]">تاریخ پایان جدید</th>
                          <th className="p-3 text-center w-24">مدت جدید (روز)</th>
                          <th className="p-3 text-center w-24">جلو رفتن تاریخ</th>
                          <th className="p-3 text-center w-16">بازنشانی</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100 dark:divide-stone-800/60">
                        {incompleteActivities.map(act => {
                          const entry = replanEntries[act.id] || calculateSmartSuggestedDates(act);
                          const remaining = Math.max(0, 100 - (act.actualProgress || 0));

                          return (
                            <tr key={act.id} className="hover:bg-amber-50/20 dark:hover:bg-amber-950/10 transition-colors">
                              <td className="p-3 font-mono font-bold text-stone-500">
                                {act.code}
                              </td>

                              <td className="p-3">
                                <span className="font-black text-stone-900 dark:text-white block">
                                  {act.title}
                                </span>
                                <span className="text-[10px] text-stone-400 font-medium">
                                  وزن: {act.weightPercent}% | باقیمانده کار: {remaining}%
                                </span>
                              </td>

                              <td className="p-3 text-center">
                                <div className="inline-flex flex-col items-center">
                                  <span className="font-black text-amber-600 dark:text-amber-400 text-xs">
                                    {act.actualProgress || 0}%
                                  </span>
                                  <div className="w-16 h-1.5 bg-stone-100 dark:bg-stone-800 rounded-full mt-1 overflow-hidden">
                                    <div
                                      className="h-full bg-amber-500 rounded-full"
                                      style={{ width: `${Math.min(100, act.actualProgress || 0)}%` }}
                                    />
                                  </div>
                                </div>
                              </td>

                              <td className="p-3 text-center text-[10px] text-stone-500">
                                <div>ش: {act.baselineStartDate}</div>
                                <div>پ: {act.baselineEndDate}</div>
                                <div className="text-stone-400">({act.durationDays} روز)</div>
                              </td>

                              {/* Manual & Smart editable Start Date */}
                              <td className="p-2.5 text-center">
                                <div className="max-w-[130px] mx-auto">
                                  <ShamsiDatePicker
                                    value={entry.revisedStartDate}
                                    onChange={val => handleStartDateChange(act.id, val)}
                                    placeholder="شروع جدید"
                                    className="w-full text-xs"
                                  />
                                </div>
                              </td>

                              {/* Manual & Smart editable End Date */}
                              <td className="p-2.5 text-center">
                                <div className="max-w-[130px] mx-auto">
                                  <ShamsiDatePicker
                                    value={entry.revisedEndDate}
                                    onChange={val => handleEndDateChange(act.id, val)}
                                    placeholder="پایان جدید"
                                    className="w-full text-xs"
                                  />
                                </div>
                              </td>

                              {/* Manual & Smart editable Duration */}
                              <td className="p-2.5 text-center">
                                <input
                                  type="number"
                                  min="1"
                                  value={entry.revisedDuration}
                                  onChange={e => handleDurationChange(act.id, parseInt(e.target.value, 10))}
                                  className="w-16 p-1.5 text-center font-bold text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg outline-none focus:border-amber-500"
                                />
                              </td>

                              {/* Days shifted / Extension */}
                              <td className="p-3 text-center font-black">
                                <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] ${
                                  entry.extensionDays > 0
                                    ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40'
                                    : 'bg-stone-50 text-stone-600 dark:bg-stone-800 dark:text-stone-300'
                                }`}>
                                  {entry.extensionDays > 0 ? `+${entry.extensionDays} روز` : 'بدون تاخیر'}
                                </span>
                              </td>

                              {/* Reset Button */}
                              <td className="p-3 text-center">
                                <button
                                  onClick={() => handleResetActivity(act)}
                                  className="p-1.5 text-stone-400 hover:text-amber-500 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                                  title="محاسبه مجدد هوشمند این فعالیت"
                                >
                                  <RotateCcw size={14} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Optional Completed Activities List */}
                {showCompleted && completedActivities.length > 0 && (
                  <div className="bg-stone-50 dark:bg-stone-800/40 rounded-2xl border border-stone-200/80 dark:border-stone-800 p-4 space-y-2">
                    <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 size={16} />
                      فعالیت‌های تکمیل‌شده (۱۰۰٪ پیشرفت واقعی - نیازمند بازبرنامه‌ریزی نیستند):
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {completedActivities.map(c => (
                        <div key={c.id} className="p-2.5 bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700 flex items-center justify-between">
                          <span className="font-bold text-stone-700 dark:text-stone-200">{c.code} - {c.title}</span>
                          <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400">۱۰۰٪ کامل</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* TAB 2: REPLAN HISTORY */}
        {activeTab === 'HISTORY' && (
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 pl-1">
            {replanHistory.length === 0 ? (
              <div className="p-12 text-center bg-stone-50 dark:bg-stone-800/50 rounded-3xl border border-stone-200 dark:border-stone-800 space-y-2">
                <History size={32} className="mx-auto text-stone-400" />
                <h4 className="font-black text-stone-700 dark:text-stone-300 text-sm">هیچ سابقه بازبرنامه‌ریزی برای این پروژه ثبت نشده است</h4>
                <p className="text-xs text-stone-400">
                  اولین برنامه بازنگری‌شده (Replan) پس از ثبت در این بخش نمایش داده خواهد شد.
                </p>
              </div>
            ) : (
              replanHistory.map((rec, idx) => (
                <div key={rec.id} className="p-4 bg-stone-50 dark:bg-stone-800/60 rounded-2xl border border-stone-200 dark:border-stone-700 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-200 dark:border-stone-700 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-stone-900 dark:text-white text-sm">
                          برنامه بازنگری‌شده نسخه {rec.revisionNumber}
                        </span>
                        {rec.approvedNoticeNumber && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                            ابلاغیه: {rec.approvedNoticeNumber}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                        ثبت شده توسط: {rec.recordedBy} ({rec.recordedByRole || 'کنترل پروژه'}) در تاریخ {rec.replanDate}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                      <div>
                        <span className="text-stone-400 block text-[10px]">تاریخ اتمام جدید:</span>
                        <strong className="text-blue-600 font-bold">{rec.newProjectedEndDate}</strong>
                      </div>
                      <div>
                        <span className="text-stone-400 block text-[10px]">تمدید زمان:</span>
                        <strong className="text-rose-600 font-bold">+{rec.totalExtensionDays} روز</strong>
                      </div>
                    </div>
                  </div>

                  {rec.reason && (
                    <div className="text-xs text-stone-600 dark:text-stone-300 bg-white dark:bg-stone-900 p-2.5 rounded-xl border border-stone-200/80 dark:border-stone-800">
                      <span className="font-black text-stone-700 dark:text-stone-200">علت بازبرنامه‌ریزی: </span>
                      {rec.reason}
                    </div>
                  )}

                  <div className="text-xs text-stone-500 font-medium">
                    تعداد فعالیت‌های بازتنظیم‌شده: <strong>{rec.affectedActivitiesCount} فعالیت</strong>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="border-t border-stone-100 dark:border-stone-800 pt-4 flex items-center justify-between gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-2xl text-xs font-black text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
          >
            بستن
          </button>

          {activeTab === 'REPLAN' && isReplanUnlocked && (
            <button
              onClick={handleApply}
              className="px-6 py-2.5 rounded-2xl text-xs font-black bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <FileCheck2 size={16} />
              ثبت و اعمال برنامه بازنگری‌شده (Replan Baseline)
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
