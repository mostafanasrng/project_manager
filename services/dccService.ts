import { DccDocument, DccModule, DccDocumentType, DccKpis, DccAttachment } from '../types/dcc';
import { WorkflowStatus, WorkflowEvent, Project } from '../types';
import { MOCK_PROJECTS } from '../constants';
import { SystemAdminService } from './systemAdminService';
import { formatShamsiDate } from '../utils/dateUtils';

const DCC_CUSTOM_KEY = 'hamyar_dcc_custom_docs';

export const DCC_MODULE_LABELS: Record<DccModule, string> = {
  ALL: 'همه بخش‌ها',
  TECHNICAL_OFFICE: 'دفتر فنی و متره',
  QUALITY_CONTROL: 'کنترل کیفیت (QC)',
  PLANNING: 'کنترل و برنامه‌ریزی',
  HSE: 'ایمنی و بهداشت (HSE)',
  EXECUTION: 'کارگاه و اجرا',
  COMMUNICATIONS: 'مکاتبات و نامه‌نگاری',
  CONTRACTS: 'قراردادها و پیمان',
  CUSTOM_ARCHIVE: 'بایگانی مهندسی DCC'
};

export const DCC_DOCTYPE_LABELS: Record<DccDocumentType, string> = {
  MINUTE: 'صورتمجلس کارگاهی',
  STATEMENT: 'صورت‌وضعیت کارکرد',
  VARIATION_ORDER: 'دستور کار / تغییر مقادیر',
  ESTIMATE: 'برآورد و فهرست بها',
  MRS: 'درخواست خرید مصالح (MRS)',
  MIV: 'حواله خروج انبار (MIV)',
  ADJUSTMENT: 'صورت‌وضعیت تعدیل',
  RFI: 'درخواست بازرسی فنی (RFI)',
  NCR: 'گزارش عدم انطباق (NCR)',
  LAB_TEST: 'شیت نتایج آزمایشگاه',
  QC_CHECKLIST: 'چک‌لیست کیفی',
  WORK_PERMIT: 'مجوز کار ایمنی (PTW)',
  INCIDENT_REPORT: 'گزارش حادثه / رویداد',
  ENVIRONMENTAL_REPORT: 'پایش زیست‌محیطی',
  HSE_PERIODIC_REPORT: 'گزارش ادواری HSE',
  HSE_PLAN: 'برنامه جامع سلامت و ایمنی',
  DAILY_REPORT: 'گزارش روزانه کارگاه',
  DELAY_LOG: 'گزارش تاخیر کارگاهی',
  DELAY_CLAIM: 'لایحه تاخیرات پیمان',
  LOSS_CLAIM: 'لایحه ادعای ضرر و زیان',
  PROGRESS_REPORT: 'گزارش پیشرفت فیزیکی',
  OFFICIAL_LETTER: 'نامه رسمی اداری',
  CONTRACT: 'موافقت‌نامه و پیمان',
  SHOP_DRAWING: 'نقشه کارگاهی (Shop Drawing)',
  AS_BUILT: 'نقشه چون‌ساخت (As-Built)',
  TRANSMITTAL: 'ترانسمیتال مهندسی',
  SUBMITTAL: 'سابمیتال تایید متریال (MAS)',
  SPECIFICATION: 'مشخصات فنی خصوصی',
  OTHER: 'سایر مدارک مهندسی'
};

const safeParse = <T>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    console.error(`Error reading ${key} from storage`, e);
    return fallback;
  }
};

