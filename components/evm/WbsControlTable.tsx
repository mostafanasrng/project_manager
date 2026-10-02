import React, { useState, useMemo } from 'react';
import {
  Layers,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Edit3,
  Trash2,
  Plus,
  ArrowUpDown,
  Percent,
  Sliders
} from 'lucide-react';
import { PlanningActivity } from '../../types';
import { SystemAdminService } from '../../services/systemAdminService';

interface WbsControlTableProps {
  activities: PlanningActivity[];
  onEditActivity: (act: PlanningActivity) => void;
  onDeleteActivity: (id: string) => void;
  onAddNewActivity: () => void;
  onOpenQuickWeightModal?: () => void;
  isSystemAdmin?: boolean;
}

export default function WbsControlTable({
  activities,
  onEditActivity,
  onDeleteActivity,
  onAddNewActivity,
  onOpenQuickWeightModal,
  isSystemAdmin
}: WbsControlTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const isSysAdmin = isSystemAdmin !== undefined ? isSystemAdmin : (() => {
    try {
      const u = SystemAdminService.getCurrentUser();
      const r = localStorage.getItem('user_role');
      return u?.role === 'SYSTEM_ADMIN' || r === 'SYSTEM_ADMIN' || localStorage.getItem('current_username') === 'admin';
    } catch {
      return false;
    }
  })();

  // Sum of weights check
  const totalWeight = useMemo(() => {
    return activities.reduce((sum, act) => sum + (Number(act.weightPercent) || 0), 0);
  }, [activities]);

  const isWeight100 = Math.abs(totalWeight - 100) < 0.1;

  // Filtered activities
  const filteredActivities = useMemo(() => {
    return activities.filter(act => {
      const matchesSearch =
        act.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        act.code.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'CRITICAL' && act.isCriticalPath) ||
        act.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [activities, searchTerm, statusFilter]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 lg:p-8 border border-stone-200/80 dark:border-slate-800 shadow-sm space-y-6">
      {/* Top Header & Weight Validation Alert */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-100 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-black text-stone-900 dark:text-white flex items-center gap-2">
              <Layers size={22} className="text-amber-500" />
              جدول کنترل ساختار شکست کار (WBS) و تخصیص اوزان
            </h3>
            <span
              className={`px-3 py-1 rounded-xl text-xs font-black flex items-center gap-1.5 ${
                isWeight100
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
              }`}
            >
              <Percent size={14} />
              مجموع اوزان: {totalWeight.toFixed(1)}٪
              {isWeight100 ? ' (تراز ۱۰۰٪)' : ' (نیازمند تراز)'}
            </span>
          </div>
          <p className="text-xs text-stone-500 dark:text-slate-400 mt-1">
            تعیین درصد وزنی فیزیکی (بر اساس هزینه یا احجام)، پایش مسیر بحرانی و مقایسه پیشرفت برنامه‌ای در مقابل پیشرفت واقعی
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {onOpenQuickWeightModal && isSysAdmin && (
            <button
              onClick={onOpenQuickWeightModal}
              className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-stone-700 dark:text-slate-300 rounded-2xl font-black text-xs transition-all flex items-center gap-1.5"
            >
              <Sliders size={16} />
              تنظیم سریع اوزان
            </button>
          )}
          {isSysAdmin && (
            <button
              onClick={onAddNewActivity}
              className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-600 hover:to-amber-500 text-stone-950 rounded-2xl font-black text-xs transition-all shadow-md shadow-amber-500/20 flex items-center gap-2 active:scale-95"
            >
              <Plus size={16} />
              افزودن فعالیت WBS جدید
            </button>
          )}
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="جستجوی کد WBS یا عنوان فعالیت..."
            className="w-full pr-10 pl-4 py-2.5 bg-stone-50 dark:bg-slate-800/70 border border-stone-200/80 dark:border-slate-700 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500/30"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs font-bold text-stone-400 whitespace-nowrap">فیلتر وضعیت:</span>
          {['ALL', 'IN_PROGRESS', 'COMPLETED', 'DELAYED', 'NOT_STARTED', 'CRITICAL'].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-amber-500 text-stone-950 shadow-xs'
                  : 'bg-stone-100 dark:bg-slate-800 text-stone-600 dark:text-slate-400 hover:bg-stone-200'
              }`}
            >
              {st === 'ALL'
                ? 'همه'
                : st === 'IN_PROGRESS'
                ? 'در حال اجرا'
                : st === 'COMPLETED'
                ? 'تکمیل شده'
                : st === 'DELAYED'
                ? 'دارای تاخیر'
                : st === 'NOT_STARTED'
                ? 'شروع نشده'
                : 'مسیر بحرانی (Critical)'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-stone-200/80 dark:border-slate-800">
        <table className="w-full text-right text-xs">
          <thead className="bg-stone-50 dark:bg-slate-800/60 text-stone-500 dark:text-slate-400 font-black border-b border-stone-200/80 dark:border-slate-800">
            <tr>
              <th className="p-3.5">کد WBS</th>
              <th className="p-3.5">عنوان فعالیت</th>
              <th className="p-3.5 text-center">درصد وزنی (Weight %)</th>
              <th className="p-3.5 text-center">شروع مصوب</th>
              <th className="p-3.5 text-center">پایان مصوب</th>
              <th className="p-3.5 text-center">مدت (روز)</th>
              <th className="p-3.5 text-center text-blue-600 dark:text-blue-400">پیشرفت برنامه‌ای</th>
              <th className="p-3.5 text-center text-emerald-600 dark:text-emerald-400">پیشرفت واقعی</th>
              <th className="p-3.5 text-center">وضعیت</th>
              <th className="p-3.5 text-center">عملیات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 dark:divide-slate-800">
            {filteredActivities.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-center py-10 text-stone-400 text-xs font-bold">
                  هیچ فعالیتی مطابق فیلتر یافت نشد.
                </td>
              </tr>
            ) : (
              filteredActivities.map(act => (
                <tr
                  key={act.id}
                  className="hover:bg-stone-50/70 dark:hover:bg-slate-800/40 transition-colors group"
                >
                  <td className="p-3.5 font-black text-amber-600 dark:text-amber-400">{act.code}</td>
                  <td className="p-3.5">
                    <div className="font-black text-stone-900 dark:text-white">{act.title}</div>
                    {act.predecessorCodes && (
                      <span className="text-[10px] text-stone-400">پیشنیاز: {act.predecessorCodes}</span>
                    )}
                  </td>
                  <td className="p-3.5 text-center">
                    <span className="px-2.5 py-1 bg-amber-500/10 text-amber-700 dark:text-amber-300 font-black rounded-lg">
                      {act.weightPercent}٪
                    </span>
                  </td>
                  <td className="p-3.5 text-center text-stone-600 dark:text-slate-300 dir-ltr">
                    {act.baselineStartDate}
                  </td>
                  <td className="p-3.5 text-center text-stone-600 dark:text-slate-300 dir-ltr">
                    {act.baselineEndDate}
                  </td>
                  <td className="p-3.5 text-center font-bold text-stone-700 dark:text-slate-300">
                    {act.durationDays}
                  </td>
                  <td className="p-3.5 text-center">
                    <span className="font-bold text-blue-600 dark:text-blue-400">{act.plannedProgress}٪</span>
                  </td>
                  <td className="p-3.5 text-center">
                    <div className="space-y-1">
                      <span
                        className={`font-black ${
                          act.actualProgress >= act.plannedProgress
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {act.actualProgress}٪
                      </span>
                      <div className="w-20 bg-stone-200 dark:bg-slate-700 h-1.5 rounded-full mx-auto overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            act.actualProgress >= act.plannedProgress ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${Math.min(100, act.actualProgress)}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="p-3.5 text-center">
                    <div className="flex flex-col items-center gap-1">
                      {act.isCriticalPath && (
                        <span className="px-2 py-0.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-black rounded-md">
                          مسیر بحرانی
                        </span>
                      )}
                      <span
                        className={`px-2.5 py-1 rounded-xl text-[10px] font-black ${
                          act.status === 'COMPLETED'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : act.status === 'DELAYED'
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                            : act.status === 'IN_PROGRESS'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                            : 'bg-stone-100 text-stone-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {act.status === 'COMPLETED'
                          ? 'تکمیل شده'
                          : act.status === 'DELAYED'
                          ? 'دارای تاخیر'
                          : act.status === 'IN_PROGRESS'
                          ? 'در حال اجرا'
                          : 'شروع نشده'}
                      </span>
                    </div>
                  </td>
                  <td className="p-3.5 text-center">
                    {isSysAdmin ? (
                      <div className="flex items-center justify-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => onEditActivity(act)}
                          className="p-1.5 text-stone-500 hover:text-amber-600 hover:bg-stone-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                          title="ویرایش فعالیت"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          onClick={() => onDeleteActivity(act.id)}
                          className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                          title="حذف فعالیت"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ) : (
                      <span className="text-[11px] text-stone-400 dark:text-slate-500 font-medium">
                        فقط مدیر سیستم
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
