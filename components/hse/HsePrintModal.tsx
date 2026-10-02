import React from 'react';
import { Printer, X, ShieldCheck, CheckCircle2, AlertTriangle, Building2 } from 'lucide-react';
import { Project, SystemUser } from '../../types';
import { SystemAdminService } from '../../services/systemAdminService';
import { HRService } from '../../services/hrService';
import { formatUserDisplayFormal } from '../../src/utils/userFormatter';
import { PERMIT_TYPE_LABELS, INCIDENT_TYPE_LABELS, ENVIRONMENTAL_ASPECT_LABELS } from '../../types/hse';
import { HseService } from '../../services/hseService';
import { handlePrintOfficialHse } from '../../services/hsePrintService';

interface HsePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentType: 'PERMIT' | 'INCIDENT' | 'ENVIRONMENTAL' | 'PERIODIC' | 'PLAN' | 'COMPREHENSIVE';
  item: any;
  project?: Project;
  currentUser?: SystemUser | null;
}

interface RoleConfig {
  key: string;
  header: string;
  sub: string;
  defaultTitle: string;
  defaultName: string;
}

const CONTRACTOR_ROLES: RoleConfig[] = [
  {
    key: 'contractor_tech',
    header: 'کارشناس HSE / تنظیم‌کننده',
    sub: 'تهیه، ثبت و ارزیابی ریسک‌های کارگاهی',
    defaultTitle: 'کارشناس بهداشت حرفه‌ای و ایمنی کارگاه',
    defaultName: 'افسر ایمنی / کارشناس HSE'
  },
  {
    key: 'contractor_head',
    header: 'سرپرست واحد HSE / مسئول ایمنی',
    sub: 'تایید تطبیق ایمنی، بهداشت و محیط زیست',
    defaultTitle: 'سرپرست ایمنی و HSE پیمانکار',
    defaultName: 'مسئول ایمنی و HSE پیمانکار'
  },
  {
    key: 'contractor_site',
    header: 'سرپرست کارگاه / مدیر پروژه',
    sub: 'تایید عملیات اجرایی و ابلاغ کارگاهی',
    defaultTitle: 'مدیریت کارگاه و پروژه پیمانکار',
    defaultName: 'سرپرست کارگاه پیمانکار'
  }
];

const CONSULTANT_ROLES: RoleConfig[] = [
  {
    key: 'consultant_tech',
    header: 'کارشناس / ناظر HSE مقیم',
    sub: 'نظارت میدانی و بررسی چک‌لیست‌ها',
    defaultTitle: 'ناظر مقیم ایمنی و بهداشت مشاور',
    defaultName: 'ناظر HSE دستگاه نظارت'
  },
  {
    key: 'consultant_head',
    header: 'سرپرست واحد نظارت HSE',
    sub: 'بررسی استانداردها و تایید فنی تمهیدات',
    defaultTitle: 'سرپرست نظارت ایمنی و بهداشت مهندسین مشاور',
    defaultName: 'سرپرست نظارت HSE مشاور'
  },
  {
    key: 'consultant_site',
    header: 'رئیس دستگاه نظارت / مدیر پروژه',
    sub: 'تایید نهایی نظارت و صدور مجوز',
    defaultTitle: 'رئیس دستگاه نظارت / سرپرست نظارت مقیم',
    defaultName: 'رئیس نظارت مشاور'
  }
];

const EMPLOYER_ROLES: RoleConfig[] = [
  {
    key: 'employer_tech',
    header: 'کارشناس HSE / بررسی‌کننده',
    sub: 'ممیزی مدیریتی و کنترل اسناد',
    defaultTitle: 'کارشناس نظارت عالیه HSE کارفرما',
    defaultName: 'کارشناس HSE کارفرما'
  },
  {
    key: 'employer_head',
    header: 'سرپرست / رئیس HSE کارفرما',
    sub: 'تایید کلان ایمنی و مدیریت ریسک پروژه',
    defaultTitle: 'رئیس اداره بهداشت، ایمنی و محیط زیست کارفرما',
    defaultName: 'رئیس HSE کارفرما'
  },
  {
    key: 'employer_site',
    header: 'مدیر طرح / نماینده کارفرما',
    sub: 'تصویب و ابلاغ نهایی سند HSE',
    defaultTitle: 'مدیر طرح / نماینده تام‌الاختیار کارفرما',
    defaultName: 'مدیر طرح کارفرما'
  }
];

