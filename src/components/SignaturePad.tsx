import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
  PenTool, 
  RotateCcw, 
  Upload, 
  Check, 
  Trash2, 
  Download, 
  Eye, 
  Image as ImageIcon,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';

export interface SignaturePadProps {
  value?: string; // base64 data URL
  onChange: (signatureDataUrl: string | undefined) => void;
  readOnly?: boolean;
  label?: string;
  helperText?: string;
  signatureDate?: string;
  signerName?: string;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({
  value,
  onChange,
  readOnly = false,
  label = 'امضای الکترونیکی',
  helperText = 'با قلم/ماوس در کادر زیر امضا کنید یا تصویر شفاف امضا را بارگذاری نمایید.',
  signatureDate,
  signerName
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [penColor, setPenColor] = useState('#0f172a'); // default deep dark
  const [penWidth, setPenWidth] = useState(2.5);
  const [strokesHistory, setStrokesHistory] = useState<ImageData[]>([]);
  const [mode, setMode] = useState<'draw' | 'upload'>(value ? 'draw' : 'draw');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Setup canvas resolution and background
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set display size
    const rect = canvas.getBoundingClientRect();
    const width = rect.width || 480;
    const height = rect.height || 180;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = penColor;
    ctx.lineWidth = penWidth;

    // Clear canvas transparently
    ctx.clearRect(0, 0, width, height);

    // If initial value exists and we want to show it on canvas
    if (value && value.startsWith('data:image')) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        ctx.clearRect(0, 0, width, height);
        // Calculate fit aspect ratio
        const scale = Math.min((width - 20) / img.width, (height - 20) / img.height, 1);
        const x = (width - img.width * scale) / 2;
        const y = (height - img.height * scale) / 2;
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
        setHasDrawn(true);
      };
      img.src = value;
    }
  }, [value, penColor, penWidth]);

  useEffect(() => {
    initCanvas();
  }, [initCanvas]);

  // Coordinate helper
  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      const touch = e.touches[0];
      if (!touch) return { x: 0, y: 0 };
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const saveStrokeState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    try {
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setStrokesHistory(prev => [...prev.slice(-10), imgData]);
    } catch (e) {
      // ignore
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (readOnly) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    saveStrokeState();

    const { x, y } = getCoordinates(e);
    ctx.strokeStyle = penColor;
    ctx.lineWidth = penWidth;
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || readOnly) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  // Helper to export lightweight compressed signature
  const exportSignatureData = (canvas: HTMLCanvasElement): string => {
    try {
      const maxW = 300;
      const maxH = 120;
      let w = canvas.width;
      let h = canvas.height;
      if (w <= maxW && h <= maxH) {
        return canvas.toDataURL('image/png');
      }
      const scale = Math.min(maxW / w, maxH / h, 1);
      const targetW = Math.max(1, Math.round(w * scale));
      const targetH = Math.max(1, Math.round(h * scale));
      
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = targetW;
      tempCanvas.height = targetH;
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
        tempCtx.drawImage(canvas, 0, 0, targetW, targetH);
        return tempCanvas.toDataURL('image/png');
      }
    } catch {
      // fallback to standard canvas export
    }
    return canvas.toDataURL('image/png');
  };

  const stopDrawing = () => {
    if (!isDrawing || readOnly) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.closePath();

    // Export transparent PNG data URL
    const dataUrl = exportSignatureData(canvas);
    onChange(dataUrl);
  };

  const handleClear = () => {
    if (readOnly) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    setHasDrawn(false);
    setStrokesHistory([]);
    onChange(undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUndo = () => {
    if (readOnly || strokesHistory.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const newHistory = [...strokesHistory];
    const lastState = newHistory.pop();
    setStrokesHistory(newHistory);

    if (lastState) {
      ctx.putImageData(lastState, 0, 0);
      const dataUrl = exportSignatureData(canvas);
      onChange(dataUrl);
    } else {
      handleClear();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (readOnly) return;
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('لطفاً یک فایل تصویری (PNG یا JPG) انتخاب نمایید.');
      return;
    }

    const reader = new FileReader();
    reader.onload = event => {
      const result = event.target?.result as string;
      if (result) {
        const canvas = canvasRef.current;
        if (!canvas) {
          onChange(result);
          return;
        }
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          onChange(result);
          return;
        }

        const img = new Image();
        img.onload = () => {
          const rect = canvas.getBoundingClientRect();
          const width = rect.width || 480;
          const height = rect.height || 180;
          ctx.clearRect(0, 0, width, height);

          const scale = Math.min((width - 20) / img.width, (height - 20) / img.height, 1);
          const x = (width - img.width * scale) / 2;
          const y = (height - img.height * scale) / 2;
          ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
          setHasDrawn(true);
          const dataUrl = exportSignatureData(canvas);
          onChange(dataUrl);
        };
        img.src = result;
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDownload = () => {
    if (!value) return;
    const a = document.createElement('a');
    a.href = value;
    a.download = `signature-${signerName || 'personnel'}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-3 bg-stone-50/80 dark:bg-slate-800/60 p-4 rounded-3xl border border-slate-200 dark:border-slate-700/80">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
            <PenTool size={16} />
          </div>
          <div>
            <label className="text-xs font-black text-stone-800 dark:text-slate-100 flex items-center gap-1.5">
              {label}
              {value && (
                <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 border border-emerald-300 dark:border-emerald-800">
                  <ShieldCheck size={11} />
                  دارای امضای رسمی
                </span>
              )}
            </label>
            <p className="text-[11px] text-stone-500 dark:text-slate-400">
              {helperText}
            </p>
          </div>
        </div>

        {!readOnly && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Color buttons */}
            <div className="flex items-center bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm gap-1">
              <button
                type="button"
                onClick={() => setPenColor('#0f172a')}
                className={`w-5 h-5 rounded-full bg-slate-900 border-2 transition-all ${penColor === '#0f172a' ? 'border-amber-500 scale-110 shadow-sm' : 'border-transparent'}`}
                title="مشکی رسمی"
              />
              <button
                type="button"
                onClick={() => setPenColor('#1d4ed8')}
                className={`w-5 h-5 rounded-full bg-blue-700 border-2 transition-all ${penColor === '#1d4ed8' ? 'border-amber-500 scale-110 shadow-sm' : 'border-transparent'}`}
                title="آبی استاندارد"
              />
              <button
                type="button"
                onClick={() => setPenColor('#0f766e')}
                className={`w-5 h-5 rounded-full bg-teal-700 border-2 transition-all ${penColor === '#0f766e' ? 'border-amber-500 scale-110 shadow-sm' : 'border-transparent'}`}
                title="سبز تیره کارشناسی"
              />
            </div>

            {/* Stroke width */}
            <select
              value={penWidth}
              onChange={e => setPenWidth(Number(e.target.value))}
              className="text-[11px] font-bold px-2 py-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-stone-700 dark:text-slate-200 outline-none cursor-pointer"
            >
              <option value={1.8}>قلم نازک</option>
              <option value={2.5}>قلم متوسط</option>
              <option value={3.5}>قلم ضخیم</option>
            </select>

            {/* Upload Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1.5 bg-white dark:bg-slate-900 hover:bg-stone-100 dark:hover:bg-slate-800 text-stone-700 dark:text-slate-300 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] font-bold flex items-center gap-1 transition-all shadow-sm"
              title="بارگذاری تصویر امضا"
            >
              <Upload size={13} />
              بارگذاری فایل
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png, image/jpeg, image/webp"
              onChange={handleFileUpload}
              className="hidden"
            />

            {/* Undo */}
            <button
              type="button"
              disabled={strokesHistory.length === 0}
              onClick={handleUndo}
              className="p-1.5 text-stone-500 hover:text-stone-800 dark:text-slate-400 dark:hover:text-slate-200 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 disabled:opacity-40 transition-all shadow-sm"
              title="مرحله قبل (Undo)"
            >
              <RotateCcw size={14} />
            </button>

            {/* Clear */}
            <button
              type="button"
              onClick={handleClear}
              className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400 rounded-xl border border-red-200 dark:border-red-800/60 text-[11px] font-bold flex items-center gap-1 transition-all shadow-sm"
              title="پاک کردن بوم"
            >
              <Trash2 size={13} />
              پاک کردن
            </button>
          </div>
        )}
      </div>

      {/* Drawing Canvas Box */}
      <div className="relative rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 overflow-hidden shadow-inner flex items-center justify-center min-h-[170px]">
        {/* Background Grid / Stamp effect */}
        <div 
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(#000 1px, transparent 1px)',
            backgroundSize: '16px 16px'
          }}
        />

        {/* Baseline dotted line */}
        <div className="absolute left-6 right-6 bottom-10 border-b border-dashed border-slate-300 dark:border-slate-700 pointer-events-none flex justify-between items-center text-[9px] text-stone-300 dark:text-slate-700 px-2 font-mono">
          <span>محل درج امضا</span>
          <span>Digital Signature Area</span>
        </div>

        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className={`w-full h-44 cursor-crosshair touch-none ${readOnly ? 'pointer-events-none' : ''}`}
        />

        {!hasDrawn && !value && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-stone-400 dark:text-slate-500 space-y-1">
            <PenTool size={24} className="opacity-40 animate-bounce" />
            <span className="text-xs font-bold">اینجا با قلم امضا کنید یا فایلی را بارگذاری نمایید</span>
            <span className="text-[10px] opacity-70">امضای ترسیم‌شده در فرم‌ها و گردش‌کارهای سیستمی معتبر است</span>
          </div>
        )}
      </div>

      {/* Footer Info & Verification details */}
      <div className="flex items-center justify-between text-[11px] text-stone-500 dark:text-slate-400 px-1 pt-1 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {signatureDate && (
            <span className="font-mono text-stone-600 dark:text-slate-300 bg-stone-100 dark:bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-800">
              تاریخ ثبت: {signatureDate}
            </span>
          )}
          {signerName && (
            <span className="font-bold text-stone-700 dark:text-slate-200">
              صاحب امضا: {signerName}
            </span>
          )}
        </div>

        {value && (
          <button
            type="button"
            onClick={handleDownload}
            className="text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 font-bold"
          >
            <Download size={12} />
            دریافت فایل PNG امضا
          </button>
        )}
      </div>
    </div>
  );
};
