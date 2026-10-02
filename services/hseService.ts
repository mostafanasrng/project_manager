import { 
  WorkPermit, 
  IncidentReport, 
  EnvironmentalReport, 
  WeeklyMonthlyHseReport, 
  HsePlan, 
  PermitType, 
  PermitChecklistItem,
  CustomPermitType,
  PermitChecklistTemplateItem,
  PERMIT_TYPE_LABELS
} from '../types/hse';
import { WorkflowStatus } from '../types';

const STORAGE_KEYS = {
  WORK_PERMITS: 'hamyar_hse_work_permits',
  INCIDENTS: 'hamyar_hse_incidents',
  ENVIRONMENTAL: 'hamyar_hse_environmental',
  PERIODIC_REPORTS: 'hamyar_hse_periodic_reports',
  HSE_PLANS: 'hamyar_hse_plans',
  PERMIT_TYPES: 'hamyar_hse_permit_types',
  PERMIT_CHECKLISTS: 'hamyar_hse_permit_checklists'
};

export const DEFAULT_CUSTOM_PERMIT_TYPES: CustomPermitType[] = [
  {
    code: 'HOT_WORK',
    label: 'کار گرم و شعله‌باز (Hot Work)',
    description: 'عملیات جوشکاری، برشکاری، فرزکاری و حرارتی در مجاورت مواد قابل اشتعال',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
    requiresGasTest: true,
    requiresFireWatch: true,
    requiresIsolation: true,
    isSystemDefault: true,
    defaultPpe: ['کلاه ایمنی استاندارد', 'کفش ایمنی پنجه فولادی', 'عینک ایمنی و شیلد محافظ', 'دستکش چرمی نسوز']
  },
  {
    code: 'HEIGHT_WORK',
    label: 'کار در ارتفاع (Working at Height)',
    description: 'فعالیت در تراز ارتفاعی بالای ۲ متر، داربست‌بندی، کلایمر و سکوهای معلق',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
    requiresGasTest: false,
    requiresFireWatch: false,
    requiresIsolation: false,
    isSystemDefault: true,
    defaultPpe: ['کلاه ایمنی استاندارد', 'کمربند ایمنی و هارنس کامل (Full Body)', 'کفش ایمنی پنجه فولادی']
  },
  {
    code: 'CONFINED_SPACE',
    label: 'فضای بسته و محبوس (Confined Space)',
    description: 'ورود به چاه‌ها، مخازن، کانال‌های سرپوشیده و فضاهای فاقد تهویه طبیعی',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
    requiresGasTest: true,
    requiresFireWatch: true,
    requiresIsolation: true,
    isSystemDefault: true,
    defaultPpe: ['کلاه ایمنی استاندارد', 'ماسک تنفسی با فیلتر گاز و ذرات', 'کمربند ایمنی و هارنس کامل (Full Body)']
  },
  {
    code: 'EXCAVATION',
    label: 'گودبرداری و کانال‌کنی (Excavation)',
    description: 'حفاری، گودبرداری، نیلینگ و خاکبرداری مکانیکی یا دستی',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    requiresGasTest: false,
    requiresFireWatch: false,
    requiresIsolation: true,
    isSystemDefault: true,
    defaultPpe: ['کلاه ایمنی استاندارد', 'کفش ایمنی پنجه فولادی', 'جلیقه شبرنگ ایمنی', 'گوشی و ایرماف صداگیر']
  },
  {
    code: 'ELECTRICAL_LOTO',
    label: 'برق و قفل‌گذاری (Electrical & LOTO)',
    description: 'تعمیرات تابلوهای برق، کابل‌کشی فشار قوی و قفل‌گذاری انفرادی (LOTO)',
    badgeColor: 'bg-red-100 text-red-800 border-red-300',
    requiresGasTest: false,
    requiresFireWatch: false,
    requiresIsolation: true,
    isSystemDefault: true,
    defaultPpe: ['کلاه ایمنی عایق برق', 'کفش ایمنی عایق برق', 'دستکش عایق فشار ضعیف/قوی', 'شیلد محافظ صورت']
  },
  {
    code: 'LIFTING',
    label: 'باربرداری سنگین و جرثقیل (Lifting)',
    description: 'عملیات جابجایی بار با جرثقیل، تاورکرین و تاپ‌لاین‌های کارگاهی',
    badgeColor: 'bg-orange-100 text-orange-800 border-orange-300',
    requiresGasTest: false,
    requiresFireWatch: false,
    requiresIsolation: false,
    isSystemDefault: true,
    defaultPpe: ['کلاه ایمنی استاندارد', 'کفش ایمنی پنجه فولادی', 'جلیقه شبرنگ ایمنی', 'دستکش کار محکم']
  },
  {
    code: 'NIGHT_WORK',
    label: 'کار در شب و شیفت شبانه (Night Work)',
    description: 'فعالیت‌های اجرایی و پشتیبانی در ساعات تاریکی و شیفت‌های شبانه',
    badgeColor: 'bg-slate-100 text-slate-800 border-slate-300',
    requiresGasTest: false,
    requiresFireWatch: false,
    requiresIsolation: false,
    isSystemDefault: true,
    defaultPpe: ['کلاه ایمنی استاندارد', 'جلیقه شبرنگ ایمنی', 'چراغ‌قوه پیشانی']
  },
  {
    code: 'CHEMICAL',
    label: 'مواد شیمیایی و خطرناک (Chemical/Hazardous)',
    description: 'جابجایی، تزریق و انبارداری مواد شیمیایی، اسیدها، حلال‌ها و گازها',
    badgeColor: 'bg-teal-100 text-teal-800 border-teal-300',
    requiresGasTest: true,
    requiresFireWatch: false,
    requiresIsolation: true,
    isSystemDefault: true,
    defaultPpe: ['کلاه ایمنی استاندارد', 'لباس ضد اسید و مواد شیمیایی', 'دستکش نیتریل بلند', 'عینک و شیلد محافظ']
  },
  {
    code: 'GENERAL_COLD',
    label: 'کار عمومی و سرد (General Cold Work)',
    description: 'عملیات اجرایی فاقد خطر حرارتی یا جرقه شامل آرماتوربندی، قالب‌بندی و بتن‌ریزی',
    badgeColor: 'bg-stone-100 text-stone-800 border-stone-300',
    requiresGasTest: false,
    requiresFireWatch: false,
    requiresIsolation: false,
    isSystemDefault: true,
    defaultPpe: ['کلاه ایمنی استاندارد', 'کفش ایمنی پنجه فولادی', 'جلیقه شبرنگ ایمنی']
  }
];

