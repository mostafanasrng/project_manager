import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Save, Paperclip, Plus, Trash2, FileText, 
  Bold, Italic, Underline, AlignRight, AlignCenter, 
  AlignLeft, AlignJustify, Table as TableIcon, 
  Sparkles, Check, Download, AlertCircle, Shield, Building, Send
} from 'lucide-react';
import { OfficialLetter, LetterScope, LetterType, LetterPriority, LetterConfidentiality, LetterAttachment, LetterTranscript, Project, WorkflowStatus } from '../../../types';
import { SystemAdminService } from '../../../services/systemAdminService';
import { SystemUser } from '../../../systemAdminTypes';
import { formatUserDisplayFormal } from '../../utils/userFormatter';
import { ShamsiDatePicker } from '../ShamsiDatePicker';

interface OfficialLetterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (letterData: Partial<OfficialLetter>) => void;
  initialLetter?: OfficialLetter | null;
  selectedProjectId: string;
  projects: Project[];
  currentUser: SystemUser | null;
}

const FONT_FAMILIES = [
  { id: 'Vazirmatn', label: 'وزیرمتن (استاندارد)' },
  { id: 'B Nazanin', label: 'بی نازنین (B Nazanin)' },
  { id: 'B Zar', label: 'بی زر (B Zar)' },
  { id: 'B Mitra', label: 'بی میترا (B Mitra)' },
  { id: 'B Lotus', label: 'بی لوتوس (B Lotus)' },
  { id: 'Tahoma', label: 'تاهوُما (Tahoma)' },
  { id: 'IRANSans', label: 'ایران‌سنس (IRANSans)' },
  { id: 'Shabnam', label: 'شبنم (Shabnam)' },
  { id: 'Sahel', label: 'ساحل (Sahel)' },
  { id: 'Yekan', label: 'یکان (Yekan)' },
  { id: 'Titr', label: 'تیتر (Titr)' },
];

const FONT_SIZES = [
  { id: '9px', label: '۹ (بسیار ریز - ۹)' },
  { id: '10px', label: '۱۰ (خیلی ریز - ۱۰)' },
  { id: '11px', label: '۱۱ (ریز - ۱۱)' },
  { id: '12px', label: '۱۲ (۱۲px)' },
  { id: '13px', label: '۱۳ (۱۳px)' },
  { id: '14px', label: '۱۴ (استاندارد اداری - ۱۴)' },
  { id: '15px', label: '۱۵ (متوسط - ۱۵)' },
  { id: '16px', label: '۱۶ (بزرگ - ۱۶)' },
  { id: '18px', label: '۱۸ (تیتر - ۱۸)' },
  { id: '20px', label: '۲۰ (عناوین اصلی - ۲۰)' },
];

const LETTER_TEMPLATES: any[] = [];

