import fs from 'fs';

const filePath = './pages/TechnicalOffice.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

const targetStr = `{reportModalType === "variation" && reportContextData && (
                <>
                  <div className="border border-black p-4 mb-4 text-xs text-black grid grid-cols-2 gap-4">
                    <div>
                      <strong>تاریخ:</strong>{" "}
                      {(reportContextData as VariationOrder).date}
                    </div>
                    <div className="col-span-2">
                      <strong>موضوع تغییرات:</strong>{" "}
                      {(reportContextData as VariationOrder).description}
                    </div>
                    <div>
                      <strong>وضعیت:</strong>{" "}
                      {(reportContextData as VariationOrder).status ===
                        WorkflowStatus.APPROVED_INTERNAL ||
                      (reportContextData as VariationOrder).status ===
                        WorkflowStatus.APPROVED_BY_CONSULTANT
                        ? "تصویب نهایی کارفرما"
                        : "در جریان"}
                    </div>
                  </div>`;

const replacementStr = `{reportModalType === "variation" && reportContextData && (
                <>
                  {/* Standard Official Header */}
                  <div className="border-b-2 border-purple-600 pb-5 mb-6 text-right">
                    <h2 className="text-xl font-black text-purple-800 text-center">
                      گزارش رسمی دستورکار / تغییر مقادیر پیمان
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4 font-sans text-xs bg-slate-50 p-4 rounded-xl text-slate-700 leading-relaxed">
                      <div>
                        <strong>پروژه:</strong> {currentProject?.title || "---"}
                      </div>
                      <div>
                        <strong>شماره پیمان:</strong>{" "}
                        {currentProject?.contractNumber || "---"}
                      </div>
                      <div>
                        <strong>کارفرما:</strong>{" "}
                        {currentProject?.employerName || "---"}
                      </div>
                      <div>
                        <strong>پیمانکار:</strong>{" "}
                        {currentProject?.contractorName || "---"}
                      </div>
                    </div>
                  </div>

                  <div className="border border-black p-4 mb-4 text-xs text-black grid grid-cols-2 gap-4 rounded-xl bg-slate-50/50">
                    <div>
                      <strong>کد/شماره تغییر:</strong>{" "}
                      <span className="font-bold text-purple-700">{(reportContextData as VariationOrder).number || "---"}</span>
                    </div>
                    <div>
                      <strong>تاریخ:</strong>{" "}
                      <span className="font-bold">{(reportContextData as VariationOrder).date}</span>
                    </div>
                    <div className="col-span-2">
                      <strong>موضوع تغییرات:</strong>{" "}
                      <span className="font-bold">{(reportContextData as VariationOrder).description}</span>
                    </div>
                    <div className="col-span-2">
                      <strong>وضعیت گردش کار:</strong>{" "}
                      <span className="font-bold">
                        {WorkflowService.getStatusLabel(reportContextData as VariationOrder)}
                      </span>
                    </div>
                  </div>`;

if (content.includes(targetStr)) {
  content = content.replace(targetStr, replacementStr);
  fs.writeFileSync(filePath, content);
  console.log('Update successful');
} else {
  console.log('Target string not found, outputting similar sections:');
}
