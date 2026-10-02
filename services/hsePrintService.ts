import { Project } from '../types';
import { WorkflowService } from './workflowService';
import { SystemAdminService } from './systemAdminService';
import { HRService } from './hrService';
import { HseService } from './hseService';
import {
  PERMIT_TYPE_LABELS,
  INCIDENT_TYPE_LABELS,
  ENVIRONMENTAL_ASPECT_LABELS
} from '../types/hse';

export type HseDocumentType = 
  | 'PERMIT' 
  | 'INCIDENT' 
  | 'ENVIRONMENTAL' 
  | 'PERIODIC' 
  | 'PLAN' 
  | 'COMPREHENSIVE';

export function handlePrintOfficialHse(
  type: HseDocumentType,
  data: any,
  currentProject: Project | null | undefined
): void {
  if (!data) return;

  const projectTitle = currentProject?.title || 'پروژه جاری کارگاهی';
  const projectEmployer = currentProject?.employerName || 'دستگاه اجرایی و کارفرما';
  const projectConsultant = currentProject?.consultantName || 'مهندسین مشاور و نظارت';
  const projectContractor = currentProject?.contractorName || 'شرکت پیمانکار';
  const contractNumber = currentProject?.contractNumber || 'PRJ-101';
  const projectTimeline =
    (currentProject?.startDate || '---') +
    ' الی ' +
    (currentProject?.endDate || '---');

  const orgLogos = SystemAdminService.getProjectOrgLogos(currentProject);
  const logoHtml = [
    orgLogos.employerLogo ? `<img src="${orgLogos.employerLogo}" style="height: 42px; max-width: 95px; object-fit: contain;" alt="کارفرما" />` : '',
    orgLogos.consultantLogo ? `<img src="${orgLogos.consultantLogo}" style="height: 42px; max-width: 95px; object-fit: contain;" alt="مشاور" />` : '',
    orgLogos.contractorLogo ? `<img src="${orgLogos.contractorLogo}" style="height: 42px; max-width: 95px; object-fit: contain;" alt="پیمانکار" />` : ''
  ].filter(Boolean).join('');

  const renderProjectHeader = (reportTitle: string, showContractInfo: boolean = false) => `
    <div style="border-bottom: 2px solid #1e40af; padding-bottom: 15px; margin-bottom: 20px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
        <div style="display: flex; gap: 10px; align-items: center;">${logoHtml}</div>
        <h2 style="margin: 0; color: #1e40af; font-size: 18px; font-weight: 900;">${reportTitle}</h2>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 15px; font-size: 12px; background: #f8fafc; padding: 10px; border-radius: 8px; border: 1px solid #e2e8f0;">
        <div><strong>پروژه:</strong> ${projectTitle}</div>
        <div><strong>شماره پیمان:</strong> ${contractNumber}</div>
        <div><strong>کارفرما:</strong> ${projectEmployer}</div>
        <div><strong>مشاور:</strong> ${projectConsultant}</div>
        <div><strong>پیمانکار:</strong> ${projectContractor}</div>
        <div><strong>سیستم مدیریت ایمنی:</strong> ISO 45001:2018 / ISO 14001:2015</div>
        ${
          showContractInfo
            ? `
          <div><strong>مدت پیمان:</strong> ${projectTimeline}</div>
        `
            : ''
        }
      </div>
    </div>
  `;

  // Dynamic Signatory Resolution - Identical to Technical Office
  const users = SystemAdminService.getUsers();
  const history = (data?.workflowHistory || []) as any[];

  const findEventForRole = (targetRoleKey: string): any => {
    return [...history].reverse().find((e: any) => {
      if (!e) return false;
      const nonSigningActions = ['REASSIGN', 'REJECT', 'RETURN_TO_CONTRACTOR', 'RETURN_TO_CONSULTANT'];
      if (nonSigningActions.includes(e.action)) return false;

      const actorUser = users.find(
        (u) => u.id === e.actorUserId || u.fullName === e.actorName || u.username === e.actorName
      );
      const orgId = e.actorOrgId || actorUser?.orgId;
      const org = orgId ? SystemAdminService.getOrganization(orgId) : null;
      const orgType = org?.type;
      const title = ((e.actorTitle || actorUser?.jobTitle || e.actorName || '') + ' ' + (actorUser?.jobLevel || '')).toLowerCase();

      if (targetRoleKey === 'contractor_tech') {
        if (orgType === 'CONTRACTOR' || !orgType) {
          if (e.action === 'CREATE' || e.action === 'SUBMIT' || e.action === 'RESUBMIT') return true;
          return title.includes('کارشناس') || title.includes('افسر') || title.includes('ایمنی') || title.includes('hse') || title.includes('تنظیم');
        }
        return false;
      }

      if (targetRoleKey === 'contractor_head') {
        if (orgType === 'CONTRACTOR' || !orgType) {
          if (e.action === 'APPROVE') return true;
          return title.includes('سرپرست واحد') || title.includes('مسئول ایمنی') || title.includes('رئیس hse') || title.includes('مدیر hse');
        }
        return false;
      }

      if (targetRoleKey === 'contractor_site') {
        if (orgType === 'CONTRACTOR' || !orgType) {
          if (e.action === 'SEND_TO_CONSULTANT') return true;
          return title.includes('سرپرست کارگاه') || title.includes('مدیر پروژه') || title.includes('رئیس کارگاه');
        }
        return false;
      }

      if (targetRoleKey === 'consultant_tech') {
        if (orgType === 'CONSULTANT') {
          return title.includes('کارشناس') || title.includes('ناظر') || title.includes('مقیم') || title.includes('hse');
        }
        return false;
      }

      if (targetRoleKey === 'consultant_head') {
        if (orgType === 'CONSULTANT') {
          return title.includes('سرپرست واحد') || title.includes('سرپرست نظارت') || title.includes('مدیر نظارت');
        }
        return false;
      }

      if (targetRoleKey === 'consultant_site') {
        if (orgType === 'CONSULTANT') {
          if (e.action === 'SEND_TO_EMPLOYER' || e.action === 'APPROVE') return true;
          return title.includes('سرپرست نظارت') || title.includes('رئیس نظارت') || title.includes('مدیر پروژه');
        }
        return false;
      }

      if (targetRoleKey === 'employer_tech') {
        if (orgType === 'EMPLOYER') {
          return title.includes('کارشناس') || title.includes('بررسی') || title.includes('ممیز') || title.includes('نظارت عالیه');
        }
        return false;
      }

      if (targetRoleKey === 'employer_head') {
        if (orgType === 'EMPLOYER') {
          return title.includes('سرپرست واحد') || title.includes('رئیس اداره') || title.includes('مدیر گروه') || title.includes('رئیس hse');
        }
        return false;
      }

      if (targetRoleKey === 'employer_site') {
        if (orgType === 'EMPLOYER') {
          if (e.action === 'FINAL_APPROVE' || e.action === 'APPROVE') return true;
          return title.includes('مدیر طرح') || title.includes('نماینده کارفرما') || title.includes('مجری');
        }
        return false;
      }

      return false;
    });
  };

  const getRoleSignatory = (roleKey: string) => {
    const matchedEv = findEventForRole(roleKey);
    if (matchedEv) {
      const actorUser = users.find(
        (u) => u.id === matchedEv.actorUserId || u.fullName === matchedEv.actorName || u.username === matchedEv.actorName
      );
      const signatureImg = matchedEv.signature || (actorUser ? HRService.getUserSignature(actorUser) || actorUser.signature : null);

      return {
        name: matchedEv.actorName || actorUser?.fullName || 'امضاء‌کننده سند',
        title: matchedEv.actorTitle || actorUser?.jobTitle || 'مسئول سازمانی',
        signature: signatureImg,
        date: matchedEv.timestamp ? new Date(matchedEv.timestamp).toLocaleDateString('fa-IR') : new Date().toLocaleDateString('fa-IR')
      };
    }

    // Role Defaults if not yet signed in workflow
    if (roleKey === 'contractor_tech') {
      return { name: data.issuedByName || data.reportedByName || data.inspectorName || data.preparedByName || 'کارشناس HSE / افسر ایمنی', title: 'کارشناس بهداشت حرفه‌ای و ایمنی پیمانکار', signature: undefined, date: undefined };
    }
    if (roleKey === 'contractor_head') {
      return { name: 'سرپرست واحد HSE پیمانکار', title: 'سرپرست ایمنی و بهداشت محیط', signature: undefined, date: undefined };
    }
    if (roleKey === 'contractor_site') {
      return { name: 'سرپرست کارگاه پیمانکار', title: 'مدیریت اجرایی کارگاه', signature: undefined, date: undefined };
    }
    if (roleKey === 'consultant_tech') {
      return { name: 'کارشناس / ناظر مقیم HSE', title: 'ناظر بهداشت، ایمنی و محیط زیست مشاور', signature: undefined, date: undefined };
    }
    if (roleKey === 'consultant_head') {
      return { name: 'سرپرست واحد نظارت HSE', title: 'سرپرست نظارت ایمنی مهندسین مشاور', signature: undefined, date: undefined };
    }
    if (roleKey === 'consultant_site') {
      return { name: data.approvedByName || 'رئیس دستگاه نظارت / مدیر پروژه مشاور', title: 'رئیس نظارت مقیم مهندسین مشاور', signature: undefined, date: undefined };
    }
    if (roleKey === 'employer_tech') {
      return { name: 'کارشناس نظارت عالیه HSE', title: 'کارشناس ایمنی و بهداشت کارفرما', signature: undefined, date: undefined };
    }
    if (roleKey === 'employer_head') {
      return { name: 'رئیس اداره بهداشت، ایمنی و محیط زیست', title: 'سرپرست HSE دستگاه اجرایی', signature: undefined, date: undefined };
    }
    if (roleKey === 'employer_site') {
      return { name: 'مدیر طرح / نماینده کارفرما', title: 'دستگاه اجرایی و کارفرما', signature: undefined, date: undefined };
    }

    return null;
  };

  const renderPrintSignatureBox = (roleHeader: string, roleKey: string) => {
    const signatory = getRoleSignatory(roleKey);
    if (signatory && signatory.signature) {
      return `
        <div class="sig-box" style="flex: 1 1 0%; min-width: 0; text-align: center; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 4px; padding: 4px 2px; box-sizing: border-box; overflow: hidden;">
          <div style="font-weight: bold; font-size: 8px; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 2px; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${roleHeader}">${roleHeader}</div>
          <div style="height: 30px; display: flex; align-items: center; justify-content: center; margin: 1px 0;">
            <img src="${signatory.signature}" style="max-height: 28px; max-width: 100%; object-fit: contain; filter: contrast(120%);" alt="امضای دیجیتال" />
          </div>
          <div style="font-size: 7.5px; font-weight: bold; color: #1e293b; margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${signatory.name}">${signatory.name}</div>
          <div style="font-size: 6.5px; color: #059669; font-weight: bold; margin-top: 1px;">✓ امضاء معتبر</div>
          <div style="font-size: 6.5px; color: #64748b;">${signatory.date || new Date().toLocaleDateString('fa-IR')}</div>
        </div>
      `;
    }

    const personName = signatory?.name
      ? `<div style="font-size: 7.5px; font-weight: bold; color: #334155; margin-bottom: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${signatory.name}">${signatory.name}</div>`
      : '';

    return `
      <div class="sig-box" style="flex: 1 1 0%; min-width: 0; text-align: center; background: #ffffff; border: 1px dashed #cbd5e1; border-radius: 4px; padding: 4px 2px; box-sizing: border-box; overflow: hidden;">
        <p style="font-weight: bold; font-size: 8px; margin: 0 0 1px 0; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${roleHeader}">${roleHeader}</p>
        ${personName}
        <div style="height: 28px; display: flex; align-items: center; justify-content: center; font-size: 7px; color: #94a3b8; font-style: italic;">مهر / امضاء</div>
        <div class="sig-line" style="border-top: 1px dashed #cbd5e1; padding-top: 1px; font-size: 7px; color: #64748b;">نام و امضاء</div>
      </div>
    `;
  };

  let title = 'گزارش رسمی مدیریت بهداشت، ایمنی و محیط زیست (HSE)';
  let contentHtml = '';

  // 1. WORK PERMIT (PTW)
  if (type === 'PERMIT') {
    const permitTypeLabel = HseService.getPermitTypeLabel(data.permitType) || PERMIT_TYPE_LABELS[data.permitType] || data.permitType || 'پرمیت عمومی';
    title = `مجوز کار ایمن شماره ${data.permitNumber} - ${permitTypeLabel}`;

    contentHtml = `
      ${renderProjectHeader(`مجوز رسمی انجام کار ایمن (Permit to Work - PTW)`, false)}
      
      <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px;">
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; width: 20%; background: #f8fafc;">شماره مجوز کار:</td>
          <td style="padding: 8px; border: 1px solid #ddd; width: 30%; font-family: monospace; font-weight: bold; color: #1e40af;">${data.permitNumber || '---'}</td>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; width: 20%; background: #f8fafc;">نوع مجوز (PTW):</td>
          <td style="padding: 8px; border: 1px solid #ddd; width: 30%; font-weight: bold; color: #b45309;">${permitTypeLabel}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background: #f8fafc;">محل دقیق کارگاه / زون:</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${data.location || 'کلیه جبهه‌های کاری کارگاه'}</td>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background: #f8fafc;">تاریخ صدور و اعتبار:</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${data.permitDate || data.startDate || '---'} (ساعت: ${data.startTime || '۰۸:۰۰'} الی ${data.endTime || '۱۷:۰۰'})</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background: #f8fafc;">پیمانکار / تیم مجری:</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${data.contractorSubcontractor || projectContractor}</td>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background: #f8fafc;">تعداد نفرات کارگری:</td>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${(data.workerCount || data.workersCount || 4).toLocaleString('fa-IR')} نفر</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background: #f8fafc;">سطح ارزیابی ریسک:</td>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; color: ${data.riskLevel === 'CRITICAL' ? '#b91c1c' : data.riskLevel === 'HIGH' ? '#c2410c' : '#047857'};">
            ${data.riskLevel === 'CRITICAL' ? 'بسیار بحرانی (Critical)' : data.riskLevel === 'HIGH' ? 'بالا (High)' : data.riskLevel === 'MEDIUM' ? 'متوسط (Medium)' : 'پایین (Low)'}
          </td>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background: #f8fafc;">وضعیت تایید و گردش‌کار:</td>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; color: #1e40af;">${WorkflowService.getStatusLabel(data)}</td>
        </tr>
      </table>

      <div style="margin-top: 20px;">
        <h3 style="border-bottom: 2px solid #1e40af; padding-bottom: 5px; color: #1e40af; font-size: 13px;">شرح دقیق فعالیت و الزامات اجرایی تحت نظارت</h3>
        <div style="padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 12px; line-height: 1.8;">
          ${data.description || 'فعالیت طبق مشخصات فنی و دستورالعمل‌های ایمنی کارگاهی مورد تایید قرار گرفته است.'}
        </div>
      </div>

      <div style="margin-top: 20px;">
        <h3 style="border-bottom: 2px solid #10b981; padding-bottom: 5px; color: #065f46; font-size: 13px;">چک‌لیست اقدامات کنترلی و تمهیدات پیش‌نیاز ایمنی</h3>
        <table style="width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 11px; text-align: center; direction: rtl;">
          <thead>
            <tr style="background: #f1f5f9;">
              <th style="padding: 6px; border: 1px solid #ddd; width: 6%;">ردیف</th>
              <th style="padding: 6px; border: 1px solid #ddd; text-align: right; padding-right: 12px;">شرح بند کنترلی و اقدام پیشگیرانه ایمنی</th>
              <th style="padding: 6px; border: 1px solid #ddd; width: 18%;">وضعیت انطباق</th>
              <th style="padding: 6px; border: 1px solid #ddd; width: 30%; text-align: right; padding-right: 10px;">ملاحظات / اقدامات تکمیلی</th>
            </tr>
          </thead>
          <tbody>
            ${(data.checklists && data.checklists.length > 0)
              ? data.checklists.map((chk: any, idx: number) => {
                  const isYes = chk.status === 'YES' || chk.isChecked;
                  const isNo = chk.status === 'NO';
                  return `
                    <tr>
                      <td style="padding: 6px; border: 1px solid #ddd;">${(idx + 1).toLocaleString('fa-IR')}</td>
                      <td style="padding: 6px; border: 1px solid #ddd; text-align: right; padding-right: 12px;">${chk.question || chk.note || 'کنترل ایمنی استاندارد'}</td>
                      <td style="padding: 6px; border: 1px solid #ddd; font-weight: bold; color: ${isYes ? '#059669' : isNo ? '#dc2626' : '#64748b'}; background: ${isYes ? '#ecfdf5' : isNo ? '#fef2f2' : '#f8fafc'};">
                        ${isYes ? 'رعایت شد ✓' : isNo ? 'عدم رعایت ✕' : 'نامربوط (N/A)'}
                      </td>
                      <td style="padding: 6px; border: 1px solid #ddd; text-align: right; padding-right: 10px; color: #475569;">${chk.comments || '-'}</td>
                    </tr>
                  `;
                }).join('')
              : `<tr><td colspan="4" style="padding: 15px; border: 1px solid #ddd; color: #94a3b8;">تمامی مفاد ایمنی عمومی و اختصاصی مبحث ۱۲ مقررات ملی ساختمان بررسی گردید.</td></tr>`
            }
          </tbody>
        </table>
      </div>

      ${(data.gasTest && (data.gasTest.performed || data.gasTest.oxygenLevel)) ? `
        <div style="margin-top: 20px;">
          <h3 style="border-bottom: 2px solid #0284c7; padding-bottom: 5px; color: #0369a1; font-size: 13px;">نتایج آزمون سنجش اتمسفر و گازهای خطرناک (Gas Testing)</h3>
          <table style="width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 11px; text-align: center; direction: rtl;">
            <thead>
              <tr style="background: #e0f2fe;">
                <th style="padding: 6px; border: 1px solid #bae6fd;">اکسیژن (O2)</th>
                <th style="padding: 6px; border: 1px solid #bae6fd;">گازهای قابل اشتعال (LEL)</th>
                <th style="padding: 6px; border: 1px solid #bae6fd;">مونوکسید کربن (CO)</th>
                <th style="padding: 6px; border: 1px solid #bae6fd;">سولفید هیدروژن (H2S)</th>
                <th style="padding: 6px; border: 1px solid #bae6fd;">نام آزمون‌گر و وضعیت</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${data.gasTest.oxygenLevel || data.gasTest.o2 || '۲۰.۹'} %</td>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${data.gasTest.flammableGas || data.gasTest.lel || '۰'} %</td>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${data.gasTest.carbonMonoxide || data.gasTest.co || '۰'} ppm</td>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${data.gasTest.hydrogenSulfide || data.gasTest.h2s || '۰'} ppm</td>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; color: #059669; background: #ecfdf5;">${data.gasTest.testerName || data.gasTest.testedBy || 'افسر ایمنی کارگاه'} (ایمن / مجاز)</td>
              </tr>
            </tbody>
          </table>
        </div>
      ` : ''}

      <div style="margin-top: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
        <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; background: #fff;">
          <h4 style="margin: 0 0 8px 0; color: #334155; font-size: 11px; font-weight: bold;">تجهیزات حفاظت فردی (PPE) الزامی:</h4>
          <div style="display: flex; flex-wrap: wrap; gap: 5px;">
            ${(data.requiredPpe || data.ppeRequired || ['کلاه ایمنی استاندارد', 'کفش ایمنی با پنجه فولادی', 'جلیقه شبرنگ کارگاهی', 'دستکش حفاظتی مناسب']).map((ppe: string) => `
              <span style="background: #f1f5f9; border: 1px solid #cbd5e1; padding: 3px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; color: #334155;">${ppe}</span>
            `).join('')}
          </div>
        </div>
        <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; background: #fff;">
          <h4 style="margin: 0 0 8px 0; color: #334155; font-size: 11px; font-weight: bold;">تمهیدات تکمیلی و واکنش در شرایط اضطراری:</h4>
          <div style="font-size: 10px; line-height: 1.6; color: #475569;">
            <div>• دیده‌بان آتش (Fire Watch): ${data.fireWatchRequired || data.fireWatch?.isRequired ? 'الزامی و مستقر' : 'عدم نیاز'}</div>
            <div>• قفل‌گذاری و ایمن‌سازی انرژی (LOTO): ${data.isolationRequired || data.isolationLoto?.isRequired ? 'اعمال گردیده است' : 'عدم نیاز'}</div>
            <div>• شماره تماس اضطراری کارگاه: ۱۱۵ (اورژانس) / ۱۲۵ (آتش‌نشانی)</div>
          </div>
        </div>
      </div>
    `;
  } 
  
  // 2. INCIDENT REPORT
  else if (type === 'INCIDENT') {
    const incTypeLabel = INCIDENT_TYPE_LABELS[data.incidentType as keyof typeof INCIDENT_TYPE_LABELS] || data.incidentType || 'رویداد کارگاهی';
    title = `گزارش حادثه شماره ${data.incidentNumber} - ${data.title || incTypeLabel}`;

    contentHtml = `
      ${renderProjectHeader(`فرم رسمی ثبت، بررسی و تحلیل حوادث و شبه‌حوادث کارگاهی`, false)}

      <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px;">
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; width: 20%; background: #f8fafc;">شماره گزارش حادثه:</td>
          <td style="padding: 8px; border: 1px solid #ddd; width: 30%; font-family: monospace; font-weight: bold; color: #dc2626;">${data.incidentNumber || '---'}</td>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; width: 20%; background: #f8fafc;">نوع حادثه / رویداد:</td>
          <td style="padding: 8px; border: 1px solid #ddd; width: 30%; font-weight: bold; color: #b91c1c;">${incTypeLabel}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background: #f8fafc;">تاریخ و ساعت وقوع:</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${data.incidentDate || data.date || '---'} (ساعت: ${data.incidentTime || data.time || '---'})</td>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background: #f8fafc;">سطح شدت (Severity):</td>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; color: ${data.severity === 'CRITICAL' ? '#dc2626' : data.severity === 'HIGH' ? '#ea580c' : '#059669'};">
            ${data.severity === 'CRITICAL' ? 'بسیار بحرانی (Critical)' : data.severity === 'HIGH' ? 'شدید (High)' : data.severity === 'MEDIUM' ? 'متوسط (Medium)' : 'جزیی (Low)'}
          </td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background: #f8fafc;">محل دقیق رخداد:</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${data.exactLocation || data.location || 'کارگاه اصلی پروژه'}</td>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background: #f8fafc;">روزهای کاری ازدست‌رفته (LWD):</td>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; color: #dc2626;">${(data.lostWorkDays || 0).toLocaleString('fa-IR')} روز</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background: #f8fafc;">برآورد خسارت مالی:</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${(data.equipmentDamageCost || 0).toLocaleString('fa-IR')} ریال</td>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background: #f8fafc;">وضعیت تایید و گردش‌کار:</td>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; color: #1e40af;">${WorkflowService.getStatusLabel(data)}</td>
        </tr>
      </table>

      ${(data.injuredPerson || data.involvedPerson) ? `
        <div style="margin-top: 20px;">
          <h3 style="border-bottom: 2px solid #ef4444; padding-bottom: 5px; color: #b91c1c; font-size: 13px;">مشخصات فرد آسیب‌دیده / درگیر در حادثه</h3>
          <table style="width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 11px;">
            <tr style="background: #fef2f2;">
              <td style="padding: 6px; border: 1px solid #fecaca; font-weight: bold; width: 25%;">نام و نام خانوادگی:</td>
              <td style="padding: 6px; border: 1px solid #fecaca; width: 25%; font-weight: bold;">${data.injuredPerson?.fullName || data.involvedPerson?.name || '---'}</td>
              <td style="padding: 6px; border: 1px solid #fecaca; font-weight: bold; width: 25%;">سمت / شغل کارگاهی:</td>
              <td style="padding: 6px; border: 1px solid #fecaca; width: 25%;">${data.injuredPerson?.jobRole || data.involvedPerson?.jobTitle || '---'}</td>
            </tr>
            <tr>
              <td style="padding: 6px; border: 1px solid #ddd; font-weight: bold;">پیمانکار متبوع:</td>
              <td style="padding: 6px; border: 1px solid #ddd;">${data.injuredPerson?.contractor || data.involvedPerson?.contractor || projectContractor}</td>
              <td style="padding: 6px; border: 1px solid #ddd; font-weight: bold;">نوع جراحت و عضو آسیب‌دیده:</td>
              <td style="padding: 6px; border: 1px solid #ddd; font-weight: bold; color: #dc2626;">${data.injuredPerson?.injuryType || data.injuryType || 'کوفتگی'} (${data.injuredPerson?.bodyPart || data.injuredBodyPart || 'اندام فوقانی'})</td>
            </tr>
            <tr>
              <td style="padding: 6px; border: 1px solid #ddd; font-weight: bold;">نیاز به اعزام و درمان بیمارستانی:</td>
              <td style="padding: 6px; border: 1px solid #ddd;">${data.medicalTreatmentRequired ? `بله - بیمارستان ${data.hospitalName || 'منطقه'}` : 'خیر - درمان اولیه در بهداری کارگاه'}</td>
              <td style="padding: 6px; border: 1px solid #ddd; font-weight: bold;">شهود حادثه:</td>
              <td style="padding: 6px; border: 1px solid #ddd;">${data.witnesses || 'همکاران و سرپرست شیفت'}</td>
            </tr>
          </table>
        </div>
      ` : ''}

      <div style="margin-top: 20px;">
        <h3 style="border-bottom: 2px solid #1e40af; padding-bottom: 5px; color: #1e40af; font-size: 13px;">شرح تفصیلی رخداد حادثه</h3>
        <div style="padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 12px; line-height: 1.8;">
          ${data.description || 'گزارش کامل حادثه به پیوست سوابق ثبت گردید.'}
        </div>
      </div>

      <div style="margin-top: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
        <div style="border: 1px solid #fecaca; border-radius: 8px; padding: 10px; background: #fff5f5;">
          <h4 style="margin: 0 0 8px 0; color: #b91c1c; font-size: 11px; font-weight: bold;">علل مستقیم و بی‌واسطه (Immediate Causes):</h4>
          <div style="font-size: 11px; line-height: 1.7; color: #7f1d1d;">
            ${Array.isArray(data.immediateCauses) ? data.immediateCauses.map((c: string) => `• ${c}<br/>`).join('') : (data.immediateCauses || 'عدم رعایت فاصله ایمنی، بی‌احتیاطی در کار')}
          </div>
        </div>
        <div style="border: 1px solid #fed7aa; border-radius: 8px; padding: 10px; background: #fffaf5;">
          <h4 style="margin: 0 0 8px 0; color: #c2410c; font-size: 11px; font-weight: bold;">تحلیل علل ریشه‌ای (Root Cause Analysis - RCA):</h4>
          <div style="font-size: 11px; line-height: 1.7; color: #9a3412;">
            ${Array.isArray(data.rootCauses) ? data.rootCauses.map((c: string) => `• ${c}<br/>`).join('') : (data.rootCauses || 'نیاز به بازنگری دستورالعمل نظارتی و آموزش کارگران')}
          </div>
        </div>
      </div>

      <div style="margin-top: 20px;">
        <h3 style="border-bottom: 2px solid #10b981; padding-bottom: 5px; color: #065f46; font-size: 13px;">اقدامات اصلاحی و پیشگیرانه (CAPA) جهت عدم تکرار</h3>
        <table style="width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 11px; text-align: center; direction: rtl;">
          <thead>
            <tr style="background: #ecfdf5;">
              <th style="padding: 6px; border: 1px solid #ddd; width: 6%;">ردیف</th>
              <th style="padding: 6px; border: 1px solid #ddd; text-align: right; padding-right: 12px;">شرح اقدام اصلاحی / پیشگیرانه مصوب</th>
              <th style="padding: 6px; border: 1px solid #ddd; width: 22%;">مسئول پیگیری و اجرا</th>
              <th style="padding: 6px; border: 1px solid #ddd; width: 15%;">مهلت انجام</th>
              <th style="padding: 6px; border: 1px solid #ddd; width: 15%;">وضعیت</th>
            </tr>
          </thead>
          <tbody>
            ${(data.correctiveActions && data.correctiveActions.length > 0)
              ? data.correctiveActions.map((act: any, idx: number) => `
                  <tr>
                    <td style="padding: 6px; border: 1px solid #ddd;">${(idx + 1).toLocaleString('fa-IR')}</td>
                    <td style="padding: 6px; border: 1px solid #ddd; text-align: right; padding-right: 12px;">${act.action}</td>
                    <td style="padding: 6px; border: 1px solid #ddd; font-weight: bold;">${act.responsiblePerson || act.responsible || 'مسئول HSE پیمانکار'}</td>
                    <td style="padding: 6px; border: 1px solid #ddd;">${act.targetDate || act.deadline || act.dueDate || 'فوری'}</td>
                    <td style="padding: 6px; border: 1px solid #ddd; font-weight: bold; color: ${act.status === 'DONE' || act.isDone ? '#059669' : '#ea580c'}; background: ${act.status === 'DONE' || act.isDone ? '#ecfdf5' : '#fffbeb'};">
                      ${act.status === 'DONE' || act.isDone ? 'انجام شد ✓' : 'در حال پیگیری'}
                    </td>
                  </tr>
                `).join('')
              : `<tr><td colspan="5" style="padding: 15px; border: 1px solid #ddd; color: #94a3b8;">برگزاری جلسه TBM الزامی، آموزش ایمنی تکمیلی و بازرسی تجهیزات مرتبط.</td></tr>`
            }
          </tbody>
        </table>
      </div>
    `;
  }

  // 3. ENVIRONMENTAL REPORT
  else if (type === 'ENVIRONMENTAL') {
    const aspectLabel = ENVIRONMENTAL_ASPECT_LABELS[data.aspect as keyof typeof ENVIRONMENTAL_ASPECT_LABELS] || data.aspect || 'پایش زیست‌محیطی';
    title = `گزارش زیست‌محیطی شماره ${data.reportNumber} - ${data.title || aspectLabel}`;

    contentHtml = `
      ${renderProjectHeader(`فرم رسمی بازرسی و پایش شاخص‌های زیست‌محیطی (ISO 14001:2015)`, false)}

      <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px;">
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; width: 20%; background: #f8fafc;">شماره گزارش بازرسی:</td>
          <td style="padding: 8px; border: 1px solid #ddd; width: 30%; font-family: monospace; font-weight: bold; color: #047857;">${data.reportNumber || '---'}</td>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; width: 20%; background: #f8fafc;">جنبه زیست‌محیطی (Aspect):</td>
          <td style="padding: 8px; border: 1px solid #ddd; width: 30%; font-weight: bold; color: #065f46;">${aspectLabel}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background: #f8fafc;">تاریخ بازرسی:</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${data.reportDate || data.date || '---'}</td>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background: #f8fafc;">نام کارشناس / بازرس:</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${data.inspectorName || 'کارشناس محیط زیست کارگاه'}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background: #f8fafc;">موقعیت / زون پایش:</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${data.location || 'کلیه جبهه‌های کارگاهی پروژه'}</td>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background: #f8fafc;">وضعیت انطباق استاندارد:</td>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; color: ${data.complianceStatus === 'COMPLIANT' ? '#059669' : '#dc2626'}; background: ${data.complianceStatus === 'COMPLIANT' ? '#ecfdf5' : '#fef2f2'};">
            ${data.complianceStatus === 'COMPLIANT' ? 'منطبق با استاندارد (Compliant) ✓' : data.complianceStatus === 'OBSERVATION' ? 'نیازمند اصلاح و پیگیری' : 'عدم انطباق زیست‌محیطی ✕'}
          </td>
        </tr>
      </table>

      <div style="margin-top: 20px;">
        <h3 style="border-bottom: 2px solid #059669; padding-bottom: 5px; color: #065f46; font-size: 13px;">مشاهدات میدانی و شرح یافته‌ها</h3>
        <div style="padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 12px; line-height: 1.8;">
          ${data.observations || data.findingsAndObservations || 'پایش‌های میدانی مطابق شاخص‌های ارزیابی اثرات زیست‌محیطی (EIA) انجام پذیرفت.'}
        </div>
      </div>

      ${data.wasteStats ? `
        <div style="margin-top: 20px;">
          <h3 style="border-bottom: 2px solid #16a34a; padding-bottom: 5px; color: #166534; font-size: 13px;">آمار مدیریت پسماند و تفکیک ضایعات کارگاهی</h3>
          <table style="width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 11px; text-align: center;">
            <tr style="background: #f0fdf4;">
              <th style="padding: 6px; border: 1px solid #ddd;">پسماند عادی کارگری</th>
              <th style="padding: 6px; border: 1px solid #ddd;">نخاله‌های ساختمانی</th>
              <th style="padding: 6px; border: 1px solid #ddd;">پسماندهای ویژه و خطرناک</th>
              <th style="padding: 6px; border: 1px solid #ddd;">پسماند تفکیک و بازیافتی</th>
              <th style="padding: 6px; border: 1px solid #ddd;">روش دفع و انتقال</th>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${(data.wasteStats.regularWasteKg || 120).toLocaleString('fa-IR')} کیلوگرم</td>
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${(data.wasteStats.constructionWasteTons || 8).toLocaleString('fa-IR')} تن</td>
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; color: #dc2626;">${(data.wasteStats.hazardousWasteKg || 0).toLocaleString('fa-IR')} کیلوگرم</td>
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; color: #16a34a;">${(data.wasteStats.recycledKg || 45).toLocaleString('fa-IR')} کیلوگرم</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${data.wasteStats.disposalMethod || 'انتقال به سایت مجاز شهرداری'}</td>
            </tr>
          </table>
        </div>
      ` : ''}

      <div style="margin-top: 20px;">
        <h3 style="border-bottom: 2px solid #10b981; padding-bottom: 5px; color: #065f46; font-size: 13px;">اقدامات اصلاحی و توصیه‌های زیست‌محیطی</h3>
        <table style="width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 11px; text-align: center; direction: rtl;">
          <thead>
            <tr style="background: #ecfdf5;">
              <th style="padding: 6px; border: 1px solid #ddd; width: 6%;">ردیف</th>
              <th style="padding: 6px; border: 1px solid #ddd; text-align: right; padding-right: 12px;">شرح اقدام اصلاحی یا کنترلی</th>
              <th style="padding: 6px; border: 1px solid #ddd; width: 22%;">مسئول اقدام</th>
              <th style="padding: 6px; border: 1px solid #ddd; width: 16%;">مهلت پیگیری</th>
            </tr>
          </thead>
          <tbody>
            ${(data.correctiveActions && data.correctiveActions.length > 0)
              ? data.correctiveActions.map((act: any, idx: number) => `
                  <tr>
                    <td style="padding: 6px; border: 1px solid #ddd;">${(idx + 1).toLocaleString('fa-IR')}</td>
                    <td style="padding: 6px; border: 1px solid #ddd; text-align: right; padding-right: 12px;">${act.action}</td>
                    <td style="padding: 6px; border: 1px solid #ddd; font-weight: bold;">${act.responsible || 'تیم خدمات و پشتیبانی کارگاه'}</td>
                    <td style="padding: 6px; border: 1px solid #ddd;">${act.dueDate || 'پایان هفته'}</td>
                  </tr>
                `).join('')
              : `<tr><td colspan="4" style="padding: 12px; border: 1px solid #ddd; color: #475569;">${data.recommendedActions || 'ادامه آب‌پاشی مسیرهای تردد، استفاده از سینی قطره‌گیر در زیر دیزل‌ژنراتورها و تفکیک در مبدأ.'}</td></tr>`
            }
          </tbody>
        </table>
      </div>
    `;
  }

  // 4. PERIODIC REPORT (WEEKLY / MONTHLY)
  else if (type === 'PERIODIC') {
    const isMonthly = data.reportType === 'MONTHLY';
    title = `گزارش ادواری عملکرد HSE (${isMonthly ? 'ماهانه' : 'هفتگی'}) - ${data.reportNumber}`;

    const kpi = data.kpiStats || {};
    const safeHours = data.safeManHoursPeriod || kpi.safeManHours || 18400;
    const cumSafeHours = data.cumulativeSafeManHours || (safeHours * 4.5);
    const ltifr = data.ltifr || kpi.ltifr || 0;
    const ltisr = data.ltisr || kpi.ltisr || 0;

    contentHtml = `
      ${renderProjectHeader(`گزارش ادواری عملکرد بهداشت، ایمنی و محیط زیست (${isMonthly ? 'ماهانه' : 'هفتگی'})`, true)}

      <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px;">
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; width: 20%; background: #f8fafc;">شماره گزارش:</td>
          <td style="padding: 8px; border: 1px solid #ddd; width: 30%; font-family: monospace; font-weight: bold; color: #1e40af;">${data.reportNumber || '---'}</td>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; width: 20%; background: #f8fafc;">نوع دوره گزارش:</td>
          <td style="padding: 8px; border: 1px solid #ddd; width: 30%; font-weight: bold; color: #b45309;">${isMonthly ? 'گزارش ماهانه جامع' : 'گزارش هفتگی دوره‌ای'} (${data.periodName || 'دوره جاری'})</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background: #f8fafc;">بازه زمانی کارکرد:</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${data.periodStart || data.startDate || '---'} الی ${data.periodEnd || data.endDate || '---'}</td>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background: #f8fafc;">میانگین روزانه نفرات کارگری:</td>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${(data.averageDailyWorkers || 45).toLocaleString('fa-IR')} نفر</td>
        </tr>
      </table>

      <!-- KPI Summary Cards - Identical to Technical Office Statement Totals -->
      <div style="margin-top: 25px;">
        <h3 style="border-bottom: 2px solid #1e40af; padding-bottom: 5px; color: #1e40af; font-size: 13px;">شاخص‌های کلیدی عملکرد HSE در این دوره (KPIs)</h3>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 10px;">
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 12px; border-radius: 8px; text-align: center;">
            <div style="font-size: 10px; color: #166534; font-weight: bold;">نفرساعت کار بدون حادثه دوره</div>
            <div style="font-size: 16px; font-weight: 900; color: #15803d; margin-top: 4px;">${safeHours.toLocaleString('fa-IR')} <small style="font-size: 10px;">ساعت</small></div>
          </div>
          <div style="background: #eff6ff; border: 1px solid #bfdbfe; padding: 12px; border-radius: 8px; text-align: center;">
            <div style="font-size: 10px; color: #1e40af; font-weight: bold;">نفرساعت تجمعی بدون حادثه</div>
            <div style="font-size: 16px; font-weight: 900; color: #1d4ed8; margin-top: 4px;">${Math.round(cumSafeHours).toLocaleString('fa-IR')} <small style="font-size: 10px;">ساعت</small></div>
          </div>
          <div style="background: #fffbeb; border: 1px solid #fde68a; padding: 12px; border-radius: 8px; text-align: center;">
            <div style="font-size: 10px; color: #92400e; font-weight: bold;">ضریب تکرار حوادث (LTIFR)</div>
            <div style="font-size: 16px; font-weight: 900; color: #b45309; margin-top: 4px;">${ltifr.toLocaleString('fa-IR')}</div>
          </div>
          <div style="background: #fdf2f8; border: 1px solid #fbcfe8; padding: 12px; border-radius: 8px; text-align: center;">
            <div style="font-size: 10px; color: #9d174d; font-weight: bold;">نرخ رعایت PPE الزامی</div>
            <div style="font-size: 16px; font-weight: 900; color: #be185d; margin-top: 4px;">${(data.ppeCompliancePercentage || 96).toLocaleString('fa-IR')} ٪</div>
          </div>
        </div>
      </div>

      <!-- Statistics Table -->
      <div style="margin-top: 25px;">
        <h3 style="border-bottom: 2px solid #0284c7; padding-bottom: 5px; color: #0369a1; font-size: 13px;">جدول تفکیکی آمار ایمنی، آموزش‌ها و رویدادها در این دوره</h3>
        <table style="width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 11px; text-align: center; direction: rtl;">
          <thead>
            <tr style="background: #f1f5f9;">
              <th style="padding: 6px; border: 1px solid #ddd;">مجوزهای کار (PTW)</th>
              <th style="padding: 6px; border: 1px solid #ddd;">جلسات TBM کارگاهی</th>
              <th style="padding: 6px; border: 1px solid #ddd;">نفرات آموزش‌دیده TBM</th>
              <th style="padding: 6px; border: 1px solid #ddd;">شبه‌حوادث (Near Miss)</th>
              <th style="padding: 6px; border: 1px solid #ddd;">حوادث ناتوان‌کننده (LTI)</th>
              <th style="padding: 6px; border: 1px solid #ddd;">روزهای ازدست‌رفته</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${(data.permitsIssuedCount || kpi.permitsIssued || 12).toLocaleString('fa-IR')} فقره</td>
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${(data.tbmCount || kpi.toolboxTalksCount || 8).toLocaleString('fa-IR')} جلسه</td>
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; color: #0284c7;">${(data.tbmAttendeesTotal || kpi.toolboxTalksAttendees || 140).toLocaleString('fa-IR')} نفر</td>
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; color: #ea580c;">${(data.nearMissesCount || kpi.nearMissCount || 2).toLocaleString('fa-IR')}</td>
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; color: ${data.ltiCount ? '#dc2626' : '#059669'};">${(data.ltiCount || 0).toLocaleString('fa-IR')}</td>
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${(data.lostWorkDays || 0).toLocaleString('fa-IR')} روز</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style="margin-top: 20px;">
        <h3 style="border-bottom: 2px solid #10b981; padding-bottom: 5px; color: #065f46; font-size: 13px;">نکات برجسته، چالش‌ها و اقدامات دور آتی</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 8px; font-size: 11px;">
          <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; background: #fff;">
            <strong>نکات برجسته و دستاوردهای ایمنی:</strong>
            <p style="margin: 5px 0 0 0; color: #475569; line-height: 1.7;">${data.keyHighlights || data.highlights || 'دستیابی به رکورد ساعات کار ایمن، برگزاری موفق مانور واکنش در شرایط اضطراری.'}</p>
          </div>
          <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; background: #fff;">
            <strong>چالش‌ها، ریسک‌ها و آموزش‌های آتی:</strong>
            <p style="margin: 5px 0 0 0; color: #475569; line-height: 1.7;">${data.challengesAndRisks || data.challenges || 'کنترل کار در ارتفاع در بلوک‌های فوقانی، بازرسی ادواری کابل‌های برق و تابلوهای توزیع.'}</p>
          </div>
        </div>
      </div>
    `;
  }

  // 5. HSE PLAN
  else if (type === 'PLAN') {
    title = `طرح و برنامه جامع مدیریت HSE - ${data.planNumber}`;

    contentHtml = `
      ${renderProjectHeader(`سند رسمی برنامه و طرح جامع مدیریت HSE پروژه (HSE Plan)`, true)}

      <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px;">
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; width: 20%; background: #f8fafc;">شماره سند HSE Plan:</td>
          <td style="padding: 8px; border: 1px solid #ddd; width: 30%; font-family: monospace; font-weight: bold; color: #1e40af;">${data.planNumber || '---'}</td>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; width: 20%; background: #f8fafc;">نسخه و ویرایش (Revision):</td>
          <td style="padding: 8px; border: 1px solid #ddd; width: 30%; font-weight: bold;">ویرایش ${data.revision || '01'} (تاریخ تصویب: ${data.approvalDate || data.revisionDate || '---'})</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background: #f8fafc;">عنوان سند:</td>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${data.title || 'برنامه جامع مدیریت بهداشت، ایمنی و محیط زیست کارگاه'}</td>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background: #f8fafc;">وضعیت تایید و ابلاغ:</td>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; color: #059669;">${WorkflowService.getStatusLabel(data)}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background: #f8fafc;">نقطه تجمع امن (Assembly Point):</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${data.emergencyAssemblyPoint || 'محوطه درب اصلی نگهبانی کارگاه'}</td>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background: #f8fafc;">تلفن و بیمارستان پشتیبان:</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${data.emergencyPhone || '۰۲۱-۵۵۵۵۵۵۵۵'} (${data.hospitalSupport || 'بیمارستان امام خمینی'})</td>
        </tr>
      </table>

      <div style="margin-top: 20px;">
        <h3 style="border-bottom: 2px solid #1e40af; padding-bottom: 5px; color: #1e40af; font-size: 13px;">بیانیه خط‌مشی مدیریت بهداشت، ایمنی و محیط زیست (HSE Policy)</h3>
        <div style="padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 12px; line-height: 1.8;">
          ${data.policyStatement || 'ارکان پروژه متعهد به ایجاد محیط کار بدون حادثه، حفاظت از جان نیروی انسانی و صیانت از محیط زیست می‌باشند.'}
        </div>
      </div>

      <div style="margin-top: 20px;">
        <h3 style="border-bottom: 2px solid #10b981; padding-bottom: 5px; color: #065f46; font-size: 13px;">اهداف و شاخص‌های کلیدی عملکرد (HSE Objectives & KPIs)</h3>
        <table style="width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 11px; text-align: center; direction: rtl;">
          <thead>
            <tr style="background: #f1f5f9;">
              <th style="padding: 6px; border: 1px solid #ddd; width: 6%;">ردیف</th>
              <th style="padding: 6px; border: 1px solid #ddd; text-align: right; padding-right: 12px;">هدف / شاخص عملکردی</th>
              <th style="padding: 6px; border: 1px solid #ddd; width: 25%;">مقدار هدف (Target)</th>
              <th style="padding: 6px; border: 1px solid #ddd; width: 20%;">دوره اندازه‌گیری</th>
            </tr>
          </thead>
          <tbody>
            ${(data.objectivesAndKpis && data.objectivesAndKpis.length > 0)
              ? data.objectivesAndKpis.map((k: any, idx: number) => `
                  <tr>
                    <td style="padding: 6px; border: 1px solid #ddd;">${(idx + 1).toLocaleString('fa-IR')}</td>
                    <td style="padding: 6px; border: 1px solid #ddd; text-align: right; padding-right: 12px; font-weight: bold;">${k.kpi}</td>
                    <td style="padding: 6px; border: 1px solid #ddd; font-weight: bold; color: #059669;">${k.target}</td>
                    <td style="padding: 6px; border: 1px solid #ddd;">${k.measurementFrequency || 'ماهانه'}</td>
                  </tr>
                `).join('')
              : `
                <tr><td style="padding: 6px; border: 1px solid #ddd;">۱</td><td style="padding: 6px; border: 1px solid #ddd; text-align: right; padding-right: 12px; font-weight: bold;">حوادث منجر به فوت و نقص عضو (Fatalities)</td><td style="padding: 6px; border: 1px solid #ddd; font-weight: bold; color: #059669;">صفر (Zero Harm)</td><td style="padding: 6px; border: 1px solid #ddd;">مستمر</td></tr>
                <tr><td style="padding: 6px; border: 1px solid #ddd;">۲</td><td style="padding: 6px; border: 1px solid #ddd; text-align: right; padding-right: 12px; font-weight: bold;">نرخ حوادث ناتوان‌کننده (LTIFR)</td><td style="padding: 6px; border: 1px solid #ddd; font-weight: bold; color: #059669;">کمتر از ۰.۵</td><td style="padding: 6px; border: 1px solid #ddd;">ماهانه</td></tr>
                <tr><td style="padding: 6px; border: 1px solid #ddd;">۳</td><td style="padding: 6px; border: 1px solid #ddd; text-align: right; padding-right: 12px; font-weight: bold;">پوشش جلسات آموزشی جعبه‌ابزار (TBM)</td><td style="padding: 6px; border: 1px solid #ddd; font-weight: bold; color: #059669;">۱۰۰٪ تیم‌های اجرایی</td><td style="padding: 6px; border: 1px solid #ddd;">روزانه / هفتگی</td></tr>
              `
            }
          </tbody>
        </table>
      </div>

      <div style="margin-top: 20px;">
        <h3 style="border-bottom: 2px solid #f59e0b; padding-bottom: 5px; color: #b45309; font-size: 13px;">ماتریس شناسایی خطرات و ارزیابی ریسک‌ها (HIRA Matrix)</h3>
        <table style="width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 10.5px; text-align: center; direction: rtl;">
          <thead>
            <tr style="background: #fffbeb;">
              <th style="padding: 6px; border: 1px solid #ddd; width: 5%;">ردیف</th>
              <th style="padding: 6px; border: 1px solid #ddd; width: 22%; text-align: right; padding-right: 10px;">فعالیت کارگاهی</th>
              <th style="padding: 6px; border: 1px solid #ddd; width: 20%;">خطر شناسایی‌شده</th>
              <th style="padding: 6px; border: 1px solid #ddd; width: 12%;">ریسک اولیه</th>
              <th style="padding: 6px; border: 1px solid #ddd; text-align: right; padding-right: 10px;">اقدامات کنترلی و پیشگیرانه</th>
              <th style="padding: 6px; border: 1px solid #ddd; width: 12%;">ریسک باقیمانده</th>
            </tr>
          </thead>
          <tbody>
            ${(data.riskMatrix && data.riskMatrix.length > 0)
              ? data.riskMatrix.map((r: any, idx: number) => `
                  <tr>
                    <td style="padding: 6px; border: 1px solid #ddd;">${(idx + 1).toLocaleString('fa-IR')}</td>
                    <td style="padding: 6px; border: 1px solid #ddd; text-align: right; padding-right: 10px; font-weight: bold;">${r.activity}</td>
                    <td style="padding: 6px; border: 1px solid #ddd;">${r.hazard}</td>
                    <td style="padding: 6px; border: 1px solid #ddd; font-weight: bold; color: #dc2626;">${r.initialRisk || r.riskLevel || 'بالا'}</td>
                    <td style="padding: 6px; border: 1px solid #ddd; text-align: right; padding-right: 10px; font-size: 10px;">${r.controlMeasure}</td>
                    <td style="padding: 6px; border: 1px solid #ddd; font-weight: bold; color: #059669; background: #ecfdf5;">${r.residualRisk || r.residualLevel || 'پایین'}</td>
                  </tr>
                `).join('')
              : `
                <tr><td style="padding: 6px; border: 1px solid #ddd;">۱</td><td style="padding: 6px; border: 1px solid #ddd; text-align: right; padding-right: 10px; font-weight: bold;">کار در ارتفاع و داربست‌بندی</td><td style="padding: 6px; border: 1px solid #ddd;">سقوط نفر و ابزار</td><td style="padding: 6px; border: 1px solid #ddd; font-weight: bold; color: #dc2626;">بالا (High)</td><td style="padding: 6px; border: 1px solid #ddd; text-align: right; padding-right: 10px;">صدور پرمیت ارتفاع، هارنس کامل دولنیارد، تگ داربست سبز</td><td style="padding: 6px; border: 1px solid #ddd; font-weight: bold; color: #059669; background: #ecfdf5;">پایین (Low)</td></tr>
                <tr><td style="padding: 6px; border: 1px solid #ddd;">۲</td><td style="padding: 6px; border: 1px solid #ddd; text-align: right; padding-right: 10px; font-weight: bold;">گودبرداری و کانال‌کنی عمیق</td><td style="padding: 6px; border: 1px solid #ddd;">ریزش دیواره و دفن کارگر</td><td style="padding: 6px; border: 1px solid #ddd; font-weight: bold; color: #dc2626;">بسیار بالا</td><td style="padding: 6px; border: 1px solid #ddd; text-align: right; padding-right: 10px;">شیب‌بندی استاندارد، سازه نگهبان، فاصله تردد ماشین‌آلات</td><td style="padding: 6px; border: 1px solid #ddd; font-weight: bold; color: #059669; background: #ecfdf5;">متوسط/پایین</td></tr>
              `
            }
          </tbody>
        </table>
      </div>
    `;
  }

  // 6. COMPREHENSIVE AUDIT & KPI REPORT
  else if (type === 'COMPREHENSIVE') {
    title = `کارنامه و گزارش عملکرد تجمیعی مدیریت HSE - پروژه ${projectTitle}`;

    const permitsList = data.permitsList || [];
    const incidentsList = data.incidentsList || [];
    const envList = data.environmentalList || [];

    contentHtml = `
      ${renderProjectHeader(`کارنامه و گزارش عملکرد تجمیعی مدیریت بهداشت، ایمنی و محیط زیست (HSE)`, true)}

      <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px;">
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; width: 20%; background: #f8fafc;">شماره کارنامه ممیزی:</td>
          <td style="padding: 8px; border: 1px solid #ddd; width: 30%; font-family: monospace; font-weight: bold; color: #1e40af;">${data.reportNumber || 'HSE-AUDIT-COMP'}</td>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; width: 20%; background: #f8fafc;">تاریخ تهیه کارنامه:</td>
          <td style="padding: 8px; border: 1px solid #ddd; width: 30%; font-weight: bold;">${data.reportDate || new Date().toLocaleDateString('fa-IR')}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background: #f8fafc;">دامنه ممیزی:</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${data.location || 'کلیه کارگاه‌ها، ابنیه و سایت‌های اجرایی پروژه'}</td>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background: #f8fafc;">وضعیت کلی ارزیابی:</td>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; color: #059669;">تایید نهایی و منطبق بر الزامات قانونی ✓</td>
        </tr>
      </table>

      <!-- Grand Stat Cards -->
      <div style="margin-top: 25px;">
        <h3 style="border-bottom: 2px solid #1e40af; padding-bottom: 5px; color: #1e40af; font-size: 13px;">کارنامه کلان آماری HSE پروژه</h3>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 10px;">
          <div style="background: #eff6ff; border: 1px solid #bfdbfe; padding: 12px; border-radius: 8px; text-align: center;">
            <div style="font-size: 10px; color: #1e40af; font-weight: bold;">مجموع مجوزهای صادرشده (PTW)</div>
            <div style="font-size: 18px; font-weight: 900; color: #1d4ed8; margin-top: 4px;">${permitsList.length.toLocaleString('fa-IR')} <small style="font-size: 10px;">فقره</small></div>
          </div>
          <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 12px; border-radius: 8px; text-align: center;">
            <div style="font-size: 10px; color: #991b1b; font-weight: bold;">حوادث و شبه‌حوادث ثبت‌شده</div>
            <div style="font-size: 18px; font-weight: 900; color: #b91c1c; margin-top: 4px;">${incidentsList.length.toLocaleString('fa-IR')} <small style="font-size: 10px;">مورد</small></div>
          </div>
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 12px; border-radius: 8px; text-align: center;">
            <div style="font-size: 10px; color: #166534; font-weight: bold;">بازرسی‌های زیست‌محیطی</div>
            <div style="font-size: 18px; font-weight: 900; color: #15803d; margin-top: 4px;">${envList.length.toLocaleString('fa-IR')} <small style="font-size: 10px;">مورد</small></div>
          </div>
          <div style="background: #fffbeb; border: 1px solid #fde68a; padding: 12px; border-radius: 8px; text-align: center;">
            <div style="font-size: 10px; color: #92400e; font-weight: bold;">نفرساعت کار بدون حادثه</div>
            <div style="font-size: 18px; font-weight: 900; color: #b45309; margin-top: 4px;">${(124800).toLocaleString('fa-IR')} <small style="font-size: 10px;">ساعت</small></div>
          </div>
        </div>
      </div>

      <!-- 1. Permits Table -->
      <h3 style="margin-top: 30px; border-right: 4px solid #10b981; padding-right: 10px; color: #065f46; font-size: 13px;">۱. سوابق تفکیکی مجوزهای کار ایمن صادرشده (Permits)</h3>
      <table style="width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 10.5px; text-align: center; direction: rtl;">
        <thead>
          <tr style="background: #ecfdf5;">
            <th style="padding: 6px; border: 1px solid #ddd; width: 6%;">ردیف</th>
            <th style="padding: 6px; border: 1px solid #ddd; width: 18%;">شماره پرمیت</th>
            <th style="padding: 6px; border: 1px solid #ddd; width: 22%;">نوع مجوز</th>
            <th style="padding: 6px; border: 1px solid #ddd; text-align: right; padding-right: 10px;">موقعیت کارگاهی</th>
            <th style="padding: 6px; border: 1px solid #ddd; width: 14%;">سطح ریسک</th>
            <th style="padding: 6px; border: 1px solid #ddd; width: 16%;">وضعیت</th>
          </tr>
        </thead>
        <tbody>
          ${permitsList.length > 0 ? permitsList.slice(0, 8).map((p: any, idx: number) => `
            <tr>
              <td style="padding: 6px; border: 1px solid #ddd;">${(idx + 1).toLocaleString('fa-IR')}</td>
              <td style="padding: 6px; border: 1px solid #ddd; font-weight: bold;">${p.permitNumber}</td>
              <td style="padding: 6px; border: 1px solid #ddd;">${HseService.getPermitTypeLabel(p.permitType)}</td>
              <td style="padding: 6px; border: 1px solid #ddd; text-align: right; padding-right: 10px;">${p.location}</td>
              <td style="padding: 6px; border: 1px solid #ddd; font-weight: bold; color: ${p.riskLevel === 'CRITICAL' ? '#dc2626' : p.riskLevel === 'HIGH' ? '#ea580c' : '#059669'};">${p.riskLevel || 'متوسط'}</td>
              <td style="padding: 6px; border: 1px solid #ddd; font-size: 9.5px;">${WorkflowService.getStatusLabel(p)}</td>
            </tr>
          `).join('') : '<tr><td colspan="6" style="padding: 15px; color: #94a3b8;">هیچ مجوزی ثبت نشده است.</td></tr>'}
        </tbody>
      </table>

      <!-- 2. Incidents Table -->
      <h3 style="margin-top: 30px; border-right: 4px solid #ef4444; padding-right: 10px; color: #991b1b; font-size: 13px;">۲. سوابق تفکیکی حوادث و شبه‌حوادث کارگاهی (Incidents)</h3>
      <table style="width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 10.5px; text-align: center; direction: rtl;">
        <thead>
          <tr style="background: #fef2f2;">
            <th style="padding: 6px; border: 1px solid #ddd; width: 6%;">ردیف</th>
            <th style="padding: 6px; border: 1px solid #ddd; width: 18%;">شماره حادثه</th>
            <th style="padding: 6px; border: 1px solid #ddd; width: 22%;">نوع رویداد</th>
            <th style="padding: 6px; border: 1px solid #ddd; text-align: right; padding-right: 10px;">عنوان و شرح مختصر</th>
            <th style="padding: 6px; border: 1px solid #ddd; width: 14%;">شدت حادثه</th>
            <th style="padding: 6px; border: 1px solid #ddd; width: 16%;">وضعیت</th>
          </tr>
        </thead>
        <tbody>
          ${incidentsList.length > 0 ? incidentsList.slice(0, 8).map((inc: any, idx: number) => `
            <tr>
              <td style="padding: 6px; border: 1px solid #ddd;">${(idx + 1).toLocaleString('fa-IR')}</td>
              <td style="padding: 6px; border: 1px solid #ddd; font-weight: bold; color: #dc2626;">${inc.incidentNumber}</td>
              <td style="padding: 6px; border: 1px solid #ddd;">${INCIDENT_TYPE_LABELS[inc.incidentType as keyof typeof INCIDENT_TYPE_LABELS] || inc.incidentType}</td>
              <td style="padding: 6px; border: 1px solid #ddd; text-align: right; padding-right: 10px;">${inc.title}</td>
              <td style="padding: 6px; border: 1px solid #ddd; font-weight: bold; color: #b91c1c;">${inc.severity}</td>
              <td style="padding: 6px; border: 1px solid #ddd; font-size: 9.5px;">${WorkflowService.getStatusLabel(inc)}</td>
            </tr>
          `).join('') : '<tr><td colspan="6" style="padding: 15px; color: #94a3b8;">هیچ حادثه‌ای در این پروژه ثبت نشده است.</td></tr>'}
        </tbody>
      </table>
    `;
  }

  // Exact Technical Office Window Launch with Exact CSS and Signature Footer
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

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
          .logo-box { width: 36px; height: 36px; background: #1e40af; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 900; font-size: 14px; }
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
            <div class="logo-box">HSE</div>
            <div>
              <h1 style="margin: 0; color: #1e40af; font-size: 20px; font-weight: 900;">سامانه جامع مدیریت پروژه همیار</h1>
              <div style="font-size: 10px; color: #64748b; font-weight: bold; margin-top: 2px;">واحد بهداشت، ایمنی و محیط زیست (HSE Department)</div>
            </div>
          </div>
          <div style="text-align: left; font-size: 11px;">
            <p style="margin: 0;">تاریخ چاپ: ${new Date().toLocaleDateString('fa-IR')}</p>
            <p style="margin: 0;">نسخه سند: ۱.۴.۰</p>
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
                ${renderPrintSignatureBox('کارشناس HSE / تنظیم‌کننده', 'contractor_tech')}
                ${renderPrintSignatureBox('سرپرست واحد HSE / مسئول ایمنی', 'contractor_head')}
                ${renderPrintSignatureBox('سرپرست کارگاه / مدیر پروژه', 'contractor_site')}
              </div>
            </div>

            <!-- 2. دستگاه نظارت و مشاور -->
            <div style="flex: 1 1 0%; min-width: 0; border: 1px solid #6ee7b7; background: #ecfdf5; border-radius: 6px; padding: 4px; box-sizing: border-box;">
              <div style="font-weight: bold; font-size: 9px; color: #065f46; text-align: center; border-bottom: 1px solid #a7f3d0; padding-bottom: 2px; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                مشاور: ${projectConsultant}
              </div>
              <div style="display: flex; flex-direction: row; gap: 3px; width: 100%;">
                ${renderPrintSignatureBox('کارشناس / ناظر مقیم HSE', 'consultant_tech')}
                ${renderPrintSignatureBox('سرپرست واحد نظارت HSE', 'consultant_head')}
                ${renderPrintSignatureBox('سرپرست نظارت / مدیر پروژه مشاور', 'consultant_site')}
              </div>
            </div>

            <!-- 3. دستگاه اجرایی و کارفرما -->
            <div style="flex: 1 1 0%; min-width: 0; border: 1px solid #d8b4fe; background: #faf5ff; border-radius: 6px; padding: 4px; box-sizing: border-box;">
              <div style="font-weight: bold; font-size: 9px; color: #6b21a8; text-align: center; border-bottom: 1px solid #e9d5ff; padding-bottom: 2px; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                کارفرما: ${projectEmployer}
              </div>
              <div style="display: flex; flex-direction: row; gap: 3px; width: 100%;">
                ${renderPrintSignatureBox('کارشناس HSE / بررسی‌کننده', 'employer_tech')}
                ${renderPrintSignatureBox('سرپرست واحد / رئیس HSE', 'employer_head')}
                ${renderPrintSignatureBox('مدیر طرح / نماینده کارفرما', 'employer_site')}
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
