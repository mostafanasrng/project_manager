import React from "react";
import { Statement } from "../../../../types";

interface Props {
  statement: Statement;
  currentProject: any;
  getStatementItems: (statement: Statement) => any[];
  renderStatementReportHeader: (title: string, stmt: Statement) => React.ReactNode;
}

export const StatementFinancialBooksReport: React.FC<Props> = ({
  statement,
  currentProject,
  getStatementItems,
  renderStatementReportHeader,
}) => {
  const items = getStatementItems(statement);

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

  const groupedItems: {
    [plId: string]: {
      raw: number;
      coeff: number;
      contractorRaw: number;
      contractorCoeff: number;
      consultantRaw: number;
      consultantCoeff: number;
      employerRaw: number;
      employerCoeff: number;
    };
  } = {};

  items.forEach((row) => {
    const plId = getUnifiedPlId(row.priceListId);
    if (!groupedItems[plId]) {
      groupedItems[plId] = {
        raw: 0,
        coeff: 0,
        contractorRaw: 0,
        contractorCoeff: 0,
        consultantRaw: 0,
        consultantCoeff: 0,
        employerRaw: 0,
        employerCoeff: 0,
      };
    }
    groupedItems[plId].raw += row.rawAmnt || 0;
    groupedItems[plId].coeff += row.coeffAmnt || 0;
    groupedItems[plId].contractorRaw += row.contractorRawAmnt || row.rawAmnt || 0;
    groupedItems[plId].contractorCoeff += row.contractorCoeffAmnt || row.coeffAmnt || 0;
    groupedItems[plId].consultantRaw += row.consultantRawAmnt || row.rawAmnt || 0;
    groupedItems[plId].consultantCoeff += row.consultantCoeffAmnt || row.coeffAmnt || 0;
    groupedItems[plId].employerRaw += row.employerRawAmnt || row.rawAmnt || 0;
    groupedItems[plId].employerCoeff += row.employerCoeffAmnt || row.coeffAmnt || 0;
  });

  const plKeys = Object.keys(groupedItems);

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

  const totalRawSum = plKeys.reduce((sum, key) => sum + groupedItems[key].raw, 0);
  const totalCoeffSum = plKeys.reduce((sum, key) => sum + groupedItems[key].coeff, 0);
  const totalContractorRaw = plKeys.reduce((sum, key) => sum + groupedItems[key].contractorRaw, 0);
  const totalContractorCoeff = plKeys.reduce((sum, key) => sum + groupedItems[key].contractorCoeff, 0);
  const totalConsultantRaw = plKeys.reduce((sum, key) => sum + groupedItems[key].consultantRaw, 0);
  const totalConsultantCoeff = plKeys.reduce((sum, key) => sum + groupedItems[key].consultantCoeff, 0);
  const totalEmployerRaw = plKeys.reduce((sum, key) => sum + groupedItems[key].employerRaw, 0);
  const totalEmployerCoeff = plKeys.reduce((sum, key) => sum + groupedItems[key].employerCoeff, 0);

  return (
    <div className="space-y-8 p-1 text-right" dir="rtl">
      {renderStatementReportHeader("گزارش خلاصه مالی دفترچه‌ها صورت‌وضعیت (تفکیک ارکان)", statement)}

      <div className="border border-stone-300 rounded-2xl overflow-hidden shadow-sm bg-white">
        <div className="bg-stone-100 p-3.5 font-black text-xs text-stone-800 border-b border-stone-300 flex justify-between items-center">
          <span>📋 جدول مبالغ تفکیکی دفترچه‌های فهرست‌بها (مقایسه ۳ جانبه)</span>
          <span className="text-stone-500 font-bold">
            تعداد دفترچه‌ها: {plKeys.length.toLocaleString("fa-IR")}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs text-stone-900">
            <thead>
              <tr className="bg-stone-200/90 text-stone-800 font-bold border-b border-stone-300 text-[11px]">
                <th className="p-2.5 w-10 text-center border-l border-stone-300" rowSpan={2}>ردیف</th>
                <th className="p-2.5 text-right border-l border-stone-300" rowSpan={2}>عنوان دفترچه فهرست‌بها</th>
                <th className="p-2 text-center border-l border-stone-300 bg-amber-50" colSpan={2}>ادعای پیمانکار (ریال)</th>
                <th className="p-2 text-center border-l border-stone-300 bg-blue-50" colSpan={2}>رسیدگی مشاور (ریال)</th>
                <th className="p-2 text-center border-l border-stone-300 bg-purple-50" colSpan={2}>ابلاغ کارفرما (ریال)</th>
                <th className="p-2.5 w-36 text-center border-l border-stone-300 bg-emerald-50 text-emerald-900 font-black" rowSpan={2}>
                  مبلغ ملاک عمل نهایی
                </th>
                <th className="p-2.5 w-20 text-center" rowSpan={2}>وزن مالی</th>
              </tr>
              <tr className="bg-stone-100 text-[10px] font-bold text-stone-600 border-b border-stone-300">
                <th className="p-1.5 text-center border-l border-stone-300 bg-amber-50/60">مبلغ خام</th>
                <th className="p-1.5 text-center border-l border-stone-300 bg-amber-50/60">مبلغ با ضرایب</th>
                <th className="p-1.5 text-center border-l border-stone-300 bg-blue-50/60">مبلغ خام</th>
                <th className="p-1.5 text-center border-l border-stone-300 bg-blue-50/60">مبلغ با ضرایب</th>
                <th className="p-1.5 text-center border-l border-stone-300 bg-purple-50/60">مبلغ خام</th>
                <th className="p-1.5 text-center border-l border-stone-300 bg-purple-50/60">مبلغ با ضرایب</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {plKeys.map((plKey, index) => {
                const groupVal = groupedItems[plKey];
                const weight = totalCoeffSum > 0 ? (groupVal.coeff / totalCoeffSum) * 100 : 0;

                return (
                  <tr key={plKey} className="hover:bg-[#faf8f4]/60 transition-colors">
                    <td className="p-2.5 text-center border-l border-stone-200 font-black font-mono">
                      {(index + 1).toLocaleString("fa-IR")}
                    </td>
                    <td className="p-2.5 text-right border-l border-stone-200 font-bold text-stone-900">
                      {getPlTitle(plKey)}
                    </td>
                    <td className="p-2 text-center border-l border-stone-200 font-mono text-[11px] bg-amber-50/20">
                      {groupVal.contractorRaw.toLocaleString("fa-IR")}
                    </td>
                    <td className="p-2 text-center border-l border-stone-200 font-mono font-bold text-[11px] text-amber-900 bg-amber-50/30">
                      {groupVal.contractorCoeff.toLocaleString("fa-IR")}
                    </td>
                    <td className="p-2 text-center border-l border-stone-200 font-mono text-[11px] bg-blue-50/20">
                      {groupVal.consultantRaw.toLocaleString("fa-IR")}
                    </td>
                    <td className="p-2 text-center border-l border-stone-200 font-mono font-bold text-[11px] text-blue-900 bg-blue-50/30">
                      {groupVal.consultantCoeff.toLocaleString("fa-IR")}
                    </td>
                    <td className="p-2 text-center border-l border-stone-200 font-mono text-[11px] bg-purple-50/20">
                      {groupVal.employerRaw.toLocaleString("fa-IR")}
                    </td>
                    <td className="p-2 text-center border-l border-stone-200 font-mono font-bold text-[11px] text-purple-900 bg-purple-50/30">
                      {groupVal.employerCoeff.toLocaleString("fa-IR")}
                    </td>
                    <td className="p-2.5 text-center border-l border-stone-200 font-mono font-black text-emerald-700 bg-emerald-50/40">
                      {groupVal.coeff.toLocaleString("fa-IR")}
                    </td>
                    <td className="p-2.5 text-center font-mono font-bold text-stone-800">
                      {weight.toLocaleString("fa-IR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}٪
                    </td>
                  </tr>
                );
              })}

              {plKeys.length === 0 && (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-stone-400 font-bold">
                    هیچ آیتم یا دفترچه‌ای در این صورت‌وضعیت یافت نشد.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-stone-100 font-black text-stone-900 border-t-2 border-stone-400">
                <td colSpan={2} className="p-3 border-l border-stone-300 text-left">
                  جمع کل دفترچه‌های صورت‌وضعیت:
                </td>
                <td className="p-3 text-center border-l border-stone-300 font-mono text-[11px] bg-amber-50/60">
                  {totalContractorRaw.toLocaleString("fa-IR")}
                </td>
                <td className="p-3 text-center border-l border-stone-300 font-mono text-[11px] text-amber-900 bg-amber-100/70">
                  {totalContractorCoeff.toLocaleString("fa-IR")}
                </td>
                <td className="p-3 text-center border-l border-stone-300 font-mono text-[11px] bg-blue-50/60">
                  {totalConsultantRaw.toLocaleString("fa-IR")}
                </td>
                <td className="p-3 text-center border-l border-stone-300 font-mono text-[11px] text-blue-900 bg-blue-100/70">
                  {totalConsultantCoeff.toLocaleString("fa-IR")}
                </td>
                <td className="p-3 text-center border-l border-stone-300 font-mono text-[11px] bg-purple-50/60">
                  {totalEmployerRaw.toLocaleString("fa-IR")}
                </td>
                <td className="p-3 text-center border-l border-stone-300 font-mono text-[11px] text-purple-900 bg-purple-100/70">
                  {totalEmployerCoeff.toLocaleString("fa-IR")}
                </td>
                <td className="p-3 text-center border-l border-stone-300 font-mono font-black text-emerald-700 bg-emerald-100/80">
                  {totalCoeffSum.toLocaleString("fa-IR")}
                </td>
                <td className="p-3 text-center font-mono font-black text-amber-700">۱۰۰٪</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
