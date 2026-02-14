// Permission IDs for role-based access (Leader / Participant). Admins have all.

export type PermissionId =
  | 'webcasts'
  | 'member_hub'
  | 'profile'
  | 'communities'
  | 'courses';

export interface PermissionDefinition {
  id: PermissionId;
  label: string;
}

export const AVAILABLE_PERMISSIONS: PermissionDefinition[] = [
  { id: 'webcasts', label: 'Webcasts' },
  { id: 'member_hub', label: 'Member Hub' },
  { id: 'profile', label: 'My Profile' },
  { id: 'communities', label: 'Communities' },
  { id: 'courses', label: 'Courses' },
];

export const ALL_PERMISSION_IDS: PermissionId[] = AVAILABLE_PERMISSIONS.map(
  (p) => p.id
);
