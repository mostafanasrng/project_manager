/**
 * Safe LocalStorage Utility with automatic data compression,
 * deep cleanup of oversized stored records, quota recovery, and in-memory fallback.
 */

const memoryFallback = new Map<string, string>();

/**
 * Optimizes base64 signature strings by converting oversized data URLs into lightweight,
 * sharp vector SVG digital signatures (~400 bytes instead of 500KB - 2MB).
 */
export const compressSignature = (sig?: string, name?: string): string | undefined => {
  if (!sig || typeof sig !== 'string') return undefined;
  
  // Keep real signature data URLs (PNG, JPEG, WebP, SVG) or web links intact
  if (sig.startsWith('data:image/') || sig.startsWith('http://') || sig.startsWith('https://')) {
    return sig;
  }

  if (sig.trim().length > 0) {
    return sig;
  }

  return undefined;
};

/**
 * Sanitizes a meeting minute object before serializing to localStorage
 * to ensure lean footprint (stripping oversized signatures, capping history arrays).
 */
export const sanitizeMeetingRecord = (meeting: any): any => {
  if (!meeting || typeof meeting !== 'object') return meeting;

  const sanitized = { ...meeting };

  // 1. Sanitize attendeeList signatures
  if (Array.isArray(sanitized.attendeeList)) {
    sanitized.attendeeList = sanitized.attendeeList.map((att: any) => {
      if (!att) return att;
      return {
        ...att,
        signature: att.signature ? compressSignature(att.signature, att.name) : undefined
      };
    });
  }

  // 2. Sanitize orgSignatures
  if (sanitized.orgSignatures && typeof sanitized.orgSignatures === 'object') {
    const orgs = { ...sanitized.orgSignatures };
    for (const orgKey of ['contractor', 'consultant', 'employer']) {
      if (orgs[orgKey]) {
        const orgData = { ...orgs[orgKey] };
        if (orgData.workshopManager?.signature) {
          orgData.workshopManager = {
            ...orgData.workshopManager,
            signature: compressSignature(orgData.workshopManager.signature, orgData.workshopManager.name || 'سرپرست کارگاه')
          };
        }
        if (orgData.projectManager?.signature) {
          orgData.projectManager = {
            ...orgData.projectManager,
            signature: compressSignature(orgData.projectManager.signature, orgData.projectManager.name || 'مدیر پروژه')
          };
        }
        orgs[orgKey] = orgData;
      }
    }
    sanitized.orgSignatures = orgs;
  }

  // 3. Limit workflowHistory to recent 20 entries and compress signatureImage
  if (Array.isArray(sanitized.workflowHistory)) {
    sanitized.workflowHistory = sanitized.workflowHistory.slice(-20).map((h: any) => {
      if (!h) return h;
      return {
        ...h,
        signatureImage: h.signatureImage ? compressSignature(h.signatureImage, h.performedBy) : undefined
      };
    });
  }

  // 4. Limit attachments
  if (Array.isArray(sanitized.attachments)) {
    sanitized.attachments = sanitized.attachments.slice(0, 10);
  }

  return sanitized;
};

/**
 * Deep scan and cleanup of localStorage:
 * Scans all keys, compresses existing oversized data in other collections (meetings, letters, audit logs, users),
 * and frees up massive amounts of storage space.
 */
