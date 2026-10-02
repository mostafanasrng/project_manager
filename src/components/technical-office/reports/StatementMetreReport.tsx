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

export const StatementMetreReport: React.FC<Props> = ({
  statement,
  currentProject,
  minutes,
  metres,
  selectedProjectId,
  getCumulativeMinuteIdsForStatement,
  renderStatementReportHeader,
}) => {
  const minIds = getCumulativeMinuteIdsForStatement(statement);
  const rows = minIds.flatMap((minId) => {
    const min = minutes.find((m) => m.id === minId);
    const associatedMetres = metres.filter(
      (m) => m.minuteId === minId && m.projectId === selectedProjectId,
    );
    return associatedMetres.map((m) => ({
      ...m,
      minuteNumber: min?.number,
      minuteDesc: min?.description,
    }));
  });

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

  const groupedRows: { [plId: string]: typeof rows } = {};
  rows.forEach((row) => {
    const plId = getUnifiedPlId(row.priceListId);
    if (!groupedRows[plId]) {
      groupedRows[plId] = [];
    }
    groupedRows[plId].push(row);
  });

  const plKeys = Object.keys(groupedRows);

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
      {renderStatementReportHeader("گزارش ریزمتره تفصیلی صورت‌وضعیت (احجام و مقادیر ۳ جانبه)", statement)}

      <div className="space-y-8">
        {plKeys.map((plKey) => {
          const groupItems = groupedRows[plKey];

          // Sort rows so that rows with the same itemCode are placed together directly under each other
          const sortedGroupItems = [...groupItems].sort((a, b) => {
            const codeA = (a.itemCode || "").trim();
            const codeB = (b.itemCode || "").trim();
            const codeCompare = codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: "base" });
            if (codeCompare !== 0) return codeCompare;

            const minA = a.minuteNumber ? String(a.minuteNumber) : "";
            const minB = b.minuteNumber ? String(b.minuteNumber) : "";
            const minCompare = minA.localeCompare(minB, undefined, { numeric: true });
            if (minCompare !== 0) return minCompare;

            return (a.description || "").localeCompare(b.description || "");
          });

          return (
            <div
              key={plKey}
              className="border border-stone-300 rounded-2xl overflow-hidden shadow-sm bg-white"
            >
              <div className="bg-stone-100 p-3.5 font-black text-xs text-stone-800 border-b border-stone-300 flex justify-between items-center">
                <span>📋 ریزمتره تفصیلی فهرست بها: {getPlTitle(plKey)}</span>
                <span className="text-stone-500 font-bold">
                  تعداد ردیف‌ها: {sortedGroupItems.length.toLocaleString("fa-IR")}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[10px] text-stone-900">
                  <thead>
                    <tr className="bg-stone-200/90 text-stone-800 font-bold border-b border-stone-300">
                      <th className="p-2 w-8 text-center border-l border-stone-300" rowSpan={2}>ردیف</th>
                      <th className="p-2 w-16 text-center border-l border-stone-300" rowSpan={2}>کد آیتم</th>
                      <th className="p-2 text-right border-l border-stone-300" rowSpan={2}>شرح عملیات / صورت‌جلسه</th>
                      <th className="p-2 w-10 text-center border-l border-stone-300" rowSpan={2}>واحد</th>
                      <th className="p-1.5 text-center border-l border-stone-300 bg-amber-100/70 text-amber-900" colSpan={6}>
                        ادعای پیمانکار (ابعاد و مقادیر ثبتی)
                      </th>
                      <th className="p-1.5 text-center border-l border-stone-300 bg-blue-100/70 text-blue-900" colSpan={2}>
                        رسیدگی مشاور
                      </th>
                      <th className="p-1.5 text-center border-l border-stone-300 bg-purple-100/70 text-purple-900" colSpan={2}>
                        تایید کارفرما
                      </th>
                      <th className="p-2 w-16 text-center bg-emerald-100/80 text-emerald-900 font-black" rowSpan={2}>
                        مقدار ملاک عمل
                      </th>
                    </tr>
                    <tr className="bg-stone-100 text-[9px] font-bold text-stone-600 border-b border-stone-300">
                      <th className="p-1 text-center border-l border-stone-300 bg-amber-50">تعداد</th>
                      <th className="p-1 text-center border-l border-stone-300 bg-amber-50">طول</th>
                      <th className="p-1 text-center border-l border-stone-300 bg-amber-50">عرض</th>
                      <th className="p-1 text-center border-l border-stone-300 bg-amber-50">ارتفاع</th>
                      <th className="p-1 text-center border-l border-stone-300 bg-amber-50">ضریب</th>
                      <th className="p-1 text-center border-l border-stone-300 bg-amber-100/60 font-black text-amber-900">حجم ادعایی</th>
                      <th className="p-1 text-center border-l border-stone-300 bg-blue-50">ابعاد اصلاحی</th>
                      <th className="p-1 text-center border-l border-stone-300 bg-blue-100/60 font-black text-blue-900">حجم تایید مشاور</th>
                      <th className="p-1 text-center border-l border-stone-300 bg-purple-50">ابعاد ابلاغی</th>
                      <th className="p-1 text-center border-l border-stone-300 bg-purple-100/60 font-black text-purple-900">حجم نهایی کارفرما</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200">
                    {sortedGroupItems.map((row, idx) => {
                      const cCount = row.contractorCount ?? row.count;
                      const cLen = row.contractorLength ?? row.length;
                      const cWid = row.contractorWidth ?? row.width;
                      const cHgt = row.contractorHeight ?? row.height;
                      const cMult = row.contractorMultiplier ?? row.multiplier;
                      const cQty = row.contractorTotal !== undefined ? row.contractorTotal : row.partialTotal;

                      const consCount = row.consultantCount ?? cCount;
                      const consLen = row.consultantLength ?? cLen;
                      const consWid = row.consultantWidth ?? cWid;
                      const consHgt = row.consultantHeight ?? cHgt;
                      const consMult = row.consultantMultiplier ?? cMult;
                      const consQty = row.consultantTotal !== undefined ? row.consultantTotal : cQty;

                      const empCount = row.employerCount ?? consCount;
                      const empLen = row.employerLength ?? consLen;
                      const empWid = row.employerWidth ?? consWid;
                      const empHgt = row.employerHeight ?? consHgt;
                      const empMult = row.employerMultiplier ?? consMult;
                      const empQty = row.employerTotal !== undefined ? row.employerTotal : consQty;

                      const hasConsultantEdit = row.consultantTotal !== undefined && Math.abs(row.consultantTotal - cQty) > 0.0001;
                      const hasEmployerEdit = row.employerTotal !== undefined && Math.abs(row.employerTotal - consQty) > 0.0001;

                      return (
                        <tr key={idx} className="hover:bg-[#faf8f4]/60 transition-colors">
                          <td className="p-1.5 text-center border-l border-stone-200 font-mono text-[9px]">
                            {(idx + 1).toLocaleString("fa-IR")}
                          </td>
                          <td className="p-1.5 text-center border-l border-stone-200 font-bold font-mono text-stone-900 text-[10px]">
                            {row.itemCode}
                          </td>
                          <td className="p-1.5 text-right border-l border-stone-200">
                            <div className="font-bold text-stone-800">
                              ص.ج {row.minuteNumber}: {row.description}
                            </div>
                            {row.minuteDesc && (
                              <div className="text-[8.5px] text-stone-400 mt-0.5">
                                {row.minuteDesc}
                              </div>
                            )}
                          </td>
                          <td className="p-1.5 text-center border-l border-stone-200">
                            {row.unit || "---"}
                          </td>

                          {/* Contractor Columns */}
                          <td className="p-1 text-center border-l border-stone-200 font-mono bg-amber-50/20">{cCount.toLocaleString("fa-IR")}</td>
                          <td className="p-1 text-center border-l border-stone-200 font-mono bg-amber-50/20">{cLen.toLocaleString("fa-IR")}</td>
                          <td className="p-1 text-center border-l border-stone-200 font-mono bg-amber-50/20">{cWid.toLocaleString("fa-IR")}</td>
                          <td className="p-1 text-center border-l border-stone-200 font-mono bg-amber-50/20">{cHgt.toLocaleString("fa-IR")}</td>
                          <td className="p-1 text-center border-l border-stone-200 font-mono bg-amber-50/20">{cMult.toLocaleString("fa-IR")}</td>
                          <td className="p-1 text-center border-l border-stone-200 font-mono font-bold text-amber-900 bg-amber-50/40">
                            {cQty.toLocaleString("fa-IR")}
                          </td>

                          {/* Consultant Columns */}
                          <td className="p-1 text-center border-l border-stone-200 font-mono text-[9px] bg-blue-50/20">
                            {hasConsultantEdit ? (
                              <span className="text-blue-700 font-bold">
                                {consCount}×{consLen}×{consWid}×{consHgt}
                              </span>
                            ) : (
                              <span className="text-stone-400">تطابق با ادعا</span>
                            )}
                          </td>
                          <td className={`p-1 text-center border-l border-stone-200 font-mono font-bold bg-blue-50/30 ${hasConsultantEdit ? 'text-blue-700' : 'text-stone-700'}`}>
                            {consQty.toLocaleString("fa-IR")}
                          </td>

                          {/* Employer Columns */}
                          <td className="p-1 text-center border-l border-stone-200 font-mono text-[9px] bg-purple-50/20">
                            {hasEmployerEdit ? (
                              <span className="text-purple-700 font-bold">
                                {empCount}×{empLen}×{empWid}×{empHgt}
                              </span>
                            ) : (
                              <span className="text-stone-400">تطابق با مشاور</span>
                            )}
                          </td>
                          <td className={`p-1 text-center border-l border-stone-200 font-mono font-bold bg-purple-50/30 ${hasEmployerEdit ? 'text-purple-700' : 'text-stone-700'}`}>
                            {empQty.toLocaleString("fa-IR")}
                          </td>

                          {/* Effective Quantity */}
                          <td className="p-1 text-center font-mono font-black text-emerald-700 bg-emerald-50/50">
                            {row.partialTotal.toLocaleString("fa-IR")}
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
      </div>
    </div>
  );
};
