import { toJalaali, toGregorian, isLeapJalaaliYear, isValidJalaaliDate, jalaaliMonthLength } from 'jalaali-js';

export const SHAMSI_MONTH_NAMES = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند'
];

export const SHAMSI_WEEK_DAYS = [
  { key: 'sa', short: 'ش', full: 'شنبه' },
  { key: 'su', short: 'ی', full: 'یکشنبه' },
  { key: 'mo', short: 'د', full: 'دوشنبه' },
  { key: 'tu', short: 'س', full: 'سه‌شنبه' },
  { key: 'we', short: 'چ', full: 'چهارشنبه' },
  { key: 'th', short: 'پ', full: 'پنجشنبه' },
  { key: 'fr', short: 'ج', full: 'جمعه' }
];

/**
 * Returns today's date in Shamsi format YYYY/MM/DD with 2-digit month and day.
 */
export const getTodayShamsi = (): string => {
  const today = toJalaali(new Date());
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${today.jy}/${pad(today.jm)}/${pad(today.jd)}`;
};

/**
 * Parses a Shamsi date string (e.g. '1403/07/15') into year, month, day numbers.
 */
export const parseShamsiDate = (str: string): { year: number; month: number; day: number } | null => {
  if (!str) return null;
  const clean = String(str)
    .replace(/[۰-۹]/g, d => String.fromCharCode(d.charCodeAt(0) - 1776 + 48))
    .replace(/[٠-٩]/g, d => String.fromCharCode(d.charCodeAt(0) - 1632 + 48))
    .replace(/[^\d/]/g, '');
  const parts = clean.split('/').filter(Boolean).map(p => parseInt(p, 10));
  if (parts.length >= 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return { year: parts[0], month: parts[1], day: parts[2] };
  }
  return null;
};

/**
 * Returns the number of days in a given Shamsi month (handles leap years for Esfand).
 */
export const getDaysInShamsiMonth = (year: number, month: number): number => {
  if (month < 1 || month > 12) return 30;
  return jalaaliMonthLength(year, month);
};

/**
 * Returns the day of week index for the 1st day of the given Shamsi month.
 * 0 = شنبه (Saturday), 1 = یکشنبه, ..., 6 = جمعه (Friday).
 */
export const getFirstDayOfWeekInShamsiMonth = (year: number, month: number): number => {
  const g = toGregorian(year, month, 1);
  const d = new Date(g.gy, g.gm - 1, g.gd);
  return (d.getDay() + 1) % 7;
};

/**
 * Checks if a Shamsi date is valid.
 */
export const isValidShamsiDate = (year: number, month: number, day: number): boolean => {
  return isValidJalaaliDate(year, month, day);
};

/**
 * Automatically formats a string to a Shamsi/Jalali date format (YYYY/MM/DD) as the user types.
 * It extracts all English and Persian digits and places '/' at indices 4 and 7.
 * Deleting works perfectly.
 */
export const formatShamsiDate = (value: string): string => {
  // Extract all digits (English: 0-9, Persian: ۰-۹, Arabic: ٠-٩)
  const digitsOnly = value.replace(/[^\d۰-۹٠-٩]/g, '');
  
  if (digitsOnly.length <= 4) {
    return digitsOnly;
  } else if (digitsOnly.length <= 6) {
    return `${digitsOnly.slice(0, 4)}/${digitsOnly.slice(4)}`;
  } else {
    return `${digitsOnly.slice(0, 4)}/${digitsOnly.slice(4, 6)}/${digitsOnly.slice(6, 8)}`;
  }
};

/**
 * Converts a Jalali (Shamsi) date to a cumulative day index from base year 979 AP.
 */
export const jalaliToDayNumber = (year: number, month: number, day: number): number => {
  const y = year - 979;
  const d = Math.max(1, Math.min(31, day)) - 1;
  const m = Math.max(1, Math.min(12, month));
  
  let dayInYear = 0;
  if (m <= 6) {
    dayInYear = (m - 1) * 31 + d;
  } else {
    dayInYear = 6 * 31 + (m - 7) * 30 + d;
  }
  return 365 * y + Math.floor(y / 33) * 8 + Math.floor(((y % 33) + 3) / 4) + dayInYear;
};

/**
 * Calculates the exact duration difference in days between two Shamsi dates (YYYY/MM/DD).
 */
export const calculateShamsiDayDiff = (startDateStr: string, endDateStr: string): number => {
  if (!startDateStr || !endDateStr) return 0;
  
  const parseShamsi = (str: string) => {
    const clean = String(str || '')
      .replace(/[۰-۹]/g, d => String.fromCharCode(d.charCodeAt(0) - 1776 + 48))
      .replace(/[٠-٩]/g, d => String.fromCharCode(d.charCodeAt(0) - 1632 + 48))
      .replace(/[^\d/]/g, '');
    const parts = clean.split('/').filter(Boolean).map(p => parseInt(p, 10));
    if (parts.length >= 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      return { year: parts[0], month: parts[1], day: parts[2] };
    }
    return null;
  };

  const start = parseShamsi(startDateStr);
  const end = parseShamsi(endDateStr);
  if (!start || !end) return 0;

  const startDays = jalaliToDayNumber(start.year, start.month, start.day);
  const endDays = jalaliToDayNumber(end.year, end.month, end.day);
  const diff = endDays - startDays;
  return diff >= 0 ? diff : 0;
};

/**
 * Converts cumulative day number back to Shamsi YYYY/MM/DD string.
 */
export const dayNumberToJalali = (dayNumber: number): string => {
  let y = Math.floor((dayNumber + 1) / 365.242);
  let year = y + 979;
  let d = dayNumber - (365 * y + Math.floor(y / 33) * 8 + Math.floor(((y % 33) + 3) / 4));
  while (d < 0) {
    y--;
    year = y + 979;
    d = dayNumber - (365 * y + Math.floor(y / 33) * 8 + Math.floor(((y % 33) + 3) / 4));
  }
  
  let month = 1;
  let day = 1;
  if (d < 6 * 31) {
    month = Math.floor(d / 31) + 1;
    day = (d % 31) + 1;
  } else {
    const rem = d - 6 * 31;
    month = Math.floor(rem / 30) + 7;
    day = (rem % 30) + 1;
  }
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${year}/${pad(month)}/${pad(day)}`;
};

