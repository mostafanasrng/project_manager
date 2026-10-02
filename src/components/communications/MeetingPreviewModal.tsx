import React from 'react';
import { 
  X, Printer, Send, CheckCircle2, XCircle, Lock, Unlock, 
  Calendar, Clock, MapPin, Users, CheckSquare, 
  UserCheck, ShieldCheck, FileText, AlertCircle,
  PenTool
} from 'lucide-react';
import { Project, SystemUser, WorkflowStatus } from '../../../types';
import { WorkflowService } from '../../../services/workflowService';
import { HRService } from '../../../services/hrService';
import { 
  MeetingMinuteRecord 
} from './ProjectMeetingsDashboard';
import { 
  printMeetingMinutes, 
  MeetingPartiesStructure,
  MeetingAttendeeItem
} from './MeetingMinutePrint';
import { SystemAdminService } from '../../../services/systemAdminService';
import { getAttendeeMatchScore } from '../../utils/meetingUtils';

export interface MeetingPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  meeting: MeetingMinuteRecord | null;
  activeProject?: Project | any;
  currentUser: SystemUser | null;
  onPrint: (meeting: any) => void;
  onSendToAllAttendees: (meeting: any) => void;
  onOpenSignModal: (meeting: any) => void;
  onOpenWorkflow: (meeting: any, action: any) => void;
  onUnlockMeeting: (meeting: any) => void;
}