export const DEFAULT_PERMIT_CHECKLISTS: Record<PermitType, { question: string }[]> = {
  HOT_WORK: [
    { question: 'بررسی و پاکسازی مواد قابل اشتعال در شعاع ۱۱ متری (۳۵ فوت) محل کار' },
    { question: 'استقرار حداقل ۲ دستگاه کپسول اطفاء حریق پودر و گاز ۶ کیلویی و CO2 شارژ شده و معتبر در محل' },
    { question: 'استقرار دیده‌بان حریق (Fire Watch) آموزش‌دیده در طول عملیات و تا ۳۰ دقیقه پس از اتمام کار' },
    { question: 'استقرار پرده یا پتوی نسوز بر روی تجهیزات مجاور و مسیرهای پرتاب جرقه' },
    { question: 'بازرسی و تایید سلامت کابل‌های جوشکاری، اتصالات برقی و شیلنگ‌های هوابرش بدون هیچ‌گونه نشتی' },
    { question: 'استفاده از شیر یک‌طرفه (Flashback Arrestor) بر روی رگلاتور و مشعل کپسول‌های برشکاری' },
    { question: 'استفاده از ماسک تنفسی فیلتردار ضد دود فلزات و عینک/ماسک جوشکاری استاندارد' },
  ],
  HEIGHT_WORK: [
    { question: 'بازرسی داربست توسط بازرس ذیصلاح و نصب برچسب سبز سلامت (Scaffold Tag)' },
    { question: 'تخته‌بندی کامل سکوی کار با حداقل عرض ۶۰ سانتی‌متر بدون لغزندگی و شکاف' },
    { question: 'نصب پاخور (Toe board) با ارتفاع حداقل ۱۵ سانتی‌متر جهت جلوگیری از سقوط ابزار' },
    { question: 'نصب لایف‌لاین افقی یا عمودی استاندارد دارای مهار کششی و تاییدیه مهندسی' },
    { question: 'استفاده از کمربند ایمنی تمام بدن (Full Body Harness) دارای دو لنیارد شوک‌گیردار' },
    { question: 'اتصال قلاب لنیارد به نقطه اتکای مطمئن بالاتر از سطح شانه (Overhead Anchor Point)' },
    { question: 'مهار کامل ابزارآلات دستی با بند اتصال (Tool Lanyard) جهت جلوگیری از سقوط ابزار' },
    { question: 'پایش شرایط جوی و عدم وجود باد شدید (بیش از ۳۵ کیلومتر/ساعت)، بارندگی یا یخ‌زدگی' },
  ],
  CONFINED_SPACE: [
    { question: 'اندازه‌گیری و ثبت گازهای ۴گانه (اکسیژن ۱۹.۵ الی ۲۳.۵٪، گازهای قابل اشتعال LEL زیر ۱۰٪، مونوکسید کربن زیر 25ppm، سولفید هیدروژن زیر 10ppm)' },
    { question: 'انجام ایزولاسیون مکانیکی (مسدودسازی خطوط با Blank) و قفل‌گذاری الکتریکی (LOTO)' },
    { question: 'استقرار سیستم تهویه مکانیکی هوای تازه (Blower/Fan) به صورت مداوم حین حضور نفرات' },
    { question: 'استقرار ناظر ورودی (Hole Watcher / Standby Person) با ارتباط رادیویی مداوم' },
    { question: 'مجهز بودن افراد به هارنس و اتصال به سه‌پایه نجات (Tripod) و وینچ بازیابی اضطراری' },
    { question: 'سیستم روشنایی ۲۴ ولت ولتاژ بسیار پایین ایمن (SELV) ضد انفجار (Ex)' },
    { question: 'آمادگی تیم امداد و نجات و وجود کپسول‌های فرار اضطراری (EEBD)' },
  ],
  EXCAVATION: [
    { question: 'انجام استعلام و اخذ تاییدیه عدم تداخل با تاسیسات زیرزمینی (لوله گاز، آب، فیبر نوری، کابل فشار قوی برق)' },
    { question: 'پایدارسازی دیواره‌ها از طریق اجرای شیب پایدار (Benching/Sloping) یا سازه نگهبان و سپرگذاری (Shoring)' },
    { question: 'رعایت فاصله حداقل ۲ متر برای دپوی خاک‌های حاصل از گودبرداری و توقف ماشین‌آلات سنگین از لبه گود' },
    { question: 'نصب نرده حفاظتی پیرامون لبه گود با ارتفاع ۱.۱ متر و نوار خطر هشداردهنده شب‌نما' },
    { question: 'تعبیه نردبان‌های ورود و خروج ایمن به ازای هر ۷.۵ متر طول با پیش‌آمدگی حداقل ۱ متر بالاتر از لبه گود' },
    { question: 'ممنوعیت ورود کارگران به داخل کانال هنگام کار بیل‌مکانیکی و لودر' },
    { question: 'بازرسی روزانه و پایش ترک‌های احتمالی و رانش خاک قبل از شروع شیفت کاری' },
  ],
  ELECTRICAL_LOTO: [
    { question: 'قطع کلید اصلی جریان مدار و انجام قفل‌گذاری انفرادی (Lockout) با پدلاک اختصاصی' },
    { question: 'الصاق برچسب هشدار مشخصات مجری و ساعت اقدام (Tagout)' },
    { question: 'انجام آزمون ولتاژ صفر با فازمتر یا مولتی‌متر کالیبره شده قبل از لمس هادی‌ها' },
    { question: 'تخلیه بار خازنی و زمین کردن موقت مدارها (Temporary Protective Grounding)' },
    { question: 'استفاده از ابزارهای دستی عایق‌دار استاندارد ۱۰۰۰ ولت (VDE 1000V Certified)' },
    { question: 'پهن کردن فرش عایق لاستیکی و استفاده از دستکش و شیلد ضد قوس الکتریکی (Arc Flash Shield)' },
  ],
  LIFTING: [
    { question: 'ارائه گواهینامه معتبر بازرسی فنی دوره‌ای جرثقیل و تاورکرین (Third-Party Crane Cert)' },
    { question: 'گواهینامه مهارت ویژه اپراتور جرثقیل و ریگر صلاحیت‌دار (Rigger/Slinger Cert)' },
    { question: 'محاسبه وزن بار و بررسی جدول باربرداری (Load Chart) و اطمینان از قرارگیری در زیر ۸۰٪ ظرفیت ایمن' },
    { question: 'بازرسی چشمی کلیه سیم‌بکسل‌ها، تسمه‌های برزنتی، شگل‌ها و قلاب مجهز به ضامن ایمنی (Safety Latch)' },
    { question: 'مسدود کردن محدوده گردش وزنه تعادل و شعاع عملیات باربرداری با نوار خطر و علائم بازدارنده' },
    { question: 'استقرار کامل پایه‌های جک‌های تعادل بر روی صفحات چوبی یا فولادی تکیه‌گاه (Outrigger Pads)' },
    { question: 'هدایت بار با طناب مهار (Tag Line) و علائم استاندارد دستی توسط ریگر معین' },
  ],
  NIGHT_WORK: [
    { question: 'تامین روشنایی استاندارد حداقل ۱۰۰ لوکس برای محوطه‌های عمومی و ۲۰۰ لوکس برای مناطق پرخطر' },
    { question: 'پوشیدن جلیقه‌های شبرنگ‌دار با بازتابش بالا توسط کلیه کارگران و سرپرستان' },
    { question: 'روشنایی مداوم مسیرهای دسترسی، پله‌ها، نردبان‌ها و خروجی‌های اضطراری' },
    { question: 'حضور مداوم افسر ایمنی کشیک و سرپرست کارگاه در تمام طول شیفت شب' },
  ],
  CHEMICAL: [
    { question: 'الصاق برچسب SDS/MSDS به زبان فارسی بر روی کلیه ظروف و بشکه‌ها طبق استاندارد بین‌المللی GHS' },
    { question: 'استقرار پالت مهار نشت (Spill Containment Pallet / Drip Tray) با ظرفیت ۱۱۰٪ حجم ظرف' },
    { question: 'آماده‌به‌کار بودن کیت مهار نشتی (Spill Kit) شامل پودر جاذب و بووم اسفنجی' },
    { question: 'استقرار دوش و چشم‌شوی اضطراری با دسترسی سریع کمتر از ۱۰ ثانیه' },
    { question: 'استفاده از لباس محافظ شیمیایی تایوک، دستکش نیتریل و رسپیراتور با فیلتر گازهای آلی' },
  ],
  GENERAL_COLD: [
    { question: 'بررسی ایمنی عمومی کارگاه و مرتب‌سازی محیط (Housekeeping)' },
    { question: 'استفاده کامل از کلاه ایمنی استاندارد، کفش پنجه فولادی و جلیقه بازتابنده' },
    { question: 'شناسایی و اطلاع‌رسانی خطرات محیطی به کلیه کارگران حاضر در شیفت' },
    { question: 'بررسی عدم تداخل کاری با سایر اکیپ‌های فعال در مجاورت جبهه کاری' },
  ]
};

