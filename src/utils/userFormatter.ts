import { SystemUser, Organization, OrganizationType } from '../../systemAdminTypes';

/**
 * Standardizes user display labels across the application.
 * Format: [Name] ([Job Title]) - [Company]
 * Avoids duplicate titles and ensures clean presentation.
 */
export const formatUserDisplay = (user: Partial<SystemUser>, org?: Organization) => {
  if (!user) return '';

  const name = (user.fullName || user.username || '').trim();
  const level = (user.jobLevel || '').trim();
  const title = (user.jobTitle || '').trim();
  const orgName = org ? org.name : '';

  // Prioritize exact job title (سمت دقیق شغلی) over generic job level
  const position = title || level;

  const parts: string[] = [name];

  if (position) {
    parts.push(position);
  }

  if (orgName) {
    parts.push(orgName);
  }

  return parts.join(' - ');
};

/**
 * Standardized formal display. Following user's latest request:
 * Strictly: Full Name, Job Title, and Company.
 */
export const formatUserDisplayFormal = (user: Partial<SystemUser>, org?: Organization) => {
    return formatUserDisplay(user, org);
};
