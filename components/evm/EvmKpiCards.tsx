import React from 'react';
import { TrendingUp, TrendingDown, DollarSign, Calendar, AlertTriangle, CheckCircle2, ShieldAlert, Layers, HelpCircle, Activity, Info } from 'lucide-react';

interface EvmKpiCardsProps {
  bac: number;
  pv: number;
  ev: number;
  ac: number;
  sv: number;
  cv: number;
  spi: number;
  cpi: number;
  eac: number;
  vac: number;
  tcpi: number;
  approvedStatementCount?: number;
}

export default function EvmKpiCards({
  bac,
  pv,
  ev,
  ac,
  sv,
  cv,
  spi,
  cpi,
  eac,
  vac,
  tcpi,
  approvedStatementCount = 0
}: EvmKpiCardsProps) {
  // Format numbers to Billions / Millions Toman with Persian/readable formatting
  const formatMoney = (amount: number) => {
    const abs = Math.abs(amount);
    if (abs >= 1000000000) {
      return `${(amount / 1000000000).toFixed(2)} میلیارد تومان`;
    } else if (abs >= 1000000) {
      return `${(amount / 1000000).toFixed(1)} میلیون تومان`;
    }
    return `${amount.toLocaleString('fa-IR')} تومان`;
  };

  // Status colors and badges for SPI
  const getSpiStyle = (val: number) => {
    if (val >= 1.05) {
      return {
        bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
        text: 'text-emerald-600 dark:text-emerald-400',
        border: 'border-emerald-500/30',
        badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300',
        statusText: 'جلوتر از برنامه زمانی (Ahead)',
        icon: TrendingUp
      };
    } else if (val >= 0.98) {
      return {
        bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
        text: 'text-emerald-600 dark:text-emerald-400',
        border: 'border-emerald-500/30',
        badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300',
        statusText: 'مطابق برنامه زمانی (On Track)',
        icon: CheckCircle2
      };
    } else if (val >= 0.88) {
      return {
        bg: 'bg-amber-500/10 dark:bg-amber-500/20',
        text: 'text-amber-600 dark:text-amber-400',
        border: 'border-amber-500/30',
        badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
        statusText: 'تاخیر خفیف زمانی (Slight Delay)',
        icon: AlertTriangle
      };
    } else {
      return {
        bg: 'bg-rose-500/10 dark:bg-rose-500/20',
        text: 'text-rose-600 dark:text-rose-400',
        border: 'border-rose-500/30',
        badge: 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300',
        statusText: 'تاخیر بحرانی زمانی (Critical Delay)',
        icon: ShieldAlert
      };
    }
  };

  // Status colors and badges for CPI
  const getCpiStyle = (val: number) => {
    if (val >= 1.03) {
      return {
        bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
        text: 'text-emerald-600 dark:text-emerald-400',
        border: 'border-emerald-500/30',
        badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300',
        statusText: 'زیر بودجه / صرفه‌جویی (Under Budget)',
        icon: TrendingUp
      };
    } else if (val >= 0.98) {
      return {
        bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
        text: 'text-emerald-600 dark:text-emerald-400',
        border: 'border-emerald-500/30',
        badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300',
        statusText: 'مطابق بودجه مصوب (On Budget)',
        icon: CheckCircle2
      };
    } else if (val >= 0.88) {
      return {
        bg: 'bg-amber-500/10 dark:bg-amber-500/20',
        text: 'text-amber-600 dark:text-amber-400',
        border: 'border-amber-500/30',
        badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
        statusText: 'انحراف خفیف بودجه (Over Budget)',
        icon: AlertTriangle
      };
    } else {
      return {
        bg: 'bg-rose-500/10 dark:bg-rose-500/20',
        text: 'text-rose-600 dark:text-rose-400',
        border: 'border-rose-500/30',
        badge: 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300',
        statusText: 'انحراف بحرانی هزینه (Critical Overrun)',
        icon: ShieldAlert
      };
    }
  };

  const spiStyle = getSpiStyle(spi);
  const cpiStyle = getCpiStyle(cpi);
  const SpiIcon = spiStyle.icon;
  const CpiIcon = cpiStyle.icon;

  return (
    <div className="space-y-6">
      {/* 1. Core Primary EVM Indicators (SPI, CPI, BAC, EAC) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* SPI Card */}
        <div className={`p-5 rounded-3xl border transition-all shadow-sm ${spiStyle.bg} ${spiStyle.border}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-stone-600 dark:text-slate-300 flex items-center gap-1.5">
              <Calendar size={16} className={spiStyle.text} />
              شاخص عملکرد زمان‌بندی (SPI)
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${spiStyle.badge}`}>
              {spi >= 1 ? '≥ 1.00 مطلوب' : '< 1.00 هشدار'}
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-3">
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-black ${spiStyle.text}`}>{spi.toFixed(2)}</span>
              <span className="text-xs font-bold text-stone-400">EV / PV</span>
            </div>
            <div className={`p-2 rounded-2xl ${spiStyle.bg}`}>
              <SpiIcon size={20} className={spiStyle.text} />
            </div>
          </div>
          <p className="text-[11px] font-bold text-stone-600 dark:text-slate-300 mt-2">
            {spiStyle.statusText}
          </p>
          <div className="mt-3 pt-2.5 border-t border-stone-200/60 dark:border-slate-800 flex items-center justify-between text-[11px]">
            <span className="text-stone-500">انحراف زمان‌بندی (SV):</span>
            <span className={`font-black ${sv >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {sv >= 0 ? '+' : ''}{formatMoney(sv)}
            </span>
          </div>
        </div>

        {/* CPI Card */}
        <div className={`p-5 rounded-3xl border transition-all shadow-sm ${cpiStyle.bg} ${cpiStyle.border}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-stone-600 dark:text-slate-300 flex items-center gap-1.5">
              <DollarSign size={16} className={cpiStyle.text} />
              شاخص عملکرد هزینه (CPI)
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${cpiStyle.badge}`}>
              {cpi >= 1 ? '≥ 1.00 مطلوب' : '< 1.00 هشدار'}
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-3">
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-black ${cpiStyle.text}`}>{cpi.toFixed(2)}</span>
              <span className="text-xs font-bold text-stone-400">EV / AC</span>
            </div>
            <div className={`p-2 rounded-2xl ${cpiStyle.bg}`}>
              <CpiIcon size={20} className={cpiStyle.text} />
            </div>
          </div>
          <p className="text-[11px] font-bold text-stone-600 dark:text-slate-300 mt-2">
            {cpiStyle.statusText}
          </p>
          <div className="mt-3 pt-2.5 border-t border-stone-200/60 dark:border-slate-800 flex items-center justify-between text-[11px]">
            <span className="text-stone-500">انحراف هزینه (CV):</span>
            <span className={`font-black ${cv >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {cv >= 0 ? '+' : ''}{formatMoney(cv)}
            </span>
          </div>
        </div>

        {/* BAC vs EAC Card */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-stone-200/80 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-stone-600 dark:text-slate-300 flex items-center gap-1.5">
              <Activity size={16} className="text-amber-500" />
              پیش‌بینی هزینه در زمان تکمیل (EAC)
            </span>
            <span className="text-[10px] font-bold text-stone-400">BAC / CPI</span>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-stone-900 dark:text-white block">
              {formatMoney(eac)}
            </span>
            <span className="text-[11px] text-stone-500 mt-0.5 block">
              بودجه مصوب اولیه (BAC): {formatMoney(bac)}
            </span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-stone-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
            <span className="text-stone-500">انحراف نهایی (VAC):</span>
            <span className={`font-black ${vac >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {vac >= 0 ? '+' : ''}{formatMoney(vac)}
            </span>
          </div>
        </div>

        {/* TCPI Card */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-stone-200/80 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-stone-600 dark:text-slate-300 flex items-center gap-1.5">
              <Layers size={16} className="text-indigo-500" />
              شاخص راندمان تا تکمیل (TCPI)
            </span>
            <span className="text-[10px] font-bold text-stone-400">(BAC-EV)/(BAC-AC)</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-2xl font-black ${tcpi <= 1.05 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
              {tcpi.toFixed(2)}
            </span>
            <span className="text-[11px] text-stone-500">بهره‌وری مورد نیاز</span>
          </div>
          <p className="text-[11px] text-stone-500 dark:text-slate-400 leading-tight">
            {tcpi <= 1 ? 'امکان اتمام با بهره‌وری عادی' : 'نیاز به افزایش راندمان کاری برای کنترل بودجه'}
          </p>
          <div className="mt-3 pt-2.5 border-t border-stone-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
            <span className="text-stone-500">وضعیت کنترل:</span>
            <span className="font-bold text-stone-700 dark:text-slate-300">
              {tcpi <= 1.1 ? 'قابل دستیابی' : 'نیازمند اصلاح برنامه'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. The 3 Triad EVM Elements: PV, EV, AC */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Planned Value (PV) */}
        <div className="p-5 rounded-3xl bg-gradient-to-br from-blue-50/80 to-blue-100/40 dark:from-blue-950/30 dark:to-blue-900/10 border border-blue-200/80 dark:border-blue-800/40 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-xs font-black text-blue-900 dark:text-blue-200">ارزش برنامه‌ریزی شده (PV)</span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-500/10 text-blue-700 dark:text-blue-300 rounded-lg">
              Planned Value
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-blue-950 dark:text-white">
              {formatMoney(pv)}
            </div>
            <span className="text-xs font-bold text-blue-700 dark:text-blue-400 block mt-1">
              {bac > 0 ? `${((pv / bac) * 100).toFixed(1)}٪ از کل بودجه مصوب` : ''}
            </span>
          </div>
          <p className="text-[11px] text-blue-800/80 dark:text-blue-300/80 mt-2">
            ارزش کاری که بر اساس زمان‌بندی مبنا (Baseline) تا این تاریخ باید انجام می‌شده است.
          </p>
        </div>

        {/* Earned Value (EV) */}
        <div className="p-5 rounded-3xl bg-gradient-to-br from-emerald-50/80 to-emerald-100/40 dark:from-emerald-950/30 dark:to-emerald-900/10 border border-emerald-200/80 dark:border-emerald-800/40 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-xs font-black text-emerald-900 dark:text-emerald-200">ارزش کسب شده / حاصله (EV)</span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 rounded-lg">
              Earned Value
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-emerald-950 dark:text-white">
              {formatMoney(ev)}
            </div>
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 block mt-1">
              {bac > 0 ? `${((ev / bac) * 100).toFixed(1)}٪ از کل بودجه مصوب` : ''}
            </span>
          </div>
          <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80 mt-2">
            ارزش واقعی کارهای اجرا شده بر اساس درصد پیشرفت فیزیکی WBS در کل بودجه BAC.
          </p>
        </div>

        {/* Actual Cost (AC) */}
        <div className="p-5 rounded-3xl bg-gradient-to-br from-purple-50/80 to-purple-100/40 dark:from-purple-950/30 dark:to-purple-900/10 border border-purple-200/80 dark:border-purple-800/40 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-purple-500" />
              <span className="text-xs font-black text-purple-900 dark:text-purple-200">هزینه واقعی صرف شده (AC)</span>
            </div>
            <span className="text-[10px] font-black px-2 py-0.5 bg-purple-500/15 text-purple-800 dark:text-purple-300 rounded-lg">
              صورت‌وضعیت‌های تایید شده
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-purple-950 dark:text-white">
              {formatMoney(ac)}
            </div>
            <span className="text-xs font-bold text-purple-700 dark:text-purple-400 block mt-1">
              مجموع {approvedStatementCount} صورت‌وضعیت تایید شده در دفتر فنی/CBS
            </span>
          </div>
          <p className="text-[11px] text-purple-800/80 dark:text-purple-300/80 mt-2">
            مجموع مبالغ صورت‌وضعیت‌ها و هزینه‌های تایید شده نهایی ثبت شده در سیستم.
          </p>
        </div>
      </div>
    </div>
  );
}
