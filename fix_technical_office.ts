
import fs from 'fs';

const filePath = './pages/TechnicalOffice.tsx';
const lines = fs.readFileSync(filePath, 'utf-8').split('\n');

// Goal: 
// 4710: button (open)
// 4711: /button -> REMOVE
// 4712: /div -> REMOVE
// 4713: /div -> REMOVE
// ...
// 4718: div span-1 (new)
// 4719: button (open)
// 4720: PlusCircle + افزودن
// 4721: /button
// 4722: /div
// 4723: /div
// 4724: /div

// I will just replace the whole range 4710-4724 with the correct code.
// Line 4710 in grep is 4709 in 0-indexed.
// So lines[4709] to lines[4723] (inclusive)

const replacement = `                          <div className="md:col-span-2">
                             <label className="text-[10px] font-black text-slate-500 mb-1 block">بهای واحد</label>
                             <input type="number" value={variationNewItem.unitPrice || ''} onChange={e => setVariationNewItem({...variationNewItem, unitPrice: Number(e.target.value)})} className="w-full p-3 bg-white rounded-xl font-bold text-xs border border-slate-200 outline-none text-center"/>
                          </div>
                          <div className="md:col-span-1">
                             <label className="text-[10px] font-black text-slate-500 mb-1 block">مقدار پیشنهادی</label>
                             <input type="number" value={variationNewItem.contractorQty || 0} onChange={e => setVariationNewItem({...variationNewItem, contractorQty: Number(e.target.value)})} className="w-full p-3 bg-white rounded-xl font-bold text-xs border border-slate-200 outline-none text-center"/>
                          </div>
                          <div className="md:col-span-2">
                            <button type="button" onClick={addVariationItem} className="w-full py-3 bg-purple-600 text-white rounded-xl font-black text-xs hover:bg-purple-700 transition-all shadow-lg shadow-purple-200 flex items-center justify-center gap-2">
                              <PlusCircle size={16}/> افزودن
                            </button>
                          </div>`;

// Wait, I need to find the START of the block.
const startIndex = lines.findIndex(l => l.includes('بهای واحد') && l.includes('label'));
// That should be around 4706.
// Let's replace from lines[startIndex-1] (the div) to lines[4723].

lines.splice(4704, 20, replacement);

fs.writeFileSync(filePath, lines.join('\n'));
console.log('File updated successfully');