export const INITIAL_WORK_PERMITS: WorkPermit[] = [
  {
    id: 'ptw-101',
    projectId: '1',
    permitNumber: 'PTW-1403-089',
    permitType: 'HOT_WORK',
    title: 'عملیات جوشکاری اسکلت فلزی و اتصال پلیت‌های ستون محور B-4',
    location: 'بلوک A - طبقه مثبت ۴ - محور B-4',
    contractorName: 'شرکت مهندسی و پیمانکاری نوین ساخت',
    supervisorName: 'مهندس محمودی (سرپرست اجرای اسکلت)',
    startDate: '1403/06/15',
    endDate: '1403/06/16',
    startTime: '08:00',
    endTime: '17:00',
    workersCount: 4,
    description: 'عملیات جوشکاری نفوذی اتصالات گیردار تیر به ستون با الکترود E7018 و برشکاری حرارتی لچکی‌ها',
    toolsAndEquipment: ['دستگاه اینورتر جوشکاری ۴۰۰ آمپر', 'کپسول اکسیژن و گاز پروپان با شیلنگ دوبل', 'سنگ فرز بزرگ آهنگری'],
    ppeRequired: ['کلاه ایمنی با نقاب محافظ', 'کفش پنجه فولادی عایق', 'ماسک و عینک تیره‌شونده جوشکاری', 'دستکش چرمی آستین‌بلند ساق‌دار', 'پتوی نسوز سیلیکونی'],
    gasTest: {
      isRequired: true,
      o2: '20.9%',
      lel: '0%',
      co: '2 ppm',
      h2s: '0 ppm',
      testedBy: 'امیر حسینی (کارشناس ایمنی)',
      testTime: '07:45',
      status: 'SAFE'
    },
    fireWatch: {
      isRequired: true,
      watcherName: 'محمد رضایی (آتش‌نشان کارگاهی)',
      extinguisherType: 'پودر و گاز ۶ کیلویی + CO2',
      quantity: 2
    },
    emergencyPlan: 'مسیر تخلیه پله‌های موقت جبهه غربی؛ جعبه کمک‌های اولیه طبقه سوم و هماهنگی با ایستگاه بهداری کارگاه (داخلی ۱۱۵)',
    checklists: DEFAULT_PERMIT_CHECKLISTS.HOT_WORK.map((item, idx) => ({
      id: `chk-hot-${idx}`,
      question: item.question,
      isChecked: true,
      na: false,
      note: 'توسط افسر HSE بازرسی و تایید گردید.'
    })),
    createdById: 'user-contractor-hse',
    creatorName: 'مهندس امیر حسینی (افسر ایمنی پیمانکار)',
    ownerOrgId: 'org-3',
    workflowStatus: WorkflowStatus.APPROVED_FINAL,
    workflowHistory: [
      {
        id: 'ev-1',
        action: 'CREATE',
        timestamp: Date.now() - 86400000 * 2,
        actorUserId: 'user-contractor-hse',
        actorName: 'امیر حسینی (افسر ایمنی پیمانکار)',
        comment: 'صدور اولیه پرمیت کار گرم پس از بررسی چک‌لیست‌های تخصصی'
      },
      {
        id: 'ev-2',
        action: 'APPROVE',
        timestamp: Date.now() - 86400000 * 1.5,
        actorUserId: 'user-contractor-pm',
        actorName: 'مهندس رضایی (مدیر پروژه پیمانکار)',
        comment: 'تایید رعایت تمهیدات ایمنی و ابلاغ به سرپرست کارگاه'
      },
      {
        id: 'ev-3',
        action: 'SEND_TO_CONSULTANT',
        timestamp: Date.now() - 86400000,
        actorUserId: 'user-contractor-pm',
        actorName: 'مهندس رضایی (مدیر پروژه پیمانکار)',
        comment: 'ارسال جهت بررسی و تایید ناظر مقیم دستگاه نظارت'
      },
      {
        id: 'ev-4',
        action: 'APPROVE',
        timestamp: Date.now() - 3600000 * 4,
        actorUserId: 'user-consultant-hse',
        actorName: 'مهندس کاظمی (ناظر ایمنی مشاور)',
        comment: 'بازدید میدانی به همراه افسر ایمنی انجام شد و صدور پرمیت تایید است.'
      }
    ],
    createdAt: Date.now() - 86400000 * 2,
    module: 'hse'
  },
  {
    id: 'ptw-102',
    projectId: '1',
    permitNumber: 'PTW-1403-090',
    permitType: 'HEIGHT_WORK',
    title: 'نصب و تکمیل نمای شیشه‌ای کرتین‌وال نمای شمالی با کلایمر',
    location: 'جبهه شمالی - تراز ارتفاعی مثبت ۲۸ متر الی مثبت ۴۰ متر',
    contractorName: 'شرکت مهندسی و پیمانکاری نوین ساخت',
    supervisorName: 'مهندس سهرابی (سرپرست اکیپ نماکاری)',
    startDate: '1403/06/16',
    endDate: '1403/06/18',
    startTime: '08:30',
    endTime: '16:30',
    workersCount: 3,
    description: 'عملیات نصب پنل‌های شیشه‌ای دو جداره و فریم‌های آلومینیومی در ارتفاع با سبد معلق (Climber)',
    toolsAndEquipment: ['دستگاه کلایمر برقی دارای ترمز اضطراری و پاراشوت', 'لایف‌لاین با سیم‌بکسل فولادی ۱۰ میلی‌متری', 'مکنده پنوماتیک حمل شیشه'],
    ppeRequired: ['هارنس تمام بدن با دو لنیارد شوک‌گیر', 'کلاه ایمنی مجهز به بند زیر چانه', 'کفش ضد لغزش ساق‌دار', 'طناب مهار ابزار'],
    emergencyPlan: 'آمادگی تیم نجات ارتفاع کارگاه با طناب بازیابی و هماهنگی اورژانس شهری',
    checklists: DEFAULT_PERMIT_CHECKLISTS.HEIGHT_WORK.map((item, idx) => ({
      id: `chk-h-${idx}`,
      question: item.question,
      isChecked: true,
      na: false
    })),
    createdById: 'user-contractor-hse',
    creatorName: 'مهندس امیر حسینی (افسر ایمنی)',
    ownerOrgId: 'org-3',
    workflowStatus: WorkflowStatus.SENT_TO_CONSULTANT,
    workflowHistory: [
      {
        id: 'ev-h1',
        action: 'CREATE',
        timestamp: Date.now() - 3600000 * 12,
        actorUserId: 'user-contractor-hse',
        actorName: 'امیر حسینی (افسر ایمنی)',
        comment: 'پرمیت کار در ارتفاع برای نماکاری تهیه شد.'
      },
      {
        id: 'ev-h2',
        action: 'APPROVE',
        timestamp: Date.now() - 3600000 * 8,
        actorUserId: 'user-contractor-pm',
        actorName: 'مهندس رضایی (مدیر پروژه)',
        comment: 'مورد تایید است و جهت بازرسی مشاور ارسال گردید.'
      }
    ],
    createdAt: Date.now() - 3600000 * 12,
    module: 'hse'
  },
  {
    id: 'ptw-103',
    projectId: '1',
    permitNumber: 'PTW-1403-091',
    permitType: 'EXCAVATION',
    title: 'خاکبرداری و گودبرداری رمپ پارکینگ منفی ۳ و نیلینگ دیواره',
    location: 'ضلع شرقی پروژه - گود مرکزی',
    contractorName: 'شرکت مهندسی و پیمانکاری نوین ساخت',
    supervisorName: 'مهندس کمالی (سرپرست ژئوتکنیک)',
    startDate: '1403/06/17',
    endDate: '1403/06/20',
    startTime: '07:30',
    endTime: '18:00',
    workersCount: 6,
    description: 'عملیات حفاری ردیف چهارم گمانه‌های نیلینگ و بتن‌پاشی شاتکریت دیواره ترانشه شرقی',
    toolsAndEquipment: ['دستگاه دریل‌واگن حفاری نیلینگ', 'دستگاه پمپ بتن شاتکریت', 'بیل مکانیکی ۲۲۰ کوماتسو'],
    ppeRequired: ['کلاه ایمنی با عینک محافظ', 'کفش ایمنی ساق‌بلند', 'ماسک تنفسی ضد غبار سیلیکوزیس', 'گوشی محافظ ایرماف'],
    emergencyPlan: 'مسیر تخلیه رمپ موقت جنوبی؛ حضور نجات‌غریق و آمبولانس پایگاه کارگاهی',
    checklists: DEFAULT_PERMIT_CHECKLISTS.EXCAVATION.map((item, idx) => ({
      id: `chk-exc-${idx}`,
      question: item.question,
      isChecked: idx !== 1 ? true : false,
      na: false,
      note: idx === 1 ? 'پایش نشست روزانه انجام می‌شود.' : undefined
    })),
    createdById: 'user-contractor-hse',
    creatorName: 'مهندس امیر حسینی (افسر ایمنی)',
    ownerOrgId: 'org-3',
    workflowStatus: WorkflowStatus.DRAFT,
    workflowHistory: [
      {
        id: 'ev-exc1',
        action: 'CREATE',
        timestamp: Date.now() - 3600000 * 3,
        actorUserId: 'user-contractor-hse',
        actorName: 'امیر حسینی (افسر ایمنی)',
        comment: 'تنظیم اولیه پیش‌نویس پرمیت گودبرداری'
      }
    ],
    createdAt: Date.now() - 3600000 * 3,
    module: 'hse'
  }
];

