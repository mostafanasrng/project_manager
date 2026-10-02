import React from 'react';
import { ScrollText, X, ArrowLeftCircle } from 'lucide-react';
import { WorkflowEvent } from '../../types';
import { WorkflowService } from '../../services/workflowService';
import { SystemAdminService } from '../../services/systemAdminService';
import { formatUserDisplayFormal } from '../../src/utils/userFormatter';

interface HseHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: WorkflowEvent[];
  title: string;
}

export const HseHistoryModal: React.FC<HseHistoryModalProps> = ({
  isOpen,
  onClose,
  history,
  title
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[200] flex items-center justify-center p-4 animate-fadeIn" dir="rtl">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl max-h-[85vh] flex flex-col text-stone-700 dark:text-slate-300 border border-stone-200 dark:border-slate-800">
        <div className="p-5 border-b border-stone-200 dark:border-slate-800 flex justify-between items-center bg-stone-50/70 dark:bg-slate-800/60">
          <h3 className="font-black text-stone-800 dark:text-white flex items-center gap-2 text-sm md:text-base">
            <ScrollText size={20} className="text-amber-600" />
            تاریخچه گردش کار و امضاهای سند: {title}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-stone-200 dark:hover:bg-slate-700 rounded-full transition-colors text-stone-500">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-4 text-right" dir="rtl">
          {!history || history.length === 0 ? (
            <div className="text-center text-stone-400 py-10 text-xs font-bold">
              هیچ رویدادی در تاریخچه گردش کار این آیتم ثبت نشده است.
            </div>
          ) : (
            [...history]
              .sort((a, b) => b.timestamp - a.timestamp)
              .map((event, idx) => {
                const actorUser = event.actorUserId
                  ? SystemAdminService.getUsers().find(u => u.id === event.actorUserId)
                  : (event.actorName
                      ? SystemAdminService.getUsers().find(u => u.fullName === event.actorName || u.username === event.actorName)
                      : undefined);
                const actorOrg = actorUser?.orgId ? SystemAdminService.getOrganization(actorUser.orgId) : undefined;
                const fullActorName = actorUser
                  ? formatUserDisplayFormal(actorUser, actorOrg)
                  : event.actorName;

                const assigneeUser = event.assigneeUserId
                  ? SystemAdminService.getUsers().find(u => u.id === event.assigneeUserId)
                  : (event.assigneeName
                      ? SystemAdminService.getUsers().find(u => u.fullName === event.assigneeName || u.username === event.assigneeName)
                      : undefined);
                const assigneeOrg = assigneeUser?.orgId ? SystemAdminService.getOrganization(assigneeUser.orgId) : undefined;
                const fullAssigneeName = assigneeUser
                  ? formatUserDisplayFormal(assigneeUser, assigneeOrg)
                  : event.assigneeName;

                const isApproval = event.action === 'APPROVE' || event.action === 'FINAL_APPROVE';
                const isReject = event.action === 'REJECT';

                return (
                  <div key={event.id || idx} className="flex gap-4 relative">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-3.5 h-3.5 rounded-full z-10 border-2 border-white dark:border-slate-900 ${
                          isApproval
                            ? 'bg-emerald-500 ring-4 ring-emerald-100 dark:ring-emerald-950'
                            : isReject
                            ? 'bg-rose-500 ring-4 ring-rose-100 dark:ring-rose-950'
                            : 'bg-amber-500 ring-4 ring-amber-100 dark:ring-amber-950'
                        }`}
                      />
                      {idx < history.length - 1 && (
                        <div className="w-0.5 flex-1 bg-stone-200 dark:bg-slate-700 my-1" />
                      )}
                    </div>
                    <div className="flex-1 pb-5 text-right">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-black text-stone-900 dark:text-white text-xs">
                          {WorkflowService.getActionLabel(event.action, undefined, event.actorUserId)}
                        </span>
                        <span className="text-[10px] text-stone-400 dark:text-slate-500 font-bold dir-ltr">
                          {new Date(event.timestamp).toLocaleString('fa-IR')}
                        </span>
                      </div>
                      <div className="text-[11px] text-stone-600 dark:text-slate-400 mb-1">
                        اقدام‌کننده: <span className="font-bold text-stone-800 dark:text-slate-200">{fullActorName}</span>
                      </div>
                      {fullAssigneeName && (
                        <div className="text-[10px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md w-fit mb-1 font-bold border border-amber-200/60 dark:border-amber-900/60">
                          گیرنده: {fullAssigneeName}
                        </div>
                      )}
                      {event.comment && (
                        <div className="text-[11px] text-stone-700 dark:text-slate-300 bg-stone-50 dark:bg-slate-800 p-2.5 rounded-xl border border-stone-200 dark:border-slate-700 mt-1.5 leading-relaxed">
                          "{event.comment}"
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 mt-2">
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-stone-100 dark:bg-slate-800 text-stone-600 dark:text-slate-400">
                          {WorkflowService.getStatusLabel(event.fromStatus)}
                        </span>
                        <ArrowLeftCircle size={10} className="text-stone-300 dark:text-slate-600" />
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-stone-100 dark:bg-slate-800 text-stone-600 dark:text-slate-400">
                          {WorkflowService.getStatusLabel(event.toStatus)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
          )}
        </div>

        <div className="p-4 border-t border-stone-200 dark:border-slate-800 bg-stone-50/50 dark:bg-slate-800/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-stone-200 dark:bg-slate-700 text-stone-700 dark:text-slate-200 rounded-xl text-xs font-black hover:bg-stone-300 transition-colors"
          >
            بستن
          </button>
        </div>
      </div>
    </div>
  );
};
