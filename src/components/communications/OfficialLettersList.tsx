import React, { useState, useMemo } from 'react';
import { 
  Plus, Search, Filter, Mail, FileText, Send, 
  Printer, History, Edit, Trash2, CheckCircle2, 
  XCircle, Clock, ShieldCheck, Paperclip, ChevronLeft, 
  ArrowLeftRight, AlertCircle, Lock, Eye, Building2, User,
  MessageSquare, Reply, Download
} from 'lucide-react';
import { OfficialLetter, Project, WorkflowStatus, WorkflowAction, LetterScope, LetterType } from '../../../types';
import { SystemUser, OrganizationType } from '../../../systemAdminTypes';
import { SystemAdminService } from '../../../services/systemAdminService';
import { WorkflowService } from '../../../services/workflowService';
import { NotificationService } from '../../../services/notificationService';
import { printOfficialLetter } from './OfficialLetterPrint';
import { formatUserDisplayFormal } from '../../utils/userFormatter';

interface OfficialLettersListProps {
  letters: OfficialLetter[];
  projects: Project[];
  selectedProjectId: string;
  currentUser: SystemUser | null;
  highlightedRecordId?: string | null;
  onOpenNewModal: () => void;
  onOpenEditModal: (letter: OfficialLetter) => void;
  onDeleteLetter: (letterId: string) => void;
  onOpenWorkflowModal: (letter: OfficialLetter, action: WorkflowAction) => void;
  onOpenHistoryModal: (letter: OfficialLetter) => void;
  onOpenMarginaliaModal: (letter: OfficialLetter) => void;
  onOpenPreviewModal: (letter: OfficialLetter) => void;
  onReplyLetter?: (letter: OfficialLetter) => void;
}

