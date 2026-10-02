import React from "react";
import { Statement, ProjectMinute, MetreRow } from "../../../../types";

interface Props {
  statement: Statement;
  currentProject: any;
  minutes: ProjectMinute[];
  metres: MetreRow[];
  selectedProjectId: string;
  getCumulativeMinuteIdsForStatement: (statement: Statement) => string[];
  renderStatementReportHeader: (title: string, stmt: Statement) => React.ReactNode;
}

export const StatementSummaryMetreReport: React.FC<Props> = ({
  statement,
  currentProject,
  metres,
  selectedProjectId,
  getCumulativeMinuteIdsForStatement,
  renderStatementReportHeader,
}) => {
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

  const itemMap = new Map<string, any>();
  const minIds = getCumulativeMinuteIdsForStatement(statement);

  minIds.forEach((minId) => {
    const associatedMetres = metres.filter(
      (m) => m.minuteId === minId && m.projectId === selectedProjectId,
    );
    associatedMetres.forEach((m) => {
      const cQty = m.contractorTotal !== undefined ? m.contractorTotal : m.partialTotal;
      const consQty = m.consultantTotal !== undefined ? m.consultantTotal : cQty;
      const empQty = m.employerTotal !== undefined ? m.employerTotal : consQty;
      const plId = getUnifiedPlId(m.priceListId);
      const itemKey = `${plId}_${m.itemCode}`;

      if (itemMap.has(itemKey)) {
        const exist = itemMap.get(itemKey)!;
        exist.qty += m.partialTotal;
        exist.contractorQty += cQty;
        exist.consultantQty += consQty;
        exist.employerQty += empQty;
      } else {
        itemMap.set(itemKey, {
          code: m.itemCode,
          desc: m.description,
          unit: m.unit || "",
          qty: m.partialTotal,
          contractorQty: cQty,
          consultantQty: consQty,
          employerQty: empQty,
          priceListId: plId,
        });
      }
    });
  });

  const stmtItems = Array.from(itemMap.values());

  const groupedItems: { [plId: string]: typeof stmtItems } = {};
  stmtItems.forEach((row) => {
    const plId = getUnifiedPlId(row.priceListId);
    if (!groupedItems[plId]) {
      groupedItems[plId] = [];
    }
    groupedItems[plId].push(row);
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

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {renderStatementReportHeader("گزارش خلاصه متره تجمیعی صورت‌وضعیت (تفکیک فهارس بها و احجام ۳ جانبه)", statement)}

      <div className="space-y-8">
        {plKeys.map((plKey) => {
          const groupItems = groupedItems[plKey];

          return (
            <div
              key={plKey}
              className="border border-stone-300 rounded-2xl overflow-hidden shadow-sm bg-white"
            >
              <div className="bg-stone-100 p-3.5 font-black text-xs text-stone-800 border-b border-stone-300 flex justify-between items-center">
                <span>📋 خلاصه متره فهرست بها: {getPlTitle(plKey)}</span>
                <span className="text-stone-500 font-bold">
                  تعداد اقلام: {groupItems.length.toLocaleString("fa-IR")}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs text-stone-900">
                  <thead>
                    <tr className="bg-stone-200/90 text-stone-800 font-bold border-b border-stone-300 text-[11px]">
                      <th className="p-2.5 w-10 text-center border-l border-stone-300">ردیف</th>
                      <th className="p-2.5 w-24 text-center border-l border-stone-300">کد آیتم</th>
                      <th className="p-2.5 text-right border-l border-stone-300">شرح عملیات کارهای انجام شده</th>
                      <th className="p-2.5 w-16 text-center border-l border-stone-300">واحد</th>
                      <th className="p-2.5 w-28 text-center border-l border-stone-300 bg-amber-50 text-amber-900">مقدار ادعایی پیمانکار</th>
                      <th className="p-2.5 w-28 text-center border-l border-stone-300 bg-blue-50 text-blue-900">مقدار تایید مشاور</th>
                      <th className="p-2.5 w-28 text-center border-l border-stone-300 bg-purple-50 text-purple-900">مقدار تایید کارفرما</th>
                      <th className="p-2.5 w-28 text-center border-l border-stone-300 bg-emerald-50 text-emerald-900 font-black">مقدار ملاک عمل</th>
                      <th className="p-2.5 w-28 text-center">وضعیت تطابق</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200">
                    {groupItems.map((row, idx) => {
                      const cQty = row.contractorQty || 0;
                      const consQty = row.consultantQty || 0;
                      const empQty = row.employerQty || 0;
                      const finalQty = row.qty || 0;

                      const isConsultantDiff = Math.abs(consQty - cQty) > 0.001;
                      const isEmployerDiff = Math.abs(empQty - consQty) > 0.001;

                      return (
                        <tr key={idx} className="hover:bg-[#faf8f4]/60 transition-colors">
                          <td className="p-2.5 text-center border-l border-stone-200 font-mono text-[11px]">
                            {(idx + 1).toLocaleString("fa-IR")}
                          </td>
                          <td className="p-2.5 text-center font-mono font-bold text-stone-900 border-l border-stone-200">
                            {row.code}
                          </td>
                          <td className="p-2.5 text-right border-l border-stone-200 font-medium">
                            {row.desc}
                          </td>
                          <td className="p-2.5 text-center border-l border-stone-200 text-stone-600">
                            {row.unit || "---"}
                          </td>
                          <td className="p-2.5 text-center border-l border-stone-200 font-mono text-amber-900 bg-amber-50/20">
                            {cQty.toLocaleString("fa-IR")}
                          </td>
                          <td className={`p-2.5 text-center border-l border-stone-200 font-mono bg-blue-50/20 ${isConsultantDiff ? 'font-bold text-blue-700' : 'text-stone-700'}`}>
                            {consQty.toLocaleString("fa-IR")}
                          </td>
                          <td className={`p-2.5 text-center border-l border-stone-200 font-mono bg-purple-50/20 ${isEmployerDiff ? 'font-bold text-purple-700' : 'text-stone-700'}`}>
                            {empQty.toLocaleString("fa-IR")}
                          </td>
                          <td className="p-2.5 text-center border-l border-stone-200 font-mono font-black text-emerald-700 bg-emerald-50/30">
                            {finalQty.toLocaleString("fa-IR")}
                          </td>
                          <td className="p-2.5 text-center text-[10px]">
                            {isEmployerDiff ? (
                              <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full font-bold">اصلاح کارفرما</span>
                            ) : isConsultantDiff ? (
                              <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold">اصلاح مشاور</span>
                            ) : (
                              <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">تطابق کامل</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}

        {plKeys.length === 0 && (
          <div className="p-16 text-center bg-white border border-dashed border-stone-300 rounded-3xl">
            <h4 className="text-base font-black text-stone-800 mb-2">هیچ داده‌ای یافت نشد</h4>
            <p className="text-stone-500 text-xs max-w-md mx-auto">
              برای این صورت‌وضعیت هیچ آیتم ریزمتره‌ای در صورت‌جلسات انتخاب شده یافت نشد.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
