import React from "react";
import { ItemType } from "../../../../types";

interface DiscrepancyItem {
  code: string;
  description: string;
  unit: string;
  price: number;
  itemType?: ItemType | string;
  independentCoefficient?: number;
  estQty: number;
  execQty: number;
  diffQty: number;
  estRaw: number;
  execRaw: number;
  diffRaw: number;
  estAmnt: number;
  execAmnt: number;
  diffAmnt: number;
  coeff: number;
  isExtra?: boolean;
  priceListId?: string;
}

interface Props {
  discrepancyData: {
    items: DiscrepancyItem[];
    totals: { est: number; exec: number; diff: number };
  };
  currentProject: any;
}

interface ItemTypeGroupConfig {
  key: "NORMAL" | "STARRED" | "INVOICE";
  title: string;
  badgeTitle: string;
  badgeBg: string;
  badgeText: string;
  borderColor: string;
  headerBg: string;
}

const ITEM_TYPES_CONFIG: ItemTypeGroupConfig[] = [
  {
    key: "NORMAL",
    title: "ردیف‌های پایه فهرست بها (فهرست بهایی)",
    badgeTitle: "پایه فهرست بها",
    badgeBg: "bg-blue-50",
    badgeText: "text-blue-700",
    borderColor: "border-blue-200",
    headerBg: "bg-blue-50/70",
  },
  {
    key: "STARRED",
    title: "ردیف‌های ستاره‌دار (دارای ضریب یا قیمت مصوب)",
    badgeTitle: "ستاره‌دار",
    badgeBg: "bg-amber-50",
    badgeText: "text-amber-700",
    borderColor: "border-amber-200",
    headerBg: "bg-amber-50/70",
  },
  {
    key: "INVOICE",
    title: "اقلام فاکتوری و قیمت جدید",
    badgeTitle: "فاکتوری / جدید",
    badgeBg: "bg-purple-50",
    badgeText: "text-purple-700",
    borderColor: "border-purple-200",
    headerBg: "bg-purple-50/70",
  },
];