/**
 * Adds a number of days to a Shamsi date and returns the resulting Shamsi date (YYYY/MM/DD).
 */
export const addDaysToShamsiDate = (shamsiDate: string, daysToAdd: number): string => {
  if (!shamsiDate) return '';
  const clean = String(shamsiDate)
    .replace(/[۰-۹]/g, d => String.fromCharCode(d.charCodeAt(0) - 1776 + 48))
    .replace(/[٠-٩]/g, d => String.fromCharCode(d.charCodeAt(0) - 1632 + 48))
    .replace(/[^\d/]/g, '');
  const parts = clean.split('/').filter(Boolean).map(p => parseInt(p, 10));
  if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) return shamsiDate;
  
  const currentDays = jalaliToDayNumber(parts[0], parts[1], parts[2]);
  const newDays = currentDays + Math.round(daysToAdd);
  return dayNumberToJalali(newDays);
};

export interface DateInterval {
  id?: string;
  start: number; // day number
  end: number;   // day number
  startDate: string;
  endDate: string;
  grossDays: number;
}

/**
 * Merges overlapping and consecutive date intervals to compute net unique days.
 */
export const calculateIntervalsUnionAndOverlap = (
  intervals: { startDate: string; endDate: string; claimedDays?: number }[]
): {
  grossDays: number;
  netDays: number;
  overlapDays: number;
  mergedIntervals: { startDate: string; endDate: string; days: number }[];
} => {
  const validIntervals: { start: number; end: number; gross: number }[] = [];
  let totalGross = 0;

  for (const item of intervals) {
    if (!item.startDate || !item.endDate) continue;
    const cleanS = String(item.startDate).replace(/[^\d/]/g, '').split('/').map(Number);
    const cleanE = String(item.endDate).replace(/[^\d/]/g, '').split('/').map(Number);
    if (cleanS.length < 3 || cleanE.length < 3 || cleanS.some(isNaN) || cleanE.some(isNaN)) continue;

    const sDay = jalaliToDayNumber(cleanS[0], cleanS[1], cleanS[2]);
    const eDay = jalaliToDayNumber(cleanE[0], cleanE[1], cleanE[2]);
    const start = Math.min(sDay, eDay);
    const end = Math.max(sDay, eDay);
    const calculatedDays = end - start + 1;
    const gross = (typeof item.claimedDays === 'number' && item.claimedDays > 0) ? item.claimedDays : calculatedDays;
    totalGross += gross;
    validIntervals.push({ start, end, gross });
  }

  if (validIntervals.length === 0) {
    return { grossDays: 0, netDays: 0, overlapDays: 0, mergedIntervals: [] };
  }

  // Sort by start date
  validIntervals.sort((a, b) => a.start - b.start);

  // Merge intervals
  const merged: { start: number; end: number }[] = [];
  let current = { start: validIntervals[0].start, end: validIntervals[0].end };

  for (let i = 1; i < validIntervals.length; i++) {
    const next = validIntervals[i];
    if (next.start <= current.end) {
      // Overlapping or touching
      current.end = Math.max(current.end, next.end);
    } else {
      merged.push({ ...current });
      current = { start: next.start, end: next.end };
    }
  }
  merged.push(current);

  let netDays = 0;
  const mergedOutput = merged.map(m => {
    const span = m.end - m.start + 1;
    netDays += span;
    return {
      startDate: dayNumberToJalali(m.start),
      endDate: dayNumberToJalali(m.end),
      days: span
    };
  });

  const overlapDays = Math.max(0, totalGross - netDays);

  return {
    grossDays: totalGross,
    netDays,
    overlapDays,
    mergedIntervals: mergedOutput
  };
};

