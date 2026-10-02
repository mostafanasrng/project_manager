import { Notification, WorkflowAction } from '../types';
import { SystemUser } from '../systemAdminTypes';

const safeRandomUUID = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const STORAGE_KEY = 'hamyar_notifications';
const CHANNEL_NAME = 'hamyar_online_notifications_v1';
const SOUND_ENABLED_KEY = 'hamyar_notification_sound_enabled';

export interface SendDocumentParams {
  type?: 'WORKFLOW' | 'SYSTEM';
  action?: WorkflowAction;
  module: 'MINUTES' | 'STATEMENTS' | 'ESTIMATES' | 'PERMITS' | 'MATERIALS' | 'VARIATIONS' | 'ADJUSTMENT' | 'EXECUTION' | 'COMMUNICATIONS' | 'DCC' | 'QC' | string;
  item: any;
  actor: SystemUser;
  targetUserId: string;
  targetOrgId?: string;
  message?: string;
  documentTitle?: string;
  documentCode?: string;
  priority?: 'NORMAL' | 'HIGH' | 'URGENT';
}

export type ExtendedNotification = Notification & {
  documentType?: string;
  documentCode?: string;
  documentTitle?: string;
  documentNumber?: string;
  targetModuleTab?: string;
  senderName?: string;
  senderOrgName?: string;
  targetRoleName?: string;
  actionLabel?: string;
  statusLabel?: string;
  statusColor?: string;
  isDocumentRead?: boolean;
};

