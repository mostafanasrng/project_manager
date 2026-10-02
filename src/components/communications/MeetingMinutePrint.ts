import { WorkflowStatus, WorkflowEvent, Project } from '../../../types';
import { SystemAdminService } from '../../../services/systemAdminService';
import { HRService } from '../../../services/hrService';
import { formatUserDisplayFormal } from '../../utils/userFormatter';

export type MeetingPartiesStructure = 
  | 'TRIPARTITE' 
  | 'BIPARTITE_EMPLOYER_CONTRACTOR' 
  | 'BIPARTITE_CONSULTANT_CONTRACTOR' 
  | 'BIPARTITE_EMPLOYER_CONSULTANT';

export interface MeetingDecisionItem {
  id?: string;
  itemNumber?: number;
  description: string;
  actionParty: string;
  actionPartyOrgType?: 'CONTRACTOR' | 'CONSULTANT' | 'EMPLOYER' | 'OTHER';
  deadline?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE' | 'CANCELLED';
  progress?: number;
  notes?: string;
}

export interface MeetingAttendeeItem {
  id?: string;
  userId?: string;
  personnelId?: string;
  name: string;
  organization?: string;
  orgType?: 'EMPLOYER' | 'CONSULTANT' | 'CONTRACTOR' | 'SUB_CONTRACTOR' | 'GUEST';
  role?: string;
  attendanceStatus?: 'PRESENT' | 'EXCUSED' | 'ABSENT';
  isManagerOrSupervisor?: boolean;
  requiresSignature?: boolean;
  isManualGuest?: boolean;
  signature?: string;
  signed?: boolean;
  signedAt?: string;
  comment?: string;
}

export interface ManagerSignatureInfo {
  userId?: string;
  name?: string;
  jobTitle?: string;
  signed: boolean;
  signedAt?: string;
  signature?: string;
  comment?: string;
}

export interface OrgManagerSignatures {
  workshopManager?: ManagerSignatureInfo;
  projectManager?: ManagerSignatureInfo;
}

export interface MeetingOrgSignatures {
  contractor?: OrgManagerSignatures;
  consultant?: OrgManagerSignatures;
  employer?: OrgManagerSignatures;
}

