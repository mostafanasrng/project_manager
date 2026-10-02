import React from 'react';
import { 
  Hash, List, PlusCircle, MinusCircle, Link as LinkIcon 
} from 'lucide-react';
import { ProjectMinute, MetreRow, PriceListItem } from '../../../types';
import { SystemUser, OrganizationType } from '../../../systemAdminTypes';
import { WorkflowService } from '../../../services/workflowService';
import { SystemAdminService } from '../../../services/systemAdminService';

interface MetreEntryFormProps {
  metreMinuteId: string;
  setMetreMinuteId: (id: string) => void;
  metreRowsForm: (Partial<MetreRow> & { isSearching?: boolean, searchResults?: PriceListItem[] })[];
  setMetreRowsForm: React.Dispatch<React.SetStateAction<(Partial<MetreRow> & { isSearching?: boolean, searchResults?: PriceListItem[] })[]>>;
  minutes: ProjectMinute[];
  selectedProjectId: string;
  currentUser: SystemUser | null;
  handleMetreCodeSearch: (rowId: string, q: string, priceListId?: string) => void;
  selectMetreItem: (rowId: string, item: PriceListItem) => void;
  addMetreRow: () => void;
  updateMetreRowField: (id: string, field: keyof MetreRow, value: any) => void;
  currentProject?: any;
}