export class NotificationService {
  private static getNotifications(): Notification[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading notifications:', error);
      return [];
    }
  }

  private static saveNotifications(notifications: Notification[]) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
    } catch (error) {
      console.error('Error saving notifications:', error);
    }
  }

  /**
   * Generates a clean URL / deepLink based on the module and recordId
   */
  public static buildDeepLink(module: string, recordId: string, projectId?: string): string {
    const pId = projectId ? `&projectId=${projectId}` : '';
    const upper = (module || '').toUpperCase();
    switch (upper) {
      case 'STATEMENTS':
        return `/cbs-statements?tab=statements&recordId=${recordId}${pId}`;
      case 'MINUTES':
        return `/technical-office?tab=minutes&recordId=${recordId}${pId}`;
      case 'ESTIMATES':
        return `/technical-office?tab=estimate&recordId=${recordId}${pId}`;
      case 'PERMITS':
        return `/technical-office?tab=permits&recordId=${recordId}${pId}`;
      case 'MATERIALS':
        return `/materials?tab=materials&recordId=${recordId}${pId}`;
      case 'VARIATIONS':
        return `/technical-office?tab=variation&recordId=${recordId}${pId}`;
      case 'ADJUSTMENT':
        return `/technical-office?tab=adjustment&recordId=${recordId}${pId}`;
      case 'EXECUTION':
        return `/execution?tab=reports&recordId=${recordId}${pId}`;
      case 'COMMUNICATIONS':
        return `/communications?tab=letters&recordId=${recordId}${pId}`;
      case 'QC':
        return `/quality-control?tab=ncrs&recordId=${recordId}${pId}`;
      case 'HSE':
        return `/hse?tab=PERMITS&recordId=${recordId}${pId}`;
      case 'DCC':
        return `/dcc-archive?tab=archive&recordId=${recordId}${pId}`;
      default:
        return `/technical-office?tab=${module.toLowerCase()}&recordId=${recordId}${pId}`;
    }
  }

  /**
   * Sound alert using Web Audio API (smooth modern chime)
   */
  public static playChimeSound() {
    try {
      if (typeof window === 'undefined') return;
      const soundPref = localStorage.getItem(SOUND_ENABLED_KEY);
      if (soundPref === 'false') return;

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      const ctx = new AudioContextClass();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;
      // Tone 1
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now); // D5
      gain1.gain.setValueAtTime(0.15, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.35);

      // Tone 2 (higher harmonic chime)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880.0, now + 0.1); // A5
      gain2.gain.setValueAtTime(0.2, now + 0.1);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.1);
      osc2.stop(now + 0.55);
    } catch {
      // Audio playback fails gracefully if user has not interacted or audio not permitted
    }
  }

  public static isSoundEnabled(): boolean {
    return localStorage.getItem(SOUND_ENABLED_KEY) !== 'false';
  }

  public static setSoundEnabled(enabled: boolean) {
    localStorage.setItem(SOUND_ENABLED_KEY, enabled ? 'true' : 'false');
  }

  /**
   * Dispatches real-time events across the window and to other tabs via BroadcastChannel
   */
  private static broadcastNotification(notification: Notification) {
    // 1. Dispatch custom event in current window
    window.dispatchEvent(new CustomEvent('notification-received', { detail: notification }));
    window.dispatchEvent(new Event('notification-updated'));

    // 2. Broadcast across tabs and windows
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const channel = new BroadcastChannel(CHANNEL_NAME);
        channel.postMessage({ type: 'NEW_NOTIFICATION', notification });
        channel.close();
      }
    } catch (e) {
      console.warn('BroadcastChannel error:', e);
    }
  }

  /**
   * Universal method to send any document to another user online
   */
  static sendDocumentNotification(params: SendDocumentParams): Notification {
    const {
      type = 'WORKFLOW',
      action = 'REASSIGN',
      module,
      item,
      actor,
      targetUserId,
      targetOrgId,
      message,
      documentTitle,
      documentCode,
      priority = 'NORMAL',
    } = params;

    const notifications = this.getNotifications();
    const itemId = item?.id || item?.serialNumber || item?.number || safeRandomUUID();
    const projectId = item?.projectId || localStorage.getItem('hamyar_selected_project_id') || '';

    const deepLink = this.buildDeepLink(module, itemId, projectId);

    const docName =
      documentTitle ||
      item?.title ||
      item?.subject ||
      item?.description ||
      (item?.letterNumber ? `نامه شماره ${item.letterNumber}` : undefined) ||
      (item?.number ? `سند شماره ${item.number}` : `سند شناسه ${itemId}`);

    const docCode = documentCode || item?.letterNumber || item?.number || item?.code || '';

    const finalMessage =
      message ||
      `سند «${docName}» توسط ${actor.fullName || actor.username} به شما ارجاع گردید.`;

    const newNotification: Notification = {
      id: safeRandomUUID(),
      type,
      action,
      module,
      recordId: itemId,
      projectId,
      fromUserId: actor.id,
      fromUserName: actor.fullName || actor.username,
      toUserId: targetUserId,
      orgId: targetOrgId || actor.orgId || '',
      status: 'UNREAD',
      createdAt: Date.now(),
      deepLink,
      message: finalMessage,
      documentTitle: docName,
      documentCode: docCode,
      priority,
    };

    notifications.unshift(newNotification);
    this.saveNotifications(notifications);

    this.broadcastNotification(newNotification);

    return newNotification;
  }

  /**
   * Backward-compatible createNotification
   */
  static createNotification(
    type: 'WORKFLOW' | 'SYSTEM',
    action: WorkflowAction,
    module: any,
    item: any,
    actor: SystemUser,
    targetUserId: string,
    targetOrgId: string,
    message: string
  ) {
    const notifications = this.getNotifications();
    const itemId = item?.id || safeRandomUUID();
    const projectId = item?.projectId || localStorage.getItem('hamyar_selected_project_id') || '';
    const deepLink = this.buildDeepLink(module, itemId, projectId);

    const docCode =
      item?.rfiNumber ||
      item?.ncrNumber ||
      item?.testNumber ||
      item?.letterNumber ||
      item?.reportNumber ||
      item?.permitNumber ||
      item?.sessionNumber ||
      item?.minuteNumber ||
      item?.number ||
      item?.code ||
      item?.itemCode ||
      '';

    let docName = '';
    if (item?.permitType || (item?.module === 'hse' && item?.permitNumber)) {
      const pNum = item.permitNumber || item.number || docCode;
      const sub = item.title || item.location || '';
      docName = `مجوز کار ایمنی (HSE PTW) شماره ${pNum}${sub ? ` (${sub})` : ''}`;
    } else if (item?.incidentType) {
      const sub = item.title || item.location || item.description || '';
      docName = `گزارش حادثه HSE شماره ${docCode}${sub ? ` (${sub})` : ''}`;
    } else if (item?.environmentalAspect || item?.aspect) {
      const sub = item.title || item.location || '';
      docName = `گزارش پایش محیط زیست (HSE) شماره ${docCode}${sub ? ` (${sub})` : ''}`;
    } else if (item?.kpiStats) {
      const sub = item.reportTitle || item.title || '';
      docName = `گزارش دوره‌ای HSE${sub ? ` (${sub})` : ''}`;
    } else if (item?.hsePolicy || item?.policyStatement) {
      const sub = item.title || '';
      docName = `برنامه جامع HSE${sub ? ` (${sub})` : ''}`;
    } else if (item?.rfiNumber) {
      const sub = item.title || item.location || '';
      docName = `برگه بازرسی RFI شماره ${item.rfiNumber}${sub ? ` (${sub})` : ''}`;
    } else if (item?.ncrNumber) {
      const sub = item.title || item.description || '';
      docName = `گزارش عدم انطباق NCR شماره ${item.ncrNumber}${sub ? ` (${sub})` : ''}`;
    } else if (item?.testNumber) {
      const sub = item.sampleLocation || item.title || '';
      docName = `آزمایش کنترل کیفی شماره ${item.testNumber}${sub ? ` (${sub})` : ''}`;
    } else if (item?.reportNumber) {
      const sub = item.date || '';
      docName = `گزارش روزانه شماره ${item.reportNumber}${sub ? ` مورخ ${sub}` : ''}`;
    } else if (item?.letterNumber) {
      const sub = item.title || item.subject || '';
      docName = `نامه شماره ${item.letterNumber}${sub ? ` (${sub})` : ''}`;
    } else if (item?.permitNumber) {
      const sub = item.location || item.description || '';
      docName = `مجوز عملیات اجرایی شماره ${item.permitNumber}${sub ? ` (${sub})` : ''}`;
    } else if (item?.minuteNumber || item?.number) {
      const num = item?.minuteNumber || item?.number;
      const sub = item.title || item.subject || item.description || '';
      docName = `سند شماره ${num}${sub ? ` (${sub})` : ''}`;
    } else if (item?.title || item?.subject || item?.description) {
      docName = item.title || item.subject || item.description;
    } else {
      docName = docCode ? `سند شماره ${docCode}` : `سند ${itemId}`;
    }

    const newNotification: Notification = {
      id: safeRandomUUID(),
      type,
      action,
      module,
      recordId: itemId,
      projectId,
      fromUserId: actor.id,
      fromUserName: actor.fullName || actor.username,
      toUserId: targetUserId,
      orgId: targetOrgId,
      status: 'UNREAD',
      createdAt: Date.now(),
      deepLink,
      message,
      documentTitle: docName,
      documentCode: docCode,
    };

    notifications.unshift(newNotification);
    this.saveNotifications(notifications);

    this.broadcastNotification(newNotification);
  }

  static getUserNotifications(userId: string, orgId?: string): Notification[] {
    const notifications = this.getNotifications();
    return notifications
      .filter((n) => n.toUserId === userId)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  static isDocumentRead(documentId: string, userId: string): boolean {
    const notifications = this.getNotifications();
    const unread = notifications.some(
      (n) => n.toUserId === userId && n.status === 'UNREAD' && (String(n.recordId) === String(documentId) || String(n.id) === String(documentId))
    );
    return !unread;
  }

  static isDocumentUnread(documentId: string, userId: string, createdById?: string): boolean {
    if (createdById === userId) return false;
    const notifications = this.getNotifications();
    return notifications.some(
      (n) => n.toUserId === userId && n.status === 'UNREAD' && (String(n.recordId) === String(documentId) || String(n.id) === String(documentId))
    );
  }

  static markDocumentAsRead(documentId: string, userId: string): void {
    const notifications = this.getNotifications();
    let updated = false;
    notifications.forEach((n) => {
      if (n.toUserId === userId && (String(n.recordId) === String(documentId) || String(n.id) === String(documentId)) && n.status !== 'READ') {
        n.status = 'READ';
        updated = true;
      }
    });
    if (updated) {
      this.saveNotifications(notifications);
      window.dispatchEvent(new Event('notification-updated'));
    }
  }

  static resolveDocumentInfo(documentId: string, moduleName: string, targetModuleTab?: string, notificationObj?: any): any {
    const notifications = this.getNotifications();
    const related = notificationObj || notifications.find(
      (n) => (String(n.recordId) === String(documentId) || String(n.id) === String(documentId)) &&
             (!moduleName || String(n.module).toUpperCase() === String(moduleName).toUpperCase())
    );
    
    const mod = (moduleName || related?.module || '').toUpperCase();
    const title = (related?.documentTitle || related?.message || '').toUpperCase();
    const code = (related?.documentCode || '').toUpperCase();

    let tab = 'technical-office';
    let label = 'سند دفتر فنی';
    let badgeColor = 'bg-stone-100 text-stone-800 dark:bg-stone-950/60 dark:text-stone-300 border-stone-200/50 dark:border-stone-900/50';

    // 1. Text-based content prioritization (Guarantees correct category regardless of ID or module collisions)
    if (
      title.includes('مجوز کار') || 
      title.includes('PTW') || 
      title.includes('پرمیت') || 
      code.startsWith('PTW') || 
      title.includes('مجوز عملیات') || 
      title.includes('عملیات اجرایی')
    ) {
      if (title.includes('ایمنی') || title.includes('HSE') || code.startsWith('PTW') || mod === 'HSE') {
        tab = 'hse';
        label = 'مجوز کار ایمنی (PTW)';
        badgeColor = 'bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-300 border-green-200/50 dark:border-green-900/50';
      } else {
        tab = 'technical-office';
        label = 'مجوز عملیات اجرایی';
        badgeColor = 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300 border-cyan-200/50 dark:border-cyan-900/50';
      }
    } else if (title.includes('حادثه') || code.startsWith('INC')) {
      tab = 'hse';
      label = 'گزارش حادثه HSE';
      badgeColor = 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border-red-200/50 dark:border-red-900/50';
    } else if (title.includes('محیط زیست') || title.includes('زیست') || code.startsWith('ENV') || title.includes('پایش')) {
      tab = 'hse';
      label = 'گزارش پایش محیط زیست';
      badgeColor = 'bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-300 border-green-200/50 dark:border-green-900/50';
    } else if (title.includes('دوره‌ای') || title.includes('گزارش هفتگی') || title.includes('گزارش ماهانه') || code.startsWith('REP') || title.includes('پایش دوره‌ای')) {
      tab = 'hse';
      label = 'گزارش دوره‌ای HSE';
      badgeColor = 'bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-300 border-green-200/50 dark:border-green-900/50';
    } else if (title.includes('برنامه جامع') || title.includes('HSE PLAN') || title.includes('برنامه HSE')) {
      tab = 'hse';
      label = 'برنامه جامع HSE';
      badgeColor = 'bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-300 border-green-200/50 dark:border-green-900/50';
    } else if (title.includes('گزارش روزانه') || code.startsWith('DAILY') || title.includes('روزانه کارگاه')) {
      tab = 'execution';
      label = 'گزارش روزانه کارگاه';
      badgeColor = 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200/50 dark:border-rose-900/50';
    } else if (title.includes('RFI') || code.startsWith('RFI') || title.includes('برگه بازرسی') || title.includes('بازرسی کار')) {
      tab = 'quality-control';
      label = 'برگه بازرسی RFI';
      badgeColor = 'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300 border-orange-200/50 dark:border-orange-900/50';
    } else if (title.includes('NCR') || code.startsWith('NCR') || title.includes('عدم انطباق')) {
      tab = 'quality-control';
      label = 'گزارش عدم انطباق NCR';
      badgeColor = 'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300 border-orange-200/50 dark:border-orange-900/50';
    } else if (title.includes('آزمایش کنترل کیفی') || title.includes('آزمایش کیفی') || code.startsWith('LAB') || title.includes('نتایج آزمایش')) {
      tab = 'quality-control';
      label = 'آزمایش کنترل کیفی';
      badgeColor = 'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300 border-orange-200/50 dark:border-orange-900/50';
    } else if (title.includes('صورت‌وضعیت CBS') || title.includes('صورت وضعیت') || title.includes('CBS')) {
      tab = 'cbs-statements';
      label = 'صورت‌وضعیت CBS';
      badgeColor = 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border-teal-200/50 dark:border-teal-900/50';
    } else if (title.includes('MIV') || title.includes('حواله خروج') || title.includes('خروج مصالح')) {
      tab = 'technical-office';
      label = 'حواله خروج مصالح (MIV)';
      badgeColor = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200/50 dark:border-emerald-900/50';
    } else if (title.includes('MRS') || title.includes('ورود مصالح') || title.includes('رسید مصالح')) {
      tab = 'technical-office';
      label = 'سند ورود مصالح (MRS)';
      badgeColor = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200/50 dark:border-emerald-900/50';
    } else if (title.includes('صورت‌جلسه کارگاهی') || title.includes('صورت جلسه') || title.includes('جلسه کارگاهی') || code.startsWith('MIN')) {
      tab = 'communications-meetings';
      label = 'صورت‌جلسه کارگاهی';
      badgeColor = 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200/50 dark:border-blue-900/50';
    } else if (title.includes('نامه') || code.startsWith('LET') || title.includes('مکاتبات') || title.includes('ابلاغیه')) {
      tab = 'communications-letters';
      label = 'نامه رسمی اداری';
      badgeColor = 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200/50 dark:border-blue-900/50';
    } else if (title.includes('برآورد پیمان') || title.includes('برآورد مالی') || code.startsWith('EST')) {
      tab = 'technical-office';
      label = 'برآورد پیمان';
      badgeColor = 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200/50 dark:border-amber-900/50';
    } else if (title.includes('تغییر مقادیر') || title.includes('تغییر احجام') || code.startsWith('VAR')) {
      tab = 'technical-office';
      label = 'ابلاغ تغییر مقادیر';
      badgeColor = 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200/50 dark:border-purple-900/50';
    } else if (title.includes('تعدیل') || code.startsWith('ADJ')) {
      tab = 'technical-office';
      label = 'صورت‌وضعیت تعدیل';
      badgeColor = 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200/50 dark:border-indigo-900/50';
    } else if (title.includes('مجوز عملیات') || code.startsWith('PER')) {
      tab = 'technical-office';
      label = 'مجوز عملیات اجرایی';
      badgeColor = 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300 border-cyan-200/50 dark:border-cyan-900/50';
    } else {
      // 2. Fallback to Module-based detection if text matching is inconclusive
      if (mod === 'HSE') {
        tab = 'hse';
        label = 'سند ایمنی و بهداشت (HSE)';
        badgeColor = 'bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-300 border-green-200/50 dark:border-green-900/50';
      } else if (mod === 'EXECUTION') {
        tab = 'execution';
        label = 'گزارش روزانه کارگاه';
        badgeColor = 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200/50 dark:border-rose-900/50';
      } else if (mod === 'QC') {
        tab = 'quality-control';
        label = 'سند کنترل کیفیت (QC)';
        badgeColor = 'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300 border-orange-200/50 dark:border-orange-900/50';
      } else if (mod === 'STATEMENTS') {
        tab = 'cbs-statements';
        label = 'صورت‌وضعیت CBS';
        badgeColor = 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border-teal-200/50 dark:border-teal-900/50';
      } else if (mod === 'COMMUNICATIONS') {
        tab = 'communications-letters';
        label = 'مکاتبات و نامه‌ها';
        badgeColor = 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200/50 dark:border-blue-900/50';
      } else if (mod === 'DCC') {
        tab = 'dcc-archive';
        label = 'بایگانی اسناد DCC';
        badgeColor = 'bg-stone-100 text-stone-800 dark:bg-stone-950/60 dark:text-stone-300 border-stone-200/50 dark:border-stone-900/50';
      } else if (mod === 'PLANNING') {
        tab = 'planning';
        label = 'برنامه‌ریزی و کنترل پروژه';
        badgeColor = 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-950/60 dark:text-fuchsia-300 border-fuchsia-200/50 dark:border-fuchsia-900/50';
      } else if (mod === 'MINUTES') {
        tab = 'technical-office';
        label = 'صورت‌جلسه کارگاهی';
        badgeColor = 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200/50 dark:border-sky-900/50';
      } else if (mod === 'ESTIMATES') {
        tab = 'technical-office';
        label = 'برآورد پیمان';
        badgeColor = 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200/50 dark:border-amber-900/50';
      } else if (mod === 'VARIATIONS') {
        tab = 'technical-office';
        label = 'ابلاغ تغییر مقادیر';
        badgeColor = 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200/50 dark:border-purple-900/50';
      } else if (mod === 'ADJUSTMENT') {
        tab = 'technical-office';
        label = 'صورت‌وضعیت تعدیل';
        badgeColor = 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200/50 dark:border-indigo-900/50';
      } else if (mod === 'PERMITS') {
        tab = 'technical-office';
        label = 'مجوز عملیات اجرایی';
        badgeColor = 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300 border-cyan-200/50 dark:border-cyan-900/50';
      }
    }

    return { tab, label, badgeColor };
  }

  static playNotificationSound(): void {
    this.playChimeSound();
  }

  static getUnreadCount(userId: string): number {
    const notifications = this.getNotifications();
    return notifications.filter((n) => n.toUserId === userId && n.status === 'UNREAD').length;
  }

  static getUnreadCountsPerModule(userId: string, orgId?: string, role?: string): Record<string, number> {
    const notifications = this.getNotifications();
    const unread = notifications.filter((n) => n.toUserId === userId && n.status === 'UNREAD');
    
    const counts: Record<string, number> = {
      'project-definition': 0,
      'technical-office': 0,
      'cbs-statements': 0,
      'execution': 0,
      'quality-control': 0,
      'planning': 0,
      'hse': 0,
      'dcc-archive': 0,
      'hr-personnel': 0,
      'org-users': 0,
      'admin-orgs': 0,
      'communications-secretariat': 0,
      'communications-letters': 0,
      'communications-meetings': 0,
      'communications-chats': 0,
    };

    unread.forEach((n) => {
      const mod = (n.module || '').toUpperCase();
      if (mod === 'MINUTES') {
        counts['technical-office']++;
      } else if (mod === 'ESTIMATES') {
        counts['technical-office']++;
      } else if (mod === 'VARIATIONS') {
        counts['technical-office']++;
      } else if (mod === 'ADJUSTMENT') {
        counts['technical-office']++;
      } else if (mod === 'MATERIALS') {
        counts['technical-office']++;
      } else if (mod === 'STATEMENTS') {
        counts['cbs-statements']++;
      } else if (mod === 'EXECUTION') {
        counts['execution']++;
      } else if (mod === 'QC') {
        counts['quality-control']++;
      } else if (mod === 'PLANNING') {
        counts['planning']++;
      } else if (mod === 'HSE') {
        counts['hse']++;
      } else if (mod === 'DCC') {
        counts['dcc-archive']++;
      } else if (mod === 'COMMUNICATIONS') {
        if (n.documentTitle?.includes('صورت‌جلسه') || n.message?.includes('جلسه')) {
          counts['communications-meetings']++;
        } else {
          counts['communications-letters']++;
        }
      }
    });

    return counts;
  }

  static markAsRead(notificationId: string) {
    const notifications = this.getNotifications();
    const index = notifications.findIndex((n) => n.id === notificationId);
    if (index !== -1 && notifications[index].status !== 'READ') {
      notifications[index].status = 'READ';
      this.saveNotifications(notifications);
      window.dispatchEvent(new Event('notification-updated'));
    }
  }

  static toggleReadStatus(notificationId: string) {
    const notifications = this.getNotifications();
    const index = notifications.findIndex((n) => n.id === notificationId);
    if (index !== -1) {
      notifications[index].status = notifications[index].status === 'UNREAD' ? 'READ' : 'UNREAD';
      this.saveNotifications(notifications);
      window.dispatchEvent(new Event('notification-updated'));
    }
  }

  static deleteNotification(notificationId: string) {
    const notifications = this.getNotifications();
    const filtered = notifications.filter((n) => n.id !== notificationId);
    this.saveNotifications(filtered);
    window.dispatchEvent(new Event('notification-updated'));
  }

  static markAllAsRead(userId: string) {
    const notifications = this.getNotifications();
    let updated = false;
    notifications.forEach((n) => {
      if (n.toUserId === userId && n.status === 'UNREAD') {
        n.status = 'READ';
        updated = true;
      }
    });

    if (updated) {
      this.saveNotifications(notifications);
      window.dispatchEvent(new Event('notification-updated'));
    }
  }

  static clearAll(userId: string) {
    const notifications = this.getNotifications();
    const filtered = notifications.filter((n) => n.toUserId !== userId);
    this.saveNotifications(filtered);
    window.dispatchEvent(new Event('notification-updated'));
  }

  static getUnreadRecordIds(userId: string): Set<string> {
    const notifications = this.getNotifications();
    const ids = new Set<string>();
    notifications.forEach((n) => {
      if (n.toUserId === userId && n.status === 'UNREAD' && n.recordId) {
        ids.add(String(n.recordId));
      }
    });
    return ids;
  }

  static isRecordUnread(recordId: string, userId: string): boolean {
    const notifications = this.getNotifications();
    return notifications.some(
      (n) => n.toUserId === userId && n.status === 'UNREAD' && String(n.recordId) === String(recordId)
    );
  }

  static markRecordAsRead(recordId: string, userId: string) {
    const notifications = this.getNotifications();
    let updated = false;
    notifications.forEach((n) => {
      if (n.toUserId === userId && String(n.recordId) === String(recordId) && n.status === 'UNREAD') {
        n.status = 'READ';
        updated = true;
      }
    });
    if (updated) {
      this.saveNotifications(notifications);
      window.dispatchEvent(new Event('notification-updated'));
    }
  }

  /**
   * Subscribes to real-time incoming notifications for a given user
   */
  static subscribeToOnlineNotifications(
    currentUserId: string,
    onNewNotification: (notification: Notification) => void,
    onListUpdated?: () => void
  ): () => void {
    // 1. In-tab custom event
    const handleCustomEvent = (e: Event) => {
      const customEvent = e as CustomEvent<Notification>;
      if (customEvent.detail && customEvent.detail.toUserId === currentUserId) {
        onNewNotification(customEvent.detail);
      }
      if (onListUpdated) onListUpdated();
    };

    const handleUpdateEvent = () => {
      if (onListUpdated) onListUpdated();
    };

    window.addEventListener('notification-received', handleCustomEvent);
    window.addEventListener('notification-updated', handleUpdateEvent);

    // 2. Cross-tab BroadcastChannel
    let channel: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        channel = new BroadcastChannel(CHANNEL_NAME);
        channel.onmessage = (event) => {
          if (event.data?.type === 'NEW_NOTIFICATION' && event.data?.notification) {
            const notif: Notification = event.data.notification;
            if (notif.toUserId === currentUserId) {
              onNewNotification(notif);
            }
            if (onListUpdated) onListUpdated();
          }
        };
      }
    } catch (e) {
      console.warn('BroadcastChannel subscription error:', e);
    }

    // 3. Storage event for cross-tab fallback
    const handleStorageEvent = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY && event.newValue) {
        if (onListUpdated) onListUpdated();
      }
    };
    window.addEventListener('storage', handleStorageEvent);

    // Return unsubscriber
    return () => {
      window.removeEventListener('notification-received', handleCustomEvent);
      window.removeEventListener('notification-updated', handleUpdateEvent);
      window.removeEventListener('storage', handleStorageEvent);
      if (channel) {
        try {
          channel.close();
        } catch {
          // ignore
        }
      }
    };
  }
}
