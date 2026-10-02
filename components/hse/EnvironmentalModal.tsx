import React, { useState, useEffect } from 'react';
import { X, Trees, Plus, Trash2 } from 'lucide-react';
import { EnvironmentalReport, EnvironmentalAspect, ENVIRONMENTAL_ASPECT_LABELS } from '../../types/hse';
import { SystemUser } from '../../types';
import { ShamsiDatePicker } from '../ShamsiDatePicker';

interface EnvironmentalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (report: EnvironmentalReport) => void;
  initialReport?: EnvironmentalReport | null;
  projectId: string;
  currentUser: SystemUser | null;
}

export const EnvironmentalModal: React.FC<EnvironmentalModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialReport,
  projectId,
  currentUser
}) => {
  const [reportNumber, setReportNumber] = useState('');
  const [aspect, setAspect] = useState<EnvironmentalAspect>('WASTE_MANAGEMENT');
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [reportDate, setReportDate] = useState('');
  const [inspectorName, setInspectorName] = useState('');
  const [complianceStatus, setComplianceStatus] = useState<'COMPLIANT' | 'NON_COMPLIANT' | 'OBSERVATION'>('COMPLIANT');
  const [observations, setObservations] = useState('');
  const [recommendedActions, setRecommendedActions] = useState('');

  // Quantified indicators
  const [hazardousWasteTons, setHazardousWasteTons] = useState<number>(0.2);
  const [generalWasteTons, setGeneralWasteTons] = useState<number>(1.5);
  const [recycledPercentage, setRecycledPercentage] = useState<number>(45);
  const [dustSuppressionSprays, setDustSuppressionSprays] = useState<number>(3);
  const [dripTraysCount, setDripTraysCount] = useState<number>(8);
  const [averageDecibels, setAverageDecibels] = useState<number>(72);

  useEffect(() => {
    if (initialReport) {
      setReportNumber(initialReport.reportNumber);
      setAspect(initialReport.aspect);
      setTitle(initialReport.title);
      setLocation(initialReport.location);
      setReportDate(initialReport.reportDate);
      setInspectorName(initialReport.inspectorName);
      setComplianceStatus(initialReport.complianceStatus);
      setObservations(initialReport.observations);
      setRecommendedActions(initialReport.recommendedActions || '');

      if (initialReport.wasteMetrics) {
        setHazardousWasteTons(initialReport.wasteMetrics.hazardousWasteTons || 0);
        setGeneralWasteTons(initialReport.wasteMetrics.generalWasteTons || 0);
        setRecycledPercentage(initialReport.wasteMetrics.recycledPercentage || 0);
      }
    } else {
      const today = new Date().toLocaleDateString('fa-IR');
      setReportDate(today);
      setReportNumber(`ENV-${Date.now().toString().slice(-4)}`);
      setTitle('');
      setLocation('');
      setInspectorName(currentUser?.fullName || currentUser?.username || 'کارشناس محیط زیست کارگاه');
      setObservations('');
      setRecommendedActions('');
    }
  }, [initialReport, currentUser]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !observations.trim()) {
      alert('لطفاً عنوان و مشاهدات بازرسی محیط زیست را وارد فرمایید.');
      return;
    }

    const data: EnvironmentalReport = {
      id: initialReport ? initialReport.id : `env_${Date.now()}`,
      projectId,
      reportNumber,
      aspect,
      title,
      location,
      reportDate,
      inspectorName,
      complianceStatus,
      observations,
      recommendedActions,
      wasteMetrics: {
        hazardousWasteTons: Number(hazardousWasteTons),
        generalWasteTons: Number(generalWasteTons),
        recycledPercentage: Number(recycledPercentage)
      },
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
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-black">
              <Trees size={22} />
            </div>
            <div>
              <h3 className="font-black text-base md:text-lg text-stone-900 dark:text-white">
                {initialReport ? 'ویرایش گزارش پایش محیط زیست' : 'ثبت گزارش پایش و ارزیابی محیط زیست (ISO 14001)'}
              </h3>
              <p className="text-[11px] font-bold text-stone-500 dark:text-slate-400">
                پایش آلاینده‌ها، مدیریت پسماند، کنترل گرد و غبار و حفاظت از منابع طبیعی کارگاه
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-stone-400 hover:text-stone-600 dark:hover:text-white rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-bold">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-stone-700 dark:text-slate-300 mb-1">جنبه زیست‌محیطی (Aspect):</label>
              <select
                value={aspect}
                onChange={(e) => setAspect(e.target.value as EnvironmentalAspect)}
                className="w-full p-2.5 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl font-bold text-stone-900 dark:text-white outline-none"
              >
                {Object.entries(ENVIRONMENTAL_ASPECT_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
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
              <label className="block text-stone-700 dark:text-slate-300 mb-1">وضعیت انطباق:</label>
              <select
                value={complianceStatus}
                onChange={(e) => setComplianceStatus(e.target.value as any)}
                className="w-full p-2.5 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl font-bold text-stone-900 dark:text-white outline-none"
              >
                <option value="COMPLIANT">منطبق و رضایت‌بخش (Compliant)</option>
                <option value="OBSERVATION">مشاهده و نیاز به بهبود (Observation)</option>
                <option value="NON_COMPLIANT">عدم انطباق زیست‌محیطی (Non-Compliant)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="block text-stone-700 dark:text-slate-300 mb-1">عنوان بازرسی / پایش:</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثال: پایش آلاینده‌های هوا و آب‌پاشی محوطه سنگ‌شکن"
                required
                className="w-full p-2.5 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl font-bold text-stone-900 dark:text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-stone-700 dark:text-slate-300 mb-1">محل کارگاهی:</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="مثال: تاسیسات سنگ‌شکن و دپوی خاک"
                required
                className="w-full p-2.5 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl font-bold text-stone-900 dark:text-white outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-stone-700 dark:text-slate-300 mb-1">نام کارشناس / بازرس محیط زیست:</label>
              <input
                type="text"
                value={inspectorName}
                onChange={(e) => setInspectorName(e.target.value)}
                required
                className="w-full p-2.5 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl font-bold text-stone-900 dark:text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-stone-700 dark:text-slate-300 mb-1">تاریخ بازرسی:</label>
              <ShamsiDatePicker
                value={reportDate}
                onChange={setReportDate}
                placeholder="1403/02/10"
                inputClassName="!p-2.5 !bg-stone-50 dark:!bg-slate-800 !border-stone-200 dark:!border-slate-700 !rounded-xl !font-bold !text-stone-900 dark:!text-white outline-none !text-center"
              />
            </div>
          </div>

          {/* Environmental Indicators Strip */}
          <div className="border border-stone-200 dark:border-slate-700 rounded-2xl p-3.5 bg-stone-50/50 dark:bg-slate-800/40 space-y-2">
            <span className="font-black text-xs text-stone-800 dark:text-white block">
              شاخص‌های کمی پایش زیست‌محیطی دوره:
            </span>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <span className="text-[10px] text-stone-500 block">پسماند خطرناک تولیدی (تن):</span>
                <input
                  type="number"
                  step="0.05"
                  value={hazardousWasteTons}
                  onChange={(e) => setHazardousWasteTons(Number(e.target.value))}
                  className="w-full p-2 bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold"
                />
              </div>
              <div>
                <span className="text-[10px] text-stone-500 block">پسماند عادی و ساختمانی (تن):</span>
                <input
                  type="number"
                  step="0.1"
                  value={generalWasteTons}
                  onChange={(e) => setGeneralWasteTons(Number(e.target.value))}
                  className="w-full p-2 bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold"
                />
              </div>
              <div>
                <span className="text-[10px] text-stone-500 block">درصد بازیافت پسماند (%):</span>
                <input
                  type="number"
                  value={recycledPercentage}
                  onChange={(e) => setRecycledPercentage(Number(e.target.value))}
                  className="w-full p-2 bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold"
                />
              </div>
              <div>
                <span className="text-[10px] text-stone-500 block">تعداد نوبت آب‌پاشی خاک:</span>
                <input
                  type="number"
                  value={dustSuppressionSprays}
                  onChange={(e) => setDustSuppressionSprays(Number(e.target.value))}
                  className="w-full p-2 bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold"
                />
              </div>
              <div>
                <span className="text-[10px] text-stone-500 block">تعداد سینی قطره‌گیر فعال:</span>
                <input
                  type="number"
                  value={dripTraysCount}
                  onChange={(e) => setDripTraysCount(Number(e.target.value))}
                  className="w-full p-2 bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold"
                />
              </div>
              <div>
                <span className="text-[10px] text-stone-500 block">تراز متوسط صوت محیطی (dB):</span>
                <input
                  type="number"
                  value={averageDecibels}
                  onChange={(e) => setAverageDecibels(Number(e.target.value))}
                  className="w-full p-2 bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-stone-700 dark:text-slate-300 mb-1">شرح دقیق مشاهدات میدانی و شرایط محیطی:</label>
            <textarea
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              rows={2}
              placeholder="شرح پایش پسماندها، نشت روغن یا سوخت، غلظت گرد و غبار، نحوه نگهداری مواد..."
              required
              className="w-full p-2.5 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl font-bold text-stone-900 dark:text-white outline-none resize-none"
            />
          </div>

          <div>
            <label className="block text-stone-700 dark:text-slate-300 mb-1">اقدامات اصلاحی و توصیه‌های زیست‌محیطی:</label>
            <textarea
              value={recommendedActions}
              onChange={(e) => setRecommendedActions(e.target.value)}
              rows={2}
              placeholder="دستورالعمل‌های اصلاحی لازم برای عوامل اجرایی..."
              className="w-full p-2.5 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl font-bold text-stone-900 dark:text-white outline-none resize-none"
            />
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
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer"
            >
              {initialReport ? 'بروزرسانی گزارش محیط زیست' : 'ثبت نهایی گزارش محیط زیست'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
