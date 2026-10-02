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

export const StatementFinancialChaptersReport: React.FC<Props> = ({
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
      {renderStatementReportHeader("گزارش خلاصه مالی فصول صورت‌وضعیت (تفکیک ارکان و ضرایب)", statement)}

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
              rawAmnt: number;
              coeffAmnt: number;
              contractorQty: number;
              contractorRawAmnt: number;
              contractorCoeffAmnt: number;
              consultantQty: number;
              consultantRawAmnt: number;
              consultantCoeffAmnt: number;
              employerQty: number;
              employerRawAmnt: number;
              employerCoeffAmnt: number;
            }[];
          }
        >();

        // 1. Group items by chapter, and aggregate items by itemCode within each chapter
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
              rawAmnt: number;
              contractorQty: number;
              contractorRawAmnt: number;
              consultantQty: number;
              consultantRawAmnt: number;
              employerQty: number;
              employerRawAmnt: number;
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

          const raw = it.rawAmnt || 0;
          const cRaw = it.contractorRawAmnt !== undefined ? it.contractorRawAmnt : raw;
          const consRaw = it.consultantRawAmnt !== undefined ? it.consultantRawAmnt : raw;
          const empRaw = it.employerRawAmnt !== undefined ? it.employerRawAmnt : raw;

          if (codeMap.has(it.code)) {
            const exist = codeMap.get(it.code)!;
            exist.qty += it.qty;
            exist.rawAmnt += raw;
            exist.contractorQty += cQty;
            exist.contractorRawAmnt += cRaw;
            exist.consultantQty += consQty;
            exist.consultantRawAmnt += consRaw;
            exist.employerQty += empQty;
            exist.employerRawAmnt += empRaw;
            if (!exist.unitPrice && exist.qty > 0) {
              exist.unitPrice = Math.round(exist.rawAmnt / exist.qty);
            }
          } else {
            const calculatedUnitPrice = it.qty > 0 ? Math.round(raw / it.qty) : 0;
            codeMap.set(it.code, {
              code: it.code,
              desc: it.desc,
              unit: it.unit || "",
              unitPrice: calculatedUnitPrice,
              qty: it.qty,
              rawAmnt: raw,
              contractorQty: cQty,
              contractorRawAmnt: cRaw,
              consultantQty: consQty,
              consultantRawAmnt: consRaw,
              employerQty: empQty,
              employerRawAmnt: empRaw,
            });
          }
        });

        // 2. Calculate Chapter Coeff Multipliers and generate aggregated item rows
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
            const coeffAmnt = Math.round(row.rawAmnt * totalCoeffMultiplier);
            const contractorCoeffAmnt = Math.round(row.contractorRawAmnt * totalCoeffMultiplier);
            const consultantCoeffAmnt = Math.round(row.consultantRawAmnt * totalCoeffMultiplier);
            const employerCoeffAmnt = Math.round(row.employerRawAmnt * totalCoeffMultiplier);

            chapterRaw += row.rawAmnt;
            chapterCoeffSum += coeffAmnt;
            chapterContractorRaw += row.contractorRawAmnt;
            chapterContractorCoeff += contractorCoeffAmnt;
            chapterConsultantRaw += row.consultantRawAmnt;
            chapterConsultantCoeff += consultantCoeffAmnt;
            chapterEmployerRaw += row.employerRawAmnt;
            chapterEmployerCoeff += employerCoeffAmnt;

            return {
              ...row,
              coeffAmnt,
              contractorCoeffAmnt,
              consultantCoeffAmnt,
              employerCoeffAmnt,
            };
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
            {/* 1. Summary Table of Chapters */}
            <div className="border border-stone-300 rounded-2xl overflow-hidden shadow-sm bg-white">
              <div className="bg-stone-100 p-3.5 font-black text-xs text-stone-800 border-b border-stone-300 flex justify-between items-center">
                <span>📋 خلاصه مالی فصول فهرست بها: {getPlTitle(plKey)} (جدول تجمیعی فصول ۳ جانبه)</span>
                <span className="text-stone-500 font-bold">
                  تعداد فصول: {sortedChapters.length.toLocaleString("fa-IR")}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs text-stone-900">
                  <thead>
                    <tr className="bg-stone-200/90 text-stone-800 font-bold border-b border-stone-300 text-[11px]">
                      <th className="p-2.5 w-12 text-center border-l border-stone-300" rowSpan={2}>فصل</th>
                      <th className="p-2.5 text-right border-l border-stone-300" rowSpan={2}>شرح فصل فهرست‌بها</th>
                      <th className="p-2 text-center border-l border-stone-300 bg-amber-50" colSpan={2}>ادعای پیمانکار (ریال)</th>
                      <th className="p-2 text-center border-l border-stone-300 bg-blue-50" colSpan={2}>رسیدگی مشاور (ریال)</th>
                      <th className="p-2 text-center border-l border-stone-300 bg-purple-50" colSpan={2}>ابلاغ کارفرما (ریال)</th>
                      <th className="p-2.5 w-36 text-center bg-emerald-50 text-emerald-900 font-black" rowSpan={2}>مبلغ ملاک عمل نهایی</th>
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
                    {sortedChapters.map(([chapter, totals]) => (
                      <tr key={chapter} className="hover:bg-[#faf8f4]/60 transition-colors">
                        <td className="p-2.5 text-center border-l border-stone-200 font-black font-mono">
                          {chapter}
                        </td>
                        <td className="p-2.5 text-right border-l border-stone-200 font-bold text-stone-800">
                          {getChapterTitle(chapter, totals.items)}
                        </td>
                        <td className="p-2 text-center border-l border-stone-200 font-mono text-[11px] bg-amber-50/20">
                          {totals.contractorRaw.toLocaleString("fa-IR")}
                        </td>
                        <td className="p-2 text-center border-l border-stone-200 font-mono font-bold text-[11px] text-amber-900 bg-amber-50/30">
                          {totals.contractorCoeff.toLocaleString("fa-IR")}
                        </td>
                        <td className="p-2 text-center border-l border-stone-200 font-mono text-[11px] bg-blue-50/20">
                          {totals.consultantRaw.toLocaleString("fa-IR")}
                        </td>
                        <td className="p-2 text-center border-l border-stone-200 font-mono font-bold text-[11px] text-blue-900 bg-blue-50/30">
                          {totals.consultantCoeff.toLocaleString("fa-IR")}
                        </td>
                        <td className="p-2 text-center border-l border-stone-200 font-mono text-[11px] bg-purple-50/20">
                          {totals.employerRaw.toLocaleString("fa-IR")}
                        </td>
                        <td className="p-2 text-center border-l border-stone-200 font-mono font-bold text-[11px] text-purple-900 bg-purple-50/30">
                          {totals.employerCoeff.toLocaleString("fa-IR")}
                        </td>
                        <td className="p-2 text-center font-mono font-black text-[11px] text-emerald-700 bg-emerald-50/40">
                          {totals.coeff.toLocaleString("fa-IR")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-stone-100 font-black text-stone-900 border-t-2 border-stone-400">
                      <td colSpan={2} className="p-3 border-l border-stone-300 text-left">
                        جمع کل فصول این فهرست بها:
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
                      <td className="p-3 text-center font-mono font-black text-emerald-700 bg-emerald-100/80">
                        {totalCoeff.toLocaleString("fa-IR")}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        );
      })}

      {/* 3. Grand Total Multi-party Comparison Summary Panel */}
      <div className="border border-stone-400 bg-stone-900 text-white rounded-2xl overflow-hidden p-6 shadow-md text-xs font-black leading-relaxed mt-8">
        <h4 className="text-sm border-b border-stone-800 pb-2 mb-4 text-emerald-400 font-black flex items-center gap-2">
          <span>📊</span>
          <span>خلاصه کل نهایی کارکرد مالی فصول صورت‌وضعیت به تفکیک ارکان پیمان</span>
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
        </div>
      </div>
    </div>
  );
};