export const INITIAL_INCIDENTS: IncidentReport[] = [
  {
    id: 'inc-201',
    projectId: '1',
    incidentNumber: 'INC-1403-014',
    incidentType: 'NEAR_MISS',
    severity: 'MEDIUM',
    title: 'سقوط آچار بکس سنگین از داربست طبقه سوم به داخل تور ایمنی',
    date: '1403/06/12',
    time: '10:45',
    exactLocation: 'جبهه غربی کارگاه - مجاور مسیر عابرین پیاده',
    involvedPerson: {
      name: 'قاسم مرادی',
      age: 32,
      jobTitle: 'آرماتوربند و قالب‌بند',
      contractor: 'شرکت نوین ساخت (پیمانکار اسکلت)',
      experienceYears: 6
    },
    lostWorkDays: 0,
    description: 'حین باز کردن پین‌های قالب فلزی، آچار بکس از دست کارگر رها شد و پس از برخورد به لبه پاخور، درون تور نجات نصب‌شده در تراز مثبت ۶ متری افتاد. خوشبختانه تور نجات مانع از سقوط ابزار به محوطه عبور پرسنل گردید و هیچ‌گونه مصدومیتی رخ نداد.',
    immediateCauses: [
      'عدم استفاده از بند اتصال ابزار (Tool Lanyard) به کمربند',
      'لغزندگی دسته آچار به دلیل روغن‌زدگی سطح قالب'
    ],
    rootCauses: [
      'عدم تامین کافی طناب‌های مهار ابزار دستی توسط واحد تدارکات پیمانکار',
      'فقدان بازرسی ابزارآلات دستی در جلسه جعبه‌ابزاری (TBM) صبحگاهی'
    ],
    correctiveActions: [
      {
        id: 'act-1',
        action: 'تجهیز کلیه اکیپ‌های فعال در ارتفاع به طناب مهار ابزارآلات و ممنوعیت کار بدون بند محافظ',
        responsiblePerson: 'مهندس محمودی (سرپرست کارگاه)',
        deadline: '1403/06/13',
        status: 'DONE'
      },
      {
        id: 'act-2',
        action: 'برگزاری جلسه فوری TBM با موضوع مخاطرات سقوط اجسام و نحوه مهار ابزار دستی',
        responsiblePerson: 'امیر حسینی (افسر ایمنی)',
        deadline: '1403/06/14',
        status: 'DONE'
      }
    ],
    witnesses: 'علی اصغری (کمک قالب‌بند) و رحمان فتاحی (کارگر ساختمانی)',
    reportedBy: 'امیر حسینی (افسر ایمنی کارگاه)',
    createdById: 'user-contractor-hse',
    creatorName: 'امیر حسینی (افسر ایمنی)',
    ownerOrgId: 'org-3',
    workflowStatus: WorkflowStatus.APPROVED_FINAL,
    workflowHistory: [
      {
        id: 'ev-inc1',
        action: 'CREATE',
        timestamp: Date.now() - 86400000 * 3,
        actorUserId: 'user-contractor-hse',
        actorName: 'امیر حسینی (افسر ایمنی)',
        comment: 'گزارش شبه حادثه و تحلیل علل ریشه‌ای ثبت شد.'
      },
      {
        id: 'ev-inc2',
        action: 'APPROVE',
        timestamp: Date.now() - 86400000 * 2,
        actorUserId: 'user-contractor-pm',
        actorName: 'مهندس رضایی (مدیر پروژه)',
        comment: 'اقدامات اصلاحی تایید و جهت اطلاع مشاور ارسال شد.'
      },
      {
        id: 'ev-inc3',
        action: 'APPROVE',
        timestamp: Date.now() - 86400000,
        actorUserId: 'user-consultant-hse',
        actorName: 'مهندس کاظمی (ناظر مشاور)',
        comment: 'ملاحظه گردید، تورهای ایمنی به صورت هفتگی بازرسی شوند.'
      }
    ],
    createdAt: Date.now() - 86400000 * 3,
    module: 'hse'
  },
  {
    id: 'inc-202',
    projectId: '1',
    incidentNumber: 'INC-1403-015',
    incidentType: 'FIRST_AID',
    severity: 'LOW',
    title: 'بریدگی سطحی کف دست کارگر تاسیسات حین شیارزنی لوله‌ها',
    date: '1403/06/14',
    time: '14:20',
    exactLocation: 'بلوک B - طبقه منفی ۱ - موتورخانه مرکزی',
    involvedPerson: {
      name: 'بهزاد کریمی',
      age: 28,
      jobTitle: 'کمک‌تاسیساتی',
      contractor: 'تاسیسات مکانیکی آریا',
      experienceYears: 2
    },
    injuryType: 'بریدگی سطحی و خونریزی موضعی',
    injuredBodyPart: 'کف دست چپ مابین انگشت شست و اشاره',
    lostWorkDays: 0,
    description: 'کارگر حین برش لوله فولادی ۲ اینچ، از دستکش ضد برش استفاده نکرده بود و براده برنده لوله باعث ایجاد بریدگی سطحی به طول ۳ سانتی‌متر گردید. به سرعت به بهداری کارگاه منتقل و پانسمان و واکسن کزاز دریافت کرد و پس از ۳۰ دقیقه به کار بازگشت.',
    immediateCauses: [
      'عدم استفاده از دستکش مقاوم در برابر برش سطح ۵ (Cut Resistant Level 5)',
      'تکان خوردن لوله بر روی خرک به دلیل مهار نامناسب گیره'
    ],
    rootCauses: [
      'عدم انطباق فردی با مقررات PPE ابلاغی',
      'فرسودگی گیره خرک برشکاری'
    ],
    correctiveActions: [
      {
        id: 'act-fa-1',
        action: 'تعویض فوری گیره ثابت‌کننده لوله بر روی خرک کارگاهی',
        responsiblePerson: 'سرپرست تاسیسات',
        deadline: '1403/06/15',
        status: 'DONE'
      },
      {
        id: 'act-fa-2',
        action: 'توزیع دستکش ضد برش استاندارد به کلیه نفرات لوله‌کشی و ثبت در فرم تحویل PPE',
        responsiblePerson: 'افسر ایمنی',
        deadline: '1403/06/15',
        status: 'DONE'
      }
    ],
    reportedBy: 'بهرام صیادی (بهیار مقیم کارگاه)',
    createdById: 'user-contractor-hse',
    creatorName: 'امیر حسینی (افسر ایمنی)',
    ownerOrgId: 'org-3',
    workflowStatus: WorkflowStatus.SENT_TO_CONSULTANT,
    workflowHistory: [
      {
        id: 'ev-inc-fa',
        action: 'CREATE',
        timestamp: Date.now() - 86400000,
        actorUserId: 'user-contractor-hse',
        actorName: 'امیر حسینی (افسر ایمنی)',
        comment: 'گزارش کمک‌های اولیه ثبت گردید.'
      },
      {
        id: 'ev-inc-fa2',
        action: 'APPROVE',
        timestamp: Date.now() - 3600000 * 10,
        actorUserId: 'user-contractor-pm',
        actorName: 'مهندس رضایی (مدیر پروژه)',
        comment: 'اقدام اصلاحی انجام شد و جهت نظارت مشاور ارسال گردید.'
      }
    ],
    createdAt: Date.now() - 86400000,
    module: 'hse'
  }
];

