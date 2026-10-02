import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  Calendar as CalendarIcon, 
  ChevronRight, 
  ChevronLeft, 
  ChevronsRight, 
  ChevronsLeft, 
  X, 
  Check, 
  CalendarDays
} from 'lucide-react';
import { 
  formatShamsiDate, 
  parseShamsiDate, 
  getTodayShamsi, 
  getDaysInShamsiMonth, 
  getFirstDayOfWeekInShamsiMonth,
  SHAMSI_MONTH_NAMES,
  SHAMSI_WEEK_DAYS
} from '../utils/dateUtils';

export interface ShamsiDatePickerProps {
  value?: string;
  onChange: (date: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  className?: string;
  inputClassName?: string;
  minDate?: string;
  maxDate?: string;
  showTodayButton?: boolean;
  showClearButton?: boolean;
}

type ViewMode = 'days' | 'months' | 'years';

export const ShamsiDatePicker: React.FC<ShamsiDatePickerProps> = ({
  value = '',
  onChange,
  placeholder = '1403/--/--',
  label,
  error,
  disabled = false,
  readOnly = false,
  required = false,
  className = '',
  inputClassName = '',
  minDate,
  maxDate,
  showTodayButton = true,
  showClearButton = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('days');
  
  // Current viewing month and year in the calendar
  const todayStr = getTodayShamsi();
  const parsedToday = parseShamsiDate(todayStr) || { year: 1403, month: 1, day: 1 };
  const parsedValue = parseShamsiDate(value);

  const [viewYear, setViewYear] = useState<number>(parsedValue ? parsedValue.year : parsedToday.year);
  const [viewMonth, setViewMonth] = useState<number>(parsedValue ? parsedValue.month : parsedToday.month);
  
  // Year range start for the years selector grid (shows 12 years at a time)
  const [yearGridStart, setYearGridStart] = useState<number>(Math.floor((parsedValue?.year || parsedToday.year) / 12) * 12);

  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number; position: 'top' | 'bottom' } | null>(null);

  // Synchronize view state when value changes or when modal opens
  useEffect(() => {
    if (parsedValue) {
      setViewYear(parsedValue.year);
      setViewMonth(parsedValue.month);
      setYearGridStart(Math.floor(parsedValue.year / 12) * 12);
    }
  }, [value]);

  // Update popover coordinates
  const updatePosition = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const popoverHeight = 340;
    const popoverWidth = 280;

    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    let showOnTop = false;
    if (spaceBelow < popoverHeight && spaceAbove > popoverHeight) {
      showOnTop = true;
    }

    let left = rect.right - popoverWidth; // Align to the right edge for RTL
    if (left < 10) left = 10;
    if (left + popoverWidth > window.innerWidth - 10) {
      left = window.innerWidth - popoverWidth - 10;
    }

    setCoords({
      top: showOnTop ? rect.top - popoverHeight - 6 : rect.bottom + 6,
      left,
      position: showOnTop ? 'top' : 'bottom'
    });
  };

