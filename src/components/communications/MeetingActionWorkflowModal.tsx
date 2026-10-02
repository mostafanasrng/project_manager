import React, { useState, useEffect } from 'react';
import { 
  X, Check, AlertCircle, ShieldCheck, UserCheck, 
  Send, CornerUpLeft, UserX, FileCheck, ArrowRightLeft,
  PenTool, CheckCircle2, Lock, Unlock, AlertTriangle
} from 'lucide-react';
import { SystemUser, WorkflowStatus, WorkflowAction } from '../../../types';
import { HRService } from '../../../services/hrService';
import { SystemAdminService } from '../../../services/systemAdminService';
import { MeetingMinuteRecord } from './ProjectMeetingsDashboard';
import { getAttendeeMatchScore } from '../../utils/meetingUtils';
import { compressSignature } from '../../utils/safeStorage';

export interface MeetingActionWorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
  meeting: MeetingMinuteRecord | null;
  actionType: WorkflowAction | 'SEND_TO_ATTENDEES' | 'SIGN_AS_ATTENDEE' | 'UNFREEZE';
  currentUser: SystemUser | null;
  onConfirm: (payload: {
    actionType: any;
    comment: string;
    assigneeId?: string;
    assigneeName?: string;
    attachSignature: boolean;
    signatureDataUrl?: string;
    asRole?: 'WORKSHOP_MANAGER' | 'PROJECT_MANAGER' | 'ATTENDEE';
  }) => void;
}

// Helper to check if current user is in attendee list and present
const isUserInAttendeesList = (m: MeetingMinuteRecord | null, user: SystemUser | null): boolean => {
  if (!m || !user) return false;

  // 1. Check in attendeeList
  const attList = m.attendeeList || [];
  const foundInList = attList.find(a => getAttendeeMatchScore(a, user) > 0);
  
  if (foundInList) {
    return foundInList.attendanceStatus !== 'ABSENT';
  }

  // 2. Check in attendees array (strings)
  const attNames = m.attendees || [];
  return attNames.some(name => typeof name === 'string' && getAttendeeMatchScore({ name } as any, user) > 0);
};

