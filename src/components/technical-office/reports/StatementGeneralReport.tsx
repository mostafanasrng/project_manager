import React from "react";
import { Statement, ProjectMinute } from "../../../../types";

interface Props {
  statement: Statement;
  currentProject: any;
  getStatementTotals: (statement: Statement) => any;
  getStatementFinancials: (statement: Statement) => any;
  getMinuteTotals: (minuteId: string) => any;
  getStatementItems?: (statement: Statement) => any[];
  renderStatementReportHeader: (title: string, stmt: Statement) => React.ReactNode;
}

export const StatementGeneralReport: React.FC<Props> = ({
  statement,
  currentProject,
  getStatementTotals,
  getStatementFinancials,
  getMinuteTotals,
  getStatementItems,
  renderStatementReportHeader,
}) => {
  const financials = getStatementFinancials(statement);
  const totals = getStatementTotals(statement);

  const items = getStatementItems ? getStatementItems(statement) : [];

  const getUnifiedPlId = (plId: string | undefined) => {
    const rawId = plId || "default";
    if (
      rawId === "default" &&
      currentProject?.priceLists &&
      currentProject.priceLists.length === 1
    ) {
      return currentProject.priceLists[0].id;
    }
    return rawId;
  };

  const groupedPriceLists: {
    [plId: string]: {
      raw: number;
      coeff: number;
      contractorRaw: number;
      contractorCoeff: number;
      consultantRaw: number;
      consultantCoeff: number;
      employerRaw: number;
      employerCoeff: number;
      itemsCount: number;
    };
  } = {};

  items.forEach((row) => {
    const plId = getUnifiedPlId(row.priceListId);
    if (!groupedPriceLists[plId]) {
      groupedPriceLists[plId] = {
        raw: 0,
        coeff: 0,
        contractorRaw: 0,
        contractorCoeff: 0,
        consultantRaw: 0,
        consultantCoeff: 0,
        employerRaw: 0,
        employerCoeff: 0,
        itemsCount: 0,
      };
    }
    groupedPriceLists[plId].itemsCount += 1;
    groupedPriceLists[plId].raw += row.rawAmnt || 0;
    groupedPriceLists[plId].coeff += row.coeffAmnt || 0;
    groupedPriceLists[plId].contractorRaw += row.contractorRawAmnt || row.rawAmnt || 0;
    groupedPriceLists[plId].contractorCoeff += row.contractorCoeffAmnt || row.coeffAmnt || 0;
    groupedPriceLists[plId].consultantRaw += row.consultantRawAmnt || row.rawAmnt || 0;
    groupedPriceLists[plId].consultantCoeff += row.consultantCoeffAmnt || row.coeffAmnt || 0;
    groupedPriceLists[plId].employerRaw += row.employerRawAmnt || row.rawAmnt || 0;
    groupedPriceLists[plId].employerCoeff += row.employerCoeffAmnt || row.coeffAmnt || 0;
  });

  const plKeys = Object.keys(groupedPriceLists);

  const getPlTitle = (plId: string) => {
    if (plId && plId !== "default") {
      const found = currentProject?.priceLists?.find((pl: any) => pl.id === plId);
      if (found) return `${found.title} (${found.year || ""})`;
    }
    if (currentProject?.priceLists && currentProject.priceLists.length > 0) {
      return currentProject.priceLists
        .map((pl: any) => `${pl.title} (${pl.year || ""})`)
        .join(" و ");
    }
    return "فهرست بهای عمومی / پیش‌فرض";
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {renderStatementReportHeader("گزارش خلاصه مالی و کارکرد صورت‌وضعیت", statement)}

      {/* 3-Party Comparative Financial Matrix Card */}
      <div className="border border-stone-300 rounded-2xl overflow-hidden shadow-sm bg-white">
        <div className="bg-stone-900 text-white p-3.5 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
            <h4 className="font-black text-xs md:text-sm">جدول تطبیقی خلاصه مالی کارکرد (پیمانکار / مشاور / کارفرما)</h4>
          </div>
          <span className="text-[10px] text-stone-300 bg-stone-800 px-3 py-1 rounded-lg">واحد مبالغ: ریال</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs text-stone-900">
            <thead>
              <tr className="bg-stone-100 border-b border-stone-300 font-bold text-stone-700">
                <th className="p-3 text-right border-l border-stone-300 w-44">مرحله / رکن رسیدگی</th>
                <th className="p-3 text-center border-l border-stone-300">مبلغ تا دوره قبل</th>
                <th className="p-3 text-center border-l border-stone-300 bg-amber-50/70 text-amber-900">کارکرد این دوره</th>
                <th className="p-3 text-center bg-emerald-50/70 text-emerald-900">مبلغ تجمعی کل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {/* Contractor Claim Tier */}
              <tr className="hover:bg-amber-50/30 transition-colors">
                <td className="p-3 border-l border-stone-300 font-black flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <span>ادعای پیمانکار</span>
                  <span className="text-[9px] font-normal text-stone-400">(ارائه شده)</span>
                </td>
                <td className="p-3 text-center border-l border-stone-300 font-mono">
                  {(financials.contractor?.previous || 0).toLocaleString("fa-IR")}
                </td>
                <td className="p-3 text-center border-l border-stone-300 font-mono font-bold text-amber-700 bg-amber-50/30">
                  {(financials.contractor?.current || 0).toLocaleString("fa-IR")}
                </td>
                <td className="p-3 text-center font-mono font-black text-stone-900 bg-emerald-50/20">
                  {(financials.contractor?.cumulative || 0).toLocaleString("fa-IR")}
                </td>
              </tr>

              {/* Consultant Approved Tier */}
              <tr className="hover:bg-blue-50/30 transition-colors">
                <td className="p-3 border-l border-stone-300 font-black flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  <span>رسیدگی و تایید مشاور</span>
                  <span className="text-[9px] font-normal text-stone-400">(نظارت)</span>
                </td>
                <td className="p-3 text-center border-l border-stone-300 font-mono">
                  {(financials.consultant?.previous || 0).toLocaleString("fa-IR")}
                </td>
                <td className="p-3 text-center border-l border-stone-300 font-mono font-bold text-blue-700 bg-amber-50/30">
                  {(financials.consultant?.current || 0).toLocaleString("fa-IR")}
                </td>
                <td className="p-3 text-center font-mono font-black text-blue-900 bg-emerald-50/20">
                  {(financials.consultant?.cumulative || 0).toLocaleString("fa-IR")}
                </td>
              </tr>

              {/* Employer Final Tier */}
              <tr className="hover:bg-purple-50/30 transition-colors">
                <td className="p-3 border-l border-stone-300 font-black flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                  <span>تایید و ابلاغ کارفرما</span>
                  <span className="text-[9px] font-normal text-stone-400">(تصویب)</span>
                </td>
                <td className="p-3 text-center border-l border-stone-300 font-mono">
                  {(financials.employer?.previous || 0).toLocaleString("fa-IR")}
                </td>
                <td className="p-3 text-center border-l border-stone-300 font-mono font-bold text-purple-700 bg-amber-50/30">
                  {(financials.employer?.current || 0).toLocaleString("fa-IR")}
                </td>
                <td className="p-3 text-center font-mono font-black text-purple-900 bg-emerald-50/20">
                  {(financials.employer?.cumulative || 0).toLocaleString("fa-IR")}
                </td>
              </tr>

              {/* Final Effective Row */}
              <tr className="bg-stone-100/90 font-black text-stone-950 border-t-2 border-stone-400">
                <td className="p-3.5 border-l border-stone-300 flex items-center gap-2 text-emerald-800">
                  <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                  <span>مبلغ ملاک عمل نهایی سند</span>
                </td>
                <td className="p-3.5 text-center border-l border-stone-300 font-mono text-stone-800">
                  {(financials.previous || 0).toLocaleString("fa-IR")}
                </td>
                <td className="p-3.5 text-center border-l border-stone-300 font-mono text-amber-700 bg-amber-100/50">
                  {(financials.current || 0).toLocaleString("fa-IR")}
                </td>
                <td className="p-3.5 text-center font-mono text-emerald-700 bg-emerald-100/60 text-sm">
                  {(financials.cumulative || 0).toLocaleString("fa-IR")}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Price Lists Breakdown Card */}
      {plKeys.length > 0 && (
        <div className="border border-stone-300 rounded-2xl overflow-hidden shadow-sm bg-white">
          <div className="bg-stone-800 text-white p-3.5 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
              <h4 className="font-black text-xs md:text-sm">
                📋 جدول تفکیک مالی کارکرد به تفکیک فهارس‌بها (تفکیک چند فهرست‌بهایی)
              </h4>
            </div>
            <span className="text-[10px] text-stone-300 bg-stone-700 px-3 py-1 rounded-lg">
              تعداد فهارس‌بها: {plKeys.length.toLocaleString("fa-IR")}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs text-stone-900">
              <thead>
                <tr className="bg-stone-200/90 text-stone-800 font-bold border-b border-stone-300 text-[11px]">
                  <th className="p-2.5 w-10 text-center border-l border-stone-300" rowSpan={2}>ردیف</th>
                  <th className="p-2.5 text-right border-l border-stone-300" rowSpan={2}>عنوان فهرست‌بها / دفترچه</th>
                  <th className="p-2.5 w-16 text-center border-l border-stone-300" rowSpan={2}>تعداد اقلام</th>
                  <th className="p-2 text-center border-l border-stone-300 bg-amber-50" colSpan={2}>ادعای پیمانکار (ریال)</th>
                  <th className="p-2 text-center border-l border-stone-300 bg-blue-50" colSpan={2}>رسیدگی مشاور (ریال)</th>
                  <th className="p-2 text-center border-l border-stone-300 bg-purple-50" colSpan={2}>ابلاغ کارفرما (ریال)</th>
                  <th className="p-2.5 w-36 text-center bg-emerald-50 text-emerald-900 font-black" rowSpan={2}>
                    مبلغ ملاک عمل نهایی
                  </th>
                </tr>
                <tr className="bg-stone-100 text-[10px] font-bold text-stone-600 border-b border-stone-300">
                  <th className="p-1.5 text-center border-l border-stone-300 bg-amber-50/60">خام</th>
                  <th className="p-1.5 text-center border-l border-stone-300 bg-amber-50/60">با ضریب</th>
                  <th className="p-1.5 text-center border-l border-stone-300 bg-blue-50/60">خام</th>
                  <th className="p-1.5 text-center border-l border-stone-300 bg-blue-50/60">با ضریب</th>
                  <th className="p-1.5 text-center border-l border-stone-300 bg-purple-50/60">خام</th>
                  <th className="p-1.5 text-center border-l border-stone-300 bg-purple-50/60">با ضریب</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {plKeys.map((plKey, idx) => {
                  const g = groupedPriceLists[plKey];
                  return (
                    <tr key={plKey} className="hover:bg-[#faf8f4]/60 transition-colors">
                      <td className="p-2.5 text-center border-l border-stone-200 font-black font-mono">
                        {(idx + 1).toLocaleString("fa-IR")}
                      </td>
                      <td className="p-2.5 text-right border-l border-stone-200 font-bold text-stone-900">
                        {getPlTitle(plKey)}
                      </td>
                      <td className="p-2.5 text-center border-l border-stone-200 font-mono text-stone-600">
                        {g.itemsCount.toLocaleString("fa-IR")}
                      </td>
                      <td className="p-2 text-center border-l border-stone-200 font-mono text-[11px] bg-amber-50/20">
                        {g.contractorRaw.toLocaleString("fa-IR")}
                      </td>
                      <td className="p-2 text-center border-l border-stone-200 font-mono font-bold text-[11px] text-amber-900 bg-amber-50/30">
                        {g.contractorCoeff.toLocaleString("fa-IR")}
                      </td>
                      <td className="p-2 text-center border-l border-stone-200 font-mono text-[11px] bg-blue-50/20">
                        {g.consultantRaw.toLocaleString("fa-IR")}
                      </td>
                      <td className="p-2 text-center border-l border-stone-200 font-mono font-bold text-[11px] text-blue-900 bg-blue-50/30">
                        {g.consultantCoeff.toLocaleString("fa-IR")}
                      </td>
                      <td className="p-2 text-center border-l border-stone-200 font-mono text-[11px] bg-purple-50/20">
                        {g.employerRaw.toLocaleString("fa-IR")}
                      </td>
                      <td className="p-2 text-center border-l border-stone-200 font-mono font-bold text-[11px] text-purple-900 bg-purple-50/30">
                        {g.employerCoeff.toLocaleString("fa-IR")}
                      </td>
                      <td className="p-2 text-center font-mono font-black text-emerald-700 bg-emerald-50/50">
                        {g.coeff.toLocaleString("fa-IR")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Minutes Breakdown Table */}
      <div className="border border-stone-300 rounded-2xl overflow-hidden shadow-sm bg-white">
        <div className="bg-stone-100 p-3.5 border-b border-stone-300 flex justify-between items-center">
          <h4 className="font-black text-xs text-stone-900">
            {currentProject?.contractType === "CBS"
              ? "📋 ریز صورت‌جلسات پیشرفت پیوست به تفکیک مقادیر و احجام ارکان (CBS)"
              : "📋 ریز صورت‌جلسات کارکرد پیوست به تفکیک ادعا و تایید ارکان"}
          </h4>
          <span className="text-[10px] text-stone-500 font-bold">
            تعداد صورت‌جلسات: {(totals.includedMinutes?.length || 0).toLocaleString("fa-IR")}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs text-stone-900">
            <thead>
              <tr className="bg-stone-200/80 text-stone-800 font-bold border-b border-stone-300 text-[11px]">
                <th className="p-2.5 w-10 text-center border-l border-stone-300" rowSpan={2}>ردیف</th>
                <th className="p-2.5 w-20 text-center border-l border-stone-300" rowSpan={2}>شماره ص.ج</th>
                <th className="p-2.5 w-24 text-center border-l border-stone-300" rowSpan={2}>تاریخ</th>
                <th className="p-2.5 text-right border-l border-stone-300" rowSpan={2}>موضوع عملیات</th>
                <th className="p-2 text-center border-l border-stone-300 bg-amber-50" colSpan={2}>ادعای پیمانکار (ریال)</th>
                <th className="p-2 text-center border-l border-stone-300 bg-blue-50" colSpan={2}>رسیدگی مشاور (ریال)</th>
                <th className="p-2 text-center border-l border-stone-300 bg-purple-50" colSpan={2}>ابلاغ کارفرما (ریال)</th>
                <th className="p-2 text-center bg-emerald-50 text-emerald-900" rowSpan={2}>مبلغ ملاک عمل (با ضریب)</th>
              </tr>
              <tr className="bg-stone-100 text-[10px] font-bold text-stone-600 border-b border-stone-300">
                <th className="p-1.5 text-center border-l border-stone-300 bg-amber-50/50">خام</th>
                <th className="p-1.5 text-center border-l border-stone-300 bg-amber-50/50">با ضریب</th>
                <th className="p-1.5 text-center border-l border-stone-300 bg-blue-50/50">خام</th>
                <th className="p-1.5 text-center border-l border-stone-300 bg-blue-50/50">با ضریب</th>
                <th className="p-1.5 text-center border-l border-stone-300 bg-purple-50/50">خام</th>
                <th className="p-1.5 text-center border-l border-stone-300 bg-purple-50/50">با ضریب</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {(totals.includedMinutes || []).map((min: ProjectMinute, idx: number) => {
                const t = getMinuteTotals(min.id);
                return (
                  <tr key={min.id} className="hover:bg-[#faf8f4]/60 transition-colors">
                    <td className="p-2.5 text-center border-l border-stone-200 font-mono">
                      {(idx + 1).toLocaleString("fa-IR", { minimumIntegerDigits: 2 })}
                    </td>
                    <td className="p-2.5 text-center border-l border-stone-200 font-bold font-mono">
                      {min.number}
                    </td>
                    <td className="p-2.5 text-center border-l border-stone-200 text-[11px]">
                      {min.date}
                    </td>
                    <td className="p-2.5 text-right border-l border-stone-200">
                      <div className="font-bold text-stone-800">{min.description}</div>
                      {min.location && (
                        <div className="text-[10px] text-stone-400 mt-0.5">محل: {min.location}</div>
                      )}
                    </td>
                    <td className="p-2 text-center border-l border-stone-200 font-mono text-[11px] text-stone-600 bg-amber-50/20">
                      {(t.contractorRaw || t.raw || 0).toLocaleString("fa-IR")}
                    </td>
                    <td className="p-2 text-center border-l border-stone-200 font-mono font-bold text-[11px] text-amber-800 bg-amber-50/30">
                      {(t.contractorWithCoeff || t.withCoeff || 0).toLocaleString("fa-IR")}
                    </td>
                    <td className="p-2 text-center border-l border-stone-200 font-mono text-[11px] text-stone-600 bg-blue-50/20">
                      {(t.consultantRaw || t.raw || 0).toLocaleString("fa-IR")}
                    </td>
                    <td className="p-2 text-center border-l border-stone-200 font-mono font-bold text-[11px] text-blue-800 bg-blue-50/30">
                      {(t.consultantWithCoeff || t.withCoeff || 0).toLocaleString("fa-IR")}
                    </td>
                    <td className="p-2 text-center border-l border-stone-200 font-mono text-[11px] text-stone-600 bg-purple-50/20">
                      {(t.employerRaw || t.raw || 0).toLocaleString("fa-IR")}
                    </td>
                    <td className="p-2 text-center border-l border-stone-200 font-mono font-bold text-[11px] text-purple-800 bg-purple-50/30">
                      {(t.employerWithCoeff || t.withCoeff || 0).toLocaleString("fa-IR")}
                    </td>
                    <td className="p-2 text-center font-mono font-black text-[11px] text-emerald-700 bg-emerald-50/40">
                      {(t.withCoeff || 0).toLocaleString("fa-IR")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-stone-100 font-black text-stone-900 border-t-2 border-stone-400">
                <td colSpan={4} className="p-3 border-l border-stone-300 text-left">
                  جمع کل کارکرد صورت‌جلسات:
                </td>
                <td className="p-3 text-center border-l border-stone-300 font-mono text-[11px] bg-amber-50/60">
                  {(totals.contractorTotalRaw || totals.totalRaw || 0).toLocaleString("fa-IR")}
                </td>
                <td className="p-3 text-center border-l border-stone-300 font-mono text-[11px] text-amber-800 bg-amber-100/70">
                  {(totals.contractorTotalCoeff || totals.totalCoeff || 0).toLocaleString("fa-IR")}
                </td>
                <td className="p-3 text-center border-l border-stone-300 font-mono text-[11px] bg-blue-50/60">
                  {(totals.consultantTotalRaw || totals.totalRaw || 0).toLocaleString("fa-IR")}
                </td>
                <td className="p-3 text-center border-l border-stone-300 font-mono text-[11px] text-blue-800 bg-blue-100/70">
                  {(totals.consultantTotalCoeff || totals.totalCoeff || 0).toLocaleString("fa-IR")}
                </td>
                <td className="p-3 text-center border-l border-stone-300 font-mono text-[11px] bg-purple-50/60">
                  {(totals.employerTotalRaw || totals.totalRaw || 0).toLocaleString("fa-IR")}
                </td>
                <td className="p-3 text-center border-l border-stone-300 font-mono text-[11px] text-purple-800 bg-purple-100/70">
                  {(totals.employerTotalCoeff || totals.totalCoeff || 0).toLocaleString("fa-IR")}
                </td>
                <td className="p-3 text-center font-mono font-black text-emerald-700 bg-emerald-100/80">
                  {(totals.totalCoeff || 0).toLocaleString("fa-IR")}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
