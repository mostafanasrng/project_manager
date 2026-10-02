import React from 'react';
import { ShieldAlert, X, CheckCircle, AlertTriangle } from 'lucide-react';
import { WorkflowAction, SystemUser, WorkflowEvent } from '../../types';
import { WorkflowService } from '../../services/workflowService';
import { SystemAdminService } from '../../services/systemAdminService';
import { HRService } from '../../services/hrService';
import { formatUserDisplayFormal } from '../../src/utils/userFormatter';

interface HseWorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  actionType: WorkflowAction | null;
  item: any;
  assignee: string;
  onAssigneeChange: (val: string) => void;
  comment: string;
  onCommentChange: (val: string) => void;
  currentUser: SystemUser | null;
  attachWorkflowSignature: boolean;
  setAttachWorkflowSignature: (val: boolean) => void;
}

export const HseWorkflowModal: React.FC<HseWorkflowModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  actionType,
  item,
  assignee,
  onAssigneeChange,
  comment,
  onCommentChange,
  currentUser,
  attachWorkflowSignature,
  setAttachWorkflowSignature
}) => {
  if (!isOpen || !actionType) return null;

  const users = SystemAdminService.getUsers();
  const orgs = SystemAdminService.getOrganizations();

  const isRequiresAssignee = [
    'SUBMIT',
    'RESUBMIT',
    'REASSIGN',
    'SEND_TO_CONSULTANT',
    'SEND_TO_EMPLOYER',
    'SEND_TO_CONTRACTOR',
    'RETURN_TO_CONTRACTOR',
    'RETURN_TO_CONSULTANT'
  ].includes(actionType as string);

  const getTargetUsers = () => {
    const allOrgs = SystemAdminService.getOrganizations();
    const employerOrgId = allOrgs.find(o => o.type === 'EMPLOYER')?.id || 'org-1';
    const consultantOrgId = allOrgs.find(o => o.type === 'CONSULTANT')?.id || 'org-2';
    const contractorOrgId = allOrgs.find(o => o.type === 'CONTRACTOR')?.id || 'org-3';

    let targetOrgId = currentUser?.orgId;
    if (actionType === 'SEND_TO_CONSULTANT' || actionType === 'RETURN_TO_CONSULTANT') {
      targetOrgId = consultantOrgId;
    } else if (actionType === 'SEND_TO_EMPLOYER') {
      targetOrgId = employerOrgId;
    } else if (actionType === 'RETURN_TO_CONTRACTOR' || actionType === 'SEND_TO_CONTRACTOR') {
      targetOrgId = contractorOrgId;
    } else if (actionType === 'REJECT') {
      targetOrgId = currentUser?.orgId;
    }

    let filtered = users.filter(u => u.isActive !== false && u.id !== currentUser?.id && u.username !== currentUser?.username);
    filtered = filtered.filter(u => u.orgId === targetOrgId);

    if (currentUser && currentUser.role !== 'SYSTEM_ADMIN') {
      const ut = (currentUser.jobTitle || "").trim();
      const ul = (currentUser.jobLevel || "").trim();
      const isCurrentUserPM = currentUser.role === 'ORG_ADMIN' || ut.includes('مدیر پروژه') || ul.includes('مدیر پروژه');
      const isCurrentUserWorkshopManager = ut.includes('سرپرست کارگاه') || ul.includes('سرپرست کارگاه');

      filtered = filtered.filter(u => {
        const isSameOrg = u.orgId === currentUser.orgId;
        const isTargetPM = u.role === 'ORG_ADMIN' || (u.jobTitle || '').includes('مدیر پروژه') || (u.jobLevel || '').includes('مدیر پروژه');
        const isTargetWorkshopManager = (u.jobTitle || '').includes('سرپرست کارگاه') || (u.jobLevel || '').includes('سرپرست کارگاه');

        if (isSameOrg) {
          if (isCurrentUserPM || isCurrentUserWorkshopManager) return true;
          return !isTargetPM;
        } else {
          if (isCurrentUserPM || isCurrentUserWorkshopManager) {
            return isTargetPM || isTargetWorkshopManager;
          }
          return false;
        }
      });
    }

    return filtered;
  };

  const hrSig = HRService.getUserSignature(currentUser) || currentUser?.signature || HRService.generateDefaultSignature(currentUser);
  const isNoSignatureAction = actionType === 'REJECT' || actionType === 'REASSIGN' || actionType === 'RETURN_TO_CONTRACTOR' || actionType === 'RETURN_TO_CONSULTANT';

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-fadeIn" dir="rtl">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-stone-200 dark:border-slate-800">
        <div className="p-5 border-b border-stone-200 dark:border-slate-800 flex justify-between items-center bg-stone-50/70 dark:bg-slate-800/50">
          <h3 className="font-black text-stone-800 dark:text-white flex items-center gap-2 text-sm md:text-base">
            <ShieldAlert size={20} className="text-amber-600" />
            تایید اقدام گردش کار: {WorkflowService.getActionLabel(actionType)}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-stone-200 dark:hover:bg-slate-700 rounded-full transition-colors text-stone-500">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Target recipient selector */}
          {(isRequiresAssignee || actionType === 'APPROVE') && (
            <div className="space-y-1.5">
              <label className="text-xs font-black text-stone-700 dark:text-slate-300 block">
                {actionType === 'SEND_TO_CONSULTANT'
                  ? 'انتخاب گیرنده در مهندس مشاور:'
                  : actionType === 'SEND_TO_EMPLOYER'
                  ? 'انتخاب گیرنده در کارفرما:'
                  : actionType === 'RETURN_TO_CONTRACTOR'
                  ? 'انتخاب گیرنده در پیمانکار:'
                  : actionType === 'RETURN_TO_CONSULTANT'
                  ? 'انتخاب گیرنده در مهندس مشاور:'
                  : 'انتخاب کاربر گیرنده (ارجاع به):'}
              </label>
              <select
                value={assignee}
                onChange={(e) => onAssigneeChange(e.target.value)}
                className="w-full bg-stone-50 dark:bg-slate-800 border border-stone-300 dark:border-slate-700 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-stone-800 dark:text-slate-200 outline-none focus:border-amber-500"
              >
                <option value="">انتخاب کاربر مسئول...</option>
                {getTargetUsers().map(u => (
                  <option key={u.id} value={u.id}>
                    {formatUserDisplayFormal(u, orgs.find(o => o.id === u.orgId) || SystemAdminService.getOrganization(u.orgId))}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Comment text area */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-stone-700 dark:text-slate-300 block">
              توضیحات و هامش (دستور کار / ملاحظات ایمنی):
            </label>
            <textarea
              value={comment}
              onChange={(e) => onCommentChange(e.target.value)}
              rows={3}
              placeholder="توضیحات و ملاحظات نظارتی خود را اینجا ثبت فرمایید..."
              className="w-full bg-stone-50 dark:bg-slate-800 border border-stone-300 dark:border-slate-700 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-stone-800 dark:text-slate-200 outline-none focus:border-amber-500 resize-none"
            />
          </div>

          {/* Digital Signature Toggle */}
          {!isNoSignatureAction && (
            <div className="space-y-2 border-t border-stone-200 dark:border-slate-800 pt-3">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={attachWorkflowSignature}
                    onChange={(e) => setAttachWorkflowSignature(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer accent-amber-600"
                  />
                  <span className="text-xs font-bold text-stone-800 dark:text-slate-200">
                    درج امضای الکترونیکی دیجیتال در سوابق و فرم چاپی
                  </span>
                </label>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                  تایید رسمی
                </span>
              </div>

              {attachWorkflowSignature && (
                <div className="p-3 bg-stone-50 dark:bg-slate-800/80 border border-stone-200 dark:border-slate-700 rounded-xl">
                  {hrSig ? (
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-10 bg-white border border-stone-200 rounded-lg p-1 flex items-center justify-center shrink-0 shadow-xs">
                        <img src={hrSig} alt="امضا" className="max-h-full max-w-full object-contain" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle size={13} /> امضای دیجیتال کاربر فعال و آماده الصاق است
                        </div>
                        <div className="text-[10px] text-stone-500 dark:text-slate-400 mt-0.5">
                          تایید هویت: {currentUser?.fullName || currentUser?.username} ({currentUser?.jobTitle || 'عضو تیم پروژه'})
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2 text-rose-600 text-xs">
                      <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">امضای الکترونیکی شما در سیستم ثبت نشده است!</p>
                        <p className="text-[10px] text-stone-500 dark:text-slate-400 mt-0.5">
                          امضای پیش‌فرض سیستم برای شما تولید و الصاق خواهد شد.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-stone-100 dark:bg-slate-800 hover:bg-stone-200 dark:hover:bg-slate-700 text-stone-600 dark:text-slate-300 font-bold text-xs transition-colors"
            >
              انصراف
            </button>
            <button
              onClick={onConfirm}
              disabled={isRequiresAssignee && !assignee}
              className={`flex-1 py-2.5 rounded-xl font-black text-xs shadow-md transition-all text-white ${
                isRequiresAssignee && !assignee
                  ? 'bg-stone-300 dark:bg-slate-700 text-stone-500 cursor-not-allowed shadow-none'
                  : 'bg-amber-600 hover:bg-amber-700 active:scale-95 cursor-pointer'
              }`}
            >
              تایید و ثبت اقدام
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