export const OfficialLettersList: React.FC<OfficialLettersListProps> = ({
  letters,
  projects,
  selectedProjectId,
  currentUser,
  highlightedRecordId,
  onOpenNewModal,
  onOpenEditModal,
  onDeleteLetter,
  onOpenWorkflowModal,
  onOpenHistoryModal,
  onOpenMarginaliaModal,
  onOpenPreviewModal,
  onReplyLetter
}) => {
  const [scopeFilter, setScopeFilter] = useState<'ALL' | LetterScope>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | LetterType>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | WorkflowStatus>('ALL');

  const [unreadRecordIds, setUnreadRecordIds] = useState<Set<string>>(() => {
    return currentUser ? NotificationService.getUnreadRecordIds(currentUser.id) : new Set();
  });

  React.useEffect(() => {
    const updateUnread = () => {
      if (currentUser) {
        setUnreadRecordIds(NotificationService.getUnreadRecordIds(currentUser.id));
      }
    };
    window.addEventListener('notification-updated', updateUnread);
    return () => window.removeEventListener('notification-updated', updateUnread);
  }, [currentUser]);

  const handleRowClick = (letterId: string) => {
    if (currentUser && unreadRecordIds.has(String(letterId))) {
      NotificationService.markRecordAsRead(String(letterId), currentUser.id);
      setUnreadRecordIds(prev => {
        const next = new Set(prev);
        next.delete(String(letterId));
        return next;
      });
    }
  };

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

  // Security and Scope Filtering Rule
  const filteredLetters = useMemo(() => {
    return letters.filter(letter => {
      // 1. Project check
      if (letter.projectId !== selectedProjectId) return false;

      // 2. Internal vs External Visibility Rule:
      // Internal letters are strictly visible ONLY to users belonging to the same organization (or SYSTEM_ADMIN)
      if (letter.scope === 'INTERNAL') {
        if (!isSystemAdmin && currentUser?.orgId !== letter.ownerOrgId) {
          return false;
        }
      } else {
        // External letters: visible to ownerOrg or if sent to/assigned to current org
        if (!isSystemAdmin && currentUser) {
          const isOwner = letter.ownerOrgId === currentUser.orgId;
          const isReceiverOrg = letter.receiverOrgId === currentUser.orgId;
          const isCurrentOrg = letter.currentOrgId === currentUser.orgId;
          const isAssignee = letter.assigneeId === currentUser.id;
          if (!isOwner && !isReceiverOrg && !isCurrentOrg && !isAssignee) {
            // Check if user's organization is recipient in transcripts
            const isTranscriptOrg = (letter.transcripts || []).some(t => t.orgName === currentOrg?.name);
            if (!isTranscriptOrg) return false;
          }
        }
      }

      // 3. Scope Tab Filter
      if (scopeFilter !== 'ALL' && letter.scope !== scopeFilter) return false;

      // 4. Type Filter
      if (typeFilter !== 'ALL' && letter.letterType !== typeFilter) return false;

      // 5. Status Filter
      if (statusFilter !== 'ALL' && letter.status !== statusFilter) return false;

      // 6. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchesSubj = (letter.subject || '').toLowerCase().includes(q);
        const matchesNum = (letter.letterNumber || '').toLowerCase().includes(q);
        const matchesInd = (letter.indicatorNumber || '').toLowerCase().includes(q);
        const matchesRecv = (letter.receiverTitle || '').toLowerCase().includes(q);
        const matchesSender = (letter.senderUserFullName || '').toLowerCase().includes(q);
        const matchesOrg = (letter.senderOrgName || '').toLowerCase().includes(q);
        if (!matchesSubj && !matchesNum && !matchesInd && !matchesRecv && !matchesSender && !matchesOrg) {
          return false;
        }
      }

      return true;
    });
  }, [letters, selectedProjectId, currentUser, isSystemAdmin, scopeFilter, typeFilter, statusFilter, searchQuery, currentOrg]);

  return (
    <div className="space-y-6">
      {/* Controls & Filter Bar */}
      <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-black">
              <Mail size={24} />
            </div>
            <div>
              <h2 className="font-black text-stone-800 text-lg md:text-xl flex items-center gap-2">
                <span>مکاتبات و نامه‌های اداری و فنی</span>
                <span className="text-xs bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full font-bold">
                  {filteredLetters.length} نامه
                </span>
              </h2>
              <p className="text-xs text-stone-500 font-bold mt-0.5">
                مدیریت مکاتبات درون‌سازمانی، نامه‌های برون‌سازمانی، گردش کار امضاها، پیوست‌ها و چاپ استاندارد
              </p>
            </div>
          </div>

          <button
            onClick={onOpenNewModal}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-amber-600 text-white font-black hover:bg-stone-900 shadow-md transition-all text-xs shrink-0"
          >
            <Plus size={16} />
            <span>ثبت و ارسال نامه جدید</span>
          </button>
        </div>

        {/* Filters and Search */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-stone-100">
          {/* Search Box */}
          <div className="relative">
            <Search size={16} className="absolute right-3 top-3 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو در موضوع، شماره، فرستنده، گیرنده..."
              className="w-full bg-[#faf8f4] border border-[#e5ded0] rounded-xl pr-9 pl-3 py-2 text-xs font-bold text-stone-800 outline-none focus:border-amber-500"
            />
          </div>

          {/* Scope Filter */}
          <div>
            <select
              value={scopeFilter}
              onChange={(e) => setScopeFilter(e.target.value as any)}
              className="w-full bg-[#faf8f4] border border-[#e5ded0] rounded-xl px-3 py-2 text-xs font-bold text-stone-800 outline-none focus:border-amber-500"
            >
              <option value="ALL">همه دامنه‌ها (درون و برون‌سازمانی)</option>
              <option value="INTERNAL">🔒 فقط نامه‌های درون‌سازمانی</option>
              <option value="EXTERNAL">🌐 فقط نامه‌های برون‌سازمانی (کارگاهی)</option>
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="w-full bg-[#faf8f4] border border-[#e5ded0] rounded-xl px-3 py-2 text-xs font-bold text-stone-800 outline-none focus:border-amber-500"
            >
              <option value="ALL">همه انواع نامه‌ها</option>
              <option value="TECHNICAL">نامه‌های فنی و مهندسی</option>
              <option value="ADMINISTRATIVE">نامه‌های اداری و عمومی</option>
              <option value="FINANCIAL">نامه‌های مالی و صورت‌وضعیت</option>
              <option value="CONTRACTUAL">نامه‌های قراردادی و حقوقی</option>
              <option value="WORK_PERMIT_REQUEST">درخواست‌های مجوز کارگاهی</option>
              <option value="SAFETY">نامه‌های ایمنی و بهداشت (HSE)</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full bg-[#faf8f4] border border-[#e5ded0] rounded-xl px-3 py-2 text-xs font-bold text-stone-800 outline-none focus:border-amber-500"
            >
              <option value="ALL">همه وضعیت‌های گردش کار</option>
              <option value={WorkflowStatus.DRAFT}>پیش‌نویس (DRAFT)</option>
              <option value={WorkflowStatus.IN_REVIEW}>در حال بررسی درون‌سازمانی</option>
              <option value={WorkflowStatus.APPROVED_INTERNAL}>تایید شده درون‌سازمانی</option>
              <option value={WorkflowStatus.SENT_TO_CONSULTANT}>ارسال شده به مشاور</option>
              <option value={WorkflowStatus.SENT_TO_EMPLOYER}>ارسال شده به کارفرما</option>
              <option value={WorkflowStatus.APPROVED_BY_EMPLOYER}>تایید نهایی کارفرما</option>
              <option value={WorkflowStatus.REJECTED}>رد شده / عودت</option>
            </select>
          </div>
        </div>
      </div>

      {/* Letters List / Table */}
      {filteredLetters.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-stone-200 text-stone-400 space-y-3">
          <Mail size={40} className="mx-auto text-stone-300" />
          <div className="font-black text-stone-700 text-base">هیچ نامه‌ای یافت نشد</div>
          <p className="text-xs text-stone-400 max-w-sm mx-auto">
            با توجه به فیلترهای انتخابی یا دسترسی سازمان شما به پروژه جاری، نامه‌ای برای نمایش وجود ندارد.
          </p>
          <button
            onClick={onOpenNewModal}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-50 text-amber-700 font-black hover:bg-amber-100 border border-amber-200 text-xs mt-2"
          >
            <Plus size={14} />
            <span>ثبت اولین نامه</span>
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-stone-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-[#faf8f4] border-b border-[#e5ded0] text-[11px] font-black text-stone-600">
                  <th className="p-3.5 pr-5">شماره و تاریخ</th>
                  <th className="p-3.5">موضوع نامه</th>
                  <th className="p-3.5">دامنه و نوع</th>
                  <th className="p-3.5">فرستنده / سازمان</th>
                  <th className="p-3.5">گیرنده اصلی</th>
                  <th className="p-3.5 text-center">پیوست</th>
                  <th className="p-3.5 text-center">وضعیت گردش کار</th>
                  <th className="p-3.5 text-center pl-5">عملیات و اقدامات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-xs">
                {filteredLetters.map(letter => {
                  const statusLabel = WorkflowService.getStatusLabel(letter.status);
                  const statusColor = WorkflowService.getStatusColor(letter.status);
                  const isOwner = currentUser?.orgId === letter.ownerOrgId || isSystemAdmin;
                  const isCurrentHolder = currentUser?.orgId === letter.currentOrgId || isSystemAdmin;
                  const isDraft = letter.status === WorkflowStatus.DRAFT;

                  const isUnread = unreadRecordIds.has(String(letter.id));

                  return (
                    <tr 
                      key={letter.id} 
                      id={`record-${letter.id}`}
                      onClick={() => handleRowClick(letter.id)}
                      className={`transition-all duration-500 cursor-pointer ${
                        isUnread ? 'bg-amber-100/50 dark:bg-amber-950/30 border-r-4 border-r-amber-500 shadow-xs ring-1 ring-amber-400/30' : ''
                      } ${
                        highlightedRecordId === letter.id
                          ? 'bg-yellow-100/80 dark:bg-yellow-950/50 scale-[1.005] shadow-md z-10 relative ring-2 ring-amber-400'
                          : 'hover:bg-stone-50/80'
                      }`}
                    >
                      {/* Number & Date */}
                      <td className="p-3.5 pr-5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-black text-stone-800 text-xs dir-ltr text-right">{letter.letterNumber}</span>
                          {isUnread && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                              دیده نشده
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-stone-400 font-bold mt-0.5">{letter.date}</div>
                        {letter.indicatorNumber && (
                          <div className="text-[9px] text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded w-fit mt-1 font-mono">
                            {letter.indicatorNumber}
                          </div>
                        )}
                      </td>

                      {/* Subject */}
                      <td className="p-3.5 max-w-[280px]">
                        <div className="font-black text-stone-800 truncate" title={letter.subject}>
                          {letter.subject}
                        </div>
                        {letter.attentionTo && (
                          <div className="text-[10px] text-stone-500 font-bold truncate mt-0.5" title={letter.attentionTo}>
                            عطف به: {letter.attentionTo}
                          </div>
                        )}
                      </td>

                      {/* Scope & Type */}
                      <td className="p-3.5">
                        <div className="flex flex-col gap-1 items-start">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                            letter.scope === 'INTERNAL' 
                              ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                              : 'bg-purple-50 text-purple-700 border border-purple-200'
                          }`}>
                            {letter.scope === 'INTERNAL' ? '🔒 درون‌سازمانی' : '🌐 برون‌سازمانی'}
                          </span>
                          <span className="text-[10px] text-stone-500 font-bold">
                            {letter.letterType === 'TECHNICAL' ? 'فنی و مهندسی' :
                             letter.letterType === 'ADMINISTRATIVE' ? 'اداری و عمومی' :
                             letter.letterType === 'FINANCIAL' ? 'مالی' :
                             letter.letterType === 'CONTRACTUAL' ? 'قراردادی' :
                             letter.letterType === 'WORK_PERMIT_REQUEST' ? 'مجوز کارگاه' :
                             letter.letterType === 'SAFETY' ? 'ایمنی (HSE)' : 'سایر'}
                          </span>
                        </div>
                      </td>

                      {/* Sender */}
                      <td className="p-3.5">
                        <div className="font-bold text-stone-800">{letter.senderUserFullName}</div>
                        <div className="text-[10px] text-stone-400 font-bold">{letter.senderOrgName}</div>
                      </td>

                      {/* Receiver */}
                      <td className="p-3.5 max-w-[200px]">
                        <div className="font-bold text-stone-800 truncate" title={letter.receiverTitle}>
                          {letter.receiverTitle}
                        </div>
                        {letter.receiverOrgName && (
                          <div className="text-[10px] text-stone-400 truncate">{letter.receiverOrgName}</div>
                        )}
                      </td>

                      {/* Attachments */}
                      <td className="p-3.5 text-center">
                        {letter.attachments && letter.attachments.length > 0 ? (
                          <div className="flex flex-col items-center gap-1">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 font-bold text-[10px]" title={`${letter.attachments.length} فایل پیوست`}>
                              <Paperclip size={12} className="text-amber-600" />
                              <span>{letter.attachments.length}</span>
                            </span>
                            <div className="flex flex-wrap gap-1 justify-center max-w-[120px] mt-1">
                              {letter.attachments.map(att => (
                                att.dataUrl ? (
                                  <a
                                    key={att.id}
                                    href={att.dataUrl}
                                    download={att.name}
                                    className="p-1 hover:bg-amber-100 bg-amber-50 border border-amber-200 text-amber-700 rounded transition-colors flex items-center justify-center text-[9px] font-bold shrink-0"
                                    title={`دانلود ${att.name}`}
                                  >
                                    <Download size={10} />
                                  </a>
                                ) : (
                                  <span key={att.id} className="p-1 text-stone-400" title={att.name}>
                                    <Paperclip size={10} />
                                  </span>
                                )
                              ))}
                            </div>
                          </div>
                        ) : (
                          <span className="text-stone-300 text-[10px]">-</span>
                        )}
                      </td>

                      {/* Workflow Status */}
                      <td className="p-3.5 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black inline-block ${statusColor}`}>
                          {statusLabel}
                        </span>
                        {letter.assigneeName && (
                          <div className="text-[10px] text-stone-600 font-bold mt-1 max-w-[150px] truncate mx-auto" title={letter.assigneeName}>
                            گیرنده: {letter.assigneeName}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-center pl-5">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {/* Print Button */}
                          <button
                            onClick={() => printOfficialLetter(letter, activeProject)}
                            className="p-3 text-stone-400 hover:text-stone-900 hover:bg-[#faf8f4] rounded-2xl transition-all shadow-sm hover:shadow-md"
                            title="چاپ رسمی نامه"
                          >
                            <Printer size={18} />
                          </button>

                          {/* History Button */}
                          <button
                            onClick={() => onOpenHistoryModal(letter)}
                            className="p-1.5 rounded-lg bg-stone-100 text-stone-700 hover:bg-stone-200 transition-colors"
                            title="تاریخچه گردش کار و امضاها"
                          >
                            <History size={15} />
                          </button>

                          {/* Marginalia Button */}
                          {(() => {
                            const isExternalSentToOther = 
                              currentUser?.role !== 'SYSTEM_ADMIN' &&
                              letter.scope === 'EXTERNAL' &&
                              (letter.ownerOrgId || letter.senderOrgId) === currentUser?.orgId &&
                              (letter.currentOrgId || letter.ownerOrgId) !== currentUser?.orgId;

                            const buttonTitle = isExternalSentToOther
                              ? `مشاهده سوابق هامش (نامه نزد سازمان مقصد است - فقط خواندنی)`
                              : (letter.marginalia && letter.marginalia.length > 0)
                                ? `هامش و دستورات ارجاع (${letter.marginalia.length} مورد ثبت شده)`
                                : 'ثبت هامش و دستورات ارجاع (پاراف)';

                            return (
                              <button
                                onClick={() => onOpenMarginaliaModal(letter)}
                                className={`p-1.5 rounded-lg transition-colors border relative ${
                                  letter.marginalia && letter.marginalia.length > 0
                                    ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100 font-black shadow-xs'
                                    : 'bg-stone-100 text-stone-700 hover:bg-[#faf8f4] hover:text-amber-700 border-stone-200'
                                }`}
                                title={buttonTitle}
                              >
                                <MessageSquare size={15} />
                                {letter.marginalia && letter.marginalia.length > 0 && (
                                  <span className="absolute -top-1.5 -right-1.5 bg-amber-600 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-white shadow-xs">
                                    {letter.marginalia.length}
                                  </span>
                                )}
                              </button>
                            );
                          })()}

                          {/* Preview Button */}
                          <button
                            onClick={() => onOpenPreviewModal(letter)}
                            className="p-1.5 rounded-lg bg-stone-100 text-stone-700 hover:bg-[#faf8f4] hover:text-blue-700 transition-colors border border-stone-200"
                            title="مشاهده پیش‌نمایش"
                          >
                            <Eye size={15} />
                          </button>

                          {/* Reply Button - Only for recipient of external letter */}
                          {(() => {
                            if (!onReplyLetter || !currentUser || letter.scope !== 'EXTERNAL') return null;
                            const isSender = currentUser.orgId === letter.ownerOrgId || currentUser.orgId === letter.senderOrgId || currentUser.id === letter.createdById;
                            if (isSender) return null;

                            const isRecipient = (letter.receiverOrgId && currentUser.orgId === letter.receiverOrgId) ||
                              (letter.receiverUserId && currentUser.id === letter.receiverUserId) ||
                              (letter.currentOrgId && currentUser.orgId === letter.currentOrgId) ||
                              (!letter.receiverOrgId && (
                                (letter.status === WorkflowStatus.SENT_TO_CONSULTANT && currentOrg?.type === OrganizationType.CONSULTANT) ||
                                (letter.status === WorkflowStatus.SENT_TO_EMPLOYER && currentOrg?.type === OrganizationType.EMPLOYER)
                              ));

                            const isSent = letter.status !== WorkflowStatus.DRAFT && letter.status !== WorkflowStatus.APPROVED_INTERNAL && letter.status !== WorkflowStatus.REJECTED;

                            if (!isRecipient || !isSent) return null;

                            return (
                              <button
                                onClick={() => onReplyLetter(letter)}
                                className="p-1.5 rounded-lg bg-stone-100 text-stone-700 hover:bg-amber-50 hover:text-amber-700 transition-colors border border-amber-200 shadow-xs"
                                title="جواب به نامه"
                              >
                                <Reply size={15} />
                              </button>
                            );
                          })()}

                          {/* Dynamic Workflow Actions from WorkflowService */}
                          {currentUser && WorkflowService.getAvailableActions(letter as any, currentUser, currentOrg?.type).map((action) => (
                            <button
                              key={action}
                              onClick={() => onOpenWorkflowModal(letter, action)}
                              className={`px-2.5 py-1 rounded-lg font-black transition-all active:scale-95 text-[11px] flex items-center gap-1 shadow-xs ${WorkflowService.getActionStyle(action)}`}
                              title={WorkflowService.getActionLabel(action, currentOrg?.type)}
                            >
                              {action === 'SUBMIT' && <Send size={12} />}
                              {action === 'APPROVE' && <CheckCircle2 size={12} />}
                              {action === 'FINAL_APPROVE' && <CheckCircle2 size={12} />}
                              {action === 'REASSIGN' && <ArrowLeftRight size={12} />}
                              {action === 'REJECT' && <XCircle size={12} />}
                              {action === 'SEND_TO_CONSULTANT' && <ChevronLeft size={12} />}
                              {action === 'SEND_TO_EMPLOYER' && <ChevronLeft size={12} />}
                              {action === 'RETURN_TO_CONTRACTOR' && <ChevronLeft size={12} className="rotate-180" />}
                              {action === 'RETURN_TO_CONSULTANT' && <ChevronLeft size={12} className="rotate-180" />}
                              <span>{WorkflowService.getActionLabel(action, currentOrg?.type)}</span>
                            </button>
                          ))}

                          {/* Edit / Delete strictly restricted by WorkflowService permissions */}
                          {currentUser && WorkflowService.canEdit(letter as any, currentUser) && (
                            <button
                              onClick={() => onOpenEditModal(letter)}
                              className="p-1.5 rounded-lg bg-stone-100 text-stone-700 hover:text-emerald-600 hover:bg-emerald-50 transition-colors shadow-xs"
                              title="ویرایش نامه"
                            >
                              <Edit size={14} />
                            </button>
                          )}

                          {currentUser && (currentUser.role === 'SYSTEM_ADMIN' || WorkflowService.canDelete(letter as any, currentUser)) && (
                            <button
                              onClick={() => onDeleteLetter(letter.id)}
                              className="p-1.5 rounded-lg bg-stone-100 text-stone-700 hover:text-red-600 hover:bg-red-50 transition-colors shadow-xs"
                              title="حذف نامه"
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
        </div>
      )}
    </div>
  );
};
