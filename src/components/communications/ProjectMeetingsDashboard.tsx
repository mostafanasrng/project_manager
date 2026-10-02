import React, { useState, useMemo } from 'react';
import { 
  Users, Plus, Search, Calendar, Clock, MapPin, 
  CheckCircle2, AlertCircle, Clock3, Filter, 
  Printer, Edit3, Trash2, ScrollText, ChevronLeft, 
  Send, Activity, ChevronDown, CheckSquare, Eye,
  Building, UserCheck, ArrowUpDown, Copy, Check,
  Share2, BarChart3, ListFilter, SlidersHorizontal,
  FileCheck, AlertTriangle, Layers, Tag, Lock, Unlock,
  PenTool, ShieldCheck, ArrowRightLeft, CornerUpLeft, UserX
} from 'lucide-react';
import { Project, SystemUser, WorkflowStatus, WorkflowAction } from '../../../types';
import { OrganizationType } from '../../../systemAdminTypes';
import { WorkflowService } from '../../../services/workflowService';
import { NotificationService } from '../../../services/notificationService';
import { HRService } from '../../../services/hrService';
import { SystemAdminService } from '../../../services/systemAdminService';
import { 
  printMeetingMinutes, 
  MeetingDecisionItem, 
  MeetingAttendeeItem, 
  MeetingPartiesStructure,
  MeetingOrgSignatures 
} from './MeetingMinutePrint';
import { ProjectMeetingFormState } from './ProjectMeetingModal';
import { MeetingPreviewModal } from './MeetingPreviewModal';
import { MeetingActionWorkflowModal } from './MeetingActionWorkflowModal';
import { getAttendeeMatchScore } from '../../utils/meetingUtils';
import { saveMeetingsStorage, getMeetingsStorage, sanitizeMeetingRecord, compressSignature } from '../../utils/safeStorage';

export interface MeetingMinuteRecord {
  id: string;
  projectId: string;
  minuteNumber?: string;
  title: string;
  meetingType?: string;
  partiesStructure?: MeetingPartiesStructure;
  date: string;
  time?: string;
  location: string;
  chairperson?: string;
  secretary?: string;
  agenda?: string[];
  decisions: string[];
  structuredDecisions?: MeetingDecisionItem[];
  attendees: string[];
  attendeeList?: MeetingAttendeeItem[];
  absentees?: string[];
  nextMeetingDate?: string;
  nextMeetingLocation?: string;
  nextMeetingAgenda?: string;
  nextMeetingAgendas?: string[];
  recordedBy?: string;
  notes?: string;
  tags?: string[];
  status: WorkflowStatus;
  assigneeId?: string;
  assigneeName?: string;
  workflowHistory?: any[];
  createdById?: string;
  ownerOrgId?: string;
  currentOrgId?: string;
  isFinalFrozen?: boolean;
  sentToAllAttendees?: boolean;
  sentAt?: string;
  editorsLog?: string[];
  orgSignatures?: MeetingOrgSignatures;
  approvals?: {
    employerApproved: boolean;
    consultantApproved: boolean;
    contractorApproved: boolean;
  };
  approvalComments?: {
    employerComment?: string;
    consultantComment?: string;
    contractorComment?: string;
  };
}

export interface ProjectMeetingsDashboardProps {
  meetings: MeetingMinuteRecord[] | any[];
  projects?: Project[];
  selectedProjectId?: string;
  activeProject: Project | any;
  currentUser: SystemUser | null;
  userOrgType?: OrganizationType | 'EMPLOYER' | 'CONSULTANT' | 'CONTRACTOR' | 'SYSTEM_ADMIN';
  activeMeetingDetail?: any;
  highlightedRecordId?: string | null;
  setActiveMeetingDetail?: (meeting: any) => void;
  onOpenNewModal?: () => void;
  onOpenNewMeeting?: () => void;
  onEditMeeting?: (meeting: any) => void;
  onDeleteMeeting?: (meetingId: string) => void;
  onPrintMeeting?: (meeting: any) => void;
  onOpenHistory?: (meeting: any) => void;
  onOpenWorkflow?: (meeting: any, action: WorkflowAction) => void;
  onUpdateMeeting?: (meeting: any) => void;
  onUpdateDecisionStatus?: (meetingId: string, decisionId: string, status: any) => void;
}

