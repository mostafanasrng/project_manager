import React, { useRef } from 'react';
import { X, Printer, Download, CheckCircle2, Shield, Calendar, Building2, User, FileText, Paperclip } from 'lucide-react';
import { DccDocument } from '../../types/dcc';
import { formatShamsiDate } from '../../utils/dateUtils';
import { WorkflowService } from '../../services/workflowService';
import { SystemAdminService } from '../../services/systemAdminService';
import { formatUserDisplayFormal } from '../../src/utils/userFormatter';
import { downloadDccAttachment } from '../../utils/dccAttachmentUtils';

interface DccPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: DccDocument | null;
}

export const DccPrintModal: React.FC<DccPrintModalProps> = ({
  isOpen,
  onClose,
  document: doc
}) => {
  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !doc) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/70 backdrop-blur-md animate-fadeIn" dir="rtl">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-3xl shadow-2xl border border-stone-200 dark:border-slate-800 flex flex-col max-h-[95vh] overflow-hidden">
        {/* Action Bar (Not visible in Print) */}
        <div className="p-4 border-b border-stone-200 dark:border-slate-800 flex items-center justify-between bg-stone-50 dark:bg-slate-800/60 print:hidden shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-black text-sm text-stone-900 dark:text-white">
              پیش‌نمایش و چاپ شناسنامه رسمی سند (DCC Sheet)
            </span>
            <span className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
              {doc.documentNumber}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs rounded-xl transition-all shadow-md shadow-amber-500/20 cursor-pointer"
            >
              <Printer size={16} />
              چاپ سند (Print / PDF)
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-stone-200 dark:hover:bg-slate-700 text-stone-500 dark:text-slate-400 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Printable Sheet Container */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-stone-100 dark:bg-slate-950">
          <div
            ref={printAreaRef}
            className="bg-white text-stone-900 p-6 md:p-10 rounded-2xl shadow-sm border border-stone-300 max-w-[210mm] mx-auto text-right font-['Vazirmatn'] text-xs leading-relaxed print:p-0 print:border-none print:shadow-none print:m-0"
          >
            {/* Engineering Document Header (Title Box) */}
            <div className="border-2 border-stone-800 rounded-xl p-4 mb-6 bg-stone-50/70">
              <div className="grid grid-cols-12 items-center gap-4 border-b border-stone-300 pb-3 mb-3">
                <div className="col-span-3 text-center sm:text-right">
                  <div className="font-black text-stone-900 text-sm">جمهوری اسلامی ایران</div>
                  <div className="text-[10px] text-stone-500 font-bold">سامانه مدیریت اسناد و مدارک فنی</div>
                  <div className="text-[11px] font-extrabold text-amber-800 mt-1">مرکز کنترل اسناد مهندسی (DCC)</div>
                </div>

                <div className="col-span-6 text-center">
                  <h1 className="text-base sm:text-lg font-black text-stone-900">
                    شناسنامه رسمی مدرک مهندسی
                  </h1>
                  <h2 className="text-xs font-bold text-stone-600 mt-0.5">
                    {doc.projectName}
                  </h2>
                </div>

                <div className="col-span-3 text-left font-mono text-[10px] text-stone-700 space-y-1 dir-ltr">
                  <div><strong>Doc No:</strong> {doc.documentNumber}</div>
                  <div><strong>Revision:</strong> {doc.revision}</div>
                  <div><strong>Date:</strong> {doc.documentDate}</div>
                  <div><strong>Status:</strong> {doc.statusLabel}</div>
                </div>
              </div>

              {/* Document Identity Banner */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold bg-white p-2.5 rounded-lg border border-stone-200">
                <div className="flex items-center gap-2">
                  <span className="text-stone-500">عنوان سند:</span>
                  <span className="text-stone-900 font-black text-sm">{doc.title}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-stone-500">دیسیپلین:</span>
                  <span className="text-stone-800 font-extrabold">{doc.discipline || 'عمومی'}</span>
                </div>
              </div>
            </div>

            {/* Document Core Specifications Table */}
            <div className="border border-stone-800 rounded-xl overflow-hidden mb-6">
              <div className="bg-stone-800 text-white px-3 py-1.5 font-black text-[11px] flex justify-between items-center">
                <span>۱. مشخصات فنی و سازمانی مدرک (General Document Specifications)</span>
                <span className="font-mono text-[10px]">MOD: {doc.moduleLabel}</span>
              </div>
              <table className="w-full text-right text-[11px]">
                <tbody className="divide-y divide-stone-200 font-medium">
                  <tr className="bg-stone-50/50">
                    <td className="p-2.5 font-bold text-stone-600 w-1/4 border-l border-stone-200">کد و شماره مدرک:</td>
                    <td className="p-2.5 font-mono font-black text-stone-900 w-1/4">{doc.documentNumber}</td>
                    <td className="p-2.5 font-bold text-stone-600 w-1/4 border-l border-r border-stone-200">نسخه / ویرایش:</td>
                    <td className="p-2.5 font-mono font-black text-amber-700 w-1/4">{doc.revision}</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold text-stone-600 border-l border-stone-200">بخش / زیرسیستم:</td>
                    <td className="p-2.5 text-stone-800">{doc.moduleLabel}</td>
                    <td className="p-2.5 font-bold text-stone-600 border-l border-r border-stone-200">نوع سند مهندسی:</td>
                    <td className="p-2.5 text-stone-800">{doc.documentTypeLabel}</td>
                  </tr>
                  <tr className="bg-stone-50/50">
                    <td className="p-2.5 font-bold text-stone-600 border-l border-stone-200">تاریخ صدور مدرک:</td>
                    <td className="p-2.5 font-mono text-stone-800">{doc.documentDate}</td>
                    <td className="p-2.5 font-bold text-stone-600 border-l border-r border-stone-200">تاریخ ثبت بایگانی:</td>
                    <td className="p-2.5 font-mono text-stone-800">{doc.registrationDate}</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold text-stone-600 border-l border-stone-200">تهیه‌کننده / صادرکننده:</td>
                    <td className="p-2.5 text-stone-800">{doc.authorName}</td>
                    <td className="p-2.5 font-bold text-stone-600 border-l border-r border-stone-200">دستگاه نظارت:</td>
                    <td className="p-2.5 text-stone-800">{doc.consultantName || 'مهندسین مشاور'}</td>
                  </tr>
                  <tr className="bg-stone-50/50">
                    <td className="p-2.5 font-bold text-stone-600 border-l border-stone-200">کارفرمای پروژه:</td>
                    <td className="p-2.5 text-stone-800">{doc.employerName || 'کارفرما'}</td>
                    <td className="p-2.5 font-bold text-stone-600 border-l border-r border-stone-200">وضعیت مصوب:</td>
                    <td className="p-2.5 font-bold text-emerald-800">{doc.statusLabel}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Scope / Description Section */}
            <div className="border border-stone-800 rounded-xl overflow-hidden mb-6">
              <div className="bg-stone-800 text-white px-3 py-1.5 font-black text-[11px]">
                ۲. شرح، چکیده و توضیحات فنی مدرک (Technical Scope & Summary)
              </div>
              <div className="p-4 bg-white text-stone-800 leading-relaxed font-normal min-h-[70px]">
                {doc.description ? (
                  <p className="whitespace-pre-line text-justify">{doc.description}</p>
                ) : (
                  <p className="text-stone-400 italic">توضیحات تکمیلی ثبت نشده است.</p>
                )}

                {doc.tags && doc.tags.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-stone-100 flex items-center gap-1.5 text-[10px] text-stone-500">
                    <span className="font-bold">برچسب‌ها:</span>
                    {doc.tags.map((t, idx) => (
                      <span key={idx} className="bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Attachments & Drawings List */}
            {doc.attachments && doc.attachments.length > 0 && (
              <div className="border border-stone-800 rounded-xl overflow-hidden mb-6">
                <div className="bg-stone-800 text-white px-3 py-1.5 font-black text-[11px] flex justify-between items-center">
                  <span>۳. مدارک و نقشه‌های پیوست (Document Attachments & Appendices)</span>
                  <span className="text-[10px]">{doc.attachments.length} مورد پیوست</span>
                </div>
                <table className="w-full text-right text-[11px]">
                  <thead className="bg-stone-100 text-stone-700 font-black border-b border-stone-300">
                    <tr>
                      <th className="p-2 w-10 text-center">#</th>
                      <th className="p-2">نام فایل و مدرک ضمیمه</th>
                      <th className="p-2 w-28 text-center">حجم فایل</th>
                      <th className="p-2 w-28 text-center">تاریخ بارگذاری</th>
                      <th className="p-2 w-24 text-center print:hidden">دانلود فایل</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200">
                    {doc.attachments.map((att, idx) => (
                      <tr key={att.id || idx}>
                        <td className="p-2 text-center font-bold text-stone-400">{idx + 1}</td>
                        <td className="p-2 font-bold text-stone-800 flex items-center gap-1.5">
                          <Paperclip size={12} className="text-amber-600" />
                          <span>{att.name}</span>
                        </td>
                        <td className="p-2 font-mono text-center text-stone-600">{att.size || '-'}</td>
                        <td className="p-2 font-mono text-center text-stone-600">{att.uploadDate || doc.registrationDate}</td>
                        <td className="p-2 text-center print:hidden">
                          <button
                            type="button"
                            onClick={() => downloadDccAttachment(att, doc)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded text-[10px] font-bold border border-amber-300 cursor-pointer"
                            title="دانلود فایل پیوست"
                          >
                            <Download size={11} />
                            دانلود
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Workflow Transition History Table */}
            <div className="border border-stone-800 rounded-xl overflow-hidden mb-8">
              <div className="bg-stone-800 text-white px-3 py-1.5 font-black text-[11px]">
                {doc.attachments && doc.attachments.length > 0 ? '۴' : '۳'}. تاریخچه و گردش کار ثبتی سند در سامانه (Workflow Audit Trail)
              </div>
              <table className="w-full text-right text-[11px]">
                <thead className="bg-stone-100 text-stone-700 font-black border-b border-stone-300">
                  <tr>
                    <th className="p-2 w-10 text-center">#</th>
                    <th className="p-2 w-48">کاربر / اقدام‌کننده</th>
                    <th className="p-2 w-36">اقدام گردش کار</th>
                    <th className="p-2 w-32 text-center">تاریخ و زمان</th>
                    <th className="p-2">هامش و توضیحات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {(doc.workflowHistory && doc.workflowHistory.length > 0 ? doc.workflowHistory : [
                    {
                      id: 'ev_0',
                      action: 'CREATE',
                      actorName: doc.authorName || 'کارشناس دفتر فنی',
                      timestamp: Date.now(),
                      comment: 'ثبت و بایگانی اولیه در سامانه DCC'
                    }
                  ]).map((ev, i) => {
                    const actorUser = ev.actorUserId
                      ? SystemAdminService.getUsers().find((u) => u.id === ev.actorUserId)
                      : ev.actorName
                        ? SystemAdminService.getUsers().find(
                            (u) => u.fullName === ev.actorName || u.username === ev.actorName
                          )
                        : undefined;
                    const actorOrg = actorUser?.orgId
                      ? SystemAdminService.getOrganization(actorUser.orgId)
                      : undefined;
                    const fullActorName = actorUser
                      ? formatUserDisplayFormal(actorUser, actorOrg)
                      : ev.actorName || (ev as any).performedBy || 'سیستم';

                    return (
                      <tr key={i}>
                        <td className="p-2 text-center font-bold text-stone-400">{i + 1}</td>
                        <td className="p-2 font-bold text-stone-900">{fullActorName}</td>
                        <td className="p-2 font-black text-amber-700">
                          {WorkflowService.getActionLabel(ev.action, undefined, ev.actorUserId)}
                        </td>
                        <td className="p-2 font-mono text-stone-600 text-center text-[10px]">
                          {ev.timestamp ? new Date(ev.timestamp).toLocaleString('fa-IR') : doc.documentDate}
                        </td>
                        <td className="p-2 text-stone-700">{ev.comment || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Sign-Off Authorization Boxes (Three-Party Signatures) */}
            <div className="border-2 border-stone-800 rounded-xl overflow-hidden">
              <div className="bg-stone-800 text-white px-3 py-1 font-black text-[11px] text-center">
                تاییدات و امضاهای مجاز پروژه (Authorized Signatures & Approvals)
              </div>
              <div className="grid grid-cols-3 divide-x divide-x-reverse divide-stone-800 text-center text-xs">
                {/* 1. Contractor */}
                <div className="p-3 min-h-[110px] flex flex-col justify-between">
                  <div>
                    <span className="font-extrabold text-stone-900 block text-[11px]">پیمانکار مجری</span>
                    <span className="text-[10px] text-stone-500 font-bold block mt-0.5">
                      تهیه و کنترل مدارک (DCC)
                    </span>
                    <span className="text-[10px] font-bold text-stone-800 mt-1 block">
                      {doc.authorName}
                    </span>
                  </div>
                  <div className="border-t border-dashed border-stone-400 pt-2 text-[10px] text-stone-400 font-mono">
                    امضا و مهر پیمانکار
                  </div>
                </div>

                {/* 2. Consultant / Supervision */}
                <div className="p-3 min-h-[110px] flex flex-col justify-between bg-stone-50/50">
                  <div>
                    <span className="font-extrabold text-stone-900 block text-[11px]">دستگاه نظارت و مشاور</span>
                    <span className="text-[10px] text-stone-500 font-bold block mt-0.5">
                      بررسی و تطابق با نقشه‌ها
                    </span>
                    <span className="text-[10px] font-bold text-stone-800 mt-1 block">
                      {doc.consultantName || 'مهندس ناظر مقیم'}
                    </span>
                  </div>
                  <div className="border-t border-dashed border-stone-400 pt-2 text-[10px] text-stone-400 font-mono">
                    امضا و مهر دستگاه نظارت
                  </div>
                </div>

                {/* 3. Employer */}
                <div className="p-3 min-h-[110px] flex flex-col justify-between">
                  <div>
                    <span className="font-extrabold text-stone-900 block text-[11px]">کارفرمای طرح</span>
                    <span className="text-[10px] text-stone-500 font-bold block mt-0.5">
                      تایید نهایی و ابلاغ
                    </span>
                    <span className="text-[10px] font-bold text-stone-800 mt-1 block">
                      {doc.employerName || 'مدیر اجرایی طرح'}
                    </span>
                  </div>
                  <div className="border-t border-dashed border-stone-400 pt-2 text-[10px] text-stone-400 font-mono">
                    امضا و مهر کارفرما
                  </div>
                </div>
              </div>
            </div>

            {/* Document Footer Barcode / Verification note */}
            <div className="mt-4 pt-3 border-t border-stone-300 flex items-center justify-between text-[9px] text-stone-500 font-mono">
              <span>DOC REF: {doc.id}</span>
              <span>ELECTRONIC DOCUMENT VERIFIED BY HAMYAR DCC ENGINE</span>
              <span>DATE: {formatShamsiDate(new Date().toLocaleDateString('fa-IR'))}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
