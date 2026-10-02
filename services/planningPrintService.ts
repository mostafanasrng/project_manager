import { Project, PeriodicComparisonItem, PlanningActivity } from '../types';
import { SystemAdminService } from './systemAdminService';

interface PrintPeriodicReportParams {
  item: PeriodicComparisonItem;
  project?: Project | null;
  activities?: PlanningActivity[];
  currentUser?: any;
}

interface PrintOverallReportParams {
  comparisonItems?: PeriodicComparisonItem[];
  project?: Project | null;
  activities?: PlanningActivity[];
  currentUser?: any;
}

export const PlanningPrintService = {
  /**
   * چاپ رسمی گزارش استاندارد مقایسه دوره‌ای برنامه زمان‌بندی و پیشرفت فیزیکی
   * دقیقا منطبق بر ساختار چاپ رسمی صورت‌جلسات در دفتر فنی
   */
  printOfficialPeriodicReport: ({ item, project, activities = [], currentUser }: PrintPeriodicReportParams) => {
    if (!item) return;

    const projectTitle = project?.title || 'پروژه جاری کارگاهی';
    const projectEmployer = project?.employerName || 'دستگاه اجرایی و کارفرما';
    const projectConsultant = project?.consultantName || 'مهندسین مشاور و نظارت';
    const projectContractor = project?.contractorName || 'شرکت پیمانکار';
    const contractNumber = project?.contractNumber || '---';
    const projectBudget = project?.initialBudget
      ? project.initialBudget.toLocaleString('fa-IR') + ' ریال'
      : '---';
    const projectTimeline =
      (project?.startDate || '---') + ' الی ' + (project?.endDate || '---');

    const orgLogos = SystemAdminService.getProjectOrgLogos(project);
    const logoHtml = [
      orgLogos.employerLogo ? `<img src="${orgLogos.employerLogo}" style="height: 40px; max-width: 90px; object-fit: contain;" alt="کارفرما" />` : '',
      orgLogos.consultantLogo ? `<img src="${orgLogos.consultantLogo}" style="height: 40px; max-width: 90px; object-fit: contain;" alt="مشاور" />` : '',
      orgLogos.contractorLogo ? `<img src="${orgLogos.contractorLogo}" style="height: 40px; max-width: 90px; object-fit: contain;" alt="پیمانکار" />` : ''
    ].filter(Boolean).join('');

    const title = `گزارش رسمی مقایسه دوره‌ای پیشرفت فیزیکی - ${item.periodLabel} (${item.date})`;

    // Header info box
    const renderProjectHeader = (reportTitle: string) => `
      <div style="border-bottom: 2px solid #1e40af; padding-bottom: 12px; margin-bottom: 18px;">
        <h2 style="margin: 0; color: #1e40af; text-align: center; font-size: 17px; font-weight: 900;">${reportTitle}</h2>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 12px; font-size: 11px; background: #f8fafc; padding: 10px; border-radius: 8px; border: 1px solid #e2e8f0;">
          <div><strong>نام پروژه:</strong> ${projectTitle}</div>
          <div><strong>شماره پیمان:</strong> ${contractNumber}</div>
          <div><strong>دستگاه کارفرما:</strong> ${projectEmployer}</div>
          <div><strong>مهندس مشاور / نظارت:</strong> ${projectConsultant}</div>
          <div><strong>شرکت پیمانکار:</strong> ${projectContractor}</div>
          <div><strong>مبلغ اولیه پیمان:</strong> ${projectBudget}</div>
          <div style="grid-column: span 2;"><strong>مدت اولیه پیمان:</strong> ${projectTimeline}</div>
        </div>
      </div>
    `;

    // Filter or prepare activities
    const displayActivities = activities && activities.length > 0 ? activities : [];

    const rowsHtml = displayActivities.map((act, idx) => {
      const planProg = act.plannedProgress || 0;
      const actProg = act.actualProgress || 0;
      const diff = Number((actProg - planProg).toFixed(2));
      const isPositive = diff >= 0;

      return `
        <tr style="border-bottom: 1px solid #e2e8f0; font-size: 10.5px; ${idx % 2 === 0 ? 'background: #ffffff;' : 'background: #f8fafc;'}">
          <td style="padding: 6px; text-align: center; border: 1px solid #cbd5e1;">${(idx + 1).toLocaleString('fa-IR')}</td>
          <td style="padding: 6px; text-align: center; font-weight: bold; font-family: monospace; color: #1e40af; border: 1px solid #cbd5e1;">${act.code || '---'}</td>
          <td style="padding: 6px; text-align: right; font-weight: 600; border: 1px solid #cbd5e1;">${act.title}</td>
          <td style="padding: 6px; text-align: center; border: 1px solid #cbd5e1;">${(act.weightPercent || 0).toLocaleString('fa-IR')}٪</td>
          <td style="padding: 6px; text-align: center; border: 1px solid #cbd5e1; direction: ltr;">${act.baselineStartDate || '---'}</td>
          <td style="padding: 6px; text-align: center; border: 1px solid #cbd5e1; direction: ltr;">${act.baselineEndDate || '---'}</td>
          <td style="padding: 6px; text-align: center; border: 1px solid #cbd5e1;">${(act.durationDays || 0).toLocaleString('fa-IR')}</td>
          <td style="padding: 6px; text-align: center; font-weight: bold; color: #2563eb; border: 1px solid #cbd5e1;">${planProg.toLocaleString('fa-IR')}٪</td>
          <td style="padding: 6px; text-align: center; font-weight: bold; color: ${isPositive ? '#059669' : '#dc2626'}; border: 1px solid #cbd5e1;">${actProg.toLocaleString('fa-IR')}٪</td>
          <td style="padding: 6px; text-align: center; font-weight: bold; color: ${isPositive ? '#059669' : '#dc2626'}; direction: ltr; border: 1px solid #cbd5e1;">${isPositive ? '+' : ''}${diff.toLocaleString('fa-IR')}٪</td>
          <td style="padding: 6px; text-align: center; border: 1px solid #cbd5e1;">
            <span style="display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: bold; ${
              act.status === 'COMPLETED' ? 'background: #dcfce7; color: #15803d;' :
              act.status === 'IN_PROGRESS' ? 'background: #dbeafe; color: #1d4ed8;' :
              act.status === 'DELAYED' ? 'background: #fee2e2; color: #b91c1c;' :
              'background: #f1f5f9; color: #475569;'
            }">
              ${act.status === 'COMPLETED' ? 'تکمیل شده' : act.status === 'IN_PROGRESS' ? 'در حال اجرا' : act.status === 'DELAYED' ? 'دارای تاخیر' : 'شروع نشده'}
            </span>
          </td>
        </tr>
      `;
    }).join('');

    const contentHtml = `
      ${renderProjectHeader("گزارش رسمی ارزیابی و مقایسه دوره‌ای برنامه زمان‌بندی و پیشرفت فیزیکی (Plan vs. Actual)")}

      <!-- Period Specifications -->
      <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11.5px; border: 1px solid #cbd5e1;">
        <tr style="background: #f1f5f9;">
          <td style="padding: 7px 10px; border: 1px solid #cbd5e1; font-weight: bold; width: 22%;">دوره ارزیابی و پایش:</td>
          <td style="padding: 7px 10px; border: 1px solid #cbd5e1; font-weight: bold; color: #1e40af;">${item.periodLabel}</td>
          <td style="padding: 7px 10px; border: 1px solid #cbd5e1; font-weight: bold; width: 22%;">تاریخ مقطع پایش:</td>
          <td style="padding: 7px 10px; border: 1px solid #cbd5e1; direction: ltr; text-align: right;">${item.date}</td>
        </tr>
        <tr>
          <td style="padding: 7px 10px; border: 1px solid #cbd5e1; font-weight: bold;">عنوان برنامه / گزارش:</td>
          <td style="padding: 7px 10px; border: 1px solid #cbd5e1;">${item.planTitle || 'برنامه زمان‌بندی مصوب'}</td>
          <td style="padding: 7px 10px; border: 1px solid #cbd5e1; font-weight: bold;">وضعیت دوره:</td>
          <td style="padding: 7px 10px; border: 1px solid #cbd5e1; font-weight: bold; color: ${item.status === 'AHEAD' || item.status === 'ON_TRACK' ? '#059669' : '#d97706'};">
            ${item.status === 'AHEAD' ? 'پیشرفت فراتر از برنامه (Ahead)' : item.status === 'ON_TRACK' ? 'منطبق بر برنامه (On Track)' : item.status === 'SLIGHT_DELAY' ? 'دارای تاخیر جزئی (Slight Delay)' : 'تاخیر بحرانی (Critical Delay)'}
          </td>
        </tr>
      </table>

      <!-- Executive KPI Cards -->
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 15px; margin-bottom: 18px;">
        <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 10px; text-align: center;">
          <div style="font-size: 10px; color: #1e40af; font-weight: bold;">پیشرفت برنامه‌ای مصوب (Plan)</div>
          <div style="font-size: 20px; font-weight: 900; color: #1d4ed8; margin-top: 4px;">${item.plannedPercent.toLocaleString('fa-IR')}٪</div>
          <div style="font-size: 8.5px; color: #64748b; margin-top: 2px;">تجمعی تا تاریخ مقطع</div>
        </div>

        <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 10px; text-align: center;">
          <div style="font-size: 10px; color: #065f46; font-weight: bold;">پیشرفت واقعی محقق‌شده (Actual)</div>
          <div style="font-size: 20px; font-weight: 900; color: #059669; margin-top: 4px;">${item.actualPercent.toLocaleString('fa-IR')}٪</div>
          <div style="font-size: 8.5px; color: #64748b; margin-top: 2px;">تایید شده کارگاهی</div>
        </div>

        <div style="background: ${item.variance >= 0 ? '#f0fdf4' : '#fef2f2'}; border: 1px solid ${item.variance >= 0 ? '#bbf7d0' : '#fecaca'}; border-radius: 8px; padding: 10px; text-align: center;">
          <div style="font-size: 10px; color: ${item.variance >= 0 ? '#166534' : '#991b1b'}; font-weight: bold;">انحراف پیشرفت فیزیکی (Variance)</div>
          <div style="font-size: 20px; font-weight: 900; color: ${item.variance >= 0 ? '#15803d' : '#dc2626'}; margin-top: 4px; direction: ltr;">
            ${item.variance >= 0 ? '+' : ''}${item.variance.toLocaleString('fa-IR')}٪
          </div>
          <div style="font-size: 8.5px; color: #64748b; margin-top: 2px;">${item.variance >= 0 ? 'جلوتر از برنامه' : 'عقب‌تر از برنامه'}</div>
        </div>

        <div style="background: #faf5ff; border: 1px solid #e9d5ff; border-radius: 8px; padding: 10px; text-align: center;">
          <div style="font-size: 10px; color: #6b21a8; font-weight: bold;">شاخص عملکرد زمانی (SPI)</div>
          <div style="font-size: 20px; font-weight: 900; color: #7e22ce; margin-top: 4px;">${item.spi}</div>
          <div style="font-size: 8.5px; color: #64748b; margin-top: 2px;">${item.spi >= 1 ? 'منطبق بر برنامه' : 'تاخیر زمانی در فعالیت‌ها'}</div>
        </div>
      </div>

      <!-- Activities Breakdown Table -->
      <div style="margin-top: 15px;">
        <h3 style="margin: 0 0 8px 0; color: #1e40af; font-size: 12px; font-weight: bold; border-right: 3px solid #1e40af; padding-right: 8px;">
          جدول ریز وضعیت فعالیت‌ها و ساختار شکست کار (WBS) در دوره:
        </h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 10px; text-align: center;">
          <thead>
            <tr style="background: #1e3a8a; color: white;">
              <th style="padding: 6px 4px; border: 1px solid #1e3a8a; width: 4%;">ردیف</th>
              <th style="padding: 6px 4px; border: 1px solid #1e3a8a; width: 8%;">کد WBS</th>
              <th style="padding: 6px 8px; border: 1px solid #1e3a8a; text-align: right; width: 28%;">عنوان فعالیت ساختار شکست</th>
              <th style="padding: 6px 4px; border: 1px solid #1e3a8a; width: 7%;">وزن (٪)</th>
              <th style="padding: 6px 4px; border: 1px solid #1e3a8a; width: 8%;">شروع مصوب</th>
              <th style="padding: 6px 4px; border: 1px solid #1e3a8a; width: 8%;">پایان مصوب</th>
              <th style="padding: 6px 4px; border: 1px solid #1e3a8a; width: 6%;">مدت</th>
              <th style="padding: 6px 4px; border: 1px solid #1e3a8a; width: 8%;">برنامه‌ای</th>
              <th style="padding: 6px 4px; border: 1px solid #1e3a8a; width: 8%;">واقعی</th>
              <th style="padding: 6px 4px; border: 1px solid #1e3a8a; width: 7%;">انحراف</th>
              <th style="padding: 6px 4px; border: 1px solid #1e3a8a; width: 8%;">وضعیت</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="11" style="padding: 15px; border: 1px solid #cbd5e1; color: #64748b;">فعالیتی ثبت نشده است.</td></tr>'}
          </tbody>
        </table>
      </div>

      <!-- Notes and Deviation analysis -->
      <div style="margin-top: 18px; border: 1px solid #cbd5e1; border-radius: 8px; background: #fff; overflow: hidden;">
        <div style="background: #f8fafc; padding: 7px 12px; font-weight: bold; font-size: 11px; border-bottom: 1px solid #cbd5e1; color: #334155;">
          📝 تحلیل علل انحرافات، موانع اجرایی و تمهیدات جبرانی:
        </div>
        <div style="padding: 10px 14px; font-size: 11px; line-height: 1.6; color: #1e293b; min-height: 48px;">
          ${item.planRecord?.revisionReason || item.trackingRecord?.siteObservations || 'در این دوره ارزیابی، پیشرفت فیزیکی طبق برنامه مصوب رصد گردید و موارد نیازمند تسریع به پیمانکار و دستگاه نظارت ابلاغ شده است.'}
        </div>
      </div>
    `;

    executeOfficialPrint(title, contentHtml, project, currentUser);
  },

  /**
   * چاپ رسمی گزارش جامع وضعیت کلی پروژه و ارزیابی زمان‌بندی و پیشرفت
   */
  printOfficialOverallStatusReport: ({ comparisonItems = [], project, activities = [], currentUser }: PrintOverallReportParams) => {
    const projectTitle = project?.title || 'پروژه جاری کارگاهی';
    const projectEmployer = project?.employerName || 'دستگاه اجرایی و کارفرما';
    const projectConsultant = project?.consultantName || 'مهندسین مشاور و نظارت';
    const projectContractor = project?.contractorName || 'شرکت پیمانکار';
    const contractNumber = project?.contractNumber || '---';
    const projectBudget = project?.initialBudget
      ? project.initialBudget.toLocaleString('fa-IR') + ' ریال'
      : '---';
    const projectTimeline =
      (project?.startDate || '---') + ' الی ' + (project?.endDate || '---');

    const title = `گزارش رسمی جامع وضعیت کلی پروژه و ارزیابی پیشرفت فیزیکی - ${projectTitle}`;

    // Overall summary calculation
    const totalPlanned = activities.reduce((sum, act) => sum + ((act.weightPercent || 0) * (act.plannedProgress || 0)) / 100, 0);
    const totalActual = activities.reduce((sum, act) => sum + ((act.weightPercent || 0) * (act.actualProgress || 0)) / 100, 0);
    const totalVariance = Number((totalActual - totalPlanned).toFixed(2));
    const projectSpi = totalPlanned > 0 ? (totalActual / totalPlanned).toFixed(2) : '1.00';

    const renderProjectHeader = (reportTitle: string) => `
      <div style="border-bottom: 2px solid #1e40af; padding-bottom: 12px; margin-bottom: 18px;">
        <h2 style="margin: 0; color: #1e40af; text-align: center; font-size: 17px; font-weight: 900;">${reportTitle}</h2>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 12px; font-size: 11px; background: #f8fafc; padding: 10px; border-radius: 8px; border: 1px solid #e2e8f0;">
          <div><strong>نام پروژه:</strong> ${projectTitle}</div>
          <div><strong>شماره پیمان:</strong> ${contractNumber}</div>
          <div><strong>دستگاه کارفرما:</strong> ${projectEmployer}</div>
          <div><strong>مهندس مشاور / نظارت:</strong> ${projectConsultant}</div>
          <div><strong>شرکت پیمانکار:</strong> ${projectContractor}</div>
          <div><strong>مبلغ اولیه پیمان:</strong> ${projectBudget}</div>
          <div style="grid-column: span 2;"><strong>مدت اولیه پیمان:</strong> ${projectTimeline}</div>
        </div>
      </div>
    `;

    // History of periodic comparisons table
    const periodHistoryRows = comparisonItems.map((c, idx) => `
      <tr style="border-bottom: 1px solid #cbd5e1; font-size: 10.5px; ${idx % 2 === 0 ? 'background: #ffffff;' : 'background: #f8fafc;'}">
        <td style="padding: 6px; text-align: center; border: 1px solid #cbd5e1;">${(idx + 1).toLocaleString('fa-IR')}</td>
        <td style="padding: 6px; text-align: center; font-weight: bold; border: 1px solid #cbd5e1;">${c.periodLabel}</td>
        <td style="padding: 6px; text-align: center; direction: ltr; border: 1px solid #cbd5e1;">${c.date}</td>
        <td style="padding: 6px; text-align: right; border: 1px solid #cbd5e1;">${c.planTitle || '---'}</td>
        <td style="padding: 6px; text-align: center; font-weight: bold; color: #2563eb; border: 1px solid #cbd5e1;">${c.plannedPercent}٪</td>
        <td style="padding: 6px; text-align: center; font-weight: bold; color: #059669; border: 1px solid #cbd5e1;">${c.actualPercent}٪</td>
        <td style="padding: 6px; text-align: center; font-weight: bold; color: ${c.variance >= 0 ? '#059669' : '#dc2626'}; direction: ltr; border: 1px solid #cbd5e1;">${c.variance >= 0 ? '+' : ''}${c.variance}٪</td>
        <td style="padding: 6px; text-align: center; font-weight: bold; color: #7e22ce; border: 1px solid #cbd5e1;">${c.spi}</td>
        <td style="padding: 6px; text-align: center; border: 1px solid #cbd5e1;">
          <span style="font-weight: bold; font-size: 9px; color: ${c.status === 'AHEAD' || c.status === 'ON_TRACK' ? '#059669' : '#d97706'};">
            ${c.status === 'AHEAD' ? 'فراتر از برنامه' : c.status === 'ON_TRACK' ? 'منطبق' : c.status === 'SLIGHT_DELAY' ? 'تاخیر جزئی' : 'تاخیر بحرانی'}
          </span>
        </td>
      </tr>
    `).join('');

    // Activities status list
    const activityRows = activities.map((act, idx) => {
      const planProg = act.plannedProgress || 0;
      const actProg = act.actualProgress || 0;
      const diff = Number((actProg - planProg).toFixed(2));
      const isPositive = diff >= 0;

      return `
        <tr style="border-bottom: 1px solid #cbd5e1; font-size: 10px; ${idx % 2 === 0 ? 'background: #ffffff;' : 'background: #f8fafc;'}">
          <td style="padding: 5px; text-align: center; border: 1px solid #cbd5e1;">${(idx + 1).toLocaleString('fa-IR')}</td>
          <td style="padding: 5px; text-align: center; font-family: monospace; font-weight: bold; color: #1e40af; border: 1px solid #cbd5e1;">${act.code}</td>
          <td style="padding: 5px; text-align: right; font-weight: 600; border: 1px solid #cbd5e1;">${act.title}</td>
          <td style="padding: 5px; text-align: center; border: 1px solid #cbd5e1;">${act.weightPercent}٪</td>
          <td style="padding: 5px; text-align: center; direction: ltr; border: 1px solid #cbd5e1;">${act.baselineStartDate || '---'}</td>
          <td style="padding: 5px; text-align: center; direction: ltr; border: 1px solid #cbd5e1;">${act.baselineEndDate || '---'}</td>
          <td style="padding: 5px; text-align: center; border: 1px solid #cbd5e1;">${act.durationDays || '---'}</td>
          <td style="padding: 5px; text-align: center; font-weight: bold; color: #2563eb; border: 1px solid #cbd5e1;">${planProg}٪</td>
          <td style="padding: 5px; text-align: center; font-weight: bold; color: ${isPositive ? '#059669' : '#dc2626'}; border: 1px solid #cbd5e1;">${actProg}٪</td>
          <td style="padding: 5px; text-align: center; font-weight: bold; color: ${isPositive ? '#059669' : '#dc2626'}; direction: ltr; border: 1px solid #cbd5e1;">${isPositive ? '+' : ''}${diff}٪</td>
          <td style="padding: 5px; text-align: center; border: 1px solid #cbd5e1;">
            <span style="font-size: 9px; font-weight: bold; color: ${
              act.status === 'COMPLETED' ? '#15803d' : act.status === 'IN_PROGRESS' ? '#1d4ed8' : act.status === 'DELAYED' ? '#b91c1c' : '#475569'
            };">
              ${act.status === 'COMPLETED' ? 'تکمیل' : act.status === 'IN_PROGRESS' ? 'جاری' : act.status === 'DELAYED' ? 'تاخیردار' : 'شروع نشده'}
            </span>
          </td>
        </tr>
      `;
    }).join('');

    const contentHtml = `
      ${renderProjectHeader("گزارش جامع وضعیت کلی پروژه و ارزیابی زمان‌بندی و پیشرفت فیزیکی")}

      <!-- Overall KPI Dashboard -->
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 10px; margin-bottom: 18px;">
        <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 12px; text-align: center;">
          <div style="font-size: 10.5px; color: #1e40af; font-weight: bold;">پیشرفت برنامه‌ای تجمعی کل</div>
          <div style="font-size: 22px; font-weight: 900; color: #1d4ed8; margin-top: 4px;">${totalPlanned.toFixed(2)}٪</div>
          <div style="font-size: 8.5px; color: #64748b; margin-top: 2px;">بر اساس تاریخ جاری روز</div>
        </div>

        <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 12px; text-align: center;">
          <div style="font-size: 10.5px; color: #065f46; font-weight: bold;">پیشرفت واقعی تجمعی کل</div>
          <div style="font-size: 22px; font-weight: 900; color: #059669; margin-top: 4px;">${totalActual.toFixed(2)}٪</div>
          <div style="font-size: 8.5px; color: #64748b; margin-top: 2px;">آخرین تاییدیه کارگاهی</div>
        </div>

        <div style="background: ${totalVariance >= 0 ? '#f0fdf4' : '#fef2f2'}; border: 1px solid ${totalVariance >= 0 ? '#bbf7d0' : '#fecaca'}; border-radius: 8px; padding: 12px; text-align: center;">
          <div style="font-size: 10.5px; color: ${totalVariance >= 0 ? '#166534' : '#991b1b'}; font-weight: bold;">انحراف کل پیشرفت پروژه</div>
          <div style="font-size: 22px; font-weight: 900; color: ${totalVariance >= 0 ? '#15803d' : '#dc2626'}; margin-top: 4px; direction: ltr;">
            ${totalVariance >= 0 ? '+' : ''}${totalVariance.toFixed(2)}٪
          </div>
          <div style="font-size: 8.5px; color: #64748b; margin-top: 2px;">${totalVariance >= 0 ? 'پیش‌روی بالاتر از تعهد' : 'تاخیر انباشته از زمانبندی'}</div>
        </div>

        <div style="background: #faf5ff; border: 1px solid #e9d5ff; border-radius: 8px; padding: 12px; text-align: center;">
          <div style="font-size: 10.5px; color: #6b21a8; font-weight: bold;">شاخص عملکرد زمانی کل (SPI)</div>
          <div style="font-size: 22px; font-weight: 900; color: #7e22ce; margin-top: 4px;">${projectSpi}</div>
          <div style="font-size: 8.5px; color: #64748b; margin-top: 2px;">${Number(projectSpi) >= 1 ? 'بهره‌وری زمانی مطلوب' : 'نیازمند جبران و بازبرنامه‌ریزی'}</div>
        </div>
      </div>

      <!-- History of Periods Table -->
      ${comparisonItems.length > 0 ? `
        <div style="margin-top: 15px;">
          <h3 style="margin: 0 0 8px 0; color: #1e40af; font-size: 12px; font-weight: bold; border-right: 3px solid #1e40af; padding-right: 8px;">
            سوابق دوره‌های پایش و مقایسه ثبت‌شده در پروژه:
          </h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 10.5px; text-align: center; border: 1px solid #cbd5e1;">
            <thead>
              <tr style="background: #1e3a8a; color: white;">
                <th style="padding: 6px 4px; border: 1px solid #1e3a8a; width: 5%;">ردیف</th>
                <th style="padding: 6px 8px; border: 1px solid #1e3a8a; width: 15%;">دوره پایش</th>
                <th style="padding: 6px 8px; border: 1px solid #1e3a8a; width: 12%;">تاریخ مقطع</th>
                <th style="padding: 6px 8px; border: 1px solid #1e3a8a; text-align: right; width: 28%;">عنوان برنامه</th>
                <th style="padding: 6px 4px; border: 1px solid #1e3a8a; width: 10%;">برنامه‌ای</th>
                <th style="padding: 6px 4px; border: 1px solid #1e3a8a; width: 10%;">واقعی</th>
                <th style="padding: 6px 4px; border: 1px solid #1e3a8a; width: 10%;">انحراف</th>
                <th style="padding: 6px 4px; border: 1px solid #1e3a8a; width: 5%;">SPI</th>
                <th style="padding: 6px 4px; border: 1px solid #1e3a8a; width: 5%;">وضعیت</th>
              </tr>
            </thead>
            <tbody>
              ${periodHistoryRows}
            </tbody>
          </table>
        </div>
      ` : ''}

      <!-- Detailed Activities Breakdown Table -->
      <div style="margin-top: 18px;">
        <h3 style="margin: 0 0 8px 0; color: #1e40af; font-size: 12px; font-weight: bold; border-right: 3px solid #1e40af; padding-right: 8px;">
          فهرست جامع ساختار شکست کار (WBS) و آخرین وضعیت پیشرفت فعالیت‌ها:
        </h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 9.5px; text-align: center; border: 1px solid #cbd5e1;">
          <thead>
            <tr style="background: #0f172a; color: white;">
              <th style="padding: 5px 3px; border: 1px solid #0f172a; width: 4%;">ردیف</th>
              <th style="padding: 5px 3px; border: 1px solid #0f172a; width: 8%;">کد WBS</th>
              <th style="padding: 5px 6px; border: 1px solid #0f172a; text-align: right; width: 28%;">عنوان فعالیت ساختار شکست</th>
              <th style="padding: 5px 3px; border: 1px solid #0f172a; width: 7%;">وزن (٪)</th>
              <th style="padding: 5px 3px; border: 1px solid #0f172a; width: 8%;">شروع مصوب</th>
              <th style="padding: 5px 3px; border: 1px solid #0f172a; width: 8%;">پایان مصوب</th>
              <th style="padding: 5px 3px; border: 1px solid #0f172a; width: 6%;">مدت</th>
              <th style="padding: 5px 3px; border: 1px solid #0f172a; width: 8%;">برنامه‌ای</th>
              <th style="padding: 5px 3px; border: 1px solid #0f172a; width: 8%;">واقعی</th>
              <th style="padding: 5px 3px; border: 1px solid #0f172a; width: 7%;">انحراف</th>
              <th style="padding: 5px 3px; border: 1px solid #0f172a; width: 8%;">وضعیت</th>
            </tr>
          </thead>
          <tbody>
            ${activityRows || '<tr><td colspan="11" style="padding: 12px; border: 1px solid #cbd5e1; color: #64748b;">فعالیتی یافت نشد.</td></tr>'}
          </tbody>
        </table>
      </div>

      <!-- Executive Recommendations -->
      <div style="margin-top: 18px; border: 1px solid #cbd5e1; border-radius: 8px; background: #fff; overflow: hidden;">
        <div style="background: #f8fafc; padding: 7px 12px; font-weight: bold; font-size: 11px; border-bottom: 1px solid #cbd5e1; color: #334155;">
          📋 تحلیل مدیریتی و توصیه‌های راهبردی ارکان پروژه:
        </div>
        <div style="padding: 10px 14px; font-size: 11px; line-height: 1.6; color: #1e293b;">
          با توجه به شاخص عملکرد زمانی کل (SPI = ${projectSpi}) و انحراف فیزیکی کل (${totalVariance >= 0 ? '+' : ''}${totalVariance.toFixed(2)}٪)، وضعیت پایش زمانی پروژه به صورت مستمر تحت نظارت دستگاه مشاور و کارفرما قرار دارد. در صورت وجود تاخیرات مجاز ناشی از شرایط محیطی یا تغییر مقادیر، ارائه مستندات تاخیرات و فرآیند بازبرنامه‌ریزی (Replan) مطابق شرایط عمومی پیمان بررسی خواهد شد.
        </div>
      </div>
    `;

    executeOfficialPrint(title, contentHtml, project, currentUser);
  }
};