/**
 * Compares two Shamsi dates (YYYY/MM/DD).
 * Returns -1 if date1 < date2, 0 if date1 === date2, 1 if date1 > date2.
 */
export const compareShamsiDates = (date1Str: string, date2Str: string): number => {
  const d1 = parseShamsiDate(date1Str);
  const d2 = parseShamsiDate(date2Str);
  if (!d1 && !d2) return 0;
  if (!d1) return -1;
  if (!d2) return 1;

  const day1 = jalaliToDayNumber(d1.year, d1.month, d1.day);
  const day2 = jalaliToDayNumber(d2.year, d2.month, d2.day);

  if (day1 < day2) return -1;
  if (day1 > day2) return 1;
  return 0;
};

/**
 * Checks whether a given Shamsi date has already passed relative to today (or a reference Shamsi date).
 */
export const isDatePassed = (dateStr: string, referenceDateStr?: string): boolean => {
  if (!dateStr) return false;
  const ref = referenceDateStr || getTodayShamsi();
  return compareShamsiDates(ref, dateStr) >= 0;
};

export interface PlannedProgressResult {
  plannedProgress: number; // 0 - 100
  elapsedDays: number;
  totalDays: number;
  remainingDays: number;
  isStarted: boolean;
  isOverdue: boolean;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED_SCHEDULE';
}

/**
 * Automatically calculates planned physical progress percent (0-100)
 * for an activity based on its baseline start date, baseline end date,
 * and current system day (or supplied Shamsi date).
 */
export const calculateActivityPlannedProgress = (
  startDateStr: string,
  endDateStr: string,
  currentDateStr?: string
): PlannedProgressResult => {
  const todayStr = currentDateStr || getTodayShamsi();
  const s = parseShamsiDate(startDateStr);
  const e = parseShamsiDate(endDateStr);
  const t = parseShamsiDate(todayStr);

  if (!s || !e || !t) {
    return {
      plannedProgress: 0,
      elapsedDays: 0,
      totalDays: 0,
      remainingDays: 0,
      isStarted: false,
      isOverdue: false,
      status: 'NOT_STARTED'
    };
  }

  const startDay = jalaliToDayNumber(s.year, s.month, s.day);
  const endDay = jalaliToDayNumber(e.year, e.month, e.day);
  const todayDay = jalaliToDayNumber(t.year, t.month, t.day);

  const totalDays = Math.max(1, endDay - startDay + 1);

  if (todayDay < startDay) {
    return {
      plannedProgress: 0,
      elapsedDays: 0,
      totalDays,
      remainingDays: totalDays,
      isStarted: false,
      isOverdue: false,
      status: 'NOT_STARTED'
    };
  }

  if (todayDay >= endDay) {
    return {
      plannedProgress: 100,
      elapsedDays: totalDays,
      totalDays,
      remainingDays: 0,
      isStarted: true,
      isOverdue: todayDay > endDay,
      status: 'COMPLETED_SCHEDULE'
    };
  }

  // Inside the activity duration
  const elapsedDays = Math.max(1, todayDay - startDay + 1);
  const remainingDays = Math.max(0, endDay - todayDay);
  const rawProgress = (elapsedDays / totalDays) * 100;
  const plannedProgress = Math.min(100, Math.max(0, Math.round(rawProgress * 10) / 10));

  return {
    plannedProgress,
    elapsedDays,
    totalDays,
    remainingDays,
    isStarted: true,
    isOverdue: false,
    status: 'IN_PROGRESS'
  };
};