export const ProjectMeetingsDashboard: React.FC<ProjectMeetingsDashboardProps> = ({
  meetings,
  projects = [],
  selectedProjectId,
  activeProject,
  currentUser,
  userOrgType,
  activeMeetingDetail,
  highlightedRecordId,
  setActiveMeetingDetail,
  onOpenNewModal,
  onOpenNewMeeting,
  onEditMeeting,
  onDeleteMeeting,
  onPrintMeeting,
  onOpenHistory,
  onOpenWorkflow,
  onUpdateMeeting,
  onUpdateDecisionStatus
}) => {
  // Default to 'table' (سطری) as explicitly requested by user!
  const [viewMode, setViewMode] = useState<'table' | 'cards' | 'action_tracker'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | WorkflowStatus | 'FROZEN' | 'ACTIVE'>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  
  // Modals state
  const [previewMeeting, setPreviewMeeting] = useState<MeetingMinuteRecord | null>(null);
  const [actionModalMeeting, setActionModalMeeting] = useState<MeetingMinuteRecord | null>(null);
  const [actionModalType, setActionModalType] = useState<any>('SUBMIT');

  // Filter meetings by project
  const projectMeetings = useMemo(() => {
    return meetings.filter(m => !selectedProjectId || m.projectId === selectedProjectId);
  }, [meetings, selectedProjectId]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = projectMeetings.length;
    const finalFrozen = projectMeetings.filter(m => m.isFinalFrozen || m.status === WorkflowStatus.APPROVED_FINAL).length;
    const inReview = projectMeetings.filter(m => m.status === WorkflowStatus.IN_REVIEW || m.status === WorkflowStatus.SENT_TO_CONSULTANT || m.status === WorkflowStatus.SENT_TO_EMPLOYER).length;
    const draft = projectMeetings.filter(m => m.status === WorkflowStatus.DRAFT).length;
    
    // Total decisions count and completed count
    let totalDecisions = 0;
    let completedDecisions = 0;
    projectMeetings.forEach(m => {
      if (m.structuredDecisions && m.structuredDecisions.length > 0) {
        totalDecisions += m.structuredDecisions.length;
        completedDecisions += m.structuredDecisions.filter((d: any) => d.status === 'COMPLETED').length;
      } else if (m.decisions && Array.isArray(m.decisions)) {
        totalDecisions += m.decisions.length;
      }
    });

    return { total, finalFrozen, inReview, draft, totalDecisions, completedDecisions };
  }, [projectMeetings]);

  // Filtered meetings
  const filteredMeetings = useMemo(() => {
    return projectMeetings.filter(m => {
      // Search
      const matchSearch = 
        !searchQuery.trim() ||
        (m.title && m.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (m.minuteNumber && m.minuteNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (m.recordedBy && m.recordedBy.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (m.decisions && m.decisions.some((d: string) => d.toLowerCase().includes(searchQuery.toLowerCase())));

      // Status
      let matchStatus = true;
      if (statusFilter === 'FROZEN') {
        matchStatus = !!m.isFinalFrozen || m.status === WorkflowStatus.APPROVED_FINAL;
      } else if (statusFilter === 'ACTIVE') {
        matchStatus = !m.isFinalFrozen && m.status !== WorkflowStatus.APPROVED_FINAL;
      } else if (statusFilter !== 'ALL') {
        matchStatus = m.status === statusFilter;
      }

      // Type
      const matchType = typeFilter === 'ALL' || m.meetingType === typeFilter;

      return matchSearch && matchStatus && matchType;
    });
  }, [projectMeetings, searchQuery, statusFilter, typeFilter]);

  // Helper: Check if user is Project Manager or Workshop Manager (مدیر پروژه یا سرپرست کارگاه سازمان‌ها)
  const isUserEligibleSupervisorOrManager = (user: SystemUser | null): boolean => {
    if (!user) return false;
    const title = (user.jobTitle || user.jobLevel || '').toLowerCase();
    return (
      title.includes('سرپرست کارگاه') ||
      title.includes('سرپرست نظارت') ||
      title.includes('ناظر مقیم') ||
      title.includes('رئیس کارگاه') ||
      title.includes('رییس کارگاه') ||
      title.includes('مدیر پروژه') ||
      title.includes('مدیرپروژه') ||
      title.includes('مدیر طرح') ||
      title.includes('workshop manager') ||
      title.includes('project manager') ||
      user.role === 'ORG_MANAGER' ||
      user.role === 'ORG_ADMIN' ||
      user.role === 'SYSTEM_ADMIN'
    );
  };

  // Check if current user can unlock (Must be Employer PM or Supervisor)
  const canUnlockMeeting = (meeting: MeetingMinuteRecord): boolean => {
    if (!meeting.isFinalFrozen && meeting.status !== WorkflowStatus.APPROVED_FINAL) return false;
    if (!currentUser) return false;

    const orgs = SystemAdminService.getOrganizations();
    const userOrg = orgs.find(o => o.id === currentUser.orgId);
    const isEmployer = (currentUser as any)?.orgType === 'EMPLOYER' || userOrg?.type === 'EMPLOYER';
    
    return isEmployer && isUserEligibleSupervisorOrManager(currentUser);
  };

  // Helper: Check if current user has already signed
  const hasCurrentUserSigned = (meeting: MeetingMinuteRecord): boolean => {
    if (!currentUser) return false;

    // 1. Check in attendeeList using getAttendeeMatchScore
    const attList = meeting.attendeeList || [];
    const signedAtt = attList.find(a => a.signed && getAttendeeMatchScore(a, currentUser) > 0);
    if (signedAtt) return true;

    // 2. Check in orgSignatures
    const orgs = SystemAdminService.getOrganizations();
    const userOrg = orgs.find(o => o.id === currentUser.orgId);
    const orgKey = ((currentUser as any).orgType === 'EMPLOYER' || userOrg?.type === 'EMPLOYER') ? 'employer' :
                   ((currentUser as any).orgType === 'CONSULTANT' || userOrg?.type === 'CONSULTANT') ? 'consultant' : 'contractor';

    const orgSigs = meeting.orgSignatures?.[orgKey];
    if (orgSigs) {
      const wm = orgSigs.workshopManager;
      if (wm?.signed && (wm.userId === currentUser.id || (wm.name && currentUser.fullName && typeof wm.name === 'string' && wm.name.includes(currentUser.fullName)))) {
        return true;
      }
      const pm = orgSigs.projectManager;
      if (pm?.signed && (pm.userId === currentUser.id || (pm.name && currentUser.fullName && typeof pm.name === 'string' && pm.name.includes(currentUser.fullName)))) {
        return true;
      }
    }

    return false;
  };

  // Helper: Check if current user is registered in attendee list and not absent
  const isUserInAttendeeList = (meeting: MeetingMinuteRecord): boolean => {
    if (!currentUser) return false;

    // 1. Check in attendeeList objects
    const attList = meeting.attendeeList || [];
    const matchingAtt = attList.find(a => getAttendeeMatchScore(a, currentUser) > 0);

    if (matchingAtt) {
      return matchingAtt.attendanceStatus !== 'ABSENT';
    }

    // 2. Check in string array attendees
    const attNames = meeting.attendees || [];
    return attNames.some(name => typeof name === 'string' && getAttendeeMatchScore({ name } as any, currentUser) > 0);
  };

  // Helper: Can user sign meeting
  const canUserSignMeeting = (meeting: MeetingMinuteRecord): boolean => {
    const isLocked = meeting.isFinalFrozen || meeting.status === WorkflowStatus.APPROVED_FINAL;
    if (isLocked) return false;
    if (!currentUser) return false;

    // Strict constraint: User MUST be in attendee list to sign
    if (!isUserInAttendeeList(meeting)) return false;

    if (hasCurrentUserSigned(meeting)) return false;
    return true;
  };

  // Helper: Can user edit meeting
  const canUserEditMeeting = (meeting: MeetingMinuteRecord): boolean => {
    const isLocked = meeting.isFinalFrozen || meeting.status === WorkflowStatus.APPROVED_FINAL;
    if (isLocked) return false;
    if (!currentUser) return false;

    if (currentUser.role === 'SYSTEM_ADMIN') return true;

    // Strict rule: Edit is allowed ONLY ONCE (مدیر پروژه و سرپرست کارگاه فقط یک بار)
    const editorsLog: string[] = (meeting as any).editorsLog || [];
    if (editorsLog.includes(currentUser.id)) {
      return false; // Only once!
    }

    const isManager = isUserEligibleSupervisorOrManager(currentUser);
    const isCreator = meeting.createdById === currentUser.id || 
                      (meeting.recordedBy && currentUser.fullName && (
                        meeting.recordedBy.includes(currentUser.fullName) ||
                        currentUser.fullName.includes(meeting.recordedBy)
                      ));

    // Case 1: After sending to all attendees
    // Only Project Manager and Workshop Manager of organizations can edit (and only ONCE)
    if (meeting.sentToAllAttendees) {
      return isManager;
    }

    // Case 2: Before sending to attendees
    // Creator or Project Manager / Workshop Manager can edit (only once)
    if (isCreator || isManager) {
      return true;
    }

    // Other attendees present in the meeting: CANNOT edit
    return false;
  };

  // Helper: Can user delete meeting
  const canUserDeleteMeeting = (meeting: MeetingMinuteRecord): boolean => {
    if (!currentUser) return false;
    // System Administrator (مدیر کل سیستم) can ALWAYS delete any meeting/document
    if (currentUser.role === 'SYSTEM_ADMIN') return true;

    const isLocked = meeting.isFinalFrozen || meeting.status === WorkflowStatus.APPROVED_FINAL;
    if (isLocked) return false;

    const isCreator = meeting.createdById === currentUser.id || 
                      (meeting.recordedBy && currentUser.fullName && (
                        meeting.recordedBy.includes(currentUser.fullName) ||
                        currentUser.fullName.includes(meeting.recordedBy)
                      ));

    // Recipients can NEVER delete. Creator can only delete BEFORE sending!
    if (isCreator && !meeting.sentToAllAttendees) {
      return true;
    }

    return false;
  };

  // Helper: Can user send to all attendees
  const canUserSendToAttendees = (meeting: MeetingMinuteRecord): boolean => {
    const isLocked = meeting.isFinalFrozen || meeting.status === WorkflowStatus.APPROVED_FINAL;
    if (isLocked) return false;
    if (meeting.sentToAllAttendees) return false;
    if (!currentUser) return false;

    const isCreator = meeting.createdById === currentUser.id || 
                      (meeting.recordedBy && currentUser.fullName && (
                        meeting.recordedBy.includes(currentUser.fullName) ||
                        currentUser.fullName.includes(meeting.recordedBy)
                      ));

    return isCreator || currentUser.role === 'SYSTEM_ADMIN';
  };

  // Helper to persist updated meeting record
  const persistUpdatedMeeting = (updated: MeetingMinuteRecord, shouldUpdatePreview: boolean = true) => {
    const cleanUpdated = sanitizeMeetingRecord(updated);
    const allStored = getMeetingsStorage();
    const nextList = (allStored || []).map((m: any) => m.id === cleanUpdated.id ? cleanUpdated : m);
    if (!nextList.some((m: any) => m.id === cleanUpdated.id)) {
      nextList.unshift(cleanUpdated);
    }
    saveMeetingsStorage(nextList);

    if (onUpdateMeeting) {
      onUpdateMeeting(cleanUpdated);
    }
    if (activeMeetingDetail?.id === cleanUpdated.id && setActiveMeetingDetail) {
      setActiveMeetingDetail(cleanUpdated);
    }
    if (shouldUpdatePreview && previewMeeting?.id === cleanUpdated.id) {
      setPreviewMeeting(cleanUpdated);
    }
  };

  // Check and freeze meeting ONLY when ALL registered attendees AND required organizations have signed
  const evaluateFinalFreezing = (meeting: MeetingMinuteRecord): MeetingMinuteRecord => {
    const partiesStructure = meeting.partiesStructure || 'TRIPARTITE';
    const isContractorInvolved = partiesStructure !== 'BIPARTITE_EMPLOYER_CONSULTANT';
    const isConsultantInvolved = partiesStructure !== 'BIPARTITE_EMPLOYER_CONTRACTOR';
    const isEmployerInvolved = partiesStructure !== 'BIPARTITE_CONSULTANT_CONTRACTOR';

    const orgSigs = meeting.orgSignatures || {};

    const contractorOk = !isContractorInvolved || 
      !!(orgSigs.contractor?.workshopManager?.signed || orgSigs.contractor?.projectManager?.signed);
    const consultantOk = !isConsultantInvolved || 
      !!(orgSigs.consultant?.workshopManager?.signed || orgSigs.consultant?.projectManager?.signed);
    const employerOk = !isEmployerInvolved || 
      !!(orgSigs.employer?.workshopManager?.signed || orgSigs.employer?.projectManager?.signed);

    // Strict constraint: ALL registered attendees who are present and require signature MUST have signed
    const attList = meeting.attendeeList || [];
    const signableAtts = attList.filter((a: any) => a.attendanceStatus !== 'ABSENT' && a.requiresSignature !== false && !a.isManualGuest);
    
    const hasAttendees = signableAtts.length > 0 || (attList.length > 0 && attList.some((a: any) => a.attendanceStatus !== 'ABSENT'));
    
    const allAttendeesSigned = signableAtts.length > 0
      ? signableAtts.every((a: any) => Boolean(a.signed || a.signature))
      : (attList.length > 0 
          ? attList.filter((a: any) => a.attendanceStatus !== 'ABSENT').every((a: any) => Boolean(a.signed || a.signature)) 
          : false);

    // Document locks ONLY when ALL registered attendees have signed AND required organizations are verified
    if (contractorOk && consultantOk && employerOk && hasAttendees && allAttendeesSigned) {
      const updated: MeetingMinuteRecord = {
        ...meeting,
        isFinalFrozen: true,
        status: WorkflowStatus.APPROVED_FINAL,
        workflowHistory: [
          ...(meeting.workflowHistory || []),
          {
            id: 'hist_' + Date.now(),
            action: 'FINAL_APPROVE',
            actionName: 'تصویب و قفل نهایی سیستمی',
            performedBy: 'سیستم نظارت و مصوبات',
            performedAt: new Date().toLocaleDateString('fa-IR') + ' ' + new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
            comment: 'تکمیل امضای تمامی حاضرین ثبت‌شده در جلسه و تایید ارکان ذیربط؛ صورت‌جلسه قفل و لازم‌الاجرا گردید.',
            status: WorkflowStatus.APPROVED_FINAL
          }
        ]
      };
      return updated;
    }

    // If not all attendees have signed, document remains open/unfrozen
    return {
      ...meeting,
      isFinalFrozen: false
    };
  };

  // Workflow confirmation handler (supports signature checkbox!)
  const handleWorkflowConfirm = (payload: {
    actionType: any;
    comment: string;
    assigneeId?: string;
    assigneeName?: string;
    attachSignature: boolean;
    signatureDataUrl?: string;
    asRole?: 'WORKSHOP_MANAGER' | 'PROJECT_MANAGER' | 'ATTENDEE';
  }) => {
    if (!actionModalMeeting) return;

    const currentM = actionModalMeeting;
    const nowShamsi = new Date().toLocaleDateString('fa-IR');
    const nowTime = new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
    const orgs = SystemAdminService.getOrganizations();
    const userOrg = currentUser ? orgs.find(o => o.id === currentUser.orgId) : null;
    const userOrgName = userOrg?.name || 'سازمان ذیربط';

    // Copy org signatures
    const updatedOrgSignatures: MeetingOrgSignatures = JSON.parse(JSON.stringify(currentM.orgSignatures || {}));

    // Copy attendee list
    let updatedAttendees = [...(currentM.attendeeList || [])];

    // Determine user org key
    const orgKey: 'employer' | 'consultant' | 'contractor' = 
      (currentUser as any)?.orgType === 'EMPLOYER' || userOrg?.type === 'EMPLOYER' ? 'employer' :
      (currentUser as any)?.orgType === 'CONSULTANT' || userOrg?.type === 'CONSULTANT' ? 'consultant' : 'contractor';

    // Determine user signature URL
    const hrSignature = currentUser ? HRService.getUserSignature(currentUser) : undefined;
    const rawSig = payload.signatureDataUrl || hrSignature;
    const userSignatureUrl = rawSig || HRService.generateDefaultSignature(currentUser);

    const isUserAttendee = isUserInAttendeeList(currentM);
    const shouldAttachSignature = payload.attachSignature && (payload.actionType !== 'SEND_TO_ATTENDEES' || isUserAttendee);

    // If signing as attendee or attaching signature
    if (payload.actionType === 'SIGN_AS_ATTENDEE' || (shouldAttachSignature && userSignatureUrl)) {
      // 1. Mark best matching attendee entry using match score
      let bestScore = 0;
      let bestIndex = -1;

      updatedAttendees.forEach((att, idx) => {
        if (att.attendanceStatus === 'ABSENT') return;
        const score = getAttendeeMatchScore(att, currentUser, orgKey);
        if (score > bestScore) {
          bestScore = score;
          bestIndex = idx;
        }
      });

      let attendeeFound = false;

      if (bestIndex >= 0) {
        attendeeFound = true;
        const targetAtt = updatedAttendees[bestIndex];
        const isGenericName = !targetAtt.name || ['سرپرست کارگاه', 'مدیر پروژه', 'سرپرست واحد', 'نماینده پیمانکار', 'نماینده مشاور', 'نماینده کارفرما'].includes(targetAtt.name.trim());

        updatedAttendees[bestIndex] = {
          ...targetAtt,
          userId: targetAtt.userId || currentUser?.id,
          personnelId: targetAtt.personnelId || currentUser?.personnelId,
          name: isGenericName ? (currentUser?.fullName || targetAtt.name) : targetAtt.name,
          signed: true,
          signedAt: `${nowShamsi} ${nowTime}`,
          signature: userSignatureUrl,
          comment: payload.comment || targetAtt.comment || undefined
        };
      }

      if (!attendeeFound && currentUser && (payload.actionType === 'SIGN_AS_ATTENDEE' || isUserAttendee)) {
        updatedAttendees.push({
          userId: currentUser.id,
          personnelId: currentUser.personnelId,
          name: currentUser.fullName,
          role: currentUser.jobTitle || 'عضو حاضر در جلسه',
          organization: userOrgName,
          orgType: orgKey.toUpperCase() as any,
          isManagerOrSupervisor: payload.asRole === 'WORKSHOP_MANAGER' || payload.asRole === 'PROJECT_MANAGER' || isUserEligibleSupervisorOrManager(currentUser),
          attendanceStatus: 'PRESENT',
          requiresSignature: true,
          signed: true,
          signedAt: `${nowShamsi} ${nowTime}`,
          signature: userSignatureUrl,
          comment: payload.comment || undefined
        });
      }

      // 2. Update orgSignatures ONLY if specifically Workshop Manager or Project Manager
      const userJobStr = `${currentUser?.jobTitle || ''} ${currentUser?.jobLevel || ''} ${payload.asRole || ''} ${bestIndex >= 0 ? (updatedAttendees[bestIndex]?.role || '') : ''}`.toLowerCase();
      const isSiteWorkshopManager = payload.asRole === 'WORKSHOP_MANAGER' || userJobStr.includes('سرپرست کارگاه') || userJobStr.includes('رئیس کارگاه') || userJobStr.includes('سرپرست نظارت') || userJobStr.includes('ناظر مقیم');
      const isSiteProjectManager = payload.asRole === 'PROJECT_MANAGER' || userJobStr.includes('مدیر پروژه') || userJobStr.includes('مدیرپروژه');

      if (isSiteWorkshopManager) {
        if (!updatedOrgSignatures[orgKey]) updatedOrgSignatures[orgKey] = {};
        updatedOrgSignatures[orgKey]!.workshopManager = {
          signed: true,
          userId: currentUser?.id,
          name: currentUser?.fullName || '',
          signature: userSignatureUrl,
          signedAt: `${nowShamsi} ${nowTime}`
        };
      }
      if (isSiteProjectManager) {
        if (!updatedOrgSignatures[orgKey]) updatedOrgSignatures[orgKey] = {};
        updatedOrgSignatures[orgKey]!.projectManager = {
          signed: true,
          userId: currentUser?.id,
          name: currentUser?.fullName || '',
          signature: userSignatureUrl,
          signedAt: `${nowShamsi} ${nowTime}`
        };
      }
    }

    // Determine new status
    let nextStatus = currentM.status;
    let actionName = 'اقدام گردش‌کار';

    if (payload.actionType === 'SEND_TO_ATTENDEES') {
      nextStatus = WorkflowStatus.IN_REVIEW;
      actionName = 'ارسال سراسری به کلیه حاضرین';
    } else if (payload.actionType === 'SIGN_AS_ATTENDEE') {
      actionName = 'ثبت امضای دیجیتال';
    } else if (payload.actionType === 'SUBMIT' || payload.actionType === 'SEND_TO_CONSULTANT' || payload.actionType === 'SEND_TO_EMPLOYER') {
      nextStatus = WorkflowStatus.IN_REVIEW;
      actionName = payload.actionType === 'SEND_TO_EMPLOYER' ? 'ارسال به کارفرما' :
                   payload.actionType === 'SEND_TO_CONSULTANT' ? 'ارسال به مهندس مشاور' : 'ارسال صورت‌جلسه';
    } else if (payload.actionType === 'APPROVE') {
      actionName = 'تایید صورت‌جلسه';
    } else if (payload.actionType === 'FINAL_APPROVE') {
      nextStatus = WorkflowStatus.APPROVED_FINAL;
      actionName = 'تصویب و ابلاغ قطعی';
    } else if (payload.actionType === 'REJECT') {
      nextStatus = WorkflowStatus.REJECTED;
      actionName = 'رد صورت‌جلسه';
    } else if (payload.actionType === 'RETURN_TO_CONTRACTOR' || payload.actionType === 'RETURN_TO_CONSULTANT') {
      nextStatus = WorkflowStatus.REJECTED;
      actionName = 'عودت جهت اصلاح';
    } else if (payload.actionType === 'REASSIGN') {
      actionName = `ارجاع به ${payload.assigneeName || 'همکار'}`;
    } else if (payload.actionType === 'UNFREEZE') {
      nextStatus = WorkflowStatus.IN_REVIEW;
      actionName = 'رفع قفل صورت‌جلسه توسط کارفرما';
    }

    const historyEntry = {
      id: 'hist_' + Date.now(),
      action: payload.actionType,
      actionName,
      performedBy: currentUser ? currentUser.fullName : 'کاربر سیستم',
      performedAt: `${nowShamsi} ${nowTime}`,
      comment: payload.comment || (payload.attachSignature ? 'با تایید و درج امضای الکترونیک' : ''),
      signatureAttached: payload.attachSignature,
      signatureImage: payload.attachSignature ? compressSignature(payload.signatureDataUrl || userSignatureUrl, currentUser?.fullName) : undefined,
      assigneeName: payload.assigneeName,
      status: nextStatus
    };

    let updatedMeeting: MeetingMinuteRecord = {
      ...currentM,
      status: nextStatus,
      attendeeList: updatedAttendees,
      orgSignatures: updatedOrgSignatures,
      sentToAllAttendees: payload.actionType === 'SEND_TO_ATTENDEES' ? true : currentM.sentToAllAttendees,
      sentAt: payload.actionType === 'SEND_TO_ATTENDEES' ? `${nowShamsi} ${nowTime}` : currentM.sentAt,
      isFinalFrozen: payload.actionType === 'UNFREEZE' ? false : currentM.isFinalFrozen,
      assigneeId: payload.assigneeId || currentM.assigneeId,
      assigneeName: payload.assigneeName || currentM.assigneeName,
      workflowHistory: [...(currentM.workflowHistory || []), historyEntry]
    };

    // Check if ready for final freezing
    if (payload.actionType !== 'UNFREEZE') {
      updatedMeeting = evaluateFinalFreezing(updatedMeeting);
    }

    const isSendToAttendees = payload.actionType === 'SEND_TO_ATTENDEES';
    try {
      persistUpdatedMeeting(updatedMeeting, !isSendToAttendees);

      // Trigger notifications for meeting workflow actions
      if (currentUser) {
        const meetingTitle = `صورت‌جلسه کارگاهی ${updatedMeeting.minuteNumber ? `شماره ${updatedMeeting.minuteNumber}` : ''} (${updatedMeeting.title || 'جلسه کارگاهی'})`;
        const commentNote = payload.comment ? ` (توضیح: ${payload.comment})` : '';

        // 1. If SEND_TO_ATTENDEES: notify all attendees
        if (payload.actionType === 'SEND_TO_ATTENDEES') {
          const allUsers = SystemAdminService.getUsers();
          updatedAttendees.forEach(att => {
            const matchedUser = allUsers.find(u => 
              (att.userId && u.id === att.userId) || 
              (att.name && (u.fullName === att.name || u.username === att.name))
            );
            if (matchedUser && matchedUser.id !== currentUser.id) {
              NotificationService.createNotification(
                'WORKFLOW',
                'SUBMIT',
                'COMMUNICATIONS',
                updatedMeeting,
                currentUser,
                matchedUser.id,
                matchedUser.orgId,
                `${meetingTitle} جهت بررسی و ثبت امضای دیجیتال برای شما ارسال گردید.`
              );
            }
          });
        }

        // 2. Direct Assignee
        if (payload.assigneeId && payload.assigneeId !== currentUser.id) {
          const recUser = SystemAdminService.getUsers().find(u => u.id === payload.assigneeId);
          NotificationService.createNotification(
            'WORKFLOW',
            payload.actionType,
            'COMMUNICATIONS',
            updatedMeeting,
            currentUser,
            payload.assigneeId,
            recUser?.orgId || currentUser.orgId,
            `${meetingTitle} با اقدام «${actionName}» توسط ${currentUser.fullName} به شما ارجاع گردید.${commentNote}`
          );
        }

        // 3. Send to Consultant or Employer
        if (payload.actionType === 'SEND_TO_EMPLOYER' || payload.actionType === 'SEND_TO_CONSULTANT') {
          const targetOrgType = payload.actionType === 'SEND_TO_EMPLOYER' ? 'EMPLOYER' : 'CONSULTANT';
          const targetOrg = SystemAdminService.getOrganizations().find(o => o.type === targetOrgType);
          if (targetOrg && targetOrg.id !== currentUser.orgId) {
            const targetUsers = SystemAdminService.getUsers().filter(u => 
              u.orgId === targetOrg.id && 
              u.id !== currentUser.id &&
              (!u.projectIds || u.projectIds.length === 0 || u.projectIds.includes(updatedMeeting.projectId))
            );
            targetUsers.forEach(u => {
              NotificationService.createNotification(
                'WORKFLOW',
                payload.actionType,
                'COMMUNICATIONS',
                updatedMeeting,
                currentUser,
                u.id,
                targetOrg.id,
                `${meetingTitle} با اقدام «${actionName}» از طرف ${currentUser.fullName} به سازمان شما ارسال شد.${commentNote}`
              );
            });
          }
        }

        // 4. Return or Reject
        if (payload.actionType === 'RETURN_TO_CONTRACTOR' || payload.actionType === 'REJECT') {
          const creatorId = (updatedMeeting as any).createdById;
          if (creatorId && creatorId !== currentUser.id) {
            const recUser = SystemAdminService.getUsers().find(u => u.id === creatorId);
            NotificationService.createNotification(
              'WORKFLOW',
              payload.actionType,
              'COMMUNICATIONS',
              updatedMeeting,
              currentUser,
              creatorId,
              recUser?.orgId || currentUser.orgId,
              `${meetingTitle} با اقدام «${actionName}» توسط ${currentUser.fullName} عودت/رد شد.${commentNote}`
            );
          }
        }
      }
    } catch (error) {
      console.error('Error in handleWorkflowConfirm:', error);
    } finally {
      setActionModalMeeting(null);
      if (isSendToAttendees) {
        setPreviewMeeting(null);
      }
    }
  };

  // Quick unlock trigger
  const handleTriggerUnlock = (meeting: MeetingMinuteRecord) => {
    setActionModalMeeting(meeting);
    setActionModalType('UNFREEZE');
  };

  // Print trigger
  const handlePrintTrigger = (meeting: MeetingMinuteRecord) => {
    if (onPrintMeeting) {
      onPrintMeeting(meeting);
    } else {
      printMeetingMinutes(meeting, activeProject);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn" dir="rtl">
      
      {/* Header & Title Card (matching OfficialLettersList) */}
      <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-black shrink-0">
              <Users size={24} />
            </div>
            <div>
              <h2 className="font-black text-stone-800 text-lg md:text-xl flex items-center gap-2">
                <span>صورت‌جلسات پروژه</span>
                <span className="text-xs bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full font-bold">
                  {projectMeetings.length} صورت‌جلسه
                </span>
              </h2>
              <p className="text-xs text-stone-500 font-bold mt-0.5">
                مدیریت صورت‌جلسات هماهنگی، کارگاهی و فنی، ارکان حاضر، مصوبات و تکالیف اجرایی و گردش امضای الکترونیک
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Banner & KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-3xl border border-stone-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-stone-400 block">کل صورت‌جلسات</span>
            <span className="text-xl font-black text-stone-900 mt-0.5 block">{metrics.total}</span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-stone-100 text-stone-700 flex items-center justify-center">
            <Users size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-stone-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-emerald-600 block">مصوب قطعی و قفل‌شده</span>
            <span className="text-xl font-black text-emerald-700 mt-0.5 block">{metrics.finalFrozen}</span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Lock size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-stone-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-amber-600 block">در جریان امضا و ابلاغ</span>
            <span className="text-xl font-black text-amber-700 mt-0.5 block">{metrics.inReview}</span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock3 size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-stone-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-blue-600 block">مصوبات انجام‌شده</span>
            <span className="text-xl font-black text-blue-700 mt-0.5 block">
              {metrics.completedDecisions} <span className="text-xs text-stone-400">از {metrics.totalDecisions}</span>
            </span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <CheckSquare size={18} />
          </div>
        </div>
      </div>

      {/* Control Bar: Search, Filters & View Mode */}
      <div className="bg-white p-4 rounded-3xl border border-stone-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        
        {/* Search & Filter Inputs */}
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="جستجو در عنوان، شماره صورت‌جلسه، مصوبات، امضاکنندگان..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-10 pl-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-900 focus:bg-white focus:border-amber-500 outline-none transition-all"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="p-2 px-3 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-700 outline-none focus:border-amber-500"
          >
            <option value="ALL">همه وضعیت‌ها</option>
            <option value="FROZEN">قفل‌شده و مصوب نهایی</option>
            <option value="ACTIVE">در جریان گردش‌کار و امضا</option>
            <option value={WorkflowStatus.DRAFT}>پیش‌نویس</option>
            <option value={WorkflowStatus.IN_REVIEW}>در حال بررسی و گردش</option>
            <option value={WorkflowStatus.REJECTED}>رد یا عودت‌داده‌شده</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="p-2 px-3 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-700 outline-none focus:border-amber-500"
          >
            <option value="ALL">همه انواع جلسات</option>
            <option value="SITE_COORDINATION">هماهنگی کارگاهی</option>
            <option value="TECHNICAL">فنی و مهندسی</option>
            <option value="EXECUTIVE">مدیریتی و کارفرمایی</option>
            <option value="HSE">ایمنی و بهداشت (HSE)</option>
            <option value="CLAIM_DISPUTE">مالی و ادعا</option>
          </select>
        </div>

        {/* View Mode Toggle & Add Button */}
        <div className="flex items-center gap-2">
          <div className="bg-stone-100 p-1 rounded-2xl flex items-center gap-1 border border-stone-200/60">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                viewMode === 'table' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-800'
              }`}
              title="نمای سطری رسمی"
            >
              <ListFilter size={14} />
              <span>نمای سطری</span>
            </button>

            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                viewMode === 'cards' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-800'
              }`}
              title="نمای کارتی"
            >
              <Layers size={14} />
              <span>کارت‌ها</span>
            </button>

            <button
              onClick={() => setViewMode('action_tracker')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                viewMode === 'action_tracker' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-800'
              }`}
              title="ماتریکس پیگیری مصوبات"
            >
              <BarChart3 size={14} />
              <span>پیگیری مصوبات</span>
            </button>
          </div>

          {(onOpenNewMeeting || onOpenNewModal) && (
            <button
              onClick={onOpenNewMeeting || onOpenNewModal}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer"
            >
              <Plus size={16} />
              <span>ثبت صورت‌جلسه</span>
            </button>
          )}
        </div>

      </div>

      {/* Main Content Area */}
      {filteredMeetings.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-stone-200/80 shadow-2xs space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mx-auto">
            <Users size={28} />
          </div>
          <h4 className="font-black text-sm text-stone-800">هیچ صورت‌جلسه‌ای یافت نشد</h4>
          <p className="text-xs text-stone-400 max-w-sm mx-auto">
            با توجه به فیلترها یا جستجوی صورت گرفته، سندی یافت نشد.
          </p>
        </div>
      ) : viewMode === 'table' ? (
        
        /* TABLE (ROW-BASED) VIEW - Requested by User */
        <div className="bg-white rounded-3xl border border-stone-200/80 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-stone-100/80 text-stone-700 border-b border-stone-200">
                  <th className="p-3.5 pr-4 font-black w-12 text-center">وضعیت</th>
                  <th className="p-3.5 font-black w-36">شماره و تاریخ</th>
                  <th className="p-3.5 font-black">عنوان جلسه و نوع نشست</th>
                  <th className="p-3.5 font-black w-32">طرفین جلسه</th>
                  <th className="p-3.5 font-black w-32 text-center">مصوبات و پیگیری</th>
                  <th className="p-3.5 font-black w-44 text-center">امضای مدیران ارکان</th>
                  <th className="p-3.5 font-black w-32 text-center">حاضرین</th>
                  <th className="p-3.5 font-black w-48 text-center">عملیات و ابزارها</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredMeetings.map((meet) => {
                  const isLocked = meet.isFinalFrozen || meet.status === WorkflowStatus.APPROVED_FINAL;
                  const canUnlock = canUnlockMeeting(meet);
                  const partiesStructure = meet.partiesStructure || 'TRIPARTITE';
                  const orgSigs = meet.orgSignatures || {};

                  // Signature counts (signable attendees only)
                  const attList = meet.attendeeList || [];
                  const signableAtts = attList.filter((a: any) => a.attendanceStatus !== 'ABSENT' && a.requiresSignature !== false && !a.isManualGuest);
                  const signedAttCount = signableAtts.filter((a: any) => a.signed).length;
                  const totalAttCount = signableAtts.length || (attList.length > 0 ? 0 : (meet.attendees ? meet.attendees.length : 0));

                  // Org manager signature indicators
                  const isContractorInvolved = partiesStructure !== 'BIPARTITE_EMPLOYER_CONSULTANT';
                  const isConsultantInvolved = partiesStructure !== 'BIPARTITE_EMPLOYER_CONTRACTOR';
                  const isEmployerInvolved = partiesStructure !== 'BIPARTITE_CONSULTANT_CONTRACTOR';

                  const contractorSigned = !!(orgSigs.contractor?.workshopManager?.signed || orgSigs.contractor?.projectManager?.signed);
                  const consultantSigned = !!(orgSigs.consultant?.workshopManager?.signed || orgSigs.consultant?.projectManager?.signed);
                  const employerSigned = !!(orgSigs.employer?.workshopManager?.signed || orgSigs.employer?.projectManager?.signed);

                  const decisionsCount = meet.structuredDecisions?.length || meet.decisions?.length || 0;
                  const completedCount = meet.structuredDecisions?.filter((d: any) => d.status === 'COMPLETED').length || 0;

                  return (
                    <tr 
                      key={meet.id} 
                      id={`record-${meet.id}`}
                      className={`transition-all duration-500 group ${
                        highlightedRecordId === meet.id
                          ? 'bg-yellow-100/80 dark:bg-yellow-950/50 scale-[1.005] shadow-md z-10 relative ring-2 ring-amber-400'
                          : 'hover:bg-amber-50/20'
                      }`}
                    >
                      
                      {/* 1. Lock Status */}
                      <td className="p-3.5 text-center">
                        {isLocked ? (
                          <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto" title="سند مصوب و قفل‌شده">
                            <Lock size={14} />
                          </div>
                        ) : (
                          <div className="w-7 h-7 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto" title="در جریان امضا و گردش کار">
                            <Clock size={14} />
                          </div>
                        )}
                      </td>

                      {/* 2. Number & Date */}
                      <td className="p-3.5">
                        <span className="font-mono text-[11px] font-black text-stone-900 block" dir="ltr">
                          {meet.minuteNumber || `MOM-${meet.id.slice(-4)}`}
                        </span>
                        <span className="text-[10px] text-stone-500 font-bold flex items-center gap-1 mt-0.5">
                          <Calendar size={11} className="text-amber-600" />
                          {meet.date}
                        </span>
                      </td>

                      {/* 3. Title & Type Badge */}
                      <td className="p-3.5">
                        <span className="font-black text-stone-900 block group-hover:text-amber-800 transition-colors">
                          {meet.title}
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 border border-stone-200">
                            {meet.meetingType === 'SITE_COORDINATION' ? 'هماهنگی کارگاهی' :
                             meet.meetingType === 'TECHNICAL' ? 'فنی و مهندسی' :
                             meet.meetingType === 'EXECUTIVE' ? 'مدیریتی' :
                             meet.meetingType === 'HSE' ? 'ایمنی و HSE' : 'جلسه کارگاهی'}
                          </span>
                          {meet.time && (
                            <span className="text-[9px] text-stone-400 font-bold flex items-center gap-1">
                              <Clock size={10} /> {meet.time}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 4. Structure Badge */}
                      <td className="p-3.5">
                        <span className={`px-2 py-1 rounded-lg text-[10px] font-black inline-block border ${
                          partiesStructure === 'TRIPARTITE' ? 'bg-purple-50 text-purple-800 border-purple-200' : 'bg-blue-50 text-blue-800 border-blue-200'
                        }`}>
                          {partiesStructure === 'TRIPARTITE' ? 'سه‌جانبه' : 'دوجانبه'}
                        </span>
                        <span className="text-[9px] text-stone-400 font-bold block mt-0.5">
                          {partiesStructure === 'TRIPARTITE' ? 'کارفرما • مشاور • پیمانکار' :
                           partiesStructure === 'BIPARTITE_EMPLOYER_CONTRACTOR' ? 'کارفرما • پیمانکار' :
                           partiesStructure === 'BIPARTITE_CONSULTANT_CONTRACTOR' ? 'مشاور • پیمانکار' : 'کارفرما • مشاور'}
                        </span>
                      </td>

                      {/* 5. Decisions & Progress */}
                      <td className="p-3.5 text-center">
                        <span className="font-black text-stone-800 block text-xs">
                          {decisionsCount} مصوبه
                        </span>
                        <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">
                          {completedCount} انجام شده
                        </span>
                      </td>

                      {/* 6. Org Manager Signatures Indicator */}
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {isContractorInvolved && (
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-black border flex items-center gap-0.5 ${
                              contractorSigned ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-stone-100 text-stone-500 border-stone-200'
                            }`} title={`پیمانکار: ${contractorSigned ? 'امضا شد' : 'در انتظار امضا'}`}>
                              {contractorSigned ? '✓ پیمانکار' : '⏳ پیمانکار'}
                            </span>
                          )}

                          {isConsultantInvolved && (
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-black border flex items-center gap-0.5 ${
                              consultantSigned ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-stone-100 text-stone-500 border-stone-200'
                            }`} title={`مشاور: ${consultantSigned ? 'امضا شد' : 'در انتظار امضا'}`}>
                              {consultantSigned ? '✓ مشاور' : '⏳ مشاور'}
                            </span>
                          )}

                          {isEmployerInvolved && (
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-black border flex items-center gap-0.5 ${
                              employerSigned ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-stone-100 text-stone-500 border-stone-200'
                            }`} title={`کارفرما: ${employerSigned ? 'امضا شد' : 'در انتظار امضا'}`}>
                              {employerSigned ? '✓ کارفرما' : '⏳ کارفرما'}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 7. Attendees Signatures */}
                      <td className="p-3.5 text-center">
                        <span className="font-bold text-stone-700 block text-xs">
                          {signedAttCount} از {totalAttCount} امضا
                        </span>
                        <div className="w-16 bg-stone-200 h-1.5 rounded-full mx-auto mt-1 overflow-hidden">
                          <div 
                            className="bg-emerald-500 h-full rounded-full transition-all" 
                            style={{ width: `${totalAttCount > 0 ? (signedAttCount / totalAttCount) * 100 : 0}%` }}
                          />
                        </div>
                      </td>

                      {/* 8. Operation Buttons (Eye, Print, Send, Sign, Unlock, Edit, Delete) */}
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          
                          {/* 👁️ Eye Button: Preview - User Requested */}
                          <button
                            onClick={() => setPreviewMeeting(meet)}
                            className="p-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold transition-all shadow-2xs cursor-pointer"
                            title="پیش‌نمایش جامع صورت‌جلسه (دکمه چشم)"
                          >
                            <Eye size={15} />
                          </button>

                          {/* 🖨️ Printer: Official Print */}
                          <button
                            onClick={() => handlePrintTrigger(meet)}
                            className="p-3 text-stone-400 hover:text-stone-900 hover:bg-[#faf8f4] rounded-2xl transition-all shadow-sm hover:shadow-md cursor-pointer"
                            title="چاپ رسمی صورت‌جلسه"
                          >
                            <Printer size={18} />
                          </button>

                          {/* ✍️ Quick Sign: If not locked and user has not signed yet */}
                          {canUserSignMeeting(meet) && (
                            <button
                              onClick={() => {
                                setActionModalMeeting(meet);
                                setActionModalType('SIGN_AS_ATTENDEE');
                              }}
                              className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold transition-all shadow-2xs cursor-pointer"
                              title="ثبت امضای من"
                            >
                              <PenTool size={15} />
                            </button>
                          )}

                          {/* 📩 Send to all attendees if not sent yet (only creator) */}
                          {canUserSendToAttendees(meet) && (
                            <button
                              onClick={() => {
                                setActionModalMeeting(meet);
                                setActionModalType('SEND_TO_ATTENDEES');
                              }}
                              className="p-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold transition-all shadow-2xs cursor-pointer"
                              title="ارسال سراسری به کلیه حاضرین"
                            >
                              <Send size={15} />
                            </button>
                          )}

                          {/* 🔓 Unlock Button: Only for Employer PM/Supervisor if locked */}
                          {canUnlock && (
                            <button
                              onClick={() => handleTriggerUnlock(meet)}
                              className="p-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold transition-all shadow-2xs cursor-pointer"
                              title="بازگشایی و رفع قفل صورت‌جلسه (کارفرما)"
                            >
                              <Unlock size={15} />
                            </button>
                          )}

                          {/* Edit button: controlled by canUserEditMeeting */}
                          {canUserEditMeeting(meet) && onEditMeeting && (
                            <button
                              onClick={() => onEditMeeting(meet)}
                              className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 transition-all cursor-pointer"
                              title="ویرایش اطلاعات صورت‌جلسه"
                            >
                              <Edit3 size={15} />
                            </button>
                          )}

                          {/* Delete button: controlled by canUserDeleteMeeting */}
                          {canUserDeleteMeeting(meet) && onDeleteMeeting && (
                            <button
                              onClick={() => onDeleteMeeting(meet.id)}
                              className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 transition-all cursor-pointer"
                              title="حذف صورت‌جلسه"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}

                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      ) : viewMode === 'cards' ? (

        /* CARDS VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMeetings.map((meet) => {
            const isLocked = meet.isFinalFrozen || meet.status === WorkflowStatus.APPROVED_FINAL;
            const canUnlock = canUnlockMeeting(meet);
            const partiesStructure = meet.partiesStructure || 'TRIPARTITE';

            return (
              <div key={meet.id} className="bg-white rounded-3xl border border-stone-200/80 p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-4">
                
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                    <span className="font-mono text-xs font-black text-stone-900" dir="ltr">
                      {meet.minuteNumber || 'MOM-PRJ'}
                    </span>
                    {isLocked ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                        <Lock size={10} /> مصوب نهایی و قفل
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                        <Clock size={10} /> در جریان امضا
                      </span>
                    )}
                  </div>

                  <h4 className="font-black text-sm text-stone-900 mt-3 leading-relaxed">
                    {meet.title}
                  </h4>

                  <div className="grid grid-cols-2 gap-2 mt-3 text-xs text-stone-600">
                    <div className="flex items-center gap-1.5 font-bold">
                      <Calendar size={13} className="text-amber-600" />
                      <span>{meet.date}</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-bold">
                      <MapPin size={13} className="text-amber-600" />
                      <span className="truncate">{meet.location || 'کارگاه'}</span>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
                    <span className="text-[11px] font-bold text-stone-400">ساختار:</span>
                    <span className="font-black text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md text-[10px]">
                      {partiesStructure === 'TRIPARTITE' ? 'سه‌جانبه کامل' : 'دوجانبه'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-stone-100">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPreviewMeeting(meet)}
                      className="p-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold transition-all shadow-2xs"
                      title="پیش‌نمایش (چشم)"
                    >
                      <Eye size={15} />
                    </button>
                    <button
                      onClick={() => handlePrintTrigger(meet)}
                      className="p-3 text-stone-400 hover:text-stone-900 hover:bg-[#faf8f4] rounded-2xl transition-all shadow-sm hover:shadow-md cursor-pointer"
                      title="چاپ رسمی صورت‌جلسه"
                    >
                      <Printer size={18} />
                    </button>
                    {canUnlock && (
                      <button
                        onClick={() => handleTriggerUnlock(meet)}
                        className="p-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold transition-all"
                        title="رفع قفل (کارفرما)"
                      >
                        <Unlock size={15} />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Sign button for current user */}
                    {canUserSignMeeting(meet) && (
                      <button
                        onClick={() => {
                          setActionModalMeeting(meet);
                          setActionModalType('SIGN_AS_ATTENDEE');
                        }}
                        className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold transition-all shadow-2xs"
                        title="ثبت امضای من"
                      >
                        <PenTool size={15} />
                      </button>
                    )}

                    {/* Send button for creator */}
                    {canUserSendToAttendees(meet) && (
                      <button
                        onClick={() => {
                          setActionModalMeeting(meet);
                          setActionModalType('SEND_TO_ATTENDEES');
                        }}
                        className="p-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold transition-all shadow-2xs"
                        title="ارسال سراسری به حاضرین"
                      >
                        <Send size={15} />
                      </button>
                    )}

                    {/* Edit button */}
                    {canUserEditMeeting(meet) && onEditMeeting && (
                      <button
                        onClick={() => onEditMeeting(meet)}
                        className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 transition-all"
                        title="ویرایش صورت‌جلسه"
                      >
                        <Edit3 size={15} />
                      </button>
                    )}

                    {/* Delete button */}
                    {canUserDeleteMeeting(meet) && onDeleteMeeting && (
                      <button
                        onClick={() => onDeleteMeeting(meet.id)}
                        className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 transition-all"
                        title="حذف صورت‌جلسه"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>

              </div>
            );
          })}
        </div>

      ) : (

        /* ACTION TRACKER (MATRIX) VIEW */
        <div className="bg-white rounded-3xl border border-stone-200/80 shadow-2xs overflow-hidden p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-black text-sm text-stone-900 flex items-center gap-2">
              <CheckSquare size={16} className="text-amber-600" />
              ماتریکس پایش و پیگیری کلیه مصوبات پروژه‌ای
            </h4>
            <span className="text-xs text-stone-500 font-bold">
              تکالیف ثبت‌شده در جلسات هماهنگی
            </span>
          </div>

          <div className="overflow-x-auto border border-stone-200 rounded-2xl">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-stone-100/80 text-stone-700 border-b border-stone-200">
                  <th className="p-3 font-black w-28">صورت‌جلسه</th>
                  <th className="p-3 font-black">شرح مصوبه</th>
                  <th className="p-3 font-black w-36">متعهد و مسئول</th>
                  <th className="p-3 font-black w-28 text-center">مهلت اقدام</th>
                  <th className="p-3 font-black w-24 text-center">اولویت</th>
                  <th className="p-3 font-black w-32 text-center">وضعیت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredMeetings.flatMap(meet => {
                  const items = meet.structuredDecisions || meet.decisions.map((d: string, idx: number) => ({
                    id: `dec-${meet.id}-${idx}`,
                    description: d,
                    actionParty: 'ارکان پروژه',
                    deadline: meet.date,
                    priority: 'MEDIUM',
                    status: 'PENDING'
                  }));

                  return items.map((item: any, idx: number) => (
                    <tr key={`${meet.id}-${item.id || idx}`} className="hover:bg-stone-50/70">
                      <td className="p-3 font-bold text-stone-600">
                        <span className="font-mono block text-[11px]">{meet.minuteNumber || 'MOM'}</span>
                        <span className="text-[10px] text-stone-400 block">{meet.date}</span>
                      </td>
                      <td className="p-3 font-bold text-stone-900 leading-relaxed">{item.description}</td>
                      <td className="p-3 font-bold text-blue-700">{item.actionParty || 'پیمانکار'}</td>
                      <td className="p-3 text-center text-stone-600 font-bold">{item.deadline || meet.date}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.priority === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                          item.priority === 'HIGH' ? 'bg-amber-100 text-amber-800' : 'bg-stone-100 text-stone-600'
                        }`}>
                          {item.priority === 'CRITICAL' ? 'بحرانی' : item.priority === 'HIGH' ? 'فوری' : 'عادی'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <select
                          value={item.status || 'PENDING'}
                          onChange={(e) => {
                            if (onUpdateDecisionStatus) {
                              onUpdateDecisionStatus(meet.id, item.id, e.target.value);
                            }
                          }}
                          className="p-1 px-2 bg-stone-50 border border-stone-200 rounded-lg text-xs font-bold text-stone-800 outline-none"
                        >
                          <option value="PENDING">در دست اقدام</option>
                          <option value="IN_PROGRESS">در حال اجرا</option>
                          <option value="COMPLETED">انجام شد</option>
                          <option value="DELAYED">دارای تاخیر</option>
                        </select>
                      </td>
                    </tr>
                  ));
                })}
              </tbody>
            </table>
          </div>
        </div>

      )}

      {/* EYE PREVIEW MODAL */}
      <MeetingPreviewModal
        isOpen={!!previewMeeting}
        onClose={() => setPreviewMeeting(null)}
        meeting={previewMeeting}
        activeProject={activeProject}
        currentUser={currentUser}
        onPrint={handlePrintTrigger}
        onSendToAllAttendees={(m) => {
          setActionModalMeeting(m);
          setActionModalType('SEND_TO_ATTENDEES');
        }}
        onOpenSignModal={(m) => {
          setActionModalMeeting(m);
          setActionModalType('SIGN_AS_ATTENDEE');
        }}
        onOpenWorkflow={(m, action) => {
          setActionModalMeeting(m);
          setActionModalType(action);
        }}
        onUnlockMeeting={handleTriggerUnlock}
      />

      {/* WORKFLOW MODAL WITH SIGNATURE CHECKBOX */}
      {actionModalMeeting && (
        <MeetingActionWorkflowModal
          isOpen={true}
          onClose={() => setActionModalMeeting(null)}
          meeting={actionModalMeeting}
          actionType={actionModalType}
          currentUser={currentUser}
          onConfirm={handleWorkflowConfirm}
        />
      )}

    </div>
  );
};
