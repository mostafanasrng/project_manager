import React, { useState } from 'react';
import { X, Lock, CheckCircle2, History, Plus, Layers, Calendar, DollarSign, Award, ShieldCheck, AlertCircle } from 'lucide-react';
import { ProjectBaseline, PlanningActivity } from '../../types';
import { EvmEngineService } from '../../services/evmEngineService';

interface BaselineManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  activities: PlanningActivity[];
  totalBAC: number;
  currentUser: any;
  onBaselineCreated: (newBaseline: ProjectBaseline) => void;
}

export default function BaselineManagerModal({
  isOpen,
  onClose,
  projectId,
  activities,
  totalBAC,
  currentUser,
  onBaselineCreated
}: BaselineManagerModalProps) {
  const [baselines, setBaselines] = useState<ProjectBaseline[]>(() => {
    return EvmEngineService.getBaselines(projectId);
  });

  const [activeTab, setActiveTab] = useState<'LIST' | 'NEW'>('LIST');
  const [newVersion, setNewVersion] = useState(`BL-0${baselines.length + 1}`);
  const [newTitle, setNewTitle] = useState('خط مبنای مصوب زمان‌بندی و بودجه پروژه');
  const [newDescription, setNewDescription] = useState('تثبیت خط مبنای جدید بر اساس تغییرات احجام و تاخیرات مجاز مصوب');

  if (!isOpen) return null;

  const activeBaseline = baselines.find(b => b.status === 'ACTIVE') || baselines[0];

  const handleCreateBaseline = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const created = EvmEngineService.createBaseline({
      projectId,
      version: newVersion,
      title: newTitle,
      description: newDescription,
      totalBAC,
      activities,
      user: {
        id: currentUser?.id || 'admin',
        name: currentUser?.name || 'مدیر کنترل پروژه'
      }
    });

    setBaselines([created, ...baselines.map(b => ({ ...b, status: 'SUPERSEDED' as const }))]);
    onBaselineCreated(created);
    setActiveTab('LIST');
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-6 lg:p-8 max-w-3xl w-full border border-stone-200/80 dark:border-slate-800 space-y-6 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 dark:border-slate-800 pb-4 shrink-0">
          <div>
            <h3 className="text-lg font-black text-stone-900 dark:text-white flex items-center gap-2">
              <Lock size={20} className="text-amber-500" />
              مدیریت خطوط مبنای زمان‌بندی و بودجه (Baseline & Re-baselining)
            </h3>
            <p className="text-xs text-stone-500 dark:text-slate-400 mt-0.5">
              تثبیت خط مبنای اولیه، مدیریت تاریخچه نسخه‌ها و محاسبه انحرافات نسبت به برنامه مبنا
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 dark:hover:text-slate-200 rounded-xl bg-stone-100 dark:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-2 border-b border-stone-100 dark:border-slate-800 pb-2 shrink-0">
          <button
            onClick={() => setActiveTab('LIST')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
              activeTab === 'LIST'
                ? 'bg-amber-500 text-stone-950 shadow-sm'
                : 'text-stone-600 dark:text-slate-400 hover:bg-stone-100 dark:hover:bg-slate-800'
            }`}
          >
            <History size={15} />
            خطوط مبنای ثبت شده ({baselines.length})
          </button>
          <button
            onClick={() => setActiveTab('NEW')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
              activeTab === 'NEW'
                ? 'bg-amber-500 text-stone-950 shadow-sm'
                : 'text-stone-600 dark:text-slate-400 hover:bg-stone-100 dark:hover:bg-slate-800'
            }`}
          >
            <Plus size={15} />
            ثبت خط مبنای جدید (Re-Baseline)
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto pr-1">
          {activeTab === 'LIST' ? (
            <div className="space-y-4">
              {baselines.length === 0 ? (
                <div className="p-8 text-center bg-stone-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-stone-200 dark:border-slate-700 space-y-3">
                  <Lock size={36} className="mx-auto text-amber-500/60" />
                  <h4 className="text-sm font-black text-stone-700 dark:text-slate-200">
                    هنوز خط مبنای قفل‌شده‌ای برای این پروژه ایجاد نشده است.
                  </h4>
                  <p className="text-xs text-stone-500 max-w-sm mx-auto">
                    با کلیک روی دکمه «ثبت خط مبنای جدید»، وضعیت فعلی فعالیت‌های WBS و بودجه پروژه به عنوان خط مبنای مصوب قفل و ثبت می‌شود.
                  </p>
                  <button
                    onClick={() => setActiveTab('NEW')}
                    className="px-4 py-2 bg-amber-500 text-stone-950 font-black text-xs rounded-xl shadow-md"
                  >
                    ایجاد اولین خط مبنا (BL-01)
                  </button>
                </div>
              ) : (
                baselines.map((bl) => (
                  <div
                    key={bl.id}
                    className={`p-5 rounded-2xl border transition-all space-y-3 ${
                      bl.status === 'ACTIVE'
                        ? 'bg-amber-500/10 dark:bg-amber-500/15 border-amber-500/40 shadow-sm'
                        : 'bg-stone-50 dark:bg-slate-800/40 border-stone-200/70 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="px-2.5 py-1 bg-amber-500 text-stone-950 font-black text-xs rounded-lg">
                          {bl.version}
                        </span>
                        <h4 className="text-sm font-black text-stone-900 dark:text-white">{bl.title}</h4>
                        {bl.status === 'ACTIVE' && (
                          <span className="px-2 py-0.5 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] font-black rounded-md flex items-center gap-1">
                            <CheckCircle2 size={12} />
                            خط مبنای جاری و فعال
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-stone-400 dir-ltr">{bl.approvalDate}</span>
                    </div>

                    {bl.description && (
                      <p className="text-xs text-stone-600 dark:text-slate-300 leading-relaxed">
                        {bl.description}
                      </p>
                    )}

                    <div className="grid grid-cols-3 gap-3 pt-2 text-xs border-t border-stone-200/50 dark:border-slate-700/50">
                      <div>
                        <span className="text-stone-400 block text-[10px]">بودجه کل مصوب (BAC):</span>
                        <span className="font-black text-stone-800 dark:text-slate-200">
                          {(bl.totalBAC / 1000000000).toFixed(2)} میلیارد تومان
                        </span>
                      </div>
                      <div>
                        <span className="text-stone-400 block text-[10px]">تعداد فعالیت‌های مبنا:</span>
                        <span className="font-black text-stone-800 dark:text-slate-200">
                          {bl.activities?.length || 0} فعالیت WBS
                        </span>
                      </div>
                      <div>
                        <span className="text-stone-400 block text-[10px]">تصویب کننده:</span>
                        <span className="font-black text-stone-800 dark:text-slate-200">
                          {bl.approvedBy || 'کارفرما / مشاور'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <form onSubmit={handleCreateBaseline} className="space-y-4">
              <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-2xl text-xs space-y-1 text-amber-900 dark:text-amber-300">
                <div className="flex items-center gap-1.5 font-black">
                  <AlertCircle size={16} />
                  نکته در مورد خط مبنا (Re-baselining)
                </div>
                <p className="text-[11px] leading-relaxed">
                  با ثبت این خط مبنا، مقادیر فعلی تاریخ‌های شروع و پایان، درصد وزنی و بودجه تخصیصی فعالیت‌ها تثبیت شده و شاخص‌های ارزش کسب شده (PV و SPI) بر مبنای این نسخه محاسبه خواهند شد.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black text-stone-600 dark:text-slate-300 mb-1 block">کد نسخه</label>
                  <input
                    type="text"
                    value={newVersion}
                    onChange={e => setNewVersion(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none"
                    placeholder="مثلا: BL-02"
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-stone-600 dark:text-slate-300 mb-1 block">بودجه کل مصوب (BAC)</label>
                  <div className="px-3 py-2 bg-stone-100 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl text-xs font-black text-amber-600">
                    {(totalBAC / 1000000000).toFixed(2)} میلیارد تومان
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-stone-600 dark:text-slate-300 mb-1 block">عنوان خط مبنا</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none"
                  placeholder="مثلا: خط مبنای بازنگری شده بر اساس دستور تغییر کار شماره ۱"
                />
              </div>

              <div>
                <label className="text-xs font-black text-stone-600 dark:text-slate-300 mb-1 block">شرح و علت به‌روزرسانی (Re-baseline Reason)</label>
                <textarea
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none"
                  placeholder="دلایل تاخیرات مجاز، دستور تغییرات و..."
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('LIST')}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 dark:bg-slate-800 text-stone-700 dark:text-slate-300 rounded-xl text-xs font-bold"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-stone-950 font-black text-xs rounded-xl shadow-md flex items-center gap-1.5"
                >
                  <Lock size={15} />
                  تثبیت و قفل خط مبنای جدید
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
