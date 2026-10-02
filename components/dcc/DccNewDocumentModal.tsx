import React, { useRef, useState, useMemo, useEffect } from 'react';
import { X, Plus, Trash2, FileText, UploadCloud, CheckCircle2, Shield, Calendar, Layers, Tag, Paperclip, AlertCircle } from 'lucide-react';
import { DccDocument, DccModule, DccDocumentType, DccAttachment } from '../../types/dcc';
import { DccService, DCC_MODULE_LABELS, DCC_DOCTYPE_LABELS } from '../../services/dccService';
import { SystemAdminService } from '../../services/systemAdminService';
import { ShamsiDatePicker } from '../ShamsiDatePicker';
import { formatShamsiDate } from '../../utils/dateUtils';
import { Project, WorkflowStatus } from '../../types';

interface DccNewDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (doc: DccDocument) => void;
  projects: Project[];
  defaultProjectId?: string;
}

const DISCIPLINES = [
  'عمومی و مشترک',
  'سازه و اسکلت فلزی/بتنی',
  'معماری و نازک‌کاری',
  'سیویل و محوطه‌سازی',
  'تاسیسات مکانیکی (HVAC)',
  'تاسیسات برقی و ابزار دقیق',
  'ژئوتکنیک و خاک',
  'نقشه‌برداری',
  'ایمنی و بهداشت (HSE)',
  'امور قراردادها و متره'
];

