import React, { useRef, useState, useEffect } from 'react';
import { 
  X, 
  PenTool, 
  Upload, 
  Trash2, 
  CheckCircle2, 
  ShieldCheck, 
  Sparkles, 
  RotateCcw, 
  FileCheck,
  UserCheck,
  Download
} from 'lucide-react';
import { SystemUser } from '../../../systemAdminTypes';
import { SystemAdminService } from '../../../services/systemAdminService';
import { HRService } from '../../../services/hrService';

interface TechnicalOfficeSignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: SystemUser | null;
  onSignatureUpdated?: (newSignature: string | undefined) => void;
}

export const TechnicalOfficeSignatureModal: React.FC<TechnicalOfficeSignatureModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSignatureUpdated
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [penColor, setPenColor] = useState('#1e40af'); // Default dark blue ink
  const [penWidth, setPenWidth] = useState(2.5);
  const [activeTab, setActiveTab] = useState<'draw' | 'upload'>('draw');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [currentSignature, setCurrentSignature] = useState<string | undefined>(undefined);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Initialize current user signature
  useEffect(() => {
    if (isOpen && currentUser) {
      const sig = HRService.getUserSignature(currentUser) || currentUser.signature;
      setCurrentSignature(sig);
      setUploadedImage(null);
      setHasDrawn(false);
      setSavedSuccess(false);
      
      // Setup canvas on next tick
      setTimeout(() => {
        initCanvas();
      }, 100);
    }
  }, [isOpen, currentUser]);

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Support high DPI
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = penColor;
    ctx.lineWidth = penWidth;
    ctx.clearRect(0, 0, rect.width, rect.height);
  };

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = penColor;
    ctx.lineWidth = penWidth;
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    setHasDrawn(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('لطفاً یک فایل تصویری (PNG یا JPG) انتخاب نمایید.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setUploadedImage(result);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveSignature = () => {
    if (!currentUser) return;

    let finalSignature: string | undefined = undefined;

    if (activeTab === 'draw') {
      const canvas = canvasRef.current;
      if (!canvas || !hasDrawn) {
        alert('لطفاً ابتدا امضای خود را در کادر رسم نمایید.');
        return;
      }
      finalSignature = canvas.toDataURL('image/png');
    } else if (activeTab === 'upload') {
      if (!uploadedImage) {
        alert('لطفاً ابتدا تصویر امضای خود را بارگذاری نمایید.');
        return;
      }
      finalSignature = uploadedImage;
    }

    if (!finalSignature) return;

    try {
      // 1. Update user in SystemAdminService
      const users = SystemAdminService.getUsers();
      const updatedUser = {
        ...currentUser,
        signature: finalSignature,
        signatureDate: new Date().toLocaleDateString('fa-IR')
      };
      SystemAdminService.saveUser(updatedUser);

      // 2. Synchronize with HR Personnel record if linked
      const personnelList = HRService.getPersonnelList();
      const linkedPersonnel = personnelList.find(p => p.userId === currentUser.id || p.id === currentUser.personnelId);
      if (linkedPersonnel) {
        linkedPersonnel.signature = finalSignature;
        linkedPersonnel.signatureDate = new Date().toLocaleDateString('fa-IR');
        HRService.savePersonnel(linkedPersonnel);
      }

      // 3. Update local state
      setCurrentSignature(finalSignature);
      setSavedSuccess(true);

      if (onSignatureUpdated) {
        onSignatureUpdated(finalSignature);
      }

      SystemAdminService.addAuditLog({
        user: currentUser.id,
        action: 'UPDATE_SIGNATURE',
        details: `ثبت و بروزرسانی امضای الکترونیکی کاربر ${currentUser.fullName || currentUser.username} برای استفاده در دفتر فنی`,
        source: 'دفتر فنی (امضای الکترونیکی)',
        sourceType: 'TECHNICAL'
      });

      setTimeout(() => {
        setSavedSuccess(false);
      }, 3000);
    } catch (err: any) {
      alert('خطا در ذخیره امضای الکترونیکی: ' + err.message);
    }
  };

  const handleRemoveSignature = () => {
    if (!currentUser) return;
    if (!confirm('آیا از حذف امضای الکترونیکی ثبت‌شده خود اطمینان دارید؟')) return;

    try {
      // 1. Update user
      const updatedUser = {
        ...currentUser,
        signature: undefined,
        signatureDate: undefined
      };
      SystemAdminService.saveUser(updatedUser);

      // 2. Synchronize with HR Personnel
      const personnelList = HRService.getPersonnelList();
      const linkedPersonnel = personnelList.find(p => p.userId === currentUser.id || p.id === currentUser.personnelId);
      if (linkedPersonnel) {
        linkedPersonnel.signature = undefined;
        linkedPersonnel.signatureDate = undefined;
        HRService.savePersonnel(linkedPersonnel);
      }

      setCurrentSignature(undefined);
      clearCanvas();
      setUploadedImage(null);

      if (onSignatureUpdated) {
        onSignatureUpdated(undefined);
      }

      alert('امضای الکترونیکی شما با موفقیت حذف گردید.');
    } catch (err: any) {
      alert('خطا در حذف امضا: ' + err.message);
    }
  };

  if (!isOpen) return null;

  const userDisplayName = currentUser ? (currentUser.fullName || currentUser.username) : 'کاربر';
  const userRoleTitle = currentUser?.jobTitle || currentUser?.jobLevel || currentUser?.role || 'کارشناس دفتر فنی';
  const userOrg = currentUser?.orgId ? SystemAdminService.getOrganization(currentUser.orgId) : undefined;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fadeIn" dir="rtl">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 bg-slate-900 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <PenTool size={20} />
            </div>
            <div>
              <h3 className="font-black text-base text-white flex items-center gap-2">
                مدیریت امضای الکترونیکی کاربر
                <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full font-bold border border-blue-400/30">
                  دفتر فنی و اسناد
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">
                ثبت و الصاق خودکار امضای دیجیتال در صورت‌جلسات، صورت وضعیت‌ها و گزارش‌های رسمی
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
          {/* User Info Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-sm border border-blue-100">
                <UserCheck size={22} />
              </div>
              <div>
                <div className="text-sm font-black text-slate-800">{userDisplayName}</div>
                <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                  <span>{userRoleTitle}</span>
                  {userOrg && (
                    <>
                      <span className="text-slate-300">•</span>
                      <span className="text-blue-600 font-bold">{userOrg.name}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div>
              {currentSignature ? (
                <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-xl border border-emerald-200 text-xs font-bold">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  <span>دارای امضای فعال</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 bg-amber-50 text-amber-700 px-3 py-1.5 rounded-xl border border-amber-200 text-xs font-bold">
                  <ShieldCheck size={16} className="text-amber-600" />
                  <span>فاقد امضای ثبت‌شده</span>
                </div>
              )}
            </div>
          </div>

          {/* Active Signature Preview */}
          {currentSignature && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                  <ShieldCheck size={16} className="text-blue-600" />
                  پیش‌نمایش امضای الکترونیکی ثبت‌شده فعلی شما:
                </span>
                <button
                  type="button"
                  onClick={handleRemoveSignature}
                  className="text-rose-600 hover:text-rose-700 text-xs font-bold flex items-center gap-1 hover:bg-rose-50 px-2.5 py-1 rounded-lg transition-colors"
                >
                  <Trash2 size={14} />
                  حذف امضا
                </button>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-center min-h-[90px] relative overflow-hidden">
                <img
                  src={currentSignature}
                  alt="امضای الکترونیکی"
                  className="max-h-20 max-w-full object-contain filter contrast-125"
                />
                <div className="absolute bottom-1.5 left-2 text-[9px] text-slate-400 font-mono">
                  تایید سیستمی همیار ✓
                </div>
              </div>
            </div>
          )}

          {/* New Signature Creator */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-black text-sm text-slate-800">
                {currentSignature ? 'تعویض / ترسیم امضای جدید' : 'ثبت امضای الکترونیکی جدید'}
              </h4>
              <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('draw')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeTab === 'draw'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <PenTool size={14} />
                  رسم با قلم / لمس
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('upload')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeTab === 'upload'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Upload size={14} />
                  بارگذاری تصویر
                </button>
              </div>
            </div>

            {activeTab === 'draw' ? (
              <div className="space-y-3">
                {/* Canvas Tools */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-bold">رنگ قلم:</span>
                    <button
                      type="button"
                      onClick={() => setPenColor('#1e40af')}
                      className={`w-6 h-6 rounded-full bg-blue-800 border-2 transition-transform ${
                        penColor === '#1e40af' ? 'border-amber-500 scale-110' : 'border-transparent'
                      }`}
                      title="آبی نفتی رسمی"
                    />
                    <button
                      type="button"
                      onClick={() => setPenColor('#0f172a')}
                      className={`w-6 h-6 rounded-full bg-slate-900 border-2 transition-transform ${
                        penColor === '#0f172a' ? 'border-amber-500 scale-110' : 'border-transparent'
                      }`}
                      title="مشکی اداری"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={clearCanvas}
                    className="text-slate-500 hover:text-rose-600 text-xs font-bold flex items-center gap-1 hover:bg-slate-100 px-2 py-1 rounded-lg transition-colors"
                  >
                    <RotateCcw size={14} />
                    پاک کردن کادر
                  </button>
                </div>

                {/* Canvas Drawing Area */}
                <div className="border-2 border-dashed border-slate-300 rounded-2xl bg-white relative overflow-hidden shadow-inner touch-none">
                  <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full h-44 cursor-crosshair block"
                  />
                  {!hasDrawn && (
                    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-slate-400 space-y-1">
                      <PenTool size={24} className="opacity-40" />
                      <span className="text-xs font-bold">با ماوس یا لمس انگشت در این کادر امضا کنید</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center bg-slate-50 hover:bg-slate-100/60 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    id="signature-upload-input"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <label
                    htmlFor="signature-upload-input"
                    className="cursor-pointer flex flex-col items-center justify-center space-y-2"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Upload size={24} />
                    </div>
                    <div className="text-xs font-black text-slate-700">
                      انتخاب فایل تصویر امضا (PNG، JPG)
                    </div>
                    <div className="text-[11px] text-slate-400">
                      ترجیحاً تصویر با پس‌زمینه شفاف یا سفید واضح باشد
                    </div>
                  </label>
                </div>

                {uploadedImage && (
                  <div className="p-4 bg-white rounded-xl border border-slate-200 flex flex-col items-center gap-2">
                    <span className="text-xs font-bold text-slate-600">پیش‌نمایش تصویر بارگذاری شده:</span>
                    <img
                      src={uploadedImage}
                      alt="امضای بارگذاری شده"
                      className="max-h-24 max-w-full object-contain filter contrast-125"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Legal / Usage Notice */}
          <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-4 text-xs text-blue-900 leading-relaxed space-y-1.5">
            <div className="font-black flex items-center gap-1.5 text-blue-800">
              <FileCheck size={16} />
              اثر حقوقی و نحوه استفاده در سامانه:
            </div>
            <p className="text-slate-600 text-[11px]">
              با ثبت این امضا، در کلیه فرم‌های خروجی رسمی دفتر فنی شامل صورت‌جلسات کارگاهی، صورت‌وضعیت‌ها، مجوزهای کار، کنترل مغایرت و گردش کار، امضای الکترونیکی شما به همراه نام و سمت تشکیلاتی‌تان درج می‌گردد.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-white border-t border-slate-200 flex justify-between items-center">
          <div>
            {savedSuccess && (
              <span className="text-xs font-black text-emerald-600 flex items-center gap-1.5 animate-fadeIn">
                <CheckCircle2 size={16} />
                امضای الکترونیکی با موفقیت ذخیره شد!
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-colors"
            >
              بستن
            </button>
            <button
              type="button"
              onClick={handleSaveSignature}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-black shadow-lg shadow-blue-600/20 flex items-center gap-2 transition-all"
            >
              <ShieldCheck size={16} />
              ذخیره و ثبت رسمی امضا
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
