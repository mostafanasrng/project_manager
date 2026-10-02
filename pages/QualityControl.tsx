import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ClipboardCheck,
  AlertTriangle,
  FlaskConical,
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  Search,
  Filter,
  Printer,
  FileText,
  Building2,
  ShieldAlert,
  Layers,
  ChevronLeft,
  X,
  Edit3,
  Trash2,
  CheckSquare,
  Square,
  AlertCircle,
  FileCheck,
  Sparkles,
  ChevronDown,
  User,
  Calendar,
  MapPin,
  HardHat,
  History,
  ScrollText,
  ArrowLeftCircle,
  Send,
  Share2
} from 'lucide-react';
import { MOCK_PROJECTS } from '../constants';
import { Project, WorkflowStatus, WorkflowEvent, type WorkflowAction, type Notification } from '../types';
import { formatShamsiDate } from '../utils/dateUtils';
import { ShamsiDatePicker } from '../components/ShamsiDatePicker';
import { WorkflowService } from '../services/workflowService';
import { HRService } from '../services/hrService';
import { SystemAdminService } from '../services/systemAdminService';
import { NotificationService } from '../services/notificationService';
import { OrganizationType } from '../systemAdminTypes';
import DeleteModal from '../components/DeleteModal';
import { formatUserDisplayFormal } from '../src/utils/userFormatter';
import {
  QCInspection,
  QCInspectionStatus,
  QCDiscipline,
  NonConformanceReport,
  NCRSeverity,
  NCRStatus,
  QCLabTest,
  LabTestType,
  StandardQCChecklist
} from '../src/types/qc';

// Helper for local storage
const loadData = <T,>(key: string, defaultValue: T): T => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : defaultValue;
  } catch {
    return defaultValue;
  }
};

const saveData = <T,>(key: string, value: T) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Failed to save to localStorage', e);
  }
};

// Initial Mock Checklists
const DEFAULT_STANDARD_CHECKLISTS: StandardQCChecklist[] = [
  {
    id: 'std_1',
    discipline: 'CONCRETE',
    title: 'چک‌لیست بازرسی قبل از بتن‌ریزی',
    category: 'بتن و سازه',
    items: [
      'بررسی تمیزی کف قالب و زدودن گرد و خاک و نخاله‌ها',
      'بررسی روغن‌کاری مناسب سطح قالب‌ها',
      'کنترل اسلمپ بتن و دمای بتن در زمان تحویل',
      'حضور ویبراتور رزرو و سالم بودن دستگاه‌های ویبراتور',
      'بررسی پایه‌ها و جک‌های اطمینان زیر قالب',
      'آزمایش و اخذ نمونه‌های مکعبی/استوانه‌ای بتن'
    ]
  },
  {
    id: 'std_2',
    discipline: 'REBAR',
    title: 'چک‌لیست بازرسی آرماتوربندی و خاموت‌ها',
    category: 'آرماتوربندی',
    items: [
      'انطباق قطر و رده میلگردها با نقشه‌های مصوب اجرای سازه',
      'کنترل فواصل میلگردهای اصلی و خاموت‌ها در نواحی بحرانی',
      'کنترل طول اورلب (هم‌پوشانی) و طول مهار میلگردها',
      'بررسی نصب و فاصله لقمه‌ها (اسپیسرها) جهت تامین کاور بتن',
      'اطمینان از تمیز بودن میلگردها و عدم وجود زنگ‌زدگی پوسته شده یا چربی'
    ]
  },
  {
    id: 'std_3',
    discipline: 'WELDING',
    title: 'چک‌لیست بازرسی اتصالات جوشی اسکلت فلزی',
    category: 'جوشکاری و اسکلت فلزی',
    items: [
      'تایید صلاحیت و گواهینامه جوشکاران (WQR)',
      'بررسی تمیزی و پپینه‌برداری درز جوش پیش از جوشکاری',
      'کنترل بعد جوش و طول جوش مطابق نقشه‌ها',
      'بازرسی چشمی (VT) جهت عدم وجود ترک، بریدگی کنار جوش (Undercut) و ذوب ناقص',
      'انجام آزمایش‌های غیرمخرب (UT / RT / MT) بر اساس درصد مصوب'
    ]
  },
  {
    id: 'std_4',
    discipline: 'EARTHWORK',
    title: 'چک‌لیست آماده‌سازی بستر و تراکم خاک',
    category: 'خاکبرداری و زیرسازی',
    items: [
      'بررسی تراز کف گود مطابق نقشه‌های اجرایی',
      'کنترل رطوبت بهینه خاک جهت کوبش',
      'بررسی ضخامت لایه‌های خاکریزی (حداکثر ۳۰ سانتی‌متر)',
      'اخذ نمونه و آزمایش دانسیته صحرایی (تراکم حداقل ۹۵٪)',
      'کنترل پایداری دیواره‌های گودبرداری و سازه نگهبان'
    ]
  }
];

// Initial Mock Inspections
const DEFAULT_INSPECTIONS: QCInspection[] = [
  {
    id: 'insp_101',
    rfiNumber: 'RFI-1403-018',
    projectId: '2',
    title: 'بازرسی آرماتوربندی و قالب‌بندی فونداسیون بلوک A',
    discipline: 'REBAR',
    location: 'محور A1 تا C4 - تراز -3.50',
    contractor: 'شرکت مهندسی عمران تابان',
    inspector: 'مهندس رضایی (ناظر مقیم سازه)',
    requestDate: '1403/02/10',
    inspectionDate: '1403/02/11',
    status: 'APPROVED',
    description: 'تمامی میلگردها و قالب‌های فلزی بررسی شد و با مشخصات فنی مطابقت دارد.',
    createdAt: '1403/02/10',
    workflowStatus: WorkflowStatus.APPROVED_BY_CONSULTANT,
    createdById: 'u-contractor-1',
    checklists: [
      { id: 'c1', title: 'انطباق قطر میلگردها با نقشه', isMandatory: true, status: 'PASSED' },
      { id: 'c2', title: 'فاصله خاموت‌ها و سنجاقی‌ها', isMandatory: true, status: 'PASSED' },
      { id: 'c3', title: 'نصب اسپیسرهای بتنی کاور', isMandatory: true, status: 'PASSED' },
      { id: 'c4', title: 'تمیزی کف فونداسیون', isMandatory: false, status: 'PASSED' }
    ]
  },
  {
    id: 'insp_102',
    rfiNumber: 'RFI-1403-019',
    projectId: '2',
    title: 'بازرسی بتن‌ریزی ستون‌های طبقه اول',
    discipline: 'CONCRETE',
    location: 'ستون‌های C1 تا C8 - طبقه اول',
    contractor: 'شرکت مهندسی عمران تابان',
    inspector: 'مهندس رضایی (ناظر مقیم سازه)',
    requestDate: '1403/02/14',
    inspectionDate: '1403/02/15',
    status: 'CONDITIONAL',
    description: 'بتن‌ریزی با شرط اصلاح کاور ستون C4 و اضافه کردن ویبراتور بادی تایید شد.',
    correctiveNotes: 'پیمانکار موظف است قبل از شروع بتن‌ریزی ستون C4، اسپیسرهای جانبی را تقویت نماید.',
    createdAt: '1403/02/14',
    workflowStatus: WorkflowStatus.IN_REVIEW,
    createdById: 'u-contractor-1',
    checklists: [
      { id: 'c10', title: 'بررسی استحکام شاقول جک‌ها', isMandatory: true, status: 'PASSED' },
      { id: 'c11', title: 'روغن‌کاری سطح داخلی قالب', isMandatory: true, status: 'PASSED' },
      { id: 'c12', title: 'تامین کاور جانبی با اسپیسر', isMandatory: true, status: 'FAILED', remarks: 'نیاز به تعویض اسپیسر ستون C4' },
      { id: 'c13', title: 'آمادگی ویبراتورها و پرسنل', isMandatory: true, status: 'PASSED' }
    ]
  },
  {
    id: 'insp_103',
    rfiNumber: 'RFI-1403-020',
    projectId: '2',
    title: 'بازرسی جوشکاری تیرهای اصلی سقف دوم',
    discipline: 'WELDING',
    location: 'قاب‌های فلزی محور 3 - طبقه +2',
    contractor: 'پیمانکاری اسکلت فلزی البرز',
    inspector: 'مهندس احمدی (بازرس جوش)',
    requestDate: '1403/02/18',
    inspectionDate: '1403/02/19',
    status: 'REJECTED',
    description: 'وجود بریدگی کنار جوش (Undercut) شدید در اتصال تیر به ستون B2 و عدم رعایت بعد جوش.',
    correctiveNotes: 'تیر اتصال B2 باید کاملاً گراند شده و مجدداً طبق دستورالعمل WPS جوشکاری و بازرسی شود.',
    createdAt: '1403/02/18',
    workflowStatus: WorkflowStatus.REJECTED,
    createdById: 'u-contractor-1',
    checklists: [
      { id: 'c20', title: 'تایید گواهینامه جوشکار', isMandatory: true, status: 'PASSED' },
      { id: 'c21', title: 'بعد و طول جوش اتصال', isMandatory: true, status: 'FAILED' },
      { id: 'c22', title: 'عدم وجود ذوب ناقص یا سوراخ', isMandatory: true, status: 'FAILED' }
    ]
  },
  {
    id: 'insp_104',
    rfiNumber: 'RFI-1403-021',
    projectId: '1',
    title: 'بازرسی لایه‌بندی و تراکم خاکریز زیرسازی',
    discipline: 'EARTHWORK',
    location: 'کیلومتر 12+400 تا 12+800',
    contractor: 'شرکت راهسازی کوهسار',
    inspector: 'مهندس شریفی (ناظر راه)',
    requestDate: '1403/02/20',
    inspectionDate: '1403/02/21',
    status: 'PENDING',
    description: 'درخواست بازرسی تراکم لایه دوم خاکریزی پس از کوبش غلتک پاپیلی.',
    createdAt: '1403/02/20',
    workflowStatus: WorkflowStatus.DRAFT,
    createdById: 'u-contractor-1',
    checklists: [
      { id: 'c30', title: 'ضخامت لایه قبل از کوبش', isMandatory: true, status: 'PASSED' },
      { id: 'c31', title: 'رطوبت بهینه خاک', isMandatory: true, status: 'PASSED' },
      { id: 'c32', title: 'اخذ نمونه دانسیته صحرایی', isMandatory: true, status: 'PENDING' }
    ]
  }
];

// Initial Mock NCRs
const DEFAULT_NCRS: NonConformanceReport[] = [
  {
    id: 'ncr_1',
    ncrNumber: 'NCR-1403-004',
    projectId: '2',
    title: 'کرمو شدن بتن در پایه دیوار برشی محور D',
    location: 'دیوار برشی محور D - تراز تراز صفر',
    discipline: 'CONCRETE',
    severity: 'HIGH',
    issueDate: '1403/01/25',
    deadlineDate: '1403/02/05',
    issuedBy: 'دستگاه نظارت (مهندس رضایی)',
    responsibleParty: 'شرکت مهندسی عمران تابان',
    description: 'به دلیل عدم تراکم مناسب و عدم استفاده صحیح از ویبراتور، بتن در ارتفاع ۵۰ سانتی‌متری پای دیوار دچار شن‌نما شدگی و لانه زنبوری شدید شده است.',
    rootCause: 'تراکم بیش از حد میلگردها و عدم استفاده از ویبراتور با سوزن باریک.',
    correctiveAction: 'تراشیدن بتن‌های سست، شستشو با جت آب، اجرای پرایمر اپوکسی و تزریق گروت اپوکسی پرمقاومت.',
    preventiveAction: 'الزام استفاده از ویبراتور با سایز مناسب و قیف بتن‌ریزی برای ارتفاع بیش از ۱.۵ متر.',
    status: 'VERIFICATION',
    workflowStatus: WorkflowStatus.IN_REVIEW,
    createdById: 'u-contractor-1'
  },
  {
    id: 'ncr_2',
    ncrNumber: 'NCR-1403-005',
    projectId: '2',
    title: 'عدم انطباق رده مقاومت ۲۸ روزه بتن سقف اول',
    location: 'دال سقف طبقه اول - پارت دوم',
    discipline: 'CONCRETE',
    severity: 'CRITICAL',
    issueDate: '1403/02/02',
    deadlineDate: '1403/02/15',
    issuedBy: 'دستگاه نظارت عالیه',
    responsibleParty: 'کارخانه بتن آماده آریا',
    description: 'مقاومت فشاری ۲۸ روزه نمونه‌های بتن اخذ شده ۲۴.۵ مگاپاسکال بوده که از رده طراحی C30 (۳۰ مگاپاسکال) کمتر می‌باشد.',
    rootCause: 'نسبت آب به سیمان بالا در بتن تحویلی ترک‌میکسر.',
    correctiveAction: 'انجام آزمایش مغزه‌گیری (کورگیری) از دال و ارزیابی مقاومت بر اساس مبحث نهم مقررات ملی.',
    preventiveAction: 'کنترل دقیق اسلامپ در کارخانه و ممانعت از افزودن آب غیرمجاز در کارگاه.',
    status: 'CORRECTIVE_ACTION',
    workflowStatus: WorkflowStatus.DRAFT,
    createdById: 'u-contractor-1'
  },
  {
    id: 'ncr_3',
    ncrNumber: 'NCR-1403-002',
    projectId: '1',
    title: 'عدم رعایت شیب‌بندی ترانشه گودبرداری',
    location: 'دیواره غربی گودبرداری - مقطع KM 4+200',
    discipline: 'EARTHWORK',
    severity: 'MEDIUM',
    issueDate: '1402/11/10',
    deadlineDate: '1402/11/20',
    issuedBy: 'واحد ایمنی و نظارت',
    responsibleParty: 'پیمانکار خاکبرداری',
    description: 'شیب ترانشه قائم‌تر از نقشه مصوب بوده و احتمال ریزش دیواره وجود دارد.',
    rootCause: 'شتاب پیمانکار در خاکبرداری ماشینی.',
    correctiveAction: 'اصلاح شیب دیواره و ریختن خاکریز محافظ پای ترانشه.',
    preventiveAction: 'نقشه‌برداری روزانه تراز و شیب خاکبرداری.',
    status: 'CLOSED',
    closedDate: '1402/11/18',
    workflowStatus: WorkflowStatus.APPROVED_BY_CONSULTANT,
    createdById: 'u-contractor-1'
  }
];

// Initial Mock Lab Tests
const DEFAULT_LAB_TESTS: QCLabTest[] = [
  {
    id: 'lab_1',
    testNumber: 'LAB-C-1403-088',
    projectId: '2',
    testType: 'آزمایش مقاومت بتن',
    sampleLocation: 'فونداسیون محور A تا C',
    samplingDate: '1403/01/15',
    testDate: '1403/02/12',
    designSpecification: 'رده C30 (مقاومت ۲۸ روزه ۳۰ MPa)',
    resultValue: '34.8 MPa (میانگین ۳ نمونه)',
    isCompliant: true,
    complianceStatus: 'COMPLIANT',
    consultantComplianceStatus: 'COMPLIANT',
    employerComplianceStatus: 'COMPLIANT',
    labName: 'آزمایشگاه مکانیک خاک و بتن فنی و مکانیک',
    approvedBy: 'دکتر حسینی (مدیر آزمایشگاه)',
    notes: 'مقاومت ۲۸ روزه بالاتر از حد طراحی و مورد تایید است.',
    workflowStatus: WorkflowStatus.APPROVED_BY_CONSULTANT,
    createdById: 'u-contractor-1',
    workflowHistory: [
      {
        id: 'ev_l1',
        timestamp: Date.now() - 86400000,
        actorUserId: 'u-contractor-1',
        actorName: 'کاربر پیمانکار',
        fromStatus: WorkflowStatus.DRAFT,
        toStatus: WorkflowStatus.APPROVED_BY_CONSULTANT,
        action: 'FINAL_APPROVE',
        comment: 'تایید نهایی آزمایشگاه مرجع'
      }
    ]
  },
  {
    id: 'lab_2',
    testNumber: 'LAB-S-1403-042',
    projectId: '2',
    testType: 'STEEL_TENSILE',
    sampleLocation: 'محموله میلگرد ۲۵ آجدار A3 (ذوب آهن)',
    samplingDate: '1403/02/01',
    testDate: '1403/02/04',
    designSpecification: 'تنش تسلیم حداقل ۴۰۰ MPa - تنش گسیختگی ۶۰۰ MPa',
    resultValue: 'تنش تسلیم: ۴۲۰ MPa - تنش کششی: ۶۳۵ MPa',
    isCompliant: true,
    labName: 'آزمایشگاه متالورژی دانشگاه صنعتی',
    approvedBy: 'مهندس اکبری',
    notes: 'تست کشش و خم سرد ۱۸۰ درجه کاملاً منطبق بر استاندارد ملی ۳۱۳۲ است.',
    workflowStatus: WorkflowStatus.IN_REVIEW,
    createdById: 'u-contractor-1',
    workflowHistory: [
      {
        id: 'ev_l2',
        timestamp: Date.now() - 40000000,
        actorUserId: 'u-contractor-1',
        actorName: 'کاربر پیمانکار',
        fromStatus: WorkflowStatus.DRAFT,
        toStatus: WorkflowStatus.IN_REVIEW,
        action: 'SUBMIT',
        comment: 'ارسال شیت آزمایش به ناظر'
      }
    ]
  },
  {
    id: 'lab_3',
    testNumber: 'LAB-E-1403-019',
    projectId: '1',
    testType: 'SOIL_PROCTOR',
    sampleLocation: 'بستر زیرسازی زیر اساس - لایه سوم',
    samplingDate: '1403/02/10',
    testDate: '1403/02/11',
    designSpecification: 'تراکم نسبی حداقل ۹۵٪ پروکتور مدیریت یافته',
    resultValue: 'تراکم بدست آمده: ۹۲.۴٪',
    isCompliant: false,
    labName: 'آزمایشگاه خاکشناسی کارگاه',
    approvedBy: 'مهندس کاظمی',
    notes: 'تراکم کمتر از حد مجاز است. لایه باید مجدداً مرطوب و متراکم گردد.',
    workflowStatus: WorkflowStatus.DRAFT,
    createdById: 'u-contractor-1',
    workflowHistory: [
      {
        id: 'ev_l3',
        timestamp: Date.now() - 20000000,
        actorUserId: 'u-contractor-1',
        actorName: 'کاربر پیمانکار',
        fromStatus: WorkflowStatus.DRAFT,
        toStatus: WorkflowStatus.DRAFT,
        action: 'SUBMIT',
        comment: 'ثبت اولیه'
      }
    ]
  },
  {
    id: 'lab_4',
    testNumber: 'LAB-W-1403-007',
    projectId: '2',
    testType: 'WELD_NDT',
    sampleLocation: 'جوش اتصالات نفوذی تیر به ستون - پارت سوم',
    samplingDate: '1403/02/12',
    testDate: '1403/02/13',
    designSpecification: 'تست اولتراسونیک (UT) بر اساس AWS D1.1',
    resultValue: '۱۰۰٪ عاری از عیوب نفوذی در ۱۲ مفصل بازرسی شده',
    isCompliant: true,
    labName: 'شرکت بازرسی غیرمخرب سازه پویا',
    approvedBy: 'مهندس قاسمی (سطح III بازرسی)',
    notes: 'گواهی NDT صادر شد.',
    workflowStatus: WorkflowStatus.APPROVED_INTERNAL,
    createdById: 'u-contractor-1'
  }
];

function getDisciplineLabel(disc: QCDiscipline) {
  const d = (disc || '').trim().toUpperCase();
  switch (d) {
    case 'CONCRETE':
    case 'بتن و سازه':
      return 'بتن و سازه';
    case 'REBAR':
    case 'آرماتوربندی':
      return 'آرماتوربندی';
    case 'FORMWORK':
    case 'قالب‌بندی':
      return 'قالب‌بندی';
    case 'EARTHWORK':
    case 'خاکبرداری':
    case 'خاکبرداری و زیرسازی':
      return 'خاکبرداری و زیرسازی';
    case 'WELDING':
    case 'جوشکاری و اسکلت':
    case 'جوشکاری و اسکلت فلزی':
      return 'جوشکاری و اسکلت فلزی';
    case 'MEP':
    case 'تاسیسات مکانیکی/برقی':
      return 'تاسیسات مکانیکی/برقی';
    case 'FINISHING':
    case 'نازک‌کاری و معماری':
      return 'نازک‌کاری و معماری';
    default:
      return disc || 'عمومی';
  }
}

function getLabTestTypeLabel(type: string) {
  if (!type) return 'سایر آزمایش‌ها';
  const t = type.trim().toUpperCase();
  switch (t) {
    case 'CONCRETE_CUBE':
    case 'CONCRETE_COMPRESSIVE':
    case 'آزمایش مقاومت بتن':
      return 'آزمایش مقاومت بتن';
    case 'STEEL_TENSILE':
    case 'آزمایش کشش و خم آرماتور':
      return 'آزمایش کشش و خم آرماتور';
    case 'SOIL_PROCTOR':
    case 'آزمایش دانسیته و تراکم خاک':
      return 'آزمایش دانسیته و تراکم خاک';
    case 'WELD_NDT':
    case 'تست غیرمخرب جوش (NDT)':
      return 'تست غیرمخرب جوش (NDT)';
    case 'AGGREGATE':
    case 'آزمایش دانه بندی مصالح':
      return 'آزمایش دانه بندی مصالح';
    default:
      return type;
  }
}

