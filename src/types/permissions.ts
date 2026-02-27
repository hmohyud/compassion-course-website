// Permission IDs for role-based access (Leader / Participant). Admins have all.

export type PermissionId =
  | 'webcasts'
  | 'member_hub'
  | 'profile'
  | 'courses';

export interface PermissionDefinition {
  id: PermissionId;
  label: string;
  description: string;
}

export const AVAILABLE_PERMISSIONS: PermissionDefinition[] = [
  { id: 'member_hub', label: 'Member Hub', description: 'Access shared resources like videos, Meet links, Drive folders, and Google Docs.' },
  { id: 'profile', label: 'My Profile', description: 'View and edit personal profile settings (name, avatar, bio).' },
  { id: 'courses', label: 'Courses', description: 'View and enroll in Compassion Course content and lessons.' },
];

export const ALL_PERMISSION_IDS: PermissionId[] = AVAILABLE_PERMISSIONS.map(
  (p) => p.id
);
