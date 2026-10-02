import { WorkflowStatus, WorkflowAction, WorkflowEvent, ProjectMinute, Statement, FreezeVariationRequest, EstimateItem, WorkPermit, VariationOrder, MrsRecord, MivRecord, AdjustmentRecord, DailyReport, PlanningProgressReport, DelayClaim, LossClaim, OfficialLetter } from '../types';
import type { QCInspection, NonConformanceReport, QCLabTest } from '../src/types/qc';
import { SystemUser, OrganizationType, ModuleId } from '../systemAdminTypes';
import { NotificationService } from './notificationService';
import { SystemAdminService } from './systemAdminService';
import { HRService } from './hrService';
import { formatUserDisplay, formatUserDisplayFormal } from '../src/utils/userFormatter';

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

type WorkflowItem = ProjectMinute | Statement | EstimateItem | WorkPermit | VariationOrder | MrsRecord | MivRecord | AdjustmentRecord | DailyReport | QCInspection | NonConformanceReport | QCLabTest | PlanningProgressReport | DelayClaim | LossClaim | OfficialLetter | Record<string, any>;

export const WorkflowService = {
  // Helper to safely get the chronologically last event without relying on array indexing
  getLastEvent: (history: any[] | undefined): any | null => {
    if (!history || history.length === 0) return null;
    let latest = history[0];
    for (const ev of history) {
      if (ev && ev.timestamp > latest.timestamp) {
        latest = ev;
      }
    }
    return latest;
  },

  // Helper to safely get the chronologically last workflow transition / handover event (excluding edits, updates, unfreeze)
  getLastHandoverEvent: (history: any[] | undefined): any | null => {
    if (!history || history.length === 0) return null;
    const handoverEvents = history.filter(
      (ev) => ev && ev.action !== 'UNFREEZE_BY_VARIATION' && ev.action !== 'EDIT' && (ev.action as string) !== 'MODIFY'
    );
    if (handoverEvents.length === 0) return null;
    let latest = handoverEvents[0];
    for (const ev of handoverEvents) {
      if (ev && ev.timestamp > latest.timestamp) {
        latest = ev;
      }
    }
    return latest;
  },

  // Helper to map styles of actions
  getActionStyle: (action: string): string => {
    switch (action) {
      case 'APPROVE':
        return 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200';
      case 'SIGN':
        return 'bg-emerald-600 text-white hover:bg-emerald-700 font-bold shadow-sm';
      case 'FINAL_APPROVE':
        return 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200';
      case 'REJECT':
        return 'bg-red-100 text-red-700 hover:bg-red-200';
      case 'SEND_TO_CONSULTANT':
        return 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200';
      case 'SEND_TO_EMPLOYER':
        return 'bg-purple-100 text-purple-700 hover:bg-purple-200';
      case 'RETURN_TO_CONTRACTOR':
      case 'RETURN_TO_CONSULTANT':
        return 'bg-orange-100 text-orange-700 hover:bg-orange-200';
      case 'UNFREEZE_BY_VARIATION':
        return 'bg-amber-100 text-amber-700 hover:bg-amber-200';
      default:
        return 'bg-blue-100 text-blue-700 hover:bg-blue-200';
    }
  },

  // Helper to map labels of actions
  getActionLabel: (action: string, userOrgType?: string, actorUserId?: string, isAdjustment?: boolean): string => {
    let finalOrgType = userOrgType;
    let actorUser: SystemUser | undefined = undefined;

    if (actorUserId) {
      if (actorUserId === 'admin') {
        // System Admin
      } else {
        const users = SystemAdminService.getUsers();
        actorUser = users.find(u => u.id === actorUserId);
        if (actorUser) {
          const org = SystemAdminService.getOrganizations().find(o => o.id === actorUser!.orgId);
          if (org) {
            finalOrgType = org.type;
          }
        }
      }
    }

    switch (action) {
      case 'CREATE':
        return 'ایجاد پیش‌نویس';
      case 'SUBMIT':
        return 'ارسال';
      case 'SIGN':
        return 'امضای سند';
      case 'REPORT_SIGNATURE':
        return 'امضای گزارش';
      case 'APPROVE':
        if (isAdjustment && (finalOrgType === 'CONSULTANT' || finalOrgType === 'EMPLOYER')) {
          return 'تایید';
        }
        if (actorUser) {
          const t = (actorUser.jobTitle || "").trim();
          const l = (actorUser.jobLevel || "").trim();
          const isPMOrWM = t.includes("مدیر پروژه") || t.includes("سرپرست کارگاه") || l.includes("مدیر پروژه") || l.includes("سرپرست کارگاه");
          if (isPMOrWM) return "تایید و ارجاع";
        }
        return 'تایید';
      case 'FINAL_APPROVE':
        return finalOrgType === 'EMPLOYER' ? 'تایید' : 'تایید نهایی';
      case 'REJECT':
        return 'رد';
      case 'REASSIGN':
        return 'ارجاع';
      case 'RESUBMIT':
        return 'ارسال مجدد';
      case 'SEND_TO_CONSULTANT':
        return 'ارسال به مشاور';
      case 'SEND_TO_EMPLOYER':
        return 'ارسال به کارفرما';
      case 'SEND_TO_CONTRACTOR':
        return 'ارسال به پیمانکار';
      case 'RETURN_TO_CONTRACTOR':
        return 'عودت به پیمانکار';
      case 'RETURN_TO_CONSULTANT':
        return 'عودت به مشاور';
      case 'UNFREEZE_BY_VARIATION':
        return 'بازگشایی و رفع قفل';
      case 'EDIT':
        return 'ویرایش اطلاعات سند';
      default:
        return action;
    }
  },

  // Helper to get current status (default to DRAFT)
  getStatus: (item?: WorkflowItem | null): WorkflowStatus => {
    if (!item) return WorkflowStatus.DRAFT;
    if ((item as any).workflowStatus) return (item as any).workflowStatus;
    if (!('status' in item) || !(item as any).status) return WorkflowStatus.DRAFT;
    const st = (item as any).status;
    // Handle legacy statuses for Statement
    if (st === 'PENDING') return WorkflowStatus.IN_REVIEW;
    if (st === 'APPROVED') return WorkflowStatus.APPROVED_INTERNAL;
    return st as WorkflowStatus;
  },

  // Helper to map labels of statuses
  getStatusLabel: (statusOrItem?: WorkflowStatus | WorkflowItem | null): string => {
    if (!statusOrItem) return 'پیش‌نویس';
    let status: WorkflowStatus;
    let isFinalFrozen = false;
    
    if (typeof statusOrItem === 'string') {
      status = statusOrItem as WorkflowStatus;
    } else {
      status = WorkflowService.getStatus(statusOrItem);
      isFinalFrozen = !!(statusOrItem as any)?.isFinalFrozen;
    }

    if (isFinalFrozen || status === ('APPROVED_BY_EMPLOYER' as any) || status === ('APPROVED' as any)) return 'تایید نهایی / قطعی (Frozen)';
    if (status === WorkflowStatus.REJECTED) return 'عودت داده شده (نیاز به بازنگری)';

    switch (status) {
      case WorkflowStatus.DRAFT:
        return 'پیش‌نویس';
      case WorkflowStatus.IN_REVIEW:
        return 'در بررسی داخلی (پیمانکار)';
      case WorkflowStatus.APPROVED_INTERNAL:
        return 'تایید داخلی / آماده ارسال';
      case WorkflowStatus.SENT_TO_CONSULTANT:
        return 'ارسال به مشاور';
      case WorkflowStatus.IN_CONSULTANT_REVIEW:
        return 'در بررسی مشاور';
      case WorkflowStatus.APPROVED_BY_CONSULTANT:
        return 'تایید مشاور / آماده ارسال به کارفرما';
      case WorkflowStatus.SENT_TO_EMPLOYER:
        return 'ارسال به کارفرما';
      case WorkflowStatus.IN_EMPLOYER_REVIEW:
        return 'در بررسی کارفرما / تایید نهایی';
      default:
        return status;
    }
  },

  // Helper to map colors of statuses
  getStatusColor: (statusOrItem?: WorkflowStatus | WorkflowItem | null): string => {
    if (!statusOrItem) return 'slate';
    let status: WorkflowStatus;
    let isFinalFrozen = false;

    if (typeof statusOrItem === 'string') {
      status = statusOrItem as WorkflowStatus;
    } else {
      status = WorkflowService.getStatus(statusOrItem);
      isFinalFrozen = !!(statusOrItem as any)?.isFinalFrozen;
    }

    if (isFinalFrozen || status === ('APPROVED_BY_EMPLOYER' as any) || status === ('APPROVED' as any)) return 'emerald';
    if (status === WorkflowStatus.REJECTED) return 'red';

    switch (status) {
      case WorkflowStatus.DRAFT:
        return 'slate';
      case WorkflowStatus.IN_REVIEW:
        return 'blue';
      case WorkflowStatus.APPROVED_INTERNAL:
        return 'emerald';
      case WorkflowStatus.SENT_TO_CONSULTANT:
      case WorkflowStatus.IN_CONSULTANT_REVIEW:
        return 'indigo';
      case WorkflowStatus.SENT_TO_EMPLOYER:
      case WorkflowStatus.IN_EMPLOYER_REVIEW:
        return 'purple';
      case WorkflowStatus.APPROVED_BY_CONSULTANT:
        return 'emerald';
      default:
        return 'slate';
    }
  },

  // Helper to map Tailwind styles based on status color
  getStatusStyle: (statusOrItem?: WorkflowStatus | WorkflowItem | null): string => {
    if (!statusOrItem) return 'bg-slate-100 text-slate-600';
    const color = WorkflowService.getStatusColor(statusOrItem);
    switch (color) {
      case 'emerald': return 'bg-emerald-100 text-emerald-700';
      case 'red': return 'bg-red-100 text-red-700';
      case 'slate': return 'bg-slate-100 text-slate-600';
      case 'blue': return 'bg-blue-100 text-blue-700';
      case 'indigo': return 'bg-indigo-100 text-indigo-700';
      case 'purple': return 'bg-purple-100 text-purple-700';
      case 'amber': return 'bg-amber-100 text-amber-700';
      default: return 'bg-slate-100 text-slate-600';
    }
  },

  // Check if a user has permission to modify/act on an item assigned to a user
  canUserModifyAssignedItem: (item: WorkflowItem, user: SystemUser): boolean => {
    if (user.role === 'SYSTEM_ADMIN') return true;
    if (!item.assigneeId || item.assigneeId.trim() === '') return true;

    const assignees = item.assigneeId.split(',').map(id => id.trim()).filter(Boolean);
    if (assignees.length === 0) return true;
    return assignees.includes(user.id);
  },

  // Get available actions for a user on an item
  getAvailableActions: (item: WorkflowItem, user: SystemUser, userOrgType?: OrganizationType): WorkflowAction[] => {
    const isSystemAdmin = user.role === 'SYSTEM_ADMIN';
    const isOrgManager = user.role === 'ORG_MANAGER' || user.role === 'ORG_ADMIN';
    const t = (user.jobTitle || "").trim();
    const l = (user.jobLevel || "").trim();

    // Helper for robust string matching (handles Persian and Arabic characters)
    const matchesRole = (str: string, roleName: string) => {
      if (!str) return false;
      const normalized = str.replace(/ك/g, 'ک').replace(/ي/g, 'ی');
      const target = roleName.replace(/ك/g, 'ک').replace(/ي/g, 'ی');
      return normalized.includes(target);
    };

    const isPM = matchesRole(t, "مدیر پروژه") || matchesRole(l, "مدیر پروژه") || matchesRole(t, "مدیر طرح") || matchesRole(l, "مدیر طرح") || matchesRole(t, "نماینده") || matchesRole(l, "نماینده") || matchesRole(t, "مجری") || matchesRole(l, "مجری") || isOrgManager || user.role === 'ORG_ADMIN';
    const isProjectManager = isPM;
    const isWorkshopManager = matchesRole(t, "سرپرست کارگاه") || matchesRole(l, "سرپرست کارگاه") || matchesRole(t, "سرپرست نظارت") || matchesRole(l, "سرپرست نظارت") || matchesRole(t, "رئیس کارگاه") || matchesRole(l, "رئیس کارگاه") || matchesRole(t, "مدیر کارگاه") || matchesRole(l, "مدیر کارگاه") || matchesRole(t, "ناظر مقیم") || matchesRole(l, "ناظر مقیم") || user.role === 'ORG_MANAGER';
    const isUnitSupervisor = matchesRole(t, "سرپرست واحد") || matchesRole(l, "سرپرست واحد");
    const isSupervisor = isWorkshopManager || isUnitSupervisor || matchesRole(t, "سرپرست") || matchesRole(l, "سرپرست");
    const isExpert = matchesRole(t, "کارشناس") || matchesRole(l, "کارشناس");
    
    // Check if current assignee is a Workshop Manager (سرپرست کارگاه)
    let isAssignedToWorkshopManager = false;
    if (item.assigneeId) {
      const users = SystemAdminService.getUsers();
      const assignee = users.find(u => u.id === item.assigneeId);
      if (assignee) {
        const at = (assignee.jobTitle || "").trim();
        const al = (assignee.jobLevel || "").trim();
        isAssignedToWorkshopManager = matchesRole(at, "سرپرست کارگاه") || matchesRole(al, "سرپرست کارگاه");
      }
    }

    const itemCurrentOrgId = item.currentOrgId || item.ownerOrgId;
    const isInUserOrg = isSystemAdmin || (itemCurrentOrgId ? itemCurrentOrgId === user.orgId : true);

    if (!isInUserOrg) return [];

    // Authority Logic: 
    // 1. System Admin always has authority.
    // 2. Org Managers have authority UNLESS they are also PMs (then they follow PM rules) or there is no assignee.
    // 3. PMs ONLY have authority if the item is assigned to a Workshop Manager in their org or there is no assignee.
    const isOrgAuthority = isSystemAdmin || 
                           (isOrgManager && (!isPM || isAssignedToWorkshopManager || !item.assigneeId)) ||
                           (isPM && itemCurrentOrgId === user.orgId && (isAssignedToWorkshopManager || !item.assigneeId));

    const isPMOrWorkshopManager = isSystemAdmin || isPM || isWorkshopManager || isOrgManager;

    const isAuthority = isOrgAuthority || isPM || isWorkshopManager || isUnitSupervisor;

    // Basic checks - handle missing isActive as true for backward compatibility
    if (user.isActive === false) return [];

    // Phase 4D: Final Freeze Check
    if (item?.isFinalFrozen) {
      const isEmployerPMOrWM = (userOrgType === OrganizationType.EMPLOYER || isSystemAdmin) && 
                                (isSystemAdmin || isOrgManager || isPM || 
                                 t.includes("سرپرست کارگاه") || l.includes("سرپرست کارگاه"));
      
      if (isEmployerPMOrWM) {
        return ['UNFREEZE_BY_VARIATION'];
      }
      return [];
    }

    const status = WorkflowService.getStatus(item);
    const actions: WorkflowAction[] = [];
    const isCreator = item.createdById === user.id;
    const isAssignee = item.assigneeId ? item.assigneeId.split(',').map(id => id.trim()).includes(user.id) : false;
    const isEstimate = 'unitPrice' in item && 'quantity' in item;

    // Strict rule: only the active assignee (recipient) can perform actions.
    // If the item has an assignee, no one else can act on it (except SYSTEM_ADMIN).
    // If it has no assignee (e.g., draft), only the creator can act on it (if draft), 
    // or the authorities/higher-level users of the current organization of the document can act on it.
    if (isEstimate && !isSystemAdmin) {
      if (item.assigneeId) {
        if (!isAssignee) {
          return [];
        }
      } else {
        if (status === WorkflowStatus.DRAFT) {
          if (item.createdById !== user.id) {
            return [];
          }
        } else {
          const uTitle = (user.jobTitle || "").trim();
          const uLevel = (user.jobLevel || "").trim();
          const isSupervisorOrManagerOrPM = 
            uTitle.includes("سرپرست واحد") || uLevel.includes("سرپرست واحد") ||
            uTitle.includes("سرپرست کارگاه") || uLevel.includes("سرپرست کارگاه") ||
            uTitle.includes("مدیر پروژه") || uLevel.includes("مدیر پروژه") ||
            user.role === 'ORG_MANAGER' || user.role === 'ORG_ADMIN';

          const itemCurrentOrgId = (item as any).currentOrgId || (item as any).ownerOrgId;
          const isInCurrentOrg = itemCurrentOrgId ? itemCurrentOrgId === user.orgId : true;

          if (!isSupervisorOrManagerOrPM || !isInCurrentOrg) {
            return [];
          }
        }
      }
    }


    // Determine document type
    const isHse = 'permitType' in item || 'incidentType' in item || 'hseReportType' in item || 'environmentalAspect' in item || 'aspect' in item || 'kpiStats' in item || 'hsePlanSection' in item || (item as any).module === 'hse' || (item as any).module === 'HSE' || 'permitNumber' in item || 'incidentNumber' in item || 'planNumber' in item || String((item as any).reportNumber || '').startsWith('HSE-');
    const isExecution = 'reportNumber' in item && !isHse;
    const isMinute = 'attendees' in item || 'decisions' in item || 'recordedBy' in item;
    const isStatement = 'startDate' in item || 'values' in item;
    const isQC = 'rfiNumber' in item || 'ncrNumber' in item || 'testNumber' in item;
    const isPlanning = 'plannedPhysicalProgress' in item || 'totalNetJustifiedDays' in item;
    const isLetter = 'scope' in item || 'letterNumber' in item;
    const cleanAssigneeId = (item.assigneeId || '').trim();

    // 1. If explicitly assigned to someone, ONLY that assignee (or System Admin) can see/perform actions.
    if (cleanAssigneeId && !WorkflowService.canUserModifyAssignedItem(item, user)) {
      return [];
    } else if (!cleanAssigneeId) {
      // 2. If NO assignee is set (i.e. unassigned in the organization's court):
      //    ONLY the organization's authorities (or System Admin) can perform actions.
      //    For letters, statements, and execution reports, users of current org can act when unassigned.
      if (status !== WorkflowStatus.DRAFT && !isAuthority && !isSystemAdmin && !isLetter && !isStatement && !isExecution) {
        return [];
      }
    }

    // Check Permissions
    let moduleId = ModuleId.TECHNICAL_OFFICE;
    if (isExecution) {
      moduleId = ModuleId.EXECUTION;
    } else if (isMinute || isLetter) {
      moduleId = ModuleId.COMMUNICATIONS;
    } else if (isStatement) {
      moduleId = ModuleId.CBS_STATEMENTS;
    } else if (isQC) {
      moduleId = ModuleId.QUALITY_CONTROL;
    } else if (isPlanning) {
      moduleId = ModuleId.PLANNING;
    } else if (isHse) {
      moduleId = ModuleId.HSE;
    }
    
    const canView = SystemAdminService.checkPermission(user.id, moduleId, 'view');
    if (!canView) return [];

    const canCreate = SystemAdminService.checkPermission(user.id, moduleId, 'create'); // For Submit/Resubmit?
    const canEdit = SystemAdminService.checkPermission(user.id, moduleId, 'edit'); // For Reassign?
    const canSend = SystemAdminService.checkPermission(user.id, moduleId, 'send');
    let canApprove = SystemAdminService.checkPermission(user.id, moduleId, 'approve');
    let canReject = SystemAdminService.checkPermission(user.id, moduleId, 'reject');
    let canFinalApprove = SystemAdminService.checkPermission(user.id, moduleId, 'finalApprove');

    // Strict override for Employer's Expert and Unit Supervisor
    const resolvedOrgType = userOrgType || SystemAdminService.getOrganization(user.orgId)?.type;
    const ut = (user.jobTitle || "").trim();
    const ul = (user.jobLevel || "").trim();
    // Any user receiving a document should have the APPROVE (Confirm) and REJECT (Reject/Return) buttons active for internal workflow.
    if (isAssignee) {
      canApprove = true;
      canReject = true;
    }

    if (isLetter && isPMOrWorkshopManager && isInUserOrg) {
      canApprove = true;
    }

    if (resolvedOrgType === OrganizationType.EMPLOYER && !isSystemAdmin) {
      if (isExpert || isUnitSupervisor) {
        canFinalApprove = false;
      }
    }

    // For Estimate items, if explicitly assigned to the user, we MUST activate approval regardless of generic permissions
    if (isEstimate && isAssignee) {
      canApprove = true;
    }

    // Strict rule: once a user performs an action (approve, reject, send, reassign, etc.), 
    // they lose possession and cannot perform any more actions unless it's explicitly assigned back to them.
    if (!isSystemAdmin && (item.workflowHistory || []).length > 0) {
      if (!isExecution || (status !== WorkflowStatus.DRAFT && status !== WorkflowStatus.IN_REVIEW)) {
        const lastEvent = WorkflowService.getLastHandoverEvent(item.workflowHistory);
        if (lastEvent && lastEvent.actorUserId === user.id && lastEvent.action !== 'UNFREEZE_BY_VARIATION') {
          if (!isAssignee) {
            const isDraftSave = (status === WorkflowStatus.DRAFT) && 
              (lastEvent.action === 'CREATE' || lastEvent.action === 'SAVE' || lastEvent.action === 'UPDATE' || lastEvent.action === 'CREATE_DAILY_REPORT' || lastEvent.action === 'EDIT_DAILY_REPORT');
            
            // Exception: Once PM or Workshop Manager approves internally (APPROVE),
            // the document remains in their court with status APPROVED_INTERNAL / APPROVED_BY_CONSULTANT
            // so they can proceed with the next phase: SEND_TO_CONSULTANT / SEND_TO_EMPLOYER / SEND_TO_CONTRACTOR!
            const isInternalApprovedPendingSend = 
              (status === WorkflowStatus.APPROVED_INTERNAL || status === WorkflowStatus.APPROVED_BY_CONSULTANT) &&
              isInUserOrg &&
              (isPMOrWorkshopManager || isOrgAuthority) &&
              lastEvent.action === 'APPROVE';

            if (!isDraftSave && !isInternalApprovedPendingSend) {
              return [];
            }
          }
        }
      }
    }

    if (isExecution && status === WorkflowStatus.DRAFT && isInUserOrg) {
      if (!actions.includes('SUBMIT')) actions.push('SUBMIT');
      if (!actions.includes('REASSIGN')) actions.push('REASSIGN');
    }

    switch (status) {
      case WorkflowStatus.DRAFT:
        // Creator, expert, authority, or system admin can submit and reassign
        if (isCreator || isSystemAdmin || isOrgAuthority || isExpert || isMinute || isStatement || isQC || isHse || isExecution || canSend || canCreate || canEdit) {
          if (!actions.includes('SUBMIT')) actions.push('SUBMIT');
          if (!actions.includes('REASSIGN')) actions.push('REASSIGN');
        }

        // Allow APPROVE only if user has approval rights AND is authority/manager/assignee (NOT expert)
        const isActorPMOrWMInDraft = isSystemAdmin || isProjectManager || isWorkshopManager || isOrgManager;
        if ((isAssignee || isAuthority || isSystemAdmin || isActorPMOrWMInDraft) && (canApprove || isActorPMOrWMInDraft) && !isExpert) {
          if (!actions.includes('APPROVE')) actions.push('APPROVE');
        }

        // Statements, Minutes, QC, HSE, Execution can directly send from DRAFT if PM/WM (Letters must be approved and signed first by PM/WM)
        if (isStatement || isMinute || isQC || isHse || isExecution) {
          const isActorPMOrWM = isSystemAdmin || isProjectManager || isWorkshopManager || isOrgManager;
          if (isActorPMOrWM) {
            const orgType = userOrgType || SystemAdminService.getOrganization(user.orgId)?.type;
            if (orgType === OrganizationType.CONTRACTOR) {
              if (!actions.includes('SEND_TO_CONSULTANT')) actions.push('SEND_TO_CONSULTANT');
            } else if (orgType === OrganizationType.CONSULTANT) {
              if (!actions.includes('SEND_TO_CONTRACTOR')) actions.push('SEND_TO_CONTRACTOR');
              if (!actions.includes('SEND_TO_EMPLOYER')) actions.push('SEND_TO_EMPLOYER');
            } else if (orgType === OrganizationType.EMPLOYER) {
              if (!actions.includes('SEND_TO_CONTRACTOR')) actions.push('SEND_TO_CONTRACTOR');
              if (!actions.includes('SEND_TO_CONSULTANT')) actions.push('SEND_TO_CONSULTANT');
            }
          }
        }
        break;

      case WorkflowStatus.IN_REVIEW:
        {
          // Assignee can Approve, Reject, Reassign
          const isPermit = 'contractorDcc' in item;
          const isPermitCreatorOrAuth = isPermit && (isCreator || isOrgAuthority || isAuthority);
          const isActorPMOrWMInReview = isSystemAdmin || isProjectManager || isWorkshopManager || isOrgManager;
          if (isAssignee || isSystemAdmin || isOrgAuthority || (!item.assigneeId && isAuthority) || isMinute || isQC || isHse || isExecution || isPermitCreatorOrAuth || (isLetter && isActorPMOrWMInReview)) {
            if (canApprove || (isLetter && isActorPMOrWMInReview)) actions.push('APPROVE');
            if (canReject && isAuthority) actions.push('REJECT');
            if (canEdit || canSend || isExpert) actions.push('REASSIGN');
          }
          // If statement, minute, QC, HSE, or Execution in review with PM/WM authority, allow sending directly to external orgs (Letters must be approved and signed first)
          if (isStatement || isMinute || isQC || isHse || isExecution) {
            const isActorPMOrWM = isSystemAdmin || isProjectManager || isWorkshopManager || isOrgManager;
            if (isActorPMOrWM && (isAssignee || isSystemAdmin || isOrgAuthority || (!item.assigneeId && isAuthority))) {
              const orgType = userOrgType || SystemAdminService.getOrganization(user.orgId)?.type;
              if (orgType === OrganizationType.CONTRACTOR) {
                if (!actions.includes('SEND_TO_CONSULTANT')) actions.push('SEND_TO_CONSULTANT');
              } else if (orgType === OrganizationType.CONSULTANT) {
                if (!actions.includes('SEND_TO_CONTRACTOR')) actions.push('SEND_TO_CONTRACTOR');
                if (!actions.includes('SEND_TO_EMPLOYER')) actions.push('SEND_TO_EMPLOYER');
              } else if (orgType === OrganizationType.EMPLOYER) {
                if (!actions.includes('SEND_TO_CONTRACTOR')) actions.push('SEND_TO_CONTRACTOR');
                if (!actions.includes('SEND_TO_CONSULTANT')) actions.push('SEND_TO_CONSULTANT');
              }
            }
          }
        }
        break;

      case WorkflowStatus.REJECTED:
        const wasReturnedFromExternal = (item.workflowHistory || []).some((ev: any) => 
          ev.action === 'RETURN_TO_CONTRACTOR' || ev.action === 'RETURN_TO_CONSULTANT'
        );

        // If returned from external and NO assignee is set, ONLY ProjectManager or Admin can act!
        if (wasReturnedFromExternal && !item.assigneeId && !isSystemAdmin && !isProjectManager) {
           break;
        }

        // If explicitly assigned, ONLY the Assignee or Admin can act!
        if (item.assigneeId && !isAssignee && !isSystemAdmin) {
           break;
        }

        if ((isCreator || isAssignee || isProjectManager || !item.createdById || isSystemAdmin || (isEstimate && userOrgType === OrganizationType.CONTRACTOR)) && canSend) {
          actions.push('SUBMIT');
        }

        // Add APPROVE if supervisor/authority wants to move it up (or back to review)
        if (canApprove && (isAssignee || isAuthority || isSystemAdmin)) {
          if (!actions.includes('APPROVE')) {
            actions.push('APPROVE');
          }
        }

        // Add REJECT if supervisor/authority wants to return it internally within the same org
        if (canReject && isAuthority) {
          actions.push('REJECT');
        }
        break;
        
      case WorkflowStatus.APPROVED_INTERNAL:
        {
          const isLetter = 'letterNumber' in item || 'scope' in item;
          if (isLetter) {
            // Cross-organization sending for letters
            // Restrict SEND actions to PM or Workshop Manager (as requested by user)
            const isActorPMOrWM = isSystemAdmin || isProjectManager || isWorkshopManager || isOrgManager;
            if (isActorPMOrWM) {
              const orgType = userOrgType || SystemAdminService.getOrganization(user.orgId)?.type;
              if (orgType === OrganizationType.CONTRACTOR) {
                actions.push('SEND_TO_CONSULTANT');
                actions.push('SEND_TO_EMPLOYER');
              } else if (orgType === OrganizationType.CONSULTANT) {
                actions.push('SEND_TO_CONTRACTOR');
                actions.push('SEND_TO_EMPLOYER');
              } else if (orgType === OrganizationType.EMPLOYER) {
                actions.push('SEND_TO_CONTRACTOR');
                actions.push('SEND_TO_CONSULTANT');
              }
              actions.push('REJECT'); // To return internally
            }
          } else {
            // Standard logic for non-letter items (e.g., minutes/decisions etc.)
            if (isSystemAdmin || ((isOrgManager || isProjectManager || isAuthority || isWorkshopManager) && (resolvedOrgType === OrganizationType.CONTRACTOR || userOrgType === OrganizationType.CONTRACTOR || (item as any).scope === 'EXTERNAL' || isExecution))) {
              actions.push('SEND_TO_CONSULTANT');
              if (resolvedOrgType !== OrganizationType.CONTRACTOR && userOrgType !== OrganizationType.CONTRACTOR) {
                actions.push('SEND_TO_EMPLOYER');
              }
              actions.push('REJECT');
            }
          }
        }
        break;

      // Phase 4B: Consultant Actions
      case WorkflowStatus.SENT_TO_CONSULTANT:
      case WorkflowStatus.IN_CONSULTANT_REVIEW:
        if (isAssignee || isSystemAdmin || isOrgManager || isAuthority || (isEstimate && !item.assigneeId) || isMinute || isStatement || isQC || isHse || isExecution) {
           if (isSystemAdmin || resolvedOrgType === OrganizationType.CONSULTANT || userOrgType === OrganizationType.CONSULTANT) {
             // 1. Reassign (Top-Down or Bottom-Up)
             if (canEdit || canSend) actions.push('REASSIGN');
             
             // 2. Reject/Return to Contractor (Manager / Supervisor Only)
             const isConsultantPMOrWorkshopManager = isProjectManager || isWorkshopManager || isOrgManager || isAuthority;
             if (isConsultantPMOrWorkshopManager) {
               actions.push('RETURN_TO_CONTRACTOR');
             }
             if (canReject) {
               actions.push('REJECT');
             }

             // 3. Approve
             // Expert: Approves (Internal) -> Then Reassigns to Manager
             // Manager: Approves (Final Consultant) -> Status becomes APPROVED_BY_CONSULTANT
             if (canApprove) {
               actions.push('APPROVE');
             }

             // 4. Send to Employer (Manager Only / Authority)
             const canDirectSend = !isEstimate && isPMOrWorkshopManager && canSend;
             if (canDirectSend) {
                  actions.push('SEND_TO_EMPLOYER');
             }
           }
        }
        break;
        
      case WorkflowStatus.APPROVED_BY_CONSULTANT:
        // Consultant Manager / Project Manager / Supervisor can Send to Employer, Return to Contractor or Reject internally
        if (isSystemAdmin || ((isOrgManager || isProjectManager || isAuthority || isWorkshopManager) && (resolvedOrgType === OrganizationType.CONSULTANT || userOrgType === OrganizationType.CONSULTANT))) {
          actions.push('SEND_TO_EMPLOYER');
          const isConsultantPMOrWorkshopManager = isProjectManager || isWorkshopManager || isOrgManager || isAuthority;
          if (isConsultantPMOrWorkshopManager) {
            actions.push('RETURN_TO_CONTRACTOR');
          }
          actions.push('REJECT');
        }
        break;

      // --- Employer Workflow ---
      case WorkflowStatus.SENT_TO_EMPLOYER:
      case WorkflowStatus.IN_EMPLOYER_REVIEW:
      case WorkflowStatus.APPROVED_BY_EMPLOYER:
        if (isAssignee || isSystemAdmin || isOrgManager || isAuthority || (isEstimate && !item.assigneeId) || isMinute || isStatement || isQC || isHse || isExecution) {
             if (isSystemAdmin || resolvedOrgType === OrganizationType.EMPLOYER || userOrgType === OrganizationType.EMPLOYER) {
                  // 1. Reassign (Top-Down or Bottom-Up)
                  if (canEdit || canSend) actions.push('REASSIGN');

                  // 2. Return to Consultant (Employer PM / Workshop Manager Only)
                  const isEmployerPMOrWorkshopManager = isProjectManager || isWorkshopManager || isOrgManager || isAuthority;
                  if (isEmployerPMOrWorkshopManager) {
                    actions.push('RETURN_TO_CONSULTANT');
                  }
                  if (canReject) {
                    actions.push('REJECT');
                  }

                  // 3. Final Approve (Manager Only / Authority)
                  if (canFinalApprove) {
                       actions.push('FINAL_APPROVE');
                  }
                  
                  // 4. Approve (Internal - e.g. Expert/Supervisor to Manager)
                  // If the user has permission to final approve, prioritize Final Approval over internal approve to have only one button
                  const isEmployerWithFinalApprove = (resolvedOrgType === OrganizationType.EMPLOYER || userOrgType === OrganizationType.EMPLOYER) && canFinalApprove;
                  if (canApprove && !isEmployerWithFinalApprove) {
                       actions.push('APPROVE');
                  }
             }
        }
        break;
    }

    // Ensure all bulk actions (APPROVE, REJECT, REASSIGN, RETURN_TO_*, FINAL_APPROVE, SEND_TO_*) are available for Estimates when assigned to the user or within authorities
    if (isEstimate) {
      if (isAssignee || !item.assigneeId) {
        const uTitle = (user.jobTitle || "").trim();
        const uLevel = (user.jobLevel || "").trim();
        
        const isSupervisorOrManagerOrPM = 
          uTitle.includes("سرپرست") || uLevel.includes("سرپرست") ||
          uTitle.includes("مدیر پروژه") || uLevel.includes("مدیر پروژه") ||
          isPMOrWorkshopManager ||
          isSystemAdmin;
          
        if (isSupervisorOrManagerOrPM) {
          const estActions: WorkflowAction[] = ['REJECT', 'REASSIGN'];
          
          if (resolvedOrgType === OrganizationType.EMPLOYER || userOrgType === OrganizationType.EMPLOYER) {
            if (canFinalApprove) {
              estActions.push('FINAL_APPROVE');
            } else {
              estActions.push('APPROVE');
            }
            estActions.push('RETURN_TO_CONSULTANT');
          } else if (resolvedOrgType === OrganizationType.CONSULTANT || userOrgType === OrganizationType.CONSULTANT) {
            estActions.push('APPROVE');
            estActions.push('RETURN_TO_CONTRACTOR');
            if (status === WorkflowStatus.APPROVED_BY_CONSULTANT || actions.includes('SEND_TO_EMPLOYER')) {
              estActions.push('SEND_TO_EMPLOYER');
            }
          } else {
            estActions.push('APPROVE');
            if (status === WorkflowStatus.APPROVED_INTERNAL || actions.includes('SEND_TO_CONSULTANT')) {
              estActions.push('SEND_TO_CONSULTANT');
            }
          }
          return estActions;
        }
      }
    }

    let finalActions = actions;
    
    // Rule: Only PM and Workshop Manager can see external communication buttons (Send/Return)
    // Unit Supervisors and Experts are strictly excluded.
    const externalActions: WorkflowAction[] = [
      'SEND_TO_CONSULTANT', 
      'SEND_TO_EMPLOYER', 
      'RETURN_TO_CONTRACTOR', 
      'RETURN_TO_CONSULTANT'
    ];

    if (!isPMOrWorkshopManager) {
      finalActions = finalActions.filter(a => !externalActions.includes(a));
    }

    // Role-based restrictions for other senior actions
    // For letters, we DO NOT filter out APPROVE or REJECT for Experts/Supervisors.
    if (!isPMOrWorkshopManager && !t.includes('سرپرست') && !l.includes('سرپرست')) {
      const restrictedActions: WorkflowAction[] = [
        'FINAL_APPROVE',
        ...externalActions
      ];
      finalActions = finalActions.filter(a => !restrictedActions.includes(a));
    }

    if (isExpert && !isPMOrWorkshopManager && !isLetter) {
      const isConsultantOrEmployer = resolvedOrgType === OrganizationType.CONSULTANT || resolvedOrgType === OrganizationType.EMPLOYER;
      finalActions = finalActions.filter(a => {
        if (a === 'REJECT' && isConsultantOrEmployer) return true;
        return a !== 'REJECT' && a !== 'RETURN_TO_CONTRACTOR' && a !== 'RETURN_TO_CONSULTANT';
      });
    }

    const isEmployerExpert = (resolvedOrgType === OrganizationType.EMPLOYER || userOrgType === OrganizationType.EMPLOYER) && !isSystemAdmin && !isPMOrWorkshopManager && (
      t.includes('کارشناس') || l.includes('کارشناس')
    );
    if (isEmployerExpert && !isLetter) {
      finalActions = finalActions.filter(a => {
        if (a === 'REJECT') return true;
        return a !== 'FINAL_APPROVE' && 
               a !== 'RETURN_TO_CONTRACTOR' && 
               a !== 'RETURN_TO_CONSULTANT';
      });
    }

    finalActions = finalActions.filter(a => a !== 'RESUBMIT');

    // Strict requirement: In Technical Office, Statements (both CBS and Unit-Price), Estimates, and project documents,
    // Contractor roles (including Project Manager and Workshop Manager) should NEVER be able to send directly to Employer.
    // They must send to Consultant (SEND_TO_CONSULTANT).
    if (!isSystemAdmin && (resolvedOrgType === OrganizationType.CONTRACTOR || userOrgType === OrganizationType.CONTRACTOR)) {
      if (!isLetter) {
        finalActions = finalActions.filter(a => a !== 'SEND_TO_EMPLOYER');
      }
    }

    if (isLetter) {
      finalActions = finalActions.filter(a => a !== 'RETURN_TO_CONTRACTOR' && a !== 'RETURN_TO_CONSULTANT');
    }

    return finalActions;
  },

  // Perform an action
  performAction: (
    item: WorkflowItem, 
    action: WorkflowAction, 
    actor: SystemUser, 
    payload?: { 
      assigneeId?: string; 
      assigneeName?: string; 
      comment?: string; 
      targetOrgId?: string;
      signature?: string;
      attachSignature?: boolean;
      roleKey?: string;
    }
  ): WorkflowItem => {
    const userOrgType = SystemAdminService.getOrganization(actor.orgId)?.type;
    const allowedActions = WorkflowService.getAvailableActions(item, actor, userOrgType);
    
    if (!allowedActions.includes(action)) {
      const status = WorkflowService.getStatus(item);
      throw new Error(`شما مجاز به انجام اقدام "${WorkflowService.getActionLabel(action)}" در وضعیت فعلی این سند (${status}) نیستید یا سطح دسترسی لازم را ندارید.`);
    }

    const isSystemAdmin = actor.role === 'SYSTEM_ADMIN';
    const isActorManager = actor.role === 'ORG_MANAGER' || actor.role === 'ORG_ADMIN';
    const tActor = (actor.jobTitle || '').trim();
    const lActor = (actor.jobLevel || '').trim();
    const isActorWithAuthority = isSystemAdmin || 
                             isActorManager ||
                             tActor.includes('مدیر پروژه') || tActor.includes('سرپرست') ||
                             lActor.includes('مدیر پروژه') || lActor.includes('سرپرست');
    const itemCurrentOrgId = (item as any).currentOrgId || (item as any).ownerOrgId;
    
    // Inter-Org Lock: Cannot perform action if item is not in user's org
    if (!isSystemAdmin && itemCurrentOrgId && itemCurrentOrgId !== actor.orgId) {
      throw new Error(`سند جاری در سازمان شما (OrgId: ${actor.orgId}) قرار ندارد و در سازمان ${itemCurrentOrgId} است.`);
    }

    // Strict Rule: External letters (نامه‌های برون‌سازمانی) can strictly only be signed and sent by Project Manager or Workshop Manager
    const isExternalLetter = (item as any).scope === 'EXTERNAL';
    if (isExternalLetter && !isSystemAdmin) {
      const isPM = actor.role === 'ORG_MANAGER' || actor.role === 'ORG_ADMIN' || tActor.includes('مدیر پروژه') || lActor.includes('مدیر پروژه') || tActor.includes('مدیر طرح') || lActor.includes('مدیر طرح');
      const isWM = tActor.includes('سرپرست کارگاه') || lActor.includes('سرپرست کارگاه') || tActor.includes('سرپرست نظارت') || lActor.includes('سرپرست نظارت') || tActor.includes('رئیس کارگاه') || lActor.includes('رئیس کارگاه') || tActor.includes('مدیر کارگاه') || lActor.includes('مدیر کارگاه');
      if (!isPM && !isWM) {
        if (action === 'SIGN' || action === 'SEND_TO_CONSULTANT' || action === 'SEND_TO_EMPLOYER' || action === 'FINAL_APPROVE') {
          throw new Error('امضا و ارسال نامه‌های برون‌سازمانی انحصاراً توسط سرپرست کارگاه یا مدیر پروژه مجاز می‌باشد.');
        }
      }
    }

    // Validate assignee if actor is Expert or Unit Supervisor (across all organizations)
    const isActorExpertOrUnitSupervisor = !isSystemAdmin && (
      tActor.includes('کارشناس') || lActor.includes('کارشناس') ||
      tActor.includes('سرپرست واحد') || lActor.includes('سرپرست واحد')
    );
    if (isActorExpertOrUnitSupervisor && payload?.assigneeId) {
      const assigneeUser = SystemAdminService.getUsers().find(u => u.id === payload?.assigneeId);
      if (assigneeUser) {
        if (assigneeUser.orgId !== actor.orgId) {
          throw new Error('کارشناس و سرپرست واحد فقط می‌توانند کارتابل را به کاربران درون‌سازمانی خود ارجاع دهند.');
        }
        // No restriction for referring internally to Project Manager anymore
      }
    }

    const currentStatus = WorkflowService.getStatus(item);
    let nextStatus = currentStatus;
    let nextOrgId = (item as any).currentOrgId || (item as any).ownerOrgId; // Default to current
    
    const isEstimate = 'unitPrice' in item && 'quantity' in item;
    const isLetter = 'letterNumber' in item || 'scope' in item;

    // State transitions
    switch (action) {
      case 'SUBMIT':
      case 'RESUBMIT':
        nextStatus = WorkflowStatus.IN_REVIEW;
        if (!payload?.assigneeId && !isEstimate) throw new Error('Assignee is required for Submit/Resubmit');
        break;
      case 'REASSIGN':
        nextStatus = currentStatus === WorkflowStatus.DRAFT ? WorkflowStatus.IN_REVIEW : currentStatus; // Status doesn't change usually
        if (!payload?.assigneeId) throw new Error('Assignee is required for Reassign');
        break;
      case 'APPROVE':
        // For letters approved by an authority (PM / Workshop Manager / Org Manager):
        // It always achieves internal approval (APPROVED_INTERNAL / APPROVED_BY_CONSULTANT)
        // so that the Send to Consultant / Send to Employer buttons can be unlocked!
        if (isLetter && isActorWithAuthority) {
          if (userOrgType === OrganizationType.CONSULTANT) {
            nextStatus = WorkflowStatus.APPROVED_BY_CONSULTANT;
          } else {
            nextStatus = WorkflowStatus.APPROVED_INTERNAL;
          }
        } else if (payload?.assigneeId) {
          if (currentStatus === WorkflowStatus.REJECTED || currentStatus === WorkflowStatus.DRAFT) {
            if (userOrgType === OrganizationType.CONSULTANT) {
              nextStatus = WorkflowStatus.IN_CONSULTANT_REVIEW;
            } else if (userOrgType === OrganizationType.EMPLOYER) {
              nextStatus = WorkflowStatus.IN_EMPLOYER_REVIEW;
            } else {
              nextStatus = WorkflowStatus.IN_REVIEW;
            }
          }
            // Status remains the same (e.g. IN_REVIEW), just assignee changes
        } else {
             // No assignee provided.
             if (currentStatus === WorkflowStatus.DRAFT || currentStatus === WorkflowStatus.IN_REVIEW || currentStatus === WorkflowStatus.REJECTED) {
                if (userOrgType === OrganizationType.CONSULTANT) {
                   if (isActorWithAuthority) {
                      nextStatus = WorkflowStatus.APPROVED_BY_CONSULTANT;
                   } else {
                      nextStatus = WorkflowStatus.IN_CONSULTANT_REVIEW;
                   }
                } else if (userOrgType === OrganizationType.EMPLOYER) {
                   if (isLetter && isActorWithAuthority) {
                      nextStatus = WorkflowStatus.APPROVED_INTERNAL;
                   } else {
                      nextStatus = WorkflowStatus.IN_EMPLOYER_REVIEW;
                   }
                } else {
                   if (isActorWithAuthority) {
                      nextStatus = WorkflowStatus.APPROVED_INTERNAL;
                   } else {
                      nextStatus = WorkflowStatus.IN_REVIEW;
                   }
                }
             } else if (currentStatus === WorkflowStatus.SENT_TO_CONSULTANT || currentStatus === WorkflowStatus.IN_CONSULTANT_REVIEW) {
                 // Consultant Logic:
                 // If Manager approves without assignee -> Final Consultant Approval
                 if (isActorWithAuthority) {
                     nextStatus = WorkflowStatus.APPROVED_BY_CONSULTANT;
                 } else {
                     // Expert approves -> Internal (Stay in Review)
                     nextStatus = WorkflowStatus.IN_CONSULTANT_REVIEW;
                 }
             } else if (currentStatus === WorkflowStatus.SENT_TO_EMPLOYER || currentStatus === WorkflowStatus.IN_EMPLOYER_REVIEW) {
                 // Employer Logic:
                 // Expert approves -> Internal (Stay in Review)
                 // Manager approves -> Final Approve (Freeze) is a separate action. 
                 // If Manager clicks "Approve" (not Final Approve) -> Internal Approve?
                 nextStatus = WorkflowStatus.IN_EMPLOYER_REVIEW;
             }
        }
        break;

      case 'FINAL_APPROVE':
        // Phase 4D: Final Freeze
        if (userOrgType !== OrganizationType.EMPLOYER && !isSystemAdmin) {
          throw new Error('تایید نهایی فقط توسط کارفرما یا مدیر سیستم امکان‌پذیر است.');
        }
        // Permission check is already done in getAvailableActions via canFinalApprove
        if (itemCurrentOrgId !== actor.orgId && !isSystemAdmin) {
          throw new Error('تایید نهایی فقط در سازمان کارفرما امکان‌پذیر است.');
        }
        if ((item as any).isFinalFrozen) {
          throw new Error('سند قبلاً قطعی شده است.');
        }
        nextStatus = WorkflowStatus.APPROVED_INTERNAL; // Or keep it as is, but it's finalized
        break;
      case 'UNFREEZE_BY_VARIATION':
        // Phase 4D: Unfreeze
        if (!(item as any).isFinalFrozen) throw new Error('سند فریز نشده است.');
        
        // Strict Permission Check: Only Employer Manager/Admin or System Admin or Employer Authority (e.g. Project Manager, Workshop Supervisor)
        if (userOrgType !== OrganizationType.EMPLOYER && !isSystemAdmin) throw new Error('بازگشایی فقط توسط کارفرما یا مدیر سیستم امکان‌پذیر است.');
        
        const isActorPMOrWM = isSystemAdmin || 
                         actor.role === 'ORG_MANAGER' || actor.role === 'ORG_ADMIN' ||
                         (actor.jobTitle || '').includes('مدیر پروژه') || (actor.jobLevel || '').includes('مدیر پروژه') ||
                         (actor.jobTitle || '').includes('سرپرست کارگاه') || (actor.jobLevel || '').includes('سرپرست کارگاه');

        if (!isActorPMOrWM) throw new Error('بازگشایی فقط توسط مدیران ارشد، مدیر پروژه، سرپرست کارگاه یا مدیر سیستم امکان‌پذیر است.');
        
        if (itemCurrentOrgId !== actor.orgId && !isSystemAdmin) throw new Error('بازگشایی فقط در سازمان کارفرما یا برای مدیر سیستم امکان‌پذیر است.');
        if (!payload?.comment?.trim()) throw new Error('دلیل بازگشایی الزامی است.');

        nextStatus = WorkflowStatus.IN_EMPLOYER_REVIEW; // Send back to employer review to allow edits
        break;
      case 'REJECT':
        nextStatus = WorkflowStatus.REJECTED;
        if (!payload?.comment?.trim()) throw new Error('Comment is required for Reject');
        if (payload?.targetOrgId) {
          nextOrgId = payload.targetOrgId;
        }
        break;

      // Phase 4B Actions
      case 'SEND_TO_CONSULTANT':
        nextStatus = WorkflowStatus.SENT_TO_CONSULTANT; // Or IN_CONSULTANT_REVIEW
        const resolvedConsultantTarget = payload?.targetOrgId || (isLetter ? (item as any).receiverOrgId : undefined);
        if (!resolvedConsultantTarget) throw new Error('Target Org ID is required for Inter-Org Send');
        if (!payload?.assigneeId && !isLetter) throw new Error('Assignee is required for Inter-Org Send');
        nextOrgId = resolvedConsultantTarget;
        break;
      
      case 'SEND_TO_EMPLOYER':
        nextStatus = WorkflowStatus.SENT_TO_EMPLOYER;
        const resolvedEmployerTarget = payload?.targetOrgId || (isLetter ? (item as any).receiverOrgId : undefined);
        if (!resolvedEmployerTarget) throw new Error('Target Org ID is required for Inter-Org Send');
        if (!payload?.assigneeId && !isLetter) throw new Error('Assignee is required for Inter-Org Send');
        nextOrgId = resolvedEmployerTarget;
        break;

      case 'SEND_TO_CONTRACTOR':
        nextStatus = WorkflowStatus.IN_REVIEW;
        const resolvedContractorTarget = payload?.targetOrgId || (isLetter ? (item as any).receiverOrgId : undefined);
        if (!resolvedContractorTarget) throw new Error('Target Org ID is required for Inter-Org Send');
        if (!payload?.assigneeId && !isLetter) throw new Error('Assignee is required for Inter-Org Send');
        nextOrgId = resolvedContractorTarget;
        break;

      case 'RETURN_TO_CONTRACTOR':
        nextStatus = WorkflowStatus.REJECTED; // Return to Contractor means Rejected
        nextOrgId = (item as any).ownerOrgId; // Back to owner (Contractor)
        if (!payload?.comment?.trim()) throw new Error('Comment is required for Return');
        break;

      case 'SIGN':
        if (isLetter && (item as any).scope === 'EXTERNAL') {
          nextStatus = WorkflowStatus.APPROVED_INTERNAL;
        } else {
          nextStatus = currentStatus;
        }
        break;

      case 'RETURN_TO_CONSULTANT':
        nextStatus = WorkflowStatus.IN_CONSULTANT_REVIEW; // Return to Consultant
        if (!payload?.targetOrgId) throw new Error('Target Org ID (Consultant) is required for Return');
        nextOrgId = payload.targetOrgId;
        if (!payload?.comment?.trim()) throw new Error('Comment is required for Return');
        break;
    }

    // Create history event
    const actorOrg = actor.orgId ? SystemAdminService.getOrganization(actor.orgId) : undefined;
    const actorName = formatUserDisplayFormal(actor, actorOrg);
    
    const orgType = actorOrg?.type || (actor as any)?.orgType;
    const titleLower = ((actor.jobTitle || '') + ' ' + (actor.jobLevel || '')).toLowerCase();

    let resolvedRoleKey = (payload as any)?.roleKey;
    if (!resolvedRoleKey) {
      if (orgType === OrganizationType.EMPLOYER || titleLower.includes('کارفرما') || titleLower.includes('مدیر طرح') || titleLower.includes('مجری')) {
        if (titleLower.includes('سرپرست کارگاه') || titleLower.includes('مدیر پروژه') || titleLower.includes('مدیر طرح') || titleLower.includes('نماینده') || titleLower.includes('مجری') || titleLower.includes('رئیس کارگاه') || titleLower.includes('مدیر کارگاه') || titleLower.includes('مدیر عامل') || titleLower.includes('کارفرما')) {
          resolvedRoleKey = 'employer';
        } else if (titleLower.includes('سرپرست واحد') || titleLower.includes('مدیر گروه') || titleLower.includes('رئیس اداره') || titleLower.includes('سرپرست گروه') || titleLower.includes('مدیر واحد') || titleLower.includes('سرپرست دفتر') || titleLower.includes('رئیس دفتر')) {
          resolvedRoleKey = 'employer_head';
        } else {
          resolvedRoleKey = 'employer_tech';
        }
      } else if (orgType === OrganizationType.CONSULTANT || titleLower.includes('ناظر') || titleLower.includes('مشاور') || titleLower.includes('سرپرست نظارت')) {
        if (titleLower.includes('سرپرست واحد') || titleLower.includes('سرپرست گروه') || titleLower.includes('رئیس گروه') || titleLower.includes('مدیر واحد') || titleLower.includes('رئیس دفتر') || titleLower.includes('سرپرست دفتر فنی') || titleLower.includes('مسئول دفتر فنی')) {
          resolvedRoleKey = 'consultant_head';
        } else if (titleLower.includes('سرپرست نظارت') || titleLower.includes('سرپرست کارگاه') || titleLower.includes('مدیر پروژه') || titleLower.includes('مدیر نظارت') || titleLower.includes('رئیس نظارت') || titleLower.includes('مشاور') || titleLower.includes('رئیس کارگاه') || titleLower.includes('مدیر کارگاه') || titleLower.includes('ناظر مقیم')) {
          resolvedRoleKey = 'consultant';
        } else {
          resolvedRoleKey = 'consultant_tech';
        }
      } else {
        if (titleLower.includes('سرپرست کارگاه') || titleLower.includes('مدیر پروژه') || titleLower.includes('رئیس کارگاه') || titleLower.includes('مدیر کارگاه')) {
          resolvedRoleKey = 'contractor_site';
        } else if (titleLower.includes('سرپرست واحد') || titleLower.includes('سرپرست دفتر') || titleLower.includes('رئیس دفتر') || titleLower.includes('مدیر دفتر') || titleLower.includes('رئیس واحد') || titleLower.includes('سرپرست دفتر فنی')) {
          resolvedRoleKey = 'contractor_head';
        } else {
          resolvedRoleKey = 'contractor_tech';
        }
      }
    }

    // Determine if this action requires a signature
    const isConsultant = orgType === OrganizationType.CONSULTANT || titleLower.includes('ناظر') || titleLower.includes('مشاور') || resolvedRoleKey?.startsWith('consultant') || resolvedRoleKey === 'permit_consultant';
    const isEmployer = orgType === OrganizationType.EMPLOYER || titleLower.includes('کارفرما') || titleLower.includes('مدیر طرح') || titleLower.includes('مجری') || resolvedRoleKey?.startsWith('employer');
    const isContractor = !isConsultant && !isEmployer;

    let requiresSignature = false;
    if (action === 'REASSIGN' || action === 'REJECT') {
      requiresSignature = false;
    } else if (isContractor) {
      const isExpert = resolvedRoleKey === 'contractor_tech' || resolvedRoleKey === 'permit_expert';
      const isHead = resolvedRoleKey === 'contractor_head' || resolvedRoleKey === 'permit_head';
      const isSite = resolvedRoleKey === 'contractor_site' || resolvedRoleKey === 'permit_site';
      
      if (isExpert) {
        requiresSignature = ['SUBMIT', 'RESUBMIT', 'APPROVE', 'SIGN', 'REPORT_SIGNATURE'].includes(action);
      } else if (isHead) {
        requiresSignature = ['APPROVE', 'SIGN', 'REPORT_SIGNATURE', 'SUBMIT', 'RESUBMIT'].includes(action);
      } else if (isSite) {
        requiresSignature = ['SEND_TO_CONSULTANT', 'APPROVE', 'SIGN', 'REPORT_SIGNATURE', 'SUBMIT', 'RESUBMIT'].includes(action);
      } else {
        requiresSignature = ['SUBMIT', 'RESUBMIT', 'SEND_TO_CONSULTANT', 'APPROVE', 'SIGN', 'REPORT_SIGNATURE'].includes(action);
      }
    } else if (isConsultant) {
      requiresSignature = ['APPROVE', 'SEND_TO_EMPLOYER', 'RETURN_TO_CONTRACTOR', 'SIGN', 'REPORT_SIGNATURE', 'SUBMIT', 'RESUBMIT'].includes(action);
    } else if (isEmployer) {
      requiresSignature = ['APPROVE', 'FINAL_APPROVE', 'RETURN_TO_CONSULTANT', 'SIGN', 'REPORT_SIGNATURE', 'SUBMIT', 'RESUBMIT'].includes(action);
    }

    let actorSignature: string | undefined = undefined;
    if (action === 'REASSIGN' || action === 'REJECT') {
      actorSignature = undefined;
    } else if (payload && ('attachSignature' in payload || 'signature' in payload)) {
      // User or UI explicitly provided payload parameters for signature attachment
      if (payload.attachSignature === false) {
        actorSignature = undefined;
      } else if (payload.signature && typeof payload.signature === 'string' && payload.signature.trim().length > 0) {
        actorSignature = payload.signature;
      } else {
        actorSignature = HRService.getUserSignature(actor) || actor?.signature || HRService.generateDefaultSignature(actor);
      }
    } else if (requiresSignature) {
      actorSignature = HRService.getUserSignature(actor) || actor?.signature || HRService.generateDefaultSignature(actor);
    }

    const event: WorkflowEvent = {
        id: safeRandomUUID(),
        timestamp: Date.now(),
        action,
        fromStatus: currentStatus,
        toStatus: nextStatus,
        actorUserId: actor.id,
        actorName: actorName,
        actorTitle: actor.jobTitle || actor.jobLevel || (actor.role === 'ORG_ADMIN' ? 'مدیر پروژه' : (actor.role === 'ORG_MANAGER' ? 'سرپرست کارگاه' : actorOrg?.name)) || 'کاربر سیستم',
        actorOrgId: actor.orgId,
        actorOrgType: actorOrg?.type,
        roleKey: resolvedRoleKey,
        role: actor.role,
        assigneeUserId: payload?.assigneeId,
        assigneeName: payload?.assigneeName,
        comment: payload?.comment,
        signature: actorSignature
    };

    // Update item
    const updatedItem = { ...item } as any;
    if ('ncrNumber' in item) {
      if (action === 'REJECT') {
        updatedItem.status = 'REJECTED';
      }
    } else {
      updatedItem.status = nextStatus;
    }
    updatedItem.workflowStatus = nextStatus;
    updatedItem.currentOrgId = nextOrgId;
    
    // Phase 4D: Freeze logic
    if (action === 'FINAL_APPROVE') {
      updatedItem.isFinalFrozen = true;
    } else if (action === 'UNFREEZE_BY_VARIATION') {
      updatedItem.isFinalFrozen = false;
      updatedItem.assigneeId = actor.id; // Assign to the person who unfroze it
    }

    if (action === 'SUBMIT' || action === 'RESUBMIT' || action === 'REASSIGN' || 
        action === 'SEND_TO_CONSULTANT' || action === 'SEND_TO_EMPLOYER' || action === 'SEND_TO_CONTRACTOR') {
      updatedItem.assigneeId = payload?.assigneeId;
    } else if (action === 'APPROVE') {
        // If assignee provided, set it. If not, clear it (Approved Internal)
        updatedItem.assigneeId = payload?.assigneeId;
    } else if (action === 'RETURN_TO_CONTRACTOR' || action === 'RETURN_TO_CONSULTANT') {
      updatedItem.assigneeId = payload?.assigneeId || undefined;
    } else if (action === 'REJECT') {
      updatedItem.assigneeId = payload?.assigneeId || undefined;
    } else if (action === 'FINAL_APPROVE') {
        updatedItem.assigneeId = undefined; // Clear assignee
    }

    if (payload?.assigneeName) {
      updatedItem.assigneeName = payload.assigneeName;
    } else if (!updatedItem.assigneeId) {
      updatedItem.assigneeName = undefined;
    } else if (payload?.assigneeId) {
      const targetUser = SystemAdminService.getUsers().find(u => u.id === payload.assigneeId);
      if (targetUser) {
        updatedItem.assigneeName = `${targetUser.fullName || targetUser.username} (${targetUser.jobTitle || 'کاربر'})`;
      }
    }

    let historyCopy = [...(item.workflowHistory || []), event];

    if (payload && payload.attachSignature === false) {
      // If the actor explicitly executes an action without attaching a signature, clear any existing signatures of this actor
      historyCopy = historyCopy.map(entry => {
        if (entry.id === event.id) return entry;
        const isSameActor = entry.actorUserId === actor.id;
        if (isSameActor) {
          return { ...entry, signature: undefined };
        }
        return entry;
      });
    }

    if (action === 'RETURN_TO_CONTRACTOR') {
      // When a document is returned to the contractor, clear ALL signatures in history except the current return action
      historyCopy = historyCopy.map(entry => {
        if (entry.id === event.id) return entry;
        return { ...entry, signature: undefined };
      });
    } else if (action === 'RETURN_TO_CONSULTANT') {
      // When a document is returned to the consultant, clear all consultant and employer signatures, keep contractor signatures
      historyCopy = historyCopy.map(entry => {
        if (entry.id === event.id) return entry;
        const isConsultant = entry.roleKey?.startsWith('consultant') ||
                             entry.roleKey?.startsWith('permit_consultant') ||
                             entry.actorOrgType === OrganizationType.CONSULTANT;
                             
        const isEmployer = entry.roleKey?.startsWith('employer') ||
                           entry.roleKey?.startsWith('permit_employer') ||
                           entry.actorOrgType === OrganizationType.EMPLOYER;
                           
        if (isConsultant || isEmployer) {
          return { ...entry, signature: undefined };
        }
        return entry;
      });
    } else if (action === 'REJECT') {
      // Internal rejection: only clear signatures of the actor's own organization
      const actorOrgType = actorOrg?.type;

      historyCopy = historyCopy.map(entry => {
        if (entry.id === event.id) return entry;
        const isContractorEntry = entry.roleKey?.startsWith('contractor_') ||
                                  entry.roleKey?.startsWith('permit_expert') ||
                                  entry.roleKey?.startsWith('permit_head') ||
                                  entry.roleKey?.startsWith('permit_site') ||
                                  entry.actorOrgType === OrganizationType.CONTRACTOR ||
                                  (!entry.actorOrgType && !entry.roleKey?.startsWith('consultant') && !entry.roleKey?.startsWith('employer') && !entry.roleKey?.startsWith('permit_consultant') && !entry.roleKey?.startsWith('permit_employer'));

        const isConsultantEntry = entry.roleKey?.startsWith('consultant') ||
                                  entry.roleKey?.startsWith('permit_consultant') ||
                                  entry.actorOrgType === OrganizationType.CONSULTANT;

        const isEmployerEntry = entry.roleKey?.startsWith('employer') ||
                                entry.roleKey?.startsWith('permit_employer') ||
                                entry.actorOrgType === OrganizationType.EMPLOYER;

        if (actorOrgType === OrganizationType.EMPLOYER) {
          // Rejection inside Employer: only clear Employer's own signatures
          if (isEmployerEntry) {
            return { ...entry, signature: undefined };
          }
        } else if (actorOrgType === OrganizationType.CONSULTANT) {
          // Rejection inside Consultant: only clear Consultant's own signatures (and Employer's if any exist)
          if (isConsultantEntry || isEmployerEntry) {
            return { ...entry, signature: undefined };
          }
        } else {
          // Rejection inside Contractor: only clear Contractor's own signatures
          if (isContractorEntry) {
            return { ...entry, signature: undefined };
          }
        }
        return entry;
      });
    }

    updatedItem.workflowHistory = historyCopy;

    // Phase 4C: Trigger Notifications for All Workflow Actions & Recipients
    try {
      let module: 'STATEMENTS' | 'MINUTES' | 'ESTIMATES' | 'PERMITS' | 'MATERIALS' | 'VARIATIONS' | 'ADJUSTMENT' | 'EXECUTION' | 'COMMUNICATIONS' | 'QC' | 'HSE' | 'PLANNING' | 'CLAIMS' = 'MINUTES';
      let messagePrefix = 'صورت‌جلسه';
      
      const isItemHse = 'permitType' in item || 'incidentType' in item || 'environmentalAspect' in item || 'aspect' in item || 'kpiStats' in item || 'hsePolicy' in item || (item as any)?.module === 'hse' || (item as any)?.module === 'HSE' || 'permitNumber' in item || 'incidentNumber' in item || 'planNumber' in item || String((item as any).reportNumber || '').startsWith('HSE-');
      if (isItemHse) {
        module = 'HSE' as any;
        if ('permitType' in item) {
          messagePrefix = 'مجوز کار ایمنی (HSE PTW)';
        } else if ('incidentType' in item) {
          messagePrefix = 'گزارش حادثه HSE';
        } else if ('environmentalAspect' in item || 'aspect' in item) {
          messagePrefix = 'گزارش زیست‌محیطی HSE';
        } else if ('kpiStats' in item) {
          messagePrefix = 'گزارش دوره‌ای HSE';
        } else {
          messagePrefix = 'برنامه جامع HSE';
        }
      } else if ((item as any)?.rfiNumber) {
        module = 'QC';
        messagePrefix = 'برگه بازرسی RFI';
      } else if ((item as any)?.ncrNumber) {
        module = 'QC';
        messagePrefix = 'گزارش عدم انطباق NCR';
      } else if ((item as any)?.testNumber) {
        module = 'QC';
        messagePrefix = 'آزمایش کنترل کیفی';
      } else if ('rfiNumber' in item) {
        module = 'QC';
        messagePrefix = 'برگه بازرسی RFI';
      } else if ('ncrNumber' in item) {
        module = 'QC';
        messagePrefix = 'گزارش عدم انطباق NCR';
      } else if ('testNumber' in item) {
        module = 'QC';
        messagePrefix = 'آزمایش کنترل کیفی';
      } else if ('startDate' in item) {
        module = 'STATEMENTS';
        messagePrefix = 'صورت‌وضعیت';
      } else if ('unitPrice' in item && 'quantity' in item) {
        module = 'ESTIMATES';
        messagePrefix = 'برآورد پیمان';
      } else if ('contractorDcc' in item || 'permitNumber' in item || (item as any).module === 'PERMITS' || (item as any).module === 'permits') {
        module = 'PERMITS';
        messagePrefix = 'مجوز عملیات اجرایی';
      } else if ('entryDate' in item || 'requestedBy' in item) {
        // MRS has entryDate, MIV has requestedBy
        module = 'MATERIALS';
        messagePrefix = 'درخواست/ورود مصالح';
      } else if ('periods' in item) {
        module = 'ADJUSTMENT';
        messagePrefix = 'صورت‌وضعیت تعدیل';
      } else if ('items' in item && !('entryDate' in item) && !('requestedBy' in item)) {
        // Variation has items but not the material-specific fields
        module = 'VARIATIONS';
        messagePrefix = 'تغییر مقادیر و احجام';
      } else if ('reportNumber' in item) {
        module = 'EXECUTION';
        messagePrefix = 'گزارش روزانه کارگاه';
      } else if ('recordedBy' in item || 'decisions' in item || 'attendees' in item) {
        module = 'COMMUNICATIONS';
        messagePrefix = 'صورت‌جلسه کارگاهی';
      } else if ('letterNumber' in item || 'scope' in item) {
        module = 'COMMUNICATIONS';
        messagePrefix = 'نامه رسمی';
      } else if ('plannedProgress' in item || 'actualProgress' in item) {
        module = 'PLANNING' as any;
        messagePrefix = 'گزارش پیشرفت پروژه';
      } else if ('claimType' in item || 'lossType' in item || 'delayType' in item) {
        module = 'CLAIMS' as any;
        messagePrefix = 'ادعای مالی و زمانی';
      }

      const docCode =
        (item as any).rfiNumber ||
        (item as any).ncrNumber ||
        (item as any).testNumber ||
        (item as any).letterNumber ||
        (item as any).reportNumber ||
        (item as any).permitNumber ||
        (item as any).sessionNumber ||
        (item as any).minuteNumber ||
        (item as any).number ||
        (item as any).code ||
        '';

      const rawTitle = (item as any).title || (item as any).subject || (item as any).description;
      const itemTitle = docCode
        ? `${messagePrefix} شماره ${docCode}${rawTitle ? ` (${rawTitle})` : ''}`
        : (rawTitle ? `${messagePrefix}: ${rawTitle}` : `${messagePrefix} شناسه ${(item as any).id}`);

      const actionLabel = WorkflowService.getActionLabel(action, actorOrg?.type, actor.id) || action;
      const commentNote = payload?.comment ? ` (توضیح: ${payload.comment})` : '';

      // Registry to accumulate all unique recipients and their customized messages
      const recipientsMap = new Map<string, { orgId: string; message: string }>();

      // 1. Direct Assignee (ارجاع مستقیم به کاربر مشخص شده گیرنده)
      if (payload?.assigneeId && payload.assigneeId !== actor.id) {
        const assigneeUser = SystemAdminService.getUsers().find(u => u.id === payload.assigneeId);
        recipientsMap.set(payload.assigneeId, {
          orgId: assigneeUser?.orgId || updatedItem.currentOrgId || payload?.targetOrgId || actor.orgId,
          message: `${itemTitle} با اقدام «${actionLabel}» توسط ${actor.fullName || actor.username} به شما ارجاع گردید.${commentNote}`
        });
      }

      // 2. Organization-level routing (ارسال به ارکان پروژه: مشاور، کارفرما، پیمانکار)
      const targetOrgId = payload?.targetOrgId || (updatedItem.currentOrgId && updatedItem.currentOrgId !== actor.orgId ? updatedItem.currentOrgId : undefined);
      if (targetOrgId && targetOrgId !== actor.orgId) {
        const allUsers = SystemAdminService.getUsers();
        const targetOrgUsers = allUsers.filter(u => {
          if (u.id === actor.id) return false;
          if (u.orgId !== targetOrgId) return false; // Strictly target organization
          const itemProjectId = item.projectId || updatedItem.projectId;
          if (itemProjectId && u.projectIds && u.projectIds.length > 0 && !u.projectIds.includes(itemProjectId)) {
            return false;
          }
          return true;
        });

        // If no explicit individual assignee was chosen, notify users of that target recipient organization
        if (!payload?.assigneeId) {
          targetOrgUsers.forEach(u => {
            if (!recipientsMap.has(u.id)) {
              recipientsMap.set(u.id, {
                orgId: targetOrgId,
                message: `${itemTitle} از طرف ${actorOrg?.name || actor.fullName} با اقدام «${actionLabel}» به کارتابل سازمان شما ارسال گردید.${commentNote}`
              });
            }
          });
        }
      }

      // 3. Return / Reject Routing (عودت یا رد سند به سمت ایجادکننده و اقدام‌کنندگان قبلی)
      if (action === 'RETURN_TO_CONTRACTOR' || action === 'RETURN_TO_CONSULTANT' || action === 'REJECT') {
        const creatorId = item.createdById || (item as any).ownerUserId || (item as any).registeredBy;
        if (creatorId && creatorId !== actor.id && !recipientsMap.has(creatorId)) {
          recipientsMap.set(creatorId, {
            orgId: (item as any).ownerOrgId || actor.orgId,
            message: `${itemTitle} با اقدام «${actionLabel}» توسط ${actor.fullName || actor.username} رد/عودت شد.${commentNote}`
          });
        }

        // Notify the previous actor who submitted or handed over this document
        if (item.workflowHistory && Array.isArray(item.workflowHistory)) {
          for (let i = item.workflowHistory.length - 1; i >= 0; i--) {
            const ev = item.workflowHistory[i];
            if (ev?.actorUserId && ev.actorUserId !== actor.id && !recipientsMap.has(ev.actorUserId)) {
              recipientsMap.set(ev.actorUserId, {
                orgId: (item as any).ownerOrgId || actor.orgId,
                message: `${itemTitle} توسط ${actor.fullName || actor.username} به مرحله قبلی عودت داده شد.${commentNote}`
              });
              break;
            }
          }
        }
      }

      // 4. Final Approval Routing (تصویب نهایی سند)
      if ((action as string) === 'FINAL_APPROVE') {
        const creatorId = item.createdById || (item as any).ownerUserId;
        if (creatorId && creatorId !== actor.id && !recipientsMap.has(creatorId)) {
          recipientsMap.set(creatorId, {
            orgId: (item as any).ownerOrgId || actor.orgId,
            message: `${itemTitle} به طور قطعی توسط ${actor.fullName || actor.username} تصویب و ابلاغ گردید.${commentNote}`
          });
        }

        // On Final Approval, notify key participants in history
        if (item.workflowHistory && Array.isArray(item.workflowHistory)) {
          item.workflowHistory.forEach((ev: any) => {
            if (ev?.actorUserId && ev.actorUserId !== actor.id && !recipientsMap.has(ev.actorUserId)) {
              recipientsMap.set(ev.actorUserId, {
                orgId: (item as any).ownerOrgId || actor.orgId,
                message: `${itemTitle} به صورت نهایی تصویب و ابلاغ گردید.`
              });
            }
          });
        }
      }

      // 5. Unfreeze / Variation Release Routing (رفع قفل با ابلاغیه تغییرات)
      if (action === 'UNFREEZE_BY_VARIATION') {
        const creatorId = item.createdById || (item as any).ownerUserId;
        if (creatorId && creatorId !== actor.id && !recipientsMap.has(creatorId)) {
          recipientsMap.set(creatorId, {
            orgId: (item as any).ownerOrgId || actor.orgId,
            message: `${itemTitle} با ابلاغیه تغییرات توسط ${actor.fullName || actor.username} رفع قفل شد.`
          });
        }
      }

      // 6. Fallback if still empty but updatedItem has a designated assignee
      if (recipientsMap.size === 0 && updatedItem.assigneeId && updatedItem.assigneeId !== actor.id) {
        recipientsMap.set(updatedItem.assigneeId, {
          orgId: updatedItem.currentOrgId || actor.orgId,
          message: `${itemTitle} با اقدام «${actionLabel}» توسط ${actor.fullName || actor.username} به شما ارجاع شد.${commentNote}`
        });
      }

      // Dispatch notifications to all computed recipients
      recipientsMap.forEach((info, targetUserId) => {
        if (targetUserId && targetUserId !== actor.id) {
          NotificationService.createNotification(
            'WORKFLOW',
            action,
            module,
            updatedItem,
            actor,
            targetUserId,
            info.orgId,
            info.message
          );
        }
      });

    } catch (error) {
      console.error('Failed to send notification', error);
    }

    return updatedItem;
  },

  // Transition alias for performAction
  transition: (
    item: any,
    action: WorkflowAction,
    actor: SystemUser,
    comment?: string,
    assigneeId?: string,
    attachSignature?: boolean
  ): any => {
    return WorkflowService.performAction(item, action, actor, {
      comment,
      assigneeId,
      attachSignature: attachSignature !== false
    });
  },
  
  // Check if item is editable
  canEdit: (item: WorkflowItem, user: SystemUser): boolean => {
    const status = WorkflowService.getStatus(item);
    const isAssignee = item.assigneeId ? item.assigneeId.split(',').map(id => id.trim()).includes(user.id) : false;

    const isSystemAdmin = user.role === 'SYSTEM_ADMIN';
    const isOrgManager = user.role === 'ORG_MANAGER' || user.role === 'ORG_ADMIN';
    if (isSystemAdmin) return true;

    // Letter receiver edit restriction (Only the creator organization is allowed to edit their letters)
    if ('scope' in item) {
      if (item.ownerOrgId && item.ownerOrgId !== user.orgId) {
        return false;
      }
    }

    const isCreator = item.createdById === user.id;
    const itemCurrentOrgId = item.currentOrgId || item.ownerOrgId || '';
    const isInUserOrg = itemCurrentOrgId === user.orgId;

    // Work Permit Bypass for Employer:
    // When a work permit reaches the employer (i.e. is in the Employer's custody and not frozen),
    // allow editing for any Employer user with edit permission, EXCEPT when it is assigned to someone else
    // or if the current user was the sender (last actor) who sent it to another assignee.
    if ('location' in item && !item?.isFinalFrozen) {
      const isEmployerUser = SystemAdminService.getOrganization(user.orgId)?.type === 'EMPLOYER';
      if (isEmployerUser && isInUserOrg) {
        // If explicitly assigned to another user, do not allow editing
        if (item.assigneeId && !isAssignee) {
          return false;
        }
        // Last actor lockout: once a user performs an action, they lose ownership unless it's assigned back to them.
        if ((item.workflowHistory || []).length > 0) {
          const lastEvent = WorkflowService.getLastHandoverEvent(item.workflowHistory);
          if (lastEvent && lastEvent.actorUserId === user.id && lastEvent.action !== 'UNFREEZE_BY_VARIATION') {
            if (!isAssignee) {
              return false;
            }
          }
        }
        const canEditPerm = SystemAdminService.checkPermission(user.id, ModuleId.TECHNICAL_OFFICE, 'edit');
        if (canEditPerm) {
          return true;
        }
      }
    }

    // RULE: If explicitly assigned to the user within their organization's court, allow editing.
    // This enables internal corrections in Consultant/Employer orgs after receiving and reassigning documents.
    if (isAssignee && isInUserOrg && !item?.isFinalFrozen) {
      return true;
    }

    const isEstimate = 'unitPrice' in item && 'quantity' in item;
    if (isEstimate) {
      // If referred (assigned) to another user
      if (item.assigneeId && !isAssignee) {
        return false;
      }

      // If status is not draft or rejected, cannot edit (unless covered by assignee rule above)
      if (status !== WorkflowStatus.DRAFT && status !== WorkflowStatus.REJECTED) {
        return false;
      }

      // If status is rejected, only assignee (or creator if unassigned) can edit
      if (status === WorkflowStatus.REJECTED) {
        if (item.assigneeId) {
          return item.assigneeId === user.id;
        }
        return item.createdById === user.id;
      }

      // If status is draft, only creator can edit
      return item.createdById === user.id;
    }

    const isPM =
      (user.jobTitle || "").includes("مدیر پروژه") ||
      (user.jobLevel || "").includes("مدیر پروژه");

    // Check if current assignee is a Workshop Manager (سرپرست کارگاه)
    let isAssignedToWorkshopManager = false;
    if (item.assigneeId) {
      const users = SystemAdminService.getUsers();
      const assignee = users.find((u) => u.id === item.assigneeId);
      if (assignee) {
        const at = (assignee.jobTitle || "").trim();
        const al = (assignee.jobLevel || "").trim();
        isAssignedToWorkshopManager =
          at.includes("سرپرست کارگاه") || al.includes("سرپرست کارگاه");
      }
    }

    // Authority Logic: Consistently restrict PMs unless assigned to Workshop Manager
    const isOrgAuthority = isSystemAdmin || 
                           (isOrgManager && (!isPM || isAssignedToWorkshopManager)) ||
                           (isPM && itemCurrentOrgId === user.orgId && isAssignedToWorkshopManager);

    const isHseLoc = 'permitType' in item || 'incidentType' in item || 'hseReportType' in item || 'environmentalAspect' in item || 'aspect' in item || 'kpiStats' in item || 'hsePlanSection' in item || (item as any).module === 'hse' || (item as any).module === 'HSE' || 'permitNumber' in item || 'incidentNumber' in item || 'planNumber' in item || String((item as any).reportNumber || '').startsWith('HSE-');
    const isExecution = 'reportNumber' in item && !isHseLoc;

    // Last actor lockout: once a user performs an action, they lose ownership unless it's assigned back to them.
    if (!isSystemAdmin && (item.workflowHistory || []).length > 0) {
      if (!(isExecution && (status === WorkflowStatus.DRAFT || status === WorkflowStatus.IN_REVIEW))) {
        const lastEvent = WorkflowService.getLastHandoverEvent(item.workflowHistory);
        if (lastEvent && lastEvent.actorUserId === user.id && lastEvent.action !== 'UNFREEZE_BY_VARIATION') {
          if (!isAssignee) {
            return false;
          }
        }
      }
    }

    const userOrgType = SystemAdminService.getOrganization(user.orgId)?.type;

    if (item?.isFinalFrozen) return false;

    if (itemCurrentOrgId && itemCurrentOrgId !== user.orgId) {
      return false;
    }

    if (!isInUserOrg) return false;

    const isMinute = 'attendees' in item || 'decisions' in item || 'recordedBy' in item;
    const isLetter = 'letterNumber' in item || 'receiverOrgId' in item || 'letterType' in item || 'scope' in item;
    const isStatement = 'startDate' in item || 'values' in item;
    const isHse = isHseLoc;
    const targetModule = isExecution ? ModuleId.EXECUTION : ((isMinute || isLetter) ? ModuleId.COMMUNICATIONS : (isStatement ? ModuleId.CBS_STATEMENTS : (isHse ? ModuleId.HSE : ModuleId.TECHNICAL_OFFICE)));
    const canEditPerm = SystemAdminService.checkPermission(user.id, targetModule, 'edit');
    if (!canEditPerm) return false;

    // Explicit assignee lockdown
    if (item.assigneeId && !WorkflowService.canUserModifyAssignedItem(item, user)) {
      return false;
    }

    const wasReturnedFromExternal = (item.workflowHistory || []).some(
      (ev: any) =>
        ev.action === "RETURN_TO_CONTRACTOR" ||
        ev.action === "RETURN_TO_CONSULTANT"
    );

    if (status === WorkflowStatus.DRAFT || status === WorkflowStatus.REJECTED) {
      if (wasReturnedFromExternal) {
        // Those with manager authority or Explicit Assignee can edit if returned from outside.
        return isOrgAuthority || isAssignee || isSystemAdmin;
      }
      if (status === WorkflowStatus.DRAFT) {
        return (
          (isCreator && !item.assigneeId && !isPM) || (isCreator && status === WorkflowStatus.DRAFT) || isOrgAuthority || !item.createdById || isExecution
        );
      } else {
        // For REJECTED status, if assigneeId is not set, those with manager authority can edit
        return isOrgAuthority || isAssignee || isSystemAdmin;
      }
    }

    
    if (
        status === WorkflowStatus.IN_REVIEW || 
        status === WorkflowStatus.IN_CONSULTANT_REVIEW || 
        status === WorkflowStatus.IN_EMPLOYER_REVIEW ||
        status === WorkflowStatus.SENT_TO_CONSULTANT ||
        status === WorkflowStatus.SENT_TO_EMPLOYER
    ) {
        if (isExecution && status === WorkflowStatus.IN_REVIEW && isInUserOrg) return true;
        // PMs are restricted in these active statuses to "Observation" only, unless assigned to Workshop Manager
        const canCreatorModify = isCreator && isInUserOrg && !isPM;
        return isOrgAuthority || canCreatorModify;
    }

    return false;
  },

  // Check if item is deletable
  canDelete: (item: any, user: SystemUser | null): boolean => {
    if (!user) return false;
    const isSystemAdmin = user.role === 'SYSTEM_ADMIN';
    // System Administrator (مدیر کل سیستم) can ALWAYS delete any document in the system
    if (isSystemAdmin) return true;
    
    const isAssignee = item.assigneeId ? item.assigneeId.split(',').map((id: string) => id.trim()).includes(user.id) : false;
    
    // Specific override for Non-Conformance Report (NCR)
    const isNcr = 'ncrNumber' in item;
    if (isNcr) {
      const status = WorkflowService.getStatus(item);
      if (status === WorkflowStatus.DRAFT && item.ownerOrgId === user.orgId) {
        return true;
      }
    }
    
    const isEstimate = 'unitPrice' in item && 'quantity' in item;
    if (isEstimate) {
      const status = WorkflowService.getStatus(item);
      if (status !== WorkflowStatus.DRAFT) return false;
      return item.createdById === user.id;
    }

    // PM delete restriction for minutes: until it is assigned to the PM, they cannot delete it.
    const isMinute = 'location' in item && !('contractorDcc' in item);
    if (isMinute) {
      const isUserPM = (user.jobTitle || "").includes("مدیر پروژه") || (user.jobLevel || "").includes("مدیر پروژه");
      if (isUserPM) {
        if (item.assigneeId) {
          if (!isAssignee) {
            return false;
          }
        } else {
          const status = WorkflowService.getStatus(item);
          if (status !== WorkflowStatus.DRAFT || item.createdById !== user.id) {
            return false;
          }
        }
      }
    }

    const isOrgManager = user.role === 'ORG_MANAGER' || user.role === 'ORG_ADMIN';
    const itemCurrentOrgId = item.currentOrgId || item.ownerOrgId;
    const isPM = (user.jobTitle || "").includes("مدیر پروژه") || (user.jobLevel || "").includes("مدیر پروژه");
    
    // Check if current assignee is a Workshop Manager (سرپرست کارگاه)
    let isAssignedToWorkshopManager = false;
    if (item.assigneeId) {
      const users = SystemAdminService.getUsers();
      const assignee = users.find((u) => u.id === item.assigneeId);
      if (assignee) {
        const at = (assignee.jobTitle || "").trim();
        const al = (assignee.jobLevel || "").trim();
        isAssignedToWorkshopManager =
          at.includes("سرپرست کارگاه") || al.includes("سرپرست کارگاه");
      }
    }

    const isOrgAuthority = isOrgManager && (!isPM || isAssignedToWorkshopManager) ||
                           (isPM && itemCurrentOrgId === user.orgId && isAssignedToWorkshopManager);

    const isHseLoc2 = 'permitType' in item || 'incidentType' in item || 'hseReportType' in item || 'environmentalAspect' in item || 'aspect' in item || 'kpiStats' in item || 'hsePlanSection' in item || (item as any).module === 'hse' || (item as any).module === 'HSE' || 'permitNumber' in item || 'incidentNumber' in item || 'planNumber' in item || String((item as any).reportNumber || '').startsWith('HSE-');
    const isExecution = 'reportNumber' in item && !isHseLoc2;
    const status = WorkflowService.getStatus(item);

    // Last actor lockout: if they performed the last action and it is not assigned back to them, they cannot delete.
    if ((item.workflowHistory || []).length > 0) {
      if (!(isExecution && (status === WorkflowStatus.DRAFT || status === WorkflowStatus.IN_REVIEW))) {
        const lastEvent = WorkflowService.getLastHandoverEvent(item.workflowHistory);
        if (lastEvent && lastEvent.actorUserId === user.id && lastEvent.action !== 'UNFREEZE_BY_VARIATION') {
          if (!isAssignee) {
            return false;
          }
        }
      }
    }

    const isAdjustment = 'periods' in item;
    if (isAdjustment && status !== WorkflowStatus.DRAFT && status !== WorkflowStatus.REJECTED) {
      return false;
    }

    const userOrgType = SystemAdminService.getOrganization(user.orgId)?.type;

    if (item?.isFinalFrozen) return false;

    if (itemCurrentOrgId && itemCurrentOrgId !== user.orgId) {
      return false;
    }

    let allowExceptions = false;
    try {
      const savedProjs = localStorage.getItem('hamyar_projects');
      if (savedProjs) {
        const projs = JSON.parse(savedProjs);
        const currentProj = projs.find((p: any) => p.id === item.projectId);
        allowExceptions = !!currentProj?.allowConsultantEmployerCreation;
      }
    } catch (e) {}

    const isMinuteCheck = 'attendees' in item || 'decisions' in item || 'recordedBy' in item;
    const isLetter = 'letterNumber' in item || 'receiverOrgId' in item || 'letterType' in item || 'scope' in item;
    const isStatement = 'startDate' in item || 'values' in item;
    const isHse = isHseLoc2;
    const targetModule = isExecution ? ModuleId.EXECUTION : ((isMinuteCheck || isLetter) ? ModuleId.COMMUNICATIONS : (isStatement ? ModuleId.CBS_STATEMENTS : (isHse ? ModuleId.HSE : ModuleId.TECHNICAL_OFFICE)));

    if (!isLetter && userOrgType !== OrganizationType.CONTRACTOR) {
      if (!allowExceptions) return false;
    }

    const allowedStatuses = [
      WorkflowStatus.DRAFT,
      WorkflowStatus.IN_REVIEW,
      WorkflowStatus.APPROVED_INTERNAL,
      WorkflowStatus.REJECTED
    ];

    if (!allowedStatuses.includes(status)) return false;

    if (isExecution && status === WorkflowStatus.DRAFT && itemCurrentOrgId === user.orgId) {
      return true;
    }

    // Explicit assignee lockdown
    if (item.assigneeId && !WorkflowService.canUserModifyAssignedItem(item, user)) {
      return false;
    }

    // If not DRAFT and no assignee is set, those with authority can delete
    if (status !== WorkflowStatus.DRAFT && !item.assigneeId) {
      const isPM = (user.jobTitle || "").includes("مدیر پروژه") || (user.jobLevel || "").includes("مدیر پروژه");
      const isManager = user.role === 'ORG_MANAGER' || user.role === 'ORG_ADMIN';
      
      // Assignee is not set, so it's not assigned to any Workshop Manager
      const isAssignedToWorkshopManager = false;
      
      // Managers restricted if they are PMs (Observation law)
      const hasAuthority = isManager && (!isPM || isAssignedToWorkshopManager);
      
      if (!hasAuthority) return false;
    }

    
    const wasReturnedFromExternal = (item.workflowHistory || []).some((ev: any) => 
      ev.action === 'RETURN_TO_CONTRACTOR' || ev.action === 'RETURN_TO_CONSULTANT'
    );

    if (status === WorkflowStatus.REJECTED && wasReturnedFromExternal) {
        const isManager = user.role === 'ORG_MANAGER' || user.role === 'ORG_ADMIN';
        if (!isManager) return false;
    }

    if (status !== WorkflowStatus.DRAFT && status !== WorkflowStatus.REJECTED) {
      const isManager = user.role === 'ORG_MANAGER' ||  
                        user.role === 'ORG_ADMIN' || 
                        (user.jobTitle || '').trim().includes('سرپرست') || 
                        (user.jobTitle || '').trim().includes('مدیر') || 
                        (user.jobLevel || '').trim().includes('سرپرست') || 
                        (user.jobLevel || '').trim().includes('مدیر');
      if (!isManager) {
        return false;
      }
    }

    // Since the system allowed deletion previously via a bug, and user explicitly requested Contractor PM
    // to be able to delete it AFTER it returned from consultant, we should bypass the "wasReferred" check
    // if the user is the explicit assignee or an org manager and status is REJECTED (returned).
    // Or simpler, just remove wasReferred blocking! Let's just rely on granular permissions.
    return SystemAdminService.checkPermission(user.id, targetModule, 'delete');
  },

  // Initialize a new record with workflow metadata
  initializeRecord: (item: any, user: SystemUser): any => {
    return {
      ...item,
      status: WorkflowStatus.DRAFT,
      createdById: user.id,
      ownerOrgId: user.orgId,
      currentOrgId: user.orgId,
      workflowHistory: []
    };
  }
};
