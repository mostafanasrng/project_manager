import React, { useState, useEffect } from 'react';
import { X, Calendar, BarChart3, TrendingUp } from 'lucide-react';
import { WeeklyMonthlyHseReport, HseKpiStats } from '../../types/hse';
import { SystemUser } from '../../types';
import { ShamsiDatePicker } from '../ShamsiDatePicker';

interface PeriodicReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (report: WeeklyMonthlyHseReport) => void;
  initialReport?: WeeklyMonthlyHseReport | null;
  projectId: string;
  currentUser: SystemUser | null;
}

export const PeriodicReportModal: React.FC<PeriodicReportModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialReport,
  projectId,
  currentUser
}) => {
  const [reportType, setReportType] = useState<'WEEKLY' | 'MONTHLY'>('MONTHLY');
  const [reportNumber, setReportNumber] = useState('');
  const [reportDate, setReportDate] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [summary, setSummary] = useState('');
  const [highlights, setHighlights] = useState('');
  const [challenges, setChallenges] = useState('');
  const [plannedTrainings, setPlannedTrainings] = useState('');

  // KPI fields
  const [safeManHours, setSafeManHours] = useState(48500);
  const [ltifr, setLtifr] = useState(0);
  const [ltisr, setLtisr] = useState(0);
  const [permitsIssued, setPermitsIssued] = useState(24);
  const [toolboxTalksCount, setToolboxTalksCount] = useState(18);
  const [toolboxTalksAttendees, setToolboxTalksAttendees] = useState(195);
  const [nearMissCount, setNearMissCount] = useState(4);
  const [firstAidCount, setFirstAidCount] = useState(1);
  const [lostTimeIncidents, setLostTimeIncidents] = useState(0);
  const [unsafeActsReported, setUnsafeActsReported] = useState(12);
  const [unsafeConditionsReported, setUnsafeConditionsReported] = useState(7);
  const [ppeComplianceRate, setPpeComplianceRate] = useState(96);

  useEffect(() => {
    if (initialReport) {
      setReportType(initialReport.reportType);
      setReportNumber(initialReport.reportNumber);
      setReportDate(initialReport.reportDate);
      setPeriodStart(initialReport.periodStart);
      setPeriodEnd(initialReport.periodEnd);
      setSummary(initialReport.summary);
      setHighlights(initialReport.highlights || '');
      setChallenges(initialReport.challenges || '');
      setPlannedTrainings(initialReport.plannedTrainings || '');

      if (initialReport.kpiStats) {
        setSafeManHours(initialReport.kpiStats.safeManHours || 0);
        setLtifr(initialReport.kpiStats.ltifr || 0);
        setLtisr(initialReport.kpiStats.ltisr || 0);
        setPermitsIssued(initialReport.kpiStats.permitsIssued || 0);
        setToolboxTalksCount(initialReport.kpiStats.toolboxTalksCount || 0);
        setToolboxTalksAttendees(initialReport.kpiStats.toolboxTalksAttendees || 0);
        setNearMissCount(initialReport.kpiStats.nearMissCount || 0);
        setFirstAidCount(initialReport.kpiStats.firstAidCount || 0);
        setLostTimeIncidents(initialReport.kpiStats.lostTimeIncidents || 0);
        setUnsafeActsReported(initialReport.kpiStats.unsafeActsReported || 0);
        setUnsafeConditionsReported(initialReport.kpiStats.unsafeConditionsReported || 0);
        setPpeComplianceRate(initialReport.kpiStats.ppeComplianceRate || 95);
      }
    } else {
      const today = new Date().toLocaleDateString('fa-IR');
      setReportDate(today);
      setReportNumber(`REP-M-${Date.now().toString().slice(-4)}`);
      setPeriodStart('1403/02/01');
      setPeriodEnd('1403/02/31');
      setSummary('');
      setHighlights('');
      setChallenges('');
      setPlannedTrainings('');
    }
  }, [initialReport]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary.trim()) {
      alert('لطفاً خلاصه عملکرد دوره را وارد فرمایید.');
      return;
    }

    const kpiStats: HseKpiStats = {
      safeManHours: Number(safeManHours),
      totalManHours: Number(safeManHours),
      lostTimeIncidents: Number(lostTimeIncidents),
      ltifr: Number(ltifr),
      ltisr: Number(ltisr),
      nearMissCount: Number(nearMissCount),
      firstAidCount: Number(firstAidCount),
      permitsIssued: Number(permitsIssued),
      toolboxTalksCount: Number(toolboxTalksCount),
      toolboxTalksAttendees: Number(toolboxTalksAttendees),
      unsafeActsReported: Number(unsafeActsReported),
      unsafeConditionsReported: Number(unsafeConditionsReported),
      ppeComplianceRate: Number(ppeComplianceRate)
    };

    const data: WeeklyMonthlyHseReport = {
      id: initialReport ? initialReport.id : `rep_${Date.now()}`,
      projectId,
      reportNumber,
      reportType,
      reportDate,
      periodStart,
      periodEnd,
      kpiStats,
      summary,
      highlights,
      challenges,
      plannedTrainings,
      workflowStatus: initialReport ? initialReport.workflowStatus : ('DRAFT' as any),
      createdById: initialReport ? initialReport.createdById : (currentUser?.id || 'admin'),
      workflowHistory: initialReport ? initialReport.workflowHistory : []
    };

    onSave(data);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[160] bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fadeIn" dir="rtl">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-stone-200 dark:border-slate-800 w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-2xl p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-stone-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-black">
              <BarChart3 size={22} />
            </div>
            <div>
              <h3 className="font-black text-base md:text-lg text-stone-900 dark:text-white">
                {initialReport ? 'ویرایش گزارش دوره‌ای HSE' : 'ثبت گزارش دوره‌ای ایمنی و بهداشت (هفتگی / ماهانه)'}
              </h3>
              <p className="text-[11px] font-bold text-stone-500 dark:text-slate-400">
                پایش شاخص‌های عملکردی کلیدی (KPIs)، نفر-ساعت کارکرد ایمن و ضرایب حوادث
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-stone-400 hover:text-stone-600 dark:hover:text-white rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-bold">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-stone-700 dark:text-slate-300 mb-1">نوع دوره گزارش:</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value as any)}
                className="w-full p-2.5 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl font-bold text-stone-900 dark:text-white outline-none"
              >
                <option value="MONTHLY">گزارش ماهانه (Monthly HSE Report)</option>
                <option value="WEEKLY">گزارش هفتگی (Weekly HSE Report)</option>
              </select>
            </div>

            <div>
              <label className="block text-stone-700 dark:text-slate-300 mb-1">شماره گزارش:</label>
              <input
                type="text"
                value={reportNumber}
                onChange={(e) => setReportNumber(e.target.value)}
                required
                className="w-full p-2.5 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl font-bold text-stone-900 dark:text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-stone-700 dark:text-slate-300 mb-1">از تاریخ (شروع دوره):</label>
              <ShamsiDatePicker
                value={periodStart}
                onChange={setPeriodStart}
                placeholder="1403/02/01"
                required
                inputClassName="!p-2.5 !bg-stone-50 dark:!bg-slate-800 !border-stone-200 dark:!border-slate-700 !rounded-xl !font-bold !text-stone-900 dark:!text-white outline-none !text-center"
              />
            </div>

            <div>
              <label className="block text-stone-700 dark:text-slate-300 mb-1">تا تاریخ (پایان دوره):</label>
              <ShamsiDatePicker
                value={periodEnd}
                onChange={setPeriodEnd}
                placeholder="1403/02/31"
                required
                inputClassName="!p-2.5 !bg-stone-50 dark:!bg-slate-800 !border-stone-200 dark:!border-slate-700 !rounded-xl !font-bold !text-stone-900 dark:!text-white outline-none !text-center"
              />
            </div>
          </div>

          {/* KPI Dashboard inputs */}
          <div className="border border-stone-200 dark:border-slate-700 rounded-2xl p-4 bg-stone-50/50 dark:bg-slate-800/40 space-y-3">
            <span className="font-black text-xs text-stone-800 dark:text-white block flex items-center gap-1.5">
              <TrendingUp size={16} className="text-amber-600" />
              ورود مقادیر شاخص‌های عملکردی کلیدی (HSE KPIs):
            </span>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <span className="text-[10px] text-stone-500 block">نفر-ساعت ایمن (بدون حادثه):</span>
                <input
                  type="number"
                  value={safeManHours}
                  onChange={(e) => setSafeManHours(Number(e.target.value))}
                  className="w-full p-2 bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold"
                />
              </div>

              <div>
                <span className="text-[10px] text-stone-500 block">نرخ تکرار حادثه (LTIFR):</span>
                <input
                  type="number"
                  step="0.01"
                  value={ltifr}
                  onChange={(e) => setLtifr(Number(e.target.value))}
                  className="w-full p-2 bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold"
                />
              </div>

              <div>
                <span className="text-[10px] text-stone-500 block">تعداد پرمیت‌های کار صادرشده:</span>
                <input
                  type="number"
                  value={permitsIssued}
                  onChange={(e) => setPermitsIssued(Number(e.target.value))}
                  className="w-full p-2 bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold"
                />
              </div>

              <div>
                <span className="text-[10px] text-stone-500 block">تعداد جلسات آموزشی TBM:</span>
                <input
                  type="number"
                  value={toolboxTalksCount}
                  onChange={(e) => setToolboxTalksCount(Number(e.target.value))}
                  className="w-full p-2 bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold"
                />
              </div>

              <div>
                <span className="text-[10px] text-stone-500 block">نفرات آموزش‌دیده در TBM:</span>
                <input
                  type="number"
                  value={toolboxTalksAttendees}
                  onChange={(e) => setToolboxTalksAttendees(Number(e.target.value))}
                  className="w-full p-2 bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold"
                />
              </div>

              <div>
                <span className="text-[10px] text-stone-500 block">شبه‌حوادث ثبت‌شده (Near Miss):</span>
                <input
                  type="number"
                  value={nearMissCount}
                  onChange={(e) => setNearMissCount(Number(e.target.value))}
                  className="w-full p-2 bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold"
                />
              </div>

              <div>
                <span className="text-[10px] text-stone-500 block">حوادث ناتوان‌کننده (LTI):</span>
                <input
                  type="number"
                  value={lostTimeIncidents}
                  onChange={(e) => setLostTimeIncidents(Number(e.target.value))}
                  className="w-full p-2 bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold"
                />
              </div>

              <div>
                <span className="text-[10px] text-stone-500 block">درصد انطباق PPE کارگران (%):</span>
                <input
                  type="number"
                  value={ppeComplianceRate}
                  onChange={(e) => setPpeComplianceRate(Number(e.target.value))}
                  className="w-full p-2 bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-stone-700 dark:text-slate-300 mb-1">خلاصه وضعیت و اهم رویدادهای HSE در این دوره:</label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={3}
              placeholder="شرح کلی از بازرسی‌ها، ممیزی‌ها، اقدامات اصلاحی و عملکرد پیمانکاران..."
              required
              className="w-full p-2.5 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl font-bold text-stone-900 dark:text-white outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-stone-700 dark:text-slate-300 mb-1">دستاوردهای برجسته دوره:</label>
              <textarea
                value={highlights}
                onChange={(e) => setHighlights(e.target.value)}
                rows={2}
                placeholder="مثال: صفر بودن حوادث در بتن‌ریزی سنگین..."
                className="w-full p-2.5 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl font-bold text-stone-900 dark:text-white outline-none resize-none"
              />
            </div>
            <div>
              <label className="block text-stone-700 dark:text-slate-300 mb-1">چالش‌ها و ریسک‌های جاری:</label>
              <textarea
                value={challenges}
                onChange={(e) => setChallenges(e.target.value)}
                rows={2}
                placeholder="مثال: نیاز به ارتقای داربست‌های مدولار..."
                className="w-full p-2.5 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl font-bold text-stone-900 dark:text-white outline-none resize-none"
              />
            </div>
            <div>
              <label className="block text-stone-700 dark:text-slate-300 mb-1">برنامه‌های آموزشی دوره آتی:</label>
              <textarea
                value={plannedTrainings}
                onChange={(e) => setPlannedTrainings(e.target.value)}
                rows={2}
                placeholder="مثال: آموزش کار در ارتفاع برای پیمانکاران جدید..."
                className="w-full p-2.5 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl font-bold text-stone-900 dark:text-white outline-none resize-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-stone-100 dark:bg-slate-800 hover:bg-stone-200 dark:hover:bg-slate-700 text-stone-600 dark:text-slate-300 rounded-xl font-bold text-xs cursor-pointer"
            >
              انصراف
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer"
            >
              {initialReport ? 'بروزرسانی گزارش دوره‌ای' : 'ثبت نهایی گزارش دوره‌ای'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
