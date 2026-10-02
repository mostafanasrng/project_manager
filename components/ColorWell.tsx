import React, { useState, useRef, useEffect } from "react";
import { Pipette, ChevronDown, Check, Sliders, Copy, RefreshCw } from "lucide-react";

export interface ColorWellProps {
  color: string;
  onChange: (color: string) => void;
  label?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  presets?: string[];
}

const DEFAULT_PRESETS = [
  "#d97706", // Amber 600
  "#059669", // Emerald 600
  "#2563eb", // Blue 600
  "#7c3aed", // Violet 600
  "#e11d48", // Rose 600
  "#0891b2", // Cyan 600
  "#ea580c", // Orange 600
  "#4f46e5", // Indigo 600
  "#16a34a", // Green 600
  "#dc2626", // Red 600
  "#475569", // Slate 600
  "#1e293b", // Slate 800
];

export const ColorWell: React.FC<ColorWellProps> = ({
  color = "#d97706",
  onChange,
  label,
  className = "",
  size = "md",
  presets = DEFAULT_PRESETS,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hexInput, setHexInput] = useState(color);
  const [copied, setCopied] = useState(false);
  const nativeColorInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHexInput(color);
  }, [color]);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleHexChange = (val: string) => {
    setHexInput(val);
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
      onChange(val);
    }
  };

  // Modern EyeDropper API (Screen color sampler - NSColorSampler equivalent in browser)
  const handleEyeDropper = async () => {
    if ("EyeDropper" in window) {
      try {
        const eyeDropper = new (window as any).EyeDropper();
        const result = await eyeDropper.open();
        if (result?.sRGBHex) {
          onChange(result.sRGBHex);
          setHexInput(result.sRGBHex);
        }
      } catch (e) {
        // User canceled eyedropper selection
      }
    } else {
      // Fallback: trigger native color picker
      nativeColorInputRef.current?.click();
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(color);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const hasEyeDropperSupport = typeof window !== "undefined" && "EyeDropper" in window;

  const sizeClasses = {
    sm: "h-7 text-xs",
    md: "h-9 text-sm",
    lg: "h-11 text-base",
  }[size];

  const swatchSizes = {
    sm: "w-5 h-5",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  }[size];

  return (
    <div className={`inline-flex flex-col gap-1.5 relative ${className}`} ref={containerRef}>
      {label && (
        <label className="text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center justify-between">
          <span>{label}</span>
          <span className="text-[10px] font-mono text-stone-400 uppercase">{color}</span>
        </label>
      )}

      {/* Expanded NSColorWell-Style Two-Part Control */}
      <div className="inline-flex items-center rounded-xl p-1 bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 shadow-sm transition-all hover:border-amber-500/50">
        {/* Left Part: Color Swatch + Popover Trigger */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-stone-200/60 dark:hover:bg-stone-700/60 transition-colors ${sizeClasses}`}
          title="انتخاب رنگ از پلت پیش‌فرض و ابزار قطره‌چکان"
        >
          <div
            className={`${swatchSizes} rounded-md shadow-inner border border-black/10 transition-transform active:scale-95`}
            style={{ backgroundColor: color }}
          />
          <span className="font-mono font-bold text-stone-800 dark:text-stone-200 uppercase text-xs">
            {color}
          </span>
        </button>

        <div className="w-[1px] h-5 bg-stone-300 dark:bg-stone-700 mx-0.5" />

        {/* Right Part: Native NSColorPanel trigger caret */}
        <button
          type="button"
          onClick={() => nativeColorInputRef.current?.click()}
          className="p-1.5 rounded-lg hover:bg-stone-200/60 dark:hover:bg-stone-700/60 text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
          title="باز کردن پنل اختصاصی رنگ سیستم (System Color Panel)"
        >
          <Sliders size={15} />
        </button>

        {/* Hidden Native HTML5 Color Input */}
        <input
          ref={nativeColorInputRef}
          type="color"
          value={color}
          onChange={(e) => onChange(e.target.value)}
          className="sr-only opacity-0 w-0 h-0 absolute pointer-events-none"
        />
      </div>

      {/* Modern Color Grid Popover */}
      {isOpen && (
        <div className="absolute top-full mt-2 right-0 z-50 w-64 p-3 bg-white dark:bg-stone-900 rounded-2xl shadow-xl border border-stone-200 dark:border-stone-800 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-stone-100 dark:border-stone-800">
            <span className="text-xs font-black text-stone-700 dark:text-stone-300">پلت انتخاب رنگ</span>
            <div className="flex items-center gap-1">
              {/* Screen Eyedropper Button */}
              <button
                type="button"
                onClick={handleEyeDropper}
                className={`p-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${
                  hasEyeDropperSupport
                    ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40"
                    : "bg-stone-100 dark:bg-stone-800 text-stone-500"
                }`}
                title={
                  hasEyeDropperSupport
                    ? "ابزار قطره‌چکان (انتخاب هر رنگ از صفحه نمایش)"
                    : "پنل رنگ"
                }
              >
                <Pipette size={14} />
                <span className="text-[10px]">قطره‌چکان</span>
              </button>

              <button
                type="button"
                onClick={copyToClipboard}
                className="p-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
                title="کپی کد Hex"
              >
                {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              </button>
            </div>
          </div>

          {/* Quick Swatch Grid */}
          <div className="grid grid-cols-6 gap-2 mb-3">
            {presets.map((pColor) => (
              <button
                key={pColor}
                type="button"
                onClick={() => {
                  onChange(pColor);
                  setHexInput(pColor);
                }}
                className={`w-7 h-7 rounded-lg shadow-sm transition-all hover:scale-110 flex items-center justify-center border ${
                  color.toLowerCase() === pColor.toLowerCase()
                    ? "ring-2 ring-amber-500 ring-offset-1 border-white"
                    : "border-black/10"
                }`}
                style={{ backgroundColor: pColor }}
              >
                {color.toLowerCase() === pColor.toLowerCase() && (
                  <Check size={12} className="text-white drop-shadow-sm" />
                )}
              </button>
            ))}
          </div>

          {/* HEX Input & Native Picker launcher */}
          <div className="flex items-center gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
            <div className="flex-1 flex items-center bg-stone-100 dark:bg-stone-800 rounded-xl px-2.5 py-1.5 border border-stone-200 dark:border-stone-700 focus-within:border-amber-500">
              <span className="text-stone-400 text-xs font-mono select-none">#</span>
              <input
                type="text"
                value={hexInput.replace("#", "")}
                onChange={(e) => handleHexChange("#" + e.target.value)}
                maxLength={6}
                className="w-full bg-transparent border-none text-xs font-mono font-bold uppercase text-stone-800 dark:text-stone-100 focus:outline-none px-1"
                placeholder="FFFFFF"
              />
            </div>

            <button
              type="button"
              onClick={() => nativeColorInputRef.current?.click()}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1 shadow-sm"
              title="باز کردن پنل پیشرفته رنگ"
            >
              <Sliders size={13} />
              <span>پیشرفته</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ColorWell;
