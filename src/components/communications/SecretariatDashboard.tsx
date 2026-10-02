import React, { useState, useMemo } from 'react';
import { 
  Search, Filter, Mail, FileText, Send, 
  Printer, History, Edit, Trash2, CheckCircle2, 
  Clock, Paperclip, ChevronLeft, ArrowDownLeft, ArrowUpRight,
  Building2, User, MessageSquare, Reply, Download, ShieldCheck,
  Inbox, BookOpen, AlertTriangle, CheckCheck, RefreshCw, Plus,
  Layers, Tag, Calendar, ExternalLink
} from 'lucide-react';
import { OfficialLetter, Project, WorkflowStatus, WorkflowAction, LetterScope, LetterType, LetterPriority } from '../../../types';
import { SystemUser, Organization, OrganizationType } from '../../../systemAdminTypes';
import { SystemAdminService } from '../../../services/systemAdminService';
import { WorkflowService } from '../../../services/workflowService';
import { NotificationService } from '../../../services/notificationService';
import { printOfficialLetter } from './OfficialLetterPrint';
import { formatUserDisplayFormal } from '../../utils/userFormatter';

interface SecretariatDashboardProps {
  letters: OfficialLetter[];
  projects: Project[];
  selectedProjectId: string;
  currentUser: SystemUser | null;
  onDeleteLetter: (letterId: string) => void;
  onOpenWorkflowModal: (letter: OfficialLetter, action: WorkflowAction) => void;
  onOpenHistoryModal: (letter: OfficialLetter) => void;
  onOpenMarginaliaModal: (letter: OfficialLetter) => void;
  onOpenPreviewModal: (letter: OfficialLetter) => void;
}

export type SecretariatStreamType = 'ALL' | 'INCOMING' | 'OUTGOING' | 'INTERNAL' | 'TRANSCRIPT';