export const MeetingActionWorkflowModal: React.FC<MeetingActionWorkflowModalProps> = ({
  isOpen,
  onClose,
  meeting,
  actionType,
  currentUser,
  onConfirm
}) => {
  // Check if current user is a registered attendee of this meeting
  const isUserAttendee = meeting ? isUserInAttendeesList(meeting, currentUser) : false;

  const isNoSignatureAction =
    actionType === 'REJECT' ||
    actionType === 'REASSIGN' ||
    actionType === 'RETURN_TO_CONTRACTOR' ||
    actionType === 'RETURN_TO_CONSULTANT' ||
    actionType === 'UNFREEZE';

  const canAttachSignature = isUserAttendee && !isNoSignatureAction;

  const [comment, setComment] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [attachSignature, setAttachSignature] = useState(canAttachSignature);
  const [selectedAsRole, setSelectedAsRole] = useState<'WORKSHOP_MANAGER' | 'PROJECT_MANAGER' | 'ATTENDEE'>('ATTENDEE');
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    setAttachSignature(canAttachSignature);
  }, [canAttachSignature]);

  if (!isOpen || !meeting) return null;

  const users = SystemAdminService.getUsers();
  const orgs = SystemAdminService.getOrganizations();
  const userOrg = currentUser ? orgs.find(o => o.id === currentUser.orgId) : null;

  // Determine user's organization type
  const userOrgType: 'EMPLOYER' | 'CONSULTANT' | 'CONTRACTOR' = 
    (currentUser as any)?.orgType === 'EMPLOYER' || userOrg?.type === 'EMPLOYER' ? 'EMPLOYER' :
    (currentUser as any)?.orgType === 'CONSULTANT' || userOrg?.type === 'CONSULTANT' ? 'CONSULTANT' : 'CONTRACTOR';

  // Check user title
  const userTitle = (currentUser?.jobTitle || currentUser?.jobLevel || '').toLowerCase();
  const isWorkshopManager = 
    userTitle.includes('سرپرست') || 
    userTitle.includes('رئیس') || 
    userTitle.includes('رییس') || 
    userTitle.includes('ناظر') ||
    userTitle.includes('workshop manager');
  const isProjectManager = 
    userTitle.includes('مدیر') || 
    userTitle.includes('project manager') || 
    currentUser?.role === 'ORG_MANAGER' || 
    currentUser?.role === 'ORG_ADMIN' || 
    currentUser?.role === 'SYSTEM_ADMIN';

  // Retrieve user signature directly from HR
  const hrSig = HRService.getUserSignature(currentUser) || currentUser?.signature;
  const userSignature = hrSig ? (compressSignature(hrSig, currentUser?.fullName) || hrSig) : undefined;

  // Dynamic config based on action
  let modalTitle = 'عملیات گردش کار صورت‌جلسه';
  let confirmBtnText = 'ثبت اقدام';
  let confirmBtnColor = 'bg-stone-900 hover:bg-stone-800 text-white';
  let IconComponent = Send;
  let showAssignee = false;

  switch (actionType) {
    case 'SUBMIT':
    case 'SEND_TO_CONSULTANT':
    case 'SEND_TO_EMPLOYER':
      modalTitle = actionType === 'SEND_TO_EMPLOYER' ? 'ارسال صورت‌جلسه به کارفرما' :
                   actionType === 'SEND_TO_CONSULTANT' ? 'ارسال صورت‌جلسه به مهندس مشاور' : 'ارسال صورت‌جلسه';
      confirmBtnText = 'تایید و ارسال رسمی';
      confirmBtnColor = 'bg-blue-600 hover:bg-blue-700 text-white';
      IconComponent = Send;
      break;

    case 'APPROVE':
    case 'FINAL_APPROVE':
      modalTitle = actionType === 'FINAL_APPROVE' ? 'تصویب و ابلاغ قطعی صورت‌جلسه' : 'تایید صورت‌جلسه و ثبت امضا';
      confirmBtnText = 'تایید و ثبت امضای رسمی';
      confirmBtnColor = 'bg-emerald-600 hover:bg-emerald-700 text-white';
      IconComponent = FileCheck;
      break;

    case 'REJECT':
      modalTitle = 'رد صورت‌جلسه';
      confirmBtnText = 'رد قطعی صورت‌جلسه';
      confirmBtnColor = 'bg-red-600 hover:bg-red-700 text-white';
      IconComponent = UserX;
      break;

    case 'RETURN_TO_CONTRACTOR':
    case 'RETURN_TO_CONSULTANT':
      modalTitle = actionType === 'RETURN_TO_CONTRACTOR' ? 'عودت صورت‌جلسه به پیمانکار جهت اصلاح' : 'عودت صورت‌جلسه به مشاور جهت بازبینی';
      confirmBtnText = 'عودت صورت‌جلسه';
      confirmBtnColor = 'bg-amber-600 hover:bg-amber-700 text-white';
      IconComponent = CornerUpLeft;
      break;

    case 'REASSIGN':
      modalTitle = 'ارجاع صورت‌جلسه به کارشناس / همکار';
      confirmBtnText = 'ثبت ارجاع';
      confirmBtnColor = 'bg-purple-600 hover:bg-purple-700 text-white';
      IconComponent = ArrowRightLeft;
      showAssignee = true;
      break;

    case 'SEND_TO_ATTENDEES':
      modalTitle = 'ارسال همزمان به کلیه حاضرین در جلسه جهت امضا';
      confirmBtnText = 'ارسال سراسری به حاضرین';
      confirmBtnColor = 'bg-amber-500 hover:bg-amber-400 text-stone-950 font-black';
      IconComponent = Send;
      break;

    case 'SIGN_AS_ATTENDEE':
      modalTitle = 'ثبت امضای الکترونیک در صورت‌جلسه';
      confirmBtnText = 'تایید و درج امضا';
      confirmBtnColor = 'bg-emerald-600 hover:bg-emerald-700 text-white';
      IconComponent = PenTool;
      break;

    case 'UNFREEZE':
      modalTitle = 'رفع قفل و بازگشایی صورت‌جلسه (دستگاه کارفرما)';
      confirmBtnText = 'تایید رفع قفل و بازگشایی';
      confirmBtnColor = 'bg-amber-600 hover:bg-amber-700 text-white';
      IconComponent = Unlock;
      break;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (actionType === 'REASSIGN' && !assigneeId) {
      setValidationError('لطفاً گیرنده ارجاع را انتخاب فرمایید.');
      return;
    }

    if (actionType === 'UNFREEZE' && !comment.trim()) {
      setValidationError('لطفاً دلیل بازگشایی قفل صورت‌جلسه را بنویسید.');
      return;
    }

    if (canAttachSignature && attachSignature && !hrSig) {
      setValidationError('امضای الکترونیکی شما در سیستم منابع انسانی ثبت نشده است! لطفاً ابتدا از بخش پرسنلی منابع انسانی تصویر امضای خود را بارگذاری فرمایید.');
      return;
    }

    if (actionType === 'FINAL_APPROVE') {
      const attList = meeting.attendeeList || [];
      const signableAtts = attList.filter((a: any) => a.attendanceStatus !== 'ABSENT' && a.requiresSignature !== false && !a.isManualGuest);
      const unsignedAtts = signableAtts.filter((a: any) => !a.signed && !a.signature);
      
      const finalAttachSignature = canAttachSignature && attachSignature && !!hrSig;
      const effectiveUnsigned = unsignedAtts.filter((a: any) => {
        if (finalAttachSignature && getAttendeeMatchScore(a, currentUser) > 0) {
          return false;
        }
        return true;
      });

      if (effectiveUnsigned.length > 0) {
        setValidationError(`قفل و تصویب نهایی صورت‌جلسه منوط به ثبت امضای تمامی حاضرین است. هنوز ${effectiveUnsigned.length} نفر از حاضرین (${effectiveUnsigned.map(a => a.name).join('، ')}) صورت‌جلسه را امضا نکرده‌اند.`);
        return;
      }
    }

    const selectedUser = users.find(u => u.id === assigneeId);

    // Resolve asRole
    let roleToPass: 'WORKSHOP_MANAGER' | 'PROJECT_MANAGER' | 'ATTENDEE' = 'ATTENDEE';
    if (isProjectManager && (actionType === 'APPROVE' || actionType === 'FINAL_APPROVE' || actionType === 'SIGN_AS_ATTENDEE')) {
      roleToPass = selectedAsRole === 'WORKSHOP_MANAGER' ? 'WORKSHOP_MANAGER' : 'PROJECT_MANAGER';
    } else if (isWorkshopManager && (actionType === 'APPROVE' || actionType === 'FINAL_APPROVE' || actionType === 'SIGN_AS_ATTENDEE')) {
      roleToPass = 'WORKSHOP_MANAGER';
    }

    const finalAttachSignature = canAttachSignature && attachSignature && !!hrSig;

    try {
      onConfirm({
        actionType,
        comment: comment.trim(),
        assigneeId: selectedUser?.id,
        assigneeName: selectedUser?.fullName,
        attachSignature: finalAttachSignature,
        signatureDataUrl: finalAttachSignature ? (userSignature || hrSig) : undefined,
        asRole: roleToPass
      });
    } catch (error) {
      console.error('Error submitting meeting action workflow:', error);
    } finally {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4 animate-fadeIn" dir="rtl">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-stone-200 overflow-hidden">
        
        {/* Header */}
        <div className="bg-stone-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <IconComponent size={20} />
            </div>
            <div>
              <h3 className="font-black text-sm text-white">{modalTitle}</h3>
              <p className="text-[11px] text-stone-400 mt-0.5">
                سند: {meeting.minuteNumber || 'MOM-PRJ'} - {meeting.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-full text-stone-400 hover:text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Validation Error Banner */}
          {validationError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-bold flex items-center gap-2">
              <AlertCircle size={16} className="text-red-600 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Action explanation banner */}
          {actionType === 'SEND_TO_ATTENDEES' && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed font-bold">
              با این اقدام، صورت‌جلسه برای کلیه حاضرین ثبت‌شده در جلسه بدون محدودیت سازمانی ارسال شده و اعلان بررسی و امضا دریافت خواهند کرد.
            </div>
          )}

          {actionType === 'UNFREEZE' && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed font-bold">
              توجه: این صورت‌جلسه قبلاً مصوب قطعی شده است. بازگشایی قفل امکان ویرایش، تغییر مصوبات یا تغییر وضعیت امضاها را مجدداً فراهم می‌سازد.
            </div>
          )}

          {actionType === 'SIGN_AS_ATTENDEE' && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 leading-relaxed font-bold flex items-center gap-2">
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
              <span>با ثبت این اقدام، امضای دیجیتال شما مستقیماً در ردیف حاضرین صورت‌جلسه قرار می‌گیرد.</span>
            </div>
          )}

          {/* Role selection for high-level workflow approvals */}
          {(isProjectManager || isWorkshopManager) && (actionType === 'APPROVE' || actionType === 'FINAL_APPROVE') && (
            <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-2">
              <label className="text-xs font-black text-stone-800 block">
                جایگاه تایید و امضای شما در این اقدام:
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {isWorkshopManager && (
                  <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-stone-200 cursor-pointer">
                    <input
                      type="radio"
                      name="signingRole"
                      checked={selectedAsRole === 'WORKSHOP_MANAGER'}
                      onChange={() => setSelectedAsRole('WORKSHOP_MANAGER')}
                      className="accent-amber-600"
                    />
                    <span className="font-bold text-stone-800">سرپرست کارگاه / نظارت مقیم</span>
                  </label>
                )}
                {isProjectManager && (
                  <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-stone-200 cursor-pointer">
                    <input
                      type="radio"
                      name="signingRole"
                      checked={selectedAsRole === 'PROJECT_MANAGER'}
                      onChange={() => setSelectedAsRole('PROJECT_MANAGER')}
                      className="accent-amber-600"
                    />
                    <span className="font-bold text-stone-800">مدیر پروژه سازمان</span>
                  </label>
                )}
                <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-stone-200 cursor-pointer">
                  <input
                    type="radio"
                    name="signingRole"
                    checked={selectedAsRole === 'ATTENDEE'}
                    onChange={() => setSelectedAsRole('ATTENDEE')}
                    className="accent-amber-600"
                  />
                  <span className="font-bold text-stone-800">صرفاً حاضر در جلسه</span>
                </label>
              </div>
            </div>
          )}

          {/* Assignee selector for Reassign */}
          {showAssignee && (
            <div>
              <label className="text-xs font-black text-stone-700 block mb-1">
                انتخاب گیرنده ارجاع <span className="text-red-500">*</span>
              </label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-900 outline-none focus:border-amber-500"
                required
              >
                <option value="">-- انتخاب کاربر / مسئول --</option>
                {users.map(u => {
                  const uOrg = orgs.find(o => o.id === u.orgId);
                  return (
                    <option key={u.id} value={u.id}>
                      {u.fullName} - {u.jobTitle || 'کارشناس'} ({uOrg?.name || 'سازمان'})
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* Comment / Remarks */}
          <div>
            <label className="text-xs font-black text-stone-700 block mb-1">
              توضیحات و هامش گردش‌کار {actionType === 'UNFREEZE' && <span className="text-red-500">*</span>}
            </label>
            <textarea
              placeholder="شرح توضیحات، دستور پیگیری یا علت اقدام..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-900 outline-none focus:bg-white focus:border-amber-500"
              required={actionType === 'UNFREEZE'}
            />
          </div>

          {/* Electronic Signature Toggle & Status Card */}
          {canAttachSignature && (
            <div className="space-y-2 border-t border-stone-200 pt-4 mt-2" dir="rtl">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={attachSignature}
                    onChange={(e) => setAttachSignature(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer accent-amber-600"
                  />
                  <span className="text-xs font-bold text-stone-800">
                    درج امضای الکترونیکی در گزارشات و سند
                  </span>
                </label>

                {(actionType === 'SEND_TO_CONSULTANT' || actionType === 'SEND_TO_EMPLOYER' || actionType === 'FINAL_APPROVE' || actionType === 'SUBMIT') ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
                    الزامی (بین‌سازمانی)
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
                    اختیاری (درون‌سازمانی)
                  </span>
                )}
              </div>

              {attachSignature && (
                <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl">
                  {hrSig ? (
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-10 bg-white border border-stone-200 rounded-lg p-1 flex items-center justify-center shrink-0 shadow-xs">
                          <img src={hrSig} alt="امضای دیجیتال" className="max-h-full max-w-full object-contain" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                            <CheckCircle2 size={13} /> امضای الکترونیکی آماده درج است
                          </div>
                          <div className="text-[10px] text-stone-500 mt-0.5">
                            ثبت‌شده در منابع انسانی ({currentUser?.fullName || currentUser?.username})
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2 text-red-600 text-xs">
                      <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">امضای الکترونیکی شما در سیستم منابع انسانی ثبت نشده است!</p>
                        <p className="text-[10px] text-stone-500 mt-0.5">
                          جهت درج امضا، لطفاً از بخش پرسنلی منابع انسانی تصویر امضای خود را بارگذاری و ثبت فرمایید.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              انصراف
            </button>
            <button
              type="submit"
              className={`px-5 py-2.5 rounded-xl text-xs font-black shadow-md transition-all flex items-center gap-2 cursor-pointer ${confirmBtnColor}`}
            >
              <Check size={16} />
              <span>{confirmBtnText}</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