export const INITIAL_ENVIRONMENTAL_REPORTS: EnvironmentalReport[] = [
  {
    id: 'env-301',
    projectId: '1',
    reportNumber: 'ENV-1403-022',
    aspect: 'WASTE_MANAGEMENT',
    title: 'گزارش تفکیک و مدیریت پسماندهای ساختمانی، صنعتی و مواد خطرناک کارگاه',
    date: '1403/06/10',
    location: 'محوطه دپوی ضایعات و انبار پسماندهای ویژه کارگاه',
    wasteStats: {
      regularWasteKg: 420,
      constructionWasteTons: 18.5,
      hazardousWasteKg: 65,
      recycledKg: 280,
      disposalMethod: 'تفکیک از مبدا آهن‌آلات و چوب به خریدار بازیافت؛ نخاله‌های ساختمانی به سایت شهرداری؛ روغن سوخته به شرکت مجاز تصفیه'
    },
    findingsAndObservations: 'تفکیک ضایعات فلزی و پلاستیکی به نحو مطلوب انجام گرفته است. سه بشکه حاوی روغن هیدرولیک مستعمل به انبار مواد شیمیایی منتقل شده و روی پالت مهار نشت قرار گرفت.',
    correctiveActions: [
      {
        id: 'c-env-1',
        action: 'نصب تابلوهای تفکیک ۴ رنگ برای سطل‌های زباله سالن غذاخوری و خوابگاه‌ها',
        responsible: 'مسئول خدمات کارگاهی',
        dueDate: '1403/06/14',
        isDone: true
      }
    ],
    createdById: 'user-contractor-hse',
    creatorName: 'امیر حسینی (کارشناس محیط زیست و ایمنی)',
    ownerOrgId: 'org-3',
    workflowStatus: WorkflowStatus.APPROVED_FINAL,
    workflowHistory: [
      {
        id: 'ev-e1',
        action: 'CREATE',
        timestamp: Date.now() - 86400000 * 5,
        actorUserId: 'user-contractor-hse',
        actorName: 'امیر حسینی',
        comment: 'گزارش ممیزی پسماند بر اساس الزامات ISO 14001 تهیه شد.'
      },
      {
        id: 'ev-e2',
        action: 'APPROVE',
        timestamp: Date.now() - 86400000 * 4,
        actorUserId: 'user-contractor-pm',
        actorName: 'مهندس رضایی',
        comment: 'مورد تایید و ارسال به مشاور'
      },
      {
        id: 'ev-e3',
        action: 'APPROVE',
        timestamp: Date.now() - 86400000 * 3,
        actorUserId: 'user-consultant-hse',
        actorName: 'مهندس کاظمی',
        comment: 'انطباق زیست‌محیطی مورد تایید دستگاه نظارت است.'
      }
    ],
    createdAt: Date.now() - 86400000 * 5,
    module: 'hse'
  },
  {
    id: 'env-302',
    projectId: '1',
    reportNumber: 'ENV-1403-023',
    aspect: 'AIR_DUST',
    title: 'پایش و کنترل گرد و غبار معابر کارگاهی و تست آلایندگی ماشین‌آلات',
    date: '1403/06/14',
    location: 'مسیرهای تردد پیرامونی، جبهه گودبرداری و ایستگاه اختلاط بتن',
    airDustStats: {
      dustControlMethod: 'آب‌پاشی مداوم با تانکر ۵۰۰۰ لیتری روزانه ۳ نوبت و پوشش بار کامیون‌ها با برزنت',
      waterSprayingCount: 3,
      machineryEmissionTest: 'PASSED',
      airQualityIndex: 68
    },
    findingsAndObservations: 'میزان گرد و غبار ناشی از حرکت کامیون‌ها با اجرای برنامه منظم آب‌پاشی کنترل شد. کلیه ماشین‌آلات سنگین دارای برگه معاینه فنی معتبر و تنظیم سوخت هستند.',
    correctiveActions: [
      {
        id: 'c-env-2',
        action: 'تجهیز خروجی مخزن سیمان بچینگ‌پلنت به فیلتر کیسه‌ای جدید (Bag Filter)',
        responsible: 'مسئول بچینگ',
        dueDate: '1403/06/18',
        isDone: false
      }
    ],
    createdById: 'user-contractor-hse',
    creatorName: 'امیر حسینی (کارشناس محیط زیست)',
    ownerOrgId: 'org-3',
    workflowStatus: WorkflowStatus.SENT_TO_CONSULTANT,
    workflowHistory: [
      {
        id: 'ev-e-air',
        action: 'CREATE',
        timestamp: Date.now() - 86400000,
        actorUserId: 'user-contractor-hse',
        actorName: 'امیر حسینی',
        comment: 'گزارش کنترل گرد و غبار و کیفیت هوا ثبت شد.'
      },
      {
        id: 'ev-e-air2',
        action: 'APPROVE',
        timestamp: Date.now() - 3600000 * 6,
        actorUserId: 'user-contractor-pm',
        actorName: 'مهندس رضایی',
        comment: 'تایید و جهت نظارت مشاور ارسال شد.'
      }
    ],
    createdAt: Date.now() - 86400000,
    module: 'hse'
  }
];

export const INITIAL_PERIODIC_REPORTS: WeeklyMonthlyHseReport[] = [
  {
    id: 'rep-401',
    projectId: '1',
    reportType: 'MONTHLY',
    reportNumber: 'HSE-REP-M-1403-05',
    periodName: 'گزارش جامع شاخص‌های بهداشت، ایمنی و محیط زیست مرداد ماه ۱۴۰۳',
    startDate: '1403/05/01',
    endDate: '1403/05/31',
    safeManHoursPeriod: 24800,
    cumulativeSafeManHours: 186400,
    averageDailyWorkers: 95,
    tbmCount: 22,
    tbmAttendeesTotal: 340,
    inspectionsCount: 16,
    unsafeActsIdentified: 14,
    unsafeConditionsIdentified: 9,
    nearMissesCount: 3,
    firstAidCount: 2,
    ltiCount: 0,
    lostWorkDays: 0,
    ltifr: 0.0,
    ltisr: 0.0,
    environmentalIncidentsCount: 0,
    permitsIssuedCount: 42,
    ppeCompliancePercentage: 96,
    keyHighlights: 'رسیدن به رکورد ۱۸۶،۴۰۰ نفر-ساعت کارکرد بدون حادثه ناتوان‌کننده (Zero LTI) در پروژه؛ استقرار نظام جامع پرمیت الکترونیک و برگزاری دوره آموزشی اطفاء حریق عملی با همکاری سازمان آتش‌نشانی برای ۵۰ نفر از پرسنل کارگاهی.',
    challengesAndRisks: 'افزایش دمای هوا و خطر گرمازدگی کارگران در ساعات ظهر که با تغییر شیفت و توزیع محلول ORS و شربت آبلیمو مدیریت شد؛ عملیات کار در ارتفاع جبهه نمای شمالی نیازمند تشدید نظارت روزانه است.',
    plannedTrainingsNextPeriod: 'برگزاری کارگاه تخصصی بازرسی تاورکرین و ریگری، آموزش مانور واکنش اضطراری زلزله و مسمومیت گاز در فضاهای بسته.',
    createdById: 'user-contractor-hse',
    creatorName: 'مهندس امیر حسینی (مدیر HSE پیمانکار)',
    ownerOrgId: 'org-3',
    workflowStatus: WorkflowStatus.APPROVED_FINAL,
    workflowHistory: [
      {
        id: 'ev-rep1',
        action: 'CREATE',
        timestamp: Date.now() - 86400000 * 6,
        actorUserId: 'user-contractor-hse',
        actorName: 'امیر حسینی',
        comment: 'تدوین گزارش ماهانه مرداد ماه'
      },
      {
        id: 'ev-rep2',
        action: 'APPROVE',
        timestamp: Date.now() - 86400000 * 5,
        actorUserId: 'user-contractor-pm',
        actorName: 'مهندس رضایی',
        comment: 'تایید شاخص‌های عملکردی مرداد ماه'
      },
      {
        id: 'ev-rep3',
        action: 'APPROVE',
        timestamp: Date.now() - 86400000 * 4,
        actorUserId: 'user-consultant-hse',
        actorName: 'مهندس کاظمی',
        comment: 'تایید گزارش و ارسال به کارفرما'
      },
      {
        id: 'ev-rep4',
        action: 'APPROVE',
        timestamp: Date.now() - 86400000 * 2,
        actorUserId: 'user-employer-pm',
        actorName: 'دکتر صادقی (مدیر پروژه کارفرما)',
        comment: 'گزارش ماهانه مصوب کارفرما گردید. عملکرد ایمنی مطلوب ارزیابی می‌شود.'
      }
    ],
    createdAt: Date.now() - 86400000 * 6,
    module: 'hse'
  },
  {
    id: 'rep-402',
    projectId: '1',
    reportType: 'WEEKLY',
    reportNumber: 'HSE-REP-W-1403-24',
    periodName: 'گزارش هفتگی HSE - هفته اول شهریور ۱۴۰۳ (۱ الی ۷ شهریور)',
    startDate: '1403/06/01',
    endDate: '1403/06/07',
    safeManHoursPeriod: 5900,
    cumulativeSafeManHours: 192300,
    averageDailyWorkers: 98,
    tbmCount: 5,
    tbmAttendeesTotal: 88,
    inspectionsCount: 4,
    unsafeActsIdentified: 3,
    unsafeConditionsIdentified: 2,
    nearMissesCount: 1,
    firstAidCount: 1,
    ltiCount: 0,
    lostWorkDays: 0,
    ltifr: 0.0,
    ltisr: 0.0,
    environmentalIncidentsCount: 0,
    permitsIssuedCount: 11,
    ppeCompliancePercentage: 97,
    keyHighlights: 'انجام موفقیت‌آمیز بتن‌ریزی سقف طبقه پنجم با رعایت کامل استانداردهای لایف‌لاین و مهار پمپ بتن؛ بررسی روزانه جعبه‌های فیوز برق و کلیدهای محافظ جان RCD.',
    challengesAndRisks: 'لزوم سرعت‌بخشی به نصب توری‌های نجات در جبهه جنوبی نماکاری.',
    plannedTrainingsNextPeriod: 'آموزش اصول مهار بار و ریگری برای اکیپ‌های آهن‌کشی.',
    createdById: 'user-contractor-hse',
    creatorName: 'مهندس امیر حسینی (مدیر HSE پیمانکار)',
    ownerOrgId: 'org-3',
    workflowStatus: WorkflowStatus.SENT_TO_CONSULTANT,
    workflowHistory: [
      {
        id: 'ev-rep-w1',
        action: 'CREATE',
        timestamp: Date.now() - 86400000 * 2,
        actorUserId: 'user-contractor-hse',
        actorName: 'امیر حسینی',
        comment: 'تنظیم گزارش هفتگی'
      },
      {
        id: 'ev-rep-w2',
        action: 'APPROVE',
        timestamp: Date.now() - 86400000,
        actorUserId: 'user-contractor-pm',
        actorName: 'مهندس رضایی',
        comment: 'تایید و ارسال به نظارت مشاور'
      }
    ],
    createdAt: Date.now() - 86400000 * 2,
    module: 'hse'
  }
];

