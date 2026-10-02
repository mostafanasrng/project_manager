import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  MessageSquare, Send, Users, User, Calendar, Plus, Trash2, 
  Check, X, FileText, CheckCircle, AlertCircle, AlertTriangle, RefreshCw, 
  Printer, ShieldAlert, Mail, Eye, Download, Reply,
  Edit3, Activity, ScrollText, ChevronLeft, Bell, ArrowLeftCircle, Paperclip,
  ArrowLeft, Building, CheckCircle2, UserCheck, CornerDownLeft, BookOpen, Layers,
  Lock, Info
} from 'lucide-react';
import { SystemAdminService } from '../services/systemAdminService';
import { Project, WorkflowStatus, WorkflowAction, WorkflowEvent, Notification, OfficialLetter, LetterMarginalia } from '../types';
import { SystemUser, OrganizationType } from '../systemAdminTypes';
import { WorkflowService } from '../services/workflowService';
import { HRService } from '../services/hrService';
import { formatShamsiDate } from '../utils/dateUtils';
import { NotificationService } from '../services/notificationService';
import { formatUserDisplayFormal } from '../src/utils/userFormatter';
import { OfficialLettersList } from '../src/components/communications/OfficialLettersList';
import { SecretariatDashboard } from '../src/components/communications/SecretariatDashboard';
import { OfficialLetterModal } from '../src/components/communications/OfficialLetterModal';
import { printOfficialLetter } from '../src/components/communications/OfficialLetterPrint';
import { ProjectMeetingsDashboard } from '../src/components/communications/ProjectMeetingsDashboard';
import { ProjectMeetingModal, ProjectMeetingFormState } from '../src/components/communications/ProjectMeetingModal';
import { printMeetingMinutes, MeetingDecisionItem, MeetingAttendeeItem, MeetingPartiesStructure, MeetingOrgSignatures } from '../src/components/communications/MeetingMinutePrint';
import { saveMeetingsStorage, getMeetingsStorage, sanitizeMeetingRecord, safeSetStorage } from '../src/utils/safeStorage';
import { ProjectMessagingDashboard } from '../src/components/communications/ProjectMessagingDashboard';

interface ChatMessage {
  id: string;
  projectId: string;
  channelId: 'general';
  senderId: string;
  senderName: string;
  senderRole: 'EMPLOYER' | 'CONSULTANT' | 'CONTRACTOR' | 'SYSTEM_ADMIN';
  senderOrgName: string;
  text: string;
  timestamp: string;
}

interface MeetingDecision {
  id: string;
  projectId: string;
  minuteNumber?: string;
  title: string;
  meetingType?: string;
  partiesStructure?: MeetingPartiesStructure;
  date: string;
  time?: string;
  location: string;
  chairperson?: string;
  secretary?: string;
  agenda?: string[];
  attendees: string[];
  attendeeList?: MeetingAttendeeItem[];
  absentees?: string[];
  decisions: string[];
  structuredDecisions?: MeetingDecisionItem[];
  nextMeetingDate?: string;
  nextMeetingLocation?: string;
  nextMeetingAgenda?: string;
  nextMeetingAgendas?: string[];
  recordedBy: string;
  notes?: string;
  tags?: string[];
  
  // Standard Workflow fields
  status: WorkflowStatus;
  assigneeId?: string;
  assigneeName?: string;
  workflowHistory?: WorkflowEvent[];
  createdById?: string;
  ownerOrgId?: string;
  currentOrgId?: string;
  isFinalFrozen?: boolean;
  sentToAllAttendees?: boolean;
  sentAt?: string;
  orgSignatures?: MeetingOrgSignatures;
  editorsLog?: string[];

  // Legacy fields (optional)
  approvals?: {
    employerApproved: boolean;
    consultantApproved: boolean;
    contractorApproved: boolean;
  };
  approvalComments?: {
    employerComment?: string;
    consultantComment?: string;
    contractorComment?: string;
  };
}

const MOCK_CHATS: ChatMessage[] = [
  {
    id: 'c1',
    projectId: '1',
    channelId: 'general',
    senderId: 'c-pm',
    senderName: 'مهندس حسینی',
    senderRole: 'CONTRACTOR',
    senderOrgName: 'پیمانکاری نوین ساخت',
    text: 'با سلام، نقشه شاپ دراوینگ بخش ابنیه برای تایید نهایی بارگذاری شد. لطفاً بررسی بفرمایید.',
    timestamp: '1403/03/10 09:15'
  },
  {
    id: 'c2',
    projectId: '1',
    channelId: 'general',
    senderId: 'cs-pm',
    senderName: 'مهندس احمدی',
    senderRole: 'CONSULTANT',
    senderOrgName: 'مشاورین سازه گستر',
    text: 'سلام و احترام، نقشه‌ها در حال بررسی توسط کارشناسان دفتر فنی است. بازخورد نهایی تا فردا ارسال خواهد شد.',
    timestamp: '1403/03/10 11:30'
  },
  {
    id: 'c3',
    projectId: '1',
    channelId: 'general',
    senderId: 'e-pm',
    senderName: 'مهندس رضایی',
    senderRole: 'EMPLOYER',
    senderOrgName: 'شرکت مهندسی الف',
    text: 'با تشکر از همکاران. با توجه به نزدیک شدن به تاریخ پایان فاز یک، تسریع در فرآیند بررسی نقشه‌ها مورد تاکید است.',
    timestamp: '1403/03/10 14:05'
  }
];

const MOCK_MEETINGS: MeetingDecision[] = [
  {
    id: 'm1',
    projectId: '1',
    minuteNumber: 'MOM-1403-001',
    title: 'تجهیز کارگاه، تحویل زمین و بازگشایی جبهه کاری بخش اداری',
    meetingType: 'SITE_COORDINATION',
    date: '1403/03/01',
    time: '10:00 الی 12:30',
    location: 'سالن کنفرانس کارگاه پروژه',
    chairperson: 'مهندس احمدی (سرپرست نظارت مقیم)',
    secretary: 'مهندس علوی (دفتر فنی پیمانکار)',
    agenda: [
      'بررسی و تحویل قطعی زمین بخش اداری و تاسیساتی',
      'برنامه زمان‌بندی استقرار کانکس‌ها و محوطه‌سازی انبار',
      'تجهیز اولیه کارگاه و تامین انشعابات موقت'
    ],
    attendees: ['مهندس رضایی (کارفرما)', 'مهندس احمدی (مشاور)', 'مهندس علوی (پیمانکار)', 'مهندس مرادی (ناظر مقیم)'],
    attendeeList: [
      { name: 'مهندس رضایی', role: 'مدیر پروژه کارفرما', organization: 'شرکت مهندسی الف (کارفرما)', orgType: 'EMPLOYER', attendanceStatus: 'PRESENT' },
      { name: 'مهندس احمدی', role: 'سرپرست دستگاه نظارت', organization: 'مهندسین مشاور سازه گستر', orgType: 'CONSULTANT', attendanceStatus: 'PRESENT' },
      { name: 'مهندس مرادی', role: 'ناظر مقیم سیویل', organization: 'مهندسین مشاور سازه گستر', orgType: 'CONSULTANT', attendanceStatus: 'PRESENT' },
      { name: 'مهندس علوی', role: 'سرپرست کارگاه', organization: 'شرکت پیمانکاری نوین ساخت', orgType: 'CONTRACTOR', attendanceStatus: 'PRESENT' }
    ],
    absentees: [],
    decisions: [
      'زمین بخش اداری به مساحت ۵۰۰ متر مربع طبق صورت‌مجلس پیوست تحویل پیمانکار گردید.',
      'پیمانکار موظف شد ظرف مدت ۱۰ روز نسبت به استقرار کانکس‌های اداری و فنس‌کشی محوطه اقدام نماید.',
      'تجهیز کارگاه بخش اداری نهایی شده و نقشه چیدمان موقت مورد تایید دستگاه نظارت قرار گرفت.'
    ],
    structuredDecisions: [
      {
        id: 'dec-1',
        itemNumber: 1,
        description: 'زمین بخش اداری به مساحت ۵۰۰ متر مربع طبق صورت‌مجلس تحویل زمین رسماً به پیمانکار واگذار شد.',
        actionParty: 'کارفرما و دستگاه نظارت',
        actionPartyOrgType: 'EMPLOYER',
        deadline: '1403/03/01',
        priority: 'HIGH',
        status: 'COMPLETED',
        progress: 100,
        notes: 'صورت‌مجلس تحویل زمین امضا گردید.'
      },
      {
        id: 'dec-2',
        itemNumber: 2,
        description: 'پیمانکار موظف شد ظرف مدت ۱۰ روز کاری نسبت به استقرار کامل کانکس‌های پرسنلی و فنس‌کشی اقدام نماید.',
        actionParty: 'پیمانکار اجرایی',
        actionPartyOrgType: 'CONTRACTOR',
        deadline: '1403/03/11',
        priority: 'MEDIUM',
        status: 'IN_PROGRESS',
        progress: 75,
        notes: 'کانکس‌ها بارگیری شده و در مرحله پیاده‌سازی هستند.'
      },
      {
        id: 'dec-3',
        itemNumber: 3,
        description: 'اخذ انشعاب برق موقت ۳۲ آمپر کارگاهی جهت تامین برق تاسیسات توسط کارفرما پیگیری گردد.',
        actionParty: 'نماینده کارفرما',
        actionPartyOrgType: 'EMPLOYER',
        deadline: '1403/03/15',
        priority: 'HIGH',
        status: 'PENDING',
        progress: 20
      }
    ],
    nextMeetingDate: '1403/03/15',
    nextMeetingLocation: 'دفتر مشاور در کارگاه',
    nextMeetingAgenda: 'کنترل پیشرفت تجهیز کارگاه و بررسی نتایج آزمایش خاک',
    recordedBy: 'مهندس احمدی (مشاور)',
    status: WorkflowStatus.SENT_TO_EMPLOYER,
    ownerOrgId: 'org-3', // Contractor
    currentOrgId: 'org-1', // Now with Employer
    createdById: 'morteza',
    tags: ['تجهیز کارگاه', 'تحویل زمین', 'اداری'],
    workflowHistory: [
      { id: 'h1', actorUserId: 'morteza', actorName: 'مرتضی', action: 'SUBMIT', timestamp: Date.now() - 172800000, fromStatus: WorkflowStatus.DRAFT, toStatus: WorkflowStatus.APPROVED_INTERNAL },
      { id: 'h2', actorUserId: 'mohsen', actorName: 'محسن', action: 'SEND_TO_CONSULTANT', timestamp: Date.now() - 86400000, fromStatus: WorkflowStatus.APPROVED_INTERNAL, toStatus: WorkflowStatus.SENT_TO_CONSULTANT },
      { id: 'h3', actorUserId: 'ahmad', actorName: 'احمد', action: 'SEND_TO_EMPLOYER', timestamp: Date.now() - 43200000, fromStatus: WorkflowStatus.SENT_TO_CONSULTANT, toStatus: WorkflowStatus.SENT_TO_EMPLOYER }
    ],
    approvals: {
      employerApproved: true,
      consultantApproved: true,
      contractorApproved: true
    },
    approvalComments: {
      employerComment: 'مورد تایید است. اولویت با تجهیز انبار سیمان و تامین انشعابات باشد.',
      consultantComment: 'جلسه تکمیل بوده و تعهدات لازم اخذ گردید.',
      contractorComment: 'موافق با صورت‌جلسه، تحویل زمین در زمان مناسب انجام شد.'
    }
  },
  {
    id: 'm2',
    projectId: '1',
    minuteNumber: 'MOM-1403-002',
    title: 'جلسه حل اختلاف و بررسی کیفیت بتن‌ریزی فاز غربی',
    meetingType: 'TECHNICAL',
    date: '1403/03/05',
    time: '14:00 الی 16:00',
    location: 'کارگاه پروژه - سالن جلسات',
    chairperson: 'مهندس کریمی (کارشناس ارشد بتن مشاور)',
    secretary: 'مهندس حسینی (پیمانکار)',
    agenda: [
      'بررسی مقاومت فشاری نمونه‌های بتن ۲۸ روزه ستون‌های تیپ A',
      'تصمیم‌گیری در خصوص اخذ مغزه‌گیری (Core) و چکش اشمیت',
      'بازنگری در طرح اختلاط بتن پمپی'
    ],
    attendees: ['مهندس رضایی (کارفرما)', 'مهندس کریمی (کارشناس ارشد بتن مشاور)', 'مهندس حسینی (پیمانکار)'],
    attendeeList: [
      { name: 'مهندس رضایی', role: 'مدیر پروژه', organization: 'شرکت مهندسی الف (کارفرما)', orgType: 'EMPLOYER', attendanceStatus: 'PRESENT' },
      { name: 'مهندس کریمی', role: 'کارشناس ارشد بتن', organization: 'مهندسین مشاور سازه گستر', orgType: 'CONSULTANT', attendanceStatus: 'PRESENT' },
      { name: 'مهندس حسینی', role: 'سرپرست کارگاه', organization: 'شرکت پیمانکاری نوین ساخت', orgType: 'CONTRACTOR', attendanceStatus: 'PRESENT' }
    ],
    absentees: ['مهندس بهرامی (مشاور ژئوتکنیک)'],
    decisions: [
      'نتایج آزمایش نمونه‌های بتن ۲۸ روزه ستون‌های تیپ A مجدداً توسط آزمایشگاه ذیصلاح ارزیابی گردد.',
      'تا زمان حصول نتایج نهایی آزمایشگاه سوم، کار روی بخش غربی سقف متوقف گردد.',
      'پیمانکار موظف به تقویت رویه‌های کیفی و ارائه طرح اختلاط بازنگری شده شد.'
    ],
    structuredDecisions: [
      {
        id: 'dec-201',
        itemNumber: 1,
        description: 'مقرر گردید توسط آزمایشگاه همکار استاندارد تعداد ۶ عدد مغزه بتنی (Core) از ستون‌های محور C تهیه و آزمایش شود.',
        actionParty: 'آزمایشگاه مکانیک خاک و پیمانکار',
        actionPartyOrgType: 'CONTRACTOR',
        deadline: '1403/03/10',
        priority: 'CRITICAL',
        status: 'IN_PROGRESS',
        progress: 60,
        notes: 'مغزه‌گیری انجام شد، نمونه‌ها در حوضچه عمل‌آوری هستند.'
      },
      {
        id: 'dec-202',
        itemNumber: 2,
        description: 'تا زمان حصول نتایج قطعی آزمایشگاهی، عملیات بارگذاری سقف روی این ستون‌ها متوقف بماند.',
        actionParty: 'پیمانکار و نظارت مقیم',
        actionPartyOrgType: 'CONTRACTOR',
        deadline: '1403/03/12',
        priority: 'CRITICAL',
        status: 'IN_PROGRESS',
        progress: 80
      },
      {
        id: 'dec-203',
        itemNumber: 3,
        description: 'پیمانکار نسبت به کالیبراسیون بچینگ پلانت و اخذ تاییدیه دپوی مصالح سنگی اقدام کند.',
        actionParty: 'مسئول کنترل کیفی پیمانکار',
        actionPartyOrgType: 'CONTRACTOR',
        deadline: '1403/03/08',
        priority: 'HIGH',
        status: 'COMPLETED',
        progress: 100,
        notes: 'گواهی کالیبراسیون با باسکول تحویل شد.'
      }
    ],
    nextMeetingDate: '1403/03/12',
    nextMeetingLocation: 'دفتر فنی کارگاه',
    nextMeetingAgenda: 'ارائه گزارش مغزه‌گیری بتن و تصمیم‌گیری در خصوص ادامه بتن‌ریزی',
    recordedBy: 'مهندس حسینی (پیمانکار)',
    status: WorkflowStatus.APPROVED_INTERNAL,
    ownerOrgId: 'org-3', // Contractor
    currentOrgId: 'org-3',
    createdById: 'morteza',
    tags: ['کنترل کیفیت', 'بتن', 'فنی', 'مغزه‌گیری'],
    workflowHistory: [
      { id: 'h-201', actorUserId: 'morteza', actorName: 'مرتضی', action: 'SUBMIT', timestamp: Date.now() - 86400000, fromStatus: WorkflowStatus.DRAFT, toStatus: WorkflowStatus.APPROVED_INTERNAL }
    ],
    approvals: {
      employerApproved: true,
      consultantApproved: true,
      contractorApproved: true
    },
    approvalComments: {
      employerComment: 'عدم عدول از مقاومت مشخصه، خط قرمز کارفرما است.',
      consultantComment: 'با رویکرد فنی تایید می‌گردد.',
      contractorComment: 'پیمانکار خود را ملزم به اجرای کدهای آیین‌نامه بتن می‌داند.'
    }
  }
];