/**
 * متد مشترک ارسال سند به چاپگر یا پنجره رسمی چاپ
 * دقیقا مطابق با handlePrintOfficial در TechnicalOffice.tsx
 */
function executeOfficialPrint(title: string, contentHtml: string, project?: Project | null, currentUser?: any) {
  const projectEmployer = project?.employerName || 'دستگاه اجرایی و کارفرما';
  const projectConsultant = project?.consultantName || 'مهندسین مشاور و نظارت';
  const projectContractor = project?.contractorName || 'شرکت پیمانکار';

  const orgLogos = SystemAdminService.getProjectOrgLogos(project);
  const logoHtml = [
    orgLogos.employerLogo ? `<img src="${orgLogos.employerLogo}" style="height: 40px; max-width: 90px; object-fit: contain;" alt="کارفرما" />` : '',
    orgLogos.consultantLogo ? `<img src="${orgLogos.consultantLogo}" style="height: 40px; max-width: 90px; object-fit: contain;" alt="مشاور" />` : '',
    orgLogos.contractorLogo ? `<img src="${orgLogos.contractorLogo}" style="height: 40px; max-width: 90px; object-fit: contain;" alt="پیمانکار" />` : ''
  ].filter(Boolean).join('');

  const users = SystemAdminService.getUsers();

  const getRoleSignatory = (roleKey: string) => {
    if (roleKey === 'contractor_tech') {
      const u = users.find(x => x.username === 'contractor_tech' || x.role?.includes('CONTRACTOR'));
      return { name: u?.fullName || 'مهندس علیزاده (کارشناس کنترل پروژه)', title: 'کارشناس کنترل پروژه پیمانکار', signature: u?.signature };
    }
    if (roleKey === 'contractor_head') {
      const u = users.find(x => x.username === 'contractor_head' || x.role?.includes('CONTRACTOR'));
      return { name: u?.fullName || 'مهندس کاظمی (رئیس واحد برنامه‌ریزی)', title: 'سرپرست برنامه‌ریزی و کنترل پروژه', signature: u?.signature };
    }
    if (roleKey === 'contractor_site') {
      const u = users.find(x => x.username === 'contractor' || x.role?.includes('CONTRACTOR'));
      return { name: u?.fullName || 'مهندس رحیمی (سرپرست کارگاه / مدیر پروژه)', title: 'سرپرست کارگاه / مدیر پروژه پیمانکار', signature: u?.signature };
    }
    if (roleKey === 'consultant_tech') {
      const u = users.find(x => x.username === 'consultant_tech' || x.role?.includes('CONSULTANT'));
      return { name: u?.fullName || 'مهندس خسروی (ناظر کنترل پروژه)', title: 'کارشناس کنترل پروژه دستگاه نظارت', signature: u?.signature };
    }
    if (roleKey === 'consultant_head') {
      const u = users.find(x => x.username === 'consultant_head' || x.role?.includes('CONSULTANT'));
      return { name: u?.fullName || 'دکتر بهرامی (سرپرست دستگاه نظارت)', title: 'سرپرست نظارت مقیم', signature: u?.signature };
    }
    if (roleKey === 'consultant_site') {
      const u = users.find(x => x.username === 'consultant' || x.role?.includes('CONSULTANT'));
      return { name: u?.fullName || 'مهندس محمدی (مدیر پروژه مشاور)', title: 'مدیر پروژه مهندسین مشاور', signature: u?.signature };
    }
    if (roleKey === 'employer_tech') {
      const u = users.find(x => x.username === 'employer_tech' || x.role?.includes('EMPLOYER'));
      return { name: u?.fullName || 'مهندس کریمی (کارشناس نظارت عالیه)', title: 'کارشناس بررسی‌کننده و کنترل پروژه', signature: u?.signature };
    }
    if (roleKey === 'employer_head') {
      const u = users.find(x => x.username === 'employer_head' || x.role?.includes('EMPLOYER'));
      return { name: u?.fullName || 'مهندس شریفی (رئیس اداره کنترل پروژه)', title: 'سرپرست واحد برنامه‌ریزی و کنترل', signature: u?.signature };
    }
    if (roleKey === 'employer_site') {
      const u = users.find(x => x.username === 'employer' || x.role?.includes('EMPLOYER'));
      return { name: u?.fullName || 'دکتر صادقی (مدیر طرح / نماینده کارفرما)', title: 'مدیر طرح / نماینده مجری طرح', signature: u?.signature };
    }
    return null;
  };

  const renderPrintSignatureBox = (roleHeader: string, roleKey: string) => {
    const signatory = getRoleSignatory(roleKey);
    const personName = signatory?.name ? `<div style="font-size: 7.5px; font-weight: bold; color: #334155; margin-bottom: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${signatory.name}">${signatory.name}</div>` : '';

    if (signatory && signatory.signature) {
      return `
        <div class="sig-box" style="flex: 1 1 0%; min-width: 0; text-align: center; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 4px; padding: 3px 2px; box-sizing: border-box; overflow: hidden;">
          <div style="font-weight: bold; font-size: 8px; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 1px; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${roleHeader}">${roleHeader}</div>
          <div style="height: 30px; display: flex; align-items: center; justify-content: center; margin: 1px 0;">
            <img src="${signatory.signature}" style="max-height: 26px; max-width: 100%; object-fit: contain; filter: contrast(120%);" alt="امضای دیجیتال" />
          </div>
          <div style="font-size: 7.5px; font-weight: bold; color: #1e293b; margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${signatory.name}">${signatory.name}</div>
          <div style="font-size: 6.5px; color: #059669; font-weight: bold; margin-top: 1px;">✓ امضاء معتبر</div>
          <div style="font-size: 6.5px; color: #64748b;">${new Date().toLocaleDateString('fa-IR')}</div>
        </div>
      `;
    }

    return `
      <div class="sig-box" style="flex: 1 1 0%; min-width: 0; text-align: center; background: #ffffff; border: 1px dashed #cbd5e1; border-radius: 4px; padding: 3px 2px; box-sizing: border-box; overflow: hidden;">
        <p style="font-weight: bold; font-size: 8px; margin: 0 0 1px 0; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${roleHeader}">${roleHeader}</p>
        ${personName}
        <div style="height: 26px; display: flex; align-items: center; justify-content: center; font-size: 7px; color: #94a3b8; font-style: italic;">مهر / امضاء</div>
        <div class="sig-line" style="border-top: 1px dashed #cbd5e1; padding-top: 1px; font-size: 7px; color: #64748b;">نام و امضاء</div>
      </div>
    `;
  };

  const fullHtml = `
    <!DOCTYPE html>
    <html dir="rtl" lang="fa">
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        <style>
          @font-face { font-family: 'Vazir'; src: url('https://cdn.jsdelivr.net/gh/rastikerdar/vazir-font@v30.1.0/dist/Vazir.woff2'); }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; box-sizing: border-box; }
          body { font-family: 'Vazir', Tahoma, sans-serif; padding: 15px; color: #1e293b; line-height: 1.4; background: #fff; width: 100%; margin: 0; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #1e40af; padding-bottom: 10px; margin-bottom: 15px; }
          .logo-section { display: flex; align-items: center; gap: 10px; }
          .logo-box { width: 36px; height: 36px; background: #1e40af; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 11px; }
          .content { min-height: 480px; }
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
            ${logoHtml || '<div class="logo-box">EVM</div>'}
            <div>
              <h1 style="margin: 0; color: #1e40af; font-size: 20px; font-weight: 900;">سامانه مدیریت و کنترل پروژه همیار</h1>
              <div style="font-size: 10px; color: #64748b; font-weight: bold; margin-top: 2px;">معاونت برنامه‌ریزی، کنترل پروژه و نظارت عالیه (Project Planning & EVM)</div>
            </div>
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
                ${renderPrintSignatureBox('کارشناس / تنظیم‌کننده کنترل پروژه', 'contractor_tech')}
                ${renderPrintSignatureBox('سرپرست واحد کنترل پروژه', 'contractor_head')}
                ${renderPrintSignatureBox('سرپرست کارگاه / مدیر پروژه', 'contractor_site')}
              </div>
            </div>

            <!-- 2. دستگاه نظارت و مشاور -->
            <div style="flex: 1 1 0%; min-width: 0; border: 1px solid #6ee7b7; background: #ecfdf5; border-radius: 6px; padding: 4px; box-sizing: border-box;">
              <div style="font-weight: bold; font-size: 9px; color: #065f46; text-align: center; border-bottom: 1px solid #a7f3d0; padding-bottom: 2px; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                مشاور: ${projectConsultant}
              </div>
              <div style="display: flex; flex-direction: row; gap: 3px; width: 100%;">
                ${renderPrintSignatureBox('کارشناس نظارت / کنترل پروژه', 'consultant_tech')}
                ${renderPrintSignatureBox('سرپرست واحد نظارت مقیم', 'consultant_head')}
                ${renderPrintSignatureBox('سرپرست نظارت / مدیر پروژه مشاور', 'consultant_site')}
              </div>
            </div>

            <!-- 3. دستگاه اجرایی و کارفرما -->
            <div style="flex: 1 1 0%; min-width: 0; border: 1px solid #d8b4fe; background: #faf5ff; border-radius: 6px; padding: 4px; box-sizing: border-box;">
              <div style="font-weight: bold; font-size: 9px; color: #6b21a8; text-align: center; border-bottom: 1px solid #e9d5ff; padding-bottom: 2px; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                کارفرما: ${projectEmployer}
              </div>
              <div style="display: flex; flex-direction: row; gap: 3px; width: 100%;">
                ${renderPrintSignatureBox('کارشناس نظارت عالیه و بررسی‌کننده', 'employer_tech')}
                ${renderPrintSignatureBox('سرپرست واحد برنامه‌ریزی و کنترل', 'employer_head')}
                ${renderPrintSignatureBox('مدیر طرح / نماینده مجری کارفرما', 'employer_site')}
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
  `;

  // Standard window.open flow with iframe fallback for sandbox/iframe environments
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(fullHtml);
      doc.close();
      iframe.contentWindow?.focus();
      setTimeout(() => {
        iframe.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 2000);
      }, 400);
    }
    return;
  }

  printWindow.document.write(fullHtml);
  printWindow.document.close();
}