export const INITIAL_HSE_PLANS: HsePlan[] = [
  {
    id: 'plan-501',
    projectId: '1',
    planNumber: 'HSE-PLAN-REV02',
    revision: 'Rev. 02',
    approvalDate: '1403/03/15',
    title: 'برنامه جامع مدیریت بهداشت، ایمنی و محیط زیست (Project HSE Plan) منطبق با ISO 45001:2018 و ISO 14001:2015',
    scopeOfWork: 'کلیه عملیات اجرایی، ابنیه، تاسیسات مکانیکی و برقی، تجهیز کارگاه، باربرداری، گودبرداری و حمل و نقل در پروژه مجتمع اداری-تجاری',
    policyStatement: 'مدیریت ارشد متعهد است با استقرار نظام یکپارچه HSE، پیشگیری از مصدومیت‌ها و بیماری‌های شغلی، حذف خطرات و کاهش ریسک‌های غیرقابل‌قبول، حفاظت از محیط زیست از طریق مصرف بهینه منابع و تفکیک پسماندها، محیطی کاملاً ایمن، پویا و هم‌راستا با قوانین کار و استانداردهای بین‌المللی برای تمام ذینفعان فراهم آورد.',
    objectivesAndKpis: [
      { kpi: 'شاخص حوادث ناتوان‌کننده (Zero LTI)', target: 'صفر حادثه', currentStatus: 'صفر حادثه تحقق‌یافته', measurementFrequency: 'ماهانه' },
      { kpi: 'ضریب تکرار حادثه (LTIFR)', target: 'کمتر از ۰.۵', currentStatus: '۰.۰۰', measurementFrequency: 'ماهانه' },
      { kpi: 'میزان ساعات آموزش HSE به ازای هر نفر', target: 'حداقل ۴ ساعت در ماه', currentStatus: '۴.۲ ساعت', measurementFrequency: 'ماهانه' },
      { kpi: 'درصد انطباق تجهیزات حفاظت فردی (PPE)', target: 'حداقل ۹۵٪', currentStatus: '۹۶.۸٪', measurementFrequency: 'هفتگی' },
      { kpi: 'بستن اقدامات اصلاحی بازرسی‌ها (CAPA)', target: 'بالای ۹۰٪ در موعد مقرر', currentStatus: '۹۴٪', measurementFrequency: 'هفتگی' },
      { kpi: 'تفکیک و بازیافت پسماندهای ساختمانی', target: 'حداقل ۶۰٪ حجم پسماند', currentStatus: '۶۵٪', measurementFrequency: 'ماهانه' }
    ],
    orgStructure: [
      { role: 'مدیر پروژه (Project Manager)', name: 'مهندس رضایی', contact: '۰۹۱۲۱۱۱۱۱۱۱', responsibilities: 'مسئول کلی اجرای خط‌مشی HSE، تخصیص منابع مالی و لجستیکی و رهبری جلسات ماهانه کمیته حفاظت فنی' },
      { role: 'سرپرست کارگاه (Site Manager)', name: 'مهندس کاظمی', contact: '۰۹۱۲۲۲۲۲۲۲۲', responsibilities: 'نظارت بر رعایت دستورالعمل‌های ایمنی در اکیپ‌های اجرایی و تایید پرمیت‌های روزانه' },
      { role: 'مدیر / سرپرست HSE (HSE Manager)', name: 'مهندس امیر حسینی', contact: '۰۹۱۲۳۳۳۳۳۳۳', responsibilities: 'ارزیابی ریسک، صدور پرمیت‌ها، تدوین برنامه‌های آموزشی، بازرسی‌های ادواری و گزارش‌دهی حوادث' },
      { role: 'افسران ایمنی شیفت (HSE Officers)', name: 'مهندس بهرامی و مهندس باقری', contact: '۰۹۱۲۴۴۴۴۴۴۴', responsibilities: 'حضور میدانی مداوم در جبهه‌های کاری، تست گاز، نظارت بر پرمیت‌ها و متوقف‌سازی کار ناایمن (Stop Work Authority)' },
      { role: 'بهیار و پزشک معتمد کارگاه', name: 'بهرام صیادی', contact: '۰۹۱۲۵۵۵۵۵۵۵', responsibilities: 'ارائه خدمات کمک‌های اولیه، مدیریت بهداری کارگاهی و معاینات دوره‌ای طب کار' }
    ],
    riskMatrix: [
      {
        id: 'r-1',
        activity: 'کار بر روی داربست‌های نمای خارجی در تراز بالای ۲۰ متر',
        hazard: 'سقوط افراد از ارتفاع به دلیل نقص حفاظ یا نبستن هارنس',
        riskLevel: 'EXTREME',
        initialProbability: 4,
        initialSeverity: 5,
        controlMeasure: 'اجرای داربست با برچسب سبز سلامت، لایف‌لاین سرتاسری، استفاده اجباری از هارنس دوتکه با دو لنیارد، نصب تور نجات در تراز میانی',
        residualLevel: 'LOW'
      },
      {
        id: 'r-2',
        activity: 'عملیات باربرداری با تاورکرین و جرثقیل متحرک سنگین',
        hazard: 'سقوط بار، گسیختگی سیم‌بکسل، برخورد بوم با سازه یا افراد',
        riskLevel: 'HIGH',
        initialProbability: 3,
        initialSeverity: 5,
        controlMeasure: 'اخذ گواهی سلامت کالیبراسیون شخص ثالث، استفاده از ریگر دارای کارت مهارت، محصورسازی محوطه زیر بار، ممنوعیت باربرداری در باد بالای ۴۰ کیلومتر/ساعت',
        residualLevel: 'LOW'
      },
      {
        id: 'r-3',
        activity: 'حفاری و گودبرداری ترانشه‌ها به عمق بیش از ۲ متر',
        hazard: 'ریزش ناگهانی دیواره خاک و خفگی کارگران زیر آوار',
        riskLevel: 'HIGH',
        initialProbability: 3,
        initialSeverity: 5,
        controlMeasure: 'پله‌بندی و مهار سازه نگهبان، تخلیه مصالح در فاصله ۲ متری، بازرسی روزانه ژئوتکنیک، نردبان دسترسی هر ۷.۵ متر',
        residualLevel: 'LOW'
      },
      {
        id: 'r-4',
        activity: 'جوشکاری و برشکاری در نزدیکی دپوی فوم عایق و چوب',
        hazard: 'اشتعال مصالح و گسترش آتش‌سوزی در اسکلت سازه',
        riskLevel: 'HIGH',
        initialProbability: 3,
        initialSeverity: 4,
        controlMeasure: 'صدور پرمیت کار گرم، فاصله ۱۱ متری مواد اشتعال‌زا، پتوی نسوز، کپسول اطفاء حریق، دیده‌بان حریق تا ۳۰ دقیقه پس از کار',
        residualLevel: 'LOW'
      },
      {
        id: 'r-5',
        activity: 'کار در تابلوهای برق اصلی و ترانسفورماتور کارگاهی',
        hazard: 'برق‌گرفتگی فشار متوسط و سوختگی ناشی از آرک فلش',
        riskLevel: 'EXTREME',
        initialProbability: 2,
        initialSeverity: 5,
        controlMeasure: 'اجرای کامل دستورالعمل قفل‌گذاری و برچسب‌گذاری (LOTO)، ابزار عایق ۱۰۰۰ ولت، کلیدهای RCD، شیلد ضد آرک',
        residualLevel: 'LOW'
      }
    ],
    emergencyScenarios: [
      {
        id: 'esc-1',
        scenario: 'آتش‌سوزی و انفجار در انبار مصالح یا باک سوخت ماشین‌آلات',
        immediateAction: 'به صدا درآوردن آژیر خطر کارگاه، قطع برق اصلی، تخلیه سریع پرسنل به محل تجمع امن، آغاز اطفاء با کپسول‌های پودری و تماس فوری با آتش‌نشانی (۱۲۵)',
        assemblyPoint: 'محوطه باز درب خروجی شرقی کارگاه (ایستگاه سبز شماره ۱)',
        commander: 'مهندس رضایی (مدیر بحران) / جانشین: مهندس حسینی',
        externalContact: 'سازمان آتش‌نشانی: ۱۲۵ - اورژانس: ۱۱۵'
      },
      {
        id: 'esc-2',
        scenario: 'ریزش گود یا دفن‌شدن فرد در کانال حفاری',
        immediateAction: 'توقف فوری کلیه ماشین‌آلات لرزاننده، عدم ورود انفرادی پرسنل بدون مهار، هوادهی به مصدوم، تثبیت دیواره با تخته‌های حائل و نجات مصدوم توسط تیم تخصصی',
        assemblyPoint: 'ایستگاه تجمع امن شماره ۲ (رمپ ورودی پارکینگ)',
        commander: 'مهندس کاظمی (سرپرست کارگاه)',
        externalContact: 'هلال‌احمر و آتش‌نشانی: ۱۱۲ و ۱۲۵'
      },
      {
        id: 'esc-3',
        scenario: 'سقوط فرد از ارتفاع و آسیب به ستون فقرات یا بیهوشی',
        immediateAction: 'ممنوعیت هرگونه حرکت دادن غیر اصولی گردن و ستون فقرات مصدوم، فراخوانی فوری بهیار کارگاه با برانکارد بسکتی، فیکس کردن با کلار گردنی و تخته ستون فقرات (Spine Board)',
        assemblyPoint: 'ایستگاه بهداری کارگاه (اتاق اورژانس طبقه همکف)',
        commander: 'بهرام صیادی (بهیار کارگاه)',
        externalContact: 'اورژانس تهران: ۱۱۵ - بیمارستان نزدیک: ۰۲۱۸۸۸۸۸۸۸۸'
      }
    ],
    medicalFacilities: {
      firstAidPost: 'ایستگاه بهداری مرکزی کارگاه مجهز به تخت بستری، کپسول اکسیژن، دستگاه شوک AED و ترالی احیا',
      doctorName: 'دکتر علیرضا رستمی (پزشک طب کار معتمد)',
      ambulanceStatus: 'قرارداد آماده‌باش ۲۴ ساعته با مرکز آمبولانس خصوصی شفا',
      nearestHospital: 'بیمارستان امام خمینی (فاصله زمینی ۸ دقیقه)',
      phone: '۰۲۱-۶۶۹۳۸۰۵۰'
    },
    environmentalPlanSummary: 'برنامه مدیریت محیط زیست شامل ممیزی ماهانه ISO 14001، حوضچه‌های ته‌نشینی شستشوی تراک‌میکسرها، مهار نشت با پالت‌های دوجداره روغن و هماهنگی با سازمان حفاظت محیط زیست استان.',
    createdById: 'user-contractor-hse',
    creatorName: 'مهندس امیر حسینی (مدیر HSE)',
    ownerOrgId: 'org-3',
    workflowStatus: WorkflowStatus.APPROVED_FINAL,
    workflowHistory: [
      {
        id: 'ev-plan1',
        action: 'CREATE',
        timestamp: Date.now() - 86400000 * 30,
        actorUserId: 'user-contractor-hse',
        actorName: 'امیر حسینی (مدیر HSE)',
        comment: 'تدوین ویرایش دوم HSE Plan پروژه بر اساس استانداردهای بین‌المللی'
      },
      {
        id: 'ev-plan2',
        action: 'APPROVE',
        timestamp: Date.now() - 86400000 * 25,
        actorUserId: 'user-contractor-pm',
        actorName: 'مهندس رضایی (مدیر پروژه پیمانکار)',
        comment: 'تایید کلیات برنامه و ارسال به دستگاه نظارت جهت تصویب'
      },
      {
        id: 'ev-plan3',
        action: 'APPROVE',
        timestamp: Date.now() - 86400000 * 20,
        actorUserId: 'user-consultant-hse',
        actorName: 'مهندس کاظمی (مدیر نظارت مشاور)',
        comment: 'برنامه بهداشت و ایمنی بررسی و مورد تایید مشاور قرار گرفت.'
      },
      {
        id: 'ev-plan4',
        action: 'APPROVE',
        timestamp: Date.now() - 86400000 * 15,
        actorUserId: 'user-employer-pm',
        actorName: 'دکتر صادقی (مدیر پروژه کارفرما)',
        comment: 'طرح HSE پروژه به عنوان سند مرجع و ملاک عمل ابلاغ گردید.'
      }
    ],
    createdAt: Date.now() - 86400000 * 30,
    module: 'hse'
  }
];

