import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, Plus, Trash2 } from 'lucide-react';
import { HsePlan, HsePlanRiskItem, HseEmergencyScenario } from '../../types/hse';
import { SystemUser } from '../../types';
import { ShamsiDatePicker } from '../ShamsiDatePicker';

interface HsePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (plan: HsePlan) => void;
  initialPlan?: HsePlan | null;
  projectId: string;
  currentUser: SystemUser | null;
}

export const HsePlanModal: React.FC<HsePlanModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialPlan,
  projectId,
  currentUser
}) => {
  const [planNumber, setPlanNumber] = useState('');
  const [title, setTitle] = useState('');
  const [revision, setRevision] = useState('1.0');
  const [revisionDate, setRevisionDate] = useState('');
  const [policyStatement, setPolicyStatement] = useState('');
  const [scope, setScope] = useState('');
  const [emergencyAssemblyPoint, setEmergencyAssemblyPoint] = useState('میدان ورودی شماره ۱ کارگاه');
  const [emergencyPhone, setEmergencyPhone] = useState('021-88997766');
  const [hospitalSupport, setHospitalSupport] = useState('بیمارستان شهید فیاض‌بخش (فاصله ۱۰ دقیقه)');

  // Risk matrix items
  const [riskMatrix, setRiskMatrix] = useState<HsePlanRiskItem[]>([]);
  // Emergency scenarios
  const [emergencyScenarios, setEmergencyScenarios] = useState<HseEmergencyScenario[]>([]);

  useEffect(() => {
    if (initialPlan) {
      setPlanNumber(initialPlan.planNumber);
      setTitle(initialPlan.title);
      setRevision(initialPlan.revision);
      setRevisionDate(initialPlan.revisionDate);
      setPolicyStatement(initialPlan.policyStatement);
      setScope(initialPlan.scope || '');
      setEmergencyAssemblyPoint(initialPlan.emergencyAssemblyPoint || 'میدان ورودی شماره ۱ کارگاه');
      setEmergencyPhone(initialPlan.emergencyPhone || '021-88997766');
      setHospitalSupport(initialPlan.hospitalSupport || 'بیمارستان شهید فیاض‌بخش');
      setRiskMatrix(initialPlan.riskMatrix || []);
      setEmergencyScenarios(initialPlan.emergencyScenarios || []);
    } else {
      const today = new Date().toLocaleDateString('fa-IR');
      setRevisionDate(today);
      setPlanNumber(`HSE-PLAN-${Date.now().toString().slice(-4)}`);
      setTitle('برنامه جامع مدیریت بهداشت، ایمنی و محیط زیست پروژه');
      setPolicyStatement('تعهد به صیانت کامل از نیروی انسانی، حذف کامل حوادث ناتوان‌کننده (Zero LTI)، پیشگیری از هرگونه آلودگی آب و خاک و انطباق ۱۰۰ درصدی با الزامات قانونی وزارت کار و استانداردهای ISO 45001 و ISO 14001.');
      setScope('کلیه کارگاه‌ها، انبارها، جبهه‌های کاری خطوط انتقال، سازه‌های بتنی و ماشین‌آلات سنگین پروژه.');
      setRiskMatrix([
        {
          id: 'rm_1',
          activity: 'کار در ارتفاع و اجرای داربست‌بندی',
          hazard: 'سقوط افراد یا سقوط اشیاء و ابزارآلات',
          initialRisk: 'بحرانی (Critical)',
          controlMeasure: 'استفاده از هارنس فول‌بادی، نصب توری ایمنی (Safety Net) و مهاربندی صددرصد لوله‌های داربست',
          residualRisk: 'کم‌خطر (Low)'
        },
        {
          id: 'rm_2',
          activity: 'گودبرداری عمیق و کانال‌کنی خطوط انتقال',
          hazard: 'ریزش دیواره گود و مدفون شدن کارگران',
          initialRisk: 'بسیار بالا (High)',
          controlMeasure: 'اجرای سازه نگهبان، شیب‌بندی استاندارد (Shoting) و خروج فوری در هنگام بارندگی',
          residualRisk: 'متوسط (Medium)'
        },
        {
          id: 'rm_3',
          activity: 'جوشکاری و برشکاری در نزدیکی مخازن سوخت',
          hazard: 'اشتعال گازها، آتش‌سوزی و انفجار',
          initialRisk: 'بحرانی (Critical)',
          controlMeasure: 'اخذ پرمیت گرم، حضور دائمی دیده‌بان آتش، ایزولاسیون کامل و تست گاز مستمر LEL',
          residualRisk: 'کم‌خطر (Low)'
        }
      ]);
      setEmergencyScenarios([
        {
          id: 'sc_1',
          scenarioName: 'آتش‌سوزی و انفجار در مخازن سوخت و روغن',
          responseProcedure: 'قطع فوری جریان سوخت و برق، تخلیه نفرات، استقرار اکیپ اطفای حریق کارگاه با پودر خشک و فوم، تماس همزمان با ۱۲۵',
          assemblyPoint: 'نقطه تجمع شماره ۱ (جنب درب شرقی کارگاه)'
        },
        {
          id: 'sc_2',
          scenarioName: 'سقوط کارگر از ارتفاع و آسیب نخاعی',
          responseProcedure: 'عدم تکان دادن مصدوم، تثبیت گردن با کولار، حضور پزشک بهیار کارگاه و اعزام با آمبولانس اختصاصی به بیمارستان',
          assemblyPoint: 'بهداری مرکزی کارگاه'
        }
      ]);
    }
  }, [initialPlan]);

  const handleAddRiskItem = () => {
    setRiskMatrix(prev => [
      ...prev,
      {
        id: `rm_${Date.now()}`,
        activity: '',
        hazard: '',
        initialRisk: 'بسیار بالا (High)',
        controlMeasure: '',
        residualRisk: 'کم‌خطر (Low)'
      }
    ]);
  };

  const handleRemoveRiskItem = (id: string) => {
    setRiskMatrix(prev => prev.filter(r => r.id !== id));
  };

  const handleUpdateRiskItem = (id: string, field: keyof HsePlanRiskItem, val: string) => {
    setRiskMatrix(prev =>
      prev.map(r => (r.id === id ? { ...r, [field]: val } : r))
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !policyStatement.trim()) {
      alert('لطفاً عنوان و خط‌مشی برنامه HSE را وارد فرمایید.');
      return;
    }

    const planData: HsePlan = {
      id: initialPlan ? initialPlan.id : `plan_${Date.now()}`,
      projectId,
      planNumber,
      title,
      revision,
      revisionDate,
      policyStatement,
      scope,
      emergencyAssemblyPoint,
      emergencyPhone,
      hospitalSupport,
      riskMatrix,
      emergencyScenarios,
      workflowStatus: initialPlan ? initialPlan.workflowStatus : ('DRAFT' as any),
      createdById: initialPlan ? initialPlan.createdById : (currentUser?.id || 'admin'),
      workflowHistory: initialPlan ? initialPlan.workflowHistory : []
    };

    onSave(planData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[160] bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fadeIn" dir="rtl">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-stone-200 dark:border-slate-800 w-full max-w-4xl max-h-[92vh] overflow-y-auto shadow-2xl p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-stone-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-black">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h3 className="font-black text-base md:text-lg text-stone-900 dark:text-white">
                {initialPlan ? 'ویرایش سند برنامه جامع HSE پروژه' : 'تدوین و ثبت برنامه جامع مدیریت HSE (HSE Plan)'}
              </h3>
              <p className="text-[11px] font-bold text-stone-500 dark:text-slate-400">
                برنامه راهبردی بر مبنای استانداردهای بین‌المللی ISO 45001 و OHSAS 18001
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-stone-400 hover:text-stone-600 dark:hover:text-white rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-bold">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-5">
              <label className="block text-stone-700 dark:text-slate-300 mb-1">عنوان سند HSE Plan:</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full p-2.5 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl font-bold text-stone-900 dark:text-white outline-none"
              />
            </div>

            <div className="md:col-span-3">
              <label className="block text-stone-700 dark:text-slate-300 mb-1">شماره سند:</label>
              <input
                type="text"
                value={planNumber}
                onChange={(e) => setPlanNumber(e.target.value)}
                required
                className="w-full p-2.5 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl font-bold text-stone-900 dark:text-white outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-stone-700 dark:text-slate-300 mb-1">ویرایش (Revision):</label>
              <input
                type="text"
                value={revision}
                onChange={(e) => setRevision(e.target.value)}
                placeholder="1.0"
                className="w-full p-2.5 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl font-bold text-stone-900 dark:text-white outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-stone-700 dark:text-slate-300 mb-1">تاریخ بازنگری / تدوین:</label>
              <ShamsiDatePicker
                value={revisionDate}
                onChange={setRevisionDate}
                placeholder="1403/02/15"
                inputClassName="!p-2.5 !bg-stone-50 dark:!bg-slate-800 !border-stone-200 dark:!border-slate-700 !rounded-xl !font-bold !text-stone-900 dark:!text-white outline-none !text-center"
              />
            </div>
          </div>

          <div>
            <label className="block text-stone-700 dark:text-slate-300 mb-1">خط‌مشی و بیانیه رسمی HSE سازمان و پروژه (Policy Statement):</label>
            <textarea
              value={policyStatement}
              onChange={(e) => setPolicyStatement(e.target.value)}
              rows={2}
              required
              className="w-full p-2.5 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl font-bold text-stone-900 dark:text-white outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-stone-700 dark:text-slate-300 mb-1">محل نقطه تجمع اضطراری (Assembly Point):</label>
              <input
                type="text"
                value={emergencyAssemblyPoint}
                onChange={(e) => setEmergencyAssemblyPoint(e.target.value)}
                className="w-full p-2.5 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl font-bold text-stone-900 dark:text-white outline-none"
              />
            </div>
            <div>
              <label className="block text-stone-700 dark:text-slate-300 mb-1">تلفن بحران و امداد کارگاه:</label>
              <input
                type="text"
                value={emergencyPhone}
                onChange={(e) => setEmergencyPhone(e.target.value)}
                className="w-full p-2.5 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl font-mono text-stone-900 dark:text-white outline-none"
              />
            </div>
            <div>
              <label className="block text-stone-700 dark:text-slate-300 mb-1">بیمارستان و مرکز درمانی پشتیبان:</label>
              <input
                type="text"
                value={hospitalSupport}
                onChange={(e) => setHospitalSupport(e.target.value)}
                className="w-full p-2.5 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl font-bold text-stone-900 dark:text-white outline-none"
              />
            </div>
          </div>

          {/* Risk Matrix Table */}
          <div className="border border-stone-200 dark:border-slate-700 rounded-2xl p-4 bg-stone-50/50 dark:bg-slate-800/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-black text-xs text-stone-800 dark:text-white">
                ماتریس شناسایی خطرات و ارزیابی ریسک فعالیت‌های کلیدی (Risk Assessment Matrix):
              </span>
              <button
                type="button"
                onClick={handleAddRiskItem}
                className="text-amber-600 hover:text-amber-700 text-xs font-black flex items-center gap-1 cursor-pointer"
              >
                <Plus size={14} /> افزودن فعالیت و ارزیابی
              </button>
            </div>

            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
              {riskMatrix.map((rm, idx) => (
                <div key={rm.id || idx} className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-stone-200 dark:border-slate-700 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-stone-500">فعالیت شماره {idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveRiskItem(rm.id)}
                      className="text-rose-500 hover:text-rose-700"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                    <div className="md:col-span-3">
                      <input
                        type="text"
                        value={rm.activity}
                        onChange={(e) => handleUpdateRiskItem(rm.id, 'activity', e.target.value)}
                        placeholder="نام فعالیت اجرایی..."
                        className="w-full p-1.5 bg-stone-50 dark:bg-slate-700 border border-stone-200 dark:border-slate-600 rounded-lg font-bold"
                      />
                    </div>
                    <div className="md:col-span-3">
                      <input
                        type="text"
                        value={rm.hazard}
                        onChange={(e) => handleUpdateRiskItem(rm.id, 'hazard', e.target.value)}
                        placeholder="خطرات احتمالی..."
                        className="w-full p-1.5 bg-stone-50 dark:bg-slate-700 border border-stone-200 dark:border-slate-600 rounded-lg font-bold"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <input
                        type="text"
                        value={rm.initialRisk}
                        onChange={(e) => handleUpdateRiskItem(rm.id, 'initialRisk', e.target.value)}
                        placeholder="ریسک اولیه..."
                        className="w-full p-1.5 bg-stone-50 dark:bg-slate-700 border border-stone-200 dark:border-slate-600 rounded-lg font-bold text-rose-600"
                      />
                    </div>
                    <div className="md:col-span-3">
                      <input
                        type="text"
                        value={rm.controlMeasure}
                        onChange={(e) => handleUpdateRiskItem(rm.id, 'controlMeasure', e.target.value)}
                        placeholder="اقدامات کنترلی و پیشگیرانه..."
                        className="w-full p-1.5 bg-stone-50 dark:bg-slate-700 border border-stone-200 dark:border-slate-600 rounded-lg font-bold"
                      />
                    </div>
                    <div className="md:col-span-1">
                      <input
                        type="text"
                        value={rm.residualRisk}
                        onChange={(e) => handleUpdateRiskItem(rm.id, 'residualRisk', e.target.value)}
                        placeholder="باقی‌مانده"
                        className="w-full p-1.5 bg-stone-50 dark:bg-slate-700 border border-stone-200 dark:border-slate-600 rounded-lg font-bold text-emerald-600"
                      />
                    </div>
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
              className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer"
            >
              {initialPlan ? 'بروزرسانی سند HSE Plan' : 'ثبت رسمی سند HSE Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
