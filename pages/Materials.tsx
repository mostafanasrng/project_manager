import React, { useState, useEffect } from "react";
import {
  Truck,
  Package,
  Plus,
  Search,
  Trash2,
  Edit3,
  X,
  Filter,
  Printer,
  CheckCircle,
  UserCheck,
  ShieldCheck,
  Save,
  MinusCircle,
  PlusCircle,
} from "lucide-react";
import { Project, MrsRecord, ApprovalDetail, MrsMaterialItem } from "../types";
import { MOCK_PROJECTS } from "../constants";

export default function Materials() {
  const [selectedProjectId, setSelectedProjectId] = useState<string>(() => {
    const saved = localStorage.getItem("hamyar_selected_project_id");
    return saved || "1";
  });

  useEffect(() => {
    localStorage.setItem("hamyar_selected_project_id", selectedProjectId);
  }, [selectedProjectId]);

  // Listen for global project-changed events
  useEffect(() => {
    const handleProjectChanged = (e?: Event) => {
      const customEvent = e as CustomEvent<{ projectId: string }>;
      const newProjId = customEvent?.detail?.projectId || localStorage.getItem("hamyar_selected_project_id");
      if (newProjId && newProjId !== selectedProjectId) {
        setSelectedProjectId(newProjId);
      }
    };
    window.addEventListener("project-changed", handleProjectChanged);
    return () => window.removeEventListener("project-changed", handleProjectChanged);
  }, [selectedProjectId]);

  const loadData = (key: string, defaultValue: any) => {
    try {
      const saved = localStorage.getItem(key);
      return saved && saved !== "undefined" ? JSON.parse(saved) : defaultValue;
    } catch (e) {
      return defaultValue;
    }
  };

  const [mrsList, setMrsList] = useState<MrsRecord[]>(() => {
    const data = loadData("hamyar_mrs", []);
    const filtered = data.filter(
      (item: any) => item.id !== "mrs1" && item.id !== "mrs2",
    );
    if (data.length !== filtered.length) {
      localStorage.setItem("hamyar_mrs", JSON.stringify(filtered));
    }
    return filtered;
  });
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportType, setReportType] = useState<"SINGLE" | "LIST">("LIST");
  const [reportData, setReportData] = useState<any>(null);

  const [projects] = useState<Project[]>(() => {
    const loaded = loadData("hamyar_projects", MOCK_PROJECTS);
    if (Array.isArray(loaded)) {
      return loaded.filter((p: any) => p.id !== '2' && !String(p.title || '').includes('تصفیه‌خانه مرکزی') && !String(p.title || '').includes('تسویه خانه مرکزی') && !String(p.title || '').includes('نیایش'));
    }
    return loaded || [];
  });

  const currentProject = projects.find((p) => p.id === selectedProjectId) || projects[0];

  const handlePrint = (type: "SINGLE" | "LIST", data: any) => {
    setReportType(type);
    setReportData(data);
    setIsReportModalOpen(true);
  };

  return (
    <div className="space-y-6 pb-12 text-right" dir="rtl">
      {/* Dynamic Header */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-stone-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-stone-900 rounded-[1.5rem] flex items-center justify-center text-amber-500 shadow-2xl shadow-stone-500/20">
            <Truck size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-stone-900 tracking-tight">
              مدیریت مصالح
            </h2>
            <p className="text-stone-500 text-xs font-bold mt-1">
              کنترل ورود مصالح، MRS و انبار هوشمند
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => handlePrint("LIST", mrsList)}
            className="flex items-center gap-2 px-6 py-2.5 bg-stone-50 text-stone-600 rounded-xl hover:bg-stone-100 hover:text-stone-900 border border-stone-200 transition-all text-xs font-black"
          >
            <Printer size={18} /> گزارش لیست
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-stone-200 p-8 min-h-[400px] shadow-sm">
        {mrsList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-stone-400">
            <Truck size={48} className="mb-4 opacity-20" />
            <p className="font-black text-xs">هیچ رکوردی در سیستم ثبت نشده است</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {mrsList.map((item) => (
              <div
                key={item.id}
                className="flex justify-between items-center p-6 border border-stone-100 rounded-2xl hover:bg-stone-50/50 transition-all group"
              >
                <div>
                  <h4 className="font-black text-stone-900">سریال قبض: {item.serialNumber}</h4>
                  <p className="text-[10px] font-bold text-stone-400 mt-1">{item.entryDate}</p>
                </div>
                <button
                  onClick={() => handlePrint("SINGLE", item)}
                  className="p-2 text-amber-600 hover:bg-stone-50 rounded-xl"
                >
                  <Printer size={20} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {isReportModalOpen && reportData && currentProject && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-stone-900/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white w-full max-w-5xl max-h-[95vh] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden">
            <div className="p-6 border-b border-[#ece5d8] flex justify-between items-center bg-[#faf8f4]">
              <h3 className="font-black text-stone-800 flex items-center gap-2">
                <Printer size={20} className="text-amber-600" /> پیش‌نمایش چاپ
              </h3>
              <button
                onClick={() => setIsReportModalOpen(false)}
                className="p-2 hover:bg-stone-200 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 bg-stone-200/50">
              <div
                id="report-modal-content"
                className="bg-white p-10 shadow-lg mx-auto max-w-[210mm] min-h-[297mm] origin-top text-right"
                style={{ direction: "rtl" }}
              >
                {/* HEADER */}
                <div className="border-b-4 border-double border-black pb-4 mb-6 text-black">
                  <div className="flex justify-between items-start">
                    <div className="text-center w-1/4 pt-2">
                      <div className="text-xs font-bold text-black">
                        جمهوری اسلامی ایران
                      </div>
                    </div>
                    <div className="flex-1 text-center">
                      <h1 className="text-xl font-black text-black mb-2">
                        {reportType === "SINGLE"
                          ? "رسید تحویل مصالح (MRS Ticket)"
                          : "گزارش لیست مصالح وارده"}
                      </h1>
                      <div className="text-sm font-bold text-black border-t border-black pt-2 inline-block px-8">
                        پروژه: {currentProject?.title || '---'}
                      </div>
                    </div>
                    <div className="w-1/4 text-left space-y-1 text-xs font-bold text-black">
                      <div className="flex justify-end gap-2 text-black">
                        <span>تاریخ:</span>
                        <span>{new Date().toLocaleDateString("fa-IR")}</span>
                      </div>
                      {reportType === "SINGLE" && (
                        <div className="flex justify-end gap-2 text-black">
                          <span>شماره:</span>
                          <span>{(reportData as MrsRecord).serialNumber}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Single MRS Report Content */}
                {reportType === "SINGLE" && !Array.isArray(reportData) && (
                  <div className="text-black">
                    <div className="grid grid-cols-2 gap-8 mb-8 border border-black p-4 rounded-xl">
                      <div>
                        <span className="block font-bold text-sm text-black mb-1">
                          شماره سریال قبض:
                        </span>
                        <div className="text-xl font-black font-mono text-black">
                          {(reportData as MrsRecord).serialNumber}
                        </div>
                      </div>
                      <div className="text-left">
                        <span className="block font-bold text-sm text-black mb-1">
                          تاریخ و ساعت ورود:
                        </span>
                        <div className="text-lg font-black text-black">
                          {(reportData as MrsRecord).entryDate} -{" "}
                          {(reportData as MrsRecord).entryTime}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-8">
                      <div className="border border-black p-3 rounded">
                        <span className="text-xs font-bold block text-black">
                          نام راننده:
                        </span>
                        <span className="font-bold text-black">
                          {(reportData as MrsRecord).driverName}
                        </span>
                      </div>
                      <div className="border border-black p-3 rounded">
                        <span className="text-xs font-bold block text-black">
                          شماره پلاک:
                        </span>
                        <span className="font-bold text-black">
                          {(reportData as MrsRecord).plateNumber}
                        </span>
                      </div>
                      <div className="border border-black p-3 rounded">
                        <span className="text-xs font-bold block text-black">
                          نوع خودرو:
                        </span>
                        <span className="font-bold text-black">
                          {(reportData as MrsRecord).vehicleType}
                        </span>
                      </div>
                    </div>

                    {/* Items Table */}
                    <table className="w-full border-collapse border border-black mb-8 text-black">
                      <thead>
                        <tr className="bg-gray-200">
                          <th className="border border-black p-2 w-10">ردیف</th>
                          <th className="border border-black p-2 w-32">
                            نوع مصالح
                          </th>
                          <th className="border border-black p-2">
                            شرح و مشخصات
                          </th>
                          <th className="border border-black p-2 w-32">
                            تامین کننده
                          </th>
                          <th className="border border-black p-2 w-24">
                            مقدار
                          </th>
                          <th className="border border-black p-2 w-24">واحد</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(reportData as MrsRecord).items.map((item, idx) => (
                          <tr key={idx}>
                            <td className="border border-black p-2 text-center">
                              {(idx + 1).toLocaleString("fa-IR", {
                                minimumIntegerDigits: 2,
                                useGrouping: false,
                              })}
                            </td>
                            <td className="border border-black p-2 text-center">
                              {item.materialType}
                            </td>
                            <td className="border border-black p-2">
                              {item.materialName}
                            </td>
                            <td className="border border-black p-2 text-center">
                              {item.supplier}
                            </td>
                            <td className="border border-black p-2 text-center font-bold">
                              {item.quantity}
                            </td>
                            <td className="border border-black p-2 text-center">
                              {item.unit}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <div className="border border-black mt-8 text-xs text-black font-bold">
                      <div className="grid grid-cols-3 divide-x divide-x-reverse divide-black text-center border-b border-black bg-gray-100">
                        <div className="p-2 font-black">پیمانکار عمومی</div>
                        <div className="p-2 font-black border-r border-black">دستگاه نظارت / مشاور</div>
                        <div className="p-2 font-black border-r border-black">کارفرما / مجری طرح</div>
                      </div>
                      <div className="grid grid-cols-3 divide-x divide-x-reverse divide-black text-right text-[10px]">
                        {/* Contractor Col */}
                        <div className="p-3 space-y-3">
                          <div className="border-b border-gray-250 pb-2 min-h-[50px]">
                            <strong>کارشناس دفتر فنی:</strong>
                            {(reportData as MrsRecord).contractorExpertApproval?.isApproved ? (
                              <div className="text-emerald-750 font-bold mt-1 text-[9px]">
                                <span>✓ تایید شد</span>
                                {(reportData as MrsRecord).contractorExpertApproval.comment && (
                                  <span className="text-stone-600 font-normal block mt-1">دیدگاه: {(reportData as MrsRecord).contractorExpertApproval.comment}</span>
                                )}
                              </div>
                            ) : <div className="text-stone-400 font-normal mt-1 text-[9px] italic">عدم ثبت تایید</div>}
                          </div>
                          <div className="border-b border-gray-250 pb-2 min-h-[50px]">
                            <strong>سرپرست واحد مصالح:</strong>
                            {(reportData as MrsRecord).contractorUnitHeadApproval?.isApproved ? (
                              <div className="text-emerald-750 font-bold mt-1 text-[9px]">
                                <span>✓ تایید شد</span>
                                {(reportData as MrsRecord).contractorUnitHeadApproval.comment && (
                                  <span className="text-stone-600 font-normal block mt-1">دیدگاه: {(reportData as MrsRecord).contractorUnitHeadApproval.comment}</span>
                                )}
                              </div>
                            ) : <div className="text-stone-400 font-normal mt-1 text-[9px] italic">عدم ثبت تایید</div>}
                          </div>
                          <div className="min-h-[50px] pt-1">
                            <strong>سرپرست کارگاه پیمانکار:</strong>
                            {(reportData as MrsRecord).contractorSiteManagerApproval?.isApproved ? (
                              <div className="text-emerald-750 font-bold mt-1 text-[9px]">
                                <span>✓ تایید شد</span>
                                {(reportData as MrsRecord).contractorSiteManagerApproval.comment && (
                                  <span className="text-stone-600 font-normal block mt-1">دیدگاه: {(reportData as MrsRecord).contractorSiteManagerApproval.comment}</span>
                                )}
                              </div>
                            ) : <div className="text-stone-400 font-normal mt-1 text-[9px] italic">عدم ثبت تایید</div>}
                          </div>
                        </div>

                        {/* Consultant Col */}
                        <div className="p-3 space-y-3 border-r border-black">
                          <div className="border-b border-gray-250 pb-2 min-h-[50px]">
                            <strong>کارشناس ناظر مقیم:</strong>
                            {(reportData as MrsRecord).consultantExpertApproval?.isApproved ? (
                              <div className="text-emerald-750 font-bold mt-1 text-[9px]">
                                <span>✓ تایید شد</span>
                                {(reportData as MrsRecord).consultantExpertApproval.comment && (
                                  <span className="text-stone-600 font-normal block mt-1">دیدگاه: {(reportData as MrsRecord).consultantExpertApproval.comment}</span>
                                )}
                              </div>
                            ) : <div className="text-stone-400 font-normal mt-1 text-[9px] italic">عدم ثبت تایید</div>}
                          </div>
                          <div className="border-b border-gray-250 pb-2 min-h-[50px]">
                            <strong>سرپرست نظارت مقیم:</strong>
                            {(reportData as MrsRecord).consultantUnitHeadApproval?.isApproved ? (
                              <div className="text-emerald-750 font-bold mt-1 text-[9px]">
                                <span>✓ تایید شد</span>
                                {(reportData as MrsRecord).consultantUnitHeadApproval.comment && (
                                  <span className="text-stone-600 font-normal block mt-1">دیدگاه: {(reportData as MrsRecord).consultantUnitHeadApproval.comment}</span>
                                )}
                              </div>
                            ) : <div className="text-stone-400 font-normal mt-1 text-[9px] italic">عدم ثبت تایید</div>}
                          </div>
                          <div className="min-h-[50px] pt-1">
                            <strong>رئیس دستگاه نظارت / مشاور:</strong>
                            {(reportData as MrsRecord).consultantSiteManagerApproval?.isApproved ? (
                              <div className="text-emerald-750 font-bold mt-1 text-[9px]">
                                <span>✓ تایید شد</span>
                                {(reportData as MrsRecord).consultantSiteManagerApproval.comment && (
                                  <span className="text-stone-600 font-normal block mt-1">دیدگاه: {(reportData as MrsRecord).consultantSiteManagerApproval.comment}</span>
                                )}
                              </div>
                            ) : <div className="text-stone-400 font-normal mt-1 text-[9px] italic">عدم ثبت تایید</div>}
                          </div>
                        </div>

                        {/* Employer Col */}
                        <div className="p-3 space-y-3 border-r border-black">
                          <div className="border-b border-gray-250 pb-2 min-h-[50px]">
                            <strong>کارشناس فنی/مالی کارفرما:</strong>
                            {(reportData as MrsRecord).employerExpertApproval?.isApproved ? (
                              <div className="text-emerald-750 font-bold mt-1 text-[9px]">
                                <span>✓ تایید شد</span>
                                {(reportData as MrsRecord).employerExpertApproval.comment && (
                                  <span className="text-stone-600 font-normal block mt-1">دیدگاه: {(reportData as MrsRecord).employerExpertApproval.comment}</span>
                                )}
                              </div>
                            ) : <div className="text-stone-400 font-normal mt-1 text-[9px] italic">عدم ثبت تایید</div>}
                          </div>
                          <div className="border-b border-gray-250 pb-2 min-h-[50px]">
                            <strong>مدیر پروژه کارفرما:</strong>
                            {(reportData as MrsRecord).employerUnitHeadApproval?.isApproved ? (
                              <div className="text-emerald-750 font-bold mt-1 text-[9px]">
                                <span>✓ تایید شد</span>
                                {(reportData as MrsRecord).employerUnitHeadApproval.comment && (
                                  <span className="text-stone-600 font-normal block mt-1">دیدگاه: {(reportData as MrsRecord).employerUnitHeadApproval.comment}</span>
                                )}
                              </div>
                            ) : <div className="text-stone-400 font-normal mt-1 text-[9px] italic">عدم ثبت تایید</div>}
                          </div>
                          <div className="min-h-[50px] pt-1">
                            <strong>سرپرست کارگاه کارفرما (نماینده مجری):</strong>
                            {(reportData as MrsRecord).employerSiteManagerApproval?.isApproved ? (
                              <div className="text-emerald-750 font-bold mt-1 text-[9px]">
                                <span>✓ تایید شد</span>
                                {(reportData as MrsRecord).employerSiteManagerApproval.comment && (
                                  <span className="text-stone-600 font-normal block mt-1">دیدگاه: {(reportData as MrsRecord).employerSiteManagerApproval.comment}</span>
                                )}
                              </div>
                            ) : <div className="text-stone-400 font-normal mt-1 text-[9px] italic">عدم ثبت تایید</div>}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* List Report Content */}
                {reportType === "LIST" && Array.isArray(reportData) && (
                  <>
                    <table className="w-full border-collapse border border-black text-xs text-black">
                      <thead>
                        <tr className="bg-gray-200">
                          <th className="border border-black p-2 w-10 text-black">
                            #
                          </th>
                          <th className="border border-black p-2 w-20 text-black">
                            تاریخ
                          </th>
                          <th className="border border-black p-2 w-20 text-black">
                            سریال
                          </th>
                          <th className="border border-black p-2 text-black">
                            اقلام و شرح مصالح
                          </th>
                          <th className="border border-black p-2 w-24 text-black">
                            محل دپو
                          </th>
                          <th className="border border-black p-2 w-24 text-black">
                            وضعیت
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.map((record, i) => (
                          <tr key={i}>
                            <td className="border border-black p-2 text-center text-black">
                              {(i + 1).toLocaleString("fa-IR", {
                                minimumIntegerDigits: 2,
                                useGrouping: false,
                              })}
                            </td>
                            <td className="border border-black p-2 text-center text-black">
                              {record.entryDate}
                            </td>
                            <td className="border border-black p-2 text-center text-black">
                              {record.serialNumber}
                            </td>
                            <td className="border border-black p-2 text-black">
                              {record.items.map(
                                (it: MrsMaterialItem, idx: number) => (
                                  <div key={idx}>
                                    - {it.materialType} {it.materialName} (
                                    {it.quantity} {it.unit})
                                  </div>
                                ),
                              )}
                            </td>
                            <td className="border border-black p-2 text-black">
                              {record.storageLocation}
                            </td>
                            <td className="border border-black p-2 text-center text-black">
                              {record.status === "APPROVED"
                                ? "تایید"
                                : record.status === "REJECTED"
                                  ? "رد"
                                  : "معلق"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="mt-8 flex justify-between text-xs font-bold text-black">
                      <div>تعداد کل رکوردها (قبوض): {reportData.length}</div>
                    </div>
                    <div className="mt-16 text-center text-xs font-bold text-stone-800 break-inside-avoid">
                      <div className="grid grid-cols-4 gap-8">
                        <div>
                          <p className="mb-16">
                            بخش مهندسی و دفتر فنی پیمانکار
                          </p>
                          <p className="border-t border-stone-400 pt-4 border-dashed inline-block w-4/5 text-stone-600">
                            نام، مهر و امضاء
                          </p>
                        </div>
                        <div>
                          <p className="mb-16">
                            رئیس کارگاه / مدیر پروژه پیمانکار
                          </p>
                          <p className="border-t border-stone-400 pt-4 border-dashed inline-block w-4/5 text-stone-600">
                            نام، مهر و امضاء
                          </p>
                        </div>
                        <div>
                          <p className="mb-16">
                            مهندسین مشاور / دستگاه نظارت مقیم
                          </p>
                          <p className="border-t border-stone-400 pt-4 border-dashed inline-block w-4/5 text-stone-600">
                            نام، مهر و امضاء
                          </p>
                        </div>
                        <div>
                          <p className="mb-16">نماینده کارفرما / مجری</p>
                          <p className="border-t border-stone-400 pt-4 border-dashed inline-block w-4/5 text-stone-600">
                            نام، مهر و امضاء
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
