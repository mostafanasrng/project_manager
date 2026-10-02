
import React, { useState, useEffect } from 'react';
import { User, Lock, ArrowRight, ShieldCheck, Building2, BarChart3, Calculator, HardHat, FileText, AlertCircle } from 'lucide-react';
import { SystemAdminService } from '../services/systemAdminService';

interface LoginProps {
  onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotData, setForgotData] = useState({ username: '', fullName: '', securityCode: '', newPass: '', confirmPass: '' });
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');

  useEffect(() => {
    const savedError = localStorage.getItem('login_error');
    if (savedError) {
      setErrorMessage(savedError);
      localStorage.removeItem('login_error');
    }
  }, []);

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');

    if (forgotData.newPass !== forgotData.confirmPass) {
      setForgotError('تکرار رمز عبور مطابقت ندارد.');
      return;
    }

    if (forgotData.newPass.length < 4) {
      setForgotError('رمز عبور باید حداقل ۴ کاراکتر باشد.');
      return;
    }

    try {
      SystemAdminService.verifyAndResetPassword(forgotData.username, forgotData.fullName, forgotData.securityCode, forgotData.newPass);
      setForgotSuccess('رمز عبور با موفقیت تغییر کرد. اکنون می‌توانید وارد شوید.');
      setTimeout(() => {
        setShowForgotModal(false);
        setForgotData({ username: '', fullName: '', securityCode: '', newPass: '', confirmPass: '' });
        setForgotSuccess('');
      }, 3000);
    } catch (err: any) {
      setForgotError(err.message || 'خطایی رخ داد.');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      
      const users = SystemAdminService.getUsers();
      const foundUser = users.find(u => u.username === username);
      
      if (username === 'admin' && password === 'admin') {
        localStorage.setItem('user_role', 'SYSTEM_ADMIN');
        localStorage.setItem('current_username', 'admin');
        localStorage.removeItem('user_org_id');
        SystemAdminService.addAuditLog({
          user: 'admin',
          action: 'LOGIN',
          details: 'ورود موفق مدیر کل سیستم (admin) به سامانه',
          source: 'احراز هویت و ورود',
          sourceType: 'AUTH'
        });
        onLogin();
      } else if (foundUser && foundUser.password === password) {
        if (foundUser.isActive === false) {
          setErrorMessage('حساب کاربری شما غیرفعال شده است. لطفاً با مدیر سیستم تماس بگیرید.');
          return;
        }
        localStorage.setItem('current_username', foundUser.username);
        if (foundUser.role === 'ORG_ADMIN' || foundUser.role === 'ORG_MANAGER' || foundUser.role === 'ORG_USER') {
            localStorage.setItem('user_role', foundUser.role);
            localStorage.setItem('user_org_id', foundUser.orgId);
        } else {
            localStorage.setItem('user_role', foundUser.role || 'USER');
            localStorage.removeItem('user_org_id');
        }
        SystemAdminService.addAuditLog({
          user: foundUser.username,
          action: 'LOGIN',
          details: `ورود موفق کاربر ${foundUser.fullName || foundUser.username} (${foundUser.username}) به سامانه`,
          source: 'احراز هویت و ورود',
          sourceType: 'AUTH'
        });
        onLogin();
      } else {
        setErrorMessage('نام کاربری یا رمز عبور اشتباه است.');
      }
    }, 1200);
  };

  const features = [
    { icon: <Calculator size={20} />, text: 'مدیریت جامع دفتر فنی و صورت‌وضعیت' },
    { icon: <BarChart3 size={20} />, text: 'گزارش‌گیری پیشرفته و داشبورد مدیریتی' },
    { icon: <HardHat size={20} />, text: 'کنترل پروژه، ایمنی و ماشین‌آلات' },
    { icon: <FileText size={20} />, text: 'آرشیو مستندات و نقشه‌های اجرایی' },
  ];

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#faf8f4] font-['Vazirmatn']" dir="rtl">
      
      {/* Right Section: Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-24 relative bg-[#faf8f4]">
         <div className="w-full max-w-md space-y-8 animate-fadeIn">
            <div className="text-center lg:text-right space-y-2">
              <div className="w-16 h-16 bg-[#ffc745] rounded-3xl flex items-center justify-center text-stone-950 shadow-sm border border-gold-500/30 mb-6 mx-auto lg:mx-0">
                <ShieldCheck size={32} />
              </div>
              <h1 className="text-3xl font-black text-stone-900 tracking-tight">خوش آمدید</h1>
              <p className="text-stone-500 text-sm font-bold">لطفاً برای ورود به پنل، نام کاربری و رمز عبور خود را وارد کنید.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {errorMessage && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-3 text-sm font-bold border border-red-100 animate-fadeIn">
                  <AlertCircle size={20} className="shrink-0" />
                  <p>{errorMessage}</p>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-black text-stone-700 block">نام کاربری</label>
                <div className="relative group">
                  <User className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-stone-900 transition-colors" size={20} />
                  <input
                    required
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="کد ملی یا نام کاربری"
                    className="w-full pr-12 pl-4 py-4 bg-[#efe8db]/50 border border-[#e5ded0] rounded-2xl focus:outline-none focus:ring-4 focus:ring-gold-400/10 focus:bg-white focus:border-gold-400 transition-all text-sm font-bold text-stone-800"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-black text-stone-700">رمز عبور</label>
                  <button 
                    type="button" 
                    onClick={() => setShowForgotModal(true)}
                    className="text-xs text-amber-600 font-black hover:underline"
                  >
                    فراموشی رمز عبور؟
                  </button>
                </div>
                <div className="relative group">
                  <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-stone-900 transition-colors" size={20} />
                  <input
                    required
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pr-12 pl-4 py-4 bg-[#efe8db]/50 border border-[#e5ded0] rounded-2xl focus:outline-none focus:ring-4 focus:ring-gold-400/10 focus:bg-white focus:border-gold-400 transition-all text-sm font-bold text-stone-800"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" id="remember" className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer" />
                <label htmlFor="remember" className="text-xs text-stone-600 font-bold cursor-pointer">مرا به خاطر بسپار</label>
              </div>

              <button
                disabled={isLoading}
                type="submit"
                className={`w-full py-4 rounded-2xl font-black text-stone-950 shadow-sm border border-gold-500/30 flex items-center justify-center gap-2 transition-all active:scale-95 ${
                  isLoading ? 'bg-gold-400/50 cursor-not-allowed' : 'bg-[#ffc745] hover:scale-[1.01]'
                }`}
              >
                {isLoading ? (
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span className="text-base">ورود به حساب کاربری</span>
                    <ArrowRight size={20} className="rotate-180" />
                  </>
                )}
              </button>
            </form>

            <p className="text-center text-xs text-slate-400 font-medium pt-4 border-t border-slate-100">
              © ۱۴۰۳ سامانه جامع مدیریت پروژه. تمامی حقوق محفوظ است.
            </p>
         </div>
      </div>

      {/* Left Section: Info & Features */}
      <div className="hidden lg:flex w-1/2 bg-stone-900 relative overflow-hidden items-center justify-center p-12 text-white text-right">
         <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-amber-500/50 rounded-full blur-[120px]"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-stone-500/50 rounded-full blur-[120px]"></div>
         </div>
         
         <div className="relative z-10 max-w-lg space-y-10">
            <div className="w-20 h-20 bg-white/10 backdrop-blur-lg rounded-3xl flex items-center justify-center text-blue-400 border border-white/10 shadow-2xl">
              <Building2 size={40} />
            </div>
            
            <div className="space-y-4">
               <h2 className="text-4xl font-black tracking-tight leading-tight">
                  مدیریت هوشمند<br/>
                  <span className="text-blue-400">پروژه‌های عمرانی</span>
               </h2>
               <p className="text-slate-300 text-lg leading-relaxed font-medium">
                  سامانه یکپارچه برنامه‌ریزی، کنترل و مدیریت اطلاعات پروژه برای پیمانکاران، مشاوران و کارفرمایان.
               </p>
            </div>

            <div className="space-y-4 bg-white/5 p-6 rounded-3xl border border-white/5 backdrop-blur-sm">
               {features.map((feature, idx) => (
                 <div key={idx} className="flex items-center gap-4 text-slate-200">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center text-blue-300 shrink-0 border border-amber-500/10">
                       {feature.icon}
                    </div>
                    <span className="text-sm font-bold">{feature.text}</span>
                 </div>
               ))}
            </div>

            <div className="flex items-center gap-2 text-xs text-stone-500 font-bold opacity-60">
               <span className="px-3 py-1 bg-white/5 rounded-full border border-white/5">نسخه ۵.۹.۰</span>
               <span>بروزرسانی شده در اسفند ۱۴۰۳</span>
            </div>
         </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={() => setShowForgotModal(false)}></div>
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-slideUp">
            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-stone-800">فراموشی رمز عبور</h3>
                <button onClick={() => setShowForgotModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <ArrowRight size={20} className="text-slate-400 rotate-180" />
                </button>
              </div>

              <form onSubmit={handleForgotSubmit} className="space-y-4">
                {forgotError && (
                  <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-bold border border-red-100 flex items-center gap-2">
                    <AlertCircle size={16} />
                    {forgotError}
                  </div>
                )}
                {forgotSuccess && (
                  <div className="bg-green-50 text-green-600 p-4 rounded-2xl text-xs font-bold border border-green-100 flex items-center gap-2">
                    <ShieldCheck size={16} />
                    {forgotSuccess}
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-500 pr-2">نام کاربری (کد ملی)</label>
                  <input
                    required
                    type="text"
                    value={forgotData.username}
                    onChange={(e) => setForgotData({ ...forgotData, username: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-amber-500/10 focus:bg-white transition-all text-sm font-bold"
                    placeholder="نام کاربری خود را وارد کنید"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-500 pr-2">نام و نام خانوادگی کامل</label>
                  <input
                    required
                    type="text"
                    value={forgotData.fullName}
                    onChange={(e) => setForgotData({ ...forgotData, fullName: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-amber-500/10 focus:bg-white transition-all text-sm font-bold"
                    placeholder="مطابق با اطلاعات ثبت شده در سیستم"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-500 pr-2">رمز دو مرحله‌ای (کد امنیتی)</label>
                  <input
                    required
                    type="text"
                    value={forgotData.securityCode}
                    onChange={(e) => setForgotData({ ...forgotData, securityCode: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-amber-500/10 focus:bg-white transition-all text-sm font-bold text-center dir-ltr"
                    placeholder="کد ثبت شده توسط مدیر"
                  />
                </div>

                <div className="space-y-1 pt-2 border-t border-slate-50">
                  <label className="text-xs font-bold text-stone-500 pr-2">رمز عبور جدید</label>
                  <input
                    required
                    type="password"
                    value={forgotData.newPass}
                    onChange={(e) => setForgotData({ ...forgotData, newPass: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-amber-500/10 focus:bg-white transition-all text-sm font-bold"
                    placeholder="••••••••"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-500 pr-2">تکرار رمز عبور جدید</label>
                  <input
                    required
                    type="password"
                    value={forgotData.confirmPass}
                    onChange={(e) => setForgotData({ ...forgotData, confirmPass: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-amber-500/10 focus:bg-white transition-all text-sm font-bold"
                    placeholder="••••••••"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-4 bg-amber-600 hover:bg-stone-900 text-white rounded-2xl font-black shadow-lg shadow-amber-500/20 transition-all active:scale-95 mt-4"
                >
                  تغییر رمز عبور
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
