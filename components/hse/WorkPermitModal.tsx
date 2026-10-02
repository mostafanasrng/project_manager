import React, { useState, useEffect } from 'react';
import { X, ShieldAlert, Plus, CheckCircle2, Flame, AlertCircle, Settings, ListChecks } from 'lucide-react';
import { WorkPermit, WorkPermitType, PERMIT_TYPE_LABELS, WorkPermitChecklistItem, CustomPermitType } from '../../types/hse';
import { HseService } from '../../services/hseService';
import { SystemUser } from '../../types';
import { PermitTypesManagerModal } from './PermitTypesManagerModal';
import { ShamsiDatePicker } from '../ShamsiDatePicker';

interface WorkPermitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (permit: WorkPermit) => void;
  initialPermit?: WorkPermit | null;
  projectId: string;
  currentUser: SystemUser | null;
}

export const WorkPermitModal: React.FC<WorkPermitModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialPermit,
  projectId,
  currentUser
}) => {
  const [permitType, setPermitType] = useState<WorkPermitType>('HOT_WORK');
  const [permitTypeList, setPermitTypeList] = useState<CustomPermitType[]>([]);
  const [isManagerModalOpen, setIsManagerModalOpen] = useState(false);

  const [permitNumber, setPermitNumber] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [permitDate, setPermitDate] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('17:00');
  const [contractorSubcontractor, setContractorSubcontractor] = useState('');
  const [workerCount, setWorkerCount] = useState(4);
  const [riskLevel, setRiskLevel] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('HIGH');
  const [checklists, setChecklists] = useState<WorkPermitChecklistItem[]>([]);
  
  // Gas test states
  const [gasTestPerformed, setGasTestPerformed] = useState(false);
  const [oxygenLevel, setOxygenLevel] = useState(20.9);
  const [flammableGas, setFlammableGas] = useState(0);
  const [carbonMonoxide, setCarbonMonoxide] = useState(0);
  const [hydrogenSulfide, setHydrogenSulfide] = useState(0);

  // PPE & Controls
  const [requiredPpe, setRequiredPpe] = useState<string[]>([
    'کلاه ایمنی استاندارد',
    'کفش ایمنی پنجه فولادی',
    'عینک ایمنی و شیلد محافظ',
    'دستکش چرمی نسوز'
  ]);
  const [isolationRequired, setIsolationRequired] = useState(true);
  const [fireWatchRequired, setFireWatchRequired] = useState(true);
  const [emergencyEvacuationPlan, setEmergencyEvacuationPlan] = useState(true);

  const availablePpeOptions = [
    'کلاه ایمنی استاندارد',
    'کفش ایمنی پنجه فولادی',
    'عینک ایمنی و شیلد محافظ',
    'دستکش چرمی نسوز',
    'کمربند ایمنی و هارنس کامل (Full Body)',
    'ماسک تنفسی با فیلتر گاز و ذرات',
    'گوشی و ایرماف صداگیر',
    'جلیقه شبرنگ ایمنی',
    'لباس ضد اسید و مواد شیمیایی'
  ];

  const reloadPermitTypes = () => {
    const types = HseService.getPermitTypes();
    setPermitTypeList(types);
  };

  useEffect(() => {
    if (isOpen) {
      reloadPermitTypes();
    }
  }, [isOpen]);

  useEffect(() => {
    if (initialPermit) {
      setPermitType(initialPermit.permitType);
      setPermitNumber(initialPermit.permitNumber);
      setLocation(initialPermit.location);
      setDescription(initialPermit.description);
      setPermitDate(initialPermit.permitDate);
      setStartTime(initialPermit.startTime);
      setEndTime(initialPermit.endTime);
      setContractorSubcontractor(initialPermit.contractorSubcontractor || '');
      setWorkerCount(initialPermit.workerCount || 4);
      setRiskLevel(initialPermit.riskLevel || 'HIGH');
      setChecklists(initialPermit.checklists || []);
      
      if (initialPermit.gasTest) {
        setGasTestPerformed(initialPermit.gasTest.performed);
        setOxygenLevel(initialPermit.gasTest.oxygenLevel || 20.9);
        setFlammableGas(initialPermit.gasTest.flammableGas || 0);
        setCarbonMonoxide(initialPermit.gasTest.carbonMonoxide || 0);
        setHydrogenSulfide(initialPermit.gasTest.hydrogenSulfide || 0);
      }
      setRequiredPpe(initialPermit.requiredPpe || []);
      setIsolationRequired(initialPermit.isolationRequired || false);
      setFireWatchRequired(initialPermit.fireWatchRequired || false);
      setEmergencyEvacuationPlan(initialPermit.emergencyEvacuationPlan || false);
    } else {
      const today = new Date().toLocaleDateString('fa-IR');
      setPermitDate(today);
      setPermitNumber(`PTW-${Date.now().toString().slice(-4)}`);
      setLocation('');
      setDescription('');
      const defaultChecklists = HseService.getDefaultChecklistForPermitType('HOT_WORK');
      setChecklists(defaultChecklists);
    }
  }, [initialPermit, isOpen]);

  const handlePermitTypeChange = (newType: WorkPermitType) => {
    setPermitType(newType);
    if (!initialPermit) {
      const defaultChecklists = HseService.getDefaultChecklistForPermitType(newType);
      setChecklists(defaultChecklists);

      const typeDef = permitTypeList.find(t => t.code === newType);
      if (typeDef) {
        if (typeDef.requiresGasTest) setGasTestPerformed(true);
        if (typeDef.requiresFireWatch) setFireWatchRequired(true);
        if (typeDef.requiresIsolation) setIsolationRequired(true);
        if (typeDef.defaultPpe && typeDef.defaultPpe.length > 0) {
          setRequiredPpe(typeDef.defaultPpe);
        }
      } else {
        if (newType === 'CONFINED_SPACE' || newType === 'HOT_WORK') {
          setGasTestPerformed(true);
        }
        if (newType === 'HOT_WORK') {
          setFireWatchRequired(true);
        }
      }
    }
  };

  const handleChecklistChange = (id: string, status: 'YES' | 'NO' | 'N_A') => {
    setChecklists(prev =>
      prev.map(c => (c.id === id ? { ...c, status } : c))
    );
  };

  const handleChecklistCommentChange = (id: string, comments: string) => {
    setChecklists(prev =>
      prev.map(c => (c.id === id ? { ...c, comments } : c))
    );
  };

  const togglePpe = (ppe: string) => {
    setRequiredPpe(prev =>
      prev.includes(ppe) ? prev.filter(p => p !== ppe) : [...prev, ppe]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !location.trim()) {
      alert('لطفاً شرح فعالیت و موقعیت کارگاه را مشخص فرمایید.');
      return;
    }

    const permitData: WorkPermit = {
      id: initialPermit ? initialPermit.id : `ptw_${Date.now()}`,
      projectId,
      permitNumber,
      permitType,
      location,
      description,
      permitDate,
      startTime,
      endTime,
      contractorSubcontractor,
      workerCount: Number(workerCount),
      riskLevel,
      checklists,
      gasTest: {
        performed: gasTestPerformed,
        oxygenLevel,
        flammableGas,
        carbonMonoxide,
        hydrogenSulfide,
        testedAt: '08:00',
        testerName: currentUser?.fullName || currentUser?.username || 'افسر ایمنی کارگاه'
      },
      requiredPpe,
      isolationRequired,
      fireWatchRequired,
      emergencyEvacuationPlan,
      workflowStatus: initialPermit ? initialPermit.workflowStatus : ('DRAFT' as any),
      createdById: initialPermit ? initialPermit.createdById : (currentUser?.id || 'admin'),
      workflowHistory: initialPermit ? initialPermit.workflowHistory : []
    };

    onSave(permitData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[160] bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fadeIn" dir="rtl">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-stone-200 dark:border-slate-800 w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-2xl p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-black">
              <ShieldAlert size={22} />
            </div>
            <div>
              <h3 className="font-black text-base md:text-lg text-stone-900 dark:text-white">
                {initialPermit ? 'ویرایش مجوز کار ایمن (Work Permit)' : 'صدور مجوز کار ایمن جدید (PTW)'}
              </h3>
              <p className="text-[11px] font-bold text-stone-500 dark:text-slate-400">
                فرم استاندارد و چک‌لیست اقدامات کنترلی پیشگیرانه HSE
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-stone-400 hover:text-stone-600 dark:hover:text-white rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 text-xs font-bold">
          {/* Top Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-stone-700 dark:text-slate-300">نوع پرمیت ایمنی:</label>
                <button
                  type="button"
                  onClick={() => setIsManagerModalOpen(true)}
                  className="text-[10px] text-amber-700 dark:text-amber-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <ListChecks size={12} />
                  چک‌لیست‌ها
                </button>
              </div>
              <select
                value={permitType}
                onChange={(e) => handlePermitTypeChange(e.target.value as WorkPermitType)}
                className="w-full p-2.5 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl font-bold text-stone-900 dark:text-white outline-none"
              >
                {permitTypeList.map((typeItem) => (
                  <option key={typeItem.code} value={typeItem.code}>
                    {typeItem.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-stone-700 dark:text-slate-300 mb-1">شماره مجوز (PTW No):</label>
              <input
                type="text"
                value={permitNumber}
                onChange={(e) => setPermitNumber(e.target.value)}
                required
                className="w-full p-2.5 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl font-bold text-stone-900 dark:text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-stone-700 dark:text-slate-300 mb-1">تاریخ صدور / اجرای مجوز:</label>
              <ShamsiDatePicker
                value={permitDate}
                onChange={setPermitDate}
                placeholder="1403/02/15"
                inputClassName="!p-2.5 !bg-stone-50 dark:!bg-slate-800 !border-stone-200 dark:!border-slate-700 !rounded-xl !font-bold !text-stone-900 dark:!text-white outline-none !text-center"
              />
            </div>

            <div>
              <label className="block text-stone-700 dark:text-slate-300 mb-1">سطح ریسک ارزیابی شده:</label>
              <select
                value={riskLevel}
                onChange={(e) => setRiskLevel(e.target.value as any)}
                className="w-full p-2.5 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl font-bold text-stone-900 dark:text-white outline-none"
              >
                <option value="LOW">کم‌خطر (Low)</option>
                <option value="MEDIUM">متوسط (Medium)</option>
                <option value="HIGH">پرخطر و بحرانی (High)</option>
                <option value="CRITICAL">بسیار پرخطر (Critical)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-stone-700 dark:text-slate-300 mb-1">محل دقیق عملیات / زون:</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="مثال: مخزن هوایی، ایستگاه پمپاژ"
                required
                className="w-full p-2.5 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl font-bold text-stone-900 dark:text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-stone-700 dark:text-slate-300 mb-1">پیمانکار / مجری کار:</label>
              <input
                type="text"
                value={contractorSubcontractor}
                onChange={(e) => setContractorSubcontractor(e.target.value)}
                placeholder="مثال: شرکت پیمانکاری ساختمانی"
                className="w-full p-2.5 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl font-bold text-stone-900 dark:text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-stone-700 dark:text-slate-300 mb-1">تعداد نفرات کارگری:</label>
              <input
                type="number"
                value={workerCount}
                onChange={(e) => setWorkerCount(Number(e.target.value))}
                min={1}
                className="w-full p-2.5 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl font-bold text-stone-900 dark:text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-stone-700 dark:text-slate-300 mb-1">ساعت مجاز کارکرد:</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  placeholder="08:00"
                  className="w-1/2 p-2.5 text-center bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl font-mono text-stone-900 dark:text-white outline-none"
                />
                <span>تا</span>
                <input
                  type="text"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  placeholder="17:00"
                  className="w-1/2 p-2.5 text-center bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl font-mono text-stone-900 dark:text-white outline-none"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-stone-700 dark:text-slate-300 mb-1">شرح دقیق فرآیند کاری و تجهیزات مورد استفاده:</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="مثال: برشکاری لوله‌های فولادی قطر ۸۰۰ با دستگاه هوابرش در ارتفاع ۴ متری با رعایت مهاربندی کامل..."
              required
              className="w-full p-2.5 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl font-bold text-stone-900 dark:text-white outline-none resize-none"
            />
          </div>

          {/* CHECKLIST ITEMS SECTION */}
          <div className="border border-stone-200 dark:border-slate-700 rounded-2xl p-4 bg-stone-50/50 dark:bg-slate-800/40 space-y-3">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-slate-700 pb-2">
              <span className="font-black text-xs text-stone-800 dark:text-white flex items-center gap-1.5">
                <CheckCircle2 size={16} className="text-emerald-600" />
                چک‌لیست تخصصی اقدامات ایمنی و کنترل ریسک ({HseService.getPermitTypeLabel(permitType)})
              </span>
              <button
                type="button"
                onClick={() => setIsManagerModalOpen(true)}
                className="text-[10px] text-amber-700 dark:text-amber-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Settings size={12} />
                مدیریت بندهای چک‌لیست
              </button>
            </div>

            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
              {checklists.map((chk, idx) => (
                <div key={chk.id || idx} className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-stone-200 dark:border-slate-700 flex flex-col md:flex-row items-start md:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="w-5 h-5 rounded-full bg-stone-100 dark:bg-slate-700 text-stone-600 dark:text-slate-300 flex items-center justify-center text-[10px] font-bold shrink-0">
                      {idx + 1}
                    </span>
                    <span className="font-bold text-stone-800 dark:text-slate-200 leading-snug">{chk.question}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 self-end md:self-auto">
                    <button
                      type="button"
                      onClick={() => handleChecklistChange(chk.id, 'YES')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                        chk.status === 'YES'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-stone-100 dark:bg-slate-700 text-stone-600 dark:text-slate-300 hover:bg-emerald-100'
                      }`}
                    >
                      رعایت شد ✓
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChecklistChange(chk.id, 'NO')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                        chk.status === 'NO'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'bg-stone-100 dark:bg-slate-700 text-stone-600 dark:text-slate-300 hover:bg-rose-100'
                      }`}
                    >
                      عدم رعایت ✕
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChecklistChange(chk.id, 'N_A')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                        chk.status === 'N_A'
                          ? 'bg-stone-600 text-white shadow-xs'
                          : 'bg-stone-100 dark:bg-slate-700 text-stone-600 dark:text-slate-300 hover:bg-stone-200'
                      }`}
                    >
                      نامربوط (N/A)
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Gas Test & Additional Safety Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Gas Test Box */}
            <div className="border border-stone-200 dark:border-slate-700 rounded-2xl p-3 bg-stone-50/50 dark:bg-slate-800/40 space-y-2">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={gasTestPerformed}
                    onChange={(e) => setGasTestPerformed(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer accent-amber-600"
                  />
                  <span className="text-xs font-black text-stone-800 dark:text-slate-200">
                    نیاز به آزمایش سنجش گاز اتمسفر (Gas Test)
                  </span>
                </label>
              </div>

              {gasTestPerformed && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <span className="text-[10px] text-stone-500 block">اکسیژن O2 (۱۹.۵-۲۳.۵%):</span>
                    <input
                      type="number"
                      step="0.1"
                      value={oxygenLevel}
                      onChange={(e) => setOxygenLevel(Number(e.target.value))}
                      className="w-full p-2 bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-lg font-mono text-xs font-bold"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-500 block">گازهای مشتعل LEL (زیر ۵%):</span>
                    <input
                      type="number"
                      value={flammableGas}
                      onChange={(e) => setFlammableGas(Number(e.target.value))}
                      className="w-full p-2 bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-lg font-mono text-xs font-bold"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-500 block">مونوکسید کربن CO (ppm):</span>
                    <input
                      type="number"
                      value={carbonMonoxide}
                      onChange={(e) => setCarbonMonoxide(Number(e.target.value))}
                      className="w-full p-2 bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-lg font-mono text-xs font-bold"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-500 block">سولفید هیدروژن H2S (ppm):</span>
                    <input
                      type="number"
                      value={hydrogenSulfide}
                      onChange={(e) => setHydrogenSulfide(Number(e.target.value))}
                      className="w-full p-2 bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-lg font-mono text-xs font-bold"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Special Controls Box */}
            <div className="border border-stone-200 dark:border-slate-700 rounded-2xl p-3 bg-stone-50/50 dark:bg-slate-800/40 space-y-2">
              <span className="text-xs font-black text-stone-800 dark:text-slate-200 block">کنترل‌های ایمنی خاص:</span>
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isolationRequired}
                    onChange={(e) => setIsolationRequired(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-amber-600 focus:ring-amber-500 accent-amber-600"
                  />
                  <span className="text-[11px] font-bold text-stone-700 dark:text-slate-300">
                    قفل‌گذاری و برچسب‌زنی ایمنی (LOTO / ایزولاسیون انرژی)
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={fireWatchRequired}
                    onChange={(e) => setFireWatchRequired(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-amber-600 focus:ring-amber-500 accent-amber-600"
                  />
                  <span className="text-[11px] font-bold text-stone-700 dark:text-slate-300">
                    حضور دیده‌بان آتش (Fire Watch) و کپسول آماده
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={emergencyEvacuationPlan}
                    onChange={(e) => setEmergencyEvacuationPlan(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-amber-600 focus:ring-amber-500 accent-amber-600"
                  />
                  <span className="text-[11px] font-bold text-stone-700 dark:text-slate-300">
                    تفهیم برنامه خروج اضطراری و نقطه تجمع به نفرات
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* PPE Selection Chips */}
          <div className="border border-stone-200 dark:border-slate-700 rounded-2xl p-3 bg-stone-50/50 dark:bg-slate-800/40 space-y-2">
            <span className="text-xs font-black text-stone-800 dark:text-slate-200 block">
              تجهیزات حفاظت فردی (PPE) الزامی برای این مجوز:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {availablePpeOptions.map((ppe) => {
                const isSelected = requiredPpe.includes(ppe);
                return (
                  <button
                    key={ppe}
                    type="button"
                    onClick={() => togglePpe(ppe)}
                    className={`px-3 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-stone-600 dark:text-slate-300 border border-stone-200 dark:border-slate-700 hover:bg-stone-100'
                    }`}
                  >
                    {isSelected ? '✓ ' : '+ '}{ppe}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-stone-100 dark:bg-slate-800 hover:bg-stone-200 dark:hover:bg-slate-700 text-stone-600 dark:text-slate-300 rounded-xl font-bold text-xs transition-all cursor-pointer"
            >
              انصراف
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer"
            >
              {initialPermit ? 'بروزرسانی مجوز کار' : 'ثبت اولیه پرمیت کار'}
            </button>
          </div>
        </form>
      </div>

      <PermitTypesManagerModal
        isOpen={isManagerModalOpen}
        onClose={() => {
          setIsManagerModalOpen(false);
          reloadPermitTypes();
        }}
        onSelectPermitType={(code) => handlePermitTypeChange(code as WorkPermitType)}
      />
    </div>
  );
};