export interface PrintableMeetingData {
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
  decisions: string[];
  structuredDecisions?: MeetingDecisionItem[];
  attendees: string[];
  attendeeList?: MeetingAttendeeItem[];
  absentees?: string[];
  nextMeetingDate?: string;
  nextMeetingLocation?: string;
  nextMeetingAgenda?: string;
  nextMeetingAgendas?: string[];
  recordedBy?: string;
  notes?: string;
  status: WorkflowStatus;
  workflowHistory?: WorkflowEvent[];
  isFinalFrozen?: boolean;
  frozenAt?: string;
  unfrozenAt?: string;
  unfreezeReason?: string;
  unfrozenBy?: string;
  orgSignatures?: MeetingOrgSignatures;
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

export const printMeetingMinutes = (meeting: PrintableMeetingData, activeProject?: Project | any) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('امکان باز کردن پنجره چاپ وجود ندارد. لطفاً پاپ‌آپ مرورگر خود را فعال کنید.');
    return;
  }

  const projectTitle = activeProject?.title || 'پروژه عمرانی';
  const employerName = activeProject?.employerName || (activeProject as any)?.employer || 'دستگاه اجرایی و کارفرما';
  const consultantName = activeProject?.consultantName || (activeProject as any)?.consultant || 'دستگاه نظارت و مشاور';
  const contractorName = activeProject?.contractorName || (activeProject as any)?.contractor || 'سازمان پیمانکار';
  const contractNumber = activeProject?.contractNumber || (activeProject as any)?.contractNumber || '---';

  const partiesStructure: MeetingPartiesStructure = meeting.partiesStructure || 'TRIPARTITE';

  // Determine which orgs are involved
  const isContractorInvolved = partiesStructure !== 'BIPARTITE_EMPLOYER_CONSULTANT';
  const isConsultantInvolved = partiesStructure !== 'BIPARTITE_EMPLOYER_CONTRACTOR';
  const isEmployerInvolved = partiesStructure !== 'BIPARTITE_CONSULTANT_CONTRACTOR';

  // Helper to determine org type for an attendee
  const getOrgTypeForAttendee = (att: MeetingAttendeeItem): 'CONTRACTOR' | 'CONSULTANT' | 'EMPLOYER' | 'OTHER' => {
    if (att.orgType === 'CONTRACTOR' || att.orgType === 'SUB_CONTRACTOR') return 'CONTRACTOR';
    if (att.orgType === 'CONSULTANT') return 'CONSULTANT';
    if (att.orgType === 'EMPLOYER') return 'EMPLOYER';
    if (att.orgType === 'GUEST') return 'OTHER';
    const org = (att.organization || '').toLowerCase();
    const role = (att.role || '').toLowerCase();
    if (org.includes('پیمانکار') || (contractorName && org.includes(contractorName.toLowerCase())) || role.includes('پیمانکار')) {
      return 'CONTRACTOR';
    }
    if (org.includes('مشاور') || org.includes('نظارت') || (consultantName && org.includes(consultantName.toLowerCase())) || role.includes('مشاور') || role.includes('ناظر')) {
      return 'CONSULTANT';
    }
    if (org.includes('کارفرما') || (employerName && org.includes(employerName.toLowerCase())) || role.includes('کارفرما')) {
      return 'EMPLOYER';
    }
    return 'OTHER';
  };

  // Helper to resolve manager signature for an organization
  const resolveOrgSignatures = (orgType: 'CONTRACTOR' | 'CONSULTANT' | 'EMPLOYER') => {
    const orgKey = orgType.toLowerCase() as 'contractor' | 'consultant' | 'employer';
    const explicitSignatures = meeting.orgSignatures?.[orgKey];

    // 1. Resolve Workshop Manager / Supervisor
    let wm = explicitSignatures?.workshopManager;
    if (!wm || !wm.signed) {
      // Look in attendeeList
      const attendeeWM = meeting.attendeeList?.find(a => {
        if (getOrgTypeForAttendee(a) !== orgType) return false;
        const role = (a.role || '').toLowerCase();
        return (
          role.includes('سرپرست کارگاه') || 
          role.includes('رئیس کارگاه') || 
          role.includes('ناظر مقیم') || 
          role.includes('سرپرست نظارت') ||
          (a.isManagerOrSupervisor && !role.includes('مدیر پروژه'))
        );
      });

      if (attendeeWM && attendeeWM.signed) {
        wm = {
          name: attendeeWM.name,
          jobTitle: attendeeWM.role || (orgType === 'CONSULTANT' ? 'سرپرست نظارت مقیم' : 'سرپرست کارگاه'),
          signed: true,
          signedAt: attendeeWM.signedAt,
          signature: attendeeWM.signature,
          comment: attendeeWM.comment || 'تایید و امضا شد.'
        };
      }
    }

    // 2. Resolve Project Manager
    let pm = explicitSignatures?.projectManager;
    if (!pm || !pm.signed) {
      // Look in attendeeList
      const attendeePM = meeting.attendeeList?.find(a => {
        if (getOrgTypeForAttendee(a) !== orgType) return false;
        const role = (a.role || '').toLowerCase();
        return (
          role.includes('مدیر پروژه') || 
          role.includes('مدیرپروژه') ||
          (a.isManagerOrSupervisor && role.includes('مدیر'))
        );
      });

      if (attendeePM && attendeePM.signed) {
        pm = {
          name: attendeePM.name,
          jobTitle: attendeePM.role || 'مدیر پروژه',
          signed: true,
          signedAt: attendeePM.signedAt,
          signature: attendeePM.signature,
          comment: attendeePM.comment || 'تایید و امضا شد.'
        };
      }
    }

    return {
      workshopManager: wm || {
        name: orgType === 'CONSULTANT' ? 'سرپرست نظارت مقیم' : orgType === 'EMPLOYER' ? 'سرپرست نظارت کارفرما' : 'سرپرست کارگاه',
        jobTitle: orgType === 'CONSULTANT' ? 'دستگاه نظارت' : 'سرپرست کارگاه',
        signed: false
      },
      projectManager: pm || {
        name: orgType === 'EMPLOYER' ? 'مدیر پروژه کارفرما' : orgType === 'CONSULTANT' ? 'مدیر پروژه مشاور' : 'مدیر پروژه پیمانکار',
        jobTitle: 'مدیر پروژه',
        signed: false
      }
    };
  };

  const contractorSignatures = isContractorInvolved ? resolveOrgSignatures('CONTRACTOR') : null;
  const consultantSignatures = isConsultantInvolved ? resolveOrgSignatures('CONSULTANT') : null;
  const employerSignatures = isEmployerInvolved ? resolveOrgSignatures('EMPLOYER') : null;

  const meetingTypeLabel = 
    meeting.meetingType === 'SITE_COORDINATION' ? 'هماهنگی کارگاهی و اجرایی' :
    meeting.meetingType === 'TECHNICAL' ? 'فنی و مهندسی' :
    meeting.meetingType === 'EXECUTIVE' ? 'مدیریتی و کارفرمایی' :
    meeting.meetingType === 'HSE' ? 'کمیته ایمنی، بهداشت و محیط‌زیست (HSE)' :
    meeting.meetingType === 'CLAIM_DISPUTE' ? 'بررسی ادعا و حل اختلاف' :
    meeting.meetingType === 'HANDOVER' ? 'تحویل موقت / قطعی و راه‌اندازی' :
    meeting.meetingType || 'هماهنگی عمومی پروژه';

  const structureTitle = 
    partiesStructure === 'TRIPARTITE' ? 'صورت‌جلسه رسمی سه‌جانبه (کارفرما - مشاور - پیمانکار)' :
    partiesStructure === 'BIPARTITE_EMPLOYER_CONTRACTOR' ? 'صورت‌جلسه رسمی دوجانبه (کارفرما - پیمانکار)' :
    partiesStructure === 'BIPARTITE_CONSULTANT_CONTRACTOR' ? 'صورت‌جلسه رسمی دوجانبه (مهندس مشاور - پیمانکار)' :
    'صورت‌جلسه رسمی دوجانبه (کارفرما - مهندس مشاور)';

  // Normalize decisions list
  const structuredItems: MeetingDecisionItem[] = meeting.structuredDecisions && meeting.structuredDecisions.length > 0
    ? meeting.structuredDecisions
    : meeting.decisions.map((d, idx) => ({
        id: `item-${idx}`,
        itemNumber: idx + 1,
        description: d,
        actionParty: 'ارکان ذیربط پروژه',
        deadline: 'طبق برنامه زمان‌بندی',
        priority: 'MEDIUM',
        status: 'PENDING'
      }));

  // Normalize attendees list with signatures
  const attendeesList: MeetingAttendeeItem[] = meeting.attendeeList && meeting.attendeeList.length > 0
    ? meeting.attendeeList
    : meeting.attendees.map((att) => ({
        name: att,
        role: 'نماینده حاضر',
        organization: att.includes('کارفرما') ? employerName : att.includes('مشاور') ? consultantName : contractorName,
        attendanceStatus: 'PRESENT'
      }));

  const minuteNum = meeting.minuteNumber || `MOM-${meeting.id.replace('meet_', '').substring(0, 6)}`;

  // Column width calculations for signature grid & attendees grouping
  const contractorAttendees = attendeesList.filter(a => getOrgTypeForAttendee(a) === 'CONTRACTOR');
  const consultantAttendees = attendeesList.filter(a => getOrgTypeForAttendee(a) === 'CONSULTANT');
  const employerAttendees = attendeesList.filter(a => getOrgTypeForAttendee(a) === 'EMPLOYER');
  const otherAttendees = attendeesList.filter(a => getOrgTypeForAttendee(a) === 'OTHER');

  const hasOtherAttendees = otherAttendees.length > 0;
  const activeOrgColsCount = (isContractorInvolved ? 1 : 0) + (isConsultantInvolved ? 1 : 0) + (isEmployerInvolved ? 1 : 0) + (hasOtherAttendees ? 1 : 0);

  // Exact signature box rendering logic preserved
  const renderAttendeeSigCard = (signer: {
    name?: string;
    role?: string;
    jobTitle?: string;
    organization?: string;
    attendanceStatus?: string;
    signed?: boolean;
    signature?: string;
    signedAt?: string;
    comment?: string;
    userId?: string;
    personnelId?: string;
  }) => {
    const isAbsent = signer.attendanceStatus === 'ABSENT';
    const roleTitle = signer.role || signer.jobTitle || 'نماینده حاضر در جلسه';
    const signerName = signer.name || 'نماینده مسئول';
    const orgInfo = signer.organization ? ` • ${signer.organization}` : '';

    const effectiveSig = signer.signature || HRService.getUserSignature({
      id: signer.userId,
      personnelId: signer.personnelId,
      fullName: signerName,
      signature: signer.signature
    });

    const isLockedOrApproved = meeting.isFinalFrozen || meeting.status === WorkflowStatus.APPROVED_FINAL || meeting.status === WorkflowStatus.APPROVED_BY_EMPLOYER;
    const isEffectivelySigned = signer.signed || isLockedOrApproved;

    return `
      <div class="sig-card" style="border: 1px solid #cbd5e1; border-radius: 6px; background: #ffffff; padding: 6px 8px; display: flex; flex-direction: column; justify-content: space-between; min-height: 105px; text-align: center; box-sizing: border-box; margin-bottom: 6px;">
        <div class="sig-role-title" style="font-weight: 800; font-size: 9px; color: #1e293b; border-bottom: 1px dashed #cbd5e1; padding-bottom: 3px; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${roleTitle}</div>
        <div class="sig-body" style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 42px; margin: 2px 0;">
          ${isAbsent ? `
            <div style="color: #ef4444; border: 1px dashed #fca5a5; background: #fef2f2; font-size: 8px; padding: 4px; border-radius: 4px; width: 100%;">عدم حضور در جلسه (غایب)</div>
            <div style="font-weight: 800; font-size: 9.5px; color: #0f172a; margin-top: 2px;">${signerName}</div>
            <div style="font-size: 8px; color: #64748b;">${roleTitle}${orgInfo}</div>
          ` : isEffectivelySigned ? `
            <div style="background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; border-radius: 4px; padding: 1px 5px; font-size: 7.5px; font-weight: 800; margin-bottom: 2px;">✓ تایید و امضای الکترونیک</div>
            ${effectiveSig ? `<img src="${effectiveSig}" alt="امضا" style="max-height: 38px; max-width: 95px; object-fit: contain;" />` : ''}
            <div style="font-weight: 800; font-size: 9.5px; color: #0f172a; margin-top: 2px;">${signerName}</div>
            <div style="font-size: 8px; color: #64748b;">${roleTitle}${orgInfo}</div>
            <div style="font-size: 7.5px; color: #059669; font-weight: bold; margin-top: 1px;">${signer.signedAt || meeting.date}</div>
            ${signer.comment ? `<div style="font-size: 7.5px; color: #475569; margin-top: 1px;">«${signer.comment}»</div>` : ''}
          ` : `
            <div style="border: 1px dashed #cbd5e1; border-radius: 6px; width: 100%; height: 38px; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 8px; background: #fafafa;">محل مهر و امضا</div>
            <div style="font-weight: 800; font-size: 9.5px; color: #0f172a; margin-top: 2px;">${signerName}</div>
            <div style="font-size: 8px; color: #64748b;">${roleTitle}${orgInfo}</div>
          `}
        </div>
      </div>
    `;
  };

  const meetingLogos = SystemAdminService.getProjectOrgLogos(activeProject);
  const meetingLogoHtml = [
    meetingLogos.employerLogo ? `<img src="${meetingLogos.employerLogo}" style="height: 42px; max-width: 90px; object-fit: contain;" alt="کارفرما" />` : '',
    meetingLogos.consultantLogo ? `<img src="${meetingLogos.consultantLogo}" style="height: 42px; max-width: 90px; object-fit: contain;" alt="مشاور" />` : '',
    meetingLogos.contractorLogo ? `<img src="${meetingLogos.contractorLogo}" style="height: 42px; max-width: 90px; object-fit: contain;" alt="پیمانکار" />` : ''
  ].filter(Boolean).join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html dir="rtl" lang="fa">
      <head>
        <meta charset="utf-8" />
        <title>صورت‌جلسه شماره ${minuteNum} - ${meeting.title}</title>
        <style>
          @font-face { font-family: 'Vazir'; src: url('https://cdn.jsdelivr.net/gh/rastikerdar/vazir-font@v30.1.0/dist/Vazir.woff2'); }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; box-sizing: border-box; }
          body { font-family: 'Vazir', Tahoma, sans-serif; padding: 15px; color: #1e293b; line-height: 1.4; background: #fff; width: 100%; margin: 0; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #1e40af; padding-bottom: 10px; margin-bottom: 15px; }
          .logo-section { display: flex; align-items: center; gap: 10px; }
          .logo-box { width: 36px; height: 36px; background: #1e40af; border-radius: 6px; }
          .content { min-height: 450px; }
          .footer { margin-top: 20px; border-top: 2px solid #64748b; padding-top: 10px; width: 100%; page-break-inside: avoid; break-inside: avoid; }
          .sig-box { text-align: center; }
          @media print { 
            .no-print { display: none; } 
            body { padding: 5mm; margin: 0; width: 100%; } 
            @page { size: A4; margin: 8mm; }
          }
        </style>
      </head>
      <body>
        <!-- Header -->
        <div class="header">
          <div class="logo-section">
            ${meetingLogoHtml || '<div class="logo-box"></div>'}
            <h1 style="margin: 0; color: #1e40af; font-size: 22px;">سامانه مدیریت پروژه همیار</h1>
          </div>
          <div style="text-align: left; font-size: 11px;">
            <p style="margin: 0;">تاریخ چاپ: ${new Date().toLocaleDateString("fa-IR")}</p>
            <p style="margin: 0;">نسخه: ۱.۴.۰</p>
          </div>
        </div>

        <!-- Content -->
        <div class="content">
          <!-- Project Header Banner -->
          <div style="border-bottom: 2px solid #1e40af; padding-bottom: 15px; margin-bottom: 20px;">
            <h2 style="margin: 0; color: #1e40af; text-align: center; font-size: 18px;">${structureTitle}</h2>
            <div style="text-align: center; margin-top: 6px;">
              <span style="display: inline-block; background: #fef3c7; color: #92400e; border: 1px solid #fde68a; padding: 2px 10px; border-radius: 12px; font-size: 10px; font-weight: bold;">${meetingTypeLabel}</span>
              ${meeting.isFinalFrozen ? '<span style="display: inline-block; background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; padding: 2px 10px; border-radius: 12px; font-size: 10px; font-weight: bold; margin-right: 6px;">🔒 مصوب قطعی و قفل‌شده</span>' : ''}
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 15px; font-size: 12px; background: #f8fafc; padding: 10px; border-radius: 8px; border: 1px solid #e2e8f0;">
              <div><strong>پروژه:</strong> ${projectTitle}</div>
              <div><strong>شماره پیمان:</strong> ${contractNumber}</div>
              <div><strong>کارفرما:</strong> ${employerName}</div>
              <div><strong>مشاور:</strong> ${consultantName}</div>
              <div><strong>پیمانکار:</strong> ${contractorName}</div>
              <div><strong>موضوع جلسه:</strong> ${meeting.title}</div>
            </div>
          </div>

          <!-- Meeting Metadata Table -->
          <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px;">
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; width: 20%; background: #f8fafc;">شماره صورت‌جلسه:</td>
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; color: #1e40af; width: 30%;">${minuteNum}</td>
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; width: 20%; background: #f8fafc;">تاریخ جلسه:</td>
              <td style="padding: 8px; border: 1px solid #ddd; width: 30%;">${meeting.date} (ساعت ${meeting.time || '۰۹:۳۰'})</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background: #f8fafc;">محل تشکیل جلسه:</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${meeting.location || 'اتاق جلسات کارگاه پروژه'}</td>
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background: #f8fafc;">رئیس / مدیر جلسه:</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${meeting.chairperson || 'نماینده کارفرما / مشاور'}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background: #f8fafc;">دبیر / تنظیم‌کننده:</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${meeting.secretary || meeting.recordedBy || 'دفتر فنی پروژه'}</td>
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background: #f8fafc;">وضعیت سند:</td>
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${meeting.isFinalFrozen ? 'مصوب و قفل‌شده' : 'جاری / در گردش'}</td>
            </tr>
          </table>

          <!-- Agenda Section -->
          ${meeting.agenda && meeting.agenda.length > 0 ? `
            <div style="margin-top: 20px;">
              <h3 style="border-bottom: 2px solid #1e40af; padding-bottom: 5px; color: #1e40af; font-size: 13px; font-weight: bold;">
                الف) دستور کار و محورهای مورد بحث جلسه (${meeting.agenda.length} بند)
              </h3>
              <div style="padding: 10px 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 11px;">
                ${meeting.agenda.map((ag, idx) => `
                  <div style="margin-bottom: 4px; display: flex; gap: 8px;">
                    <strong style="color: #b45309;">${idx + 1}.</strong>
                    <span>${ag}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <!-- Attendees Table -->
          <div style="margin-top: 20px;">
            <h3 style="border-bottom: 2px solid #1e40af; padding-bottom: 5px; color: #1e40af; font-size: 13px; font-weight: bold;">
              ب) مشخصات حاضرین در جلسه (${attendeesList.filter(a => a.attendanceStatus !== 'ABSENT').length} نفر حاضر)
            </h3>
            <table style="width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 11px; text-align: center;">
              <thead>
                <tr style="background: #f1f5f9;">
                  <th style="padding: 6px; border: 1px solid #ddd; width: 40px;">ردیف</th>
                  <th style="padding: 6px; border: 1px solid #ddd; text-align: right;">نام و نام خانوادگی</th>
                  <th style="padding: 6px; border: 1px solid #ddd;">سمت در پروژه / جلسه</th>
                  <th style="padding: 6px; border: 1px solid #ddd;">سازمان / شرکت</th>
                  <th style="padding: 6px; border: 1px solid #ddd; width: 90px;">وضعیت حضور</th>
                  <th style="padding: 6px; border: 1px solid #ddd; width: 100px;">تایید حضور</th>
                </tr>
              </thead>
              <tbody>
                ${attendeesList.map((att, idx) => `
                  <tr>
                    <td style="padding: 6px; border: 1px solid #ddd;">${(idx + 1).toLocaleString('fa-IR')}</td>
                    <td style="padding: 6px; border: 1px solid #ddd; font-weight: bold; text-align: right;">${att.name}</td>
                    <td style="padding: 6px; border: 1px solid #ddd;">${att.role || 'نماینده رسمی'}</td>
                    <td style="padding: 6px; border: 1px solid #ddd;">${att.organization || '-'}</td>
                    <td style="padding: 6px; border: 1px solid #ddd;">
                      <span style="font-weight: bold; color: ${att.attendanceStatus === 'ABSENT' ? '#dc2626' : '#059669'};">
                        ${att.attendanceStatus === 'ABSENT' ? 'غایب' : att.attendanceStatus === 'EXCUSED' ? 'موجه' : 'حاضر'}
                      </span>
                    </td>
                    <td style="padding: 6px; border: 1px solid #ddd;">
                      ${att.attendanceStatus === 'ABSENT' ? `
                        <span style="color: #dc2626; font-weight: bold;">✗ عدم حضور</span>
                      ` : `
                        <span style="color: #059669; font-weight: bold;">✓ تایید حضور</span>
                      `}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <!-- Decisions and Action Items Table -->
          <div style="margin-top: 25px;">
            <h3 style="border-bottom: 2px solid #1e40af; padding-bottom: 5px; color: #1e40af; font-size: 13px; font-weight: bold;">
              ج) تصمیمات، تکالیف و مصوبات جلسه (لازم‌الاجرا) (${structuredItems.length} مورد)
            </h3>
            <table style="width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 11px; text-align: center;">
              <thead>
                <tr style="background: #f1f5f9;">
                  <th style="padding: 6px; border: 1px solid #ddd; width: 40px;">بند</th>
                  <th style="padding: 6px; border: 1px solid #ddd; text-align: right;">شرح مصوبه و اقدام توافق‌شده</th>
                  <th style="padding: 6px; border: 1px solid #ddd; width: 140px;">مسئول پیگیری / اقدام</th>
                  <th style="padding: 6px; border: 1px solid #ddd; width: 110px;">مهلت اقدام</th>
                  <th style="padding: 6px; border: 1px solid #ddd; width: 80px;">اولویت</th>
                </tr>
              </thead>
              <tbody>
                ${structuredItems.map((item, idx) => `
                  <tr>
                    <td style="padding: 6px; border: 1px solid #ddd; font-weight: bold;">${item.itemNumber || (idx + 1).toLocaleString('fa-IR')}</td>
                    <td style="padding: 6px; border: 1px solid #ddd; text-align: right; line-height: 1.6;">${item.description}</td>
                    <td style="padding: 6px; border: 1px solid #ddd; font-weight: bold; color: #1e40af;">${item.actionParty || 'ارکان پروژه'}</td>
                    <td style="padding: 6px; border: 1px solid #ddd; color: #b45309; font-weight: bold;">${item.deadline || 'طبق برنامه زمان‌بندی'}</td>
                    <td style="padding: 6px; border: 1px solid #ddd;">
                      <span style="font-weight: bold; color: ${item.priority === 'CRITICAL' ? '#dc2626' : item.priority === 'HIGH' ? '#ea580c' : '#475569'};">
                        ${item.priority === 'CRITICAL' ? 'بحرانی' : item.priority === 'HIGH' ? 'فوری' : item.priority === 'LOW' ? 'عادی' : 'متوسط'}
                      </span>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <!-- Next Meeting & Notes -->
          ${meeting.nextMeetingDate || meeting.notes || meeting.nextMeetingAgendas?.length || meeting.nextMeetingAgenda ? `
            <div style="margin-top: 20px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; font-size: 11px;">
              ${meeting.nextMeetingDate ? `<div><strong>جلسه آتی:</strong> تاریخ ${meeting.nextMeetingDate} ${meeting.nextMeetingLocation ? `در محل ${meeting.nextMeetingLocation}` : ''}</div>` : ''}
              ${(meeting.nextMeetingAgendas && meeting.nextMeetingAgendas.length > 0) ? `
                <div style="margin-top: 4px;">
                  <strong>دستور کار پیشنهادی جلسه آتی:</strong>
                  <div style="padding-right: 12px; margin-top: 2px;">
                    ${meeting.nextMeetingAgendas.map((ag: string, idx: number) => `<div>${idx + 1}. ${ag}</div>`).join('')}
                  </div>
                </div>
              ` : meeting.nextMeetingAgenda ? `
                <div style="margin-top: 4px;">
                  <strong>دستور کار پیشنهادی جلسه آتی:</strong> ${meeting.nextMeetingAgenda}
                </div>
              ` : ''}
              ${meeting.notes ? `
                <div style="margin-top: 4px;">
                  <span><strong>ملاحظات:</strong> ${meeting.notes}</span>
                </div>
              ` : ''}
            </div>
          ` : ''}
        </div>

        <!-- Footer / Signatures - Preserved Exact Box Hierarchy -->
        <div class="footer">
          <div style="font-size: 10px; font-weight: bold; color: #334155; margin-bottom: 8px; text-align: center;">
            این صورت‌جلسه پس از قرائت و امضای تمامی حاضرین در جلسه، با تایید و امضای رسمی ارکان ذیربط پروژه نافذ و قطعی گردید.
          </div>
          
          <div style="display: grid; grid-template-columns: repeat(${activeOrgColsCount}, 1fr); gap: 8px; width: 100%;">

            <!-- Contractor Column -->
            ${isContractorInvolved ? `
              <div style="display: flex; flex-direction: column; gap: 4px;">
                <div style="background: #eff6ff; border: 1px solid #93c5fd; border-radius: 6px; padding: 4px 6px; text-align: center;">
                  <div style="font-weight: 800; font-size: 10px; color: #1e40af;">پیمانکار اصلی پروژه</div>
                  <div style="font-size: 8.5px; font-weight: 600; color: #475569;">${contractorName}</div>
                </div>

                ${(() => {
                  if (contractorAttendees.length > 0) {
                    const cards = contractorAttendees.map(att => renderAttendeeSigCard(att));
                    if (contractorSignatures?.workshopManager && !contractorAttendees.some(a => a.name === contractorSignatures.workshopManager?.name) && contractorSignatures.workshopManager.name !== 'سرپرست کارگاه') {
                      cards.push(renderAttendeeSigCard(contractorSignatures.workshopManager));
                    }
                    if (contractorSignatures?.projectManager && !contractorAttendees.some(a => a.name === contractorSignatures.projectManager?.name) && contractorSignatures.projectManager.name !== 'مدیر پروژه' && contractorSignatures.projectManager.name !== 'مدیر پروژه پیمانکار') {
                      cards.push(renderAttendeeSigCard(contractorSignatures.projectManager));
                    }
                    return cards.join('');
                  } else if (contractorSignatures) {
                    return renderAttendeeSigCard(contractorSignatures.workshopManager) + renderAttendeeSigCard(contractorSignatures.projectManager);
                  }
                  return '';
                })()}
              </div>
            ` : ''}

            <!-- Consultant Column -->
            ${isConsultantInvolved ? `
              <div style="display: flex; flex-direction: column; gap: 4px;">
                <div style="background: #ecfdf5; border: 1px solid #6ee7b7; border-radius: 6px; padding: 4px 6px; text-align: center;">
                  <div style="font-weight: 800; font-size: 10px; color: #065f46;">مهندسین مشاور و نظارت</div>
                  <div style="font-size: 8.5px; font-weight: 600; color: #475569;">${consultantName}</div>
                </div>

                ${(() => {
                  if (consultantAttendees.length > 0) {
                    const cards = consultantAttendees.map(att => renderAttendeeSigCard(att));
                    if (consultantSignatures?.workshopManager && !consultantAttendees.some(a => a.name === consultantSignatures.workshopManager?.name) && consultantSignatures.workshopManager.name !== 'سرپرست نظارت مقیم' && consultantSignatures.workshopManager.name !== 'دستگاه نظارت') {
                      cards.push(renderAttendeeSigCard(consultantSignatures.workshopManager));
                    }
                    if (consultantSignatures?.projectManager && !consultantAttendees.some(a => a.name === consultantSignatures.projectManager?.name) && consultantSignatures.projectManager.name !== 'مدیر پروژه مشاور' && consultantSignatures.projectManager.name !== 'مدیر پروژه') {
                      cards.push(renderAttendeeSigCard(consultantSignatures.projectManager));
                    }
                    return cards.join('');
                  } else if (consultantSignatures) {
                    return renderAttendeeSigCard(consultantSignatures.workshopManager) + renderAttendeeSigCard(consultantSignatures.projectManager);
                  }
                  return '';
                })()}
              </div>
            ` : ''}

            <!-- Employer Column -->
            ${isEmployerInvolved ? `
              <div style="display: flex; flex-direction: column; gap: 4px;">
                <div style="background: #faf5ff; border: 1px solid #d8b4fe; border-radius: 6px; padding: 4px 6px; text-align: center;">
                  <div style="font-weight: 800; font-size: 10px; color: #6b21a8;">دستگاه کارفرما</div>
                  <div style="font-size: 8.5px; font-weight: 600; color: #475569;">${employerName}</div>
                </div>

                ${(() => {
                  if (employerAttendees.length > 0) {
                    const cards = employerAttendees.map(att => renderAttendeeSigCard(att));
                    if (employerSignatures?.workshopManager && !employerAttendees.some(a => a.name === employerSignatures.workshopManager?.name) && employerSignatures.workshopManager.name !== 'سرپرست کارفرما' && employerSignatures.workshopManager.name !== 'سرپرست نظارت کارفرما') {
                      cards.push(renderAttendeeSigCard(employerSignatures.workshopManager));
                    }
                    if (employerSignatures?.projectManager && !employerAttendees.some(a => a.name === employerSignatures.projectManager?.name) && employerSignatures.projectManager.name !== 'مدیر پروژه کارفرما' && employerSignatures.projectManager.name !== 'مدیر پروژه') {
                      cards.push(renderAttendeeSigCard(employerSignatures.projectManager));
                    }
                    return cards.join('');
                  } else if (employerSignatures) {
                    return renderAttendeeSigCard(employerSignatures.workshopManager) + renderAttendeeSigCard(employerSignatures.projectManager);
                  }
                  return '';
                })()}
              </div>
            ` : ''}

            <!-- Other Attendees Column -->
            ${hasOtherAttendees ? `
              <div style="display: flex; flex-direction: column; gap: 4px;">
                <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 4px 6px; text-align: center;">
                  <div style="font-weight: 800; font-size: 10px; color: #0f172a;">سایر ارکان و مدعوین</div>
                  <div style="font-size: 8.5px; font-weight: 600; color: #475569;">نمایندگان حاضر</div>
                </div>
                ${otherAttendees.map(att => renderAttendeeSigCard(att)).join('')}
              </div>
            ` : ''}

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
  `);

  printWindow.document.close();
};
