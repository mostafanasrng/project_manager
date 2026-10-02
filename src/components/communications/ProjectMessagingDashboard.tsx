import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  MessageSquare, 
  Send, 
  Paperclip, 
  FileText, 
  Image as ImageIcon, 
  Download, 
  Trash2, 
  X, 
  Search, 
  User, 
  Users, 
  Building2, 
  ShieldCheck, 
  CheckCheck, 
  Check, 
  CornerUpRight, 
  Pin, 
  Plus, 
  AlertCircle, 
  Eye, 
  Lock, 
  Briefcase, 
  HardHat,
  Filter,
  CheckCircle2,
  FileArchive,
  Maximize2,
  Eraser
} from 'lucide-react';
import { SystemUser, Organization, OrganizationType } from '../../../systemAdminTypes';
import { SystemAdminService } from '../../../services/systemAdminService';

export interface ChatAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  dataUrl: string;
}

export type ConversationType = 'GENERAL_CHANNEL' | 'INTERNAL_ORG_CHANNEL' | 'DIRECT_MESSAGE';

export interface ProjectConversation {
  id: string;
  projectId: string;
  type: ConversationType;
  title: string;
  description?: string;
  targetOrgId?: string; // For internal org channels
  participantIds?: string[]; // For direct messages: [user1Id, user2Id]
  isCrossOrg?: boolean;
  pinned?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface ProjectMessage {
  id: string;
  conversationId: string;
  projectId: string;
  senderId: string;
  senderName: string;
  senderRole: 'EMPLOYER' | 'CONSULTANT' | 'CONTRACTOR' | 'SYSTEM_ADMIN';
  senderOrgId?: string;
  senderOrgName: string;
  senderJobTitle?: string;
  recipientId?: string;
  text: string;
  attachments?: ChatAttachment[];
  replyTo?: {
    id: string;
    senderName: string;
    text: string;
  };
  isPinned?: boolean;
  timestamp: string;
  createdAt: number;
}

interface ProjectMessagingDashboardProps {
  selectedProjectId: string;
  projects: any[];
  currentUser: SystemUser | null;
  onUserSwitch?: (user: SystemUser) => void;
}

// Helper: Identify Project Manager (مدیر پروژه)
export const isProjectManagerUser = (user: SystemUser | null | undefined): boolean => {
  if (!user) return false;
  if (user.role === 'SYSTEM_ADMIN') return true;
  if (user.role === 'ORG_ADMIN') return true;
  const level = (user.jobLevel || '').trim();
  const title = (user.jobTitle || '').trim();
  return (
    level.includes('مدیر پروژه') ||
    title.includes('مدیر پروژه') ||
    level.includes('مدیر ارشد') ||
    user.username === 'e-pm' ||
    user.username === 'cs-pm' ||
    user.username === 'c-pm' ||
    user.id === 'morteza' ||
    user.id === 'mohsen' ||
    user.id === 'mostafa'
  );
};

// Helper: Identify Workshop / Site Manager (سرپرست کارگاه / نظارت)
export const isWorkshopManagerUser = (user: SystemUser | null | undefined): boolean => {
  if (!user) return false;
  if (user.role === 'SYSTEM_ADMIN') return true;
  if (user.role === 'ORG_MANAGER') return true;
  const level = (user.jobLevel || '').trim();
  const title = (user.jobTitle || '').trim();
  return (
    level.includes('سرپرست کارگاه') ||
    title.includes('سرپرست کارگاه') ||
    level.includes('سرپرست نظارت') ||
    title.includes('سرپرست نظارت') ||
    level.includes('مدیر نظارت') ||
    title.includes('مدیر نظارت') ||
    level.includes('رئیس کارگاه') ||
    title.includes('مدیر کارگاه') ||
    level.includes('ناظر مقیم') ||
    title.includes('ناظر مقیم') ||
    user.id === 'peyman' ||
    user.id === 'ahmad' ||
    user.id === 'reza'
  );
};

// Helper: Check if user has Leadership authority (PM or Workshop Manager or Admin)
export const isLeadershipUser = (user: SystemUser | null | undefined): boolean => {
  return isProjectManagerUser(user) || isWorkshopManagerUser(user);
};

// Storage keys
const CONVOS_STORAGE_KEY = 'hamyar_communications_conversations_v2';
const MSGS_STORAGE_KEY = 'hamyar_communications_messages_v2';

export const ProjectMessagingDashboard: React.FC<ProjectMessagingDashboardProps> = ({
  selectedProjectId,
  projects,
  currentUser: propCurrentUser,
  onUserSwitch
}) => {
  // State for all users & orgs
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [activeUser, setActiveUser] = useState<SystemUser | null>(propCurrentUser);

  // Conversations & Messages
  const [conversations, setConversations] = useState<ProjectConversation[]>([]);
  const [messages, setMessages] = useState<ProjectMessage[]>([]);
  const [activeConvoId, setActiveConvoId] = useState<string>('general');

  // Search & Filters
  const [sidebarFilter, setSidebarFilter] = useState<'ALL' | 'CHANNELS' | 'DIRECT' | 'CROSS_ORG'>('ALL');
  const [sidebarSearch, setSidebarSearch] = useState<string>('');
  const [convoSearchQuery, setConvoSearchQuery] = useState<string>('');
  const [isConvoSearchOpen, setIsConvoSearchOpen] = useState<boolean>(false);

  // Input & message drafting
  const [draftText, setDraftText] = useState<string>('');
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachment[]>([]);
  const [replyingTo, setReplyingTo] = useState<ProjectMessage | null>(null);

  // Modals
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState<boolean>(false);
  const [newChatSearch, setNewChatSearch] = useState<string>('');
  const [newChatTab, setNewChatTab] = useState<'INTERNAL' | 'MANAGERS_CROSS_ORG'>('INTERNAL');
  const [previewImage, setPreviewImage] = useState<{ src: string; name: string } | null>(null);

  // In-app Toast notifications (iframe safe)
  const [toast, setToast] = useState<{ text: string; type: 'error' | 'success' | 'info' } | null>(null);
  const showToast = (text: string, type: 'error' | 'success' | 'info' = 'info') => {
    setToast({ text, type });
    setTimeout(() => {
      setToast(prev => (prev?.text === text ? null : prev));
    }, 3500);
  };

  // Delete Confirmation Modal & Inline Delete states
  const [inlineDeleteConvoId, setInlineDeleteConvoId] = useState<string | null>(null);
  const [inlineDeleteMsgId, setInlineDeleteMsgId] = useState<string | null>(null);

  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    isOpen: boolean;
    type: 'CONVERSATION' | 'CLEAR_CONVERSATION' | 'MESSAGE';
    targetId: string;
    title: string;
    description: string;
    warning?: string;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync prop currentUser
  useEffect(() => {
    if (propCurrentUser) {
      setActiveUser(propCurrentUser);
    }
  }, [propCurrentUser]);

  // Load users & organizations
  useEffect(() => {
    const loadedUsers = SystemAdminService.getUsers();
    const loadedOrgs = SystemAdminService.getOrganizations();
    setUsers(loadedUsers);
    setOrgs(loadedOrgs);
    if (!activeUser && loadedUsers.length > 0) {
      const current = SystemAdminService.getCurrentUser() || loadedUsers[0];
      setActiveUser(current);
    }
  }, []);

  // Helper to format bytes
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' بایت';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Helper: Get organization for a user
  const getUserOrg = (user: SystemUser | null | undefined): Organization | undefined => {
    if (!user) return undefined;
    return orgs.find(o => o.id === user.orgId);
  };

  // Helper: Get organization type title
  const getOrgTypeLabel = (type?: OrganizationType): string => {
    switch (type) {
      case OrganizationType.CONTRACTOR: return 'پیمانکار';
      case OrganizationType.CONSULTANT: return 'مشاور';
      case OrganizationType.EMPLOYER: return 'کارفرما';
      default: return 'سیستم';
    }
  };

  const getOrgBadgeColor = (type?: OrganizationType): { bg: string; text: string; border: string } => {
    switch (type) {
      case OrganizationType.CONTRACTOR:
        return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' };
      case OrganizationType.CONSULTANT:
        return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' };
      case OrganizationType.EMPLOYER:
        return { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' };
      default:
        return { bg: 'bg-stone-100', text: 'text-stone-700', border: 'border-stone-200' };
    }
  };

  // Initialize conversations and seed data if empty
  useEffect(() => {
    const rawConvos = localStorage.getItem(CONVOS_STORAGE_KEY);
    const rawMsgs = localStorage.getItem(MSGS_STORAGE_KEY);

    let initialConvos: ProjectConversation[] = [];
    let initialMsgs: ProjectMessage[] = [];

    if (rawConvos) {
      try {
        initialConvos = JSON.parse(rawConvos);
      } catch (e) {
        initialConvos = [];
      }
    }

    if (rawMsgs) {
      try {
        initialMsgs = JSON.parse(rawMsgs);
      } catch (e) {
        initialMsgs = [];
      }
    }

    const SEEDED_KEY = 'hamyar_communications_seeded_v2';
    const isSeeded = localStorage.getItem(SEEDED_KEY);

    // Default Seed Data ONLY if never seeded before
    if (!isSeeded && initialConvos.length === 0) {
      initialConvos = [
        {
          id: 'general',
          projectId: selectedProjectId,
          type: 'GENERAL_CHANNEL',
          title: 'کانال عمومی پروژه (ارتباط سه جانبه)',
          description: 'کانال هماهنگی و تبادل نظر مشترک بین کارفرما، مهندس مشاور و پیمانکار',
          createdAt: Date.now() - 86400000 * 5,
          updatedAt: Date.now() - 3600000 * 2
        },
        // Internal Contractor Channel
        {
          id: 'internal_org-3',
          projectId: selectedProjectId,
          type: 'INTERNAL_ORG_CHANNEL',
          title: 'کانال اختصاصی تیم پیمانکار',
          description: 'گفتگوی درون‌سازمانی و محرمانه پرسنل و مهندسین شرکت پیمانکار',
          targetOrgId: 'org-3',
          createdAt: Date.now() - 86400000 * 4,
          updatedAt: Date.now() - 3600000 * 5
        },
        // Internal Consultant Channel
        {
          id: 'internal_org-2',
          projectId: selectedProjectId,
          type: 'INTERNAL_ORG_CHANNEL',
          title: 'کانال اختصاصی تیم مهندسین مشاور',
          description: 'گفتگوی درون‌سازمانی کارشناسان، ناظران و سرپرستان مهندس مشاور',
          targetOrgId: 'org-2',
          createdAt: Date.now() - 86400000 * 4,
          updatedAt: Date.now() - 3600000 * 6
        },
        // Internal Employer Channel
        {
          id: 'internal_org-1',
          projectId: selectedProjectId,
          type: 'INTERNAL_ORG_CHANNEL',
          title: 'کانال اختصاصی دستگاه کارفرما',
          description: 'گفتگوی درون‌سازمانی مدیران و ناظران کارفرما',
          targetOrgId: 'org-1',
          createdAt: Date.now() - 86400000 * 4,
          updatedAt: Date.now() - 3600000 * 8
        },
        // Cross-Org Direct: Contractor PM (morteza) <-> Consultant PM (mohsen)
        {
          id: 'dm_morteza_mohsen',
          projectId: selectedProjectId,
          type: 'DIRECT_MESSAGE',
          title: 'مدیر پروژه پیمانکار / مدیر پروژه مشاور',
          participantIds: ['morteza', 'mohsen'],
          isCrossOrg: true,
          createdAt: Date.now() - 86400000 * 2,
          updatedAt: Date.now() - 3600000 * 3
        },
        // Internal Direct: Contractor PM (morteza) <-> Contractor Site Manager (peyman)
        {
          id: 'dm_morteza_peyman',
          projectId: selectedProjectId,
          type: 'DIRECT_MESSAGE',
          title: 'مدیر پروژه پیمانکار / سرپرست کارگاه',
          participantIds: ['morteza', 'peyman'],
          isCrossOrg: false,
          createdAt: Date.now() - 86400000,
          updatedAt: Date.now() - 1800000
        }
      ];

      // Sample Seed Messages
      initialMsgs = [
        {
          id: 'msg-1',
          conversationId: 'general',
          projectId: selectedProjectId,
          senderId: 'morteza',
          senderName: 'مهندس مرتضی',
          senderRole: 'CONTRACTOR',
          senderOrgId: 'org-3',
          senderOrgName: 'پیمانکاری نوین ساخت',
          senderJobTitle: 'مدیر پروژه',
          text: 'با سلام و احترام، نقشه‌های شاپ دراوینگ زون ۱ به پیوست ارسال شد. لطفاً بررسی بفرمایید.',
          timestamp: '1403/03/10 09:15',
          createdAt: Date.now() - 86400000 * 2,
          attachments: [
            {
              id: 'att-1',
              name: 'ShopDrawing-Foundation-Zone1.pdf',
              size: 2450000,
              type: 'application/pdf',
              dataUrl: 'data:application/pdf;base64,JVBERi0xLjQKJcTl8uXr...'
            }
          ]
        },
        {
          id: 'msg-2',
          conversationId: 'general',
          projectId: selectedProjectId,
          senderId: 'mohsen',
          senderName: 'مهندس محسن',
          senderRole: 'CONSULTANT',
          senderOrgId: 'org-2',
          senderOrgName: 'مشاورین سازه گستر',
          senderJobTitle: 'مدیر پروژه',
          text: 'سلام و تشکر. توسط تیم نظارت مقیم دریافت شد و در دست بررسی فنی قرار گرفت.',
          timestamp: '1403/03/10 10:20',
          createdAt: Date.now() - 86400000 * 2 + 3900000
        },
        {
          id: 'msg-3',
          conversationId: 'general',
          projectId: selectedProjectId,
          senderId: 'mostafa',
          senderName: 'مهندس مصطفی',
          senderRole: 'EMPLOYER',
          senderOrgId: 'org-1',
          senderOrgName: 'شرکت کارفرمایی الف',
          senderJobTitle: 'مدیر پروژه',
          text: 'با تشکر از همکاران محترم. تسریع در فرآیند بررسی و ابلاغ صورتجلسات کارگاهی مورد تاکید است.',
          timestamp: '1403/03/10 11:45',
          createdAt: Date.now() - 86400000 * 2 + 9000000
        },
        // Messages in dm_morteza_mohsen (Cross-Org Leadership communication)
        {
          id: 'msg-4',
          conversationId: 'dm_morteza_mohsen',
          projectId: selectedProjectId,
          senderId: 'morteza',
          senderName: 'مرتضی (مدیر پروژه پیمانکار)',
          senderRole: 'CONTRACTOR',
          senderOrgId: 'org-3',
          senderOrgName: 'پیمانکاری نوین ساخت',
          senderJobTitle: 'مدیر پروژه',
          recipientId: 'mohsen',
          text: 'جناب مهندس محسن سلام، بابت هماهنگی بتن‌ریزی مخزن اصلی نیاز به جلسه فنی فوری داریم.',
          timestamp: '1403/03/11 14:10',
          createdAt: Date.now() - 86400000 + 100000
        },
        {
          id: 'msg-5',
          conversationId: 'dm_morteza_mohsen',
          projectId: selectedProjectId,
          senderId: 'mohsen',
          senderName: 'محسن (مدیر پروژه مشاور)',
          senderRole: 'CONSULTANT',
          senderOrgId: 'org-2',
          senderOrgName: 'مشاورین سازه گستر',
          senderJobTitle: 'مدیر پروژه',
          recipientId: 'morteza',
          text: 'سلام مهندس جان، فردا ساعت ۱۰ صبح در محل کارگاه با سرپرست نظارت خدمتتان هستیم.',
          timestamp: '1403/03/11 14:35',
          createdAt: Date.now() - 86400000 + 1600000
        },
        // Messages in dm_morteza_peyman (Internal Org communication)
        {
          id: 'msg-6',
          conversationId: 'dm_morteza_peyman',
          projectId: selectedProjectId,
          senderId: 'morteza',
          senderName: 'مرتضی',
          senderRole: 'CONTRACTOR',
          senderOrgId: 'org-3',
          senderOrgName: 'پیمانکاری نوین ساخت',
          senderJobTitle: 'مدیر پروژه',
          recipientId: 'peyman',
          text: 'آقا پیمان، مصالح آرماتوربندی برای پارت جدید تامین شد؟ عکس‌های دپوی کارگاه رو هم بفرست.',
          timestamp: '1403/03/12 08:30',
          createdAt: Date.now() - 4000000
        },
        {
          id: 'msg-7',
          conversationId: 'dm_morteza_peyman',
          projectId: selectedProjectId,
          senderId: 'peyman',
          senderName: 'پیمان',
          senderRole: 'CONTRACTOR',
          senderOrgId: 'org-3',
          senderOrgName: 'پیمانکاری نوین ساخت',
          senderJobTitle: 'سرپرست کارگاه',
          recipientId: 'morteza',
          text: 'بله مهندس، تریلی‌ها تخلیه شدند. گزارش بازرسی به همراه تصویر پیوست گردید.',
          timestamp: '1403/03/12 08:45',
          createdAt: Date.now() - 3100000,
          attachments: [
            {
              id: 'att-site-photo',
              name: 'Site-Rebar-Delivery.png',
              size: 450000,
              type: 'image/png',
              dataUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="600" height="400" fill="%23e2e8f0"/><text x="50%25" y="45%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="20" font-weight="bold" fill="%23334155">تصویر دپوی آرماتور کارگاه</text><text x="50%25" y="60%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="14" fill="%2364748b">تایید شده توسط سرپرست کارگاه</text></svg>'
            }
          ]
        }
      ];

      localStorage.setItem(SEEDED_KEY, 'true');
      localStorage.setItem(CONVOS_STORAGE_KEY, JSON.stringify(initialConvos));
      localStorage.setItem(MSGS_STORAGE_KEY, JSON.stringify(initialMsgs));
    } else if (initialConvos.length === 0) {
      initialConvos = [
        {
          id: 'general',
          projectId: selectedProjectId,
          type: 'GENERAL_CHANNEL',
          title: 'کانال عمومی پروژه (ارتباط سه جانبه)',
          description: 'کانال هماهنگی و تبادل نظر مشترک بین کارفرما، مهندس مشاور و پیمانکار',
          createdAt: Date.now() - 86400000 * 5,
          updatedAt: Date.now()
        }
      ];
      localStorage.setItem(CONVOS_STORAGE_KEY, JSON.stringify(initialConvos));
    }

    setConversations(initialConvos);
    setMessages(initialMsgs);
  }, [selectedProjectId]);

  // Persist conversations
  const saveConversations = (newConvos: ProjectConversation[]) => {
    setConversations(newConvos);
    localStorage.setItem(CONVOS_STORAGE_KEY, JSON.stringify(newConvos));
  };

  // Persist messages
  const saveMessages = (newMsgs: ProjectMessage[]) => {
    setMessages(newMsgs);
    localStorage.setItem(MSGS_STORAGE_KEY, JSON.stringify(newMsgs));
  };

  // Active project data
  const currentProject = projects.find(p => p.id === selectedProjectId) || { title: 'پروژه جاری' };
  const userOrg = getUserOrg(activeUser);

  // Authority flags for active user
  const isPM = isProjectManagerUser(activeUser);
  const isWorkshop = isWorkshopManagerUser(activeUser);
  const isLeadership = isLeadershipUser(activeUser);
  const isSysAdmin = activeUser?.role === 'SYSTEM_ADMIN';

  // Determine if active user can access a specific conversation
  const canUserAccessConvo = (convo: ProjectConversation): boolean => {
    if (isSysAdmin) return true;
    if (convo.type === 'GENERAL_CHANNEL') return true;

    if (convo.type === 'INTERNAL_ORG_CHANNEL') {
      // Visible only to users of this specific org
      return convo.targetOrgId === activeUser?.orgId;
    }

    if (convo.type === 'DIRECT_MESSAGE') {
      // Must be one of the participants
      if (!convo.participantIds) return false;
      return convo.participantIds.includes(activeUser?.id || '');
    }

    return true;
  };

  // Filter conversations visible to current user
  const visibleConversations = useMemo(() => {
    return conversations.filter(c => {
      // Must match project or general
      if (c.projectId && c.projectId !== selectedProjectId) return false;
      return canUserAccessConvo(c);
    });
  }, [conversations, selectedProjectId, activeUser, isSysAdmin]);

  // Active Conversation Object
  const activeConvo = useMemo(() => {
    const found = visibleConversations.find(c => c.id === activeConvoId);
    if (found) return found;
    return visibleConversations[0] || null;
  }, [visibleConversations, activeConvoId]);

  // Ensure active convo is valid
  useEffect(() => {
    if (activeConvo && activeConvo.id !== activeConvoId) {
      setActiveConvoId(activeConvo.id);
    }
  }, [activeConvo, activeConvoId]);

  // Messages for active conversation
  const activeMessages = useMemo(() => {
    if (!activeConvo) return [];
    return messages
      .filter(m => m.conversationId === activeConvo.id)
      .sort((a, b) => a.createdAt - b.createdAt);
  }, [messages, activeConvo]);

  // Filter messages by search inside active conversation
  const filteredActiveMessages = useMemo(() => {
    if (!convoSearchQuery.trim()) return activeMessages;
    const q = convoSearchQuery.trim().toLowerCase();
    return activeMessages.filter(m => 
      m.text.toLowerCase().includes(q) ||
      m.senderName.toLowerCase().includes(q) ||
      m.attachments?.some(a => a.name.toLowerCase().includes(q))
    );
  }, [activeMessages, convoSearchQuery]);

  // Auto scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [filteredActiveMessages.length, activeConvoId]);

  // Filtered sidebar conversations
  const filteredSidebarConvos = useMemo(() => {
    let list = visibleConversations;

    if (sidebarFilter === 'CHANNELS') {
      list = list.filter(c => c.type === 'GENERAL_CHANNEL' || c.type === 'INTERNAL_ORG_CHANNEL');
    } else if (sidebarFilter === 'DIRECT') {
      list = list.filter(c => c.type === 'DIRECT_MESSAGE');
    } else if (sidebarFilter === 'CROSS_ORG') {
      list = list.filter(c => c.isCrossOrg);
    }

    if (sidebarSearch.trim()) {
      const q = sidebarSearch.trim().toLowerCase();
      list = list.filter(c => 
        c.title.toLowerCase().includes(q) ||
        (c.description && c.description.toLowerCase().includes(q))
      );
    }

    return list;
  }, [visibleConversations, sidebarFilter, sidebarSearch]);

  // Helper to determine other participant in DM
  const getDmOtherParticipant = (convo: ProjectConversation): SystemUser | undefined => {
    if (!convo.participantIds || convo.participantIds.length === 0) return undefined;
    const otherId = convo.participantIds.find(id => id !== activeUser?.id) || convo.participantIds[0];
    return users.find(u => u.id === otherId);
  };

  // Check if active user can direct message a target user
  const checkCanDirectMessage = (targetUser: SystemUser): { allowed: boolean; reason?: string; isCross: boolean } => {
    if (!activeUser) return { allowed: false, reason: 'کاربر فعال مشخص نیست', isCross: false };
    if (activeUser.id === targetUser.id) return { allowed: false, reason: 'امکان پیام به خود وجود ندارد', isCross: false };

    const isSameOrg = activeUser.orgId === targetUser.orgId;

    if (isSameOrg) {
      // All colleagues within the same organization can message each other freely!
      return { allowed: true, isCross: false };
    }

    // Cross-organization communication check:
    const isTargetLeadership = isLeadershipUser(targetUser);
    const isSenderLeadership = isLeadership;

    if (!isSenderLeadership) {
      return {
        allowed: false,
        reason: 'بر اساس پروتکل پروژه، ارتباط با سایر سازمان‌ها فقط از طریق مدیر پروژه یا سرپرست کارگاه مجاز است.',
        isCross: true
      };
    }

    if (!isTargetLeadership) {
      return {
        allowed: false,
        reason: 'ارتباط بین‌سازمانی فقط با مدیران پروژه یا سرپرستان کارگاه سازمان مقصد مجاز است.',
        isCross: true
      };
    }

    // Both are leadership -> Allowed!
    return { allowed: true, isCross: true };
  };

  // Handler: Start or open direct message with a user
  const handleStartDirectMessage = (targetUser: SystemUser) => {
    const check = checkCanDirectMessage(targetUser);
    if (!check.allowed) {
      showToast(check.reason || 'امکان ارسال پیام وجود ندارد.', 'error');
      return;
    }

    const participants = [activeUser!.id, targetUser.id].sort();
    const existing = conversations.find(c => 
      c.type === 'DIRECT_MESSAGE' &&
      c.participantIds &&
      c.participantIds.length === 2 &&
      c.participantIds.includes(activeUser!.id) &&
      c.participantIds.includes(targetUser.id)
    );

    if (existing) {
      setActiveConvoId(existing.id);
      setIsNewChatModalOpen(false);
      return;
    }

    // Create new DM conversation
    const targetOrg = orgs.find(o => o.id === targetUser.orgId);
    const newConvoId = `dm_${activeUser!.id}_${targetUser.id}_${Date.now()}`;
    const newConvo: ProjectConversation = {
      id: newConvoId,
      projectId: selectedProjectId,
      type: 'DIRECT_MESSAGE',
      title: `${targetUser.fullName || targetUser.username} (${targetUser.jobTitle || targetUser.jobLevel || 'عضو'})`,
      description: `گفتگوی خصوصی با ${targetOrg?.name || 'سازمان'}`,
      participantIds: [activeUser!.id, targetUser.id],
      isCrossOrg: check.isCross,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const updatedConvos = [newConvo, ...conversations];
    saveConversations(updatedConvos);
    setActiveConvoId(newConvoId);
    setIsNewChatModalOpen(false);
  };

  // Handler: Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      if (file.size > 15 * 1024 * 1024) {
        showToast(`حجم فایل «${file.name}» بیش از حد مجاز (۱۵ مگابایت) است.`, 'error');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        const newAttachment: ChatAttachment = {
          id: 'att_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          dataUrl
        };

        setPendingAttachments(prev => [...prev, newAttachment]);
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handler: Remove pending attachment
  const handleRemoveAttachment = (attId: string) => {
    setPendingAttachments(prev => prev.filter(a => a.id !== attId));
  };

  // Handler: Send message
  const handleSendMessage = () => {
    if (!draftText.trim() && pendingAttachments.length === 0) return;
    if (!activeUser || !activeConvo) return;

    const senderOrg = getUserOrg(activeUser);
    let roleType: 'EMPLOYER' | 'CONSULTANT' | 'CONTRACTOR' | 'SYSTEM_ADMIN' = 'CONTRACTOR';
    if (activeUser.role === 'SYSTEM_ADMIN') {
      roleType = 'SYSTEM_ADMIN';
    } else if (senderOrg?.type === OrganizationType.EMPLOYER) {
      roleType = 'EMPLOYER';
    } else if (senderOrg?.type === OrganizationType.CONSULTANT) {
      roleType = 'CONSULTANT';
    } else if (senderOrg?.type === OrganizationType.CONTRACTOR) {
      roleType = 'CONTRACTOR';
    }

    const otherParticipant = getDmOtherParticipant(activeConvo);

    const now = new Date();
    const faDate = now.toLocaleDateString('fa-IR') + ' ' + now.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', hour12: false });

    const newMsg: ProjectMessage = {
      id: 'msg_' + Date.now(),
      conversationId: activeConvo.id,
      projectId: selectedProjectId,
      senderId: activeUser.id,
      senderName: activeUser.fullName || activeUser.username,
      senderRole: roleType,
      senderOrgId: activeUser.orgId,
      senderOrgName: senderOrg?.name || 'سازمان',
      senderJobTitle: activeUser.jobTitle || activeUser.jobLevel,
      recipientId: otherParticipant?.id,
      text: draftText.trim(),
      attachments: pendingAttachments.length > 0 ? [...pendingAttachments] : undefined,
      replyTo: replyingTo ? {
        id: replyingTo.id,
        senderName: replyingTo.senderName,
        text: replyingTo.text
      } : undefined,
      timestamp: faDate,
      createdAt: Date.now()
    };

    const updatedMsgs = [...messages, newMsg];
    saveMessages(updatedMsgs);

    // Update conversation's updatedAt
    const updatedConvos = conversations.map(c => {
      if (c.id === activeConvo.id) {
        return {
          ...c,
          updatedAt: Date.now()
        };
      }
      return c;
    });
    saveConversations(updatedConvos);

    // Reset draft state
    setDraftText('');
    setPendingAttachments([]);
    setReplyingTo(null);
  };

  // Direct execution: Delete conversation and associated messages
  const executeDirectDeleteConversation = (convoId: string) => {
    const convo = conversations.find(c => c.id === convoId);
    if (!convo) return;

    if (convo.type === 'GENERAL_CHANNEL' || convo.id === 'general') {
      showToast('کانال عمومی پروژه قابل حذف نیست.', 'error');
      setInlineDeleteConvoId(null);
      return;
    }

    const updatedConvos = conversations.filter(c => c.id !== convoId);
    saveConversations(updatedConvos);

    const updatedMsgs = messages.filter(m => m.conversationId !== convoId);
    saveMessages(updatedMsgs);

    if (activeConvoId === convoId) {
      setActiveConvoId('general');
    }
    setInlineDeleteConvoId(null);
    showToast('گفتگو و پیام‌های آن با موفقیت حذف گردید.', 'success');
  };

  // Direct execution: Delete single message
  const executeDirectDeleteMessage = (msgId: string) => {
    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;

    const isGeneral = msg.conversationId === 'general';
    if (isGeneral && msg.senderId !== activeUser?.id && !isSysAdmin) {
      showToast('در کانال عمومی پروژه فقط مجاز به حذف پیام‌های ارسالی خود هستید.', 'error');
      setInlineDeleteMsgId(null);
      return;
    }

    const updatedMsgs = messages.filter(m => m.id !== msgId);
    saveMessages(updatedMsgs);
    setInlineDeleteMsgId(null);
    showToast('پیام با موفقیت حذف شد.', 'success');
  };

  // Handler: Request delete conversation (opens safe in-app dialog)
  const requestDeleteConversation = (convoId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }

    const convo = conversations.find(c => c.id === convoId);
    if (!convo) return;

    if (convo.type === 'GENERAL_CHANNEL' || convo.id === 'general') {
      showToast('کانال عمومی پروژه قابل حذف نیست.', 'error');
      return;
    }

    setDeleteConfirmModal({
      isOpen: true,
      type: 'CONVERSATION',
      targetId: convoId,
      title: 'حذف گفتگو از صندوق پیام',
      description: `آیا از حذف کامل «${convo.title}» و کلیه پیام‌های آن اطمینان دارید؟`,
      warning: 'این گفتگو به همراه تمام تاریخچه پیام‌ها و فایل‌های پیوست آن از صندوق حذف خواهد شد.'
    });
  };

  // Handler: Request clear all messages from a conversation
  const requestClearConversationMessages = (convoId: string) => {
    const convo = conversations.find(c => c.id === convoId);
    if (!convo) return;

    if (convo.type === 'GENERAL_CHANNEL' || convo.id === 'general') {
      showToast('امکان پاکسازی کلی پیام‌های کانال عمومی پروژه وجود ندارد.', 'error');
      return;
    }

    setDeleteConfirmModal({
      isOpen: true,
      type: 'CLEAR_CONVERSATION',
      targetId: convoId,
      title: 'پاکسازی پیام‌های گفتگو',
      description: `آیا از پاکسازی تمام پیام‌های «${convo.title}» اطمینان دارید؟`,
      warning: 'گفتگو در صندوق باقی می‌ماند اما کلیه پیام‌ها و فایل‌های درون آن پاک خواهند شد.'
    });
  };

  // Handler: Request delete single message
  const requestDeleteMessage = (msgId: string) => {
    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;

    // General project channel has strict audit protection: only sender or sysadmin can delete
    const isGeneral = msg.conversationId === 'general';
    if (isGeneral && msg.senderId !== activeUser?.id && !isSysAdmin) {
      showToast('در کانال عمومی پروژه فقط مجاز به حذف پیام‌های ارسالی خود هستید.', 'error');
      return;
    }

    setDeleteConfirmModal({
      isOpen: true,
      type: 'MESSAGE',
      targetId: msgId,
      title: 'حذف پیام',
      description: 'آیا از حذف این پیام اطمینان دارید؟',
      warning: 'این پیام از گفتگوی جاری برای تمامی کاربران حذف خواهد شد.'
    });
  };

  // Handler: Execute confirmed deletion
  const handleConfirmDelete = () => {
    if (!deleteConfirmModal) return;
    const { type, targetId } = deleteConfirmModal;

    if (type === 'CONVERSATION') {
      executeDirectDeleteConversation(targetId);
    } else if (type === 'CLEAR_CONVERSATION') {
      const updatedMsgs = messages.filter(m => m.conversationId !== targetId);
      saveMessages(updatedMsgs);
      showToast('کلیه پیام‌های این گفتگو پاکسازی شد.', 'success');
    } else if (type === 'MESSAGE') {
      executeDirectDeleteMessage(targetId);
    }

    setDeleteConfirmModal(null);
  };

  // Handler: Preset quick replies
  const handlePresetMessage = (text: string) => {
    setDraftText(text);
  };

  // Helper: Download attachment
  const handleDownloadAttachment = (att: ChatAttachment) => {
    const link = document.createElement('a');
    link.href = att.dataUrl;
    link.download = att.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Render attachment in message bubble
  const renderAttachmentItem = (att: ChatAttachment) => {
    const isImage = att.type.startsWith('image/');

    if (isImage) {
      return (
        <div key={att.id} className="mt-2 rounded-xl overflow-hidden border border-stone-200/60 bg-stone-50 max-w-sm group relative">
          <img 
            src={att.dataUrl} 
            alt={att.name} 
            className="w-full max-h-52 object-cover cursor-pointer hover:opacity-95 transition-opacity"
            onClick={() => setPreviewImage({ src: att.dataUrl, name: att.name })}
          />
          <div className="p-2 bg-white/95 backdrop-blur-xs flex items-center justify-between border-t border-stone-100">
            <div className="flex items-center gap-1.5 min-w-0">
              <ImageIcon size={13} className="text-amber-600 shrink-0" />
              <span className="text-[10px] font-bold text-stone-700 truncate max-w-[170px]" title={att.name}>{att.name}</span>
              <span className="text-[9px] text-stone-400 font-mono">({formatFileSize(att.size)})</span>
            </div>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setPreviewImage({ src: att.dataUrl, name: att.name })}
                className="p-1 hover:bg-stone-100 rounded text-stone-500 hover:text-stone-800 transition-colors"
                title="مشاهده بزرگ‌تر"
              >
                <Maximize2 size={12} />
              </button>
              <button 
                onClick={() => handleDownloadAttachment(att)}
                className="p-1 hover:bg-stone-100 rounded text-stone-500 hover:text-stone-800 transition-colors"
                title="دانلود تصویر"
              >
                <Download size={12} />
              </button>
            </div>
          </div>
        </div>
      );
    }

    const isPdf = att.type.includes('pdf') || att.name.toLowerCase().endsWith('.pdf');
    const isArchive = att.name.toLowerCase().endsWith('.zip') || att.name.toLowerCase().endsWith('.rar');

    return (
      <div 
        key={att.id} 
        className="mt-2 flex items-center justify-between p-2.5 rounded-xl border border-stone-200 bg-white/90 hover:bg-white shadow-xs max-w-sm transition-all"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`p-2 rounded-lg ${isPdf ? 'bg-red-50 text-red-600' : isArchive ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'}`}>
            {isPdf ? <FileText size={18} /> : isArchive ? <FileArchive size={18} /> : <Paperclip size={18} />}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[11px] font-black text-stone-800 truncate max-w-[190px]" title={att.name}>
              {att.name}
            </span>
            <span className="text-[9px] text-stone-400 font-mono mt-0.5">
              {formatFileSize(att.size)}
            </span>
          </div>
        </div>
        <button
          onClick={() => handleDownloadAttachment(att)}
          className="p-1.5 px-2.5 rounded-lg bg-stone-100 hover:bg-amber-600 hover:text-white text-stone-700 text-[10px] font-black flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
        >
          <Download size={12} />
          دانلود
        </button>
      </div>
    );
  };

  // Filter colleague users for New Chat Modal
  const internalColleagues = useMemo(() => {
    if (!activeUser) return [];
    return users.filter(u => 
      u.id !== activeUser.id &&
      u.orgId === activeUser.orgId &&
      u.isActive !== false &&
      (newChatSearch.trim() === '' || 
        (u.fullName || '').toLowerCase().includes(newChatSearch.toLowerCase()) ||
        (u.jobTitle || '').toLowerCase().includes(newChatSearch.toLowerCase()) ||
        (u.jobLevel || '').toLowerCase().includes(newChatSearch.toLowerCase()))
    );
  }, [users, activeUser, newChatSearch]);

  // Filter cross-organization leadership users for New Chat Modal
  const crossOrgManagers = useMemo(() => {
    if (!activeUser) return [];
    return users.filter(u => 
      u.id !== activeUser.id &&
      u.orgId !== activeUser.orgId &&
      u.isActive !== false &&
      isLeadershipUser(u) &&
      (newChatSearch.trim() === '' || 
        (u.fullName || '').toLowerCase().includes(newChatSearch.toLowerCase()) ||
        (u.jobTitle || '').toLowerCase().includes(newChatSearch.toLowerCase()) ||
        (u.jobLevel || '').toLowerCase().includes(newChatSearch.toLowerCase()) ||
        (orgs.find(o => o.id === u.orgId)?.name || '').toLowerCase().includes(newChatSearch.toLowerCase()))
    );
  }, [users, activeUser, orgs, newChatSearch]);

  return (
    <div className="flex flex-col gap-4">
      {/* Top Banner: Project Messaging System Header with User Role and Context */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-stone-200/80 dark:border-slate-800 p-4 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20 shadow-xs">
            <MessageSquare size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-stone-900 dark:text-white">سامانه پیام و گفتگوی مهندسی پروژه</h3>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-stone-100 dark:bg-slate-800 text-stone-600 dark:text-slate-300 border border-stone-200 dark:border-slate-700">
                {currentProject.title}
              </span>
            </div>
            <p className="text-[11px] text-stone-500 dark:text-slate-400 font-medium mt-0.5">
              ارتباطات رسمی، گفتگوهای درون‌سازمانی با ارسال فایل و پیام مستقیم بین مدیران و سرپرستان کارگاه
            </p>
          </div>
        </div>

        {/* Current User Profile & Role Indicator */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 text-xs">
            <div className="w-8 h-8 rounded-lg bg-stone-900 text-amber-400 flex items-center justify-center font-black text-xs shadow-xs">
              {(activeUser?.fullName || activeUser?.username || 'ک')[0]}
            </div>
            <div className="flex flex-col text-right">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-stone-800 dark:text-slate-100 text-[11px]">{activeUser?.fullName || activeUser?.username}</span>
                {isPM && (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                    مدیر پروژه
                  </span>
                )}
                {isWorkshop && !isPM && (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                    سرپرست کارگاه
                  </span>
                )}
                {isSysAdmin && (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800">
                    مدیر سیستم
                  </span>
                )}
              </div>
              <span className="text-[10px] font-semibold text-stone-500 dark:text-slate-400">
                {userOrg?.name || 'سازمان نامشخص'} • {getOrgTypeLabel(userOrg?.type)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main 2-Column Messaging Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[620px]">
        {/* Right Column: Channels & Conversations Sidebar (5 columns on desktop) */}
        <div className="lg:col-span-4 xl:col-span-4 bg-white dark:bg-slate-900 rounded-2xl border border-stone-200/90 dark:border-slate-800 shadow-xs flex flex-col h-[650px] overflow-hidden">
          {/* Sidebar Top: Search & New Chat Button */}
          <div className="p-3.5 border-b border-stone-100 dark:border-slate-800 flex flex-col gap-2.5 bg-stone-50/70 dark:bg-slate-800/50">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-black text-stone-800 dark:text-white">صندوق پیام و گفتگوها</span>
              <button
                onClick={() => {
                  setNewChatSearch('');
                  setIsNewChatModalOpen(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-stone-900 dark:hover:bg-amber-500 text-white font-black text-[11px] flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              >
                <Plus size={14} />
                گفتگوی جدید
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="جستجو در گفتگوها و کانال‌ها..."
                value={sidebarSearch}
                onChange={(e) => setSidebarSearch(e.target.value)}
                className="w-full pr-8 pl-3 py-1.5 text-xs bg-white dark:bg-slate-800 rounded-xl border border-stone-200 dark:border-slate-700 focus:border-amber-500 outline-none text-stone-800 dark:text-white placeholder-stone-400 dark:placeholder-slate-500 transition-all font-medium"
              />
              {sidebarSearch && (
                <button 
                  onClick={() => setSidebarSearch('')}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar text-[10px]">
              <button
                onClick={() => setSidebarFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all whitespace-nowrap ${
                  sidebarFilter === 'ALL'
                    ? 'bg-stone-900 text-white shadow-xs'
                    : 'bg-white text-stone-600 hover:bg-stone-200/60 border border-stone-200'
                }`}
              >
                همه ({visibleConversations.length})
              </button>
              <button
                onClick={() => setSidebarFilter('CHANNELS')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all whitespace-nowrap ${
                  sidebarFilter === 'CHANNELS'
                    ? 'bg-stone-900 text-white shadow-xs'
                    : 'bg-white text-stone-600 hover:bg-stone-200/60 border border-stone-200'
                }`}
              >
                کانال‌ها
              </button>
              <button
                onClick={() => setSidebarFilter('DIRECT')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all whitespace-nowrap ${
                  sidebarFilter === 'DIRECT'
                    ? 'bg-stone-900 text-white shadow-xs'
                    : 'bg-white text-stone-600 hover:bg-stone-200/60 border border-stone-200'
                }`}
              >
                پیام‌های مستقیم
              </button>
              {isLeadership && (
                <button
                  onClick={() => setSidebarFilter('CROSS_ORG')}
                  className={`px-2 py-1 rounded-lg font-bold transition-all whitespace-nowrap ${
                    sidebarFilter === 'CROSS_ORG'
                      ? 'bg-purple-900 text-white shadow-xs'
                      : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
                  }`}
                  title="پیام‌های بین‌سازمانی میان مدیران پروژه و سرپرستان کارگاه"
                >
                  بین‌سازمانی
                </button>
              )}
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1 divide-y divide-stone-50">
            {filteredSidebarConvos.length === 0 ? (
              <div className="py-12 text-center text-stone-400">
                <MessageSquare size={36} className="mx-auto text-stone-300 mb-2 stroke-1" />
                <p className="text-xs font-bold">گفتگویی یافت نشد</p>
                <p className="text-[10px] mt-1 text-stone-400">از دکمه «گفتگوی جدید» برای شروع پیام استفاده کنید.</p>
              </div>
            ) : (
              filteredSidebarConvos.map(convo => {
                const isSelected = activeConvo?.id === convo.id;
                const isChannel = convo.type === 'GENERAL_CHANNEL' || convo.type === 'INTERNAL_ORG_CHANNEL';
                const isInternalChannel = convo.type === 'INTERNAL_ORG_CHANNEL';
                const isDirect = convo.type === 'DIRECT_MESSAGE';
                const isCross = convo.isCrossOrg;
                const otherUser = isDirect ? getDmOtherParticipant(convo) : undefined;
                const otherOrg = otherUser ? orgs.find(o => o.id === otherUser.orgId) : undefined;

                // Find last message for this convo
                const lastMsg = [...messages].reverse().find(m => m.conversationId === convo.id);

                return (
                  <div
                    key={convo.id}
                    onClick={() => setActiveConvoId(convo.id)}
                    className={`w-full text-right p-3 rounded-xl transition-all flex items-start justify-between gap-2 cursor-pointer group relative ${
                      isSelected
                        ? 'bg-amber-500/10 border border-amber-500/30 text-stone-950 shadow-xs'
                        : 'hover:bg-stone-50 text-stone-700 border border-transparent'
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      {/* Icon / Avatar */}
                      <div className="relative shrink-0 mt-0.5">
                        {convo.type === 'GENERAL_CHANNEL' ? (
                          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center font-black">
                            <Users size={18} />
                          </div>
                        ) : isInternalChannel ? (
                          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center font-black">
                            <Building2 size={18} />
                          </div>
                        ) : isCross ? (
                          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 flex items-center justify-center font-black">
                            <Briefcase size={18} />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-stone-100 text-stone-700 border border-stone-200 flex items-center justify-center font-black">
                            <User size={18} />
                          </div>
                        )}
                        {/* Active indicator dot */}
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white absolute -bottom-0.5 -right-0.5" />
                      </div>

                      {/* Convo Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className={`text-xs font-black truncate ${isSelected ? 'text-stone-900' : 'text-stone-800'}`}>
                            {convo.title}
                          </span>
                          {lastMsg && (
                            <span className="text-[9px] font-medium text-stone-400 shrink-0">
                              {lastMsg.timestamp.split(' ')[1] || lastMsg.timestamp}
                            </span>
                          )}
                        </div>

                        {/* Type Badge & Org */}
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                          {convo.type === 'GENERAL_CHANNEL' && (
                            <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-blue-100/70 text-blue-800 border border-blue-200">
                              کانال عمومی پروژه
                            </span>
                          )}
                          {isInternalChannel && (
                            <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-emerald-100/70 text-emerald-800 border border-emerald-200">
                              درون‌سازمانی
                            </span>
                          )}
                          {isCross && (
                            <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-purple-100/70 text-purple-800 border border-purple-200">
                              بین‌سازمانی مدیران
                            </span>
                          )}
                          {isDirect && !isCross && (
                            <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-stone-100 text-stone-700 border border-stone-200">
                              همکار سازمانی
                            </span>
                          )}
                        </div>

                        {/* Last message text preview */}
                        <p className="text-[11px] text-stone-500 truncate font-medium">
                          {lastMsg ? (
                            <>
                              <span className="font-bold text-stone-700">{lastMsg.senderName.split(' ')[0]}: </span>
                              {lastMsg.text || (lastMsg.attachments ? '📎 پیوست فایل' : '')}
                            </>
                          ) : (
                            convo.description || 'هنوز پیامی ارسال نشده است'
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Delete conversation button with inline confirmation (except general channel) */}
                    {convo.type !== 'GENERAL_CHANNEL' && convo.id !== 'general' && (
                      inlineDeleteConvoId === convo.id ? (
                        <div 
                          onClick={(e) => e.stopPropagation()} 
                          className="flex items-center gap-1 p-1 bg-red-50 border border-red-200 rounded-lg shadow-xs shrink-0 self-center animate-fadeIn z-10"
                        >
                          <span className="text-[10px] font-black text-red-700">حذف؟</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              executeDirectDeleteConversation(convo.id);
                            }}
                            className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] font-black shadow-xs cursor-pointer transition-all active:scale-95"
                            title="تایید حذف گفتگو"
                          >
                            بله
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              setInlineDeleteConvoId(null);
                            }}
                            className="px-1.5 py-0.5 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded text-[10px] font-bold cursor-pointer transition-all"
                            title="انصراف"
                          >
                            خیر
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            setInlineDeleteConvoId(convo.id);
                          }}
                          className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 transition-all shrink-0 self-center cursor-pointer border border-transparent hover:border-red-200"
                          title="حذف این گفتگو و پیام‌های آن از صندوق"
                        >
                          <Trash2 size={15} />
                        </button>
                      )
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Left Column: Active Chat Area (8 columns on desktop) */}
        <div className="lg:col-span-8 xl:col-span-8 bg-white dark:bg-slate-900 rounded-2xl border border-stone-200/90 dark:border-slate-800 shadow-xs flex flex-col h-[650px] overflow-hidden">
          {/* Active Conversation Header */}
          {activeConvo ? (
            <div className="bg-stone-900 text-white p-3.5 px-5 flex items-center justify-between border-b border-stone-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-black">
                  {activeConvo.type === 'GENERAL_CHANNEL' ? (
                    <Users size={20} />
                  ) : activeConvo.type === 'INTERNAL_ORG_CHANNEL' ? (
                    <Building2 size={20} />
                  ) : activeConvo.isCrossOrg ? (
                    <Briefcase size={20} />
                  ) : (
                    <User size={20} />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-black text-sm text-white">{activeConvo.title}</h4>
                    {activeConvo.isCrossOrg && (
                      <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-purple-900 text-purple-200 border border-purple-700 flex items-center gap-1">
                        <Lock size={10} />
                        ارتباط بین‌سازمانی مدیران
                      </span>
                    )}
                    {activeConvo.type === 'INTERNAL_ORG_CHANNEL' && (
                      <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-900 text-emerald-200 border border-emerald-700 flex items-center gap-1">
                        <ShieldCheck size={10} />
                        درون‌سازمانی محرمانه
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-stone-400 mt-0.5 font-medium">
                    {activeConvo.description || 'کانال فعال مکالمات فنی'}
                  </p>
                </div>
              </div>

              {/* Right tools: In-Chat Search, Delete/Clear Tools & Status */}
              <div className="flex items-center gap-1.5">
                {/* Delete / Clear Convo Tools (for all non-general chats) */}
                {activeConvo.type !== 'GENERAL_CHANNEL' && activeConvo.id !== 'general' && (
                  <div className="flex items-center gap-1 border-l border-stone-800 pl-2 ml-1">
                    <button
                      onClick={() => requestClearConversationMessages(activeConvo.id)}
                      className="p-1.5 px-2 rounded-lg text-stone-400 hover:text-amber-300 hover:bg-stone-800 transition-all text-xs flex items-center gap-1 cursor-pointer"
                      title="پاکسازی تمام پیام‌های این گفتگو"
                    >
                      <Eraser size={14} />
                      <span className="hidden md:inline text-[10px] font-bold">پاکسازی پیام‌ها</span>
                    </button>
                    <button
                      onClick={() => requestDeleteConversation(activeConvo.id)}
                      className="p-1.5 px-2 rounded-lg text-stone-400 hover:text-red-400 hover:bg-stone-800 transition-all text-xs flex items-center gap-1 cursor-pointer"
                      title="حذف کامل این گفتگو از صندوق پیام"
                    >
                      <Trash2 size={14} />
                      <span className="hidden md:inline text-[10px] font-bold">حذف گفتگو</span>
                    </button>
                  </div>
                )}

                <button
                  onClick={() => setIsConvoSearchOpen(!isConvoSearchOpen)}
                  className={`p-2 rounded-xl transition-all ${
                    isConvoSearchOpen ? 'bg-amber-500 text-stone-950 font-black' : 'hover:bg-stone-800 text-stone-400 hover:text-white'
                  }`}
                  title="جستجو در متن پیام‌ها"
                >
                  <Search size={16} />
                </button>
                <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-800/80 border border-stone-700/60">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] font-bold text-stone-300">برخط</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-stone-900 text-white font-bold text-xs">هیچ گفتگویی انتخاب نشده است</div>
          )}

          {/* In-Convo Search Bar */}
          {isConvoSearchOpen && (
            <div className="bg-stone-100 p-2.5 px-4 border-b border-stone-200 flex items-center gap-2 animate-in slide-in-from-top-1 duration-150">
              <Search size={14} className="text-stone-500" />
              <input
                type="text"
                placeholder="عبارت مورد نظر جهت جستجو در این گفتگو..."
                value={convoSearchQuery}
                onChange={(e) => setConvoSearchQuery(e.target.value)}
                className="flex-1 bg-white px-3 py-1.5 rounded-lg text-xs border border-stone-200 focus:border-amber-500 outline-none text-stone-800"
                autoFocus
              />
              {convoSearchQuery && (
                <button 
                  onClick={() => setConvoSearchQuery('')}
                  className="text-stone-400 hover:text-stone-700 text-xs font-bold"
                >
                  پاک کردن
                </button>
              )}
              <button 
                onClick={() => {
                  setConvoSearchQuery('');
                  setIsConvoSearchOpen(false);
                }}
                className="p-1 hover:bg-stone-200 rounded text-stone-500"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Messages Stream Container */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-[#fbf9f5] flex flex-col">
            {filteredActiveMessages.length === 0 ? (
              <div className="my-auto text-center text-stone-400 py-12">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto mb-3 border border-amber-500/20">
                  <MessageSquare size={28} />
                </div>
                <h5 className="text-xs font-black text-stone-700">هنوز پیامی در این گفتگو ثبت نشده است</h5>
                <p className="text-[11px] text-stone-400 mt-1 max-w-xs mx-auto leading-relaxed">
                  می‌توانید پیام متنی بنویسید یا اسناد، فایل‌های فنی و تصاویر کارگاهی را پیوست کنید.
                </p>
              </div>
            ) : (
              filteredActiveMessages.map((msg) => {
                const isMe = msg.senderId === activeUser?.id;
                const senderOrg = orgs.find(o => o.id === msg.senderOrgId);
                const orgColors = getOrgBadgeColor(senderOrg?.type);

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col max-w-[85%] sm:max-w-[75%] ${
                      isMe ? 'self-start mr-auto text-left' : 'self-end ml-auto text-right'
                    } group`}
                  >
                    {/* Sender Info Line */}
                    <div className={`flex items-center gap-1.5 text-[10px] text-stone-500 font-bold mb-1 px-1 ${isMe ? 'flex-row' : 'flex-row-reverse'}`}>
                      <span className="text-stone-800 font-black">{msg.senderName}</span>
                      {msg.senderJobTitle && (
                        <span className="text-stone-400 font-medium">({msg.senderJobTitle})</span>
                      )}
                      <span className={`text-[9px] px-1.5 py-0.2 rounded-md font-black border ${orgColors.bg} ${orgColors.text} ${orgColors.border}`}>
                        {msg.senderOrgName}
                      </span>
                    </div>

                    {/* Message Card Bubble */}
                    <div
                      className={`p-3.5 sm:p-4 rounded-2xl shadow-xs text-xs leading-relaxed font-medium whitespace-pre-wrap relative transition-all ${
                        isMe
                          ? 'bg-amber-600 text-white rounded-tl-none'
                          : 'bg-white text-stone-800 border border-stone-200/90 rounded-tr-none'
                      }`}
                    >
                      {/* Quoted / Reply Preview inside bubble */}
                      {msg.replyTo && (
                        <div className={`mb-2.5 p-2 rounded-xl border-r-2 text-[10px] ${
                          isMe 
                            ? 'bg-amber-700/50 border-amber-300 text-amber-100' 
                            : 'bg-stone-100 border-amber-500 text-stone-600'
                        }`}>
                          <span className="font-black block">{msg.replyTo.senderName}:</span>
                          <span className="truncate block opacity-90">{msg.replyTo.text}</span>
                        </div>
                      )}

                      {/* Main Message Text */}
                      {msg.text && (
                        <p className="whitespace-pre-wrap leading-relaxed select-text font-semibold">
                          {msg.text}
                        </p>
                      )}

                      {/* Attached Files List */}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="mt-2 space-y-1.5">
                          {msg.attachments.map(att => renderAttachmentItem(att))}
                        </div>
                      )}

                      {/* Message Footer: Timestamp, Reply Action, Delete Action */}
                      <div className={`flex items-center justify-between gap-3 mt-2 pt-1 border-t text-[9px] ${
                        isMe ? 'border-amber-500/40 text-amber-100' : 'border-stone-100 text-stone-400'
                      }`}>
                        <div className="flex items-center gap-1.5">
                          <span>{msg.timestamp}</span>
                          {isMe && <CheckCheck size={12} className="text-amber-200 inline" />}
                        </div>

                        {/* Hover Action Buttons */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setReplyingTo(msg)}
                            className="p-1 hover:bg-black/10 rounded transition-colors"
                            title="پاسخ به این پیام"
                          >
                            <CornerUpRight size={12} />
                          </button>
                          {(activeConvo?.type !== 'GENERAL_CHANNEL' || isMe || isSysAdmin) && (
                            inlineDeleteMsgId === msg.id ? (
                              <div 
                                onClick={(e) => e.stopPropagation()} 
                                className="flex items-center gap-1 p-0.5 px-1 bg-red-600/90 text-white rounded text-[9px] font-black shadow-xs animate-fadeIn"
                              >
                                <span>حذف؟</span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    executeDirectDeleteMessage(msg.id);
                                  }}
                                  className="px-1 py-0.2 bg-white text-red-600 rounded font-black hover:bg-stone-100 cursor-pointer"
                                >
                                  بله
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setInlineDeleteMsgId(null);
                                  }}
                                  className="px-1 py-0.2 bg-red-800 text-white rounded hover:bg-red-900 cursor-pointer"
                                >
                                  خیر
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setInlineDeleteMsgId(msg.id);
                                }}
                                className={`p-1 hover:bg-black/10 rounded transition-colors cursor-pointer ${
                                  isMe ? 'hover:text-red-200' : 'hover:text-red-500 text-stone-400'
                                }`}
                                title="حذف این پیام"
                              >
                                <Trash2 size={12} />
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Engineering Presets Chips (پیام‌های آماده مهندسی و کارگاهی) */}
          <div className="bg-stone-50 p-2 px-4 border-t border-stone-200/80 flex gap-2 overflow-x-auto no-scrollbar shrink-0">
            {[
              "دستور کار ارجاع و در دست اقدام است.",
              "مدارک فنی و نقشه‌های کارگاهی جهت بررسی پیوست شد.",
              "بازدید میدانی توسط دستگاه نظارت انجام شد.",
              "هماهنگی‌های لازم با کارگاه صورت پذیرفت.",
              "لطفاً صورت‌جلسه مربوطه را بررسی و تایید فرمایید."
            ].map(preset => (
              <button
                key={preset}
                onClick={() => handlePresetMessage(preset)}
                className="px-2.5 py-1 bg-white hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300 rounded-lg text-[10px] font-bold text-stone-600 border border-stone-200 whitespace-nowrap cursor-pointer transition-all shadow-xs"
              >
                {preset}
              </button>
            ))}
          </div>

          {/* Reply Banner (if replying to a message) */}
          {replyingTo && (
            <div className="p-2 px-4 bg-amber-50 border-t border-amber-200 flex items-center justify-between text-xs text-amber-900 shrink-0">
              <div className="flex items-center gap-2 overflow-hidden">
                <CornerUpRight size={14} className="text-amber-600 shrink-0" />
                <span className="font-bold text-[11px] shrink-0">پاسخ به {replyingTo.senderName}:</span>
                <span className="text-[11px] text-amber-800 truncate">{replyingTo.text}</span>
              </div>
              <button
                onClick={() => setReplyingTo(null)}
                className="p-1 hover:bg-amber-100 rounded text-amber-700 shrink-0"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Pending Attachments Strip (before sending) */}
          {pendingAttachments.length > 0 && (
            <div className="p-2 px-4 bg-stone-100 border-t border-stone-200 flex items-center gap-2 overflow-x-auto shrink-0">
              <span className="text-[11px] font-black text-stone-600 shrink-0">فایل‌های پیوست ({pendingAttachments.length}):</span>
              {pendingAttachments.map(att => (
                <div key={att.id} className="flex items-center gap-1.5 px-2.5 py-1 bg-white rounded-lg border border-stone-200 text-xs shadow-xs shrink-0">
                  <Paperclip size={12} className="text-amber-600" />
                  <span className="font-bold text-[10px] text-stone-800 max-w-[140px] truncate">{att.name}</span>
                  <span className="text-[9px] text-stone-400">({formatFileSize(att.size)})</span>
                  <button 
                    onClick={() => handleRemoveAttachment(att.id)}
                    className="p-0.5 hover:text-red-500 rounded text-stone-400"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Message Input Controls Area */}
          <div className="p-3 bg-white border-t border-stone-200/90 flex items-center gap-2 shrink-0">
            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              multiple
              className="hidden"
              accept=".pdf,.png,.jpg,.jpeg,.webp,.dwg,.dxf,.xlsx,.xls,.docx,.doc,.zip,.rar"
            />

            {/* Attach File Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 rounded-xl hover:bg-amber-50 hover:text-amber-700 text-stone-500 border border-stone-200 transition-all flex items-center justify-center cursor-pointer shadow-xs"
              title="پیوست فایل، تصویر یا نقشه فنی (تا ۱۵ مگابایت)"
            >
              <Paperclip size={18} />
            </button>

            {/* Text Input */}
            <input
              type="text"
              placeholder={`پیام خود را به عنوان ${activeUser?.fullName || 'کاربر'} بنویسید...`}
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              className="flex-1 p-2.5 px-4 bg-stone-50 hover:bg-stone-100/70 focus:bg-white rounded-xl font-bold text-xs border border-stone-200 focus:border-amber-500 transition-all outline-none text-stone-900"
            />

            {/* Send Button */}
            <button
              onClick={handleSendMessage}
              disabled={!draftText.trim() && pendingAttachments.length === 0}
              className="p-2.5 px-4 bg-amber-600 hover:bg-stone-900 disabled:opacity-40 disabled:hover:bg-amber-600 text-white rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer font-bold text-xs"
            >
              <Send size={15} />
              <span className="hidden sm:inline">ارسال</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal: New Chat / User Directory Modal */}
      {isNewChatModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-stone-950/70 backdrop-blur-sm p-4 animate-fadeIn" dir="rtl">
          <div className="bg-white rounded-3xl border border-stone-200 shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[85vh] animate-scaleIn">
            {/* Modal Header */}
            <div className="p-4 px-6 bg-stone-900 text-white flex items-center justify-between border-b border-stone-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <MessageSquare size={16} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white">شروع گفتگوی جدید</h4>
                  <p className="text-[10px] text-stone-400">انتخاب مخاطب بر اساس سطح دسترسی و مقررات پروژه</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNewChatModalOpen(false)}
                className="p-1.5 hover:bg-stone-800 rounded-xl text-stone-400 hover:text-white transition-all cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Tabs for Internal vs Cross-Org Leadership */}
            <div className="flex border-b border-stone-200 bg-stone-50 p-2 gap-2">
              <button
                type="button"
                onClick={() => setNewChatTab('INTERNAL')}
                className={`flex-1 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  newChatTab === 'INTERNAL'
                    ? 'bg-white text-stone-900 shadow-xs border border-stone-200'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                <Users size={15} />
                همکاران سازمان من (درون‌سازمانی)
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800">
                  {internalColleagues.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setNewChatTab('MANAGERS_CROSS_ORG')}
                className={`flex-1 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  newChatTab === 'MANAGERS_CROSS_ORG'
                    ? 'bg-purple-900 text-white shadow-xs'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                <Briefcase size={15} />
                مدیران سایر سازمان‌ها (بین‌سازمانی)
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isLeadership ? 'bg-purple-200 text-purple-900' : 'bg-stone-200 text-stone-600'}`}>
                  {isLeadership ? crossOrgManagers.length : 'محدود'}
                </span>
              </button>
            </div>

            {/* Search within contacts */}
            <div className="p-3 px-4 border-b border-stone-100 bg-white">
              <div className="relative">
                <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  placeholder="جستجوی نام، سمت، واحد یا عنوان شغلی..."
                  value={newChatSearch}
                  onChange={(e) => setNewChatSearch(e.target.value)}
                  className="w-full pr-8 pl-3 py-2 text-xs bg-stone-50 rounded-xl border border-stone-200 focus:border-amber-500 outline-none text-stone-800 font-medium"
                />
              </div>
            </div>

            {/* Contacts Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 max-h-[400px]">
              {newChatTab === 'INTERNAL' && (
                <>
                  <div className="p-2.5 bg-emerald-50/70 rounded-xl border border-emerald-200 text-[11px] text-emerald-900 flex items-center gap-2 mb-2 font-medium">
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                    ارتباط درون‌سازمانی: کلیه پرسنل سازمان می‌توانند آزادانه به یکدیگر پیام متنی و فایل ارسال نمایند.
                  </div>

                  {internalColleagues.length === 0 ? (
                    <div className="py-8 text-center text-stone-400 text-xs">همکاری با این مشخصات یافت نشد</div>
                  ) : (
                    internalColleagues.map(user => {
                      const uIsPm = isProjectManagerUser(user);
                      const uIsSite = isWorkshopManagerUser(user);
                      return (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => handleStartDirectMessage(user)}
                          className="w-full p-3 rounded-2xl border border-stone-200 hover:border-amber-500 hover:bg-amber-50/40 transition-all flex items-center justify-between text-right cursor-pointer group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-stone-100 group-hover:bg-amber-500 group-hover:text-white text-stone-800 flex items-center justify-center font-black text-sm transition-colors">
                              {(user.fullName || user.username)[0]}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-black text-xs text-stone-900">{user.fullName || user.username}</span>
                                {uIsPm && (
                                  <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 border border-purple-200">
                                    مدیر پروژه
                                  </span>
                                )}
                                {uIsSite && !uIsPm && (
                                  <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-200">
                                    سرپرست کارگاه
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-stone-500 mt-0.5">
                                {user.jobTitle || user.jobLevel || 'عضو سازمان'} {user.department ? `• واحد ${user.department}` : ''}
                              </p>
                            </div>
                          </div>
                          <span className="text-[11px] font-black text-amber-600 group-hover:underline flex items-center gap-1">
                            ارسال پیام
                            <Send size={12} />
                          </span>
                        </button>
                      );
                    })
                  )}
                </>
              )}

              {newChatTab === 'MANAGERS_CROSS_ORG' && (
                <>
                  {!isLeadership ? (
                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 flex flex-col gap-2">
                      <div className="flex items-center gap-2 font-black text-amber-800">
                        <Lock size={18} className="text-amber-600 shrink-0" />
                        <span>ارتباط بین‌سازمانی منحصراً ویژه مدیران پروژه و سرپرستان کارگاه است</span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-stone-600 font-medium">
                        طبق مفاد سیستم مدیریت پروژه و پروتکل هماهنگی‌های کارگاهی، مکاتبه و پیام مستقیم با اعضای سایر سازمان‌ها (پیمانکار، مشاور، کارفرما) صرفاً در صلاحیت <strong>مدیر پروژه</strong> و <strong>سرپرست کارگاه</strong> سازمان شما می‌باشد.
                      </p>
                      <p className="text-[11px] text-stone-500 mt-1">
                        جهت طرح موضوع با سایر ارکان پروژه، لطفاً پیام خود را از طریق کانال عمومی پروژه یا به مدیر پروژه / سرپرست کارگاه سازمان خود ارجاع فرمایید.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="p-2.5 bg-purple-50 rounded-xl border border-purple-200 text-[11px] text-purple-900 flex items-center gap-2 mb-2 font-medium">
                        <ShieldCheck size={16} className="text-purple-600 shrink-0" />
                        شما به عنوان مدیر پروژه / سرپرست کارگاه مجاز به ارسال پیام مستقیم و فایل به مدیران و سرپرستان کارگاه سایر ارکان پروژه هستید.
                      </div>

                      {crossOrgManagers.length === 0 ? (
                        <div className="py-8 text-center text-stone-400 text-xs">مدیری با این مشخصات یافت نشد</div>
                      ) : (
                        crossOrgManagers.map(user => {
                          const targetOrg = orgs.find(o => o.id === user.orgId);
                          const orgColors = getOrgBadgeColor(targetOrg?.type);
                          const uIsPm = isProjectManagerUser(user);
                          const uIsSite = isWorkshopManagerUser(user);

                          return (
                            <button
                              key={user.id}
                              type="button"
                              onClick={() => handleStartDirectMessage(user)}
                              className="w-full p-3 rounded-2xl border border-stone-200 hover:border-purple-500 hover:bg-purple-50/40 transition-all flex items-center justify-between text-right cursor-pointer group"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-purple-100 group-hover:bg-purple-700 group-hover:text-white text-purple-800 flex items-center justify-center font-black text-sm transition-colors">
                                  {(user.fullName || user.username)[0]}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-black text-xs text-stone-900">{user.fullName || user.username}</span>
                                    {uIsPm ? (
                                      <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 border border-purple-200">
                                        مدیر پروژه
                                      </span>
                                    ) : uIsSite ? (
                                      <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-200">
                                        سرپرست کارگاه
                                      </span>
                                    ) : null}
                                    <span className={`text-[9px] px-1.5 py-0.2 rounded-md font-black border ${orgColors.bg} ${orgColors.text} ${orgColors.border}`}>
                                      {targetOrg?.name || 'سازمان'}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-stone-500 mt-0.5">
                                    {user.jobTitle || user.jobLevel || 'مدیر ارشد'} • {getOrgTypeLabel(targetOrg?.type)}
                                  </p>
                                </div>
                              </div>
                              <span className="text-[11px] font-black text-purple-700 group-hover:underline flex items-center gap-1">
                                گفتگو
                                <Send size={12} />
                              </span>
                            </button>
                          );
                        })
                      )}
                    </>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 px-6 bg-stone-50 border-t border-stone-200 flex justify-end">
              <button
                type="button"
                onClick={() => setIsNewChatModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-200 transition-colors cursor-pointer"
              >
                بستن
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Image Preview Lightbox Modal */}
      {previewImage && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-stone-950/80 backdrop-blur-md p-4 animate-fadeIn"
          onClick={() => setPreviewImage(null)}
          dir="rtl"
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <div className="w-full flex items-center justify-between text-white mb-2 px-2">
              <span className="text-xs font-bold truncate max-w-md">{previewImage.name}</span>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="p-1.5 bg-white/20 hover:bg-white/30 rounded-xl text-white transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <img
              src={previewImage.src}
              alt={previewImage.name}
              className="max-w-full max-h-[80vh] rounded-2xl object-contain shadow-2xl border border-white/20"
            />
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Modal (Portal Rendered) */}
      {deleteConfirmModal && deleteConfirmModal.isOpen && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-sm animate-fadeIn"
          onClick={() => setDeleteConfirmModal(null)}
          dir="rtl"
        >
          <div 
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 flex flex-col gap-4 text-right animate-scaleIn"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center font-black shrink-0 border border-red-100">
                  <Trash2 size={20} />
                </div>
                <div>
                  <h3 className="font-black text-stone-900 text-base">{deleteConfirmModal.title}</h3>
                  <span className="text-[11px] font-bold text-stone-500">تایید عملیات حذف</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeleteConfirmModal(null)}
                className="p-1.5 rounded-xl hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-stone-700 text-xs font-semibold leading-relaxed">
              {deleteConfirmModal.description}
            </p>

            {deleteConfirmModal.warning && (
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-[11px] font-bold flex items-start gap-2">
                <AlertCircle size={16} className="shrink-0 mt-0.5 text-amber-600" />
                <span>{deleteConfirmModal.warning}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-stone-100 mt-1">
              <button
                type="button"
                onClick={() => setDeleteConfirmModal(null)}
                className="px-4 py-2.5 rounded-xl text-stone-600 hover:bg-stone-100 text-xs font-bold transition-all cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black transition-all shadow-md shadow-red-600/20 flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <Trash2 size={14} />
                <span>بله، حذف شود</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* In-App Toast Notification (Portal Rendered) */}
      {toast && typeof document !== 'undefined' && createPortal(
        <div 
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[99999] px-5 py-3 rounded-2xl shadow-2xl border text-xs font-black flex items-center gap-2.5 animate-fadeIn ${
            toast.type === 'error'
              ? 'bg-red-600 text-white border-red-700 shadow-red-600/30'
              : toast.type === 'success'
              ? 'bg-emerald-600 text-white border-emerald-700 shadow-emerald-600/30'
              : 'bg-stone-900 text-white border-stone-800 shadow-stone-900/40'
          }`}
          dir="rtl"
        >
          {toast.type === 'error' ? (
            <AlertCircle size={16} className="shrink-0" />
          ) : toast.type === 'success' ? (
            <CheckCircle2 size={16} className="shrink-0" />
          ) : (
            <AlertCircle size={16} className="shrink-0" />
          )}
          <span>{toast.text}</span>
          <button 
            type="button"
            onClick={() => setToast(null)} 
            className="p-1 hover:bg-white/20 rounded mr-2 cursor-pointer"
            title="بستن"
          >
            <X size={13} />
          </button>
        </div>,
        document.body
      )}
    </div>
  );
};