export const SecretariatDashboard: React.FC<SecretariatDashboardProps> = ({
  letters,
  projects,
  selectedProjectId,
  currentUser,
  onDeleteLetter,
  onOpenWorkflowModal,
  onOpenHistoryModal,
  onOpenMarginaliaModal,
  onOpenPreviewModal
}) => {
  const [streamFilter, setStreamFilter] = useState<SecretariatStreamType>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | LetterType>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | LetterPriority>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | WorkflowStatus>('ALL');
  const [attachmentFilter, setAttachmentFilter] = useState<'ALL' | 'WITH_ATTACHMENT' | 'NO_ATTACHMENT'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [orgFilter, setOrgFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'DATE_DESC' | 'DATE_ASC' | 'INDICATOR' | 'PRIORITY'>('DATE_DESC');

  const organizations = useMemo(() => SystemAdminService.getOrganizations(), []);
  const currentOrg = currentUser ? SystemAdminService.getOrganization(currentUser.orgId) : undefined;
  const isSystemAdmin = currentUser?.role === 'SYSTEM_ADMIN';

  // Check if current user is PM or Workshop Superintendent
  const isPMOrWorkshopManager = useMemo(() => {
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

  const activeProject = useMemo(() => {
    return projects.find(p => String(p.id) === String(selectedProjectId));
  }, [projects, selectedProjectId]);

  // Determine user's organization scope
  const targetOrgId = useMemo(() => {
    if (isSystemAdmin) {
      return orgFilter === 'ALL' ? undefined : orgFilter;
    }
    return currentUser?.orgId;
  }, [isSystemAdmin, orgFilter, currentUser]);

  // Helper to categorize letter stream relative to the target/current organization
  const getLetterStreamCategory = (letter: OfficialLetter, userOrgId?: string): 'INCOMING' | 'OUTGOING' | 'INTERNAL' | 'TRANSCRIPT' | 'OTHER' => {
    if (!userOrgId) {
      if (letter.scope === 'INTERNAL') return 'INTERNAL';
      return 'OUTGOING';
    }

    const orgObj = organizations.find(o => o.id === userOrgId);
    const orgName = orgObj?.name;

    // 1. Internal to this org
    if ((letter.ownerOrgId === userOrgId || letter.senderOrgId === userOrgId) && letter.scope === 'INTERNAL') {
      return 'INTERNAL';
    }

    // 2. Outgoing from this org to external
    if ((letter.ownerOrgId === userOrgId || letter.senderOrgId === userOrgId) && letter.scope === 'EXTERNAL') {
      return 'OUTGOING';
    }

    // 3. Incoming from another org to this org
    const isReceiver = letter.receiverOrgId === userOrgId || 
      (orgName && letter.receiverOrgName && letter.receiverOrgName.includes(orgName)) ||
      (orgName && letter.receiverTitle && letter.receiverTitle.includes(orgName));
    
    if (isReceiver) {
      return 'INCOMING';
    }

    // 4. Transcript to this org
    const isTranscript = (letter.transcripts || []).some(t => 
      (orgName && t.orgName && (t.orgName.includes(orgName) || t.orgName === orgName))
    );
    if (isTranscript) {
      return 'TRANSCRIPT';
    }

    // Current org workflow
    if (letter.currentOrgId === userOrgId) {
      return 'INCOMING';
    }

    return 'OTHER';
  };

  // Filter letters accessible to the Secretariat for the Organization
  const secretariatLetters = useMemo(() => {
    return letters.filter(letter => {
      // 1. Project match
      if (letter.projectId !== selectedProjectId) return false;

      // 2. Organization Scope Access
      // For System Admin:
      if (isSystemAdmin) {
        if (orgFilter === 'ALL') {
          return true; // System Admin has full unrestricted access to ALL letters across all organizations
        }
        const stream = getLetterStreamCategory(letter, orgFilter);
        const orgObj = organizations.find(o => o.id === orgFilter);
        const orgName = orgObj?.name;
        const matchesOrg = letter.ownerOrgId === orgFilter || 
          letter.senderOrgId === orgFilter || 
          letter.receiverOrgId === orgFilter ||
          (orgName && letter.senderOrgName?.includes(orgName)) ||
          (orgName && letter.receiverOrgName?.includes(orgName));

        if (stream === 'OTHER' && !matchesOrg) {
          return false;
        }
        return true;
      }

      // For PMs, Workshop Managers, and Org users:
      // They have access to:
      // - All internal letters of their org
      // - All outgoing letters sent from their org
      // - All incoming letters received by their org from other orgs
      // - All letters where their org is in transcripts
      if (currentUser?.orgId) {
        const stream = getLetterStreamCategory(letter, currentUser.orgId);
        if (stream === 'OTHER') {
          const orgObj = organizations.find(o => o.id === currentUser.orgId);
          const orgName = orgObj?.name;
          const matchesOrg = letter.ownerOrgId === currentUser.orgId || 
            letter.senderOrgId === currentUser.orgId || 
            letter.receiverOrgId === currentUser.orgId ||
            (orgName && letter.senderOrgName?.includes(orgName)) ||
            (orgName && letter.receiverOrgName?.includes(orgName));

          if (!matchesOrg && letter.createdById !== currentUser.id && letter.assigneeId !== currentUser.id) {
            return false;
          }
        }
      }

      return true;
    });
  }, [letters, selectedProjectId, currentUser, isSystemAdmin, orgFilter, organizations]);

  // Statistics calculation for Secretariat Cards
  const stats = useMemo(() => {
    const orgId = targetOrgId || currentUser?.orgId;
    let total = 0;
    let incoming = 0;
    let outgoing = 0;
    let internal = 0;
    let transcripts = 0;
    let pendingAction = 0;
    let withAttachment = 0;
    let urgentCount = 0;

    secretariatLetters.forEach(l => {
      total++;
      const stream = getLetterStreamCategory(l, orgId);
      if (stream === 'INCOMING') incoming++;
      else if (stream === 'OUTGOING') outgoing++;
      else if (stream === 'INTERNAL') internal++;
      else if (stream === 'TRANSCRIPT') transcripts++;

      if (l.priority === 'URGENT' || l.priority === 'VERY_URGENT' || l.priority === 'INSTANT') {
        urgentCount++;
      }

      if (l.hasAttachment || (l.attachments && l.attachments.length > 0)) {
        withAttachment++;
      }

      if (l.status === WorkflowStatus.SENT_TO_CONSULTANT || 
          l.status === WorkflowStatus.SENT_TO_EMPLOYER || 
          l.status === WorkflowStatus.IN_CONSULTANT_REVIEW ||
          l.status === WorkflowStatus.IN_EMPLOYER_REVIEW ||
          l.status === WorkflowStatus.IN_REVIEW ||
          l.status === WorkflowStatus.DRAFT) {
        pendingAction++;
      }
    });

    return {
      total,
      incoming,
      outgoing,
      internal,
      transcripts,
      pendingAction,
      withAttachment,
      urgentCount
    };
  }, [secretariatLetters, targetOrgId, currentUser]);

  // Filtered and Sorted Letters for the Secretariat Table
  const filteredLetters = useMemo(() => {
    const orgId = targetOrgId || currentUser?.orgId;

    let result = secretariatLetters.filter(letter => {
      // Stream Filter
      if (streamFilter !== 'ALL') {
        const stream = getLetterStreamCategory(letter, orgId);
        if (streamFilter === 'INCOMING' && stream !== 'INCOMING') return false;
        if (streamFilter === 'OUTGOING' && stream !== 'OUTGOING') return false;
        if (streamFilter === 'INTERNAL' && stream !== 'INTERNAL') return false;
        if (streamFilter === 'TRANSCRIPT' && stream !== 'TRANSCRIPT') return false;
      }

      // Type Filter
      if (typeFilter !== 'ALL' && letter.letterType !== typeFilter) return false;

      // Priority Filter
      if (priorityFilter !== 'ALL' && letter.priority !== priorityFilter) return false;

      // Status Filter
      if (statusFilter !== 'ALL' && letter.status !== statusFilter) return false;

      // Attachment Filter
      if (attachmentFilter === 'WITH_ATTACHMENT' && !letter.hasAttachment && (!letter.attachments || letter.attachments.length === 0)) return false;
      if (attachmentFilter === 'NO_ATTACHMENT' && (letter.hasAttachment || (letter.attachments && letter.attachments.length > 0))) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchesSubj = (letter.subject || '').toLowerCase().includes(q);
        const matchesNum = (letter.letterNumber || '').toLowerCase().includes(q);
        const matchesInd = (letter.indicatorNumber || '').toLowerCase().includes(q);
        const matchesRecv = (letter.receiverTitle || '').toLowerCase().includes(q);
        const matchesSender = (letter.senderUserFullName || '').toLowerCase().includes(q);
        const matchesOrg = (letter.senderOrgName || '').toLowerCase().includes(q);
        const matchesContent = (letter.content || '').toLowerCase().includes(q);
        const matchesAttention = (letter.attentionTo || '').toLowerCase().includes(q);
        
        if (!matchesSubj && !matchesNum && !matchesInd && !matchesRecv && !matchesSender && !matchesOrg && !matchesContent && !matchesAttention) {
          return false;
        }
      }

      return true;
    });

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'DATE_DESC') {
        return (b.date || '').localeCompare(a.date || '');
      }
      if (sortBy === 'DATE_ASC') {
        return (a.date || '').localeCompare(b.date || '');
      }
      if (sortBy === 'INDICATOR') {
        return (b.indicatorNumber || '').localeCompare(a.indicatorNumber || '');
      }
      if (sortBy === 'PRIORITY') {
        const weight = (p: LetterPriority) => {
          if (p === 'INSTANT') return 4;
          if (p === 'VERY_URGENT') return 3;
          if (p === 'URGENT') return 2;
          return 1;
        };
        return weight(b.priority) - weight(a.priority);
      }
      return 0;
    });

    return result;
  }, [secretariatLetters, streamFilter, typeFilter, priorityFilter, statusFilter, attachmentFilter, searchQuery, sortBy, targetOrgId, currentUser]);

  // Handler to print the entire secretariat ledger / indicator log
  const handlePrintSecretariatLedger = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('امکان باز کردن پنجره چاپ وجود ندارد. لطفاً پاپ‌آپ مرورگر را فعال کنید.');
      return;
    }

    const orgName = currentOrg?.name || 'دفتر مرکزی / مدیریت پروژه';
    const projectTitle = activeProject?.title || 'پروژه اجرایی';
    const contractNumber = activeProject?.contractNumber || (activeProject as any)?.contractNumber || '---';
    const employerName = activeProject?.employerName || (activeProject as any)?.employer || 'کارفرما';
    const consultantName = activeProject?.consultantName || (activeProject as any)?.consultant || 'دستگاه نظارت / مشاور';
    const contractorName = activeProject?.contractorName || (activeProject as any)?.contractor || 'پیمانکار';
    const today = new Date().toLocaleDateString('fa-IR');

    // Calculate stats
    const totalCount = filteredLetters.length;
    const incomingCount = filteredLetters.filter(l => getLetterStreamCategory(l, targetOrgId || currentUser?.orgId) === 'INCOMING').length;
    const outgoingCount = filteredLetters.filter(l => getLetterStreamCategory(l, targetOrgId || currentUser?.orgId) === 'OUTGOING').length;
    const internalCount = filteredLetters.filter(l => getLetterStreamCategory(l, targetOrgId || currentUser?.orgId) === 'INTERNAL').length;
    const urgentCount = filteredLetters.filter(l => l.priority === 'URGENT' || l.priority === 'VERY_URGENT' || l.priority === 'INSTANT').length;
    const withAttachmentCount = filteredLetters.filter(l => l.attachments && l.attachments.length > 0).length;

    const tableRows = filteredLetters.map((l, index) => {
      const stream = getLetterStreamCategory(l, targetOrgId || currentUser?.orgId);
      const streamLabel = 
        stream === 'INCOMING' ? 'وارده' :
        stream === 'OUTGOING' ? 'صادره' :
        stream === 'INTERNAL' ? 'داخلی' : 'رونوشت';

      const typeLabel = 
        l.letterType === 'TECHNICAL' ? 'فنی' :
        l.letterType === 'ADMINISTRATIVE' ? 'اداری' :
        l.letterType === 'FINANCIAL' ? 'مالی' :
        l.letterType === 'SAFETY' ? 'HSE' :
        l.letterType === 'CONTRACTUAL' ? 'حقوقی' : 'سایر';

      const priorityLabel = 
        l.priority === 'INSTANT' ? 'آنی' :
        l.priority === 'VERY_URGENT' ? 'خیلی فوری' :
        l.priority === 'URGENT' ? 'فوری' : 'عادی';

      return `
        <tr>
          <td style="text-align: center; font-weight: bold;">${(index + 1).toLocaleString('fa-IR')}</td>
          <td style="text-align: center; font-weight: bold; font-family: monospace;">${l.indicatorNumber || '---'}</td>
          <td style="text-align: center;"><span class="badge badge-${stream.toLowerCase()}">${streamLabel}</span></td>
          <td style="text-align: center; font-weight: bold; direction: ltr;">${l.letterNumber}</td>
          <td style="text-align: center;">${l.date}</td>
          <td>${l.senderOrgName} - ${l.senderUserFullName} (${l.senderUserJobTitle || '---'})</td>
          <td>${l.receiverTitle}</td>
          <td style="font-weight: 500;">${l.subject}</td>
          <td style="text-align: center;">${typeLabel}</td>
          <td style="text-align: center;">${priorityLabel}</td>
          <td style="text-align: center;">${(l.attachments && l.attachments.length > 0) ? l.attachments.length.toLocaleString('fa-IR') + ' مورد' : 'ندارد'}</td>
        </tr>
      `;
    }).join('');

    const secLogos = SystemAdminService.getProjectOrgLogos(activeProject);
    const secLogoHtml = [
      secLogos.employerLogo ? `<img src="${secLogos.employerLogo}" style="height: 38px; max-width: 80px; object-fit: contain;" alt="کارفرما" />` : '',
      secLogos.consultantLogo ? `<img src="${secLogos.consultantLogo}" style="height: 38px; max-width: 80px; object-fit: contain;" alt="مشاور" />` : '',
      secLogos.contractorLogo ? `<img src="${secLogos.contractorLogo}" style="height: 38px; max-width: 80px; object-fit: contain;" alt="پیمانکار" />` : ''
    ].filter(Boolean).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="fa">
      <head>
        <meta charset="UTF-8">
        <title>دفتر اندیکاتور و بایگانی دبیرخانه - ${orgName}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;700;800;900&display=swap');
          @page {
            size: A4 landscape;
            margin: 8mm;
          }
          * { box-sizing: border-box; }
          body {
            font-family: 'Vazirmatn', 'Tahoma', 'Segoe UI', Arial, sans-serif;
            margin: 0;
            padding: 15px;
            color: #0f172a;
            background: #fff;
            font-size: 10.5px;
            direction: rtl;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .header {
            border: 2px solid #0f172a;
            padding: 10px 16px;
            margin-bottom: 12px;
            border-radius: 6px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #fafafa;
          }
          .header-title {
            text-align: center;
            flex: 1;
          }
          .header-title h1 {
            margin: 0 0 3px 0;
            font-size: 11px;
            font-weight: 800;
            color: #475569;
          }
          .header-title h2 {
            margin: 0;
            font-size: 15px;
            font-weight: 900;
            color: #0f172a;
          }
          .header-meta {
            text-align: left;
            font-size: 10px;
            line-height: 1.6;
          }
          .project-banner {
            background-color: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            padding: 6px 12px;
            font-size: 10px;
            margin-bottom: 10px;
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 6px;
          }
          .kpi-row {
            display: grid;
            grid-template-columns: repeat(6, 1fr);
            gap: 8px;
            margin-bottom: 12px;
          }
          .kpi-card {
            background: #ffffff;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            padding: 6px;
            text-align: center;
          }
          .kpi-label { font-size: 9px; color: #64748b; font-weight: bold; }
          .kpi-value { font-size: 13px; font-weight: 900; color: #0f172a; margin-top: 2px; }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
            margin-bottom: 15px;
          }
          th, td {
            border: 1px solid #94a3b8;
            padding: 5px 6px;
            vertical-align: middle;
            font-size: 9.5px;
          }
          th {
            background-color: #f1f5f9;
            font-weight: 900;
            font-size: 10px;
            text-align: center;
            color: #0f172a;
          }
          tr:nth-child(even) {
            background-color: #f8fafc;
          }
          .badge {
            display: inline-block;
            padding: 2px 5px;
            border-radius: 4px;
            font-size: 8.5px;
            font-weight: bold;
          }
          .badge-incoming { background: #dbeafe; color: #1e40af; border: 1px solid #bfdbfe; }
          .badge-outgoing { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
          .badge-internal { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
          .badge-transcript { background: #f3e8ff; color: #6b21a8; border: 1px solid #e9d5ff; }
          .footer {
            margin-top: 25px;
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            text-align: center;
            page-break-inside: avoid;
          }
          .sign-box {
            border: 1px dashed #94a3b8;
            border-radius: 6px;
            background: #fafafa;
            padding: 8px 6px;
            min-height: 80px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .sign-role { font-size: 10px; font-weight: 900; color: #0f172a; }
          .sign-placeholder { font-size: 8.5px; color: #94a3b8; margin: 15px 0 5px 0; border-top: 1px dashed #cbd5e1; padding-top: 4px; }
          @media print {
            .no-print { display: none; }
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div style="display: flex; align-items: center; gap: 8px;">
            ${secLogoHtml}
            <div style="font-size: 10px; font-weight: bold; line-height: 1.6;">
              <div><strong>سامانه جامع مدیریت و کنترل پروژه همیار</strong></div>
              <div><strong>سازمان / واحد:</strong> ${orgName}</div>
            </div>
          </div>
          <div class="header-title">
            <h1>جمهوری اسلامی ایران</h1>
            <h2>دفتر ثبت اندیکاتور و گزارش رسمی مکاتبات دبیرخانه</h2>
          </div>
          <div class="header-meta">
            <div><strong>تاریخ گزارش:</strong> ${today}</div>
            <div><strong>تعداد کل رکوردها:</strong> ${totalCount.toLocaleString('fa-IR')} فقره</div>
          </div>
        </div>

        <div class="project-banner">
          <div><strong style="color: #64748b;">نام پروژه:</strong> <span style="font-weight: 800; color: #0f172a;">${projectTitle}</span></div>
          <div><strong style="color: #64748b;">شماره پیمان:</strong> <span style="font-weight: 800; color: #0f172a;">${contractNumber}</span></div>
          <div><strong style="color: #64748b;">کارفرما:</strong> <span style="font-weight: 800; color: #0f172a;">${employerName}</span></div>
          <div><strong style="color: #64748b;">مشاور / نظارت:</strong> <span style="font-weight: 800; color: #0f172a;">${consultantName}</span></div>
        </div>

        <div class="kpi-row">
          <div class="kpi-card"><div class="kpi-label">کل مکاتبات ثبت‌شده</div><div class="kpi-value">${totalCount.toLocaleString('fa-IR')}</div></div>
          <div class="kpi-card"><div class="kpi-label">نامه‌های وارده</div><div class="kpi-value" style="color: #1e40af;">${incomingCount.toLocaleString('fa-IR')}</div></div>
          <div class="kpi-card"><div class="kpi-label">نامه‌های صادره</div><div class="kpi-value" style="color: #166534;">${outgoingCount.toLocaleString('fa-IR')}</div></div>
          <div class="kpi-card"><div class="kpi-label">مکاتبات درون‌سازمانی</div><div class="kpi-value" style="color: #92400e;">${internalCount.toLocaleString('fa-IR')}</div></div>
          <div class="kpi-card"><div class="kpi-label">مکاتبات فوری و آنی</div><div class="kpi-value" style="color: #dc2626;">${urgentCount.toLocaleString('fa-IR')}</div></div>
          <div class="kpi-card"><div class="kpi-label">دارای پیوست ضمیمه</div><div class="kpi-value" style="color: #7c3aed;">${withAttachmentCount.toLocaleString('fa-IR')}</div></div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 30px;">ردیف</th>
              <th style="width: 75px;">شماره اندیکاتور</th>
              <th style="width: 55px;">جریان</th>
              <th style="width: 95px;">شماره نامه</th>
              <th style="width: 70px;">تاریخ نامه</th>
              <th style="width: 150px;">فرستنده / مبدأ</th>
              <th style="width: 150px;">گیرنده / مقصد</th>
              <th>موضوع نامه</th>
              <th style="width: 50px;">نوع</th>
              <th style="width: 55px;">فوریت</th>
              <th style="width: 55px;">پیوست</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>

        <div class="footer">
          <div class="sign-box">
            <div class="sign-role">مسئول ثبت و بایگانی دبیرخانه</div>
            <div class="sign-placeholder">نام، امضا و تاریخ</div>
          </div>
          <div class="sign-box">
            <div class="sign-role">مدیر دفتر فنی و مهندسی</div>
            <div class="sign-placeholder">نام، امضا و تاریخ</div>
          </div>
          <div class="sign-box">
            <div class="sign-role">سرپرست کارگاه / مدیر پروژه</div>
            <div class="sign-placeholder">نام، امضا و تاریخ</div>
          </div>
          <div class="sign-box">
            <div class="sign-role">نماینده دستگاه نظارت / کارفرما</div>
            <div class="sign-placeholder">نام، امضا و تاریخ</div>
          </div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 350);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // Export CSV / Excel list
  const handleExportCSV = () => {
    const headers = ['ردیف', 'شماره اندیکاتور', 'نوع جریان', 'شماره نامه', 'تاریخ', 'فرستنده', 'سازمان فرستنده', 'گیرنده', 'موضوع', 'نوع مکاتبه', 'اولویت', 'تعداد پیوست'];
    const rows = filteredLetters.map((l, index) => {
      const stream = getLetterStreamCategory(l, targetOrgId || currentUser?.orgId);
      const streamLabel = 
        stream === 'INCOMING' ? 'وارده' :
        stream === 'OUTGOING' ? 'صادره' :
        stream === 'INTERNAL' ? 'درون‌سازمانی' : 'رونوشت';

      return [
        index + 1,
        l.indicatorNumber || '---',
        streamLabel,
        `"${l.letterNumber}"`,
        l.date,
        `"${l.senderUserFullName}"`,
        `"${l.senderOrgName}"`,
        `"${l.receiverTitle}"`,
        `"${l.subject.replace(/"/g, '""')}"`,
        l.letterType,
        l.priority,
        (l.attachments || []).length
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Secretariat_Ledger_${new Date().toLocaleDateString('fa-IR').replace(/\//g, '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header Banner & Organization Context */}
      <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-black shrink-0 shadow-inner">
              <BookOpen size={28} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h2 className="font-black text-stone-900 text-xl md:text-2xl tracking-tight">
                  دبیرخانه و دفتر اندیکاتور سازمانی
                </h2>
                <span className="text-xs bg-amber-500/10 text-amber-800 border border-amber-500/20 px-3 py-1 rounded-full font-black flex items-center gap-1.5">
                  <Building2 size={13} />
                  {currentOrg ? currentOrg.name : (isSystemAdmin ? 'مدیریت کل سیستم' : 'سازمان نامشخص')}
                </span>
                {isPMOrWorkshopManager && (
                  <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                    <ShieldCheck size={12} />
                    دسترسی کامل سرپرست کارگاه و مدیر پروژه
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-500 font-bold leading-relaxed max-w-3xl">
                بایگانی و دفتر اندیکاتور یکپارچه مکاتبات رسمی؛ دسترسی به تمامی نامه‌های وارده از سایر سازمان‌ها، نامه‌های صادره، مکاتبات درون‌سازمانی، رونوشت‌ها و ثبت سوابق گردش کار
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            <button
              onClick={handlePrintSecretariatLedger}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-black text-xs transition-all active:scale-95 border border-stone-200 shadow-xs"
              title="چاپ رسمی دفتر اندیکاتور"
            >
              <Printer size={16} />
              چاپ دفتر اندیکاتور
            </button>
            <button
              onClick={handleExportCSV}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-black text-xs transition-all active:scale-95 border border-stone-200 shadow-xs"
              title="خروجی فایل اکسل / CSV"
            >
              <Download size={16} />
              خروجی اکسل
            </button>
          </div>
        </div>

        {/* System Admin Org Switcher */}
        {isSystemAdmin && (
          <div className="mt-5 pt-4 border-t border-stone-100 flex flex-wrap items-center gap-3">
            <span className="text-xs font-black text-stone-500 flex items-center gap-1.5">
              <Filter size={14} /> فیلتر بر اساس سازمان (سطح دسترسی مدیر سیستم):
            </span>
            <select
              value={orgFilter}
              onChange={(e) => setOrgFilter(e.target.value)}
              className="px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-black text-stone-800 focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">همه سازمان‌ها (نمای جامع پروژه‌ای)</option>
              {organizations.map(org => (
                <option key={org.id} value={org.id}>
                  {org.name} ({org.type === 'EMPLOYER' ? 'کارفرما' : org.type === 'CONSULTANT' ? 'مشاور' : 'پیمانکار'})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Secretariat Metric & KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Registered */}
        <div 
          onClick={() => setStreamFilter('ALL')}
          className={`p-5 rounded-3xl border transition-all cursor-pointer select-none relative overflow-hidden ${
            streamFilter === 'ALL'
              ? 'bg-stone-900 text-white border-stone-900 shadow-xl shadow-stone-900/10'
              : 'bg-white text-stone-900 border-stone-200 hover:border-amber-400 hover:shadow-md'
          }`}
        >
          <div className="flex justify-between items-start mb-3">
            <span className={`text-xs font-black ${streamFilter === 'ALL' ? 'text-stone-300' : 'text-stone-500'}`}>
              کل اسناد دبیرخانه
            </span>
            <div className={`p-2.5 rounded-2xl ${streamFilter === 'ALL' ? 'bg-white/10 text-amber-400' : 'bg-stone-100 text-stone-700'}`}>
              <BookOpen size={20} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black">{stats.total}</span>
            <span className={`text-xs font-bold ${streamFilter === 'ALL' ? 'text-stone-400' : 'text-stone-500'}`}>فقره سند</span>
          </div>
          <div className={`mt-3 text-[11px] font-bold flex items-center justify-between border-t pt-2.5 ${streamFilter === 'ALL' ? 'border-white/10 text-stone-300' : 'border-stone-100 text-stone-500'}`}>
            <span>دفتر ثبت اندیکاتور</span>
            <span className="font-mono">IND-ACTIVE</span>
          </div>
        </div>

        {/* Incoming Letters */}
        <div 
          onClick={() => setStreamFilter('INCOMING')}
          className={`p-5 rounded-3xl border transition-all cursor-pointer select-none relative overflow-hidden ${
            streamFilter === 'INCOMING'
              ? 'bg-blue-900 text-white border-blue-900 shadow-xl shadow-blue-900/10'
              : 'bg-white text-stone-900 border-stone-200 hover:border-blue-400 hover:shadow-md'
          }`}
        >
          <div className="flex justify-between items-start mb-3">
            <span className={`text-xs font-black ${streamFilter === 'INCOMING' ? 'text-blue-200' : 'text-blue-700'}`}>
              نامه‌های وارده
            </span>
            <div className={`p-2.5 rounded-2xl ${streamFilter === 'INCOMING' ? 'bg-white/10 text-blue-300' : 'bg-blue-50 text-blue-600'}`}>
              <ArrowDownLeft size={20} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black">{stats.incoming}</span>
            <span className={`text-xs font-bold ${streamFilter === 'INCOMING' ? 'text-blue-200' : 'text-stone-500'}`}>دریافتی از سایر سازمان‌ها</span>
          </div>
          <div className={`mt-3 text-[11px] font-bold flex items-center justify-between border-t pt-2.5 ${streamFilter === 'INCOMING' ? 'border-white/10 text-blue-200' : 'border-stone-100 text-stone-500'}`}>
            <span>ورودی به کارتابل سازمان</span>
            <span className="text-blue-600 font-black">{stats.incoming > 0 ? `${Math.round((stats.incoming / Math.max(stats.total, 1)) * 100)}%` : '۰%'}</span>
          </div>
        </div>

        {/* Outgoing Letters */}
        <div 
          onClick={() => setStreamFilter('OUTGOING')}
          className={`p-5 rounded-3xl border transition-all cursor-pointer select-none relative overflow-hidden ${
            streamFilter === 'OUTGOING'
              ? 'bg-emerald-900 text-white border-emerald-900 shadow-xl shadow-emerald-900/10'
              : 'bg-white text-stone-900 border-stone-200 hover:border-emerald-400 hover:shadow-md'
          }`}
        >
          <div className="flex justify-between items-start mb-3">
            <span className={`text-xs font-black ${streamFilter === 'OUTGOING' ? 'text-emerald-200' : 'text-emerald-700'}`}>
              نامه‌های صادره
            </span>
            <div className={`p-2.5 rounded-2xl ${streamFilter === 'OUTGOING' ? 'bg-white/10 text-emerald-300' : 'bg-emerald-50 text-emerald-600'}`}>
              <ArrowUpRight size={20} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black">{stats.outgoing}</span>
            <span className={`text-xs font-bold ${streamFilter === 'OUTGOING' ? 'text-emerald-200' : 'text-stone-500'}`}>ارسالی به بیرون</span>
          </div>
          <div className={`mt-3 text-[11px] font-bold flex items-center justify-between border-t pt-2.5 ${streamFilter === 'OUTGOING' ? 'border-white/10 text-emerald-200' : 'border-stone-100 text-stone-500'}`}>
            <span>ابلاغ شده به ارکان پروژه</span>
            <span className="text-emerald-600 font-black">{stats.outgoing > 0 ? `${Math.round((stats.outgoing / Math.max(stats.total, 1)) * 100)}%` : '۰%'}</span>
          </div>
        </div>

        {/* Internal Letters */}
        <div 
          onClick={() => setStreamFilter('INTERNAL')}
          className={`p-5 rounded-3xl border transition-all cursor-pointer select-none relative overflow-hidden ${
            streamFilter === 'INTERNAL'
              ? 'bg-amber-900 text-white border-amber-900 shadow-xl shadow-amber-900/10'
              : 'bg-white text-stone-900 border-stone-200 hover:border-amber-400 hover:shadow-md'
          }`}
        >
          <div className="flex justify-between items-start mb-3">
            <span className={`text-xs font-black ${streamFilter === 'INTERNAL' ? 'text-amber-200' : 'text-amber-800'}`}>
              مکاتبات درون‌سازمانی
            </span>
            <div className={`p-2.5 rounded-2xl ${streamFilter === 'INTERNAL' ? 'bg-white/10 text-amber-300' : 'bg-amber-50 text-amber-600'}`}>
              <Building2 size={20} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black">{stats.internal}</span>
            <span className={`text-xs font-bold ${streamFilter === 'INTERNAL' ? 'text-amber-200' : 'text-stone-500'}`}>یادداشت‌ها و نامه‌های داخلی</span>
          </div>
          <div className={`mt-3 text-[11px] font-bold flex items-center justify-between border-t pt-2.5 ${streamFilter === 'INTERNAL' ? 'border-white/10 text-amber-200' : 'border-stone-100 text-stone-500'}`}>
            <span>سرپرست کارگاه و مدیران</span>
            <span className="text-amber-600 font-black">داخلی</span>
          </div>
        </div>
      </div>

      {/* Extra Action & Indicator Tracker Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-700 flex items-center justify-center font-black">
              <Clock size={20} />
            </div>
            <div>
              <div className="text-xs font-black text-stone-800">نامه‌های در جریان اقدام</div>
              <div className="text-[11px] text-stone-500 font-bold">نیازمند بررسی، امضا یا پاسخ</div>
            </div>
          </div>
          <span className="text-base font-black px-3 py-1 bg-amber-100 text-amber-900 rounded-xl">
            {stats.pendingAction} فقره
          </span>
        </div>

        <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-black">
              <AlertTriangle size={20} />
            </div>
            <div>
              <div className="text-xs font-black text-stone-800">مکاتبات فوری و آنی</div>
              <div className="text-[11px] text-stone-500 font-bold">اولویت‌های حائز اهمیت</div>
            </div>
          </div>
          <span className="text-base font-black px-3 py-1 bg-red-100 text-red-800 rounded-xl">
            {stats.urgentCount} فقره
          </span>
        </div>

        <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-black">
              <Paperclip size={20} />
            </div>
            <div>
              <div className="text-xs font-black text-stone-800">منضم به پیوست و نقشه</div>
              <div className="text-[11px] text-stone-500 font-bold">اسناد دارای فایل فنی</div>
            </div>
          </div>
          <span className="text-base font-black px-3 py-1 bg-purple-100 text-purple-900 rounded-xl">
            {stats.withAttachment} سند
          </span>
        </div>
      </div>

      {/* Advanced Secretariat Search & Filter Engine */}
      <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-xs space-y-4">
        {/* Search Bar & Stream Tabs */}
        <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4">
          {/* Stream Filter Tabs */}
          <div className="flex flex-wrap bg-stone-100/90 p-1.5 rounded-2xl gap-1 border border-stone-200/70">
            <button
              onClick={() => setStreamFilter('ALL')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all ${
                streamFilter === 'ALL'
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              همه ({stats.total})
            </button>
            <button
              onClick={() => setStreamFilter('INCOMING')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all ${
                streamFilter === 'INCOMING'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-blue-700 hover:bg-blue-50'
              }`}
            >
              <ArrowDownLeft size={14} />
              وارده ({stats.incoming})
            </button>
            <button
              onClick={() => setStreamFilter('OUTGOING')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all ${
                streamFilter === 'OUTGOING'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              <ArrowUpRight size={14} />
              صادره ({stats.outgoing})
            </button>
            <button
              onClick={() => setStreamFilter('INTERNAL')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all ${
                streamFilter === 'INTERNAL'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-amber-800 hover:bg-amber-50'
              }`}
            >
              <Building2 size={14} />
              درون‌سازمانی ({stats.internal})
            </button>
            <button
              onClick={() => setStreamFilter('TRANSCRIPT')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all ${
                streamFilter === 'TRANSCRIPT'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-purple-700 hover:bg-purple-50'
              }`}
            >
              <FileText size={14} />
              رونوشت‌ها ({stats.transcripts})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="جستجو در شماره اندیکاتور، شماره نامه، موضوع، فرستنده، گیرنده و متن..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-10 py-2.5 text-xs font-black bg-stone-50 border border-stone-200 rounded-2xl focus:bg-white focus:outline-none focus:border-amber-500 transition-all text-stone-800 placeholder-stone-400"
            />
            <Search className="absolute right-3.5 top-3 text-stone-400" size={16} />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-2.5 text-stone-400 hover:text-stone-700 text-xs font-black px-1"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Secondary Filter Dropdowns */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-3 border-t border-stone-100">
          <div>
            <label className="block text-[10px] font-black text-stone-400 mb-1">نوع مکاتبه:</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="w-full text-xs font-black bg-stone-50 border border-stone-200 rounded-xl px-2.5 py-2 text-stone-700 focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">همه انواع</option>
              <option value="TECHNICAL">مکاتبه فنی</option>
              <option value="ADMINISTRATIVE">مکاتبه اداری</option>
              <option value="FINANCIAL">مالی و صورت‌وضعیت</option>
              <option value="CONTRACTUAL">قراردادی و حقوقی</option>
              <option value="WORK_PERMIT_REQUEST">درخواست مجوز کارگاهی</option>
              <option value="SAFETY">ایمنی و HSE</option>
              <option value="OTHER">سایر</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black text-stone-400 mb-1">سطح فوریت / اولویت:</label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as any)}
              className="w-full text-xs font-black bg-stone-50 border border-stone-200 rounded-xl px-2.5 py-2 text-stone-700 focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">همه اولویت‌ها</option>
              <option value="NORMAL">عادی</option>
              <option value="URGENT">فوری</option>
              <option value="VERY_URGENT">خیلی فوری</option>
              <option value="INSTANT">آنی</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black text-stone-400 mb-1">وضعیت گردش کار:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full text-xs font-black bg-stone-50 border border-stone-200 rounded-xl px-2.5 py-2 text-stone-700 focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">همه وضعیت‌ها</option>
              <option value={WorkflowStatus.DRAFT}>پیش‌نویس</option>
              <option value={WorkflowStatus.IN_REVIEW}>در حال بررسی داخلی</option>
              <option value={WorkflowStatus.APPROVED_INTERNAL}>تایید داخلی شده</option>
              <option value={WorkflowStatus.SENT_TO_CONSULTANT}>ارسال شده به مشاور</option>
              <option value={WorkflowStatus.IN_CONSULTANT_REVIEW}>در حال بررسی مشاور</option>
              <option value={WorkflowStatus.APPROVED_BY_CONSULTANT}>تایید شده توسط مشاور</option>
              <option value={WorkflowStatus.SENT_TO_EMPLOYER}>ارسال شده به کارفرما</option>
              <option value={WorkflowStatus.IN_EMPLOYER_REVIEW}>در حال بررسی کارفرما</option>
              <option value={WorkflowStatus.APPROVED_BY_EMPLOYER}>ابلاغ / تایید نهایی کارفرما</option>
              <option value={WorkflowStatus.REJECTED}>رد شده</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black text-stone-400 mb-1">فیلتر پیوست‌ها:</label>
            <select
              value={attachmentFilter}
              onChange={(e) => setAttachmentFilter(e.target.value as any)}
              className="w-full text-xs font-black bg-stone-50 border border-stone-200 rounded-xl px-2.5 py-2 text-stone-700 focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">همه نامه‌ها</option>
              <option value="WITH_ATTACHMENT">فقط دارای پیوست</option>
              <option value="NO_ATTACHMENT">بدون پیوست</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black text-stone-400 mb-1">مرتب‌سازی بر اساس:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full text-xs font-black bg-stone-50 border border-stone-200 rounded-xl px-2.5 py-2 text-stone-700 focus:outline-none focus:border-amber-500"
            >
              <option value="DATE_DESC">جدیدترین تاریخ نامه</option>
              <option value="DATE_ASC">قدیمی‌ترین تاریخ نامه</option>
              <option value="INDICATOR">شماره اندیکاتور</option>
              <option value="PRIORITY">اولویت و فوریت</option>
            </select>
          </div>
        </div>
      </div>

      {/* Secretariat Ledger & Indicator Registry Table */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-stone-100 flex justify-between items-center bg-stone-50/50">
          <div className="flex items-center gap-2">
            <h3 className="font-black text-stone-800 text-sm md:text-base flex items-center gap-2">
              <Layers size={18} className="text-amber-600" />
              دفتر اندیکاتور و سوابق دبیرخانه
            </h3>
            <span className="text-[11px] font-bold bg-stone-200/70 text-stone-700 px-2 py-0.5 rounded-full">
              {filteredLetters.length} رکورد یافت شد
            </span>
          </div>

          {(searchQuery || streamFilter !== 'ALL' || typeFilter !== 'ALL' || priorityFilter !== 'ALL' || statusFilter !== 'ALL' || attachmentFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setStreamFilter('ALL');
                setTypeFilter('ALL');
                setPriorityFilter('ALL');
                setStatusFilter('ALL');
                setAttachmentFilter('ALL');
              }}
              className="text-xs font-black text-amber-700 hover:text-stone-900 flex items-center gap-1"
            >
              <RefreshCw size={12} />
              حذف فیلترها
            </button>
          )}
        </div>

        {filteredLetters.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
              <Inbox size={32} />
            </div>
            <p className="text-stone-600 font-black text-sm">هیچ نامه‌ای مطابق فیلترهای انتخابی در دبیرخانه یافت نشد</p>
            <p className="text-stone-400 text-xs font-bold">می‌توانید فیلترها را تغییر داده یا شرایط جستجو را بررسی فرمایید.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs border-collapse">
              <thead>
                <tr className="bg-stone-100/90 text-stone-600 text-[11px] font-black border-b border-stone-200">
                  <th className="py-3.5 px-4 text-center w-12">#</th>
                  <th className="py-3.5 px-4 text-center">شماره اندیکاتور</th>
                  <th className="py-3.5 px-4 text-center">جریان</th>
                  <th className="py-3.5 px-4">شماره و تاریخ نامه</th>
                  <th className="py-3.5 px-4">مبدأ / صادرکننده</th>
                  <th className="py-3.5 px-4">مقصد / گیرنده</th>
                  <th className="py-3.5 px-4">موضوع و دسته‌بندی</th>
                  <th className="py-3.5 px-4 text-center">اولویت</th>
                  <th className="py-3.5 px-4 text-center">وضعیت</th>
                  <th className="py-3.5 px-4 text-center">پیوست</th>
                  <th className="py-3.5 px-4 text-center w-48">عملیات دبیرخانه</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredLetters.map((letter, index) => {
                  const stream = getLetterStreamCategory(letter, targetOrgId || currentUser?.orgId);
                  const isUnread = NotificationService.isDocumentUnread(letter.id, currentUser?.id || 'guest', letter.createdById);
                  const markRead = () => {
                    NotificationService.markDocumentAsRead(letter.id, currentUser?.id || 'guest');
                  };
                  
                  return (
                    <tr 
                      key={letter.id} 
                      className={`transition-colors group ${
                        isUnread 
                          ? 'bg-rose-50/40 hover:bg-rose-100/50 border-r-4 border-r-rose-500 font-black' 
                          : 'hover:bg-amber-50/20'
                      }`}
                    >
                      {/* Row Index */}
                      <td className="py-4 px-4 text-center font-bold text-stone-400">
                        {index + 1}
                      </td>

                      {/* Indicator Number */}
                      <td className="py-4 px-4 text-center">
                        <span className="font-mono font-black text-xs px-2.5 py-1 rounded-xl bg-stone-100 text-stone-800 border border-stone-200">
                          {letter.indicatorNumber || `IND-${index + 1001}`}
                        </span>
                      </td>

                      {/* Stream Badge */}
                      <td className="py-4 px-4 text-center">
                        {stream === 'INCOMING' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                            <ArrowDownLeft size={12} />
                            وارده
                          </span>
                        )}
                        {stream === 'OUTGOING' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <ArrowUpRight size={12} />
                            صادره
                          </span>
                        )}
                        {stream === 'INTERNAL' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                            <Building2 size={12} />
                            درون‌سازمانی
                          </span>
                        )}
                        {stream === 'TRANSCRIPT' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                            <FileText size={12} />
                            رونوشت
                          </span>
                        )}
                        {stream === 'OTHER' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
                            سایر
                          </span>
                        )}
                      </td>

                      {/* Letter Number and Date */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-stone-900 text-xs font-mono direction-ltr text-right">
                            {letter.letterNumber}
                          </span>
                          {isUnread && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-500 text-white shadow-xs animate-pulse inline-flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                              مشاهده‌نشده
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] font-bold text-stone-400 mt-0.5 flex items-center gap-1">
                          <Calendar size={11} />
                          {letter.date}
                        </div>
                      </td>

                      {/* Sender */}
                      <td className="py-4 px-4">
                        <div className="font-black text-stone-800 text-xs">
                          {letter.senderOrgName}
                        </div>
                        <div className="text-[10px] font-bold text-stone-500 mt-0.5 flex items-center gap-1">
                          <User size={10} />
                          {letter.senderUserFullName}
                          {letter.senderUserJobTitle ? ` (${letter.senderUserJobTitle})` : ''}
                        </div>
                      </td>

                      {/* Receiver */}
                      <td className="py-4 px-4 max-w-xs">
                        <div className="font-bold text-stone-700 text-xs truncate" title={letter.receiverTitle}>
                          {letter.receiverTitle}
                        </div>
                        {letter.attentionTo && (
                          <div className="text-[10px] font-bold text-amber-700 mt-0.5 truncate" title={letter.attentionTo}>
                            عطف: {letter.attentionTo}
                          </div>
                        )}
                      </td>

                      {/* Subject & Category */}
                      <td className="py-4 px-4 max-w-sm">
                        <div className="font-black text-stone-900 text-xs line-clamp-2 leading-relaxed" title={letter.subject}>
                          {letter.subject}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-stone-100 text-stone-600">
                            {letter.letterType === 'TECHNICAL' ? 'فنی' :
                             letter.letterType === 'ADMINISTRATIVE' ? 'اداری' :
                             letter.letterType === 'FINANCIAL' ? 'مالی' :
                             letter.letterType === 'SAFETY' ? 'HSE' :
                             letter.letterType === 'CONTRACTUAL' ? 'حقوقی' : 'سایر'}
                          </span>
                          {(letter.marginalia && letter.marginalia.length > 0) && (
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 flex items-center gap-0.5">
                              <MessageSquare size={10} />
                              {letter.marginalia.length} هامش
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Priority */}
                      <td className="py-4 px-4 text-center">
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${
                          letter.priority === 'INSTANT' ? 'bg-red-500 text-white' :
                          letter.priority === 'VERY_URGENT' ? 'bg-red-100 text-red-800 border border-red-200' :
                          letter.priority === 'URGENT' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                          'bg-stone-100 text-stone-600'
                        }`}>
                          {letter.priority === 'INSTANT' ? 'آنی' :
                           letter.priority === 'VERY_URGENT' ? 'خیلی فوری' :
                           letter.priority === 'URGENT' ? 'فوری' : 'عادی'}
                        </span>
                      </td>

                      {/* Workflow Status */}
                      <td className="py-4 px-4 text-center">
                        <span className={`text-[10px] font-black px-2 py-1 rounded-xl block ${
                          letter.status === WorkflowStatus.APPROVED_INTERNAL || letter.status === WorkflowStatus.APPROVED_BY_EMPLOYER || letter.status === WorkflowStatus.APPROVED_BY_CONSULTANT
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : letter.status === WorkflowStatus.DRAFT
                            ? 'bg-stone-100 text-stone-600'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}>
                          {letter.status === WorkflowStatus.DRAFT ? 'پیش‌نویس' :
                           letter.status === WorkflowStatus.APPROVED_INTERNAL ? 'تایید داخلی' :
                           letter.status === WorkflowStatus.IN_REVIEW ? 'بررسی داخلی' :
                           letter.status === WorkflowStatus.SENT_TO_CONSULTANT ? 'ارسال به مشاور' :
                           letter.status === WorkflowStatus.IN_CONSULTANT_REVIEW ? 'نزد مشاور' :
                           letter.status === WorkflowStatus.APPROVED_BY_CONSULTANT ? 'تایید مشاور' :
                           letter.status === WorkflowStatus.SENT_TO_EMPLOYER ? 'ارسال به کارفرما' :
                           letter.status === WorkflowStatus.IN_EMPLOYER_REVIEW ? 'نزد کارفرما' :
                           letter.status === WorkflowStatus.APPROVED_BY_EMPLOYER ? 'ابلاغ نهایی' :
                           letter.status === WorkflowStatus.REJECTED ? 'رد شده' : 'در جریان'}
                        </span>
                      </td>

                      {/* Attachments */}
                      <td className="py-4 px-4 text-center">
                        {letter.hasAttachment || (letter.attachments && letter.attachments.length > 0) ? (
                          <span 
                            className="inline-flex items-center gap-1 text-[10px] font-black text-purple-700 bg-purple-50 px-2 py-1 rounded-lg cursor-pointer hover:bg-purple-100"
                            title={(letter.attachments || []).map(a => a.name).join(', ')}
                          >
                            <Paperclip size={12} />
                            {(letter.attachments || []).length || 1}
                          </span>
                        ) : (
                          <span className="text-[10px] text-stone-300 font-bold">-</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* Preview Official A4 Letter */}
                          <button
                            onClick={() => onOpenPreviewModal(letter)}
                            className="p-1.5 rounded-xl bg-stone-100 hover:bg-amber-500 hover:text-stone-950 text-stone-600 transition-all"
                            title="مشاهده پیش‌نمایش سربرگ رسمی (A4)"
                          >
                            <ExternalLink size={15} />
                          </button>

                          {/* Print Official Letter */}
                          <button
                            onClick={() => printOfficialLetter(letter, activeProject)}
                            className="p-3 text-stone-400 hover:text-stone-900 hover:bg-[#faf8f4] rounded-2xl transition-all shadow-sm hover:shadow-md"
                            title="چاپ رسمی نامه"
                          >
                            <Printer size={18} />
                          </button>

                          {/* Marginalia Modal */}
                          <button
                            onClick={() => onOpenMarginaliaModal(letter)}
                            className={`p-1.5 rounded-xl transition-all ${
                              (letter.marginalia && letter.marginalia.length > 0)
                                ? 'bg-amber-100 text-amber-800 hover:bg-amber-500 hover:text-stone-950'
                                : 'bg-stone-100 text-stone-600 hover:bg-amber-500 hover:text-stone-950'
                            }`}
                            title={isSystemAdmin ? "هامش و دستورات ارجاع نامه (دسترسی کامل مدیر سیستم)" : "مشاهده سوابق هامش و دستورات (فقط خواندنی)"}
                          >
                            <MessageSquare size={15} />
                          </button>

                          {/* Workflow History */}
                          <button
                            onClick={() => onOpenHistoryModal(letter)}
                            className="p-1.5 rounded-xl bg-stone-100 hover:bg-stone-900 hover:text-white text-stone-600 transition-all"
                            title="سوابق و تاریخچه گردش کار"
                          >
                            <History size={15} />
                          </button>

                          {/* Delete (if admin or draft) */}
                          {(isSystemAdmin || (letter.status === WorkflowStatus.DRAFT && (letter.createdById === currentUser?.id || !letter.createdById)) || (currentUser && WorkflowService.canDelete(letter as any, currentUser))) && (
                            <button
                              onClick={() => onDeleteLetter(letter.id)}
                              className="p-1.5 rounded-xl bg-stone-100 hover:bg-red-600 hover:text-white text-stone-400 transition-all"
                              title="حذف رکورد"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer info bar */}
        <div className="p-4 bg-stone-50 border-t border-stone-100 flex flex-col sm:flex-row justify-between items-center text-[11px] text-stone-500 font-bold gap-2">
          <span>نمایش {filteredLetters.length} از مجموع {secretariatLetters.length} نامه ثبتی دبیرخانه</span>
          <span className="flex items-center gap-1 text-stone-400">
            <ShieldCheck size={14} className="text-emerald-600" />
            سامانه جامع دبیرخانه و دفتر اندیکاتور سازمانی همیار پروژه
          </span>
        </div>
      </div>
    </div>
  );
};