const MOCK_OFFICIAL_LETTERS: OfficialLetter[] = [
  {
    id: 'let-101',
    projectId: '1',
    letterNumber: '1403/TECH/402',
    indicatorNumber: 'IND-9012',
    date: '1403/03/12',
    subject: 'ارسال نقشه‌های کارگاهی (Shop Drawing) سقف طبقه سوم جهت بررسی و تایید',
    scope: 'EXTERNAL',
    letterType: 'TECHNICAL',
    priority: 'URGENT',
    confidentiality: 'NORMAL',
    receiverTitle: 'سرپرست محترم دستگاه نظارت مقیم - شرکت مهندسین مشاور سازه گستر',
    receiverOrgId: 'org-2',
    receiverOrgName: 'مهندسین مشاور سازه گستر',
    attentionTo: 'پیرو صورتجلسه شماره ۴ مورخ 1403/03/01',
    content: '<p>احتراماً به پیوست یک نسخه از آلبوم نقشه‌های اجرایی و کارگاهی (Shop Drawing) مربوط به آرماتوربندی و قالب‌بندی سقف طبقه سوم بلوک غربی جهت بررسی، اعلام نظر فنی و ابلاغ دستور کار مقتضی ارسال می‌گردد.</p><p>خواهشمند است با عنایت به برنامه زمان‌بندی فشرده پروژه و استقرار پمپ بتن در تاریخ 1403/03/18، دستور فرمایند در بررسی و اعلام موافقت تسریع لازم به عمل آید.</p>',
    fontFamily: 'Vazirmatn',
    fontSize: '14px',
    senderOrgId: 'org-3',
    senderOrgName: 'شرکت پیمانکاری نوین ساخت',
    senderUserFullName: 'مهندس حسینی',
    senderUserJobTitle: 'سرپرست کارگاه',
    hasAttachment: true,
    attachments: [
      { id: 'att-1', name: 'ShopDrawing_Floor3_Rev01.pdf', size: '3.4 MB', type: 'application/pdf', uploadDate: '1403/03/12' },
      { id: 'att-2', name: 'BarBendingSchedule.xlsx', size: '420 KB', type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', uploadDate: '1403/03/12' }
    ],
    transcripts: [
      { id: 'tr-1', recipientName: 'مهندس رضایی', orgName: 'شرکت مهندسی الف (کارفرما)', roleOrJobTitle: 'مدیر محترم پروژه', note: 'جهت استحضار' },
      { id: 'tr-2', recipientName: 'دفتر فنی کارگاه', roleOrJobTitle: 'کارشناس دفتر فنی', note: 'جهت پیگیری' }
    ],
    status: WorkflowStatus.SENT_TO_CONSULTANT,
    ownerOrgId: 'org-3',
    currentOrgId: 'org-2',
    createdById: 'c-pm',
    workflowHistory: [
      { id: 'wh-1', actorUserId: 'c-pm', actorName: 'مهندس حسینی', action: 'SUBMIT', timestamp: Date.now() - 172800000, fromStatus: WorkflowStatus.DRAFT, toStatus: WorkflowStatus.APPROVED_INTERNAL },
      { id: 'wh-2', actorUserId: 'c-pm', actorName: 'مهندس حسینی', action: 'SEND_TO_CONSULTANT', timestamp: Date.now() - 86400000, fromStatus: WorkflowStatus.APPROVED_INTERNAL, toStatus: WorkflowStatus.SENT_TO_CONSULTANT }
    ]
  },
  {
    id: 'let-102',
    projectId: '1',
    letterNumber: '1403/ADM/118',
    indicatorNumber: 'IND-8840',
    date: '1403/03/10',
    subject: 'معرفی مهندس ناظر مقیم جایگزین در ایام تعطیلات پیش‌رو',
    scope: 'INTERNAL',
    letterType: 'ADMINISTRATIVE',
    priority: 'NORMAL',
    confidentiality: 'NORMAL',
    receiverTitle: 'کلیه همکاران محترم و سرپرستان واحدهای اجرایی و نظارتی',
    content: '<p>با سلام و احترام، به استحضار می‌رساند با توجه به مرخصی استحقاقی اینجانب در بازه زمانی ۱۴۰۳/۰۳/۱۴ لغایت ۱۴۰۳/۰۳/۱۷، جناب آقای مهندس کاظمی به عنوان جانشین و هماهنگ‌کننده امور کارگاهی معرفی می‌گردند.</p><p>کلیه مکاتبات و هماهنگی‌های فوری در این ایام از طریق ایشان صورت خواهد پذیرفت.</p>',
    fontFamily: 'Vazirmatn',
    fontSize: '14px',
    senderOrgId: 'org-3',
    senderOrgName: 'شرکت پیمانکاری نوین ساخت',
    senderUserFullName: 'مهندس علوی',
    senderUserJobTitle: 'مدیر پروژه',
    hasAttachment: false,
    attachments: [],
    transcripts: [],
    status: WorkflowStatus.APPROVED_INTERNAL,
    ownerOrgId: 'org-3',
    currentOrgId: 'org-3',
    createdById: 'morteza',
    workflowHistory: [
      { id: 'wh-3', actorUserId: 'morteza', actorName: 'مرتضی', action: 'SUBMIT', timestamp: Date.now() - 259200000, fromStatus: WorkflowStatus.DRAFT, toStatus: WorkflowStatus.APPROVED_INTERNAL }
    ]
  },
  {
    id: 'let-103',
    projectId: '1',
    letterNumber: '1403/HSE/054',
    indicatorNumber: 'IND-7931',
    date: '1403/03/08',
    subject: 'گزارش رفع عدم انطباق‌های ایمنی و بازرسی دوره‌ای داربست‌های نما',
    scope: 'INTERNAL',
    letterType: 'SAFETY',
    priority: 'URGENT',
    confidentiality: 'NORMAL',
    receiverTitle: 'سرپرست محترم کارگاه',
    content: '<p>احتراماً پیرو بازدید مشترک واحد HSE و بازرس اداره کار، کلیه بست‌ها و تخته‌بندی‌های داربست جبهه شمالی بازبینی و مهاربندی‌های لازم تکمیل گردید.</p><p>چک‌لیست‌های مربوطه پیوست بوده و شرایط جهت ادامه فعالیت اکیپ نماکاری ایمن اعلام می‌گردد.</p>',
    fontFamily: 'Vazirmatn',
    fontSize: '14px',
    senderOrgId: 'org-3',
    senderOrgName: 'شرکت پیمانکاری نوین ساخت',
    senderUserFullName: 'کارشناس HSE',
    senderUserJobTitle: 'مسئول ایمنی و بهداشت',
    hasAttachment: true,
    attachments: [
      { id: 'att-3', name: 'HSE_Scaffolding_Checklist.pdf', size: '1.1 MB', type: 'application/pdf', uploadDate: '1403/03/08' }
    ],
    transcripts: [],
    status: WorkflowStatus.DRAFT,
    ownerOrgId: 'org-3',
    currentOrgId: 'org-3',
    createdById: 'morteza',
    workflowHistory: []
  },
  {
    id: 'let-104',
    projectId: '1',
    letterNumber: '1403/CS/890',
    indicatorNumber: 'IND-9014',
    date: '1403/03/11',
    subject: 'ابلاغ نتایج بازرسی بتن‌ریزی فونداسیون و تایید ادامه عملیات اجرایی',
    scope: 'EXTERNAL',
    letterType: 'TECHNICAL',
    priority: 'URGENT',
    confidentiality: 'NORMAL',
    receiverTitle: 'مدیر محترم پروژه و سرپرست کارگاه - شرکت پیمانکاری نوین ساخت',
    receiverOrgId: 'org-3',
    receiverOrgName: 'شرکت پیمانکاری نوین ساخت',
    attentionTo: 'پیرو درخواست بررسی کیفیت شماره 1403/QA/201',
    content: '<p>احتراماً عطف به بازدید کارشناسان دستگاه نظارت از عملیات بتن‌ریزی فونداسیون محورهای A تا F و بررسی نتایج مقاومت فشاری ۷ روزه، ادامه عملیات قالب‌بندی و آرماتوربندی ستون‌های طبقه همکف بلامانع اعلام می‌گردد.</p><p>مقتضی است تمهیدات عمل‌آوری بتن مطابق مشخصات فنی عمومی (نشریه ۵۵) با دقت ادامه یابد.</p>',
    fontFamily: 'Vazirmatn',
    fontSize: '14px',
    senderOrgId: 'org-2',
    senderOrgName: 'مهندسین مشاور سازه گستر',
    senderUserFullName: 'مهندس احمدی',
    senderUserJobTitle: 'سرپرست دستگاه نظارت مقیم',
    hasAttachment: true,
    attachments: [
      { id: 'att-4', name: 'Concrete_Test_Results_7Days.pdf', size: '1.8 MB', type: 'application/pdf', uploadDate: '1403/03/11' }
    ],
    transcripts: [
      { id: 'tr-3', recipientName: 'مهندس رضایی', orgName: 'شرکت مهندسی الف (کارفرما)', roleOrJobTitle: 'مدیر محترم پروژه', note: 'جهت استحضار' }
    ],
    status: WorkflowStatus.APPROVED_BY_CONSULTANT,
    ownerOrgId: 'org-2',
    currentOrgId: 'org-3',
    createdById: 'cs-pm',
    workflowHistory: [
      { id: 'wh-4', actorUserId: 'cs-pm', actorName: 'مهندس احمدی', action: 'SUBMIT', timestamp: Date.now() - 190000000, fromStatus: WorkflowStatus.DRAFT, toStatus: WorkflowStatus.APPROVED_INTERNAL },
      { id: 'wh-5', actorUserId: 'cs-pm', actorName: 'مهندس احمدی', action: 'SEND_TO_CONTRACTOR', timestamp: Date.now() - 120000000, fromStatus: WorkflowStatus.APPROVED_INTERNAL, toStatus: WorkflowStatus.APPROVED_BY_CONSULTANT }
    ]
  },
  {
    id: 'let-105',
    projectId: '1',
    letterNumber: '1403/EMP/301',
    indicatorNumber: 'IND-8995',
    date: '1403/03/09',
    subject: 'ابلاغ تایید صورت‌وضعیت شماره ۲ و واریز پیش‌پرداخت تکمیلی',
    scope: 'EXTERNAL',
    letterType: 'FINANCIAL',
    priority: 'NORMAL',
    confidentiality: 'NORMAL',
    receiverTitle: 'مدیرعامل محترم و سرپرست کارگاه - شرکت پیمانکاری نوین ساخت',
    receiverOrgId: 'org-3',
    receiverOrgName: 'شرکت پیمانکاری نوین ساخت',
    content: '<p>احتراماً پیرو تاییدیه صورت‌وضعیت کارکرد موقت شماره ۲ توسط مهندسین مشاور، دستور پرداخت مبلغ مصوب صادر و به حساب بانکی پروژه منظور گردید.</p><p>خواهشمند است دستور فرمایید نسبت به تسریع در تامین متریال تاسیسات مکانیکی اقدام لازم معمول گردد.</p>',
    fontFamily: 'Vazirmatn',
    fontSize: '14px',
    senderOrgId: 'org-1',
    senderOrgName: 'شرکت مهندسی الف (کارفرما)',
    senderUserFullName: 'مهندس رضایی',
    senderUserJobTitle: 'مدیر پروژه کارفرما',
    hasAttachment: false,
    attachments: [],
    transcripts: [
      { id: 'tr-4', recipientName: 'مهندسین مشاور سازه گستر', orgName: 'مهندسین مشاور سازه گستر', roleOrJobTitle: 'دستگاه نظارت', note: 'جهت اطلاع و درج در سوابق' }
    ],
    status: WorkflowStatus.APPROVED_BY_EMPLOYER,
    ownerOrgId: 'org-1',
    currentOrgId: 'org-3',
    createdById: 'e-pm',
    workflowHistory: [
      { id: 'wh-6', actorUserId: 'e-pm', actorName: 'مهندس رضایی', action: 'FINAL_APPROVE', timestamp: Date.now() - 300000000, fromStatus: WorkflowStatus.APPROVED_INTERNAL, toStatus: WorkflowStatus.APPROVED_BY_EMPLOYER }
    ]
  },
  {
    id: 'let-201',
    projectId: '2',
    letterNumber: '1403/TECH/550',
    indicatorNumber: 'IND-9100',
    date: '1403/03/14',
    subject: 'ارسال برنامه زمان‌بندی تفصیلی فاز دوم و مسیر بحرانی پروژه',
    scope: 'EXTERNAL',
    letterType: 'TECHNICAL',
    priority: 'URGENT',
    confidentiality: 'NORMAL',
    receiverTitle: 'سرپرست محترم دستگاه نظارت - مهندسین مشاور',
    receiverOrgId: 'org-2',
    receiverOrgName: 'مهندسین مشاور سازه گستر',
    content: '<p>احتراماً ویرایش دوم برنامه زمان‌بندی تفصیلی فاز اسکلت فلزی و بتنی به پیوست ارسال می‌گردد. مسیر بحرانی و نمودار جریان نقدینگی متناظر در فایل‌های ضمیمه درج شده است.</p>',
    fontFamily: 'Vazirmatn',
    fontSize: '14px',
    senderOrgId: 'org-3',
    senderOrgName: 'شرکت پیمانکاری نوین ساخت',
    senderUserFullName: 'مهندس حسینی',
    senderUserJobTitle: 'سرپرست کارگاه',
    hasAttachment: true,
    attachments: [
      { id: 'att-5', name: 'MasterSchedule_Phase2.mpp', size: '2.2 MB', type: 'application/octet-stream', uploadDate: '1403/03/14' }
    ],
    transcripts: [],
    status: WorkflowStatus.SENT_TO_CONSULTANT,
    ownerOrgId: 'org-3',
    currentOrgId: 'org-2',
    createdById: 'c-pm',
    workflowHistory: []
  },
  {
    id: 'let-202',
    projectId: '2',
    letterNumber: '1403/ADM/092',
    indicatorNumber: 'IND-9080',
    date: '1403/03/13',
    subject: 'صورتجلسه هماهنگی هفتگی کارگاه و تصمیمات تسریع در اجرای فاز ۲',
    scope: 'INTERNAL',
    letterType: 'ADMINISTRATIVE',
    priority: 'NORMAL',
    confidentiality: 'NORMAL',
    receiverTitle: 'سرپرست کارگاه، مسئول دفتر فنی و سرپرستان اکیپ‌های اجرایی',
    content: '<p>با سلام، به پیوست مصوبات جلسه کارگاهی مورخ ۱۴۰۳/۰۳/۱۳ جهت اقدام فوری و هماهنگی شیفت دوم کاری ابلاغ می‌گردد.</p>',
    fontFamily: 'Vazirmatn',
    fontSize: '14px',
    senderOrgId: 'org-3',
    senderOrgName: 'شرکت پیمانکاری نوین ساخت',
    senderUserFullName: 'مهندس علوی',
    senderUserJobTitle: 'مدیر پروژه',
    hasAttachment: false,
    attachments: [],
    transcripts: [],
    status: WorkflowStatus.APPROVED_INTERNAL,
    ownerOrgId: 'org-3',
    currentOrgId: 'org-3',
    createdById: 'c-pm',
    workflowHistory: []
  }
];

// Workflow Modal Component
interface WorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  actionType: WorkflowAction | null;
  item: any;
  assignee: string;
  onAssigneeChange: (val: string) => void;
  comment: string;
  onCommentChange: (val: string) => void;
  currentUser: SystemUser | null;
  attachWorkflowSignature: boolean;
  setAttachWorkflowSignature: (val: boolean) => void;
}

