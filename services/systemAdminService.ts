
import { Organization, OrganizationType, SystemProject, OrgProjectAccess, SystemUser, ModuleId, UserPermission } from '../systemAdminTypes';
import { MOCK_PROJECTS } from '../constants';

const ORG_KEY = 'system_admin_organizations';
const PROJECT_KEY = 'hamyar_projects';
const ACCESS_KEY = 'system_admin_access';
const USER_KEY = 'system_admin_users';

const generateUserDefaultSignature = (name?: string): string => {
  const n = name || 'امضاء';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 70" width="180" height="70">
    <path d="M 20,45 Q 50,15 80,40 T 130,35 Q 155,25 165,48 Q 135,58 95,54 Q 50,58 20,45 Z" fill="none" stroke="#1e3a8a" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M 35,30 Q 65,10 95,28 Q 125,46 150,22" fill="none" stroke="#2563eb" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M 45,50 C 75,62 115,62 145,46" fill="none" stroke="#1d4ed8" stroke-width="1.8" stroke-linecap="round"/>
    <text x="90" y="65" font-family="Tahoma, Arial, sans-serif" font-size="11" font-weight="bold" fill="#1e3a8a" text-anchor="middle">${n}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

export const SystemAdminService = {
  // --- Organizations ---
  getOrganizations: (): Organization[] => {
    const data = localStorage.getItem(ORG_KEY);
    if (!data) return [];
    try {
      const orgs: Organization[] = JSON.parse(data);
      return orgs.map(o => ({
        ...o,
        name: o.name ? o.name.replace(/\s*\((کارفرما|مشاور|پیمانکار)\)\s*$/gi, '').trim() : o.name
      }));
    } catch (e) {
      return [];
    }
  },
  
  getOrganization: (id: string): Organization | undefined => {
    return SystemAdminService.getOrganizations().find(o => o.id === id);
  },

  getOrgLogo: (orgIdOrName?: string, type?: OrganizationType): string | undefined => {
    if (!orgIdOrName && !type) return undefined;
    const orgs = SystemAdminService.getOrganizations();
    const cleanQuery = (orgIdOrName || '').trim().toLowerCase();
    
    let found = orgs.find(o => o.id === orgIdOrName || (o.name && o.name.trim().toLowerCase() === cleanQuery));
    if (!found && cleanQuery) {
      found = orgs.find(o => o.name && (cleanQuery.includes(o.name.trim().toLowerCase()) || o.name.trim().toLowerCase().includes(cleanQuery)));
    }
    if (!found && type) {
      found = orgs.find(o => o.type === type);
    }
    return found?.logo;
  },

  getProjectOrgLogos: (projectIdOrProject?: any) => {
    let project: any = null;
    if (typeof projectIdOrProject === 'object' && projectIdOrProject !== null) {
      project = projectIdOrProject;
    } else if (typeof projectIdOrProject === 'string') {
      const projects = SystemAdminService.getProjects();
      project = projects.find(p => String(p.id) === String(projectIdOrProject));
    }
    
    const orgs = SystemAdminService.getOrganizations();
    const employerOrg = orgs.find(o => o.type === OrganizationType.EMPLOYER || (project?.employerName && o.name === project.employerName));
    const consultantOrg = orgs.find(o => o.type === OrganizationType.CONSULTANT || (project?.consultantName && o.name === project.consultantName));
    const contractorOrg = orgs.find(o => o.type === OrganizationType.CONTRACTOR || (project?.contractorName && o.name === project.contractorName));

    return {
      employerLogo: employerOrg?.logo,
      consultantLogo: consultantOrg?.logo,
      contractorLogo: contractorOrg?.logo,
      employerOrg,
      consultantOrg,
      contractorOrg
    };
  },

  saveOrganization: (org: Organization) => {
    const orgs = SystemAdminService.getOrganizations();
    const index = orgs.findIndex(o => o.id === org.id);
    const isNew = index < 0;
    if (index >= 0) {
      orgs[index] = org;
    } else {
      orgs.push(org);
    }
    localStorage.setItem(ORG_KEY, JSON.stringify(orgs));
    
    SystemAdminService.addAuditLog({
      action: isNew ? 'CREATE_ORG' : 'UPDATE_ORG',
      details: `${isNew ? 'ایجاد' : 'ویرایش'} سازمان ${org.name} (کد: ${org.code})`,
      source: 'مدیریت سازمان‌ها',
      sourceType: 'ADMIN'
    });
  },

  deleteOrganization: (id: string) => {
    const target = SystemAdminService.getOrganization(id);
    const orgs = SystemAdminService.getOrganizations().filter(o => o.id !== id);
    localStorage.setItem(ORG_KEY, JSON.stringify(orgs));

    if (target) {
      SystemAdminService.addAuditLog({
        action: 'DELETE_ORG',
        details: `حذف سازمان ${target.name} (ID: ${id})`,
        source: 'مدیریت سازمان‌ها',
        sourceType: 'ADMIN'
      });
    }
  },

  // --- Projects (Synced with Main App) ---
  getProjects: (): SystemProject[] => {
    let projects: any[] = [];
    try {
      const data = localStorage.getItem(PROJECT_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          projects = parsed.filter((p: any) => p.id !== '2' && !String(p.title || p.name || '').includes('تصفیه‌خانه مرکزی') && !String(p.title || p.name || '').includes('تسویه خانه مرکزی') && !String(p.title || p.name || '').includes('نیایش'));
        } else {
          projects = MOCK_PROJECTS;
        }
      } else {
        projects = MOCK_PROJECTS;
      }
    } catch (e) {
      projects = MOCK_PROJECTS;
    }

    return projects.map((p: any) => ({
      id: String(p.id),
      name: p.title || p.name || 'بدون عنوان',
      code: p.contractNumber || p.code || '',
      isActive: p.status !== 'ARCHIVED' && p.status !== 'DELETED',
      status: p.status || 'REGISTERED',
      employerName: p.employerName,
      consultantName: p.consultantName,
      contractorName: p.contractorName,
      createdByUsername: p.createdByUsername,
      createdByRole: p.createdByRole,
      createdByJobLevel: p.createdByJobLevel,
    }));
  },

  saveProject: (project: SystemProject) => {
    let projects: any[] = [];
    try {
      const data = localStorage.getItem(PROJECT_KEY);
      if (data) projects = JSON.parse(data);
      else projects = MOCK_PROJECTS;
    } catch(e) { projects = MOCK_PROJECTS; }

    const index = projects.findIndex((p: any) => p.id === project.id);
    if (index >= 0) {
      // Update existing
      projects[index] = {
        ...projects[index],
        title: project.name,
        contractNumber: project.code,
        status: project.isActive ? 'ACTIVE' : 'PENDING'
      };
    } else {
      // Create new with defaults
      const newProject = {
        id: project.id,
        title: project.name,
        contractNumber: project.code,
        status: project.isActive ? 'ACTIVE' : 'PENDING',
        employerName: '',
        consultantName: '',
        contractorName: '',
        startDate: '',
        endDate: '',
        siteDeliveryDate: '',
        contractType: 'فهرست بهایی',
        priceLists: [],
        initialBudget: 0,
        resources: [],
        coefficients: { regional: 1, overhead: 1.3, contractor: 1, equipment: 1, others: 1, generalCoefficients: [], chapterCoefficients: [] }
      };
      projects.push(newProject);

      // Auto-assign new project access to all active organizations
      try {
        const orgs = SystemAdminService.getOrganizations();
        const pIdStr = String(project.id).trim();
        orgs.forEach(org => {
          if (org.id && org.id !== 'SYSTEM') {
            SystemAdminService.saveAccess({
              id: 'acc-' + Math.random().toString(36).substr(2, 9),
              orgId: org.id,
              projectId: pIdStr,
              isActive: true
            });
            // Also ensure the organization's managers have access and personnel are synced
            SystemAdminService.ensureOrgManagersHaveProjectAccess(org.id, pIdStr);
            SystemAdminService.syncOrgPersonnelToNewProject(org.id, pIdStr);
          }
        });
      } catch (e) {
        console.error('Error auto-assigning access to new project:', e);
      }
    }
    localStorage.setItem(PROJECT_KEY, JSON.stringify(projects));
  },

  deleteProject: (id: string) => {
    let projects: any[] = [];
    try {
      const data = localStorage.getItem(PROJECT_KEY);
      if (data) projects = JSON.parse(data);
      else projects = MOCK_PROJECTS;
    } catch(e) { projects = MOCK_PROJECTS; }
    
    projects = projects.filter((p: any) => p.id !== id);
    localStorage.setItem(PROJECT_KEY, JSON.stringify(projects));
  },

  // --- Access ---
  getAccess: (): OrgProjectAccess[] => {
    const data = localStorage.getItem(ACCESS_KEY);
    return data ? JSON.parse(data) : [];
  },

  saveAccess: (access: OrgProjectAccess) => {
    const list = SystemAdminService.getAccess();
    const index = list.findIndex(a => a.id === access.id);
    if (index >= 0) {
      list[index] = access;
    } else {
      list.push(access);
    }
    localStorage.setItem(ACCESS_KEY, JSON.stringify(list));
  },

  saveBatchAccess: (orgId: string, projectIds: string[], isActive: boolean = true) => {
    SystemAdminService.syncOrgProjectsAccess(orgId, projectIds, isActive);
  },

  syncOrgProjectsAccess: (orgId: string, selectedProjectIds: string[], isActive: boolean = true) => {
    let list = SystemAdminService.getAccess();
    const cleanSelectedIds = Array.from(new Set(selectedProjectIds.map(p => String(p).trim()).filter(Boolean)));
    
    // Remove assignments for this org that are no longer in cleanSelectedIds
    list = list.filter(a => a.orgId !== orgId || cleanSelectedIds.includes(String(a.projectId).trim()));

    // For each selected projectId, update existing or create new
    cleanSelectedIds.forEach(pId => {
      const existing = list.find(a => a.orgId === orgId && String(a.projectId).trim() === pId);
      if (existing) {
        existing.isActive = isActive;
      } else {
        list.push({
          id: 'acc-' + Math.random().toString(36).substr(2, 9),
          orgId,
          projectId: pId,
          isActive
        });
      }

      if (isActive) {
        // Automatically sync managers and personnel to the newly assigned project
        SystemAdminService.ensureOrgManagersHaveProjectAccess(orgId, pId);
        SystemAdminService.syncOrgPersonnelToNewProject(orgId, pId);
      }
    });

    localStorage.setItem(ACCESS_KEY, JSON.stringify(list));

    // Also update any users belonging to this organization if a project was removed
    try {
      const users = SystemAdminService.getUsers();
      let usersChanged = false;
      const updatedUsers = users.map(user => {
        if (user.orgId === orgId && Array.isArray(user.projectIds)) {
          const filteredUserProjects = user.projectIds.filter(pid => cleanSelectedIds.includes(String(pid).trim()));
          if (filteredUserProjects.length !== user.projectIds.length) {
            usersChanged = true;
            return { ...user, projectIds: filteredUserProjects };
          }
        }
        return user;
      });
      if (usersChanged) {
        localStorage.setItem(USER_KEY, JSON.stringify(updatedUsers));
      }
    } catch (e) {
      console.error('Error syncing user project access:', e);
    }

    SystemAdminService.addAuditLog({
      action: 'UPDATE_ACCESS',
      details: `همگام‌سازی و به‌روزرسانی تخصیص پروژه‌ها برای سازمان ${orgId} (مجموعاً ${cleanSelectedIds.length} پروژه)`,
      source: 'مدیریت دسترسی پروژه‌ها',
      sourceType: 'ADMIN'
    });
  },

  deleteAccess: (id: string) => {
    const list = SystemAdminService.getAccess().filter(a => a.id !== id);
    localStorage.setItem(ACCESS_KEY, JSON.stringify(list));
  },

  // --- Rules & Gates (Phase 1 Enforcement) ---
  
  isOrgAssignedToProject: (orgId: string, projectId: string): boolean => {
    if (!orgId || !projectId) return true;
    if (orgId === 'SYSTEM') return true;

    const pId = String(projectId).trim();
    const accessList = SystemAdminService.getAccess();
    
    // Check if there are any explicit access records for this project ID across any org
    const projectAccessRecords = accessList.filter(a => String(a.projectId).trim() === pId);
    
    if (projectAccessRecords.length === 0) {
      // If no explicit access restrictions exist yet for this project in access database,
      // all organizations have access by default
      return true;
    }

    // Otherwise, check if this org is explicitly assigned and active
    return projectAccessRecords.some(a => a.orgId === orgId && a.isActive);
  },

  getAssignedProjectsForOrg: (orgId: string): string[] => {
    if (!orgId) return [];
    const allProjects = SystemAdminService.getProjectsRaw().map(p => String(p.id).trim());
    if (orgId === 'SYSTEM') return allProjects;

    const accessList = SystemAdminService.getAccess();
    
    // Explicit active assignments for this org
    const assigned = accessList
      .filter(a => a.orgId === orgId && a.isActive)
      .map(a => String(a.projectId).trim());

    // Projects with no explicit access rules set up yet in system_admin_access
    const projectsWithAccessRules = new Set(accessList.map(a => String(a.projectId).trim()));
    const unrestrictedProjects = allProjects.filter(pId => !projectsWithAccessRules.has(pId));

    return Array.from(new Set([...assigned, ...unrestrictedProjects]));
  },

  getProjectsRaw: (): any[] => {
    try {
      const data = localStorage.getItem(PROJECT_KEY);
      if (data) return JSON.parse(data);
    } catch (e) {}
    return MOCK_PROJECTS;
  },

  canUserAccessProject: (projectId: string | number, user?: SystemUser | null): boolean => {
    const targetProjectId = String(projectId || '').trim();
    if (!targetProjectId) return false;

    const targetUser = user !== undefined ? user : SystemAdminService.getCurrentUser();
    
    // If no user context found, check storage role
    if (!targetUser) {
      const storedRole = localStorage.getItem('user_role');
      if (storedRole === 'SYSTEM_ADMIN') return true;
      return true; // default demo fallback
    }

    // 1. Root admin and SYSTEM_ADMIN role have full access to all projects
    if (targetUser.role === 'SYSTEM_ADMIN' || targetUser.username === 'admin' || targetUser.id === 'admin') {
      return true;
    }

    // 2. If user is ORG_ADMIN (مدیر ارشد سازمان/مدیر پروژه) or ORG_MANAGER (سرپرست کارگاه) of an org assigned to this project
    if (targetUser.orgId && (targetUser.role === 'ORG_ADMIN' || targetUser.role === 'ORG_MANAGER' || targetUser.jobLevel === 'مدیر پروژه' || targetUser.jobLevel === 'سرپرست کارگاه' || targetUser.jobTitle === 'مدیر پروژه' || targetUser.jobTitle === 'سرپرست کارگاه')) {
      const orgProjectIds = SystemAdminService.getAssignedProjectsForOrg(targetUser.orgId).map(String);
      if (orgProjectIds.includes(targetProjectId)) {
        return true;
      }
    }

    // 3. If user has explicit projectIds array defined
    if (targetUser.projectIds !== undefined && Array.isArray(targetUser.projectIds)) {
      const normalizedAllowed = targetUser.projectIds.map(id => String(id).trim());
      if (normalizedAllowed.includes(targetProjectId)) {
        return true;
      }
    }

    // 4. If user belongs to an org, check org projects if not explicitly restricted
    if (targetUser.orgId) {
      const orgProjectIds = SystemAdminService.getAssignedProjectsForOrg(targetUser.orgId).map(String);
      if (orgProjectIds.includes(targetProjectId) && (!targetUser.projectIds || targetUser.projectIds.length === 0)) {
        return true;
      }
    }

    // 5. Default: false for users without project access configured
    return false;
  },

  getUserAccessibleProjects: (user?: SystemUser | null): any[] => {
    const all = SystemAdminService.getProjectsRaw();
    const targetUser = user !== undefined ? user : SystemAdminService.getCurrentUser();
    return all.filter((p: any) => SystemAdminService.canUserAccessProject(p.id, targetUser));
  },

  getUserAccessibleProjectIds: (user?: SystemUser | null): string[] => {
    return SystemAdminService.getUserAccessibleProjects(user).map((p: any) => String(p.id).trim());
  },

  assertOrgHasProjectAccess: (orgId: string, projectId: string) => {
    if (!orgId || !projectId || orgId === 'SYSTEM') return;
    if (!SystemAdminService.isOrgAssignedToProject(orgId, projectId)) {
      if ((import.meta as any).env.DEV) {
        console.error(`[Access Denied] Org ${orgId} does not have access to Project ${projectId}`);
      }
      throw new Error('سازمان شما به این پروژه دسترسی ندارد.');
    }
  },

  ensureOrgHasProjectAccess: (orgId: string, projectId: string) => {
    if (!orgId || !projectId || orgId === 'SYSTEM') return;
    const pId = String(projectId).trim();
    const accessList = SystemAdminService.getAccess();
    const existing = accessList.find(a => a.orgId === orgId && String(a.projectId).trim() === pId);
    if (existing) {
      if (!existing.isActive) {
        existing.isActive = true;
        localStorage.setItem(ACCESS_KEY, JSON.stringify(accessList));
      }
    } else {
      accessList.push({
        id: 'acc-' + Math.random().toString(36).substr(2, 9),
        orgId,
        projectId: pId,
        isActive: true
      });
      localStorage.setItem(ACCESS_KEY, JSON.stringify(accessList));
    }

    // Ensure managers have this project assigned and existing personnel are synced to this project
    SystemAdminService.ensureOrgManagersHaveProjectAccess(orgId, pId);
    SystemAdminService.syncOrgPersonnelToNewProject(orgId, pId);
  },

  ensureOrgManagersHaveProjectAccess: (orgId: string, projectId: string) => {
    if (!orgId || !projectId || orgId === 'SYSTEM') return;
    try {
      const users = SystemAdminService.getUsers();
      const targetPId = String(projectId).trim();
      let usersChanged = false;

      const updatedUsers = users.map(u => {
        if (u.orgId === orgId) {
          const isManager = u.role === 'ORG_ADMIN' || u.role === 'ORG_MANAGER' ||
                            u.jobLevel === 'مدیر پروژه' || u.jobLevel === 'سرپرست کارگاه' ||
                            u.jobTitle === 'مدیر پروژه' || u.jobTitle === 'سرپرست کارگاه';
          if (isManager && Array.isArray(u.projectIds)) {
            const normalizedPids = u.projectIds.map(String);
            if (!normalizedPids.includes(targetPId)) {
              usersChanged = true;
              return {
                ...u,
                projectIds: [...normalizedPids, targetPId]
              };
            }
          }
        }
        return u;
      });

      if (usersChanged) {
        localStorage.setItem(USER_KEY, JSON.stringify(updatedUsers));
      }
    } catch (e) {
      console.error('Error ensuring org managers have project access:', e);
    }
  },

  syncOrgPersonnelToNewProject: (orgId: string, projectId: string) => {
    if (!orgId || !projectId || orgId === 'SYSTEM') return;
    try {
      const data = localStorage.getItem('hamyar_hr_personnel');
      if (!data) return;
      let list: any[] = JSON.parse(data);
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
        localStorage.setItem('hamyar_hr_personnel', JSON.stringify(list));
      }
    } catch (e) {
      console.error('Error syncing personnel to new project in SystemAdminService:', e);
    }
  },

  // --- Permissions (Phase 3A) ---
  checkPermission: (userId: string, moduleId: string, action: 'view' | 'create' | 'edit' | 'delete' | 'send' | 'approve' | 'reject' | 'finalApprove'): boolean => {
    if (userId === 'admin') return true;
    
    const users = SystemAdminService.getUsers();
    const user = users.find(u => u.id === userId);
    
    // System Admin has full access
    if (user?.role === 'SYSTEM_ADMIN') return true;

    // HR module access restricted ONLY to Project Managers, Workshop Supervisors, and System Admin
    if (moduleId === 'hr' || moduleId === ModuleId.HR || moduleId === 'hr-personnel' || moduleId === 'org-users') {
        return SystemAdminService.canUserAccessHR(user);
    }

    // Enforce Employer's Project Manager or System Admin rule for Project creation, editing and deletion
    const userOrg = user ? SystemAdminService.getOrganization(user.orgId) : undefined;
    const isEmployerProjectManager = userOrg?.type === OrganizationType.EMPLOYER && 
        (user?.role === 'ORG_ADMIN' || (user?.role === 'ORG_MANAGER' && (user?.jobTitle === 'مدیر پروژه' || user?.username === 'e-pm' || user?.id === 'e-pm')));

    if (moduleId === 'project-definition' && (action === 'create' || action === 'edit' || action === 'delete')) {
        return !!isEmployerProjectManager;
    }
    
    // Org Admin has full access to their org's scope (except project creation)
    if (user?.role === 'ORG_ADMIN') return true;

    if (!user || !user.permissions) {
      // Default permissive for backward compatibility or if permissions not set
      // Option A: If permissions are undefined, we assume full access (except project creation which is already handled above)
      return true;
    }

    let permission = user.permissions.find(p => p.moduleId === moduleId);
    if (!permission && moduleId === ModuleId.CBS_STATEMENTS) {
        permission = user.permissions.find(p => p.moduleId === ModuleId.TECHNICAL_OFFICE);
    }
    if (!permission && typeof moduleId === 'string' && (moduleId as string).startsWith('communications')) {
        permission = user.permissions.find(p => p.moduleId === ModuleId.COMMUNICATIONS || (p.moduleId as any) === 'communications');
    }
    if (!permission) {
        // If no specific permission record, default to true (permissive)
        return true;
    }

    if (action === 'view') return permission.canView;
    if (action === 'create') return permission.canCreate ?? true;
    if (action === 'edit') return permission.canEdit ?? true;
    if (action === 'delete') return permission.canDelete ?? permission.canEdit ?? false;
    if (action === 'send') return permission.canSend ?? true;
    if (action === 'approve') return permission.canApprove ?? false;
    if (action === 'reject') return permission.canReject ?? permission.canApprove ?? false;
    if (action === 'finalApprove') return permission.canFinalApprove ?? (user.role === 'ORG_MANAGER' ? permission.canApprove ?? false : false);
    
    return false;
  },

  canUserAccessHR: (user?: SystemUser | null): boolean => {
    const targetUser = user !== undefined ? user : SystemAdminService.getCurrentUser();
    if (!targetUser) {
      const storedRole = localStorage.getItem('user_role');
      return storedRole === 'SYSTEM_ADMIN' || storedRole === 'ORG_ADMIN' || storedRole === 'ORG_MANAGER';
    }

    // System Admin has full access
    if (targetUser.role === 'SYSTEM_ADMIN') {
      return true;
    }

    // Project Manager (ORG_ADMIN) and Workshop Supervisor (ORG_MANAGER)
    if (targetUser.role === 'ORG_ADMIN' || targetUser.role === 'ORG_MANAGER') {
      return true;
    }

    const jobLevel = (targetUser.jobLevel || '').trim();
    const jobTitle = (targetUser.jobTitle || '').trim();

    // Specific job level or job title matches for Project Manager and Workshop Supervisor
    if (jobLevel === 'مدیر پروژه' || jobLevel === 'مدیر ارشد سازمان' || jobLevel === 'سرپرست کارگاه' || jobLevel === 'سرپرست کارگاه (مسئول پروژه)') {
      return true;
    }

    if (jobTitle === 'مدیر پروژه' || jobTitle === 'سرپرست کارگاه') {
      return true;
    }

    return false;
  },

  assertPermission: (userId: string, moduleId: string, action: 'view' | 'create' | 'edit' | 'delete' | 'send' | 'approve' | 'reject' | 'finalApprove') => {
      if (!SystemAdminService.checkPermission(userId, moduleId, action)) {
          if (moduleId === 'project-definition' && (action === 'create' || action === 'edit' || action === 'delete')) {
               throw new Error('این عملیات فقط برای مدیر کل سیستم یا مدیر پروژه کارفرما امکان‌پذیر است.');
          }
          const actionLabels: Record<string, string> = {
              view: 'مشاهده',
              create: 'ایجاد',
              edit: 'ویرایش',
              delete: 'حذف',
              send: 'ارسال',
              approve: 'تایید',
              reject: 'رد/عودت',
              finalApprove: 'تایید نهایی'
          };
          throw new Error(`شما دسترسی ${actionLabels[action] || action} در این بخش را ندارید.`);
      }
  },

  getStandardPermissions: (jobLevel: string, role: string): UserPermission[] => {
    const modules = [
      ModuleId.DASHBOARD,
      ModuleId.PROJECT_DEFINITION,
      ModuleId.CBS_CONTRACTS,
      ModuleId.TECHNICAL_OFFICE,
      ModuleId.EXECUTION,
      ModuleId.QUALITY_CONTROL,
      ModuleId.PLANNING,
      ModuleId.HSE,
      ModuleId.HR,
      ModuleId.HISTORY,
      ModuleId.COMMUNICATIONS,
      ModuleId.CBS_STATEMENTS
    ];

    return modules.map(moduleId => {
       let canView = true;
       let canCreate = false;
       let canEdit = false;
       let canDelete = false;
       let canSend = false;
       let canApprove = false;
       let canReject = false;
       let canFinalApprove = false;

       if (role === 'SYSTEM_ADMIN') {
         return {
           moduleId,
           canView: true,
           canCreate: true,
           canEdit: true,
           canDelete: true,
           canSend: true,
           canApprove: true,
           canReject: true,
           canFinalApprove: true
         };
       }

       if (role === 'ORG_ADMIN' || jobLevel === 'مدیر پروژه') {
         canCreate = true;
         canEdit = true;
         canDelete = true;
         canSend = true;
         canApprove = true;
         canReject = true;
         canFinalApprove = true;
       } else if (jobLevel === 'سرپرست کارگاه') {
         canCreate = true;
         canEdit = true;
         canDelete = true;
         canSend = true;
         canApprove = true;
         canReject = true;
         canFinalApprove = true;
       } else if (jobLevel === 'سرپرست واحد') {
         canCreate = true;
         canEdit = true;
         canDelete = true;
         canSend = true;
         canApprove = true;
         canReject = true;
         canFinalApprove = false;
       } else {
         // Expert (کارشناس) / Senior Expert (کارشناس ارشد) / Technician (تکنسین)
         canCreate = true;
         canEdit = true;
         canDelete = true;
         canSend = true;
         canApprove = false;
         canReject = true;
         canFinalApprove = false;
       }

       // Project definition module restrict non-pm/non-owner from modification
       if (moduleId === ModuleId.PROJECT_DEFINITION) {
         if (jobLevel !== 'مدیر پروژه' && role !== 'ORG_ADMIN') {
           canCreate = false;
           canEdit = false;
           canDelete = false;
         }
       }

       // HR module is visible ONLY to Project Managers and Workshop Supervisors (and System Admin)
       if (moduleId === ModuleId.HR) {
         const isAllowedHR = role === 'SYSTEM_ADMIN' || role === 'ORG_ADMIN' || role === 'ORG_MANAGER' ||
           jobLevel === 'مدیر پروژه' || jobLevel === 'مدیر ارشد سازمان' || jobLevel === 'سرپرست کارگاه' ||
           jobLevel === 'سرپرست کارگاه (مسئول پروژه)';
         canView = isAllowedHR;
         canCreate = isAllowedHR;
         canEdit = isAllowedHR;
         canDelete = isAllowedHR;
         canSend = isAllowedHR;
         canApprove = isAllowedHR;
         canReject = isAllowedHR;
         canFinalApprove = isAllowedHR && (role === 'SYSTEM_ADMIN' || role === 'ORG_ADMIN');
       }

       return {
         moduleId,
         canView,
         canCreate,
         canEdit,
         canDelete,
         canSend,
         canApprove,
         canReject,
         canFinalApprove
       };
    });
  },

  // --- Users (Org Admins) ---
  getUsers: (): SystemUser[] => {
    const data = localStorage.getItem(USER_KEY);
    const users: SystemUser[] = data ? JSON.parse(data) : [];
    let modified = false;
    users.forEach(u => {
      if (!u.signature) {
        u.signature = generateUserDefaultSignature(u.fullName || u.username);
        modified = true;
      }
    });
    if (modified && users.length > 0) {
      try {
        localStorage.setItem(USER_KEY, JSON.stringify(users));
      } catch (e) {}
    }
    return users;
  },

  getCurrentUser: (): SystemUser | null => {
    const username = localStorage.getItem('current_username');
    if (!username) return null;
    if (username === 'admin') {
      return {
        id: 'admin',
        username: 'admin',
        fullName: 'مدیر سیستم',
        role: 'SYSTEM_ADMIN',
        isActive: true,
        orgId: 'SYSTEM',
        password: 'admin',
        projectIds: [],
        permissions: [],
        signature: generateUserDefaultSignature('مدیر سیستم')
      };
    }
    const users = SystemAdminService.getUsers();
    const user = users.find(u => u.username === username) || null;
    if (user && !user.signature) {
      user.signature = generateUserDefaultSignature(user.fullName || user.username);
    }
    return user;
  },

  saveUser: (user: SystemUser) => {
    const users = SystemAdminService.getUsers();
    const index = users.findIndex(u => u.id === user.id);
    const isNewUser = index < 0;
    
    // 1. Validate Organization
    const orgs = SystemAdminService.getOrganizations();
    const targetOrg = orgs.find(o => o.id === user.orgId);
    if (!targetOrg) {
      throw new Error('سازمان انتخاب شده وجود ندارد.');
    }
    if (!targetOrg.isActive) {
      throw new Error('سازمان انتخاب شده غیرفعال است. امکان ساخت کاربر برای سازمان غیرفعال وجود ندارد.');
    }

    // 1.1 Validate Mandatory Linkage to HR Personnel (Only required when creating a NEW user)
    if (user.orgId !== 'SYSTEM' && user.role !== 'SYSTEM_ADMIN') {
      if (isNewUser && !user.personnelId) {
        throw new Error('تعریف کاربر جدید بدون انتساب به پرسنل ثبت‌شده در منابع انسانی مجاز نیست. لطفاً ابتدا پرسنل را در بخش کارگزینی ثبت کنید.');
      }
      if (user.personnelId) {
        try {
          const hrData = localStorage.getItem('hamyar_hr_personnel');
          const hrList = hrData ? JSON.parse(hrData) : [];
          const matchedPersonnel = hrList.find((p: any) => p.id === user.personnelId);
          if (matchedPersonnel) {
            // Ensure accurate synchronization of user profile with HR record
            user.fullName = matchedPersonnel.fullName;
            user.jobLevel = matchedPersonnel.jobLevel;
            user.jobTitle = matchedPersonnel.jobTitle || '';
            user.department = matchedPersonnel.department || '';
          } else if (isNewUser) {
            throw new Error('پرسنل متناظر در پرونده‌های کارگزینی منابع انسانی یافت نشد.');
          }
        } catch (err: any) {
          if (err.message && err.message.includes('کارگزینی')) throw err;
        }
      }
    }

    // 2. Validate Unique Username
    const existingUser = users.find(u => u.username === user.username && u.id !== user.id);
    if (existingUser) {
      throw new Error('این نام کاربری قبلاً ثبت شده است.');
    }

    // 3. Validate ORG_ADMIN uniqueness per org and project
    if (user.role === 'ORG_ADMIN') {
      const userProjectIds = (user.projectIds || []).map(String);
      const existingOrgAdmin = users.find(u => {
        if (u.id === user.id || u.orgId !== user.orgId || u.role !== 'ORG_ADMIN' || !u.isActive) return false;
        const uProjects = (u.projectIds || []).map(String);
        if (userProjectIds.length === 0 && uProjects.length === 0) return true;
        if (userProjectIds.length > 0 && uProjects.length > 0) {
          return userProjectIds.some(pid => uProjects.includes(pid));
        }
        return false;
      });
      if (existingOrgAdmin) {
        const matchingPid = userProjectIds.find(pid => (existingOrgAdmin.projectIds || []).map(String).includes(pid));
        const projName = matchingPid ? SystemAdminService.getProjects().find(p => String(p.id) === String(matchingPid))?.name : '';
        throw new Error(`برای این سازمان${projName ? ` در پروژه «${projName}»` : ''} قبلاً کاربر «${existingOrgAdmin.fullName}» به عنوان مدیر پروژه (ادمین سازمان) ثبت شده است. برای هر پروژه در هر سازمان تنها یک مدیر پروژه مجاز است.`);
      }
    }

    const currentUserRole = SystemAdminService.getCurrentUser()?.role || localStorage.getItem('user_role');

    // Restrict editing or creating ORG_ADMIN user accounts to SYSTEM_ADMIN
    if ((index >= 0 && users[index].role === 'ORG_ADMIN') || (index < 0 && user.role === 'ORG_ADMIN')) {
      if (currentUserRole !== 'SYSTEM_ADMIN') {
        throw new Error('تعریف، ویرایش یا تغییر دسترسی‌های کاربر مدیر ارشد سازمان (مدیر پروژه) فقط توسط مدیر کل سیستم امکان‌پذیر است.');
      }
    }

    const isStatusUpdateOnly = index >= 0 && users[index].role === user.role && JSON.stringify(users[index].projectIds) === JSON.stringify(user.projectIds);

    if (user.role !== 'SYSTEM_ADMIN' && !isStatusUpdateOnly) {
        if (user.projectIds && user.projectIds.length > 0) {
            for (const projectId of user.projectIds) {
                const currentUserObj = SystemAdminService.getCurrentUser();
                const canManagerAssign = currentUserRole === 'SYSTEM_ADMIN' ||
                                        currentUserRole === 'ORG_ADMIN' ||
                                        currentUserRole === 'ORG_MANAGER' ||
                                        SystemAdminService.canUserAccessProject(projectId, currentUserObj);

                if (canManagerAssign) {
                    // Automatically ensure organization has access to this project
                    SystemAdminService.ensureOrgHasProjectAccess(user.orgId, projectId);
                } else {
                    try {
                        SystemAdminService.assertOrgHasProjectAccess(user.orgId, projectId);
                    } catch (e) {
                        throw new Error(`پروژه انتخاب شده (ID: ${projectId}) به این سازمان تخصیص داده نشده است.`);
                    }
                }
            }
        } else if (user.role === 'ORG_USER' || user.role === 'ORG_MANAGER' || user.role === 'USER') {
            // Require at least one project for regular users
            throw new Error('انتخاب حداقل یک پروژه برای کاربر الزامی است.');
        }
    }

    if (index >= 0) {
      users[index] = user;
    } else {
      users.push(user);
    }
    localStorage.setItem(USER_KEY, JSON.stringify(users));

    // Sync with HR Personnel if linked
    if (user.personnelId || user.id) {
      try {
        const hrData = localStorage.getItem('hamyar_hr_personnel');
        if (hrData) {
          const hrList = JSON.parse(hrData);
          let hrChanged = false;
          hrList.forEach((p: any) => {
            if (p.id === user.personnelId || (user.id && p.userId === user.id)) {
              p.userId = user.id;
              if (user.projectIds && user.projectIds.length > 0) {
                const currentPids = (p.projectIds && p.projectIds.length > 0) ? p.projectIds.map(String) : (p.projectId ? [String(p.projectId)] : []);
                const merged = Array.from(new Set([...currentPids, ...user.projectIds.map(String)]));
                p.projectIds = merged;
                if (!p.projectId && merged.length > 0) p.projectId = merged[0];
              }
              hrChanged = true;
            }
          });
          if (hrChanged) {
            localStorage.setItem('hamyar_hr_personnel', JSON.stringify(hrList));
          }
        }
      } catch (e) {}
    }

    SystemAdminService.addAuditLog({
      action: isNewUser ? 'CREATE_USER' : 'UPDATE_USER',
      details: `${isNewUser ? 'تعریف کاربر جدید' : 'به‌روزرسانی اطلاعات کاربر'} ${user.fullName || user.username} (${user.username})`,
      source: 'مدیریت کاربران سیستم',
      sourceType: 'ADMIN'
    });
  },

  getUsersByOrg: (orgId: string): SystemUser[] => {
    return SystemAdminService.getUsers().filter(u => u.orgId === orgId);
  },

  getUsersDetailed: (): Array<{user: SystemUser, org?: Organization}> => {
    const users = SystemAdminService.getUsers();
    const orgs = SystemAdminService.getOrganizations();
    return users.map(user => ({
      user,
      org: orgs.find(o => o.id === user.orgId)
    }));
  },

  deleteUser: (id: string) => {
    const users = SystemAdminService.getUsers();
    const target = users.find(u => String(u.id) === String(id));
    
    if (!target) {
        throw new Error('کاربر یافت نشد');
    }

    if (target.username === 'admin') {
        throw new Error('حذف مدیر سیستم مجاز نیست');
    }

    if (target.role === 'ORG_ADMIN') {
        const currentUserRole = SystemAdminService.getCurrentUser()?.role || localStorage.getItem('user_role');
        if (currentUserRole !== 'SYSTEM_ADMIN') {
            throw new Error('حذف کاربر مدیر ارشد سازمان (مدیر پروژه) فقط توسط مدیر کل سیستم امکان‌پذیر است.');
        }
    }

    const nextUsers = users.filter(u => String(u.id) !== String(id));
    localStorage.setItem(USER_KEY, JSON.stringify(nextUsers));

    // Unlink HR Personnel if linked
    try {
      const hrData = localStorage.getItem('hamyar_hr_personnel');
      if (hrData) {
        const hrList = JSON.parse(hrData);
        let hrChanged = false;
        hrList.forEach((p: any) => {
          if (p.userId === id || (target.personnelId && p.id === target.personnelId)) {
            p.userId = undefined;
            hrChanged = true;
          }
        });
        if (hrChanged) {
          localStorage.setItem('hamyar_hr_personnel', JSON.stringify(hrList));
        }
      }
    } catch (e) {}

    // Verification
    const verifyUsers = SystemAdminService.getUsers();
    if (verifyUsers.some(u => String(u.id) === String(id))) {
        throw new Error('حذف انجام نشد');
    }
  },

  deleteAllUsers: (orgId?: string) => {
    const currentUser = SystemAdminService.getCurrentUser();
    const currentUserRole = currentUser?.role || localStorage.getItem('user_role');
    if (currentUserRole !== 'SYSTEM_ADMIN') {
      throw new Error('حذف کلیه کاربران فقط توسط مدیر کل سیستم امکان‌پذیر است.');
    }

    const currentUsername = currentUser?.username || localStorage.getItem('current_username') || 'admin';
    const users = SystemAdminService.getUsers();

    let remainingUsers: SystemUser[] = [];

    if (orgId && orgId !== 'ALL') {
      remainingUsers = users.filter(u => {
        if (u.username === 'admin' || u.username === currentUsername) return true;
        return u.orgId !== orgId;
      });
    } else {
      remainingUsers = users.filter(u => u.username === 'admin' || u.username === currentUsername);
    }

    localStorage.setItem(USER_KEY, JSON.stringify(remainingUsers));

    // Unlink HR Personnel
    try {
      const hrData = localStorage.getItem('hamyar_hr_personnel');
      if (hrData) {
        const hrList = JSON.parse(hrData);
        const remainingUserIds = new Set(remainingUsers.map(u => u.id));
        hrList.forEach((p: any) => {
          if (p.userId && !remainingUserIds.has(p.userId)) {
            p.userId = undefined;
          }
        });
        localStorage.setItem('hamyar_hr_personnel', JSON.stringify(hrList));
      }
    } catch (e) {}

    SystemAdminService.addAuditLog({
      action: 'DELETE_ALL_USERS',
      details: orgId && orgId !== 'ALL'
        ? `حذف تمامی کاربران سازمان (ID: ${orgId}) توسط مدیر کل سیستم`
        : 'حذف تمامی کاربران ایجادشده در سامانه توسط مدیر کل سیستم',
      source: 'مدیریت کاربران',
      sourceType: 'SYSTEM'
    });
  },

  changePassword: (username: string, oldPass: string, newPass: string) => {
      const users = SystemAdminService.getUsers();
      const index = users.findIndex(u => u.username === username);
      if (index >= 0) {
          if (users[index].password !== oldPass) {
              throw new Error('رمز عبور فعلی اشتباه است.');
          }
          users[index].password = newPass;
          localStorage.setItem(USER_KEY, JSON.stringify(users));
      } else if (username === 'admin') {
          // For system admin, we check against the hardcoded 'admin' for now in this demo context
          if (oldPass !== 'admin') {
              throw new Error('رمز عبور فعلی اشتباه است.');
          }
          // Note: In a real app, 'admin' password would be in a config or env var
          throw new Error('تغییر رمز عبور مدیر سیستم در این نسخه امکان‌پذیر نیست.');
      } else {
          throw new Error('کاربر یافت نشد.');
      }
  },

  resetPassword: (targetUserId: string, newPass: string, adminRole: string, adminOrgId?: string) => {
      const users = SystemAdminService.getUsers();
      const targetUser = users.find(u => u.id === targetUserId);

      if (!targetUser) {
          throw new Error('کاربر مورد نظر یافت نشد.');
      }

      if (adminRole === 'SYSTEM_ADMIN') {
          // System Admin can reset anyone
          targetUser.password = newPass;
      } else if (adminRole === 'ORG_ADMIN' || adminRole === 'ORG_MANAGER') {
          // Org Admin or Org Manager can only reset regular users in their own org
          if (targetUser.role === 'ORG_ADMIN') {
              throw new Error('تغییر رمز عبور کاربر مدیر ارشد سازمان فقط توسط مدیر کل سیستم امکان‌پذیر است.');
          }
          if (targetUser.orgId !== adminOrgId) {
              throw new Error('شما مجاز به تغییر رمز عبور این کاربر نیستید.');
          }
          if (adminRole === 'ORG_MANAGER' && targetUser.role !== 'ORG_USER' && targetUser.jobLevel !== 'سرپرست واحد') {
              throw new Error('شما مجاز به تغییر رمز عبور این کاربر نیستید.');
          }
          targetUser.password = newPass;
      } else {
          throw new Error('شما دسترسی لازم برای این عملیات را ندارید.');
      }

      const index = users.findIndex(u => u.id === targetUserId);
      users[index] = targetUser;
      localStorage.setItem(USER_KEY, JSON.stringify(users));
  },

  verifyAndResetPassword: (username: string, fullName: string, securityCode: string, newPass: string) => {
      const users = SystemAdminService.getUsers();
      const user = users.find(u => u.username === username);

      if (!user) {
          throw new Error('کاربر یافت نشد.');
      }

      if (user.fullName !== fullName) {
          throw new Error('اطلاعات وارد شده با مشخصات کاربری مطابقت ندارد.');
      }

      if (user.securityCode && user.securityCode !== securityCode) {
          throw new Error('رمز دو مرحله‌ای اشتباه است.');
      }

      user.password = newPass;
      const index = users.findIndex(u => u.id === user.id);
      users[index] = user;
      localStorage.setItem(USER_KEY, JSON.stringify(users));
  },

  // --- Seed Data ---
  seedData: () => {
    const SEED_FLAG_KEY = 'system_admin_seed_initialized_v7';
    if (localStorage.getItem(SEED_FLAG_KEY)) {
      if ((import.meta as any).env.DEV) {
        console.log('[SystemAdminService] Seed v7 already initialized. Skipping.');
      }
      return;
    }

    if ((import.meta as any).env.DEV) {
      console.log('[SystemAdminService] Initializing seed data v7...');
    }

    if (!localStorage.getItem(ORG_KEY)) {
      const orgs: Organization[] = [
        { id: 'org-1', name: 'شرکت مهندسی الف', code: 'ORG-001', type: OrganizationType.EMPLOYER, isActive: true },
        { id: 'org-2', name: 'مشاورین سازه گستر', code: 'ORG-002', type: OrganizationType.CONSULTANT, isActive: true },
        { id: 'org-3', name: 'پیمانکاری نوین ساخت', code: 'ORG-003', type: OrganizationType.CONTRACTOR, isActive: true },
      ];
      localStorage.setItem(ORG_KEY, JSON.stringify(orgs));
    }

    // Projects are now handled by MOCK_PROJECTS if empty, so we don't need to seed them explicitly unless we want specific system test data.
    if (!localStorage.getItem(PROJECT_KEY) && MOCK_PROJECTS.length === 0) {
       // Fallback seed
       const projects = [
        { id: '1', title: 'پروژه نمونه احداث خط انتقال آب', contractNumber: 'PRJ-101', status: 'ACTIVE', employerName: 'سازمان مدیریت و برنامه‌ریزی', consultantName: 'مهندسین مشاور البرز', contractorName: 'شرکت ساختمانی سازه گستر', startDate: '1402/01/01', endDate: '1404/01/01', siteDeliveryDate: '1402/01/15', contractType: 'فهرست بهایی', priceLists: [], initialBudget: 50000000000, resources: [], coefficients: { regional: 1, overhead: 1.3, contractor: 1.15, equipment: 1, others: 1, generalCoefficients: [], chapterCoefficients: [] } }
       ];
       localStorage.setItem(PROJECT_KEY, JSON.stringify(projects));
     }

    // Initialize access for standard organizations if not yet set
    if (!localStorage.getItem(ACCESS_KEY)) {
      const access: OrgProjectAccess[] = [
        { id: 'acc-1', orgId: 'org-1', projectId: '1', isActive: true },
        { id: 'acc-2', orgId: 'org-2', projectId: '1', isActive: true },
        { id: 'acc-3', orgId: 'org-3', projectId: '1', isActive: true },
        { id: 'acc-4', orgId: 'org-1', projectId: '2', isActive: true },
        { id: 'acc-5', orgId: 'org-2', projectId: '2', isActive: true },
        { id: 'acc-6', orgId: 'org-3', projectId: '2', isActive: true },
      ];
      localStorage.setItem(ACCESS_KEY, JSON.stringify(access));
    }

    // Always seed these specific users to help testing workflow:
    // We clear the users temporarily to inject our new comprehensive set
    localStorage.removeItem(USER_KEY);
    
    if (!localStorage.getItem(USER_KEY)) {
      const users: SystemUser[] = [
        // مدیر کل سیستم (Root Admin)
        { id: 'admin', username: 'admin', fullName: 'مدیر کل سیستم', orgId: 'SYSTEM', isActive: true, role: 'SYSTEM_ADMIN', password: 'admin' },
        
        // پیمانکار (org-3) - Contractor
        { id: 'morteza', username: 'morteza', fullName: 'مرتضی', orgId: 'org-3', isActive: true, role: 'ORG_ADMIN', jobTitle: 'مدیر پروژه', jobLevel: 'مدیر پروژه', password: '871161148', projectIds: ['1'], permissions: [
          { moduleId: ModuleId.TECHNICAL_OFFICE, canView: true, canCreate: true, canEdit: true, canSend: true, canApprove: true, canReject: true, canFinalApprove: true },
          { moduleId: ModuleId.EXECUTION, canView: true, canCreate: true, canEdit: true, canSend: true, canApprove: true, canReject: true, canFinalApprove: true },
          { moduleId: ModuleId.COMMUNICATIONS, canView: true, canCreate: true, canEdit: true, canSend: true, canApprove: true, canReject: true, canFinalApprove: true }
        ] },
        { id: 'peyman', username: 'peyman', fullName: 'پیمان', orgId: 'org-3', isActive: true, role: 'ORG_MANAGER', jobTitle: 'سرپرست کارگاه', jobLevel: 'سرپرست کارگاه', password: '871161148', projectIds: ['1'], permissions: [
          { moduleId: ModuleId.TECHNICAL_OFFICE, canView: true, canCreate: true, canEdit: true, canSend: true, canApprove: true, canReject: true, canFinalApprove: true },
          { moduleId: ModuleId.EXECUTION, canView: true, canCreate: true, canEdit: true, canSend: true, canApprove: true, canReject: true, canFinalApprove: true },
          { moduleId: ModuleId.COMMUNICATIONS, canView: true, canCreate: true, canEdit: true, canSend: true, canApprove: true, canReject: true, canFinalApprove: true }
        ] },
        { id: 'majid', username: 'majid', fullName: 'مجید', orgId: 'org-3', isActive: true, role: 'ORG_USER', jobTitle: 'کارشناس', jobLevel: 'کارشناس', password: '871161148', projectIds: ['1'], permissions: [
          { moduleId: ModuleId.TECHNICAL_OFFICE, canView: true, canCreate: true, canEdit: true, canSend: true, canReject: true },
          { moduleId: ModuleId.EXECUTION, canView: true, canCreate: true, canEdit: true, canSend: true, canReject: true },
          { moduleId: ModuleId.COMMUNICATIONS, canView: true, canCreate: true, canEdit: true, canSend: true, canReject: true }
        ] },
        { id: 'ali', username: 'ali', fullName: 'علی', orgId: 'org-3', isActive: true, role: 'ORG_USER', jobTitle: 'سرپرست واحد', jobLevel: 'سرپرست واحد', password: '871161148', projectIds: ['1'], permissions: [
          { moduleId: ModuleId.TECHNICAL_OFFICE, canView: true, canCreate: true, canEdit: true, canSend: true, canApprove: true, canReject: true },
          { moduleId: ModuleId.EXECUTION, canView: true, canCreate: true, canEdit: true, canSend: true, canApprove: true, canReject: true },
          { moduleId: ModuleId.COMMUNICATIONS, canView: true, canCreate: true, canEdit: true, canSend: true, canApprove: true, canReject: true }
        ] },

        // مشاور (org-2) - Consultant
        { id: 'mohsen', username: 'mohsen', fullName: 'محسن', orgId: 'org-2', isActive: true, role: 'ORG_ADMIN', jobTitle: 'مدیر پروژه', jobLevel: 'مدیر پروژه', password: '871161148', projectIds: ['1'], permissions: [
          { moduleId: ModuleId.TECHNICAL_OFFICE, canView: true, canCreate: true, canEdit: true, canSend: true, canApprove: true, canReject: true, canFinalApprove: true },
          { moduleId: ModuleId.EXECUTION, canView: true, canCreate: true, canEdit: true, canSend: true, canApprove: true, canReject: true, canFinalApprove: true },
          { moduleId: ModuleId.COMMUNICATIONS, canView: true, canCreate: true, canEdit: true, canSend: true, canApprove: true, canReject: true, canFinalApprove: true }
        ] },
        { id: 'ahmad', username: 'ahmad', fullName: 'احمد', orgId: 'org-2', isActive: true, role: 'ORG_MANAGER', jobTitle: 'سرپرست کارگاه', jobLevel: 'سرپرست کارگاه', password: '871161148', projectIds: ['1'], permissions: [
          { moduleId: ModuleId.TECHNICAL_OFFICE, canView: true, canCreate: true, canEdit: true, canSend: true, canApprove: true, canReject: true, canFinalApprove: true },
          { moduleId: ModuleId.EXECUTION, canView: true, canCreate: true, canEdit: true, canSend: true, canApprove: true, canReject: true, canFinalApprove: true },
          { moduleId: ModuleId.COMMUNICATIONS, canView: true, canCreate: true, canEdit: true, canSend: true, canApprove: true, canReject: true, canFinalApprove: true }
        ] },
        { id: 'iman', username: 'iman', fullName: 'ایمان', orgId: 'org-2', isActive: true, role: 'ORG_USER', jobTitle: 'کارشناس', jobLevel: 'کارشناس', password: '871161148', projectIds: ['1'], permissions: [
          { moduleId: ModuleId.TECHNICAL_OFFICE, canView: true, canCreate: true, canEdit: true, canSend: true, canReject: true },
          { moduleId: ModuleId.EXECUTION, canView: true, canCreate: true, canEdit: true, canSend: true, canReject: true },
          { moduleId: ModuleId.COMMUNICATIONS, canView: true, canCreate: true, canEdit: true, canSend: true, canReject: true }
        ] },
        { id: 'sajad', username: 'sajad', fullName: 'سجاد', orgId: 'org-2', isActive: true, role: 'ORG_USER', jobTitle: 'سرپرست واحد', jobLevel: 'سرپرست واحد', password: '871161148', projectIds: ['1'], permissions: [
          { moduleId: ModuleId.TECHNICAL_OFFICE, canView: true, canCreate: true, canEdit: true, canSend: true, canApprove: true, canReject: true },
          { moduleId: ModuleId.EXECUTION, canView: true, canCreate: true, canEdit: true, canSend: true, canApprove: true, canReject: true },
          { moduleId: ModuleId.COMMUNICATIONS, canView: true, canCreate: true, canEdit: true, canSend: true, canApprove: true, canReject: true }
        ] },

        // کارفرما (org-1) - Employer
        { id: 'mostafa', username: 'mostafa', fullName: 'مصطفی', orgId: 'org-1', isActive: true, role: 'ORG_ADMIN', jobTitle: 'مدیر پروژه', jobLevel: 'مدیر پروژه', password: '871161148', projectIds: ['1'], permissions: [
          { moduleId: ModuleId.TECHNICAL_OFFICE, canView: true, canCreate: true, canEdit: true, canSend: true, canApprove: true, canReject: true, canFinalApprove: true },
          { moduleId: ModuleId.EXECUTION, canView: true, canCreate: true, canEdit: true, canSend: true, canApprove: true, canReject: true, canFinalApprove: true },
          { moduleId: ModuleId.COMMUNICATIONS, canView: true, canCreate: true, canEdit: true, canSend: true, canApprove: true, canReject: true, canFinalApprove: true }
        ] },
        { id: 'reza', username: 'reza', fullName: 'رضا', orgId: 'org-1', isActive: true, role: 'ORG_MANAGER', jobTitle: 'سرپرست کارگاه', jobLevel: 'سرپرست کارگاه', password: '871161148', projectIds: ['1'], permissions: [
          { moduleId: ModuleId.TECHNICAL_OFFICE, canView: true, canCreate: true, canEdit: true, canSend: true, canApprove: true, canReject: true, canFinalApprove: true },
          { moduleId: ModuleId.EXECUTION, canView: true, canCreate: true, canEdit: true, canSend: true, canApprove: true, canReject: true, canFinalApprove: true },
          { moduleId: ModuleId.COMMUNICATIONS, canView: true, canCreate: true, canEdit: true, canSend: true, canApprove: true, canReject: true, canFinalApprove: true }
        ] },
        { id: 'ata', username: 'ata', fullName: 'عطا', orgId: 'org-1', isActive: true, role: 'ORG_USER', jobTitle: 'کارشناس', jobLevel: 'کارشناس', password: '871161148', projectIds: ['1'], permissions: [
          { moduleId: ModuleId.TECHNICAL_OFFICE, canView: true, canCreate: true, canEdit: true, canSend: true, canReject: true },
          { moduleId: ModuleId.EXECUTION, canView: true, canCreate: true, canEdit: true, canSend: true, canReject: true },
          { moduleId: ModuleId.COMMUNICATIONS, canView: true, canCreate: true, canEdit: true, canSend: true, canReject: true }
        ] },
        { id: 'mehdi', username: 'mehdi', fullName: 'مهدی', orgId: 'org-1', isActive: true, role: 'ORG_USER', jobTitle: 'سرپرست واحد', jobLevel: 'سرپرست واحد', password: '871161148', projectIds: ['1'], permissions: [
          { moduleId: ModuleId.TECHNICAL_OFFICE, canView: true, canCreate: true, canEdit: true, canSend: true, canApprove: true, canReject: true, canFinalApprove: true },
          { moduleId: ModuleId.EXECUTION, canView: true, canCreate: true, canEdit: true, canSend: true, canApprove: true, canReject: true, canFinalApprove: true },
          { moduleId: ModuleId.COMMUNICATIONS, canView: true, canCreate: true, canEdit: true, canSend: true, canApprove: true, canReject: true, canFinalApprove: true }
        ] },
      ];
      localStorage.setItem(USER_KEY, JSON.stringify(users));
    }

    // Seed default system audit logs if missing
    if (!localStorage.getItem('hamyar_system_audit_logs')) {
      const initialAuditLogs = [
        // majid
        { id: 'sys_log_m1', user: 'majid', action: 'LOGIN', details: 'ورود موفق کاربر مجید حسینی (کارشناس) به سامانه', date: '1403/05/10 - 08:30', source: 'احراز هویت و ورود', sourceType: 'AUTH' },
        { id: 'sys_log_m2', user: 'majid', action: 'CREATE_RECORD', details: 'ثبت و تنظیم پیش‌نویس صورت‌جلسه کارکرد عملیات بتن‌ریزی فونداسیون', date: '1403/05/10 - 09:15', source: 'دفتر فنی (صورت‌جلسات)', sourceType: 'TECHNICAL' },
        { id: 'sys_log_m3', user: 'majid', action: 'SUBMIT_REPORT', details: 'ارسال گزارش روزانه کارگاه - ثبت ورود ۴ دستگاه میکسر بتن و ۱ دستگاه پمپ', date: '1403/05/10 - 11:40', source: 'مدیریت اجرا و گزارش روزانه', sourceType: 'EXECUTION' },
        { id: 'sys_log_m4', user: 'majid', action: 'CREATE_MRS', details: 'ثبت درخواست خرید مصالح (MRS) شماره MRS-104 - تامین ۵۰ تن میلگرد ۱۶', date: '1403/05/11 - 10:20', source: 'دفتر فنی (درخواست مصالح)', sourceType: 'MATERIALS' },
        { id: 'sys_log_m5', user: 'majid', action: 'EDIT_CBS', details: 'ویرایش ساختار شکست CBS و تخصیص احجام کارکرد گره تجهیز کارگاه', date: '1403/05/12 - 14:10', source: 'ساختار شکست CBS', sourceType: 'CBS' },
        { id: 'sys_log_m6', user: 'majid', action: 'LOGOUT', details: 'خروج کاربر مجید حسینی از سامانه', date: '1403/05/12 - 17:00', source: 'احراز هویت و ورود', sourceType: 'AUTH' },

        // morteza
        { id: 'sys_log_mo1', user: 'morteza', action: 'LOGIN', details: 'ورود موفق کاربر مرتضی (مدیر پروژه پیمانکار) به سامانه', date: '1403/05/10 - 08:00', source: 'احراز هویت و ورود', sourceType: 'AUTH' },
        { id: 'sys_log_mo2', user: 'morteza', action: 'APPROVE_INTERNAL', details: 'تایید داخلی صورت‌وضعیت شماره ۳ پیمانکار و ارسال جهت بررسی مشاور', date: '1403/05/10 - 10:30', source: 'دفتر فنی (صورت‌وضعیت)', sourceType: 'TECHNICAL' },

        // mohsen
        { id: 'sys_log_mh1', user: 'mohsen', action: 'LOGIN', details: 'ورود موفق کاربر محسن (مدیر پروژه مشاور) به سامانه', date: '1403/05/10 - 11:00', source: 'احراز هویت و ورود', sourceType: 'AUTH' },
        { id: 'sys_log_mh2', user: 'mohsen', action: 'SEND_TO_EMPLOYER', details: 'بررسی و تایید صورت‌وضعیت شماره ۳ و ارسال جهت تایید نهایی کارفرما', date: '1403/05/10 - 14:00', source: 'دفتر فنی (صورت‌وضعیت)', sourceType: 'TECHNICAL' },

        // mostafa
        { id: 'sys_log_ms1', user: 'mostafa', action: 'LOGIN', details: 'ورود موفق کاربر مصطفی (مدیر پروژه کارفرما) به سامانه', date: '1403/05/11 - 09:00', source: 'احراز هویت و ورود', sourceType: 'AUTH' },
        { id: 'sys_log_ms2', user: 'mostafa', action: 'FINAL_APPROVE', details: 'تایید نهایی صورت‌وضعیت کارکرد دوره و صدور دستور پرداخت به مالی', date: '1403/05/11 - 11:15', source: 'دفتر فنی (صورت‌وضعیت)', sourceType: 'TECHNICAL' },

        // admin
        { id: 'sys_log_ad1', user: 'admin', action: 'LOGIN', details: 'ورود موفق مدیر کل سیستم به سامانه', date: '1403/05/01 - 08:00', source: 'احراز هویت و ورود', sourceType: 'AUTH' },
        { id: 'sys_log_ad2', user: 'admin', action: 'CREATE_USER', details: 'تعریف کاربر جدید مجید حسینی (majid) و تخصیص پروژه بیمارستان', date: '1403/05/01 - 08:45', source: 'مدیریت کاربران سیستم', sourceType: 'ADMIN' },
      ];
      try {
        localStorage.setItem('hamyar_system_audit_logs', JSON.stringify(initialAuditLogs));
      } catch (e) {
        console.warn('Could not seed initial audit logs:', e);
      }
    }

    localStorage.setItem(SEED_FLAG_KEY, 'true');
  },

  // --- Audit Logging Methods ---
  addAuditLog: (log: { user?: string; action: string; details: string; source?: string; sourceType?: string; date?: string }) => {
    try {
      const raw = localStorage.getItem('hamyar_system_audit_logs');
      let existing: any[] = [];
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            existing = parsed;
          }
        } catch (e) {
          existing = [];
        }
      }
      
      const activeUsername = log.user || localStorage.getItem('current_username') || 'admin';
      const currentDateStr = log.date || (new Date().toLocaleDateString('fa-IR') + ' - ' + new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }));
      
      // Clean and truncate details to prevent megabytes being stored
      const safeDetails = typeof log.details === 'string' ? (log.details.length > 500 ? log.details.substring(0, 500) + '...' : log.details) : String(log.details || '');

      const newEntry = {
        id: 'sys_log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        user: activeUsername,
        action: log.action || 'اقدام',
        details: safeDetails,
        date: currentDateStr,
        source: log.source || 'سیستم عمومی',
        sourceType: log.sourceType || 'GENERAL'
      };
      
      // Keep up to 100 most recent logs
      const updated = [newEntry, ...existing].slice(0, 100);

      // Quota-safe saving with progressive degradation
      try {
        localStorage.setItem('hamyar_system_audit_logs', JSON.stringify(updated));
      } catch (storageError) {
        try {
          // If quota is tight, keep 30 latest logs
          const smaller = updated.slice(0, 30);
          localStorage.setItem('hamyar_system_audit_logs', JSON.stringify(smaller));
        } catch (e2) {
          try {
            // Keep minimal 10 logs
            const minimal = updated.slice(0, 10);
            localStorage.setItem('hamyar_system_audit_logs', JSON.stringify(minimal));
          } catch (e3) {
            console.warn('Storage quota full, audit log skipped gracefully.');
          }
        }
      }
    } catch (e) {
      console.warn('Audit logging encountered a non-critical error:', e);
    }
  },

  getSystemAuditLogs: (): any[] => {
    try {
      SystemAdminService.seedData();
      const raw = localStorage.getItem('hamyar_system_audit_logs');
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      
      // Auto-prune if currently bloated (> 100 logs) to release storage
      if (parsed.length > 100) {
        try {
          const trimmed = parsed.slice(0, 100);
          localStorage.setItem('hamyar_system_audit_logs', JSON.stringify(trimmed));
          return trimmed;
        } catch (e) {
          // ignore error
        }
      }
      return parsed;
    } catch (e) {
      return [];
    }
  },

  resetSeed: () => {
    if (!(import.meta as any).env.DEV) return;
    
    if (window.confirm('WARNING: This will wipe all System Admin data (Orgs, Access, Users) and reset to defaults. Are you sure?')) {
      localStorage.removeItem(ORG_KEY);
      localStorage.removeItem(ACCESS_KEY);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem('hamyar_system_audit_logs');
      localStorage.removeItem('system_admin_seed_initialized');
      
      SystemAdminService.seedData();
      window.location.reload();
    }
  }
};