export class HseService {
  // WORK PERMITS
  static getWorkPermits(projectId?: string): WorkPermit[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.WORK_PERMITS);
      let list: WorkPermit[] = stored ? JSON.parse(stored) : INITIAL_WORK_PERMITS;
      if (projectId) {
        list = list.filter(p => String(p.projectId) === String(projectId));
      }
      return list;
    } catch (e) {
      return INITIAL_WORK_PERMITS;
    }
  }

  static saveWorkPermit(permit: WorkPermit): void {
    const list = this.getWorkPermits();
    const index = list.findIndex(p => p.id === permit.id);
    if (index >= 0) {
      list[index] = { ...permit, updatedAt: Date.now() };
    } else {
      list.unshift({ ...permit, createdAt: Date.now() });
    }
    localStorage.setItem(STORAGE_KEYS.WORK_PERMITS, JSON.stringify(list));
  }

  static deleteWorkPermit(id: string): void {
    const list = this.getWorkPermits().filter(p => p.id !== id);
    localStorage.setItem(STORAGE_KEYS.WORK_PERMITS, JSON.stringify(list));
  }

  // INCIDENTS
  static getIncidents(projectId?: string): IncidentReport[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.INCIDENTS);
      let list: IncidentReport[] = stored ? JSON.parse(stored) : INITIAL_INCIDENTS;
      if (projectId) {
        list = list.filter(i => String(i.projectId) === String(projectId));
      }
      return list;
    } catch (e) {
      return INITIAL_INCIDENTS;
    }
  }

  static saveIncident(incident: IncidentReport): void {
    const list = this.getIncidents();
    const index = list.findIndex(i => i.id === incident.id);
    if (index >= 0) {
      list[index] = { ...incident, updatedAt: Date.now() };
    } else {
      list.unshift({ ...incident, createdAt: Date.now() });
    }
    localStorage.setItem(STORAGE_KEYS.INCIDENTS, JSON.stringify(list));
  }

  static deleteIncident(id: string): void {
    const list = this.getIncidents().filter(i => i.id !== id);
    localStorage.setItem(STORAGE_KEYS.INCIDENTS, JSON.stringify(list));
  }

  static getIncidentReports(projectId?: string): IncidentReport[] {
    return this.getIncidents(projectId);
  }

  static saveIncidentReport(incident: IncidentReport): void {
    this.saveIncident(incident);
  }

  static deleteIncidentReport(id: string): void {
    this.deleteIncident(id);
  }

  // PERMIT TYPES MANAGEMENT
  static getPermitTypes(): CustomPermitType[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PERMIT_TYPES);
      if (stored) {
        const customList: CustomPermitType[] = JSON.parse(stored);
        const existingCodes = new Set(customList.map(t => t.code));
        const missingDefaults = DEFAULT_CUSTOM_PERMIT_TYPES.filter(d => !existingCodes.has(d.code));
        return [...customList, ...missingDefaults];
      }
      return DEFAULT_CUSTOM_PERMIT_TYPES;
    } catch (e) {
      return DEFAULT_CUSTOM_PERMIT_TYPES;
    }
  }

  static getPermitTypeLabel(permitType: string): string {
    const allTypes = this.getPermitTypes();
    const found = allTypes.find(t => t.code === permitType);
    if (found) return found.label;
    return PERMIT_TYPE_LABELS[permitType] || permitType;
  }

  static savePermitType(permitType: CustomPermitType): void {
    const list = this.getPermitTypes();
    const index = list.findIndex(t => t.code === permitType.code);
    if (index >= 0) {
      list[index] = { ...list[index], ...permitType };
    } else {
      list.push(permitType);
    }
    localStorage.setItem(STORAGE_KEYS.PERMIT_TYPES, JSON.stringify(list));
  }

  static deletePermitType(code: string): void {
    const list = this.getPermitTypes().filter(t => t.code !== code || t.isSystemDefault);
    localStorage.setItem(STORAGE_KEYS.PERMIT_TYPES, JSON.stringify(list));
  }

  // SPECIALIZED CHECKLISTS MANAGEMENT
  static getPermitChecklists(permitTypeCode: string): PermitChecklistTemplateItem[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PERMIT_CHECKLISTS);
      if (stored) {
        const checklistsMap: Record<string, PermitChecklistTemplateItem[]> = JSON.parse(stored);
        if (checklistsMap[permitTypeCode] && Array.isArray(checklistsMap[permitTypeCode]) && checklistsMap[permitTypeCode].length > 0) {
          return checklistsMap[permitTypeCode];
        }
      }
    } catch (e) {
      console.error('Error reading permit checklists:', e);
    }

    // Fallback to DEFAULT_PERMIT_CHECKLISTS if built-in
    const defaultList = DEFAULT_PERMIT_CHECKLISTS[permitTypeCode as keyof typeof DEFAULT_PERMIT_CHECKLISTS];
    if (defaultList && defaultList.length > 0) {
      return defaultList.map((item, idx) => ({
        id: `chk_tpl_${permitTypeCode.toLowerCase()}_${idx + 1}`,
        question: item.question
      }));
    }

    // Fallback default checklist items for new/custom permit types
    return [
      { id: `chk_tpl_${permitTypeCode.toLowerCase()}_1`, question: 'بررسی سلامت ظاهری تجهیزات، ماشین‌آلات و ابزارآلات مورد استفاده' },
      { id: `chk_tpl_${permitTypeCode.toLowerCase()}_2`, question: 'حضور سرپرست مستقیم کارگاهی و افسر ایمنی حین شروع عملیات اجرایی' },
      { id: `chk_tpl_${permitTypeCode.toLowerCase()}_3`, question: 'تحویل و استفاده کامل از تجهیزات حفاظت فردی (PPE) متناسب با نوع کار' },
      { id: `chk_tpl_${permitTypeCode.toLowerCase()}_4`, question: 'برگزاری جلسه توجیهی ایمنی پیش از کار (Toolbox Talk - TBM) برای نفرات' },
      { id: `chk_tpl_${permitTypeCode.toLowerCase()}_5`, question: 'مسدودسازی و ایمن‌سازی محدوده خطر با نوار هشدار و علائم بازدارنده' }
    ];
  }

  static savePermitChecklist(permitTypeCode: string, items: PermitChecklistTemplateItem[]): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PERMIT_CHECKLISTS);
      const checklistsMap: Record<string, PermitChecklistTemplateItem[]> = stored ? JSON.parse(stored) : {};
      checklistsMap[permitTypeCode] = items;
      localStorage.setItem(STORAGE_KEYS.PERMIT_CHECKLISTS, JSON.stringify(checklistsMap));
    } catch (e) {
      console.error('Error saving permit checklist:', e);
    }
  }

  static resetPermitChecklist(permitTypeCode: string): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PERMIT_CHECKLISTS);
      if (stored) {
        const checklistsMap: Record<string, PermitChecklistTemplateItem[]> = JSON.parse(stored);
        delete checklistsMap[permitTypeCode];
        localStorage.setItem(STORAGE_KEYS.PERMIT_CHECKLISTS, JSON.stringify(checklistsMap));
      }
    } catch (e) {
      console.error('Error resetting permit checklist:', e);
    }
  }

  static getDefaultChecklistForPermitType(permitType: PermitType): PermitChecklistItem[] {
    const templateItems = this.getPermitChecklists(permitType);
    return templateItems.map((item, idx) => ({
      id: `chk_${idx + 1}`,
      question: item.question,
      status: 'YES' as const,
      isChecked: true,
      comments: ''
    }));
  }

  // ENVIRONMENTAL
  static getEnvironmentalReports(projectId?: string): EnvironmentalReport[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.ENVIRONMENTAL);
      let list: EnvironmentalReport[] = stored ? JSON.parse(stored) : INITIAL_ENVIRONMENTAL_REPORTS;
      if (projectId) {
        list = list.filter(e => String(e.projectId) === String(projectId));
      }
      return list;
    } catch (e) {
      return INITIAL_ENVIRONMENTAL_REPORTS;
    }
  }

  static saveEnvironmentalReport(report: EnvironmentalReport): void {
    const list = this.getEnvironmentalReports();
    const index = list.findIndex(e => e.id === report.id);
    if (index >= 0) {
      list[index] = { ...report, updatedAt: Date.now() };
    } else {
      list.unshift({ ...report, createdAt: Date.now() });
    }
    localStorage.setItem(STORAGE_KEYS.ENVIRONMENTAL, JSON.stringify(list));
  }

  static deleteEnvironmentalReport(id: string): void {
    const list = this.getEnvironmentalReports().filter(e => e.id !== id);
    localStorage.setItem(STORAGE_KEYS.ENVIRONMENTAL, JSON.stringify(list));
  }

  // PERIODIC REPORTS
  static getPeriodicReports(projectId?: string): WeeklyMonthlyHseReport[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PERIODIC_REPORTS);
      let list: WeeklyMonthlyHseReport[] = stored ? JSON.parse(stored) : INITIAL_PERIODIC_REPORTS;
      if (projectId) {
        list = list.filter(r => String(r.projectId) === String(projectId));
      }
      return list;
    } catch (e) {
      return INITIAL_PERIODIC_REPORTS;
    }
  }

  static savePeriodicReport(report: WeeklyMonthlyHseReport): void {
    const list = this.getPeriodicReports();
    const index = list.findIndex(r => r.id === report.id);
    if (index >= 0) {
      list[index] = { ...report, updatedAt: Date.now() };
    } else {
      list.unshift({ ...report, createdAt: Date.now() });
    }
    localStorage.setItem(STORAGE_KEYS.PERIODIC_REPORTS, JSON.stringify(list));
  }

  static deletePeriodicReport(id: string): void {
    const list = this.getPeriodicReports().filter(r => r.id !== id);
    localStorage.setItem(STORAGE_KEYS.PERIODIC_REPORTS, JSON.stringify(list));
  }

  // HSE PLANS
  static getHsePlans(projectId?: string): HsePlan[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.HSE_PLANS);
      let list: HsePlan[] = stored ? JSON.parse(stored) : INITIAL_HSE_PLANS;
      if (projectId) {
        list = list.filter(p => String(p.projectId) === String(projectId));
      }
      return list;
    } catch (e) {
      return INITIAL_HSE_PLANS;
    }
  }

  static saveHsePlan(plan: HsePlan): void {
    const list = this.getHsePlans();
    const index = list.findIndex(p => p.id === plan.id);
    if (index >= 0) {
      list[index] = { ...plan, updatedAt: Date.now() };
    } else {
      list.unshift({ ...plan, createdAt: Date.now() });
    }
    localStorage.setItem(STORAGE_KEYS.HSE_PLANS, JSON.stringify(list));
  }

  static deleteHsePlan(id: string): void {
    const list = this.getHsePlans().filter(p => p.id !== id);
    localStorage.setItem(STORAGE_KEYS.HSE_PLANS, JSON.stringify(list));
  }

  static calculateHseStatistics(projectId?: string) {
    const stats = this.getProjectHseStats(projectId);
    const incidents = this.getIncidents(projectId);
    const openIncidents = incidents.filter(i => i.workflowStatus !== WorkflowStatus.APPROVED_FINAL && i.workflowStatus !== WorkflowStatus.REJECTED);
    return {
      safeManHours: stats.totalManHours,
      ltifr: parseFloat(stats.ltifr) || 0,
      ltisr: 0.00,
      activePermitsCount: stats.activePermitsCount,
      openIncidentsCount: openIncidents.length,
      environmentalComplianceRate: 98.5
    };
  }

  // Statistics calculation for Dashboard
  static getProjectHseStats(projectId?: string) {
    const permits = this.getWorkPermits(projectId);
    const incidents = this.getIncidents(projectId);
    const envReports = this.getEnvironmentalReports(projectId);
    const periodicReports = this.getPeriodicReports(projectId);

    const latestPeriodic = periodicReports[0];
    const totalManHours = latestPeriodic?.cumulativeSafeManHours || 192300;
    const ltiCount = incidents.filter(i => i.incidentType === 'LOST_TIME_INJURY' || i.incidentType === 'FATALITY').length;
    const nearMissCount = incidents.filter(i => i.incidentType === 'NEAR_MISS').length;
    const firstAidCount = incidents.filter(i => i.incidentType === 'FIRST_AID').length;
    const activePermitsCount = permits.filter(p => p.workflowStatus === WorkflowStatus.APPROVED_FINAL).length;
    const pendingPermitsCount = permits.filter(p => p.workflowStatus !== WorkflowStatus.APPROVED_FINAL && p.workflowStatus !== WorkflowStatus.REJECTED).length;
    
    // International standard LTIFR = (LTI * 1,000,000) / ManHours
    const ltifr = totalManHours > 0 ? ((ltiCount * 1000000) / totalManHours).toFixed(2) : '0.00';
    
    return {
      totalManHours,
      ltiCount,
      nearMissCount,
      firstAidCount,
      activePermitsCount,
      pendingPermitsCount,
      ltifr,
      envReportsCount: envReports.length,
      periodicReportsCount: periodicReports.length
    };
  }
}