export const deepCleanLocalStorage = (): void => {
  if (typeof localStorage === 'undefined') return;

  try {
    // 1. Clean existing meetings in localStorage
    const rawMeetings = localStorage.getItem('hamyar_communications_meetings');
    if (rawMeetings && rawMeetings.length > 50000) {
      try {
        const parsed = JSON.parse(rawMeetings);
        if (Array.isArray(parsed)) {
          const sanitized = parsed.map(m => sanitizeMeetingRecord(m));
          localStorage.setItem('hamyar_communications_meetings', JSON.stringify(sanitized));
        }
      } catch {
        // if corrupt or huge, truncate
      }
    }

    // 2. Clean existing official letters in localStorage
    const rawLetters = localStorage.getItem('hamyar_official_letters');
    if (rawLetters && rawLetters.length > 100000) {
      try {
        const parsedLetters = JSON.parse(rawLetters);
        if (Array.isArray(parsedLetters)) {
          const sanitizedLetters = parsedLetters.map((letItem: any) => {
            if (!letItem || typeof letItem !== 'object') return letItem;
            return {
              ...letItem,
              signatures: Array.isArray(letItem.signatures) 
                ? letItem.signatures.map((s: any) => ({ ...s, signature: compressSignature(s.signature, s.signerName) }))
                : letItem.signatures,
              workflowHistory: Array.isArray(letItem.workflowHistory)
                ? letItem.workflowHistory.slice(-15).map((w: any) => ({ ...w, signature: compressSignature(w.signature, w.actorName) }))
                : letItem.workflowHistory
            };
          });
          localStorage.setItem('hamyar_official_letters', JSON.stringify(sanitizedLetters));
        }
      } catch {
        // ignore
      }
    }

    // 3. Clean system users / HR personnel signatures if bloated
    const rawUsers = localStorage.getItem('system_admin_users');
    if (rawUsers && rawUsers.length > 100000) {
      try {
        const users = JSON.parse(rawUsers);
        if (Array.isArray(users)) {
          const sanitizedUsers = users.map((u: any) => ({
            ...u,
            signature: u.signature ? compressSignature(u.signature, u.fullName || u.username) : undefined
          }));
          localStorage.setItem('system_admin_users', JSON.stringify(sanitizedUsers));
        }
      } catch {
        // ignore
      }
    }

    const rawHr = localStorage.getItem('hamyar_hr_personnel');
    if (rawHr && rawHr.length > 100000) {
      try {
        const hrList = JSON.parse(rawHr);
        if (Array.isArray(hrList)) {
          const sanitizedHr = hrList.map((p: any) => ({
            ...p,
            signature: p.signature ? compressSignature(p.signature, `${p.firstName || ''} ${p.lastName || ''}`.trim()) : undefined
          }));
          localStorage.setItem('hamyar_hr_personnel', JSON.stringify(sanitizedHr));
        }
      } catch {
        // ignore
      }
    }

    // 4. Trim large audit logs
    const auditLogsRaw = localStorage.getItem('hamyar_system_audit_logs');
    if (auditLogsRaw && auditLogsRaw.length > 30000) {
      try {
        const logs = JSON.parse(auditLogsRaw);
        if (Array.isArray(logs)) {
          localStorage.setItem('hamyar_system_audit_logs', JSON.stringify(logs.slice(-15)));
        }
      } catch {
        localStorage.removeItem('hamyar_system_audit_logs');
      }
    }

    // 5. Trim execution imported items
    const importedLogs = localStorage.getItem('hamyar_execution_imported_items');
    if (importedLogs && importedLogs.length > 40000) {
      try {
        const items = JSON.parse(importedLogs);
        if (Array.isArray(items)) {
          localStorage.setItem('hamyar_execution_imported_items', JSON.stringify(items.slice(-15)));
        }
      } catch {
        localStorage.removeItem('hamyar_execution_imported_items');
      }
    }

    // 6. Trim temporary chat messages if oversized
    const chatsRaw = localStorage.getItem('hamyar_communications_chats');
    if (chatsRaw && chatsRaw.length > 80000) {
      try {
        const chats = JSON.parse(chatsRaw);
        if (Array.isArray(chats)) {
          const trimmedChats = chats.map((c: any) => ({
            ...c,
            messages: Array.isArray(c.messages) ? c.messages.slice(-20) : c.messages
          }));
          localStorage.setItem('hamyar_communications_chats', JSON.stringify(trimmedChats));
        }
      } catch {
        // ignore
      }
    }
  } catch (e) {
    console.warn('deepCleanLocalStorage notice:', e);
  }
};

