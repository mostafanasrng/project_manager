import React, { useState } from 'react';
import { X, Paperclip, Download, FileText, Calendar, User, HardDrive } from 'lucide-react';
import { DccDocument, DccAttachment } from '../../types/dcc';
import { downloadDccAttachment } from '../../utils/dccAttachmentUtils';

interface DccAttachmentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: DccDocument | null;
}

export const DccAttachmentsModal: React.FC<DccAttachmentsModalProps> = ({
  isOpen,
  onClose,
  document: doc
}) => {
  if (!isOpen || !doc) return null;

  const attachments: DccAttachment[] = doc.attachments || [];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fadeIn" dir="rtl">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl max-h-[80vh] flex flex-col text-stone-700 dark:text-slate-200 border border-stone-200 dark:border-slate-800">
        {/* Modal Header */}
        <div className="p-5 border-b border-stone-200 dark:border-slate-800 flex justify-between items-center bg-stone-50 dark:bg-slate-800/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl border border-blue-500/20">
              <Paperclip size={20} />
            </div>
            <div>
              <h3 className="font-black text-stone-900 dark:text-white text-sm md:text-base">
                فایل‌ها و مدارک پیوست
              </h3>
              <p className="text-[11px] text-stone-500 dark:text-slate-400 font-bold mt-0.5 line-clamp-1">
                {doc.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-stone-200 dark:hover:bg-slate-700 rounded-full transition-colors text-stone-500 dark:text-slate-400"
          >
            <X size={20} />
          </button>
        </div>

        {/* Document Quick Header */}
        <div className="px-5 py-2.5 bg-stone-100/70 dark:bg-slate-800/40 border-b border-stone-200/60 dark:border-slate-800/80 flex items-center justify-between text-xs font-bold shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-stone-500 dark:text-slate-400">کد مدرک:</span>
            <span className="font-mono text-stone-900 dark:text-white font-black">{doc.documentNumber}</span>
          </div>
          <span className="font-mono text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-900">
            {attachments.length} فایل پیوست
          </span>
        </div>

        {/* Attachments List */}
        <div className="p-5 overflow-y-auto flex-1 space-y-2.5 text-right" dir="rtl">
          {attachments.length === 0 ? (
            <div className="text-center text-stone-400 py-10 text-sm font-bold">
              هیچ فایل پیوستی برای این مدرک ثبت نشده است.
            </div>
          ) : (
            attachments.map((att, idx) => (
              <div
                key={att.id || idx}
                className="p-3.5 bg-stone-50 dark:bg-slate-800/60 hover:bg-amber-50/50 dark:hover:bg-slate-800 rounded-2xl border border-stone-200/80 dark:border-slate-700 transition-colors flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 bg-white dark:bg-slate-700 rounded-xl border border-stone-200 dark:border-slate-600 text-amber-600 dark:text-amber-400 shrink-0">
                    <FileText size={18} />
                  </div>
                  <div className="min-w-0">
                    <div className="font-black text-xs text-stone-900 dark:text-white truncate">
                      {att.name}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-stone-400 dark:text-slate-500 font-mono mt-0.5">
                      <span>{att.size || 'فایل ضمیمه'}</span>
                      <span>•</span>
                      <span>{att.uploadDate || doc.documentDate}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => downloadDccAttachment(att, doc)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-xl text-xs font-black shadow-xs transition-colors cursor-pointer shrink-0"
                  title="دانلود فایل"
                >
                  <Download size={13} />
                  <span>دانلود</span>
                </button>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-stone-200 dark:border-slate-800 flex justify-end bg-stone-50/50 dark:bg-slate-800/40 shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-stone-200 hover:bg-stone-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-stone-800 dark:text-slate-200 font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            بستن
          </button>
        </div>
      </div>
    </div>
  );
};