export const DiscrepancyReport: React.FC<Props> = ({
  discrepancyData,
  currentProject,
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

  const getPlTitle = (plId: string) => {
    if (plId && plId !== "default") {
      const found = currentProject?.priceLists?.find(
        (pl: any) => pl.id === plId,
      );
      if (found) return `${found.title} (${found.year || ""})`;
    }
    if (currentProject?.priceLists && currentProject.priceLists.length > 0) {
      return currentProject.priceLists
        .map((pl: any) => `${pl.title} (${pl.year || ""})`)
        .join(" و ");
    }
    return "فهرست بهای عمومی / پایه پروژه";
  };

  // Helper to resolve accurate item type
  const resolveItemType = (
    code: string,
    explicitType?: string,
    desc?: string,
    coef?: number,
  ): "NORMAL" | "STARRED" | "INVOICE" => {
    const expUpper = (explicitType || "").toUpperCase();
    if (expUpper === "STARRED") return "STARRED";
    if (expUpper === "INVOICE" || expUpper === "NEW") return "INVOICE";

    if (code && (code.includes("*") || code.startsWith("*") || code.endsWith("*"))) {
      return "STARRED";
    }

    const d = (desc || "").toLowerCase();
    if (
      d.includes("ستاره") ||
      d.includes("starred") ||
      d.includes("ستاره‌دار") ||
      d.includes("ستاره دار") ||
      d.includes("قیمت توافقی")
    ) {
      return "STARRED";
    }
    if (
      d.includes("فاکتور") ||
      d.includes("invoice") ||
      d.includes("فاکتوری") ||
      d.includes("قیمت جدید") ||
      d.includes("خرید مستقیم")
    ) {
      return "INVOICE";
    }

    if (coef && coef !== 1 && coef > 0) {
      return "STARRED";
    }

    return "NORMAL";
  };

  // Group items: PriceList -> ItemType -> Items[]
  const groupedByPriceList: {
    [plId: string]: {
      NORMAL: DiscrepancyItem[];
      STARRED: DiscrepancyItem[];
      INVOICE: DiscrepancyItem[];
    };
  } = {};

  let globalNormalCount = 0;
  let globalStarredCount = 0;
  let globalInvoiceCount = 0;
  let globalNormalEst = 0;
  let globalStarredEst = 0;
  let globalInvoiceEst = 0;
  let globalNormalExec = 0;
  let globalStarredExec = 0;
  let globalInvoiceExec = 0;

  discrepancyData.items.forEach((item) => {
    const plId = getUnifiedPlId(item.priceListId);
    if (!groupedByPriceList[plId]) {
      groupedByPriceList[plId] = {
        NORMAL: [],
        STARRED: [],
        INVOICE: [],
      };
    }

    const resolved = resolveItemType(
      item.code,
      item.itemType,
      item.description,
      item.independentCoefficient,
    );

    if (resolved === "STARRED") {
      groupedByPriceList[plId].STARRED.push(item);
      globalStarredCount++;
      globalStarredEst += item.estAmnt || 0;
      globalStarredExec += item.execAmnt || 0;
    } else if (resolved === "INVOICE") {
      groupedByPriceList[plId].INVOICE.push(item);
      globalInvoiceCount++;
      globalInvoiceEst += item.estAmnt || 0;
      globalInvoiceExec += item.execAmnt || 0;
    } else {
      groupedByPriceList[plId].NORMAL.push(item);
      globalNormalCount++;
      globalNormalEst += item.estAmnt || 0;
      globalNormalExec += item.execAmnt || 0;
    }
  });

  const plKeys = Object.keys(groupedByPriceList);

  let grandTotalEst = 0;
  let grandTotalExec = 0;
  let grandTotalDiff = 0;

  return (
    <div className="space-y-8 text-right font-sans" dir="rtl">
      {/* Official Report Header */}
      <div className="border border-stone-300 rounded-2xl p-5 bg-stone-50/50 shadow-sm mb-6 print:border-black">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 pb-4 border-b border-stone-200 print:border-black">
          <div>
            <h2 className="text-base md:text-lg font-black text-stone-900">
              گزارش کنترل مغایرت مقادیر و افزایش/کاهش احجام (ماده ۲۹ شرایط عمومی پیمان)
            </h2>
            <p className="text-xs text-stone-500 mt-1 font-bold">
              تفکیک شده بر اساس فهرست‌های بها و نوع اقلام (ردیف‌های فهرست‌بهایی، ستاره‌دار و فاکتوری)
            </p>
          </div>
          <div className="text-left text-xs space-y-1 shrink-0 font-mono">
            <div>
              <span className="font-bold text-stone-600 font-sans">پروژه: </span>
              <span className="font-black text-stone-900 font-sans">{currentProject?.title || "---"}</span>
            </div>
            <div>
              <span className="font-bold text-stone-600 font-sans">شماره پیمان: </span>
              <span className="font-black text-stone-900">{currentProject?.contractNumber || "---"}</span>
            </div>
            <div>
              <span className="font-bold text-stone-600 font-sans">تاریخ گزارش: </span>
              <span className="font-bold text-stone-800">{new Date().toLocaleDateString("fa-IR")}</span>
            </div>
          </div>
        </div>

        {/* Global Item Type Breakdown Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-2">
          <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-3">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs font-black text-blue-900">🔹 ردیف‌های پایه فهرست بها</span>
              <span className="text-[10px] bg-white text-blue-800 font-black px-2 py-0.5 rounded border border-blue-200">
                {globalNormalCount.toLocaleString("fa-IR")} ردیف
              </span>
            </div>
            <div className="text-[11px] text-stone-600 space-y-0.5">
              <div>برآورد: <span className="font-mono font-bold text-stone-800">{Math.round(globalNormalEst).toLocaleString("fa-IR")}</span> ریال</div>
              <div>اجرا: <span className="font-mono font-bold text-stone-900">{Math.round(globalNormalExec).toLocaleString("fa-IR")}</span> ریال</div>
              <div className={`font-bold ${globalNormalExec - globalNormalEst >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                اختلاف: {globalNormalExec - globalNormalEst >= 0 ? "+" : ""}{Math.round(globalNormalExec - globalNormalEst).toLocaleString("fa-IR")} ریال
              </div>
            </div>
          </div>

          <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs font-black text-amber-900">⭐ ردیف‌های ستاره‌دار</span>
              <span className="text-[10px] bg-white text-amber-800 font-black px-2 py-0.5 rounded border border-amber-200">
                {globalStarredCount.toLocaleString("fa-IR")} ردیف
              </span>
            </div>
            <div className="text-[11px] text-stone-600 space-y-0.5">
              <div>برآورد: <span className="font-mono font-bold text-stone-800">{Math.round(globalStarredEst).toLocaleString("fa-IR")}</span> ریال</div>
              <div>اجرا: <span className="font-mono font-bold text-stone-900">{Math.round(globalStarredExec).toLocaleString("fa-IR")}</span> ریال</div>
              <div className={`font-bold ${globalStarredExec - globalStarredEst >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                اختلاف: {globalStarredExec - globalStarredEst >= 0 ? "+" : ""}{Math.round(globalStarredExec - globalStarredEst).toLocaleString("fa-IR")} ریال
              </div>
            </div>
          </div>

          <div className="bg-purple-50/80 border border-purple-200 rounded-xl p-3">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs font-black text-purple-900">🧾 اقلام فاکتوری و جدید</span>
              <span className="text-[10px] bg-white text-purple-800 font-black px-2 py-0.5 rounded border border-purple-200">
                {globalInvoiceCount.toLocaleString("fa-IR")} ردیف
              </span>
            </div>
            <div className="text-[11px] text-stone-600 space-y-0.5">
              <div>برآورد: <span className="font-mono font-bold text-stone-800">{Math.round(globalInvoiceEst).toLocaleString("fa-IR")}</span> ریال</div>
              <div>اجرا: <span className="font-mono font-bold text-stone-900">{Math.round(globalInvoiceExec).toLocaleString("fa-IR")}</span> ریال</div>
              <div className={`font-bold ${globalInvoiceExec - globalInvoiceEst >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                اختلاف: {globalInvoiceExec - globalInvoiceEst >= 0 ? "+" : ""}{Math.round(globalInvoiceExec - globalInvoiceEst).toLocaleString("fa-IR")} ریال
              </div>
            </div>
          </div>
        </div>
      </div>

      {plKeys.length === 0 ? (
        <div className="p-8 text-center bg-stone-50 rounded-2xl border border-stone-200 text-stone-500 font-bold text-xs">
          هیچ آیتم دارای مغایرت مقداری برای نمایش یافت نشد.
        </div>
      ) : (
        plKeys.map((plKey, plIndex) => {
          const plGroup = groupedByPriceList[plKey];
          const plTitle = getPlTitle(plKey);

          let plTotalEst = 0;
          let plTotalExec = 0;
          let plTotalDiff = 0;
          let plTotalItemsCount = 0;

          const activeTypeConfigs = ITEM_TYPES_CONFIG.filter(
            (cfg) => plGroup[cfg.key].length > 0,
          );

          // Calculate PL totals
          ITEM_TYPES_CONFIG.forEach((cfg) => {
            const itemsInType = plGroup[cfg.key];
            plTotalItemsCount += itemsInType.length;
            itemsInType.forEach((it) => {
              plTotalEst += it.estAmnt;
              plTotalExec += it.execAmnt;
              plTotalDiff += it.diffAmnt;
            });
          });

          grandTotalEst += plTotalEst;
          grandTotalExec += plTotalExec;
          grandTotalDiff += plTotalDiff;

          return (
            <div
              key={plKey}
              className="border-2 border-stone-400 rounded-2xl overflow-hidden shadow-sm bg-white print:border-black print:rounded-none mb-8"
            >
              {/* Price List Main Header */}
              <div className="bg-stone-800 text-white p-4 font-black text-xs md:text-sm flex flex-wrap justify-between items-center gap-2 print:bg-stone-200 print:text-black">
                <div className="flex items-center gap-2">
                  <span className="bg-amber-400 text-stone-950 px-2.5 py-0.5 rounded-lg text-xs font-black">
                    فهرست {plIndex + 1}
                  </span>
                  <span>فهرست بها: {plTitle}</span>
                </div>
                <div className="text-xs font-bold text-stone-300 print:text-stone-700">
                  تعداد کل ردیف‌های مغایرت: {plTotalItemsCount.toLocaleString("fa-IR")}
                </div>
              </div>

              {/* Sub-groups by Item Type */}
              <div className="p-4 space-y-6">
                {activeTypeConfigs.map((typeCfg) => {
                  const typeItems = plGroup[typeCfg.key];
                  const typeTotalEst = typeItems.reduce((s, it) => s + it.estAmnt, 0);
                  const typeTotalExec = typeItems.reduce((s, it) => s + it.execAmnt, 0);
                  const typeTotalDiff = typeItems.reduce((s, it) => s + it.diffAmnt, 0);

                  return (
                    <div
                      key={typeCfg.key}
                      className={`border ${typeCfg.borderColor} rounded-xl overflow-hidden bg-white shadow-xs print:border-black print:rounded-none`}
                    >
                      {/* Item Type Subheader */}
                      <div
                        className={`${typeCfg.headerBg} p-3 font-black text-xs text-stone-900 border-b ${typeCfg.borderColor} flex justify-between items-center print:bg-stone-100 print:border-black`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`${typeCfg.badgeBg} ${typeCfg.badgeText} px-2.5 py-1 rounded-md text-[11px] font-black border ${typeCfg.borderColor}`}
                          >
                            {typeCfg.badgeTitle}
                          </span>
                          <span className="text-stone-800 font-black">
                            {typeCfg.title}
                          </span>
                        </div>
                        <span className="text-stone-600 font-bold text-[11px]">
                          {typeItems.length.toLocaleString("fa-IR")} ردیف
                        </span>
                      </div>

                      {/* Items Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-xs text-black">
                          <thead>
                            <tr className="bg-stone-100/90 text-stone-800 font-black text-[11px] border-b border-stone-300 print:bg-stone-200">
                              <th className="border-b border-l border-stone-300 p-2.5 w-10 text-center">
                                ردیف
                              </th>
                              <th className="border-b border-l border-stone-300 p-2.5 w-28 text-center">
                                کد و نوع آیتم
                              </th>
                              <th className="border-b border-l border-stone-300 p-2.5 min-w-[220px]">
                                شرح آیتم و مشخصات عملیات
                              </th>
                              <th className="border-b border-l border-stone-300 p-2.5 w-14 text-center">
                                واحد
                              </th>
                              <th className="border-b border-l border-stone-300 p-2.5 w-20 text-center">
                                بهای واحد (ریال)
                              </th>
                              <th className="border-b border-l border-stone-300 p-2.5 w-14 text-center">
                                ضریب
                              </th>
                              <th className="border-b border-l border-stone-300 p-2.5 w-20 text-center">
                                مقدار برآورد
                              </th>
                              <th className="border-b border-l border-stone-300 p-2.5 w-20 text-center">
                                مقدار اجرا
                              </th>
                              <th className="border-b border-l border-stone-300 p-2.5 w-20 text-center">
                                اختلاف مقدار
                              </th>
                              <th className="border-b border-l border-stone-300 p-2.5 w-24 text-center">
                                مبلغ برآورد (ریال)
                              </th>
                              <th className="border-b border-l border-stone-300 p-2.5 w-24 text-center">
                                مبلغ اجرا (ریال)
                              </th>
                              <th className="border-b border-stone-300 p-2.5 w-28 text-center">
                                مبلغ اختلاف (ریال)
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {typeItems.map((item, idx) => {
                              const isPositive = item.diffAmnt > 0;
                              const isZero = Math.abs(item.diffAmnt) < 0.01;
                              const itemType = (item.itemType || typeCfg.key || "NORMAL").toUpperCase();
                              const isStarred = itemType === "STARRED";
                              const isInvoice = itemType === "INVOICE" || itemType === "NEW";

                              return (
                                <tr
                                  key={`${item.code}-${idx}`}
                                  className={`hover:bg-stone-50/80 transition-colors ${
                                    isStarred
                                      ? "bg-amber-50/20 print:bg-stone-50/40"
                                      : isInvoice
                                        ? "bg-purple-50/20 print:bg-stone-50/40"
                                        : ""
                                  }`}
                                >
                                  <td className="border-b border-l border-stone-200 p-2 text-center text-stone-600 font-bold">
                                    {(idx + 1).toLocaleString("fa-IR")}
                                  </td>
                                  <td className="border-b border-l border-stone-200 p-2 text-center dir-ltr">
                                    <div className="font-black font-mono text-stone-900 text-xs">
                                      {item.code}
                                    </div>
                                    <div className="mt-1 flex flex-col items-center justify-center gap-0.5">
                                      {isStarred ? (
                                        <span className="inline-block text-[9px] bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-black border border-amber-300 print:border-black print:bg-amber-100 print:text-black">
                                          ⭐ ستاره‌دار
                                        </span>
                                      ) : isInvoice ? (
                                        <span className="inline-block text-[9px] bg-purple-100 text-purple-900 px-1.5 py-0.5 rounded font-black border border-purple-300 print:border-black print:bg-purple-100 print:text-black">
                                          🧾 فاکتوری
                                        </span>
                                      ) : (
                                        <span className="inline-block text-[9px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-bold border border-blue-200 print:border-stone-400 print:bg-stone-50 print:text-stone-800">
                                          پایه فهرست
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="border-b border-l border-stone-200 p-2 text-stone-800 leading-relaxed">
                                    <div className="font-bold text-stone-900">{item.description}</div>
                                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                      {isStarred && (
                                        <span className="inline-flex items-center gap-1 text-[9px] bg-amber-50 text-amber-900 px-2 py-0.5 rounded font-black border border-amber-300 print:border-black print:bg-white print:text-black">
                                          <span>ردیف ستاره‌دار</span>
                                          {item.independentCoefficient && item.independentCoefficient !== 1 && (
                                            <span className="text-[8.5px] text-amber-800 font-mono print:text-black">(ضریب: {item.independentCoefficient})</span>
                                          )}
                                        </span>
                                      )}
                                      {isInvoice && (
                                        <span className="inline-flex items-center gap-1 text-[9px] bg-purple-50 text-purple-900 px-2 py-0.5 rounded font-black border border-purple-300 print:border-black print:bg-white print:text-black">
                                          <span>آیتم فاکتوری / قیمت جدید</span>
                                        </span>
                                      )}
                                      {item.isExtra && (
                                        <span className="inline-block text-[9px] bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-black border border-amber-300 print:border-black print:bg-stone-100 print:text-black">
                                          ردیف جدید خارج از برآورد اولیه
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="border-b border-l border-stone-200 p-2 text-center text-stone-600 font-bold">
                                    {item.unit || "---"}
                                  </td>
                                  <td className="border-b border-l border-stone-200 p-2 text-center font-mono text-stone-800">
                                    {item.price ? item.price.toLocaleString("fa-IR") : "۰"}
                                  </td>
                                  <td className="border-b border-l border-stone-200 p-2 text-center font-mono text-stone-600 text-[11px]">
                                    {item.coeff ? item.coeff.toFixed(3) : "۱.۰۰۰"}
                                  </td>
                                  <td className="border-b border-l border-stone-200 p-2 text-center font-mono text-stone-700">
                                    {item.estQty.toLocaleString("fa-IR")}
                                  </td>
                                  <td className="border-b border-l border-stone-200 p-2 text-center font-mono font-bold text-stone-900">
                                    {item.execQty.toLocaleString("fa-IR")}
                                  </td>
                                  <td
                                    className={`border-b border-l border-stone-200 p-2 text-center font-black font-mono dir-ltr ${
                                      item.diffQty < 0
                                        ? "text-rose-600 bg-rose-50/40"
                                        : item.diffQty > 0
                                          ? "text-emerald-700 bg-emerald-50/40"
                                          : "text-stone-600"
                                    }`}
                                  >
                                    {item.diffQty > 0 ? "+" : ""}
                                    {item.diffQty.toLocaleString("fa-IR")}
                                  </td>
                                  <td className="border-b border-l border-stone-200 p-2 text-center font-mono text-stone-700">
                                    {item.estAmnt.toLocaleString("fa-IR")}
                                  </td>
                                  <td className="border-b border-l border-stone-200 p-2 text-center font-mono font-bold text-stone-900">
                                    {item.execAmnt.toLocaleString("fa-IR")}
                                  </td>
                                  <td
                                    className={`border-b border-stone-200 p-2 text-center font-black font-mono dir-ltr ${
                                      isZero
                                        ? "text-stone-500"
                                        : isPositive
                                          ? "text-emerald-700 bg-emerald-50/60 font-bold"
                                          : "text-rose-600 bg-rose-50/60 font-bold"
                                    }`}
                                  >
                                    {isPositive ? "+" : ""}
                                    {item.diffAmnt.toLocaleString("fa-IR")}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot>
                            <tr className="bg-stone-100 font-black text-stone-900 text-[11px] border-t-2 border-stone-300">
                              <td
                                colSpan={9}
                                className="border-t border-l border-stone-300 p-2.5 text-left"
                              >
                                جمع بخش {typeCfg.badgeTitle} این فهرست بها:
                              </td>
                              <td className="border-t border-l border-stone-300 p-2.5 text-center font-mono font-bold">
                                {typeTotalEst.toLocaleString("fa-IR")}
                              </td>
                              <td className="border-t border-l border-stone-300 p-2.5 text-center font-mono font-bold">
                                {typeTotalExec.toLocaleString("fa-IR")}
                              </td>
                              <td
                                className={`border-t border-stone-300 p-2.5 text-center font-mono font-black dir-ltr ${
                                  typeTotalDiff < 0
                                    ? "text-rose-700"
                                    : typeTotalDiff > 0
                                      ? "text-emerald-700"
                                      : "text-stone-800"
                                }`}
                              >
                                {typeTotalDiff > 0 ? "+" : ""}
                                {typeTotalDiff.toLocaleString("fa-IR")}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Price List Total Footer */}
              <div className="bg-stone-200/90 border-t-2 border-stone-400 p-4 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-black text-stone-900 print:bg-stone-300">
                <span>
                  مجموع نهایی اختلاف فهرست بها ({plTitle}):
                </span>
                <div className="flex flex-wrap items-center gap-6 font-mono text-xs">
                  <div>
                    <span className="text-stone-600 font-sans">برآورد: </span>
                    <span className="font-bold">{plTotalEst.toLocaleString("fa-IR")} ریال</span>
                  </div>
                  <div>
                    <span className="text-stone-600 font-sans">اجرا: </span>
                    <span className="font-bold">{plTotalExec.toLocaleString("fa-IR")} ریال</span>
                  </div>
                  <div className="bg-white px-3 py-1.5 rounded-lg border border-stone-300 shadow-xs">
                    <span className="text-stone-700 font-sans font-black">خالص مغایرت: </span>
                    <span
                      className={`font-black dir-ltr ${
                        plTotalDiff < 0 ? "text-rose-700" : "text-emerald-700"
                      }`}
                    >
                      {plTotalDiff > 0 ? "+" : ""}
                      {plTotalDiff.toLocaleString("fa-IR")} ریال
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })
      )}

      {/* Final Grand Summary Card */}
      <div className="border-2 border-stone-900 bg-stone-900 text-white rounded-2xl p-6 shadow-xl print:bg-white print:text-black print:border-black">
        <div className="flex flex-col lg:flex-row justify-between items-center gap-6">
          <div className="space-y-1 text-center lg:text-right">
            <h3 className="text-base font-black text-amber-400 print:text-black">
              جمع‌بندی کل کنترل مغایرت مقادیر (تمامی فهارس بها)
            </h3>
            <p className="text-xs text-stone-400 font-bold print:text-stone-600">
              شامل تمامی ردیف‌های پایه، ستاره‌دار و اقلام فاکتوری در کلیه رشته‌های فهرست بها
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full lg:w-auto text-center font-mono">
            <div className="bg-white/10 p-3 rounded-xl border border-white/10 print:border-black print:bg-stone-50">
              <span className="block text-[11px] text-stone-300 font-sans font-bold print:text-stone-600">
                مجموع کل برآورد
              </span>
              <span className="text-sm font-black text-white print:text-black">
                {grandTotalEst.toLocaleString("fa-IR")} ریال
              </span>
            </div>

            <div className="bg-white/10 p-3 rounded-xl border border-white/10 print:border-black print:bg-stone-50">
              <span className="block text-[11px] text-stone-300 font-sans font-bold print:text-stone-600">
                مجموع کل اجرا
              </span>
              <span className="text-sm font-black text-white print:text-black">
                {grandTotalExec.toLocaleString("fa-IR")} ریال
              </span>
            </div>

            <div className="bg-amber-500 text-stone-950 p-3 rounded-xl border border-amber-400 shadow-md print:border-black print:bg-stone-200">
              <span className="block text-[11px] font-sans font-black">
                خالص اختلاف کل پیمان
              </span>
              <span
                className={`text-sm font-black dir-ltr ${
                  grandTotalDiff < 0 ? "text-red-950" : "text-emerald-950"
                }`}
              >
                {grandTotalDiff > 0 ? "+" : ""}
                {grandTotalDiff.toLocaleString("fa-IR")} ریال
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Official Signatures Box */}
      <div className="grid grid-cols-3 gap-4 border border-stone-300 rounded-2xl bg-stone-50/50 p-6 text-center text-xs font-bold text-stone-800 mt-6 print:border-black print:bg-white print:rounded-none">
        <div className="border border-dashed border-stone-300 p-4 rounded-xl bg-white print:border-black">
          <p className="text-stone-600 mb-8 print:text-black font-black">تهیه و تنظیم: پیمانکار</p>
          <div className="border-t border-stone-200 pt-2 text-[10px] text-stone-500 print:border-black print:text-stone-800">
            مهر و امضاء نماینده / سرپرست کارگاه پیمانکار
          </div>
        </div>
        <div className="border border-dashed border-stone-300 p-4 rounded-xl bg-white print:border-black">
          <p className="text-stone-600 mb-8 print:text-black font-black">بررسی و تایید: مهندس مشاور</p>
          <div className="border-t border-stone-200 pt-2 text-[10px] text-stone-500 print:border-black print:text-stone-800">
            مهر و امضاء سرپرست دستگاه نظارت / ناظر مقیم
          </div>
        </div>
        <div className="border border-dashed border-stone-300 p-4 rounded-xl bg-white print:border-black">
          <p className="text-stone-600 mb-8 print:text-black font-black">تصویب و ابلاغ: کارفرما / دستگاه اجرایی</p>
          <div className="border-t border-stone-200 pt-2 text-[10px] text-stone-500 print:border-black print:text-stone-800">
            مهر و امضاء مدیر پروژه / نماینده کارفرما
          </div>
        </div>
      </div>
    </div>
  );
};
