
import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
}

const DeleteModal: React.FC<DeleteModalProps> = ({ isOpen, onClose, onConfirm, title, description }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-md animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm text-center">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full mx-auto flex items-center justify-center mb-4">
          <AlertTriangle size={32}/>
        </div>
        <h3 className="text-lg font-black text-stone-800">{title}</h3>
        <p className="text-sm text-stone-500 mt-2">{description}</p>
        <div className="flex gap-4 mt-6">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-slate-100 text-stone-700 font-bold hover:bg-slate-200 transition-colors">انصراف</button>
          <button onClick={onConfirm} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-colors">تایید و حذف</button>
        </div>
      </div>
    </div>
  );
};

export default DeleteModal;