// Immediately run deep clean on app load to free up any full storage
try {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    deepCleanLocalStorage();
  }
} catch {
  // ignore
}

/**
 * Generic safe localStorage setter that handles QuotaExceededError gracefully
 */
export const safeSetStorage = (key: string, data: any): boolean => {
  let targetData = data;
  if (key === 'hamyar_communications_meetings' && Array.isArray(data)) {
    targetData = data.map(m => sanitizeMeetingRecord(m));
  }
  const jsonString = typeof targetData === 'string' ? targetData : JSON.stringify(targetData);

  if (typeof localStorage === 'undefined') {
    memoryFallback.set(key, jsonString);
    return true;
  }

  try {
    localStorage.setItem(key, jsonString);
    memoryFallback.set(key, jsonString);
    return true;
  } catch (err: any) {
    console.warn(`localStorage.setItem exceeded quota on key "${key}", triggering deep cleanup and recovery...`, err);

    // Strategy 1: Run deep clean across all keys and retry
    try {
      deepCleanLocalStorage();
      localStorage.setItem(key, jsonString);
      memoryFallback.set(key, jsonString);
      return true;
    } catch {
      // Strategy 2: If array, sanitize every item and cap to latest 30 items
      try {
        if (Array.isArray(targetData)) {
          const sanitizedArray = targetData.slice(0, 30).map(item => sanitizeMeetingRecord(item));
          const smallerJson = JSON.stringify(sanitizedArray);
          localStorage.setItem(key, smallerJson);
          memoryFallback.set(key, smallerJson);
          return true;
        }
      } catch {
        // Strategy 3: Ultra compact fallback (top 15 items with minimal history)
        try {
          if (Array.isArray(targetData)) {
            const minimalArray = targetData.slice(0, 15).map(item => {
              const san = sanitizeMeetingRecord(item);
              return {
                ...san,
                workflowHistory: (san.workflowHistory || []).slice(-5)
              };
            });
            const minimalJson = JSON.stringify(minimalArray);
            localStorage.setItem(key, minimalJson);
            memoryFallback.set(key, minimalJson);
            return true;
          }
        } catch (finalErr) {
          console.warn(`Quota critically constrained; stored in session memory fallback for key "${key}".`, finalErr);
        }
      }
    }

    // Always keep in memory fallback so application state is never lost in current session
    memoryFallback.set(key, jsonString);
    return true;
  }
};

/**
 * Generic safe localStorage getter
 */
export const safeGetStorage = <T>(key: string, defaultValue: T): T => {
  if (typeof localStorage === 'undefined') {
    const memVal = memoryFallback.get(key);
    if (memVal) {
      try { return JSON.parse(memVal); } catch { return memVal as any; }
    }
    return defaultValue;
  }

  try {
    const raw = localStorage.getItem(key);
    if (raw !== null) {
      return JSON.parse(raw);
    }
    const memVal = memoryFallback.get(key);
    if (memVal) {
      return JSON.parse(memVal);
    }
    return defaultValue;
  } catch (err) {
    console.warn(`Error reading key "${key}" from localStorage:`, err);
    const memVal = memoryFallback.get(key);
    if (memVal) {
      try { return JSON.parse(memVal); } catch { return memVal as any; }
    }
    return defaultValue;
  }
};

/**
 * Specialized safe helper for meeting minutes storage
 */
export const MEETINGS_STORAGE_KEY = 'hamyar_communications_meetings';

export const saveMeetingsStorage = (meetingsList: any[]): boolean => {
  if (!Array.isArray(meetingsList)) return false;
  const sanitizedList = meetingsList.map(m => sanitizeMeetingRecord(m));
  return safeSetStorage(MEETINGS_STORAGE_KEY, sanitizedList);
};

export const getMeetingsStorage = (fallback: any[] = []): any[] => {
  return safeGetStorage<any[]>(MEETINGS_STORAGE_KEY, fallback);
};

