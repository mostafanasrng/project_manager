import React, { useState, useRef } from 'react';
import { Printer, X, CheckCircle2, FileSignature, Check, AlertCircle, PenTool, Sparkles } from 'lucide-react';
import { 
  Project, ProjectMinute, Statement, VariationOrder, 
  MrsRecord, MivRecord, EstimateItem, MetreRow, PriceListItem, ItemType,
  WorkflowStatus
} from '../../../types';
import { SystemAdminService } from '../../../services/systemAdminService';
import { OrganizationType } from '../../../systemAdminTypes';
import { HRService } from '../../../services/hrService';
import { formatUserDisplayFormal } from '../../utils/userFormatter';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportType: 'estimate' | 'minutes' | 'metre' | 'statements' | 'comparison' | 'materials' | 'miv' | 'balance' | 'materialsSingle' | 'mivSingle' | 'permits' | 'permitsLocation' | 'variation' | 'discrepancy' | null;
  contextData: any;
  currentProject: Project | undefined;
  selectedProjectId: string;
  mrsList: MrsRecord[];
  mivList: MivRecord[];
  estimates: EstimateItem[];
  metres: MetreRow[];
  minutes: ProjectMinute[];
  statements: Statement[];
  variations: VariationOrder[];
  discrepancyData: any;
  onPrintOfficial: () => void;
  getMaterialBalance: () => any[];
  getMultipliers: (code: string, type?: ItemType, independentCoef?: number) => { total: number };
  getRowEffectivePrice: (row: MetreRow | Partial<MetreRow>) => number;
  getMinuteTotals: (minuteId: string) => { raw: number, withCoeff: number, items: MetreRow[] };
  getStatementTotals: (statement: Statement) => { totalRaw: number, totalCoeff: number, includedMinutes: ProjectMinute[] };
  getStatementFinancials: (currentStmt: Statement) => { previous: number, current: number, cumulative: number, prevStmt: Statement | null };
  checkItemVisibility: (item: any, type: 'minute' | 'statement' | 'metre' | 'estimate') => boolean;
}