export const DccNewDocumentModal: React.FC<DccNewDocumentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  projects,
  defaultProjectId
}) => {
  const currentUser = useMemo(() => SystemAdminService.getCurrentUser(), []);
  const accessibleProjects = useMemo(() => {
    return (projects || []).filter(p => SystemAdminService.canUserAccessProject(p.id, currentUser));
  }, [projects, currentUser]);

  const today = formatShamsiDate(new Date().toLocaleDateString('fa-IR'));
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [projectId, setProjectId] = useState<string>(() => {
    if (defaultProjectId && accessibleProjects.some(p => String(p.id) === String(defaultProjectId))) {
      return String(defaultProjectId);
    }
    return accessibleProjects[0]?.id ? String(accessibleProjects[0].id) : '1';
  });

  const [module, setModule] = useState<DccModule>('CUSTOM_ARCHIVE');
  const [documentType, setDocumentType] = useState<DccDocumentType>('SHOP_DRAWING');
  const [documentNumber, setDocumentNumber] = useState<string>(`DWG-${Date.now().toString().slice(-4)}`);
  const [title, setTitle] = useState<string>('');
  const [discipline, setDiscipline] = useState<string>('سازه و اسکلت فلزی/بتنی');
  const [revision, setRevision] = useState<string>('Rev 0');
  const [documentDate, setDocumentDate] = useState<string>(today);
  const [status, setStatus] = useState<string>(WorkflowStatus.DRAFT);
  const [contractorName, setContractorName] = useState<string>('پیمانکار مجری');
  const [consultantName, setConsultantName] = useState<string>('مهندسین مشاور');
  const [employerName, setEmployerName] = useState<string>('کارفرمای طرح');
  const [description, setDescription] = useState<string>('');
  const [tagInput, setTagInput] = useState<string>('نقشه, سازه, DCC');

  // Keep projectId in sync with accessible projects
  useEffect(() => {
    if (accessibleProjects.length > 0 && !accessibleProjects.some(p => String(p.id) === String(projectId))) {
      setProjectId(String(accessibleProjects[0].id));
    }
  }, [accessibleProjects, projectId]);

  // Auto-fill project parties when projectId changes
  useEffect(() => {
    const selectedProj = accessibleProjects.find(p => String(p.id) === String(projectId));
    if (selectedProj) {
      if (selectedProj.contractorName) setContractorName(selectedProj.contractorName);
      if (selectedProj.consultantName) setConsultantName(selectedProj.consultantName);
      if (selectedProj.employerName) setEmployerName(selectedProj.employerName);
    }
  }, [projectId, accessibleProjects]);
  
  // Attachments
  const [attachments, setAttachments] = useState<DccAttachment[]>([]);
  const [newAttName, setNewAttName] = useState<string>('');
  const [newAttSize, setNewAttSize] = useState<string>('2.4 MB');

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        const sizeStr = file.size > 1024 * 1024 
          ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` 
          : `${Math.round(file.size / 1024)} KB`;

        const newAtt: DccAttachment = {
          id: `att_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          name: file.name,
          size: sizeStr,
          fileType: file.type || 'application/octet-stream',
          dataUrl,
          uploadDate: today
        };

        setAttachments((prev) => [...prev, newAtt]);
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAddAttachment = () => {
    if (!newAttName.trim()) return;
    const att: DccAttachment = {
      id: `att_${Date.now()}`,
      name: newAttName.trim(),
      size: newAttSize.trim() || 'فایل ضمیمه',
      uploadDate: today
    };
    setAttachments([...attachments, att]);
    setNewAttName('');
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments(attachments.filter(a => a.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !documentNumber.trim()) {
      return;
    }

    const tags = tagInput
      .split(/[,،]+/)
      .map(t => t.trim())
      .filter(Boolean);

    const savedDoc = DccService.saveCustomDocument({
      projectId,
      documentNumber: documentNumber.trim(),
      title: title.trim(),
      module,
      documentType,
      discipline,
      revision: revision.trim() || 'Rev 0',
      documentDate,
      status,
      contractorName: contractorName.trim(),
      consultantName: consultantName.trim(),
      employerName: employerName.trim(),
      description: description.trim(),
      attachments,
      tags
    });

    onSave(savedDoc);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/60 backdrop-blur-sm animate-fadeIn" dir="rtl">
      <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-3xl shadow-2xl border border-stone-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-stone-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-stone-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500/10 dark:bg-amber-400/10 text-amber-600 dark:text-amber-400 rounded-2xl border border-amber-500/20">
              <FileText size={22} />
            </div>
            <div>
              <h3 className="text-base font-black text-stone-900 dark:text-white">
                ثبت و بایگانی مدرک جدید در مرکز DCC
              </h3>
              <p className="text-xs text-stone-500 dark:text-slate-400 font-bold mt-0.5">
                ورود اطلاعات، شماره‌گذاری و پیوست فایل‌های اسناد و نقشه‌های مهندسی
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-stone-200 dark:hover:bg-slate-700 text-stone-500 dark:text-slate-400 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 md:p-6 space-y-4 text-xs font-bold">
          {/* Project & Module Selection */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-stone-700 dark:text-slate-300 mb-1">انتخاب پروژه (مجاز):</label>
              {accessibleProjects.length === 0 ? (
                <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl font-bold text-xs border border-rose-200 flex items-center gap-1.5">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>هیچ پروژه‌ای برای شما تعریف نشده است.</span>
                </div>
              ) : (
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl font-bold text-stone-900 dark:text-white outline-none"
                >
                  {accessibleProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title || (p as any).name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-stone-700 dark:text-slate-300 mb-1">بخش / زیرمجموعه سازمانی:</label>
              <select
                value={module}
                onChange={(e) => setModule(e.target.value as DccModule)}
                className="w-full p-2.5 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl font-bold text-stone-900 dark:text-white outline-none"
              >
                <option value="CUSTOM_ARCHIVE">بایگانی مهندسی DCC</option>
                <option value="TECHNICAL_OFFICE">دفتر فنی و مهندسی</option>
                <option value="QUALITY_CONTROL">کنترل کیفیت (QC)</option>
                <option value="PLANNING">کنترل پروژه و برنامه‌ریزی</option>
                <option value="HSE">ایمنی و بهداشت (HSE)</option>
                <option value="EXECUTION">اجرا و کارگاه</option>
                <option value="COMMUNICATIONS">مکاتبات اداری و فنی</option>
                <option value="CONTRACTS">قراردادها و امور مالی</option>
              </select>
            </div>

            <div>
              <label className="block text-stone-700 dark:text-slate-300 mb-1">نوع سند مهندسی:</label>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value as DccDocumentType)}
                className="w-full p-2.5 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl font-bold text-stone-900 dark:text-white outline-none"
              >
                <option value="SHOP_DRAWING">نقشه کارگاهی (Shop Drawing)</option>
                <option value="AS_BUILT">نقشه چون‌ساخت (As-Built)</option>
                <option value="TRANSMITTAL">ترانسمیتال مهندسی</option>
                <option value="SUBMITTAL">سابمیتال تایید مصالح (MAS)</option>
                <option value="SPECIFICATION">مشخصات فنی و دیتاشیت</option>
                <option value="MINUTE">صورتمجلس کارگاهی</option>
                <option value="STATEMENT">صورت‌وضعیت کارکرد</option>
                <option value="VARIATION_ORDER">دستور تغییر کار</option>
                <option value="RFI">درخواست بازرسی (RFI)</option>
                <option value="NCR">گزارش عدم انطباق (NCR)</option>
                <option value="LAB_TEST">شیت آزمایشگاه</option>
                <option value="WORK_PERMIT">پرمیت کار ایمنی (PTW)</option>
                <option value="DAILY_REPORT">گزارش روزانه کارگاه</option>
                <option value="DELAY_CLAIM">لایحه تاخیرات</option>
                <option value="OFFICIAL_LETTER">نامه رسمی</option>
                <option value="CONTRACT">قرارداد / پیمان</option>
                <option value="OTHER">سایر اسناد مهندسی</option>
              </select>
            </div>
          </div>

          {/* Document Number, Title, Revision */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-4">
              <label className="block text-stone-700 dark:text-slate-300 mb-1">شماره سند / کد DCC:</label>
              <input
                type="text"
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
                placeholder="DWG-STR-001"
                required
                className="w-full p-2.5 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl font-mono font-bold text-stone-900 dark:text-white outline-none dir-ltr text-right"
              />
            </div>

            <div className="md:col-span-6">
              <label className="block text-stone-700 dark:text-slate-300 mb-1">عنوان کامل مدرک:</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثلاً: نقشه شاپ درائینگ تیرهای بتنی طبقه اول"
                required
                className="w-full p-2.5 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl font-bold text-stone-900 dark:text-white outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-stone-700 dark:text-slate-300 mb-1">ویرایش (Rev):</label>
              <input
                type="text"
                value={revision}
                onChange={(e) => setRevision(e.target.value)}
                placeholder="Rev 0"
                className="w-full p-2.5 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl font-mono font-bold text-center text-stone-900 dark:text-white outline-none"
              />
            </div>
          </div>

          {/* Discipline, Date, Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-stone-700 dark:text-slate-300 mb-1">دیسیپلین مهندسی:</label>
              <select
                value={discipline}
                onChange={(e) => setDiscipline(e.target.value)}
                className="w-full p-2.5 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl font-bold text-stone-900 dark:text-white outline-none"
              >
                {DISCIPLINES.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-stone-700 dark:text-slate-300 mb-1">تاریخ صدور / موثر:</label>
              <ShamsiDatePicker
                value={documentDate}
                onChange={setDocumentDate}
                placeholder="1403/05/20"
                inputClassName="!p-2.5 !bg-stone-50 dark:!bg-slate-800 !border-stone-200 dark:!border-slate-700 !rounded-xl !font-bold !text-stone-900 dark:!text-white outline-none !text-center"
              />
            </div>

            <div>
              <label className="block text-stone-700 dark:text-slate-300 mb-1">وضعیت اولیه گردش کار:</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full p-2.5 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl font-bold text-stone-900 dark:text-white outline-none"
              >
                <option value={WorkflowStatus.DRAFT}>پیش‌نویس اولیه</option>
                <option value={WorkflowStatus.IN_REVIEW}>در جریان بررسی</option>
                <option value={WorkflowStatus.APPROVED_INTERNAL}>تایید داخلی پیمانکار</option>
                <option value={WorkflowStatus.SENT_TO_CONSULTANT}>ارسال به مشاور / نظارت</option>
                <option value={WorkflowStatus.APPROVED_BY_CONSULTANT}>تایید دستگاه نظارت</option>
                <option value={WorkflowStatus.SENT_TO_EMPLOYER}>ارسال به کارفرما</option>
                <option value={WorkflowStatus.APPROVED_BY_EMPLOYER}>تایید کارفرما (مصوب)</option>
                <option value="APPROVED_FINAL">تایید نهایی و قطعی</option>
                <option value="CONDITIONAL">تایید مشروط با اصلاحات</option>
                <option value={WorkflowStatus.REJECTED}>مردود / نیاز به بازنگری</option>
              </select>
            </div>
          </div>

          {/* Parties: Contractor, Consultant, Employer */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-stone-700 dark:text-slate-300 mb-1">نام پیمانکار / تهیه‌کننده:</label>
              <input
                type="text"
                value={contractorName}
                onChange={(e) => setContractorName(e.target.value)}
                placeholder="شرکت ساختمانی مجری"
                className="w-full p-2.5 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl font-bold text-stone-900 dark:text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-stone-700 dark:text-slate-300 mb-1">مهندسین مشاور / نظارت:</label>
              <input
                type="text"
                value={consultantName}
                onChange={(e) => setConsultantName(e.target.value)}
                placeholder="مهندسین مشاور ناظر"
                className="w-full p-2.5 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl font-bold text-stone-900 dark:text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-stone-700 dark:text-slate-300 mb-1">کارفرمای طرح:</label>
              <input
                type="text"
                value={employerName}
                onChange={(e) => setEmployerName(e.target.value)}
                placeholder="دستگاه اجرایی / کارفرما"
                className="w-full p-2.5 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl font-bold text-stone-900 dark:text-white outline-none"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-stone-700 dark:text-slate-300 mb-1">شرح، چکیده و توضیحات فنی مدرک:</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="توضیحات مربوط به ویرایش نقشه، تغییرات اعمال شده یا بندهای پیوست..."
              className="w-full p-3 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl font-medium text-stone-900 dark:text-white outline-none resize-none leading-relaxed"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-stone-700 dark:text-slate-300 mb-1">برچسب‌ها (با ویرگول جدا کنید):</label>
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="نقشه, شاپ, اسکلت, بتن"
              className="w-full p-2.5 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl font-bold text-stone-900 dark:text-white outline-none"
            />
          </div>

          {/* Attachments Section */}
          <div className="p-4 bg-stone-50 dark:bg-slate-800/40 rounded-2xl border border-stone-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-stone-800 dark:text-slate-200 font-black flex items-center gap-1.5">
                <Paperclip size={14} className="text-amber-500" />
                مدارک و فایل‌های پیوست (نقشه‌ها / PDF / فایل‌های محاسباتی):
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  multiple
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-black flex items-center gap-1.5 transition-colors cursor-pointer border border-blue-500/20"
                >
                  <UploadCloud size={14} />
                  انتخاب فایل از سیستم (Upload)
                </button>
                <span className="text-[10px] text-stone-500 font-mono">
                  {attachments.length} مورد پیوست
                </span>
              </div>
            </div>

            {/* Manual add attachment inputs */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
              <div className="md:col-span-8">
                <input
                  type="text"
                  value={newAttName}
                  onChange={(e) => setNewAttName(e.target.value)}
                  placeholder="یا نام فایل پیوست دستی (مثلا: DWG-Sheet-01.pdf)"
                  className="w-full p-2 bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl font-bold text-stone-900 dark:text-white outline-none"
                />
              </div>
              <div className="md:col-span-3">
                <input
                  type="text"
                  value={newAttSize}
                  onChange={(e) => setNewAttSize(e.target.value)}
                  placeholder="حجم (مثلاً: 3.5 MB)"
                  className="w-full p-2 bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl font-bold text-stone-900 dark:text-white outline-none text-center font-mono"
                />
              </div>
              <div className="md:col-span-1">
                <button
                  type="button"
                  onClick={handleAddAttachment}
                  className="w-full p-2 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-xl font-black flex items-center justify-center transition-colors cursor-pointer"
                  title="افزودن پیوست"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            {/* Attachments List */}
            {attachments.length > 0 && (
              <div className="space-y-1.5 pt-2">
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-stone-200 dark:border-slate-700 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <FileText size={15} className="text-amber-500" />
                      <span className="text-stone-800 dark:text-slate-200 font-bold">{att.name}</span>
                      <span className="font-mono text-[10px] text-stone-400">({att.size})</span>
                      {att.dataUrl && (
                        <span className="text-[9px] bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 px-1.5 py-0.5 rounded font-black">
                          فایل بارگذاری شده
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(att.id)}
                      className="text-stone-400 hover:text-rose-500 transition-colors p-1 cursor-pointer"
                      title="حذف پیوست"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="pt-3 border-t border-stone-200 dark:border-slate-800 flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-stone-100 hover:bg-stone-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-stone-700 dark:text-slate-300 font-bold rounded-xl transition-colors cursor-pointer"
            >
              انصراف
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black rounded-xl shadow-md shadow-amber-500/20 transition-all cursor-pointer flex items-center gap-2"
            >
              <CheckCircle2 size={16} />
              ثبت نهایی در بایگانی DCC
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
