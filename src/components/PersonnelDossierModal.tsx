import React from 'react';
import { 
  X, 
  Printer, 
  User, 
  Building2, 
  Briefcase, 
  GraduationCap, 
  Award, 
  FileText, 
  Phone, 
  Mail, 
  Calendar, 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  XCircle,
  PenTool,
  Download,
  Share2,
  Heart,
  BadgeAlert,
  Sparkles
} from 'lucide-react';
import { Personnel } from '../../types';
import { Organization } from '../../systemAdminTypes';

interface PersonnelDossierModalProps {
  isOpen: boolean;
  onClose: () => void;
  personnel: Personnel | null;
  organization?: Organization;
  onEdit?: (p: Personnel) => void;
  canEdit?: boolean;
}

export const PersonnelDossierModal: React.FC<PersonnelDossierModalProps> = ({
  isOpen,
  onClose,
  personnel,
  organization,
  onEdit,
  canEdit = false
}) => {
  if (!isOpen || !personnel) return null;

  const handlePrint = () => {
    window.print();
  };

  const getMaritalStatusLabel = (status?: string) => {
    if (status === 'MARRIED') return 'متأهل';
    if (status === 'SINGLE') return 'مجرد';
    return 'ثبت نشده';
  };

  const getMilitaryStatusLabel = (status?: string) => {
    switch (status) {
      case 'COMPLETED': return 'کارت پایان خدمت';
      case 'PERMANENT_EXEMPTION': return 'معافیت دائم';
      case 'EDUCATIONAL_EXEMPTION': return 'معافیت تحصیلی';
      case 'MEDICAL_EXEMPTION': return 'معافیت پزشکی';
      case 'SUBJECT': return 'مشمول خدمت';
      case 'EXEMPT_FEMALE': return 'عدم شمولیت (بانوان)';
      default: return 'ثبت نشده';
    }
  };

  const getDegreeLabel = (deg?: string) => {
    switch (deg) {
      case 'BELOW_DIPLOMA': return 'زیر دیپلم';
      case 'DIPLOMA': return 'دیپلم';
      case 'ASSOCIATE': return 'کاردانی (فوق دیپلم)';
      case 'BACHELOR': return 'کارشناسی (لیسانس)';
      case 'MASTER': return 'کارشناسی ارشد (فوق لیسانس)';
      case 'DOCTORATE': return 'دکتری تخصصی (PhD)';
      default: return 'ثبت نشده';
    }
  };

  const getSkillLevelBadge = (level: string) => {
    switch (level) {
      case 'EXPERT':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">متخصص / ارشد</span>;
      case 'ADVANCED':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">پیشرفته</span>;
      case 'INTERMEDIATE':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">متوسط</span>;
      case 'BEGINNER':
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-stone-100 text-stone-700 dark:bg-slate-800 dark:text-slate-300">مقدماتی</span>;
    }
  };

  return (
    <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-4xl shadow-2xl animate-scaleIn max-h-[92vh] flex flex-col border border-slate-200 dark:border-slate-800 overflow-hidden print:max-h-none print:shadow-none print:border-none print:m-0 print:p-0">
        
        {/* Modal Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200/80 dark:border-slate-800 bg-stone-50/70 dark:bg-slate-800/50 print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="text-base font-black text-stone-800 dark:text-slate-100">
                شناسنامه جامع و پرونده پرسنلی
              </h2>
              <p className="text-[11px] text-stone-500 dark:text-slate-400 font-mono">
                کد پرسنلی: #{personnel.personnelCode} | سازمان: {organization?.name || '---'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-stone-100 text-stone-700 dark:text-slate-200 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
              title="چاپ رسمی پرونده پرسنلی"
            >
              <Printer size={15} />
              چاپ شناسنامه
            </button>
            {canEdit && onEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(personnel);
                }}
                className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all"
              >
                ویرایش مشخصات
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-stone-400 hover:text-stone-700 dark:hover:text-slate-200 rounded-xl transition-all"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Body / Printable Dossier Content */}
        <div className="p-6 md:p-8 space-y-6 overflow-y-auto print:overflow-visible">
          
          {/* Official Printable Header */}
          <div className="border-b-2 border-stone-800 pb-5 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-right">
              <div className={`w-20 h-20 rounded-3xl flex items-center justify-center font-black text-2xl shadow-md border-2 border-white dark:border-slate-700 ${
                personnel.gender === 'female'
                  ? 'bg-purple-600 text-white'
                  : 'bg-stone-900 text-amber-400'
              }`}>
                {personnel.firstName.slice(0, 1)}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl md:text-2xl font-black text-stone-900 dark:text-white">
                    {personnel.fullName}
                  </h1>
                  {personnel.employmentStatus === 'ACTIVE' && (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      شاغل رسمی
                    </span>
                  )}
                  {personnel.employmentStatus === 'ON_LEAVE' && (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                      مرخصی / تعلیق
                    </span>
                  )}
                  {personnel.employmentStatus === 'TERMINATED' && (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-800">
                      قطع همکاری
                    </span>
                  )}
                </div>
                <div className="text-xs font-bold text-amber-700 dark:text-amber-400 mt-1">
                  {personnel.jobLevel} {personnel.jobTitle ? `— ${personnel.jobTitle}` : ''} ({personnel.department || 'عمومی'})
                </div>
                <div className="text-[11px] text-stone-500 dark:text-slate-400 mt-0.5">
                  {organization?.name ? `سازمان متبوع: ${organization.name}` : ''}
                </div>
              </div>
            </div>

            <div className="text-left font-mono text-xs space-y-1 bg-stone-50 dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
              <div className="flex justify-between gap-4">
                <span className="text-stone-500">کد پرسنلی:</span>
                <span className="font-bold text-stone-800 dark:text-slate-100">#{personnel.personnelCode}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-stone-500">کد ملی:</span>
                <span className="font-bold text-stone-800 dark:text-slate-100">{personnel.nationalCode || '---'}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-stone-500">تاریخ استخدام:</span>
                <span className="font-bold text-stone-800 dark:text-slate-100">{personnel.hireDate || '---'}</span>
              </div>
            </div>
          </div>

          {/* Section 1: مشخصات فردی و شناسنامه‌ای */}
          <div className="space-y-3">
            <h3 className="text-xs font-black text-stone-800 dark:text-slate-200 flex items-center gap-2 border-r-4 border-amber-500 pr-2">
              <User size={15} className="text-amber-500" />
              مشخصات هویتی و شناسنامه‌ای
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 bg-stone-50/60 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 text-xs">
              <div>
                <span className="text-stone-400 dark:text-slate-500 block text-[11px]">نام پدر:</span>
                <span className="font-bold text-stone-800 dark:text-slate-100">{personnel.fatherName || '---'}</span>
              </div>
              <div>
                <span className="text-stone-400 dark:text-slate-500 block text-[11px]">شماره شناسنامه:</span>
                <span className="font-bold font-mono text-stone-800 dark:text-slate-100">{personnel.birthCertificateNumber || '---'}</span>
              </div>
              <div>
                <span className="text-stone-400 dark:text-slate-500 block text-[11px]">جنسیت:</span>
                <span className="font-bold text-stone-800 dark:text-slate-100">{personnel.gender === 'female' ? 'زن' : 'مرد'}</span>
              </div>
              <div>
                <span className="text-stone-400 dark:text-slate-500 block text-[11px]">وضعیت تأهل:</span>
                <span className="font-bold text-stone-800 dark:text-slate-100">{getMaritalStatusLabel(personnel.maritalStatus)}</span>
              </div>
              <div className="col-span-2 sm:col-span-3 md:col-span-4">
                <span className="text-stone-400 dark:text-slate-500 block text-[11px]">وضعیت نظام وظیفه:</span>
                <span className="font-bold text-stone-800 dark:text-slate-100">{getMilitaryStatusLabel(personnel.militaryStatus)}</span>
              </div>
            </div>
          </div>

          {/* Section 2: تحصیلات و دانشگاه */}
          <div className="space-y-3">
            <h3 className="text-xs font-black text-stone-800 dark:text-slate-200 flex items-center gap-2 border-r-4 border-blue-500 pr-2">
              <GraduationCap size={16} className="text-blue-500" />
              سوابق تحصیلی و دانشگاهی
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-blue-50/30 dark:bg-slate-800/40 p-4 rounded-2xl border border-blue-100 dark:border-slate-700/80 text-xs">
              <div>
                <span className="text-stone-400 dark:text-slate-500 block text-[11px]">آخرین مدرک تحصیلی:</span>
                <span className="font-bold text-stone-800 dark:text-slate-100">{getDegreeLabel(personnel.educationDegree)}</span>
              </div>
              <div>
                <span className="text-stone-400 dark:text-slate-500 block text-[11px]">رشته تحصیلی:</span>
                <span className="font-bold text-stone-800 dark:text-slate-100">{personnel.fieldOfStudy || '---'}</span>
              </div>
              <div>
                <span className="text-stone-400 dark:text-slate-500 block text-[11px]">دانشگاه / مؤسسه:</span>
                <span className="font-bold text-stone-800 dark:text-slate-100">{personnel.university || '---'}</span>
              </div>
              <div>
                <span className="text-stone-400 dark:text-slate-500 block text-[11px]">تاریخ فارغ‌التحصیلی:</span>
                <span className="font-bold font-mono text-stone-800 dark:text-slate-100">{personnel.graduationDate || '---'}</span>
              </div>
            </div>
          </div>

          {/* Section 3: سوابق کاری و تجارب شغلی */}
          <div className="space-y-3">
            <h3 className="text-xs font-black text-stone-800 dark:text-slate-200 flex items-center gap-2 border-r-4 border-emerald-500 pr-2">
              <Briefcase size={15} className="text-emerald-500" />
              سوابق کاری و تجارب حرفه‌ای
            </h3>
            {(!personnel.workExperiences || personnel.workExperiences.length === 0) ? (
              <div className="p-4 bg-stone-50 dark:bg-slate-800/40 rounded-2xl text-xs text-stone-400 text-center border border-slate-200/80 dark:border-slate-700">
                سوابق کاری ثبت نشده است.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
                <table className="w-full text-right text-xs">
                  <thead className="bg-stone-100 dark:bg-slate-800 text-stone-600 dark:text-slate-300">
                    <tr>
                      <th className="p-3 font-bold w-12 text-center">#</th>
                      <th className="p-3 font-bold">سمت / شغل</th>
                      <th className="p-3 font-bold">نام شرکت / کارفرما / پروژه</th>
                      <th className="p-3 font-bold">دوره اشتغال</th>
                      <th className="p-3 font-bold">شرح وظایف و دستاوردها</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {personnel.workExperiences.map((exp, idx) => (
                      <tr key={exp.id || idx} className="hover:bg-stone-50/60 dark:hover:bg-slate-800/30">
                        <td className="p-3 text-center font-mono text-stone-400">{idx + 1}</td>
                        <td className="p-3 font-bold text-stone-800 dark:text-slate-100">{exp.jobTitle}</td>
                        <td className="p-3 text-stone-600 dark:text-slate-300">{exp.companyName}</td>
                        <td className="p-3 font-mono text-stone-500 text-[11px]">
                          {exp.startDate || '---'} تا {exp.endDate || 'در حال اشتغال'}
                        </td>
                        <td className="p-3 text-stone-600 dark:text-slate-400 text-[11px] leading-relaxed">
                          {exp.description || '---'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section 4: مهارت‌ها و تخصص‌ها */}
          <div className="space-y-3">
            <h3 className="text-xs font-black text-stone-800 dark:text-slate-200 flex items-center gap-2 border-r-4 border-indigo-500 pr-2">
              <Award size={15} className="text-indigo-500" />
              مهارت‌ها، تخصص‌ها و گواهی‌ها
            </h3>
            {(!personnel.skills || personnel.skills.length === 0) ? (
              <div className="p-4 bg-stone-50 dark:bg-slate-800/40 rounded-2xl text-xs text-stone-400 text-center border border-slate-200/80 dark:border-slate-700">
                مهارت یا تخصصی ثبت نشده است.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {personnel.skills.map((sk, idx) => (
                  <div key={sk.id || idx} className="p-3 bg-stone-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-xs text-stone-800 dark:text-slate-100 flex items-center gap-1.5">
                        <Sparkles size={13} className="text-amber-500" />
                        {sk.title}
                      </div>
                      {sk.description && (
                        <div className="text-[11px] text-stone-500 dark:text-slate-400 mt-1">
                          {sk.description}
                        </div>
                      )}
                    </div>
                    {getSkillLevelBadge(sk.level)}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 5: اطلاعات تماس و امضای الکترونیکی رسمی */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            
            {/* Contact Details */}
            <div className="bg-stone-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
              <h4 className="font-black text-stone-800 dark:text-slate-200 mb-2">اطلاعات ارتباطی</h4>
              <div className="flex items-center gap-2 text-stone-600 dark:text-slate-300">
                <Phone size={14} className="text-stone-400" />
                <span>شماره همراه:</span>
                <span className="font-bold font-mono dir-ltr">{personnel.mobile || '---'}</span>
              </div>
              <div className="flex items-center gap-2 text-stone-600 dark:text-slate-300">
                <Mail size={14} className="text-stone-400" />
                <span>پست الکترونیک:</span>
                <span className="font-mono text-[11px]">{personnel.email || '---'}</span>
              </div>
              {personnel.notes && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 text-stone-500 text-[11px]">
                  <span className="font-bold block mb-1">یادداشت:</span>
                  {personnel.notes}
                </div>
              )}
            </div>

            {/* Official Electronic Signature Card */}
            <div className="bg-white dark:bg-slate-950 p-4 rounded-2xl border-2 border-stone-300 dark:border-slate-700 flex flex-col justify-between items-center text-center relative overflow-hidden">
              <div className="w-full flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2 mb-2">
                <span className="text-[11px] font-black text-stone-700 dark:text-slate-200 flex items-center gap-1">
                  <PenTool size={13} className="text-amber-500" />
                  امضای الکترونیکی معتبر پرسنل
                </span>
                {personnel.signature ? (
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <ShieldCheck size={11} />
                    تأییدشده در سامانه
                  </span>
                ) : (
                  <span className="text-[10px] bg-stone-100 text-stone-600 font-bold px-2 py-0.5 rounded-full">
                    فاقد امضا
                  </span>
                )}
              </div>

              <div className="my-2 min-h-[90px] flex items-center justify-center w-full">
                {personnel.signature ? (
                  <img
                    src={personnel.signature}
                    alt={`امضای ${personnel.fullName}`}
                    className="max-h-24 max-w-full object-contain filter dark:invert"
                  />
                ) : (
                  <div className="text-stone-300 dark:text-slate-600 text-xs italic">
                    امضای الکترونیکی ثبت نشده است.
                  </div>
                )}
              </div>

              <div className="w-full border-t border-dashed border-slate-200 dark:border-slate-800 pt-2 text-[10px] text-stone-400 flex justify-between items-center">
                <span>{personnel.fullName}</span>
                <span>{personnel.signatureDate ? `تاریخ ثبت: ${personnel.signatureDate}` : 'امضای دیجیتال ثبت‌شده در پرونده'}</span>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