const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  reportType,
  contextData,
  currentProject,
  selectedProjectId,
  mrsList,
  mivList,
  estimates,
  metres,
  minutes,
  statements,
  variations,
  discrepancyData,
  onPrintOfficial,
  getMaterialBalance,
  getMultipliers,
  getRowEffectivePrice,
  getMinuteTotals,
  getStatementTotals,
  getStatementFinancials,
  checkItemVisibility,
}) => {
  const [reportSigs, setReportSigs] = useState<Record<string, { name: string; title: string; signature: string; date: string }>>({});
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  if (!isOpen || !currentProject) return null;

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const handleRegisterSignatureOnReport = () => {
    const curUser = SystemAdminService.getCurrentUser();
    if (!curUser) {
      showToast('لطفاً ابتدا وارد حساب کاربری خود شوید');
      return;
    }

    const hrSig = HRService.getUserSignature(curUser);
    if (hrSig) {
      applyUserSignatureToReport(hrSig);
    } else {
      setIsSignModalOpen(true);
    }
  };

  const applyUserSignatureToReport = (sigDataUrl: string) => {
    const curUser = SystemAdminService.getCurrentUser();
    if (!curUser) return;

    const org = SystemAdminService.getOrganization(curUser.orgId);
    let roleKey = 'reporter';

    const titleLower = ((curUser.jobTitle || '') + ' ' + (curUser.jobLevel || '')).toLowerCase();
    const orgType = (curUser as any).orgType || (curUser.orgId ? SystemAdminService.getOrganization(curUser.orgId)?.type : undefined);

    if (orgType === OrganizationType.EMPLOYER || titleLower.includes('کارفرما') || titleLower.includes('مدیر طرح') || titleLower.includes('مجری')) {
      if (titleLower.includes('سرپرست کارگاه') || titleLower.includes('مدیر پروژه') || titleLower.includes('مدیر طرح') || titleLower.includes('نماینده') || titleLower.includes('مجری') || titleLower.includes('رئیس کارگاه') || titleLower.includes('مدیر کارگاه') || titleLower.includes('مدیر عامل') || titleLower.includes('کارفرما')) {
        roleKey = 'employer';
      } else if (titleLower.includes('سرپرست واحد') || titleLower.includes('مدیر گروه') || titleLower.includes('رئیس اداره') || titleLower.includes('سرپرست گروه') || titleLower.includes('مدیر واحد') || titleLower.includes('سرپرست دفتر') || titleLower.includes('رئیس دفتر')) {
        roleKey = 'employer_head';
      } else {
        roleKey = 'employer_tech';
      }
    } else if (orgType === OrganizationType.CONSULTANT || titleLower.includes('ناظر') || titleLower.includes('مشاور') || titleLower.includes('سرپرست نظارت')) {
      if (titleLower.includes('سرپرست واحد') || titleLower.includes('سرپرست گروه') || titleLower.includes('رئیس گروه') || titleLower.includes('مدیر واحد') || titleLower.includes('رئیس دفتر') || titleLower.includes('سرپرست دفتر فنی') || titleLower.includes('مسئول دفتر فنی')) {
        roleKey = 'consultant_head';
      } else if (titleLower.includes('سرپرست نظارت') || titleLower.includes('سرپرست کارگاه') || titleLower.includes('مدیر پروژه') || titleLower.includes('مدیر نظارت') || titleLower.includes('رئیس نظارت') || titleLower.includes('مشاور') || titleLower.includes('رئیس کارگاه') || titleLower.includes('مدیر کارگاه') || titleLower.includes('ناظر مقیم')) {
        roleKey = 'consultant';
      } else {
        roleKey = 'consultant_tech';
      }
    } else if (titleLower.includes('سرپرست کارگاه') || titleLower.includes('مدیر پروژه') || titleLower.includes('رئیس کارگاه') || titleLower.includes('مدیر کارگاه')) {
      roleKey = 'contractor_site';
    } else if (titleLower.includes('سرپرست واحد') || titleLower.includes('سرپرست دفتر') || titleLower.includes('رئیس دفتر') || titleLower.includes('مدیر دفتر') || titleLower.includes('رئیس واحد') || titleLower.includes('سرپرست دفتر فنی')) {
      roleKey = 'contractor_head';
    } else {
      roleKey = 'contractor_tech';
    }

    const newSigEntry = {
      name: curUser.fullName || curUser.username,
      title: curUser.jobTitle || 'مسئول مربوطه',
      signature: sigDataUrl,
      date: new Date().toLocaleDateString('fa-IR')
    };

    setReportSigs(prev => ({
      ...prev,
      [roleKey]: newSigEntry
    }));

    if (contextData && Array.isArray(contextData.workflowHistory)) {
      contextData.workflowHistory.push({
        actorName: curUser.fullName || curUser.username,
        actorTitle: curUser.jobTitle || 'امضاء گزارش رسمی',
        action: 'REPORT_SIGNATURE',
        roleKey: roleKey,
        timestamp: Date.now(),
        signature: sigDataUrl
      });
    }

    showToast(`امضای الکترونیکی ${curUser.fullName || curUser.username} با موفقیت بر روی گزارش ثبت شد`);
  };

  const handleSaveDrawnSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const curUser = SystemAdminService.getCurrentUser();
    if (curUser) {
      HRService.saveUserSignature(curUser.id || curUser.username, dataUrl);
    }
    applyUserSignatureToReport(dataUrl);
    setIsSignModalOpen(false);
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0f172a';
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const renderReportContent = () => {
    switch (reportType) {
      case 'materials':
      case 'miv':
        return (
          <table className="w-full border-collapse border border-black text-xs text-black">
            <thead>
              <tr className="bg-gray-200">
                <th className="border border-black p-2 w-10 text-black">#</th>
                <th className="border border-black p-2 w-20 text-black">تاریخ</th>
                <th className="border border-black p-2 w-20 text-black">{reportType === 'materials' ? 'سریال قبض' : 'شماره حواله'}</th>
                <th className="border border-black p-2 w-32 text-black">نوع مصالح</th>
                <th className="border border-black p-2 text-black">{reportType === 'materials' ? 'شرح مصالح' : 'شرح اقلام'}</th>
                <th className="border border-black p-2 w-24 text-black">{reportType === 'materials' ? 'محل دپو' : 'درخواست کننده'}</th>
                <th className="border border-black p-2 w-24 text-black">وضعیت</th>
              </tr>
            </thead>
            <tbody>
              {(reportType === 'materials' ? mrsList : mivList).filter(i => i.projectId === selectedProjectId).map((record: any, i) => (
                <tr key={i}>
                  <td className="border border-black p-2 text-center text-black">{(i + 1).toLocaleString('fa-IR', {minimumIntegerDigits: 2, useGrouping: false})}</td>
                  <td className="border border-black p-2 text-center text-black">{record.date || record.entryDate}</td>
                  <td className="border border-black p-2 text-center text-black">{record.serialNumber}</td>
                  <td className="border border-black p-2 text-black">
                    {record.items.map((it: any, idx: number) => (
                      <div key={idx}>{it.materialType}</div>
                    ))}
                  </td>
                  <td className="border border-black p-2 text-black">
                    {record.items.map((it: any, idx: number) => (
                      <div key={idx}>- {it.materialName} ({it.quantity} {it.unit})</div>
                    ))}
                  </td>
                  <td className="border border-black p-2 text-black">{record.storageLocation || record.requestedBy}</td>
                  <td className="border border-black p-2 text-center text-black">
                    {record.status === 'APPROVED' ? 'تایید' : record.status === 'REJECTED' ? 'رد' : 'معلق'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      
      case 'materialsSingle':
      case 'mivSingle':
        if (!contextData) return null;
        return (
          <div className="border-2 border-black p-6 rounded-xl text-black">
            <div className="grid grid-cols-2 gap-8 mb-8">
              <div><span className="block font-bold text-sm text-black mb-1">شماره سند:</span><div className="text-xl font-black font-mono text-black">{contextData.serialNumber}</div></div>
              <div className="text-left"><span className="block font-bold text-sm text-black mb-1">تاریخ:</span><div className="text-lg font-black text-black">{contextData.entryDate || contextData.date}</div></div>
            </div>
            {reportType === 'mivSingle' && (
              <div className="mb-4 text-xs font-bold border border-black p-2">درخواست کننده: {contextData.requestedBy} | محل مصرف: {contextData.location}</div>
            )}
            <table className="w-full border-collapse border border-black mb-8 text-black">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border border-black p-2 w-10 text-center">#</th>
                  <th className="border border-black p-2 w-32">نوع مصالح</th>
                  <th className="border border-black p-2">شرح</th>
                  <th className="border border-black p-2 w-20">مقدار</th>
                  <th className="border border-black p-2 w-16">واحد</th>
                  {reportType === 'mivSingle' && <th className="border border-black p-2">توضیحات</th>}
                </tr>
              </thead>
              <tbody>
                {contextData.items.map((item: any, i: number) => (
                  <tr key={i}>
                    <td className="border border-black p-2 text-center">{(i + 1).toLocaleString('fa-IR', {minimumIntegerDigits: 2, useGrouping: false})}</td>
                    <td className="border border-black p-2">{item.materialType || '---'}</td>
                    <td className="border border-black p-2">{item.materialName}</td>
                    <td className="border border-black p-2 text-center font-bold">{item.quantity}</td>
                    <td className="border border-black p-2 text-center">{item.unit}</td>
                    {reportType === 'mivSingle' && <td className="border border-black p-2">{item.remarks}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="grid grid-cols-2 gap-0 border border-black mt-12 text-center">
              <div className="border-l border-black p-8">
                <div className="font-bold mb-8">{reportType === 'materialsSingle' ? 'تحویل دهنده (پیمانکار)' : 'انباردار'}</div>
              </div>
              <div className="p-8">
                <div className="font-bold mb-8">{reportType === 'materialsSingle' ? 'تحویل گیرنده (انباردار)' : 'سرپرست کارگاه'}</div>
              </div>
            </div>
          </div>
        );

      case 'balance':
        return (
          <>
            <div className="mb-4 bg-slate-100 p-2 text-center border border-black font-bold text-black">گزارش جامع موجودی انبار (Material Balance Sheet)</div>
            <table className="w-full border-collapse border border-black text-xs text-black">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border border-black p-2 w-10 text-black">ردیف</th>
                  <th className="border border-black p-2 w-32 text-black">نوع</th>
                  <th className="border border-black p-2 text-black">شرح مصالح</th>
                  <th className="border border-black p-2 w-24 text-center bg-emerald-100 text-black">مجموع وارده</th>
                  <th className="border border-black p-2 w-24 text-center bg-amber-100 text-black">مجموع مصرفی</th>
                  <th className="border border-black p-2 w-24 text-center bg-blue-100 text-black">موجودی</th>
                  <th className="border border-black p-2 w-16 text-center text-black">واحد</th>
                </tr>
              </thead>
              <tbody>
                {(contextData || getMaterialBalance()).map((row: any, i: number) => (
                  <tr key={i}>
                    <td className="border border-black p-2 text-center">{(i + 1)}</td>
                    <td className="border border-black p-2 text-center">{row.materialType}</td>
                    <td className="border border-black p-2 font-bold">{row.materialName}</td>
                    <td className="border border-black p-2 text-center bg-emerald-50">{row.totalIn.toLocaleString()}</td>
                    <td className="border border-black p-2 text-center bg-amber-50">{row.totalOut.toLocaleString()}</td>
                    <td className={`border border-black p-2 text-center font-black ${row.remaining < 0 ? 'text-red-600' : ''}`}>{row.remaining.toLocaleString()}</td>
                    <td className="border border-black p-2 text-center">{row.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        );

      case 'variation':
        if (!contextData) return null;
        const vo = contextData as VariationOrder;
        return (
          <>
            <div className="border border-black p-4 mb-4 text-xs text-black grid grid-cols-2 gap-4">
              <div><strong>شماره دستورکار:</strong> {vo.number}</div>
              <div><strong>تاریخ:</strong> {vo.date}</div>
              <div className="col-span-2"><strong>موضوع تغییرات:</strong> {vo.description}</div>
              <div><strong>وضعیت:</strong> {vo.status === WorkflowStatus.APPROVED_INTERNAL || vo.status === WorkflowStatus.APPROVED_BY_CONSULTANT ? 'تصویب نهایی کارفرما' : 'در جریان'}</div>
            </div>
            <table className="w-full border-collapse border border-black text-[10px] text-black">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border border-black p-1 w-12 text-center">ردیف</th>
                  <th className="border border-black p-1 w-16 text-center">کد آیتم</th>
                  <th className="border border-black p-1">شرح عملیات</th>
                  <th className="border border-black p-1 w-10 text-center">واحد</th>
                  <th className="border border-black p-1 w-16 text-center bg-gray-50">مقدار اولیه</th>
                  <th className="border border-black p-1 w-16 text-center bg-emerald-50">مقدار مصوب</th>
                  <th className="border border-black p-1 w-16 text-center bg-yellow-50">تغییرات</th>
                  <th className="border border-black p-1 w-20 text-center">بهای واحد</th>
                  <th className="border border-black p-1 w-12 text-center">ضریب</th>
                  <th className="border border-black p-1 w-24 text-center">مبلغ افزایش/کاهش</th>
                </tr>
              </thead>
              <tbody>
                {vo.items.map((item, idx) => {
                  const diff = item.employerQty - item.originalQty;
                  const mult = getMultipliers(item.code, item.itemType, item.independentCoefficient).total;
                  const diffAmount = diff * item.unitPrice * mult;
                  if (Math.abs(diff) < 0.001) return null; 
                  return (
                    <tr key={item.code}>
                      <td className="border border-black p-1 text-center">{idx + 1}</td>
                      <td className="border border-black p-1 text-center dir-ltr">{item.code}</td>
                      <td className="border border-black p-1">{item.description}</td>
                      <td className="border border-black p-1 text-center">{item.unit}</td>
                      <td className="border border-black p-1 text-center bg-gray-50">{item.originalQty}</td>
                      <td className="border border-black p-1 text-center font-bold bg-emerald-50">{item.employerQty}</td>
                      <td className={`border border-black p-1 text-center font-bold dir-ltr bg-yellow-50 ${diff > 0 ? 'text-green-700' : 'text-red-700'}`}>{diff > 0 ? '+' : ''}{diff}</td>
                      <td className="border border-black p-1 text-center">{item.unitPrice.toLocaleString()}</td>
                      <td className="border border-black p-1 text-center">{mult.toFixed(3)}</td>
                      <td className={`border border-black p-1 text-center font-bold dir-ltr ${diffAmount > 0 ? 'text-green-700' : 'text-red-700'}`}>{diffAmount > 0 ? '+' : ''}{Math.round(diffAmount).toLocaleString()}</td>
                    </tr>
                  );
                }).filter(Boolean)}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100 font-black">
                  <td colSpan={9} className="border border-black p-2 text-left">جمع کل تغییرات ریالی (با اعمال ضرایب):</td>
                  <td className="border border-black p-2 text-center dir-ltr">
                    {vo.items.reduce((acc, item) => {
                      const diff = item.employerQty - item.originalQty;
                      const mult = getMultipliers(item.code, item.itemType, item.independentCoefficient).total;
                      return acc + (diff * item.unitPrice * mult);
                    }, 0).toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
            <div className="mt-4 p-2 border border-black text-xs text-black">
              <strong>تحلیل مالی:</strong> 
              {' '}مبلغ اولیه پیمان: {currentProject.initialBudget?.toLocaleString()} ریال | 
              {' '}درصد تغییرات این دستورکار: {
                ((vo.items.reduce((acc, item) => {
                  const diff = item.employerQty - item.originalQty;
                  const mult = getMultipliers(item.code, item.itemType, item.independentCoefficient).total;
                  return acc + (diff * item.unitPrice * mult);
                }, 0) / (currentProject.initialBudget || 1)) * 100).toFixed(2)
              }%
            </div>
          </>
        );

      case 'comparison':
        if (!contextData) return null;
        const stmtComp = contextData as Statement & { comparison: any };
        return (
          <>
            <div className="mb-6 p-4 border border-black bg-slate-50 text-black rounded text-center">
              <h3 className="font-bold mb-2">خلاصه مقایسه</h3>
              <div className="flex justify-center gap-8 text-sm">
                <div><strong>صورت‌وضعیت فعلی:</strong> {stmtComp.number}</div>
                <div><strong>صورت‌وضعیت مبنا (قبلی):</strong> {stmtComp.comparison.prevStmt ? stmtComp.comparison.prevStmt.number : 'فاقد سابقه'}</div>
                <div><strong>مبلغ اختلاف کل (با ضرایب):</strong> <span dir="ltr">{stmtComp.comparison.totalDiffAmount > 0 ? '+' : ''}{stmtComp.comparison.totalDiffAmount.toLocaleString()}</span> ریال</div>
              </div>
            </div>
            <table className="w-full border-collapse border border-black text-[10px] text-black">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border border-black p-1 w-16 text-center">کد آیتم</th>
                  <th className="border border-black p-1">شرح عملیات</th>
                  <th className="border border-black p-1 w-10 text-center">واحد</th>
                  <th className="border border-black p-1 w-16 text-center">مقدار قبلی</th>
                  <th className="border border-black p-1 w-16 text-center">مقدار فعلی</th>
                  <th className="border border-black p-1 w-16 text-center bg-yellow-50">اختلاف مقدار</th>
                  <th className="border border-black p-1 w-20 text-center">مبلغ قبلی (با ضریب)</th>
                  <th className="border border-black p-1 w-20 text-center">مبلغ فعلی (با ضریب)</th>
                  <th className="border border-black p-1 w-20 text-center bg-yellow-50">اختلاف مبلغ</th>
                </tr>
              </thead>
              <tbody>
                {(stmtComp.comparison.rows as any[]).map((row, idx) => (
                  <tr key={idx}>
                    <td className="border border-black p-1 text-center dir-ltr">{row.code}</td>
                    <td className="border border-black p-1">{row.desc}</td>
                    <td className="border border-black p-1 text-center">{row.unit}</td>
                    <td className="border border-black p-1 text-center">{row.prevQty.toLocaleString()}</td>
                    <td className="border border-black p-1 text-center">{row.currQty.toLocaleString()}</td>
                    <td className={`border border-black p-1 text-center font-bold dir-ltr ${row.diffQty > 0 ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'}`}>{row.diffQty > 0 ? '+' : ''}{row.diffQty.toLocaleString()}</td>
                    <td className="border border-black p-1 text-center">{row.prevAmnt.toLocaleString()}</td>
                    <td className="border border-black p-1 text-center">{row.currAmnt.toLocaleString()}</td>
                    <td className={`border border-black p-1 text-center font-bold dir-ltr ${row.diffAmnt > 0 ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'}`}>{row.diffAmnt > 0 ? '+' : ''}{row.diffAmnt.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100 font-black">
                  <td colSpan={8} className="border border-black p-2 text-left">جمع کل تغییرات ریالی (افزایشی/کاهشی):</td>
                  <td className={`border border-black p-2 text-center dir-ltr ${stmtComp.comparison.totalDiffAmount > 0 ? 'text-green-700' : 'text-red-700'}`}>{stmtComp.comparison.totalDiffAmount > 0 ? '+' : ''}{stmtComp.comparison.totalDiffAmount.toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          </>
        );

      case 'estimate': {
        const resolveEstType = (
          code: string,
          explicitType?: string,
          desc?: string,
          coef?: number,
        ): "NORMAL" | "STARRED" | "INVOICE" => {
          const expUpper = (explicitType || "").toUpperCase();
          if (expUpper === "STARRED") return "STARRED";
          if (expUpper === "INVOICE" || expUpper === "NEW") return "INVOICE";
          if (code && (code.includes("*") || code.startsWith("*") || code.endsWith("*"))) {
            return "STARRED";
          }
          const d = (desc || "").toLowerCase();
          if (d.includes("ستاره") || d.includes("starred") || d.includes("قیمت توافقی")) {
            return "STARRED";
          }
          if (d.includes("فاکتور") || d.includes("invoice") || d.includes("قیمت جدید")) {
            return "INVOICE";
          }
          if (coef && coef !== 1 && coef > 0) {
            return "STARRED";
          }
          return "NORMAL";
        };

        const filteredEstimates = estimates.filter(
          e => e.projectId === selectedProjectId && checkItemVisibility(e, 'estimate')
        );

        let nCnt = 0, sCnt = 0, iCnt = 0;
        let nTot = 0, sTot = 0, iTot = 0;

        filteredEstimates.forEach(item => {
          const t = resolveEstType(item.code, item.itemType, item.description, item.independentCoefficient);
          const mult = getMultipliers(item.code, item.itemType, item.independentCoefficient).total;
          const tot = item.quantity * item.unitPrice * mult;
          if (t === "STARRED") { sCnt++; sTot += tot; }
          else if (t === "INVOICE") { iCnt++; iTot += tot; }
          else { nCnt++; nTot += tot; }
        });

        return (
          <>
            <div className="mb-4 grid grid-cols-3 gap-3">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
                <div className="text-xs font-bold text-blue-900 mb-1">🔹 پایه فهرست‌بها ({nCnt.toLocaleString('fa-IR')} ردیف)</div>
                <div className="text-sm font-black text-blue-900 font-mono">{Math.round(nTot).toLocaleString('fa-IR')} <span className="text-[10px] font-normal">ریال</span></div>
              </div>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-center">
                <div className="text-xs font-bold text-amber-900 mb-1">⭐ ستاره‌دار ({sCnt.toLocaleString('fa-IR')} ردیف)</div>
                <div className="text-sm font-black text-amber-900 font-mono">{Math.round(sTot).toLocaleString('fa-IR')} <span className="text-[10px] font-normal">ریال</span></div>
              </div>
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-center">
                <div className="text-xs font-bold text-purple-900 mb-1">🧾 فاکتوری / جدید ({iCnt.toLocaleString('fa-IR')} ردیف)</div>
                <div className="text-sm font-black text-purple-900 font-mono">{Math.round(iTot).toLocaleString('fa-IR')} <span className="text-[10px] font-normal">ریال</span></div>
              </div>
            </div>

            <table className="w-full border-collapse border border-black text-xs text-black">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border border-black p-2 w-10 text-center">ردیف</th>
                  <th className="border border-black p-2 w-28 text-center">کد و نوع آیتم</th>
                  <th className="border border-black p-2">شرح عملیات</th>
                  <th className="border border-black p-2 w-12 text-center">واحد</th>
                  <th className="border border-black p-2 w-16 text-center">مقدار</th>
                  <th className="border border-black p-2 w-24 text-center">بهای واحد</th>
                  <th className="border border-black p-2 w-12 text-center">ضریب</th>
                  <th className="border border-black p-2 w-24 text-center">مبلغ خام</th>
                  <th className="border border-black p-2 w-24 text-center">مبلغ با ضریب</th>
                </tr>
              </thead>
              <tbody>
                {filteredEstimates.map((item, idx) => {
                  const itemType = resolveEstType(item.code, item.itemType, item.description, item.independentCoefficient);
                  const multipliers = getMultipliers(item.code, item.itemType, item.independentCoefficient);
                  const rawAmount = item.quantity * item.unitPrice;
                  const finalAmount = rawAmount * multipliers.total;
                  return (
                    <tr key={item.id} className={itemType === "STARRED" ? "bg-amber-50/40" : itemType === "INVOICE" ? "bg-purple-50/40" : ""}>
                      <td className="border border-black p-2 text-center">{(idx + 1).toLocaleString('fa-IR', {minimumIntegerDigits: 2, useGrouping: false})}</td>
                      <td className="border border-black p-2 text-center">
                        <div className="font-mono font-bold">{item.code}</div>
                        {itemType === "STARRED" ? (
                          <span className="inline-block mt-0.5 text-[9px] bg-amber-100 text-amber-900 border border-amber-300 px-1 py-0.2 rounded font-bold">⭐ ستاره‌دار</span>
                        ) : itemType === "INVOICE" ? (
                          <span className="inline-block mt-0.5 text-[9px] bg-purple-100 text-purple-900 border border-purple-300 px-1 py-0.2 rounded font-bold">🧾 فاکتوری</span>
                        ) : (
                          <span className="inline-block mt-0.5 text-[9px] bg-blue-50 text-blue-800 border border-blue-200 px-1 py-0.2 rounded font-bold">🔹 پایه فهرست</span>
                        )}
                      </td>
                      <td className="border border-black p-2">{item.description}</td>
                      <td className="border border-black p-2 text-center">{item.unit}</td>
                      <td className="border border-black p-2 text-center">{item.quantity}</td>
                      <td className="border border-black p-2 text-center">{item.unitPrice.toLocaleString()}</td>
                      <td className="border border-black p-2 text-center">{multipliers.total.toFixed(4)}</td>
                      <td className="border border-black p-2 text-center">{rawAmount.toLocaleString()}</td>
                      <td className="border border-black p-2 text-center font-bold">{finalAmount.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100 font-bold">
                  <td colSpan={7} className="border border-black p-2 text-left">جمع کل (ریال):</td>
                  <td className="border border-black p-2 text-center">
                    {filteredEstimates.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0).toLocaleString()}
                  </td>
                  <td className="border border-black p-2 text-center">
                    {filteredEstimates.reduce((sum, item) => sum + (item.quantity * item.unitPrice * getMultipliers(item.code, item.itemType, item.independentCoefficient).total), 0).toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </>
        );
      }

      case 'metre':
        return (
          <table className="w-full border-collapse border border-black text-xs text-black">
            <thead>
              <tr className="bg-gray-200">
                <th className="border border-black p-2 w-10 text-center">ردیف</th>
                <th className="border border-black p-2 w-24 text-center">کد آیتم</th>
                <th className="border border-black p-2">شرح عملیات</th>
                <th className="border border-black p-2 w-12 text-center">واحد</th>
                <th className="border border-black p-2 w-12 text-center">تعداد</th>
                <th className="border border-black p-2 w-12 text-center">طول</th>
                <th className="border border-black p-2 w-12 text-center">عرض</th>
                <th className="border border-black p-2 w-12 text-center">ارتفاع</th>
                <th className="border border-black p-2 w-12 text-center">ضریب</th>
                <th className="border border-black p-2 w-20 text-center">جمع جزء</th>
              </tr>
            </thead>
            <tbody>
              {metres.filter(m => m.projectId === selectedProjectId && checkItemVisibility(m, 'metre')).map((item, idx) => (
                <tr key={item.id}>
                  <td className="border border-black p-2 text-center">{(idx + 1).toLocaleString('fa-IR', {minimumIntegerDigits: 2, useGrouping: false})}</td>
                  <td className="border border-black p-2 text-center dir-ltr">{item.itemCode}</td>
                  <td className="border border-black p-2">{item.description}</td>
                  <td className="border border-black p-2 text-center">{item.unit}</td>
                  <td className="border border-black p-2 text-center">{item.count}</td>
                  <td className="border border-black p-2 text-center">{item.length}</td>
                  <td className="border border-black p-2 text-center">{item.width}</td>
                  <td className="border border-black p-2 text-center">{item.height}</td>
                  <td className="border border-black p-2 text-center">{item.multiplier}</td>
                  <td className="border border-black p-2 text-center font-bold">{item.partialTotal}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case 'minutes':
        if (!contextData) {
          return (
            <table className="w-full border-collapse border border-black text-xs text-black">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border border-black p-2 w-10 text-center">ردیف</th>
                  <th className="border border-black p-2 w-24 text-center">شماره</th>
                  <th className="border border-black p-2 w-24 text-center">تاریخ</th>
                  <th className="border border-black p-2">موضوع صورت‌جلسه</th>
                  <th className="border border-black p-2 w-48 text-center">موقعیت</th>
                </tr>
              </thead>
              <tbody>
                {minutes.filter(m => m.projectId === selectedProjectId && checkItemVisibility(m, 'minute')).map((item, idx) => (
                  <tr key={item.id}>
                    <td className="border border-black p-2 text-center">{(idx + 1).toLocaleString('fa-IR', {minimumIntegerDigits: 2, useGrouping: false})}</td>
                    <td className="border border-black p-2 text-center font-bold">{item.number}</td>
                    <td className="border border-black p-2 text-center">{item.date}</td>
                    <td className="border border-black p-2">{item.description}</td>
                    <td className="border border-black p-2 text-center">{item.location}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          );
        } else {
          return (
            <>
              <div className="border border-black p-4 mb-4 text-xs text-black grid grid-cols-2 gap-4">
                <div><strong>شماره:</strong> {contextData.number}</div>
                <div><strong>تاریخ:</strong> {contextData.date}</div>
                <div className="col-span-2"><strong>موضوع:</strong> {contextData.description}</div>
                <div className="col-span-2"><strong>محل اجرا:</strong> {contextData.location}</div>
              </div>
              <table className="w-full border-collapse border border-black text-xs text-black">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="border border-black p-2 w-10 text-center">ردیف</th>
                    <th className="border border-black p-2 w-20 text-center">کد آیتم</th>
                    <th className="border border-black p-2">شرح عملیات</th>
                    <th className="border border-black p-2 w-12 text-center">واحد</th>
                    <th className="border border-black p-2 w-16 text-center">مقدار</th>
                    <th className="border border-black p-2 w-20 text-center">بهای واحد</th>
                    <th className="border border-black p-2 w-12 text-center">ضریب</th>
                    <th className="border border-black p-2 w-24 text-center">مبلغ خام</th>
                    <th className="border border-black p-2 w-24 text-center">مبلغ با ضریب</th>
                  </tr>
                </thead>
                <tbody>
                  {getMinuteTotals(contextData.id).items.map((item, idx) => {
                    const up = getRowEffectivePrice(item);
                    const multipliers = getMultipliers(item.itemCode, item.itemType, item.independentCoefficient);
                    const raw = item.partialTotal * up;
                    const final = raw * multipliers.total;
                    return (
                      <tr key={item.id}>
                        <td className="border border-black p-2 text-center">{(idx + 1).toLocaleString('fa-IR', {minimumIntegerDigits: 2, useGrouping: false})}</td>
                        <td className="border border-black p-2 text-center">{item.itemCode}</td>
                        <td className="border border-black p-2">{item.description}</td>
                        <td className="border border-black p-2 text-center">{item.unit}</td>
                        <td className="border border-black p-2 text-center font-bold">{item.partialTotal}</td>
                        <td className="border border-black p-2 text-center">{up.toLocaleString()}</td>
                        <td className="border border-black p-2 text-center">{multipliers.total.toFixed(4)}</td>
                        <td className="border border-black p-2 text-center">{raw.toLocaleString()}</td>
                        <td className="border border-black p-2 text-center font-bold">{final.toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-100 font-bold">
                    <td colSpan={7} className="border border-black p-2 text-left">جمع کل (ریال):</td>
                    <td className="border border-black p-2 text-center">{getMinuteTotals(contextData.id).raw.toLocaleString()}</td>
                    <td className="border border-black p-2 text-center">{getMinuteTotals(contextData.id).withCoeff.toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            </>
          );
        }

      case 'statements':
        if (!contextData) {
          return (
            <table className="w-full border-collapse border border-black text-xs text-black">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border border-black p-2 w-10 text-center">ردیف</th>
                  <th className="border border-black p-2 w-20 text-center">شماره</th>
                  <th className="border border-black p-2 w-48 text-center">دوره کارکرد</th>
                  <th className="border border-black p-2">توضیحات</th>
                  <th className="border border-black p-2 w-32 text-center">مبلغ تایید شده</th>
                </tr>
              </thead>
              <tbody>
                {statements.filter(s => s.projectId === selectedProjectId && checkItemVisibility(s, 'statement')).map((item, idx) => (
                  <tr key={item.id}>
                    <td className="border border-black p-2 text-center">{(idx + 1).toLocaleString('fa-IR', {minimumIntegerDigits: 2, useGrouping: false})}</td>
                    <td className="border border-black p-2 text-center font-bold">{item.number}</td>
                    <td className="border border-black p-2 text-center">{item.startDate} تا {item.endDate}</td>
                    <td className="border border-black p-2">{item.description}</td>
                    <td className="border border-black p-2 text-center font-bold">{getStatementTotals(item).totalCoeff.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          );
        } else {
          return (
            <>
              <div className="border border-black p-4 mb-4 text-xs text-black grid grid-cols-2 gap-4">
                <div><strong>شماره صورت‌وضعیت:</strong> {contextData.number}</div>
                <div><strong>دوره کارکرد:</strong> از {contextData.startDate} تا {contextData.endDate}</div>
                <div className="col-span-2"><strong>توضیحات:</strong> {contextData.description}</div>
              </div>
              <div className="border border-black mb-4 bg-slate-50 text-black">
                <h4 className="font-bold text-sm p-2 border-b border-black text-center bg-gray-200">خلاصه مالی صورت‌وضعیت</h4>
                <div className="grid grid-cols-3 divide-x divide-x-reverse divide-black font-bold text-sm text-center">
                  <div className="p-3">
                    <div className="text-[10px] text-gray-500 mb-1">مبلغ تا صورت‌وضعیت قبل</div>
                    <div>{getStatementFinancials(contextData).previous.toLocaleString()} <span className="text-[9px]">ریال</span></div>
                  </div>
                  <div className="p-3">
                    <div className="text-[10px] text-gray-500 mb-1">مبلغ این دوره</div>
                    <div>{getStatementFinancials(contextData).current.toLocaleString()} <span className="text-[9px]">ریال</span></div>
                  </div>
                  <div className="p-3">
                    <div className="text-[10px] text-gray-500 mb-1">مجموع تجمعی</div>
                    <div>{getStatementFinancials(contextData).cumulative.toLocaleString()} <span className="text-[9px]">ریال</span></div>
                  </div>
                </div>
              </div>
            </>
          );
        }

      case 'discrepancy':
        return (
          <>
            <div className="mb-4 bg-slate-100 p-2 text-center border border-black font-bold text-black">گزارش مغایرت‌های مقادیر (برآورد اولیه در مقابل اجرا - تفکیک اقلام پایه، ستاره‌دار و فاکتوری)</div>
            <table className="w-full border-collapse border border-black text-[9px] text-black">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border border-black p-1 w-8">#</th>
                  <th className="border border-black p-1 w-24">کد و نوع آیتم</th>
                  <th className="border border-black p-1">شرح آیتم</th>
                  <th className="border border-black p-1 w-8">واحد</th>
                  <th className="border border-black p-1 w-16">مقدار برآورد</th>
                  <th className="border border-black p-1 w-16">مقدار اجرا</th>
                  <th className="border border-black p-1 w-16">اختلاف مقدار</th>
                  <th className="border border-black p-1 w-24">مبلغ اختلاف (با ضرایب)</th>
                </tr>
              </thead>
              <tbody>
                {discrepancyData.items.map((row: any, i: number) => {
                  const itemType = (row.itemType || "NORMAL").toUpperCase();
                  const isStarred = itemType === "STARRED";
                  const isInvoice = itemType === "INVOICE" || itemType === "NEW";
                  return (
                    <tr key={i} className={isStarred ? "bg-amber-50/50" : isInvoice ? "bg-purple-50/50" : ""}>
                      <td className="border border-black p-1 text-center">{i + 1}</td>
                      <td className="border border-black p-1 text-center">
                        <div className="font-mono font-bold">{row.code}</div>
                        {isStarred ? (
                          <span className="inline-block mt-0.5 text-[8.5px] bg-amber-100 text-amber-900 border border-amber-300 px-1 py-0.2 rounded font-black">⭐ ستاره‌دار</span>
                        ) : isInvoice ? (
                          <span className="inline-block mt-0.5 text-[8.5px] bg-purple-100 text-purple-900 border border-purple-300 px-1 py-0.2 rounded font-black">🧾 فاکتوری</span>
                        ) : (
                          <span className="inline-block mt-0.5 text-[8.5px] bg-blue-50 text-blue-800 border border-blue-200 px-1 py-0.2 rounded font-bold">🔹 پایه فهرست</span>
                        )}
                      </td>
                      <td className="border border-black p-1">
                        <div>{row.description}</div>
                        {row.isExtra && (
                          <span className="inline-block mt-0.5 text-[8px] bg-red-100 text-red-800 border border-red-200 px-1 rounded font-bold">📌 ردیف جدید خارج از برآورد</span>
                        )}
                      </td>
                      <td className="border border-black p-1 text-center">{row.unit}</td>
                      <td className="border border-black p-1 text-center">{row.estQty.toLocaleString()}</td>
                      <td className="border border-black p-1 text-center">{row.execQty.toLocaleString()}</td>
                      <td className={`border border-black p-1 text-center font-bold ${row.diffQty > 0 ? 'text-green-700' : 'text-red-700'}`}>{row.diffQty > 0 ? '+' : ''}{row.diffQty.toLocaleString()}</td>
                      <td className={`border border-black p-1 text-center font-bold ${row.diffAmnt > 0 ? 'text-green-700' : 'text-red-700'}`}>{row.diffAmnt.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100 font-bold">
                  <td colSpan={7} className="border border-black p-2 text-left">مجموع تغییرات کل پیمان (ریال):</td>
                  <td className={`border border-black p-2 text-center ${discrepancyData.totals.diff > 0 ? 'text-green-700' : 'text-red-700'}`}>{discrepancyData.totals.diff.toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          </>
        );

      default:
        return <div className="p-10 text-center text-slate-400">در حال تولید گزارش...</div>;
    }
  };

  const getReportTitle = () => {
    switch (reportType) {
      case 'comparison': return 'گزارش مقایسه‌ای صورت‌وضعیت‌ها (تغییرات نسبت به دوره قبل)';
      case 'permits': return 'برگ درخواست صدور مجوز انجام عملیات (Work Permit)';
      case 'permitsLocation': return 'گزارش جامع مجوزهای کار (به تفکیک موقعیت)';
      case 'materials': return 'گزارش کنترل مصالح وارده (تفکیکی MRS)';
      case 'miv': return 'گزارش حواله خروج مصالح (تفکیکی MIV)';
      case 'materialsSingle': return 'رسید تحویل مصالح (MRS Ticket)';
      case 'mivSingle': return 'حواله خروج مصالح (MIV Ticket)';
      case 'balance': return 'گزارش موجودی و بالانس متریال';
      case 'estimate': return 'خلاصه متره و برآورد ریالی پیمان';
      case 'metre': return 'ریزمتره و مقادیر کارکرد اجرایی';
      case 'minutes': return contextData ? 'صورت‌جلسه کارگاهی (احجام و مقادیر)' : 'گزارش لیست صورت‌جلسات پروژه';
      case 'statements': return contextData ? 'صورت‌وضعیت کارکرد موقت' : 'گزارش لیست صورت‌وضعیت‌های کارکرد';
      case 'variation': return 'گزارش تغییر مقادیر پیمان (Variation Order)';
      case 'discrepancy': return 'گزارش مغایرت‌های مقادیر و ریالی پیمان';
      default: return 'گزارش';
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-5xl max-h-[95vh] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="font-black text-slate-800 flex items-center gap-2">
            <Printer size={20} className="text-blue-600" /> پیش‌نمایش چاپ استاندارد
          </h3>
          <div className="flex items-center gap-3">
             <button
               onClick={onPrintOfficial}
               className="flex items-center gap-2 bg-slate-100 text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl text-xs font-black hover:bg-slate-200 transition-all active:scale-95 shadow-sm cursor-pointer"
             >
               <Printer size={16} /> 
               چاپ رسمی گزارش
             </button>
             <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={20} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 bg-slate-200/50">
          <div id="report-modal-content" className="bg-white p-10 shadow-lg mx-auto max-w-[210mm] min-h-[297mm] origin-top text-right" style={{ direction: 'rtl' }}>
            <div className="border-b-4 border-double border-black pb-4 mb-6 text-black">
              <div className="flex justify-between items-start">
                <div className="text-center w-1/4 pt-2">
                  <div className="text-xs font-bold text-black">جمهوری اسلامی ایران</div>
                  <div className="text-[10px] font-bold text-black mt-1">سازمان مدیریت و برنامه‌ریزی</div>
                </div>
                <div className="flex-1 text-center">
                  <h1 className="text-xl font-black text-black mb-2">{getReportTitle()}</h1>
                  <div className="text-sm font-bold text-black border-t border-black pt-2 inline-block px-8">پروژه: {currentProject.title}</div>
                </div>
                <div className="w-1/4 text-left space-y-1 text-xs font-bold text-black">
                  <div className="flex justify-end gap-2 text-black"><span>تاریخ:</span><span>{new Date().toLocaleDateString('fa-IR')}</span></div>
                  <div className="flex justify-end gap-2 text-black"><span>شماره:</span><span>{contextData?.number || contextData?.serialNumber || ''}</span></div>
                  <div className="flex justify-end gap-2 text-black"><span>پیوست:</span><span></span></div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-4 text-xs border border-black p-2">
                <div className="font-bold text-black">کارفرما: {currentProject.employerName}</div>
                <div className="font-bold text-black border-r border-black pr-2">مشاور: {currentProject.consultantName}</div>
                <div className="font-bold text-black border-r border-black pr-2">پیمانکار: {currentProject.contractorName}</div>
              </div>
            </div>

            {renderReportContent()}

            {(() => {
              const users = SystemAdminService.getUsers();
              const history = (contextData?.workflowHistory || []) as any[];
              const proj = currentProject as any;
              const curUser = SystemAdminService.getCurrentUser();

              const matchEvent = (e: any, roleKey: string): boolean => {
                if (!e) return false;

                const actorUser = users.find(u => u.id === e.actorUserId || u.fullName === e.actorName || u.username === e.actorName);
                const orgId = e.actorOrgId || actorUser?.orgId;
                const orgType = e.actorOrgType || (actorUser as any)?.orgType || (orgId ? SystemAdminService.getOrganization(orgId)?.type : undefined);

                const isConsultantOrg = orgType === OrganizationType.CONSULTANT || (proj?.consultantOrgId && String(orgId) === String(proj.consultantOrgId));
                const isEmployerOrg = orgType === OrganizationType.EMPLOYER || (proj?.employerOrgId && String(orgId) === String(proj.employerOrgId));
                const isContractorOrg = !isConsultantOrg && !isEmployerOrg;

                if ((e.action === 'RESUBMIT' || e.action === 'SUBMIT') && !isContractorOrg) return false;

                if (e.roleKey) {
                  if (e.roleKey === roleKey) return true;
                  if (roleKey === 'permit_expert' && e.roleKey === 'contractor_tech') return true;
                  if (roleKey === 'permit_head' && e.roleKey === 'contractor_head') return true;
                  if (roleKey === 'permit_site' && e.roleKey === 'contractor_site') return true;
                  if (roleKey === 'permit_consultant' && (e.roleKey === 'consultant' || e.roleKey === 'consultant_site')) return true;
                  if ((roleKey === 'consultant' || roleKey === 'consultant_site') && (e.roleKey === 'consultant' || e.roleKey === 'consultant_site' || e.roleKey === 'permit_consultant')) return true;
                  if (roleKey === 'consultant_head' && e.roleKey === 'consultant_head') return true;
                  if (roleKey === 'employer_head' && e.roleKey === 'employer_head') return true;
                  if (roleKey === 'employer' && e.roleKey === 'employer') return true;
                }

                const title = ((e.actorTitle || actorUser?.jobTitle || e.actorName || '') + ' ' + (actorUser?.jobLevel || '')).toLowerCase();

                if (roleKey === 'contractor_tech' || roleKey === 'permit_expert') {
                  if (e.action === 'CREATE' || e.action === 'SUBMIT' || e.action === 'RESUBMIT') {
                    if (title.includes('سرپرست واحد') || title.includes('سرپرست کارگاه') || title.includes('مدیر پروژه') || title.includes('رئیس کارگاه')) return false;
                    return true;
                  }
                  if (e.action === 'SIGN' || e.action === 'REPORT_SIGNATURE') {
                    if (!isContractorOrg) return false;
                    if (title.includes('سرپرست واحد') || title.includes('سرپرست کارگاه') || title.includes('مدیر پروژه') || title.includes('رئیس کارگاه')) return false;
                    return title.includes('کارشناس') || title.includes('دفتر فنی') || title.includes('تهیه') || title.includes('عضو');
                  }
                  return false;
                }

                if (roleKey === 'contractor_head' || roleKey === 'permit_head') {
                  if (e.action === 'APPROVE' && e.fromStatus === WorkflowStatus.DRAFT) return true;
                  if (e.action === 'SIGN' || e.action === 'REPORT_SIGNATURE') {
                    if (!isContractorOrg) return false;
                    if (title.includes('سرپرست کارگاه') || title.includes('مدیر پروژه') || title.includes('رئیس کارگاه')) return false;
                    return title.includes('سرپرست واحد') || title.includes('سرپرست دفتر') || title.includes('رئیس دفتر') || title.includes('مدیر دفتر');
                  }
                  return false;
                }

                if (roleKey === 'contractor_site' || roleKey === 'permit_site') {
                  if (e.action === 'SEND_TO_CONSULTANT' || (e.action === 'APPROVE' && e.toStatus === WorkflowStatus.APPROVED_INTERNAL)) return true;
                  if (e.action === 'SIGN' || e.action === 'REPORT_SIGNATURE') {
                    if (!isContractorOrg) return false;
                    return title.includes('سرپرست کارگاه') || title.includes('مدیر پروژه') || title.includes('رئیس کارگاه') || title.includes('مدیر کارگاه') || e.roleKey === 'contractor_site' || e.roleKey === 'project_manager';
                  }
                  return false;
                }

                if (roleKey === 'consultant_tech') {
                  if (e.roleKey === 'consultant_tech') return true;
                  if (e.action === 'APPROVE' || e.action === 'SIGN' || e.action === 'REPORT_SIGNATURE') {
                    if (!isConsultantOrg && !title.includes('مشاور') && !title.includes('ناظر')) return false;
                    if (title.includes('سرپرست واحد') || title.includes('سرپرست گروه') || title.includes('سرپرست نظارت') || title.includes('مدیر پروژه') || title.includes('سرپرست کارگاه') || title.includes('مدیر نظارت') || title.includes('رئیس کارگاه')) return false;
                    return title.includes('کارشناس') || title.includes('ناظر') || title.includes('مقیم') || title.includes('دفتر فنی');
                  }
                  return false;
                }

                if (roleKey === 'consultant_head') {
                  if (e.roleKey === 'consultant_head') return true;
                  if (e.action === 'APPROVE' || e.action === 'SIGN' || e.action === 'REPORT_SIGNATURE') {
                    if (!isConsultantOrg && !title.includes('مشاور') && !title.includes('نظارت')) return false;
                    if (title.includes('سرپرست نظارت') || title.includes('مدیر پروژه') || title.includes('سرپرست کارگاه') || title.includes('مدیر نظارت') || title.includes('رئیس کارگاه')) return false;
                    return title.includes('سرپرست واحد') || title.includes('سرپرست گروه') || title.includes('رئیس گروه') || title.includes('مدیر واحد') || title.includes('سرپرست دفتر') || title.includes('رئیس دفتر');
                  }
                  return false;
                }

                if (roleKey === 'consultant' || roleKey === 'permit_consultant' || roleKey === 'consultant_site') {
                  if (e.roleKey === 'consultant' || e.roleKey === 'consultant_site' || e.roleKey === 'permit_consultant') return true;
                  if (e.action === 'SEND_TO_EMPLOYER' || e.action === 'APPROVE' || e.action === 'RETURN_TO_CONTRACTOR' || e.action === 'SIGN' || e.action === 'REPORT_SIGNATURE') {
                    if (isConsultantOrg) return true;
                    return title.includes('مشاور') || title.includes('ناظر') || title.includes('نظارت') || title.includes('سرپرست کارگاه') || title.includes('مدیر پروژه');
                  }
                  return false;
                }

                if (roleKey === 'employer_tech') {
                  if (e.roleKey === 'employer_tech') return true;
                  if (e.action === 'APPROVE' || e.action === 'SIGN' || e.action === 'REPORT_SIGNATURE') {
                    if (!isEmployerOrg && !title.includes('کارفرما')) return false;
                    if (title.includes('سرپرست واحد') || title.includes('مدیر گروه') || title.includes('مدیر طرح') || title.includes('نماینده') || title.includes('سرپرست کارگاه') || title.includes('مدیر پروژه') || title.includes('رئیس اداره') || title.includes('رئیس کارگاه')) return false;
                    return title.includes('کارشناس') || title.includes('بررسی') || title.includes('فنی');
                  }
                  return false;
                }

                if (roleKey === 'employer_head') {
                  if (e.roleKey === 'employer_head') return true;
                  if (e.action === 'APPROVE' || e.action === 'SIGN' || e.action === 'REPORT_SIGNATURE' || e.action === 'FINAL_APPROVE' || e.action === 'RETURN_TO_CONSULTANT' || e.action === 'REASSIGN') {
                    if (!isEmployerOrg && !title.includes('کارفرما')) return false;
                    if (title.includes('مدیر طرح') || title.includes('نماینده') || title.includes('مدیر پروژه') || title.includes('سرپرست کارگاه') || title.includes('رئیس کارگاه')) return false;
                    return title.includes('سرپرست واحد') || title.includes('مدیر گروه') || title.includes('رئیس اداره') || title.includes('سرپرست گروه') || title.includes('مدیر واحد');
                  }
                  return false;
                }

                if (roleKey === 'employer' || roleKey === 'employer_site') {
                  if (e.roleKey === 'employer' || e.roleKey === 'employer_site') return true;
                  if (e.action === 'FINAL_APPROVE' || e.action === 'APPROVE' || e.action === 'SIGN' || e.action === 'REPORT_SIGNATURE' || e.action === 'RETURN_TO_CONSULTANT' || e.action === 'REASSIGN') {
                    if (isEmployerOrg) {
                      if (title.includes('کارشناس') && !title.includes('مدیر') && !title.includes('سرپرست') && !title.includes('نماینده')) return false;
                      if (title.includes('سرپرست واحد') || title.includes('مدیر گروه') || title.includes('رئیس اداره')) return false;
                      return true;
                    }
                    return title.includes('کارفرما') || title.includes('مدیر طرح') || title.includes('مجری') || title.includes('سرپرست کارگاه') || title.includes('مدیر پروژه') || title.includes('نماینده');
                  }
                  return false;
                }

                return false;
              };

              // --- 1. Contractor Signatures ---
              const cSiteEv = [...history].reverse().find(e => matchEvent(e, 'contractor_site'));
              const cTechEv = [...history].reverse().find(e => matchEvent(e, 'contractor_tech'));
              const cHeadEv = [...history].reverse().find(e => matchEvent(e, 'contractor_head'));

              const resolveReportSig = (ev: any, defaultName: string, defaultTitle: string) => {
                if (!ev) return { name: defaultName, title: defaultTitle, signature: undefined, date: undefined };
                const allUsers = SystemAdminService.getUsers();
                const actorUser = allUsers.find(u => u.id === ev.actorUserId || u.fullName === ev.actorName);
                const actorOrg = actorUser?.orgId ? SystemAdminService.getOrganization(actorUser.orgId) : undefined;
                const formalName = actorUser ? formatUserDisplayFormal(actorUser, actorOrg) : (ev.actorName || defaultName);
                const sig = ev.signature || (actorUser ? (HRService.getUserSignature(actorUser) || actorUser?.signature) : undefined);
                return {
                  name: formalName,
                  title: ev.actorTitle || actorUser?.jobTitle || defaultTitle,
                  signature: sig,
                  date: new Date(ev.timestamp).toLocaleDateString("fa-IR")
                };
              };

              let contractorSiteSig = resolveReportSig(cSiteEv, "سرپرست کارگاه / مدیر پروژه", "سرپرست کارگاه پیمانکار");
              let contractorTechSig = resolveReportSig(cTechEv, "کارشناس دفتر فنی", "دفتر فنی پیمانکار");
              let contractorHeadSig = resolveReportSig(cHeadEv, "سرپرست واحد فنی", "سرپرست واحد فنی پیمانکار");

              // --- 2. Consultant Signatures ---
              const mSiteEv = [...history].reverse().find(e => matchEvent(e, "consultant"));
              const mTechEv = [...history].reverse().find(e => matchEvent(e, "consultant_tech"));
              const mHeadEv = [...history].reverse().find(e => matchEvent(e, "consultant_head"));

              let consultantSiteSig = resolveReportSig(mSiteEv, "سرپرست نظارت / مشاور", "دستگاه نظارت و مشاور");
              let consultantTechSig = resolveReportSig(mTechEv, "کارشناس / ناظر مقیم", "دستگاه نظارت و مشاور");
              let consultantHeadSig = resolveReportSig(mHeadEv, "سرپرست واحد نظارت", "دستگاه نظارت و مشاور");

              // --- 3. Employer Signatures ---
              const eSiteEv = [...history].reverse().find(e => matchEvent(e, "employer"));
              const eTechEv = [...history].reverse().find(e => matchEvent(e, "employer_tech"));
              const eHeadEv = [...history].reverse().find(e => matchEvent(e, "employer_head"));

              let employerSiteSig = resolveReportSig(eSiteEv, "مدیر طرح / نماینده کارفرما", "دستگاه اجرایی و کارفرما");
              let employerTechSig = resolveReportSig(eTechEv, "کارشناس / بررسی‌کننده", "دستگاه اجرایی و کارفرما");
              let employerHeadSig = resolveReportSig(eHeadEv, "سرپرست واحد / مدیر گروه", "دستگاه اجرایی و کارفرما");

              // Apply live report signatures state
              if (reportSigs['contractor_tech'] || reportSigs['reporter']) contractorTechSig = reportSigs['contractor_tech'] || reportSigs['reporter'];
              if (reportSigs['contractor_head']) contractorHeadSig = reportSigs['contractor_head'];
              if (reportSigs['contractor_site'] || reportSigs['contractor_manager']) {
                contractorSiteSig = reportSigs['contractor_site'] || reportSigs['contractor_manager'];
              }

              if (reportSigs['consultant_tech']) consultantTechSig = reportSigs['consultant_tech'];
              if (reportSigs['consultant_head']) consultantHeadSig = reportSigs['consultant_head'];
              if (reportSigs['consultant'] || reportSigs['consultant_site']) {
                consultantSiteSig = reportSigs['consultant'] || reportSigs['consultant_site'];
              }

              if (reportSigs['employer_tech']) employerTechSig = reportSigs['employer_tech'];
              if (reportSigs['employer_head']) employerHeadSig = reportSigs['employer_head'];
              if (reportSigs['employer'] || reportSigs['employer_site']) {
                employerSiteSig = reportSigs['employer'] || reportSigs['employer_site'];
              }

              const renderSigCard = (label: string, data: { name: string; title: string; signature?: string; date?: string } | null) => (
                <div className="border border-stone-200 rounded-md p-1 bg-white flex flex-col justify-between min-h-[115px] text-right overflow-hidden shadow-2xs">
                  <div>
                    <div className="font-black text-stone-900 text-[8.5px] leading-tight truncate text-center" title={label}>{label}</div>
                    {data?.name && (
                      <div className="text-[8px] text-stone-700 font-bold mt-0.5 bg-stone-100 px-0.5 py-0.5 rounded text-center truncate" title={data.name}>
                        {data.name}
                      </div>
                    )}
                  </div>

                  {data?.signature ? (
                    <div className="my-0.5 flex flex-col items-center">
                      <img src={data.signature} alt={label} className="max-h-8 max-w-[70px] object-contain filter contrast-125" />
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

                  <div className="border-t border-stone-200 pt-0.5 text-[7.5px] text-stone-500 text-center font-mono truncate">
                    {data?.date ? data.date : 'نام و امضاء'}
                  </div>
                </div>
              );

              return (
                <div className="mt-6 pt-3 border-t-2 border-stone-300 w-full page-break-inside-avoid print:mt-4 print:pt-2">
                  <div className="text-[11px] font-black text-stone-800 mb-2 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    <span>تاییدات و امضاهای ارکان پروژه (گزارش رسمی و مدیریتی)</span>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 w-full text-right dir-rtl">
                    {/* 1. پیمانکار */}
                    <div className="border border-blue-200 bg-blue-50/20 rounded-lg p-1 flex flex-col justify-between">
                      <div className="font-bold text-[9.5px] text-blue-900 border-b border-blue-200 pb-0.5 mb-1 text-center flex items-center justify-center gap-1 truncate">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 flex-shrink-0"></span>
                        <span className="truncate">پیمانکار: {currentProject.contractorName || 'سازمان پیمانکار'}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-1">
                        {renderSigCard("کارشناس / تنظیم‌کننده", contractorTechSig)}
                        {renderSigCard("سرپرست واحد فنی", contractorHeadSig)}
                        {renderSigCard("سرپرست کارگاه / مدیر پروژه", contractorSiteSig)}
                      </div>
                    </div>

                    {/* 2. دستگاه نظارت و مشاور */}
                    <div className="border border-emerald-200 bg-emerald-50/20 rounded-lg p-1 flex flex-col justify-between">
                      <div className="font-bold text-[9.5px] text-emerald-900 border-b border-emerald-200 pb-0.5 mb-1 text-center flex items-center justify-center gap-1 truncate">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 flex-shrink-0"></span>
                        <span className="truncate">مشاور: {currentProject.consultantName || 'دستگاه نظارت و مشاور'}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-1">
                        {renderSigCard("کارشناس / ناظر مقیم", consultantTechSig)}
                        {renderSigCard("سرپرست واحد نظارت", consultantHeadSig)}
                        {renderSigCard("سرپرست نظارت / مدیر پروژه", consultantSiteSig)}
                      </div>
                    </div>

                    {/* 3. دستگاه اجرایی و کارفرما */}
                    <div className="border border-purple-200 bg-purple-50/20 rounded-lg p-1 flex flex-col justify-between">
                      <div className="font-bold text-[9.5px] text-purple-900 border-b border-purple-200 pb-0.5 mb-1 text-center flex items-center justify-center gap-1 truncate">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-600 flex-shrink-0"></span>
                        <span className="truncate">کارفرما: {currentProject.employerName || 'دستگاه اجرایی و کارفرما'}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-1">
                        {renderSigCard("کارشناس / بررسی‌کننده", employerTechSig)}
                        {renderSigCard("سرپرست واحد / مدیر گروه", employerHeadSig)}
                        {renderSigCard("مدیر طرح / نماینده کارفرما", employerSiteSig)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
            
            <div className="mt-20 text-center text-[10px] text-gray-400 border-t border-gray-100 pt-4 flex justify-between">
                <span>تولید شده توسط سامانه یکپارچه مدیریت پروژه (همیار)</span>
                <span>صفحه ۱ از ۱</span>
            </div>
          </div>
        </div>
      </div>

      {/* Signature Pad Modal for Users without registered HR Signature */}
      {isSignModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fadeIn" dir="rtl">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-800 font-black text-sm">
                <PenTool className="text-emerald-600" size={18} />
                <span>رسم و ثبت امضای الکترونیکی</span>
              </div>
              <button onClick={() => setIsSignModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-full"><X size={18} /></button>
            </div>

            <div className="my-4 space-y-3">
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                امضای الکترونیکی شما هنوز در پرونده پرسنلی ثبت نشده است. کادر زیر را لمس کرده یا با ماوس امضای خود را رسم کنید:
              </p>

              <div className="border-2 border-dashed border-slate-300 rounded-2xl p-2 bg-slate-50 flex flex-col items-center">
                <canvas
                  ref={canvasRef}
                  width={360}
                  height={150}
                  className="bg-white rounded-xl shadow-inner cursor-crosshair touch-none border border-slate-200 w-full"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
                <div className="flex justify-between w-full mt-2 px-1 text-[11px]">
                  <button onClick={clearCanvas} className="text-rose-600 font-bold hover:underline">پاکسازی کادر</button>
                  <span className="text-slate-400">محل رسم امضاء</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setIsSignModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold hover:bg-slate-200"
              >
                انصراف
              </button>
              <button
                onClick={handleSaveDrawnSignature}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md shadow-emerald-600/20"
              >
                تایید و ثبت بر روی گزارش
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-8 right-8 z-[200] bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-slideUp" dir="rtl">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 size={18} />
          </div>
          <span className="text-xs font-black leading-tight">{toastMsg}</span>
        </div>
      )}
    </div>
  );
};

export default ReportModal;
