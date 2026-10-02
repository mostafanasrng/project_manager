import { SystemUser } from '../../types';

export interface MeetingAttendeeMatchItem {
  userId?: string;
  personnelId?: string;
  name?: string;
  role?: string;
  organization?: string;
  orgType?: string;
  attendanceStatus?: string;
  signed?: boolean;
}

// Helper to normalize Persian strings (strip honorifics, normalize Arabic/Persian character variations, whitespace & half-space)
export const normalizePersianName = (s: string): string => {
  if (!s) return '';
  return s
    .replace(/[\u200C\u200B]/g, ' ') // half spaces to regular spaces
    .replace(/[ي]/g, 'ی')
    .replace(/[ك]/g, 'ک')
    .replace(/[آأإ]/g, 'ا')
    .replace(/الله/g, 'اله')
    .replace(/^(مهندس|دکتر|آقای|خانم|سرکار\s+خانم|استاد)\s+/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
};

/**
 * Calculates a match score between a meeting attendee and a system user.
 * 
 * Rules:
 * 1. Direct userId match -> 1000 score.
 * 2. Direct personnelId match -> 980 score.
 * 3. Real person's name matching with normalized Persian characters.
 */
export const getAttendeeMatchScore = (
  att: MeetingAttendeeMatchItem,
  user: SystemUser | null,
  userOrgKey?: string
): number => {
  if (!user || !att) return 0;

  const aUserId = att.userId;
  const aPersonnelId = att.personnelId;

  // 1. Direct userId match
  if (aUserId && user.id) {
    if (aUserId === user.id) {
      return 1000;
    }
    // If attendee is bound to another user account, it is definitively NOT this user
    return 0;
  }

  // 2. Direct personnelId match
  if (aPersonnelId && user.personnelId) {
    if (aPersonnelId === user.personnelId) {
      return 980;
    }
  }

  const uName = (user.fullName || '').trim();
  const uTitle = (user.jobTitle || user.jobLevel || '').trim().toLowerCase();
  const aRawName = (att.name || '').trim();
  const aRole = (att.role || '').trim().toLowerCase();

  const normUName = normalizePersianName(uName);
  const normAName = normalizePersianName(aRawName);

  // Check if attendee name is purely a generic role rather than a person's name
  const placeholderRoleNames = [
    'سرپرست کارگاه', 'سرپرست نظارت', 'ناظر مقیم', 'مدیر پروژه', 'مدیرپروژه',
    'سرپرست واحد', 'نماینده پیمانکار', 'نماینده مشاور', 'نماینده کارفرما',
    'کارشناس', 'مهندس', 'عضو حاضر', 'حاضر در جلسه'
  ];
  const isGenericPlaceholder = !normAName || placeholderRoleNames.some(p => normAName === p || normAName === normalizePersianName(p));

  // 2. Real person's name matching
  if (!isGenericPlaceholder && normUName && normAName) {
    // Exact match
    if (normAName === normUName) {
      return 900;
    }

    // Substring match only if substantial length (>= 5 chars)
    if (normUName.length >= 5 && normAName.length >= 5) {
      if (normAName.includes(normUName) || normUName.includes(normAName)) {
        return 850;
      }
    }

    // Token-based matching (both first name AND last name tokens or unique long last name >= 5 chars)
    const splitTokens = (s: string) => 
      s.split(/[\s\-_/()]+/).filter(w => 
        w.length >= 3 && 
        !['مهندس', 'آقای', 'خانم', 'دکتر', 'سرپرست', 'مدیر', 'کارشناس', 'واحد', 'پیمانکار', 'مشاور', 'کارفرما'].includes(w)
      );

    const uTokens = splitTokens(normUName);
    const aTokens = splitTokens(normAName);

    if (uTokens.length >= 2 && aTokens.length >= 2) {
      const matchingCount = uTokens.filter(ut => aTokens.some(at => ut === at || (ut.length >= 4 && at.length >= 4 && (ut.includes(at) || at.includes(ut))))).length;
      if (matchingCount >= 2) {
        return 800;
      }
    } else if (uTokens.length > 0 && aTokens.length > 0) {
      const exactLongToken = uTokens.some(ut => ut.length >= 5 && aTokens.includes(ut));
      if (exactLongToken) {
        return 750;
      }
    }

    // If attendee has a real name and it did NOT match the user's name, do NOT match
    return 0;
  }

  // 3. Unfilled placeholder role matching (ONLY if attendee has no person name)
  if (isGenericPlaceholder && uTitle) {
    const targetRole = `${aRawName} ${aRole}`.toLowerCase();

    const uWahdat = uTitle.includes('واحد');
    const uKargah = uTitle.includes('کارگاه');
    const uNazarat = uTitle.includes('نظارت');
    const uProject = uTitle.includes('پروژه');

    const aWahdat = targetRole.includes('واحد');
    const aKargah = targetRole.includes('کارگاه');
    const aNazarat = targetRole.includes('نظارت');
    const aProject = targetRole.includes('پروژه');

    // Strict conflict checks
    if (uWahdat && !aWahdat && (aKargah || aNazarat)) return 0;
    if (uKargah && !aKargah && (aWahdat || aNazarat)) return 0;
    if (uNazarat && !aNazarat && (aKargah || aWahdat)) return 0;
    if (uProject && !aProject && (aWahdat || aKargah)) return 0;

    // Specific role matches
    if (uWahdat && aWahdat) return 450;
    if (uKargah && aKargah) return 450;
    if (uNazarat && aNazarat) return 450;
    if (uProject && aProject) return 450;

    if (uTitle.includes('سرپرست کارگاه') && targetRole.includes('سرپرست کارگاه')) return 500;
    if (uTitle.includes('سرپرست نظارت') && targetRole.includes('سرپرست نظارت')) return 500;
    if (uTitle.includes('مدیر پروژه') && targetRole.includes('مدیر پروژه')) return 500;
  }

  return 0;
};
