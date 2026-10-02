import { DccDocument } from '../types/dcc';
import { Project, WorkflowStatus } from '../types';
import { SystemAdminService } from './systemAdminService';
import { HRService } from './hrService';
import { WorkflowService } from './workflowService';
import { formatUserDisplayFormal } from '../src/utils/userFormatter';
import { handlePrintOfficialHse } from './hsePrintService';
import { printOfficialLetter } from '../src/components/communications/OfficialLetterPrint';
import { printMeetingMinutes } from '../src/components/communications/MeetingMinutePrint';

const cleanCode = (code: string = ''): string => {
  return (code || '').toString().trim().replace(/[\s\-_/.]/g, '').toUpperCase();
};

export const printDccStandardReport = (
  doc: DccDocument,
  project?: Project | null
): void => {
  if (!doc) return;

  const rawItem = doc.rawItem || doc;
  const currentProject: any = project || (doc.projectId ? SystemAdminService.getProjects().find(p => p.id === doc.projectId) : null) || {
    id: doc.projectId || '1',
    title: doc.projectName || 'پروژه عمومی',
    contractNumber: '---',
    employerName: doc.employerName || 'دستگاه اجرایی و کارفرما',
    consultantName: doc.consultantName || 'دستگاه نظارت و مشاور',
    contractorName: doc.contractorName || 'شرکت پیمانکار',
    initialBudget: 0,
    startDate: '---',
    endDate: '---'
  };

  // 1. If it's an HSE document, route directly to handlePrintOfficialHse
  if (doc.module === 'HSE') {
    let hseType: any = 'PERIODIC';
    if (doc.documentType === 'WORK_PERMIT') hseType = 'PERMIT';
    else if (doc.documentType === 'INCIDENT_REPORT') hseType = 'INCIDENT';
    else if (doc.documentType === 'ENVIRONMENTAL_REPORT') hseType = 'ENVIRONMENTAL';
    else if (doc.documentType === 'HSE_PLAN') hseType = 'PLAN';
    else if (doc.documentType === 'HSE_PERIODIC_REPORT') hseType = 'PERIODIC';
    
    handlePrintOfficialHse(hseType, rawItem, currentProject);
    return;
  }

  // 2. If it's an Official Letter from Communications
  if (doc.module === 'COMMUNICATIONS' && (doc.documentType === 'OFFICIAL_LETTER' || doc.sourceKey === 'hamyar_official_letters')) {
    printOfficialLetter(rawItem, currentProject);
    return;
  }

  // 3. If it's a Meeting Minute
  if (doc.module === 'COMMUNICATIONS' && (doc.documentType === 'MINUTE' || doc.sourceKey === 'hamyar_meetings')) {
    printMeetingMinutes(rawItem, currentProject);
    return;
  }

  // 4. If it's Quality Control (RFI, NCR, Lab Test)
  if (doc.module === 'QUALITY_CONTROL' || doc.documentType === 'RFI' || doc.documentType === 'NCR' || doc.documentType === 'LAB_TEST') {
    printQCStandardReport(doc, rawItem, currentProject);
    return;
  }

  // 5. Standard Technical Office / Engineering Documents Print Window
  printTechnicalStandardReport(doc, rawItem, currentProject);
};

/**
 * Standard Print Engine for Technical Office & Engineering Documents
 */