  const handleOpen = () => {
    if (disabled || readOnly) return;
    updatePosition();
    setViewMode('days');
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setViewMode('days');
  };

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!isOpen) return;
      const target = e.target as Node;
      if (
        containerRef.current && !containerRef.current.contains(target) &&
        popoverRef.current && !popoverRef.current.contains(target)
      ) {
        handleClose();
      }
    };

    const handleScrollOrResize = () => {
      if (isOpen) updatePosition();
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('resize', handleScrollOrResize);
      window.addEventListener('scroll', handleScrollOrResize, true);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [isOpen]);

  // Navigation handlers
  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 1) {
      setViewMonth(12);
      setViewYear(prev => prev - 1);
    } else {
      setViewMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 12) {
      setViewMonth(1);
      setViewYear(prev => prev + 1);
    } else {
      setViewMonth(prev => prev + 1);
    }
  };

  const handlePrevYear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewYear(prev => prev - 1);
  };

  const handleNextYear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewYear(prev => prev + 1);
  };

  const handleSelectDay = (day: number) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const selected = `${viewYear}/${pad(viewMonth)}/${pad(day)}`;
    onChange(selected);
    handleClose();
  };

  const handleSelectToday = () => {
    onChange(todayStr);
    handleClose();
  };

  const handleClear = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    onChange('');
    handleClose();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatShamsiDate(e.target.value);
    onChange(formatted);
  };

  // Calendar Grid Data
  const daysInCurrentMonth = getDaysInShamsiMonth(viewYear, viewMonth);
  const firstDayOfWeek = getFirstDayOfWeekInShamsiMonth(viewYear, viewMonth); // 0 = Sat, 6 = Fri
  
  // Previous month days count
  const prevMonth = viewMonth === 1 ? 12 : viewMonth - 1;
  const prevYear = viewMonth === 1 ? viewYear - 1 : viewYear;
  const daysInPrevMonth = getDaysInShamsiMonth(prevYear, prevMonth);

  const prevDays = [];
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    prevDays.push(daysInPrevMonth - i);
  }

  const currentDays = [];
  for (let d = 1; d <= daysInCurrentMonth; d++) {
    currentDays.push(d);
  }

  const totalDisplayed = prevDays.length + currentDays.length;
  const nextDaysCount = (totalDisplayed % 7 === 0) ? 0 : 7 - (totalDisplayed % 7);
  const nextDays = [];
  for (let d = 1; d <= nextDaysCount; d++) {
    nextDays.push(d);
  }

  // Helper to check if a day is today
  const isDayToday = (d: number) => {
    return parsedToday.year === viewYear && parsedToday.month === viewMonth && parsedToday.day === d;
  };

  // Helper to check if a day is currently selected
  const isDaySelected = (d: number) => {
    if (!parsedValue) return false;
    return parsedValue.year === viewYear && parsedValue.month === viewMonth && parsedValue.day === d;
  };

  return (
    <div className={`relative inline-block w-full text-right ${className}`} ref={containerRef} dir="rtl">
      {label && (
        <label className="block text-[11px] font-bold text-stone-600 mb-1.5 flex items-center justify-between">
          <span>
            {label}
            {required && <span className="text-rose-500 mr-1">*</span>}
          </span>
          {value && (
            <span className="text-[10px] text-amber-700/80 font-mono bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/50">
              {value}
            </span>
          )}
        </label>
      )}

      <div className="relative flex items-center">
        <input
          type="text"
          value={value}
          onChange={handleInputChange}
          onClick={handleOpen}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          className={`w-full py-2.5 px-3.5 pr-10 pl-9 bg-white border border-stone-200/80 rounded-xl text-xs font-bold text-stone-800 placeholder-stone-400 outline-none transition-all focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15 disabled:bg-stone-100 disabled:cursor-not-allowed ${inputClassName} ${error ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/15' : ''}`}
        />

        {/* Calendar trigger icon button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (isOpen) handleClose();
            else handleOpen();
          }}
          disabled={disabled || readOnly}
          title="باز کردن تقویم شمسی"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-amber-600 transition-colors disabled:opacity-50"
        >
          <CalendarIcon size={16} className={isOpen ? 'text-amber-600' : ''} />
        </button>

        {/* Clear button if value exists */}
        {value && showClearButton && !disabled && !readOnly && (
          <button
            type="button"
            onClick={handleClear}
            title="پاک کردن تاریخ"
            className="absolute left-2.5 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {error && (
        <p className="mt-1 text-[10px] text-rose-500 font-bold">{error}</p>
      )}

      {/* Calendar Popover rendered via Portal to prevent any parent overflow:hidden clipping */}
      {isOpen && coords && createPortal(
        <div
          ref={popoverRef}
          dir="rtl"
          style={{
            position: 'fixed',
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            width: '280px',
            zIndex: 999999,
          }}
          className="bg-white rounded-2xl shadow-2xl border border-stone-200 p-3 text-stone-800 select-none animate-in fade-in zoom-in-95 duration-150 font-sans"
        >
          {/* Header Navigation */}
          <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-stone-100">
            {/* Previous buttons (Right arrow in RTL = go back) */}
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={handlePrevYear}
                title="سال قبل"
                className="p-1 hover:bg-stone-100 rounded-lg text-stone-500 hover:text-amber-600 transition-colors"
              >
                <ChevronsRight size={15} />
              </button>
              <button
                type="button"
                onClick={handlePrevMonth}
                title="ماه قبل"
                className="p-1 hover:bg-stone-100 rounded-lg text-stone-600 hover:text-amber-600 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Title / Switcher buttons */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setViewMode(viewMode === 'months' ? 'days' : 'months')}
                className={`px-2 py-1 text-xs font-black rounded-lg transition-colors ${viewMode === 'months' ? 'bg-amber-100 text-amber-800' : 'hover:bg-stone-100 text-stone-800'}`}
              >
                {SHAMSI_MONTH_NAMES[viewMonth - 1]}
              </button>
              <button
                type="button"
                onClick={() => setViewMode(viewMode === 'years' ? 'days' : 'years')}
                className={`px-2 py-1 text-xs font-black font-mono rounded-lg transition-colors ${viewMode === 'years' ? 'bg-amber-100 text-amber-800' : 'hover:bg-stone-100 text-stone-800'}`}
              >
                {viewYear}
              </button>
            </div>

            {/* Next buttons (Left arrow in RTL = go forward) */}
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={handleNextMonth}
                title="ماه بعد"
                className="p-1 hover:bg-stone-100 rounded-lg text-stone-600 hover:text-amber-600 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={handleNextYear}
                title="سال بعد"
                className="p-1 hover:bg-stone-100 rounded-lg text-stone-500 hover:text-amber-600 transition-colors"
              >
                <ChevronsLeft size={15} />
              </button>
            </div>
          </div>

          {/* MODE 1: DAY SELECTOR */}
          {viewMode === 'days' && (
            <>
              {/* Day of Week Labels */}
              <div className="grid grid-cols-7 gap-1 text-center mb-1">
                {SHAMSI_WEEK_DAYS.map((w, idx) => (
                  <div
                    key={w.key}
                    className={`text-[10.5px] font-bold py-1 ${idx === 6 ? 'text-rose-500' : 'text-stone-400'}`}
                    title={w.full}
                  >
                    {w.short}
                  </div>
                ))}
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-1 text-center">
                {/* Prev Month Days */}
                {prevDays.map(d => (
                  <div
                    key={`prev-${d}`}
                    className="h-8 flex items-center justify-center text-[11px] font-medium text-stone-300 pointer-events-none"
                  >
                    {d}
                  </div>
                ))}

                {/* Current Month Days */}
                {currentDays.map(d => {
                  const isSelected = isDaySelected(d);
                  const isToday = isDayToday(d);
                  return (
                    <button
                      key={`day-${d}`}
                      type="button"
                      onClick={() => handleSelectDay(d)}
                      className={`h-8 w-8 mx-auto flex items-center justify-center rounded-xl text-xs font-bold transition-all ${
                        isSelected
                          ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30 font-black scale-105'
                          : isToday
                          ? 'border border-amber-500 text-amber-700 bg-amber-50/60 font-black hover:bg-amber-100'
                          : 'text-stone-700 hover:bg-stone-100 hover:text-stone-900'
                      }`}
                    >
                      {d}
                    </button>
                  );
                })}

                {/* Next Month Days */}
                {nextDays.map(d => (
                  <div
                    key={`next-${d}`}
                    className="h-8 flex items-center justify-center text-[11px] font-medium text-stone-300 pointer-events-none"
                  >
                    {d}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* MODE 2: MONTH SELECTOR */}
          {viewMode === 'months' && (
            <div className="grid grid-cols-3 gap-2 py-2">
              {SHAMSI_MONTH_NAMES.map((mName, idx) => {
                const monthNum = idx + 1;
                const isSelected = viewMonth === monthNum;
                const isCurrent = parsedToday.month === monthNum && parsedToday.year === viewYear;
                return (
                  <button
                    key={mName}
                    type="button"
                    onClick={() => {
                      setViewMonth(monthNum);
                      setViewMode('days');
                    }}
                    className={`py-2 px-1 text-xs font-bold rounded-xl transition-all ${
                      isSelected
                        ? 'bg-amber-600 text-white font-black shadow-md'
                        : isCurrent
                        ? 'border border-amber-500 text-amber-700 bg-amber-50 font-black'
                        : 'bg-stone-50 hover:bg-stone-100 text-stone-700'
                    }`}
                  >
                    {mName}
                  </button>
                );
              })}
            </div>
          )}

          {/* MODE 3: YEAR SELECTOR */}
          {viewMode === 'years' && (
            <div>
              <div className="flex items-center justify-between px-2 py-1 mb-2 bg-stone-50 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setYearGridStart(prev => prev - 12)}
                  className="p-1 hover:bg-stone-200 rounded text-stone-600"
                >
                  <ChevronRight size={14} />
                </button>
                <span className="font-mono text-stone-700">
                  {yearGridStart} - {yearGridStart + 11}
                </span>
                <button
                  type="button"
                  onClick={() => setYearGridStart(prev => prev + 12)}
                  className="p-1 hover:bg-stone-200 rounded text-stone-600"
                >
                  <ChevronLeft size={14} />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-1.5 py-1">
                {Array.from({ length: 12 }).map((_, i) => {
                  const y = yearGridStart + i;
                  const isSelected = viewYear === y;
                  const isCurrent = parsedToday.year === y;
                  return (
                    <button
                      key={y}
                      type="button"
                      onClick={() => {
                        setViewYear(y);
                        setViewMode('months');
                      }}
                      className={`py-2 text-xs font-mono font-bold rounded-xl transition-all ${
                        isSelected
                          ? 'bg-amber-600 text-white font-black shadow-md'
                          : isCurrent
                          ? 'border border-amber-500 text-amber-700 bg-amber-50'
                          : 'bg-stone-50 hover:bg-stone-100 text-stone-700'
                      }`}
                    >
                      {y}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick Action Footer */}
          <div className="mt-3 pt-2.5 border-t border-stone-100 flex items-center justify-between text-[11px] font-bold">
            <div className="flex items-center gap-2">
              {showTodayButton && (
                <button
                  type="button"
                  onClick={handleSelectToday}
                  className="px-2.5 py-1 text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <CalendarDays size={13} />
                  امروز ({todayStr})
                </button>
              )}
              {showClearButton && value && (
                <button
                  type="button"
                  onClick={() => handleClear()}
                  className="px-2 py-1 text-stone-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                >
                  پاک کردن
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="px-2.5 py-1 text-stone-600 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
            >
              بستن
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default ShamsiDatePicker;
