import { Personnel } from '../types';
import { SystemAdminService } from './systemAdminService';

const HR_STORAGE_KEY = 'hamyar_hr_personnel';

// Initial personnel list is empty by default
const INITIAL_PERSONNEL: Personnel[] = [];

export const HRService = {
  getPersonnelList: (orgId?: string): Personnel[] => {
    try {
      const data = localStorage.getItem(HR_STORAGE_KEY);
      let list: Personnel[] = data ? JSON.parse(data) : [];
      
      // Remove legacy mock demo seed personnel if present
      if (list.some(p => p.id && p.id.startsWith('hr-'))) {
        list = list.filter(p => !p.id.startsWith('hr-'));
        localStorage.setItem(HR_STORAGE_KEY, JSON.stringify(list));
      }

      if (orgId && orgId !== 'ALL') {
        return list.filter(p => p.orgId === orgId);
      }
      return list;
    } catch (e) {
      console.error('Error loading HR personnel:', e);
      return [];
    }
  },

  getPersonnelById: (id: string): Personnel | undefined => {
    const list = HRService.getPersonnelList();
    return list.find(p => p.id === id);
  },

  getPersonnelByOrg: (orgId: string): Personnel[] => {
    return HRService.getPersonnelList(orgId);
  },

  getPersonnelByUserId: (userId: string): Personnel | undefined => {
    const list = HRService.getPersonnelList();
    return list.find(p => p.userId === userId);
  },

  // Get list of personnel in an org who DO NOT have a system user account assigned yet
  // Or if currently editing a user, include the personnel currently assigned to that user
  getAvailablePersonnelForUserCreation: (orgId: string, currentPersonnelId?: string): Personnel[] => {
    const list = HRService.getPersonnelList(orgId);
    return list.filter(p => {
      // Must be active employee
      if (p.employmentStatus !== 'ACTIVE') return false;
      // Either has no user assigned, or is the personnel already linked to this user being edited
      if (!p.userId || p.id === currentPersonnelId) return true;
      return false;
    });
  },

  canManagePersonnel: (currentUserRole?: string | null, targetPersonnel?: Personnel): boolean => {
    const currentUser = SystemAdminService.getCurrentUser();
    const role = currentUserRole || currentUser?.role || localStorage.getItem('user_role');
    
    // Allow SYSTEM_ADMIN, ORG_ADMIN (مدیر پروژه / مدیر ارشد سازمان), ORG_MANAGER (سرپرست کارگاه)
    const isAllowedToManage = role === 'SYSTEM_ADMIN' || role === 'ORG_ADMIN' || role === 'ORG_MANAGER' ||
      currentUser?.jobLevel === 'سرپرست کارگاه' || currentUser?.jobLevel === 'سرپرست کارگاه (مسئول پروژه)' ||
      currentUser?.jobLevel === 'مدیر پروژه' || currentUser?.jobLevel === 'مدیر ارشد سازمان' ||
      currentUser?.jobTitle === 'سرپرست کارگاه' || currentUser?.jobTitle === 'مدیر پروژه';

    if (!isAllowedToManage) {
      return false;
    }

    // If targetPersonnel is specified, check if it belongs to an ORG_ADMIN or Senior Manager
    if (targetPersonnel) {
      const users = SystemAdminService.getUsers();
      const linkedUser = (targetPersonnel.userId ? users.find(u => u.id === targetPersonnel.userId) : null) ||
                         users.find(u => u.personnelId === targetPersonnel.id);

      if (linkedUser && linkedUser.role === 'ORG_ADMIN') {
        return role === 'SYSTEM_ADMIN';
      }

      if (targetPersonnel.jobLevel === 'مدیر ارشد سازمان' || targetPersonnel.jobLevel === 'مدیر پروژه') {
        return role === 'SYSTEM_ADMIN';
      }
    }

    return true;
  },

  savePersonnel: (personnel: Personnel): Personnel => {
    const currentUser = SystemAdminService.getCurrentUser();
    const role = currentUser?.role || localStorage.getItem('user_role');

    if (personnel.jobLevel === 'مدیر ارشد سازمان' || personnel.jobLevel === 'مدیر پروژه') {
      if (role !== 'SYSTEM_ADMIN') {
        throw new Error('تعریف یا ویرایش پرونده پرسنلی مدیر ارشد سازمان (مدیر پروژه) فقط توسط مدیر کل سیستم امکان‌پذیر است.');
      }
    }

    if (!HRService.canManagePersonnel(role, personnel)) {
      throw new Error('ویرایش یا تغییر پرونده پرسنلی مدیر ارشد سازمان فقط توسط مدیر کل سیستم امکان‌پذیر است.');
    }

    const list = HRService.getPersonnelList();
    const index = list.findIndex(p => p.id === personnel.id);
    
    // Ensure fullName is computed
    const fullName = personnel.fullName?.trim() || `${personnel.firstName.trim()} ${personnel.lastName.trim()}`;
    const updatedPersonnel: Personnel = {
      ...personnel,
      fullName,
      createdAt: personnel.createdAt || new Date().toLocaleDateString('fa-IR')
    };

    if (index >= 0) {
      list[index] = updatedPersonnel;
    } else {
      list.push(updatedPersonnel);
    }

    localStorage.setItem(HR_STORAGE_KEY, JSON.stringify(list));

    // Synchronize signature and user data if linked to a system user
    if (updatedPersonnel.userId) {
      try {
        const users = SystemAdminService.getUsers();
        const linkedUser = users.find(u => u.id === updatedPersonnel.userId || u.personnelId === updatedPersonnel.id);
        if (linkedUser) {
          linkedUser.fullName = updatedPersonnel.fullName;
          linkedUser.jobLevel = updatedPersonnel.jobLevel;
          linkedUser.jobTitle = updatedPersonnel.jobTitle || '';
          linkedUser.department = updatedPersonnel.department || '';
          linkedUser.mobile = updatedPersonnel.mobile;
          linkedUser.email = updatedPersonnel.email;
          linkedUser.signature = updatedPersonnel.signature;
          linkedUser.signatureDate = updatedPersonnel.signatureDate;
          if (updatedPersonnel.projectIds) {
            linkedUser.projectIds = updatedPersonnel.projectIds;
          }
          SystemAdminService.saveUser(linkedUser);
        }
      } catch (err) {
        console.warn('Could not sync user with personnel changes:', err);
      }
    }

    // Audit log
    SystemAdminService.addAuditLog({
      action: index >= 0 ? 'UPDATE_PERSONNEL' : 'CREATE_PERSONNEL',
      details: `${index >= 0 ? 'ویرایش' : 'ثبت'} پرسنل ${fullName} (کد: ${personnel.personnelCode}) در منابع انسانی`,
      source: 'منابع انسانی',
      sourceType: 'HR'
    });

    return updatedPersonnel;
  },

  // Get user's registered electronic signature
  getSignatureByUserId: (userId?: string): string | undefined => {
    if (!userId) return undefined;
    const personnel = HRService.getPersonnelByUserId(userId);
    if (personnel?.signature) {
      return personnel.signature;
    }
    const users = SystemAdminService.getUsers();
    const u = users.find(user => user.id === userId);
    return u?.signature;
  },

  // Get personnel's registered electronic signature
  getSignatureByPersonnelId: (personnelId?: string): string | undefined => {
    if (!personnelId) return undefined;
    const personnel = HRService.getPersonnelById(personnelId);
    return personnel?.signature;
  },

  // Generate a distinct, realistic Persian electronic signature SVG data URL
  generateDefaultSignature: (user?: { fullName?: string; username?: string; jobTitle?: string } | null): string => {
    const name = user?.fullName || user?.username || 'امضاء';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 70" width="180" height="70">
      <path d="M 20,45 Q 50,15 80,40 T 130,35 Q 155,25 165,48 Q 135,58 95,54 Q 50,58 20,45 Z" fill="none" stroke="#1e3a8a" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M 35,30 Q 65,10 95,28 Q 125,46 150,22" fill="none" stroke="#2563eb" stroke-width="1.6" stroke-linecap="round"/>
      <path d="M 45,50 C 75,62 115,62 145,46" fill="none" stroke="#1d4ed8" stroke-width="1.8" stroke-linecap="round"/>
      <text x="90" y="65" font-family="Tahoma, Arial, sans-serif" font-size="11" font-weight="bold" fill="#1e3a8a" text-anchor="middle">${name}</text>
    </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  },

  // General resolver for user / actor signature - HR Personnel dossier is primary source of truth
  getUserSignature: (user?: { id?: string; username?: string; fullName?: string; personnelId?: string; signature?: string } | null): string | undefined => {
    if (!user) return undefined;

    const normName = (s?: string) => {
      if (!s) return '';
      return s
        .replace(/[\u200C\u200B]/g, ' ')
        .replace(/[ي]/g, 'ی')
        .replace(/[ك]/g, 'ک')
        .replace(/[آأإ]/g, 'ا')
        .replace(/الله/g, 'اله')
        .replace(/^(مهندس|دکتر|آقای|خانم|سرکار\s+خانم|استاد)\s+/gi, '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
    };

    // 1. Query HR Personnel dossier FIRST by personnelId
    if (user.personnelId) {
      const sig = HRService.getSignatureByPersonnelId(user.personnelId);
      if (sig) return sig;
    }

    // 2. Query HR Personnel dossier by userId
    if (user.id) {
      const pByUserId = HRService.getPersonnelByUserId(user.id);
      if (pByUserId?.signature) return pByUserId.signature;

      const sig = HRService.getSignatureByUserId(user.id);
      if (sig) return sig;

      const sysUser = SystemAdminService.getUsers().find(u => u.id === user.id || u.username === user.username);
      if (sysUser?.signature) return sysUser.signature;
    }

    // 3. Query HR Personnel dossier by normalized fullName
    if (user.fullName) {
      const targetNorm = normName(user.fullName);
      if (targetNorm) {
        const pList = HRService.getPersonnelList();
        const pMatch = pList.find(item => normName(item.fullName) === targetNorm);
        if (pMatch?.signature) return pMatch.signature;

        const sysUsers = SystemAdminService.getUsers();
        const uMatch = sysUsers.find(u => normName(u.fullName) === targetNorm);
        if (uMatch?.signature) return uMatch.signature;
      }
    }

    // 4. Fallback to signature directly on user object if HR search yielded nothing
    if (user.signature) {
      return user.signature;
    }

    // 5. Fallback to auto-generated official digital signature SVG
    return HRService.generateDefaultSignature(user);
  },

  // Save/register user electronic signature into user/personnel record
  saveUserSignature: (userId: string, signature: string): void => {
    if (!userId || !signature) return;
    const users = SystemAdminService.getUsers();
    const targetUser = users.find(u => u.id === userId || u.username === userId);
    if (targetUser) {
      targetUser.signature = signature;
      SystemAdminService.saveUser(targetUser);
    }
    const personnel = HRService.getPersonnelByUserId(userId);
    if (personnel) {
      personnel.signature = signature;
      const list = HRService.getPersonnelList();
      const idx = list.findIndex(p => p.id === personnel.id);
      if (idx >= 0) {
        list[idx].signature = signature;
        localStorage.setItem(HR_STORAGE_KEY, JSON.stringify(list));
      }
    }
  },

  deletePersonnel: (id: string): boolean => {
    const target = HRService.getPersonnelById(id);
    if (!target) return false;

    if (!HRService.canManagePersonnel(undefined, target)) {
      throw new Error('حذف پرونده پرسنلی مدیر ارشد سازمان فقط توسط مدیر کل سیستم امکان‌پذیر است.');
    }

    const currentUserRole = SystemAdminService.getCurrentUser()?.role || localStorage.getItem('user_role');

    if (target.userId) {
      const users = SystemAdminService.getUsers();
      const linkedUser = users.find(u => u.id === target.userId || u.personnelId === target.id);
      if (linkedUser) {
        if (currentUserRole === 'SYSTEM_ADMIN') {
          linkedUser.personnelId = undefined;
          SystemAdminService.saveUser(linkedUser);
        } else {
          throw new Error(`این پرسنل دارای حساب کاربری فعال (${linkedUser.username}) در سامانه می‌باشد. ابتدا حساب کاربری وی را غیرفعال یا حذف کنید.`);
        }
      }
    }

    const list = HRService.getPersonnelList().filter(p => p.id !== id);
    localStorage.setItem(HR_STORAGE_KEY, JSON.stringify(list));

    SystemAdminService.addAuditLog({
      action: 'DELETE_PERSONNEL',
      details: `حذف پرونده پرسنلی ${target.fullName} (کد: ${target.personnelCode})`,
      source: 'منابع انسانی',
      sourceType: 'HR'
    });

    return true;
  },

  deleteAllPersonnel: (orgId?: string): boolean => {
    const currentUser = SystemAdminService.getCurrentUser();
    const currentUserRole = currentUser?.role || localStorage.getItem('user_role');
    if (currentUserRole !== 'SYSTEM_ADMIN') {
      throw new Error('حذف کلیه پرونده‌های پرسنلی فقط توسط مدیر کل سیستم امکان‌پذیر است.');
    }

    let allPersonnel = HRService.getPersonnelList();
    let remainingPersonnel: Personnel[] = [];

    if (orgId && orgId !== 'ALL') {
      remainingPersonnel = allPersonnel.filter(p => p.orgId !== orgId);
    } else {
      remainingPersonnel = [];
    }

    // Unlink personnelId from users
    const users = SystemAdminService.getUsers();
    let usersUpdated = false;
    const remainingPersonnelIds = new Set(remainingPersonnel.map(p => p.id));

    users.forEach(u => {
      if (u.personnelId && !remainingPersonnelIds.has(u.personnelId)) {
        u.personnelId = undefined;
        usersUpdated = true;
      }
    });

    if (usersUpdated) {
      localStorage.setItem('system_admin_users', JSON.stringify(users));
    }

    localStorage.setItem(HR_STORAGE_KEY, JSON.stringify(remainingPersonnel));

    SystemAdminService.addAuditLog({
      action: 'DELETE_ALL_PERSONNEL',
      details: orgId && orgId !== 'ALL'
        ? `حذف تمامی پرونده‌های پرسنلی سازمان ${orgId} توسط مدیر کل سیستم`
        : 'حذف تمامی پرونده‌های پرسنلی ثبت‌شده در سامانه توسط مدیر کل سیستم',
      source: 'منابع انسانی',
      sourceType: 'HR'
    });

    return true;
  },

  // Link a SystemUser to a Personnel record
  linkUserToPersonnel: (personnelId: string, userId: string): void => {
    const list = HRService.getPersonnelList();
    const target = list.find(p => p.id === personnelId);
    if (target) {
      // Clear userId from any previous personnel that might have held this userId
      list.forEach(p => {
        if (p.userId === userId && p.id !== personnelId) {
          p.userId = undefined;
        }
      });
      target.userId = userId;
      localStorage.setItem(HR_STORAGE_KEY, JSON.stringify(list));
    }
  },

  // Unlink personnel from system user
  unlinkPersonnelByUserId: (userId: string): void => {
    const list = HRService.getPersonnelList();
    let updated = false;
    list.forEach(p => {
      if (p.userId === userId) {
        p.userId = undefined;
        updated = true;
      }
    });
    if (updated) {
      localStorage.setItem(HR_STORAGE_KEY, JSON.stringify(list));
    }
  },

  // Synchronize existing personnel of an organization to a new project
  syncOrgPersonnelToNewProject: (orgId: string, projectId: string): void => {
    if (!orgId || !projectId) return;
    try {
      const data = localStorage.getItem(HR_STORAGE_KEY);
      if (!data) return;
      let list: Personnel[] = JSON.parse(data);
      let changed = false;
      const targetPId = String(projectId).trim();

      list = list.map(p => {
        if (p.orgId === orgId) {
          const currentPids = (p.projectIds && p.projectIds.length > 0)
            ? p.projectIds.map(String)
            : (p.projectId ? [String(p.projectId)] : []);

          if (!currentPids.includes(targetPId)) {
            changed = true;
            return {
              ...p,
              projectId: p.projectId || targetPId,
              projectIds: Array.from(new Set([...currentPids, targetPId]))
            };
          }
        }
        return p;
      });

      if (changed) {
        localStorage.setItem(HR_STORAGE_KEY, JSON.stringify(list));
      }
    } catch (e) {
      console.error('Error syncing personnel to new project in HRService:', e);
    }
  }
};
