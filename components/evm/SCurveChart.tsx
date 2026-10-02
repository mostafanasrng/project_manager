import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine
} from 'recharts';
import { SCurveDataPoint } from '../../types';
import { TrendingUp, DollarSign, Percent, BarChart3, Eye, FileSpreadsheet, Layers, Info } from 'lucide-react';

interface SCurveChartProps {
  data: SCurveDataPoint[];
  bac: number;
  projectTitle?: string;
}

export default function SCurveChart({ data, bac, projectTitle }: SCurveChartProps) {
  const [viewMode, setViewMode] = useState<'PERCENTAGE' | 'AMOUNT'>('PERCENTAGE');
  const [showTable, setShowTable] = useState(true);

  // Format currency
  const formatToman = (val: number) => {
    const inBillion = val / 1000000000;
    if (Math.abs(inBillion) >= 1) {
      return `${inBillion.toFixed(2)} میلیارد`;
    }
    return `${(val / 1000000).toFixed(1)} میلیون`;
  };

  // Custom tooltip for Persian display
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const point = payload[0]?.payload as SCurveDataPoint;
      if (!point) return null;

      return (
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-xl border border-stone-200 dark:border-slate-800 text-xs space-y-2.5 font-['Vazirmatn'] min-w-[240px] z-50">
          <div className="flex items-center justify-between border-b border-stone-100 dark:border-slate-800 pb-2">
            <span className="font-black text-stone-900 dark:text-white">{point.periodLabel}</span>
            <span className="text-[10px] text-stone-400 dir-ltr">{point.date}</span>
          </div>

          <div className="space-y-1.5">
            {/* PV */}
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                ارزش برنامه‌ای (PV):
              </span>
              <span className="font-black text-stone-800 dark:text-slate-200">
                {viewMode === 'PERCENTAGE' ? `${point.plannedPercent}٪` : formatToman(point.pvAmount)}
              </span>
            </div>

            {/* EV */}
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                ارزش حاصله (EV):
              </span>
              <span className="font-black text-stone-800 dark:text-slate-200">
                {viewMode === 'PERCENTAGE' ? `${point.actualPercent}٪` : formatToman(point.evAmount)}
              </span>
            </div>

            {/* AC */}
            {point.acAmount !== undefined && (
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400 font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                  هزینه واقعی (AC):
                </span>
                <span className="font-black text-stone-800 dark:text-slate-200">
                  {viewMode === 'PERCENTAGE'
                    ? point.actualCostPercent !== undefined
                      ? `${point.actualCostPercent}٪`
                      : '-'
                    : formatToman(point.acAmount)}
                </span>
              </div>
            )}
          </div>

          {/* Indices in Tooltip */}
          {point.spi !== undefined && (
            <div className="pt-2 border-t border-stone-100 dark:border-slate-800 grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-stone-400 block text-[10px]">شاخص SPI:</span>
                <span className={`font-black ${point.spi >= 1 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {point.spi.toFixed(2)}
                </span>
              </div>
              {point.cpi !== undefined && (
                <div>
                  <span className="text-stone-400 block text-[10px]">شاخص CPI:</span>
                  <span className={`font-black ${point.cpi >= 1 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {point.cpi.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 lg:p-8 border border-stone-200/80 dark:border-slate-800 shadow-sm space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-black text-stone-900 dark:text-white flex items-center gap-2">
              <TrendingUp size={22} className="text-amber-500" />
              نمودار منحنی پیشرفت تجمیعی (S-Curve)
            </h3>
            <span className="px-2.5 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[11px] font-black rounded-lg">
              Cumulative Data
            </span>
          </div>
          <p className="text-xs text-stone-500 dark:text-slate-400 mt-1">
            مقایسه داده‌های انباشته سه متغیر بنیادی PV (برنامه‌ای)، EV (ارزش کسب شده) و AC (هزینه واقعی از صورت‌وضعیت‌ها)
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-2">
          <div className="bg-stone-100 dark:bg-slate-800 p-1 rounded-2xl flex items-center gap-1 border border-stone-200/60 dark:border-slate-700/60">
            <button
              onClick={() => setViewMode('PERCENTAGE')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                viewMode === 'PERCENTAGE'
                  ? 'bg-amber-500 text-stone-950 shadow-sm'
                  : 'text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white'
              }`}
            >
              <Percent size={14} />
              درصد پیشرفت (٪)
            </button>
            <button
              onClick={() => setViewMode('AMOUNT')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                viewMode === 'AMOUNT'
                  ? 'bg-amber-500 text-stone-950 shadow-sm'
                  : 'text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white'
              }`}
            >
              <DollarSign size={14} />
              مبالغ ریالی (تومان)
            </button>
          </div>

          <button
            onClick={() => setShowTable(!showTable)}
            className={`p-2 rounded-xl text-xs font-bold transition-all border ${
              showTable
                ? 'bg-stone-100 dark:bg-slate-800 text-stone-800 dark:text-white border-stone-300 dark:border-slate-700'
                : 'text-stone-400 hover:bg-stone-50 dark:hover:bg-slate-800 border-transparent'
            }`}
            title="نمایش / پنهان جدول داده‌ها"
          >
            <FileSpreadsheet size={18} />
          </button>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-[380px] w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#88888820" />
            <XAxis
              dataKey="periodLabel"
              stroke="#88888880"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#88888830' }}
            />
            <YAxis
              stroke="#88888880"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#88888830' }}
              domain={viewMode === 'PERCENTAGE' ? [0, 100] : ['auto', 'auto']}
              tickFormatter={(v) => (viewMode === 'PERCENTAGE' ? `${v}٪` : `${(v / 1000000000).toFixed(0)}B`)}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ paddingTop: '16px', fontSize: '12px', fontWeight: 'bold' }}
              formatter={(value) => {
                if (value === 'plannedPercent' || value === 'pvAmount') return 'ارزش برنامه‌ای (PV)';
                if (value === 'actualPercent' || value === 'evAmount') return 'ارزش کسب شده (EV)';
                if (value === 'actualCostPercent' || value === 'acAmount') return 'هزینه واقعی (AC - صورت وضعیت‌ها)';
                return value;
              }}
            />

            {/* PV Line (Blue) */}
            <Line
              type="monotone"
              dataKey={viewMode === 'PERCENTAGE' ? 'plannedPercent' : 'pvAmount'}
              stroke="#3b82f6"
              strokeWidth={3.5}
              dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 7, strokeWidth: 0 }}
              name={viewMode === 'PERCENTAGE' ? 'plannedPercent' : 'pvAmount'}
            />

            {/* EV Line (Emerald) */}
            <Line
              type="monotone"
              dataKey={viewMode === 'PERCENTAGE' ? 'actualPercent' : 'evAmount'}
              stroke="#10b981"
              strokeWidth={3.5}
              dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 7, strokeWidth: 0 }}
              name={viewMode === 'PERCENTAGE' ? 'actualPercent' : 'evAmount'}
            />

            {/* AC Line (Purple) */}
            <Line
              type="monotone"
              dataKey={viewMode === 'PERCENTAGE' ? 'actualCostPercent' : 'acAmount'}
              stroke="#8b5cf6"
              strokeWidth={3}
              strokeDasharray="4 4"
              dot={{ r: 4, fill: '#8b5cf6', strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 7, strokeWidth: 0 }}
              name={viewMode === 'PERCENTAGE' ? 'actualCostPercent' : 'acAmount'}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* S-Curve Data Table */}
      {showTable && (
        <div className="mt-6 pt-4 border-t border-stone-100 dark:border-slate-800">
          <h4 className="text-xs font-black text-stone-700 dark:text-slate-300 mb-3 flex items-center gap-2">
            <BarChart3 size={15} className="text-amber-500" />
            جدول انباشتگی داده‌های ادواری (Cumulative Periodic Breakdown)
          </h4>
          <div className="overflow-x-auto rounded-2xl border border-stone-200/80 dark:border-slate-800">
            <table className="w-full text-right text-xs">
              <thead className="bg-stone-50 dark:bg-slate-800/60 text-stone-500 dark:text-slate-400 font-black border-b border-stone-200/80 dark:border-slate-800">
                <tr>
                  <th className="p-3.5">دوره زمانی</th>
                  <th className="p-3.5 text-center">تاریخ</th>
                  <th className="p-3.5 text-center text-blue-600 dark:text-blue-400">PV انباشته (%)</th>
                  <th className="p-3.5 text-center text-emerald-600 dark:text-emerald-400">EV انباشته (%)</th>
                  <th className="p-3.5 text-center text-purple-600 dark:text-purple-400">AC انباشته (%)</th>
                  <th className="p-3.5 text-center">شاخص SPI</th>
                  <th className="p-3.5 text-center">شاخص CPI</th>
                  <th className="p-3.5 text-center">انحراف SV (تومان)</th>
                  <th className="p-3.5 text-center">انحراف CV (تومان)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-slate-800">
                {data.map((pt, idx) => (
                  <tr key={idx} className="hover:bg-stone-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5 font-bold text-stone-800 dark:text-white">{pt.periodLabel}</td>
                    <td className="p-3.5 text-center text-stone-500 dir-ltr">{pt.date}</td>
                    <td className="p-3.5 text-center font-black text-blue-600">{pt.plannedPercent}٪</td>
                    <td className="p-3.5 text-center font-black text-emerald-600">{pt.actualPercent}٪</td>
                    <td className="p-3.5 text-center font-black text-purple-600">
                      {pt.actualCostPercent !== undefined ? `${pt.actualCostPercent}٪` : '-'}
                    </td>
                    <td className="p-3.5 text-center font-bold">
                      {pt.spi !== undefined ? (
                        <span className={pt.spi >= 1 ? 'text-emerald-600' : 'text-rose-600'}>
                          {pt.spi.toFixed(2)}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="p-3.5 text-center font-bold">
                      {pt.cpi !== undefined ? (
                        <span className={pt.cpi >= 1 ? 'text-emerald-600' : 'text-rose-600'}>
                          {pt.cpi.toFixed(2)}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="p-3.5 text-center font-bold dir-ltr">
                      {pt.sv !== undefined ? (
                        <span className={pt.sv >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                          {formatToman(pt.sv)}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="p-3.5 text-center font-bold dir-ltr">
                      {pt.cv !== undefined ? (
                        <span className={pt.cv >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                          {formatToman(pt.cv)}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
