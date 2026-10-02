import React from "react";
import { Statement } from "../../../../types";

interface Props {
  statement: Statement;
  currentProject: any;
  getStatementItems: (statement: Statement) => any[];
  renderStatementReportHeader: (title: string, stmt: Statement) => React.ReactNode;
}

const CHAPTER_NAMES_MAP: { [code: string]: string } = {
  "01": "عملیات تخریب",
  "02": "عملیات خاکی با دست",
  "03": "عملیات خاکی با ماشین",
  "04": "عملیات بنایی با سنگ",
  "05": "قالب‌بندی و چوب‌بست",
  "06": "کارهای فولادی با میلگرد",
  "07": "کارهای بتنی درجا",
  "08": "بتن پیش‌ساخته و بلوک‌چینی",
  "09": "کارهای فولادی سنگین",
  "10": "سقف سبک بتنی",
  "11": "آجرکاری و شفته‌ریزی",
  "12": "بتن سبک و بتن مگر",
  "13": "عایق‌کاری رطوبتی",
  "14": "عایق‌کاری حرارتی و صوتی",
  "15": "کارهای دست، ابزار و یراق",
  "16": "کارهای فلزی سبک",
  "17": "کارهای آلومینیومی",
  "18": "کارهای چوبی",
  "19": "کارهای پلاستیکی و پلیمری",
  "20": "شیشه‌بری و نصب شیشه",
  "21": "رنگ‌آمیزی",
  "22": "کارهای آسفالتی",
  "23": "درزگیری و بندکشی",
  "24": "کاشی و سرامیک‌کاری",
  "25": "موزاییک‌کاری",
  "26": "سنگ‌کاری با سنگ پلاک",
  "27": "کارهای سنگی با سنگ لاشه",
  "28": "برچسب و پوشش‌های دیواری",
  "29": "کارهای راه‌سازی",
  "30": "کارهای متفرقه",
};

