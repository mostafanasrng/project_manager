import React from 'react';
import { X, ScrollText, ArrowLeftCircle } from 'lucide-react';
import { DccDocument } from '../../types/dcc';
import { WorkflowEvent } from '../../types';
import { WorkflowService } from '../../services/workflowService';
import { SystemAdminService } from '../../services/systemAdminService';
import { formatUserDisplayFormal } from '../../src/utils/userFormatter';

interface DccWorkflowHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: DccDocument | null;
}

export const DccWorkflowHistoryModal: React.FC<DccWorkflowHistoryModalProps> = ({
  isOpen,
  onClose,
  document: doc
}) => {
  if (!isOpen || !doc) return null;

  const rawItem = doc.rawItem || doc;
  const history: WorkflowEvent[] = (rawItem.workflowHistory && rawItem.workflowHistory.length > 0)
    ? rawItem.workflowHistory
    : (doc.workflowHistory && doc.workflowHistory.length > 0)
      ? doc.workflowHistory
      : (rawItem.history && Array.isArray(rawItem.history))
        ? rawItem.history
        : [
            {
              id: 'initial_event',
              action: 'CREATE',
              actorUserId: 'author',
              actorName: doc.authorName || 'کارشناس صادرکننده',
              timestamp: Date.now(),
              comment: 'ثبت و بایگانی سند در سامانه'
            } as WorkflowEvent
          ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fadeIn" dir="rtl">
      <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl max-h-[80vh] flex flex-col text-stone-700">
        <div className="p-6 border-b border-[#ece5d8] flex justify-between items-center bg-[#faf8f4]">
          <h3 className="font-black text-stone-800 flex items-center gap-2 text-sm md:text-base">
            <ScrollText size={20} className="text-stone-600" />
            تاریخچه تغییرات: {doc.title}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-stone-200 rounded-full transition-colors text-stone-500"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-4 text-right" dir="rtl">
          {!history || history.length === 0 ? (
            <div className="text-center text-stone-400 py-8 text-sm font-bold">
              هیچ سابقه‌ای ثبت نشده است.
            </div>
          ) : (
            [...history]
              .sort((a, b) => b.timestamp - a.timestamp)
              .map((event, idx) => (
                <div key={event.id || idx} className="flex gap-4 relative">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-3 h-3 rounded-full z-10 ${
                        event.action === "APPROVE" || event.action === "FINAL_APPROVE"
                          ? "bg-emerald-500"
                          : event.action === "REJECT"
                            ? "bg-red-500"
                            : "bg-[#faf8f4]0"
                      }`}
                    />
                    {idx < history.length - 1 && (
                      <div className="w-0.5 flex-1 bg-stone-200 my-1" />
                    )}
                  </div>
                  <div className="flex-1 pb-6 text-right" dir="rtl">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-black text-stone-800 text-xs">
                        {WorkflowService.getActionLabel(event.action, undefined, event.actorUserId)}
                      </span>
                      <span className="text-[10px] text-stone-400 font-bold dir-ltr">
                        {event.timestamp ? new Date(event.timestamp).toLocaleString("fa-IR") : (event as any).date || '---'}
                      </span>
                    </div>
                    <div className="text-[10px] text-stone-500 mb-1">
                      توسط:{" "}
                      <span className="font-bold text-stone-700">
                        {(() => {
                          const actorUser = event.actorUserId
                            ? SystemAdminService.getUsers().find((u) => u.id === event.actorUserId)
                            : event.actorName
                              ? SystemAdminService.getUsers().find(
                                  (u) => u.fullName === event.actorName || u.username === event.actorName
                                )
                              : undefined;
                          const actorOrg = actorUser?.orgId
                            ? SystemAdminService.getOrganization(actorUser.orgId)
                            : undefined;
                          return actorUser
                            ? formatUserDisplayFormal(actorUser, actorOrg)
                            : (event.actorName || 'کارشناس مسئول');
                        })()}
                      </span>
                    </div>
                    {(() => {
                      const assigneeUser = event.assigneeUserId
                        ? SystemAdminService.getUsers().find((u) => u.id === event.assigneeUserId)
                        : undefined;
                      const assigneeOrg = assigneeUser?.orgId
                        ? SystemAdminService.getOrganization(assigneeUser.orgId)
                        : undefined;
                      const fullAssigneeName = assigneeUser
                        ? formatUserDisplayFormal(assigneeUser, assigneeOrg)
                        : event.assigneeName;

                      return fullAssigneeName ? (
                        <div className="text-[10px] text-stone-900 bg-[#faf8f4] px-2 py-1 rounded-lg w-fit mb-1">
                          گیرنده: {fullAssigneeName}
                        </div>
                      ) : null;
                    })()}
                    {event.comment && event.action !== "EDIT" && (
                      <div className="text-[10px] text-stone-600 bg-[#faf8f4] p-2.5 rounded-xl border border-[#ece5d8] italic">
                        <span className="block">"{event.comment}"</span>
                      </div>
                    )}
                    {event.comment && event.action === "EDIT" && (
                      <div className="text-[10px] text-stone-600 bg-[#faf8f4] p-2.5 rounded-xl border border-[#ece5d8] italic">
                        <div className="space-y-1 not-italic text-right" dir="rtl">
                          <span className="font-extrabold text-stone-900 block text-[9px] mb-1">اقلام تغییر یافته:</span>
                          {event.comment.split(" | ").map((changeStr: string, cIdx: number) => {
                            const parts = changeStr.split(": ");
                            if (parts.length === 2) {
                              return (
                                <div key={cIdx} className="bg-white p-2 rounded-lg border border-[#ece5d8] flex items-start gap-1 font-bold">
                                  <span className="text-stone-500 font-black shrink-0">{parts[0]}:</span>
                                  <span className="text-stone-700">{parts[1]}</span>
                                </div>
                              );
                            }
                            return (
                              <div key={cIdx} className="bg-white p-2 rounded-lg border border-[#ece5d8] text-stone-700 font-bold">
                                {changeStr}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {(event.fromStatus || event.toStatus) && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] px-2 py-0.5 rounded bg-stone-100 text-stone-500">
                          {WorkflowService.getStatusLabel(event.fromStatus)}
                        </span>
                        <ArrowLeftCircle
                          size={10}
                          className="text-stone-300"
                        />
                        <span className="text-[9px] px-2 py-0.5 rounded bg-stone-100 text-stone-500">
                          {WorkflowService.getStatusLabel(event.toStatus)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  );
};