const WorkflowModal: React.FC<WorkflowModalProps> = ({
  isOpen, onClose, onConfirm, actionType, item, assignee, onAssigneeChange, comment, onCommentChange, currentUser,
  attachWorkflowSignature, setAttachWorkflowSignature
}) => {
  const users = SystemAdminService.getUsers();
  const orgs = SystemAdminService.getOrganizations();
  
  if (!isOpen || !actionType) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-md animate-fadeIn" dir="rtl">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="p-6 border-b border-[#ece5d8] flex justify-between items-center bg-stone-50/50">
          <h3 className="font-black text-stone-800 flex items-center gap-2">
            <ShieldAlert size={20} className="text-amber-600" />
            تایید اقدام: {WorkflowService.getActionLabel(actionType)}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-8 space-y-6">
          {(actionType === 'SUBMIT' || actionType === 'REASSIGN' || actionType === 'APPROVE' || actionType === 'SEND_TO_CONSULTANT' || actionType === 'SEND_TO_EMPLOYER' || actionType === 'SEND_TO_CONTRACTOR' || actionType === 'RETURN_TO_CONSULTANT' || actionType === 'RETURN_TO_CONTRACTOR' || actionType === 'REJECT') && (
            <div className="space-y-2">
              <label className="text-xs font-black text-stone-700 block">انتخاب گیرنده (ارجاع به):</label>
              <select
                value={assignee}
                onChange={(e) => onAssigneeChange(e.target.value)}
                className="w-full bg-[#faf8f4] border border-[#e5ded0] rounded-2xl px-4 py-3 text-sm font-bold text-stone-700 outline-none focus:border-amber-500"
              >
                <option value="">انتخاب کاربر...</option>
                {(() => {
                  const allOrgs = SystemAdminService.getOrganizations();
                  const employerOrgId = allOrgs.find(o => o.type === 'EMPLOYER')?.id || 'org-1';
                  const consultantOrgId = allOrgs.find(o => o.type === 'CONSULTANT')?.id || 'org-2';
                  const contractorOrgId = allOrgs.find(o => o.type === 'CONTRACTOR')?.id || 'org-3';

                  let filtered = users.filter(u => u.isActive !== false && u.id !== currentUser?.id && u.username !== currentUser?.username);

                  // 1. Determine target organization based on action
                  let targetOrgId = currentUser?.orgId;
                  if (actionType === 'SEND_TO_CONSULTANT' || actionType === 'RETURN_TO_CONSULTANT') {
                    targetOrgId = consultantOrgId;
                  } else if (actionType === 'SEND_TO_EMPLOYER') {
                    targetOrgId = employerOrgId;
                  } else if (actionType === 'RETURN_TO_CONTRACTOR' || actionType === 'SEND_TO_CONTRACTOR') {
                    targetOrgId = contractorOrgId;
                  } else if (actionType === 'REJECT') {
                    targetOrgId = currentUser?.orgId;
                  }

                  // 2. Filter users belonging to target organization
                  filtered = filtered.filter(u => u.orgId === targetOrgId);

                  // 3. Apply standard Technical Office hierarchy filtering
                  if (currentUser) {
                    const isSystemAdmin = currentUser.role === 'SYSTEM_ADMIN';
                    if (!isSystemAdmin) {
                      const ut = (currentUser.jobTitle || "").trim();
                      const ul = (currentUser.jobLevel || "").trim();
                      
                      const isCurrentUserPM = currentUser.role === 'ORG_ADMIN' || ut.includes('مدیر پروژه') || ul.includes('مدیر پروژه') || currentUser.username === 'e-pm' || currentUser.id === 'e-pm';
                      const isCurrentUserWorkshopManager = ut.includes('سرپرست کارگاه') || ul.includes('سرپرست کارگاه');
                      
                      const isExpertOrUnitSupervisor = (
                        ut.includes("کارشناس") || ul.includes("کارشناس") ||
                        ut.includes("سرپرست واحد") || ul.includes("سرپرست واحد")
                      );

                      filtered = filtered.filter(u => {
                        if (u.id === currentUser.id || (currentUser.username && u.username === currentUser.username)) {
                          return false;
                        }

                        const isSameOrg = u.orgId === currentUser.orgId;
                        const isTargetPM = u.role === 'ORG_ADMIN' || (u.jobTitle || '').includes('مدیر پروژه') || (u.jobLevel || '').includes('مدیر پروژه') || u.username === 'e-pm' || u.id === 'e-pm';
                        const isTargetWorkshopManager = (u.jobTitle || '').includes('سرپرست کارگاه') || (u.jobLevel || '').includes('سرپرست کارگاه');

                        // Rule: In all organizations, except for the Workshop Manager, no other users should see the Project Manager in the recipient section.
                        // Exception: Project Managers sending to another organization must see the other organization's Project Manager.
                        if (isTargetPM && !isCurrentUserWorkshopManager && !(isCurrentUserPM && !isSameOrg)) {
                          return false;
                        }

                        if (isSameOrg) {
                          if (isExpertOrUnitSupervisor) {
                            // Bypassing PM exclusion for minutes/communications tab to allow standard workflow assignment
                            return true;
                          }
                          if (isCurrentUserPM || isCurrentUserWorkshopManager) {
                            return true;
                          }
                          return !isTargetPM;
                        } else {
                          // Cross-organization visibility (only for Project Managers and Workshop Managers)
                          if (isCurrentUserPM || isCurrentUserWorkshopManager) {
                            return isTargetPM || isTargetWorkshopManager;
                          }
                          return false;
                        }
                      });
                    }
                  }

                  return filtered;
                })().map(u => (
                  <option key={u.id} value={u.id}>
                    {formatUserDisplayFormal(u, orgs.find(o => o.id === u.orgId) || SystemAdminService.getOrganization(u.orgId))}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-black text-stone-700 block">یادداشت و توضیحات:</label>
            <textarea
              value={comment}
              onChange={(e) => onCommentChange(e.target.value)}
              className="w-full bg-[#faf8f4] border border-[#e5ded0] rounded-2xl px-4 py-3 text-sm font-bold text-stone-700 outline-none focus:border-amber-500 min-h-[100px] resize-none"
              placeholder="توضیحات خود را اینجا بنویسید..."
            />
          </div>

          {/* Electronic Signature Toggle & Status Card */}
          {(() => {
            const uTitle = (currentUser?.jobTitle || '').trim();
            const uLevel = (currentUser?.jobLevel || '').trim();
            const isExpertOrUnitSupervisor = (
              uTitle.includes('کارشناس') || uLevel.includes('کارشناس') ||
              uTitle.includes('سرپرست واحد') || uLevel.includes('سرپرست واحد')
            ) && !uTitle.includes('مدیر پروژه') && !uLevel.includes('مدیر پروژه') && !uTitle.includes('سرپرست کارگاه') && !uLevel.includes('سرپرست کارگاه') && currentUser?.role !== 'ORG_MANAGER' && currentUser?.role !== 'ORG_ADMIN' && currentUser?.role !== 'SYSTEM_ADMIN';

            const isInterOrg =
              actionType === "SEND_TO_CONSULTANT" ||
              actionType === "SEND_TO_EMPLOYER" ||
              actionType === "FINAL_APPROVE";

            const isInternalDoc = item?.scope === 'INTERNAL' || !isInterOrg;

            const hrSig = HRService.getUserSignature(currentUser) || currentUser?.signature || HRService.generateDefaultSignature(currentUser);

            return (
              <div className="space-y-2 border-t border-[#e5ded0] pt-4 mt-2" dir="rtl">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={attachWorkflowSignature}
                      onChange={(e) => setAttachWorkflowSignature(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer accent-amber-600"
                    />
                    <span className="text-xs font-bold text-stone-800">
                      درج امضای الکترونیکی در سربرگ و سوابق اقدام
                    </span>
                  </label>
                  {isInterOrg ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
                      الزامی (بین‌سازمانی)
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
                      اختیاری (درون‌سازمانی)
                    </span>
                  )}
                </div>

                {attachWorkflowSignature && (
                  <div className="p-3 bg-[#faf8f4] border border-[#e5ded0] rounded-xl">
                    {hrSig ? (
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-16 h-10 bg-white border border-stone-200 rounded-lg p-1 flex items-center justify-center shrink-0 shadow-sm">
                            <img src={hrSig} alt="امضای دیجیتال" className="max-h-full max-w-full object-contain" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                              <CheckCircle size={13} /> امضای الکترونیکی آماده درج است
                            </div>
                            <div className="text-[10px] text-stone-500 mt-0.5">
                              ثبت‌شده در منابع انسانی ({currentUser?.fullName || currentUser?.username})
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2 text-red-600 text-xs">
                        <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold">امضای الکترونیکی شما در سیستم منابع انسانی ثبت نشده است!</p>
                          <p className="text-[10px] text-stone-500 mt-0.5">
                            جهت درج امضا، لطفاً از بخش پرسنلی منابع انسانی تصویر امضای خود را بارگذاری و ثبت فرمایید.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          <div className="flex gap-4 pt-4">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl bg-stone-100 text-stone-600 font-bold hover:bg-stone-200 transition-colors"
            >
              انصراف
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 py-3 rounded-2xl bg-amber-600 text-white font-black shadow-lg hover:bg-stone-900 transition-colors"
            >
              تایید و ثبت نهایی
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Workflow History Modal Component
interface WorkflowHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: WorkflowEvent[];
  title: string;
}

const WorkflowHistoryModal: React.FC<WorkflowHistoryModalProps> = ({
  isOpen, onClose, history, title
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fadeIn" dir="rtl">
      <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl max-h-[80vh] flex flex-col text-stone-700">
        <div className="p-6 border-b border-[#ece5d8] flex justify-between items-center bg-[#faf8f4]">
          <h3 className="font-black text-stone-800 flex items-center gap-2 text-sm md:text-base">
            <ScrollText size={20} className="text-stone-600" />
            تاریخچه تغییرات: {title}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-stone-200 rounded-full transition-colors text-stone-500">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 space-y-4 text-right" dir="rtl">
          {history.length === 0 ? (
            <div className="text-center text-stone-400 py-8 text-sm font-bold">هیچ سابقه‌ای یافت نشد.</div>
          ) : (
            [...history].sort((a, b) => b.timestamp - a.timestamp).map((event, idx) => {
              const actorUser = event.actorUserId 
                ? SystemAdminService.getUsers().find(u => u.id === event.actorUserId) 
                : (event.actorName 
                    ? SystemAdminService.getUsers().find(u => u.fullName === event.actorName || u.username === event.actorName)
                    : undefined);
              const actorOrg = actorUser?.orgId ? SystemAdminService.getOrganization(actorUser.orgId) : undefined;
              const fullActorName = actorUser 
                ? formatUserDisplayFormal(actorUser, actorOrg) 
                : event.actorName;

              const assigneeUser = event.assigneeUserId 
                ? SystemAdminService.getUsers().find(u => u.id === event.assigneeUserId) 
                : (event.assigneeName 
                    ? SystemAdminService.getUsers().find(u => u.fullName === event.assigneeName || u.username === event.assigneeName)
                    : undefined);
              const assigneeOrg = assigneeUser?.orgId ? SystemAdminService.getOrganization(assigneeUser.orgId) : undefined;
              const fullAssigneeName = assigneeUser 
                ? formatUserDisplayFormal(assigneeUser, assigneeOrg) 
                : event.assigneeName;

              return (
                <div key={event.id} className="flex gap-4 relative">
                  <div className="flex flex-col items-center">
                    <div className={`w-3 h-3 rounded-full z-10 ${
                      event.action === 'APPROVE' ? 'bg-emerald-500' : 
                      event.action === 'REJECT' ? 'bg-red-500' : 'bg-amber-500'
                    }`} />
                    {idx < history.length - 1 && <div className="w-0.5 flex-1 bg-stone-200 my-1" />}
                  </div>
                  <div className="flex-1 pb-6 text-right" dir="rtl">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-black text-stone-800 text-xs">{WorkflowService.getActionLabel(event.action)}</span>
                      <span className="text-[10px] text-stone-400 font-bold dir-ltr">{new Date(event.timestamp).toLocaleString('fa-IR')}</span>
                    </div>
                    <div className="text-[10px] text-stone-500 mb-1">توسط: <span className="font-bold text-stone-700">{fullActorName}</span></div>
                    {fullAssigneeName && (
                      <div className="text-[10px] text-amber-600 bg-stone-50 px-2.5 py-1 rounded-lg w-fit mb-1 font-bold">
                        گیرنده: {fullAssigneeName}
                      </div>
                    )}
                    {event.comment && (
                      <div className="text-[10px] text-stone-600 bg-[#faf8f4] p-2.5 rounded-xl border border-[#ece5d8] italic">
                        "{event.comment}"
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] px-2 py-0.5 rounded bg-stone-100 text-stone-500">{WorkflowService.getStatusLabel(event.fromStatus)}</span>
                      <ArrowLeftCircle size={10} className="text-stone-300" />
                      <span className="text-[9px] px-2 py-0.5 rounded bg-stone-100 text-stone-500">{WorkflowService.getStatusLabel(event.toStatus)}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

// --- Marginalia Modal Component ---
interface MarginaliaModalProps {
  isOpen: boolean;
  onClose: () => void;
  letter: OfficialLetter | null;
  currentUser: SystemUser | null;
  onAddMarginalia: (note: string, targetUser?: { id: string; name: string; jobTitle?: string; orgName?: string }) => void;
  isReadOnly?: boolean;
}

const MarginaliaModal: React.FC<MarginaliaModalProps> = ({
  isOpen,
  onClose,
  letter,
  currentUser,
  onAddMarginalia,
  isReadOnly = false
}) => {
  const [note, setNote] = useState('');
  const [targetUserId, setTargetUserId] = useState<string>('');

  const allUsers = useMemo(() => SystemAdminService.getUsers(), []);
  const allOrgs = useMemo(() => SystemAdminService.getOrganizations(), []);

  // Permission calculation for registering new marginalia
  const marginaliaPermission = useMemo(() => {
    if (!currentUser || !letter) {
      return { allowed: false, reason: 'اطلاعات کاربر یا نامه نامعتبر است.' };
    }
    
    // System admin can always register marginalia and has all capabilities active
    if (currentUser.role === 'SYSTEM_ADMIN') {
      return { allowed: true, reason: '' };
    }

    if (isReadOnly) {
      return { 
        allowed: false, 
        reason: 'در بخش دبیرخانه و اندیکاتور، مشاهده سوابق هامش به صورت فقط خواندنی (نمایشی) می‌باشد.' 
      };
    }

    const userOrgId = currentUser.orgId;

    // Internal letter: only members of owner organization
    if (letter.scope === 'INTERNAL') {
      if (letter.ownerOrgId === userOrgId) {
        return { allowed: true, reason: '' };
      }
      return { 
        allowed: false, 
        reason: 'این نامه درون‌سازمانی متعلق به سازمان دیگری است و صرفاً قابل مشاهده می‌باشد.' 
      };
    }

    // External letter:
    if (letter.scope === 'EXTERNAL') {
      const senderOrgId = letter.ownerOrgId || letter.senderOrgId;
      const currentHolderOrgId = letter.currentOrgId || letter.ownerOrgId;

      // When the letter has been sent to another organization and is currently with that organization:
      // Users of the sender organization cannot register marginalia until returned.
      if (senderOrgId === userOrgId && currentHolderOrgId !== userOrgId) {
        return {
          allowed: false,
          reason: 'این نامه به سازمان دیگری ارسال گردیده و در جریان بررسی نزد آن سازمان است. تا زمانی که نامه مجدداً به صورت عودت‌شده به سازمان شما بازگردانده نشود، ثبت هامش جدید برای سازمان فرستنده امکان‌پذیر نبوده و فقط قابل مشاهده است.'
        };
      }

      // If user's org is currently the holder of the letter (e.g. receiver org, or returned to sender org, or initial draft):
      if (currentHolderOrgId === userOrgId) {
        return { allowed: true, reason: '' };
      }

      // Any other third-party org (e.g. transcript only):
      return {
        allowed: false,
        reason: 'این نامه در حال حاضر نزد سازمان شما قرار ندارد و صرفاً جهت استحضار و سوابق قابل مشاهده است.'
      };
    }

    return { allowed: true, reason: '' };
  }, [isReadOnly, currentUser, letter]);

  if (!isOpen || !letter) return null;

  const currentUserOrg = allOrgs.find(o => o.id === currentUser?.orgId);
  const senderDisplay = currentUser 
    ? `${currentUser.fullName}${currentUser.jobTitle ? ` (${currentUser.jobTitle})` : ''} - ${currentUserOrg?.name || 'سازمان مربوطه'}`
    : 'کاربر سیستم';

  const selectedTargetUser = allUsers.find(u => u.id === targetUserId);
  const selectedTargetOrg = selectedTargetUser ? allOrgs.find(o => o.id === selectedTargetUser.orgId) : undefined;

  const quickTemplates = [
    'جهت اقدام و پیگیری لازم',
    'جهت استحضار و اعلام نظر',
    'بررسی طبق مشخصات فنی و ضوابط پیمان و اعلام نتیجه',
    'پیرو مذاکرات، هماهنگی‌های میدانی به عمل آید',
    'ارجاع به واحد فنی جهت بازبینی و گزارش نهایی',
    'موافقت می‌شود، اقدام لازم معمول گردد'
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!marginaliaPermission.allowed) {
      alert(marginaliaPermission.reason);
      return;
    }

    if (!note.trim()) {
      alert('لطفاً متن هامش (پاراف) را وارد کنید.');
      return;
    }
    
    let targetUserInfo: { id: string; name: string; jobTitle?: string; orgName?: string } | undefined = undefined;
    if (selectedTargetUser) {
      targetUserInfo = {
        id: selectedTargetUser.id,
        name: selectedTargetUser.fullName,
        jobTitle: selectedTargetUser.jobTitle || selectedTargetUser.jobLevel || undefined,
        orgName: selectedTargetOrg?.name || undefined
      };
    } else if (targetUserId === 'ALL') {
      targetUserInfo = {
        id: 'ALL',
        name: 'عمومی / کلیه ارکان و پرسنل مرتبط',
        jobTitle: undefined,
        orgName: undefined
      };
    }

    onAddMarginalia(note.trim(), targetUserInfo);
    setNote('');
    setTargetUserId('');
  };

  const marginaliaList = letter.marginalia || [];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fadeIn" dir="rtl">
      <div className="bg-white rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl max-h-[92vh] flex flex-col text-stone-700 border border-amber-900/20">
        {/* Modal Header */}
        <div className="p-5 border-b border-[#ece5d8] flex justify-between items-center bg-gradient-to-r from-[#faf8f4] to-[#f4eee4]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-700 shadow-xs">
              <MessageSquare size={22} />
            </div>
            <div>
              <h3 className="font-black text-stone-900 text-sm md:text-base">
                هامش و دستورات ارجاع نامه
              </h3>
              <p className="text-[11px] font-bold text-stone-500 mt-0.5">
                شماره نامه: <span className="font-mono text-amber-800 font-black">{letter.letterNumber}</span> • موضوع: {letter.subject}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-stone-200/70 rounded-full transition-colors text-stone-500">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6 text-right custom-scrollbar">
          {/* History of Marginalia */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-stone-200/80 pb-2">
              <h4 className="font-black text-xs text-stone-700 flex items-center gap-1.5">
                <ScrollText size={15} className="text-amber-600" />
                سوابق هامش و دستورات ثبت شده بر روی نامه:
              </h4>
              <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full">
                {marginaliaList.length} مورد ثبت شده
              </span>
            </div>

            {marginaliaList.length === 0 ? (
              <div className="text-center py-7 text-stone-400 bg-stone-50 rounded-2xl text-xs font-bold border border-dashed border-stone-200">
                تاکنون هیچ هامشی بر روی این نامه ثبت نشده است. از فرم زیر می‌توانید هامش یا دستور ارجاع جدید ثبت نمایید.
              </div>
            ) : (
              <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
                {marginaliaList.map((m, idx) => (
                  <div key={m.id || idx} className="p-4 rounded-2xl bg-gradient-to-br from-[#faf8f4] to-[#f7f2e9] border border-[#e5ded0] shadow-xs space-y-2.5">
                    {/* Header: Sender -> Recipient + Date */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200/70 pb-2 text-[11px]">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {/* Sender */}
                        <span className="text-[10px] font-black bg-stone-200/80 text-stone-700 px-2 py-0.5 rounded-md">
                          صادرکننده (از):
                        </span>
                        <span className="text-stone-900 font-black">{m.userName}</span>
                        {m.userJobTitle && <span className="text-stone-600 text-[10px] font-bold">({m.userJobTitle})</span>}
                        {m.orgName && <span className="text-amber-800 text-[10px] font-black">• {m.orgName}</span>}

                        {/* Arrow */}
                        <div className="flex items-center text-amber-600 font-black mx-1 bg-amber-100/80 px-1.5 py-0.5 rounded-md text-[10px]">
                          <ArrowLeft size={12} className="inline ml-0.5" />
                          <span>به:</span>
                        </div>

                        {/* Recipient */}
                        <span className="text-amber-950 font-black">
                          {m.targetUserName || 'عمومی / کلیه همکاران'}
                        </span>
                        {m.targetUserJobTitle && <span className="text-stone-600 text-[10px] font-bold">({m.targetUserJobTitle})</span>}
                        {m.targetOrgName && <span className="text-amber-800 text-[10px] font-black">• {m.targetOrgName}</span>}
                      </div>

                      <div className="text-[10px] font-mono text-stone-600 bg-white px-2.5 py-0.5 rounded-full border border-stone-200 shadow-xs font-bold">
                        {m.date}
                      </div>
                    </div>

                    {/* Note Content */}
                    <div className="bg-white/90 p-3.5 rounded-xl border border-[#ece5d8] text-xs text-stone-800 font-black whitespace-pre-line leading-relaxed shadow-2xs">
                      {m.note}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Marginalia Form (if permitted) OR Read-Only Notice */}
          {marginaliaPermission.allowed ? (
            <form onSubmit={handleSubmit} className="space-y-4 pt-4 border-t border-stone-200">
              <div className="flex items-center justify-between">
                <h4 className="font-black text-xs text-stone-900 flex items-center gap-1.5">
                  <Edit3 size={15} className="text-amber-600" />
                  درج دستور، پاراف و هامش جدید:
                </h4>
              </div>

              {/* Sender & Recipient Box */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 bg-[#faf8f4] p-4 rounded-2xl border border-[#e5ded0]">
                {/* Sender (Current User) */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-stone-600 flex items-center gap-1">
                    <User size={13} className="text-stone-500" />
                    صادرکننده هامش (از):
                  </label>
                  <div className="px-3 py-2 bg-white rounded-xl border border-stone-200 text-xs font-black text-stone-800 truncate shadow-2xs">
                    {senderDisplay}
                  </div>
                </div>

                {/* Target User Selector (Recipient) */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-amber-900 flex items-center gap-1">
                    <UserCheck size={14} className="text-amber-600" />
                    <span>مخاطب هامش / ارجاع‌شونده (به):</span>
                    <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={targetUserId}
                    onChange={(e) => setTargetUserId(e.target.value)}
                    className="w-full px-3 py-2 bg-white rounded-xl border border-amber-300 text-xs font-bold text-stone-800 outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-500 shadow-2xs"
                  >
                    <option value="">-- انتخاب مخاطب هامش (یا عمومی) --</option>
                    <option value="ALL">عمومی / کلیه ارکان و پرسنل مرتبط پروژه</option>
                    {allOrgs.map(org => {
                      const orgMembers = allUsers.filter(u => u.orgId === org.id);
                      if (orgMembers.length === 0) return null;
                      const orgTypeLabel = org.type === 'EMPLOYER' ? 'کارفرما' : org.type === 'CONSULTANT' ? 'مشاور' : 'پیمانکار';
                      return (
                        <optgroup key={org.id} label={`🏢 سازمان: ${org.name} (${orgTypeLabel})`}>
                          {orgMembers.map(u => (
                            <option key={u.id} value={u.id}>
                              {u.fullName} - {u.jobTitle || (u.role === 'ORG_ADMIN' ? 'مدیر ارشد' : u.role === 'ORG_MANAGER' ? 'مدیر/سرپرست' : 'کارشناس')} ({orgTypeLabel})
                            </option>
                          ))}
                        </optgroup>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* Quick Templates */}
              <div className="space-y-1.5">
                <div className="text-[10px] font-black text-stone-500 flex items-center gap-1">
                  <span>متن‌های آماده و پرکاربرد پاراف (کلیک جهت درج سریع):</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {quickTemplates.map((tmpl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setNote(prev => prev ? `${prev} - ${tmpl}` : tmpl)}
                      className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-amber-100 text-stone-700 hover:text-amber-900 border border-stone-200 transition-colors active:scale-95"
                    >
                      + {tmpl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Text Area */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-stone-700 block">
                  متن دستور، پاراف یا رهنمود هامش:
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full bg-[#faf8f4] border border-[#e5ded0] rounded-2xl px-4 py-3 text-xs font-bold text-stone-800 outline-none focus:border-amber-500 min-h-[95px] resize-none shadow-inner"
                  placeholder="دستور، پاراف یا رهنمود رسمی خود را اینجا بنویسید..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl bg-stone-100 text-stone-600 font-bold hover:bg-stone-200 transition-colors text-xs"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-amber-600 text-white font-black hover:bg-amber-700 transition-all shadow-md text-xs flex items-center gap-1.5 active:scale-95"
                >
                  <Check size={16} />
                  ثبت و درج هامش بر روی نامه
                </button>
              </div>
            </form>
          ) : (
            <div className="pt-4 border-t border-stone-200">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/90 flex items-start gap-3 text-amber-950 shadow-xs">
                <div className="w-9 h-9 rounded-xl bg-amber-100/90 border border-amber-300 flex items-center justify-center text-amber-800 shrink-0 mt-0.5">
                  <Lock size={18} />
                </div>
                <div className="text-xs space-y-1 flex-1">
                  <div className="font-black text-amber-950 flex items-center gap-1.5">
                    <span>حالت فقط مشاهده هامش‌های نامه</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-200/70 text-amber-900 rounded-full">غیرفعال برای ثبت جدید</span>
                  </div>
                  <p className="text-[11.5px] font-medium text-amber-900/90 leading-relaxed text-justify">
                    {marginaliaPermission.reason}
                  </p>
                </div>
              </div>
              <div className="flex justify-end pt-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl bg-stone-900 text-white font-bold hover:bg-stone-800 transition-colors text-xs"
                >
                  بستن پنجره
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- Letter Preview Modal Component ---
interface LetterPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  letter: OfficialLetter | null;
  project: Project | null;
  currentUser?: SystemUser | null;
  onReply?: (letter: OfficialLetter) => void;
}

const LetterPreviewModal: React.FC<LetterPreviewModalProps> = ({
  isOpen,
  onClose,
  letter,
  project,
  currentUser,
  onReply
}) => {
  if (!isOpen || !letter) return null;

  const senderOrg = SystemAdminService.getOrganization(letter.senderOrgId);
  const projectTitle = project ? project.title : 'پروژه عمرانی';
  const employerName = project?.employerName || (project as any)?.employer || 'کارفرما';
  const consultantName = project?.consultantName || (project as any)?.consultant || 'دستگاه نظارت / مشاور';
  const contractorName = project?.contractorName || (project as any)?.contractor || 'پیمانکار';

  const priorityLabel = 
    letter.priority === 'INSTANT' ? 'آنی' :
    letter.priority === 'VERY_URGENT' ? 'خیلی فوری' :
    letter.priority === 'URGENT' ? 'فوری' : 'عادی';

  const confidentialityLabel = 
    letter.confidentiality === 'HIGHLY_CONFIDENTIAL' ? 'به کلی سری' :
    letter.confidentiality === 'CONFIDENTIAL' ? 'محرمانه' : 'عادی';

  const letterTypeLabel = 
    letter.letterType === 'TECHNICAL' ? 'نامه فنی' :
    letter.letterType === 'ADMINISTRATIVE' ? 'نامه اداری' :
    letter.letterType === 'FINANCIAL' ? 'نامه مالی و صورت‌وضعیت' :
    letter.letterType === 'CONTRACTUAL' ? 'نامه قراردادی و حقوقی' :
    letter.letterType === 'WORK_PERMIT_REQUEST' ? 'درخواست مجوز کارگاهی' :
    letter.letterType === 'SAFETY' ? 'نامه ایمنی و بهداشت (HSE)' : 'سایر مکاتبات';

  // Extract signatures from workflow history
  const signEvents = (letter.workflowHistory || []).filter(
    ev => ev.action === 'APPROVE' || ev.action === 'FINAL_APPROVE' || ev.action === 'SIGN' || ev.action === 'SUBMIT' || ev.action === 'SEND_TO_CONSULTANT' || ev.action === 'SEND_TO_EMPLOYER' || ev.action === 'SEND_TO_CONTRACTOR' || ev.action === 'RESUBMIT' || Boolean(ev.signature)
  );

  // Group by distinct actor
  const distinctSignatures: any[] = [];
  const seenActors = new Set<string>();
  for (const ev of [...signEvents].reverse()) {
    const actorKey = ev.actorUserId || ev.actorName;
    if (!seenActors.has(actorKey)) {
      seenActors.add(actorKey);
      const user = SystemAdminService.getUsers().find(u => u.id === ev.actorUserId || u.fullName === ev.actorName || u.username === ev.actorName);
      const org = user?.orgId ? SystemAdminService.getOrganization(user.orgId) : undefined;
      const signatureImg = ev.signature;
      
      distinctSignatures.push({
        id: ev.id,
        actorUserId: ev.actorUserId,
        name: user ? formatUserDisplayFormal(user, org) : ev.actorName,
        title: user?.jobTitle || user?.jobLevel || ev.actorTitle || 'کارشناس مسئول',
        orgName: org?.name || senderOrg?.name || letter.senderOrgName || '',
        signature: signatureImg,
        date: new Date(ev.timestamp).toLocaleDateString('fa-IR'),
        role: user?.role
      });
    }
  }

  return (
    <div className="fixed inset-0 bg-black/65 backdrop-blur-xs z-[200] flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fadeIn text-right" dir="rtl">
      <div className="bg-[#f3eee5] rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl border border-stone-300 flex flex-col my-4 max-h-[95vh]">
        {/* Modal Header */}
        <div className="px-6 py-3.5 border-b border-[#ece5d8] flex justify-between items-center bg-[#faf8f4] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <Eye size={18} />
            </div>
            <div>
              <span className="font-black text-stone-800 text-sm md:text-base">پیش‌نمایش سربرگ و سند رسمی نامه</span>
              <span className="text-[11px] font-bold text-stone-500 mr-2">({letter.letterNumber})</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Reply Button - strictly visible only to letter recipient */}
            {(() => {
              if (!onReply || !currentUser || letter.scope !== 'EXTERNAL') return null;
              const isSender = currentUser.orgId === letter.ownerOrgId || currentUser.orgId === letter.senderOrgId || currentUser.id === letter.createdById;
              if (isSender) return null;

              const currentUserOrg = currentUser.orgId ? SystemAdminService.getOrganization(currentUser.orgId) : undefined;
              const isRecipient = (letter.receiverOrgId && currentUser.orgId === letter.receiverOrgId) ||
                (letter.receiverUserId && currentUser.id === letter.receiverUserId) ||
                (letter.currentOrgId && currentUser.orgId === letter.currentOrgId) ||
                (!letter.receiverOrgId && (
                  (letter.status === WorkflowStatus.SENT_TO_CONSULTANT && currentUserOrg?.type === OrganizationType.CONSULTANT) ||
                  (letter.status === WorkflowStatus.SENT_TO_EMPLOYER && currentUserOrg?.type === OrganizationType.EMPLOYER)
                ));

              const isSent = letter.status !== 'DRAFT' && letter.status !== 'APPROVED_INTERNAL' && letter.status !== 'REJECTED';

              if (!isRecipient || !isSent) return null;

              return (
                <button
                  onClick={() => {
                    onClose();
                    onReply(letter);
                  }}
                  className="p-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl hover:bg-amber-100 transition-colors flex items-center gap-1.5 text-xs font-black shadow-xs"
                  title="پاسخ دادن به این نامه"
                >
                  <Reply size={15} />
                  <span>جواب به نامه</span>
                </button>
              );
            })()}
            <button
              onClick={() => printOfficialLetter(letter, project)}
              className="px-3.5 py-2 bg-stone-900 text-white rounded-xl hover:bg-stone-800 transition-colors flex items-center gap-1.5 text-xs font-black shadow-xs active:scale-95"
            >
              <Printer size={15} />
              <span>چاپ رسمی (A4)</span>
            </button>
            <button onClick={onClose} className="p-2 hover:bg-stone-200 rounded-full transition-colors text-stone-500">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Container (Official A4 Letter Preview Paper) */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-stone-200/60 custom-scrollbar">
          
          {/* Authentic Official A4 Sheet */}
          <div className="bg-white rounded-lg shadow-2xl border-2 border-slate-900 p-4 sm:p-6 max-w-[190mm] mx-auto min-h-[260mm] flex flex-col justify-between text-slate-900 text-right leading-relaxed select-text">
            
            <div>
              {/* 1. System Top Header */}
              <div className="flex items-center justify-between bg-slate-800 text-white px-3 py-1.5 rounded-t-md text-[10px] font-black mb-3">
                <span>سامانه جامع مدیریت و کنترل پروژه‌های عمرانی (همیار پروژه)</span>
                <span>بخش مکاتبات و نامه‌نگاری رسمی</span>
              </div>

              {/* 2. Letterhead Box */}
              <div className="flex flex-col sm:flex-row justify-between items-center border-[1.5px] border-slate-900 rounded-lg p-3 sm:p-4 mb-3.5 bg-slate-50/80 gap-3">
                {/* Right (Sender Org & Letter Scope) */}
                <div className="text-right flex-[1.2] w-full sm:w-auto">
                  <div className="text-base font-black text-slate-900">{senderOrg?.name || letter.senderOrgName || 'شرکت پروژه'}</div>
                  <div className="text-[11px] font-bold text-slate-500 mt-0.5">
                    {letter.scope === 'INTERNAL' ? 'مکاتبات درون‌سازمانی' : 'مکاتبات برون‌سازمانی'} ({letterTypeLabel})
                  </div>
                </div>
                
                {/* Center (Besm-e-Taala) */}
                <div className="text-center flex-1">
                  <div className="text-[13px] font-black text-slate-900">بسمه تعالی</div>
                </div>

                {/* Left (Meta Table) */}
                <div className="text-right sm:border-r border-slate-300 sm:pr-3 sm:mr-3 text-[11px] flex-1 w-full sm:w-auto space-y-1">
                  <div className="flex justify-start gap-1.5"><span className="font-bold text-slate-500">شماره نامه:</span> <span className="font-black text-slate-900 font-mono">{letter.letterNumber || '---'}</span></div>
                  <div className="flex justify-start gap-1.5"><span className="font-bold text-slate-500">تاریخ:</span> <span className="font-black text-slate-900 font-mono">{letter.date || '---'}</span></div>
                  {letter.indicatorNumber && (
                    <div className="flex justify-start gap-1.5"><span className="font-bold text-slate-500">اندیکاتور:</span> <span className="font-black text-slate-900 font-mono">{letter.indicatorNumber}</span></div>
                  )}
                  <div className="flex justify-start gap-1.5"><span className="font-bold text-slate-500">پیوست:</span> <span className="font-black text-slate-900">{letter.hasAttachment || (letter.attachments && letter.attachments.length > 0) ? 'دارد' : 'ندارد'}</span></div>
                  <div className="flex justify-start gap-1.5"><span className="font-bold text-slate-500">اولویت:</span> <span className="font-black text-slate-900">{priorityLabel}</span></div>
                  <div className="flex justify-start gap-1.5"><span className="font-bold text-slate-500">طبقه‌بندی:</span> <span className="font-black text-slate-900">{confidentialityLabel}</span></div>
                </div>
              </div>

              {/* 3. Project Banner */}
              <div className="bg-slate-50 border border-slate-300 rounded-md p-2 text-[11px] mb-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div><strong className="text-slate-500">عنوان پروژه:</strong> <span className="font-extrabold text-slate-900">{projectTitle}</span></div>
                <div><strong className="text-slate-500">کارفرما:</strong> <span className="font-extrabold text-slate-900">{employerName}</span></div>
                <div><strong className="text-slate-500">پیمانکار/مشاور:</strong> <span className="font-extrabold text-slate-900">{contractorName}</span></div>
              </div>

              {/* 4. Recipient & Subject Section */}
              <div className="mb-4 pb-2.5 border-b-[1.5px] border-slate-900 flex flex-col gap-1">
                {/* 1. Company / Organization Name */}
                {(letter.receiverOrgName || letter.receiverOrgId) ? (
                  <div className="font-black text-sm text-slate-900">
                    {letter.receiverOrgName || SystemAdminService.getOrganization(letter.receiverOrgId || '')?.name || ''}
                  </div>
                ) : (letter.scope === 'INTERNAL' && senderOrg?.name ? (
                  <div className="font-black text-sm text-slate-900">
                    {senderOrg.name}
                  </div>
                ) : null)}

                {/* 2. Recipient Job Title / Position */}
                <div className="font-black text-[13.5px] text-slate-900">
                  {letter.receiverJobTitle || letter.receiverTitle || 'مقام محترم گیرنده'}
                </div>

                {/* 3. Recipient Name / Title */}
                {letter.receiverNameTitle && (
                  <div className="font-black text-[13px] text-slate-900">
                    {letter.receiverNameTitle}
                  </div>
                )}

                {/* 4. Subject */}
                <div className="font-black text-[13.5px] text-slate-900 mt-1">
                  موضوع: {letter.subject || 'بدون موضوع'}
                </div>
                {letter.attentionTo && (
                  <div className="font-bold text-[11.5px] text-slate-600 mt-0.5">
                    (عطف به / پیرو: {letter.attentionTo})
                  </div>
                )}
              </div>

              {/* 5. Letter Body Content */}
              <div 
                className="text-slate-800 leading-[2.1] text-justify min-h-[220px] font-normal select-text space-y-2.5"
                style={{ 
                  fontFamily: `${letter.fontFamily || 'Vazirmatn'}, Tahoma, sans-serif`, 
                  fontSize: letter.fontSize || '14px' 
                }}
                dangerouslySetInnerHTML={{ __html: letter.content }}
              />

              {/* 6. Signatures Section */}
              {letter.scope === 'EXTERNAL' ? (
                (() => {
                  const pmWmSigs = distinctSignatures.filter(sig => {
                    const t = (sig.title || '').toLowerCase();
                    const isPmWm = t.includes('مدیر پروژه') || t.includes('سرپرست کارگاه') || t.includes('مدیر طرح') || t.includes('سرپرست نظارت') || t.includes('مدیر عامل') || t.includes('رئیس کارگاه') || t.includes('مدیر کارگاه') || sig.role === 'ORG_ADMIN' || sig.role === 'ORG_MANAGER';
                    return isPmWm && Boolean(sig.signature);
                  });

                  if (pmWmSigs.length > 0) {
                    return (
                      <div className="flex justify-center gap-10 text-center mt-9 pt-3.5">
                        {pmWmSigs.map(sig => (
                          <div key={sig.id} className="flex flex-col items-center justify-between min-h-[110px] min-w-[180px]">
                            <div>
                              <div className="text-[13px] font-black text-slate-900">{sig.title}</div>
                              <div className="text-[12px] font-bold text-slate-700 mt-0.5">{sig.name}</div>
                              <div className="text-[10px] text-slate-500">{sig.orgName}</div>
                            </div>
                            <div className="h-[52px] flex items-center justify-center my-1">
                              {sig.signature ? (
                                <img src={sig.signature} alt="امضا" className="max-h-[48px] max-w-[130px] object-contain" />
                              ) : (
                                <div className="text-[10px] text-slate-400 border-b border-dotted border-slate-400 w-[100px] text-center">محل امضا</div>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">تاریخ: {sig.date}</div>
                          </div>
                        ))}
                      </div>
                    );
                  }

                  return (
                    <div className="flex justify-center text-center mt-9 pt-3.5">
                      <div className="flex flex-col items-center justify-between min-h-[100px] min-w-[220px]">
                        <div className="text-[13px] font-black text-slate-900">سرپرست کارگاه / مدیر پروژه</div>
                        <div className="text-[11px] text-slate-600 mt-0.5">{senderOrg?.name || 'سازمان صادرکننده'}</div>
                        <div className="text-[10px] text-slate-400 border-b border-dotted border-slate-300 w-[140px] mt-5">محل امضا و مهر رسمی</div>
                      </div>
                    </div>
                  );
                })()
              ) : distinctSignatures.length > 0 ? (
                <div 
                  className="grid gap-4 text-center mt-9 pt-3.5"
                  style={{ gridTemplateColumns: `repeat(${Math.min(distinctSignatures.length, 3)}, 1fr)` }}
                >
                  {distinctSignatures.slice(0, 3).map(sig => (
                    <div key={sig.id} className="flex flex-col items-center justify-between min-h-[110px]">
                      <div>
                        <div className="text-[12px] font-black text-slate-900">{sig.title}</div>
                        <div className="text-[11px] font-bold text-slate-700 mt-0.5">{sig.name}</div>
                        <div className="text-[10px] text-slate-500">{sig.orgName}</div>
                      </div>
                      <div className="h-[52px] flex items-center justify-center my-1">
                        {sig.signature ? (
                          <img src={sig.signature} alt="امضا" className="max-h-[48px] max-w-[130px] object-contain" />
                        ) : (
                          <div className="text-[10px] text-slate-400 border-b border-dotted border-slate-400 w-[100px] text-center">محل امضا</div>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">تاریخ: {sig.date}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-8 text-center mt-10 pt-3.5">
                  <div className="flex flex-col items-center justify-between min-h-[95px]">
                    <div className="text-[12px] font-black text-slate-900">تنظیم‌کننده / کارشناس مسئول</div>
                    <div className="text-[11px] text-slate-600">{letter.senderUserFullName || 'نام کارشناس'}</div>
                    <div className="text-[10px] text-slate-400 border-b border-dotted border-slate-300 w-[120px] mt-5">محل امضا و مهر</div>
                  </div>
                  <div className="flex flex-col items-center justify-between min-h-[95px]">
                    <div className="text-[12px] font-black text-slate-900">مدیر پروژه / سرپرست کارگاه</div>
                    <div className="text-[11px] text-slate-600">{senderOrg?.name || 'سازمان صادرکننده'}</div>
                    <div className="text-[10px] text-slate-400 border-b border-dotted border-slate-300 w-[120px] mt-5">محل امضا و مهر</div>
                  </div>
                </div>
              )}

              {/* 7. Transcripts (رونوشت) */}
              {letter.transcripts && letter.transcripts.length > 0 && (
                <div className="mt-5 pt-2.5 border-t border-dashed border-slate-400 text-[11px] text-slate-700">
                  <div className="font-black text-slate-900 mb-1">رونوشت:</div>
                  <ul className="pr-4 space-y-0.5 list-disc">
                    {letter.transcripts.map(t => (
                      <li key={t.id}>
                        <strong className="font-black text-slate-900">{t.recipientName}</strong>
                        {t.roleOrJobTitle && <span> - {t.roleOrJobTitle}</span>}
                        {t.orgName && <span> ({t.orgName})</span>}
                        {t.note && <span>: {t.note}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 8. Attachments (پیوست‌ها) */}
              {letter.attachments && letter.attachments.length > 0 && (
                <div className="mt-3 text-[11px] text-slate-600 flex flex-wrap items-center gap-2">
                  <span className="font-extrabold text-slate-900">پیوست‌ها:</span>
                  {letter.attachments.map(a => (
                    <span key={a.id} className="inline-flex items-center gap-1 bg-slate-100 border border-slate-300 rounded px-2 py-0.5 text-[10px] text-slate-700">
                      <Paperclip size={11} className="text-slate-400" />
                      <span>{a.name}</span>
                      {a.dataUrl && (
                        <a href={a.dataUrl} download={a.name} className="text-amber-600 hover:text-amber-800 p-0.5" title="دانلود">
                          <Download size={11} />
                        </a>
                      )}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* 9. Page Footer */}
            <div className="mt-7 pt-2 border-t border-slate-200 text-[9px] text-slate-400 flex justify-between items-center">
              <div>این سند به‌صورت دیجیتالی در سامانه جامع مدیریت پروژه‌های عمرانی صادر و ثبت گردیده است.</div>
              <div>برگه استاندارد A4</div>
            </div>

          </div>

        </div>

        {/* Close button */}
        <div className="px-6 py-3 border-t border-[#ece5d8] bg-stone-50 flex justify-between items-center shrink-0">
          <div className="text-xs text-stone-500 font-bold">
            قالب استاندارد و رسمی سربرگ مکاتبات اداری (مطابق با نسخه چاپی)
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-stone-900 text-white font-black text-xs hover:bg-stone-800 transition-colors shadow-xs active:scale-95"
          >
            بستن پیش‌نمایش
          </button>
        </div>
      </div>
    </div>
  );
};

interface CommunicationsProps {
  activeSubTab?: string;
  onSubTabChange?: (tabId: string) => void;
}

export default function Communications({ activeSubTab, onSubTabChange }: CommunicationsProps = {}) {
  const mapSubTabToLocal = (tab?: string): 'letters' | 'secretariat' | 'meetings' | 'chats' => {
    if (tab === 'communications-secretariat' || tab === 'secretariat') return 'secretariat';
    if (tab === 'communications-meetings' || tab === 'meetings') return 'meetings';
    if (tab === 'communications-chats' || tab === 'chats') return 'chats';
    return 'letters';
  };

  const [activeTab, setActiveTab] = useState<'letters' | 'secretariat' | 'meetings' | 'chats'>(() => {
    if (activeSubTab) return mapSubTabToLocal(activeSubTab);
    return 'letters';
  });

  const handleTabChange = (newTab: 'letters' | 'secretariat' | 'meetings' | 'chats') => {
    setActiveTab(newTab);
    if (onSubTabChange) {
      onSubTabChange(`communications-${newTab}`);
    }
  };

  useEffect(() => {
    if (activeSubTab) {
      setActiveTab(mapSubTabToLocal(activeSubTab));
    }
  }, [activeSubTab]);
  const [projects, setProjects] = useState<Project[]>(() => {
    try {
      const saved = localStorage.getItem("hamyar_projects");
      return saved && saved !== "undefined" ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [currentUser, setCurrentUser] = useState<SystemUser | null>(() => SystemAdminService.getCurrentUser());

  const accessibleProjects = useMemo(() => {
    return projects.filter(p => SystemAdminService.canUserAccessProject(p.id, currentUser));
  }, [projects, currentUser]);

  const [selectedProjectId, setSelectedProjectId] = useState<string>(() => {
    const saved = localStorage.getItem("hamyar_selected_project_id");
    if (saved && saved !== "undefined" && saved !== "null") return saved;
    return "1";
  });

  useEffect(() => {
    if (accessibleProjects.length > 0 && !accessibleProjects.some(p => String(p.id) === String(selectedProjectId))) {
      setSelectedProjectId(String(accessibleProjects[0].id));
    }
  }, [accessibleProjects, selectedProjectId]);

  useEffect(() => {
    localStorage.setItem("hamyar_selected_project_id", selectedProjectId);
  }, [selectedProjectId]);

  // Official Letters State
  const [letters, setLetters] = useState<OfficialLetter[]>(() => {
    try {
      const saved = localStorage.getItem('hamyar_official_letters');
      if (saved) {
        const parsed: OfficialLetter[] = JSON.parse(saved);
        const existingIds = new Set(parsed.map(l => l.id));
        const merged = [...parsed];
        for (const mock of MOCK_OFFICIAL_LETTERS) {
          if (!existingIds.has(mock.id)) {
            merged.push(mock);
          }
        }
        return merged;
      }
      localStorage.setItem('hamyar_official_letters', JSON.stringify(MOCK_OFFICIAL_LETTERS));
      return MOCK_OFFICIAL_LETTERS;
    } catch (e) {
      return MOCK_OFFICIAL_LETTERS;
    }
  });

  const isSystemAdmin = currentUser?.role === 'SYSTEM_ADMIN';

  // Check if current user is PM, Workshop Superintendent, or System Admin
  const canAccessSecretariat = useMemo(() => {
    if (!currentUser) return false;
    if (isSystemAdmin || currentUser.role === 'ORG_ADMIN') return true;
    const title = (currentUser.jobTitle || '').trim();
    const level = (currentUser.jobLevel || '').trim();
    return (
      title.includes('مدیر پروژه') || level.includes('مدیر پروژه') ||
      title.includes('سرپرست کارگاه') || level.includes('سرپرست کارگاه') ||
      currentUser.username === 'c-pm' || currentUser.username === 'cs-pm' || currentUser.username === 'e-pm'
    );
  }, [currentUser, isSystemAdmin]);

  // Secretariat Letters count calculation
  const secretariatLetterCount = useMemo(() => {
    if (!canAccessSecretariat) return 0;
    if (isSystemAdmin) {
      return letters.filter(l => l.projectId === selectedProjectId).length;
    }
    const userOrgId = currentUser?.orgId;
    const orgObj = userOrgId ? SystemAdminService.getOrganization(userOrgId) : undefined;
    const orgName = orgObj?.name;

    return letters.filter(l => {
      if (l.projectId !== selectedProjectId) return false;
      if (!userOrgId) return true;
      const isInternal = (l.ownerOrgId === userOrgId || l.senderOrgId === userOrgId) && l.scope === 'INTERNAL';
      const isOutgoing = (l.ownerOrgId === userOrgId || l.senderOrgId === userOrgId) && l.scope === 'EXTERNAL';
      const isIncoming = l.receiverOrgId === userOrgId || 
        l.currentOrgId === userOrgId ||
        (orgName && l.receiverOrgName && l.receiverOrgName.includes(orgName)) ||
        (orgName && l.receiverTitle && l.receiverTitle.includes(orgName));
      const isTranscript = (l.transcripts || []).some(t => orgName && t.orgName && (t.orgName.includes(orgName) || t.orgName === orgName));

      return isInternal || isOutgoing || isIncoming || isTranscript || l.createdById === currentUser?.id || l.assigneeId === currentUser?.id;
    }).length;
  }, [letters, selectedProjectId, currentUser, canAccessSecretariat, isSystemAdmin]);

  // Redirect if unauthorized user is on secretariat tab
  useEffect(() => {
    if (!canAccessSecretariat && activeTab === 'secretariat') {
      handleTabChange('letters');
    }
  }, [canAccessSecretariat, activeTab]);

  const [isLetterModalOpen, setIsLetterModalOpen] = useState(false);
  const [editingLetter, setEditingLetter] = useState<OfficialLetter | null>(null);

  const [chats, setChats] = useState<ChatMessage[]>([]);
  const [meetings, setMeetings] = useState<MeetingDecision[]>([]);
  
  // Simulated current user
  const [simulatedUser, setSimulatedUser] = useState<{ id: string, name: string, role: 'EMPLOYER' | 'CONSULTANT' | 'CONTRACTOR' | 'SYSTEM_ADMIN', orgName: string }>({
    id: 'e-pm',
    name: 'مهندس رضایی',
    role: 'EMPLOYER',
    orgName: 'شرکت مهندسی الف'
  });

  const [userOrgType, setUserOrgType] = useState<OrganizationType | undefined>(undefined);
  const [orgUsers, setOrgUsers] = useState<SystemUser[]>([]);
  const [editingMeeting, setEditingMeeting] = useState<MeetingDecision | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [workflowModalOpen, setWorkflowModalOpen] = useState(false);
  const [workflowItem, setWorkflowItem] = useState<any>(null);
  const [workflowActionType, setWorkflowActionType] = useState<WorkflowAction | null>(null);
  const [workflowAssignee, setWorkflowAssignee] = useState("");
  const [workflowComment, setWorkflowComment] = useState("");
  const [attachWorkflowSignature, setAttachWorkflowSignature] = useState(true);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyItem, setHistoryItem] = useState<any>(null);

  // Marginalia Modal States
  const [isMarginaliaModalOpen, setIsMarginaliaModalOpen] = useState(false);
  const [marginaliaLetter, setMarginaliaLetter] = useState<OfficialLetter | null>(null);
  const [marginaliaReadOnly, setMarginaliaReadOnly] = useState(false);

  // Preview Modal States
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewLetter, setPreviewLetter] = useState<OfficialLetter | null>(null);

  // Communications-specific Notifications State
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [highlightedRecordId, setHighlightedRecordId] = useState<string | null>(null);
  const unreadCount = React.useMemo(
    () => notifications.filter((n) => n.status === "UNREAD").length,
    [notifications]
  );

  // Load user communications-specific notifications
  useEffect(() => {
    if (currentUser) {
      setNotifications(
        NotificationService.getUserNotifications(currentUser.id).filter(
          (n) => n.module === "COMMUNICATIONS"
        ),
      );
    }
  }, [currentUser]);

  // Listen for notification updates
  useEffect(() => {
    const handleNotificationUpdate = () => {
      if (currentUser) {
        setNotifications(
          NotificationService.getUserNotifications(currentUser.id).filter(
            (n) => n.module === "COMMUNICATIONS"
          ),
        );
      }
    };
    window.addEventListener("notification-updated", handleNotificationUpdate);
    return () =>
      window.removeEventListener(
        "notification-updated",
        handleNotificationUpdate,
      );
  }, [currentUser]);

  // Listen for project change event
  useEffect(() => {
    const handleProjectChanged = (e?: Event) => {
      const customEvent = e as CustomEvent<{ projectId: string }>;
      const newProjId = customEvent?.detail?.projectId || localStorage.getItem("hamyar_selected_project_id");
      if (newProjId) {
        setSelectedProjectId(newProjId);
      }
    };
    window.addEventListener("project-changed", handleProjectChanged);
    return () => window.removeEventListener("project-changed", handleProjectChanged);
  }, []);

  // Listen for URL query parameters on mount or navigation
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const recId = params.get('recordId');
    const tab = params.get('tab');
    const projId = params.get('projectId');
    if (projId) {
      setSelectedProjectId(projId);
    }
    if (recId) {
      const targetLetter = letters.find((l) => l.id === recId);
      if (targetLetter) {
        handleTabChange('letters');
        setHighlightedRecordId(recId);
        setTimeout(() => {
          const el = document.getElementById(`record-${recId}`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 200);
        setTimeout(() => {
          setHighlightedRecordId(null);
          window.history.replaceState({}, '', window.location.pathname);
        }, 3500);
        return;
      }
      const targetMeeting = meetings.find((m) => m.id === recId);
      if (targetMeeting) {
        handleTabChange('meetings');
        setHighlightedRecordId(recId);
        setTimeout(() => {
          const el = document.getElementById(`record-${recId}`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 200);
        setTimeout(() => {
          setHighlightedRecordId(null);
          window.history.replaceState({}, '', window.location.pathname);
        }, 3500);
      }
    }
  }, [letters, meetings]);

  // Listen for global notification clicks to navigate to specific letter or meeting
  useEffect(() => {
    const handleGlobalClick = (e: Event) => {
      const customEvent = e as CustomEvent<Notification>;
      if (customEvent.detail && customEvent.detail.module === "COMMUNICATIONS") {
        handleNotificationClick(customEvent.detail);
      }
    };
    window.addEventListener("hamyar-notification-clicked", handleGlobalClick);
    return () => {
      window.removeEventListener("hamyar-notification-clicked", handleGlobalClick);
    };
  }, [letters, meetings, currentUser]);

  const handleNotificationClick = (notification: Notification) => {
    if (currentUser) {
      if (
        notification.projectId &&
        currentUser.projectIds &&
        !currentUser.projectIds.includes(notification.projectId)
      ) {
        NotificationService.markAsRead(notification.id);
        alert("دسترسی به این پروژه برای شما مجاز نیست.");
        return;
      }
    }

    // Check if letter exists
    const targetLetter = letters.find((l) => l.id === notification.recordId);
    if (targetLetter) {
      NotificationService.markAsRead(notification.id);
      if (notification.recordId && currentUser) {
        NotificationService.markRecordAsRead(notification.recordId, currentUser.id);
      }
      setShowNotifications(false);
      if (notification.projectId) setSelectedProjectId(notification.projectId);
      handleTabChange('letters');
      setHighlightedRecordId(notification.recordId);
      setTimeout(() => {
        const el = document.getElementById(`record-${notification.recordId}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 200);
      setTimeout(() => setHighlightedRecordId(null), 3500);
      return;
    }

    const meeting = meetings.find((m) => m.id === notification.recordId);
    if (!meeting) {
      NotificationService.markAsRead(notification.id);
      alert("این آیتم دیگر در دسترس نیست یا حذف شده است.");
      return;
    }

    // Mark as read
    NotificationService.markAsRead(notification.id);
    if (notification.recordId && currentUser) {
      NotificationService.markRecordAsRead(notification.recordId, currentUser.id);
    }
    setShowNotifications(false);

    // Set project ID and tab without opening viewing popup
    if (notification.projectId) {
      setSelectedProjectId(notification.projectId);
    }
    handleTabChange('meetings');
    setHighlightedRecordId(notification.recordId);

    setTimeout(() => {
      const el = document.getElementById(`record-${notification.recordId}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 200);

    // Remove highlight after 3.5 seconds
    setTimeout(() => {
      setHighlightedRecordId(null);
    }, 3500);
  };

  const handleMarkAllRead = () => {
    if (currentUser) {
      notifications.forEach((n) => {
        if (n.status === "UNREAD") {
          NotificationService.markAsRead(n.id);
        }
      });
    }
  };

  const openWorkflowModal = (item: any, action: WorkflowAction) => {
    setWorkflowItem(item);
    setWorkflowActionType(action);
    setWorkflowAssignee("");
    setWorkflowComment("");
    setAttachWorkflowSignature(true);
    setWorkflowModalOpen(true);
  };

  const handleWorkflowAction = () => {
    if (!workflowItem || !workflowActionType || !currentUser) return;

    try {
      // Determine target org ID for inter-org actions
      let targetOrgId: string | undefined = undefined;
      const allOrgs = SystemAdminService.getOrganizations();
      const employerOrgId = allOrgs.find(o => o.type === 'EMPLOYER')?.id || 'org-1';
      const consultantOrgId = allOrgs.find(o => o.type === 'CONSULTANT')?.id || 'org-2';
      const contractorOrgId = allOrgs.find(o => o.type === 'CONTRACTOR')?.id || 'org-3';

      if (workflowActionType === 'SEND_TO_CONSULTANT') {
        targetOrgId = consultantOrgId;
      } else if (workflowActionType === 'SEND_TO_EMPLOYER') {
        targetOrgId = employerOrgId;
      } else if (workflowActionType === 'SEND_TO_CONTRACTOR') {
        targetOrgId = contractorOrgId;
      } else if (workflowActionType === 'RETURN_TO_CONTRACTOR') {
        targetOrgId = contractorOrgId;
      } else if (workflowActionType === 'RETURN_TO_CONSULTANT') {
        targetOrgId = consultantOrgId;
      } else if (workflowActionType === 'REJECT') {
        targetOrgId = currentUser?.orgId;
      }

      const assigneeUser = SystemAdminService.getUsers().find(u => u.id === workflowAssignee);
      const assigneeOrg = assigneeUser?.orgId ? SystemAdminService.getOrganization(assigneeUser.orgId) : undefined;
      const assigneeNameWithTitle = assigneeUser
        ? formatUserDisplayFormal(assigneeUser, assigneeOrg)
        : undefined;

      const updatedItemRaw = WorkflowService.performAction(
        workflowItem as any,
        workflowActionType,
        currentUser,
        {
          assigneeId: workflowAssignee,
          assigneeName: assigneeNameWithTitle,
          comment: workflowComment,
          targetOrgId: targetOrgId,
          attachSignature: attachWorkflowSignature,
          signature: attachWorkflowSignature ? (HRService.getUserSignature(currentUser) || currentUser?.signature || HRService.generateDefaultSignature(currentUser)) : undefined
        }
      );

      // Check if the item is an Official Letter
      const isLetter = !!(workflowItem.letterNumber || workflowItem.scope);
      if (isLetter) {
        const updatedLetter = updatedItemRaw as unknown as OfficialLetter;
        if (updatedLetter) {
          if (!updatedLetter.assigneeId) {
            updatedLetter.assigneeName = undefined;
          } else {
            updatedLetter.assigneeName = assigneeNameWithTitle;
          }
        }
        const updatedLetters = letters.map(l => l.id === updatedLetter.id ? updatedLetter : l);
        setLetters(updatedLetters);
        localStorage.setItem('hamyar_official_letters', JSON.stringify(updatedLetters));
      } else {
        const updatedItem = updatedItemRaw as unknown as MeetingDecision;

        if (updatedItem) {
          if (!updatedItem.assigneeId) {
            updatedItem.assigneeName = undefined;
          } else {
            updatedItem.assigneeName = assigneeNameWithTitle;
          }

          if (!updatedItem.approvals) {
            updatedItem.approvals = { employerApproved: false, consultantApproved: false, contractorApproved: false };
          }
          if (!updatedItem.approvalComments) {
            updatedItem.approvalComments = { employerComment: '', consultantComment: '', contractorComment: '' };
          }

          // Reset approvals if unfreezing or returning
          if (workflowActionType === 'UNFREEZE_BY_VARIATION') {
            updatedItem.approvals.employerApproved = false;
          } else if (workflowActionType === 'RETURN_TO_CONSULTANT') {
            updatedItem.approvals.consultantApproved = false;
          } else if (workflowActionType === 'RETURN_TO_CONTRACTOR') {
            updatedItem.approvals.contractorApproved = false;
          } else if (workflowActionType === 'FINAL_APPROVE') {
              // Also automatically set approval if final approve
              const currentOrgType = allOrgs.find(o => o.id === currentUser.orgId)?.type;
              if (currentOrgType === 'EMPLOYER') updatedItem.approvals.employerApproved = true;
              if (currentOrgType === 'CONSULTANT') updatedItem.approvals.consultantApproved = true;
              if (currentOrgType === 'CONTRACTOR') updatedItem.approvals.contractorApproved = true;
          }
        }

        const updatedMeetings = meetings.map(m => m.id === updatedItem.id ? updatedItem : m);
        setMeetings(updatedMeetings);
        saveMeetingsStorage(updatedMeetings);
        
        if (activeMeetingDetail?.id === updatedItem.id) {
          setActiveMeetingDetail(updatedItem);
        }
      }

      setWorkflowModalOpen(false);
      setWorkflowItem(null);
      setWorkflowActionType(null);
    } catch (error: any) {
      alert(error.message);
    }
  };

  // Official Letter CRUD Handlers
  const handleSaveLetter = (letterData: Partial<OfficialLetter>) => {
    if (editingLetter) {
      const updatedLetters = letters.map(l => {
        if (l.id === editingLetter.id) {
          return { ...l, ...letterData } as OfficialLetter;
        }
        return l;
      });
      setLetters(updatedLetters);
      safeSetStorage('hamyar_official_letters', updatedLetters);
    } else {
      const newLetterItem: any = {
        id: 'let_' + Date.now(),
        ...letterData,
        status: WorkflowStatus.DRAFT,
        createdById: currentUser?.id,
        ownerOrgId: currentUser?.orgId || letterData.senderOrgId || 'org-3',
        currentOrgId: currentUser?.orgId || letterData.senderOrgId || 'org-3',
        workflowHistory: []
      };
      const initialized = currentUser 
        ? WorkflowService.initializeRecord(newLetterItem, currentUser) 
        : newLetterItem;
      const updatedLetters = [initialized as OfficialLetter, ...letters];
      setLetters(updatedLetters);
      safeSetStorage('hamyar_official_letters', updatedLetters);
    }
    setIsLetterModalOpen(false);
    setEditingLetter(null);
  };

  const handleDeleteLetter = (letterId: string) => {
    setDeleteLetterId(letterId);
  };

  const confirmDeleteLetter = () => {
    if (deleteLetterId) {
      const updatedLetters = letters.filter(l => l.id !== deleteLetterId);
      setLetters(updatedLetters);
      safeSetStorage('hamyar_official_letters', updatedLetters);
      if (previewLetter?.id === deleteLetterId) {
        setPreviewLetter(null);
        setIsPreviewModalOpen(false);
      }
      setDeleteLetterId(null);
    }
  };

  const handleReplyLetter = (parentLetter: OfficialLetter) => {
    const replyData: any = {
      projectId: parentLetter.projectId,
      subject: `پاسخ به: ${parentLetter.subject}`,
      attentionTo: `پاسخ به نامه شماره ${parentLetter.letterNumber} مورخ ${parentLetter.date}`,
      receiverOrgId: parentLetter.senderOrgId,
      receiverOrgName: parentLetter.senderOrgName,
      receiverTitle: parentLetter.senderUserJobTitle || `مدیریت محترم ${parentLetter.senderOrgName}`,
      receiverJobTitle: parentLetter.senderUserJobTitle || '',
      receiverNameTitle: `جناب آقای ${parentLetter.senderUserFullName}`,
      scope: parentLetter.scope,
      letterType: parentLetter.letterType,
      content: '<p></p>',
      fontFamily: 'Vazirmatn',
      fontSize: '14px',
      attachments: [],
      transcripts: []
    };
    setEditingLetter(replyData);
    setIsLetterModalOpen(true);
  };

  const handleAddMarginalia = (
    note: string,
    targetUser?: { id: string; name: string; jobTitle?: string; orgName?: string }
  ) => {
    if (!marginaliaLetter || !currentUser) return;
    
    const userOrg = SystemAdminService.getOrganization(currentUser.orgId);
    const newMarginalia: LetterMarginalia = {
      id: 'marg_' + Date.now(),
      userId: currentUser.id,
      userName: currentUser.fullName,
      userJobTitle: currentUser.jobTitle || undefined,
      orgName: userOrg ? userOrg.name : undefined,
      targetUserId: targetUser?.id,
      targetUserName: targetUser?.name,
      targetUserJobTitle: targetUser?.jobTitle,
      targetOrgName: targetUser?.orgName,
      note: note,
      date: new Date().toLocaleDateString('fa-IR')
    };

    const updatedLetters = letters.map(l => {
      if (l.id === marginaliaLetter.id) {
        const existingMarginalia = l.marginalia || [];
        return {
          ...l,
          marginalia: [...existingMarginalia, newMarginalia]
        };
      }
      return l;
    });

    setLetters(updatedLetters);
    localStorage.setItem('hamyar_official_letters', JSON.stringify(updatedLetters));
    
    // Update active modal letter state
    const updatedLetter = updatedLetters.find(l => l.id === marginaliaLetter.id);
    if (updatedLetter) {
      setMarginaliaLetter(updatedLetter);
    }

    // Send notification if a specific target user is designated
    if (targetUser?.id && targetUser.id !== 'ALL' && targetUser.id !== currentUser.id) {
      const recipientUser = SystemAdminService.getUsers().find(u => u.id === targetUser.id);
      if (recipientUser) {
        NotificationService.createNotification(
          'WORKFLOW',
          'REASSIGN',
          'COMMUNICATIONS',
          updatedLetter || marginaliaLetter,
          currentUser,
          recipientUser.id,
          recipientUser.orgId,
          `یک دستور هامش (پاراف) جدید در نامه شماره «${marginaliaLetter.letterNumber}» از طرف ${currentUser.fullName} برای شما ثبت و ارجاع گردید.`
        );
      }
    }
  };

  useEffect(() => {
    const user = SystemAdminService.getCurrentUser();
    if (user) {
      setCurrentUser(user);
      const org = SystemAdminService.getOrganization(user.orgId);
      setUserOrgType(org?.type);
      
      let roleType: 'EMPLOYER' | 'CONSULTANT' | 'CONTRACTOR' | 'SYSTEM_ADMIN' = 'EMPLOYER';
      if (user.role === 'SYSTEM_ADMIN') {
        roleType = 'SYSTEM_ADMIN';
      } else if (org?.type === 'EMPLOYER') {
        roleType = 'EMPLOYER';
      } else if (org?.type === 'CONSULTANT') {
        roleType = 'CONSULTANT';
      } else if (org?.type === 'CONTRACTOR') {
        roleType = 'CONTRACTOR';
      }
      
      const level = (user.jobLevel || '').toString().trim();
      const title = (user.jobTitle || '').toString().trim();
      let formattedName = user.fullName;
      if (level) {
        formattedName += ` - ${level}`;
      }
      if (title && title !== level) {
        formattedName += ` - ${title}`;
      }

      setSimulatedUser({
        id: user.id,
        name: formattedName,
        role: roleType,
        orgName: org ? org.name : 'مدیریت سیستم'
      });
    }
    setOrgUsers(SystemAdminService.getUsers());
  }, []);

  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Meeting decision modal/form states
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
  const [newMeeting, setNewMeeting] = useState({
    title: '',
    date: '',
    location: '',
    attendees: [] as string[],
    decisions: [''] as string[]
  });
  const [activeMeetingDetail, setActiveMeetingDetail] = useState<MeetingDecision | null>(null);
  const [approveComment, setApproveComment] = useState('');
  const [deleteMeetingId, setDeleteMeetingId] = useState<string | null>(null);
  const [deleteLetterId, setDeleteLetterId] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Initialize and load data from localStorage
  useEffect(() => {
    // Load projects
    const rawProjects = localStorage.getItem('hamyar_projects');
    if (rawProjects) {
      try {
        const parsed = JSON.parse(rawProjects);
        const cleaned = Array.isArray(parsed)
          ? parsed.filter((p: any) => !String(p.title || p.name || '').includes('نیایش') && !String(p.title || p.name || '').includes('تصفیه‌خانه مرکزی') && !String(p.title || p.name || '').includes('تسویه خانه مرکزی'))
          : [];
        setProjects(cleaned);
        if (cleaned.length > 0 && !cleaned.some((p: any) => p.id === selectedProjectId)) {
          setSelectedProjectId(cleaned[0].id);
        }
      } catch (e) {
        console.error(e);
      }
    } else {
      // Fallback
      setProjects([]);
    }

    // Load Chats
    const rawChats = localStorage.getItem('hamyar_communications_chats');
    if (rawChats) {
      setChats(JSON.parse(rawChats));
    } else {
      setChats(MOCK_CHATS);
      localStorage.setItem('hamyar_communications_chats', JSON.stringify(MOCK_CHATS));
    }

    // Load Meetings
    const loadedMeetings = getMeetingsStorage(MOCK_MEETINGS);
    setMeetings(loadedMeetings);
    if (!localStorage.getItem('hamyar_communications_meetings')) {
      saveMeetingsStorage(MOCK_MEETINGS);
    }

    // Default simulated user to matching logged-in system user if possible
    const currentSystemUser = SystemAdminService.getCurrentUser();
    if (currentSystemUser) {
      const org = SystemAdminService.getOrganization(currentSystemUser.orgId);
      let roleType: 'EMPLOYER' | 'CONSULTANT' | 'CONTRACTOR' | 'SYSTEM_ADMIN' = 'EMPLOYER';
      if (currentSystemUser.role === 'SYSTEM_ADMIN') {
        roleType = 'SYSTEM_ADMIN';
      } else if (org?.type === 'EMPLOYER') {
        roleType = 'EMPLOYER';
      } else if (org?.type === 'CONSULTANT') {
        roleType = 'CONSULTANT';
      } else if (org?.type === 'CONTRACTOR') {
        roleType = 'CONTRACTOR';
      }
      const level = (currentSystemUser.jobLevel || '').toString().trim();
      const title = (currentSystemUser.jobTitle || '').toString().trim();
      let formattedName = currentSystemUser.fullName;
      if (level) {
        formattedName += ` - ${level}`;
      }
      if (title && title !== level) {
        formattedName += ` - ${title}`;
      }
      setSimulatedUser({
        id: currentSystemUser.id,
        name: formattedName,
        role: roleType,
        orgName: org ? org.name : 'مدیریت سیستم'
      });
    }
  }, []);

  // Scroll to bottom of chat list
  useEffect(() => {
    if (activeTab === 'chats') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chats, activeTab, selectedProjectId]);

  // Keep selected meeting detail updated or clear if no longer visible or projectId changed
  useEffect(() => {
    setActiveMeetingDetail(prev => {
      if (!prev) return null;
      const currentMeeting = meetings.find(m => m.id === prev.id);
      if (!currentMeeting || !checkMeetingVisibility(currentMeeting) || currentMeeting.projectId !== selectedProjectId) {
        return null;
      }
      if (JSON.stringify(currentMeeting) !== JSON.stringify(prev)) {
        return currentMeeting;
      }
      return prev;
    });
  }, [meetings, currentUser, selectedProjectId]);

  const activeProject = projects.find(p => p.id === selectedProjectId) || { title: 'پروژه نمونه' };

  // Handlers for Chats
  const handleSendMessage = () => {
    if (!messageText.trim()) return;

    const newMsg: ChatMessage = {
      id: 'chat_' + Date.now(),
      projectId: selectedProjectId,
      channelId: 'general',
      senderId: simulatedUser.id,
      senderName: simulatedUser.name,
      senderRole: simulatedUser.role,
      senderOrgName: simulatedUser.orgName,
      text: messageText,
      timestamp: new Date().toLocaleDateString('fa-IR') + ' ' + new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', hour12: false })
    };

    const updatedChats = [...chats, newMsg];
    setChats(updatedChats);
    localStorage.setItem('hamyar_communications_chats', JSON.stringify(updatedChats));
    setMessageText('');
  };

  const handlePresetSendMessage = (presetText: string) => {
    setMessageText(presetText);
  };

  const handleDeleteMessage = (msgId: string) => {
    const updatedChats = chats.filter(c => c.id !== msgId);
    setChats(updatedChats);
    localStorage.setItem('hamyar_communications_chats', JSON.stringify(updatedChats));
  };

  // Handlers for Meetings / Decisions
  const handleCreateMeeting = () => {
    if (!newMeeting.title.trim() || !newMeeting.date.trim()) {
      alert('لطفاً عنوان مصوبه و تاریخ جلسه را وارد کنید.');
      return;
    }

    const filteredAttendees = newMeeting.attendees.filter(a => a.trim() !== '');
    const filteredDecisions = newMeeting.decisions.filter(d => d.trim() !== '');

    if (filteredDecisions.length === 0) {
      alert('لطفاً حداقل یک تصمیم یا مصوبه وارد کنید.');
      return;
    }

    const meetingToSave: any = {
      id: 'meet_' + Date.now(),
      projectId: selectedProjectId,
      title: newMeeting.title,
      date: newMeeting.date,
      location: newMeeting.location || 'کارگاه پروژه',
      attendees: filteredAttendees.length > 0 ? filteredAttendees : ['نماینده کارفرما', 'نماینده مشاور', 'نماینده پیمانکار'],
      decisions: filteredDecisions,
      recordedBy: `${simulatedUser.name} (${simulatedUser.orgName})`,
      approvals: {
        employerApproved: false,
        consultantApproved: false,
        contractorApproved: false
      },
      approvalComments: {
        employerComment: '',
        consultantComment: '',
        contractorComment: ''
      }
    };

    if (currentUser) {
      const initialized = WorkflowService.initializeRecord(meetingToSave, currentUser);
      const updatedMeetings = [initialized as any, ...meetings];
      setMeetings(updatedMeetings);
      saveMeetingsStorage(updatedMeetings);
    } else {
      // Legacy fallback if no real user
      meetingToSave.status = WorkflowStatus.DRAFT;
      meetingToSave.approvals = {
        employerApproved: simulatedUser.role === 'EMPLOYER',
        consultantApproved: simulatedUser.role === 'CONSULTANT',
        contractorApproved: simulatedUser.role === 'CONTRACTOR'
      };
      const updatedMeetings = [meetingToSave, ...meetings];
      setMeetings(updatedMeetings);
      saveMeetingsStorage(updatedMeetings);
    }
    
    // Reset form
    setNewMeeting({
      title: '',
      date: '',
      location: '',
      attendees: [''],
      decisions: ['']
    });
    setIsMeetingModalOpen(false);
  };

  const handleEditMeeting = (meet: MeetingDecision) => {
    setEditingMeeting(meet);
    setIsMeetingModalOpen(true);
  };

  const handleSaveProjectMeeting = (meetingData: ProjectMeetingFormState) => {
    try {
      if (editingMeeting) {
        const updated: MeetingDecision = {
          ...editingMeeting,
          title: meetingData.title,
          minuteNumber: meetingData.minuteNumber,
          meetingType: meetingData.meetingType,
          partiesStructure: meetingData.partiesStructure || 'TRIPARTITE',
          date: meetingData.date,
          time: meetingData.time,
          location: meetingData.location,
          chairperson: meetingData.chairperson,
          secretary: meetingData.secretary,
          agenda: meetingData.agenda,
          attendees: (meetingData.attendeeList || []).map(a => `${a.name} (${a.role || a.organization})`),
          attendeeList: meetingData.attendeeList,
          absentees: meetingData.absentees,
          decisions: (meetingData.structuredDecisions || []).map(d => d.description),
          structuredDecisions: meetingData.structuredDecisions,
          nextMeetingDate: meetingData.nextMeetingDate,
          nextMeetingLocation: meetingData.nextMeetingLocation,
          nextMeetingAgenda: meetingData.nextMeetingAgenda,
          nextMeetingAgendas: meetingData.nextMeetingAgendas,
          notes: meetingData.notes,
          tags: meetingData.tags,
          orgSignatures: meetingData.orgSignatures || editingMeeting.orgSignatures || {},
          isFinalFrozen: editingMeeting.isFinalFrozen || false,
          sentToAllAttendees: editingMeeting.sentToAllAttendees || false,
          editorsLog: currentUser 
            ? Array.from(new Set([...(editingMeeting.editorsLog || []), currentUser.id]))
            : (editingMeeting.editorsLog || []),
          workflowHistory: [
            ...(editingMeeting.workflowHistory || []),
            ...(currentUser ? [{
              id: 'hist_' + Date.now(),
              action: 'EDIT' as const,
              actorUserId: currentUser.id,
              actorName: currentUser.fullName,
              timestamp: Date.now(),
              comment: 'ویرایش اطلاعات صورت‌جلسه (یک‌بار ویرایش مجاز)'
            }] : [])
          ]
        };

        const updatedMeetings = meetings.map(m => m.id === editingMeeting.id ? updated : m);
        setMeetings(updatedMeetings);
        saveMeetingsStorage(updatedMeetings);
        if (activeMeetingDetail?.id === editingMeeting.id) {
          setActiveMeetingDetail(updated);
        }
      } else {
        const newRecord: any = {
          id: 'meet_' + Date.now(),
          projectId: selectedProjectId,
          minuteNumber: meetingData.minuteNumber,
          title: meetingData.title,
          meetingType: meetingData.meetingType,
          partiesStructure: meetingData.partiesStructure || 'TRIPARTITE',
          date: meetingData.date,
          time: meetingData.time,
          location: meetingData.location || 'کارگاه پروژه',
          chairperson: meetingData.chairperson,
          secretary: meetingData.secretary,
          agenda: meetingData.agenda,
          attendees: (meetingData.attendeeList || []).map(a => `${a.name} (${a.role || a.organization})`),
          attendeeList: meetingData.attendeeList,
          absentees: meetingData.absentees,
          decisions: (meetingData.structuredDecisions || []).map(d => d.description),
          structuredDecisions: meetingData.structuredDecisions,
          nextMeetingDate: meetingData.nextMeetingDate,
          nextMeetingLocation: meetingData.nextMeetingLocation,
          nextMeetingAgenda: meetingData.nextMeetingAgenda,
          nextMeetingAgendas: meetingData.nextMeetingAgendas,
          notes: meetingData.notes,
          tags: meetingData.tags,
          orgSignatures: meetingData.orgSignatures || {},
          isFinalFrozen: false,
          sentToAllAttendees: false,
          recordedBy: currentUser ? currentUser.fullName : `${simulatedUser.name} (${simulatedUser.orgName})`,
          approvals: {
            employerApproved: false,
            consultantApproved: false,
            contractorApproved: false
          },
          approvalComments: {
            employerComment: '',
            consultantComment: '',
            contractorComment: ''
          }
        };

        if (currentUser) {
          const initialized = WorkflowService.initializeRecord(newRecord, currentUser);
          const updatedMeetings = [initialized as any, ...meetings];
          setMeetings(updatedMeetings);
          saveMeetingsStorage(updatedMeetings);
          setActiveMeetingDetail(initialized as any);
        } else {
          newRecord.status = WorkflowStatus.DRAFT;
          const updatedMeetings = [newRecord, ...meetings];
          setMeetings(updatedMeetings);
          saveMeetingsStorage(updatedMeetings);
          setActiveMeetingDetail(newRecord);
        }
      }
    } catch (err) {
      console.error('Error saving project meeting:', err);
    } finally {
      setIsMeetingModalOpen(false);
      setEditingMeeting(null);
    }
  };

  const handleUpdateDecisionStatus = (meetingId: string, decisionId: string, status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED', progress?: number) => {
    const updatedMeetings = meetings.map(m => {
      if (m.id === meetingId && m.structuredDecisions) {
        const updatedDecs = m.structuredDecisions.map(d => {
          if (d.id === decisionId) {
            return {
              ...d,
              status,
              progress: progress !== undefined ? progress : (status === 'COMPLETED' ? 100 : status === 'IN_PROGRESS' ? 50 : 0)
            };
          }
          return d;
        });
        return { ...m, structuredDecisions: updatedDecs };
      }
      return m;
    });
    setMeetings(updatedMeetings);
    saveMeetingsStorage(updatedMeetings);
    if (activeMeetingDetail?.id === meetingId) {
      const found = updatedMeetings.find(m => m.id === meetingId);
      if (found) setActiveMeetingDetail(found);
    }
  };

  const handleDeleteMeeting = (meetId: string) => {
    setDeleteMeetingId(meetId);
  };

  const confirmDeleteMeeting = () => {
    if (deleteMeetingId) {
      const updated = meetings.filter(m => m.id !== deleteMeetingId);
      setMeetings(updated);
      saveMeetingsStorage(updated);
      if (activeMeetingDetail?.id === deleteMeetingId) {
        setActiveMeetingDetail(null);
      }
      setDeleteMeetingId(null);
    }
  };

  const handleSignMeeting = (meetId: string, action: 'APPROVE' | 'REJECT') => {
    const comment = approveComment.trim() || (action === 'APPROVE' ? 'مورد تایید و امضای اینجانب است.' : 'نیاز به هماهنگی مجدد و اصلاح جزئیات دارد.');
    
    const updatedMeetings = meetings.map(meet => {
      if (meet.id !== meetId) return meet;

      const approvals = meet.approvals ? { ...meet.approvals } : { employerApproved: false, consultantApproved: false, contractorApproved: false };
      const comments = meet.approvalComments ? { ...meet.approvalComments } : { employerComment: '', consultantComment: '', contractorComment: '' };

      if (simulatedUser.role === 'EMPLOYER') {
        approvals.employerApproved = action === 'APPROVE';
        comments.employerComment = comment;
      } else if (simulatedUser.role === 'CONSULTANT') {
        approvals.consultantApproved = action === 'APPROVE';
        comments.consultantComment = comment;
      } else if (simulatedUser.role === 'CONTRACTOR') {
        approvals.contractorApproved = action === 'APPROVE';
        comments.contractorComment = comment;
      }

      // If all three parties approved, status becomes final APPROVED
      const isAllApproved = approvals.employerApproved && approvals.consultantApproved && approvals.contractorApproved;
      
      return {
        ...meet,
        approvals,
        status: isAllApproved ? WorkflowStatus.APPROVED_INTERNAL : WorkflowStatus.DRAFT,
        approvalComments: comments
      };
    });

    setMeetings(updatedMeetings);
    saveMeetingsStorage(updatedMeetings);
    setApproveComment('');
    
    const updatedDetail = updatedMeetings.find(m => m.id === meetId);
    if (updatedDetail) {
      setActiveMeetingDetail(updatedDetail);
    }
  };

  const checkMeetingVisibility = (meet: MeetingDecision) => {
    if (!currentUser || !meet) return false;

    // System admins see everything
    if (currentUser.role === 'SYSTEM_ADMIN') return true;

    // When a document is final/frozen, users across all organizations are allowed to view it
    if (meet?.isFinalFrozen) return true;

    const hasNoOversightInfo =
      !meet.createdById &&
      !meet.assigneeId &&
      (!meet.workflowHistory || meet.workflowHistory.length === 0);
    if (hasNoOversightInfo) return true;

    // Creator and Assignee can always see
    if (
      meet.createdById === currentUser.id ||
      meet.assigneeId === currentUser.id
    ) {
      return true;
    }

    // Exception: Project Managers can see items within their organization OR items currently in their organization for circulation
    const isProjectManager =
      currentUser.role === 'ORG_ADMIN' ||
      (currentUser.jobTitle || '').includes('مدیر پروژه') ||
      (currentUser.jobLevel || '').includes('مدیر پروژه') ||
      currentUser.username === 'e-pm' ||
      currentUser.id === 'e-pm';

    const hasHistory = meet.workflowHistory && meet.workflowHistory.length > 0;

    // Can see if they are the owner OR if the item is currently with their organization and has circulation started
    if (
      isProjectManager &&
      (meet.ownerOrgId === currentUser.orgId || meet.currentOrgId === currentUser.orgId) &&
      hasHistory
    ) {
      return true;
    }

    // Participants in workflow history
    const history = meet.workflowHistory || [];
    return history.some(
      (ev: any) =>
        ev.assigneeUserId === currentUser.id ||
        ev.actorUserId === currentUser.id
    );
  };

  const filterChats = chats.filter(c => c.projectId === selectedProjectId && c.channelId === 'general');
  const filterMeetings = meetings.filter(m => 
    m.projectId === selectedProjectId &&
    checkMeetingVisibility(m) &&
    (m.title.toLowerCase().includes(searchQuery.toLowerCase()) || m.decisions.some(d => d.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  const handlePrint = (meeting: MeetingDecision) => {
    printMeetingMinutes(meeting, activeProject);
  };

  return (
    <div className="space-y-6 pb-12 text-right" dir="rtl">
      {/* Header Bar */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-stone-200 shadow-sm flex flex-col xl:flex-row justify-between items-center gap-8">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-stone-900 rounded-[1.5rem] flex items-center justify-center text-amber-500 shadow-2xl shadow-stone-500/20">
            <MessageSquare size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-stone-900 tracking-tight">مرکز ارتباطات و مکاتبات پروژه</h2>
            <p className="text-stone-500 text-xs font-bold mt-1">مدیریت گفتگوهای تیمی، صورتجلسات کارگاهی و ابزارهای هماهنگی یکپارچه</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">پروژه فعال:</span>
            <select
              value={selectedProjectId}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedProjectId(val);
                localStorage.setItem("hamyar_selected_project_id", val);
                window.dispatchEvent(new Event('storage'));
                window.dispatchEvent(new CustomEvent('project-changed', { detail: { projectId: val } }));
              }}
              className="text-xs font-black text-stone-900 outline-none bg-transparent border-b border-stone-200 pb-0.5 focus:border-amber-500 transition-colors"
            >
              {accessibleProjects.length === 0 ? (
                <option value="">هیچ پروژه مجازی یافت نشد</option>
              ) : (
                accessibleProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="relative border-r border-stone-200 pr-4 mr-2">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 bg-white rounded-xl shadow-sm border border-stone-200 text-stone-400 hover:text-stone-900 hover:bg-stone-50 transition-all relative"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-amber-500 rounded-full border border-white"></span>
              )}
            </button>

            {/* Notification Dropdown */}
            {showNotifications && (
              <div className="absolute left-0 top-full mt-4 w-80 bg-white rounded-2xl shadow-xl border border-stone-200 z-[110] overflow-hidden animate-fadeIn text-right">
                <div className="p-4 border-b border-stone-100 flex justify-between items-center bg-stone-50/50">
                  <h4 className="font-black text-stone-700 text-[11px]">اعلان‌های مکاتبات و تصمیمات</h4>
                  {unreadCount > 0 && (
                    <button onClick={handleMarkAllRead} className="text-[10px] font-bold text-amber-600 hover:text-stone-900">خوانده شد</button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-stone-400 text-[11px] font-bold">هیچ اعلان جدیدی ندارید</div>
                  ) : (
                    notifications.map((n) => (
                      <div key={n.id} onClick={() => handleNotificationClick(n)} className={`p-4 border-b border-stone-50 hover:bg-stone-50 transition-colors cursor-pointer group ${n.status === "UNREAD" ? "bg-amber-50/30" : ""}`}>
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-[9px] font-black px-2 py-0.5 rounded-lg bg-stone-100 text-stone-600 group-hover:bg-amber-100 group-hover:text-amber-700 transition-colors">مکاتبات</span>
                          <span className="text-[9px] font-bold text-stone-400">{new Date(n.createdAt).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                        <p className={`text-[11px] leading-relaxed mb-1 ${n.status === "UNREAD" ? "font-black text-stone-800" : "font-medium text-stone-600"}`}>{n.message}</p>
                        <div className="flex items-center gap-1 text-[9px] font-bold text-stone-400"><User size={10} /><span>{n.fromUserName}</span></div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {activeTab === 'secretariat' && canAccessSecretariat && (
        <SecretariatDashboard
          letters={letters}
          projects={projects}
          selectedProjectId={selectedProjectId}
          currentUser={currentUser}
          onDeleteLetter={handleDeleteLetter}
          onOpenWorkflowModal={openWorkflowModal}
          onOpenHistoryModal={(letter) => {
            setHistoryItem(letter);
            setHistoryModalOpen(true);
          }}
          onOpenMarginaliaModal={(letter) => {
            setMarginaliaLetter(letter);
            setMarginaliaReadOnly(true);
            setIsMarginaliaModalOpen(true);
          }}
          onOpenPreviewModal={(letter) => {
            setPreviewLetter(letter);
            setIsPreviewModalOpen(true);
          }}
        />
      )}

      {activeTab === 'letters' && (
        <OfficialLettersList
          letters={letters}
          projects={projects}
          selectedProjectId={selectedProjectId}
          currentUser={currentUser}
          highlightedRecordId={highlightedRecordId}
          onOpenNewModal={() => {
            setEditingLetter(null);
            setIsLetterModalOpen(true);
          }}
          onOpenEditModal={(letter) => {
            setEditingLetter(letter);
            setIsLetterModalOpen(true);
          }}
          onDeleteLetter={handleDeleteLetter}
          onOpenWorkflowModal={openWorkflowModal}
          onOpenHistoryModal={(letter) => {
            setHistoryItem(letter);
            setHistoryModalOpen(true);
          }}
          onOpenMarginaliaModal={(letter) => {
            setMarginaliaLetter(letter);
            setMarginaliaReadOnly(false);
            setIsMarginaliaModalOpen(true);
          }}
          onOpenPreviewModal={(letter) => {
            setPreviewLetter(letter);
            setIsPreviewModalOpen(true);
          }}
          onReplyLetter={handleReplyLetter}
        />
      )}

      {activeTab === 'chats' && (
        <ProjectMessagingDashboard
          selectedProjectId={selectedProjectId}
          projects={projects}
          currentUser={currentUser}
        />
      )}

      {activeTab === 'meetings' && (
        <ProjectMeetingsDashboard
          meetings={meetings}
          projects={projects}
          selectedProjectId={selectedProjectId}
          currentUser={currentUser}
          userOrgType={userOrgType}
          activeProject={activeProject}
          activeMeetingDetail={activeMeetingDetail}
          setActiveMeetingDetail={setActiveMeetingDetail}
          highlightedRecordId={highlightedRecordId}
          onOpenNewMeeting={() => {
            setEditingMeeting(null);
            setIsMeetingModalOpen(true);
          }}
          onEditMeeting={handleEditMeeting}
          onDeleteMeeting={handleDeleteMeeting}
          onPrintMeeting={handlePrint}
          onOpenHistory={(meeting) => {
            setHistoryItem(meeting);
            setHistoryModalOpen(true);
          }}
          onOpenWorkflow={(meeting, action) => openWorkflowModal(meeting, action)}
          onUpdateMeeting={(updated) => {
            const updatedMeetings = meetings.map(m => m.id === updated.id ? updated : m);
            setMeetings(updatedMeetings);
            saveMeetingsStorage(updatedMeetings);
            if (activeMeetingDetail?.id === updated.id) {
              setActiveMeetingDetail(updated);
            }
          }}
          onUpdateDecisionStatus={handleUpdateDecisionStatus}
        />
      )}

      {/* Project Meeting Modal Dialog */}
      {isMeetingModalOpen && (
        <ProjectMeetingModal
          isOpen={true}
          onClose={() => {
            setIsMeetingModalOpen(false);
            setEditingMeeting(null);
          }}
          onSave={handleSaveProjectMeeting}
          initialMeeting={editingMeeting}
          activeProject={activeProject}
          currentUser={currentUser}
        />
      )}

      {deleteMeetingId && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-md animate-fadeIn" dir="rtl">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm text-center">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full mx-auto flex items-center justify-center mb-4">
              <AlertCircle size={32}/>
            </div>
            <h3 className="text-lg font-black text-stone-800">حذف صورتجلسه</h3>
            <p className="text-sm text-stone-500 mt-2">آیا مایل به حذف این صورتجلسه/تصمیم هستید؟ این عملیات غیرقابل بازگشت است.</p>
            <div className="flex gap-4 mt-6">
              <button onClick={() => setDeleteMeetingId(null)} className="flex-1 py-3 rounded-xl bg-stone-100 text-stone-700 font-bold hover:bg-stone-200 transition-colors">انصراف</button>
              <button onClick={confirmDeleteMeeting} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-colors">تایید و حذف</button>
            </div>
          </div>
        </div>
      )}

      {deleteLetterId && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-md animate-fadeIn" dir="rtl">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm text-center">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full mx-auto flex items-center justify-center mb-4">
              <AlertCircle size={32}/>
            </div>
            <h3 className="text-lg font-black text-stone-800">حذف نامه اداری / فنی</h3>
            <p className="text-sm text-stone-500 mt-2">آیا از حذف این نامه اطمینان دارید؟ این عملیات غیرقابل بازگشت است.</p>
            <div className="flex gap-4 mt-6">
              <button onClick={() => setDeleteLetterId(null)} className="flex-1 py-3 rounded-xl bg-stone-100 text-stone-700 font-bold hover:bg-stone-200 transition-colors">انصراف</button>
              <button onClick={confirmDeleteLetter} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-colors">تایید و حذف</button>
            </div>
          </div>
        </div>
      )}

      {/* Workflow Modal */}
      {workflowModalOpen && workflowItem && (
        <WorkflowModal
          isOpen={workflowModalOpen}
          onClose={() => setWorkflowModalOpen(false)}
          onConfirm={handleWorkflowAction}
          actionType={workflowActionType}
          item={workflowItem}
          assignee={workflowAssignee}
          onAssigneeChange={setWorkflowAssignee}
          comment={workflowComment}
          onCommentChange={setWorkflowComment}
          currentUser={currentUser}
          attachWorkflowSignature={attachWorkflowSignature}
          setAttachWorkflowSignature={setAttachWorkflowSignature}
        />
      )}

      {/* Workflow History Modal */}
      {historyModalOpen && historyItem && (
        <WorkflowHistoryModal
          isOpen={historyModalOpen}
          onClose={() => setHistoryModalOpen(false)}
          history={historyItem.workflowHistory || []}
          title={historyItem.title}
        />
      )}

      {/* Official Letter Modal */}
      {isLetterModalOpen && (
        <OfficialLetterModal
          key={editingLetter ? editingLetter.id : 'new-letter'}
          isOpen={isLetterModalOpen}
          onClose={() => {
            setIsLetterModalOpen(false);
            setEditingLetter(null);
          }}
          onSave={handleSaveLetter}
          initialLetter={editingLetter}
          currentUser={currentUser}
          selectedProjectId={selectedProjectId}
          projects={projects}
        />
      )}

      {/* Marginalia Modal */}
      {isMarginaliaModalOpen && (
        <MarginaliaModal
          isOpen={isMarginaliaModalOpen}
          onClose={() => {
            setIsMarginaliaModalOpen(false);
            setMarginaliaLetter(null);
          }}
          letter={marginaliaLetter}
          currentUser={currentUser}
          onAddMarginalia={handleAddMarginalia}
          isReadOnly={marginaliaReadOnly}
        />
      )}

      {/* Letter Preview Modal */}
      {isPreviewModalOpen && (
        <LetterPreviewModal
          isOpen={isPreviewModalOpen}
          onClose={() => {
            setIsPreviewModalOpen(false);
            setPreviewLetter(null);
          }}
          letter={previewLetter}
          project={projects.find(p => String(p.id) === String(selectedProjectId)) || null}
          currentUser={currentUser}
          onReply={handleReplyLetter}
        />
      )}

    </div>
  );
}