function printTechnicalStandardReport(doc: DccDocument, rawItem: any, currentProject: Project): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('امکان باز کردن پنجره چاپ وجود ندارد. لطفاً پاپ‌آپ مرورگر را فعال کنید.');
    return;
  }

  const projectTitle = currentProject?.title || doc.projectName || '---';
  const projectEmployer = currentProject?.employerName || doc.employerName || '---';
  const projectConsultant = currentProject?.consultantName || doc.consultantName || '---';
  const projectContractor = currentProject?.contractorName || doc.contractorName || '---';
  const contractNumber = currentProject?.contractNumber || '---';
  const projectBudget = currentProject?.initialBudget
    ? currentProject.initialBudget.toLocaleString('fa-IR') + ' ریال'
    : '---';
  const projectTimeline =
    (currentProject?.startDate || '---') +
    ' الی ' +
    (currentProject?.endDate || '---');

  const history: any[] = rawItem?.workflowHistory || doc.workflowHistory || [];

  const users = SystemAdminService.getUsers();

  const getSignatory = (roleKey: string) => {
    const findEventForRole = (targetRoleKey: string) => {
      const matchEvent = (e: any) => {
        const actorUser = e.actorUserId ? users.find(u => u.id === e.actorUserId) : undefined;
        const org = actorUser?.orgId ? SystemAdminService.getOrganization(actorUser.orgId) : undefined;
        const isContractorOrg = org?.type === 'CONTRACTOR' || !org;
        const isConsultantOrg = org?.type === 'CONSULTANT';
        const isEmployerOrg = org?.type === 'EMPLOYER';

        if (e.roleKey) {
          if (targetRoleKey === 'contractor_tech' && e.roleKey === 'contractor_tech') return true;
          if (targetRoleKey === 'contractor_head' && e.roleKey === 'contractor_head') return true;
          if (targetRoleKey === 'contractor_site' && (e.roleKey === 'contractor_site' || e.roleKey === 'contractor')) return true;
          if (targetRoleKey === 'consultant_tech' && e.roleKey === 'consultant_tech') return true;
          if (targetRoleKey === 'consultant_head' && e.roleKey === 'consultant_head') return true;
          if (targetRoleKey === 'consultant' && (e.roleKey === 'consultant' || e.roleKey === 'consultant_site')) return true;
          if (targetRoleKey === 'employer_tech' && e.roleKey === 'employer_tech') return true;
          if (targetRoleKey === 'employer_head' && e.roleKey === 'employer_head') return true;
          if (targetRoleKey === 'employer' && (e.roleKey === 'employer' || e.roleKey === 'employer_site')) return true;
          return false;
        }

        const title = ((e.actorTitle || actorUser?.jobTitle || e.actorName || '') + ' ' + (actorUser?.jobLevel || '')).toLowerCase();

        if (targetRoleKey === 'contractor_tech') {
          if (e.action === 'CREATE' || e.action === 'SUBMIT' || e.action === 'RESUBMIT') return true;
          if (isContractorOrg && (title.includes('کارشناس') || title.includes('دفتر فنی') || title.includes('تهیه'))) return true;
        }
        if (targetRoleKey === 'contractor_head') {
          if (e.action === 'APPROVE' && isContractorOrg && (title.includes('سرپرست واحد') || title.includes('سرپرست دفتر') || title.includes('رئیس'))) return true;
        }
        if (targetRoleKey === 'contractor_site') {
          if (e.action === 'SEND_TO_CONSULTANT' || (isContractorOrg && (title.includes('سرپرست کارگاه') || title.includes('مدیر پروژه')))) return true;
        }
        if (targetRoleKey === 'consultant_tech') {
          if (isConsultantOrg && (title.includes('کارشناس') || title.includes('ناظر') || title.includes('مقیم'))) return true;
        }
        if (targetRoleKey === 'consultant_head') {
          if (isConsultantOrg && (title.includes('سرپرست واحد') || title.includes('سرپرست گروه') || title.includes('رئیس'))) return true;
        }
        if (targetRoleKey === 'consultant') {
          if (e.action === 'SEND_TO_EMPLOYER' || (isConsultantOrg && (title.includes('مشاور') || title.includes('سرپرست نظارت') || title.includes('مدیر')))) return true;
        }
        if (targetRoleKey === 'employer_tech') {
          if (isEmployerOrg && (title.includes('کارشناس') || title.includes('بررسی'))) return true;
        }
        if (targetRoleKey === 'employer_head') {
          if (isEmployerOrg && (title.includes('سرپرست') || title.includes('مدیر گروه') || title.includes('رئیس'))) return true;
        }
        if (targetRoleKey === 'employer') {
          if (e.action === 'FINAL_APPROVE' || (isEmployerOrg && (title.includes('کارفرما') || title.includes('مدیر طرح') || title.includes('مجری')))) return true;
        }

        return false;
      };

      return [...history].reverse().find(e => matchEvent(e));
    };

    const matchedEv = findEventForRole(roleKey);
    if (matchedEv) {
      const actorUser = users.find(u => u.id === matchedEv.actorUserId || u.fullName === matchedEv.actorName);
      const actorOrg = actorUser?.orgId ? SystemAdminService.getOrganization(actorUser.orgId) : undefined;
      const formalName = actorUser ? formatUserDisplayFormal(actorUser, actorOrg) : (matchedEv.actorName || 'امضاء کننده گزارش');
      const sig = matchedEv.signature || (actorUser ? (HRService.getUserSignature(actorUser) || actorUser?.signature) : undefined);
      return {
        name: formalName,
        title: matchedEv.actorTitle || actorUser?.jobTitle || 'امضاء الکترونیکی',
        signature: sig,
        date: new Date(matchedEv.timestamp).toLocaleDateString('fa-IR')
      };
    }

    if (roleKey === 'contractor_tech') return { name: doc.authorName || 'کارشناس دفتر فنی', title: 'بخش مهندسی و دفتر فنی پیمانکار', signature: undefined, date: undefined };
    if (roleKey === 'contractor_head') return { name: 'سرپرست واحد فنی', title: 'سرپرست واحد فنی پیمانکار', signature: undefined, date: undefined };
    if (roleKey === 'contractor_site') return { name: 'سرپرست کارگاه / مدیر پروژه', title: 'سرپرست کارگاه پیمانکار', signature: undefined, date: undefined };
    if (roleKey === 'consultant_tech') return { name: 'کارشناس / ناظر مقیم', title: 'دستگاه نظارت و مشاور', signature: undefined, date: undefined };
    if (roleKey === 'consultant_head') return { name: 'سرپرست واحد نظارت', title: 'دستگاه نظارت و مشاور', signature: undefined, date: undefined };
    if (roleKey === 'consultant') return { name: doc.consultantName || 'سرپرست نظارت / مدیر پروژه مشاور', title: 'دستگاه نظارت و مشاور', signature: undefined, date: undefined };
    if (roleKey === 'employer_tech') return { name: 'کارشناس / بررسی‌کننده', title: 'دستگاه اجرایی و کارفرما', signature: undefined, date: undefined };
    if (roleKey === 'employer_head') return { name: 'سرپرست واحد / مدیر گروه', title: 'دستگاه اجرایی و کارفرما', signature: undefined, date: undefined };
    if (roleKey === 'employer') return { name: doc.employerName || 'مدیر طرح / نماینده کارفرما', title: 'دستگاه اجرایی و کارفرما', signature: undefined, date: undefined };

    return { name: '---', title: 'امضاء', signature: undefined, date: undefined };
  };

  const renderPrintSignatureBox = (headerTitle: string, roleKey: string) => {
    const signInfo = getSignatory(roleKey);
    const personName = signInfo?.name
      ? `<div style="font-weight: bold; font-size: 8px; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2;">${signInfo.name}</div>`
      : `<div style="font-weight: bold; font-size: 8px; color: #94a3b8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2;">نام و نام خانوادگی</div>`;

    if (signInfo && signInfo.signature) {
      return `
        <div class="sig-box" style="flex: 1 1 0%; min-width: 0; border: 1px dashed #cbd5e1; padding: 4px; border-radius: 4px; text-align: center; background: #ffffff; box-sizing: border-box;">
          <div style="font-size: 8px; font-weight: bold; color: #475569; margin-bottom: 2px; border-bottom: 1px solid #f1f5f9; padding-bottom: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${headerTitle}</div>
          ${personName}
          <div style="height: 26px; display: flex; align-items: center; justify-content: center; margin: 1px 0;">
            <img src="${signInfo.signature}" style="max-height: 24px; max-width: 90%; object-fit: contain;" />
          </div>
          <div style="font-size: 6px; color: #64748b; font-family: monospace;">${signInfo.date || ''}</div>
        </div>
      `;
    }

    return `
      <div class="sig-box" style="flex: 1 1 0%; min-width: 0; border: 1px dashed #cbd5e1; padding: 4px; border-radius: 4px; text-align: center; background: #ffffff; box-sizing: border-box;">
        <div style="font-size: 8px; font-weight: bold; color: #475569; margin-bottom: 2px; border-bottom: 1px solid #f1f5f9; padding-bottom: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${headerTitle}</div>
        ${personName}
        <div style="height: 26px; display: flex; align-items: center; justify-content: center; font-size: 7px; color: #94a3b8; font-style: italic;">مهر / امضاء</div>
        <div class="sig-line" style="border-top: 1px dashed #cbd5e1; padding-top: 1px; font-size: 7px; color: #64748b;">نام و امضاء</div>
      </div>
    `;
  };

  const renderProjectHeader = (reportTitle: string, showContractInfo: boolean = false) => `
    <div style="border-bottom: 2px solid #1e40af; padding-bottom: 15px; margin-bottom: 20px;">
      <h2 style="margin: 0; color: #1e40af; text-align: center;">${reportTitle}</h2>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 15px; font-size: 12px; background: #f8fafc; padding: 10px; border-radius: 8px;">
        <div><strong>پروژه:</strong> ${projectTitle}</div>
        <div><strong>شماره پیمان:</strong> ${contractNumber}</div>
        <div><strong>کارفرما:</strong> ${projectEmployer}</div>
        <div><strong>مشاور:</strong> ${projectConsultant}</div>
        <div><strong>پیمانکار:</strong> ${projectContractor}</div>
        <div><strong>شماره مدرک:</strong> ${doc.documentNumber}</div>
        <div><strong>تاریخ سند:</strong> ${doc.documentDate}</div>
        ${
          showContractInfo
            ? `
          <div><strong>مبلغ کل قرارداد:</strong> ${projectBudget}</div>
          <div><strong>مدت پیمان:</strong> ${projectTimeline}</div>
        `
            : ''
        }
      </div>
    </div>
  `;

  let title = `${doc.documentTypeLabel}: ${doc.title}`;
  let contentHtml = '';

  // 1. Technical Office Minute (صورتمجلس)
  if (doc.documentType === 'MINUTE' || rawItem?.rows) {
    const rows: any[] = rawItem?.rows || [];
    contentHtml = `
      ${renderProjectHeader(`صورت‌جلسه کارگاهی: ${doc.title}`)}
      <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px;">
        <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; width: 30%;">شماره صورت‌جلسه:</td><td style="padding: 8px; border: 1px solid #ddd;">${rawItem.number || doc.documentNumber}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">تاریخ:</td><td style="padding: 8px; border: 1px solid #ddd;">${rawItem.date || doc.documentDate}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">محل اجرا:</td><td style="padding: 8px; border: 1px solid #ddd;">${rawItem.location || 'کارگاه پروژه'}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">وضعیت:</td><td style="padding: 8px; border: 1px solid #ddd;">${doc.statusLabel}</td></tr>
      </table>
      
      <div style="margin-top: 20px;">
        <h3 style="border-bottom: 1px solid #eee; padding-bottom: 5px;">شرح و جزئیات مصوبه</h3>
        <div style="padding: 15px; background: #fff; border: 1px solid #eee; border-radius: 8px; min-height: 50px;">
          ${doc.description || rawItem.description || 'احجام کارگاهی ثبت شده مطابق نقشه‌ها و دستور کارها'}
        </div>
      </div>

      ${rows.length > 0 ? `
        <div style="margin-top: 25px;">
          <h3 style="border-bottom: 2px solid #1e40af; padding-bottom: 5px; color: #1e40af;">ریز متره و محاسبات احجام</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 10px; text-align: center; margin-top: 10px;">
            <thead>
              <tr style="background: #f8fafc;">
                <th style="padding: 5px; border: 1px solid #ddd;">ردیف</th>
                <th style="padding: 5px; border: 1px solid #ddd;">کد آیتم</th>
                <th style="padding: 5px; border: 1px solid #ddd;">شرح عملیات</th>
                <th style="padding: 5px; border: 1px solid #ddd;">واحد</th>
                <th style="padding: 5px; border: 1px solid #ddd;">تعداد</th>
                <th style="padding: 5px; border: 1px solid #ddd;">طول</th>
                <th style="padding: 5px; border: 1px solid #ddd;">عرض</th>
                <th style="padding: 5px; border: 1px solid #ddd;">ارتفاع</th>
                <th style="padding: 5px; border: 1px solid #ddd;">مقدار کل</th>
              </tr>
            </thead>
            <tbody>
              ${rows.map((m, idx) => `
                <tr>
                  <td style="padding: 5px; border: 1px solid #ddd;">${(idx + 1).toLocaleString('fa-IR')}</td>
                  <td style="padding: 5px; border: 1px solid #ddd; font-family: monospace; font-weight: bold; color: #2563eb;">${m.itemCode || m.code || '---'}</td>
                  <td style="padding: 5px; border: 1px solid #ddd; text-align: right;">${m.description || '---'}</td>
                  <td style="padding: 5px; border: 1px solid #ddd;">${m.unit || '---'}</td>
                  <td style="padding: 5px; border: 1px solid #ddd;">${(m.count || 1).toLocaleString('fa-IR')}</td>
                  <td style="padding: 5px; border: 1px solid #ddd;">${(m.length || 0).toLocaleString('fa-IR')}</td>
                  <td style="padding: 5px; border: 1px solid #ddd;">${(m.width || 0).toLocaleString('fa-IR')}</td>
                  <td style="padding: 5px; border: 1px solid #ddd;">${(m.height || 0).toLocaleString('fa-IR')}</td>
                  <td style="padding: 5px; border: 1px solid #ddd; font-weight: bold;">${(m.partialTotal || m.total || 0).toLocaleString('fa-IR')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}
    `;
  } else if (doc.documentType === 'STATEMENT') {
    // Statement (صورت‌وضعیت)
    contentHtml = `
      ${renderProjectHeader(`صورت‌وضعیت کارکرد موقت: ${doc.title}`, true)}
      <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px;">
        <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; width: 30%;">شماره صورت‌وضعیت:</td><td style="padding: 8px; border: 1px solid #ddd;">${rawItem.number || doc.documentNumber}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">دوره کارکرد:</td><td style="padding: 8px; border: 1px solid #ddd;">${rawItem.startDate || '---'} الی ${rawItem.endDate || doc.documentDate}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">شرح و توضیحات:</td><td style="padding: 8px; border: 1px solid #ddd;">${doc.description || rawItem.description || 'صورت‌وضعیت کارکرد تجمعی کارگاه'}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">وضعیت تایید:</td><td style="padding: 8px; border: 1px solid #ddd;">${doc.statusLabel}</td></tr>
      </table>
      <div style="margin-top: 30px;">
        <h3 style="border-bottom: 1px solid #eee; padding-bottom: 5px;">خلاصه مالی صورت‌وضعیت</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 10px;">
           <div style="background: #f1f5f9; padding: 15px; border-radius: 12px; text-align: center;">
             <div style="font-size: 10px; color: #64748b;">مبلغ ناخالص دوره (ریال)</div>
             <div style="font-size: 18px; font-weight: bold; margin-top: 5px;">${(rawItem.grossAmount || rawItem.totalAmount || 0).toLocaleString('fa-IR')} <small>ریال</small></div>
           </div>
           <div style="background: #e0f2fe; padding: 15px; border-radius: 12px; text-align: center;">
             <div style="font-size: 10px; color: #0369a1;">مبلغ خالص با کلیه ضرایب</div>
             <div style="font-size: 18px; font-weight: bold; margin-top: 5px;">${(rawItem.netAmount || rawItem.totalAmount || 0).toLocaleString('fa-IR')} <small>ریال</small></div>
           </div>
        </div>
      </div>
    `;
  } else if (doc.documentType === 'VARIATION_ORDER') {
    // Variation Order (دستور کار / تغییر مقادیر)
    contentHtml = `
      ${renderProjectHeader(`دستور کار و تغییر مقادیر: ${doc.title}`)}
      <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px;">
        <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; width: 30%;">شماره دستور کار:</td><td style="padding: 8px; border: 1px solid #ddd;">${rawItem.orderNumber || rawItem.number || doc.documentNumber}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">تاریخ ابلاغ:</td><td style="padding: 8px; border: 1px solid #ddd;">${rawItem.date || doc.documentDate}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">صادرکننده:</td><td style="padding: 8px; border: 1px solid #ddd;">${doc.authorName}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">وضعیت:</td><td style="padding: 8px; border: 1px solid #ddd;">${doc.statusLabel}</td></tr>
      </table>
      <div style="margin-top: 20px;">
        <h3 style="border-bottom: 1px solid #eee; padding-bottom: 5px;">شرح و موضوع تغییرات</h3>
        <div style="padding: 15px; background: #fff; border: 1px solid #eee; border-radius: 8px; min-height: 50px;">
          ${doc.description || rawItem.description || 'دستور کار ابلاغی تغییرات مقادیر منضم به پیمان'}
        </div>
      </div>
    `;
  } else {
    // Generic Engineering / Planning / Archive Document
    contentHtml = `
      ${renderProjectHeader(`${doc.documentTypeLabel}: ${doc.title}`)}
      <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px;">
        <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; width: 30%;">کد مدرک:</td><td style="padding: 8px; border: 1px solid #ddd; font-family: monospace; font-weight: bold;">${doc.documentNumber}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">ویرایش / بازنگری:</td><td style="padding: 8px; border: 1px solid #ddd; font-family: monospace;">${doc.revision}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">بخش و دیسیپلین:</td><td style="padding: 8px; border: 1px solid #ddd;">${doc.moduleLabel} - ${doc.discipline || 'عمومی'}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">تاریخ صدور:</td><td style="padding: 8px; border: 1px solid #ddd;">${doc.documentDate}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">تهیه‌کننده:</td><td style="padding: 8px; border: 1px solid #ddd;">${doc.authorName}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">وضعیت مدرک:</td><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${doc.statusLabel}</td></tr>
      </table>
      <div style="margin-top: 20px;">
        <h3 style="border-bottom: 1px solid #eee; padding-bottom: 5px;">خلاصه و توضیحات فنی مدرک</h3>
        <div style="padding: 15px; background: #fff; border: 1px solid #eee; border-radius: 8px; min-height: 60px;">
          ${doc.description || 'مدرک فنی و مهندسی ثبت شده در بایگانی DCC'}
        </div>
      </div>
    `;
  }

  // Write exact standard HTML template matching TechnicalOffice
  printWindow.document.write(`
    <html dir="rtl">
      <head>
        <title>${title}</title>
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
        <div class="header">
          <div class="logo-section">
            <div class="logo-box"></div>
            <h1 style="margin: 0; color: #1e40af; font-size: 22px;">سامانه مدیریت پروژه همیار</h1>
          </div>
          <div style="text-align: left; font-size: 11px;">
            <p style="margin: 0;">تاریخ چاپ: ${new Date().toLocaleDateString('fa-IR')}</p>
            <p style="margin: 0;">نسخه: ۱.۴.۰</p>
          </div>
        </div>
        <div class="content">
          ${contentHtml}
        </div>
        <div class="footer">
          <div style="display: flex; flex-direction: row; justify-content: space-between; gap: 6px; width: 100%; box-sizing: border-box;">
            <!-- 1. پیمانکار -->
            <div style="flex: 1 1 0%; min-width: 0; border: 1px solid #93c5fd; background: #eff6ff; border-radius: 6px; padding: 4px; box-sizing: border-box;">
              <div style="font-weight: bold; font-size: 9px; color: #1e40af; text-align: center; border-bottom: 1px solid #bfdbfe; padding-bottom: 2px; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                پیمانکار: ${projectContractor}
              </div>
              <div style="display: flex; flex-direction: row; gap: 3px; width: 100%;">
                ${renderPrintSignatureBox('کارشناس / تنظیم‌کننده', 'contractor_tech')}
                ${renderPrintSignatureBox('سرپرست واحد فنی', 'contractor_head')}
                ${renderPrintSignatureBox('سرپرست کارگاه / مدیر پروژه', 'contractor_site')}
              </div>
            </div>

            <!-- 2. دستگاه نظارت و مشاور -->
            <div style="flex: 1 1 0%; min-width: 0; border: 1px solid #6ee7b7; background: #ecfdf5; border-radius: 6px; padding: 4px; box-sizing: border-box;">
              <div style="font-weight: bold; font-size: 9px; color: #065f46; text-align: center; border-bottom: 1px solid #a7f3d0; padding-bottom: 2px; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                مشاور: ${projectConsultant}
              </div>
              <div style="display: flex; flex-direction: row; gap: 3px; width: 100%;">
                ${renderPrintSignatureBox('کارشناس / ناظر مقیم', 'consultant_tech')}
                ${renderPrintSignatureBox('سرپرست واحد نظارت', 'consultant_head')}
                ${renderPrintSignatureBox('سرپرست نظارت / مدیر پروژه', 'consultant')}
              </div>
            </div>

            <!-- 3. دستگاه اجرایی و کارفرما -->
            <div style="flex: 1 1 0%; min-width: 0; border: 1px solid #d8b4fe; background: #faf5ff; border-radius: 6px; padding: 4px; box-sizing: border-box;">
              <div style="font-weight: bold; font-size: 9px; color: #6b21a8; text-align: center; border-bottom: 1px solid #e9d5ff; padding-bottom: 2px; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                کارفرما: ${projectEmployer}
              </div>
              <div style="display: flex; flex-direction: row; gap: 3px; width: 100%;">
                ${renderPrintSignatureBox('کارشناس / بررسی‌کننده', 'employer_tech')}
                ${renderPrintSignatureBox('سرپرست واحد / مدیر گروه', 'employer_head')}
                ${renderPrintSignatureBox('مدیر طرح / نماینده کارفرما', 'employer')}
              </div>
            </div>
          </div>
        </div>
        <script>
          window.onload = () => {
            setTimeout(() => {
              window.print();
            }, 300);
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

/**
 * Standard Print Engine for Quality Control
 */
function printQCStandardReport(doc: DccDocument, rawItem: any, currentProject: Project): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('امکان باز کردن پنجره چاپ وجود ندارد. لطفاً پاپ‌آپ مرورگر را فعال کنید.');
    return;
  }

  const projectTitle = currentProject?.title || doc.projectName || '---';
  const projectEmployer = currentProject?.employerName || doc.employerName || '---';
  const projectConsultant = currentProject?.consultantName || doc.consultantName || '---';
  const projectContractor = currentProject?.contractorName || doc.contractorName || '---';
  const contractNumber = currentProject?.contractNumber || '---';

  const history: any[] = rawItem?.workflowHistory || doc.workflowHistory || [];
  const users = SystemAdminService.getUsers();

  const getQCSignatory = (orgType: 'CONTRACTOR' | 'CONSULTANT' | 'EMPLOYER') => {
    const matchedEv = [...history].reverse().find((e: any) => {
      const actorUser = e.actorUserId ? users.find(u => u.id === e.actorUserId) : undefined;
      const org = actorUser?.orgId ? SystemAdminService.getOrganization(actorUser.orgId) : undefined;
      if (org?.type === orgType) return true;
      if (orgType === 'CONTRACTOR' && (e.action === 'CREATE' || e.action === 'SUBMIT' || e.action === 'SEND_TO_CONSULTANT')) return true;
      if (orgType === 'CONSULTANT' && (e.action === 'APPROVE' || e.action === 'SEND_TO_EMPLOYER' || e.action === 'REJECT')) return true;
      if (orgType === 'EMPLOYER' && (e.action === 'FINAL_APPROVE' || e.action === 'APPROVE')) return true;
      return false;
    });

    if (matchedEv) {
      const actorUser = users.find(u => u.id === matchedEv.actorUserId || u.fullName === matchedEv.actorName);
      const actorOrg = actorUser?.orgId ? SystemAdminService.getOrganization(actorUser.orgId) : undefined;
      return {
        name: actorUser ? formatUserDisplayFormal(actorUser, actorOrg) : (matchedEv.actorName || 'امضاء کننده'),
        title: matchedEv.actorTitle || actorUser?.jobTitle || 'کنترل کیفی',
        signature: matchedEv.signature || (actorUser ? (HRService.getUserSignature(actorUser) || actorUser?.signature) : undefined),
        date: new Date(matchedEv.timestamp).toLocaleDateString('fa-IR')
      };
    }

    if (orgType === 'CONTRACTOR') return { name: doc.authorName || 'مسئول QC پیمانکار', title: 'واحد کنترل کیفیت پیمانکار', signature: undefined, date: undefined };
    if (orgType === 'CONSULTANT') return { name: doc.consultantName || 'مهندس ناظر کیفی', title: 'دستگاه نظارت مقیم', signature: undefined, date: undefined };
    return { name: doc.employerName || 'نماینده کارفرما', title: 'دستگاه اجرایی', signature: undefined, date: undefined };
  };

  const contractorSig = getQCSignatory('CONTRACTOR');
  const consultantSig = getQCSignatory('CONSULTANT');
  const employerSig = getQCSignatory('EMPLOYER');

  const renderSignatureBlock = (title: string, sigInfo: any) => `
    <div style="border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; background: #fff; text-align: center; display: flex; flex-direction: column; justify-content: space-between; min-height: 110px;">
      <div style="font-weight: bold; font-size: 11px; color: #1e293b; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px; margin-bottom: 6px;">
        ${title}
      </div>
      <div style="font-size: 10px; color: #475569; font-weight: bold;">
        ${sigInfo?.name || '---'}
      </div>
      <div style="font-size: 9px; color: #64748b;">
        ${sigInfo?.title || '---'}
      </div>
      <div style="height: 35px; display: flex; align-items: center; justify-content: center; margin: 4px 0;">
        ${sigInfo?.signature ? `<img src="${sigInfo.signature}" style="max-height: 32px; max-width: 90%; object-fit: contain;" />` : `<span style="font-size: 8px; color: #94a3b8; font-style: italic;">محل امضاء الکترونیکی</span>`}
      </div>
      <div style="font-size: 8px; color: #94a3b8; font-family: monospace;">
        ${sigInfo?.date ? `تاریخ: ${sigInfo.date}` : '---'}
      </div>
    </div>
  `;

  let title = `گزارش کنترل کیفیت - ${doc.documentNumber}`;
  let contentHtml = `
    <div style="border-bottom: 2px solid #1e40af; padding-bottom: 15px; margin-bottom: 20px;">
      <h2 style="margin: 0; color: #1e40af; text-align: center;">${doc.documentTypeLabel} - ${doc.title}</h2>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 15px; font-size: 12px; background: #f8fafc; padding: 10px; border-radius: 8px; direction: rtl;">
        <div><strong>پروژه:</strong> ${projectTitle}</div>
        <div><strong>شماره پیمان:</strong> ${contractNumber}</div>
        <div><strong>کارفرما:</strong> ${projectEmployer}</div>
        <div><strong>مشاور:</strong> ${projectConsultant}</div>
        <div><strong>پیمانکار:</strong> ${projectContractor}</div>
        <div><strong>شماره سند:</strong> ${doc.documentNumber}</div>
        <div><strong>تاریخ:</strong> ${doc.documentDate}</div>
      </div>
    </div>

    <div style="margin-top: 20px;">
      <h3 style="border-right: 4px solid #1e40af; padding-right: 10px; color: #1e40af; font-size: 13px;">مشخصات و شرح بررسی فنی</h3>
      <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; text-align: center; direction: rtl;">
        <tbody>
          <tr style="background: #f8fafc;">
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; width: 25%; text-align: right;">عنوان و موضوع:</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${doc.title}</td>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; width: 25%; text-align: right;">دیسیپلین:</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${doc.discipline || 'کنترل کیفی'}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; text-align: right;">وضعیت بازرسی:</td>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; color: #047857; text-align: right;">${doc.statusLabel}</td>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; text-align: right;">شماره مدرک:</td>
            <td style="padding: 8px; border: 1px solid #ddd; font-family: monospace; text-align: right;">${doc.documentNumber}</td>
          </tr>
        </tbody>
      </table>

      <div style="margin-top: 20px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; background: #fff;">
        <h4 style="margin: 0 0 8px 0; color: #334155; font-size: 11px;">توضیحات و نتایج ارزیابی:</h4>
        <div style="font-size: 11px; line-height: 1.6; color: #1e293b;">
          ${doc.description || 'مستندات و بررسی‌های کیفی با استانداردهای پروژه مطابقت دارد.'}
        </div>
      </div>
    </div>
  `;

  const orgLogos = SystemAdminService.getProjectOrgLogos(currentProject);
  const logoHtml = [
    orgLogos.employerLogo ? `<img src="${orgLogos.employerLogo}" style="height: 40px; max-width: 90px; object-fit: contain;" alt="کارفرما" />` : '',
    orgLogos.consultantLogo ? `<img src="${orgLogos.consultantLogo}" style="height: 40px; max-width: 90px; object-fit: contain;" alt="مشاور" />` : '',
    orgLogos.contractorLogo ? `<img src="${orgLogos.contractorLogo}" style="height: 40px; max-width: 90px; object-fit: contain;" alt="پیمانکار" />` : ''
  ].filter(Boolean).join('');

  printWindow.document.write(`
    <html dir="rtl">
      <head>
        <title>${title}</title>
        <style>
          @font-face { font-family: 'Vazir'; src: url('https://cdn.jsdelivr.net/gh/rastikerdar/vazir-font@v30.1.0/dist/Vazir.woff2'); }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box; }
          body { font-family: 'Vazir', Tahoma, sans-serif; padding: 15px; color: #1e293b; line-height: 1.4; background: #fff; width: 100%; margin: 0; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #1e40af; padding-bottom: 10px; margin-bottom: 15px; }
          .logo-section { display: flex; align-items: center; gap: 10px; }
          .logo-box { width: 36px; height: 36px; background: #1e40af; border-radius: 6px; }
          .content { min-height: 450px; }
          .footer { margin-top: 25px; border-top: 2px solid #64748b; padding-top: 15px; width: 100%; page-break-inside: avoid; break-inside: avoid; }
          @media print { 
            body { padding: 5mm; margin: 0; width: 100%; } 
            @page { size: A4; margin: 8mm; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo-section">
            ${logoHtml || '<div class="logo-box"></div>'}
            <h1 style="margin: 0; color: #1e40af; font-size: 20px;">سامانه کنترل کیفیت و اسناد همیار</h1>
          </div>
          <div style="text-align: left; font-size: 11px;">
            <p style="margin: 0;">تاریخ چاپ: ${new Date().toLocaleDateString('fa-IR')}</p>
            <p style="margin: 0;">کد سند: ${doc.documentNumber}</p>
          </div>
        </div>
        <div class="content">
          ${contentHtml}
        </div>
        <div class="footer">
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; width: 100%;">
            ${renderSignatureBlock('پیمانکار - کنترل کیفیت', contractorSig)}
            ${renderSignatureBlock('دستگاه نظارت و مشاور', consultantSig)}
            ${renderSignatureBlock('کارفرما / دستگاه اجرایی', employerSig)}
          </div>
        </div>
        <script>
          window.onload = () => {
            setTimeout(() => {
              window.print();
            }, 300);
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}