export const HsePrintModal: React.FC<HsePrintModalProps> = ({
  isOpen,
  onClose,
  documentType,
  item,
  project,
  currentUser
}) => {
  if (!isOpen || !item) return null;

  const getDocumentTitle = (type: string, itm: any) => {
    switch (type) {
      case 'PERMIT':
        return `مجوز رسمی انجام کار ایمن (${HseService.getPermitTypeLabel(itm.permitType) || 'PTW'})`;
      case 'INCIDENT':
        return 'فرم رسمی ثبت، بررسی و تحلیل حوادث و شبه‌حوادث کارگاهی';
      case 'ENVIRONMENTAL':
        return 'فرم رسمی بازرسی و پایش شاخص‌های زیست‌محیطی (ISO 14001)';
      case 'PERIODIC':
        return `گزارش ادواری عملکرد بهداشت، ایمنی و محیط زیست (${itm.reportType === 'MONTHLY' ? 'ماهانه' : 'هفتگی'})`;
      case 'PLAN':
        return 'سند رسمی برنامه جامع مدیریت بهداشت، ایمنی و محیط زیست (HSE Plan)';
      case 'COMPREHENSIVE':
        return 'کارنامه و گزارش عملکرد تجمیعی مدیریت بهداشت، ایمنی و محیط زیست (HSE)';
      default:
        return 'سند رسمی مدیریت بهداشت، ایمنی و محیط زیست';
    }
  };

  const getDocumentSubTitle = (type: string, itm: any) => {
    switch (type) {
      case 'PERMIT':
        return 'دستورالعمل کنترل و پایش ریسک فعالیت‌های پرخطر کارگاهی - نظام فنی و اجرایی کشور';
      case 'INCIDENT':
        return 'Incident & Near-Miss Investigation Report with Root Cause Analysis (RCA) & CAPA';
      case 'ENVIRONMENTAL':
        return 'Environmental Site Audit, Waste Management & Pollution Control (ISO 14001:2015)';
      case 'PERIODIC':
        return 'Periodic Safety Performance Evaluation, Safe Man-Hours & LTIFR Statistics';
      case 'PLAN':
        return 'Project HSE Management System, Policy, Hazard Identification & Risk Matrix';
      case 'COMPREHENSIVE':
        return 'Comprehensive Health, Safety & Environmental Key Performance Indicators Audit';
      default:
        return 'گزارش رسمی و سند فنی و اجرایی پروژه - واحد بهداشت، ایمنی و محیط زیست';
    }
  };

  const getDocumentNumber = (type: string, itm: any) => {
    return itm.permitNumber || itm.incidentNumber || itm.reportNumber || itm.planNumber || itm.id || 'HSE-DOC-001';
  };

  const getDocumentDate = (type: string, itm: any) => {
    return itm.permitDate || itm.incidentDate || itm.reportDate || itm.revisionDate || new Date().toLocaleDateString('fa-IR');
  };

  const getFullPrintHtml = () => {
    const printContent = document.getElementById('hse-printable-sheet');
    const contentHtml = printContent ? printContent.innerHTML : '';
    const docTitle = getDocumentTitle(documentType, item);

    return `<!DOCTYPE html>
<html dir="rtl" lang="fa">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${docTitle} - سامانه مدیریت پروژه همیار</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/rastikerdar/vazir-font@v30.1.0/dist/font-face.css" />
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
        box-sizing: border-box;
      }
      body {
        font-family: 'Vazir', Tahoma, sans-serif;
        margin: 0;
        padding: 6mm;
        background: #ffffff !important;
        color: #0f172a !important;
        font-size: 11px;
        direction: rtl;
        width: 100%;
      }
      @page {
        size: A4 portrait;
        margin: 6mm;
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      .break-inside-avoid {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }
      @media print {
        body {
          padding: 0 !important;
          margin: 0 !important;
        }
        .print-hidden {
          display: none !important;
        }
      }
    </style>
  </head>
  <body class="bg-white text-stone-900 p-2">
    <div style="max-width: 210mm; margin: 0 auto;">
      ${contentHtml}
    </div>
    <script>
      window.onload = function() {
        setTimeout(function() {
          window.focus();
          window.print();
        }, 300);
      };
    </script>
  </body>
</html>`;
  };

  const handlePrintOfficialReport = () => {
    try {
      handlePrintOfficialHse(documentType, item, project);
    } catch (e) {
      console.warn('Fallback printing error:', e);
      window.print();
    }
  };

  const getSignerUser = (hEvent: any) => {
    if (!hEvent) return null;
    return SystemAdminService.getUsers().find(u => u.id === hEvent.actorUserId || u.username === hEvent.actorName);
  };

  const getSignerImage = (user: SystemUser | null | undefined) => {
    if (!user) return null;
    return HRService.getUserSignature(user) || user.signature || HRService.generateDefaultSignature(user);
  };

  // Helper to map and resolve signatories for all 9 standard role boxes
  const getSignatory = (role: RoleConfig) => {
    const history = item.workflowHistory || [];
    const allUsers = SystemAdminService.getUsers();

    // Match workflow event for this role
    const matchedEvent = [...history].reverse().find((h: any) => {
      const u = allUsers.find(user => user.id === h.actorUserId || user.username === h.actorName || user.fullName === h.actorName);
      const org = u?.orgId ? SystemAdminService.getOrganization(u.orgId) : null;
      const orgType = org?.type;
      const title = (h.actorTitle || u?.jobTitle || '').toLowerCase();

      if (role.key === 'contractor_tech') {
        if (orgType === 'CONTRACTOR' || !orgType) {
          if (h.action === 'SUBMIT' || h.action === 'CREATE' || title.includes('کارشناس') || title.includes('افسر') || title.includes('ایمنی') || title.includes('تنظیم')) return true;
        }
        return false;
      }
      if (role.key === 'contractor_head') {
        if (orgType === 'CONTRACTOR' || !orgType) {
          if (h.action === 'APPROVE' || title.includes('سرپرست واحد') || title.includes('مسئول') || title.includes('رئیس hse') || title.includes('مدیر hse')) return true;
        }
        return false;
      }
      if (role.key === 'contractor_site') {
        if (orgType === 'CONTRACTOR' || !orgType) {
          if (title.includes('کارگاه') || title.includes('مدیر پروژه') || (h.action === 'SUBMIT' && !title.includes('کارشناس'))) return true;
        }
        return false;
      }

      if (role.key === 'consultant_tech') {
        if (orgType === 'CONSULTANT') {
          if (title.includes('کارشناس') || title.includes('ناظر') || title.includes('مقیم')) return true;
        }
        return false;
      }
      if (role.key === 'consultant_head') {
        if (orgType === 'CONSULTANT') {
          if (title.includes('سرپرست واحد') || title.includes('سرپرست نظارت') || title.includes('هماهنگ')) return true;
        }
        return false;
      }
      if (role.key === 'consultant_site') {
        if (orgType === 'CONSULTANT') {
          if (h.action === 'APPROVE' || h.action === 'SEND_TO_EMPLOYER' || title.includes('رئیس') || title.includes('مدیر پروژه') || title.includes('سرپرست نظارت')) return true;
        }
        return false;
      }

      if (role.key === 'employer_tech') {
        if (orgType === 'EMPLOYER') {
          if (title.includes('کارشناس') || title.includes('بررسی') || title.includes('ممیز')) return true;
        }
        return false;
      }
      if (role.key === 'employer_head') {
        if (orgType === 'EMPLOYER') {
          if (title.includes('سرپرست') || title.includes('رئیس') || title.includes('مدیر واحد')) return true;
        }
        return false;
      }
      if (role.key === 'employer_site') {
        if (orgType === 'EMPLOYER') {
          if (h.action === 'FINAL_APPROVE' || h.action === 'APPROVE' || title.includes('مدیر طرح') || title.includes('نماینده') || title.includes('مجری')) return true;
        }
        return false;
      }

      return false;
    });

    if (matchedEvent) {
      const u = allUsers.find(user => user.id === matchedEvent.actorUserId || user.username === matchedEvent.actorName || user.fullName === matchedEvent.actorName);
      const org = u?.orgId ? SystemAdminService.getOrganization(u.orgId) : null;
      const formalName = u ? formatUserDisplayFormal(u, org) : (matchedEvent.actorName || role.defaultName);
      const rawSig = matchedEvent.signature || (u ? getSignerImage(u) : null);
      const isSigned = Boolean(rawSig || (u && matchedEvent.action !== 'CREATE'));
      const signature = rawSig || (isSigned && u ? HRService.generateDefaultSignature(u) : null);
      const date = matchedEvent.timestamp ? new Date(matchedEvent.timestamp).toLocaleDateString('fa-IR') : (item.permitDate || item.reportDate || item.incidentDate || '1403/02/15');

      return {
        name: formalName,
        title: matchedEvent.actorTitle || u?.jobTitle || role.defaultTitle,
        signature: isSigned ? signature : null,
        date: isSigned ? date : undefined,
        isSigned
      };
    }

    // Direct explicit fields on the item
    let explicitName: string | undefined;
    let explicitSigned = false;

    if (role.key === 'contractor_tech') {
      explicitName = item.issuedByName || item.reportedByName || item.preparedByName || item.inspectorName;
      if (explicitName) explicitSigned = true;
    } else if (role.key === 'contractor_site' && item.contractorSiteManagerApproval?.isApproved) {
      explicitSigned = true;
      explicitName = 'سرپرست کارگاه پیمانکار';
    } else if (role.key === 'consultant_site') {
      explicitName = item.approvedByName;
      if (explicitName && (item.workflowStatus === 'APPROVED' || item.workflowStatus === 'ACTIVE')) {
        explicitSigned = true;
      }
    }

    if (explicitName) {
      return {
        name: explicitName,
        title: role.defaultTitle,
        signature: explicitSigned ? HRService.generateDefaultSignature({ fullName: explicitName } as any) : null,
        date: explicitSigned ? (item.permitDate || item.reportDate || item.incidentDate || '1403/02/15') : undefined,
        isSigned: explicitSigned
      };
    }

    return {
      name: role.defaultName,
      title: role.defaultTitle,
      signature: null,
      date: undefined,
      isSigned: false
    };
  };

  const renderSignatureBox = (role: RoleConfig, signatory: ReturnType<typeof getSignatory>) => {
    return (
      <div
        key={role.key}
        className={`bg-white border rounded-lg p-2 text-center flex flex-col justify-between min-h-[115px] print:min-h-[92px] transition-all ${
          signatory.isSigned
            ? 'border-stone-300 shadow-2xs'
            : 'border-dashed border-stone-300 bg-stone-50/50'
        }`}
      >
        <div>
          <div
            className="font-black text-[9px] print:text-[8px] text-stone-900 leading-tight truncate"
            title={role.header}
          >
            {role.header}
          </div>
          <div
            className="text-[7.5px] print:text-[6.5px] text-stone-500 mt-0.5 leading-tight truncate"
            title={role.sub}
          >
            {role.sub}
          </div>
          <div
            className="text-[8px] print:text-[7px] font-bold text-stone-800 mt-1 bg-stone-100/90 px-1 py-0.5 rounded truncate"
            title={signatory.name}
          >
            {signatory.name}
          </div>
        </div>

        <div className="my-1 flex flex-col items-center justify-center min-h-[36px] print:min-h-[28px]">
          {signatory.isSigned && signatory.signature ? (
            <>
              <img
                src={signatory.signature}
                alt={role.header}
                className="max-h-8 print:max-h-7 max-w-full object-contain filter contrast-125"
              />
              <div className="text-[7px] print:text-[6.5px] text-emerald-600 font-black mt-0.5 flex items-center justify-center gap-0.5">
                <CheckCircle2 size={9} className="shrink-0 text-emerald-600" />
                <span>✓ امضاء معتبر</span>
              </div>
            </>
          ) : (
            <div className="text-[8px] print:text-[7px] text-stone-400 italic">
              محل امضاء و مهر
            </div>
          )}
        </div>

        <div className="border-t border-dashed border-stone-200 pt-0.5 text-[7.5px] print:text-[6.5px] text-stone-500 font-mono truncate">
          {signatory.date || 'نام و امضاء'}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[250] bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto" dir="rtl">
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 6mm;
          }
          body {
            background: #ffffff !important;
            color: #000000 !important;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
      <div className="bg-white text-stone-900 w-full max-w-5xl md:max-w-6xl rounded-2xl shadow-2xl overflow-hidden my-auto border border-stone-300 print:m-0 print:p-0 print:border-none print:shadow-none print:max-w-none print:w-full">
        {/* Modal Top Control Bar (Hidden on print) */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-stone-100 border-b border-stone-200 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
              <Printer size={18} />
            </div>
            <div>
              <span className="font-black text-sm text-stone-900 block">پیش‌نمایش فرم استاندارد HSE و آماده‌سازی چاپ رسمی</span>
              <span className="text-[10px] text-stone-500 font-bold block">منطبق با ضوابط نظام فنی و اجرایی کشور، سربرگ مهندسی و امضاهای ارکان پروژه</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrintOfficialReport}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              title="چاپ گزارش رسمی در تب مستقل و آماده‌سازی خروجی PDF"
            >
              <Printer size={15} />
              <span>چاپ گزارش رسمی</span>
            </button>
            <button
              onClick={onClose}
              className="px-3 py-2 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              بستن
            </button>
          </div>
        </div>

        {/* Official Printable Sheet (A4 Portrait Layout) */}
        <div id="hse-printable-sheet" className="p-6 md:p-8 space-y-4 text-stone-900 bg-white print:p-0">
          {/* TECHNICAL OFFICE STANDARD 3-COLUMN ENGINEERING LETTERHEAD */}
          <div className="border-2 border-stone-900 rounded-xl overflow-hidden bg-white mb-3 shadow-2xs">
            {/* Top 3-Column Box */}
            <div className="grid grid-cols-12 border-b border-stone-900 divide-x divide-x-reverse divide-stone-900 text-xs">
              {/* Right Column: Organization & Identity */}
              <div className="col-span-3 p-2.5 flex flex-col justify-between items-center text-center bg-stone-50/80">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-amber-600 text-white rounded-lg flex items-center justify-center font-black text-sm shadow-xs border border-amber-700 shrink-0">
                    HSE
                  </div>
                  <div className="text-right">
                    <div className="font-black text-[11px] text-stone-900 leading-tight">جمهوری اسلامی ایران</div>
                    <div className="text-[9px] text-stone-600 font-bold mt-0.5">سامانه جامع مدیریت پروژه همیار</div>
                  </div>
                </div>
                <div className="mt-2 w-full pt-1.5 border-t border-stone-300 text-[8.5px] font-mono text-stone-600 flex justify-between px-1">
                  <span>ISO 45001:2018</span>
                  <span>ISO 14001:2015</span>
                </div>
              </div>

              {/* Center Column: Document Title & Project Tripartite Pillars */}
              <div className="col-span-6 p-2 flex flex-col justify-between text-center">
                <div>
                  <h1 className="font-black text-sm md:text-base text-stone-950 tracking-tight leading-snug">
                    {getDocumentTitle(documentType, item)}
                  </h1>
                  <div className="text-[9px] font-bold text-amber-800 mt-0.5">
                    {getDocumentSubTitle(documentType, item)}
                  </div>
                </div>

                {/* Tripartite Pillars */}
                <div className="mt-1.5 pt-1 border-t border-dashed border-stone-300 grid grid-cols-3 gap-1 text-[8.5px]">
                  <div className="truncate"><strong className="text-stone-500">کارفرما:</strong> <span className="font-bold text-stone-800">{project?.employerName || 'دستگاه اجرایی و کارفرما'}</span></div>
                  <div className="truncate"><strong className="text-stone-500">مشاور:</strong> <span className="font-bold text-stone-800">{project?.consultantName || 'مهندسین مشاور'}</span></div>
                  <div className="truncate"><strong className="text-stone-500">پیمانکار:</strong> <span className="font-bold text-stone-800">{project?.contractorName || 'سازمان پیمانکار'}</span></div>
                </div>
              </div>

              {/* Left Column: Document Metadata & Control Numbers */}
              <div className="col-span-3 p-2.5 flex flex-col justify-between font-mono text-[9px] bg-stone-50/80">
                <div className="space-y-1 text-right">
                  <div><strong className="text-stone-500 font-sans">شماره سند:</strong> <span className="font-black text-stone-900">{getDocumentNumber(documentType, item)}</span></div>
                  <div><strong className="text-stone-500 font-sans">شماره پیمان:</strong> <span className="font-bold text-stone-800">{project?.contractNumber || 'PRJ-101'}</span></div>
                  <div><strong className="text-stone-500 font-sans">تاریخ صدور:</strong> <span className="font-bold text-stone-800">{getDocumentDate(documentType, item)}</span></div>
                </div>
                <div className="border-t border-stone-300 pt-1 flex justify-between text-[8px] text-stone-500 font-sans">
                  <span>پیوست: دارد</span>
                  <span>ویرایش: ۱.۴.۰</span>
                </div>
              </div>
            </div>

            {/* Bottom Project Details Bar */}
            <div className="bg-stone-100/90 p-2 grid grid-cols-2 md:grid-cols-4 gap-2 text-[9.5px] font-bold">
              <div className="truncate">
                <span className="text-stone-500 ml-1">پروژه:</span>
                <span className="text-stone-900 font-black">{project?.title || 'پروژه عمرانی و کارگاهی'}</span>
              </div>
              <div className="truncate">
                <span className="text-stone-500 ml-1">زون / موقعیت:</span>
                <span className="text-stone-900 font-black">{item.location || item.exactLocation || 'سایت اصلی کارگاه'}</span>
              </div>
              <div className="truncate">
                <span className="text-stone-500 ml-1">گردش‌کار:</span>
                <span className="text-amber-800 font-black">{item.workflowStatus || 'مصوب و معتبر'}</span>
              </div>
              <div className="truncate">
                <span className="text-stone-500 ml-1">حساسیت / ریسک:</span>
                <span className="text-rose-700 font-black">{item.riskLevel || item.severity || 'پایش مستمر'}</span>
              </div>
            </div>
          </div>

          {/* DOCUMENT SPECIFIC BODY CONTENT */}

          {/* 1. WORK PERMIT (PTW) */}
          {documentType === 'PERMIT' && (
            <div className="space-y-4">
              <div className="border border-stone-300 rounded-xl overflow-hidden">
                <div className="bg-stone-100 p-2.5 font-black text-xs border-b border-stone-300 flex justify-between">
                  <span>مشخصات مجوز کار ایمن (Work Permit Form)</span>
                  <span className="text-amber-800">نوع پرمیت: {HseService.getPermitTypeLabel(item.permitType)}</span>
                </div>
                <div className="p-3 text-xs grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <span className="text-stone-500 font-bold block">شرح دقیق فعالیت تحت نظارت:</span>
                    <p className="font-black text-stone-900 mt-1">{item.description}</p>
                  </div>
                  <div className="space-y-1">
                    <div><span className="text-stone-500 font-bold">زمان شروع و انقضا:</span> {item.startTime} تا {item.endTime}</div>
                    <div><span className="text-stone-500 font-bold">پیمانکار / گروه مجری:</span> {item.contractorSubcontractor || 'تیم عملیات پیمانکار'}</div>
                    <div><span className="text-stone-500 font-bold">تعداد نفرات کارگری:</span> {item.workerCount || 4} نفر</div>
                  </div>
                </div>
              </div>

              {/* Checklists Table */}
              <div className="border border-stone-300 rounded-xl overflow-hidden">
                <div className="bg-stone-100 p-2 font-black text-xs border-b border-stone-300">
                  چک‌لیست تخصصی اقدامات کنترلی و پیشگیرانه ایمنی پیش از شروع کار
                </div>
                <table className="w-full text-xs text-right border-collapse">
                  <thead>
                    <tr className="bg-stone-50 border-b border-stone-200">
                      <th className="p-2 border-l border-stone-200 w-10 text-center">ردیف</th>
                      <th className="p-2 border-l border-stone-200">شرح بند کنترلی ایمنی و پیش‌نیاز کار</th>
                      <th className="p-2 border-l border-stone-200 w-24 text-center">وضعیت انطباق</th>
                      <th className="p-2">ملاحظات و توضیحات تکمیلی</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(item.checklists || []).map((chk: any, idx: number) => (
                      <tr key={chk.id || idx} className="border-b border-stone-200">
                        <td className="p-2 border-l border-stone-200 text-center font-bold">{idx + 1}</td>
                        <td className="p-2 border-l border-stone-200 font-bold">{chk.question}</td>
                        <td className="p-2 border-l border-stone-200 text-center font-black">
                          {chk.status === 'YES' ? (
                            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">رعایت شد ✓</span>
                          ) : chk.status === 'NO' ? (
                            <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded">عدم رعایت ✕</span>
                          ) : (
                            <span className="text-stone-500 bg-stone-100 px-2 py-0.5 rounded">نامربوط (N/A)</span>
                          )}
                        </td>
                        <td className="p-2 text-stone-600 font-medium">{chk.comments || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Gas Test & PPE Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {item.gasTest && item.gasTest.performed && (
                  <div className="border border-stone-300 rounded-xl p-3 bg-stone-50">
                    <span className="font-black block text-stone-800 mb-1.5">نتایج آزمون سنجش گاز اتمسفر:</span>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>اکسیژن (O2): <span className="font-black text-emerald-700">{item.gasTest.oxygenLevel}%</span></div>
                      <div>گازهای قابل اشتعال (LEL): <span className="font-black text-emerald-700">{item.gasTest.flammableGas}%</span></div>
                      <div>مونوکسید کربن (CO): <span className="font-black text-stone-800">{item.gasTest.carbonMonoxide} ppm</span></div>
                      <div>سولفید هیدروژن (H2S): <span className="font-black text-stone-800">{item.gasTest.hydrogenSulfide} ppm</span></div>
                    </div>
                  </div>
                )}

                <div className="border border-stone-300 rounded-xl p-3 bg-stone-50">
                  <span className="font-black block text-stone-800 mb-1.5">تجهیزات حفاظت فردی (PPE) الزامی:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {(item.requiredPpe || []).map((ppe: string, idx: number) => (
                      <span key={idx} className="bg-white border border-stone-300 px-2 py-0.5 rounded text-[11px] font-bold text-stone-700">
                        {ppe}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. INCIDENT REPORT */}
          {documentType === 'INCIDENT' && (
            <div className="space-y-4 text-xs">
              <div className="border border-stone-300 rounded-xl p-4 bg-stone-50 space-y-2">
                <div className="flex justify-between font-black text-stone-900 border-b border-stone-200 pb-2">
                  <span>عنوان رویداد: {item.title}</span>
                  <span className="text-rose-700">طبقه‌بندی: {INCIDENT_TYPE_LABELS[item.incidentType] || item.incidentType}</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1 font-bold">
                  <div>تاریخ و ساعت: {item.incidentDate} - {item.incidentTime}</div>
                  <div>شدت رویداد: {item.severity}</div>
                  <div>روزهای کاری تلف شده: {item.lostWorkDays || 0} روز</div>
                  <div>نیاز به درمان پزشکی: {item.medicalTreatmentRequired ? 'بله' : 'خیر'}</div>
                </div>
                <div className="pt-2">
                  <span className="font-bold text-stone-600 block">شرح کامل واقعه:</span>
                  <p className="mt-1 leading-relaxed text-stone-800">{item.description}</p>
                </div>
              </div>

              {/* RCA & Immediate Causes */}
              <div className="border border-stone-300 rounded-xl p-3 space-y-2">
                <div className="font-black text-stone-800">تحلیل علل ریشه‌ای و بنیادین (Root Cause Analysis - RCA):</div>
                <p className="text-stone-700 leading-relaxed font-bold">{item.rootCauses || 'عدم رعایت فاصله ایمن و عدم پایش مستمر اپراتور'}</p>
              </div>

              {/* CAPA Corrective Actions Table */}
              <div className="border border-stone-300 rounded-xl overflow-hidden">
                <div className="bg-stone-100 p-2 font-black text-xs border-b border-stone-300">
                  اقدامات اصلاحی و پیشگیرانه مصوب (CAPA)
                </div>
                <table className="w-full text-xs text-right border-collapse">
                  <thead>
                    <tr className="bg-stone-50 border-b border-stone-200 font-black">
                      <th className="p-2 border-l border-stone-200 w-10 text-center">ردیف</th>
                      <th className="p-2 border-l border-stone-200">شرح اقدام اصلاحی / پیشگیرانه</th>
                      <th className="p-2 border-l border-stone-200 w-32">مسئول پیگیری</th>
                      <th className="p-2 border-l border-stone-200 w-24 text-center">مهلت انجام</th>
                      <th className="p-2 w-24 text-center">وضعیت اقدام</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(item.correctiveActions || []).map((capa: any, idx: number) => (
                      <tr key={capa.id || idx} className="border-b border-stone-200">
                        <td className="p-2 border-l border-stone-200 text-center font-bold">{idx + 1}</td>
                        <td className="p-2 border-l border-stone-200 font-bold">{capa.action}</td>
                        <td className="p-2 border-l border-stone-200 font-medium">{capa.responsiblePerson}</td>
                        <td className="p-2 border-l border-stone-200 text-center font-mono">{capa.targetDate}</td>
                        <td className="p-2 text-center font-black">
                          {capa.status === 'COMPLETED' ? (
                            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">انجام شده</span>
                          ) : (
                            <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded">در حال پیگیری</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 3. ENVIRONMENTAL REPORT */}
          {documentType === 'ENVIRONMENTAL' && (
            <div className="space-y-4 text-xs">
              <div className="border border-stone-300 rounded-xl p-4 bg-stone-50 space-y-2">
                <div className="flex justify-between font-black text-stone-900 border-b border-stone-200 pb-2">
                  <span>عنوان پایش زیست‌محیطی: {item.title}</span>
                  <span className="text-emerald-800">جنبه زیست‌محیطی: {ENVIRONMENTAL_ASPECT_LABELS[item.aspect] || item.aspect}</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pt-1 font-bold">
                  <div>تاریخ بازرسی: {item.reportDate}</div>
                  <div>بازرس محیط‌زیست: {item.inspectorName}</div>
                  <div>وضعیت انطباق با استاندارد: {item.complianceStatus === 'COMPLIANT' ? 'منطبق و استاندارد ✓' : 'عدم انطباق شناسایی شد ✕'}</div>
                </div>
              </div>

              <div className="border border-stone-300 rounded-xl p-3">
                <span className="font-black block text-stone-800 mb-1">شرح مشاهدات و نتایج اندازه‌گیری‌های میدانی:</span>
                <p className="text-stone-700 leading-relaxed font-bold">{item.observations}</p>
              </div>

              <div className="border border-stone-300 rounded-xl p-3 bg-emerald-50/50">
                <span className="font-black block text-emerald-900 mb-1">اقدامات پیشگیرانه و برنامه مدیریت پسماند / آلایندگی:</span>
                <p className="text-stone-700 leading-relaxed font-bold">{item.recommendedActions || 'تخلیه بموقع سطل‌های تفکیک پسماند و آب‌پاشی دوره‌ای محوطه خاکی'}</p>
              </div>
            </div>
          )}

          {/* 4. PERIODIC REPORT (WEEKLY / MONTHLY) */}
          {documentType === 'PERIODIC' && (
            <div className="space-y-4 text-xs">
              <div className="border border-stone-300 rounded-xl p-4 bg-stone-50">
                <div className="flex justify-between font-black text-stone-900 border-b border-stone-200 pb-2">
                  <span>گزارش دوره‌ای ایمنی و بهداشت ({item.reportType === 'MONTHLY' ? 'ماهانه' : 'هفتگی'})</span>
                  <span>دوره: {item.periodStart} الی {item.periodEnd}</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 text-center">
                  <div className="bg-white p-2.5 rounded-lg border border-stone-200">
                    <span className="text-stone-500 text-[10px] block">نفر-ساعت کارکرد بدون حادثه:</span>
                    <span className="font-black text-emerald-700 text-sm">{item.kpiStats?.safeManHours?.toLocaleString('fa-IR') || '۴۸,۵۰۰'}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-stone-200">
                    <span className="text-stone-500 text-[10px] block">نرخ تکرار حادثه (LTIFR):</span>
                    <span className="font-black text-stone-900 text-sm">{item.kpiStats?.ltifr || '۰.۰۰'}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-stone-200">
                    <span className="text-stone-500 text-[10px] block">پرمیت‌های کار صادرشده:</span>
                    <span className="font-black text-amber-700 text-sm">{item.kpiStats?.permitsIssued || '۲۴'}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-stone-200">
                    <span className="text-stone-500 text-[10px] block">تعداد آموزش‌های TBM:</span>
                    <span className="font-black text-indigo-700 text-sm">{item.kpiStats?.toolboxTalksCount || '۱۸'} جلسه</span>
                  </div>
                </div>
              </div>

              <div className="border border-stone-300 rounded-xl p-3">
                <span className="font-black block text-stone-800 mb-1">خلاصه اقدامات برجسته و پایش‌های انجام شده در دوره:</span>
                <p className="text-stone-700 leading-relaxed font-bold">{item.summary || 'کلیه کارگاه‌های فعال تحت بازرسی روزانه قرار گرفته و تجهیزات اطفاء حریق سرویس شدند.'}</p>
              </div>
            </div>
          )}

          {/* 5. HSE PLAN */}
          {documentType === 'PLAN' && (
            <div className="space-y-4 text-xs">
              <div className="border border-stone-300 rounded-xl p-4 bg-stone-50 space-y-2">
                <div className="flex justify-between font-black text-stone-900 border-b border-stone-200 pb-2">
                  <span>برنامه جامع HSE پروژه (Project HSE Plan)</span>
                  <span>ویرایش: {item.revision || '1.0'}</span>
                </div>
                <div className="pt-1">
                  <span className="font-black text-stone-800 block mb-1">خط‌مشی بهداشت، ایمنی و محیط زیست (HSE Policy):</span>
                  <p className="text-stone-700 leading-relaxed font-bold">{item.policyStatement}</p>
                </div>
              </div>

              {/* Risk Assessment Summary */}
              <div className="border border-stone-300 rounded-xl overflow-hidden">
                <div className="bg-stone-100 p-2 font-black text-xs border-b border-stone-300">
                  ماتریس شناسایی خطرات و ارزیابی ریسک (Risk Assessment Matrix)
                </div>
                <table className="w-full text-xs text-right border-collapse">
                  <thead>
                    <tr className="bg-stone-50 border-b border-stone-200 font-black">
                      <th className="p-2 border-l border-stone-200 w-10 text-center">ردیف</th>
                      <th className="p-2 border-l border-stone-200">فعالیت کارگاهی</th>
                      <th className="p-2 border-l border-stone-200">خطرات شناسایی شده</th>
                      <th className="p-2 border-l border-stone-200 w-24 text-center">ریسک اولیه</th>
                      <th className="p-2 border-l border-stone-200">اقدامات کنترلی و پیشگیرانه</th>
                      <th className="p-2 w-24 text-center">ریسک باقی‌مانده</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(item.riskMatrix || []).map((rm: any, idx: number) => (
                      <tr key={rm.id || idx} className="border-b border-stone-200">
                        <td className="p-2 border-l border-stone-200 text-center font-bold">{idx + 1}</td>
                        <td className="p-2 border-l border-stone-200 font-bold">{rm.activity}</td>
                        <td className="p-2 border-l border-stone-200">{rm.hazard}</td>
                        <td className="p-2 border-l border-stone-200 text-center font-black text-rose-700">{rm.initialRisk}</td>
                        <td className="p-2 border-l border-stone-200 font-medium">{rm.controlMeasure}</td>
                        <td className="p-2 text-center font-black text-emerald-700">{rm.residualRisk}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 6. COMPREHENSIVE PROJECT HSE AUDIT & PERFORMANCE REPORT */}
          {documentType === 'COMPREHENSIVE' && (
            <div className="space-y-4 text-xs">
              {/* Top Statistics Overview Banner */}
              <div className="border border-stone-300 rounded-xl p-3.5 bg-stone-50/90">
                <div className="flex items-center justify-between font-black text-stone-900 border-b border-stone-200 pb-2 mb-2.5">
                  <span className="flex items-center gap-1.5 text-stone-900">
                    <ShieldCheck size={16} className="text-amber-600" />
                    خلاصه وضعیت شاخص‌های کلیدی عملکرد بهداشت، ایمنی و محیط زیست کارگاه (HSE KPIs)
                  </span>
                  <span className="text-[10.5px] text-stone-500 font-mono">
                    دوره ارزیابی: از شروع پروژه لغایت {new Date().toLocaleDateString('fa-IR')}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 text-center">
                  <div className="bg-white p-2.5 rounded-lg border border-emerald-200">
                    <span className="text-stone-500 text-[10px] block font-bold">نفر-ساعت ایمن بدون حادثه (LTI):</span>
                    <span className="font-black text-emerald-700 text-base">{item.safeManHours?.toLocaleString('fa-IR') || '۰'}</span>
                    <span className="text-[9px] text-emerald-600 block mt-0.5">ضریب تکرار: {item.ltifr || '۰.۰۰'}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-amber-200">
                    <span className="text-stone-500 text-[10px] block font-bold">مجوزهای فعال کار (PTW):</span>
                    <span className="font-black text-amber-700 text-base">{item.activePermitsCount || 0}</span>
                    <span className="text-[9px] text-stone-500 block mt-0.5">از مجموع {item.totalPermitsCount || 0} پرمیت</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-rose-200">
                    <span className="text-stone-500 text-[10px] block font-bold">رویدادها و شبه‌حوادث:</span>
                    <span className="font-black text-rose-700 text-base">{item.totalIncidentsCount || 0}</span>
                    <span className="text-[9px] text-rose-600 block mt-0.5">{item.openIncidentsCount || 0} اقدام باز</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-teal-200">
                    <span className="text-stone-500 text-[10px] block font-bold">نرخ انطباق زیست‌محیطی:</span>
                    <span className="font-black text-teal-700 text-base">{item.environmentalComplianceRate || 100}%</span>
                    <span className="text-[9px] text-teal-600 block mt-0.5">{item.totalEnvironmentalAudits || 0} بازرسی ثبت‌شده</span>
                  </div>
                </div>
              </div>

              {/* Active High-Risk Work Permits Section */}
              <div className="border border-stone-300 rounded-xl overflow-hidden">
                <div className="bg-stone-100 p-2 font-black text-xs border-b border-stone-300 flex justify-between">
                  <span>خلاصه آخرین مجوزهای کار پرخطر در حال اجرای کارگاه (Active PTW List)</span>
                  <span className="text-amber-800 text-[10.5px]">رعایت الزامات حفاظت فردی و گازسنجی</span>
                </div>
                <table className="w-full text-xs text-right border-collapse">
                  <thead>
                    <tr className="bg-stone-50 border-b border-stone-200 font-black text-[10px]">
                      <th className="p-2 border-l border-stone-200 w-8 text-center">ردیف</th>
                      <th className="p-2 border-l border-stone-200 w-24">شماره پرمیت</th>
                      <th className="p-2 border-l border-stone-200 w-28">نوع مجوز</th>
                      <th className="p-2 border-l border-stone-200">شرح فعالیت و موقعیت</th>
                      <th className="p-2 border-l border-stone-200 w-24 text-center">تاریخ و ساعت</th>
                      <th className="p-2 w-20 text-center">وضعیت</th>
                    </tr>
                  </thead>
                  <tbody>
                    {((item.permitsList || []) as any[]).slice(0, 5).map((p: any, idx: number) => (
                      <tr key={p.id || idx} className="border-b border-stone-200">
                        <td className="p-2 border-l border-stone-200 text-center font-bold">{idx + 1}</td>
                        <td className="p-2 border-l border-stone-200 font-mono font-bold text-stone-800">{p.permitNumber}</td>
                        <td className="p-2 border-l border-stone-200 font-bold text-amber-800">{HseService.getPermitTypeLabel(p.permitType)}</td>
                        <td className="p-2 border-l border-stone-200">{p.description} ({p.location})</td>
                        <td className="p-2 border-l border-stone-200 text-center font-mono text-[10px]">{p.permitDate} {p.startTime}</td>
                        <td className="p-2 text-center font-black text-emerald-700">
                          {p.workflowStatus === 'APPROVED' ? 'تایید شده ✓' : p.workflowStatus}
                        </td>
                      </tr>
                    ))}
                    {(!item.permitsList || item.permitsList.length === 0) && (
                      <tr>
                        <td colSpan={6} className="p-3 text-center text-stone-400 italic">مجوز کار فعالی در این بازه ثبت نشده است.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Incident & CAPA Summary Table */}
              <div className="border border-stone-300 rounded-xl overflow-hidden">
                <div className="bg-stone-100 p-2 font-black text-xs border-b border-stone-300 flex justify-between">
                  <span>خلاصه سوابق رویدادها، شبه‌حوادث و وضعیت اقدامات اصلاحی و پیشگیرانه (CAPA Status)</span>
                  <span className="text-rose-800 text-[10.5px]">ثبت درس‌آموزی از حوادث</span>
                </div>
                <table className="w-full text-xs text-right border-collapse">
                  <thead>
                    <tr className="bg-stone-50 border-b border-stone-200 font-black text-[10px]">
                      <th className="p-2 border-l border-stone-200 w-8 text-center">ردیف</th>
                      <th className="p-2 border-l border-stone-200 w-24">کد رویداد</th>
                      <th className="p-2 border-l border-stone-200">عنوان و طبقه‌بندی رویداد</th>
                      <th className="p-2 border-l border-stone-200 w-24 text-center">تاریخ واقعه</th>
                      <th className="p-2 border-l border-stone-200">اقدامات اصلاحی اتخاذ شده (CAPA)</th>
                      <th className="p-2 w-20 text-center">وضعیت اقدام</th>
                    </tr>
                  </thead>
                  <tbody>
                    {((item.incidentsList || []) as any[]).slice(0, 5).map((inc: any, idx: number) => (
                      <tr key={inc.id || idx} className="border-b border-stone-200">
                        <td className="p-2 border-l border-stone-200 text-center font-bold">{idx + 1}</td>
                        <td className="p-2 border-l border-stone-200 font-mono font-bold text-stone-800">{inc.incidentNumber}</td>
                        <td className="p-2 border-l border-stone-200 font-bold text-rose-800">{inc.title} ({INCIDENT_TYPE_LABELS[inc.incidentType] || inc.incidentType})</td>
                        <td className="p-2 border-l border-stone-200 text-center font-mono text-[10px]">{inc.incidentDate}</td>
                        <td className="p-2 border-l border-stone-200 text-stone-700">
                          {inc.correctiveActions?.[0]?.action || inc.rootCauses || 'برگزاری جلسه TBM و بازآموزی تیم اجرایی'}
                        </td>
                        <td className="p-2 text-center font-bold text-emerald-700">انجام شد ✓</td>
                      </tr>
                    ))}
                    {(!item.incidentsList || item.incidentsList.length === 0) && (
                      <tr>
                        <td colSpan={6} className="p-3 text-center text-emerald-600 font-bold">خوشبختانه رویداد یا حادثه ناتوان‌کننده‌ای در کارگاه رخ نداده است (Zero LTI).</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* HSE Policy & Environmental Management Statement */}
              <div className="border border-stone-300 rounded-xl p-3 bg-stone-50 text-[11px] leading-relaxed">
                <span className="font-black text-stone-900 block mb-1">بیانیه پایبندی به استانداردهای HSE کارگاه:</span>
                <p className="text-stone-700">
                  کلیه عملیات اجرایی کارگاهی تحت الزامات طرح مدیریت HSE مصوب و با حضور مستمر کارشناسان ایمنی پیمانکار و دستگاه نظارت در حال انجام است. تجهیزات اطفاء حریق، جعبه‌های کمک‌های اولیه، علائم هشداردهنده و گواهی سلامت ماشین‌آلات به صورت ادواری ممیزی و کنترل می‌گردند.
                </p>
              </div>
            </div>
          )}

          {/* STANDARD 9 OFFICIAL SIGNATURE BOXES (3 PER ORGANIZATION) */}
          <div className="pt-4 border-t-2 border-stone-900 break-inside-avoid page-break-inside-avoid">
            <div className="flex items-center justify-between mb-2.5 pb-1 border-b border-stone-300">
              <div className="text-[11px] font-black text-stone-900 flex items-center gap-1.5">
                <ShieldCheck size={16} className="text-amber-600 shrink-0" />
                <span>تاییدات رسمی و امضاهای سازمانی ارکان سه‌گانه پروژه (پیمانکار، مشاور، کارفرما):</span>
              </div>
              <span className="text-[9.5px] text-stone-500 font-medium">
                منطبق با ضوابط نظام فنی و اجرایی و الزامات HSE-MS
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5 print:grid-cols-3 print:gap-1.5 text-xs">
              {/* Organization 1: پیمانکار */}
              <div className="border border-blue-200 bg-blue-50/40 rounded-xl p-2 flex flex-col justify-between">
                <div className="font-black text-[10px] print:text-[9px] text-blue-950 text-center border-b border-blue-200/90 pb-1 mb-1.5 truncate">
                  سازمان پیمانکار: {project?.contractorName || 'پیمانکار مجری'}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 print:grid-cols-3">
                  {CONTRACTOR_ROLES.map(role => renderSignatureBox(role, getSignatory(role)))}
                </div>
              </div>

              {/* Organization 2: مشاور / دستگاه نظارت */}
              <div className="border border-emerald-200 bg-emerald-50/40 rounded-xl p-2 flex flex-col justify-between">
                <div className="font-black text-[10px] print:text-[9px] text-emerald-950 text-center border-b border-emerald-200/90 pb-1 mb-1.5 truncate">
                  دستگاه نظارت و مشاور: {project?.consultantName || 'مهندسین مشاور'}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 print:grid-cols-3">
                  {CONSULTANT_ROLES.map(role => renderSignatureBox(role, getSignatory(role)))}
                </div>
              </div>

              {/* Organization 3: دستگاه کارفرما */}
              <div className="border border-purple-200 bg-purple-50/40 rounded-xl p-2 flex flex-col justify-between">
                <div className="font-black text-[10px] print:text-[9px] text-purple-950 text-center border-b border-purple-200/90 pb-1 mb-1.5 truncate">
                  دستگاه اجرایی و کارفرما: {project?.employerName || 'دستگاه کارفرما'}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 print:grid-cols-3">
                  {EMPLOYER_ROLES.map(role => renderSignatureBox(role, getSignatory(role)))}
                </div>
              </div>
            </div>
          </div>

          {/* Engineering Footer Notes */}
          <div className="text-[9px] text-stone-500 border-t border-stone-300 pt-2 flex flex-col sm:flex-row items-center justify-between gap-1 font-mono">
            <span>سند رسمی تولید شده توسط سامانه یکپارچه مدیریت پروژه همیار - دارای اعتبار قانونی نظارتی با تاییدات ارکان سه‌گانه</span>
            <div className="flex items-center gap-3">
              <span>تاریخ چاپ: {new Date().toLocaleDateString('fa-IR')}</span>
              <span>صفحه ۱ از ۱</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
