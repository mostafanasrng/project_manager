export function hexToRgb(hex: string) {
  let c = hex.replace('#', '');
  if (c.length === 3) {
    c = c.split('').map(x => x + x).join('');
  }
  const num = parseInt(c, 16);
  if (isNaN(num)) return { r: 217, g: 119, b: 6 };
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

export function adjustColorBrightness(hex: string, percent: number) {
  const { r, g, b } = hexToRgb(hex);
  const adjust = (val: number) => {
    const newVal = Math.round(val * (1 + percent / 100));
    return Math.min(255, Math.max(0, newVal));
  };
  const rNew = adjust(r).toString(16).padStart(2, '0');
  const gNew = adjust(g).toString(16).padStart(2, '0');
  const bNew = adjust(b).toString(16).padStart(2, '0');
  return `#${rNew}${gNew}${bNew}`;
}

export interface CuratedTheme {
  id: string;
  name: string;
  category: 'engineering' | 'modern' | 'nature' | 'executive' | 'vibrant';
  color: string;
  accentSecondary?: string;
  description: string;
  darkSurfaceHint?: string;
}

export const CURATED_THEMES: CuratedTheme[] = [
  // مهندسی و عمرانی استاندارد
  {
    id: 'amber-construction',
    name: 'طلایی عمرانی (پیش‌فرض)',
    category: 'engineering',
    color: '#d97706',
    description: 'تم استاندارد مهندسی کارگاه، یادآور تجهیزات و ایمنی عمرانی',
  },
  {
    id: 'industrial-orange',
    name: 'نارنجی صنعتی',
    category: 'engineering',
    color: '#ea580c',
    description: 'رنگ شاخص ایمنی و کلاه‌های سرپرستی پروژه‌های بزرگ',
  },
  {
    id: 'steel-blue',
    name: 'آبی متالیک فولاد',
    category: 'engineering',
    color: '#2563eb',
    description: 'الهام‌گرفته از سازه‌های فلزی، دفتر فنی و نقشه‌های مهندسی',
  },
  {
    id: 'cyan-petrochemical',
    name: 'فیروزه‌ای پتروشیمی',
    category: 'engineering',
    color: '#0891b2',
    description: 'آرامش‌بخش، تمیز و صنعتی متناسب با پروژه‌های نیروگاهی و پالایشگاهی',
  },

  // مدرن و فناوری پیشرفته
  {
    id: 'indigo-tech',
    name: 'نیلی مدرن (Digital PMO)',
    category: 'modern',
    color: '#4f46e5',
    description: 'ظاهری فوق‌پیشرفته و هوشمند برای کنترل پروژه‌های نوین',
  },
  {
    id: 'purple-innovation',
    name: 'بنفش رویال هوشمند',
    category: 'modern',
    color: '#7c3aed',
    description: 'پرانرژی و جذاب با حس مدرن سامانه‌های نوین برنامه‌ریزی',
  },
  {
    id: 'fuchsia-creative',
    name: 'یاقوتی ارغوانی',
    category: 'modern',
    color: '#c026d3',
    description: 'کنتراست بالا و جذاب برای فضاهای تحلیلی و داشبوردهای پویا',
  },

  // پایدار، زیست‌محیطی و معدنی
  {
    id: 'emerald-green',
    name: 'سبز زمردی پایدار',
    category: 'nature',
    color: '#059669',
    description: 'نماد پایداری، کنترل کیفیت بدون نقص و سازگاری زیست‌محیطی HSE',
  },
  {
    id: 'forest-teal',
    name: 'یشمی جنگلی',
    category: 'nature',
    color: '#0d9488',
    description: 'رنگ وزین مهندسی آب، سدسازی، راه‌سازی و منابع طبیعی',
  },
  {
    id: 'copper-bronze',
    name: 'برنز متالورژی',
    category: 'nature',
    color: '#b45309',
    description: 'خاکی گرم یادآور عملیات خاکی، خاک‌برداری و معادن',
  },

  // مدیریتی و سازمانی
  {
    id: 'slate-corporate',
    name: 'دودی سازمانی لوکس',
    category: 'executive',
    color: '#475569',
    description: 'حداقل جلب توجه رنگی، تمرکز خالص روی اعداد و ارقام مالی',
  },
  {
    id: 'crimson-executive',
    name: 'زرشکی پرستیژ',
    category: 'executive',
    color: '#be123c',
    description: 'مقتدر و رسمی مناسب گزارشات هیئت مدیره و جلسات کلان پیمانکاری',
  },
  {
    id: 'navy-director',
    name: 'سرمه‌ای اقیانوسی',
    category: 'executive',
    color: '#1d4ed8',
    description: 'کلاسیک‌ترین رنگ اداری و حقوقی مدیریت قراردادها و حقوقی',
  },
];

export function applyThemeColor(color: string) {
  if (!color) color = '#d97706';
  const { r, g, b } = hexToRgb(color);
  const hoverColor = adjustColorBrightness(color, -15); // 15% darker for hover
  
  const root = document.documentElement;
  root.style.setProperty('--primary-accent-color', color);
  root.style.setProperty('--primary-accent-hover', hoverColor);
  root.style.setProperty('--primary-accent-light', `rgba(${r}, ${g}, ${b}, 0.12)`);
  root.style.setProperty('--primary-accent-lighter', `rgba(${r}, ${g}, ${b}, 0.05)`);
  root.style.setProperty('--primary-accent-border', `rgba(${r}, ${g}, ${b}, 0.35)`);
  root.style.setProperty('--primary-accent-ring', `rgba(${r}, ${g}, ${b}, 0.45)`);
  root.style.setProperty('--primary-accent-rgb', `${r}, ${g}, ${b}`);
}

export function getSavedThemeColor(): string {
  if (typeof window === 'undefined') return '#d97706';
  return localStorage.getItem('hamyar_theme_color') || '#d97706';
}

export function setSavedThemeColor(color: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('hamyar_theme_color', color);
  }
  applyThemeColor(color);
}