export const OfficialLetterModal: React.FC<OfficialLetterModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialLetter,
  selectedProjectId,
  projects,
  currentUser
}) => {
  const [projectId, setProjectId] = useState(initialLetter?.projectId || selectedProjectId);
  const [letterNumber, setLetterNumber] = useState(initialLetter?.letterNumber || '');
  const [indicatorNumber, setIndicatorNumber] = useState(initialLetter?.indicatorNumber || '');
  const [date, setDate] = useState(initialLetter?.date || '');
  const [subject, setSubject] = useState(initialLetter?.subject || '');
  const [scope, setScope] = useState<LetterScope>(initialLetter?.scope || 'INTERNAL');
  const [letterType, setLetterType] = useState<LetterType>(initialLetter?.letterType || 'TECHNICAL');
  const [priority, setPriority] = useState<LetterPriority>(initialLetter?.priority || 'NORMAL');
  const [confidentiality, setConfidentiality] = useState<LetterConfidentiality>(initialLetter?.confidentiality || 'NORMAL');
  
  const [receiverTitle, setReceiverTitle] = useState(initialLetter?.receiverTitle || '');
  const [receiverNameTitle, setReceiverNameTitle] = useState(initialLetter?.receiverNameTitle || '');
  const [receiverJobTitle, setReceiverJobTitle] = useState(initialLetter?.receiverJobTitle || initialLetter?.receiverTitle || '');
  const [receiverOrgName, setReceiverOrgName] = useState(initialLetter?.receiverOrgName || '');
  const [receiverOrgId, setReceiverOrgId] = useState(initialLetter?.receiverOrgId || '');
  const [receiverUserId, setReceiverUserId] = useState(initialLetter?.receiverUserId || '');
  const [attentionTo, setAttentionTo] = useState(initialLetter?.attentionTo || '');

  const [fontFamily, setFontFamily] = useState(initialLetter?.fontFamily || 'Vazirmatn');
  const [fontSize, setFontSize] = useState(initialLetter?.fontSize || '14px');
  const [content, setContent] = useState(initialLetter?.content || '<p></p>');

  const [attachments, setAttachments] = useState<LetterAttachment[]>(initialLetter?.attachments || []);
  const [transcripts, setTranscripts] = useState<LetterTranscript[]>(initialLetter?.transcripts || []);
  
  // New transcript state
  const [newTranscriptName, setNewTranscriptName] = useState('');
  const [newTranscriptOrg, setNewTranscriptOrg] = useState('');
  const [newTranscriptRole, setNewTranscriptRole] = useState('');
  const [newTranscriptNote, setNewTranscriptNote] = useState('جهت استحضار و اقدام مقتضی');

  // Table Generator Modal State
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);
  const [isDirectSend, setIsDirectSend] = useState(false);

  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const organizations = SystemAdminService.getOrganizations();
  const allUsers = SystemAdminService.getUsers();

  const currentOrg = currentUser ? SystemAdminService.getOrganization(currentUser.orgId) : undefined;

  // Initialize or reset form values whenever modal opens or initialLetter changes
  useEffect(() => {
    if (!isOpen) return;

    if (initialLetter && initialLetter.id) {
      const c = initialLetter.content || '';
      setProjectId(initialLetter.projectId || selectedProjectId);
      setLetterNumber(initialLetter.letterNumber || '');
      setIndicatorNumber(initialLetter.indicatorNumber || '');
      setDate(initialLetter.date || '');
      setSubject(initialLetter.subject || '');
      setScope(initialLetter.scope || 'INTERNAL');
      setLetterType(initialLetter.letterType || 'TECHNICAL');
      setPriority(initialLetter.priority || 'NORMAL');
      setConfidentiality(initialLetter.confidentiality || 'NORMAL');
      setReceiverTitle(initialLetter.receiverTitle || '');
      setReceiverNameTitle(initialLetter.receiverNameTitle || '');
      setReceiverJobTitle(initialLetter.receiverJobTitle || initialLetter.receiverTitle || '');
      setReceiverOrgName(initialLetter.receiverOrgName || '');
      setReceiverOrgId(initialLetter.receiverOrgId || '');
      setReceiverUserId(initialLetter.receiverUserId || '');
      setAttentionTo(initialLetter.attentionTo || '');
      setFontFamily(initialLetter.fontFamily || 'Vazirmatn');
      setFontSize(initialLetter.fontSize || '14px');
      setContent(c);
      setAttachments(initialLetter.attachments || []);
      setTranscripts(initialLetter.transcripts || []);

      if (editorRef.current) {
        editorRef.current.innerHTML = c;
      }
    } else {
      const todayFa = new Date().toLocaleDateString('fa-IR');
      const randomNum = Math.floor(100 + Math.random() * 900);
      const year = todayFa.split('/')[0] || '1403';
      const defaultContent = '<p></p>';
      
      setProjectId(initialLetter?.projectId || selectedProjectId);
      setLetterNumber(`${year}/INT/${randomNum}`);
      setIndicatorNumber(`IND-${Math.floor(1000 + Math.random() * 9000)}`);
      setDate(todayFa);
      setSubject(initialLetter?.subject || '');
      setScope(initialLetter?.scope || 'INTERNAL');
      setLetterType(initialLetter?.letterType || 'TECHNICAL');
      setPriority(initialLetter?.priority || 'NORMAL');
      setConfidentiality(initialLetter?.confidentiality || 'NORMAL');
      setReceiverTitle(initialLetter?.receiverTitle || '');
      setReceiverNameTitle(initialLetter?.receiverNameTitle || '');
      setReceiverJobTitle(initialLetter?.receiverJobTitle || '');
      setReceiverOrgName(initialLetter?.receiverOrgName || '');
      setReceiverOrgId(initialLetter?.receiverOrgId || '');
      setReceiverUserId(initialLetter?.receiverUserId || '');
      setAttentionTo(initialLetter?.attentionTo || '');
      setFontFamily(initialLetter?.fontFamily || 'Vazirmatn');
      setFontSize(initialLetter?.fontSize || '14px');
      setContent(initialLetter?.content || defaultContent);
      setAttachments([]);
      setTranscripts([]);

      if (editorRef.current) {
        editorRef.current.innerHTML = initialLetter?.content || defaultContent;
      }
    }
  }, [initialLetter, isOpen, selectedProjectId]);

  // Sync content from contentEditable
  const handleEditorInput = () => {
    if (editorRef.current) {
      setContent(editorRef.current.innerHTML);
    }
  };

  // Sync initial content to editor when opened or content changes
  useEffect(() => {
    if (editorRef.current && content !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = content;
    }
  }, [isOpen, initialLetter, content]);

  // Editor formatting commands
  const execCmd = (cmd: string, value: string | undefined = undefined) => {
    document.execCommand(cmd, false, value);
    if (editorRef.current) {
      setContent(editorRef.current.innerHTML);
    }
  };

  // Insert Table
  const handleInsertTable = () => {
    let tableHtml = `<table style="width: 100%; border-collapse: collapse; margin: 12px auto; border: 1px solid #94a3b8;"><thead><tr style="background: #f1f5f9;">`;
    for (let c = 1; c <= tableCols; c++) {
      tableHtml += `<th style="border: 1px solid #94a3b8; padding: 8px; font-weight: bold; text-align: center;">عنوان ${c}</th>`;
    }
    tableHtml += `</tr></thead><tbody>`;
    for (let r = 1; r <= tableRows; r++) {
      tableHtml += `<tr>`;
      for (let c = 1; c <= tableCols; c++) {
        tableHtml += `<td style="border: 1px solid #94a3b8; padding: 8px; text-align: center;">داده ${r}-${c}</td>`;
      }
      tableHtml += `</tr>`;
    }
    tableHtml += `</tbody></table><p>&nbsp;</p>`;

    execCmd('insertHTML', tableHtml);
    setIsTableModalOpen(false);
  };

  // Apply Pre-made template
  const handleApplyTemplate = (tpl: typeof LETTER_TEMPLATES[0]) => {
    setLetterType(tpl.type);
    setSubject(tpl.subject);
    setContent(tpl.content);
    if (editorRef.current) {
      editorRef.current.innerHTML = tpl.content;
    }
  };

  // Attachments handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const newAttachment: LetterAttachment = {
          id: 'att-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
          name: file.name,
          size: (file.size / 1024).toFixed(1) + ' KB',
          type: file.type || 'application/octet-stream',
          dataUrl: uploadEvent.target?.result as string,
          uploadDate: new Date().toLocaleDateString('fa-IR')
        };
        setAttachments(prev => [...prev, newAttachment]);
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  // Transcripts handlers
  const handleAddTranscript = () => {
    if (!newTranscriptName.trim()) {
      alert('لطفاً نام یا سمت گیرنده رونوشت را وارد کنید.');
      return;
    }
    const newTranscript: LetterTranscript = {
      id: 'tr-' + Date.now(),
      recipientName: newTranscriptName.trim(),
      orgName: newTranscriptOrg.trim() || undefined,
      roleOrJobTitle: newTranscriptRole.trim() || undefined,
      note: newTranscriptNote.trim() || undefined
    };
    setTranscripts(prev => [...prev, newTranscript]);
    setNewTranscriptName('');
    setNewTranscriptOrg('');
    setNewTranscriptRole('');
  };

  const handleRemoveTranscript = (id: string) => {
    setTranscripts(prev => prev.filter(t => t.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!letterNumber.trim()) {
      alert('شماره نامه الزامی است.');
      return;
    }
    if (!subject.trim()) {
      alert('موضوع نامه الزامی است.');
      return;
    }

    const calculatedTitle = [receiverNameTitle.trim(), receiverJobTitle.trim()].filter(Boolean).join(' - ') || receiverTitle.trim();
    if (!calculatedTitle && !receiverJobTitle.trim() && !receiverNameTitle.trim()) {
      alert('سمت یا عنوان گیرنده نامه الزامی است.');
      return;
    }

    const currentSenderOrg = currentUser?.orgId ? SystemAdminService.getOrganization(currentUser.orgId) : undefined;
    const senderUserTitle = currentUser?.jobTitle || currentUser?.jobLevel || 'کارشناس';
    const receiverOrg = receiverOrgId ? organizations.find(o => o.id === receiverOrgId) : undefined;
    const receiverUser = receiverUserId ? allUsers.find(u => u.id === receiverUserId) : undefined;

    const finalOrgName = receiverOrgName.trim() || receiverOrg?.name || (scope === 'INTERNAL' ? currentSenderOrg?.name : undefined);

    const letterData: Partial<OfficialLetter> = {
      projectId,
      letterNumber: letterNumber.trim(),
      indicatorNumber: indicatorNumber.trim() || undefined,
      date: date.trim(),
      subject: subject.trim(),
      scope,
      letterType,
      priority,
      confidentiality,
      receiverTitle: calculatedTitle || 'مقام محترم گیرنده',
      receiverNameTitle: receiverNameTitle.trim() || undefined,
      receiverJobTitle: receiverJobTitle.trim() || calculatedTitle || undefined,
      receiverOrgId: receiverOrgId || undefined,
      receiverOrgName: finalOrgName,
      receiverUserId: receiverUserId || undefined,
      receiverUserName: receiverUser ? formatUserDisplayFormal(receiverUser, SystemAdminService.getOrganization(receiverUser.orgId)) : undefined,
      attentionTo: attentionTo.trim() || undefined,
      content,
      fontFamily,
      fontSize,
      senderOrgId: currentUser?.orgId || 'org-1',
      senderOrgName: currentSenderOrg?.name || 'سازمان کاربر',
      senderUserFullName: currentUser ? currentUser.fullName : 'کاربر سیستم',
      senderUserJobTitle: senderUserTitle,
      hasAttachment: attachments.length > 0,
      attachments,
      transcripts,
      ...((isDirectSend ? { sendDirectly: true } : {}) as any)
    };

    onSave(letterData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-2 md:p-4 bg-stone-900/70 backdrop-blur-md overflow-y-auto" dir="rtl">
      <div className="bg-white rounded-3xl shadow-2xl border border-stone-200 w-full max-w-5xl my-4 overflow-hidden flex flex-col max-h-[92vh] animate-fadeIn">
        {/* Header */}
        <div className="p-5 bg-[#faf8f4] border-b border-[#e5ded0] flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-black">
              <FileText size={22} />
            </div>
            <div>
              <h2 className="font-black text-stone-800 text-base md:text-lg">
                {initialLetter ? 'ویرایش نامه رسمی و اداری' : 'ثبت و تدوین نامه رسمی جدید'}
              </h2>
              <p className="text-xs text-stone-500 font-bold mt-0.5">
                تنظیم متن فنی، تعیین گیرندگان، قالب‌بندی پاراگراف‌ها، پیوست‌ها و رونوشت‌ها
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-200 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 md:p-7 space-y-6">
          {/* Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-stone-50 rounded-2xl border border-stone-200/70">
            <div>
              <label className="text-xs font-black text-stone-700 block mb-1.5">پروژه مربوطه:</label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full bg-white border border-[#e5ded0] rounded-xl px-3 py-2 text-xs font-bold text-stone-800 outline-none focus:border-amber-500"
              >
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-black text-stone-700 block mb-1.5">حوزه نامه (دامنه انتشار):</label>
              <select
                value={scope}
                onChange={(e) => setScope(e.target.value as LetterScope)}
                className="w-full bg-white border border-[#e5ded0] rounded-xl px-3 py-2 text-xs font-bold text-stone-800 outline-none focus:border-amber-500 font-black"
              >
                <option value="INTERNAL">🔒 درون‌سازمانی (فقط پرسنل همین سازمان)</option>
                <option value="EXTERNAL">🌐 برون‌سازمانی (ارسال به مشاور / کارفرما / پیمانکار)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-black text-stone-700 block mb-1.5">نوع نامه:</label>
              <select
                value={letterType}
                onChange={(e) => setLetterType(e.target.value as LetterType)}
                className="w-full bg-white border border-[#e5ded0] rounded-xl px-3 py-2 text-xs font-bold text-stone-800 outline-none focus:border-amber-500"
              >
                <option value="TECHNICAL">نامه فنی و مهندسی</option>
                <option value="ADMINISTRATIVE">نامه اداری و عمومی</option>
                <option value="FINANCIAL">نامه مالی و صورت‌وضعیت</option>
                <option value="CONTRACTUAL">نامه قراردادی و حقوقی</option>
                <option value="WORK_PERMIT_REQUEST">درخواست مجوز کارگاهی</option>
                <option value="SAFETY">نامه ایمنی و بهداشت (HSE)</option>
                <option value="OTHER">سایر مکاتبات</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-black text-stone-700 block mb-1.5">شماره نامه:</label>
              <input
                type="text"
                value={letterNumber}
                onChange={(e) => setLetterNumber(e.target.value)}
                placeholder="مثلاً: 1403/T/105"
                className="w-full bg-white border border-[#e5ded0] rounded-xl px-3 py-2 text-xs font-bold text-stone-800 outline-none focus:border-amber-500 dir-ltr text-right"
                required
              />
            </div>

            <div>
              <label className="text-xs font-black text-stone-700 block mb-1.5">تاریخ نامه (شمسی):</label>
              <ShamsiDatePicker
                value={date}
                onChange={setDate}
                placeholder="1403/03/15"
                required
                inputClassName="!bg-white !border-[#e5ded0] !rounded-xl !px-3 !py-2 !text-xs !font-bold !text-stone-800 focus:!border-amber-500"
              />
            </div>

            <div>
              <label className="text-xs font-black text-stone-700 block mb-1.5">شماره اندیکاتور دبیرخانه:</label>
              <input
                type="text"
                value={indicatorNumber}
                onChange={(e) => setIndicatorNumber(e.target.value)}
                placeholder="مثلاً: IND-8042"
                className="w-full bg-white border border-[#e5ded0] rounded-xl px-3 py-2 text-xs font-bold text-stone-800 outline-none focus:border-amber-500 dir-ltr text-right"
              />
            </div>

            <div>
              <label className="text-xs font-black text-stone-700 block mb-1.5">اولویت اقدام:</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as LetterPriority)}
                className="w-full bg-white border border-[#e5ded0] rounded-xl px-3 py-2 text-xs font-bold text-stone-800 outline-none focus:border-amber-500"
              >
                <option value="NORMAL">عادی</option>
                <option value="URGENT">فوری</option>
                <option value="VERY_URGENT">خیلی فوری</option>
                <option value="INSTANT">آنی</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-black text-stone-700 block mb-1.5">طبقه‌بندی محرمانگی:</label>
              <select
                value={confidentiality}
                onChange={(e) => setConfidentiality(e.target.value as LetterConfidentiality)}
                className="w-full bg-white border border-[#e5ded0] rounded-xl px-3 py-2 text-xs font-bold text-stone-800 outline-none focus:border-amber-500"
              >
                <option value="NORMAL">عادی</option>
                <option value="CONFIDENTIAL">محرمانه</option>
                <option value="HIGHLY_CONFIDENTIAL">به کلی سری</option>
              </select>
            </div>
          </div>

          {/* Addressee & Subject Section */}
          <div className="p-4 bg-[#faf8f4] rounded-2xl border border-[#e5ded0] space-y-4">
            <div className="text-xs font-black text-amber-900 border-b border-amber-200/60 pb-2 flex items-center justify-between">
              <span>مشخصات گیرنده و مخاطب اصلی نامه (تفکیک شده):</span>
              <span className="text-[10px] text-stone-500 font-bold">نام شرکت، عنوان مخاطب و سمت شغلی</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* 1. Company / Organization Name */}
              <div>
                <label className="text-xs font-black text-stone-800 block mb-1.5">
                  نام شرکت / سازمان گیرنده <span className="text-red-500">*</span>:
                </label>
                {scope === 'EXTERNAL' ? (
                  <div className="space-y-1.5">
                    <select
                      value={receiverOrgId}
                      onChange={(e) => {
                        const selectedOrgId = e.target.value;
                        setReceiverOrgId(selectedOrgId);
                        const orgObj = organizations.find(o => o.id === selectedOrgId);
                        if (orgObj) setReceiverOrgName(orgObj.name);
                      }}
                      className="w-full bg-white border border-[#e5ded0] rounded-xl px-3 py-2 text-xs font-bold text-stone-800 outline-none focus:border-amber-500"
                    >
                      <option value="">انتخاب از لیست سازمان‌ها...</option>
                      {organizations.filter(o => o.id !== currentUser?.orgId).map(org => (
                        <option key={org.id} value={org.id}>{org.name} ({org.type})</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={receiverOrgName}
                      onChange={(e) => setReceiverOrgName(e.target.value)}
                      placeholder="یا نام کامل شرکت گیرنده..."
                      className="w-full bg-white border border-[#e5ded0] rounded-xl px-3 py-2 text-xs font-bold text-stone-800 outline-none focus:border-amber-500"
                      required
                    />
                  </div>
                ) : (
                  <input
                    type="text"
                    value={receiverOrgName}
                    onChange={(e) => setReceiverOrgName(e.target.value)}
                    placeholder={currentOrg?.name ? `مثال: ${currentOrg.name}` : "مثال: نام شرکت درون‌سازمانی..."}
                    className="w-full bg-white border border-[#e5ded0] rounded-xl px-3 py-2.5 text-xs font-bold text-stone-800 outline-none focus:border-amber-500"
                  />
                )}
              </div>

              {/* 2. Recipient Title / Name */}
              <div>
                <label className="text-xs font-black text-stone-800 block mb-1.5">
                  عنوان / نام مخاطب (اختیاری):
                </label>
                <input
                  type="text"
                  value={receiverNameTitle}
                  onChange={(e) => setReceiverNameTitle(e.target.value)}
                  placeholder="مثال: جناب آقای مهندس احمدی"
                  className="w-full bg-white border border-[#e5ded0] rounded-xl px-3 py-2.5 text-xs font-bold text-stone-800 outline-none focus:border-amber-500"
                />
              </div>

              {/* 3. Recipient Job Title / Position */}
              <div>
                <label className="text-xs font-black text-stone-800 block mb-1.5">
                  عنوان گیرنده / سمت شغلی <span className="text-red-500">*</span>:
                </label>
                <input
                  type="text"
                  value={receiverJobTitle}
                  onChange={(e) => setReceiverJobTitle(e.target.value)}
                  placeholder="مثال: سرپرست محترم کارگاه / کارشناس دفتر فنی"
                  className="w-full bg-white border border-[#e5ded0] rounded-xl px-3 py-2.5 text-xs font-bold text-stone-800 outline-none focus:border-amber-500"
                  required
                />
              </div>
            </div>

            {/* Internal User Option */}
            {scope === 'INTERNAL' && (
              <div>
                <label className="text-xs font-black text-stone-700 block mb-1.5">انتخاب کاربر گیرنده درون‌سازمانی (اختیاری):</label>
                <select
                  value={receiverUserId}
                  onChange={(e) => {
                    const uId = e.target.value;
                    setReceiverUserId(uId);
                    const uObj = allUsers.find(u => u.id === uId);
                    if (uObj) {
                      setReceiverNameTitle(`جناب آقای / سرکار خانم ${uObj.fullName}`);
                      if (uObj.jobTitle) setReceiverJobTitle(uObj.jobTitle);
                    }
                  }}
                  className="w-full bg-white border border-[#e5ded0] rounded-xl px-3 py-2 text-xs font-bold text-stone-800 outline-none focus:border-amber-500"
                >
                  <option value="">انتخاب کاربر مقصد...</option>
                  {allUsers.filter(u => u.orgId === currentUser?.orgId && u.id !== currentUser?.id).map(user => {
                    const org = SystemAdminService.getOrganization(user.orgId);
                    return (
                      <option key={user.id} value={user.id}>
                        {formatUserDisplayFormal(user, org)}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {/* Subject and Attention To */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-xs font-black text-stone-800 block mb-1.5">
                  موضوع نامه <span className="text-red-500">*</span>:
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="مثال: اعلام آماده‌سازی آرماتوربندی فونداسیون جهت بازدید و بتن‌ریزی"
                  className="w-full bg-white border border-[#e5ded0] rounded-xl px-4 py-2.5 text-xs font-bold text-stone-800 outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-black text-stone-700 block mb-1.5">عطف به / پیرو (اختیاری):</label>
                <input
                  type="text"
                  value={attentionTo}
                  onChange={(e) => setAttentionTo(e.target.value)}
                  placeholder="مثال: عطف به نامه شماره 1403/CS/82 مورخ 1403/03/02"
                  className="w-full bg-white border border-[#e5ded0] rounded-xl px-3 py-2 text-xs font-bold text-stone-800 outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Quick Pre-made Templates Dropdown */}
          <div className="flex items-center justify-between gap-2 p-3 bg-amber-50/70 border border-amber-200/80 rounded-2xl">
            <div className="flex items-center gap-2 text-amber-800 text-xs font-black">
              <Sparkles size={16} className="text-amber-600" />
              <span>قالب‌های آماده مکاتبات مهندسی و اداری:</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {LETTER_TEMPLATES.map(tpl => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => handleApplyTemplate(tpl)}
                  className="px-2.5 py-1 text-[11px] font-bold bg-white text-stone-700 rounded-lg border border-amber-200 hover:bg-amber-100 hover:text-stone-900 transition-colors shadow-xs"
                >
                  {tpl.title.split(' ')[0]} {tpl.title.split(' ')[1]}
                </button>
              ))}
            </div>
          </div>

          {/* Rich Editor Toolbar & Area */}
          <div className="border border-stone-300 rounded-2xl overflow-hidden shadow-xs">
            {/* Toolbar */}
            <div className="bg-stone-100 p-2.5 border-b border-stone-200 flex flex-wrap items-center gap-2">
              {/* Font Family Selector */}
              <select
                value={fontFamily}
                onChange={(e) => {
                  setFontFamily(e.target.value);
                  execCmd('fontName', e.target.value);
                }}
                className="bg-white border border-stone-300 rounded-lg px-2.5 py-1 text-xs font-bold text-stone-700 outline-none"
              >
                {FONT_FAMILIES.map(f => (
                  <option key={f.id} value={f.id}>{f.label}</option>
                ))}
              </select>

              {/* Font Size Selector */}
              <select
                value={fontSize}
                onChange={(e) => {
                  setFontSize(e.target.value);
                }}
                className="bg-white border border-stone-300 rounded-lg px-2.5 py-1 text-xs font-bold text-stone-700 outline-none"
              >
                {FONT_SIZES.map(s => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>

              <div className="h-5 w-px bg-stone-300 mx-1" />

              {/* Basic Formatting */}
              <button
                type="button"
                onClick={() => execCmd('bold')}
                className="p-1.5 rounded-lg bg-white border border-stone-200 text-stone-700 hover:bg-stone-200 transition-colors"
                title="درشت (Bold)"
              >
                <Bold size={15} />
              </button>
              <button
                type="button"
                onClick={() => execCmd('italic')}
                className="p-1.5 rounded-lg bg-white border border-stone-200 text-stone-700 hover:bg-stone-200 transition-colors"
                title="کج (Italic)"
              >
                <Italic size={15} />
              </button>
              <button
                type="button"
                onClick={() => execCmd('underline')}
                className="p-1.5 rounded-lg bg-white border border-stone-200 text-stone-700 hover:bg-stone-200 transition-colors"
                title="خط زیرین (Underline)"
              >
                <Underline size={15} />
              </button>

              <div className="h-5 w-px bg-stone-300 mx-1" />

              {/* Alignment */}
              <button
                type="button"
                onClick={() => execCmd('justifyRight')}
                className="p-1.5 rounded-lg bg-white border border-stone-200 text-stone-700 hover:bg-stone-200 transition-colors"
                title="راست‌چین"
              >
                <AlignRight size={15} />
              </button>
              <button
                type="button"
                onClick={() => execCmd('justifyCenter')}
                className="p-1.5 rounded-lg bg-white border border-stone-200 text-stone-700 hover:bg-stone-200 transition-colors"
                title="وسط‌چین"
              >
                <AlignCenter size={15} />
              </button>
              <button
                type="button"
                onClick={() => execCmd('justifyLeft')}
                className="p-1.5 rounded-lg bg-white border border-stone-200 text-stone-700 hover:bg-stone-200 transition-colors"
                title="چپ‌چین"
              >
                <AlignLeft size={15} />
              </button>
              <button
                type="button"
                onClick={() => execCmd('justifyFull')}
                className="p-1.5 rounded-lg bg-white border border-stone-200 text-stone-700 hover:bg-stone-200 transition-colors"
                title="هم‌تراز (Justify)"
              >
                <AlignJustify size={15} />
              </button>

              <div className="h-5 w-px bg-stone-300 mx-1" />

              {/* Table Button */}
              <button
                type="button"
                onClick={() => setIsTableModalOpen(true)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-700 border border-amber-300 hover:bg-amber-500/20 text-xs font-bold transition-colors"
                title="افزودن جدول"
              >
                <TableIcon size={15} />
                <span>درج جدول</span>
              </button>
            </div>

            {/* Editable Content Canvas */}
            <div
              ref={editorRef}
              contentEditable
              onInput={handleEditorInput}
              style={{
                fontFamily: `${fontFamily}, sans-serif`,
                fontSize: fontSize
              }}
              className="p-5 min-h-[220px] max-h-[400px] overflow-y-auto bg-white text-stone-800 outline-none leading-relaxed text-justify"
            />
          </div>

          {/* Attachments Section */}
          <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/80 space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 text-xs font-black text-stone-800">
                <Paperclip size={16} className="text-stone-600" />
                <span>پیوست‌های نامه (اسناد، نقشه‌ها، تصاویر):</span>
                <span className="bg-stone-200 text-stone-700 px-2 py-0.5 rounded-full text-[10px] font-black">
                  {attachments.length} مورد
                </span>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-stone-300 rounded-xl text-xs font-bold text-stone-700 hover:bg-stone-100 transition-colors shadow-xs"
              >
                <Plus size={14} />
                <span>افزودن فایل پیوست</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>

            {attachments.length === 0 ? (
              <div className="text-center py-4 text-xs font-bold text-stone-400 border border-dashed border-stone-200 rounded-xl">
                هیچ فایل پیوستی اضافه نشده است.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {attachments.map(att => (
                  <div key={att.id} className="flex items-center justify-between p-2.5 bg-white border border-stone-200 rounded-xl text-xs font-bold">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <FileText size={16} className="text-amber-600 shrink-0" />
                      <div className="truncate">
                        <div className="text-stone-800 truncate" title={att.name}>{att.name}</div>
                        <div className="text-[10px] text-stone-400">{att.size}</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(att.id)}
                      className="p-1 text-stone-400 hover:text-red-500 rounded-lg hover:bg-stone-100 transition-colors"
                      title="حذف پیوست"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Transcripts (رونوشت‌ها) Section */}
          <div className="p-4 bg-[#faf8f4] rounded-2xl border border-[#e5ded0] space-y-3">
            <div className="flex items-center gap-2 text-xs font-black text-stone-800">
              <Building size={16} className="text-stone-600" />
              <span>رونوشت‌های نامه (جهت استحضار / اطلاع و پیگیری / اقدام):</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <input
                type="text"
                value={newTranscriptName}
                onChange={(e) => setNewTranscriptName(e.target.value)}
                placeholder="نام گیرنده یا سمت (مثال: مدیر فنی)"
                className="bg-white border border-[#e5ded0] rounded-xl px-3 py-2 text-xs font-bold text-stone-800 outline-none focus:border-amber-500"
              />
              <input
                type="text"
                value={newTranscriptOrg}
                onChange={(e) => setNewTranscriptOrg(e.target.value)}
                placeholder="شرکت / سازمان (اختیاری)"
                className="bg-white border border-[#e5ded0] rounded-xl px-3 py-2 text-xs font-bold text-stone-800 outline-none focus:border-amber-500"
              />
              <input
                type="text"
                value={newTranscriptNote}
                onChange={(e) => setNewTranscriptNote(e.target.value)}
                placeholder="یادداشت رونوشت (مثال: جهت استحضار)"
                className="bg-white border border-[#e5ded0] rounded-xl px-3 py-2 text-xs font-bold text-stone-800 outline-none focus:border-amber-500"
              />
              <button
                type="button"
                onClick={handleAddTranscript}
                className="flex items-center justify-center gap-1 px-3 py-2 bg-stone-800 text-white rounded-xl text-xs font-black hover:bg-stone-900 transition-colors"
              >
                <Plus size={14} />
                <span>افزودن رونوشت</span>
              </button>
            </div>

            {transcripts.length > 0 && (
              <div className="space-y-1.5 mt-2">
                {transcripts.map((t, idx) => (
                  <div key={t.id} className="flex items-center justify-between p-2 bg-white border border-[#ece5d8] rounded-xl text-xs font-bold text-stone-700">
                    <div>
                      <span className="text-stone-400 font-bold ml-2">{idx + 1}.</span>
                      <span className="font-black text-stone-800">{t.recipientName}</span>
                      {t.orgName && <span className="text-stone-500 mr-1.5">({t.orgName})</span>}
                      {t.note && <span className="text-amber-700 font-bold mr-2 text-[11px]">«{t.note}»</span>}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveTranscript(t.id)}
                      className="p-1 text-stone-400 hover:text-red-500 rounded-lg hover:bg-stone-100 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex flex-wrap gap-2.5 pt-4 border-t border-stone-200 justify-end items-center">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-stone-100 text-stone-600 font-bold hover:bg-stone-200 transition-colors text-xs cursor-pointer"
            >
              انصراف
            </button>
            <button
              type="submit"
              onClick={() => setIsDirectSend(false)}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-black border border-stone-300 shadow-xs transition-all text-xs cursor-pointer active:scale-95"
            >
              <Save size={15} />
              <span>{initialLetter ? 'ذخیره تغییرات' : 'ذخیره به عنوان پیش‌نویس'}</span>
            </button>
            <button
              type="submit"
              onClick={() => setIsDirectSend(true)}
              className="flex items-center gap-2 px-7 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-black shadow-md shadow-amber-500/20 transition-all text-xs cursor-pointer active:scale-95"
            >
              <Send size={15} />
              <span>{initialLetter ? 'ثبت و ارسال رسمی مجدد' : 'ثبت و ارسال رسمی به گیرنده'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Insert Table Modal */}
      {isTableModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl p-5 shadow-2xl border border-stone-200 max-w-sm w-full space-y-4 text-right">
            <h3 className="font-black text-stone-800 text-sm flex items-center gap-2">
              <TableIcon size={18} className="text-amber-600" />
              <span>مشخصات جدول مورد نظر:</span>
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">تعداد سطرها:</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={tableRows}
                  onChange={(e) => setTableRows(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs font-bold text-stone-800 outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">تعداد ستون‌ها:</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={tableCols}
                  onChange={(e) => setTableCols(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs font-bold text-stone-800 outline-none"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsTableModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-stone-100 text-stone-600 text-xs font-bold hover:bg-stone-200"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleInsertTable}
                className="px-5 py-2 rounded-xl bg-amber-600 text-white text-xs font-black hover:bg-stone-900"
              >
                درج جدول در نامه
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