export default function QualityControl() {
  // Persistence
  const currentUser = useMemo(() => SystemAdminService.getCurrentUser(), []);
  const [projects] = useState<Project[]>(() => {
    const loaded = loadData('hamyar_projects', MOCK_PROJECTS);
    if (Array.isArray(loaded)) {
      return loaded.filter((p: any) => p.id !== '2' && !String(p.title || '').includes('تصفیه‌خانه مرکزی') && !String(p.title || '').includes('تسویه خانه مرکزی') && !String(p.title || '').includes('نیایش'));
    }
    return loaded || [];
  });

  const accessibleProjects = useMemo(() => {
    return projects.filter(p => SystemAdminService.canUserAccessProject(p.id, currentUser));
  }, [projects, currentUser]);

  const [selectedProjectId, setSelectedProjectId] = useState<string>(() => {
    const saved = localStorage.getItem('hamyar_selected_project_id');
    if (saved && saved !== 'undefined' && saved !== 'null') return saved;
    return '1';
  });

  useEffect(() => {
    if (accessibleProjects.length > 0 && !accessibleProjects.some(p => String(p.id) === String(selectedProjectId))) {
      setSelectedProjectId(String(accessibleProjects[0].id));
    }
  }, [accessibleProjects, selectedProjectId]);

  useEffect(() => {
    localStorage.setItem('hamyar_selected_project_id', selectedProjectId);
  }, [selectedProjectId]);

  const [inspections, setInspections] = useState<QCInspection[]>(() =>
    loadData('hamyar_qc_inspections', DEFAULT_INSPECTIONS)
  );
  const sanitizeNcrs = (list: NonConformanceReport[]): NonConformanceReport[] => {
    const validStatuses: NCRStatus[] = ['OPEN', 'CORRECTIVE_ACTION', 'VERIFICATION', 'CLOSED', 'REJECTED' as NCRStatus];
    return list.map((ncr) => {
      if (!validStatuses.includes(ncr.status)) {
        return {
          ...ncr,
          status: 'OPEN'
        };
      }
      return ncr;
    });
  };

  const [ncrs, setNcrs] = useState<NonConformanceReport[]>(() =>
    sanitizeNcrs(loadData('hamyar_qc_ncrs', DEFAULT_NCRS))
  );
  const [labTests, setLabTests] = useState<QCLabTest[]>(() =>
    loadData('hamyar_qc_lab_tests', DEFAULT_LAB_TESTS)
  );
  const [standardChecklists, setStandardChecklists] = useState<StandardQCChecklist[]>(() =>
    loadData('hamyar_qc_checklists', DEFAULT_STANDARD_CHECKLISTS)
  );

  // Save changes to localStorage
  useEffect(() => saveData('hamyar_qc_inspections', inspections), [inspections]);
  useEffect(() => saveData('hamyar_qc_ncrs', ncrs), [ncrs]);
  useEffect(() => saveData('hamyar_qc_lab_tests', labTests), [labTests]);
  useEffect(() => saveData('hamyar_qc_checklists', standardChecklists), [standardChecklists]);

  // Current User & Org Context for Workflow
  const userOrgType = useMemo(() => {
    return currentUser ? SystemAdminService.getOrganization(currentUser.orgId)?.type : undefined;
  }, [currentUser]);

  const [highlightedRecordId, setHighlightedRecordId] = useState<string | null>(null);

  // Listen for project change event
  useEffect(() => {
    const handleProjectChanged = (e?: Event) => {
      const customEvent = e as CustomEvent<{ projectId: string }>;
      const newProjId = customEvent?.detail?.projectId || localStorage.getItem('hamyar_selected_project_id');
      if (newProjId) {
        setSelectedProjectId(newProjId);
      }
    };
    window.addEventListener('project-changed', handleProjectChanged);
    return () => window.removeEventListener('project-changed', handleProjectChanged);
  }, []);

  const [unreadRecordIds, setUnreadRecordIds] = useState<Set<string>>(() => {
    return currentUser ? NotificationService.getUnreadRecordIds(currentUser.id) : new Set();
  });

  useEffect(() => {
    const updateUnread = () => {
      if (currentUser) {
        setUnreadRecordIds(NotificationService.getUnreadRecordIds(currentUser.id));
      }
    };
    window.addEventListener('notification-updated', updateUnread);
    return () => window.removeEventListener('notification-updated', updateUnread);
  }, [currentUser]);

  const handleNcrRowClick = (ncrId: string) => {
    if (currentUser && unreadRecordIds.has(String(ncrId))) {
      NotificationService.markRecordAsRead(String(ncrId), currentUser.id);
      setUnreadRecordIds((prev) => {
        const next = new Set(prev);
        next.delete(String(ncrId));
        return next;
      });
    }
  };

  // Notification redirect listener for QC
  useEffect(() => {
    const handleGlobalClick = (e: Event) => {
      const customEvent = e as CustomEvent<Notification>;
      if (customEvent.detail && (customEvent.detail.module === "QC" || customEvent.detail.module === "quality-control")) {
        const recId = customEvent.detail.recordId;
        if (customEvent.detail.projectId) {
          setSelectedProjectId(customEvent.detail.projectId);
        }

        const notifDocCode = customEvent.detail.documentCode || '';
        const notifTitle = customEvent.detail.documentTitle || customEvent.detail.message || '';

        const isRfi = inspections.some(i => String(i.id) === String(recId) || (i.rfiNumber && i.rfiNumber === notifDocCode));
        const isLab = labTests.some(l => String(l.id) === String(recId) || (l.testNumber && l.testNumber === notifDocCode));
        const isNcr = ncrs.some(n => String(n.id) === String(recId) || (n.ncrNumber && n.ncrNumber === notifDocCode));

        let targetTab: 'inspections' | 'ncrs' | 'lab_tests' = 'ncrs';
        if (isRfi) targetTab = 'inspections';
        else if (isLab) targetTab = 'lab_tests';
        else if (isNcr) targetTab = 'ncrs';
        else if (notifTitle.includes('RFI') || notifTitle.includes('بازرسی') || notifDocCode.startsWith('RFI')) targetTab = 'inspections';
        else if (notifTitle.includes('آزمایش') || notifDocCode.startsWith('LAB')) targetTab = 'lab_tests';

        setActiveTab(targetTab);
        if (recId) {
          handleNcrRowClick(recId);
          setHighlightedRecordId(recId);
          setTimeout(() => {
            const el = document.getElementById(`record-${recId}`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 200);
          setTimeout(() => setHighlightedRecordId(null), 3500);
        }
      }
    };
    window.addEventListener("hamyar-notification-clicked", handleGlobalClick);

    // Also check URL parameters
    const params = new URLSearchParams(window.location.search);
    const recId = params.get('recordId');
    const tab = params.get('tab');
    const projId = params.get('projectId');
    if (projId) {
      setSelectedProjectId(projId);
    }
    if (recId) {
      let targetTab: 'inspections' | 'ncrs' | 'lab_tests' = 'ncrs';
      if (tab === 'inspections' || tab === 'rfi') targetTab = 'inspections';
      else if (tab === 'lab' || tab === 'lab_tests' || tab === 'tests') targetTab = 'lab_tests';
      else if (tab === 'ncrs' || tab === 'ncr') targetTab = 'ncrs';
      else {
        if (inspections.some(i => String(i.id) === String(recId))) targetTab = 'inspections';
        else if (labTests.some(l => String(l.id) === String(recId))) targetTab = 'lab_tests';
      }
      setActiveTab(targetTab);
      handleNcrRowClick(recId);
      setHighlightedRecordId(recId);
      setTimeout(() => {
        const el = document.getElementById(`record-${recId}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 200);
      setTimeout(() => {
        setHighlightedRecordId(null);
        window.history.replaceState({}, "", window.location.pathname);
      }, 3500);
    }

    return () => {
      window.removeEventListener("hamyar-notification-clicked", handleGlobalClick);
    };
  }, [inspections, ncrs, labTests]);

  // Workflow Modal States
  const [isWorkflowModalOpen, setIsWorkflowModalOpen] = useState(false);
  const [workflowTarget, setWorkflowTarget] = useState<any | null>(null);
  const [workflowActionType, setWorkflowActionType] = useState<WorkflowAction | null>(null);
  const [workflowAssignee, setWorkflowAssignee] = useState<string>('');
  const [workflowComment, setWorkflowComment] = useState<string>('');

  // NCR Handoff Modal States
  const [isNcrHandoffModalOpen, setIsNcrHandoffModalOpen] = useState(false);
  const [ncrHandoffTarget, setNcrHandoffTarget] = useState<NonConformanceReport | null>(null);
  const [ncrHandoffType, setNcrHandoffType] = useState<'TO_CONSULTANT' | 'TO_CONTRACTOR' | 'TO_EMPLOYER' | null>(null);
  const [ncrHandoffAssignee, setNcrHandoffAssignee] = useState<string>('');
  const [ncrHandoffComment, setNcrHandoffComment] = useState<string>('');

  // Workflow History Modal State
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyTarget, setHistoryTarget] = useState<any | null>(null);

  // Delete Target Confirmation State
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string; type: 'rfi' | 'ncr' | 'lab' | 'standard' } | null>(null);

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'rfi') {
      setInspections((prev) => prev.filter((i) => i.id !== deleteTarget.id));
    } else if (deleteTarget.type === 'ncr') {
      setNcrs((prev) => prev.filter((n) => n.id !== deleteTarget.id));
    } else if (deleteTarget.type === 'lab') {
      setLabTests((prev) => prev.filter((l) => l.id !== deleteTarget.id));
    } else if (deleteTarget.type === 'standard') {
      setStandardChecklists((prev) => prev.filter((chk) => chk.id !== deleteTarget.id));
    }
    setDeleteTarget(null);
  };

  // Form Controlled Dates for Auto-Slash formatting
  const [rfiRequestDate, setRfiRequestDate] = useState('');
  const [rfiInspectionDate, setRfiInspectionDate] = useState('');

  const [ncrIssueDate, setNcrIssueDate] = useState('');
  const [ncrDeadlineDate, setNcrDeadlineDate] = useState('');

  const [labSamplingDate, setLabSamplingDate] = useState('');
  const [labTestDate, setLabTestDate] = useState('');

  // Helper openers
  const openInspectionModal = (insp?: QCInspection | null) => {
    setEditingInspection(insp || null);
    setRfiRequestDate(insp?.requestDate || new Date().toLocaleDateString('fa-IR'));
    setRfiInspectionDate(insp?.inspectionDate || '');
    setIsInspectionModalOpen(true);
  };

  const openNcrModal = (ncr?: NonConformanceReport | null) => {
    setEditingNcr(ncr || null);
    setNcrIssueDate(ncr?.issueDate || new Date().toLocaleDateString('fa-IR'));
    setNcrDeadlineDate(ncr?.deadlineDate || '');
    setIsNcrModalOpen(true);
  };

  const openLabTestModal = (lab?: QCLabTest | null) => {
    setEditingLabTest(lab || null);
    setLabSamplingDate(lab?.samplingDate || new Date().toLocaleDateString('fa-IR'));
    setLabTestDate(lab?.testDate || '');
    setIsLabTestModalOpen(true);
  };

  const openWorkflowModal = (item: any, action: WorkflowAction) => {
    setWorkflowTarget(item);
    setWorkflowActionType(action);
    setWorkflowAssignee('');
    setWorkflowComment('');
    setIsWorkflowModalOpen(true);
  };

  const handleConfirmWorkflow = () => {
    if (!workflowTarget || !workflowActionType || !currentUser) return;
    try {
      const assigneeUser = workflowAssignee ? SystemAdminService.getUsers().find((u) => u.id === workflowAssignee) : undefined;
      
      let targetOrgId: string | undefined = undefined;
      const orgs = SystemAdminService.getOrganizations();
      if (
        workflowActionType === "SEND_TO_CONSULTANT" ||
        workflowActionType === "RETURN_TO_CONSULTANT"
      ) {
        const consultantOrg = orgs.find((o) => o.type === OrganizationType.CONSULTANT);
        if (consultantOrg) targetOrgId = consultantOrg.id;
      } else if (workflowActionType === "SEND_TO_EMPLOYER") {
        const employerOrg = orgs.find((o) => o.type === OrganizationType.EMPLOYER);
        if (employerOrg) targetOrgId = employerOrg.id;
      } else if (workflowActionType === "RETURN_TO_CONTRACTOR") {
        const contractOrgId = (workflowTarget as any).ownerOrgId;
        const contractorOrg = contractOrgId
          ? orgs.find((o) => o.id === contractOrgId)
          : orgs.find((o) => o.type === OrganizationType.CONTRACTOR);
        if (contractorOrg) targetOrgId = contractorOrg.id;
      }

      const assigneeOrg = assigneeUser?.orgId ? SystemAdminService.getOrganization(assigneeUser.orgId) : undefined;
      const assigneeNameWithTitle = assigneeUser
        ? formatUserDisplayFormal(assigneeUser, assigneeOrg)
        : undefined;

      const updated = WorkflowService.performAction(
        workflowTarget,
        workflowActionType,
        currentUser,
        {
          assigneeId: workflowAssignee || undefined,
          assigneeName: assigneeNameWithTitle,
          comment: workflowComment.trim() || undefined,
          targetOrgId: targetOrgId
        }
      );

      if ('rfiNumber' in workflowTarget) {
        setInspections((prev) => prev.map((i) => (i.id === updated.id ? (updated as unknown as QCInspection) : i)));
      } else if ('ncrNumber' in workflowTarget) {
        setNcrs((prev) => prev.map((n) => (n.id === updated.id ? (updated as unknown as NonConformanceReport) : n)));
      } else if ('testNumber' in workflowTarget) {
        setLabTests((prev) => prev.map((l) => (l.id === updated.id ? (updated as unknown as QCLabTest) : l)));
      }

      setIsWorkflowModalOpen(false);
      setWorkflowTarget(null);
      setWorkflowActionType(null);
      setWorkflowAssignee('');
      setWorkflowComment('');
    } catch (err: any) {
      alert(err.message || 'خطا در انجام تغییر چرخه کار');
    }
  };

  const handleConfirmNcrHandoff = () => {
    if (!ncrHandoffTarget || !ncrHandoffType || !currentUser) return;
    if (!ncrHandoffAssignee) {
      alert('لطفا کاربر مسئول را انتخاب کنید.');
      return;
    }
    try {
      const assigneeUser = SystemAdminService.getUsers().find((u) => u.id === ncrHandoffAssignee);
      if (!assigneeUser) return;

      const assigneeOrg = SystemAdminService.getOrganization(assigneeUser.orgId);
      const assigneeNameWithTitle = formatUserDisplayFormal(assigneeUser, assigneeOrg);

      const actorOrg = SystemAdminService.getOrganization(currentUser.orgId);
      const actorNameWithTitle = formatUserDisplayFormal(currentUser, actorOrg);

      const currentStatus = ncrHandoffTarget.status;
      let nextStatus: WorkflowStatus = WorkflowStatus.SENT_TO_CONSULTANT;
      let action: WorkflowAction = 'SEND_TO_CONSULTANT';

      if (ncrHandoffType === 'TO_CONSULTANT') {
        nextStatus = WorkflowStatus.SENT_TO_CONSULTANT;
        action = 'SEND_TO_CONSULTANT';
      } else if (ncrHandoffType === 'TO_EMPLOYER') {
        nextStatus = WorkflowStatus.SENT_TO_EMPLOYER;
        action = 'SEND_TO_EMPLOYER';
      } else {
        nextStatus = WorkflowStatus.IN_REVIEW;
        action = 'SEND_TO_CONTRACTOR';
      }

      const nextOrgId = assigneeUser.orgId;

      const event: WorkflowEvent = {
        id: typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : 'ev-' + Math.random().toString(36).substr(2, 9),
        timestamp: Date.now(),
        action: action as WorkflowAction,
        fromStatus: currentStatus as WorkflowStatus,
        toStatus: nextStatus,
        actorUserId: currentUser.id,
        actorName: actorNameWithTitle,
        assigneeUserId: assigneeUser.id,
        assigneeName: assigneeNameWithTitle,
        comment: ncrHandoffComment.trim() || undefined
      };

      const updatedNcr: NonConformanceReport = {
        ...ncrHandoffTarget,
        status: ncrHandoffTarget.status || 'OPEN',
        workflowStatus: nextStatus,
        currentOrgId: nextOrgId,
        assigneeId: assigneeUser.id,
        assigneeName: assigneeNameWithTitle,
        workflowHistory: [...(ncrHandoffTarget.workflowHistory || []), event]
      };

      setNcrs((prev) => prev.map((n) => (n.id === updatedNcr.id ? updatedNcr : n)));

      // Trigger Notification
      try {
        const docCode = (updatedNcr as any).rfiNumber || (updatedNcr as any).ncrNumber || (updatedNcr as any).testNumber || updatedNcr.ncrNumber;
        const isRfi = !!(updatedNcr as any).rfiNumber;
        const isLab = !!(updatedNcr as any).testNumber;
        const itemTypeLabel = isRfi ? 'برگه بازرسی RFI' : isLab ? 'آزمایش کنترل کیفی' : 'گزارش عدم انطباق NCR';
        const itemTitle = `${itemTypeLabel} شماره ${docCode}`;
        NotificationService.createNotification(
          'WORKFLOW',
          action as any,
          'QC',
          updatedNcr as any,
          currentUser,
          assigneeUser.id,
          nextOrgId,
          `${itemTitle} به شما ارجاع شد.`
        );
      } catch (err) {
        console.error('Notification failed', err);
      }

      setIsNcrHandoffModalOpen(false);
      setNcrHandoffTarget(null);
      setNcrHandoffType(null);
      setNcrHandoffAssignee('');
      setNcrHandoffComment('');
    } catch (err: any) {
      alert(err.message || 'خطا در ارجاع عدم انطباق');
    }
  };

  // Helper for Visibility Logic
  const checkItemVisibility = useCallback(
    (item: any) => {
      if (!currentUser) return false;
      if (currentUser.role === 'SYSTEM_ADMIN') return true;

      let refItem = item;
      if (!refItem) return false;

      if (refItem.isArchived) return false;
      if (refItem.isFinalFrozen) return true;

      const hasNoOversightInfo =
        !refItem.createdById &&
        !refItem.assigneeId &&
        (!refItem.workflowHistory || refItem.workflowHistory.length === 0);
      if (hasNoOversightInfo) return true;

      if (
        refItem.createdById === currentUser.id ||
        refItem.assigneeId === currentUser.id
      )
        return true;

      const isProjectManager =
        (currentUser.jobTitle || '').includes('مدیر پروژه') ||
        (currentUser.jobLevel || '').includes('مدیر پروژه');
      const hasHistory =
        refItem.workflowHistory && refItem.workflowHistory.length > 0;

      if (
        isProjectManager &&
        (refItem.ownerOrgId === currentUser.orgId ||
          refItem.currentOrgId === currentUser.orgId) &&
        hasHistory
      )
        return true;

      const history = refItem.workflowHistory || [];
      return history.some(
        (ev: any) =>
          ev.assigneeUserId === currentUser.id ||
          ev.actorUserId === currentUser.id,
      );
    },
    [currentUser],
  );

  const filterWorkflowUsers = (users: any[], currentUser: any) => {
    if (!currentUser) return users;
    
    const isCurrentUser = (u: any) =>
      u.id === currentUser.id ||
      (currentUser.username && u.username === currentUser.username);

    const isSystemAdmin = currentUser.role === 'SYSTEM_ADMIN';
    if (isSystemAdmin) {
       return users.filter(u => !isCurrentUser(u));
    }

    const ut = (currentUser.jobTitle || "").trim();
    const ul = (currentUser.jobLevel || "").trim();
    
    const isCurrentUserPM = currentUser.role === 'ORG_ADMIN' || ut.includes('مدیر پروژه') || ul.includes('مدیر پروژه') || currentUser.username === 'e-pm' || currentUser.id === 'e-pm';
    const isCurrentUserWorkshopManager = ut.includes('سرپرست کارگاه') || ul.includes('سرپرست کارگاه');
    
    const isExpertOrUnitSupervisor = (
      ut.includes("کارشناس") || ul.includes("کارشناس") ||
      ut.includes("سرپرست واحد") || ul.includes("سرپرست واحد")
    );

    return users.filter(u => {
      if (isCurrentUser(u)) return false;

      const isSameOrg = u.orgId === currentUser.orgId;
      const isTargetPM = u.role === 'ORG_ADMIN' || (u.jobTitle || '').includes('مدیر پروژه') || (u.jobLevel || '').includes('مدیر پروژه') || u.username === 'e-pm' || u.id === 'e-pm';
      const isTargetWorkshopManager = (u.jobTitle || '').includes('سرپرست کارگاه') || (u.jobLevel || '').includes('سرپرست کارگاه');

      if (isTargetPM && !isCurrentUserWorkshopManager && !(isCurrentUserPM && !isSameOrg)) {
        return false;
      }

      if (isSameOrg) {
        if (isExpertOrUnitSupervisor) {
          return !isTargetPM;
        }
        if (isCurrentUserPM || isCurrentUserWorkshopManager) {
          return true;
        }
        return !isTargetPM;
      } else {
        if (isCurrentUserPM || isCurrentUserWorkshopManager) {
          return isTargetPM || isTargetWorkshopManager;
        }
        return false;
      }
    });
  };

  const getWorkflowTargetUsers = (action: WorkflowAction, target: any, currentUser: any) => {
    if (!currentUser) return [];
    const isSystemAdmin = currentUser.role === 'SYSTEM_ADMIN';
    let users = SystemAdminService.getUsers().filter((u) => u.isActive);

    if (action === "SEND_TO_CONSULTANT" || action === "RETURN_TO_CONSULTANT") {
      if (!isSystemAdmin) {
        const orgs = SystemAdminService.getOrganizations();
        const consultantOrg = orgs.find((o) => o.type === OrganizationType.CONSULTANT);
        if (consultantOrg) {
          users = users.filter((u) => u.orgId === consultantOrg.id);
        } else {
          users = [];
        }
      }
    } else if (action === "SEND_TO_EMPLOYER") {
      if (!isSystemAdmin) {
        const orgs = SystemAdminService.getOrganizations();
        const employerOrg = orgs.find((o) => o.type === OrganizationType.EMPLOYER);
        if (employerOrg) {
          users = users.filter((u) => u.orgId === employerOrg.id);
        } else {
          users = [];
        }
      }
    } else if (action === "RETURN_TO_CONTRACTOR") {
      if (!isSystemAdmin) {
        const orgs = SystemAdminService.getOrganizations();
        const targetOrgId = target?.ownerOrgId;
        const contractorOrg = targetOrgId
          ? orgs.find((o) => o.id === targetOrgId)
          : orgs.find((o) => o.type === OrganizationType.CONTRACTOR);
        if (contractorOrg) {
          users = users.filter((u) => u.orgId === contractorOrg.id);
        } else {
          users = [];
        }
      }
    } else {
      // SUBMIT, RESUBMIT, APPROVE, REASSIGN, REJECT
      if (!isSystemAdmin) {
        users = users.filter((u) => u.orgId === currentUser.orgId);
      }
    }

    return filterWorkflowUsers(users, currentUser);
  };

  const isReassignSender = (item: any) => {
    if (!currentUser || !item.workflowHistory || item.workflowHistory.length === 0) return false;
    const lastEvent = item.workflowHistory[item.workflowHistory.length - 1];
    if (lastEvent && lastEvent.actorUserId === currentUser.id && lastEvent.action !== 'UNFREEZE_BY_VARIATION') {
      if (item.assigneeId && item.assigneeId !== currentUser.id) {
        return true;
      }
    }
    return false;
  };

  const getNcrCreatorOrgType = (ncr: NonConformanceReport) => {
    if (!ncr.ownerOrgId) return null;
    const org = SystemAdminService.getOrganizations().find(o => o.id === ncr.ownerOrgId);
    return org ? org.type : null;
  };

  const canSendNcrToConsultant = (ncr: NonConformanceReport) => {
    if (!currentUser) return false;
    const ut = (currentUser.jobTitle || "").trim();
    const ul = (currentUser.jobLevel || "").trim();
    const isPMOrWM = ut.includes('مدیر پروژه') || ul.includes('مدیر پروژه') || ut.includes('سرپرست کارگاه') || ul.includes('سرپرست کارگاه') || currentUser.role === 'SYSTEM_ADMIN';
    if (!isPMOrWM) return false;
    
    const currentOrgId = ncr.currentOrgId || ncr.ownerOrgId;
    if (currentOrgId !== currentUser.orgId && currentUser.role !== 'SYSTEM_ADMIN') return false;
    
    const creatorOrgType = getNcrCreatorOrgType(ncr);
    // When contractor creates NCR: "ارسال به مشاور" button is NOT shown
    if (creatorOrgType === 'CONTRACTOR') return false;
    // When employer creates NCR: Employer can send to consultant
    if (creatorOrgType === 'EMPLOYER') {
      return userOrgType === 'EMPLOYER' || currentUser.role === 'SYSTEM_ADMIN';
    }
    return false;
  };

  const canSendNcrToContractor = (ncr: NonConformanceReport) => {
    if (!currentUser) return false;
    const ut = (currentUser.jobTitle || "").trim();
    const ul = (currentUser.jobLevel || "").trim();
    const isPMOrWM = ut.includes('مدیر پروژه') || ul.includes('مدیر پروژه') || ut.includes('سرپرست کارگاه') || ul.includes('سرپرست کارگاه') || currentUser.role === 'SYSTEM_ADMIN';
    if (!isPMOrWM) return false;
    
    const creatorOrgType = getNcrCreatorOrgType(ncr);
    // When contractor creates NCR: "ارسال به پیمانکار" button is NOT shown
    if (creatorOrgType === 'CONTRACTOR') return false;

    // Check if NCR has ALREADY been sent to contractor (hide button after sending)
    const alreadySentToContractor = ncr.workflowHistory?.some(
      e => e.action === 'RETURN_TO_CONTRACTOR' || e.action === 'SEND_TO_CONTRACTOR'
    ) || false;
    if (alreadySentToContractor) return false;

    const currentOrgId = ncr.currentOrgId || ncr.ownerOrgId;

    // When consultant creates NCR: Consultant (owner/current) or Employer (if sent to employer) can send to contractor
    if (creatorOrgType === 'CONSULTANT') {
      if (currentUser.role === 'SYSTEM_ADMIN') return true;
      if (userOrgType === 'CONSULTANT' && (ncr.ownerOrgId === currentUser.orgId || currentOrgId === currentUser.orgId)) {
        return true;
      }
      if (userOrgType === 'EMPLOYER' && currentOrgId === currentUser.orgId) {
        return true;
      }
      return false;
    }

    // When employer creates NCR: Employer/Consultant can send to contractor
    if (creatorOrgType === 'EMPLOYER') {
      if (currentOrgId !== currentUser.orgId && currentUser.role !== 'SYSTEM_ADMIN') return false;
      return userOrgType === 'EMPLOYER' || userOrgType === 'CONSULTANT' || currentUser.role === 'SYSTEM_ADMIN';
    }

    return false;
  };

  const canSendNcrToEmployer = (ncr: NonConformanceReport) => {
    if (!currentUser) return false;
    const ut = (currentUser.jobTitle || "").trim();
    const ul = (currentUser.jobLevel || "").trim();
    const isPMOrWM = ut.includes('مدیر پروژه') || ul.includes('مدیر پروژه') || ut.includes('سرپرست کارگاه') || ul.includes('سرپرست کارگاه') || currentUser.role === 'SYSTEM_ADMIN';
    if (!isPMOrWM) return false;
    
    const creatorOrgType = getNcrCreatorOrgType(ncr);
    // When consultant creates NCR: Consultant can send to employer if not already sent
    if (creatorOrgType === 'CONSULTANT') {
      const alreadySentToEmployer = ncr.workflowHistory?.some(e => e.action === 'SEND_TO_EMPLOYER') || false;
      if (alreadySentToEmployer) return false;

      const currentOrgId = ncr.currentOrgId || ncr.ownerOrgId;
      if (currentUser.role === 'SYSTEM_ADMIN') return true;
      if (userOrgType === 'CONSULTANT' && (ncr.ownerOrgId === currentUser.orgId || currentOrgId === currentUser.orgId)) {
        return true;
      }
      return false;
    }
    return false;
  };

  // Main UI Tabs
  const [activeTab, setActiveTab] = useState<'inspections' | 'ncrs' | 'lab_tests' | 'standards'>('inspections');

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [disciplineFilter, setDisciplineFilter] = useState<string>('ALL');
  const [labStatusFilter, setLabStatusFilter] = useState<string>('ALL');
  const [labTypeFilter, setLabTypeFilter] = useState<string>('ALL');

  // Modal Controls
  const [isInspectionModalOpen, setIsInspectionModalOpen] = useState(false);
  const [editingInspection, setEditingInspection] = useState<QCInspection | null>(null);
  
  const [isChecklistEvalModalOpen, setIsChecklistEvalModalOpen] = useState(false);
  const [activeInspectionForEval, setActiveInspectionForEval] = useState<QCInspection | null>(null);

  const [isNcrModalOpen, setIsNcrModalOpen] = useState(false);
  const [editingNcr, setEditingNcr] = useState<NonConformanceReport | null>(null);

  const isNcrRestricted = useMemo(() => {
    if (!editingNcr || !currentUser) return false;
    if (currentUser.role === 'SYSTEM_ADMIN') return false;
    return editingNcr.ownerOrgId ? editingNcr.ownerOrgId !== currentUser.orgId : false;
  }, [editingNcr, currentUser]);

  const isContractorRestricted = isNcrRestricted;

  const isStatusDisabled = useMemo(() => {
    if (currentUser?.role === 'SYSTEM_ADMIN' || userOrgType === 'CONSULTANT' || userOrgType === 'EMPLOYER') {
      return false;
    }
    return true;
  }, [currentUser, userOrgType]);

  const isDeadlineDisabled = useMemo(() => {
    if (currentUser?.role === 'SYSTEM_ADMIN') return false;
    if (userOrgType === 'CONTRACTOR') return true;
    return false;
  }, [currentUser, userOrgType]);

  const [isLabTestModalOpen, setIsLabTestModalOpen] = useState(false);
  const [editingLabTest, setEditingLabTest] = useState<QCLabTest | null>(null);

  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printInspectionData, setPrintInspectionData] = useState<QCInspection | null>(null);

  const [isNcrPrintModalOpen, setIsNcrPrintModalOpen] = useState(false);
  const [printNcrData, setPrintNcrData] = useState<NonConformanceReport | null>(null);

  const [isLabPrintModalOpen, setIsLabPrintModalOpen] = useState(false);
  const [printLabData, setPrintLabData] = useState<QCLabTest | null>(null);

  // Reference Checklist Bank States
  const [isStdChecklistModalOpen, setIsStdChecklistModalOpen] = useState(false);
  const [editingStdChecklist, setEditingStdChecklist] = useState<StandardQCChecklist | null>(null);
  const [stdChecklistItems, setStdChecklistItems] = useState<string[]>([]);

  const handleOpenAddStdChecklist = () => {
    setEditingStdChecklist(null);
    setStdChecklistItems(['']);
    setIsStdChecklistModalOpen(true);
  };

  const handleOpenEditStdChecklist = (chk: StandardQCChecklist) => {
    setEditingStdChecklist(chk);
    setStdChecklistItems(chk.items && chk.items.length > 0 ? [...chk.items] : ['']);
    setIsStdChecklistModalOpen(true);
  };

  const handleAddStdChecklistItemField = () => {
    setStdChecklistItems(prev => [...prev, '']);
  };

  const handleRemoveStdChecklistItemField = (index: number) => {
    setStdChecklistItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleStdChecklistItemFieldChange = (index: number, value: string) => {
    setStdChecklistItems(prev => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  };

  const handleSaveStdChecklist = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const title = formData.get('title') as string;
    const category = formData.get('category') as string;
    const discipline = formData.get('discipline') as string;

    const filteredItems = stdChecklistItems.map(item => item.trim()).filter(item => item !== '');

    if (!title?.trim() || !category?.trim() || filteredItems.length === 0) {
      alert('لطفاً عنوان، دسته‌بندی و حداقل یک بند کنترلی معتبر وارد کنید.');
      return;
    }

    if (editingStdChecklist) {
      setStandardChecklists(prev =>
        prev.map(chk =>
          chk.id === editingStdChecklist.id
            ? { ...chk, title, category, discipline, items: filteredItems }
            : chk
        )
      );
    } else {
      const newChecklist: StandardQCChecklist = {
        id: `std_${Date.now()}`,
        discipline,
        title,
        category,
        items: filteredItems,
      };
      setStandardChecklists(prev => [...prev, newChecklist]);
    }

    setIsStdChecklistModalOpen(false);
    setEditingStdChecklist(null);
  };

  // Current Project
  const currentProject = useMemo(() => {
    return projects.find((p) => String(p.id) === String(selectedProjectId)) || projects[0] || ({} as Project);
  }, [projects, selectedProjectId]);

  // Unique Disciplines from standardChecklists
  const uniqueDisciplines = useMemo(() => {
    const list = standardChecklists
      .map((chk) => chk.discipline?.trim())
      .filter((disc): disc is string => !!disc);
    if (editingInspection?.discipline) {
      list.push(editingInspection.discipline.trim());
    }
    
    const seenLabels = new Set<string>();
    const result: string[] = [];
    
    for (const disc of list) {
      const label = getDisciplineLabel(disc);
      if (!seenLabels.has(label)) {
        seenLabels.add(label);
        result.push(disc);
      }
    }
    return result;
  }, [standardChecklists, editingInspection]);

  // Unique Disciplines from registered inspections (RFIs)
  const uniqueInspectionDisciplines = useMemo(() => {
    const list = inspections
      .filter((item) => !selectedProjectId || String(item.projectId) === String(selectedProjectId))
      .map((item) => item.discipline?.trim())
      .filter((disc): disc is string => !!disc);
    
    const seenLabels = new Set<string>();
    const uniqueList: { value: string; label: string }[] = [];
    
    for (const disc of list) {
      const label = getDisciplineLabel(disc);
      if (!seenLabels.has(label)) {
        seenLabels.add(label);
        uniqueList.push({ value: disc, label });
      }
    }
    return uniqueList;
  }, [inspections, selectedProjectId]);

  // Unique Lab Test Types from registered lab tests
  const uniqueLabTestTypes = useMemo(() => {
    const list = labTests
      .filter((item) => !selectedProjectId || String(item.projectId) === String(selectedProjectId))
      .map((item) => item.testType?.trim())
      .filter((type): type is string => !!type);

    const seenLabels = new Set<string>();
    const uniqueList: { value: string; label: string }[] = [];

    for (const type of list) {
      const label = getLabTestTypeLabel(type);
      if (!seenLabels.has(label)) {
        seenLabels.add(label);
        uniqueList.push({ value: type, label });
      }
    }
    return uniqueList;
  }, [labTests, selectedProjectId]);

  // Helper to calculate effective RFI inspection status
  const getEffectiveInspectionStatus = useCallback((insp: QCInspection): 'APPROVED' | 'CONDITIONAL' | 'REJECTED' | 'PENDING' => {
    if (insp.status === 'APPROVED' || insp.status === 'PASSED') return 'APPROVED';
    if (insp.status === 'CONDITIONAL') return 'CONDITIONAL';
    if (insp.status === 'REJECTED' || insp.status === 'FAILED') return 'REJECTED';
    
    if (
      insp.workflowStatus === WorkflowStatus.APPROVED_BY_EMPLOYER ||
      insp.workflowStatus === WorkflowStatus.APPROVED_BY_CONSULTANT ||
      insp.workflowStatus === WorkflowStatus.APPROVED_INTERNAL
    ) {
      return 'APPROVED';
    }
    if (insp.workflowStatus === WorkflowStatus.REJECTED) {
      return 'REJECTED';
    }

    if (insp.checklists && insp.checklists.length > 0) {
      const hasFailed = insp.checklists.some((c) => c.status === 'FAILED' || c.status === 'REJECTED');
      const hasConditional = insp.checklists.some((c) => c.status === 'CONDITIONAL');
      const allPassed = insp.checklists.every((c) => c.status === 'PASSED' || c.status === 'APPROVED');
      if (hasFailed) return 'REJECTED';
      if (hasConditional) return 'CONDITIONAL';
      if (allPassed) return 'APPROVED';
    }

    return 'PENDING';
  }, []);

  // Filtered Inspections
  const filteredInspections = useMemo(() => {
    return inspections.filter((item) => {
      const matchProject = !selectedProjectId || String(item.projectId) === String(selectedProjectId);
      const matchSearch =
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.rfiNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.location.toLowerCase().includes(searchTerm.toLowerCase());
      const effStatus = getEffectiveInspectionStatus(item);
      const matchStatus =
        statusFilter === 'ALL' ||
        effStatus === statusFilter ||
        (statusFilter === 'APPROVED' && (effStatus === 'APPROVED' || item.status === 'PASSED')) ||
        (statusFilter === 'REJECTED' && (effStatus === 'REJECTED' || item.status === 'FAILED'));
      const matchDiscipline =
        disciplineFilter === 'ALL' ||
        item.discipline === disciplineFilter ||
        getDisciplineLabel(item.discipline) === getDisciplineLabel(disciplineFilter);
      return matchProject && matchSearch && matchStatus && matchDiscipline && checkItemVisibility(item);
    });
  }, [inspections, selectedProjectId, searchTerm, statusFilter, disciplineFilter, checkItemVisibility, getEffectiveInspectionStatus]);

  // Filtered NCRs
  const filteredNcrs = useMemo(() => {
    return ncrs.filter((item) => {
      const matchProject = !selectedProjectId || String(item.projectId) === String(selectedProjectId);
      const matchSearch =
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.ncrNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.location.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === 'ALL' || item.status === statusFilter;
      return matchProject && matchSearch && matchStatus && checkItemVisibility(item);
    });
  }, [ncrs, selectedProjectId, searchTerm, statusFilter, checkItemVisibility]);

  // Filtered Lab Tests
  const filteredLabTests = useMemo(() => {
    return labTests.filter((item) => {
      const matchProject = !selectedProjectId || String(item.projectId) === String(selectedProjectId);
      const matchSearch =
        item.testNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sampleLocation.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.labName.toLowerCase().includes(searchTerm.toLowerCase());

      const effectiveStatus = 
        (item.employerComplianceStatus && item.employerComplianceStatus !== 'PENDING') ? item.employerComplianceStatus :
        (item.consultantComplianceStatus && item.consultantComplianceStatus !== 'PENDING') ? item.consultantComplianceStatus :
        (item.complianceStatus && item.complianceStatus !== 'PENDING') ? item.complianceStatus : 'PENDING';

      const matchStatus = labStatusFilter === 'ALL' || effectiveStatus === labStatusFilter;
      const matchType =
        labTypeFilter === 'ALL' ||
        item.testType === labTypeFilter ||
        getLabTestTypeLabel(item.testType) === getLabTestTypeLabel(labTypeFilter);

      return matchProject && matchSearch && matchStatus && matchType && checkItemVisibility(item);
    });
  }, [labTests, selectedProjectId, searchTerm, labStatusFilter, labTypeFilter, checkItemVisibility]);

  // Stats Calculations
  const projectInspections = useMemo(() => {
    return inspections.filter((i) => (!selectedProjectId || String(i.projectId) === String(selectedProjectId)) && checkItemVisibility(i));
  }, [inspections, selectedProjectId, checkItemVisibility]);

  const approvedCount = useMemo(() => projectInspections.filter((i) => getEffectiveInspectionStatus(i) === 'APPROVED').length, [projectInspections, getEffectiveInspectionStatus]);
  const conditionalCount = useMemo(() => projectInspections.filter((i) => getEffectiveInspectionStatus(i) === 'CONDITIONAL').length, [projectInspections, getEffectiveInspectionStatus]);
  const rejectedCount = useMemo(() => projectInspections.filter((i) => getEffectiveInspectionStatus(i) === 'REJECTED').length, [projectInspections, getEffectiveInspectionStatus]);
  const pendingCount = useMemo(() => projectInspections.filter((i) => getEffectiveInspectionStatus(i) === 'PENDING').length, [projectInspections, getEffectiveInspectionStatus]);

  const projectNcrs = useMemo(() => {
    return ncrs.filter((n) => (!selectedProjectId || String(n.projectId) === String(selectedProjectId)) && checkItemVisibility(n));
  }, [ncrs, selectedProjectId, checkItemVisibility]);

  const openNcrsCount = useMemo(() => projectNcrs.filter((n) => n.status !== 'CLOSED').length, [projectNcrs]);

  const projectLabTests = useMemo(() => {
    return labTests.filter((l) => (!selectedProjectId || String(l.projectId) === String(selectedProjectId)) && checkItemVisibility(l));
  }, [labTests, selectedProjectId, checkItemVisibility]);

  const labPassRate = useMemo(() => {
    if (projectLabTests.length === 0) return 100;
    const passCount = projectLabTests.filter((l) => {
      const eff = (l.employerComplianceStatus && l.employerComplianceStatus !== 'PENDING') ? l.employerComplianceStatus :
                  (l.consultantComplianceStatus && l.consultantComplianceStatus !== 'PENDING') ? l.consultantComplianceStatus :
                  l.complianceStatus;
      return l.isCompliant || eff === 'COMPLIANT';
    }).length;
    return Math.round((passCount / projectLabTests.length) * 100);
  }, [projectLabTests]);

  // Handle Inspection Submit
  const handleSaveInspection = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const rfiNumber = (formData.get('rfiNumber') as string) || `RFI-1403-${Math.floor(100 + Math.random() * 900)}`;
    const title = (formData.get('title') as string) || '';
    const rawDiscipline = (formData.get('discipline') as string) || 'CONCRETE';
    const discipline = (rawDiscipline as QCDiscipline) || 'CONCRETE';
    const location = (formData.get('location') as string) || '';
    const contractor = (formData.get('contractor') as string) || '';
    const inspector = (formData.get('inspector') as string) || '';
    const requestDate = rfiRequestDate || (formData.get('requestDate') as string) || new Date().toLocaleDateString('fa-IR');
    const inspectionDate = rfiInspectionDate || (formData.get('inspectionDate') as string) || '';
    const status = editingInspection ? editingInspection.status : 'PENDING';
    const description = (formData.get('description') as string) || '';

    if (editingInspection) {
      setInspections((prev) =>
        prev.map((item) =>
          item.id === editingInspection.id
            ? {
                ...item,
                rfiNumber,
                title,
                discipline,
                location,
                contractor,
                inspector,
                requestDate,
                inspectionDate,
                status,
                description
              }
            : item
        )
      );
    } else {
      // Pick standard checklist items if available
      const stdChecklist = standardChecklists.find(
        (c) => c.discipline === discipline || getDisciplineLabel(c.discipline) === getDisciplineLabel(discipline)
      );
      const defaultChecklistItems = stdChecklist
        ? stdChecklist.items.map((it, idx) => ({
            id: `c_${Date.now()}_${idx}`,
            title: it,
            isMandatory: true,
            status: 'PENDING' as const
          }))
        : [
            { id: `c_default_${Date.now()}_1`, title: 'انطباق ابعادی و مشخصات نقشه', isMandatory: true, status: 'PENDING' as const },
            { id: `c_default_${Date.now()}_2`, title: 'تمیزی و بستر آماده اجرای کار', isMandatory: true, status: 'PENDING' as const }
          ];

      const newInspection: QCInspection = {
        id: `insp_${Date.now()}`,
        rfiNumber,
        projectId: selectedProjectId,
        title,
        discipline,
        location,
        contractor: contractor || 'شرکت پیمانکار پروژه',
        inspector: inspector || 'دستگاه نظارت مقیم',
        requestDate: requestDate || new Date().toLocaleDateString('fa-IR'),
        inspectionDate: inspectionDate || '',
        status: status || 'PENDING',
        checklists: defaultChecklistItems,
        description,
        createdAt: new Date().toLocaleDateString('fa-IR'),
        workflowStatus: WorkflowStatus.DRAFT,
        createdById: currentUser?.id || 'u-contractor-1',
        ownerOrgId: currentUser?.orgId || 'org-contractor',
        currentOrgId: currentUser?.orgId || 'org-contractor',
        workflowHistory: []
      };
      setInspections((prev) => [newInspection, ...prev]);
    }

    setIsInspectionModalOpen(false);
    setEditingInspection(null);
    setRfiRequestDate('');
    setRfiInspectionDate('');
  };

  // Handle Inspection Status Update Directly
  const handleUpdateInspectionStatus = (inspectionId: string, newStatus: QCInspectionStatus) => {
    setInspections((prev) =>
      prev.map((insp) => (insp.id === inspectionId ? { ...insp, status: newStatus } : insp))
    );
    if (activeInspectionForEval && activeInspectionForEval.id === inspectionId) {
      setActiveInspectionForEval((prev) => (prev ? { ...prev, status: newStatus } : null));
    }
  };

  // Handle Checklist Items Status Update
  const toggleChecklistItem = (
    inspectionId: string,
    itemId: string,
    nextStatus: 'PASSED' | 'FAILED' | 'NOT_APPLICABLE' | 'PENDING' | 'CONDITIONAL' | 'APPROVED' | 'REJECTED'
  ) => {
    setInspections((prev) =>
      prev.map((insp) => {
        if (insp.id !== inspectionId) return insp;
        const updatedChecklists = insp.checklists.map((chk) =>
          chk.id === itemId ? { ...chk, status: nextStatus as any } : chk
        );

        let newOverallStatus: QCInspectionStatus = insp.status;
        const hasFailed = updatedChecklists.some((c) => c.status === 'FAILED' || c.status === 'REJECTED');
        const hasConditional = updatedChecklists.some((c) => c.status === 'CONDITIONAL');
        const allPassed = updatedChecklists.every((c) => c.status === 'PASSED' || c.status === 'APPROVED');
        const allPending = updatedChecklists.every((c) => c.status === 'PENDING');

        if (hasFailed) {
          newOverallStatus = 'REJECTED';
        } else if (hasConditional) {
          newOverallStatus = 'CONDITIONAL';
        } else if (allPassed) {
          newOverallStatus = 'APPROVED';
        } else if (allPending) {
          newOverallStatus = 'PENDING';
        }

        return { ...insp, checklists: updatedChecklists, status: newOverallStatus };
      })
    );
    if (activeInspectionForEval && activeInspectionForEval.id === inspectionId) {
      setActiveInspectionForEval((prev) => {
        if (!prev) return null;
        const updatedChecklists = prev.checklists.map((chk) =>
          chk.id === itemId ? { ...chk, status: nextStatus as any } : chk
        );

        let newOverallStatus: QCInspectionStatus = prev.status;
        const hasFailed = updatedChecklists.some((c) => c.status === 'FAILED' || c.status === 'REJECTED');
        const hasConditional = updatedChecklists.some((c) => c.status === 'CONDITIONAL');
        const allPassed = updatedChecklists.every((c) => c.status === 'PASSED' || c.status === 'APPROVED');
        const allPending = updatedChecklists.every((c) => c.status === 'PENDING');

        if (hasFailed) {
          newOverallStatus = 'REJECTED';
        } else if (hasConditional) {
          newOverallStatus = 'CONDITIONAL';
        } else if (allPassed) {
          newOverallStatus = 'APPROVED';
        } else if (allPending) {
          newOverallStatus = 'PENDING';
        }

        return {
          ...prev,
          checklists: updatedChecklists,
          status: newOverallStatus
        };
      });
    }
  };

  // Handle Save NCR
  const handleSaveNcr = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const isContractorUser = userOrgType === 'CONTRACTOR' || currentUser?.role === 'SYSTEM_ADMIN';
    const isConsultantUser = userOrgType === 'CONSULTANT' || currentUser?.role === 'SYSTEM_ADMIN';
    const isEmployerUser = userOrgType === 'EMPLOYER' || currentUser?.role === 'SYSTEM_ADMIN';

    const ncrNumber = (isContractorRestricted && editingNcr) ? editingNcr.ncrNumber : ((formData.get('ncrNumber') as string) || `NCR-1403-${Math.floor(100 + Math.random() * 900)}`);
    const title = (isContractorRestricted && editingNcr) ? editingNcr.title : ((formData.get('title') as string) || '');
    const location = (isContractorRestricted && editingNcr) ? editingNcr.location : ((formData.get('location') as string) || '');
    const discipline = (isContractorRestricted && editingNcr) ? editingNcr.discipline : ((formData.get('discipline') as QCDiscipline) || 'CONCRETE');
    const severity = (isContractorRestricted && editingNcr) ? editingNcr.severity : ((formData.get('severity') as NCRSeverity) || 'HIGH');
    const issueDate = (isNcrRestricted && editingNcr) ? editingNcr.issueDate : (ncrIssueDate || (formData.get('issueDate') as string) || '1403/02/25');
    const deadlineDate = (isDeadlineDisabled && editingNcr) ? editingNcr.deadlineDate : (ncrDeadlineDate || (formData.get('deadlineDate') as string) || '');
    const issuedBy = (isNcrRestricted && editingNcr) ? editingNcr.issuedBy : (formData.get('issuedBy') as string);
    const responsibleParty = (isNcrRestricted && editingNcr) ? editingNcr.responsibleParty : (formData.get('responsibleParty') as string);
    const description = (isNcrRestricted && editingNcr) ? editingNcr.description : (formData.get('description') as string);
    const rootCause = (isNcrRestricted && editingNcr) ? editingNcr.rootCause : (formData.get('rootCause') as string);
    const rawStatus = (isStatusDisabled && editingNcr) ? editingNcr.status : ((formData.get('status') as NCRStatus) || 'OPEN');
    const validStatuses: NCRStatus[] = ['OPEN', 'CORRECTIVE_ACTION', 'VERIFICATION', 'CLOSED', 'REJECTED' as NCRStatus];
    const status = validStatuses.includes(rawStatus) ? rawStatus : 'OPEN';

    const correctiveActionContractor = isContractorUser
      ? (formData.get('correctiveActionContractor') as string || '')
      : (editingNcr?.correctiveActionContractor || '');

    const correctiveActionConsultant = isConsultantUser
      ? (formData.get('correctiveActionConsultant') as string || '')
      : (editingNcr?.correctiveActionConsultant || '');

    const correctiveActionEmployer = isEmployerUser
      ? (formData.get('correctiveActionEmployer') as string || '')
      : (editingNcr?.correctiveActionEmployer || '');

    // Combine them for backward compatibility with general correctiveAction field
    const correctiveAction = correctiveActionContractor || correctiveActionConsultant || correctiveActionEmployer || '';

    if (editingNcr) {
      setNcrs((prev) =>
        prev.map((item) =>
          item.id === editingNcr.id
            ? {
                ...item,
                ncrNumber,
                title,
                location,
                discipline,
                severity,
                issueDate,
                deadlineDate,
                issuedBy,
                responsibleParty,
                description,
                rootCause,
                correctiveAction,
                correctiveActionContractor,
                correctiveActionConsultant,
                correctiveActionEmployer,
                status
              }
            : item
        )
      );
    } else {
      const newNcr: NonConformanceReport = {
        id: `ncr_${Date.now()}`,
        ncrNumber,
        projectId: selectedProjectId,
        title,
        location,
        discipline,
        severity,
        issueDate: issueDate || '1403/02/25',
        deadlineDate: deadlineDate || '1403/03/05',
        issuedBy: issuedBy || 'دستگاه نظارت عالیه',
        responsibleParty: responsibleParty || 'پیمانکار عمومی',
        description,
        rootCause,
        correctiveAction,
        correctiveActionContractor,
        correctiveActionConsultant,
        correctiveActionEmployer,
        status: status || 'OPEN',
        workflowStatus: WorkflowStatus.DRAFT,
        createdById: currentUser?.id || 'u-contractor-1',
        ownerOrgId: currentUser?.orgId || 'org-contractor',
        currentOrgId: currentUser?.orgId || 'org-contractor',
        workflowHistory: []
      };
      setNcrs((prev) => [newNcr, ...prev]);
    }

    setIsNcrModalOpen(false);
    setEditingNcr(null);
    setNcrIssueDate('');
    setNcrDeadlineDate('');
  };

  // Handle Save Lab Test
  const handleSaveLabTest = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const testNumber = (formData.get('testNumber') as string) || `LAB-${Math.floor(100 + Math.random() * 900)}`;
    const testType = (formData.get('testType') as string) || 'آزمایش مقاومت بتن';
    const sampleLocation = (formData.get('sampleLocation') as string) || '';
    const samplingDate = labSamplingDate || (formData.get('samplingDate') as string) || '1403/02/20';
    const testDate = labTestDate || (formData.get('testDate') as string) || '1403/02/22';
    const designSpecification = (formData.get('designSpecification') as string) || '';
    const resultValue = (formData.get('resultValue') as string) || '';

    let consultantComplianceStatus: 'COMPLIANT' | 'NON_COMPLIANT' | 'CONDITIONAL' | 'PENDING' = editingLabTest?.consultantComplianceStatus || 'PENDING';
    let employerComplianceStatus: 'COMPLIANT' | 'NON_COMPLIANT' | 'CONDITIONAL' | 'PENDING' = editingLabTest?.employerComplianceStatus || 'PENDING';

    const rawConsultant = formData.get('consultantComplianceStatus') as string;
    if (rawConsultant && (rawConsultant === 'COMPLIANT' || rawConsultant === 'NON_COMPLIANT' || rawConsultant === 'CONDITIONAL' || rawConsultant === 'PENDING')) {
      consultantComplianceStatus = rawConsultant as any;
    }

    const rawEmployer = formData.get('employerComplianceStatus') as string;
    if (rawEmployer && (rawEmployer === 'COMPLIANT' || rawEmployer === 'NON_COMPLIANT' || rawEmployer === 'CONDITIONAL' || rawEmployer === 'PENDING')) {
      employerComplianceStatus = rawEmployer as any;
    }

    const rawComp = formData.get('complianceStatus') as string;
    if (rawComp && (rawComp === 'COMPLIANT' || rawComp === 'NON_COMPLIANT' || rawComp === 'CONDITIONAL' || rawComp === 'PENDING')) {
      if (userOrgType === 'CONSULTANT') consultantComplianceStatus = rawComp as any;
      if (userOrgType === 'EMPLOYER') employerComplianceStatus = rawComp as any;
    }

    // Employer's opinion is the primary criterion for final compliance
    const complianceStatus = employerComplianceStatus !== 'PENDING' ? employerComplianceStatus : consultantComplianceStatus;
    const isCompliant = complianceStatus === 'COMPLIANT' || complianceStatus === 'CONDITIONAL';
    const labName = formData.get('labName') as string;
    const approvedBy = formData.get('approvedBy') as string;

    if (editingLabTest) {
      setLabTests((prev) =>
        prev.map((item) =>
          item.id === editingLabTest.id
            ? {
                ...item,
                testNumber,
                testType,
                sampleLocation,
                samplingDate,
                testDate,
                designSpecification,
                resultValue,
                isCompliant,
                consultantComplianceStatus,
                employerComplianceStatus,
                complianceStatus,
                labName: labName || 'آزمایشگاه کارگاهی',
                approvedBy: approvedBy || 'سرپرست آزمایشگاه'
              }
            : item
        )
      );
    } else {
      const newLabTest: QCLabTest = {
        id: `lab_${Date.now()}`,
        testNumber,
        projectId: selectedProjectId,
        testType,
        sampleLocation,
        samplingDate: samplingDate || '1403/02/20',
        testDate: testDate || '1403/02/22',
        designSpecification,
        resultValue,
        isCompliant,
        consultantComplianceStatus,
        employerComplianceStatus,
        complianceStatus,
        labName: labName || 'آزمایشگاه کارگاهی',
        approvedBy: approvedBy || 'سرپرست آزمایشگاه',
        workflowStatus: WorkflowStatus.DRAFT,
        createdById: currentUser?.id || 'u-contractor-1',
        ownerOrgId: currentUser?.orgId || 'org-contractor',
        currentOrgId: currentUser?.orgId || 'org-contractor',
        workflowHistory: []
      };
      setLabTests((prev) => [newLabTest, ...prev]);
    }

    setIsLabTestModalOpen(false);
    setEditingLabTest(null);
    setLabSamplingDate('');
    setLabTestDate('');
  };

  // Status Badge Renderers
  const getInspectionStatusBadge = (statusOrInsp: QCInspectionStatus | QCInspection) => {
    const effStatus = typeof statusOrInsp === 'object' ? getEffectiveInspectionStatus(statusOrInsp) : statusOrInsp;
    switch (effStatus) {
      case 'APPROVED':
      case 'PASSED':
      case WorkflowStatus.APPROVED_BY_EMPLOYER:
      case WorkflowStatus.APPROVED_BY_CONSULTANT:
      case WorkflowStatus.APPROVED_INTERNAL:
        return <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-full text-[11px] font-black flex items-center gap-1.5"><CheckCircle2 size={13} /> تایید شده</span>;
      case 'CONDITIONAL':
        return <span className="px-3 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 rounded-full text-[11px] font-black flex items-center gap-1.5"><AlertCircle size={13} /> تایید مشروط</span>;
      case 'REJECTED':
      case 'FAILED':
      case WorkflowStatus.REJECTED:
        return <span className="px-3 py-1 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800 rounded-full text-[11px] font-black flex items-center gap-1.5"><XCircle size={13} /> عدم تایید / رد</span>;
      case 'PENDING':
        return <span className="px-3 py-1 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-full text-[11px] font-black flex items-center gap-1.5"><Clock size={13} /> در انتظار بازرسی</span>;
      default:
        return <span className="px-3 py-1 bg-stone-100 text-stone-700 rounded-full text-[11px] font-black">در حال اقدام</span>;
    }
  };

  const getNcrSeverityBadge = (severity: NCRSeverity) => {
    switch (severity) {
      case 'CRITICAL':
        return <span className="px-2.5 py-0.5 bg-rose-600 text-white rounded-md text-[10px] font-black shadow-xs">بحرانی</span>;
      case 'HIGH':
        return <span className="px-2.5 py-0.5 bg-amber-600 text-white rounded-md text-[10px] font-black shadow-xs">شدید</span>;
      case 'MEDIUM':
        return <span className="px-2.5 py-0.5 bg-amber-500 text-stone-950 rounded-md text-[10px] font-black shadow-xs">متوسط</span>;
      case 'LOW':
        return <span className="px-2.5 py-0.5 bg-blue-500 text-white rounded-md text-[10px] font-black shadow-xs">جزیی</span>;
    }
  };

  const getNcrStatusLabel = (status: NCRStatus) => {
    switch (status) {
      case 'OPEN':
        return 'صادر شده (مفتوح)';
      case 'CORRECTIVE_ACTION':
        return 'در حال اقدام اصلاحی';
      case 'VERIFICATION':
        return 'در حال ارزیابی مجدد';
      case 'CLOSED':
        return 'بسته شده (مختوم)';
      case 'REJECTED':
        return 'رد شده';
      default:
        return 'صادر شده (مفتوح)';
    }
  };

  const getNcrStatusBadge = (status: NCRStatus) => {
    switch (status) {
      case 'OPEN':
        return <span className="px-3 py-1 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 rounded-full text-[11px] font-black">صادر شده (مفتوح)</span>;
      case 'CORRECTIVE_ACTION':
        return <span className="px-3 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 rounded-full text-[11px] font-black">در حال اقدام اصلاحی</span>;
      case 'VERIFICATION':
        return <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-200 rounded-full text-[11px] font-black">در حال ارزیابی مجدد</span>;
      case 'CLOSED':
        return <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 rounded-full text-[11px] font-black">بسته شده (مختوم)</span>;
      case 'REJECTED':
        return <span className="px-3 py-1 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 rounded-full text-[11px] font-black">رد شده</span>;
      default:
        return <span className="px-3 py-1 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 rounded-full text-[11px] font-black">صادر شده (مفتوح)</span>;
    }
  };

  const getComplianceStatusText = (
    status?: 'COMPLIANT' | 'NON_COMPLIANT' | 'CONDITIONAL' | 'PENDING' | boolean,
    isEmployerField?: boolean | 'final'
  ) => {
    if (status === 'COMPLIANT' || status === true) return 'منطبق بر مشخصات فنی (مورد تایید)';
    if (status === 'NON_COMPLIANT' || status === false) return 'عدم انطباق با مشخصات فنی (مردود)';
    if (status === 'CONDITIONAL') return 'تایید مشروط (با ملاحظات)';
    if (status === 'PENDING') {
      if (isEmployerField === 'final') return 'در انتظار بررسی (در دست اقدام)';
      return isEmployerField ? 'در انتظار نظر کارفرما' : 'در انتظار بررسی مشاور';
    }
    if (isEmployerField === 'final') return 'در انتظار بررسی (در دست اقدام)';
    return isEmployerField ? 'ثبت نشده (در انتظار نظر کارفرما)' : 'ثبت نشده (در انتظار بررسی مشاور)';
  };

  const getEffectiveComplianceStatus = (lab: QCLabTest): 'COMPLIANT' | 'NON_COMPLIANT' | 'CONDITIONAL' | 'PENDING' => {
    if (lab.employerComplianceStatus && lab.employerComplianceStatus !== 'PENDING') {
      return lab.employerComplianceStatus;
    }
    if (lab.consultantComplianceStatus && lab.consultantComplianceStatus !== 'PENDING') {
      return lab.consultantComplianceStatus;
    }
    if (lab.complianceStatus && lab.complianceStatus !== 'PENDING') {
      return lab.complianceStatus;
    }
    // If employer and consultant statuses are explicitly set to PENDING or undefined, the effective status is PENDING
    if (
      (!lab.employerComplianceStatus || lab.employerComplianceStatus === 'PENDING') &&
      (!lab.consultantComplianceStatus || lab.consultantComplianceStatus === 'PENDING') &&
      (!lab.complianceStatus || lab.complianceStatus === 'PENDING')
    ) {
      return 'PENDING';
    }
    if (lab.isCompliant === true) return 'COMPLIANT';
    if (lab.isCompliant === false) return 'NON_COMPLIANT';
    return 'PENDING';
  };

  const renderComplianceBadge = (status?: 'COMPLIANT' | 'NON_COMPLIANT' | 'CONDITIONAL' | 'PENDING', labelPrefix?: string) => {
    if (status === 'COMPLIANT') {
      return (
        <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-full text-[10px] font-black inline-flex items-center gap-1">
          <CheckCircle2 size={11} /> {labelPrefix ? `${labelPrefix}: ` : ''}منطبق
        </span>
      );
    }
    if (status === 'NON_COMPLIANT') {
      return (
        <span className="px-2 py-0.5 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800 rounded-full text-[10px] font-black inline-flex items-center gap-1">
          <XCircle size={11} /> {labelPrefix ? `${labelPrefix}: ` : ''}عدم انطباق
        </span>
      );
    }
    if (status === 'CONDITIONAL') {
      return (
        <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 rounded-full text-[10px] font-black inline-flex items-center gap-1">
          <AlertCircle size={11} /> {labelPrefix ? `${labelPrefix}: ` : ''}تایید مشروط
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 bg-stone-100 dark:bg-slate-800 text-stone-500 border border-stone-200 dark:border-slate-700 rounded-full text-[10px] font-bold inline-flex items-center gap-1">
        <Clock size={11} /> {labelPrefix ? `${labelPrefix}: ` : ''}در انتظار بررسی
      </span>
    );
  };

  const handleUpdateLabCompliance = (
    labId: string,
    targetOrg: 'CONSULTANT' | 'EMPLOYER',
    newStatus: 'COMPLIANT' | 'NON_COMPLIANT' | 'CONDITIONAL' | 'PENDING'
  ) => {
    setLabTests((prev) =>
      prev.map((item) => {
        if (item.id !== labId) return item;

        const consultantStatus = targetOrg === 'CONSULTANT' ? newStatus : (item.consultantComplianceStatus || (item.employerComplianceStatus ? 'PENDING' : item.complianceStatus || 'PENDING'));
        const employerStatus = targetOrg === 'EMPLOYER' ? newStatus : (item.employerComplianceStatus || 'PENDING');

        // Employer is the ultimate authority ("ملاک تایید نهایی نظر کارفرما است")
        const finalCompliance = employerStatus !== 'PENDING' ? employerStatus : consultantStatus;
        const isCompliant = finalCompliance === 'COMPLIANT' || finalCompliance === 'CONDITIONAL';

        return {
          ...item,
          consultantComplianceStatus: consultantStatus,
          employerComplianceStatus: employerStatus,
          complianceStatus: finalCompliance,
          isCompliant
        };
      })
    );
  };

  
  const getRoleSignatory = (roleKey: string, customData?: any) => {
    const users = SystemAdminService.getUsers();
    const proj = currentProject as any;
    const targetObj = customData || {};
    const history = (targetObj?.workflowHistory || []) as any[];

    const findEventForRole = (targetRoleKey: string): any => {
      const matchEvent = (e: any): boolean => {
        if (!e) return false;
        
        const nonSigningActions = ['REASSIGN', 'REJECT', 'RETURN_TO_CONTRACTOR', 'RETURN_TO_CONSULTANT'];
        if (nonSigningActions.includes(e.action)) return false;

        const actorUser = users.find(u => u.id === e.actorUserId || u.fullName === e.actorName || u.username === e.actorName);
        const orgId = e.actorOrgId || actorUser?.orgId;
        const orgType = e.actorOrgType || (actorUser as any)?.orgType || (orgId ? SystemAdminService.getOrganization(orgId)?.type : undefined);

        const isConsultantOrg = orgType === OrganizationType.CONSULTANT || (proj?.consultantOrgId && String(orgId) === String(proj.consultantOrgId));
        const isEmployerOrg = orgType === OrganizationType.EMPLOYER || (proj?.employerOrgId && String(orgId) === String(proj.employerOrgId));
        const isContractorOrg = !isConsultantOrg && !isEmployerOrg;

        if ((e.action === 'RESUBMIT' || e.action === 'SUBMIT') && !isContractorOrg) return false;

        if (e.roleKey) {
          if (e.roleKey === targetRoleKey) return true;
          return false;
        }

        const title = ((e.actorTitle || actorUser?.jobTitle || e.actorName || '') + ' ' + (actorUser?.jobLevel || '')).toLowerCase();

        if (targetRoleKey === 'contractor_tech') {
          if (e.action === 'CREATE' || e.action === 'SUBMIT' || e.action === 'RESUBMIT') {
            if (title.includes('سرپرست واحد') || title.includes('سرپرست کارگاه') || title.includes('مدیر پروژه') || title.includes('رئیس کارگاه')) return false;
            return true;
          }
          if (e.action === 'SIGN' || e.action === 'REPORT_SIGNATURE') {
            if (!isContractorOrg) return false;
            if (title.includes('سرپرست واحد') || title.includes('سرپرست کارگاه') || title.includes('مدیر پروژه') || title.includes('رئیس کارگاه')) return false;
            return title.includes('کارشناس') || title.includes('دفتر فنی') || title.includes('qc') || title.includes('کنترل کیفیت') || title.includes('تهیه');
          }
          return false;
        }

        if (targetRoleKey === 'contractor_head') {
          if (e.action === 'APPROVE' && e.fromStatus === WorkflowStatus.DRAFT) return true;
          if (e.action === 'SIGN' || e.action === 'REPORT_SIGNATURE') {
            if (!isContractorOrg) return false;
            if (title.includes('سرپرست کارگاه') || title.includes('مدیر پروژه') || title.includes('رئیس کارگاه')) return false;
            return title.includes('سرپرست واحد') || title.includes('سرپرست دفتر') || title.includes('رئیس دفتر') || title.includes('مدیر دفتر');
          }
          return false;
        }

        if (targetRoleKey === 'contractor_site') {
          if (e.action === 'SEND_TO_CONSULTANT' || (e.action === 'APPROVE' && e.toStatus === WorkflowStatus.APPROVED_INTERNAL)) return true;
          if (e.action === 'SIGN' || e.action === 'REPORT_SIGNATURE') {
            if (!isContractorOrg) return false;
            return title.includes('سرپرست کارگاه') || title.includes('مدیر پروژه') || title.includes('رئیس کارگاه') || title.includes('مدیر کارگاه');
          }
          return false;
        }

        if (targetRoleKey === 'consultant_tech') {
          if (e.action === 'APPROVE' || e.action === 'SIGN' || e.action === 'REPORT_SIGNATURE') {
            if (!isConsultantOrg) return false;
            if (title.includes('سرپرست واحد') || title.includes('سرپرست گروه') || title.includes('سرپرست نظارت') || title.includes('مدیر پروژه') || title.includes('سرپرست کارگاه')) return false;
            return title.includes('کارشناس') || title.includes('ناظر') || title.includes('مقیم') || title.includes('دفتر فنی');
          }
          return false;
        }

        if (targetRoleKey === 'consultant_head') {
          if (e.action === 'APPROVE' || e.action === 'SIGN' || e.action === 'REPORT_SIGNATURE' || e.action === 'SEND_TO_EMPLOYER') {
            if (!isConsultantOrg) return false;
            if (title.includes('سرپرست نظارت') || title.includes('مدیر پروژه') || title.includes('سرپرست کارگاه')) return false;
            return title.includes('سرپرست واحد') || title.includes('سرپرست گروه') || title.includes('رئیس گروه') || title.includes('مدیر واحد');
          }
          return false;
        }

        if (targetRoleKey === 'consultant') {
          if (e.action === 'SEND_TO_EMPLOYER' || (e.action === 'APPROVE' && e.toStatus === WorkflowStatus.APPROVED_BY_CONSULTANT)) return true;
          if (e.action === 'SIGN' || e.action === 'REPORT_SIGNATURE') {
            return isConsultantOrg || title.includes('مشاور') || title.includes('ناظر') || title.includes('نظارت');
          }
          return false;
        }

        if (targetRoleKey === 'employer_tech') {
          if (e.action === 'APPROVE' || e.action === 'SIGN' || e.action === 'REPORT_SIGNATURE') {
            if (!isEmployerOrg && !title.includes('کارفرما')) return false;
            if (title.includes('سرپرست واحد') || title.includes('مدیر گروه') || title.includes('مدیر طرح') || title.includes('نماینده')) return false;
            return title.includes('کارشناس') || title.includes('بررسی') || title.includes('فنی');
          }
          return false;
        }

        if (targetRoleKey === 'employer_head') {
          if (e.action === 'APPROVE' || e.action === 'SIGN' || e.action === 'REPORT_SIGNATURE' || e.action === 'FINAL_APPROVE') {
            if (!isEmployerOrg && !title.includes('کارفرما')) return false;
            if (title.includes('مدیر طرح') || title.includes('نماینده') || title.includes('مدیر پروژه')) return false;
            return title.includes('سرپرست واحد') || title.includes('مدیر گروه') || title.includes('رئیس اداره') || title.includes('سرپرست گروه');
          }
          return false;
        }

        if (targetRoleKey === 'employer' || targetRoleKey === 'employer_site') {
          if (e.action === 'FINAL_APPROVE' || e.action === 'APPROVE' || e.action === 'SIGN' || e.action === 'REPORT_SIGNATURE') {
            if (isEmployerOrg) {
              if (title.includes('کارشناس') && !title.includes('مدیر') && !title.includes('سرپرست') && !title.includes('نماینده')) return false;
              if (title.includes('سرپرست واحد') || title.includes('مدیر گروه')) return false;
              return true;
            }
            return title.includes('کارفرما') || title.includes('مدیر طرح') || title.includes('مجری') || title.includes('مدیر پروژه') || title.includes('نماینده');
          }
          return false;
        }

        return false;
      };

      return [...history].reverse().find(e => matchEvent(e));
    };

    const matchedEv = findEventForRole(roleKey);
    if (matchedEv && matchedEv.signature) {
      return {
        name: matchedEv.actorName || 'امضاء کننده گزارش',
        title: matchedEv.actorTitle || 'امضاء الکترونیکی',
        signature: matchedEv.signature,
        date: new Date(matchedEv.timestamp).toLocaleDateString('fa-IR')
      };
    }

    if (roleKey === 'contractor_tech') {
      return { name: 'کارشناس / مسئول QC', title: 'واحد کنترل کیفیت پیمانکار', signature: undefined, date: undefined };
    }
    if (roleKey === 'contractor_head') {
      return { name: 'سرپرست واحد فنی', title: 'سرپرست واحد فنی پیمانکار', signature: undefined, date: undefined };
    }
    if (roleKey === 'contractor_site') {
      return { name: 'سرپرست کارگاه / مدیر پروژه', title: 'سرپرست کارگاه پیمانکار', signature: undefined, date: undefined };
    }
    if (roleKey === 'consultant_tech') {
      return { name: 'کارشناس / ناظر مقیم', title: 'دستگاه نظارت و مشاور', signature: undefined, date: undefined };
    }
    if (roleKey === 'consultant_head') {
      return { name: 'سرپرست واحد نظارت', title: 'دستگاه نظارت و مشاور', signature: undefined, date: undefined };
    }
    if (roleKey === 'consultant') {
      return { name: 'سرپرست نظارت / مدیر پروژه مشاور', title: 'دستگاه نظارت و مشاور', signature: undefined, date: undefined };
    }
    if (roleKey === 'employer_tech') {
      return { name: 'کارشناس / بررسی‌کننده', title: 'دستگاه اجرایی و کارفرما', signature: undefined, date: undefined };
    }
    if (roleKey === 'employer_head') {
      return { name: 'سرپرست واحد / مدیر گروه', title: 'دستگاه اجرایی و کارفرما', signature: undefined, date: undefined };
    }
    if (roleKey === 'employer') {
      return { name: 'مدیر طرح / نماینده کارفرما', title: 'دستگاه اجرایی و کارفرما', signature: undefined, date: undefined };
    }

    return null;
  };

  const renderPrintSignatureBox = (roleHeader: string, roleKey: string, customData?: any) => {
    const signatory = getRoleSignatory(roleKey, customData);
    if (signatory && signatory.signature) {
      return `
        <div class="sig-box" style="flex: 1 1 0%; min-width: 0; text-align: center; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 4px; padding: 3px 2px; box-sizing: border-box; overflow: hidden;">
          <div style="font-weight: bold; font-size: 8px; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 1px; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${roleHeader}">${roleHeader}</div>
          <div style="height: 30px; display: flex; align-items: center; justify-content: center; margin: 1px 0;">
            <img src="${signatory.signature}" style="max-height: 26px; max-width: 100%; object-fit: contain; filter: contrast(120%);" alt="امضای دیجیتال" />
          </div>
          <div style="font-size: 7.5px; font-weight: bold; color: #1e293b; margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${signatory.name}">${signatory.name}</div>
          <div style="font-size: 6.5px; color: #059669; font-weight: bold; margin-top: 1px;">✓ امضاء معتبر</div>
          <div style="font-size: 6.5px; color: #64748b;">${signatory.date || new Date().toLocaleDateString('fa-IR')}</div>
        </div>
      `;
    }
    
    const personName = signatory?.name ? `<div style="font-size: 7.5px; font-weight: bold; color: #334155; margin-bottom: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${signatory.name}">${signatory.name}</div>` : '';

    return `
      <div class="sig-box" style="flex: 1 1 0%; min-width: 0; text-align: center; background: #ffffff; border: 1px dashed #cbd5e1; border-radius: 4px; padding: 3px 2px; box-sizing: border-box; overflow: hidden;">
        <p style="font-weight: bold; font-size: 8px; margin: 0 0 1px 0; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${roleHeader}">${roleHeader}</p>
        ${personName}
        <div style="height: 26px; display: flex; align-items: center; justify-content: center; font-size: 7px; color: #94a3b8; font-style: italic;">مهر / امضاء</div>
        <div class="sig-line" style="border-top: 1px dashed #cbd5e1; padding-top: 1px; font-size: 7px; color: #64748b;">نام و امضاء</div>
      </div>
    `;
  };

  const renderPrintSignatureFooter = (customData?: any) => `
    <div class="footer" style="margin-top: 20px; border-top: 2px solid #64748b; padding-top: 10px; width: 100%; page-break-inside: avoid; break-inside: avoid;">
      <div style="display: flex; flex-direction: row; justify-content: space-between; gap: 6px; width: 100%; box-sizing: border-box;">
        <!-- 1. پیمانکار -->
        <div style="flex: 1 1 0%; min-width: 0; border: 1px solid #93c5fd; background: #eff6ff; border-radius: 6px; padding: 4px; box-sizing: border-box;">
          <div style="font-weight: bold; font-size: 9px; color: #1e40af; text-align: center; border-bottom: 1px solid #bfdbfe; padding-bottom: 2px; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            پیمانکار: ${currentProject?.contractorName || 'سازمان پیمانکار'}
          </div>
          <div style="display: flex; flex-direction: row; gap: 3px; width: 100%;">
            ${renderPrintSignatureBox("کارشناس / تنظیم‌کننده", "contractor_tech", customData)}
            ${renderPrintSignatureBox("سرپرست واحد فنی", "contractor_head", customData)}
            ${renderPrintSignatureBox("سرپرست کارگاه / مدیر پروژه", "contractor_site", customData)}
          </div>
        </div>

        <!-- 2. دستگاه نظارت و مشاور -->
        <div style="flex: 1 1 0%; min-width: 0; border: 1px solid #6ee7b7; background: #ecfdf5; border-radius: 6px; padding: 4px; box-sizing: border-box;">
          <div style="font-weight: bold; font-size: 9px; color: #065f46; text-align: center; border-bottom: 1px solid #a7f3d0; padding-bottom: 2px; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            مشاور: ${currentProject?.consultantName || 'دستگاه نظارت و مشاور'}
          </div>
          <div style="display: flex; flex-direction: row; gap: 3px; width: 100%;">
            ${renderPrintSignatureBox("کارشناس / ناظر مقیم", "consultant_tech", customData)}
            ${renderPrintSignatureBox("سرپرست واحد نظارت", "consultant_head", customData)}
            ${renderPrintSignatureBox("سرپرست نظارت / مدیر پروژه", "consultant", customData)}
          </div>
        </div>

        <!-- 3. دستگاه اجرایی و کارفرما -->
        <div style="flex: 1 1 0%; min-width: 0; border: 1px solid #d8b4fe; background: #faf5ff; border-radius: 6px; padding: 4px; box-sizing: border-box;">
          <div style="font-weight: bold; font-size: 9px; color: #6b21a8; text-align: center; border-bottom: 1px solid #e9d5ff; padding-bottom: 2px; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            کارفرما: ${currentProject?.employerName || 'دستگاه اجرایی و کارفرما'}
          </div>
          <div style="display: flex; flex-direction: row; gap: 3px; width: 100%;">
            ${renderPrintSignatureBox("کارشناس / بررسی‌کننده", "employer_tech", customData)}
            ${renderPrintSignatureBox("سرپرست واحد / مدیر گروه", "employer_head", customData)}
            ${renderPrintSignatureBox("مدیر طرح / نماینده کارفرما", "employer", customData)}
          </div>
        </div>
      </div>
    </div>
  `;

  const renderSigCard = (label: string, data: { name: string; title: string; signature?: string; date?: string } | null) => (
    <div 
      className="sig-card border border-stone-200 rounded-md p-1 bg-white flex flex-col justify-between min-h-[105px] text-right overflow-hidden shadow-2xs"
      style={{ minHeight: '100px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: '1px solid #cbd5e1', borderRadius: '5px', padding: '4px', background: '#ffffff', boxSizing: 'border-box' }}
    >
      <div>
        <div className="font-black text-stone-900 text-[8.5px] leading-tight truncate text-center" title={label}>{label}</div>
        {data?.name && (
          <div className="text-[8px] text-stone-700 font-bold mt-0.5 bg-stone-100 px-0.5 py-0.5 rounded text-center truncate" title={data.name}>
            {data.name}
          </div>
        )}
      </div>

      {data?.signature ? (
        <div className="my-0.5 flex flex-col items-center justify-center">
          <img src={data.signature} alt={label} className="max-h-7 max-w-[75px] object-contain filter contrast-125" style={{ maxHeight: '28px', maxWidth: '75px', objectFit: 'contain' }} />
          <div className="text-[7px] text-emerald-700 font-bold flex items-center gap-0.5 mt-0.5">
            <CheckCircle2 size={8} />
            <span className="truncate">امضاء معتبر</span>
          </div>
        </div>
      ) : (
        <div className="my-1 text-center">
          <div className="text-stone-400 text-[8px] italic">مهر / امضاء</div>
        </div>
      )}

      <div className="border-t border-stone-200 pt-0.5 text-[7.5px] text-stone-500 text-center font-mono truncate" style={{ borderTop: '1px solid #e2e8f0', paddingTop: '2px', fontSize: '7.5px' }}>
        {data?.date ? data.date : 'نام و امضاء'}
      </div>
    </div>
  );

  const renderQC9BoxSignaturesUI = (targetObj?: any) => (
    <div className="mt-8 pt-4 border-t-2 border-stone-300 w-full page-break-inside-avoid print:mt-4 print:pt-2 text-right font-['Vazirmatn']" dir="rtl" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
      <div className="text-[11px] font-black text-stone-800 mb-2 flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
        <span>تاییدات و امضاهای ارکان پروژه (گزارش رسمی و مدیریتی)</span>
      </div>

      <div className="grid grid-cols-3 gap-2 w-full text-right dir-rtl" style={{ display: 'flex', flexDirection: 'row', width: '100%', gap: '6px' }}>
        {/* 1. پیمانکار */}
        <div className="sig-org-box border border-blue-200 bg-blue-50/20 rounded-lg p-1.5 flex flex-col justify-between" style={{ flex: '1 1 0%', minWidth: '0', border: '1px solid #bfdbfe', background: '#f8fafc', borderRadius: '6px', padding: '5px' }}>
          <div className="font-bold text-[9.5px] text-blue-900 border-b border-blue-200 pb-1 mb-1.5 text-center flex items-center justify-center gap-1 truncate" style={{ borderBottom: '1px solid #bfdbfe', paddingBottom: '3px', marginBottom: '4px', fontSize: '9px', fontWeight: 'bold', color: '#1e3a8a' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 flex-shrink-0"></span>
            <span className="truncate">پیمانکار: {currentProject?.contractorName || 'سازمان پیمانکار'}</span>
          </div>
          <div className="grid grid-cols-3 gap-1" style={{ display: 'flex', flexDirection: 'row', gap: '4px' }}>
            <div style={{ flex: '1 1 0%', minWidth: '0' }}>{renderSigCard("کارشناس / تنظیم‌کننده", getRoleSignatory("contractor_tech", targetObj))}</div>
            <div style={{ flex: '1 1 0%', minWidth: '0' }}>{renderSigCard("سرپرست واحد فنی", getRoleSignatory("contractor_head", targetObj))}</div>
            <div style={{ flex: '1 1 0%', minWidth: '0' }}>{renderSigCard("سرپرست کارگاه / مدیر پروژه", getRoleSignatory("contractor_site", targetObj))}</div>
          </div>
        </div>

        {/* 2. دستگاه نظارت و مشاور */}
        <div className="sig-org-box border border-emerald-200 bg-emerald-50/20 rounded-lg p-1.5 flex flex-col justify-between" style={{ flex: '1 1 0%', minWidth: '0', border: '1px solid #a7f3d0', background: '#f8fafc', borderRadius: '6px', padding: '5px' }}>
          <div className="font-bold text-[9.5px] text-emerald-900 border-b border-emerald-200 pb-1 mb-1.5 text-center flex items-center justify-center gap-1 truncate" style={{ borderBottom: '1px solid #a7f3d0', paddingBottom: '3px', marginBottom: '4px', fontSize: '9px', fontWeight: 'bold', color: '#065f46' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 flex-shrink-0"></span>
            <span className="truncate">مشاور: {currentProject?.consultantName || 'دستگاه نظارت و مشاور'}</span>
          </div>
          <div className="grid grid-cols-3 gap-1" style={{ display: 'flex', flexDirection: 'row', gap: '4px' }}>
            <div style={{ flex: '1 1 0%', minWidth: '0' }}>{renderSigCard("کارشناس / ناظر مقیم", getRoleSignatory("consultant_tech", targetObj))}</div>
            <div style={{ flex: '1 1 0%', minWidth: '0' }}>{renderSigCard("سرپرست واحد نظارت", getRoleSignatory("consultant_head", targetObj))}</div>
            <div style={{ flex: '1 1 0%', minWidth: '0' }}>{renderSigCard("سرپرست نظارت / مدیر پروژه", getRoleSignatory("consultant", targetObj))}</div>
          </div>
        </div>

        {/* 3. دستگاه اجرایی و کارفرما */}
        <div className="sig-org-box border border-purple-200 bg-purple-50/20 rounded-lg p-1.5 flex flex-col justify-between" style={{ flex: '1 1 0%', minWidth: '0', border: '1px solid #e9d5ff', background: '#f8fafc', borderRadius: '6px', padding: '5px' }}>
          <div className="font-bold text-[9.5px] text-purple-900 border-b border-purple-200 pb-1 mb-1.5 text-center flex items-center justify-center gap-1 truncate" style={{ borderBottom: '1px solid #e9d5ff', paddingBottom: '3px', marginBottom: '4px', fontSize: '9px', fontWeight: 'bold', color: '#581c87' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-purple-600 flex-shrink-0"></span>
            <span className="truncate">کارفرما: {currentProject?.employerName || 'دستگاه اجرایی و کارفرما'}</span>
          </div>
          <div className="grid grid-cols-3 gap-1" style={{ display: 'flex', flexDirection: 'row', gap: '4px' }}>
            <div style={{ flex: '1 1 0%', minWidth: '0' }}>{renderSigCard("کارشناس / بررسی‌کننده", getRoleSignatory("employer_tech", targetObj))}</div>
            <div style={{ flex: '1 1 0%', minWidth: '0' }}>{renderSigCard("سرپرست واحد / مدیر گروه", getRoleSignatory("employer_head", targetObj))}</div>
            <div style={{ flex: '1 1 0%', minWidth: '0' }}>{renderSigCard("مدیر طرح / نماینده کارفرما", getRoleSignatory("employer", targetObj))}</div>
          </div>
        </div>
      </div>
    </div>
  );

  const handlePrintOfficial = (type: 'rfi' | 'ncr' | 'lab', data: QCInspection | NonConformanceReport | QCLabTest | null) => {
    if (!data) return;
    const history = (data as any)?.workflowHistory || [];

    const projectTitle = currentProject?.title || "---";
    const projectEmployer = currentProject?.employerName || "---";
    const projectConsultant = currentProject?.consultantName || "---";
    const projectContractor = currentProject?.contractorName || "---";
    const contractNumber = currentProject?.contractNumber || "---";

    const qcLogos = SystemAdminService.getProjectOrgLogos(currentProject);
    const qcLogoHtml = [
      qcLogos.employerLogo ? `<img src="${qcLogos.employerLogo}" style="height: 42px; max-width: 95px; object-fit: contain;" alt="کارفرما" />` : '',
      qcLogos.consultantLogo ? `<img src="${qcLogos.consultantLogo}" style="height: 42px; max-width: 95px; object-fit: contain;" alt="مشاور" />` : '',
      qcLogos.contractorLogo ? `<img src="${qcLogos.contractorLogo}" style="height: 42px; max-width: 95px; object-fit: contain;" alt="پیمانکار" />` : ''
    ].filter(Boolean).join('');

    const renderProjectHeader = (reportTitle: string, docNumber: string, docDate: string) => `
      <div style="border-bottom: 2px solid #1e40af; padding-bottom: 15px; margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <h2 style="margin: 0; color: #1e40af; font-size: 18px; font-weight: 900;">${reportTitle}</h2>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 15px; font-size: 12px; background: #f8fafc; padding: 10px; border-radius: 8px; direction: rtl;">
          <div><strong>پروژه:</strong> ${projectTitle}</div>
          <div><strong>شماره پیمان:</strong> ${contractNumber}</div>
          <div><strong>کارفرما:</strong> ${projectEmployer}</div>
          <div><strong>مشاور:</strong> ${projectConsultant}</div>
          <div><strong>پیمانکار:</strong> ${projectContractor}</div>
          <div><strong>شماره سند:</strong> ${docNumber}</div>
          <div><strong>تاریخ:</strong> ${docDate}</div>
        </div>
      </div>
    `;

    let title = "";
    let contentHtml = "";

    if (type === "rfi") {
      const insp = data as QCInspection;
      title = `درخواست بازرسی کیفی (RFI) - ${insp.rfiNumber}`;
      contentHtml = `
        ${renderProjectHeader("فرم رسمی درخواست بازرسی کیفی (RFI)", insp.rfiNumber, insp.inspectionDate || insp.requestDate || "---")}
        
        <div style="margin-top: 20px;">
          <h3 style="border-right: 4px solid #1e40af; padding-right: 10px; color: #1e40af; font-size: 13px;">۱. مشخصات عمومی درخواست بازرسی</h3>
          <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; text-align: center; direction: rtl;">
            <thead>
              <tr style="background: #f1f5f9;">
                <th style="padding: 8px; border: 1px solid #ddd; width: 20%;">کد RFI</th>
                <th style="padding: 8px; border: 1px solid #ddd;">موضوع بازرسی</th>
                <th style="padding: 8px; border: 1px solid #ddd; width: 20%;">موقعیت و محل دقیق</th>
                <th style="padding: 8px; border: 1px solid #ddd; width: 15%;">گرایش تخصصی</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; color: #1e40af;">${insp.rfiNumber}</td>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; text-align: right;">${insp.title}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${insp.location || '---'}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${getDisciplineLabel(insp.discipline)}</td>
              </tr>
            </tbody>
          </table>

          <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; text-align: center; direction: rtl;">
            <thead>
              <tr style="background: #f1f5f9;">
                <th style="padding: 8px; border: 1px solid #ddd; width: 25%;">درخواست‌کننده</th>
                <th style="padding: 8px; border: 1px solid #ddd; width: 25%;">تاریخ درخواست</th>
                <th style="padding: 8px; border: 1px solid #ddd; width: 25%;">تاریخ بازرسی</th>
                <th style="padding: 8px; border: 1px solid #ddd; width: 25%;">وضعیت بازرسی</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd;">${insp.contractor || 'پیمانکار'}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${insp.requestDate || '---'}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${insp.inspectionDate || '---'}</td>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; color: ${insp.isFinalFrozen || insp.workflowStatus === 'APPROVED_BY_EMPLOYER' ? '#16a34a' : 'inherit'};">
                  ${insp.isFinalFrozen || insp.workflowStatus === 'APPROVED_BY_EMPLOYER'
                    ? 'تایید نهایی و قطعی'
                    : (insp.status as any) === 'APPROVED'
                    ? 'تایید شده (مطابق با مشخصات)'
                    : (insp.status as any) === 'REJECTED'
                    ? 'عدم تایید (مردود)'
                    : (insp.status as any) === 'APPROVED_CONDITIONALLY' || (insp.status as any) === 'CONDITIONAL'
                    ? 'تایید مشروط با ملاحظات'
                    : 'معلق / در حال بررسی'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style="margin-top: 25px;">
          <h3 style="border-right: 4px solid #1e40af; padding-right: 10px; color: #1e40af; font-size: 13px;">۲. شرح عملیات و جزئیات بازرسی</h3>
          <div style="padding: 12px; border: 1px solid #ddd; border-radius: 8px; background: #fff; font-size: 11px; line-height: 1.8; text-align: right;">
            ${insp.description || 'توضیحات تکمیلی ثبت نشده است.'}
          </div>
        </div>

        ${insp.checklists && insp.checklists.length > 0 ? `
          <div style="margin-top: 25px;">
            <h3 style="border-right: 4px solid #1e40af; padding-right: 10px; color: #1e40af; font-size: 13px;">۳. چک‌لیست کنترلی و موارد مورد بررسی</h3>
            <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; text-align: center; direction: rtl;">
              <thead>
                <tr style="background: #f1f5f9;">
                  <th style="padding: 8px; border: 1px solid #ddd; width: 8%;">ردیف</th>
                  <th style="padding: 8px; border: 1px solid #ddd;">عنوان معیار کنترلی</th>
                  <th style="padding: 8px; border: 1px solid #ddd; width: 15%;">نتیجه بررسی</th>
                </tr>
              </thead>
              <tbody>
                ${insp.checklists.map((item, idx) => {
                  let statusText = 'مشروط / N/A';
                  let statusColor = '#d97706';
                  if (item.status === 'PASSED') {
                    statusText = 'قبول';
                    statusColor = '#16a34a';
                  } else if (item.status === 'FAILED') {
                    statusText = 'مردود';
                    statusColor = '#dc2626';
                  } else if (item.status === 'PENDING' || !insp.status || insp.status === 'PENDING') {
                    statusText = 'در انتظار نظر مشاور';
                    statusColor = '#78716c';
                  }
                  return `
                    <tr>
                      <td style="padding: 8px; border: 1px solid #ddd;">${(idx + 1).toLocaleString("fa-IR")}</td>
                      <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${item.title}</td>
                      <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; color: ${statusColor};">
                        ${statusText}
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}

        <div style="margin-top: 25px;">
          <h3 style="border-right: 4px solid #1e40af; padding-right: 10px; color: #1e40af; font-size: 13px;">۴. نتیجه و اعلام نظر دستگاه نظارت / مشاور</h3>
          <div style="padding: 12px; border: 1px solid #ddd; border-radius: 8px; background: #f8fafc; font-size: 11px; line-height: 1.8; text-align: right;">
            ${insp.inspectorComments || 'نظر و توضیحات دستگاه نظارت ثبت نشده است.'}
          </div>
        </div>
      `;
    } else if (type === "ncr") {
      const ncr = data as NonConformanceReport;
      title = `گزارش عدم انطباق (NCR) - ${ncr.ncrNumber}`;
      contentHtml = `
        ${renderProjectHeader("فرم رسمی گزارش عدم انطباق (NCR)", ncr.ncrNumber, ncr.issueDate || "---")}
        
        <div style="margin-top: 20px;">
          <h3 style="border-right: 4px solid #dc2626; padding-right: 10px; color: #991b1b; font-size: 13px;">۱. مشخصات عمومی عدم انطباق</h3>
          <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; text-align: center; direction: rtl;">
            <thead>
              <tr style="background: #fef2f2;">
                <th style="padding: 8px; border: 1px solid #ddd; width: 20%;">شماره NCR</th>
                <th style="padding: 8px; border: 1px solid #ddd;">عنوان عدم انطباق</th>
                <th style="padding: 8px; border: 1px solid #ddd; width: 20%;">موقعیت و محل دقیق</th>
                <th style="padding: 8px; border: 1px solid #ddd; width: 15%;">گرایش تخصصی</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; color: #dc2626;">${ncr.ncrNumber}</td>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; text-align: right;">${ncr.title}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${ncr.location || '---'}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${getDisciplineLabel(ncr.discipline)}</td>
              </tr>
            </tbody>
          </table>

          <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; text-align: center; direction: rtl;">
            <thead>
              <tr style="background: #fef2f2;">
                <th style="padding: 8px; border: 1px solid #ddd; width: 20%;">صادرکننده</th>
                <th style="padding: 8px; border: 1px solid #ddd; width: 20%;">طرف مسئول / پیمانکار</th>
                <th style="padding: 8px; border: 1px solid #ddd; width: 20%;">شدت عدم انطباق</th>
                <th style="padding: 8px; border: 1px solid #ddd; width: 20%;">مهلت رفع نقص</th>
                <th style="padding: 8px; border: 1px solid #ddd; width: 20%;">وضعیت</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd;">${ncr.issuedBy || 'دستگاه نظارت'}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${ncr.responsibleParty || 'پیمانکار'}</td>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; color: #dc2626;">
                  ${ncr.severity === 'CRITICAL' ? 'بسیار حاد (بحرانی)' : ncr.severity === 'HIGH' ? 'حاد (بالا)' : ncr.severity === 'MEDIUM' ? 'متوسط' : 'جزئی (پایین)'}
                </td>
                <td style="padding: 8px; border: 1px solid #ddd;">${ncr.deadlineDate || '---'}</td>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">
                  ${getNcrStatusLabel(ncr.status)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style="margin-top: 25px;">
          <h3 style="border-right: 4px solid #dc2626; padding-right: 10px; color: #991b1b; font-size: 13px;">۲. شرح عدم انطباق و علت ریشه‌ای</h3>
          <div style="padding: 12px; border: 1px solid #ddd; border-radius: 8px; background: #fff; font-size: 11px; line-height: 1.8; text-align: right; margin-bottom: 10px;">
            <strong>شرح کامل عیب:</strong> ${ncr.description || 'ثبت نشده است.'}
          </div>
          ${ncr.rootCause ? `
            <div style="padding: 12px; border: 1px solid #ddd; border-radius: 8px; background: #f8fafc; font-size: 11px; line-height: 1.8; text-align: right;">
              <strong>علت ریشه‌ای بروز عیب:</strong> ${ncr.rootCause}
            </div>
          ` : ''}
        </div>

        <div style="margin-top: 25px;">
          <h3 style="border-right: 4px solid #dc2626; padding-right: 10px; color: #991b1b; font-size: 13px;">۳. اقدامات اصلاحی پیشنهادی و دستورات سازمان‌ها</h3>
          <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; text-align: right; direction: rtl;">
            ${ncr.correctiveActionContractor ? `
              <tr>
                <td style="padding: 10px; border: 1px solid #ddd; background: #f0fdf4; font-weight: bold; width: 25%; color: #166534;">پیشنهاد پیمانکار:</td>
                <td style="padding: 10px; border: 1px solid #ddd; background: #f0fdf4;">${ncr.correctiveActionContractor}</td>
              </tr>
            ` : ''}
            ${ncr.correctiveActionConsultant ? `
              <tr>
                <td style="padding: 10px; border: 1px solid #ddd; background: #eff6ff; font-weight: bold; width: 25%; color: #1e40af;">دستور مشاور / نظارت:</td>
                <td style="padding: 10px; border: 1px solid #ddd; background: #eff6ff;">${ncr.correctiveActionConsultant}</td>
              </tr>
            ` : ''}
            ${ncr.correctiveActionEmployer ? `
              <tr>
                <td style="padding: 10px; border: 1px solid #ddd; background: #fffbeb; font-weight: bold; width: 25%; color: #92400e;">نظر کارفرما:</td>
                <td style="padding: 10px; border: 1px solid #ddd; background: #fffbeb;">${ncr.correctiveActionEmployer}</td>
              </tr>
            ` : ''}
            ${ncr.correctiveAction ? `
              <tr>
                <td style="padding: 10px; border: 1px solid #ddd; background: #f1f5f9; font-weight: bold; width: 25%;">اقدام اصلاحی نهایی مصوب:</td>
                <td style="padding: 10px; border: 1px solid #ddd; background: #f1f5f9; font-weight: bold;">${ncr.correctiveAction}</td>
              </tr>
            ` : ''}
          </table>
        </div>
      `;
    } else if (type === "lab") {
      const lab = data as QCLabTest;
      title = `شیت نتیجه آزمایشگاه - ${lab.testNumber}`;
      contentHtml = `
        ${renderProjectHeader("شیت رسمی نتایج آزمایشگاه و کنترل کیفیت", lab.testNumber, lab.testDate || lab.samplingDate || "---")}
        
        <div style="margin-top: 20px;">
          <h3 style="border-right: 4px solid #1e40af; padding-right: 10px; color: #1e40af; font-size: 13px;">۱. مشخصات عمومی آزمایشگاه و نمونه‌برداری</h3>
          <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; text-align: center; direction: rtl;">
            <thead>
              <tr style="background: #f1f5f9;">
                <th style="padding: 8px; border: 1px solid #ddd; width: 20%;">شماره شیت آزمایش</th>
                <th style="padding: 8px; border: 1px solid #ddd;">نوع آزمایش</th>
                <th style="padding: 8px; border: 1px solid #ddd; width: 25%;">موقعیت و بخش نمونه‌برداری</th>
                <th style="padding: 8px; border: 1px solid #ddd; width: 25%;">نام آزمایشگاه صادرکننده</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; color: #1e40af;">${lab.testNumber}</td>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${getLabTestTypeLabel(lab.testType)}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${lab.sampleLocation || '---'}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${lab.labName || 'آزمایشگاه کارگاهی'}</td>
              </tr>
            </tbody>
          </table>

          <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; text-align: center; direction: rtl;">
            <thead>
              <tr style="background: #f1f5f9;">
                <th style="padding: 8px; border: 1px solid #ddd; width: 25%;">تاریخ نمونه‌برداری</th>
                <th style="padding: 8px; border: 1px solid #ddd; width: 25%;">تاریخ آزمایش / نتیجه</th>
                <th style="padding: 8px; border: 1px solid #ddd; width: 25%;">تاییدکننده / مدیر آزمایشگاه</th>
                <th style="padding: 8px; border: 1px solid #ddd; width: 25%;">وضعیت چرخه کار</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd;">${lab.samplingDate || '---'}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${lab.testDate || '---'}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${lab.approvedBy || '---'}</td>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">
                  ${lab.workflowStatus ? WorkflowService.getStatusLabel(lab) : 'ثبت شده'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style="margin-top: 25px;">
          <h3 style="border-right: 4px solid #1e40af; padding-right: 10px; color: #1e40af; font-size: 13px;">۲. مشخصات طراحی، نتایج و ارزیابی انطباق فنی</h3>
          <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; text-align: right; direction: rtl;">
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd; background: #f8fafc; font-weight: bold; width: 30%;">مشخصه و معیار طراحی:</td>
              <td style="padding: 10px; border: 1px solid #ddd;">${lab.designSpecification || '---'}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd; background: #f8fafc; font-weight: bold;">نتیجه حاصل از آزمایش:</td>
              <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; color: #0f172a;">${lab.resultValue || '---'}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd; background: #f8fafc; font-weight: bold;">نظر دستگاه نظارت (مشاور):</td>
              <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; color: ${
                (lab.consultantComplianceStatus || (!lab.employerComplianceStatus ? lab.complianceStatus : undefined)) === 'COMPLIANT' ? '#16a34a' :
                (lab.consultantComplianceStatus || (!lab.employerComplianceStatus ? lab.complianceStatus : undefined)) === 'NON_COMPLIANT' ? '#dc2626' :
                (lab.consultantComplianceStatus || (!lab.employerComplianceStatus ? lab.complianceStatus : undefined)) === 'CONDITIONAL' ? '#d97706' : '#475569'
              };">
                ${getComplianceStatusText(lab.consultantComplianceStatus || (!lab.employerComplianceStatus ? lab.complianceStatus : undefined))}
              </td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd; background: #f8fafc; font-weight: bold;">نظر کارفرما (مدیریت پروژه):</td>
              <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; color: ${
                lab.employerComplianceStatus === 'COMPLIANT' ? '#16a34a' :
                lab.employerComplianceStatus === 'NON_COMPLIANT' ? '#dc2626' :
                lab.employerComplianceStatus === 'CONDITIONAL' ? '#d97706' : '#475569'
              };">
                ${getComplianceStatusText(lab.employerComplianceStatus, true)}
              </td>
            </tr>
            <tr style="background: #f1f5f9;">
              <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; color: #1e40af;">نتیجه نهایی انطباق فنی:</td>
              <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; font-size: 12px; color: ${
                getEffectiveComplianceStatus(lab) === 'COMPLIANT' ? '#16a34a' :
                getEffectiveComplianceStatus(lab) === 'NON_COMPLIANT' ? '#dc2626' :
                getEffectiveComplianceStatus(lab) === 'CONDITIONAL' ? '#d97706' : '#475569'
              };">
                ${getComplianceStatusText(getEffectiveComplianceStatus(lab), 'final')}
              </td>
            </tr>
          </table>
        </div>

        ${lab.notes ? `
          <div style="margin-top: 25px;">
            <h3 style="border-right: 4px solid #1e40af; padding-right: 10px; color: #1e40af; font-size: 13px;">۳. ملاحظات و توضیحات تکمیلی</h3>
            <div style="padding: 12px; border: 1px solid #ddd; border-radius: 8px; background: #fff; font-size: 11px; line-height: 1.8; text-align: right;">
              ${lab.notes}
            </div>
          </div>
        ` : ''}
      `;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html dir="rtl">
        <head>
          <title>${title}</title>
          <style>
            @font-face { font-family: 'Vazir'; src: url('https://cdn.jsdelivr.net/gh/rastikerdar/vazir-font@v30.1.0/dist/Vazir.woff2'); }
            body { font-family: 'Vazir', Tahoma, sans-serif; padding: 40px; color: #333; line-height: 1.6; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #1e40af; padding-bottom: 15px; margin-bottom: 30px; }
            .logo-section { display: flex; align-items: center; gap: 10px; }
            .logo-box { width: 40px; height: 40px; background: #1e40af; border-radius: 8px; }
            .content { min-height: 500px; }
            .footer { margin-top: 50px; border-top: 1px solid #eee; padding-top: 20px; display: flex; justify-content: space-around; }
            .sig-box { text-align: center; width: 150px; }
            .sig-line { margin-top: 50px; border-top: 1px dashed #ccc; }
            @media print { 
              .no-print { display: none; } 
              body { padding: 20px; } 
              @page { size: A4 portrait; margin: 1cm; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo-section">
              ${qcLogoHtml || '<div class="logo-box"></div>'}
              <h1 style="margin: 0; color: #1e40af; font-size: 22px;">سامانه مدیریت پروژه همیار</h1>
            </div>
            <div style="text-align: left; font-size: 12px;">
              <p style="margin: 0;">تاریخ چاپ: ${new Date().toLocaleDateString("fa-IR")}</p>
              <p style="margin: 0;">نسخه رسمی QC</p>
            </div>
          </div>
          <div class="content">
            ${contentHtml}
          </div>
          ${renderPrintSignatureFooter(data)}
          <script>
            window.onload = () => {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-8 animate-fadeIn text-right pb-16" dir="rtl">
      {/* Top Header & Project Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2.5rem] border border-stone-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden">
        <div className="flex items-center gap-5 relative z-10">
          <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-amber-600 text-stone-950 rounded-[1.5rem] flex items-center justify-center shadow-lg shadow-amber-500/20 border border-amber-300/40 shrink-0">
            <ClipboardCheck size={32} strokeWidth={2.3} />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl md:text-3xl font-black text-stone-900 dark:text-white tracking-tight">
                مدیریت و کنترل کیفیت پروژه (QC / QA)
              </h2>
              <span className="px-3 py-1 bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 rounded-full text-xs font-black">
                ماژول کارگاهی
              </span>
            </div>
            <p className="text-stone-500 dark:text-slate-400 text-xs md:text-sm font-bold mt-1.5 flex items-center gap-2">
              <ShieldAlert size={15} className="text-amber-600" />
              مدیریت یکپارچه درخواست‌های بازرسی کیفی (RFI)، عدم انطباق‌ها (NCR)، آزمایش‌های آزمایشگاهی و چک‌لیست‌ها
            </p>
          </div>
        </div>

        {/* Project Selector & Actions */}
        <div className="flex flex-wrap items-center gap-3 relative z-10">
          <div className="flex items-center gap-2 bg-white dark:bg-slate-800 text-stone-900 dark:text-white p-2.5 rounded-2xl border border-stone-300 dark:border-slate-700 shadow-sm">
            <Building2 size={18} className="text-amber-600 dark:text-amber-400 mr-2" />
            <select
              value={selectedProjectId}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedProjectId(val);
                localStorage.setItem('hamyar_selected_project_id', val);
                window.dispatchEvent(new Event('storage'));
                window.dispatchEvent(new CustomEvent('project-changed', { detail: { projectId: val } }));
              }}
              className="bg-white dark:bg-slate-800 text-xs font-black text-stone-900 dark:text-white outline-none cursor-pointer pl-4"
            >
              {accessibleProjects.length === 0 ? (
                <option value="" className="bg-white dark:bg-slate-800 text-stone-900 dark:text-white">هیچ پروژه مجازی یافت نشد</option>
              ) : (
                accessibleProjects.map((p) => (
                  <option key={p.id} value={p.id} className="bg-white dark:bg-slate-800 text-stone-900 dark:text-white font-bold">
                    {p.title} ({p.contractNumber || 'پروژه'})
                  </option>
                ))
              )}
            </select>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {/* Stat 1 */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-[2rem] border border-stone-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-stone-400 dark:text-slate-500 text-xs font-black block">بازرسی‌های ثبت شده (RFI)</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-stone-900 dark:text-white">{projectInspections.length}</span>
              <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                {projectInspections.length > 0 ? `${Math.round((approvedCount / projectInspections.length) * 100)}٪ تایید` : '0٪'}
              </span>
            </div>
            <span className="text-[11px] text-stone-500 font-bold block">
              {approvedCount} تایید شده | {conditionalCount} مشروط | {rejectedCount} رد | {pendingCount} در انتظار
            </span>
          </div>
          <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center border border-emerald-100 dark:border-emerald-800">
            <CheckCircle2 size={24} />
          </div>
        </div>

        {/* Stat 2 */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-[2rem] border border-stone-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-stone-400 dark:text-slate-500 text-xs font-black block">عدم انطباق‌های فعال (NCR)</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-rose-600 dark:text-rose-400">{openNcrsCount}</span>
              <span className="text-[10px] font-black text-stone-500 bg-stone-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                از کل {projectNcrs.length} NCR
              </span>
            </div>
            <span className="text-[11px] text-stone-500 font-bold block">
              نیازمند اقدام اصلاحی و بازرسی مجدد
            </span>
          </div>
          <div className="w-12 h-12 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center border border-rose-100 dark:border-rose-800">
            <AlertTriangle size={24} />
          </div>
        </div>

        {/* Stat 3 */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-[2rem] border border-stone-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-stone-400 dark:text-slate-500 text-xs font-black block">نرخ انطباق آزمایش‌ها</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-amber-600 dark:text-amber-400">{labPassRate}٪</span>
              <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md">
                {projectLabTests.length} شیت آزمایش
              </span>
            </div>
            <span className="text-[11px] text-stone-500 font-bold block">
              بتن، خاک، کشش میلگرد و جوش
            </span>
          </div>
          <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center border border-amber-100 dark:border-amber-800">
            <FlaskConical size={24} />
          </div>
        </div>

        {/* Stat 4 */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-[2rem] border border-stone-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-stone-400 dark:text-slate-500 text-xs font-black block">درخواست‌های معلق بازرسی</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-blue-600 dark:text-blue-400">{pendingCount}</span>
              <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-md">
                در انتظار حضور ناظر
              </span>
            </div>
            <span className="text-[11px] text-stone-500 font-bold block">
              نیاز به تایید قبل از شروع بتن‌ریزی
            </span>
          </div>
          <div className="w-12 h-12 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center border border-blue-100 dark:border-blue-800">
            <Clock size={24} />
          </div>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="flex items-center justify-between border-b border-stone-200 dark:border-slate-800 pb-2 overflow-x-auto gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('inspections')}
            className={`px-5 py-3 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'inspections'
                ? 'bg-amber-500 text-stone-950 shadow-md shadow-amber-500/20'
                : 'bg-stone-100 dark:bg-slate-800/80 text-stone-600 dark:text-slate-300 hover:bg-stone-200 dark:hover:bg-slate-700'
            }`}
          >
            <CheckSquare size={16} />
            درخواست‌ها و بازرسی‌های کیفی (RFI)
            <span className="px-2 py-0.5 bg-black/10 rounded-full text-[10px]">
              {filteredInspections.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('ncrs')}
            className={`px-5 py-3 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'ncrs'
                ? 'bg-amber-500 text-stone-950 shadow-md shadow-amber-500/20'
                : 'bg-stone-100 dark:bg-slate-800/80 text-stone-600 dark:text-slate-300 hover:bg-stone-200 dark:hover:bg-slate-700'
            }`}
          >
            <AlertTriangle size={16} />
            گزارش‌های عدم انطباق (NCR)
            <span className="px-2 py-0.5 bg-black/10 rounded-full text-[10px]">
              {filteredNcrs.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('lab_tests')}
            className={`px-5 py-3 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'lab_tests'
                ? 'bg-amber-500 text-stone-950 shadow-md shadow-amber-500/20'
                : 'bg-stone-100 dark:bg-slate-800/80 text-stone-600 dark:text-slate-300 hover:bg-stone-200 dark:hover:bg-slate-700'
            }`}
          >
            <FlaskConical size={16} />
            نتایج آزمایشگاه و کنترل مواد
            <span className="px-2 py-0.5 bg-black/10 rounded-full text-[10px]">
              {filteredLabTests.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('standards')}
            className={`px-5 py-3 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'standards'
                ? 'bg-amber-500 text-stone-950 shadow-md shadow-amber-500/20'
                : 'bg-stone-100 dark:bg-slate-800/80 text-stone-600 dark:text-slate-300 hover:bg-stone-200 dark:hover:bg-slate-700'
            }`}
          >
            <FileCheck size={16} />
            بانک چک‌لیست‌های مرجع
          </button>
        </div>

        {/* Action button inside tab bar */}
        {activeTab === 'inspections' && (
          <button
            onClick={() => openInspectionModal(null)}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-stone-950 rounded-xl text-xs font-black shadow-sm transition-all flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-95"
          >
            <Plus size={15} strokeWidth={2.5} />
            ثبت درخواست جدید بازرسی (RFI)
          </button>
        )}

        {activeTab === 'ncrs' && (
          <button
            onClick={() => openNcrModal(null)}
            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-sm transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <Plus size={15} />
            صدور عدم انطباق (NCR)
          </button>
        )}

        {activeTab === 'lab_tests' && (
          <button
            onClick={() => openLabTestModal(null)}
            className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black shadow-sm transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <Plus size={15} />
            ثبت نتیجه آزمایش
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-stone-200/80 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search size={17} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="جستجو بر اساس شماره، عنوان یا موقعیت..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-10 pl-4 py-2 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl text-xs font-bold text-stone-800 dark:text-white outline-none focus:ring-2 focus:ring-amber-500/30"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {activeTab === 'inspections' && (
            <>
              <div className="flex items-center gap-1.5 text-xs font-bold text-stone-500">
                <Filter size={14} /> وضعیت:
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl text-xs font-bold text-stone-800 dark:text-white outline-none"
              >
                <option value="ALL">همه وضعیت‌ها</option>
                <option value="APPROVED">تایید شده</option>
                <option value="CONDITIONAL">تایید مشروط</option>
                <option value="REJECTED">عدم تایید / رد</option>
                <option value="PENDING">در انتظار بازرسی</option>
              </select>

              <div className="flex items-center gap-1.5 text-xs font-bold text-stone-500 mr-2">
                دسته:
              </div>
              <select
                value={disciplineFilter}
                onChange={(e) => setDisciplineFilter(e.target.value)}
                className="px-3 py-2 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl text-xs font-bold text-stone-800 dark:text-white outline-none"
              >
                <option value="ALL">تمامی رده‌های کاری</option>
                {uniqueInspectionDisciplines.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </>
          )}

          {activeTab === 'ncrs' && (
            <>
              <div className="flex items-center gap-1.5 text-xs font-bold text-stone-500">
                <Filter size={14} /> وضعیت NCR:
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl text-xs font-bold text-stone-800 dark:text-white outline-none"
              >
                <option value="ALL">همه وضعیت‌ها</option>
                <option value="OPEN">صادر شده (مفتوح)</option>
                <option value="CORRECTIVE_ACTION">در حال اقدام اصلاحی</option>
                <option value="VERIFICATION">در حال ارزیابی مجدد</option>
                <option value="CLOSED">بسته شده (مختوم)</option>
              </select>
            </>
          )}

          {activeTab === 'lab_tests' && (
            <>
              <div className="flex items-center gap-1.5 text-xs font-bold text-stone-500">
                <Filter size={14} /> انطباق فنی:
              </div>
              <select
                value={labStatusFilter}
                onChange={(e) => setLabStatusFilter(e.target.value)}
                className="px-3 py-2 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl text-xs font-bold text-stone-800 dark:text-white outline-none"
              >
                <option value="ALL">همه وضعیت‌ها</option>
                <option value="COMPLIANT">منطبق بر مشخصات</option>
                <option value="NON_COMPLIANT">عدم انطباق (مردود)</option>
                <option value="CONDITIONAL">تایید مشروط (با ملاحظات)</option>
                <option value="PENDING">در انتظار بررسی</option>
              </select>

              <div className="flex items-center gap-1.5 text-xs font-bold text-stone-500 mr-2">
                نوع آزمایش:
              </div>
              <select
                value={labTypeFilter}
                onChange={(e) => setLabTypeFilter(e.target.value)}
                className="px-3 py-2 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl text-xs font-bold text-stone-800 dark:text-white outline-none"
              >
                <option value="ALL">تمامی آزمایش‌ها</option>
                {uniqueLabTestTypes.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>
      </div>

      {/* TAB 1: INSPECTIONS & RFI LIST */}
      {activeTab === 'inspections' && (
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-stone-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-stone-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="font-black text-base text-stone-900 dark:text-white">
                درخواست‌های بازرسی کیفی (RFI - Request For Inspection)
              </h3>
              <p className="text-xs text-stone-500 dark:text-slate-400 font-bold mt-1">
                لیست فرم‌های ثبت شده توسط پیمانکار و ارزیابی شده توسط دستگاه نظارت مقیم
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-stone-50 dark:bg-slate-800/60 border-b border-stone-200/80 dark:border-slate-800 text-stone-500 dark:text-slate-400 font-black">
                  <th className="p-4">کد RFI</th>
                  <th className="p-4">عنوان فعالیت و موضوع بازرسی</th>
                  <th className="p-4">موقعیت اجرایی</th>
                  <th className="p-4">رده کاری</th>
                  <th className="p-4">تاریخ درخواست/بازرسی</th>
                  <th className="p-4">بازرس و پیمانکار</th>
                  <th className="p-4 text-center">چک‌لیست</th>
                  <th className="p-4 text-center">وضعیت</th>
                  <th className="p-4 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-slate-800">
                {filteredInspections.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-12 text-center text-stone-400 dark:text-slate-500 font-bold">
                      هیچ درخواست بازرسی کیفی مطابق فیلتر یافت نشد.
                    </td>
                  </tr>
                ) : (
                  filteredInspections.map((insp) => {
                    const passedChecklists = insp.checklists.filter((c) => c.status === 'PASSED').length;
                    const totalChecklists = insp.checklists.length;
                    const isUnread = unreadRecordIds.has(String(insp.id));

                    return (
                      <tr
                        key={insp.id}
                        id={`record-${insp.id}`}
                        onClick={() => handleNcrRowClick(insp.id)}
                        className={`hover:bg-stone-50/70 dark:hover:bg-slate-800/40 transition-all duration-500 cursor-pointer ${
                          isUnread ? 'bg-amber-100/50 dark:bg-amber-950/30 border-r-4 border-r-amber-500 shadow-xs ring-1 ring-amber-400/30' : ''
                        } ${
                          highlightedRecordId === insp.id
                            ? 'bg-yellow-100/80 dark:bg-yellow-950/50 scale-[1.005] shadow-md z-10 relative ring-2 ring-amber-400'
                            : ''
                        }`}
                      >
                        <td className="p-4 font-black text-amber-600 dark:text-amber-400 dir-ltr text-right">
                          {insp.rfiNumber}
                        </td>
                        <td className="p-4">
                          <div className="font-black text-stone-900 dark:text-white">{insp.title}</div>
                          {insp.description && (
                            <div className="text-[11px] text-stone-500 truncate max-w-xs mt-0.5">
                              {insp.description}
                            </div>
                          )}
                        </td>
                        <td className="p-4 font-bold text-stone-700 dark:text-slate-300">
                          <div className="flex items-center gap-1">
                            <MapPin size={13} className="text-stone-400 shrink-0" />
                            <span>{insp.location}</span>
                          </div>
                        </td>
                        <td className="p-4 font-bold text-stone-600 dark:text-slate-300">
                          <span className="px-2.5 py-1 bg-stone-100 dark:bg-slate-800 rounded-lg text-[11px]">
                            {getDisciplineLabel(insp.discipline)}
                          </span>
                        </td>
                        <td className="p-4 font-bold text-stone-600 dark:text-slate-300">
                          <div>بازرسی: {insp.inspectionDate}</div>
                          <div className="text-[10px] text-stone-400">درخواست: {insp.requestDate}</div>
                        </td>
                        <td className="p-4 font-bold text-stone-700 dark:text-slate-300">
                          <div>{insp.inspector}</div>
                          <div className="text-[10px] text-stone-400">{insp.contractor}</div>
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => {
                              if (userOrgType === 'CONSULTANT' && !isReassignSender(insp)) {
                                setActiveInspectionForEval(insp);
                                setIsChecklistEvalModalOpen(true);
                              }
                            }}
                            disabled={userOrgType !== 'CONSULTANT' || isReassignSender(insp)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-black border transition-all ${
                              userOrgType === 'CONSULTANT' && !isReassignSender(insp)
                                ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800 hover:bg-amber-100 cursor-pointer"
                                : "bg-stone-100 dark:bg-slate-800 text-stone-400 dark:text-slate-600 border-stone-200 dark:border-slate-700 cursor-not-allowed opacity-60"
                            }`}
                            title={
                              isReassignSender(insp)
                                ? "سند ارجاع شده است و امکان ارزیابی نیست"
                                : userOrgType === 'CONSULTANT'
                                ? "مشاهده و ارزیابی بندهای چک‌لیست"
                                : "ارزیابی چک‌لیست فقط برای سازمان مشاور مجاز است"
                            }
                          >
                            <CheckSquare size={13} />
                            {passedChecklists} از {totalChecklists}
                          </button>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                            {getInspectionStatusBadge(insp)}
                            {insp.workflowStatus && (
                              <span className="text-[10px] font-bold text-stone-500 bg-stone-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                                چرخه: {WorkflowService.getStatusLabel(insp)}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            {/* Workflow Actions */}
                            {currentUser && !isReassignSender(insp) && WorkflowService.getAvailableActions(insp, currentUser, userOrgType).length > 0 && (
                              <div className="flex items-center gap-1">
                                {WorkflowService.getAvailableActions(insp, currentUser, userOrgType).map((act) => (
                                  <button
                                    key={act}
                                    onClick={() => openWorkflowModal(insp, act)}
                                    className={`px-2 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer ${WorkflowService.getActionStyle(act)}`}
                                    title={WorkflowService.getActionLabel(act, userOrgType, currentUser.id)}
                                  >
                                    {WorkflowService.getActionLabel(act, userOrgType, currentUser.id)}
                                  </button>
                                ))}
                              </div>
                            )}

                            <button
                              onClick={() => {
                                setHistoryTarget(insp);
                                setIsHistoryModalOpen(true);
                              }}
                              className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-all"
                              title="تاریخچه"
                            >
                              <ScrollText size={16} />
                            </button>
                            <button
                              onClick={() => {
                                setPrintInspectionData(insp);
                                handlePrintOfficial('rfi', insp);
                              }}
                              className="p-2 text-stone-600 hover:text-amber-600 hover:bg-stone-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                              title="چاپ فرم رسمی RFI"
                            >
                              <Printer size={15} />
                            </button>
                            {currentUser && !isReassignSender(insp) && WorkflowService.canEdit(insp, currentUser) && (
                              <button
                                onClick={() => openInspectionModal(insp)}
                                className="p-2 text-stone-600 hover:text-amber-600 hover:bg-stone-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                                title="ویرایش RFI"
                              >
                                <Edit3 size={15} />
                              </button>
                            )}
                            {currentUser && !isReassignSender(insp) && WorkflowService.canDelete(insp, currentUser) && (
                              <button
                                onClick={() => setDeleteTarget({ id: insp.id, title: `${insp.rfiNumber} - ${insp.title}`, type: 'rfi' })}
                                className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-all cursor-pointer"
                                title="حذف RFI"
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: NON-CONFORMANCE REPORTS (NCR) */}
      {activeTab === 'ncrs' && (
        <div className="space-y-6">
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-3xl p-5 text-right text-stone-800 dark:text-slate-200 text-xs font-bold flex items-start gap-3">
            <ShieldAlert size={20} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-black text-sm text-amber-800 dark:text-amber-400 mb-1">
                دستورالعمل مدیریت عدم انطباق‌ها (NCR Procedure)
              </h4>
              <p className="leading-relaxed">
                گزارش‌های عدم انطباق (NCR) در مواردی که کارهای اجرایی با نقشه‌های مصوب، مشخصات فنی عمومی (نشریه ۵۵) یا استانداردهای ملی مطابقت ندارند صادر می‌گردد. تمام NCRهای بحرانی و شدید نیازمند ارزیابی علت ریشه‌ای و اخذ تاییدیه مشاور پیش از پوشش کارهای بعدی می‌باشند.
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-stone-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-stone-50 dark:bg-slate-800/60 border-b border-stone-200/80 dark:border-slate-800 text-stone-500 dark:text-slate-400 font-black">
                    <th className="p-4">شماره NCR</th>
                    <th className="p-4">عنوان و شرح عیب</th>
                    <th className="p-4">موقعیت اجرایی</th>
                    <th className="p-4">رده کاری</th>
                    <th className="p-4">صادرکننده / مسئول</th>
                    <th className="p-4">تاریخ‌ها</th>
                    <th className="p-4">اقدامات اصلاحی پیشنهادی</th>
                    <th className="p-4 text-center">وضعیت و چرخه</th>
                    <th className="p-4 text-center">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-slate-800">
                  {filteredNcrs.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-12 text-center text-stone-400 dark:text-slate-500 font-bold">
                        هیچ عدم انطباقی با این مشخصات ثبت نشده است.
                      </td>
                    </tr>
                  ) : (
                    filteredNcrs.map((ncr) => {
                      const isUnread = unreadRecordIds.has(String(ncr.id));
                      return (
                        <tr 
                          key={ncr.id} 
                          id={`record-${ncr.id}`}
                          onClick={() => handleNcrRowClick(ncr.id)}
                          className={`hover:bg-stone-50/70 dark:hover:bg-slate-800/40 transition-all duration-500 cursor-pointer ${
                            isUnread ? 'bg-amber-100/50 dark:bg-amber-950/30 border-r-4 border-r-amber-500 shadow-xs ring-1 ring-amber-400/30' : ''
                          } ${
                            highlightedRecordId === ncr.id
                              ? 'bg-yellow-100/80 dark:bg-yellow-950/50 scale-[1.005] shadow-md z-10 relative ring-2 ring-amber-400'
                              : ''
                          }`}
                        >
                          <td className="p-4 font-black text-rose-600 dark:text-rose-400 dir-ltr text-right whitespace-nowrap">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span>{ncr.ncrNumber}</span>
                              {isUnread && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                  دیده نشده
                                </span>
                              )}
                            </div>
                          </td>
                        <td className="p-4">
                          <div className="font-black text-stone-900 dark:text-white mb-1 max-w-xs leading-relaxed">{ncr.title}</div>
                          {ncr.description && (
                            <div className="text-[11px] text-stone-500 dark:text-slate-400 max-w-xs whitespace-pre-wrap leading-relaxed">
                              <strong>شرح عیب:</strong> {ncr.description}
                            </div>
                          )}
                        </td>
                        <td className="p-4 font-bold text-stone-700 dark:text-slate-300">
                          <div className="flex items-center gap-1.5 whitespace-nowrap">
                            <MapPin size={13} className="text-stone-400 shrink-0" />
                            <span>{ncr.location}</span>
                          </div>
                        </td>
                        <td className="p-4 font-bold text-stone-600 dark:text-slate-300">
                          <span className="px-2.5 py-1 bg-stone-100 dark:bg-slate-800 rounded-lg text-[11px] whitespace-nowrap">
                            {getDisciplineLabel(ncr.discipline)}
                          </span>
                        </td>
                        <td className="p-4 text-stone-700 dark:text-slate-300 font-bold whitespace-nowrap space-y-1">
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-stone-400">صادرکننده:</span>
                            <span>{ncr.issuedBy}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-stone-400">مسئول:</span>
                            <span>{ncr.responsibleParty}</span>
                          </div>
                        </td>
                        <td className="p-4 font-bold text-stone-600 dark:text-slate-300 whitespace-nowrap space-y-1">
                          <div>صدور: {ncr.issueDate}</div>
                          <div className="text-[10px] text-stone-400">مهلت: {ncr.deadlineDate}</div>
                        </td>
                        <td className="p-4">
                          <div className="space-y-1.5 max-w-[240px] text-[11px] font-bold">
                            {ncr.correctiveActionContractor && (
                              <div className="p-1.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 rounded-lg border border-emerald-200/20">
                                <span className="font-black text-[9px] block mb-0.5 text-emerald-600 dark:text-emerald-400">پیشنهاد پیمانکار:</span>
                                <div className="leading-relaxed">{ncr.correctiveActionContractor}</div>
                              </div>
                            )}
                            {ncr.correctiveActionConsultant && (
                              <div className="p-1.5 bg-blue-50 dark:bg-blue-950/20 text-blue-800 dark:text-blue-300 rounded-lg border border-blue-200/20">
                                <span className="font-black text-[9px] block mb-0.5 text-blue-600 dark:text-blue-400">پیشنهاد مشاور:</span>
                                <div className="leading-relaxed">{ncr.correctiveActionConsultant}</div>
                              </div>
                            )}
                            {ncr.correctiveActionEmployer && (
                              <div className="p-1.5 bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 rounded-lg border border-amber-200/20">
                                <span className="font-black text-[9px] block mb-0.5 text-amber-600 dark:text-amber-400">پیشنهاد کارفرما:</span>
                                <div className="leading-relaxed">{ncr.correctiveActionEmployer}</div>
                              </div>
                            )}
                            {!ncr.correctiveActionContractor && !ncr.correctiveActionConsultant && !ncr.correctiveActionEmployer && ncr.correctiveAction && (
                              <div className="p-1.5 bg-stone-100 dark:bg-slate-800 text-stone-700 dark:text-slate-300 rounded-lg border border-stone-200/20">
                                <span className="font-black text-[9px] block mb-0.5 text-stone-500">اقدام اصلاحی:</span>
                                <div className="leading-relaxed">{ncr.correctiveAction}</div>
                              </div>
                            )}
                            {!ncr.correctiveActionContractor && !ncr.correctiveActionConsultant && !ncr.correctiveActionEmployer && !ncr.correctiveAction && (
                              <span className="text-stone-400">ثبت نشده</span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-center whitespace-nowrap">
                          <div className="flex flex-col items-center gap-1.5">
                            {getNcrStatusBadge(ncr.status)}
                            {getNcrSeverityBadge(ncr.severity)}
                            {ncr.workflowStatus && (
                              <span className="text-[10px] font-bold text-stone-500 bg-stone-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                                چرخه: {WorkflowService.getStatusLabel(ncr)}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-1.5 flex-wrap min-w-[120px]">
                            {/* Workflow Actions */}
                            {currentUser && (
                              <>
                                {canSendNcrToConsultant(ncr) && (
                                  <button
                                    onClick={() => {
                                      setNcrHandoffTarget(ncr);
                                      setNcrHandoffType('TO_CONSULTANT');
                                      setNcrHandoffAssignee('');
                                      setNcrHandoffComment('');
                                      setIsNcrHandoffModalOpen(true);
                                    }}
                                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                                  >
                                    <Send size={11} />
                                    ارسال به مشاور
                                  </button>
                                )}

                                {canSendNcrToEmployer(ncr) && (
                                  <button
                                    onClick={() => {
                                      setNcrHandoffTarget(ncr);
                                      setNcrHandoffType('TO_EMPLOYER');
                                      setNcrHandoffAssignee('');
                                      setNcrHandoffComment('');
                                      setIsNcrHandoffModalOpen(true);
                                    }}
                                    className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-[10px] font-black transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                                  >
                                    <Send size={11} />
                                    ارسال به کارفرما
                                  </button>
                                )}

                                {canSendNcrToContractor(ncr) && (
                                  <button
                                    onClick={() => {
                                      setNcrHandoffTarget(ncr);
                                      setNcrHandoffType('TO_CONTRACTOR');
                                      setNcrHandoffAssignee('');
                                      setNcrHandoffComment('');
                                      setIsNcrHandoffModalOpen(true);
                                    }}
                                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                                  >
                                    <Send size={11} />
                                    ارسال به پیمانکار
                                  </button>
                                )}

                                {!isReassignSender(ncr) && WorkflowService.getAvailableActions(ncr, currentUser, userOrgType).length > 0 && (
                                  <div className="flex items-center gap-1">
                                    {WorkflowService.getAvailableActions(ncr, currentUser, userOrgType).map((act) => (
                                      <button
                                        key={act}
                                        onClick={() => openWorkflowModal(ncr, act)}
                                        className={`px-2.5 py-1 rounded-xl text-[10px] font-black transition-all cursor-pointer ${WorkflowService.getActionStyle(act)}`}
                                      >
                                        {WorkflowService.getActionLabel(act, userOrgType, currentUser.id)}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </>
                            )}

                            <button
                              onClick={() => {
                                setPrintNcrData(ncr);
                                handlePrintOfficial('ncr', ncr);
                              }}
                              className="p-2 text-stone-600 hover:text-amber-600 hover:bg-stone-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                              title="چاپ فرم رسمی NCR"
                            >
                              <Printer size={15} />
                            </button>

                            <button
                              onClick={() => {
                                setHistoryTarget(ncr);
                                setIsHistoryModalOpen(true);
                              }}
                              className="p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                              title="تاریخچه"
                            >
                              <ScrollText size={14} />
                            </button>

                            {currentUser && !isReassignSender(ncr) && WorkflowService.canEdit(ncr, currentUser) && (
                              <button
                                onClick={() => openNcrModal(ncr)}
                                className="p-1.5 text-amber-500 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-stone-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                                title="ویرایش"
                              >
                                <Edit3 size={14} />
                              </button>
                            )}

                            {currentUser && !isReassignSender(ncr) && WorkflowService.canDelete(ncr, currentUser) && (
                              <button
                                onClick={() => setDeleteTarget({ id: ncr.id, title: `${ncr.ncrNumber} - ${ncr.title}`, type: 'ncr' })}
                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-all cursor-pointer"
                                title="حذف NCR"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: LAB TESTS & MATERIALS QUALITY */}
      {activeTab === 'lab_tests' && (
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-stone-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-stone-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="font-black text-base text-stone-900 dark:text-white">
                ثبت و ردیابی آزمایش‌های کارگاهی و کنترل کیفیت مصالح
              </h3>
              <p className="text-xs text-stone-500 dark:text-slate-400 font-bold mt-1">
                نتایج آزمایشگاه‌های مرجع بتن، خاک، کشش آرماتور و تست‌های غیرمخرب جوش (NDT)
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-stone-50 dark:bg-slate-800/60 border-b border-stone-200/80 dark:border-slate-800 text-stone-500 dark:text-slate-400 font-black">
                  <th className="p-4">شماره شیت</th>
                  <th className="p-4">نوع آزمایش</th>
                  <th className="p-4">محل و پارت نمونه‌گیری</th>
                  <th className="p-4">تاریخ آزمایش</th>
                  <th className="p-4">مشخصه طراحی (معیار)</th>
                  <th className="p-4">نتیجه حاصله</th>
                  <th className="p-4">آزمایشگاه مرجع</th>
                  <th className="p-4 text-center">انطباق فنی</th>
                  <th className="p-4 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-slate-800">
                {filteredLabTests.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-12 text-center text-stone-400 font-bold">
                      هیچ آزمایشگاهی ثبت نشده است.
                    </td>
                  </tr>
                ) : (
                  filteredLabTests.map((lab) => {
                    const isUnread = unreadRecordIds.has(String(lab.id));
                    return (
                      <tr
                        key={lab.id}
                        id={`record-${lab.id}`}
                        onClick={() => handleNcrRowClick(lab.id)}
                        className={`hover:bg-stone-50/70 dark:hover:bg-slate-800/40 transition-all duration-500 cursor-pointer ${
                          isUnread ? 'bg-amber-100/50 dark:bg-amber-950/30 border-r-4 border-r-amber-500 shadow-xs ring-1 ring-amber-400/30' : ''
                        } ${
                          highlightedRecordId === lab.id
                            ? 'bg-yellow-100/80 dark:bg-yellow-950/50 scale-[1.005] shadow-md z-10 relative ring-2 ring-amber-400'
                            : ''
                        }`}
                      >
                      <td className="p-4 font-black text-amber-600 dark:text-amber-400 dir-ltr text-right">
                        {lab.testNumber}
                      </td>
                      <td className="p-4 font-black text-stone-900 dark:text-white">
                        {getLabTestTypeLabel(lab.testType)}
                      </td>
                      <td className="p-4 font-bold text-stone-700 dark:text-slate-300">{lab.sampleLocation}</td>
                      <td className="p-4 font-bold text-stone-600 dark:text-slate-400">{lab.testDate}</td>
                      <td className="p-4 font-bold text-stone-600 dark:text-slate-300">{lab.designSpecification}</td>
                      <td className="p-4 font-black text-stone-900 dark:text-white">{lab.resultValue}</td>
                      <td className="p-4 font-bold text-stone-600 dark:text-slate-300">{lab.labName}</td>
                      <td className="p-4 text-center min-w-[210px]">
                        <div className="flex flex-col items-center gap-1.5">
                          {/* Consultant Opinion */}
                          <div className="flex items-center gap-1 text-[11px]">
                            <span className="text-stone-400 font-bold">مشاور:</span>
                            {(userOrgType === 'CONSULTANT' || currentUser?.role === 'SYSTEM_ADMIN') && 
                            !lab.isFinalFrozen && 
                            lab.workflowStatus !== WorkflowStatus.APPROVED_BY_EMPLOYER && 
                            (!lab.consultantComplianceStatus || lab.consultantComplianceStatus === 'PENDING') ? (
                              <select
                                value={lab.consultantComplianceStatus || (userOrgType === 'CONSULTANT' ? lab.complianceStatus : 'PENDING')}
                                onChange={(e) => {
                                  const newStatus = e.target.value as 'COMPLIANT' | 'NON_COMPLIANT' | 'CONDITIONAL' | 'PENDING';
                                  handleUpdateLabCompliance(lab.id, 'CONSULTANT', newStatus);
                                }}
                                className="px-2 py-0.5 rounded-lg text-[10px] font-bold border outline-none cursor-pointer bg-white dark:bg-slate-900 border-stone-300 dark:border-slate-700 text-stone-800 dark:text-slate-200"
                              >
                                <option value="PENDING">در انتظار بررسی</option>
                                <option value="COMPLIANT">منطبق</option>
                                <option value="NON_COMPLIANT">عدم انطباق</option>
                                <option value="CONDITIONAL">تایید مشروط</option>
                              </select>
                            ) : (
                              renderComplianceBadge(lab.consultantComplianceStatus || (lab.employerComplianceStatus ? undefined : lab.complianceStatus))
                            )}
                          </div>

                          {/* Employer Opinion (Final Criterion) */}
                          <div className="flex items-center gap-1 text-[11px]">
                            <span className="text-stone-400 font-bold">کارفرما (نهایی):</span>
                            {(userOrgType === 'EMPLOYER' || currentUser?.role === 'SYSTEM_ADMIN') && 
                            !lab.isFinalFrozen && 
                            lab.workflowStatus !== WorkflowStatus.APPROVED_BY_EMPLOYER && 
                            (!lab.employerComplianceStatus || lab.employerComplianceStatus === 'PENDING') ? (
                              <select
                                value={lab.employerComplianceStatus || (userOrgType === 'EMPLOYER' ? lab.complianceStatus : 'PENDING')}
                                onChange={(e) => {
                                  const newStatus = e.target.value as 'COMPLIANT' | 'NON_COMPLIANT' | 'CONDITIONAL' | 'PENDING';
                                  handleUpdateLabCompliance(lab.id, 'EMPLOYER', newStatus);
                                }}
                                className="px-2 py-0.5 rounded-lg text-[10px] font-bold border outline-none cursor-pointer bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-300"
                              >
                                <option value="PENDING">در انتظار نظر کارفرما</option>
                                <option value="COMPLIANT">منطبق (تایید نهایی)</option>
                                <option value="NON_COMPLIANT">عدم انطباق (رد نهایی)</option>
                                <option value="CONDITIONAL">تایید مشروط</option>
                              </select>
                            ) : (
                              renderComplianceBadge(lab.employerComplianceStatus)
                            )}
                          </div>

                          {/* Effective Result Badge */}
                          <div className="pt-1 border-t border-stone-200 dark:border-slate-800 w-full flex justify-center">
                            <span className="text-[10px] font-black text-stone-600 dark:text-slate-300">
                              نتیجه نهایی: {getComplianceStatusText(getEffectiveComplianceStatus(lab), 'final')}
                            </span>
                          </div>

                          {lab.workflowStatus && (
                            <span className="text-[10px] font-bold text-stone-500 bg-stone-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                              چرخه: {WorkflowService.getStatusLabel(lab)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {/* Workflow Actions */}
                          {currentUser && !isReassignSender(lab) && WorkflowService.getAvailableActions(lab, currentUser, userOrgType).length > 0 && (
                            <div className="flex items-center gap-1">
                              {WorkflowService.getAvailableActions(lab, currentUser, userOrgType).map((act) => (
                                <button
                                  key={act}
                                  onClick={() => openWorkflowModal(lab, act)}
                                  className={`px-2 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer ${WorkflowService.getActionStyle(act)}`}
                                  title={WorkflowService.getActionLabel(act, userOrgType, currentUser.id)}
                                >
                                  {WorkflowService.getActionLabel(act, userOrgType, currentUser.id)}
                                </button>
                              ))}
                            </div>
                          )}

                          <button
                            onClick={() => {
                              setPrintLabData(lab);
                              setIsLabPrintModalOpen(true);
                              handlePrintOfficial('lab', lab);
                            }}
                            className="p-2 text-stone-600 hover:text-amber-600 hover:bg-stone-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                            title="چاپ فرم رسمی آزمایشگاه"
                          >
                            <Printer size={15} />
                          </button>

                          <button
                            onClick={() => {
                              setHistoryTarget(lab);
                              setIsHistoryModalOpen(true);
                            }}
                            className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-all"
                            title="تاریخچه"
                          >
                            <ScrollText size={16} />
                          </button>
                          {currentUser && !lab.isFinalFrozen && lab.workflowStatus !== WorkflowStatus.APPROVED_BY_EMPLOYER && !isReassignSender(lab) && (WorkflowService.canEdit(lab, currentUser) || ((userOrgType === 'CONSULTANT' || userOrgType === 'EMPLOYER' || currentUser.role === 'SYSTEM_ADMIN') && (!lab.assigneeId || lab.assigneeId === currentUser.id))) && (
                            <button
                              onClick={() => openLabTestModal(lab)}
                              className="p-2 text-stone-600 hover:text-amber-600 hover:bg-stone-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                              title="ویرایش شیت آزمایشگاه"
                            >
                              <Edit3 size={15} />
                            </button>
                          )}
                          {currentUser && !isReassignSender(lab) && WorkflowService.canDelete(lab, currentUser) && (
                            <button
                              onClick={() => setDeleteTarget({ id: lab.id, title: `${lab.testNumber} - ${lab.sampleLocation}`, type: 'lab' })}
                              className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-all cursor-pointer"
                              title="حذف شیت آزمایشگاه"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: STANDARD CHECKLISTS LIBRARY */}
      {activeTab === 'standards' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-black text-lg text-stone-900 dark:text-white">بانک چک‌لیست‌های مرجع کارگاهی</h3>
              <p className="text-xs text-stone-500 dark:text-slate-400 font-bold mt-1">
                {userOrgType === 'CONTRACTOR'
                  ? 'نمایش موارد تعریف‌شده توسط مشاور و کارفرما (صرفاً پیمانکار مجاز به مشاهده است)'
                  : 'مدیریت و افزودن الگوهای چک‌لیست کیفی برای استفاده در درخواست‌های بازرسی کارگاه'}
              </p>
            </div>
            {(userOrgType === 'CONSULTANT' || userOrgType === 'EMPLOYER' || currentUser?.role === 'SYSTEM_ADMIN') && (
              <button
                onClick={handleOpenAddStdChecklist}
                className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-5 py-2.5 rounded-2xl font-bold text-xs shadow-sm shadow-amber-600/10 transition-all duration-200 cursor-pointer"
              >
                <Plus size={16} />
                <span>افزودن چک‌لیست مرجع جدید</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {standardChecklists.map((chk) => (
              <div
                key={chk.id}
                className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-stone-200/80 dark:border-slate-800 shadow-sm space-y-4"
              >
                <div className="flex items-center justify-between border-b border-stone-100 dark:border-slate-800 pb-3">
                  <div>
                    <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest block">
                      {chk.category} {chk.discipline ? `(${chk.discipline})` : ''}
                    </span>
                    <h4 className="font-black text-base text-stone-900 dark:text-white mt-0.5">{chk.title}</h4>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-2.5 py-1 bg-stone-100 dark:bg-slate-800 text-stone-600 dark:text-slate-300 rounded-lg text-xs font-bold">
                      {chk.items.length} بند
                    </span>
                    {(userOrgType === 'CONSULTANT' || userOrgType === 'EMPLOYER' || currentUser?.role === 'SYSTEM_ADMIN') && (
                      <div className="flex items-center gap-1.5 border-r border-stone-200 dark:border-slate-800 pr-2 mr-2">
                        <button
                          onClick={() => handleOpenEditStdChecklist(chk)}
                          title="ویرایش چک‌لیست"
                          className="p-1.5 bg-stone-50 hover:bg-amber-50 hover:text-amber-700 text-stone-500 rounded-lg transition-colors border border-stone-100 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget({ id: chk.id, title: chk.title, type: 'standard' })}
                          title="حذف چک‌لیست"
                          className="p-1.5 bg-stone-50 hover:bg-rose-50 hover:text-rose-700 text-stone-500 rounded-lg transition-colors border border-stone-100 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <ul className="space-y-2.5">
                  {chk.items.map((item, idx) => (
                    <li key={idx} className="text-xs font-bold text-stone-700 dark:text-slate-300 flex items-start gap-2.5">
                      <span className="w-5 h-5 bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-md flex items-center justify-center shrink-0 font-black text-[10px] mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL 1: ADD / EDIT INSPECTION (RFI) */}
      {isInspectionModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-stone-200 dark:border-slate-800 w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 md:p-8 space-y-6 animate-scaleIn text-right">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-slate-800 pb-4">
              <h3 className="font-black text-lg text-stone-900 dark:text-white flex items-center gap-2">
                <ClipboardCheck className="text-amber-600" />
                {editingInspection ? 'ویرایش درخواست بازرسی کیفی' : 'ثبت درخواست جدید بازرسی کیفی (RFI)'}
              </h3>
              <button
                onClick={() => {
                  setIsInspectionModalOpen(false);
                  setEditingInspection(null);
                }}
                className="p-2 text-stone-400 hover:text-stone-600 dark:hover:text-white rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveInspection} className="space-y-4 text-xs font-bold">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-stone-700 dark:text-slate-300 mb-1">شماره RFI:</label>
                  <input
                    type="text"
                    name="rfiNumber"
                    defaultValue={editingInspection?.rfiNumber || `RFI-1403-${Math.floor(100 + Math.random() * 900)}`}
                    placeholder="مثال: RFI-1403-102"
                    autoComplete="off"
                    data-lpignore="true"
                    className="w-full p-3 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl font-bold text-stone-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500/30"
                    required
                  />
                </div>

                <div>
                  <label className="block text-stone-700 dark:text-slate-300 mb-1">رده کاری / Discipline:</label>
                  <select
                    name="discipline"
                    defaultValue={editingInspection?.discipline || (uniqueDisciplines[0] || 'CONCRETE')}
                    className="w-full p-3 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl font-bold text-stone-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500/30"
                    required
                  >
                    {uniqueDisciplines.map((disc) => (
                      <option key={disc} value={disc}>
                        {getDisciplineLabel(disc)}
                      </option>
                    ))}
                    {uniqueDisciplines.length === 0 && (
                      <option value="CONCRETE">بتن و سازه (بدون الگوی تعریف شده)</option>
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-stone-700 dark:text-slate-300 mb-1">عنوان فعالیت و موضوع بازرسی:</label>
                <input
                  type="text"
                  name="title"
                  defaultValue={editingInspection?.title || ''}
                  placeholder="مثال: بازرسی آرماتوربندی و قالب‌بندی ستون‌های محور B"
                  autoComplete="off"
                  data-lpignore="true"
                  className="w-full p-3 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl font-bold text-stone-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500/30"
                  required
                />
              </div>

              <div>
                <label className="block text-stone-700 dark:text-slate-300 mb-1">موقعیت دقیق اجرایی:</label>
                <input
                  type="text"
                  name="location"
                  defaultValue={editingInspection?.location || ''}
                  placeholder="مثال: محور A1 تا C4 - تراز -3.50"
                  autoComplete="off"
                  data-lpignore="true"
                  className="w-full p-3 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl font-bold text-stone-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500/30"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-stone-700 dark:text-slate-300 mb-1">نام بازرس / ناظر مقیم:</label>
                  <input
                    type="text"
                    name="inspector"
                    defaultValue={editingInspection?.inspector || ''}
                    placeholder="مثال: مهندس رضایی (ناظر مقیم سازه)"
                    autoComplete="off"
                    data-lpignore="true"
                    className="w-full p-3 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl font-bold text-stone-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500/30"
                  />
                </div>

                <div>
                  <label className="block text-stone-700 dark:text-slate-300 mb-1">نام شرکت پیمانکار:</label>
                  <input
                    type="text"
                    name="contractor"
                    defaultValue={editingInspection?.contractor || ''}
                    placeholder="مثال: شرکت پارس سازه (پیمانکار عمومی)"
                    autoComplete="off"
                    data-lpignore="true"
                    className="w-full p-3 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl font-bold text-stone-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-stone-700 dark:text-slate-300 mb-1">تاریخ درخواست:</label>
                  <ShamsiDatePicker
                    value={rfiRequestDate}
                    onChange={setRfiRequestDate}
                    placeholder="1403/02/25"
                    inputClassName="!p-3 !bg-stone-50 dark:!bg-slate-800 !border-stone-200 dark:!border-slate-700 !rounded-xl !font-bold !text-stone-900 dark:!text-white !text-center"
                  />
                </div>

                <div>
                  <label className="block text-stone-700 dark:text-slate-300 mb-1">تاریخ بازرسی:</label>
                  <ShamsiDatePicker
                    value={rfiInspectionDate}
                    onChange={setRfiInspectionDate}
                    placeholder="1403/02/26"
                    inputClassName="!p-3 !bg-stone-50 dark:!bg-slate-800 !border-stone-200 dark:!border-slate-700 !rounded-xl !font-bold !text-stone-900 dark:!text-white !text-center"
                  />
                </div>
              </div>

              <div>
                <label className="block text-stone-700 dark:text-slate-300 mb-1">توضیحات:</label>
                <textarea
                  name="description"
                  rows={3}
                  defaultValue={editingInspection?.description || ''}
                  placeholder="مثال: توضیحات، الزامات، نکات ایمنی و دستورکار ناظر جهت کنترل..."
                  autoComplete="off"
                  data-lpignore="true"
                  className="w-full p-3 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl font-bold text-stone-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500/30"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsInspectionModalOpen(false)}
                  className="px-5 py-2.5 bg-stone-100 dark:bg-slate-800 text-stone-700 dark:text-slate-300 rounded-xl font-bold hover:bg-stone-200 transition-colors"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-stone-950 font-black rounded-xl shadow-md transition-all"
                >
                  ذخیره RFI
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CHECKLIST EVALUATION MODAL */}
      {isChecklistEvalModalOpen && activeInspectionForEval && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-stone-200 dark:border-slate-800 w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 md:p-8 space-y-6 animate-scaleIn text-right">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-slate-800 pb-4">
              <div>
                <span className="text-xs font-black text-amber-600 dir-ltr block">
                  {activeInspectionForEval.rfiNumber}
                </span>
                <h3 className="font-black text-base text-stone-900 dark:text-white mt-0.5">
                  ارزیابی چک‌لیست: {activeInspectionForEval.title}
                </h3>
              </div>
              <button
                onClick={() => setIsChecklistEvalModalOpen(false)}
                className="p-2 text-stone-400 hover:text-stone-600 rounded-full"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-3.5 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 rounded-2xl flex items-center justify-between gap-3">
                <span className="text-xs font-black text-amber-900 dark:text-amber-300">
                  وضعیت کلی بازرسی RFI:
                </span>
                <select
                  value={
                    activeInspectionForEval.status === 'PASSED'
                      ? 'APPROVED'
                      : activeInspectionForEval.status === 'FAILED'
                      ? 'REJECTED'
                      : activeInspectionForEval.status || 'PENDING'
                  }
                  onChange={(e) => handleUpdateInspectionStatus(activeInspectionForEval.id, e.target.value as QCInspectionStatus)}
                  className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 rounded-xl text-xs font-black text-stone-900 dark:text-white outline-none cursor-pointer shadow-2xs"
                >
                  <option value="APPROVED">تایید شده</option>
                  <option value="CONDITIONAL">تایید مشروط</option>
                  <option value="REJECTED">عدم تایید / رد</option>
                  <option value="PENDING">در انتظار بازرسی</option>
                </select>
              </div>

              <p className="text-xs text-stone-500 font-bold">
                جهت هر بند کنترلی، وضعیت انطباق آن را مشخص نمایید:
              </p>

              <div className="space-y-3">
                {activeInspectionForEval.checklists.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-4 bg-stone-50 dark:bg-slate-800/60 rounded-2xl border border-stone-200/60 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="w-6 h-6 bg-amber-500/10 text-amber-600 font-black rounded-lg flex items-center justify-center text-xs shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-black text-stone-900 dark:text-white leading-relaxed">
                        {item.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          toggleChecklistItem(
                            activeInspectionForEval.id,
                            item.id,
                            item.status === 'PASSED' || item.status === 'APPROVED' ? 'PENDING' : 'PASSED'
                          )
                        }
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 border cursor-pointer ${
                          item.status === 'PASSED' || item.status === 'APPROVED'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                            : 'bg-white dark:bg-slate-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-700 hover:border-emerald-300'
                        }`}
                      >
                        <CheckCircle2 size={14} />
                        تایید
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          toggleChecklistItem(
                            activeInspectionForEval.id,
                            item.id,
                            item.status === 'FAILED' || item.status === 'REJECTED' ? 'PENDING' : 'FAILED'
                          )
                        }
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 border cursor-pointer ${
                          item.status === 'FAILED' || item.status === 'REJECTED'
                            ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                            : 'bg-white dark:bg-slate-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-700 hover:border-rose-300'
                        }`}
                      >
                        <XCircle size={14} />
                        مردود
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-stone-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setIsChecklistEvalModalOpen(false)}
                className="px-6 py-2.5 bg-amber-500 text-stone-950 font-black rounded-xl"
              >
                تایید و بستن
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: NCR FORM MODAL */}
      {isNcrModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-stone-200 dark:border-slate-800 w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 md:p-8 space-y-6 animate-scaleIn text-right">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-slate-800 pb-4">
              <h3 className="font-black text-lg text-stone-900 dark:text-white flex items-center gap-2">
                <AlertTriangle className="text-rose-600" />
                {editingNcr ? 'ویرایش و تغییر وضعیت عدم انطباق (NCR)' : 'صدور گزارش جدید عدم انطباق (NCR)'}
              </h3>
              <button onClick={() => setIsNcrModalOpen(false)} className="p-2 text-stone-400">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveNcr} className="space-y-4 text-xs font-bold">
              {isNcrRestricted && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 border border-amber-200/40 rounded-xl font-bold text-xs">
                  توجه: این گزارش عدم انطباق (NCR) توسط سازمان دیگری صادر شده است. شما تنها مجاز به تکمیل/ویرایش بخش «اقدام اصلاحی پیشنهادی» مربوط به سازمان خود هستید{userOrgType === 'CONSULTANT' ? ' (و امکان تغییر وضعیت گزارش را دارید)' : ''}.
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-stone-700 dark:text-slate-300 mb-1">شماره NCR:</label>
                  <input
                    type="text"
                    name="ncrNumber"
                    defaultValue={editingNcr?.ncrNumber || `NCR-1403-${Math.floor(100 + Math.random() * 900)}`}
                    disabled={isContractorRestricted}
                    autoComplete="off"
                    data-lpignore="true"
                    className={`w-full p-3 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl font-bold text-stone-900 dark:text-white outline-none ${
                      isContractorRestricted ? 'opacity-70 cursor-not-allowed bg-stone-100/50 dark:bg-slate-800/50' : ''
                    }`}
                    required
                  />
                </div>

                <div>
                  <label className="block text-stone-700 dark:text-slate-300 mb-1">شدت عدم انطباق (Severity):</label>
                  <select
                    name="severity"
                    defaultValue={editingNcr?.severity || 'HIGH'}
                    disabled={isContractorRestricted}
                    className={`w-full p-3 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl font-bold text-stone-900 dark:text-white outline-none ${
                      isContractorRestricted ? 'opacity-70 cursor-not-allowed bg-stone-100/50 dark:bg-slate-800/50' : ''
                    }`}
                  >
                    <option value="CRITICAL">بحرانی (توقف کار)</option>
                    <option value="HIGH">شدید</option>
                    <option value="MEDIUM">متوسط</option>
                    <option value="LOW">جزیی</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-stone-700 dark:text-slate-300 mb-1">عنوان و موضوع عدم انطباق:</label>
                <input
                  type="text"
                  name="title"
                  defaultValue={editingNcr?.title || ''}
                  disabled={isContractorRestricted}
                  placeholder="مثال: کرمو شدن بتن در پایه دیوار برشی محور D"
                  autoComplete="off"
                  data-lpignore="true"
                  className={`w-full p-3 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl font-bold text-stone-900 dark:text-white outline-none ${
                    isContractorRestricted ? 'opacity-70 cursor-not-allowed bg-stone-100/50 dark:bg-slate-800/50' : ''
                  }`}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-stone-700 dark:text-slate-300 mb-1">موقعیت دقیق عیب:</label>
                  <input
                    type="text"
                    name="location"
                    defaultValue={editingNcr?.location || ''}
                    disabled={isContractorRestricted}
                    placeholder="مثال: سقف اول محور 4"
                    autoComplete="off"
                    data-lpignore="true"
                    className={`w-full p-3 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl font-bold text-stone-900 dark:text-white outline-none ${
                      isContractorRestricted ? 'opacity-70 cursor-not-allowed bg-stone-100/50 dark:bg-slate-800/50' : ''
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-stone-700 dark:text-slate-300 mb-1">رده کاری:</label>
                  <input
                    type="text"
                    name="discipline"
                    defaultValue={editingNcr?.discipline || ''}
                    disabled={isContractorRestricted}
                    placeholder="مثال: بتن و سازه"
                    autoComplete="off"
                    data-lpignore="true"
                    className={`w-full p-3 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl font-bold text-stone-900 dark:text-white outline-none ${
                      isContractorRestricted ? 'opacity-70 cursor-not-allowed bg-stone-100/50 dark:bg-slate-800/50' : ''
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-stone-700 dark:text-slate-300 mb-1">تاریخ صدور:</label>
                  <ShamsiDatePicker
                    value={ncrIssueDate}
                    onChange={setNcrIssueDate}
                    disabled={isContractorRestricted}
                    inputClassName={`!p-3 !bg-stone-50 dark:!bg-slate-800 !border-stone-200 !rounded-xl !font-bold !text-center !text-stone-900 dark:!text-white ${
                      isContractorRestricted ? 'opacity-70 cursor-not-allowed bg-stone-100/50 dark:bg-slate-800/50' : ''
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-stone-700 dark:text-slate-300 mb-1">
                    مهلت رفع نقص:
                    {userOrgType === 'CONTRACTOR' && currentUser?.role !== 'SYSTEM_ADMIN' && (
                      <span className="text-[10px] text-stone-400 mr-1">(تعیین توسط مشاور/کارفرما)</span>
                    )}
                  </label>
                  <ShamsiDatePicker
                    value={ncrDeadlineDate}
                    onChange={setNcrDeadlineDate}
                    disabled={isDeadlineDisabled}
                    placeholder={userOrgType === 'CONTRACTOR' ? 'تعیین شده توسط مشاور/کارفرما' : '1403/--/--'}
                    inputClassName={`!p-3 !bg-stone-50 dark:!bg-slate-800 !border-stone-200 !rounded-xl !font-bold !text-center !text-stone-900 dark:!text-white ${
                      isDeadlineDisabled ? 'opacity-70 cursor-not-allowed bg-stone-100/50 dark:bg-slate-800/50' : ''
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-stone-700 dark:text-slate-300 mb-1">
                    وضعیت گزارش:
                    {isStatusDisabled && (
                      <span className="text-[10px] text-stone-400 mr-1">(غیر قابل تغییر)</span>
                    )}
                  </label>
                  <select
                    name="status"
                    defaultValue={editingNcr?.status || 'OPEN'}
                    disabled={isStatusDisabled}
                    className={`w-full p-3 bg-stone-50 dark:bg-slate-800 border border-stone-200 rounded-xl font-bold text-stone-900 dark:text-white outline-none ${
                      isStatusDisabled ? 'opacity-70 cursor-not-allowed bg-stone-100/50 dark:bg-slate-800/50' : ''
                    }`}
                  >
                    <option value="OPEN">صادر شده (مفتوح)</option>
                    <option value="CORRECTIVE_ACTION">در حال اقدام اصلاحی</option>
                    <option value="VERIFICATION">در حال ارزیابی مجدد</option>
                    {((userOrgType === 'CONSULTANT' || userOrgType === 'EMPLOYER' || currentUser?.role === 'SYSTEM_ADMIN') || editingNcr?.status === 'CLOSED') && (
                      <option value="CLOSED">بسته شده (مختوم)</option>
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-stone-700 dark:text-slate-300 mb-1">شرح عدم انطباق و عیب مشاهده شده:</label>
                <textarea
                  name="description"
                  rows={2}
                  defaultValue={editingNcr?.description || ''}
                  disabled={isContractorRestricted}
                  autoComplete="off"
                  data-lpignore="true"
                  className={`w-full p-3 bg-stone-50 dark:bg-slate-800 border border-stone-200 rounded-xl font-bold text-stone-900 dark:text-white outline-none ${
                    isContractorRestricted ? 'opacity-70 cursor-not-allowed bg-stone-100/50 dark:bg-slate-800/50' : ''
                  }`}
                  required
                />
              </div>

              <div className="space-y-4 pt-3 border-t border-stone-100 dark:border-slate-800">
                <h4 className="font-black text-stone-800 dark:text-stone-200">اقدامات اصلاحی پیشنهادی:</h4>
                
                <div>
                  <label className="block text-stone-700 dark:text-slate-300 mb-1">
                    اقدام اصلاحی پیشنهادی پیمانکار:
                    {!(userOrgType === 'CONTRACTOR' || currentUser?.role === 'SYSTEM_ADMIN') && (
                      <span className="text-[10px] text-stone-400 mr-2">(غیر قابل ویرایش توسط سازمان شما)</span>
                    )}
                  </label>
                  <textarea
                    name="correctiveActionContractor"
                    rows={2}
                    defaultValue={editingNcr?.correctiveActionContractor || ''}
                    disabled={!(userOrgType === 'CONTRACTOR' || currentUser?.role === 'SYSTEM_ADMIN')}
                    placeholder={(userOrgType === 'CONTRACTOR' || currentUser?.role === 'SYSTEM_ADMIN') ? "اقدام اصلاحی پیشنهادی از سوی پیمانکار را بنویسید..." : "موردی ثبت نشده است"}
                    autoComplete="off"
                    data-lpignore="true"
                    className={`w-full p-3 bg-stone-50 dark:bg-slate-800 border border-stone-200 rounded-xl font-bold text-stone-900 dark:text-white outline-none ${
                      !(userOrgType === 'CONTRACTOR' || currentUser?.role === 'SYSTEM_ADMIN') ? 'opacity-70 cursor-not-allowed bg-stone-100/50 dark:bg-slate-800/50' : ''
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-stone-700 dark:text-slate-300 mb-1">
                    اقدام اصلاحی پیشنهادی مشاور:
                    {!(userOrgType === 'CONSULTANT' || currentUser?.role === 'SYSTEM_ADMIN') && (
                      <span className="text-[10px] text-stone-400 mr-2">(غیر قابل ویرایش توسط سازمان شما)</span>
                    )}
                  </label>
                  <textarea
                    name="correctiveActionConsultant"
                    rows={2}
                    defaultValue={editingNcr?.correctiveActionConsultant || ''}
                    disabled={!(userOrgType === 'CONSULTANT' || currentUser?.role === 'SYSTEM_ADMIN')}
                    placeholder={(userOrgType === 'CONSULTANT' || currentUser?.role === 'SYSTEM_ADMIN') ? "اقدام اصلاحی پیشنهادی از سوی مشاور را بنویسید..." : "موردی ثبت نشده است"}
                    autoComplete="off"
                    data-lpignore="true"
                    className={`w-full p-3 bg-stone-50 dark:bg-slate-800 border border-stone-200 rounded-xl font-bold text-stone-900 dark:text-white outline-none ${
                      !(userOrgType === 'CONSULTANT' || currentUser?.role === 'SYSTEM_ADMIN') ? 'opacity-70 cursor-not-allowed bg-stone-100/50 dark:bg-slate-800/50' : ''
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-stone-700 dark:text-slate-300 mb-1">
                    اقدام اصلاحی پیشنهادی کارفرما:
                    {!(userOrgType === 'EMPLOYER' || currentUser?.role === 'SYSTEM_ADMIN') && (
                      <span className="text-[10px] text-stone-400 mr-2">{"(غیر قابل ویرایش توسط سازمان شما)"}</span>
                    )}
                  </label>
                  <textarea
                    name="correctiveActionEmployer"
                    rows={2}
                    defaultValue={editingNcr?.correctiveActionEmployer || ''}
                    disabled={!(userOrgType === 'EMPLOYER' || currentUser?.role === 'SYSTEM_ADMIN')}
                    placeholder={(userOrgType === 'EMPLOYER' || currentUser?.role === 'SYSTEM_ADMIN') ? "اقدام اصلاحی پیشنهادی از سوی کارفرما را بنویسید..." : "موردی ثبت نشده است"}
                    autoComplete="off"
                    data-lpignore="true"
                    className={`w-full p-3 bg-stone-50 dark:bg-slate-800 border border-stone-200 rounded-xl font-bold text-stone-900 dark:text-white outline-none ${
                      !(userOrgType === 'EMPLOYER' || currentUser?.role === 'SYSTEM_ADMIN') ? 'opacity-70 cursor-not-allowed bg-stone-100/50 dark:bg-slate-800/50' : ''
                    }`}
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsNcrModalOpen(false)}
                  className="px-5 py-2.5 bg-stone-100 dark:bg-slate-800 rounded-xl font-bold"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-rose-600 text-white font-black rounded-xl shadow-md"
                >
                  ثبت NCR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: LAB TEST MODAL */}
      {isLabTestModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-stone-200 dark:border-slate-800 w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 md:p-8 space-y-6 animate-scaleIn text-right">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-slate-800 pb-4">
              <h3 className="font-black text-lg text-stone-900 dark:text-white flex items-center gap-2">
                <FlaskConical className="text-amber-600" />
                ثبت شیت آزمایشگاهی جدید
              </h3>
              <button onClick={() => setIsLabTestModalOpen(false)} className="p-2 text-stone-400">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveLabTest} className="space-y-4 text-xs font-bold">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-stone-700 dark:text-slate-300 mb-1">شماره شیت آزمایش:</label>
                  <input
                    type="text"
                    name="testNumber"
                    defaultValue={editingLabTest?.testNumber || `LAB-C-1403-${Math.floor(100 + Math.random() * 900)}`}
                    autoComplete="off"
                    data-lpignore="true"
                    className="w-full p-3 bg-stone-50 dark:bg-slate-800 border border-stone-200 rounded-xl font-bold text-stone-900 dark:text-white outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-stone-700 dark:text-slate-300 mb-1">نوع آزمایش:</label>
                  <input
                    type="text"
                    name="testType"
                    defaultValue={editingLabTest?.testType ? getLabTestTypeLabel(editingLabTest.testType) : ''}
                    placeholder="مثال: مقاومت فشاری بتن، کشش آرماتور، دانسیته خاک..."
                    autoComplete="off"
                    data-lpignore="true"
                    className="w-full p-3 bg-stone-50 dark:bg-slate-800 border border-stone-200 rounded-xl font-bold text-stone-900 dark:text-white outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-stone-700 dark:text-slate-300 mb-1">محل و پارت نمونه‌گیری:</label>
                <input
                  type="text"
                  name="sampleLocation"
                  defaultValue={editingLabTest?.sampleLocation || ''}
                  placeholder="مثال: بتن‌ریزی فونداسیون - پارت دوم"
                  autoComplete="off"
                  data-lpignore="true"
                  className="w-full p-3 bg-stone-50 dark:bg-slate-800 border border-stone-200 rounded-xl font-bold text-stone-900 dark:text-white outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-stone-700 dark:text-slate-300 mb-1">تاریخ نمونه‌برداری:</label>
                  <ShamsiDatePicker
                    value={labSamplingDate}
                    onChange={setLabSamplingDate}
                    placeholder="1403/02/20"
                    required
                    inputClassName="!p-3 !bg-stone-50 dark:!bg-slate-800 !border-stone-200 dark:!border-slate-700 !rounded-xl !font-bold !text-stone-900 dark:!text-white outline-none !text-center"
                  />
                </div>

                <div>
                  <label className="block text-stone-700 dark:text-slate-300 mb-1">تاریخ انجام آزمایش / پاسخ:</label>
                  <ShamsiDatePicker
                    value={labTestDate}
                    onChange={setLabTestDate}
                    placeholder="1403/02/22"
                    required
                    inputClassName="!p-3 !bg-stone-50 dark:!bg-slate-800 !border-stone-200 dark:!border-slate-700 !rounded-xl !font-bold !text-stone-900 dark:!text-white outline-none !text-center"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-stone-700 dark:text-slate-300 mb-1">مشخصه طراحی (معیار پذیرش):</label>
                  <input
                    type="text"
                    name="designSpecification"
                    defaultValue={editingLabTest?.designSpecification || ''}
                    placeholder="مثال: رده C30 (مقاومت ۲۸ روزه ۳۰ MPa)"
                    autoComplete="off"
                    data-lpignore="true"
                    className="w-full p-3 bg-stone-50 dark:bg-slate-800 border border-stone-200 rounded-xl font-bold text-stone-900 dark:text-white outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-stone-700 dark:text-slate-300 mb-1">نتیجه بدست آمده:</label>
                  <input
                    type="text"
                    name="resultValue"
                    defaultValue={editingLabTest?.resultValue || ''}
                    placeholder="مثال: ۳۴.۸ مگاپاسکال"
                    autoComplete="off"
                    data-lpignore="true"
                    className="w-full p-3 bg-stone-50 dark:bg-slate-800 border border-stone-200 rounded-xl font-bold text-stone-900 dark:text-white outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-stone-700 dark:text-slate-300 mb-1">نام آزمایشگاه مرجع:</label>
                  <input
                    type="text"
                    name="labName"
                    defaultValue={editingLabTest?.labName || 'آزمایشگاه مکانیک خاک و بتن کارگاه'}
                    autoComplete="off"
                    data-lpignore="true"
                    className="w-full p-3 bg-stone-50 dark:bg-slate-800 border border-stone-200 rounded-xl font-bold text-stone-900 dark:text-white outline-none"
                  />
                </div>

                {(userOrgType !== 'CONTRACTOR' || currentUser?.role === 'SYSTEM_ADMIN') && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 col-span-2">
                    {/* Consultant Compliance Selection */}
                    {(userOrgType === 'CONSULTANT' || currentUser?.role === 'SYSTEM_ADMIN') && (
                      <div className={currentUser?.role === 'SYSTEM_ADMIN' ? "" : "col-span-2"}>
                        <label className="block text-stone-700 dark:text-slate-300 mb-1 font-bold">
                          نظر دستگاه نظارت (مشاور):
                        </label>
                        <select
                          name="consultantComplianceStatus"
                          defaultValue={
                            editingLabTest?.consultantComplianceStatus ||
                            (editingLabTest?.complianceStatus !== 'PENDING' ? editingLabTest?.complianceStatus : 'PENDING')
                          }
                          className="w-full p-3 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl font-bold text-stone-900 dark:text-white outline-none"
                        >
                          <option value="PENDING">در انتظار بررسی مشاور</option>
                          <option value="COMPLIANT">منطبق بر مشخصات فنی</option>
                          <option value="NON_COMPLIANT">عدم انطباق با مشخصات فنی</option>
                          <option value="CONDITIONAL">تایید مشروط (با ملاحظات)</option>
                        </select>
                      </div>
                    )}

                    {/* Employer Compliance Selection */}
                    {(userOrgType === 'EMPLOYER' || currentUser?.role === 'SYSTEM_ADMIN') && (
                      <div className={currentUser?.role === 'SYSTEM_ADMIN' ? "" : "col-span-2"}>
                        <label className="block text-amber-800 dark:text-amber-400 mb-1 font-bold">
                          نظر کارفرما (مدیریت پروژه):
                        </label>
                        <select
                          name="employerComplianceStatus"
                          defaultValue={
                            editingLabTest?.employerComplianceStatus || 'PENDING'
                          }
                          className="w-full p-3 bg-amber-50/50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl font-bold text-stone-900 dark:text-white outline-none"
                        >
                          <option value="PENDING">در انتظار نظر کارفرما</option>
                          <option value="COMPLIANT">منطبق بر مشخصات فنی</option>
                          <option value="NON_COMPLIANT">عدم انطباق</option>
                          <option value="CONDITIONAL">تایید مشروط (با ملاحظات)</option>
                        </select>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsLabTestModalOpen(false)}
                  className="px-5 py-2.5 bg-stone-100 dark:bg-slate-800 rounded-xl font-bold"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-amber-500 text-stone-950 font-black rounded-xl shadow-md"
                >
                  ثبت شیت آزمایش
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: OFFICIAL RFI PRINT MODAL */}
      {isPrintModalOpen && printInspectionData && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white text-stone-900 rounded-[2rem] w-full max-w-3xl max-h-[90vh] overflow-y-auto p-8 space-y-6 text-right print:p-0 print:shadow-none">
            {/* Standard Official Header */}
            <div className="border-2 border-stone-800 rounded-2xl overflow-hidden mb-6 text-xs text-stone-900">
              <div className="grid grid-cols-12 divide-x divide-x-reverse divide-stone-800 bg-stone-50/90">
                <div className="col-span-4 p-3 flex flex-col justify-center space-y-1 font-bold text-[11px]">
                  <div><span className="text-stone-500">کارفرما:</span> {currentProject?.employerName || 'نامشخص'}</div>
                  <div><span className="text-stone-500">مشاور:</span> {currentProject?.consultantName || 'نامشخص'}</div>
                  <div><span className="text-stone-500">پیمانکار:</span> {currentProject?.contractorName || 'نامشخص'}</div>
                </div>
                <div className="col-span-5 p-3 flex flex-col items-center justify-center text-center border-r border-l border-stone-800">
                  <h2 className="font-black text-sm text-stone-900 mb-1">
                    فرم رسمی درخواست بازرسی کیفی (RFI)
                  </h2>
                  <span className="text-[11px] font-bold text-stone-700">
                    پروژه: {currentProject?.title || 'پروژه عمرانی'}
                  </span>
                  {currentProject?.contractNumber && (
                    <span className="text-[10px] text-stone-500 font-medium mt-0.5">
                      شماره پیمان: {currentProject.contractNumber}
                    </span>
                  )}
                </div>
                <div className="col-span-3 p-3 flex flex-col justify-center text-left font-black text-[11px] space-y-1 dir-ltr">
                  <div>RFI No: {printInspectionData.rfiNumber}</div>
                  <div>Date: {printInspectionData.inspectionDate}</div>
                  <div>Page: 1 of 1</div>
                </div>
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 border border-stone-300 rounded-xl p-4 gap-3 text-xs font-bold">
              <div>
                <span className="text-stone-500">پروژه:</span> {currentProject.title}
              </div>
              <div>
                <span className="text-stone-500">موقعیت اجرایی:</span> {printInspectionData.location}
              </div>
              <div>
                <span className="text-stone-500">موضوع بازرسی:</span> {printInspectionData.title}
              </div>
              <div>
                <span className="text-stone-500">رده کاری:</span> {getDisciplineLabel(printInspectionData.discipline)}
              </div>
              <div>
                <span className="text-stone-500">دستگاه نظارت:</span> {printInspectionData.inspector}
              </div>
              <div>
                <span className="text-stone-500">پیمانکار:</span> {printInspectionData.contractor}
              </div>
              <div className="col-span-2 border-t border-stone-200 pt-2 mt-1">
                <span className="text-stone-500">وضعیت بازرسی:</span>{" "}
                <span className={`${
                  printInspectionData.isFinalFrozen || printInspectionData.workflowStatus === 'APPROVED_BY_EMPLOYER'
                    ? 'text-emerald-700 font-black'
                    : printInspectionData.status === 'APPROVED'
                    ? 'text-emerald-600 font-bold'
                    : printInspectionData.status === 'REJECTED'
                    ? 'text-red-600 font-bold'
                    : printInspectionData.status === 'CONDITIONAL'
                    ? 'text-amber-600 font-bold'
                    : 'text-stone-500 font-bold'
                }`}>
                  {printInspectionData.isFinalFrozen || printInspectionData.workflowStatus === 'APPROVED_BY_EMPLOYER'
                    ? 'تایید نهایی و قطعی'
                    : printInspectionData.status === 'APPROVED'
                    ? 'تایید شده (مطابق با مشخصات)'
                    : printInspectionData.status === 'REJECTED'
                    ? 'عدم تایید (مردود)'
                    : printInspectionData.status === 'CONDITIONAL'
                    ? 'تایید مشروط با ملاحظات'
                    : 'معلق / در حال بررسی'}
                </span>
              </div>
            </div>

            {/* Checklist Table */}
            <div>
              <h4 className="font-black text-xs mb-2">ارزیابی بندهای چک‌لیست:</h4>
              <table className="w-full border-collapse border border-stone-400 text-xs text-right">
                <thead>
                  <tr className="bg-stone-200 font-black">
                    <th className="border border-stone-400 p-2 w-10 text-center">ردیف</th>
                    <th className="border border-stone-400 p-2">عنوان بند کنترلی</th>
                    <th className="border border-stone-400 p-2 w-28 text-center">وضعیت انطباق</th>
                  </tr>
                </thead>
                <tbody>
                  {printInspectionData.checklists.map((chk, i) => (
                    <tr key={chk.id}>
                      <td className="border border-stone-400 p-2 text-center">{i + 1}</td>
                      <td className="border border-stone-400 p-2">{chk.title}</td>
                      <td className="border border-stone-400 p-2 text-center font-black">
                        {chk.status === 'PASSED'
                          ? 'تایید'
                          : chk.status === 'FAILED'
                          ? 'عدم تایید'
                          : (chk.status === 'PENDING' || printInspectionData.status === 'PENDING')
                          ? 'در انتظار نظر مشاور'
                          : 'معلق'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 9-Box Official Signatures */}
            {renderQC9BoxSignaturesUI(printInspectionData.workflowHistory)}

            {/* Actions */}
            <div className="pt-4 flex items-center justify-end gap-3 print:hidden">
              <button
                onClick={() => setIsPrintModalOpen(false)}
                className="px-5 py-2 bg-stone-200 text-stone-800 rounded-xl font-bold text-xs"
              >
                بستن
              </button>
              <button
                onClick={() => handlePrintOfficial('rfi', printInspectionData)}
                className="px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
              >
                <Printer size={15} /> چاپ رسمی A4
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: OFFICIAL NCR PRINT MODAL */}
      {isNcrPrintModalOpen && printNcrData && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white text-stone-900 rounded-[2rem] w-full max-w-3xl max-h-[92vh] overflow-y-auto p-8 space-y-6 text-right print:p-0 print:shadow-none print:max-h-none print:w-full print:rounded-none">
            {/* Standard Official Header */}
            <div className="border-2 border-stone-800 rounded-2xl overflow-hidden mb-6 text-xs text-stone-900">
              <div className="grid grid-cols-12 divide-x divide-x-reverse divide-stone-800 bg-stone-50/90">
                <div className="col-span-4 p-3 flex flex-col justify-center space-y-1 font-bold text-[11px]">
                  <div><span className="text-stone-500">کارفرما:</span> {currentProject?.employerName || 'نامشخص'}</div>
                  <div><span className="text-stone-500">مشاور:</span> {currentProject?.consultantName || 'نامشخص'}</div>
                  <div><span className="text-stone-500">پیمانکار:</span> {currentProject?.contractorName || 'نامشخص'}</div>
                </div>
                <div className="col-span-5 p-3 flex flex-col items-center justify-center text-center border-r border-l border-stone-800">
                  <h2 className="font-black text-sm text-stone-900 mb-1">
                    فرم رسمی گزارش عدم انطباق (NCR)
                  </h2>
                  <span className="text-[11px] font-bold text-stone-700">
                    پروژه: {currentProject?.title || 'پروژه عمرانی'}
                  </span>
                  {currentProject?.contractNumber && (
                    <span className="text-[10px] text-stone-500 font-medium mt-0.5">
                      شماره پیمان: {currentProject.contractNumber}
                    </span>
                  )}
                </div>
                <div className="col-span-3 p-3 flex flex-col justify-center text-left font-black text-[11px] space-y-1 dir-ltr">
                  <div>NCR No: {printNcrData.ncrNumber}</div>
                  <div>Date: {printNcrData.issueDate}</div>
                  {printNcrData.deadlineDate && <div>Deadline: {printNcrData.deadlineDate}</div>}
                  <div>Page: 1 of 1</div>
                </div>
              </div>
            </div>

            {/* Status & Severity Bar */}
            <div className="grid grid-cols-3 bg-stone-100 p-3 rounded-xl border border-stone-300 text-xs font-bold text-center">
              <div>
                <span className="text-stone-500 ml-1">وضعیت گزارش:</span>
                <span className="font-black text-stone-900">
                  {getNcrStatusLabel(printNcrData.status)}
                </span>
              </div>
              <div>
                <span className="text-stone-500 ml-1">شدت عدم انطباق:</span>
                <span className="font-black text-rose-700">
                  {printNcrData.severity === 'CRITICAL'
                    ? 'بسیار حاد (بحرانی)'
                    : printNcrData.severity === 'HIGH'
                    ? 'حاد (بالا)'
                    : printNcrData.severity === 'MEDIUM'
                    ? 'متوسط'
                    : 'جزئی (پایین)'}
                </span>
              </div>
              <div>
                <span className="text-stone-500 ml-1">گرایش:</span>
                <span className="font-black text-stone-900">{getDisciplineLabel(printNcrData.discipline)}</span>
              </div>
            </div>

            {/* General Info */}
            <div className="border border-stone-300 rounded-xl p-4 space-y-3 text-xs font-bold">
              <h4 className="font-black text-sm border-b border-stone-200 pb-2 text-stone-800">
                ۱. مشخصات عمومی و صادرکننده
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-stone-500">عنوان عدم انطباق:</span> {printNcrData.title}
                </div>
                <div>
                  <span className="text-stone-500">موقعیت و محل دقیق:</span> {printNcrData.location}
                </div>
                <div>
                  <span className="text-stone-500">صادرکننده:</span> {printNcrData.issuedBy}
                </div>
                <div>
                  <span className="text-stone-500">طرف مسئول / پیمانکار:</span> {printNcrData.responsibleParty}
                </div>
              </div>
            </div>

            {/* Description & Root Cause */}
            <div className="border border-stone-300 rounded-xl p-4 space-y-3 text-xs font-bold">
              <h4 className="font-black text-sm border-b border-stone-200 pb-2 text-stone-800">
                ۲. شرح عدم انطباق و علت ریشه‌ای
              </h4>
              <div>
                <span className="text-stone-500 block mb-1">شرح کامل عدم انطباق:</span>
                <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 whitespace-pre-wrap leading-relaxed">
                  {printNcrData.description || 'ثبت نشده'}
                </div>
              </div>
              {printNcrData.rootCause && (
                <div>
                  <span className="text-stone-500 block mb-1">علت ریشه‌ای بروز عیب:</span>
                  <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 whitespace-pre-wrap leading-relaxed">
                    {printNcrData.rootCause}
                  </div>
                </div>
              )}
            </div>

            {/* Proposed Corrective Actions */}
            <div className="border border-stone-300 rounded-xl p-4 space-y-3 text-xs font-bold">
              <h4 className="font-black text-sm border-b border-stone-200 pb-2 text-stone-800">
                ۳. اقدامات اصلاحی پیشنهادی و نظرات سازمان‌ها
              </h4>
              <div className="space-y-2">
                <div>
                  <span className="text-emerald-800 font-black block mb-1">پیشنهاد اقدام اصلاحی پیمانکار:</span>
                  <div className="p-2.5 bg-emerald-50/70 rounded-lg border border-emerald-200 whitespace-pre-wrap leading-relaxed">
                    {printNcrData.correctiveActionContractor || '---'}
                  </div>
                </div>
                <div>
                  <span className="text-blue-800 font-black block mb-1">نظر / پیشنهاد دستگاه نظارت (مشاور):</span>
                  <div className="p-2.5 bg-blue-50/70 rounded-lg border border-blue-200 whitespace-pre-wrap leading-relaxed">
                    {printNcrData.correctiveActionConsultant || '---'}
                  </div>
                </div>
                <div>
                  <span className="text-amber-800 font-black block mb-1">نظر / دستور کارفرما:</span>
                  <div className="p-2.5 bg-amber-50/70 rounded-lg border border-amber-200 whitespace-pre-wrap leading-relaxed">
                    {printNcrData.correctiveActionEmployer || '---'}
                  </div>
                </div>
                {printNcrData.correctiveAction && (
                  <div>
                    <span className="text-stone-900 font-black block mb-1">اقدام اصلاحی نهایی مصوب:</span>
                    <div className="p-2.5 bg-stone-100 rounded-lg border border-stone-300 whitespace-pre-wrap leading-relaxed">
                      {printNcrData.correctiveAction}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 9-Box Official Signatures */}
            {renderQC9BoxSignaturesUI(printNcrData.workflowHistory)}

            {/* Actions */}
            <div className="pt-4 flex items-center justify-end gap-3 print:hidden border-t border-stone-200">
              <button
                onClick={() => setIsNcrPrintModalOpen(false)}
                className="px-5 py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-xl font-bold text-xs cursor-pointer transition-all"
              >
                بستن
              </button>
              <button
                onClick={() => handlePrintOfficial('ncr', printNcrData)}
                className="px-6 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
              >
                <Printer size={15} /> چاپ رسمی A4
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: OFFICIAL LAB TEST PRINT MODAL */}
      {isLabPrintModalOpen && printLabData && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white text-stone-900 rounded-[2rem] w-full max-w-3xl max-h-[92vh] overflow-y-auto p-8 space-y-6 text-right print:p-0 print:shadow-none print:max-h-none print:w-full print:rounded-none">
            {/* Standard Official Header */}
            <div className="border-2 border-stone-800 rounded-2xl overflow-hidden mb-6 text-xs text-stone-900">
              <div className="grid grid-cols-12 divide-x divide-x-reverse divide-stone-800 bg-stone-50/90">
                <div className="col-span-4 p-3 flex flex-col justify-center space-y-1 font-bold text-[11px]">
                  <div><span className="text-stone-500">کارفرما:</span> {currentProject?.employerName || 'نامشخص'}</div>
                  <div><span className="text-stone-500">مشاور:</span> {currentProject?.consultantName || 'نامشخص'}</div>
                  <div><span className="text-stone-500">پیمانکار:</span> {currentProject?.contractorName || 'نامشخص'}</div>
                </div>
                <div className="col-span-5 p-3 flex flex-col items-center justify-center text-center border-r border-l border-stone-800">
                  <h2 className="font-black text-sm text-stone-900 mb-1">
                    شیت رسمی نتایج آزمایشگاه و کنترل کیفیت
                  </h2>
                  <span className="text-[11px] font-bold text-stone-700">
                    پروژه: {currentProject?.title || 'پروژه عمرانی'}
                  </span>
                  {currentProject?.contractNumber && (
                    <span className="text-[10px] text-stone-500 font-medium mt-0.5">
                      شماره پیمان: {currentProject.contractNumber}
                    </span>
                  )}
                </div>
                <div className="col-span-3 p-3 flex flex-col justify-center text-left font-black text-[11px] space-y-1 dir-ltr">
                  <div>LAB No: {printLabData.testNumber}</div>
                  <div>Date: {printLabData.testDate || printLabData.samplingDate}</div>
                  <div>Page: 1 of 1</div>
                </div>
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 border border-stone-300 rounded-xl p-4 gap-3 text-xs font-bold">
              <div>
                <span className="text-stone-500 ml-1">نوع آزمایش:</span>
                <span className="text-stone-900 font-black">{getLabTestTypeLabel(printLabData.testType)}</span>
              </div>
              <div>
                <span className="text-stone-500 ml-1">محل نمونه‌برداری:</span> {printLabData.sampleLocation || '---'}
              </div>
              <div>
                <span className="text-stone-500 ml-1">تاریخ نمونه‌برداری:</span> {printLabData.samplingDate || '---'}
              </div>
              <div>
                <span className="text-stone-500 ml-1">تاریخ جواب آزمایش:</span> {printLabData.testDate || '---'}
              </div>
              <div>
                <span className="text-stone-500 ml-1">نام آزمایشگاه:</span> {printLabData.labName || '---'}
              </div>
              <div>
                <span className="text-stone-500 ml-1">مسئول آزمایشگاه:</span> {printLabData.approvedBy || '---'}
              </div>
            </div>

            {/* Results & Compliance */}
            <div className="border border-stone-300 rounded-xl p-4 space-y-3 text-xs">
              <div>
                <span className="text-stone-500 font-bold ml-1">معیار و مشخصات طراحی:</span>
                <span className="font-bold text-stone-800">{printLabData.designSpecification || '---'}</span>
              </div>
              <div>
                <span className="text-stone-500 font-bold ml-1">نتیجه آزمایشگاه:</span>
                <span className="font-black text-stone-900 text-sm">{printLabData.resultValue || '---'}</span>
              </div>
              <div className="pt-4 border-t border-stone-200 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-stone-500 font-bold">نظر دستگاه نظارت (مشاور):</span>
                    <span className={`font-black px-2.5 py-0.5 rounded-full border text-[11px] ${
                      (printLabData.consultantComplianceStatus || (!printLabData.employerComplianceStatus ? printLabData.complianceStatus : undefined)) === 'COMPLIANT' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      (printLabData.consultantComplianceStatus || (!printLabData.employerComplianceStatus ? printLabData.complianceStatus : undefined)) === 'NON_COMPLIANT' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                      (printLabData.consultantComplianceStatus || (!printLabData.employerComplianceStatus ? printLabData.complianceStatus : undefined)) === 'CONDITIONAL' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-stone-50 text-stone-600 border-stone-200'
                    }`}>
                      {getComplianceStatusText(printLabData.consultantComplianceStatus || (!printLabData.employerComplianceStatus ? printLabData.complianceStatus : undefined))}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-800 font-bold">نظر کارفرما (مدیریت پروژه):</span>
                    <span className={`font-black px-2.5 py-0.5 rounded-full border text-[11px] ${
                      printLabData.employerComplianceStatus === 'COMPLIANT' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      printLabData.employerComplianceStatus === 'NON_COMPLIANT' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                      printLabData.employerComplianceStatus === 'CONDITIONAL' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-stone-50 text-stone-600 border-stone-200'
                    }`}>
                      {getComplianceStatusText(printLabData.employerComplianceStatus, true)}
                    </span>
                  </div>
                </div>
                <div className="pt-2 border-t border-stone-100 flex items-center justify-between bg-stone-50 dark:bg-slate-800 p-2.5 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-stone-700 dark:text-slate-300 font-black">نتیجه نهایی انطباق فنی:</span>
                    <span className={`font-black px-3 py-1 rounded-full text-xs border ${
                      getEffectiveComplianceStatus(printLabData) === 'COMPLIANT' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                      getEffectiveComplianceStatus(printLabData) === 'NON_COMPLIANT' ? 'bg-rose-100 text-rose-800 border-rose-300' :
                      getEffectiveComplianceStatus(printLabData) === 'CONDITIONAL' ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-stone-100 text-stone-700 border-stone-300'
                    }`}>
                      {getComplianceStatusText(getEffectiveComplianceStatus(printLabData), 'final')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 9-Box Official Signatures */}
            {renderQC9BoxSignaturesUI(printLabData.workflowHistory)}

            {/* Actions */}
            <div className="pt-4 flex items-center justify-end gap-3 print:hidden border-t border-stone-200">
              <button
                onClick={() => setIsLabPrintModalOpen(false)}
                className="px-5 py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-xl font-bold text-xs cursor-pointer transition-all"
              >
                بستن
              </button>
              <button
                onClick={() => handlePrintOfficial('lab', printLabData)}
                className="px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
              >
                <Printer size={15} /> چاپ رسمی A4
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: WORKFLOW ACTION MODAL */}
      {isWorkflowModalOpen && workflowTarget && workflowActionType && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-stone-200 dark:border-slate-800 w-full max-w-md p-6 md:p-8 space-y-5 animate-scaleIn text-right">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-slate-800 pb-3">
              <h3 className="font-black text-base text-stone-900 dark:text-white flex items-center gap-2">
                <Send className="text-amber-600" size={20} />
                تغییر وضعیت چرخه کار: {WorkflowService.getActionLabel(workflowActionType, userOrgType, currentUser?.id)}
              </h3>
              <button onClick={() => setIsWorkflowModalOpen(false)} className="p-1 text-stone-400 hover:text-stone-600">
                <X size={18} />
              </button>
            </div>

            <div className="text-xs space-y-3 font-bold">
              <div className="p-3 bg-stone-50 dark:bg-slate-800/80 rounded-2xl border border-stone-200/80 dark:border-slate-700">
                <div className="text-stone-500 mb-1">سند انتخاب شده:</div>
                <div className="text-stone-900 dark:text-white font-black text-sm">
                  {workflowTarget.testNumber ? (
                    `شماره شیت: ${workflowTarget.testNumber} - ${getLabTestTypeLabel(workflowTarget.testType) || 'شیت آزمایشگاه'}${workflowTarget.sampleLocation ? ` (${workflowTarget.sampleLocation})` : ''}`
                  ) : (
                    `${workflowTarget.rfiNumber || workflowTarget.ncrNumber || ''} - ${workflowTarget.title || 'سند بدون عنوان'}`
                  )}
                </div>
              </div>

              {/* Assignee Selection for forwarding/submitting */}
              {([
                'SUBMIT',
                'SEND_TO_CONSULTANT',
                'SEND_TO_EMPLOYER',
                'REASSIGN',
                'APPROVE',
                'REJECT',
                'RETURN_TO_CONTRACTOR',
                'RETURN_TO_CONSULTANT'
              ] as WorkflowAction[]).includes(workflowActionType) && (
                <div>
                  <label className="block text-stone-700 dark:text-slate-300 mb-1">
                    {workflowActionType === "SEND_TO_CONSULTANT"
                      ? "انتخاب گیرنده (در مشاور):"
                      : workflowActionType === "SEND_TO_EMPLOYER"
                        ? "انتخاب گیرنده (در کارفرما):"
                        : workflowActionType === "RETURN_TO_CONTRACTOR"
                          ? "انتخاب گیرنده (در پیمانکار):"
                          : workflowActionType === "RETURN_TO_CONSULTANT"
                            ? "انتخاب گیرنده (در مشاور):"
                            : workflowActionType === "APPROVE"
                              ? "انتخاب گیرنده بعدی (جهت ارجاع):"
                              : workflowActionType === "REJECT"
                                ? "انتخاب دریافت‌کننده سند رد شده:"
                                : "ارسال به (ارجاع گیرنده):"}
                  </label>
                  <select
                    value={workflowAssignee}
                    onChange={(e) => setWorkflowAssignee(e.target.value)}
                    className="w-full p-3 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl font-bold text-stone-900 dark:text-white outline-none"
                  >
                    <option value="">انتخاب کاربر مسئول...</option>
                    {getWorkflowTargetUsers(workflowActionType, workflowTarget, currentUser).map((u) => (
                      <option key={u.id} value={u.id}>
                        {formatUserDisplayFormal(u, SystemAdminService.getOrganization(u.orgId))}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-stone-700 dark:text-slate-300 mb-1">توضیحات و هامش (دستورکار / نظر):</label>
                <textarea
                  value={workflowComment}
                  onChange={(e) => setWorkflowComment(e.target.value)}
                  rows={3}
                  placeholder="توضیحات یا ملاحظات مربوط به این اقدام..."
                  autoComplete="off"
                  data-lpignore="true"
                  spellCheck={false}
                  className="w-full p-3 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl font-bold text-stone-900 dark:text-white outline-none"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                onClick={() => setIsWorkflowModalOpen(false)}
                className="px-4 py-2 bg-stone-100 dark:bg-slate-800 text-stone-700 dark:text-slate-300 rounded-xl font-bold text-xs"
              >
                انصراف
              </button>
              <button
                onClick={handleConfirmWorkflow}
                disabled={(() => {
                  const ut = (currentUser?.jobTitle || "").trim();
                  const ul = (currentUser?.jobLevel || "").trim();
                  const isPMOrWorkshopManager =
                    ut.includes("مدیر پروژه") ||
                    ul.includes("مدیر پروژه") ||
                    ut.includes("سرپرست کارگاه") ||
                    ul.includes("سرپرست کارگاه");
                  
                  if (workflowActionType === "REJECT" && (!workflowComment.trim() || !workflowAssignee)) {
                    return true;
                  }
                  
                  const actionsRequiringAssignee = [
                    "SUBMIT",
                    "RESUBMIT",
                    "REASSIGN",
                    "SEND_TO_CONSULTANT",
                    "SEND_TO_EMPLOYER",
                    "SEND_TO_CONTRACTOR",
                    "RETURN_TO_CONTRACTOR",
                    "RETURN_TO_CONSULTANT"
                  ];
                  
                  if (workflowActionType === "APPROVE" && !isPMOrWorkshopManager && !workflowAssignee) {
                    return true;
                  }

                  if (actionsRequiringAssignee.includes(workflowActionType as string) && !workflowAssignee) {
                    return true;
                  }

                  if ((workflowActionType === "RETURN_TO_CONTRACTOR" ||
                       workflowActionType === "RETURN_TO_CONSULTANT" ||
                       workflowActionType === "UNFREEZE_BY_VARIATION") &&
                      !workflowComment.trim()) {
                    return true;
                  }

                  return false;
                })()}
                className={`px-6 py-2.5 text-xs font-black rounded-xl text-white shadow-lg transition-all ${
                  (() => {
                    const ut = (currentUser?.jobTitle || "").trim();
                    const ul = (currentUser?.jobLevel || "").trim();
                    const isPMOrWorkshopManager =
                      ut.includes("مدیر پروژه") ||
                      ul.includes("مدیر پروژه") ||
                      ut.includes("سرپرست کارگاه") ||
                      ul.includes("سرپرست کارگاه");
                    
                    let isDisabled = false;
                    if (workflowActionType === "REJECT" && (!workflowComment.trim() || !workflowAssignee)) isDisabled = true;
                    const actionsRequiringAssignee = ["SUBMIT", "REASSIGN", "SEND_TO_CONSULTANT", "SEND_TO_EMPLOYER", "RETURN_TO_CONTRACTOR", "RETURN_TO_CONSULTANT"];
                    if (workflowActionType === "APPROVE" && !isPMOrWorkshopManager && !workflowAssignee) isDisabled = true;
                    if (actionsRequiringAssignee.includes(workflowActionType as string) && !workflowAssignee) isDisabled = true;
                    if ((workflowActionType === "RETURN_TO_CONTRACTOR" || workflowActionType === "RETURN_TO_CONSULTANT") && !workflowComment.trim()) isDisabled = true;

                    if (isDisabled) {
                      return 'bg-stone-300 dark:bg-slate-700 text-stone-500 cursor-not-allowed shadow-none opacity-60';
                    }
                    if (workflowActionType === "REJECT" || workflowActionType === "RETURN_TO_CONTRACTOR" || workflowActionType === "RETURN_TO_CONSULTANT") {
                      return 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/30 cursor-pointer scale-105';
                    }
                    if (workflowActionType === "APPROVE" || workflowActionType === "FINAL_APPROVE") {
                      return 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30 cursor-pointer scale-105';
                    }
                    return 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/30 cursor-pointer scale-105';
                  })()
                }`}
              >
                تایید و ثبت در چرخه کار
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CUSTOM NCR HANDOFF MODAL */}
      {isNcrHandoffModalOpen && ncrHandoffTarget && ncrHandoffType && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-stone-200 dark:border-slate-800 w-full max-w-md p-6 md:p-8 space-y-5 animate-scaleIn text-right">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-slate-800 pb-3">
              <h3 className="font-black text-base text-stone-900 dark:text-white flex items-center gap-2">
                <Send className="text-amber-600" size={20} />
                {ncrHandoffType === 'TO_CONSULTANT'
                  ? 'ارسال گزارش عدم انطباق به مشاور'
                  : ncrHandoffType === 'TO_EMPLOYER'
                  ? 'ارسال گزارش عدم انطباق به کارفرما'
                  : 'ارسال گزارش عدم انطباق به پیمانکار'}
              </h3>
              <button onClick={() => setIsNcrHandoffModalOpen(false)} className="p-1 text-stone-400 hover:text-stone-600">
                <X size={18} />
              </button>
            </div>

            <div className="text-xs space-y-3 font-bold">
              <div className="p-3 bg-stone-50 dark:bg-slate-800/80 rounded-2xl border border-stone-200/80 dark:border-slate-700">
                <div className="text-stone-500 mb-1">سند انتخاب شده:</div>
                <div className="text-stone-900 dark:text-white font-black text-sm">
                  {ncrHandoffTarget.ncrNumber} - {ncrHandoffTarget.title}
                </div>
              </div>

              <div>
                <label className="block text-stone-700 dark:text-slate-300 mb-1">
                  {ncrHandoffType === 'TO_CONSULTANT'
                    ? 'انتخاب گیرنده (در مشاور):'
                    : ncrHandoffType === 'TO_EMPLOYER'
                    ? 'انتخاب گیرنده (در کارفرما):'
                    : 'انتخاب گیرنده (در پیمانکار):'}
                </label>
                <select
                  value={ncrHandoffAssignee}
                  onChange={(e) => setNcrHandoffAssignee(e.target.value)}
                  className="w-full p-3 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl font-bold text-stone-900 dark:text-white outline-none"
                >
                  <option value="">انتخاب کاربر مسئول...</option>
                  {(() => {
                    const orgs = SystemAdminService.getOrganizations();
                    const targetOrgType =
                      ncrHandoffType === 'TO_CONSULTANT'
                        ? 'CONSULTANT'
                        : ncrHandoffType === 'TO_EMPLOYER'
                        ? 'EMPLOYER'
                        : 'CONTRACTOR';
                    const targetOrgs = orgs.filter(o => o.type === targetOrgType);
                    return SystemAdminService.getUsers().filter(u => {
                      if (!u.isActive) return false;
                      if (u.id === currentUser?.id || (currentUser?.username && u.username === currentUser.username)) return false;
                      const isTargetOrg = targetOrgs.some(o => o.id === u.orgId);
                      if (!isTargetOrg) return false;
                      const ut = (u.jobTitle || "").trim();
                      const ul = (u.jobLevel || "").trim();
                      return ut.includes('مدیر پروژه') || ul.includes('مدیر پروژه') || ut.includes('سرپرست کارگاه') || ul.includes('سرپرست کارگاه');
                    });
                  })().map((u) => (
                    <option key={u.id} value={u.id}>
                      {formatUserDisplayFormal(u, SystemAdminService.getOrganization(u.orgId))}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-stone-700 dark:text-slate-300 mb-1">توضیحات و هامش (دستورکار / نظر):</label>
                <textarea
                  value={ncrHandoffComment}
                  onChange={(e) => setNcrHandoffComment(e.target.value)}
                  rows={3}
                  placeholder="توضیحات یا ملاحظات مربوط به این اقدام..."
                  autoComplete="off"
                  data-lpignore="true"
                  spellCheck={false}
                  className="w-full p-3 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl font-bold text-stone-900 dark:text-white outline-none"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                onClick={() => setIsNcrHandoffModalOpen(false)}
                className="px-4 py-2 bg-stone-100 dark:bg-slate-800 text-stone-700 dark:text-slate-300 rounded-xl font-bold text-xs"
              >
                انصراف
              </button>
              <button
                onClick={handleConfirmNcrHandoff}
                disabled={!ncrHandoffAssignee}
                className={`px-6 py-2.5 text-xs font-black rounded-xl text-white shadow-lg transition-all ${
                  !ncrHandoffAssignee
                    ? 'bg-stone-300 dark:bg-slate-700 text-stone-500 cursor-not-allowed shadow-none opacity-60'
                    : 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/30 cursor-pointer scale-105'
                }`}
              >
                تایید و ثبت ارجاع
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 7: WORKFLOW HISTORY MODAL */}
      {isHistoryModalOpen && historyTarget && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fadeIn" dir="rtl">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl max-h-[80vh] flex flex-col text-stone-700">
            <div className="p-6 border-b border-[#ece5d8] flex justify-between items-center bg-[#faf8f4]">
              <h3 className="font-black text-stone-800 flex items-center gap-2 text-sm md:text-base">
                <ScrollText size={20} className="text-stone-600" />
                تاریخچه تغییرات ({historyTarget.rfiNumber || historyTarget.ncrNumber || historyTarget.testNumber})
              </h3>
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="p-2 hover:bg-stone-200 rounded-full transition-colors text-stone-500"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4 text-right" dir="rtl">
              {!historyTarget.workflowHistory ||
              historyTarget.workflowHistory.length === 0 ? (
                <div className="text-center text-stone-400 py-8 text-sm font-bold">
                  هیچ سابقه‌ای ثبت نشده است.
                </div>
              ) : (
                [...historyTarget.workflowHistory]
                  .sort((a, b) => b.timestamp - a.timestamp)
                  .map((event, idx) => (
                    <div key={event.id || idx} className="flex gap-4 relative">
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-3 h-3 rounded-full z-10 ${
                            event.action === "APPROVE" || event.action === "FINAL_APPROVE"
                              ? "bg-emerald-500"
                              : event.action === "REJECT"
                                ? "bg-red-500"
                                : "bg-amber-500"
                          }`}
                        />
                        {idx <
                          (historyTarget.workflowHistory?.length || 0) - 1 && (
                          <div className="w-0.5 flex-1 bg-stone-200 my-1" />
                        )}
                      </div>
                      <div className="flex-1 pb-6 text-right" dir="rtl">
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-black text-stone-800 text-xs">
                            {WorkflowService.getActionLabel(event.action, undefined, event.actorUserId)}
                          </span>
                          <span className="text-[10px] text-stone-400 font-bold dir-ltr">
                            {new Date(event.timestamp).toLocaleString("fa-IR")}
                          </span>
                        </div>
                        <div className="text-[10px] text-stone-500 mb-1">
                          توسط:{" "}
                          <span className="font-bold text-stone-700">
                            {event.actorName}
                          </span>
                        </div>
                        {(() => {
                          const assigneeUser = event.assigneeUserId
                            ? SystemAdminService.getUsers().find((u) => u.id === event.assigneeUserId)
                            : undefined;
                          const assigneeOrg = assigneeUser?.orgId
                            ? SystemAdminService.getOrganization(assigneeUser.orgId)
                            : undefined;
                          const fullAssigneeName = assigneeUser
                            ? formatUserDisplayFormal(assigneeUser, assigneeOrg)
                            : event.assigneeName;

                          return fullAssigneeName ? (
                            <div className="text-[10px] text-stone-900 bg-[#faf8f4] px-2 py-1 rounded-lg w-fit mb-1">
                              گیرنده: {fullAssigneeName}
                            </div>
                          ) : null;
                        })()}
                        {event.comment && (
                          <div className="text-[10px] text-stone-600 bg-[#faf8f4] p-2.5 rounded-xl border border-[#ece5d8] italic">
                            {event.action === "EDIT" ? (
                              <div className="space-y-1 not-italic text-right" dir="rtl">
                                <span className="font-extrabold text-stone-900 block text-[9px] mb-1">اقلام تغییر یافته:</span>
                                {event.comment.split(" | ").map((changeStr: string, cIdx: number) => {
                                  const parts = changeStr.split(": ");
                                  if (parts.length === 2) {
                                    return (
                                      <div key={cIdx} className="bg-white p-2 rounded-lg border border-[#ece5d8] flex items-start gap-1 font-bold">
                                        <span className="text-stone-500 font-black shrink-0">{parts[0]}:</span>
                                        <span className="text-stone-700">{parts[1]}</span>
                                      </div>
                                    );
                                  }
                                  return (
                                    <div key={cIdx} className="bg-white p-2 rounded-lg border border-[#ece5d8] text-stone-700 font-bold">
                                      {changeStr}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <span className="block">"{event.comment}"</span>
                            )}
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[9px] px-2 py-0.5 rounded bg-stone-100 text-stone-500">
                            {WorkflowService.getStatusLabel(event.fromStatus)}
                          </span>
                          <ArrowLeftCircle
                            size={10}
                            className="text-stone-300"
                          />
                          <span className="text-[9px] px-2 py-0.5 rounded bg-stone-100 text-stone-500">
                            {WorkflowService.getStatusLabel(event.toStatus)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 8: ADD / EDIT STANDARD CHECKLIST */}
      {isStdChecklistModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-stone-200 dark:border-slate-800 w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 md:p-8 space-y-6 animate-scaleIn text-right" dir="rtl">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-slate-800 pb-4">
              <h3 className="font-black text-lg text-stone-900 dark:text-white flex items-center gap-2">
                <ClipboardCheck className="text-amber-600" />
                {editingStdChecklist ? 'ویرایش چک‌لیست مرجع کارگاهی' : 'تعریف چک‌لیست مرجع کارگاهی جدید'}
              </h3>
              <button
                onClick={() => {
                  setIsStdChecklistModalOpen(false);
                  setEditingStdChecklist(null);
                }}
                className="p-2 text-stone-400 hover:text-stone-600 dark:hover:text-white rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveStdChecklist} className="space-y-4 text-xs font-bold">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-stone-700 dark:text-slate-300 mb-1">عنوان چک‌لیست:</label>
                  <input
                    type="text"
                    name="title"
                    defaultValue={editingStdChecklist?.title || ''}
                    placeholder="مثال: چک‌لیست اجرای تاسیسات الکتریکی"
                    autoComplete="off"
                    data-lpignore="true"
                    className="w-full p-3 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl font-bold text-stone-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500/30"
                    required
                  />
                </div>

                <div>
                  <label className="block text-stone-700 dark:text-slate-300 mb-1">دسته‌بندی (دپارتمان):</label>
                  <input
                    type="text"
                    name="category"
                    defaultValue={editingStdChecklist?.category || ''}
                    placeholder="مثال: تاسیسات برقی"
                    autoComplete="off"
                    data-lpignore="true"
                    className="w-full p-3 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl font-bold text-stone-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500/30"
                    required
                  />
                </div>

                <div>
                  <label className="block text-stone-700 dark:text-slate-300 mb-1">رده کاری فنی (Discipline):</label>
                  <input
                    type="text"
                    name="discipline"
                    defaultValue={editingStdChecklist?.discipline || ''}
                    placeholder="مثال: بتن و سازه، آرماتوربندی، تاسیسات برقی"
                    autoComplete="off"
                    data-lpignore="true"
                    className="w-full p-3 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl font-bold text-stone-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500/30"
                    required
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-stone-100 dark:border-slate-800 pb-2">
                  <span className="text-stone-700 dark:text-slate-300">بندهای کنترلی چک‌لیست:</span>
                  <button
                    type="button"
                    onClick={handleAddStdChecklistItemField}
                    className="flex items-center gap-1 text-amber-600 hover:text-amber-700 font-black text-xs cursor-pointer"
                  >
                    <Plus size={14} />
                    افزودن بند کنترلی جدید
                  </button>
                </div>

                <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                  {stdChecklistItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="w-6 h-6 shrink-0 bg-stone-100 dark:bg-slate-800 rounded-lg flex items-center justify-center font-bold text-stone-500 dark:text-slate-400 text-[11px]">
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        value={item}
                        onChange={(e) => handleStdChecklistItemFieldChange(idx, e.target.value)}
                        placeholder={`بند کنترلی شماره ${idx + 1} را بنویسید...`}
                        autoComplete="off"
                        data-lpignore="true"
                        className="flex-1 p-3 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl font-bold text-stone-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500/30"
                        required
                      />
                      {stdChecklistItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveStdChecklistItemField(idx)}
                          className="p-3 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors shrink-0 cursor-pointer"
                          title="حذف این بند"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-stone-100 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsStdChecklistModalOpen(false);
                    setEditingStdChecklist(null);
                  }}
                  className="px-5 py-2.5 bg-stone-100 dark:bg-slate-800 hover:bg-stone-200 dark:hover:bg-slate-700 text-stone-700 dark:text-slate-300 rounded-2xl transition-colors cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl transition-all font-black flex items-center gap-2 shadow-md shadow-amber-600/15 cursor-pointer scale-102 hover:scale-105 active:scale-95"
                >
                  <FileCheck size={16} />
                  {editingStdChecklist ? 'ثبت تغییرات الگو' : 'ایجاد الگوی جدید'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      <DeleteModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="تایید حذف آیتم"
        description={`آیا از حذف "${deleteTarget?.title || ''}" اطمینان دارید؟ این عملیات قابل بازگشت نیست.`}
      />
    </div>
  );
}