export const DccService = {
  // Get all registered projects
  getProjects: (): Project[] => {
    return safeParse<Project[]>('hamyar_projects', MOCK_PROJECTS);
  },

  // Get project name by ID
  getProjectName: (projectId: string, projectsList?: Project[]): string => {
    const list = projectsList || DccService.getProjects();
    const found = list.find((p) => p.id === projectId);
    return found ? (found.title || 'پروژه عمومی') : 'پروژه عمومی';
  },

  // Helper to map workflow status to localized text and badge color
  resolveStatusInfo: (status: any): { label: string; badgeColor: string } => {
    switch (status) {
      case WorkflowStatus.APPROVED_FINAL:
      case 'APPROVED_FINAL':
      case 'APPROVED':
        return {
          label: 'تایید نهایی / مصوب',
          badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
        };
      case WorkflowStatus.APPROVED_BY_EMPLOYER:
      case 'APPROVED_BY_EMPLOYER':
        return {
          label: 'تایید کارفرما',
          badgeColor: 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border-teal-300 dark:border-teal-800'
        };
      case WorkflowStatus.APPROVED_BY_CONSULTANT:
      case 'APPROVED_BY_CONSULTANT':
        return {
          label: 'تایید دستگاه نظارت',
          badgeColor: 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border-sky-300 dark:border-sky-800'
        };
      case WorkflowStatus.APPROVED_INTERNAL:
      case 'APPROVED_INTERNAL':
        return {
          label: 'تایید داخلی پیمانکار',
          badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300 dark:border-blue-800'
        };
      case 'CONDITIONAL':
        return {
          label: 'تایید مشروط با اصلاحات',
          badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800'
        };
      case WorkflowStatus.IN_REVIEW:
      case 'IN_REVIEW':
      case 'PENDING':
      case WorkflowStatus.IN_CONSULTANT_REVIEW:
      case 'IN_CONSULTANT_REVIEW':
      case WorkflowStatus.SENT_TO_CONSULTANT:
      case 'SENT_TO_CONSULTANT':
      case WorkflowStatus.IN_EMPLOYER_REVIEW:
      case 'IN_EMPLOYER_REVIEW':
      case WorkflowStatus.SENT_TO_EMPLOYER:
      case 'SENT_TO_EMPLOYER':
        return {
          label: 'در جریان بررسی و گردش کار',
          badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800'
        };
      case WorkflowStatus.REJECTED:
      case 'REJECTED':
      case 'FAIL':
        return {
          label: 'مردود / نیاز به اصلاح',
          badgeColor: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300 dark:border-rose-800'
        };
      case WorkflowStatus.DRAFT:
      case 'DRAFT':
      default:
        return {
          label: 'پیش‌نویس اولیه',
          badgeColor: 'bg-stone-100 text-stone-700 dark:bg-slate-800 dark:text-slate-300 border-stone-300 dark:border-slate-700'
        };
    }
  },

  // Main aggregator method: pulls records across all project sub-modules
  getAllDocuments: (selectedProjectId?: string): DccDocument[] => {
    const projects = DccService.getProjects();
    const docs: DccDocument[] = [];
    const defaultDate = formatShamsiDate(new Date().toLocaleDateString('fa-IR'));

    // 1. Technical Office: Minutes (صورتمجلس کارگاهی)
    const minutes = safeParse<any[]>('hamyar_minutes', []);
    minutes.forEach((m) => {
      const pId = m.projectId || projects[0]?.id || '1';
      const statusInfo = DccService.resolveStatusInfo(m.status);
      docs.push({
        id: `minute_${m.id}`,
        projectId: pId,
        projectName: DccService.getProjectName(pId, projects),
        documentNumber: m.minuteNumber || m.number || `MIN-${m.id}`,
        title: m.subject || m.title || 'صورتمجلس کارگاهی بدون عنوان',
        module: 'TECHNICAL_OFFICE',
        moduleLabel: DCC_MODULE_LABELS.TECHNICAL_OFFICE,
        documentType: 'MINUTE',
        documentTypeLabel: DCC_DOCTYPE_LABELS.MINUTE,
        discipline: m.discipline || 'سیویل / ابنیه',
        revision: m.revision || 'Rev 0',
        documentDate: m.date || defaultDate,
        registrationDate: m.createdAt || m.date || defaultDate,
        authorName: m.creator || m.registeredBy || 'کارشناس دفتر فنی',
        contractorName: m.contractor || 'شرکت پیمانکار',
        consultantName: m.consultant || m.supervisor || 'مهندسین مشاور',
        status: m.status || WorkflowStatus.DRAFT,
        statusLabel: statusInfo.label,
        statusBadgeColor: statusInfo.badgeColor,
        workflowHistory: Array.isArray(m.workflowHistory) ? m.workflowHistory : (Array.isArray(m.history) ? m.history : []),
        description: m.description || `شامل ${Array.isArray(m.rows) ? m.rows.length : 0} ردیف احجام کارگاهی ثبت شده`,
        attachments: Array.isArray(m.attachments) ? m.attachments : [],
        tags: ['صورتمجلس', 'احجام کار', m.discipline || 'ابنیه'].filter(Boolean),
        sourceKey: 'hamyar_minutes',
        rawItem: m
      });
    });

    // 2. Technical Office: Statements (صورت‌وضعیت‌ها)
    const statements = safeParse<any[]>('hamyar_cbs_statements', []);
    const regStatements = safeParse<any[]>('hamyar_statements', []);
    [...statements, ...regStatements].forEach((s) => {
      const pId = s.projectId || projects[0]?.id || '1';
      const statusInfo = DccService.resolveStatusInfo(s.status);
      docs.push({
        id: `stmt_${s.id}`,
        projectId: pId,
        projectName: DccService.getProjectName(pId, projects),
        documentNumber: s.number ? `STMT-${s.number}` : `STMT-${s.period || s.id}`,
        title: `صورت‌وضعیت شماره ${s.number || s.period || ''} (${s.title || 'کارکرد دوره'})`,
        module: 'TECHNICAL_OFFICE',
        moduleLabel: DCC_MODULE_LABELS.TECHNICAL_OFFICE,
        documentType: 'STATEMENT',
        documentTypeLabel: DCC_DOCTYPE_LABELS.STATEMENT,
        discipline: 'امور مالی و پیمان',
        revision: s.revision || 'Rev 0',
        documentDate: s.endDate || s.issueDate || s.date || defaultDate,
        registrationDate: s.createdAt || s.startDate || defaultDate,
        authorName: s.creator || s.author || 'سرپرست دفتر فنی',
        contractorName: s.contractor || 'پیمانکار مجری',
        consultantName: s.consultant || 'دستگاه نظارت',
        status: s.status || WorkflowStatus.DRAFT,
        statusLabel: statusInfo.label,
        statusBadgeColor: statusInfo.badgeColor,
        workflowHistory: Array.isArray(s.workflowHistory) ? s.workflowHistory : (Array.isArray(s.history) ? s.history : []),
        description: `بازه کارکرد از ${s.startDate || '-'} تا ${s.endDate || '-'} | مبلغ کل: ${(s.totalAmount || s.grossAmount || 0).toLocaleString('fa-IR')} ریال`,
        attachments: Array.isArray(s.attachments) ? s.attachments : [],
        tags: ['صورت‌وضعیت', 'کارکرد مالی', 'تاییدات'].filter(Boolean),
        sourceKey: s.sourceKey || 'hamyar_cbs_statements',
        rawItem: s
      });
    });

    // 3. Technical Office: Variations (دستور کارها و تغییر مقادیر)
    const variations = safeParse<any[]>('hamyar_variations', []);
    variations.forEach((v) => {
      const pId = v.projectId || projects[0]?.id || '1';
      const statusInfo = DccService.resolveStatusInfo(v.status);
      docs.push({
        id: `var_${v.id}`,
        projectId: pId,
        projectName: DccService.getProjectName(pId, projects),
        documentNumber: v.orderNumber || `VO-${v.id}`,
        title: v.title || v.subject || 'دستور تغییر کار و الحاقیه مقادیر',
        module: 'TECHNICAL_OFFICE',
        moduleLabel: DCC_MODULE_LABELS.TECHNICAL_OFFICE,
        documentType: 'VARIATION_ORDER',
        documentTypeLabel: DCC_DOCTYPE_LABELS.VARIATION_ORDER,
        discipline: v.discipline || 'دفتر فنی',
        revision: v.revision || 'Rev 0',
        documentDate: v.date || v.issueDate || defaultDate,
        registrationDate: v.createdAt || defaultDate,
        authorName: v.issuedBy || 'مهندس ناظر / مشاور',
        contractorName: v.contractor || 'پیمانکار',
        consultantName: v.consultant || 'دستگاه نظارت',
        status: v.status || WorkflowStatus.DRAFT,
        statusLabel: statusInfo.label,
        statusBadgeColor: statusInfo.badgeColor,
        workflowHistory: Array.isArray(v.workflowHistory) ? v.workflowHistory : (Array.isArray(v.history) ? v.history : []),
        description: v.description || 'تغییرات ابلاغی مقادیر منضم به پیمان و دستور کارهای جدید',
        attachments: Array.isArray(v.attachments) ? v.attachments : [],
        tags: ['تغییر مقادیر', 'دستور کار', 'الحاقیه'].filter(Boolean),
        sourceKey: 'hamyar_variations',
        rawItem: v
      });
    });

    // 4. Quality Control: RFIs (درخواست‌های بازرسی کارگاهی)
    const inspections = safeParse<any[]>('hamyar_qc_inspections', []);
    inspections.forEach((insp) => {
      const pId = insp.projectId || projects[0]?.id || '1';
      const statusInfo = DccService.resolveStatusInfo(insp.status);
      docs.push({
        id: `rfi_${insp.id}`,
        projectId: pId,
        projectName: DccService.getProjectName(pId, projects),
        documentNumber: insp.rfiNumber || `RFI-${insp.id}`,
        title: `درخواست بازرسی فنی: ${insp.activityTitle || insp.title || insp.discipline}`,
        module: 'QUALITY_CONTROL',
        moduleLabel: DCC_MODULE_LABELS.QUALITY_CONTROL,
        documentType: 'RFI',
        documentTypeLabel: DCC_DOCTYPE_LABELS.RFI,
        discipline: insp.discipline || 'کنترل کیفیت',
        revision: insp.revision || 'Rev 0',
        documentDate: insp.inspectionDate || insp.requestDate || defaultDate,
        registrationDate: insp.requestDate || defaultDate,
        authorName: insp.inspector || insp.requestedBy || 'کارشناس کنترل کیفیت پیمانکار',
        contractorName: insp.contractor || 'پیمانکار',
        consultantName: insp.inspector || 'دستگاه نظارت مقیم',
        status: insp.status || WorkflowStatus.DRAFT,
        statusLabel: statusInfo.label,
        statusBadgeColor: statusInfo.badgeColor,
        workflowHistory: Array.isArray(insp.workflowHistory) ? insp.workflowHistory : (Array.isArray(insp.history) ? insp.history : []),
        description: `موقعیت و زون: ${insp.location || 'کارگاه اصلی'} | شرح: ${insp.description || ''}`,
        attachments: Array.isArray(insp.attachments) ? insp.attachments : [],
        tags: ['RFI', 'بازرسی فنی', insp.discipline].filter(Boolean),
        sourceKey: 'hamyar_qc_inspections',
        rawItem: insp
      });
    });

    // 5. Quality Control: NCRs (گزارش‌های عدم انطباق)
    const ncrs = safeParse<any[]>('hamyar_qc_ncrs', []);
    ncrs.forEach((ncr) => {
      const pId = ncr.projectId || projects[0]?.id || '1';
      const statusInfo = DccService.resolveStatusInfo(ncr.status);
      docs.push({
        id: `ncr_${ncr.id}`,
        projectId: pId,
        projectName: DccService.getProjectName(pId, projects),
        documentNumber: ncr.ncrNumber || `NCR-${ncr.id}`,
        title: `گزارش عدم انطباق کیفی: ${ncr.subject || ncr.title || ncr.discipline}`,
        module: 'QUALITY_CONTROL',
        moduleLabel: DCC_MODULE_LABELS.QUALITY_CONTROL,
        documentType: 'NCR',
        documentTypeLabel: DCC_DOCTYPE_LABELS.NCR,
        discipline: ncr.discipline || 'کنترل کیفیت',
        revision: ncr.revision || 'Rev 0',
        documentDate: ncr.issueDate || defaultDate,
        registrationDate: ncr.issueDate || defaultDate,
        authorName: ncr.issuedBy || 'دستگاه نظارت مقیم',
        contractorName: ncr.contractor || 'پیمانکار',
        consultantName: ncr.issuedBy || 'دستگاه نظارت',
        status: ncr.status || WorkflowStatus.DRAFT,
        statusLabel: statusInfo.label,
        statusBadgeColor: statusInfo.badgeColor,
        workflowHistory: Array.isArray(ncr.workflowHistory) ? ncr.workflowHistory : (Array.isArray(ncr.history) ? ncr.history : []),
        description: `شدت: ${ncr.severity || 'متوسط'} | مهلت رفع نقص: ${ncr.deadlineDate || '-'} | شرح: ${ncr.description || ''}`,
        attachments: Array.isArray(ncr.attachments) ? ncr.attachments : [],
        tags: ['NCR', 'عدم انطباق', ncr.severity, ncr.discipline].filter(Boolean),
        sourceKey: 'hamyar_qc_ncrs',
        rawItem: ncr
      });
    });

    // 6. Quality Control: Lab Tests (شیت‌های نتایج آزمایشگاه)
    const labTests = safeParse<any[]>('hamyar_qc_lab_tests', []);
    labTests.forEach((lab) => {
      const pId = lab.projectId || projects[0]?.id || '1';
      const statusInfo = DccService.resolveStatusInfo(lab.result === 'PASS' ? 'APPROVED' : lab.result === 'FAIL' ? 'REJECTED' : 'PENDING');
      docs.push({
        id: `lab_${lab.id}`,
        projectId: pId,
        projectName: DccService.getProjectName(pId, projects),
        documentNumber: lab.testNumber || `LAB-${lab.id}`,
        title: `شیت آزمایشگاه: ${lab.sampleDescription || lab.testType || 'تست مقاومت'}`,
        module: 'QUALITY_CONTROL',
        moduleLabel: DCC_MODULE_LABELS.QUALITY_CONTROL,
        documentType: 'LAB_TEST',
        documentTypeLabel: DCC_DOCTYPE_LABELS.LAB_TEST,
        discipline: lab.testType || 'مقاومت مصالح و ژئوتکنیک',
        revision: 'Rev 0',
        documentDate: lab.testDate || lab.samplingDate || defaultDate,
        registrationDate: lab.samplingDate || defaultDate,
        authorName: lab.labName || 'آزمایشگاه مکانیک خاک و بتن',
        contractorName: lab.contractor || 'پیمانکار',
        consultantName: lab.inspector || 'مهندس ناظر',
        status: lab.result === 'PASS' ? 'APPROVED_FINAL' : lab.result === 'FAIL' ? 'REJECTED' : 'IN_REVIEW',
        statusLabel: statusInfo.label,
        statusBadgeColor: statusInfo.badgeColor,
        workflowHistory: Array.isArray(lab.workflowHistory) ? lab.workflowHistory : (Array.isArray(lab.history) ? lab.history : []),
        description: `پارت نمونه‌برداری: ${lab.batchNumber || '-'} | نتیجه آزمون: ${lab.result === 'PASS' ? 'قبول (مورد تایید)' : 'مردود'}`,
        attachments: Array.isArray(lab.attachments) ? lab.attachments : [],
        tags: ['آزمایشگاه', lab.testType, lab.result].filter(Boolean),
        sourceKey: 'hamyar_qc_lab_tests',
        rawItem: lab
      });
    });

    // 7. HSE: Work Permits (پرمیت‌های ایمنی PTW)
    const workPermits = safeParse<any[]>('hamyar_hse_work_permits', []);
    workPermits.forEach((ptw) => {
      const pId = ptw.projectId || projects[0]?.id || '1';
      const statusInfo = DccService.resolveStatusInfo(ptw.status);
      docs.push({
        id: `ptw_${ptw.id}`,
        projectId: pId,
        projectName: DccService.getProjectName(pId, projects),
        documentNumber: ptw.permitNumber || `PTW-${ptw.id}`,
        title: `مجوز کار ایمنی: ${ptw.permitTypeLabel || ptw.permitType || 'پرمیت کارگاه'}`,
        module: 'HSE',
        moduleLabel: DCC_MODULE_LABELS.HSE,
        documentType: 'WORK_PERMIT',
        documentTypeLabel: DCC_DOCTYPE_LABELS.WORK_PERMIT,
        discipline: 'ایمنی و حفاظت فنی',
        revision: 'Rev 0',
        documentDate: ptw.permitDate || defaultDate,
        registrationDate: ptw.permitDate || defaultDate,
        authorName: ptw.safetyOfficer || ptw.contractorDcc || 'افسر ایمنی کارگاه',
        contractorName: ptw.contractor || 'پیمانکار',
        consultantName: ptw.supervisorConsultant || 'ناظر HSE مشاور',
        status: ptw.status || WorkflowStatus.DRAFT,
        statusLabel: statusInfo.label,
        statusBadgeColor: statusInfo.badgeColor,
        workflowHistory: Array.isArray(ptw.workflowHistory) ? ptw.workflowHistory : (Array.isArray(ptw.history) ? ptw.history : []),
        description: `بازه اعتبار: ${ptw.startTime || ''} تا ${ptw.endTime || ''} | ریسک: ${ptw.riskLevel || 'متوسط'} | محدوده: ${ptw.location || ''}`,
        attachments: Array.isArray(ptw.attachments) ? ptw.attachments : [],
        tags: ['HSE', 'پرمیت کار', ptw.permitType].filter(Boolean),
        sourceKey: 'hamyar_hse_work_permits',
        rawItem: ptw
      });
    });

    // 8. HSE: Incident Reports (گزارش حوادث)
    const incidents = safeParse<any[]>('hamyar_hse_incidents', []);
    incidents.forEach((inc) => {
      const pId = inc.projectId || projects[0]?.id || '1';
      const statusInfo = DccService.resolveStatusInfo(inc.status);
      docs.push({
        id: `inc_${inc.id}`,
        projectId: pId,
        projectName: DccService.getProjectName(pId, projects),
        documentNumber: inc.incidentNumber || `INC-${inc.id}`,
        title: `گزارش حادثه / رویداد: ${inc.title || inc.incidentType}`,
        module: 'HSE',
        moduleLabel: DCC_MODULE_LABELS.HSE,
        documentType: 'INCIDENT_REPORT',
        documentTypeLabel: DCC_DOCTYPE_LABELS.INCIDENT_REPORT,
        discipline: 'ایمنی و مدیریت بحران',
        revision: 'Rev 0',
        documentDate: inc.incidentDate || defaultDate,
        registrationDate: inc.incidentDate || defaultDate,
        authorName: inc.reportedBy || 'کارشناس HSE',
        contractorName: inc.contractor || 'پیمانکار',
        consultantName: inc.consultant || 'مشاور HSE',
        status: inc.status || WorkflowStatus.DRAFT,
        statusLabel: statusInfo.label,
        statusBadgeColor: statusInfo.badgeColor,
        workflowHistory: Array.isArray(inc.workflowHistory) ? inc.workflowHistory : (Array.isArray(inc.history) ? inc.history : []),
        description: `مکان حادثه: ${inc.location || ''} | شدت: ${inc.severity || ''} | اقدامات اصلاحی CAPA ثبت شده`,
        attachments: Array.isArray(inc.attachments) ? inc.attachments : [],
        tags: ['HSE', 'حادثه', inc.severity].filter(Boolean),
        sourceKey: 'hamyar_hse_incidents',
        rawItem: inc
      });
    });

    // 9. HSE: Environmental Reports
    const envReports = safeParse<any[]>('hamyar_hse_environmental', []);
    envReports.forEach((env) => {
      const pId = env.projectId || projects[0]?.id || '1';
      const statusInfo = DccService.resolveStatusInfo(env.status);
      docs.push({
        id: `env_${env.id}`,
        projectId: pId,
        projectName: DccService.getProjectName(pId, projects),
        documentNumber: env.reportNumber || `ENV-${env.id}`,
        title: `پایش زیست‌محیطی: ${env.title || 'بازرسی دوره‌ای محیط‌زیست'}`,
        module: 'HSE',
        moduleLabel: DCC_MODULE_LABELS.HSE,
        documentType: 'ENVIRONMENTAL_REPORT',
        documentTypeLabel: DCC_DOCTYPE_LABELS.ENVIRONMENTAL_REPORT,
        discipline: 'محیط زیست کارگاه',
        revision: 'Rev 0',
        documentDate: env.reportDate || defaultDate,
        registrationDate: env.reportDate || defaultDate,
        authorName: env.inspector || 'کارشناس محیط زیست',
        contractorName: env.contractor || 'پیمانکار',
        consultantName: env.consultant || 'مشاور',
        status: env.status || WorkflowStatus.DRAFT,
        statusLabel: statusInfo.label,
        statusBadgeColor: statusInfo.badgeColor,
        workflowHistory: Array.isArray(env.workflowHistory) ? env.workflowHistory : (Array.isArray(env.history) ? env.history : []),
        description: `وضعیت انطباق جنبه‌های محیط‌زیستی در کارگاه و اکیپ‌ها`,
        attachments: Array.isArray(env.attachments) ? env.attachments : [],
        tags: ['محیط زیست', 'پایش', 'HSE'].filter(Boolean),
        sourceKey: 'hamyar_hse_environmental',
        rawItem: env
      });
    });

    // 10. HSE: Periodic Reports
    const hseReports = safeParse<any[]>('hamyar_hse_periodic_reports', []);
    hseReports.forEach((rep) => {
      const pId = rep.projectId || projects[0]?.id || '1';
      const statusInfo = DccService.resolveStatusInfo(rep.status);
      docs.push({
        id: `hse_rep_${rep.id}`,
        projectId: pId,
        projectName: DccService.getProjectName(pId, projects),
        documentNumber: rep.reportNumber || `HSE-REP-${rep.id}`,
        title: `گزارش ادواری جامع HSE: ${rep.title || 'دوره ماهیانه/هفتگی'}`,
        module: 'HSE',
        moduleLabel: DCC_MODULE_LABELS.HSE,
        documentType: 'HSE_PERIODIC_REPORT',
        documentTypeLabel: DCC_DOCTYPE_LABELS.HSE_PERIODIC_REPORT,
        discipline: 'مدیریت ایمنی و سلامت',
        revision: 'Rev 0',
        documentDate: rep.periodEnd || rep.reportDate || defaultDate,
        registrationDate: rep.reportDate || defaultDate,
        authorName: rep.preparedBy || 'مدیر HSE کارگاه',
        contractorName: rep.contractor || 'پیمانکار',
        consultantName: rep.consultant || 'دستگاه نظارت',
        status: rep.status || WorkflowStatus.DRAFT,
        statusLabel: statusInfo.label,
        statusBadgeColor: statusInfo.badgeColor,
        workflowHistory: Array.isArray(rep.workflowHistory) ? rep.workflowHistory : (Array.isArray(rep.history) ? rep.history : []),
        description: `آمار نفر-ساعت کارکرد بدون حادثه: ${(rep.safeManHours || 0).toLocaleString('fa-IR')} ساعت`,
        attachments: Array.isArray(rep.attachments) ? rep.attachments : [],
        tags: ['HSE', 'گزارش ادواری', 'شاخص‌های ایمنی'].filter(Boolean),
        sourceKey: 'hamyar_hse_periodic_reports',
        rawItem: rep
      });
    });

    // 11. HSE: HSE Plan
    const hsePlans = safeParse<any[]>('hamyar_hse_plans', []);
    hsePlans.forEach((plan) => {
      const pId = plan.projectId || projects[0]?.id || '1';
      const statusInfo = DccService.resolveStatusInfo(plan.status);
      docs.push({
        id: `hse_plan_${plan.id}`,
        projectId: pId,
        projectName: DccService.getProjectName(pId, projects),
        documentNumber: plan.planNumber || `HSE-PLAN-${plan.id}`,
        title: plan.title || 'برنامه جامع سلامت، ایمنی و محیط زیست (HSE Plan)',
        module: 'HSE',
        moduleLabel: DCC_MODULE_LABELS.HSE,
        documentType: 'HSE_PLAN',
        documentTypeLabel: DCC_DOCTYPE_LABELS.HSE_PLAN,
        discipline: 'طرح ایمنی و بهداشت',
        revision: plan.revision || 'Rev 0',
        documentDate: plan.revisionDate || defaultDate,
        registrationDate: plan.revisionDate || defaultDate,
        authorName: plan.author || 'سرپرست ایمنی',
        contractorName: plan.contractor || 'پیمانکار',
        consultantName: plan.consultant || 'مشاور',
        status: plan.status || WorkflowStatus.DRAFT,
        statusLabel: statusInfo.label,
        statusBadgeColor: statusInfo.badgeColor,
        workflowHistory: Array.isArray(plan.workflowHistory) ? plan.workflowHistory : (Array.isArray(plan.history) ? plan.history : []),
        description: `شامل اهداف کیفی، خط‌مشی ایمنی، ماتریس شناسایی خطرات و کنترل ریسک‌ها`,
        attachments: Array.isArray(plan.attachments) ? plan.attachments : [],
        tags: ['HSE Plan', 'برنامه ایمنی', 'خط‌مشی'].filter(Boolean),
        sourceKey: 'hamyar_hse_plans',
        rawItem: plan
      });
    });

    // 12. Planning: Delay Claims (لوایح تاخیرات ۵۰۹۰)
    const delayClaims = safeParse<any[]>('hamyar_delay_claims', []);
    delayClaims.forEach((dc) => {
      const pId = dc.projectId || projects[0]?.id || '1';
      const statusInfo = DccService.resolveStatusInfo(dc.status);
      docs.push({
        id: `dc_${dc.id}`,
        projectId: pId,
        projectName: DccService.getProjectName(pId, projects),
        documentNumber: dc.claimNumber || `CLAIM-DEL-${dc.id}`,
        title: dc.claimTitle || `لایحه تاخیرات دوره ${dc.periodTitle || ''}`,
        module: 'PLANNING',
        moduleLabel: DCC_MODULE_LABELS.PLANNING,
        documentType: 'DELAY_CLAIM',
        documentTypeLabel: DCC_DOCTYPE_LABELS.DELAY_CLAIM,
        discipline: 'برنامه‌ریزی و امور قراردادها',
        revision: dc.revision || 'Rev 0',
        documentDate: dc.claimDate || defaultDate,
        registrationDate: dc.claimDate || defaultDate,
        authorName: dc.preparedBy || 'کارشناس برنامه‌ریزی و ادعا',
        contractorName: dc.contractor || 'پیمانکار',
        consultantName: dc.consultant || 'دستگاه نظارت',
        status: dc.status || WorkflowStatus.DRAFT,
        statusLabel: statusInfo.label,
        statusBadgeColor: statusInfo.badgeColor,
        workflowHistory: Array.isArray(dc.workflowHistory) ? dc.workflowHistory : (Array.isArray(dc.history) ? dc.history : []),
        description: `میزان تاخیر مجاز درخواستی: ${dc.requestedExtensionDays || 0} روز تقویمی بر مبنای بخشنامه ۵۰۹۰`,
        attachments: Array.isArray(dc.attachments) ? dc.attachments : [],
        tags: ['لایحه تاخیرات', 'بخشنامه ۵۰۹۰', 'ادعا', 'تمدید پیمان'].filter(Boolean),
        sourceKey: 'hamyar_delay_claims',
        rawItem: dc
      });
    });

    // 13. Planning: Loss Claims (لوایح ضرر و زیان)
    const lossClaims = safeParse<any[]>('hamyar_loss_claims', []);
    lossClaims.forEach((lc) => {
      const pId = lc.projectId || projects[0]?.id || '1';
      const statusInfo = DccService.resolveStatusInfo(lc.status);
      docs.push({
        id: `lc_${lc.id}`,
        projectId: pId,
        projectName: DccService.getProjectName(pId, projects),
        documentNumber: lc.claimNumber || `CLAIM-LOSS-${lc.id}`,
        title: lc.claimTitle || `لایحه ادعای ضرر و زیان دوره ${lc.periodTitle || ''}`,
        module: 'PLANNING',
        moduleLabel: DCC_MODULE_LABELS.PLANNING,
        documentType: 'LOSS_CLAIM',
        documentTypeLabel: DCC_DOCTYPE_LABELS.LOSS_CLAIM,
        discipline: 'امور حقوقی و مالی پیمان',
        revision: lc.revision || 'Rev 0',
        documentDate: lc.claimDate || defaultDate,
        registrationDate: lc.claimDate || defaultDate,
        authorName: lc.preparedBy || 'کارشناس ادعا و امور قراردادها',
        contractorName: lc.contractor || 'پیمانکار',
        consultantName: lc.consultant || 'مشاور',
        status: lc.status || WorkflowStatus.DRAFT,
        statusLabel: statusInfo.label,
        statusBadgeColor: statusInfo.badgeColor,
        workflowHistory: Array.isArray(lc.workflowHistory) ? lc.workflowHistory : (Array.isArray(lc.history) ? lc.history : []),
        description: `مبلغ خسارت مطالبه شده: ${(lc.totalClaimAmount || 0).toLocaleString('fa-IR')} ریال`,
        attachments: Array.isArray(lc.attachments) ? lc.attachments : [],
        tags: ['ضرر و زیان', 'ادعا', 'خسارت تعلیق'].filter(Boolean),
        sourceKey: 'hamyar_loss_claims',
        rawItem: lc
      });
    });

    // 14. Planning: Progress Reports
    const progReports = safeParse<any[]>('hamyar_planning_reports', []);
    progReports.forEach((pr) => {
      const pId = pr.projectId || projects[0]?.id || '1';
      const statusInfo = DccService.resolveStatusInfo(pr.status);
      docs.push({
        id: `pr_${pr.id}`,
        projectId: pId,
        projectName: DccService.getProjectName(pId, projects),
        documentNumber: pr.reportNumber || `PROG-${pr.id}`,
        title: pr.title || `گزارش پیشرفت فیزیکی دوره ${pr.periodTitle || ''}`,
        module: 'PLANNING',
        moduleLabel: DCC_MODULE_LABELS.PLANNING,
        documentType: 'PROGRESS_REPORT',
        documentTypeLabel: DCC_DOCTYPE_LABELS.PROGRESS_REPORT,
        discipline: 'کنترل پروژه و EVM',
        revision: 'Rev 0',
        documentDate: pr.reportDate || defaultDate,
        registrationDate: pr.reportDate || defaultDate,
        authorName: pr.reporter || 'مدیر برنامه‌ریزی و کنترل پروژه',
        contractorName: pr.contractor || 'پیمانکار',
        consultantName: pr.consultant || 'دستگاه نظارت',
        status: pr.status || WorkflowStatus.DRAFT,
        statusLabel: statusInfo.label,
        statusBadgeColor: statusInfo.badgeColor,
        workflowHistory: Array.isArray(pr.workflowHistory) ? pr.workflowHistory : (Array.isArray(pr.history) ? pr.history : []),
        description: `پیشرفت واقعی: ${pr.actualProgress || 0}% | پیشرفت برنامه‌ای: ${pr.plannedProgress || 0}%`,
        attachments: Array.isArray(pr.attachments) ? pr.attachments : [],
        tags: ['پیشرفت فیزیکی', 'EVM', 'برنامه‌ریزی'].filter(Boolean),
        sourceKey: 'hamyar_planning_reports',
        rawItem: pr
      });
    });

    // 15. Execution: Daily Reports (گزارش‌های روزانه کارگاه)
    const dailyReports = safeParse<any[]>('hamyar_daily_reports', []);
    dailyReports.forEach((dr) => {
      const pId = dr.projectId || projects[0]?.id || '1';
      const statusInfo = DccService.resolveStatusInfo(dr.status);
      docs.push({
        id: `daily_${dr.id}`,
        projectId: pId,
        projectName: DccService.getProjectName(pId, projects),
        documentNumber: dr.reportNumber ? `DAILY-${dr.reportNumber}` : `DAILY-${dr.id}`,
        title: `گزارش روزانه کارگاه مورخ ${dr.date || ''}`,
        module: 'EXECUTION',
        moduleLabel: DCC_MODULE_LABELS.EXECUTION,
        documentType: 'DAILY_REPORT',
        documentTypeLabel: DCC_DOCTYPE_LABELS.DAILY_REPORT,
        discipline: 'اجرا و عملیات کارگاهی',
        revision: 'Rev 0',
        documentDate: dr.date || defaultDate,
        registrationDate: dr.createdAt || dr.date || defaultDate,
        authorName: dr.reporter || dr.author || 'سرپرست کارگاه',
        contractorName: dr.contractor || 'شرکت پیمانکار',
        consultantName: dr.consultant || 'ناظر مقیم',
        status: dr.status || WorkflowStatus.DRAFT,
        statusLabel: statusInfo.label,
        statusBadgeColor: statusInfo.badgeColor,
        workflowHistory: Array.isArray(dr.workflowHistory) ? dr.workflowHistory : (Array.isArray(dr.history) ? dr.history : []),
        description: `وضعیت جوی: ${dr.weather || 'آفتابی'} | نفرات: ${dr.totalWorkers || 0} نفر | احجام اجرا شده و موانع کاری`,
        attachments: Array.isArray(dr.attachments) ? dr.attachments : [],
        tags: ['گزارش روزانه', 'اجرا', 'کارگاه'].filter(Boolean),
        sourceKey: 'hamyar_daily_reports',
        rawItem: dr
      });
    });

    // 16. Communications: Official Letters (نامه‌های رسمی)
    const letters = safeParse<any[]>('hamyar_official_letters', []);
    letters.forEach((letItem) => {
      const pId = letItem.projectId || projects[0]?.id || '1';
      const statusInfo = DccService.resolveStatusInfo(letItem.status);
      docs.push({
        id: `let_${letItem.id}`,
        projectId: pId,
        projectName: DccService.getProjectName(pId, projects),
        documentNumber: letItem.letterNumber || `LET-${letItem.id}`,
        title: letItem.subject || 'نامه اداری بدون موضوع',
        module: 'COMMUNICATIONS',
        moduleLabel: DCC_MODULE_LABELS.COMMUNICATIONS,
        documentType: 'OFFICIAL_LETTER',
        documentTypeLabel: DCC_DOCTYPE_LABELS.OFFICIAL_LETTER,
        discipline: 'مکاتبات اداری و حقوقی',
        revision: 'Rev 0',
        documentDate: letItem.date || defaultDate,
        registrationDate: letItem.createdAt || letItem.date || defaultDate,
        authorName: letItem.sender || 'دبیرخانه پروژه',
        contractorName: letItem.contractor || 'پیمانکار',
        consultantName: letItem.receiver || 'گیرنده نامه',
        status: letItem.status || WorkflowStatus.DRAFT,
        statusLabel: statusInfo.label,
        statusBadgeColor: statusInfo.badgeColor,
        workflowHistory: Array.isArray(letItem.workflowHistory) ? letItem.workflowHistory : (Array.isArray(letItem.history) ? letItem.history : []),
        description: `فرستنده: ${letItem.sender || '-'} | گیرنده: ${letItem.receiver || '-'} | شرح: ${letItem.summary || ''}`,
        attachments: Array.isArray(letItem.attachments) ? letItem.attachments : [],
        tags: ['مکاتبات', 'نامه رسمی', letItem.classification || 'عادی'].filter(Boolean),
        sourceKey: 'hamyar_official_letters',
        rawItem: letItem
      });
    });

    // 17. Contracts & Projects: Main Contracts (قراردادها و الحاقیه‌ها)
    projects.forEach((proj) => {
      const pId = proj.id;
      docs.push({
        id: `proj_contract_${proj.id}`,
        projectId: pId,
        projectName: proj.title || 'پروژه پیمان',
        documentNumber: proj.contractNumber || `CTR-${proj.id}`,
        title: `موافقت‌نامه و پیمان اصلی: ${proj.title}`,
        module: 'CONTRACTS',
        moduleLabel: DCC_MODULE_LABELS.CONTRACTS,
        documentType: 'CONTRACT',
        documentTypeLabel: DCC_DOCTYPE_LABELS.CONTRACT,
        discipline: 'حقوقی و پیمان',
        revision: 'Rev 0',
        documentDate: proj.startDate || defaultDate,
        registrationDate: proj.startDate || defaultDate,
        authorName: proj.employerName || 'کارفرما',
        contractorName: proj.contractorName || 'پیمانکار اصلی',
        consultantName: proj.consultantName || 'مهندسین مشاور',
        status: 'APPROVED_FINAL',
        statusLabel: 'ابلاغ شده و معتبر',
        statusBadgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
        workflowHistory: [
          {
            id: `ev_${proj.id}`,
            action: 'FINAL_APPROVE',
            fromStatus: WorkflowStatus.DRAFT,
            toStatus: WorkflowStatus.APPROVED_FINAL,
            actorUserId: 'admin',
            actorName: proj.employerName || 'کارفرما',
            timestamp: Date.now(),
            comment: 'انعقاد قرارداد و ابلاغ شروع عملیات پیمان'
          }
        ],
        description: `مبلغ اولیه پیمان: ${(proj.initialBudget || 0).toLocaleString('fa-IR')} ریال`,
        attachments: [],
        tags: ['قرارداد', 'موافقت‌نامه', 'پیمان اصلی'].filter(Boolean),
        sourceKey: 'hamyar_projects',
        rawItem: proj
      });
    });

    // 18. Custom DCC Direct Archive Documents
    const customDocs = safeParse<DccDocument[]>(DCC_CUSTOM_KEY, []);
    customDocs.forEach((cd) => {
      const pId = cd.projectId || projects[0]?.id || '1';
      const statusInfo = DccService.resolveStatusInfo(cd.status);
      docs.push({
        ...cd,
        projectId: pId,
        projectName: DccService.getProjectName(pId, projects),
        statusLabel: statusInfo.label,
        statusBadgeColor: statusInfo.badgeColor,
        isCustomArchived: true,
        sourceKey: DCC_CUSTOM_KEY
      });
    });

    // If specific project requested
    let result = docs;
    if (selectedProjectId && selectedProjectId !== 'ALL') {
      result = result.filter((d) => d.projectId === selectedProjectId);
    }

    // Sort chronologically (newest first)
    return result.sort((a, b) => (b.documentDate || '').localeCompare(a.documentDate || ''));
  },

  // Save new engineering document directly into DCC archive
  saveCustomDocument: (data: Partial<DccDocument>): DccDocument => {
    const list = safeParse<DccDocument[]>(DCC_CUSTOM_KEY, []);
    const today = formatShamsiDate(new Date().toLocaleDateString('fa-IR'));
    const currentUser = SystemAdminService.getCurrentUser();
    const authorName = currentUser?.fullName || currentUser?.username || 'کارشناس DCC';
    const statusInfo = DccService.resolveStatusInfo(data.status || WorkflowStatus.DRAFT);

    const initialHistory: WorkflowEvent[] = [
      {
        id: `ev_${Date.now()}`,
        action: 'CREATE',
        fromStatus: WorkflowStatus.DRAFT,
        toStatus: (data.status as WorkflowStatus) || WorkflowStatus.DRAFT,
        actorUserId: currentUser?.id || 'dcc_user',
        actorName: authorName,
        timestamp: Date.now(),
        comment: 'ثبت و بایگانی اولیه سند در مرکز اسناد و مدارک مهندسی (DCC)'
      }
    ];

    const newDoc: DccDocument = {
      id: data.id || `dcc_${Date.now()}`,
      projectId: data.projectId || '1',
      projectName: DccService.getProjectName(data.projectId || '1'),
      documentNumber: data.documentNumber || `DCC-${Date.now().toString().slice(-5)}`,
      title: data.title || 'سند فنی بدون عنوان',
      module: data.module || 'CUSTOM_ARCHIVE',
      moduleLabel: DCC_MODULE_LABELS[data.module || 'CUSTOM_ARCHIVE'],
      documentType: data.documentType || 'OTHER',
      documentTypeLabel: DCC_DOCTYPE_LABELS[data.documentType || 'OTHER'],
      discipline: data.discipline || 'عمومی و مشترک',
      revision: data.revision || 'Rev 0',
      documentDate: data.documentDate || today,
      registrationDate: today,
      authorName,
      authorRole: currentUser?.jobTitle || 'کارشناس کنترل مدارک',
      contractorName: data.contractorName || 'شرکت مجری',
      consultantName: data.consultantName || 'دستگاه نظارت',
      employerName: data.employerName || 'کارفرما',
      status: data.status || WorkflowStatus.DRAFT,
      statusLabel: statusInfo.label,
      statusBadgeColor: statusInfo.badgeColor,
      workflowHistory: data.workflowHistory || initialHistory,
      description: data.description || '',
      attachments: data.attachments || [],
      tags: data.tags || ['بایگانی DCC'],
      sourceKey: DCC_CUSTOM_KEY,
      isCustomArchived: true
    };

    const existingIdx = list.findIndex((d) => d.id === newDoc.id);
    if (existingIdx >= 0) {
      list[existingIdx] = newDoc;
    } else {
      list.unshift(newDoc);
    }

    localStorage.setItem(DCC_CUSTOM_KEY, JSON.stringify(list));

    // Log to system audit trail
    SystemAdminService.addAuditLog({
      user: authorName,
      action: 'DCC_REGISTER_DOCUMENT',
      details: `ثبت سند مهندسی شماره ${newDoc.documentNumber} (${newDoc.title}) در بایگانی DCC`,
      source: `مرکز کنترل مدارک DCC - ${newDoc.projectName}`,
      sourceType: 'DCC'
    });

    window.dispatchEvent(new CustomEvent('dcc-documents-updated'));
    return newDoc;
  },

  // Delete document if it was custom-archived in DCC
  deleteCustomDocument: (id: string): boolean => {
    const list = safeParse<DccDocument[]>(DCC_CUSTOM_KEY, []);
    const filtered = list.filter((d) => d.id !== id);
    localStorage.setItem(DCC_CUSTOM_KEY, JSON.stringify(filtered));
    window.dispatchEvent(new CustomEvent('dcc-documents-updated'));
    return true;
  },

  // Calculate high-level DCC KPIs
  getKpis: (docs: DccDocument[]): DccKpis => {
    let approvedCount = 0;
    let pendingCount = 0;
    let rejectedCount = 0;
    let attachmentsCount = 0;
    const moduleDistribution: { [key in DccModule]?: number } = {};

    docs.forEach((d) => {
      const st = String(d.status).toUpperCase();
      if (st.includes('APPROV') || st === 'PASS') {
        approvedCount++;
      } else if (st.includes('REJECT') || st.includes('FAIL')) {
        rejectedCount++;
      } else {
        pendingCount++;
      }

      if (d.attachments && d.attachments.length > 0) {
        attachmentsCount += d.attachments.length;
      }

      moduleDistribution[d.module] = (moduleDistribution[d.module] || 0) + 1;
    });

    return {
      totalCount: docs.length,
      approvedCount,
      pendingCount,
      rejectedCount,
      attachmentsCount,
      moduleDistribution
    };
  },

  // Export Master Document Register (MDR) to CSV/Excel
  exportMdrCsv: (docs: DccDocument[], projectName: string) => {
    const headers = [
      'ردیف',
      'پروژه',
      'کد و شماره سند (DCC Code)',
      'عنوان سند و مدرک',
      'بخش / واحد',
      'نوع مدرک',
      'دیسیپلین',
      'ویرایش (Rev)',
      'تاریخ سند',
      'تاریخ ثبت در سیستم',
      'صادرکننده / کارشناس',
      'پیمانکار',
      'دستگاه نظارت',
      'وضعیت گردش کار',
      'تعداد پیوست‌ها',
      'شرح و توضیحات'
    ];

    const rows = docs.map((d, index) => [
      index + 1,
      `"${d.projectName.replace(/"/g, '""')}"`,
      `"${d.documentNumber.replace(/"/g, '""')}"`,
      `"${d.title.replace(/"/g, '""')}"`,
      `"${d.moduleLabel.replace(/"/g, '""')}"`,
      `"${d.documentTypeLabel.replace(/"/g, '""')}"`,
      `"${d.discipline.replace(/"/g, '""')}"`,
      `"${d.revision.replace(/"/g, '""')}"`,
      `"${d.documentDate.replace(/"/g, '""')}"`,
      `"${d.registrationDate.replace(/"/g, '""')}"`,
      `"${d.authorName.replace(/"/g, '""')}"`,
      `"${(d.contractorName || '').replace(/"/g, '""')}"`,
      `"${(d.consultantName || '').replace(/"/g, '""')}"`,
      `"${d.statusLabel.replace(/"/g, '""')}"`,
      d.attachments ? d.attachments.length : 0,
      `"${(d.description || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const sanitizedName = (projectName || 'DCC_MDR').replace(/\s+/g, '_');
    link.setAttribute('download', `MDR_Register_${sanitizedName}_${formatShamsiDate(new Date().toLocaleDateString('fa-IR')).replace(/\//g, '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
