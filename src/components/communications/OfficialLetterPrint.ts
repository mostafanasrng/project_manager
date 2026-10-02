import { OfficialLetter, Project } from '../../../types';
import { SystemAdminService } from '../../../services/systemAdminService';
import { formatUserDisplayFormal } from '../../utils/userFormatter';

export const printOfficialLetter = (letter: OfficialLetter, project?: Project) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('امکان باز کردن پنجره چاپ وجود ندارد. لطفاً پاپ‌آپ مرورگر را فعال کنید.');
    return;
  }

  const senderOrg = SystemAdminService.getOrganization(letter.senderOrgId);
  const projectTitle = project ? project.title : '---';
  const employerName = project?.employerName || (project as any)?.employer || 'دستگاه اجرایی و کارفرما';
  const consultantName = project?.consultantName || (project as any)?.consultant || 'دستگاه نظارت و مشاور';
  const contractorName = project?.contractorName || (project as any)?.contractor || 'سازمان پیمانکار';
  const contractNumber = project?.contractNumber || (project as any)?.contractNumber || '---';

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
        actorUserId: ev.actorUserId,
        name: user ? formatUserDisplayFormal(user, org) : ev.actorName,
        title: user?.jobTitle || user?.jobLevel || ev.actorTitle || 'کارشناس مسئول',
        orgName: org?.name || senderOrg?.name || '',
        signature: signatureImg,
        date: new Date(ev.timestamp).toLocaleDateString('fa-IR'),
        role: user?.role
      });
    }
  }

  // Transcripts HTML
  let transcriptsHtml = '';
  if (letter.transcripts && letter.transcripts.length > 0) {
    transcriptsHtml = `
      <div style="margin-top: 20px; padding: 10px 12px; border: 1px dashed #94a3b8; border-radius: 6px; background: #f8fafc; font-size: 11px; color: #334155; page-break-inside: avoid;">
        <div style="font-weight: 900; margin-bottom: 4px; color: #0f172a;">رونوشت:</div>
        <ul style="margin: 0; padding-right: 18px; line-height: 1.8; list-style-type: square;">
          ${letter.transcripts.map(t => `
            <li>
              <strong>${t.recipientName}</strong>
              ${t.roleOrJobTitle ? ` - ${t.roleOrJobTitle}` : ''}
              ${t.orgName ? ` (${t.orgName})` : ''}
              ${t.note ? `: ${t.note}` : ''}
            </li>
          `).join('')}
        </ul>
      </div>
    `;
  }

  // Attachments HTML
  let attachmentsHtml = '';
  if (letter.attachments && letter.attachments.length > 0) {
    attachmentsHtml = `
      <div style="margin-top: 12px; font-size: 11px; color: #475569; page-break-inside: avoid; background: #f1f5f9; padding: 6px 12px; border-radius: 6px;">
        <span style="font-weight: 800; color: #0f172a;">پیوست‌ها:</span>
        <span style="margin-right: 6px;">${letter.attachments.map(a => a.name).join(' ، ')}</span>
      </div>
    `;
  }

  // Signatures HTML - Preserved exact signature box rendering logic
  let signaturesHtml = '';
  if (letter.scope === 'EXTERNAL') {
    // STRICT RULE: External letters strictly only feature Project Manager or Workshop Manager signature slots
    const pmWmSigs = distinctSignatures.filter(sig => {
      const t = (sig.title || '').toLowerCase();
      const n = (sig.name || '').toLowerCase();
      const isPmWm = t.includes('مدیر پروژه') || t.includes('سرپرست کارگاه') || t.includes('مدیر طرح') || t.includes('سرپرست نظارت') || t.includes('مدیر عامل') || t.includes('رئیس کارگاه') || t.includes('مدیر کارگاه') || sig.role === 'ORG_ADMIN' || sig.role === 'ORG_MANAGER';
      return isPmWm && Boolean(sig.signature); // ONLY show those who actually signed!
    });

    if (pmWmSigs.length > 0) {
      signaturesHtml = `
        <div style="display: flex; justify-content: center; gap: 40px; text-align: center; margin-top: 15px; page-break-inside: avoid;">
          ${pmWmSigs.map(sig => `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: space-between; min-height: 100px; min-width: 180px; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 12px; background: #fff;">
              <div>
                <div style="font-size: 11.5px; font-weight: 900; color: #0f172a;">${sig.title}</div>
                <div style="font-size: 10.5px; font-weight: 700; color: #334155; margin-top: 2px;">${sig.name}</div>
                <div style="font-size: 9.5px; color: #64748b;">${sig.orgName}</div>
              </div>
              <div style="height: 44px; display: flex; align-items: center; justify-content: center; margin: 3px 0;">
                ${sig.signature ? `<img src="${sig.signature}" style="max-height: 40px; max-width: 130px; object-fit: contain;" alt="امضا" />` : `<div style="font-size: 9px; color: #94a3b8; border-bottom: 1px dotted #94a3b8; width: 100px; text-align: center;">محل امضا</div>`}
              </div>
              <div style="font-size: 9px; color: #64748b;">تاریخ: ${sig.date}</div>
            </div>
          `).join('')}
        </div>
      `;
    } else {
      signaturesHtml = `
        <div style="display: flex; justify-content: center; text-align: center; margin-top: 15px; page-break-inside: avoid;">
          <div style="display: flex; flex-direction: column; align-items: center; justify-content: space-between; min-height: 90px; min-width: 220px; border: 1px dashed #cbd5e1; border-radius: 6px; padding: 6px 14px; background: #fff;">
            <div style="font-size: 11.5px; font-weight: 900; color: #0f172a;">سرپرست کارگاه / مدیر پروژه</div>
            <div style="font-size: 10px; color: #475569; margin-top: 2px;">${senderOrg?.name || 'سازمان صادرکننده'}</div>
            <div style="font-size: 9px; color: #94a3b8; border-bottom: 1px dotted #cbd5e1; width: 140px; margin-top: 15px;">محل امضا و مهر رسمی</div>
          </div>
        </div>
      `;
    }
  } else if (distinctSignatures.length > 0) {
    signaturesHtml = `
      <div style="display: grid; grid-template-columns: repeat(${Math.min(distinctSignatures.length, 3)}, 1fr); gap: 14px; text-align: center; margin-top: 15px; page-break-inside: avoid;">
        ${distinctSignatures.slice(0, 3).map(sig => `
          <div style="display: flex; flex-direction: column; align-items: center; justify-content: space-between; min-height: 100px; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 10px; background: #fff;">
            <div>
              <div style="font-size: 11px; font-weight: 900; color: #0f172a;">${sig.title}</div>
              <div style="font-size: 10px; font-weight: 700; color: #334155; margin-top: 2px;">${sig.name}</div>
              <div style="font-size: 9px; color: #64748b;">${sig.orgName}</div>
            </div>
            <div style="height: 44px; display: flex; align-items: center; justify-content: center; margin: 3px 0;">
              ${sig.signature ? `<img src="${sig.signature}" style="max-height: 40px; max-width: 120px; object-fit: contain;" alt="امضا" />` : `<div style="font-size: 9px; color: #94a3b8; border-bottom: 1px dotted #94a3b8; width: 100px; text-align: center;">محل امضا</div>`}
            </div>
            <div style="font-size: 9px; color: #64748b;">تاریخ: ${sig.date}</div>
          </div>
        `).join('')}
      </div>
    `;
  } else {
    signaturesHtml = `
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; text-align: center; margin-top: 15px; page-break-inside: avoid;">
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: space-between; min-height: 85px; border: 1px dashed #cbd5e1; border-radius: 6px; padding: 6px 10px; background: #fff;">
          <div style="font-size: 11px; font-weight: 900; color: #0f172a;">تنظیم‌کننده / کارشناس مسئول</div>
          <div style="font-size: 10px; color: #475569;">${letter.senderUserFullName || 'نام کارشناس'}</div>
          <div style="font-size: 9px; color: #94a3b8; border-bottom: 1px dotted #cbd5e1; width: 120px; margin-top: 15px;">محل امضا و مهر</div>
        </div>
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: space-between; min-height: 85px; border: 1px dashed #cbd5e1; border-radius: 6px; padding: 6px 10px; background: #fff;">
          <div style="font-size: 11px; font-weight: 900; color: #0f172a;">مدیر پروژه / سرپرست کارگاه</div>
          <div style="font-size: 10px; color: #475569;">${senderOrg?.name || 'سازمان صادرکننده'}</div>
          <div style="font-size: 9px; color: #94a3b8; border-bottom: 1px dotted #cbd5e1; width: 120px; margin-top: 15px;">محل امضا و مهر</div>
        </div>
      </div>
    `;
  }

  // Receiver representation
  const receiverOrgDisplay = letter.receiverOrgName || (letter.receiverOrgId ? SystemAdminService.getOrganization(letter.receiverOrgId)?.name : '');
  const receiverJobDisplay = letter.receiverJobTitle || letter.receiverTitle || '';
  const receiverNameDisplay = letter.receiverNameTitle || '';

  const receiverDisplay = [receiverOrgDisplay, receiverJobDisplay, receiverNameDisplay].filter(Boolean).join(' - ') || 'مقام محترم گیرنده';

  const projectLogos = SystemAdminService.getProjectOrgLogos(project);
  const senderLogo = senderOrg?.logo;
  const headerLogoHtml = senderLogo
    ? `<img src="${senderLogo}" style="height: 48px; max-width: 120px; object-fit: contain;" alt="${senderOrg?.name || 'لوگو'}" />`
    : [
        projectLogos.employerLogo ? `<img src="${projectLogos.employerLogo}" style="height: 42px; max-width: 90px; object-fit: contain;" alt="کارفرما" />` : '',
        projectLogos.consultantLogo ? `<img src="${projectLogos.consultantLogo}" style="height: 42px; max-width: 90px; object-fit: contain;" alt="مشاور" />` : '',
        projectLogos.contractorLogo ? `<img src="${projectLogos.contractorLogo}" style="height: 42px; max-width: 90px; object-fit: contain;" alt="پیمانکار" />` : ''
      ].filter(Boolean).join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html dir="rtl" lang="fa">
      <head>
        <meta charset="utf-8" />
        <title>نامه رسمی - ${letter.letterNumber || letter.subject || 'مکاتبه'}</title>
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
            ${headerLogoHtml || '<div class="logo-box"></div>'}
            <h1 style="margin: 0; color: #1e40af; font-size: 22px;">سامانه مدیریت پروژه همیار</h1>
          </div>
          <div style="text-align: left; font-size: 11px;">
            <p style="margin: 0;">تاریخ چاپ: ${new Date().toLocaleDateString("fa-IR")}</p>
            <p style="margin: 0;">نسخه: ۱.۴.۰</p>
          </div>
        </div>

        <!-- Content -->
        <div class="content">
          <!-- Project & Letter Banner -->
          <div style="border-bottom: 2px solid #1e40af; padding-bottom: 15px; margin-bottom: 20px;">
            <h2 style="margin: 0; color: #1e40af; text-align: center; font-size: 18px;">
              ${letter.scope === 'INTERNAL' ? 'مکاتبه درون‌سازمانی' : 'مکاتبه برون‌سازمانی'} (${letterTypeLabel})
            </h2>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 15px; font-size: 12px; background: #f8fafc; padding: 10px; border-radius: 8px; border: 1px solid #e2e8f0;">
              <div><strong>پروژه:</strong> ${projectTitle}</div>
              <div><strong>شماره پیمان:</strong> ${contractNumber}</div>
              <div><strong>کارفرما:</strong> ${employerName}</div>
              <div><strong>مشاور:</strong> ${consultantName}</div>
              <div><strong>پیمانکار:</strong> ${contractorName}</div>
              <div><strong>صادرکننده:</strong> ${senderOrg?.name || 'سازمان صادرکننده'}</div>
            </div>
          </div>

          <!-- Letter Meta Table -->
          <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px;">
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; width: 20%; background: #f8fafc;">شماره نامه:</td>
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; color: #1e40af; width: 30%;">${letter.letterNumber || '---'}</td>
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; width: 20%; background: #f8fafc;">تاریخ:</td>
              <td style="padding: 8px; border: 1px solid #ddd; width: 30%;">${letter.date || '---'}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background: #f8fafc;">فرستنده:</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${senderOrg?.name || ''} ${letter.senderUserFullName ? `(${letter.senderUserFullName})` : ''}</td>
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background: #f8fafc;">گیرنده:</td>
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${receiverDisplay}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background: #f8fafc;">اولویت / طبقه‌بندی:</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${priorityLabel} / ${confidentialityLabel}</td>
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background: #f8fafc;">پیوست / اندیکاتور:</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${letter.hasAttachment ? 'دارد' : 'ندارد'}${letter.indicatorNumber ? ` (اندیکاتور: ${letter.indicatorNumber})` : ''}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background: #f8fafc;">موضوع نامه:</td>
              <td colspan="3" style="padding: 8px; border: 1px solid #ddd; font-weight: bold; color: #0f172a;">
                ${letter.subject || 'بدون موضوع'}
                ${letter.attentionTo ? `<span style="font-size: 11px; font-weight: normal; color: #475569; margin-right: 8px;">(پیرو / عطف به: ${letter.attentionTo})</span>` : ''}
              </td>
            </tr>
          </table>

          <!-- Letter Text Content -->
          <div style="margin-top: 20px;">
            <h3 style="border-bottom: 2px solid #1e40af; padding-bottom: 5px; color: #1e40af; font-size: 13px; font-weight: bold;">متن مکاتبه</h3>
            <div style="padding: 16px; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; min-height: 220px; font-size: ${letter.fontSize || '13px'}; font-family: ${letter.fontFamily || 'Vazir'}, Tahoma, sans-serif; line-height: 2; text-align: justify; color: #1e293b;">
              ${letter.content}
            </div>
          </div>

          <!-- Attachments & Transcripts -->
          ${attachmentsHtml}
          ${transcriptsHtml}
        </div>

        <!-- Footer / Signatures -->
        <div class="footer">
          ${signaturesHtml}
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
};
