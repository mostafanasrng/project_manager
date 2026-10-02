import React from 'react';
import { 
  LayoutDashboard, 
  FolderKanban, 
  Users, 
  History, 
  Settings, 
  Calculator, 
  HardHat, 
  ShieldAlert, 
  BarChart3, 
  UserCircle, 
  ClipboardCheck,
  Truck,
  MessageSquare,
  Mail,
  Layers,
  FileText,
  FileSignature,
  Building2,
  Link,
  ShieldCheck,
  FolderArchive,
  BookOpen
} from 'lucide-react';
import { Project, PriceList, EstimateItem, ProjectMinute, MetreRow, VariationOrder, MivRecord, MrsRecord, WorkflowStatus, Statement, AdjustmentRecord, CbsContract } from './types';

export interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  children?: NavItem[];
}

import { ModuleId } from './systemAdminTypes';

export const APP_MODULES = [
  { id: ModuleId.DASHBOARD, label: 'داشبورد' },
  { id: ModuleId.PROJECT_DEFINITION, label: 'تعریف پروژه' },
  { id: ModuleId.TECHNICAL_OFFICE, label: 'دفتر فنی' },
  { id: ModuleId.CBS_STATEMENTS, label: 'صورت وضعیت CBS' },
  { id: ModuleId.EXECUTION, label: 'اجرا' },
  { id: ModuleId.QUALITY_CONTROL, label: 'کنترل کیفیت' },
  { id: ModuleId.PLANNING, label: 'کنترل و برنامه‌ریزی' },
  { id: ModuleId.HSE, label: 'ایمنی و بهداشت' },
  { id: ModuleId.HR, label: 'منابع انسانی' },
  { id: ModuleId.HISTORY, label: 'تاریخچه' },
  { id: ModuleId.COMMUNICATIONS, label: 'مکاتبات فنی و اداری' },
  { id: ModuleId.DCC_ARCHIVE, label: 'کنترل و بایگانی مدارک (DCC)' },
];

export const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'داشبورد', icon: <LayoutDashboard size={20} /> },
  { 
    id: 'projects', 
    label: 'پروژه‌ها', 
    icon: <FolderKanban size={20} />,
    children: [
      { id: 'project-definition', label: 'مدیریت قراردادها', icon: <FileText size={18} /> },
      { id: 'technical-office', label: 'دفتر فنی', icon: <Calculator size={18} /> },
      { id: 'cbs-statements', label: 'صورت وضعیت CBS', icon: <FileSignature size={18} /> },
      { id: 'execution', label: 'اجرا', icon: <HardHat size={18} /> },
      { id: 'quality-control', label: 'کنترل کیفیت', icon: <ClipboardCheck size={18} /> },
      { id: 'planning', label: 'کنترل و برنامه‌ریزی', icon: <BarChart3 size={18} /> },
      { id: 'hse', label: 'ایمنی و بهداشت', icon: <ShieldAlert size={18} /> },
      { id: 'dcc-archive', label: 'کنترل و بایگانی مدارک (DCC)', icon: <FolderArchive size={18} /> },
    ]
  },
  { 
    id: 'hr', 
    label: 'منابع انسانی', 
    icon: <UserCircle size={20} />,
    children: [
      { id: 'hr-personnel', label: 'کارگزینی و پرونده‌های پرسنلی', icon: <Users size={18} /> },
      { id: 'org-users', label: 'کاربران و دسترسی‌های سازمان', icon: <ShieldCheck size={18} /> },
      { id: 'admin-orgs', label: 'مدیریت سازمان‌ها', icon: <Building2 size={18} /> },
    ]
  },
  { 
    id: 'communications', 
    label: 'مکاتبات فنی و اداری', 
    icon: <Mail size={20} />,
    children: [
      { id: 'communications-secretariat', label: 'دبیرخانه و دفتر اندیکاتور', icon: <BookOpen size={18} /> },
      { id: 'communications-letters', label: 'مکاتبات و نامه‌های اداری و فنی', icon: <Mail size={18} /> },
      { id: 'communications-meetings', label: 'صورت‌جلسات و تصمیمات', icon: <Users size={18} /> },
      { id: 'communications-chats', label: 'پیام‌رسان کارگاهی', icon: <MessageSquare size={18} /> },
    ]
  },
];

export interface CbsNode {
  id: string;
  projectId: string;
  code: string;
  title: string;
  description?: string;
  parentId: string | null;
  level: number;
  sortOrder: number;
  isActive: boolean;
  status: "DRAFT" | "ACTIVE" | "DEACTIVATED" | "FROZEN";
  weightPercent: number;
  budget: number;
  unit?: string;
  quantity?: number;
  unitPrice?: number;
  responsibleUser?: string;
  notes?: { id: string; author: string; text: string; date: string }[];
  attachments?: { id: string; name: string; size: string; date: string }[];
  auditLogs?: { id: string; user: string; action: string; details: string; date: string }[];
}

export const DEFAULT_CBS_NODES: CbsNode[] = [];

export const MOCK_PRICE_LISTS: PriceList[] = [
  {
    id: 'pl1',
    title: 'فهرست بهای ابنیه',
    year: '1403',
    type: 'ابنیه',
    fileName: 'abnieh_1403.xlsx',
    uploadDate: new Date().toLocaleDateString('fa-IR'),
    items: [
      { code: '0101001', description: 'تخریب دستی آسفالت موجود', unit: 'مترمربع', price: 150000 },
      { code: '0101002', description: 'تخریب بتن با کمپرسور', unit: 'مترمربع', price: 300000 },
      { code: '0201001', description: 'خاکبرداری با ماشین در زمینهای معمولی', unit: 'مترمکعب', price: 80000 },
      { code: '0201002', description: 'خاکبرداری با دست در زمینهای سنگی', unit: 'مترمکعب', price: 250000 },
      { code: '0301001', description: 'اجرای بتن مگر با عیار ۱۵۰', unit: 'مترمکعب', price: 1200000 },
      { code: '0301002', description: 'قالب بندی با چوب و الوار', unit: 'مترمربع', price: 700000 },
    ],
  },
];

export const MOCK_PROJECTS: Project[] = [];

export const MOCK_ESTIMATE_ITEMS: EstimateItem[] = [];
export const MOCK_MINUTES: ProjectMinute[] = [];
export const MOCK_METRE_ROWS: MetreRow[] = [];
export const MOCK_VARIATIONS: VariationOrder[] = [];
export const MOCK_STATEMENTS: Statement[] = [];
export const MOCK_ADJUSTMENTS: AdjustmentRecord[] = [];
export const MOCK_MRS: MrsRecord[] = [];
export const MOCK_MIVS: MivRecord[] = [];

export const INITIAL_CONTRACTS: CbsContract[] = [];