const MetreEntryForm: React.FC<MetreEntryFormProps> = ({
  metreMinuteId,
  setMetreMinuteId,
  metreRowsForm,
  setMetreRowsForm,
  minutes,
  selectedProjectId,
  currentUser,
  handleMetreCodeSearch,
  selectMetreItem,
  addMetreRow,
  updateMetreRowField,
  currentProject,
}) => {
  return (
    <div className="space-y-10 animate-fadeIn text-right">
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-8 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-2 h-full bg-emerald-500 opacity-20 group-hover:opacity-100 transition-opacity"></div>
        <div className="p-5 bg-emerald-50 text-emerald-600 rounded-[1.8rem] shadow-inner">
          <LinkIcon size={32} />
        </div>
        <div className="flex-1 space-y-2 text-right">
          <label className="text-[10px] font-black text-slate-400 mr-2 uppercase tracking-widest">تخصیص هوشمند به صورت‌جلسه مرجع</label>
          <select
            required
            value={metreMinuteId}
            onChange={e => setMetreMinuteId(e.target.value)}
            className="w-full py-4 px-6 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-black text-slate-800 outline-none focus:bg-white focus:border-emerald-500 transition-all cursor-pointer"
          >
            <option value="">بدون تخصیص (آزاد - بعداً تخصیص یابد)</option>
            {minutes.filter(m => m.projectId === selectedProjectId && (currentUser ? WorkflowService.canEdit(m, currentUser) : false) || (metreMinuteId === m.id)).map(m => (
              <option key={m.id} value={m.id}>صورت‌جلسه شماره {m.number} - {m.date} ({m.description.substring(0, 40)}...)</option>
            ))}
          </select>
        </div>
        <div className="hidden xl:block max-w-[200px] text-[10px] text-slate-400 font-bold leading-relaxed border-r border-slate-100 pr-6 text-right">
          ردیف‌های ثبت شده در این بخش، مستقیماً حجم کارکرد ص.ج مربوطه را تشکیل می‌دهند.
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between px-6">
          <h4 className="text-sm font-black text-slate-800 uppercase flex items-center gap-3"><List size={22} className="text-blue-600" /> لیست آیتم‌های ریزمتره</h4>
          <button
            type="button"
            onClick={addMetreRow}
            className="flex items-center gap-3 bg-slate-900 text-white px-8 py-3 rounded-2xl text-xs font-black hover:bg-black transition-all shadow-xl active:scale-95 group/add"
          >
            <PlusCircle size={20} className="group-hover/add:rotate-90 transition-transform duration-500" /> افزودن ردیف جدید
          </button>
        </div>

        <div className="space-y-6">
          {metreRowsForm.map((row, idx) => (
            <div key={row.id} className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-xl relative group/row animate-slideLeft transition-all hover:border-blue-300" style={{ animationDelay: `${idx * 0.05}s` }}>
              <button
                type="button"
                onClick={() => {
                  if (metreRowsForm.length > 1) setMetreRowsForm(metreRowsForm.filter(r => r.id !== row.id));
                }}
                className="absolute top-6 left-6 p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all opacity-0 group-hover/row:opacity-100 z-10"
              >
                <MinusCircle size={24} />
              </button>

              <div className="flex flex-wrap justify-start mb-6 gap-6 items-center border-b border-slate-50 pb-6 pl-16">
                {currentProject?.contractType === "CBS" || currentProject?.contractType === "LUMP_SUM" || currentProject?.contractType === "COST_PLUS" ? (
                  <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 px-4 py-2 rounded-2xl">
                    <span className="text-[10px] font-black text-indigo-700">
                      {currentProject?.contractType === "CBS" ? "📊 قرارداد ساختار شکست (CBS): بدون ضریب و فاقد فهارس‌بهای پایه" :
                       currentProject?.contractType === "LUMP_SUM" ? "📊 قرارداد سرجمع (Lump Sum): بدون ضریب و فاقد فهارس‌بهای پایه" :
                       "📊 قرارداد مدیریت پیمان (Cost-Plus): بدون ضریب و فاقد فهارس‌بهای پایه"}
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="flex gap-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200">
                      {[
                        { id: 'NORMAL', label: 'فهرست‌بها' },
                        { id: 'STARRED', label: 'ستاره‌دار' },
                        { id: 'INVOICE', label: 'فاکتوری' }
                      ].map(type => (
                        <button
                          key={type.id}
                          type="button"
                          onClick={() => updateMetreRowField(row.id!, 'itemType', type.id)}
                          className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${
                            (row.itemType || 'NORMAL') === type.id 
                              ? 'bg-blue-600 text-white shadow-md' 
                              : 'text-slate-400 hover:text-slate-600'
                          }`}
                        >
                          {type.label}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200">
                      <span className="text-[10px] font-black text-slate-400 mr-1">فهرست بها مرجع:</span>
                      <select
                        value={row.priceListId || 'all'}
                        onChange={e => {
                          updateMetreRowField(row.id!, 'priceListId', e.target.value);
                          if (row.itemCode) {
                            handleMetreCodeSearch(row.id!, row.itemCode, e.target.value);
                          }
                        }}
                        className="p-1 px-2 bg-white border border-slate-100 rounded-xl text-[10px] font-black outline-none text-right cursor-pointer"
                      >
                        <option value="all">🔍 تمامی فهارس بها</option>
                        {currentProject?.priceLists?.map((pl: any) => (
                          <option key={pl.id} value={pl.id}>
                            {pl.title} ({pl.year})
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    {row.itemType !== 'NORMAL' && (
                      <div className="flex items-center gap-4 animate-fadeIn">
                        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-2">
                           <span className="text-[10px] font-black text-amber-700">ضریب اختصاصی:</span>
                           <input
                             type="number"
                             step="0.01"
                             value={row.independentCoefficient || ''}
                             onChange={e => updateMetreRowField(row.id!, 'independentCoefficient', e.target.value)}
                             className="w-16 bg-white border border-amber-200 rounded-xl py-1 text-center text-xs font-black outline-none focus:ring-2 focus:ring-amber-400"
                             placeholder="1.00"
                           />
                        </div>
                        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-2">
                           <span className="text-[10px] font-black text-emerald-700">بهای واحد:</span>
                           <input
                             type="number"
                             step="any"
                             value={row.unitPrice || ''}
                             onChange={e => updateMetreRowField(row.id!, 'unitPrice', e.target.value)}
                             className="w-28 bg-white border border-emerald-200 rounded-xl py-1 text-center text-xs font-black outline-none focus:ring-2 focus:ring-emerald-400"
                             placeholder="ریال"
                           />
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                <div className="md:col-span-3 space-y-2 relative">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Hash size={14} /> {currentProject?.contractType === "CBS" ? "کد ساختار شکست (CBS)" : "کد عملیاتی"}
                  </label>
                  <div className="relative group/input">
                    <input
                      required
                      value={row.itemCode || ''}
                      onChange={e => handleMetreCodeSearch(row.id!, e.target.value, row.priceListId)}
                      className="w-full px-5 py-4 bg-slate-50 border border-transparent rounded-2xl text-xs font-black text-blue-600 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all shadow-inner"
                      placeholder={currentProject?.contractType === "CBS" ? "کد فعالیت CBS..." : "جستجوی کد..."}
                    />
                    {row.isSearching && row.searchResults && row.searchResults.length > 0 && (
                      <div className="absolute top-full right-0 w-[min(90vw,600px)] mt-3 bg-white border border-slate-200 rounded-[2.5rem] shadow-2xl z-[150] overflow-hidden animate-slideDown border-t-4 border-t-blue-600">
                        <div className="p-2 bg-slate-50 text-[9px] font-black text-slate-400 uppercase pr-4">
                          {currentProject?.contractType === "CBS" ? "فعالیت‌های پیشنهادی ساختار شکست" : "آیتم‌های پیشنهادی فهرست‌بها"}
                        </div>
                        <div className="max-h-60 overflow-y-auto custom-scrollbar">
                          {row.searchResults.map((item, i) => (
                            <div key={i} onClick={() => selectMetreItem(row.id!, item)} className="p-4 hover:bg-blue-50 cursor-pointer border-b last:border-0 flex items-start gap-4 transition-colors group/item">
                              <span className="shrink-0 bg-blue-50 text-blue-600 px-3 py-1.5 rounded-xl font-black text-[10px] border border-blue-100 group-hover/item:bg-blue-600 group-hover/item:text-white transition-all text-center min-w-[80px]">{item.code}</span>
                              <div className="flex-1 text-right">
                                <span className="text-[11px] font-bold text-slate-700 block leading-relaxed group-hover/item:text-blue-900">{item.description}</span>
                                <span className="text-[9px] text-slate-400 mt-1 block">واحد: {item.unit}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="md:col-span-7 space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">شرح و تفصیل ردیف</label>
                  <input
                    required
                    value={row.description || ''}
                    onChange={e => updateMetreRowField(row.id!, 'description', e.target.value)}
                    className="w-full px-5 py-4 bg-slate-50 border border-transparent rounded-2xl text-xs font-bold text-slate-800 focus:bg-white focus:border-blue-500 transition-all shadow-inner"
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center block">واحد</label>
                  <input
                    value={row.unit || ''}
                    onChange={e => updateMetreRowField(row.id!, 'unit', e.target.value)}
                    className="w-full px-5 py-4 bg-blue-50 text-blue-600 rounded-2xl text-xs font-black text-center shadow-inner border border-blue-100 outline-none focus:bg-white focus:border-blue-400 transition-all"
                    placeholder="واحد"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-6 gap-6 mt-8 p-6 bg-slate-50/50 rounded-[2rem] border border-slate-100 shadow-inner group-hover/row:bg-white transition-colors duration-500">
                {[
                  { f: 'count', l: 'تعداد' },
                  { f: 'length', l: 'طول' },
                  { f: 'width', l: 'عرض' },
                  { f: 'height', l: 'ارتفاع' },
                  { f: 'multiplier', l: 'ضریب' }
                ].map(dim => (
                  <div key={dim.f} className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 block text-center uppercase tracking-widest">{dim.l}</label>
                    <input
                      type="number"
                      step="any"
                      value={(row as any)[dim.f] || ''}
                      onChange={e => updateMetreRowField(row.id!, dim.f as any, e.target.value)}
                      className="w-full p-3 bg-white border border-slate-200 rounded-xl text-center text-sm font-black outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all"
                    />
                  </div>
                ))}
                <div className="space-y-2 md:col-span-1 flex flex-col justify-end">
                  <label className="text-[8px] font-black text-slate-400 text-center uppercase mb-2">جمع جزء (دستی)</label>
                  <input
                    type="number"
                    step="any"
                    value={row.partialTotal ?? ''}
                    onChange={e => updateMetreRowField(row.id!, 'partialTotal', e.target.value)}
                    className="w-full p-3 bg-amber-100 text-slate-900 rounded-xl text-center text-sm font-black shadow-sm outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white transition-all placeholder:text-slate-400 border border-amber-200"
                    placeholder="0"
                  />
                </div>
              </div>

              {currentProject?.contractType === "CBS" && (
                <div className="mt-4 px-6 py-3 bg-indigo-50/50 border border-indigo-100 rounded-[1.5rem] text-[10px] font-black text-indigo-800 text-right">
                  💡 راهنما: در قراردادهای ساختار شکست (CBS)، می‌توانید مستقیماً درصد پیشرفت فیزیکی یا مقدار فعالیت را در ستون «جمع جزء (دستی)» وارد کنید یا از فرمول ابعاد بالا بهره ببرید.
                </div>
              )}

              {/* Role-based Comparison and Audit Panel */}
              {(row.contractorTotal !== undefined || row.consultantTotal !== undefined || row.employerTotal !== undefined) && (
                <div className="mt-6 p-5 rounded-[2rem] bg-slate-50 border border-slate-200/60 shadow-sm space-y-3 text-right" dir="rtl">
                  <div className="flex items-center gap-2 border-b border-slate-200/50 pb-2 mb-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>
                    <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">مقایسه دیدگاه‌ها و مراجع بازنگری</h5>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Contractor original claim */}
                    {row.contractorTotal !== undefined && (
                      <div className="p-4 rounded-xl bg-white border border-slate-100 flex flex-col justify-between">
                        <div>
                          <span className="text-[9px] font-black text-blue-500 block mb-1">✍️ ادعای اولیه پیمانکار</span>
                          <span className="text-xs font-bold text-slate-700">
                            {row.isManualPartialTotal || row.contractorCount === 0
                              ? "ثبت دستی (بدون ابعاد)"
                              : `${row.contractorCount ?? 1} × ${row.contractorLength ?? 1} × ${row.contractorWidth ?? 1} × ${row.contractorHeight ?? 1} × ${row.contractorMultiplier ?? 1}`}
                          </span>
                        </div>
                        <div className="mt-3 pt-2 border-t border-slate-100 flex justify-between items-center">
                          <span className="text-[9px] font-black text-slate-400">جمع کل ادعا:</span>
                          <span className="text-xs font-black text-blue-600">{(row.contractorTotal || 0).toLocaleString('fa-IR')} <span className="text-[8px] font-bold">{row.unit || 'متر'}</span></span>
                        </div>
                      </div>
                    )}

                    {/* Consultant approved evaluation */}
                    {row.consultantTotal !== undefined && (
                      <div className="p-4 rounded-xl bg-white border border-slate-100 flex flex-col justify-between">
                        <div>
                          <span className="text-[9px] font-black text-emerald-600 block mb-1">🔍 تایید و نقد مشاور</span>
                          <span className="text-xs font-bold text-slate-700">
                            {row.isManualPartialTotal || row.consultantCount === 0 || row.contractorCount === 0
                              ? "ثبت دستی (بدون ابعاد)"
                              : `${row.consultantCount ?? 1} × ${row.consultantLength ?? 1} × ${row.consultantWidth ?? 1} × ${row.consultantHeight ?? 1} × ${row.consultantMultiplier ?? 1}`}
                          </span>
                        </div>
                        <div className="mt-3 pt-2 border-t border-slate-100 space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="text-[9px] font-black text-slate-400">جمع کل مشاور:</span>
                            <span className="text-xs font-black text-emerald-600">{(row.consultantTotal || 0).toLocaleString('fa-IR')} <span className="text-[8px] font-bold">{row.unit || 'متر'}</span></span>
                          </div>
                          <span className="text-[8px] text-emerald-500 font-bold block bg-emerald-50/50 px-2 py-0.5 rounded text-center truncate">
                            ویرایش: {row.consultantEditedBy || 'نماینده مشاور'} در {row.consultantEditedAt || '-'}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Employer approved evaluation */}
                    {row.employerTotal !== undefined && (
                      <div className="p-4 rounded-xl bg-white border border-slate-100 flex flex-col justify-between">
                        <div>
                          <span className="text-[9px] font-black text-purple-600 block mb-1">🏛️ ابلاغ نهایی کارفرما</span>
                          <span className="text-xs font-bold text-slate-700">
                            {row.isManualPartialTotal || row.employerCount === 0 || row.contractorCount === 0
                              ? "ثبت دستی (بدون ابعاد)"
                              : `${row.employerCount ?? 1} × ${row.employerLength ?? 1} × ${row.employerWidth ?? 1} × ${row.employerHeight ?? 1} × ${row.employerMultiplier ?? 1}`}
                          </span>
                        </div>
                        <div className="mt-3 pt-2 border-t border-slate-100 space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="text-[9px] font-black text-slate-400">جمع کل کارفرما:</span>
                            <span className="text-xs font-black text-purple-600">{(row.employerTotal || 0).toLocaleString('fa-IR')} <span className="text-[8px] font-bold">{row.unit || 'متر'}</span></span>
                          </div>
                          <span className="text-[8px] text-purple-500 font-bold block bg-purple-50/50 px-2 py-0.5 rounded text-center truncate">
                            ویرایش: {row.employerEditedBy || 'نماینده کارفرما'} در {row.employerEditedAt || '-'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 flex justify-between items-center text-[10px] font-bold text-slate-500 border-t border-slate-200/40">
                    <div className="flex items-center gap-1">
                      <span>مبنای فعلی محاسبات (ملاک عمل):</span>
                      <span className="px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200/60 font-black">
                        {row.employerTotal !== undefined ? 'رویه کارفرما' : row.consultantTotal !== undefined ? 'رویه مشاور' : 'رویه پیمانکار'}
                      </span>
                    </div>

                    {currentUser && (() => {
                      const userOrgT = SystemAdminService.getOrganization(currentUser.orgId)?.type;
                      if (userOrgT === OrganizationType.CONSULTANT) {
                        return <span className="text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-100 animate-pulse">شما در حال بازنگری در کسوت مشاور هستید. تفاضل یا تایید شما ثبت خواهد شد.</span>;
                      }
                      if (userOrgT === OrganizationType.EMPLOYER) {
                        return <span className="text-purple-600 bg-purple-50 px-2.5 py-0.5 rounded-md border border-purple-100 animate-pulse">شما در حال بررسی عالیه کارفرما هستید. دیدگاه نهایی به عنوان ملاک نهایی محاسبه می‌گردد.</span>;
                      }
                      return null;
                    })()}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MetreEntryForm;
