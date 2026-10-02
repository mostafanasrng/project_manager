import { WorkflowStatus, WorkflowEvent } from '../types';

export type DccModule = 
  | 'ALL'
  | 'TECHNICAL_OFFICE'    // دفتر فنی
  | 'QUALITY_CONTROL'     // کنترل کیفیت
  | 'PLANNING'            // کنترل و برنامه‌ریزی
  | 'HSE'                 // ایمنی و بهداشت (HSE)
  | 'EXECUTION'           // اجرا و کارگاه
  | 'COMMUNICATIONS'      // مکاتبات فنی و اداری
  | 'CONTRACTS'           // مدیریت قراردادها و پیمان
  | 'CUSTOM_ARCHIVE';     // اسناد و مدارک بایگانی مهندسی DCC

export type DccDocumentType =
  | 'MINUTE'                // صورتمجلس کارگاهی
  | 'STATEMENT'             // صورت‌وضعیت
  | 'VARIATION_ORDER'       // دستور کار / تغییر مقادیر
  | 'ESTIMATE'              // برآورد و فهرست بها
  | 'MRS'                   // درخواست خرید مصالح
  | 'MIV'                   // حواله انبار
  | 'ADJUSTMENT'            // تعدیل آحاد بها
  | 'RFI'                   // درخواست بازرسی فنی (RFI)
  | 'NCR'                   // گزارش عدم انطباق (NCR)
  | 'LAB_TEST'              // نتایج آزمایشگاه
  | 'QC_CHECKLIST'          // چک‌لیست کیفی
  | 'WORK_PERMIT'           // پرمیت کار ایمنی (PTW)
  | 'INCIDENT_REPORT'       // گزارش حادثه
  | 'ENVIRONMENTAL_REPORT'  // پایش زیست‌محیطی
  | 'HSE_PERIODIC_REPORT'   // گزارش ادواری HSE
  | 'HSE_PLAN'              // برنامه جامع HSE
  | 'DAILY_REPORT'          // گزارش روزانه کارگاه
  | 'DELAY_LOG'             // گزارش تاخیرات
  | 'DELAY_CLAIM'           // لایحه تاخیرات
  | 'LOSS_CLAIM'            // لایحه ضرر و زیان
  | 'PROGRESS_REPORT'       // گزارش پیشرفت فیزیکی
  | 'OFFICIAL_LETTER'       // نامه رسمی اداری
  | 'CONTRACT'              // قرارداد / موافقت‌نامه
  | 'SHOP_DRAWING'          // نقشه کارگاهی (Shop Drawing)
  | 'AS_BUILT'              // نقشه چون‌ساخت (As-Built)
  | 'TRANSMITTAL'           // ترانسمیتال مهندسی
  | 'SUBMITTAL'             // سابمیتال تایید مصالح (MAS)
  | 'SPECIFICATION'         // مشخصات فنی
  | 'OTHER';                // سایر اسناد

export interface DccAttachment {
  id: string;
  name: string;
  size?: string;
  fileType?: string;
  uploadDate?: string;
  uploadedBy?: string;
  dataUrl?: string;
  fileContent?: string;
  downloadUrl?: string;
}

export interface DccDocument {
  id: string;
  projectId: string;
  projectName: string;
  documentNumber: string;         // شماره سند (کد منحصر به فرد DCC)
  title: string;                  // عنوان مدرک
  module: DccModule;              // بخش زیرمجموعه
  moduleLabel: string;            // نام فارسی بخش
  documentType: DccDocumentType;  // نوع مدرک
  documentTypeLabel: string;      // برچسب فارسی نوع مدرک
  discipline: string;             // دیسیپلین مهندسی (سازه، معماری، تاسیسات، سیویل، ...)
  revision: string;               // شماره ویرایش (Rev 0, Rev 1, Rev A, ...)
  documentDate: string;           // تاریخ صدور / موثر سند (شمسی)
  registrationDate: string;       // تاریخ ثبت در سیستم (شمسی)
  authorName: string;             // کارشناس / ثبت‌کننده
  authorRole?: string;            // سمت کارشناس
  contractorName?: string;        // پیمانکار
  consultantName?: string;        // دستگاه نظارت / مشاور
  employerName?: string;          // کارفرما
  status: WorkflowStatus | string;// وضعیت گردش کار
  statusLabel: string;            // برچسب فارسی وضعیت
  statusBadgeColor: string;       // استایل رنگی وضعیت
  workflowHistory: WorkflowEvent[]; // تاریخچه گردش کار
  description?: string;           // شرح و خلاصه سند
  attachments: DccAttachment[];   // ضمائم و مدارک پیوست
  tags: string[];                 // برچسب‌ها و تگ‌های جستجو
  sourceKey: string;              // کلید منبع داده در localStorage
  rawItem?: any;                  // داده خام مرجع جهت چاپ اختصاصی
  isCustomArchived?: boolean;     // آیا مستقیما در بایگانی DCC ثبت شده است؟
}

export interface DccFilterState {
  projectId: string;
  module: DccModule | 'ALL';
  documentType: DccDocumentType | 'ALL';
  status: string; // 'ALL' or specific status
  discipline: string; // 'ALL' or specific
  startDate: string;
  endDate: string;
  searchQuery: string;
  hasAttachmentOnly: boolean;
}

export interface DccKpis {
  totalCount: number;
  approvedCount: number;
  pendingCount: number;
  rejectedCount: number;
  attachmentsCount: number;
  moduleDistribution: { [key in DccModule]?: number };
}
