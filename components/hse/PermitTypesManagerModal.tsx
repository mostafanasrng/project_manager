import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  RotateCcw,
  Shield,
  ListChecks,
  ArrowUp,
  ArrowDown,
  Save,
  AlertCircle,
  Flame,
  Check,
  Search
} from 'lucide-react';
import { CustomPermitType, PermitChecklistTemplateItem } from '../../types/hse';
import { HseService } from '../../services/hseService';

interface PermitTypesManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPermitType?: (permitTypeCode: string) => void;
}

export const PermitTypesManagerModal: React.FC<PermitTypesManagerModalProps> = ({
  isOpen,
  onClose,
  onSelectPermitType
}) => {
  const [permitTypes, setPermitTypes] = useState<CustomPermitType[]>([]);
  const [selectedTypeCode, setSelectedTypeCode] = useState<string>('HOT_WORK');
  const [checklistItems, setChecklistItems] = useState<PermitChecklistTemplateItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // New/Edit Item state
  const [newQuestionText, setNewQuestionText] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingQuestionText, setEditingQuestionText] = useState('');

  // Add/Edit Permit Type State
  const [isPermitTypeModalOpen, setIsPermitTypeModalOpen] = useState(false);
  const [editingPermitType, setEditingPermitType] = useState<CustomPermitType | null>(null);
  const [typeCode, setTypeCode] = useState('');
  const [typeLabel, setTypeLabel] = useState('');
  const [typeDescription, setTypeDescription] = useState('');
  const [requiresGasTest, setRequiresGasTest] = useState(false);
  const [requiresFireWatch, setRequiresFireWatch] = useState(false);
  const [requiresIsolation, setRequiresIsolation] = useState(false);

  // Success Feedback Toast
  const [showSaveNotification, setShowSaveNotification] = useState(false);

  // Load Permit Types
  const reloadPermitTypes = () => {
    const types = HseService.getPermitTypes();
    setPermitTypes(types);
    if (types.length > 0 && !types.some(t => t.code === selectedTypeCode)) {
      setSelectedTypeCode(types[0].code);
    }
  };

  useEffect(() => {
    if (isOpen) {
      reloadPermitTypes();
    }
  }, [isOpen]);

  // Load Checklist for Selected Permit Type
  useEffect(() => {
    if (selectedTypeCode) {
      const items = HseService.getPermitChecklists(selectedTypeCode);
      setChecklistItems(items);
      setEditingItemId(null);
    }
  }, [selectedTypeCode]);

  if (!isOpen) return null;

  const currentPermitType = permitTypes.find(t => t.code === selectedTypeCode) || permitTypes[0];

  const filteredPermitTypes = permitTypes.filter(t => 
    t.label.includes(searchQuery) || t.code.toLowerCase().includes(searchQuery.toLowerCase()) || (t.description && t.description.includes(searchQuery))
  );

  // Checklist Item Actions
  const handleAddChecklistItem = () => {
    if (!newQuestionText.trim()) return;
    const newItem: PermitChecklistTemplateItem = {
      id: `chk_tpl_${selectedTypeCode.toLowerCase()}_${Date.now()}`,
      question: newQuestionText.trim()
    };
    const updated = [...checklistItems, newItem];
    setChecklistItems(updated);
    setNewQuestionText('');
  };

  const handleStartEditItem = (item: PermitChecklistTemplateItem) => {
    setEditingItemId(item.id);
    setEditingQuestionText(item.question);
  };

  const handleSaveEditItem = () => {
    if (!editingItemId || !editingQuestionText.trim()) return;
    setChecklistItems(prev =>
      prev.map(i => (i.id === editingItemId ? { ...i, question: editingQuestionText.trim() } : i))
    );
    setEditingItemId(null);
    setEditingQuestionText('');
  };

  const handleDeleteItem = (id: string) => {
    setChecklistItems(prev => prev.filter(i => i.id !== id));
  };

  const handleMoveItem = (index: number, direction: 'UP' | 'DOWN') => {
    if ((direction === 'UP' && index === 0) || (direction === 'DOWN' && index === checklistItems.length - 1)) return;
    const updated = [...checklistItems];
    const targetIdx = direction === 'UP' ? index - 1 : index + 1;
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    setChecklistItems(updated);
  };

  const handleSaveAllChecklistChanges = () => {
    if (!selectedTypeCode) return;
    HseService.savePermitChecklist(selectedTypeCode, checklistItems);
    setShowSaveNotification(true);
    setTimeout(() => setShowSaveNotification(false), 3000);
  };

  const handleResetChecklistToDefault = () => {
    if (confirm(`آیا از بازنشانی چک‌لیست «${currentPermitType?.label}» به حالت پیش‌فرض سیستم اطمینان دارید؟`)) {
      HseService.resetPermitChecklist(selectedTypeCode);
      const items = HseService.getPermitChecklists(selectedTypeCode);
      setChecklistItems(items);
    }
  };

  // Permit Type Management
  const handleOpenNewPermitTypeModal = () => {
    setEditingPermitType(null);
    setTypeCode(`PERMIT_${Date.now().toString().slice(-4)}`);
    setTypeLabel('');
    setTypeDescription('');
    setRequiresGasTest(false);
    setRequiresFireWatch(false);
    setRequiresIsolation(false);
    setIsPermitTypeModalOpen(true);
  };

  const handleOpenEditPermitTypeModal = (type: CustomPermitType) => {
    setEditingPermitType(type);
    setTypeCode(type.code);
    setTypeLabel(type.label);
    setTypeDescription(type.description || '');
    setRequiresGasTest(type.requiresGasTest || false);
    setRequiresFireWatch(type.requiresFireWatch || false);
    setRequiresIsolation(type.requiresIsolation || false);
    setIsPermitTypeModalOpen(true);
  };

  const handleSavePermitTypeForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typeLabel.trim() || !typeCode.trim()) {
      alert('لطفاً عنوان و شناسه پرمیت را وارد نمایید.');
      return;
    }

    const newType: CustomPermitType = {
      code: typeCode.trim().toUpperCase().replace(/\s+/g, '_'),
      label: typeLabel.trim(),
      description: typeDescription.trim(),
      badgeColor: editingPermitType?.badgeColor || 'bg-amber-100 text-amber-800 border-amber-300',
      requiresGasTest,
      requiresFireWatch,
      requiresIsolation,
      isSystemDefault: editingPermitType?.isSystemDefault || false
    };

    HseService.savePermitType(newType);
    reloadPermitTypes();
    setSelectedTypeCode(newType.code);
    setIsPermitTypeModalOpen(false);
  };

  const handleDeletePermitType = (code: string, label: string) => {
    if (confirm(`آیا از حذف نوع پرمیت «${label}» اطمینان دارید؟`)) {
      HseService.deletePermitType(code);
      reloadPermitTypes();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 md:p-6 overflow-y-auto dir-rtl">
      <div className="bg-white dark:bg-slate-900 w-full max-w-6xl rounded-3xl shadow-2xl border border-stone-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-l from-amber-600 via-amber-700 to-amber-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20">
              <ListChecks size={22} className="text-amber-200" />
            </div>
            <div>
              <h2 className="text-base font-black">
                مدیریت انواع پرمیت ایمنی و چک‌لیست‌های تخصصی اقدامات ایمنی و کنترل ریسک
              </h2>
              <p className="text-xs text-amber-100/90 font-medium">
                تعریف انواع پرمیت ایمنی و تنظیم دقیق بندهای کنترلی جهت تغذیه فرم صدور پرمیت جدید
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all text-white cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Area - Grid Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 flex-1 overflow-hidden min-h-0">
          
          {/* Left Panel: Permit Types List */}
          <div className="lg:col-span-4 bg-stone-50/70 dark:bg-slate-800/40 border-b lg:border-b-0 lg:border-l border-stone-200 dark:border-slate-800 p-4 flex flex-col overflow-hidden">
            
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black text-stone-800 dark:text-slate-200 flex items-center gap-1.5">
                <Shield size={16} className="text-amber-600" />
                انواع پرمیت‌های ایمنی ({permitTypes.length})
              </span>
              <button
                onClick={handleOpenNewPermitTypeModal}
                className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-sm"
              >
                <Plus size={14} />
                افزودن نوع پرمیت
              </button>
            </div>

            {/* Search Permit Types */}
            <div className="relative mb-3">
              <Search size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                placeholder="جستجو در نوع پرمیت..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pr-8 pl-2 py-1.5 bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-700 rounded-xl text-xs font-bold text-stone-900 dark:text-white outline-none focus:border-amber-500"
              />
            </div>

            {/* Permit Types Navigation List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {filteredPermitTypes.map(type => {
                const isSelected = type.code === selectedTypeCode;
                return (
                  <div
                    key={type.code}
                    onClick={() => setSelectedTypeCode(type.code)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col gap-1.5 relative ${
                      isSelected
                        ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-500 shadow-sm'
                        : 'bg-white dark:bg-slate-900 border-stone-200 dark:border-slate-800 hover:border-amber-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${isSelected ? 'bg-amber-600' : 'bg-stone-300 dark:bg-slate-600'}`} />
                        <span className={`text-xs font-black ${isSelected ? 'text-amber-900 dark:text-amber-300' : 'text-stone-800 dark:text-slate-200'}`}>
                          {type.label}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-stone-100 dark:bg-slate-800 text-stone-500 rounded border border-stone-200 dark:border-slate-700">
                        {type.code}
                      </span>
                    </div>

                    {type.description && (
                      <p className="text-[11px] text-stone-500 dark:text-slate-400 line-clamp-2 pr-5">
                        {type.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-1 border-t border-stone-100 dark:border-slate-800/60 mt-1">
                      <div className="flex items-center gap-1 text-[10px] text-stone-400 font-medium">
                        {type.requiresGasTest && <span className="bg-purple-50 text-purple-700 px-1 rounded">گازسنجی</span>}
                        {type.requiresFireWatch && <span className="bg-rose-50 text-rose-700 px-1 rounded">دیده‌بان</span>}
                        {type.requiresIsolation && <span className="bg-amber-50 text-amber-800 px-1 rounded">LOTO</span>}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditPermitTypeModal(type);
                          }}
                          className="p-1 hover:bg-stone-200 dark:hover:bg-slate-700 text-stone-500 rounded transition-all cursor-pointer"
                          title="ویرایش مشخصات نوع پرمیت"
                        >
                          <Edit3 size={13} />
                        </button>
                        {!type.isSystemDefault && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeletePermitType(type.code, type.label);
                            }}
                            className="p-1 hover:bg-rose-100 dark:hover:bg-rose-950 text-rose-600 rounded transition-all cursor-pointer"
                            title="حذف نوع پرمیت"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Panel: Specialized Checklist Items Manager */}
          <div className="lg:col-span-8 p-5 flex flex-col overflow-hidden bg-white dark:bg-slate-900">
            
            {/* Active Permit Info Header */}
            <div className="bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 p-4 rounded-2xl mb-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <Flame size={18} className="text-amber-600" />
                  <span className="text-sm font-black text-amber-950 dark:text-amber-200">
                    چک‌لیست تخصصی اقدامات ایمنی و کنترل ریسک ({currentPermitType?.label || selectedTypeCode})
                  </span>
                </div>
                <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-1 font-medium">
                  {currentPermitType?.description || 'بندهای کنترلی این چک‌لیست هنگام صدور پرمیت به صورت خودکار بارگذاری و پر می‌شوند.'}
                </p>
              </div>

              {onSelectPermitType && (
                <button
                  onClick={() => {
                    onSelectPermitType(selectedTypeCode);
                    onClose();
                  }}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm transition-all cursor-pointer shrink-0"
                >
                  <CheckCircle2 size={15} />
                  استفاده در فرم صدور
                </button>
              )}
            </div>

            {/* Save Notification Toast */}
            {showSaveNotification && (
              <div className="mb-3 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-2 animate-fade-in">
                <Check size={16} className="text-emerald-600" />
                تغییرات چک‌لیست تخصصی با موفقیت ذخیره گردید و در فرم صدور پرمیت اعمال شد.
              </div>
            )}

            {/* Add New Checklist Question Input */}
            <div className="bg-stone-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-stone-200 dark:border-slate-800 mb-4 shrink-0">
              <label className="block text-xs font-black text-stone-700 dark:text-slate-300 mb-1.5">
                افزودن بند یا تمهید ایمنی جدید به چک‌لیست تخصصی:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="مثال: بررسی صحت عملکرد کالیبراسیون دستگاه و وجود تهویه موضعی مناسب..."
                  value={newQuestionText}
                  onChange={e => setNewQuestionText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddChecklistItem(); }}
                  className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-700 rounded-xl text-xs font-bold text-stone-900 dark:text-white outline-none focus:border-amber-500"
                />
                <button
                  onClick={handleAddChecklistItem}
                  disabled={!newQuestionText.trim()}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm transition-all cursor-pointer shrink-0"
                >
                  <Plus size={16} />
                  افزودن بند
                </button>
              </div>
            </div>

            {/* Checklist Items List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 mb-4">
              {checklistItems.length === 0 ? (
                <div className="p-8 text-center bg-stone-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-stone-300 dark:border-slate-700">
                  <AlertCircle size={32} className="mx-auto text-stone-400 mb-2" />
                  <p className="text-xs font-bold text-stone-600 dark:text-slate-400">
                    هیچ بند کنترلی برای این پرمیت تعریف نشده است.
                  </p>
                  <p className="text-[11px] text-stone-400 mt-1">
                    شما می‌توانید از طریق کادر بالا بندهای ایمنی مدنظر خود را اضافه فرمایید.
                  </p>
                </div>
              ) : (
                checklistItems.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-3 bg-stone-50/80 dark:bg-slate-800/60 rounded-xl border border-stone-200/80 dark:border-slate-700/80 flex items-start justify-between gap-3 group hover:border-amber-300 transition-all"
                  >
                    <div className="flex items-start gap-2.5 flex-1 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>

                      {editingItemId === item.id ? (
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="text"
                            value={editingQuestionText}
                            onChange={e => setEditingQuestionText(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleSaveEditItem(); }}
                            className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-900 border border-amber-400 rounded-lg text-xs font-bold text-stone-900 dark:text-white outline-none"
                            autoFocus
                          />
                          <button
                            onClick={handleSaveEditItem}
                            className="px-2.5 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold cursor-pointer"
                          >
                            ثبت
                          </button>
                          <button
                            onClick={() => setEditingItemId(null)}
                            className="px-2.5 py-1.5 bg-stone-300 text-stone-800 rounded-lg text-xs font-bold cursor-pointer"
                          >
                            انصراف
                          </button>
                        </div>
                      ) : (
                        <p className="text-xs font-bold text-stone-800 dark:text-slate-200 leading-relaxed">
                          {item.question}
                        </p>
                      )}
                    </div>

                    {editingItemId !== item.id && (
                      <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 shrink-0">
                        <button
                          onClick={() => handleMoveItem(idx, 'UP')}
                          disabled={idx === 0}
                          className="p-1 hover:bg-stone-200 dark:hover:bg-slate-700 disabled:opacity-30 text-stone-500 rounded transition-all cursor-pointer"
                          title="انتقال به بالا"
                        >
                          <ArrowUp size={13} />
                        </button>
                        <button
                          onClick={() => handleMoveItem(idx, 'DOWN')}
                          disabled={idx === checklistItems.length - 1}
                          className="p-1 hover:bg-stone-200 dark:hover:bg-slate-700 disabled:opacity-30 text-stone-500 rounded transition-all cursor-pointer"
                          title="انتقال به پایین"
                        >
                          <ArrowDown size={13} />
                        </button>
                        <button
                          onClick={() => handleStartEditItem(item)}
                          className="p-1 hover:bg-amber-100 dark:hover:bg-amber-950 text-amber-700 rounded transition-all cursor-pointer"
                          title="ویرایش متنی بند"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1 hover:bg-rose-100 dark:hover:bg-rose-950 text-rose-600 rounded transition-all cursor-pointer"
                          title="حذف بند از چک‌لیست"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Bottom Footer Actions */}
            <div className="pt-3 border-t border-stone-200 dark:border-slate-800 flex items-center justify-between shrink-0">
              <button
                onClick={handleResetChecklistToDefault}
                className="px-3.5 py-2 text-stone-600 dark:text-slate-400 hover:bg-stone-100 dark:hover:bg-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <RotateCcw size={15} />
                بازنشانی به چک‌لیست پیش‌فرض
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-stone-300 dark:border-slate-700 text-stone-700 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-stone-100 transition-all cursor-pointer"
                >
                  بستن
                </button>
                <button
                  onClick={handleSaveAllChecklistChanges}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                >
                  <Save size={16} />
                  ذخیره تغییرات چک‌لیست
                </button>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* Sub-Modal for Adding/Editing Permit Type */}
      {isPermitTypeModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-5 border border-stone-200 dark:border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between mb-4 border-b border-stone-200 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-black text-stone-900 dark:text-white flex items-center gap-2">
                <Shield size={18} className="text-amber-600" />
                {editingPermitType ? 'ویرایش مشخصات پرمیت ایمنی' : 'تعریف نوع پرمیت ایمنی جدید'}
              </h3>
              <button
                onClick={() => setIsPermitTypeModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSavePermitTypeForm} className="space-y-3.5">
              <div>
                <label className="block text-xs font-black text-stone-700 dark:text-slate-300 mb-1">
                  عنوان نوع پرمیت (فارسی):
                </label>
                <input
                  type="text"
                  placeholder="مثال: کار با مواد رادیواکتیو و پرتوها"
                  value={typeLabel}
                  onChange={e => setTypeLabel(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl text-xs font-bold text-stone-900 dark:text-white outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-black text-stone-700 dark:text-slate-300 mb-1">
                  شناسه لاتین / کد اختصاری (Code):
                </label>
                <input
                  type="text"
                  placeholder="مثال: RADIATION_WORK"
                  value={typeCode}
                  onChange={e => setTypeCode(e.target.value)}
                  disabled={Boolean(editingPermitType?.isSystemDefault)}
                  className="w-full px-3 py-2 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-stone-900 dark:text-white outline-none focus:border-amber-500 disabled:opacity-60"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-black text-stone-700 dark:text-slate-300 mb-1">
                  توضیحات و حوزه کاربرد:
                </label>
                <textarea
                  placeholder="شرح مختصر شرایط و دامنه کاربرد پرمیت..."
                  value={typeDescription}
                  onChange={e => setTypeDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl text-xs font-bold text-stone-900 dark:text-white outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div className="space-y-2 pt-2 border-t border-stone-100 dark:border-slate-800">
                <span className="text-[11px] font-black text-stone-700 dark:text-slate-300 block">
                  الزامات پیش‌فرض هنگام صدور پرمیت:
                </span>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-stone-800 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={requiresGasTest}
                    onChange={e => setRequiresGasTest(e.target.checked)}
                    className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
                  />
                  نیازمند انجام سنجش و تست گازها (Gas Test)
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-stone-800 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={requiresFireWatch}
                    onChange={e => setRequiresFireWatch(e.target.checked)}
                    className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
                  />
                  نیازمند استقرار دیده‌بان حریق / دیده‌بان ایمنی (Fire Watch)
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-stone-800 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={requiresIsolation}
                    onChange={e => setRequiresIsolation(e.target.checked)}
                    className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
                  />
                  نیازمند قفل‌گذاری و ایزولاسیون منابع انرژی (LOTO)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPermitTypeModalOpen(false)}
                  className="px-4 py-2 border border-stone-300 text-stone-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black shadow-md cursor-pointer"
                >
                  ذخیره پرمیت
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
