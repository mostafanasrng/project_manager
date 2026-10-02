import React, { useState, useRef, useEffect } from 'react';
import { Palette, Check, Sparkles, Sliders, X, Sun, Moon } from 'lucide-react';
import { CURATED_THEMES, CuratedTheme, hexToRgb } from '../src/utils/theme';

interface ThemeSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentColor: string;
  onSelectColor: (color: string) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

const CATEGORY_LABELS: Record<CuratedTheme['category'], string> = {
  engineering: 'عمرانی و کارگاهی',
  modern: 'مدرن و فناوری هوشمند',
  nature: 'پایدار و زیست‌محیطی (HSE)',
  executive: 'مدیریتی و رسمی',
  vibrant: 'پویا و پرانرژی',
};

export default function ThemeSelectorModal({
  isOpen,
  onClose,
  currentColor,
  onSelectColor,
  isDarkMode,
  onToggleDarkMode,
}: ThemeSelectorModalProps) {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [customHex, setCustomHex] = useState(currentColor);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCustomHex(currentColor);
  }, [currentColor]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const categories = ['all', 'engineering', 'modern', 'nature', 'executive'] as const;

  const filteredThemes = activeCategory === 'all'
    ? CURATED_THEMES
    : CURATED_THEMES.filter(t => t.category === activeCategory);

  const activeThemeObj = CURATED_THEMES.find(
    t => t.color.toLowerCase() === currentColor.toLowerCase()
  );

  return (
    <div 
      className="fixed inset-0 z-[350] flex items-center justify-center p-4 bg-stone-900/60 dark:bg-black/75 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      dir="rtl"
    >
      <div
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 rounded-[2rem] border border-stone-200/80 dark:border-slate-800 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scaleIn text-right text-stone-900 dark:text-slate-100"
      >
        {/* Header */}
        <div className="p-6 border-b border-stone-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-stone-50/70 to-white dark:from-slate-900 dark:to-slate-800/80">
          <div className="flex items-center gap-3.5">
            <div 
              className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-lg transition-colors"
              style={{ backgroundColor: currentColor }}
            >
              <Palette size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base md:text-lg font-black text-stone-900 dark:text-white">
                  شخصی‌سازی پالت و تم بصری
                </h3>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200/50">
                  اختصاصی سامانه
                </span>
              </div>
              <p className="text-xs font-bold text-stone-500 dark:text-slate-400 mt-0.5">
                رنگ‌بندی شاخص پروژه و حالت شب/روز را متناسب با سلیقه و نوع پروژه‌تان برگزینید
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-slate-800 transition-colors"
            title="بستن"
          >
            <X size={20} />
          </button>
        </div>

        {/* Mode Switch & Quick Status Bar */}
        <div className="px-6 py-3.5 bg-stone-100/50 dark:bg-slate-800/50 border-b border-stone-200/50 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-stone-600 dark:text-slate-300">
              تم روشنایی/تاریکی:
            </span>
            <button
              onClick={onToggleDarkMode}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-black bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 text-stone-700 dark:text-slate-200 hover:border-amber-500 transition-all shadow-xs cursor-pointer active:scale-95"
            >
              {isDarkMode ? (
                <>
                  <Moon size={15} className="text-indigo-400" />
                  <span>حالت تیره (Dark Mode)</span>
                </>
              ) : (
                <>
                  <Sun size={15} className="text-amber-500" />
                  <span>حالت روشن (Light Mode)</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-stone-500 dark:text-slate-400">
            <span>تم فعال:</span>
            <span className="font-black text-stone-900 dark:text-white flex items-center gap-1.5">
              <span 
                className="w-3 h-3 rounded-full inline-block shadow-xs" 
                style={{ backgroundColor: currentColor }}
              />
              {activeThemeObj?.name || 'سفارشی'}
            </span>
          </div>
        </div>

        {/* Category Filters */}
        <div className="px-6 pt-4 pb-2 flex gap-1.5 overflow-x-auto no-scrollbar border-b border-stone-100 dark:border-slate-800/60">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition-all cursor-pointer ${
                activeCategory === cat
                  ? 'bg-stone-900 dark:bg-white text-white dark:text-stone-900 shadow-sm scale-[1.02]'
                  : 'bg-stone-100/80 dark:bg-slate-800/80 text-stone-600 dark:text-slate-400 hover:bg-stone-200/70 dark:hover:bg-slate-700'
              }`}
            >
              {cat === 'all' ? 'همه تم‌ها' : CATEGORY_LABELS[cat as keyof typeof CATEGORY_LABELS]}
            </button>
          ))}
        </div>

        {/* Theme Cards Grid */}
        <div className="p-6 overflow-y-auto max-h-[46vh] space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredThemes.map((theme) => {
              const isSelected = currentColor.toLowerCase() === theme.color.toLowerCase();
              return (
                <div
                  key={theme.id}
                  onClick={() => onSelectColor(theme.color)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer text-right relative group flex flex-col justify-between ${
                    isSelected
                      ? 'bg-white dark:bg-slate-800 border-2 shadow-md'
                      : 'bg-stone-50/80 dark:bg-slate-800/40 border-stone-200/70 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800 hover:border-stone-300 dark:hover:border-slate-700 hover:shadow-xs'
                  }`}
                  style={{
                    borderColor: isSelected ? theme.color : undefined,
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-xl shrink-0 flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-105"
                        style={{ backgroundColor: theme.color }}
                      >
                        {isSelected ? <Check size={16} strokeWidth={3} /> : null}
                      </div>
                      <div>
                        <div className="text-xs font-black text-stone-900 dark:text-white flex items-center gap-1.5">
                          {theme.name}
                        </div>
                        <span className="text-[10px] font-bold text-stone-400 dark:text-slate-400">
                          {CATEGORY_LABELS[theme.category]}
                        </span>
                      </div>
                    </div>

                    <div className="text-[11px] font-mono font-bold text-stone-400 dark:text-slate-500 uppercase">
                      {theme.color}
                    </div>
                  </div>

                  <p className="text-[11px] font-bold text-stone-500 dark:text-slate-400 mt-2.5 leading-relaxed">
                    {theme.description}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Custom Color Picker Section */}
          <div className="pt-3 border-t border-stone-200/60 dark:border-slate-800">
            <div className="bg-stone-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-stone-200/70 dark:border-slate-700/60 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-stone-200 dark:bg-slate-700 text-stone-700 dark:text-slate-200">
                  <Sliders size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-black text-stone-900 dark:text-white">
                    انتخابگر دلخواه (Custom Hex)
                  </h4>
                  <p className="text-[10px] font-bold text-stone-400 dark:text-slate-400">
                    کد رنگ سازمانی یا لوگوی اختصاصی شرکت خود را وارد نمایید
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex items-center border border-stone-300 dark:border-slate-600 rounded-xl overflow-hidden bg-white dark:bg-slate-900 px-2 py-1 shadow-xs">
                  <input
                    type="color"
                    value={currentColor}
                    onChange={(e) => onSelectColor(e.target.value)}
                    className="w-7 h-7 rounded-lg border-0 cursor-pointer bg-transparent"
                    title="انتخاب رنگ از جعبه رنگ"
                  />
                  <input
                    type="text"
                    value={customHex}
                    onChange={(e) => {
                      setCustomHex(e.target.value);
                      if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
                        onSelectColor(e.target.value);
                      }
                    }}
                    placeholder="#d97706"
                    className="w-24 text-xs font-mono font-bold text-center uppercase bg-transparent outline-none text-stone-800 dark:text-white"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 px-6 border-t border-stone-100 dark:border-slate-800 flex items-center justify-between bg-stone-50/50 dark:bg-slate-900">
          <span className="text-[11px] font-bold text-stone-400 dark:text-slate-500">
            تنظیمات تم بلافاصله در تمام سیستم ذخیره و اعمال می‌شود.
          </span>
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl text-xs font-black text-white transition-all shadow-md active:scale-95 cursor-pointer"
            style={{ backgroundColor: currentColor }}
          >
            تایید و مشاهده
          </button>
        </div>
      </div>
    </div>
  );
}
