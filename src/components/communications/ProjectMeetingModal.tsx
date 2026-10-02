import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Plus, Trash2, Calendar, Clock, MapPin, 
  Users, CheckSquare, FileText, ChevronRight,
  UserCheck, AlertCircle, Sparkles, Building, ListOrdered,
  Tag, ShieldCheck, UserPlus, Check, Lock, User, Building2,
  Briefcase, Search
} from 'lucide-react';
import { Project, SystemUser } from '../../../types';
import { 
  MeetingDecisionItem, 
  MeetingAttendeeItem, 
  MeetingPartiesStructure,
  MeetingOrgSignatures 
} from './MeetingMinutePrint';
import { SystemAdminService } from '../../../services/systemAdminService';
import { HRService } from '../../../services/hrService';
import { ShamsiDatePicker } from '../ShamsiDatePicker';

// Shamsi date helper
export const formatShamsiDate = (val: string): string => {
  const digits = val.replace(/\D/g, '');
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}/${digits.slice(4)}`;
  return `${digits.slice(0, 4)}/${digits.slice(4, 6)}/${digits.slice(6, 8)}`;
};

export const getTodayShamsi = (): string => {
  try {
    return new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date()).replace(/[/.-]/g, '/');
  } catch {
    return '1403/01/01';
  }
};

export type MeetingCategory = 
  | 'SITE_COORDINATION' 
  | 'TECHNICAL' 
  | 'EXECUTIVE' 
  | 'HSE' 
  | 'CLAIM_DISPUTE' 
  | 'HANDOVER' 
  | 'OTHER';

export interface ProjectMeetingFormState {
  id?: string;
  minuteNumber: string;
  title: string;
  meetingType: MeetingCategory;
  partiesStructure: MeetingPartiesStructure;
  date: string;
  time: string;
  location: string;
  chairperson: string;
  secretary: string;
  agenda: string[];
  structuredDecisions: MeetingDecisionItem[];
  attendeeList: MeetingAttendeeItem[];
  absentees: string[];
  nextMeetingDate: string;
  nextMeetingLocation: string;
  nextMeetingAgenda: string;
  nextMeetingAgendas?: string[];
  notes: string;
  tags: string[];
  orgSignatures?: MeetingOrgSignatures;
}

const EMPTY_SYSTEM_USERS: SystemUser[] = [];

export interface ProjectMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (meetingData: ProjectMeetingFormState) => void;
  initialData?: any | null;
  initialMeeting?: any | null;
  activeProject?: Project | any;
  currentUser?: SystemUser | null;
  allUsers?: SystemUser[];
}

export const ProjectMeetingModal: React.FC<ProjectMeetingModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  initialMeeting,
  activeProject,
  currentUser,
  allUsers = EMPTY_SYSTEM_USERS
}) => {
  const effectiveInitial = initialMeeting || initialData;
  const [activeStep, setActiveStep] = useState<'info' | 'agenda' | 'attendees' | 'decisions' | 'followup'>('info');
  
  const employerOrgName = activeProject?.employerName || (activeProject as any)?.employer || 'کارفرما';
  const consultantOrgName = activeProject?.consultantName || (activeProject as any)?.consultant || 'مهندسین مشاور';
  const contractorOrgName = activeProject?.contractorName || (activeProject as any)?.contractor || 'پیمانکار اصلی';

  const defaultDate = getTodayShamsi();

  // 1. Filter out system admin users (مدیر کل سیستم نباید در این بخش وجود داشته باشد)
  const nonAdminUsers: SystemUser[] = useMemo(() => {
    const rawList = allUsers && allUsers.length > 0 ? allUsers : SystemAdminService.getUsers();
    return rawList.filter(u => {
      if (u.role === 'SYSTEM_ADMIN') return false;
      if (u.username?.toLowerCase() === 'admin' || u.id === 'admin') return false;
      const fullName = (u.fullName || '').toLowerCase();
      const jobTitle = (u.jobTitle || '').toLowerCase();
      const jobLevel = (u.jobLevel || '').toLowerCase();
      if (fullName.includes('مدیر کل سیستم') || fullName.includes('مدیرکل سیستم') || fullName.includes('system admin') || fullName.includes('ادمین سیستم')) return false;
      if (jobTitle.includes('مدیر کل سیستم') || jobTitle.includes('مدیرکل سیستم') || jobTitle.includes('مدیر سیستم')) return false;
      if (jobLevel.includes('مدیر کل سیستم') || jobLevel.includes('مدیرکل سیستم')) return false;
      return true;
    });
  }, [allUsers]);

  const allOrgs = useMemo(() => {
    return SystemAdminService.getOrganizations();
  }, []);

  // 2. Define organization categories involved in the meeting
  interface OrgCategoryItem {
    id: string;
    label: string;
    name: string;
    orgType: 'EMPLOYER' | 'CONSULTANT' | 'CONTRACTOR' | 'SUB_CONTRACTOR' | 'GUEST';
    badgeColor: string;
  }

  const orgCategories: OrgCategoryItem[] = useMemo(() => {
    const categories: OrgCategoryItem[] = [
      {
        id: 'contractor',
        label: 'پیمانکار اصلی',
        name: contractorOrgName,
        orgType: 'CONTRACTOR',
        badgeColor: 'bg-amber-600'
      },
      {
        id: 'consultant',
        label: 'مهندس مشاور',
        name: consultantOrgName,
        orgType: 'CONSULTANT',
        badgeColor: 'bg-emerald-600'
      },
      {
        id: 'employer',
        label: 'کارفرما',
        name: employerOrgName,
        orgType: 'EMPLOYER',
        badgeColor: 'bg-blue-600'
      }
    ];

    allOrgs.forEach(org => {
      const isAlreadyInList = categories.some(c => 
        c.name === org.name || 
        (c.orgType === 'EMPLOYER' && org.type === 'EMPLOYER') ||
        (c.orgType === 'CONSULTANT' && org.type === 'CONSULTANT') ||
        (c.orgType === 'CONTRACTOR' && org.type === 'CONTRACTOR')
      );
      if (!isAlreadyInList && org.name) {
        categories.push({
          id: `org-${org.id}`,
          label: (org.type as string) === 'SUB_CONTRACTOR' ? 'پیمانکار جزء' : 'سایر ارکان',
          name: org.name,
          orgType: (org.type as any) || 'CONTRACTOR',
          badgeColor: 'bg-purple-600'
        });
      }
    });

    return categories;
  }, [employerOrgName, consultantOrgName, contractorOrgName, allOrgs]);

  const [selectedOrgTab, setSelectedOrgTab] = useState<string>('contractor');
  const [selectedUserToSelect, setSelectedUserToSelect] = useState<string>('');

  const getUserOrgCategoryId = (u: SystemUser): string => {
    const userOrg = allOrgs.find(o => o.id === u.orgId);
    const orgName = (userOrg?.name || '').trim();
    const orgType = userOrg?.type;

    if (orgType === 'EMPLOYER' || orgName === employerOrgName || (u.jobTitle || '').includes('کارفرما')) {
      return 'employer';
    }
    if (orgType === 'CONSULTANT' || orgName === consultantOrgName || (u.jobTitle || '').includes('مشاور') || (u.jobTitle || '').includes('نظارت')) {
      return 'consultant';
    }
    if (orgType === 'CONTRACTOR' || orgName === contractorOrgName || (u.jobTitle || '').includes('پیمانکار')) {
      return 'contractor';
    }
    if (userOrg) {
      const match = orgCategories.find(c => c.id === `org-${userOrg.id}`);
      if (match) return match.id;
    }
    return 'contractor';
  };

  const usersByOrgCategory = useMemo(() => {
    const map: Record<string, SystemUser[]> = {};
    orgCategories.forEach(cat => {
      map[cat.id] = [];
    });

    nonAdminUsers.forEach(u => {
      const catId = getUserOrgCategoryId(u);
      if (!map[catId]) map[catId] = [];
      map[catId].push(u);
    });

    return map;
  }, [nonAdminUsers, orgCategories, allOrgs, employerOrgName, consultantOrgName, contractorOrgName]);

  const [formData, setFormData] = useState<ProjectMeetingFormState>({
    minuteNumber: '',
    title: '',
    meetingType: 'SITE_COORDINATION',
    partiesStructure: 'TRIPARTITE',
    date: '',
    time: '',
    location: '',
    chairperson: '',
    secretary: '',
    agenda: [],
    structuredDecisions: [],
    attendeeList: [],
    absentees: [],
    nextMeetingDate: '',
    nextMeetingLocation: '',
    nextMeetingAgenda: '',
    nextMeetingAgendas: [],
    notes: '',
    tags: []
  });

  const [attendeeSearchQuery, setAttendeeSearchQuery] = useState('');
  const [newTagInput, setNewTagInput] = useState('');
  const [newAbsenteeInput, setNewAbsenteeInput] = useState('');

  // Form initialization: only execute when modal is opened or target meeting changes
  const initialMeetingKey = effectiveInitial ? (effectiveInitial.id || effectiveInitial.minuteNumber || 'edit') : 'new';
  useEffect(() => {
    if (!isOpen) return;

    if (effectiveInitial) {
      let parsedDecisions: MeetingDecisionItem[] = [];
      if (effectiveInitial.structuredDecisions && effectiveInitial.structuredDecisions.length > 0) {
        parsedDecisions = effectiveInitial.structuredDecisions;
      } else if (effectiveInitial.decisions && Array.isArray(effectiveInitial.decisions)) {
        parsedDecisions = effectiveInitial.decisions.map((d: string, idx: number) => ({
          id: `dec-${idx + 1}`,
          itemNumber: idx + 1,
          description: d,
          actionParty: 'عوامل پروژه',
          deadline: effectiveInitial.date || defaultDate,
          priority: 'MEDIUM',
          status: 'PENDING',
          progress: 0,
          notes: ''
        }));
      }

      let parsedAttendees: MeetingAttendeeItem[] = [];
      if (effectiveInitial.attendeeList && effectiveInitial.attendeeList.length > 0) {
        parsedAttendees = effectiveInitial.attendeeList.map((att: any) => {
          const matchingUser = nonAdminUsers.find(u => (att.userId && u.id === att.userId) || u.fullName === att.name);
          if (matchingUser) {
            return {
              ...att,
              userId: matchingUser.id,
              name: matchingUser.fullName,
              role: matchingUser.jobTitle || matchingUser.jobLevel || att.role || 'کارشناس رسمی',
              requiresSignature: true,
              isManualGuest: false
            };
          }
          return {
            ...att,
            requiresSignature: att.requiresSignature !== undefined ? att.requiresSignature : !att.isManualGuest,
            isManualGuest: att.isManualGuest !== undefined ? att.isManualGuest : !att.userId
          };
        });
      } else if (effectiveInitial.attendees && Array.isArray(effectiveInitial.attendees)) {
        parsedAttendees = effectiveInitial.attendees.map((att: string) => ({
          name: att,
          role: 'نماینده حاضر',
          organization: att.includes('کارفرما') ? employerOrgName : att.includes('مشاور') ? consultantOrgName : contractorOrgName,
          orgType: att.includes('کارفرما') ? 'EMPLOYER' : att.includes('مشاور') ? 'CONSULTANT' : 'CONTRACTOR',
          isManagerOrSupervisor: att.includes('سرپرست') || att.includes('مدیر'),
          attendanceStatus: 'PRESENT',
          requiresSignature: false,
          isManualGuest: true
        }));
      }

      let parsedNextAgendas: string[] = [];
      if (effectiveInitial.nextMeetingAgendas && Array.isArray(effectiveInitial.nextMeetingAgendas)) {
        parsedNextAgendas = effectiveInitial.nextMeetingAgendas.filter(Boolean);
      } else if (effectiveInitial.nextMeetingAgenda && typeof effectiveInitial.nextMeetingAgenda === 'string') {
        parsedNextAgendas = effectiveInitial.nextMeetingAgenda.split('\n').map((s: string) => s.replace(/^[-•*]\s*/, '').trim()).filter(Boolean);
      }

      setFormData({
        id: effectiveInitial.id,
        minuteNumber: effectiveInitial.minuteNumber || (effectiveInitial.id ? `MOM-${effectiveInitial.id.replace('meet_', '').substring(0, 6)}` : `MOM-${Date.now().toString().slice(-4)}`),
        title: effectiveInitial.title || '',
        meetingType: effectiveInitial.meetingType || 'SITE_COORDINATION',
        partiesStructure: effectiveInitial.partiesStructure || 'TRIPARTITE',
        date: effectiveInitial.date || defaultDate,
        time: effectiveInitial.time || '10:00 الی 12:00',
        location: effectiveInitial.location || 'کارگاه پروژه',
        chairperson: effectiveInitial.chairperson || '',
        secretary: effectiveInitial.secretary || effectiveInitial.recordedBy || (currentUser ? currentUser.fullName : ''),
        agenda: effectiveInitial.agenda || (effectiveInitial.title ? [effectiveInitial.title] : ['بررسی روند اجرایی و رفع موانع']),
        structuredDecisions: parsedDecisions.length > 0 ? parsedDecisions : [
          {
            id: 'dec-1',
            itemNumber: 1,
            description: '',
            actionParty: 'پیمانکار',
            deadline: defaultDate,
            priority: 'MEDIUM',
            status: 'PENDING'
          }
        ],
        attendeeList: parsedAttendees.length > 0 ? parsedAttendees : [],
        absentees: effectiveInitial.absentees || [],
        nextMeetingDate: effectiveInitial.nextMeetingDate || '',
        nextMeetingLocation: effectiveInitial.nextMeetingLocation || '',
        nextMeetingAgenda: effectiveInitial.nextMeetingAgenda || '',
        nextMeetingAgendas: parsedNextAgendas,
        notes: effectiveInitial.notes || '',
        tags: effectiveInitial.tags || ['کارگاهی', 'هماهنگی'],
        orgSignatures: effectiveInitial.orgSignatures
      });
    } else {
      // Fresh new meeting: Form must be completely blank, without pre-filled values
      setFormData({
        minuteNumber: '',
        title: '',
        meetingType: 'SITE_COORDINATION',
        partiesStructure: 'TRIPARTITE',
        date: '',
        time: '',
        location: '',
        chairperson: '',
        secretary: '',
        agenda: [],
        structuredDecisions: [],
        attendeeList: [],
        absentees: [],
        nextMeetingDate: '',
        nextMeetingLocation: '',
        nextMeetingAgenda: '',
        nextMeetingAgendas: [],
        notes: '',
        tags: []
      });
      setActiveStep('info');
      setAttendeeSearchQuery('');
      setNewTagInput('');
      setNewAbsenteeInput('');
    }
  }, [isOpen, initialMeetingKey]);

  if (!isOpen) return null;

  // Change partiesStructure handler (adjust default attendees if appropriate)
  const handlePartiesStructureChange = (structure: MeetingPartiesStructure) => {
    setFormData(prev => {
      let updatedAttendees = [...prev.attendeeList];
      if (structure === 'BIPARTITE_EMPLOYER_CONTRACTOR') {
        updatedAttendees = updatedAttendees.filter(a => a.orgType !== 'CONSULTANT');
      } else if (structure === 'BIPARTITE_CONSULTANT_CONTRACTOR') {
        updatedAttendees = updatedAttendees.filter(a => a.orgType !== 'EMPLOYER');
      } else if (structure === 'BIPARTITE_EMPLOYER_CONSULTANT') {
        updatedAttendees = updatedAttendees.filter(a => a.orgType !== 'CONTRACTOR');
      }
      return {
        ...prev,
        partiesStructure: structure,
        attendeeList: updatedAttendees
      };
    });
  };

  // Helper to check if attendee's project role qualifies for Supervisor or Project Manager
  const isEligibleForSupervisorOrManager = (att: { role?: string; userId?: string }): boolean => {
    if (!att) return false;
    const attRole = (att.role || '').trim().toLowerCase();
    
    // Check registered system user if this attendee is linked to one
    let userJobTitle = '';
    let userJobLevel = '';
    let userRole = '';
    if (att.userId) {
      const sysUser = (nonAdminUsers || []).find(u => u && u.id === att.userId) || ((allUsers || []).find(u => u && u.id === att.userId));
      if (sysUser) {
        userJobTitle = (sysUser.jobTitle || '').trim().toLowerCase();
        userJobLevel = (sysUser.jobLevel || '').trim().toLowerCase();
        userRole = (sysUser.role || '').trim().toLowerCase();
      }
    }

    const combined = `${attRole} ${userJobTitle} ${userJobLevel} ${userRole}`;

    return (
      combined.includes('سرپرست') ||
      combined.includes('مدیر') ||
      combined.includes('رئیس') ||
      combined.includes('رییس') ||
      combined.includes('ناظر') ||
      combined.includes('manager') ||
      combined.includes('supervisor') ||
      combined.includes('engineer')
    );
  };

  // Add attendee from selected organization user
  const handleAddUserFromOrg = (user: SystemUser, cat: OrgCategoryItem) => {
    const isAlreadyAdded = formData.attendeeList.some(a => a.userId === user.id);
    if (isAlreadyAdded) {
      alert(`کاربر «${user.fullName}» قبلاً به لیست حاضرین این صورت‌جلسه اضافه شده است.`);
      return;
    }

    const eligible = isEligibleForSupervisorOrManager({
      role: user.jobTitle || user.jobLevel || '',
      userId: user.id
    });

    const userSig = HRService.getUserSignature(user);

    const newAtt: MeetingAttendeeItem = {
      id: `att-sys-${user.id}-${Date.now().toString().slice(-4)}`,
      userId: user.id,
      personnelId: user.personnelId,
      name: user.fullName,
      role: user.jobTitle || user.jobLevel || 'کارشناس رسمی پروژه',
      organization: cat.name,
      orgType: cat.orgType,
      isManagerOrSupervisor: eligible,
      attendanceStatus: 'PRESENT',
      requiresSignature: true,
      isManualGuest: false,
      signed: false,
      signature: userSig
    };

    setFormData(prev => ({
      ...prev,
      attendeeList: [...prev.attendeeList, newAtt]
    }));
  };

  // Add manual attendee (guest without system account - NO signature required)
  const handleAddManualAttendee = (customName = '') => {
    const activeCat = orgCategories.find(c => c.id === selectedOrgTab) || orgCategories[0];
    const newAtt: MeetingAttendeeItem = {
      id: `att-manual-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      userId: undefined,
      name: customName,
      role: '',
      organization: activeCat ? activeCat.name : contractorOrgName,
      orgType: activeCat ? activeCat.orgType : 'GUEST',
      isManagerOrSupervisor: false,
      attendanceStatus: 'PRESENT',
      requiresSignature: false, // افراد دستی نیاز به امضا ندارند
      isManualGuest: true,
      signed: false
    };

    setFormData(prev => ({
      ...prev,
      attendeeList: [...prev.attendeeList, newAtt]
    }));
  };

  // Decision actions
  const handleAddDecision = () => {
    const newItem: MeetingDecisionItem = {
      id: `dec-${Date.now()}`,
      itemNumber: formData.structuredDecisions.length + 1,
      description: '',
      actionParty: '',
      actionPartyOrgType: 'CONTRACTOR',
      deadline: '',
      priority: 'MEDIUM',
      status: 'PENDING',
      progress: 0,
      notes: ''
    };
    setFormData({
      ...formData,
      structuredDecisions: [...formData.structuredDecisions, newItem]
    });
  };

  const handleUpdateDecision = (index: number, field: keyof MeetingDecisionItem, value: any) => {
    const updated = [...formData.structuredDecisions];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, structuredDecisions: updated });
  };

  const handleRemoveDecision = (index: number) => {
    const filtered = formData.structuredDecisions.filter((_, i) => i !== index);
    const renumbered = filtered.map((item, idx) => ({ ...item, itemNumber: idx + 1 }));
    setFormData({ ...formData, structuredDecisions: renumbered });
  };

  // Update attendee: if system user, name, role, organization, and orgType are strictly LOCKED
  const handleUpdateAttendee = (index: number, field: keyof MeetingAttendeeItem, value: any) => {
    const att = formData.attendeeList[index];
    if (att && att.userId && !att.isManualGuest) {
      if (field === 'name' || field === 'role' || field === 'organization' || field === 'orgType') {
        // Strict protection against modifying locked identity fields for system users
        return;
      }
    }
    const updated = [...formData.attendeeList];
    updated[index] = { ...updated[index], [field]: value };
    
    // اگر سمت حاضر دستی تغییر یافت، بررسی صلاحیت سرپرست کارگاه / مدیر پروژه انجام شود
    if (field === 'role') {
      if (!isEligibleForSupervisorOrManager(updated[index])) {
        updated[index].isManagerOrSupervisor = false;
      }
    }

    setFormData(prev => ({ ...prev, attendeeList: updated }));
  };

  const handleRemoveAttendee = (index: number) => {
    setFormData(prev => ({
      ...prev,
      attendeeList: prev.attendeeList.filter((_, i) => i !== index)
    }));
  };

  // Agenda actions
  const handleAddAgendaItem = () => {
    setFormData({
      ...formData,
      agenda: [...formData.agenda, '']
    });
  };

  const handleUpdateAgendaItem = (index: number, val: string) => {
    const updated = [...formData.agenda];
    updated[index] = val;
    setFormData({ ...formData, agenda: updated });
  };

  const handleRemoveAgendaItem = (index: number) => {
    setFormData({
      ...formData,
      agenda: formData.agenda.filter((_, i) => i !== index)
    });
  };

  // Proposed next meeting agenda actions (multi-row)
  const handleAddNextAgendaItem = () => {
    const current = formData.nextMeetingAgendas || [];
    setFormData({
      ...formData,
      nextMeetingAgendas: [...current, '']
    });
  };

  const handleUpdateNextAgendaItem = (index: number, val: string) => {
    const current = [...(formData.nextMeetingAgendas || [])];
    current[index] = val;
    setFormData({
      ...formData,
      nextMeetingAgendas: current,
      nextMeetingAgenda: current.filter(Boolean).join('\n')
    });
  };

  const handleRemoveNextAgendaItem = (index: number) => {
    const current = (formData.nextMeetingAgendas || []).filter((_, i) => i !== index);
    setFormData({
      ...formData,
      nextMeetingAgendas: current,
      nextMeetingAgenda: current.filter(Boolean).join('\n')
    });
  };

  // Tags & Absentees
  const handleAddTag = () => {
    if (!newTagInput.trim()) return;
    if (!formData.tags.includes(newTagInput.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, newTagInput.trim()] });
    }
    setNewTagInput('');
  };

  const handleRemoveTag = (tag: string) => {
    setFormData({ ...formData, tags: formData.tags.filter(t => t !== tag) });
  };

  const handleAddAbsentee = () => {
    if (!newAbsenteeInput.trim()) return;
    setFormData({ ...formData, absentees: [...formData.absentees, newAbsenteeInput.trim()] });
    setNewAbsenteeInput('');
  };

  const handleRemoveAbsentee = (index: number) => {
    setFormData({ ...formData, absentees: formData.absentees.filter((_, i) => i !== index) });
  };

  const handleGoToNextStep = () => {
    if (activeStep === 'info') setActiveStep('agenda');
    else if (activeStep === 'agenda') setActiveStep('attendees');
    else if (activeStep === 'attendees') setActiveStep('decisions');
    else if (activeStep === 'decisions') setActiveStep('followup');
  };

  const handleSubmit = (e?: React.SyntheticEvent) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }

    try {
      // Auto-generate or fallback defaults for empty fields to guarantee seamless submission from any step
      const finalDate = (formData.date || '').trim() || defaultDate;
      const finalTitle = (formData.title || '').trim() || ((formData.agenda || []).length > 0 && formData.agenda[0]?.trim() ? formData.agenda[0].trim() : 'صورت‌جلسه کارگاهی و پیگیری مصوبات پروژه');
      const finalMinuteNumber = (formData.minuteNumber || '').trim() || (formData.id ? `MOM-${formData.id.replace('meet_', '').substring(0, 6)}` : `MOM-${Date.now().toString().slice(-4)}`);

      const validDecisions = (formData.structuredDecisions || []).filter(d => d && (d.description || '').trim() !== '');
      const finalDecisions: MeetingDecisionItem[] = validDecisions.length > 0 ? validDecisions : [
        {
          id: 'dec-1',
          itemNumber: 1,
          description: finalTitle,
          actionParty: 'پیمانکار',
          deadline: finalDate,
          priority: 'MEDIUM',
          status: 'PENDING'
        }
      ];

      const validAttendees = (formData.attendeeList || [])
        .filter(a => a && (a.name || '').trim() !== '')
        .map(a => {
          if (!isEligibleForSupervisorOrManager(a)) {
            return { ...a, isManagerOrSupervisor: false };
          }
          return a;
        });

      const finalAttendees: MeetingAttendeeItem[] = validAttendees.length > 0 ? validAttendees : (currentUser ? [
        {
          userId: currentUser.id,
          name: currentUser.fullName,
          role: currentUser.jobTitle || currentUser.jobLevel || 'تنظیم‌کننده صورت‌جلسه',
          organization: employerOrgName,
          orgType: 'EMPLOYER' as any,
          isManagerOrSupervisor: true,
          attendanceStatus: 'PRESENT',
          requiresSignature: true,
          isManualGuest: false
        }
      ] : []);

      const cleanedNextAgendas = (formData.nextMeetingAgendas || []).filter(a => (a || '').trim() !== '');
      const cleanedNextAgendaStr = cleanedNextAgendas.length > 0 ? cleanedNextAgendas.join('\n') : (formData.nextMeetingAgenda || '');

      onSave({
        ...formData,
        minuteNumber: finalMinuteNumber,
        title: finalTitle,
        date: finalDate,
        structuredDecisions: finalDecisions,
        attendeeList: finalAttendees,
        agenda: (formData.agenda || []).filter(a => (a || '').trim() !== ''),
        nextMeetingAgendas: cleanedNextAgendas,
        nextMeetingAgenda: cleanedNextAgendaStr
      });
    } catch (error) {
      console.error('Error in handleSubmit:', error);
    } finally {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-3 md:p-6 animate-fadeIn" dir="rtl">
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border border-stone-200 overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-stone-950 text-white p-5 px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Users size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black bg-amber-500 text-stone-950 px-2 py-0.5 rounded-md">
                  {effectiveInitial ? 'ویرایش صورتجلسه' : 'ثبت صورتجلسه رسمی'}
                </span>
                <span className="text-[11px] text-stone-400 font-bold">{formData.minuteNumber || 'MOM-NEW'}</span>
              </div>
              <h3 className="font-black text-base text-white mt-1">
                {formData.title || 'صورت‌جلسه رسمی و مصوبات ارکان پروژه'}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full text-stone-400 hover:text-white transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Step Tabs */}
        <div className="bg-stone-100/90 border-b border-stone-200 px-6 py-2.5 flex items-center gap-2 overflow-x-auto shrink-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveStep('info')}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all shrink-0 ${
              activeStep === 'info' 
                ? 'bg-stone-900 text-white shadow-sm' 
                : 'text-stone-600 hover:bg-stone-200/70'
            }`}
          >
            <Building size={15} />
            ۱. مشخصات و ساختار طرفین
          </button>

          <button
            type="button"
            onClick={() => setActiveStep('agenda')}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all shrink-0 ${
              activeStep === 'agenda' 
                ? 'bg-stone-900 text-white shadow-sm' 
                : 'text-stone-600 hover:bg-stone-200/70'
            }`}
          >
            <ListOrdered size={15} />
            ۲. دستور جلسه ({formData.agenda.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveStep('attendees')}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all shrink-0 ${
              activeStep === 'attendees' 
                ? 'bg-stone-900 text-white shadow-sm' 
                : 'text-stone-600 hover:bg-stone-200/70'
            }`}
          >
            <UserCheck size={15} />
            ۳. حاضرین و امضاکنندگان ({formData.attendeeList.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveStep('decisions')}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all shrink-0 ${
              activeStep === 'decisions' 
                ? 'bg-stone-900 text-white shadow-sm' 
                : 'text-stone-600 hover:bg-stone-200/70'
            }`}
          >
            <CheckSquare size={15} />
            ۴. مصوبات و تکالیف ({formData.structuredDecisions.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveStep('followup')}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all shrink-0 ${
              activeStep === 'followup' 
                ? 'bg-stone-900 text-white shadow-sm' 
                : 'text-stone-600 hover:bg-stone-200/70'
            }`}
          >
            <Calendar size={15} />
            ۵. جلسه آتی و برچسب‌ها
          </button>
        </div>

        {/* Main Body with Tabs */}
        <div 
          className="flex-1 overflow-y-auto p-6 space-y-6"
        >
          
          {/* STEP 1: General Info & Parties Structure */}
          {activeStep === 'info' && (
            <div className="space-y-5 animate-fadeIn">
              
              {/* Structure Selection: Tripartite vs Bipartite */}
              <div className="p-4 bg-amber-50/60 border border-amber-200/80 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-amber-900 flex items-center gap-2">
                    <ShieldCheck size={16} className="text-amber-600" />
                    تعیین ساختار طرفین صورت‌جلسه (ارکان دارای کادر امضای رسمی):
                  </span>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-md">
                    الزامی جهت تنظیم کادرهای امضا
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                  {[
                    {
                      key: 'TRIPARTITE',
                      title: 'سه‌جانبه کامل',
                      subtitle: 'کارفرما • مشاور • پیمانکار',
                      badge: '۳ ارکان رسمی'
                    },
                    {
                      key: 'BIPARTITE_EMPLOYER_CONTRACTOR',
                      title: 'دوجانبه (کارفرما - پیمانکار)',
                      subtitle: 'بدون حضور مهندس مشاور',
                      badge: '۲ ارکان رسمی'
                    },
                    {
                      key: 'BIPARTITE_CONSULTANT_CONTRACTOR',
                      title: 'دوجانبه (مشاور - پیمانکار)',
                      subtitle: 'جلسات کارگاهی و نظارت مقیم',
                      badge: '۲ ارکان رسمی'
                    },
                    {
                      key: 'BIPARTITE_EMPLOYER_CONSULTANT',
                      title: 'دوجانبه (کارفرما - مشاور)',
                      subtitle: 'جلسات راهبردی و نظارت عالیه',
                      badge: '۲ ارکان رسمی'
                    }
                  ].map(struct => {
                    const isSelected = formData.partiesStructure === struct.key;
                    return (
                      <div
                        key={struct.key}
                        onClick={() => handlePartiesStructureChange(struct.key as MeetingPartiesStructure)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between text-right ${
                          isSelected 
                            ? 'bg-amber-500 text-stone-950 border-amber-600 shadow-sm font-black' 
                            : 'bg-white text-stone-700 border-stone-200 hover:border-amber-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-black">{struct.title}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded ${isSelected ? 'bg-stone-950 text-amber-300' : 'bg-stone-100 text-stone-500 font-bold'}`}>
                            {struct.badge}
                          </span>
                        </div>
                        <span className={`text-[10px] ${isSelected ? 'text-stone-900 font-bold' : 'text-stone-400'}`}>
                          {struct.subtitle}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="text-xs font-black text-stone-700 block mb-1">
                    عنوان / موضوع اصلی جلسه <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: جلسه هماهنگی هفتگی کارگاه و بررسی جبهه‌های کاری فاز ۲"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-900 focus:bg-white focus:border-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-black text-stone-700 block mb-1">
                    شماره رسمی صورت‌جلسه
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: MOM-1403-012"
                    value={formData.minuteNumber}
                    onChange={(e) => setFormData({ ...formData, minuteNumber: e.target.value })}
                    className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-900 focus:bg-white focus:border-amber-500 outline-none text-left"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-black text-stone-700 block mb-1">
                    طبقه‌بندی و نوع جلسه
                  </label>
                  <select
                    value={formData.meetingType}
                    onChange={(e) => setFormData({ ...formData, meetingType: e.target.value as MeetingCategory })}
                    className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-900 focus:bg-white focus:border-amber-500 outline-none"
                  >
                    <option value="SITE_COORDINATION">هماهنگی کارگاهی و اجرایی</option>
                    <option value="TECHNICAL">فنی، نقشه‌ها و مهندسی</option>
                    <option value="EXECUTIVE">مدیریتی و کارفرمایی</option>
                    <option value="HSE">کمیته ایمنی و بهداشت (HSE)</option>
                    <option value="CLAIM_DISPUTE">بررسی مالی، ادعا و تاخیرات</option>
                    <option value="HANDOVER">تحویل موقت / قطعی و راه‌اندازی</option>
                    <option value="OTHER">سایر جلسات</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-black text-stone-700 block mb-1">
                    تاریخ برگزاری جلسه <span className="text-red-500">*</span>
                  </label>
                  <ShamsiDatePicker
                    placeholder="مثال: 1403/07/15"
                    value={formData.date}
                    onChange={(val) => setFormData({ ...formData, date: val })}
                    inputClassName="!p-3 !bg-stone-50 !border-stone-200 !rounded-xl !text-xs !font-bold !text-stone-900 focus:!bg-white focus:!border-amber-500 !text-center"
                  />
                </div>

                <div>
                  <label className="text-xs font-black text-stone-700 block mb-1">
                    ساعت شروع و پایان
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: 10:00 الی 12:30"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-900 focus:bg-white focus:border-amber-500 outline-none text-center"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-black text-stone-700 block mb-1">
                    محل برگزاری جلسه
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: سالن کنفرانس کارگاه / دفتر مهندس مشاور"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-900 focus:bg-white focus:border-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-black text-stone-700 block mb-1">
                    رئیس / مدیر جلسه
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: مهندس رضایی (مدیر طرح / نظارت عالیه)"
                    value={formData.chairperson}
                    onChange={(e) => setFormData({ ...formData, chairperson: e.target.value })}
                    className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-900 focus:bg-white focus:border-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-black text-stone-700 block mb-1">
                    دبیر / تنظیم‌کننده صورت‌جلسه
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: مهندس حسینی (دفتر فنی کارگاه)"
                    value={formData.secretary}
                    onChange={(e) => setFormData({ ...formData, secretary: e.target.value })}
                    className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-900 focus:bg-white focus:border-amber-500 outline-none"
                  />
                </div>
              </div>

            </div>
          )}

          {/* STEP 2: Agenda */}
          {activeStep === 'agenda' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-black text-sm text-stone-900">دستور کار و محورهای مورد بحث جلسه</h4>
                  <p className="text-xs text-stone-500 mt-0.5">موضوعات مصوب پیش از تشکیل جلسه جهت طرح و بررسی</p>
                </div>
                <button
                  type="button"
                  onClick={handleAddAgendaItem}
                  className="px-3.5 py-1.5 bg-amber-500 text-stone-950 hover:bg-amber-400 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Plus size={15} /> افزودن بند به دستور جلسه
                </button>
              </div>

              {formData.agenda.length === 0 ? (
                <div className="p-8 text-center bg-stone-50 border border-dashed border-stone-200 rounded-2xl space-y-3">
                  <ListOrdered size={32} className="mx-auto text-stone-300" />
                  <p className="text-xs font-bold text-stone-500">هیچ بندی برای دستور جلسه ثبت نشده است.</p>
                  <p className="text-[11px] text-stone-400">در صورت نیاز به ثبت دستور کار، بر روی دکمه زیر کلیک فرمایید.</p>
                  <button
                    type="button"
                    onClick={handleAddAgendaItem}
                    className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 cursor-pointer shadow-sm"
                  >
                    <Plus size={14} />
                    افزودن اولین بند دستور جلسه
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {formData.agenda.map((item, index) => (
                    <div key={index} className="flex items-center gap-2 p-2.5 bg-stone-50 border border-stone-200 rounded-2xl">
                      <span className="w-7 h-7 rounded-xl bg-stone-200 text-stone-800 flex items-center justify-center font-black text-xs shrink-0">
                        {index + 1}
                      </span>
                      <input
                        type="text"
                        placeholder={`مثال: بررسی برنامه زمان‌بندی، پیشرفت فیزیکی کارگاه و هماهنگی خرید مصالح فاز ${index + 1}`}
                        value={item}
                        onChange={(e) => handleUpdateAgendaItem(index, e.target.value)}
                        className="flex-1 p-2 bg-white border border-stone-200 rounded-xl text-xs font-bold text-stone-800 focus:border-amber-500 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveAgendaItem(index)}
                        className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                        title="حذف بند"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Attendees & Absentees */}
          {activeStep === 'attendees' && (
            <div className="space-y-6 animate-fadeIn">
              
              {/* Organization-segregated User Picker */}
              <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-4">
                <div>
                  <h5 className="text-xs font-black text-stone-900 flex items-center gap-2">
                    <Building2 size={16} className="text-amber-600" />
                    انتخاب حاضرین با قابلیت انتخاب سازمان و جستجوی پرسنل:
                  </h5>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    ابتدا سازمان مورد نظر را انتخاب و سپس با باکس جستجو، کاربر را یافته و اضافه فرمایید. مدیر کل سیستم در این بخش حضور ندارد.
                  </p>
                </div>

                {/* Organization Selection Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-stone-700 flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-stone-800 text-white text-[10px] flex items-center justify-center font-bold">۱</span>
                      انتخاب سازمان طرف قرارداد / رکن پروژه:
                    </label>
                    <span className="text-[11px] text-stone-500 font-bold">
                      {orgCategories.length} سازمان در پروژه
                    </span>
                  </div>

                  {/* Dropdown Selector for Organizations */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <div className="md:col-span-1">
                      <select
                        value={selectedOrgTab}
                        onChange={(e) => {
                          setSelectedOrgTab(e.target.value);
                          setAttendeeSearchQuery('');
                          setSelectedUserToSelect('');
                        }}
                        className="w-full p-2.5 bg-white border border-stone-300 rounded-xl text-xs font-black text-stone-800 focus:border-amber-500 outline-none shadow-2xs"
                      >
                        {orgCategories.map(cat => {
                          const count = (usersByOrgCategory[cat.id] || []).length;
                          return (
                            <option key={cat.id} value={cat.id}>
                              {cat.label}: {cat.name} ({count} پرسنل)
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {/* Quick-switch Tab Buttons */}
                    <div className="md:col-span-2 flex flex-wrap gap-1.5 p-1 bg-stone-200/70 rounded-xl items-center">
                      {orgCategories.map(cat => {
                        const count = (usersByOrgCategory[cat.id] || []).length;
                        const isActive = selectedOrgTab === cat.id;
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => {
                              setSelectedOrgTab(cat.id);
                              setAttendeeSearchQuery('');
                              setSelectedUserToSelect('');
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer flex-1 justify-center sm:flex-initial ${
                              isActive 
                                ? 'bg-white text-stone-900 shadow-xs border border-stone-200' 
                                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100/60'
                            }`}
                          >
                            <span className={`w-2 h-2 rounded-full ${cat.badgeColor}`} />
                            <span>{cat.label}</span>
                            <span className="text-[10px] px-1.5 py-0.2 bg-stone-100 text-stone-600 rounded-full font-bold">
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Active Organization Search & Add Box */}
                {(() => {
                  const activeCat = orgCategories.find(c => c.id === selectedOrgTab) || orgCategories[0];
                  const orgUsers = usersByOrgCategory[activeCat?.id || ''] || [];
                  
                  // Filter org users by attendeeSearchQuery
                  const query = attendeeSearchQuery.trim().toLowerCase();
                  const filteredUsers = orgUsers.filter(u => {
                    if (!query) return true;
                    const nameMatch = u.fullName?.toLowerCase().includes(query);
                    const titleMatch = (u.jobTitle || u.jobLevel || '')?.toLowerCase().includes(query);
                    const mobileMatch = u.mobile?.toLowerCase().includes(query);
                    return nameMatch || titleMatch || mobileMatch;
                  });

                  return (
                    <div className="p-3.5 bg-white border border-stone-200 rounded-xl space-y-3 shadow-2xs">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-black text-stone-800 flex items-center gap-1.5">
                            <span className="w-4 h-4 rounded-full bg-amber-500 text-stone-950 text-[10px] flex items-center justify-center font-bold">۲</span>
                            جستجوی پرسنل در سازمان «{activeCat?.name}»:
                          </label>
                          <span className="text-[10px] text-stone-400 font-bold">
                            تعداد نتایج: {filteredUsers.length} از {orgUsers.length} نفر
                          </span>
                        </div>

                        {/* Search Input Box */}
                        <div className="relative">
                          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                          <input
                            type="text"
                            value={attendeeSearchQuery}
                            onChange={(e) => setAttendeeSearchQuery(e.target.value)}
                            placeholder={`مثال: جستجوی نام، نام خانوادگی، شماره تماس یا سمت در سازمان «${activeCat?.name}»...`}
                            className="w-full p-2.5 pr-9 pl-8 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-900 focus:bg-white focus:border-amber-500 outline-none"
                          />
                          {attendeeSearchQuery && (
                            <button
                              type="button"
                              onClick={() => setAttendeeSearchQuery('')}
                              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-1"
                              title="پاک کردن جستجو"
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Dropdown Quick Select & Add */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-1">
                        <div className="flex-1">
                          <select
                            value={selectedUserToSelect}
                            onChange={(e) => setSelectedUserToSelect(e.target.value)}
                            className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-800 focus:bg-white focus:border-amber-500 outline-none"
                          >
                            <option value="">انتخاب مستقیم از لیست پرسنل سازمان «{activeCat?.name}»...</option>
                            {filteredUsers.map(user => {
                              const isAdded = formData.attendeeList.some(a => a.userId === user.id);
                              return (
                                <option key={user.id} value={user.id} disabled={isAdded}>
                                  {user.fullName} — {user.jobTitle || user.jobLevel || 'کارشناس'} {isAdded ? '(قبلاً افزوده شده)' : ''}
                                </option>
                              );
                            })}
                          </select>
                        </div>
                        <button
                          type="button"
                          disabled={!selectedUserToSelect}
                          onClick={() => {
                            const user = filteredUsers.find(u => u.id === selectedUserToSelect);
                            if (user && activeCat) {
                              handleAddUserFromOrg(user, activeCat);
                              setSelectedUserToSelect('');
                            }
                          }}
                          className={`px-4 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            selectedUserToSelect 
                              ? 'bg-stone-900 text-white hover:bg-stone-800 shadow-sm' 
                              : 'bg-stone-100 text-stone-400 cursor-not-allowed border border-stone-200'
                          }`}
                        >
                          <Plus size={14} />
                          الحاق کاربر به لیست حاضرین
                        </button>
                      </div>

                      {/* Search Results / Personnel Cards */}
                      {filteredUsers.length > 0 ? (
                        <div className="space-y-1.5 pt-2 border-t border-stone-100 max-h-56 overflow-y-auto pr-1">
                          <span className="text-[10px] font-black text-stone-400 block mb-1">
                            پرسنل تطبیق‌یافته در سازمان «{activeCat?.name}»:
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {filteredUsers.map(user => {
                              const isAdded = formData.attendeeList.some(a => a.userId === user.id);
                              return (
                                <div
                                  key={user.id}
                                  className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                                    isAdded
                                      ? 'bg-emerald-50/70 border-emerald-200'
                                      : 'bg-stone-50/60 hover:bg-amber-50/50 border-stone-200 hover:border-amber-300'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className="w-7 h-7 rounded-lg bg-stone-200 text-stone-700 flex items-center justify-center font-black text-xs shrink-0">
                                      {user.fullName?.charAt(0) || 'ک'}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-xs font-black text-stone-900 truncate">
                                        {user.fullName}
                                      </p>
                                      <p className="text-[10px] text-stone-500 truncate">
                                        {user.jobTitle || user.jobLevel || 'کارشناس'} {user.mobile ? `— ${user.mobile}` : ''}
                                      </p>
                                    </div>
                                  </div>

                                  <div>
                                    {isAdded ? (
                                      <span className="px-2 py-1 rounded-lg text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                                        <Check size={11} className="text-emerald-700" />
                                        افزوده شده
                                      </span>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => activeCat && handleAddUserFromOrg(user, activeCat)}
                                        className="px-2.5 py-1 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-[11px] font-black flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                                      >
                                        <Plus size={12} />
                                        افزودن
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : orgUsers.length > 0 ? (
                        <div className="p-4 text-center bg-stone-50 border border-dashed border-stone-200 rounded-xl space-y-2">
                          <p className="text-xs font-bold text-stone-600">
                            کاربری با مشخصات «{attendeeSearchQuery}» در بین پرسنل این سازمان یافت نشد.
                          </p>
                          <button
                            type="button"
                            onClick={() => handleAddManualAttendee(attendeeSearchQuery)}
                            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-xl text-xs font-black inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
                          >
                            <Plus size={13} />
                            افزودن «{attendeeSearchQuery}» به عنوان حاضر دستی (مهمان این سازمان)
                          </button>
                        </div>
                      ) : (
                        <div className="p-4 text-center bg-stone-50 border border-dashed border-stone-200 rounded-xl space-y-2">
                          <p className="text-xs font-bold text-stone-500">
                            هیچ کاربر فعالی برای سازمان «{activeCat?.name}» در سامانه ثبت نشده است.
                          </p>
                          <button
                            type="button"
                            onClick={() => handleAddManualAttendee()}
                            className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-black inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
                          >
                            <Plus size={13} />
                            افزودن حاضر دستی به نمایندگی از این سازمان
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Attendee List Table / Cards */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="font-black text-sm text-stone-900 flex items-center gap-2">
                    <Users size={16} className="text-stone-700" />
                    لیست نهایی حاضرین و امضاکنندگان صورت‌جلسه ({formData.attendeeList.length} نفر)
                  </h4>
                  <p className="text-xs text-stone-500 mt-0.5">
                    کاربران رسمی سامانه نیازمند امضا بوده و اطلاعات آن‌ها قفل است؛ افراد دستی به عنوان مهمان بدون نیاز به امضا ثبت می‌شوند.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleAddManualAttendee()}
                  className="px-3 py-1.5 bg-stone-900 text-white hover:bg-stone-800 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm self-start sm:self-auto cursor-pointer"
                >
                  <Plus size={14} /> افزودن حاضر دستی
                </button>
              </div>

              <div className="space-y-3">
                {formData.attendeeList.length === 0 ? (
                  <div className="p-8 text-center bg-stone-50 border border-dashed border-stone-200 rounded-2xl space-y-2">
                    <Users size={32} className="mx-auto text-stone-300" />
                    <p className="text-xs font-bold text-stone-500">لیست حاضرین خالی است.</p>
                    <p className="text-[11px] text-stone-400">از باکس تفکیک سازمان‌ها در بالا یا دکمه افزودن دستی استفاده نمایید.</p>
                  </div>
                ) : (
                  formData.attendeeList.map((attendee, index) => {
                    const isSystemUser = !!(attendee.userId && !attendee.isManualGuest);

                    return (
                      <div 
                        key={attendee.id || index} 
                        className={`p-3.5 rounded-2xl space-y-3 transition-all ${
                          isSystemUser 
                            ? 'bg-blue-50/30 border border-blue-200/80 shadow-2xs' 
                            : 'bg-amber-50/30 border border-amber-200/80 shadow-2xs'
                        }`}
                      >
                        {/* Attendee Card Header */}
                        <div className="flex items-center justify-between gap-2 pb-2 border-b border-stone-200/60">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="w-5 h-5 rounded-md bg-stone-800 text-white flex items-center justify-center font-black text-[11px]">
                              {index + 1}
                            </span>
                            
                            {isSystemUser ? (
                              <>
                                <span className="px-2 py-0.5 rounded-lg text-[11px] font-black bg-blue-100 text-blue-900 border border-blue-300 flex items-center gap-1">
                                  <Lock size={11} className="text-blue-700" /> کاربر رسمی سامانه (مشخصات قفل است)
                                </span>
                                <span className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1">
                                  <ShieldCheck size={11} className="text-emerald-700" /> ملزم به امضای الکترونیک
                                </span>
                              </>
                            ) : (
                              <>
                                <span className="px-2 py-0.5 rounded-lg text-[11px] font-black bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                                  <User size={11} className="text-amber-700" /> حاضر دستی / مهمان (بدون حساب)
                                </span>
                                <span className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-stone-200 text-stone-700 border border-stone-300 flex items-center gap-1">
                                  بدون نیاز به امضا
                                </span>
                              </>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveAttendee(index)}
                            className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="حذف از لیست حاضرین"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>

                        {/* Four Columns of Attendee Information */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5 items-center">
                          {/* 1. Full Name */}
                          <div>
                            <label className="text-[10px] font-bold text-stone-500 block mb-1 flex items-center justify-between">
                              <span>نام و نام خانوادگی</span>
                              {isSystemUser && <span className="text-[9px] text-blue-600 font-bold flex items-center gap-0.5"><Lock size={9} /> غیرقابل تغییر</span>}
                            </label>
                            {isSystemUser ? (
                              <div className="relative">
                                <input
                                  type="text"
                                  readOnly
                                  disabled
                                  value={attendee.name}
                                  className="w-full p-2 pr-7 bg-stone-100/90 border border-stone-300 rounded-xl text-xs font-black text-stone-800 cursor-not-allowed select-none"
                                />
                                <Lock size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
                              </div>
                            ) : (
                              <input
                                type="text"
                                placeholder="نام و نام خانوادگی حاضر دستی..."
                                value={attendee.name}
                                onChange={(e) => handleUpdateAttendee(index, 'name', e.target.value)}
                                className="w-full p-2 bg-white border border-amber-300 rounded-xl text-xs font-bold text-stone-800 focus:border-amber-500 outline-none"
                                required
                              />
                            )}
                          </div>

                          {/* 2. Role */}
                          <div>
                            <label className="text-[10px] font-bold text-stone-500 block mb-1 flex items-center justify-between">
                              <span>سمت در پروژه / جلسه</span>
                              {isSystemUser && <span className="text-[9px] text-blue-600 font-bold flex items-center gap-0.5"><Lock size={9} /> غیرقابل تغییر</span>}
                            </label>
                            {isSystemUser ? (
                              <div className="relative">
                                <input
                                  type="text"
                                  readOnly
                                  disabled
                                  value={attendee.role}
                                  className="w-full p-2 pr-7 bg-stone-100/90 border border-stone-300 rounded-xl text-xs font-black text-stone-800 cursor-not-allowed select-none"
                                />
                                <Lock size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
                              </div>
                            ) : (
                              <input
                                type="text"
                                placeholder="سمت یا عنوان شخص در جلسه..."
                                value={attendee.role}
                                onChange={(e) => handleUpdateAttendee(index, 'role', e.target.value)}
                                className="w-full p-2 bg-white border border-stone-200 rounded-xl text-xs font-bold text-stone-800 focus:border-amber-500 outline-none"
                              />
                            )}
                          </div>

                          {/* 3. Org Type */}
                          <div>
                            <label className="text-[10px] font-bold text-stone-500 block mb-1 flex items-center justify-between">
                              <span>رکن / جایگاه سازمانی</span>
                              {isSystemUser && <span className="text-[9px] text-blue-600 font-bold flex items-center gap-0.5"><Lock size={9} /> غیرقابل تغییر</span>}
                            </label>
                            {isSystemUser ? (
                              <div className="relative">
                                <select
                                  disabled
                                  value={attendee.orgType || 'CONTRACTOR'}
                                  className="w-full p-2 pr-7 bg-stone-100/90 border border-stone-300 rounded-xl text-xs font-black text-stone-800 cursor-not-allowed select-none appearance-none"
                                >
                                  <option value="EMPLOYER">کارفرما ({employerOrgName})</option>
                                  <option value="CONSULTANT">مهندس مشاور ({consultantOrgName})</option>
                                  <option value="CONTRACTOR">پیمانکار اصلی ({contractorOrgName})</option>
                                  <option value="SUB_CONTRACTOR">پیمانکار جزء</option>
                                  <option value="GUEST">مهمان</option>
                                </select>
                                <Lock size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
                              </div>
                            ) : (
                              <select
                                value={attendee.orgType || 'CONTRACTOR'}
                                onChange={(e) => {
                                  const val = e.target.value as any;
                                  const orgName = val === 'EMPLOYER' ? employerOrgName : val === 'CONSULTANT' ? consultantOrgName : val === 'CONTRACTOR' ? contractorOrgName : attendee.organization || '';
                                  handleUpdateAttendee(index, 'orgType', val);
                                  if (orgName) handleUpdateAttendee(index, 'organization', orgName);
                                }}
                                className="w-full p-2 bg-white border border-stone-200 rounded-xl text-xs font-bold text-stone-800 focus:border-amber-500 outline-none"
                              >
                                <option value="CONTRACTOR">پیمانکار اصلی ({contractorOrgName})</option>
                                <option value="CONSULTANT">مهندس مشاور ({consultantOrgName})</option>
                                <option value="EMPLOYER">کارفرما ({employerOrgName})</option>
                                <option value="SUB_CONTRACTOR">پیمانکار جزء / تامین‌کننده</option>
                                <option value="GUEST">مهمان / کارشناس تخصصی</option>
                              </select>
                            )}
                          </div>

                          {/* 4. Organization Name */}
                          <div>
                            <label className="text-[10px] font-bold text-stone-500 block mb-1 flex items-center justify-between">
                              <span>نام سازمان</span>
                              {isSystemUser && <span className="text-[9px] text-blue-600 font-bold flex items-center gap-0.5"><Lock size={9} /> غیرقابل تغییر</span>}
                            </label>
                            {isSystemUser ? (
                              <div className="relative">
                                <input
                                  type="text"
                                  readOnly
                                  disabled
                                  value={attendee.organization || ''}
                                  className="w-full p-2 pr-7 bg-stone-100/90 border border-stone-300 rounded-xl text-xs font-black text-stone-800 cursor-not-allowed select-none"
                                />
                                <Lock size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
                              </div>
                            ) : (
                              <input
                                type="text"
                                placeholder="نام شرکت یا سازمان مربوطه..."
                                value={attendee.organization || ''}
                                onChange={(e) => handleUpdateAttendee(index, 'organization', e.target.value)}
                                className="w-full p-2 bg-white border border-stone-200 rounded-xl text-xs font-bold text-stone-800 focus:border-amber-500 outline-none"
                              />
                            )}
                          </div>
                        </div>

                        {/* Bottom Row: Supervisor/Manager Checkbox & Attendance Status */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-stone-200/60 text-xs">
                          {isEligibleForSupervisorOrManager(attendee) ? (
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={attendee.isManagerOrSupervisor || false}
                                onChange={(e) => handleUpdateAttendee(index, 'isManagerOrSupervisor', e.target.checked)}
                                className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer accent-amber-600"
                              />
                              <span className="font-black text-stone-800">
                                سرپرست کارگاه یا مدیر پروژه این سازمان است (دارای حق تایید قطعی و امضای رسمی سازمان)
                              </span>
                            </label>
                          ) : (
                            <div className="flex items-center gap-1.5 text-stone-400 text-[11px] font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-stone-300 shrink-0" />
                              <span>عضو / کارشناس جلسه (سمت فاقد مسئولیت سرپرستی کارگاه یا مدیریت پروژه است)</span>
                            </div>
                          )}

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] font-bold text-stone-400">وضعیت حضور:</span>
                            <select
                              value={attendee.attendanceStatus || 'PRESENT'}
                              onChange={(e) => handleUpdateAttendee(index, 'attendanceStatus', e.target.value as any)}
                              className="p-1 px-2 bg-white border border-stone-200 rounded-lg text-xs font-bold text-stone-700 outline-none cursor-pointer"
                            >
                              <option value="PRESENT">حاضر</option>
                              <option value="EXCUSED">غایب موجه</option>
                              <option value="ABSENT">غایب</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Absentees section */}
              <div className="pt-4 border-t border-stone-200 space-y-2">
                <label className="text-xs font-black text-stone-700 block">غایبین جلسه (در صورت وجود)</label>
                <div className="flex flex-wrap gap-2 items-center">
                  {formData.absentees.map((abs, idx) => (
                    <span key={idx} className="bg-red-50 text-red-700 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 border border-red-200">
                      {abs}
                      <button type="button" onClick={() => handleRemoveAbsentee(idx)} className="text-red-400 hover:text-red-700">
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      placeholder="نام غایب..."
                      value={newAbsenteeInput}
                      onChange={(e) => setNewAbsenteeInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddAbsentee())}
                      className="p-1.5 px-3 bg-stone-50 border border-stone-200 rounded-lg text-xs font-bold w-36 focus:bg-white focus:border-amber-500 outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddAbsentee}
                      className="p-1.5 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-lg text-xs font-bold"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* STEP 4: Decisions */}
          {activeStep === 'decisions' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-black text-sm text-stone-900">مصوبات، تصمیمات و تکالیف اجرایی جلسه</h4>
                  <p className="text-xs text-stone-500 mt-0.5">ثبت دقیق شرح تصمیمات، رکن متعهد و مهلت اقدام الزامی</p>
                </div>
                <button
                  type="button"
                  onClick={handleAddDecision}
                  className="px-3.5 py-1.5 bg-amber-500 text-stone-950 hover:bg-amber-400 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Plus size={15} /> افزودن بند مصوبه جدید
                </button>
              </div>

              {formData.structuredDecisions.length === 0 ? (
                <div className="p-8 text-center bg-stone-50 border border-dashed border-stone-200 rounded-2xl space-y-3">
                  <CheckSquare size={32} className="mx-auto text-stone-300" />
                  <p className="text-xs font-bold text-stone-500">هیچ مصوبه یا تکلیفی برای این جلسه ثبت نشده است.</p>
                  <p className="text-[11px] text-stone-400">در صورت اتخاذ تصمیم یا تعیین تکلیف اجرایی، با دکمه زیر بند مصوبه جدید اضافه فرمایید.</p>
                  <button
                    type="button"
                    onClick={handleAddDecision}
                    className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 cursor-pointer shadow-sm"
                  >
                    <Plus size={14} />
                    افزودن اولین بند مصوبه
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {formData.structuredDecisions.map((decision, index) => (
                    <div key={index} className="p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <span className="w-6 h-6 rounded-lg bg-stone-900 text-white flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
                          {index + 1}
                        </span>
                        <div className="flex-1">
                          <textarea
                            placeholder="مثال: تهیه و ارائه نقشه‌های چون‌ساخت (ازبیلت) تاسیسات مکانیکی ظرف مدت یک هفته توسط پیمانکار"
                            value={decision.description}
                            onChange={(e) => handleUpdateDecision(index, 'description', e.target.value)}
                            rows={2}
                            className="w-full p-2.5 bg-white border border-stone-200 rounded-xl text-xs font-bold text-stone-900 focus:border-amber-500 outline-none leading-relaxed"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveDecision(index)}
                          className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                          title="حذف مصوبه"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2 border-t border-stone-200/60 text-xs">
                        <div>
                          <label className="text-[10px] font-bold text-stone-500 block mb-1">مسئول اقدام / متعهد</label>
                          <input
                            type="text"
                            placeholder="مثال: پیمانکار اصلی - مهندس تقوی"
                            value={decision.actionParty}
                            onChange={(e) => handleUpdateDecision(index, 'actionParty', e.target.value)}
                            className="w-full p-2 bg-white border border-stone-200 rounded-xl text-xs font-bold text-stone-800 focus:border-amber-500 outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-stone-500 block mb-1">رکن متعهد</label>
                          <select
                            value={decision.actionPartyOrgType || 'CONTRACTOR'}
                            onChange={(e) => handleUpdateDecision(index, 'actionPartyOrgType', e.target.value as any)}
                            className="w-full p-2 bg-white border border-stone-200 rounded-xl text-xs font-bold text-stone-800 focus:border-amber-500 outline-none"
                          >
                            <option value="CONTRACTOR">پیمانکار</option>
                            <option value="CONSULTANT">مهندس مشاور</option>
                            <option value="EMPLOYER">کارفرما</option>
                            <option value="OTHER">ارکان مشترک</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-stone-500 block mb-1">مهلت اقدام</label>
                          <ShamsiDatePicker
                            placeholder="مثال: 1403/08/15"
                            value={decision.deadline || ''}
                            onChange={(val) => handleUpdateDecision(index, 'deadline', val)}
                            inputClassName="!p-2 !bg-white !border-stone-200 !rounded-xl !text-xs !font-bold !text-stone-800 focus:!border-amber-500 !text-center"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-stone-500 block mb-1">اولویت اقدام</label>
                          <select
                            value={decision.priority || 'MEDIUM'}
                            onChange={(e) => handleUpdateDecision(index, 'priority', e.target.value as any)}
                            className="w-full p-2 bg-white border border-stone-200 rounded-xl text-xs font-bold text-stone-800 focus:border-amber-500 outline-none"
                          >
                            <option value="LOW">عادی</option>
                            <option value="MEDIUM">متوسط</option>
                            <option value="HIGH">فوری / بالا</option>
                            <option value="CRITICAL">بحرانی / اضطراری</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STEP 5: Follow-up & Tags */}
          {activeStep === 'followup' && (
            <div className="space-y-5 animate-fadeIn">
              <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-4">
                <h4 className="font-black text-sm text-stone-900">مشخصات جلسه آتی</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-black text-stone-700 block mb-1">تاریخ جلسه بعدی</label>
                    <ShamsiDatePicker
                      placeholder="مثال: 1403/07/22"
                      value={formData.nextMeetingDate}
                      onChange={(val) => setFormData({ ...formData, nextMeetingDate: val })}
                      inputClassName="!p-3 !bg-white !border-stone-200 !rounded-xl !text-xs !font-bold !text-stone-900 focus:!border-amber-500 !text-center"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-black text-stone-700 block mb-1">محل جلسه بعدی</label>
                    <input
                      type="text"
                      placeholder="مثال: دفتر دستگاه نظارت یا سالن جلسات کارگاه"
                      value={formData.nextMeetingLocation}
                      onChange={(e) => setFormData({ ...formData, nextMeetingLocation: e.target.value })}
                      className="w-full p-3 bg-white border border-stone-200 rounded-xl text-xs font-bold text-stone-900 focus:border-amber-500 outline-none"
                    />
                  </div>
                </div>

                {/* Proposed Next Meeting Agenda Items (Multi-row) */}
                <div className="space-y-3 pt-2 border-t border-stone-200/80">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <label className="text-xs font-black text-stone-800 block">دستور کار پیشنهادی جلسه آتی</label>
                      <p className="text-[11px] text-stone-500 mt-0.5">محورها و موضوعات پیشنهادی جهت طرح در جلسه آینده (قابلیت افزودن چندین بند و ردیف)</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddNextAgendaItem}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-2xs self-start sm:self-auto cursor-pointer"
                    >
                      <Plus size={14} />
                      افزودن بند به دستور جلسه آتی
                    </button>
                  </div>

                  {(formData.nextMeetingAgendas || []).length === 0 ? (
                    <div className="p-4 text-center bg-white border border-dashed border-stone-200 rounded-xl space-y-2">
                      <p className="text-xs font-bold text-stone-500">هنوز هیچ بند پیشنهادی برای دستور کار جلسه آینده ثبت نشده است.</p>
                      <button
                        type="button"
                        onClick={handleAddNextAgendaItem}
                        className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus size={13} />
                        افزودن اولین بند دستور کار جلسه آتی
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {(formData.nextMeetingAgendas || []).map((agItem, agIdx) => (
                        <div key={agIdx} className="flex items-center gap-2 p-2 bg-white border border-stone-200 rounded-xl shadow-2xs">
                          <span className="w-6 h-6 rounded-lg bg-stone-100 text-stone-700 flex items-center justify-center font-black text-[11px] shrink-0 border border-stone-200">
                            {agIdx + 1}
                          </span>
                          <input
                            type="text"
                            placeholder={`مثال: پیگیری مصوبات بند ${agIdx + 1} و بررسی صورت‌وضعیت شماره...`}
                            value={agItem}
                            onChange={(e) => handleUpdateNextAgendaItem(agIdx, e.target.value)}
                            className="flex-1 p-2 bg-stone-50 border border-stone-200 rounded-lg text-xs font-bold text-stone-900 focus:bg-white focus:border-amber-500 outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveNextAgendaItem(agIdx)}
                            className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="حذف بند"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-stone-700 block mb-1">ملاحظات و توضیحات تکمیلی دبیرخانه</label>
                <textarea
                  placeholder="مثال: هرگونه یادداشت یا نکته ضروری را در این قسمت درج فرمایید..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-900 focus:bg-white focus:border-amber-500 outline-none"
                />
              </div>

              {/* Tags */}
              <div className="pt-2 border-t border-stone-200">
                <label className="text-xs font-black text-stone-700 block mb-2">برچسب‌ها و موضوعات کلیدی</label>
                <div className="flex flex-wrap gap-2 items-center">
                  {formData.tags.map((tag, idx) => (
                    <span key={idx} className="bg-stone-100 text-stone-700 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 border border-stone-200">
                      <Tag size={12} className="text-amber-600" />
                      {tag}
                      <button type="button" onClick={() => handleRemoveTag(tag)} className="text-stone-400 hover:text-red-500">
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      placeholder="برچسب جدید..."
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                      className="p-1.5 px-3 bg-stone-50 border border-stone-200 rounded-lg text-xs font-bold w-32 focus:bg-white focus:border-amber-500 outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddTag}
                      className="p-1.5 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-lg text-xs font-bold"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer Navigation Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-stone-200">
            <div>
              {activeStep !== 'info' && (
                <button
                  type="button"
                  onClick={() => {
                    if (activeStep === 'followup') setActiveStep('decisions');
                    else if (activeStep === 'decisions') setActiveStep('attendees');
                    else if (activeStep === 'attendees') setActiveStep('agenda');
                    else if (activeStep === 'agenda') setActiveStep('info');
                  }}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition-all"
                >
                  مرحله قبل
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {activeStep !== 'followup' ? (
                <button
                  type="button"
                  onClick={handleGoToNextStep}
                  className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span>مرحله بعد</span>
                  <ChevronRight size={16} className="rotate-180" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-xl text-xs font-black shadow-md shadow-amber-500/20 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <CheckSquare size={16} />
                  <span>ثبت نهایی</span>
                </button>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