export const MeetingPreviewModal: React.FC<MeetingPreviewModalProps> = ({
  isOpen,
  onClose,
  meeting,
  activeProject,
  currentUser,
  onPrint,
  onSendToAllAttendees,
  onOpenSignModal,
  onOpenWorkflow,
  onUnlockMeeting
}) => {
  if (!isOpen || !meeting) return null;

  const projectTitle = activeProject?.title || 'پروژه عمرانی';
  const employerName = activeProject?.employerName || (activeProject as any)?.employer || 'شرکت کارفرما';
  const consultantName = activeProject?.consultantName || (activeProject as any)?.consultant || 'مهندسین مشاور';
  const contractorName = activeProject?.contractorName || (activeProject as any)?.contractor || 'شرکت پیمانکاری';

  const partiesStructure: MeetingPartiesStructure = (meeting as any).partiesStructure || 'TRIPARTITE';
  const isContractorInvolved = partiesStructure !== 'BIPARTITE_EMPLOYER_CONSULTANT';
  const isConsultantInvolved = partiesStructure !== 'BIPARTITE_EMPLOYER_CONTRACTOR';
  const isEmployerInvolved = partiesStructure !== 'BIPARTITE_CONSULTANT_CONTRACTOR';

  const isLocked = meeting.isFinalFrozen || meeting.status === WorkflowStatus.APPROVED_FINAL;

  // Check if current user can unlock (Employer PM or Supervisor)
  const users = SystemAdminService.getUsers();
  const orgs = SystemAdminService.getOrganizations();
  const userOrg = currentUser ? orgs.find(o => o.id === currentUser.orgId) : null;
  const isEmployer = (currentUser as any)?.orgType === 'EMPLOYER' || userOrg?.type === 'EMPLOYER';
  const userTitle = (currentUser?.jobTitle || '').toLowerCase();
  const isManagerOrSupervisor = 
    userTitle.includes('مدیر پروژه') || 
    userTitle.includes('سرپرست') || 
    currentUser?.role === 'ORG_MANAGER' || 
    currentUser?.role === 'ORG_ADMIN' || 
    currentUser?.role === 'SYSTEM_ADMIN';
  const canUnlock = isLocked && isEmployer && isManagerOrSupervisor;

  // Attendees info
  const attendeesList: MeetingAttendeeItem[] = meeting.attendeeList && meeting.attendeeList.length > 0
    ? meeting.attendeeList
    : meeting.attendees.map(att => ({
        id: undefined,
        userId: undefined,
        name: att,
        role: 'نماینده حاضر',
        organization: att.includes('کارفرما') ? employerName : att.includes('مشاور') ? consultantName : contractorName,
        attendanceStatus: 'PRESENT' as const,
        requiresSignature: true,
        isManualGuest: false,
        signed: false
      }));

  const signableAttendees = attendeesList.filter(a => a.attendanceStatus !== 'ABSENT' && a.requiresSignature !== false && !a.isManualGuest);
  const signedAttendeesCount = signableAttendees.filter(a => a.signed).length;
  const totalAttendeesCount = signableAttendees.length;
  const allAttendeesSigned = totalAttendeesCount > 0 && signedAttendeesCount === totalAttendeesCount;
  const isFullySignedAndLocked = (allAttendeesSigned && isLocked) || meeting.isFinalFrozen || meeting.status === WorkflowStatus.APPROVED_FINAL;

  // User's attendee status - MUST BE A REGISTERED ATTENDEE IN THE MEETING AND NOT ABSENT
  const currentUserAttendee = attendeesList.find((a: any) => getAttendeeMatchScore(a, currentUser) > 0);

  const isUserRegisteredAttendee = !!currentUserAttendee && currentUserAttendee.attendanceStatus !== 'ABSENT';
  const userCanSign = !isLocked && !!currentUser && isUserRegisteredAttendee && !currentUserAttendee.signed;

  const isCreator = meeting.createdById === currentUser?.id || 
                    (meeting.recordedBy && currentUser?.fullName && (
                      meeting.recordedBy.includes(currentUser.fullName) ||
                      currentUser.fullName.includes(meeting.recordedBy)
                    ));
  const canSendToAttendees = !isLocked && !meeting.sentToAllAttendees && !!currentUser && (isCreator || currentUser.role === 'SYSTEM_ADMIN');

  // Decisions
  const decisions = meeting.structuredDecisions && meeting.structuredDecisions.length > 0
    ? meeting.structuredDecisions
    : meeting.decisions.map((d, i) => ({
        id: `dec-${i}`,
        itemNumber: i + 1,
        description: d,
        actionParty: 'ارکان ذیربط پروژه',
        deadline: meeting.date,
        priority: 'MEDIUM' as const,
        status: 'PENDING' as const
      }));

  // Structure label
  const structureLabel = 
    partiesStructure === 'TRIPARTITE' ? 'صورت‌جلسه سه‌جانبه (کارفرما - مشاور - پیمانکار)' :
    partiesStructure === 'BIPARTITE_EMPLOYER_CONTRACTOR' ? 'صورت‌جلسه دوجانبه (کارفرما - پیمانکار)' :
    partiesStructure === 'BIPARTITE_CONSULTANT_CONTRACTOR' ? 'صورت‌جلسه دوجانبه (مشاور - پیمانکار)' :
    'صورت‌جلسه دوجانبه (کارفرما - مشاور)';

  const orgSignatures = (meeting as any).orgSignatures || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-3 md:p-6 animate-fadeIn" dir="rtl">
      <div className="bg-white rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl border border-stone-200 overflow-hidden">
        
        {/* Header Bar */}
        <div className="bg-stone-900 text-white p-5 px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <FileText size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black bg-amber-500 text-stone-950 px-2 py-0.5 rounded-md">
                  پیش‌نمایش جامع صورت‌جلسه
                </span>
                <span className="text-xs font-bold text-stone-400">
                  {meeting.minuteNumber || 'MOM-OFFICIAL'}
                </span>
                {isLocked ? (
                  <span className="text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <Lock size={11} /> مصوب نهایی و قفل‌شده
                  </span>
                ) : (
                  <span className="text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <Clock size={11} /> در جریان امضا و تایید
                  </span>
                )}
              </div>
              <h3 className="font-black text-base text-white mt-1">
                {meeting.title}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-full text-stone-400 hover:text-white transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Lock Banner / Notification */}
        {isLocked ? (
          <div className="bg-emerald-50 border-b border-emerald-200 p-3 px-6 flex items-center justify-between shrink-0 text-xs">
            <div className="flex items-center gap-2 text-emerald-900 font-bold">
              <ShieldCheck size={18} className="text-emerald-600 shrink-0" />
              <span>
                این صورت‌جلسه پس از ثبت امضای تمامی حاضرین و تایید مدیران سازمان‌های ذیربط، به عنوان <strong>سند قطعی و نافذ</strong> تایید و قفل گردیده است.
              </span>
            </div>
            {canUnlock && (
              <button
                onClick={() => onUnlockMeeting(meeting)}
                className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black rounded-lg text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer shrink-0"
              >
                <Unlock size={14} />
                <span>رفع قفل و بازگشایی (کارفرما)</span>
              </button>
            )}
          </div>
        ) : (
          <div className="bg-amber-50/80 border-b border-amber-200/80 p-2.5 px-6 flex items-center justify-between shrink-0 text-xs text-amber-950 font-bold">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-amber-600 shrink-0" />
              <span>
                وضعیت سند: <strong>در انتظار تکمیل امضای حاضرین ({signedAttendeesCount} از {totalAttendeesCount} امضا ثبت شده است)</strong>. سند تنها پس از ثبت امضای کلیه حاضرین قفل و قطعی خواهد شد.
              </span>
            </div>
          </div>
        )}

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-stone-50 p-4 rounded-2xl border border-stone-200/80 text-xs">
            <div>
              <span className="text-[10px] text-stone-400 font-bold block">تاریخ جلسه:</span>
              <span className="font-black text-stone-800 flex items-center gap-1 mt-0.5">
                <Calendar size={13} className="text-amber-600" />
                {meeting.date}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-stone-400 font-bold block">زمان و ساعت:</span>
              <span className="font-black text-stone-800 flex items-center gap-1 mt-0.5">
                <Clock size={13} className="text-amber-600" />
                {meeting.time || 'جلسه رسمی'}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-stone-400 font-bold block">مکان تشکیل:</span>
              <span className="font-black text-stone-800 flex items-center gap-1 mt-0.5">
                <MapPin size={13} className="text-amber-600" />
                {meeting.location || 'کارگاه پروژه'}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-stone-400 font-bold block">ساختار طرفین:</span>
              <span className="font-black text-blue-700 mt-0.5 block">
                {partiesStructure === 'TRIPARTITE' ? 'سه‌جانبه کامل' : 'دوجانبه'}
              </span>
            </div>
          </div>

          {/* Agenda Section if exists */}
          {meeting.agenda && meeting.agenda.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-black text-xs text-stone-800 flex items-center gap-1.5">
                <FileText size={15} className="text-amber-600" />
                دستور کار و محورهای مورد بحث جلسه
              </h4>
              <div className="bg-amber-50/50 border border-amber-200/60 rounded-2xl p-3">
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {meeting.agenda.map((ag, idx) => (
                    <li key={idx} className="text-xs font-bold text-amber-950 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md bg-amber-200/80 text-amber-900 flex items-center justify-center text-[10px] font-black shrink-0">
                        {idx + 1}
                      </span>
                      <span>{ag}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Attendees Table & Individual Signatures */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="font-black text-xs text-stone-800 flex items-center gap-1.5">
                <UserCheck size={15} className="text-amber-600" />
                مشخصات حاضرین و وضعیت امضای اعضا
              </h4>
              <span className="text-xs font-bold text-stone-500">
                امضا شده: <strong className="text-emerald-600 font-black">{signedAttendeesCount}</strong> از {totalAttendeesCount} حاضر
              </span>
            </div>

            <div className="overflow-x-auto border border-stone-200 rounded-2xl">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-stone-100/80 text-stone-700 border-b border-stone-200">
                    <th className="p-3 pr-4 font-black w-10 text-center">ردیف</th>
                    <th className="p-3 font-black">نام و نام خانوادگی</th>
                    <th className="p-3 font-black">سمت سازمانی / جلسه</th>
                    <th className="p-3 font-black">سازمان / شرکت</th>
                    <th className="p-3 font-black text-center w-24">وضعیت حضور</th>
                    <th className="p-3 font-black text-center w-36">تایید حضور</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {attendeesList.map((att, idx) => {
                    const isCurrentUserRow = currentUser && ((att.userId && att.userId === currentUser.id) || (currentUser.fullName && att.name.includes(currentUser.fullName)));

                    return (
                      <tr key={idx} className={`hover:bg-stone-50/70 transition-colors ${isCurrentUserRow ? 'bg-amber-50/30' : ''}`}>
                        <td className="p-3 text-center font-bold text-stone-400">{idx + 1}</td>
                        <td className="p-3 font-black text-stone-800 flex items-center gap-2">
                          <span>{att.name}</span>
                          {att.isManagerOrSupervisor && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-purple-100 text-purple-700 border border-purple-200">
                              سرپرست / مدیر
                            </span>
                          )}
                          {(att.isManualGuest || (!att.userId && att.requiresSignature === false)) && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-stone-100 text-stone-600 border border-stone-200">
                              حاضر مدعو
                            </span>
                          )}
                        </td>
                        <td className="p-3 font-bold text-stone-600">{att.role || 'نماینده رسمی'}</td>
                        <td className="p-3 text-stone-500 font-bold">{att.organization || '-'}</td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            att.attendanceStatus === 'ABSENT' ? 'bg-red-100 text-red-700' :
                            att.attendanceStatus === 'EXCUSED' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {att.attendanceStatus === 'ABSENT' ? 'غایب' : att.attendanceStatus === 'EXCUSED' ? 'موجه' : 'حاضر'}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          {att.attendanceStatus === 'ABSENT' ? (
                            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 border border-red-200 text-red-700 text-[10px] font-black">
                              <XCircle size={12} className="text-red-600" />
                              <span>✗ عدم حضور</span>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-black">
                              <CheckCircle2 size={12} className="text-emerald-600" />
                              <span>✓ تایید حضور</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Decisions and Commitments Table */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="font-black text-xs text-stone-800 flex items-center gap-1.5">
                <CheckSquare size={15} className="text-amber-600" />
                تصمیمات و تکالیف مصوب جلسه
              </h4>
              <span className="text-xs font-bold text-stone-500">
                تعداد مصوبات: <strong className="text-stone-900 font-black">{decisions.length}</strong>
              </span>
            </div>

            <div className="overflow-x-auto border border-stone-200 rounded-2xl">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-stone-100/80 text-stone-700 border-b border-stone-200">
                    <th className="p-3 pr-4 font-black w-10 text-center">بند</th>
                    <th className="p-3 font-black">شرح مصوبه و تصمیم</th>
                    <th className="p-3 font-black w-40">مسئول اقدام</th>
                    <th className="p-3 font-black w-28 text-center">مهلت</th>
                    <th className="p-3 font-black w-24 text-center">اولویت</th>
                    <th className="p-3 font-black w-28 text-center">وضعیت</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {decisions.map((dec, idx) => (
                    <tr key={idx} className="hover:bg-stone-50/70 transition-colors">
                      <td className="p-3 text-center font-black text-stone-600">{dec.itemNumber || idx + 1}</td>
                      <td className="p-3 font-bold text-stone-800 leading-relaxed">{dec.description}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md font-bold text-[11px] border border-blue-200/60">
                          {dec.actionParty || 'ارکان پروژه'}
                        </span>
                      </td>
                      <td className="p-3 text-center text-stone-600 font-bold text-[11px]">{dec.deadline || meeting.date}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          dec.priority === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                          dec.priority === 'HIGH' ? 'bg-amber-100 text-amber-800' : 'bg-stone-100 text-stone-600'
                        }`}>
                          {dec.priority === 'CRITICAL' ? 'بحرانی' : dec.priority === 'HIGH' ? 'فوری' : 'عادی'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {dec.status === 'COMPLETED' ? (
                          <span className="text-emerald-600 font-bold flex items-center justify-center gap-1">
                            <CheckCircle2 size={12} /> انجام شد
                          </span>
                        ) : (
                          <span className="text-blue-600 font-bold">در دست اقدام</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Next Meeting & Notes Section */}
          {(meeting.nextMeetingDate || meeting.notes || (meeting as any).nextMeetingAgendas?.length || meeting.nextMeetingAgenda) && (
            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 space-y-2.5 text-xs text-stone-800">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-stone-200/80">
                <span className="font-black flex items-center gap-1.5 text-stone-900">
                  <Calendar size={14} className="text-amber-600" />
                  مشخصات جلسه آتی و پیگیری‌ها
                </span>
                {meeting.nextMeetingDate && (
                  <span className="font-bold bg-white px-2.5 py-1 rounded-lg border border-stone-200 text-stone-700">
                    تاریخ: {meeting.nextMeetingDate} {meeting.nextMeetingLocation ? `| محل: ${meeting.nextMeetingLocation}` : ''}
                  </span>
                )}
              </div>

              {((meeting as any).nextMeetingAgendas && (meeting as any).nextMeetingAgendas.length > 0) ? (
                <div className="space-y-1">
                  <span className="font-black text-[11px] text-stone-600 block">دستور کار پیشنهادی جلسه آتی:</span>
                  <div className="space-y-1 pr-2">
                    {(meeting as any).nextMeetingAgendas.map((ag: string, idx: number) => (
                      <div key={idx} className="flex items-start gap-1.5 text-stone-700 font-bold">
                        <span className="text-amber-600 font-black">•</span>
                        <span>بند {idx + 1}: {ag}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : meeting.nextMeetingAgenda ? (
                <div className="text-stone-700 font-bold">
                  <span className="font-black text-[11px] text-stone-600">دستور کار پیشنهادی: </span>
                  {meeting.nextMeetingAgenda}
                </div>
              ) : null}

              {meeting.notes && (
                <div className="pt-1.5 border-t border-stone-200/60 text-stone-600 text-[11px]">
                  <span className="font-black text-stone-700">ملاحظات و توضیحات دبیرخانه: </span>
                  {meeting.notes}
                </div>
              )}
            </div>
          )}

          {/* Official Manager / Supervisor Signature Boxes & All Attendees */}
          <div className="space-y-3 pt-2">
            <div className="text-center">
              <h4 className="font-black text-xs text-stone-800 flex items-center justify-center gap-1.5">
                <ShieldCheck size={16} className="text-amber-600" />
                کادرهای تایید و امضای اختصاصی حاضرین و ارکان ذیربط پروژه
              </h4>
              <p className="text-[11px] text-stone-500 mt-0.5">
                برای هر یک از حاضرین ثبت‌شده در جلسه، کادر امضای مجزا با مشخصات و سمت سازمانی ایجاد شده است.
              </p>
            </div>

            {(() => {
              const getOrgType = (att: MeetingAttendeeItem): 'CONTRACTOR' | 'CONSULTANT' | 'EMPLOYER' | 'OTHER' => {
                if (att.orgType === 'CONTRACTOR' || att.orgType === 'SUB_CONTRACTOR') return 'CONTRACTOR';
                if (att.orgType === 'CONSULTANT') return 'CONSULTANT';
                if (att.orgType === 'EMPLOYER') return 'EMPLOYER';
                if (att.orgType === 'GUEST') return 'OTHER';
                const org = (att.organization || '').toLowerCase();
                const role = (att.role || '').toLowerCase();
                if (org.includes('پیمانکار') || (contractorName && org.includes(contractorName.toLowerCase())) || role.includes('پیمانکار')) return 'CONTRACTOR';
                if (org.includes('مشاور') || org.includes('نظارت') || (consultantName && org.includes(consultantName.toLowerCase())) || role.includes('مشاور') || role.includes('ناظر')) return 'CONSULTANT';
                if (org.includes('کارفرما') || (employerName && org.includes(employerName.toLowerCase())) || role.includes('کارفرما')) return 'EMPLOYER';
                return 'OTHER';
              };

              const contractorAtts = attendeesList.filter(a => getOrgType(a) === 'CONTRACTOR');
              const consultantAtts = attendeesList.filter(a => getOrgType(a) === 'CONSULTANT');
              const employerAtts = attendeesList.filter(a => getOrgType(a) === 'EMPLOYER');
              const otherAtts = attendeesList.filter(a => getOrgType(a) === 'OTHER');

              const hasOther = otherAtts.length > 0;
              const colsCount = (isContractorInvolved ? 1 : 0) + (isConsultantInvolved ? 1 : 0) + (isEmployerInvolved ? 1 : 0) + (hasOther ? 1 : 0);

              const renderAttendeeCard = (att: {
                userId?: string;
                name: string;
                role?: string;
                organization?: string;
                attendanceStatus?: string;
                signed?: boolean;
                signature?: string;
                signedAt?: string;
                comment?: string;
              }, key: string | number) => {
                const isAbsent = att.attendanceStatus === 'ABSENT';
                const roleTitle = att.role || 'نماینده حاضر در جلسه';
                const signerName = att.name || 'نماینده مسئول';
                const orgInfo = att.organization ? ` • ${att.organization}` : '';

                const effectiveSig = att.signature || HRService.getUserSignature({
                  id: att.userId,
                  fullName: signerName,
                  signature: att.signature
                });

                const isLockedOrApproved = isLocked || meeting.isFinalFrozen || meeting.status === WorkflowStatus.APPROVED_FINAL;
                const isEffectivelySigned = att.signed || isLockedOrApproved;

                return (
                  <div key={key} className="bg-white border border-stone-300 rounded-xl overflow-hidden flex flex-col justify-between min-h-[120px] shadow-2xs text-center transition-all">
                    {/* Top Header: Role Title */}
                    <div className="bg-stone-100/90 border-b border-stone-200 p-1.5 px-2 font-black text-[10px] text-stone-800 truncate">
                      {roleTitle}
                    </div>

                    {/* Main Body */}
                    <div className="p-2.5 flex-1 flex flex-col items-center justify-center space-y-1 my-auto">
                      {isAbsent ? (
                        <div className="w-full border border-dashed border-red-200 bg-red-50/70 rounded-lg p-2 text-[9px] text-red-600 font-bold">
                          عدم حضور در جلسه (غایب)
                        </div>
                      ) : isEffectivelySigned ? (
                        <div className="space-y-1 w-full">
                          <span className="inline-block bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded text-[8.5px] font-black">
                            ✓ تایید و امضای الکترونیک
                          </span>
                          {effectiveSig && (
                            <img src={effectiveSig} alt="امضا" className="h-9 mx-auto object-contain my-1 max-w-[120px]" />
                          )}
                          <div className="text-xs font-black text-stone-900">{signerName}</div>
                          <div className="text-[10px] text-stone-500 font-bold">{roleTitle}{orgInfo}</div>
                          {att.signedAt && (
                            <div className="text-[8.5px] text-stone-400 font-mono mt-0.5">{att.signedAt}</div>
                          )}
                          {att.comment && (
                            <div className="text-[9px] text-stone-600 italic bg-stone-50 p-1 rounded border border-stone-200/80 mt-1">
                              «{att.comment}»
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-1.5 w-full">
                          {!isAbsent && userCanSign && currentUser && (att.userId === currentUser.id || getAttendeeMatchScore(att as any, currentUser) > 0) ? (
                            <button
                              type="button"
                              onClick={() => onOpenSignModal(meeting)}
                              className="w-full h-10 border border-dashed border-emerald-400 bg-emerald-50 hover:bg-emerald-100 rounded-lg flex items-center justify-center gap-1.5 text-[10px] text-emerald-700 font-black transition-all cursor-pointer shadow-xs"
                              title="ثبت امضای دیجیتال من در این کادر"
                            >
                              <PenTool size={13} />
                              <span>ثبت امضای من</span>
                            </button>
                          ) : (
                            <div className="w-full h-10 border border-dashed border-stone-300 rounded-lg flex items-center justify-center text-[9.5px] text-stone-400 font-bold bg-stone-50/70">
                              محل مهر و امضای {signerName}
                            </div>
                          )}
                          <div className="text-xs font-black text-stone-900">{signerName}</div>
                          <div className="text-[10px] text-stone-500 font-bold">{roleTitle}{orgInfo}</div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              };

              return (
                <div className={`grid grid-cols-1 md:grid-cols-${Math.min(colsCount, 3)} lg:grid-cols-${colsCount} gap-3`}>
                  
                  {/* Contractor Signatures */}
                  {isContractorInvolved && (
                    <div className="bg-stone-50 border border-stone-200 rounded-2xl p-3.5 space-y-3">
                      <div className="text-center border-b border-stone-200 pb-2">
                        <span className="font-black text-xs text-stone-900 block">پیمانکار اصلی پروژه</span>
                        <span className="text-[10px] font-bold text-stone-500">{contractorName}</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {contractorAtts.length > 0 ? (
                          contractorAtts.map((att, idx) => renderAttendeeCard(att, idx))
                        ) : (
                          <>
                            {renderAttendeeCard({
                              name: orgSignatures?.contractor?.workshopManager?.name || 'سرپرست کارگاه',
                              role: 'سرپرست کارگاه پیمانکار',
                              signed: orgSignatures?.contractor?.workshopManager?.signed,
                              signature: orgSignatures?.contractor?.workshopManager?.signature,
                              signedAt: orgSignatures?.contractor?.workshopManager?.signedAt
                            }, 'wm-c')}
                            {renderAttendeeCard({
                              name: orgSignatures?.contractor?.projectManager?.name || 'مدیر پروژه',
                              role: 'مدیر پروژه پیمانکار',
                              signed: orgSignatures?.contractor?.projectManager?.signed,
                              signature: orgSignatures?.contractor?.projectManager?.signature,
                              signedAt: orgSignatures?.contractor?.projectManager?.signedAt
                            }, 'pm-c')}
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Consultant Signatures */}
                  {isConsultantInvolved && (
                    <div className="bg-stone-50 border border-stone-200 rounded-2xl p-3.5 space-y-3">
                      <div className="text-center border-b border-stone-200 pb-2">
                        <span className="font-black text-xs text-stone-900 block">مهندسین مشاور و نظارت</span>
                        <span className="text-[10px] font-bold text-stone-500">{consultantName}</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {consultantAtts.length > 0 ? (
                          consultantAtts.map((att, idx) => renderAttendeeCard(att, idx))
                        ) : (
                          <>
                            {renderAttendeeCard({
                              name: orgSignatures?.consultant?.workshopManager?.name || 'سرپرست نظارت مقیم',
                              role: 'سرپرست نظارت مقیم',
                              signed: orgSignatures?.consultant?.workshopManager?.signed,
                              signature: orgSignatures?.consultant?.workshopManager?.signature,
                              signedAt: orgSignatures?.consultant?.workshopManager?.signedAt
                            }, 'wm-s')}
                            {renderAttendeeCard({
                              name: orgSignatures?.consultant?.projectManager?.name || 'مدیر پروژه مشاور',
                              role: 'مدیر پروژه مشاور',
                              signed: orgSignatures?.consultant?.projectManager?.signed,
                              signature: orgSignatures?.consultant?.projectManager?.signature,
                              signedAt: orgSignatures?.consultant?.projectManager?.signedAt
                            }, 'pm-s')}
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Employer Signatures */}
                  {isEmployerInvolved && (
                    <div className="bg-stone-50 border border-stone-200 rounded-2xl p-3.5 space-y-3">
                      <div className="text-center border-b border-stone-200 pb-2">
                        <span className="font-black text-xs text-stone-900 block">دستگاه کارفرما</span>
                        <span className="text-[10px] font-bold text-stone-500">{employerName}</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {employerAtts.length > 0 ? (
                          employerAtts.map((att, idx) => renderAttendeeCard(att, idx))
                        ) : (
                          <>
                            {renderAttendeeCard({
                              name: orgSignatures?.employer?.workshopManager?.name || 'سرپرست نظارت کارفرما',
                              role: 'سرپرست نظارت کارفرما',
                              signed: orgSignatures?.employer?.workshopManager?.signed,
                              signature: orgSignatures?.employer?.workshopManager?.signature,
                              signedAt: orgSignatures?.employer?.workshopManager?.signedAt
                            }, 'wm-e')}
                            {renderAttendeeCard({
                              name: orgSignatures?.employer?.projectManager?.name || 'مدیر پروژه کارفرما',
                              role: 'مدیر پروژه کارفرما',
                              signed: orgSignatures?.employer?.projectManager?.signed,
                              signature: orgSignatures?.employer?.projectManager?.signature,
                              signedAt: orgSignatures?.employer?.projectManager?.signedAt
                            }, 'pm-e')}
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Other Attendees Signatures */}
                  {hasOther && (
                    <div className="bg-stone-50 border border-stone-200 rounded-2xl p-3.5 space-y-3">
                      <div className="text-center border-b border-stone-200 pb-2">
                        <span className="font-black text-xs text-stone-900 block">سایر مدعوین و ارکان</span>
                        <span className="text-[10px] font-bold text-stone-500">حاضرین و کارشناسان جلسه</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {otherAtts.map((att, idx) => renderAttendeeCard(att, idx))}
                      </div>
                    </div>
                  )}

                </div>
              );
            })()}
          </div>

        </div>

        {/* Footer Actions */}
        <div className="bg-stone-100 border-t border-stone-200 p-4 px-6 flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs font-bold text-stone-500">
            سند رسمی صورت‌جلسات کارگاهی پروژه
          </div>

          <div className="flex items-center gap-2">
            {userCanSign && (
              <button
                type="button"
                onClick={() => onOpenSignModal(meeting)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-600/20"
              >
                <PenTool size={15} />
                <span>ثبت امضای من در صورت‌جلسه</span>
              </button>
            )}

            {canSendToAttendees && (
              <button
                type="button"
                onClick={() => onSendToAllAttendees(meeting)}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-500/20"
              >
                <Send size={15} />
                <span>ارسال سراسری به حاضرین</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onPrint(meeting)}
              className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Printer size={15} />
              <span>چاپ رسمی مهندسی</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              بستن
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
