import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, Plus, Trash2 } from 'lucide-react';
import { IncidentReport, IncidentType, INCIDENT_TYPE_LABELS, CorrectiveActionItem } from '../../types/hse';
import { SystemUser } from '../../types';
import { ShamsiDatePicker } from '../ShamsiDatePicker';

interface IncidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (incident: IncidentReport) => void;
  initialIncident?: IncidentReport | null;
  projectId: string;
  currentUser: SystemUser | null;
}

export const IncidentModal: React.FC<IncidentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialIncident,
  projectId,
  currentUser
}) => {
  const [incidentNumber, setIncidentNumber] = useState('');
  const [incidentType, setIncidentType] = useState<IncidentType>('NEAR_MISS');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [incidentDate, setIncidentDate] = useState('');
  const [incidentTime, setIncidentTime] = useState('10:30');
  const [severity, setSeverity] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM');
  const [lostWorkDays, setLostWorkDays] = useState(0);

  // Injured Person info
  const [hasInjured, setHasInjured] = useState(false);
  const [injuredName, setInjuredName] = useState('');
  const [injuredRole, setInjuredRole] = useState('');
  const [injuredCompany, setInjuredCompany] = useState('');
  const [injuryType, setInjuryType] = useState('');
  const [bodyPart, setBodyPart] = useState('');
  const [medicalTreatmentRequired, setMedicalTreatmentRequired] = useState(false);
  const [hospitalName, setHospitalName] = useState('');

  // Causes & RCA
  const [immediateCauses, setImmediateCauses] = useState('');
  const [rootCauses, setRootCauses] = useState('');

  // CAPA actions
  const [correctiveActions, setCorrectiveActions] = useState<CorrectiveActionItem[]>([]);

  useEffect(() => {
    if (initialIncident) {
      setIncidentNumber(initialIncident.incidentNumber);
      setIncidentType(initialIncident.incidentType);
      setTitle(initialIncident.title);
      setDescription(initialIncident.description);
      setLocation(initialIncident.location);
      setIncidentDate(initialIncident.incidentDate);
      setIncidentTime(initialIncident.incidentTime);
      setSeverity(initialIncident.severity);
      setLostWorkDays(initialIncident.lostWorkDays || 0);

      if (initialIncident.injuredPerson) {
        setHasInjured(true);
        setInjuredName(initialIncident.injuredPerson.fullName || '');
        setInjuredRole(initialIncident.injuredPerson.jobRole || '');
        setInjuredCompany(initialIncident.injuredPerson.contractor || '');
        setInjuryType(initialIncident.injuredPerson.injuryType || '');
        setBodyPart(initialIncident.injuredPerson.bodyPart || '');
        setMedicalTreatmentRequired(initialIncident.medicalTreatmentRequired || false);
        setHospitalName(initialIncident.hospitalName || '');
      } else {
        setHasInjured(false);
      }

      const imm = initialIncident.immediateCauses;
      setImmediateCauses(Array.isArray(imm) ? imm.join('\n') : (imm || ''));
      const rc = initialIncident.rootCauses;
      setRootCauses(Array.isArray(rc) ? rc.join('\n') : (rc || ''));
      setCorrectiveActions(initialIncident.correctiveActions || []);
    } else {
      const today = new Date().toLocaleDateString('fa-IR');
      setIncidentDate(today);
      setIncidentNumber(`INC-${Date.now().toString().slice(-4)}`);
      setTitle('');
      setDescription('');
      setLocation('');
      setImmediateCauses('');
      setRootCauses('');
      setCorrectiveActions([
        {
          id: `capa_1`,
          action: 'برگزاری کارگاه بازآموزی ایمنی (TBM) برای کلیه پرسنل کارگاه',
          responsiblePerson: 'مسئول HSE پیمانکار',
          targetDate: today,
          status: 'PENDING'
        }
      ]);
    }
  }, [initialIncident]);

  const handleAddCapa = () => {
    setCorrectiveActions(prev => [
      ...prev,
      {
        id: `capa_${Date.now()}`,
        action: '',
        responsiblePerson: '',
        targetDate: incidentDate || new Date().toLocaleDateString('fa-IR'),
        status: 'PENDING'
      }
    ]);
  };

  const handleRemoveCapa = (id: string) => {
    setCorrectiveActions(prev => prev.filter(c => c.id !== id));
  };

  const handleUpdateCapa = (id: string, field: keyof CorrectiveActionItem, val: string) => {
    setCorrectiveActions(prev =>
      prev.map(c => (c.id === id ? { ...c, [field]: val } : c))
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      alert('لطفاً عنوان و شرح رویداد را وارد فرمایید.');
      return;
    }

    const data: IncidentReport = {
      id: initialIncident ? initialIncident.id : `inc_${Date.now()}`,
      projectId,
      incidentNumber,
      incidentType,
      title,
      description,
      location,
      incidentDate,
      incidentTime,
      severity,
      lostWorkDays: Number(lostWorkDays),
      injuredPerson: hasInjured
        ? {
            fullName: injuredName,
            jobRole: injuredRole,
            contractor: injuredCompany,
            injuryType,
            bodyPart
          }
        : undefined,
      medicalTreatmentRequired,
      hospitalName,
      immediateCauses,
      rootCauses,
      correctiveActions,
      workflowStatus: initialIncident ? initialIncident.workflowStatus : ('DRAFT' as any),
      createdById: initialIncident ? initialIncident.createdById : (currentUser?.id || 'admin'),
      workflowHistory: initialIncident ? initialIncident.workflowHistory : []
    };

    onSave(data);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[160] bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fadeIn" dir="rtl">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-stone-200 dark:border-slate-800 w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-2xl p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-stone-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center font-black">
              <AlertTriangle size={22} />
            </div>
            <div>
              <h3 className="font-black text-base md:text-lg text-stone-900 dark:text-white">
                {initialIncident ? 'ویرایش گزارش رویداد / حادثه' : 'ثبت گزارش حادثه و شبه‌حادثه (Incident Report)'}
              </h3>
              <p className="text-[11px] font-bold text-stone-500 dark:text-slate-400">
                ثبت، تحلیل ریشه‌ای (RCA) و اقدامات اصلاحی پیشگیرانه (CAPA)
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
              <label className="block text-stone-700 dark:text-slate-300 mb-1">نوع رویداد (Classification):</label>
              <select
                value={incidentType}
                onChange={(e) => setIncidentType(e.target.value as IncidentType)}
                className="w-full p-2.5 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl font-bold text-stone-900 dark:text-white outline-none"
              >
                {Object.entries(INCIDENT_TYPE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-stone-700 dark:text-slate-300 mb-1">شماره گزارش:</label>
              <input
                type="text"
                value={incidentNumber}
                onChange={(e) => setIncidentNumber(e.target.value)}
                required
                className="w-full p-2.5 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl font-bold text-stone-900 dark:text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-stone-700 dark:text-slate-300 mb-1">شدت حادثه (Severity):</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as any)}
                className="w-full p-2.5 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl font-bold text-stone-900 dark:text-white outline-none"
              >
                <option value="LOW">خفیف (Low)</option>
                <option value="MEDIUM">متوسط (Medium)</option>
                <option value="HIGH">بالا / شدید (High)</option>
                <option value="CRITICAL">بحرانی / فوت یا آسیب دائمی (Critical)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="block text-stone-700 dark:text-slate-300 mb-1">عنوان خلاصه رویداد:</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثال: لغزش جرثقیل متحرک در حین باربرداری تیرهای بتنی"
                required
                className="w-full p-2.5 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl font-bold text-stone-900 dark:text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-stone-700 dark:text-slate-300 mb-1">محل وقوع:</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="مثال: کارگاه ساختمانی، زون غربی"
                required
                className="w-full p-2.5 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl font-bold text-stone-900 dark:text-white outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-stone-700 dark:text-slate-300 mb-1">تاریخ رویداد:</label>
              <ShamsiDatePicker
                value={incidentDate}
                onChange={setIncidentDate}
                placeholder="1403/02/10"
                inputClassName="!p-2.5 !bg-stone-50 dark:!bg-slate-800 !border-stone-200 dark:!border-slate-700 !rounded-xl !font-bold !text-stone-900 dark:!text-white outline-none !text-center"
              />
            </div>

            <div>
              <label className="block text-stone-700 dark:text-slate-300 mb-1">ساعت وقوع:</label>
              <input
                type="text"
                value={incidentTime}
                onChange={(e) => setIncidentTime(e.target.value)}
                className="w-full p-2.5 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl font-bold text-stone-900 dark:text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-stone-700 dark:text-slate-300 mb-1">روزهای کاری تلف شده (LTI Days):</label>
              <input
                type="number"
                value={lostWorkDays}
                onChange={(e) => setLostWorkDays(Number(e.target.value))}
                min={0}
                className="w-full p-2.5 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl font-bold text-stone-900 dark:text-white outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-stone-700 dark:text-slate-300 mb-1">شرح کامل نحوه وقوع رویداد:</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="شرح دقیق ماوقع، تجهیزات درگیر، شرایط محیطی..."
              required
              className="w-full p-2.5 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl font-bold text-stone-900 dark:text-white outline-none resize-none"
            />
          </div>

          {/* Injured Person Info Box */}
          <div className="border border-stone-200 dark:border-slate-700 rounded-2xl p-3.5 bg-stone-50/50 dark:bg-slate-800/40 space-y-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={hasInjured}
                onChange={(e) => setHasInjured(e.target.checked)}
                className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 accent-rose-600"
              />
              <span className="text-xs font-black text-stone-800 dark:text-slate-200">
                حادثه دارای مصدوم انسانی بوده است (ثبت مشخصات مصدوم)
              </span>
            </label>

            {hasInjured && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1">
                <div>
                  <span className="text-[10px] text-stone-500 block">نام و نام خانوادگی مصدوم:</span>
                  <input
                    type="text"
                    value={injuredName}
                    onChange={(e) => setInjuredName(e.target.value)}
                    className="w-full p-2 bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-lg text-xs font-bold"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-stone-500 block">سمت / شغل:</span>
                  <input
                    type="text"
                    value={injuredRole}
                    onChange={(e) => setInjuredRole(e.target.value)}
                    className="w-full p-2 bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-lg text-xs font-bold"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-stone-500 block">پیمانکار مربوطه:</span>
                  <input
                    type="text"
                    value={injuredCompany}
                    onChange={(e) => setInjuredCompany(e.target.value)}
                    className="w-full p-2 bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-lg text-xs font-bold"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-stone-500 block">نوع جراحت:</span>
                  <input
                    type="text"
                    value={injuryType}
                    onChange={(e) => setInjuryType(e.target.value)}
                    placeholder="مثال: کوفتگی، شکستگی، سوختگی سطحی"
                    className="w-full p-2 bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-lg text-xs font-bold"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-stone-500 block">عضو آسیب‌دیده:</span>
                  <input
                    type="text"
                    value={bodyPart}
                    onChange={(e) => setBodyPart(e.target.value)}
                    placeholder="مثال: مچ دست راست، پا"
                    className="w-full p-2 bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-lg text-xs font-bold"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-stone-500 block">مرکز درمانی / بیمارستان:</span>
                  <input
                    type="text"
                    value={hospitalName}
                    onChange={(e) => setHospitalName(e.target.value)}
                    placeholder="مثال: بهداری کارگاه / بیمارستان امام"
                    className="w-full p-2 bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-lg text-xs font-bold"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Root Cause Analysis (RCA) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-stone-700 dark:text-slate-300 mb-1">علل مستقیم و بی‌واسطه (Immediate Causes):</label>
              <textarea
                value={immediateCauses}
                onChange={(e) => setImmediateCauses(e.target.value)}
                rows={2}
                placeholder="اعمال یا شرایط ناایمن مستقیم..."
                className="w-full p-2.5 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl font-bold text-stone-900 dark:text-white outline-none resize-none"
              />
            </div>
            <div>
              <label className="block text-stone-700 dark:text-slate-300 mb-1">علل ریشه‌ای و بنیادین (Root Causes - RCA):</label>
              <textarea
                value={rootCauses}
                onChange={(e) => setRootCauses(e.target.value)}
                rows={2}
                placeholder="نقص در آموزش، ضعف در روش اجرایی، فقدان پایش نظارتی..."
                className="w-full p-2.5 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl font-bold text-stone-900 dark:text-white outline-none resize-none"
              />
            </div>
          </div>

          {/* Corrective Actions Table (CAPA) */}
          <div className="border border-stone-200 dark:border-slate-700 rounded-2xl p-3.5 bg-stone-50/50 dark:bg-slate-800/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-black text-xs text-stone-800 dark:text-white">
                اقدامات اصلاحی و پیشگیرانه مصوب (CAPA Action Items):
              </span>
              <button
                type="button"
                onClick={handleAddCapa}
                className="text-amber-600 hover:text-amber-700 text-xs font-black flex items-center gap-1 cursor-pointer"
              >
                <Plus size={14} /> افزودن اقدام
              </button>
            </div>

            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {correctiveActions.map((capa, idx) => (
                <div key={capa.id || idx} className="p-2 bg-white dark:bg-slate-800 rounded-xl border border-stone-200 dark:border-slate-700 grid grid-cols-1 md:grid-cols-12 gap-2 items-center text-xs">
                  <div className="md:col-span-4">
                    <input
                      type="text"
                      value={capa.action}
                      onChange={(e) => handleUpdateCapa(capa.id, 'action', e.target.value)}
                      placeholder="شرح اقدام اصلاحی..."
                      className="w-full p-1.5 bg-stone-50 dark:bg-slate-700 border border-stone-200 dark:border-slate-600 rounded-lg font-bold"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <input
                      type="text"
                      value={capa.responsiblePerson}
                      onChange={(e) => handleUpdateCapa(capa.id, 'responsiblePerson', e.target.value)}
                      placeholder="مسئول اقدام..."
                      className="w-full p-1.5 bg-stone-50 dark:bg-slate-700 border border-stone-200 dark:border-slate-600 rounded-lg font-bold"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <ShamsiDatePicker
                      value={capa.targetDate}
                      onChange={(val) => handleUpdateCapa(capa.id, 'targetDate', val)}
                      placeholder="مهلت اقدام"
                      inputClassName="!p-1.5 !bg-stone-50 dark:!bg-slate-700 !border-stone-200 dark:!border-slate-600 !rounded-lg !font-bold !text-[11px] !text-center"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <select
                      value={capa.status}
                      onChange={(e) => handleUpdateCapa(capa.id, 'status', e.target.value)}
                      className="w-full p-1.5 bg-stone-50 dark:bg-slate-700 border border-stone-200 dark:border-slate-600 rounded-lg font-bold text-[11px]"
                    >
                      <option value="PENDING">در انتظار</option>
                      <option value="IN_PROGRESS">در حال انجام</option>
                      <option value="COMPLETED">تکمیل شده</option>
                    </select>
                  </div>
                  <div className="md:col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleRemoveCapa(capa.id)}
                      className="p-1 text-rose-500 hover:text-rose-700 rounded-md"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
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
              className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer"
            >
              {initialIncident ? 'بروزرسانی گزارش حادثه' : 'ثبت نهایی گزارش حادثه'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
