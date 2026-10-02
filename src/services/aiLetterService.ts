import { GoogleGenAI } from '@google/genai';

export interface AiGeneratedLetter {
  subject: string;
  content: string; // HTML format string
}

export interface AiLetterContext {
  letterType?: string;
  scope?: string;
  projectTitle?: string;
  senderOrgName?: string;
  receiverTitle?: string;
  mode?: 'NEW' | 'REPLY';
  incomingLetterNumber?: string;
  incomingLetterDate?: string;
  incomingLetterOrg?: string;
  incomingLetterContent?: string;
  ourStance?: string; // e.g. 'APPROVAL', 'REJECTION', 'TIMELINE_EXTENSION', 'TECHNICAL_EXPLANATION'
}

export const generateLetterWithAI = async (
  prompt: string,
  context?: AiLetterContext
): Promise<AiGeneratedLetter> => {
  const apiKey = (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) || 
                 (import.meta as any).env?.VITE_GEMINI_API_KEY;

  const isReply = context?.mode === 'REPLY' || (context?.incomingLetterContent && context.incomingLetterContent.trim().length > 0);

  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const systemInstruction = `شما یک دستیار هوشمند، فوق‌العاده حرفه‌ای و حقوقی-مهندسی در حوزه مکاتبات اداری و فنی پروژه‌های عمرانی، ساختمانی و زیرساختی ایران هستید.
وظیفه شما نگارش نامه‌های بسیار دقیق، محترمانه، منطبق بر ادبیات رسمی بخشنامه‌ها و شرایط عمومی پیمان (نشریه ۴۳۱۱ و ۵۴۹۰) و ضوابط نظام مهندسی است.

پاسخ شما باید صرفاً یک JSON معتبر باشد و هیچ متن اضافی خارج از JSON تولید نکنید:
{
  "subject": "موضوع دقیق و رسمی نامه",
  "content": "متن کامل نامه با تگ‌های ساختاریافته HTML شامل <p>، <ul>، <li>، <strong> و در صورت لزوم <table>"
}

قواعد نگارش:
۱. ادبیات کاملاً رسمی، فاخر، فنی و حقوقی.
۲. رعایت کامل بندها، پاراگراف‌بندی و فاصله‌گذاری استاندارد.
۳. در نامه‌های پاسخ (عطف به نامه دریافتی)، حتماً در خط اول عبارت «عطف به نامه شماره... مورخ...» با فونت بولد درج شود.
۴. پایان‌بندی با عبارت احترام‌آمیز استاندارد.`;

      let userMessage = '';
      if (isReply) {
        userMessage = `سناریو: تنظیم پاسخ رسمی به نامه دریافتی از سازمان/شرکت دیگر

اطلاعات نامه دریافتی:
- صادرکننده نامه دریافتی: ${context?.incomingLetterOrg || 'سازمان مربوطه'}
- شماره نامه دریافتی: ${context?.incomingLetterNumber || 'مشخص‌نشده'}
- تاریخ نامه دریافتی: ${context?.incomingLetterDate || 'مشخص‌نشده'}
- متن یا خلاصه نامه دریافتی: "${context?.incomingLetterContent || prompt}"

مشخصات نامه پاسخ ما:
- سازمان صادرکننده پاسخ (ما): ${context?.senderOrgName || 'پیمانکار / مشاور'}
- مخاطب نامه پاسخ (گیرنده): ${context?.receiverTitle || 'مدیریت محترم'}
- عنوان پروژه: ${context?.projectTitle || 'پروژه عمرانی'}
- موضع و نکات کلیدی ما در پاسخ: "${context?.ourStance || prompt}"
- دستورات تکمیلی کاربر: "${prompt}"

لطفاً پاسخ رسمی، حقوقی و کارشناسی دقیق بر اساس موضع اعلام‌شده تنظیم کن.`;
      } else {
        userMessage = `سناریو: نگارش نامه جدید عمرانی و اداری

دستور/پرامپت کاربر: "${prompt}"

مشخصات پروژه و نامه:
- نوع نامه: ${context?.letterType || 'فنی/اداری'}
- قلمرو: ${context?.scope === 'INTERNAL' ? 'درون‌سازمانی' : 'برون‌سازمانی'}
- عنوان پروژه: ${context?.projectTitle || 'پروژه عمرانی'}
- صادرکننده: ${context?.senderOrgName || 'پیمانکار / مشاور'}
- گیرنده / مخاطب: ${context?.receiverTitle || 'مدیریت محترم'}

لطفاً نامه رسمی، کامل با ساختار فنی و اداری ایران تولید کن.`;
      }

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: userMessage,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          temperature: 0.25,
        }
      });

      const text = response.text;
      if (text) {
        const parsed = JSON.parse(text);
        if (parsed.subject && parsed.content) {
          return {
            subject: parsed.subject,
            content: parsed.content
          };
        }
      }
    } catch (err) {
      console.warn("Gemini API call failed, using fallback smart generator:", err);
    }
  }

  // Fallback smart generator with rich Persian legal/engineering structure
  const cleanedPrompt = prompt.trim();
  const incNum = context?.incomingLetterNumber || '۱۰۲/پ/۱۴۰۳';
  const incDate = context?.incomingLetterDate || '۱۴۰۳/۰۲/۱۵';
  const incOrg = context?.incomingLetterOrg || 'مشاور / کارفرما';
  const project = context?.projectTitle || 'پروژه عمرانی';

  if (isReply) {
    const replySubject = `پاسخ به نامه شماره ${incNum} مورخ ${incDate} در خصوص ${cleanedPrompt || 'ارزیابی فنی و کارگاهی'}`;
    const replyContent = `
      <p><strong>عطف به نامه شماره ${incNum} مورخ ${incDate}</strong> واصله از سوی ${incOrg} در خصوص موضوع «<em>${context?.incomingLetterContent || cleanedPrompt}</em>»، به استحضار می‌رساند:</p>
      <p>پیرو بررسی‌های جامع کارشناسی و بازدیدهای میدانی به‌عمل‌آمده توسط تیم مهندسی و دفتر فنی پروژه <strong>${project}</strong>، مستندات و ادله فنی مربوطه مورد ارزیابی دقیق قرار گرفت.</p>
      <p>در ارتباط با موارد مطرح‌شده، توجه آن مقام محترم را به نکات ذیل جلب می‌نماید:</p>
      <ul>
        <li><strong>ارزیابی شرایط فنی:</strong> کلیه اقدامات اجرایی مطابق با مشخصات فنی عمومی پیمان، نقشه‌های مصوب و دستورکارهای ابلاغی صورت پذیرفته است.</li>
        <li><strong>تحلیل زمان‌بندی و احجام:</strong> دلایل فنی و مستندات کارگاهی پشتیبان، جهت تسریع در فرآیند جبهه‌های کاری پیوست این نامه گردیده است.</li>
      </ul>
      <p>${cleanedPrompt ? `بر این اساس و پیرو دستور جناب‌عالی مبنی بر «${cleanedPrompt}»، مراتب جهت اتخاذ تصمیم مقتضی و صدور دستورات لازم حضورتان ارسال می‌گردد.` : 'خواهشمند است دستور فرمایند ضمن بررسی مدارک پیوست، نسبت به ابلاغ مصوبه مربوطه اقدام فرمایند.'}</p>
    `.trim();

    return {
      subject: replySubject,
      content: replyContent
    };
  }

  let generatedSubject = cleanedPrompt;
  if (cleanedPrompt.length > 70) {
    generatedSubject = cleanedPrompt.substring(0, 70) + '...';
  }
  if (!generatedSubject.startsWith('اعلام') && !generatedSubject.startsWith('درخواست') && !generatedSubject.startsWith('ارسال')) {
    generatedSubject = 'درخواست / اعلام نظر رسمی در خصوص ' + generatedSubject;
  }

  const generatedContent = `
    <p>احتراماً، پیرو بررسی‌های دقیق کارشناسی و فنی به‌عمل‌آمده در کارگاه و در راستای تحقق اهداف برنامه زمان‌بندی پروژه <strong>${project}</strong>، به استحضار می‌رساند که در خصوص موضوع <strong>«${cleanedPrompt}»</strong> موارد و مستندات مربوطه مورد تدوین قرار گرفت.</p>
    <p>با عنایت به اهمیت موضوع و تاثیر مستقیم آن بر جبهه‌های کاری و ردیف‌های اجرایی مرتبط، خواهشمند است دستور فرمایند ضمن بررسی مدارک، نسبت به اتخاذ تصمیم مقتضی و ابلاغ مصوبه به این واحد اقدام لازم را مبذول دارند.</p>
    <p>پیشاپیش از حسن توجه و همکاری شایسته مدیریت محترم کمال تشکر و امتنان را دارد.</p>
  `.trim();

  return {
    subject: generatedSubject,
    content: generatedContent
  };
};
