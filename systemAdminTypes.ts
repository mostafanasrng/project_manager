
export enum OrganizationType {
  EMPLOYER = 'EMPLOYER',
  CONSULTANT = 'CONSULTANT',
  CONTRACTOR = 'CONTRACTOR'
}

export interface Organization {
  id: string;
  name: string;
  code: string;
  type: OrganizationType;
  isActive: boolean;
  brandColor?: string;
  logo?: string;             // آرم و لوگوی رسمی سازمان (Base64 یا URL)
  nationalId?: string;       // شناسه ملی
  economicCode?: string;     // کد اقتصادی
  registrationNumber?: string; // شماره ثبت
  ceoName?: string;          // نام مدیرعامل / نماینده
  phone?: string;            // تلفن تماس
  email?: string;            // پست الکترونیک
  website?: string;          // وب‌سایت
  address?: string;          // آدرس مرکزی
  postalCode?: string;       // کد پستی
  establishedYear?: string;  // سال تأسیس
  description?: string;      // زمینه فعالیت و شرح
  createdAt?: string;        // تاریخ ثبت در سیستم
}

export interface SystemProject {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  color?: string;
  status?: string;
  createdByUsername?: string;
  createdByRole?: string;
  createdByJobLevel?: string;
  employerName?: string;
  contractorName?: string;
  consultantName?: string;
}

export interface OrgProjectAccess {
  id: string;
  orgId: string;
  projectId: string;
  isActive: boolean;
}

export enum ModuleId {
  DASHBOARD = 'dashboard',
  PROJECT_DEFINITION = 'project-definition',
  CBS_CONTRACTS = 'cbs-contracts',
  TECHNICAL_OFFICE = 'technical-office',
  EXECUTION = 'execution',
  QUALITY_CONTROL = 'quality-control',
  PLANNING = 'planning',
  HSE = 'hse',
  HR = 'hr',
  USERS = 'users', // Org Admin managing users
  HISTORY = 'history',
  COMMUNICATIONS = 'communications',
  CBS_STATEMENTS = 'cbs-statements',
  DCC_ARCHIVE = 'dcc-archive'
}

export interface UserPermission {
  moduleId: ModuleId;
  canView: boolean;
  canCreate: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canSend?: boolean;
  canApprove?: boolean;
  canReject?: boolean;
  canFinalApprove?: boolean;
}

export interface SystemUser {
  id: string;
  username: string;
  fullName: string;
  email?: string;
  mobile?: string;
  password?: string; // In a real app, this would be hashed
  mustChangePassword?: boolean;
  jobLevel?: string; // سمت
  jobTitle?: string; // عنوان شغلی
  department?: string; // واحد
  gender?: 'male' | 'female';
  orgId: string;
  personnelId?: string; // ID پرسنل متناظر در بخش منابع انسانی
  projectIds?: string[]; // List of project IDs this user has access to
  securityCode?: string; // Two-step verification code for password reset
  isActive: boolean;
  role: 'SYSTEM_ADMIN' | 'ORG_ADMIN' | 'ORG_MANAGER' | 'ORG_USER' | 'USER';
  permissions?: UserPermission[];
  signature?: string; // Electronic signature of the user (synchronized from personnel dossier)
  signatureDate?: string;
}