export const StatementFinancialReport: React.FC<Props> = ({
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

  const groupedItems: { [plId: string]: typeof items } = {};
  items.forEach((row) => {
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

  const getChapterTitle = (chapterCode: string, itemsInChapter?: any[]) => {
    const paddedCode = chapterCode.padStart(2, "0");

    if (itemsInChapter && itemsInChapter.length > 0) {
      const combinedDesc = itemsInChapter
        .map((it) => (it.desc || it.description || it.title || "").toLowerCase())
        .join(" ");

      const hasConcrete =
        combinedDesc.includes("بتن") ||
        combinedDesc.includes("درجا") ||
        combinedDesc.includes("بتن ریزی") ||
        combinedDesc.includes("بتن‌ریزی") ||
        combinedDesc.includes("عیار") ||
        combinedDesc.includes("مگر");

      const hasPrecastOrBlock =
        combinedDesc.includes("پیش ساخته") ||
        combinedDesc.includes("پیش‌ساخته") ||
        combinedDesc.includes("بلوک") ||
        combinedDesc.includes("بلوک‌چینی") ||
        combinedDesc.includes("بلوک چینی");

      if (
        paddedCode === "08" ||
        paddedCode === "07" ||
        paddedCode === "12" ||
        paddedCode === "10"
      ) {
        if (hasConcrete && !hasPrecastOrBlock) {
          return "کارهای بتنی درجا";
        }
        if (hasPrecastOrBlock) {
          return "بتن پیش‌ساخته و بلوک‌چینی";
        }
      }
    }

    return CHAPTER_NAMES_MAP[paddedCode] || `عملیات فصل ${paddedCode}`;
  };

  let grandTotalContractorRaw = 0;
  let grandTotalContractorCoeff = 0;
  let grandTotalConsultantRaw = 0;
  let grandTotalConsultantCoeff = 0;
  let grandTotalEmployerRaw = 0;
  let grandTotalEmployerCoeff = 0;
  let grandTotalEffectiveRaw = 0;
  let grandTotalEffectiveCoeff = 0;

  return (
    <div className="space-y-8 p-1 text-right" dir="rtl">
      {renderStatementReportHeader("گزارش خلاصه مالی صورت‌وضعیت (ریز محاسبات اقلام و ضرایب به تفکیک فصول)", statement)}

      {plKeys.map((plKey) => {
        const groupItems = groupedItems[plKey];
        const chapterMap = new Map<
          string,
          {
            raw: number;
            coeff: number;
            contractorRaw: number;
            contractorCoeff: number;
            consultantRaw: number;
            consultantCoeff: number;
            employerRaw: number;
            employerCoeff: number;
            items: {
              code: string;
              desc: string;
              unit: string;
              unitPrice: number;
              qty: number;
              contractorQty: number;
              consultantQty: number;
              employerQty: number;
            }[];
          }
        >();

        // 1. Group items by chapter, and aggregate items by itemCode from summary metre data
        const chapterItemsByCode = new Map<
          string,
          Map<
            string,
            {
              code: string;
              desc: string;
              unit: string;
              unitPrice: number;
              qty: number;
              contractorQty: number;
              consultantQty: number;
              employerQty: number;
            }
          >
        >();

        groupItems.forEach((it) => {
          const chapter = it.code.substring(0, 2);
          if (!chapterItemsByCode.has(chapter)) {
            chapterItemsByCode.set(chapter, new Map());
          }
          const codeMap = chapterItemsByCode.get(chapter)!;

          const cQty = it.contractorQty !== undefined ? it.contractorQty : it.qty;
          const consQty = it.consultantQty !== undefined ? it.consultantQty : cQty;
          const empQty = it.employerQty !== undefined ? it.employerQty : consQty;
          const effQty = it.qty !== undefined ? it.qty : empQty;
          const up = it.unitPrice || (effQty > 0 && it.rawAmnt ? Math.round(it.rawAmnt / effQty) : 0);

          if (codeMap.has(it.code)) {
            const exist = codeMap.get(it.code)!;
            exist.qty += effQty;
            exist.contractorQty += cQty;
            exist.consultantQty += consQty;
            exist.employerQty += empQty;
            if (!exist.unitPrice && up > 0) {
              exist.unitPrice = up;
            }
          } else {
            codeMap.set(it.code, {
              code: it.code,
              desc: it.desc,
              unit: it.unit || "",
              unitPrice: up,
              qty: effQty,
              contractorQty: cQty,
              consultantQty: consQty,
              employerQty: empQty,
            });
          }
        });

        // 2. Calculate Chapter Coeff Multipliers and generate aggregated item rows and totals
        const c: any = currentProject?.coefficients || {};
        const regional = c.regional || 1;
        const overhead = c.overhead || 1;
        const contractor = c.contractor || 1;
        const equipment = c.equipment || 1;
        const others = c.others || 1;

        let baseMultiplier = regional * overhead * contractor * equipment * others;
        c.generalCoefficients?.forEach((gc: any) => {
          baseMultiplier *= gc.value || 1;
        });

        chapterItemsByCode.forEach((codeMap, chapter) => {
          const chapterMatch = c.chapterCoefficients?.find(
            (cc: any) => cc.chapterCode === chapter,
          );
          const chapterCoeff = chapterMatch ? chapterMatch.multiplier : 1;
          const totalCoeffMultiplier = baseMultiplier * chapterCoeff;

          let chapterRaw = 0;
          let chapterCoeffSum = 0;
          let chapterContractorRaw = 0;
          let chapterContractorCoeff = 0;
          let chapterConsultantRaw = 0;
          let chapterConsultantCoeff = 0;
          let chapterEmployerRaw = 0;
          let chapterEmployerCoeff = 0;

          const aggregatedItems = Array.from(codeMap.values()).map((row) => {
            const lineRaw = row.qty * row.unitPrice;
            const lineContractorRaw = row.contractorQty * row.unitPrice;
            const lineConsultantRaw = row.consultantQty * row.unitPrice;
            const lineEmployerRaw = row.employerQty * row.unitPrice;

            const lineCoeff = Math.round(lineRaw * totalCoeffMultiplier);
            const lineContractorCoeff = Math.round(lineContractorRaw * totalCoeffMultiplier);
            const lineConsultantCoeff = Math.round(lineConsultantRaw * totalCoeffMultiplier);
            const lineEmployerCoeff = Math.round(lineEmployerRaw * totalCoeffMultiplier);

            chapterRaw += lineRaw;
            chapterCoeffSum += lineCoeff;
            chapterContractorRaw += lineContractorRaw;
            chapterContractorCoeff += lineContractorCoeff;
            chapterConsultantRaw += lineConsultantRaw;
            chapterConsultantCoeff += lineConsultantCoeff;
            chapterEmployerRaw += lineEmployerRaw;
            chapterEmployerCoeff += lineEmployerCoeff;

            return row;
          });

          chapterMap.set(chapter, {
            raw: chapterRaw,
            coeff: chapterCoeffSum,
            contractorRaw: chapterContractorRaw,
            contractorCoeff: chapterContractorCoeff,
            consultantRaw: chapterConsultantRaw,
            consultantCoeff: chapterConsultantCoeff,
            employerRaw: chapterEmployerRaw,
            employerCoeff: chapterEmployerCoeff,
            items: aggregatedItems,
          });
        });

        const sortedChapters = Array.from(chapterMap.entries()).sort((a, b) =>
          a[0].localeCompare(b[0]),
        );

        const totalRaw = sortedChapters.reduce((sum, [, t]) => sum + t.raw, 0);
        const totalCoeff = sortedChapters.reduce((sum, [, t]) => sum + t.coeff, 0);
        const totalContractorRaw = sortedChapters.reduce((sum, [, t]) => sum + t.contractorRaw, 0);
        const totalContractorCoeff = sortedChapters.reduce((sum, [, t]) => sum + t.contractorCoeff, 0);
        const totalConsultantRaw = sortedChapters.reduce((sum, [, t]) => sum + t.consultantRaw, 0);
        const totalConsultantCoeff = sortedChapters.reduce((sum, [, t]) => sum + t.consultantCoeff, 0);
        const totalEmployerRaw = sortedChapters.reduce((sum, [, t]) => sum + t.employerRaw, 0);
        const totalEmployerCoeff = sortedChapters.reduce((sum, [, t]) => sum + t.employerCoeff, 0);

        grandTotalEffectiveRaw += totalRaw;
        grandTotalEffectiveCoeff += totalCoeff;
        grandTotalContractorRaw += totalContractorRaw;
        grandTotalContractorCoeff += totalContractorCoeff;
        grandTotalConsultantRaw += totalConsultantRaw;
        grandTotalConsultantCoeff += totalConsultantCoeff;
        grandTotalEmployerRaw += totalEmployerRaw;
        grandTotalEmployerCoeff += totalEmployerCoeff;

        return (
          <div key={plKey} className="space-y-10">
            <div className="bg-stone-100 p-3.5 rounded-2xl font-black text-xs text-stone-800 border border-stone-300 flex justify-between items-center">
              <span>📋 فهرست بهای مبنا: {getPlTitle(plKey)}</span>
              <span className="text-stone-500 font-bold">
                تعداد فصول دارای کارکرد: {sortedChapters.length.toLocaleString("fa-IR")}
              </span>
            </div>

            {/* Detailed Itemized Chapter Tables */}
            <div className="space-y-8">
              {sortedChapters.map(([chapter, totals]) => {
                const c: any = currentProject?.coefficients || {};
                const regional = c.regional || 1;
                const overhead = c.overhead || 1;
                const contractor = c.contractor || 1;
                const equipment = c.equipment || 1;
                const others = c.others || 1;

                let baseMultiplier = regional * overhead * contractor * equipment * others;
                c.generalCoefficients?.forEach((gc: any) => {
                  baseMultiplier *= gc.value || 1;
                });

                const chapterMatch = c.chapterCoefficients?.find(
                  (cc: any) => cc.chapterCode === chapter,
                );
                const chapterCoeff = chapterMatch ? chapterMatch.multiplier : 1;
                const totalCoeffMultiplier = baseMultiplier * chapterCoeff;

                const activeCoeffs: { name: string; value: number }[] = [];
                if (regional && regional !== 1) activeCoeffs.push({ name: "منطقه", value: regional });
                if (overhead && overhead !== 1) activeCoeffs.push({ name: "بالاسری", value: overhead });
                if (contractor && contractor !== 1) activeCoeffs.push({ name: "پیشنهادی پیمانکار", value: contractor });
                if (equipment && equipment !== 1) activeCoeffs.push({ name: "تجهیز کارگاه", value: equipment });
                if (others && others !== 1) activeCoeffs.push({ name: "سایر", value: others });

                c.generalCoefficients?.forEach((gc: any) => {
                  if (gc.value && gc.value !== 1) {
                    activeCoeffs.push({ name: gc.name || "ضریب عمومی", value: gc.value });
                  }
                });

                if (chapterCoeff && chapterCoeff !== 1) {
                  activeCoeffs.push({ name: `ضریب فصل ${chapter}`, value: chapterCoeff });
                }

                return (
                  <div
                    key={chapter}
                    className="border border-stone-300 rounded-2xl overflow-hidden shadow-sm bg-white"
                  >
                    <div className="bg-stone-800 text-white p-3 font-bold text-xs flex justify-between items-center">
                      <span>📋 فصل {chapter}: {getChapterTitle(chapter, totals.items)}</span>
                      <span className="font-mono text-[10px] bg-stone-700 px-3 py-1 rounded-md">
                        تعداد ردیف‌ها: {totals.items.length.toLocaleString("fa-IR")}
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-xs text-stone-900">
                        <thead>
                          <tr className="bg-stone-100 text-stone-800 font-bold border-b border-stone-300 text-[11px]">
                            <th className="p-2 w-8 text-center border-l border-stone-300">ردیف</th>
                            <th className="p-2 w-20 text-center border-l border-stone-300">کد آیتم</th>
                            <th className="p-2 text-right border-l border-stone-300">شرح عملیات کارهای انجام شده</th>
                            <th className="p-2 w-14 text-center border-l border-stone-300">واحد</th>
                            <th className="p-2 w-24 text-center border-l border-stone-300">بهای واحد (ریال)</th>
                            <th className="p-2 w-28 text-center border-l border-stone-300 bg-amber-50 text-amber-900">مقدار ادعایی پیمانکار</th>
                            <th className="p-2 w-28 text-center border-l border-stone-300 bg-blue-50 text-blue-900">مقدار رسیدگی مشاور</th>
                            <th className="p-2 w-28 text-center border-l border-stone-300 bg-purple-50 text-purple-900">مقدار تایید کارفرما</th>
                            <th className="p-2 w-28 text-center bg-emerald-50 text-emerald-900 font-black">مقدار ملاک عمل</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-200">
                          {totals.items.map((row, idx) => {
                            return (
                              <tr key={idx} className="hover:bg-[#faf8f4]/60 transition-colors">
                                <td className="p-2 text-center border-l border-stone-200 font-mono text-[10px]">
                                  {(idx + 1).toLocaleString("fa-IR")}
                                </td>
                                <td className="p-2 text-center font-mono font-bold text-stone-900 border-l border-stone-200">
                                  {row.code}
                                </td>
                                <td className="p-2 text-right border-l border-stone-200 font-medium">
                                  {row.desc}
                                </td>
                                <td className="p-2 text-center border-l border-stone-200 text-stone-600">
                                  {row.unit || "---"}
                                </td>
                                <td className="p-2 text-center border-l border-stone-200 font-mono text-stone-800 font-bold">
                                  {row.unitPrice.toLocaleString("fa-IR")}
                                </td>
                                <td className="p-2 text-center border-l border-stone-200 font-mono text-[11px] font-bold text-amber-900 bg-amber-50/20">
                                  {row.contractorQty.toLocaleString("fa-IR")}
                                </td>
                                <td className="p-2 text-center border-l border-stone-200 font-mono text-[11px] font-bold text-blue-900 bg-blue-50/20">
                                  {row.consultantQty.toLocaleString("fa-IR")}
                                </td>
                                <td className="p-2 text-center border-l border-stone-200 font-mono text-[11px] font-bold text-purple-900 bg-purple-50/20">
                                  {row.employerQty.toLocaleString("fa-IR")}
                                </td>
                                <td className="p-2 text-center font-mono text-[11px] font-black text-emerald-900 bg-emerald-50/40">
                                  {row.qty.toLocaleString("fa-IR")}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          {/* Row 1: Raw Totals */}
                          <tr className="bg-stone-50 font-bold text-stone-800 border-t-2 border-stone-300 text-[11px]">
                            <td colSpan={5} className="p-2.5 border-l border-stone-300 text-left font-black">
                              مجموع بهای ناخالص (مبلغ خام فصل {chapter}):
                            </td>
                            <td className="p-2 text-center border-l border-stone-300 font-mono text-[11px] font-bold text-amber-900 bg-amber-100/50">
                              {totals.contractorRaw.toLocaleString("fa-IR")} <span className="text-[9px] font-normal opacity-70">ریال</span>
                            </td>
                            <td className="p-2 text-center border-l border-stone-300 font-mono text-[11px] font-bold text-blue-900 bg-blue-100/50">
                              {totals.consultantRaw.toLocaleString("fa-IR")} <span className="text-[9px] font-normal opacity-70">ریال</span>
                            </td>
                            <td className="p-2 text-center border-l border-stone-300 font-mono text-[11px] font-bold text-purple-900 bg-purple-100/50">
                              {totals.employerRaw.toLocaleString("fa-IR")} <span className="text-[9px] font-normal opacity-70">ریال</span>
                            </td>
                            <td className="p-2 text-center font-mono text-[11px] font-black text-emerald-900 bg-emerald-100/60">
                              {totals.raw.toLocaleString("fa-IR")} <span className="text-[9px] font-normal opacity-70">ریال</span>
                            </td>
                          </tr>

                          {/* Row 2: Final Totals with Multipliers */}
                          <tr className="bg-stone-100 font-black text-stone-900 border-t border-stone-300 text-[11px]">
                            <td colSpan={5} className="p-2.5 border-l border-stone-300 text-left">
                              مجموع مبالغ نهایی با ضرایب فصل {chapter}:
                            </td>
                            <td className="p-2 text-center border-l border-stone-300 font-mono text-[11px] font-black text-amber-950 bg-amber-100/80">
                              {totals.contractorCoeff.toLocaleString("fa-IR")} <span className="text-[9px] font-normal opacity-70">ریال</span>
                            </td>
                            <td className="p-2 text-center border-l border-stone-300 font-mono text-[11px] font-black text-blue-950 bg-blue-100/80">
                              {totals.consultantCoeff.toLocaleString("fa-IR")} <span className="text-[9px] font-normal opacity-70">ریال</span>
                            </td>
                            <td className="p-2 text-center border-l border-stone-300 font-mono text-[11px] font-black text-purple-950 bg-purple-100/80">
                              {totals.employerCoeff.toLocaleString("fa-IR")} <span className="text-[9px] font-normal opacity-70">ریال</span>
                            </td>
                            <td className="p-2 text-center font-mono font-black text-emerald-800 bg-emerald-100/90">
                              {totals.coeff.toLocaleString("fa-IR")} <span className="text-[9px] font-normal opacity-70">ریال</span>
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* Coefficient formula details */}
                    <div className="p-4 bg-[#faf8f4]/50 border-t border-stone-200 text-xs">
                      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
                        <div className="space-y-1">
                          <span className="font-bold text-stone-800">
                            ⚙️ ضرایب اعمال‌شده روی اقلام فصل {chapter} ({getChapterTitle(chapter, totals.items)}):
                          </span>
                          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-stone-600 font-medium mt-1">
                            {activeCoeffs.map((ac, i) => (
                              <span key={i} className="bg-white px-2 py-0.5 rounded border border-stone-200 shadow-xs">
                                {ac.name}: <span className="font-bold text-stone-900 font-mono">{ac.value}</span>
                              </span>
                            ))}
                            {activeCoeffs.length === 0 && (
                              <span className="text-stone-400">هیچ ضریبی اعمال نشده است (ضریب ۱.۰۰)</span>
                            )}
                          </div>
                        </div>
                        <div className="bg-[#faf8f4] border border-blue-200 rounded-lg px-4 py-2 text-left font-mono text-sm font-black text-stone-950 self-start md:self-center" style={{ direction: "ltr" }}>
                          {activeCoeffs.length > 0 ? (
                            <span>
                              {activeCoeffs.map((ac) => ac.value).join(" * ")} ={" "}
                              {totalCoeffMultiplier.toLocaleString("en-US", {
                                minimumFractionDigits: 4,
                                maximumFractionDigits: 4,
                              })}
                            </span>
                          ) : (
                            <span>1.0000</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Grand Total Multi-party Comparison Summary Panel */}
      <div className="border border-stone-400 bg-stone-900 text-white rounded-2xl overflow-hidden p-6 shadow-md text-xs font-black leading-relaxed mt-8">
        <h4 className="text-sm border-b border-stone-800 pb-2 mb-4 text-emerald-400 font-black flex items-center gap-2">
          <span>📊</span>
          <span>خلاصه کل نهایی کارکرد مالی اقلام صورت‌وضعیت به تفکیک ارکان پیمان</span>
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-stone-800/90 p-4 rounded-xl border border-amber-500/40">
            <div className="text-amber-400 font-black text-xs mb-2">ادعای کل پیمانکار</div>
            <div className="text-stone-300 text-[11px] mb-1">
              مجموع خام: <span className="font-mono text-white">{grandTotalContractorRaw.toLocaleString("fa-IR")}</span> ریال
            </div>
            <div className="text-stone-300 text-[11px]">
              مجموع با ضرایب: <span className="font-mono text-amber-400 text-sm font-black">{grandTotalContractorCoeff.toLocaleString("fa-IR")}</span> ریال
            </div>
          </div>

          <div className="bg-stone-800/90 p-4 rounded-xl border border-blue-500/40">
            <div className="text-blue-400 font-black text-xs mb-2">رسیدگی کل مشاور</div>
            <div className="text-stone-300 text-[11px] mb-1">
              مجموع خام: <span className="font-mono text-white">{grandTotalConsultantRaw.toLocaleString("fa-IR")}</span> ریال
            </div>
            <div className="text-stone-300 text-[11px]">
              مجموع با ضرایب: <span className="font-mono text-blue-400 text-sm font-black">{grandTotalConsultantCoeff.toLocaleString("fa-IR")}</span> ریال
            </div>
          </div>

          <div className="bg-stone-800/90 p-4 rounded-xl border border-purple-500/40">
            <div className="text-purple-400 font-black text-xs mb-2">تایید و ابلاغ کل کارفرما</div>
            <div className="text-stone-300 text-[11px] mb-1">
              مجموع خام: <span className="font-mono text-white">{grandTotalEmployerRaw.toLocaleString("fa-IR")}</span> ریال
            </div>
            <div className="text-stone-300 text-[11px]">
              مجموع با ضرایب: <span className="font-mono text-purple-400 text-sm font-black">{grandTotalEmployerCoeff.toLocaleString("fa-IR")}</span> ریال
            </div>
          </div>

          <div className="bg-stone-800/90 p-4 rounded-xl border border-emerald-500/50">
            <div className="text-emerald-400 font-black text-xs mb-2">ملاک عمل نهایی</div>
            <div className="text-stone-300 text-[11px] mb-1">
              مجموع خام: <span className="font-mono text-white">{grandTotalEffectiveRaw.toLocaleString("fa-IR")}</span> ریال
            </div>
            <div className="text-stone-300 text-[11px]">
              مجموع با ضرایب: <span className="font-mono text-emerald-400 text-sm font-black">{grandTotalEffectiveCoeff.toLocaleString("fa-IR")}</span> ریال
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
