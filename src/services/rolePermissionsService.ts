import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { ALL_PERMISSION_IDS } from '../types/permissions';
import type { PortalRole } from '../types/platform';

const CONFIG_DOC_ID = 'rolePermissions';

export const PORTAL_ROLES: PortalRole[] = ['viewer', 'contributor', 'manager', 'admin'];

export interface RolePermissionsConfig {
  viewer: string[];
  contributor: string[];
  manager: string[];
  admin: string[];
}

const DEFAULT_VIEWER = ['profile', 'webcasts'] as const;
const DEFAULT_CONTRIBUTOR = ['profile', 'webcasts', 'whiteboards', 'member_hub', 'communities', 'courses'] as const;
const DEFAULT_MANAGER = [...ALL_PERMISSION_IDS];
const DEFAULT_ADMIN = [...ALL_PERMISSION_IDS];

function defaultForRole(role: PortalRole): string[] {
  switch (role) {
    case 'viewer': return [...DEFAULT_VIEWER];
    case 'contributor': return [...DEFAULT_CONTRIBUTOR];
    case 'manager': return [...DEFAULT_MANAGER];
    case 'admin': return [...DEFAULT_ADMIN];
    default: return [...DEFAULT_VIEWER];
  }
}

export async function getRolePermissions(): Promise<RolePermissionsConfig> {
  const ref = doc(db, 'config', CONFIG_DOC_ID);
  const snap = await getDoc(ref);
  const data = snap.exists() ? snap.data() : null;

  // Support migration from legacy leader/participant config
  const legacyLeader = Array.isArray(data?.leader) ? data.leader : null;
  const legacyParticipant = Array.isArray(data?.participant) ? data.participant : null;

  return {
    viewer: Array.isArray(data?.viewer) ? data.viewer : (legacyParticipant ?? defaultForRole('viewer')),
    contributor: Array.isArray(data?.contributor) ? data.contributor : defaultForRole('contributor'),
    manager: Array.isArray(data?.manager) ? data.manager : (legacyLeader ?? defaultForRole('manager')),
    admin: Array.isArray(data?.admin) ? data.admin : defaultForRole('admin'),
  };
}

export async function setRolePermissions(
  data: RolePermissionsConfig
): Promise<void> {
  const ref = doc(db, 'config', CONFIG_DOC_ID);
  await setDoc(ref, {
    viewer: data.viewer,
    contributor: data.contributor,
    manager: data.manager,
    admin: data.admin,
    updatedAt: new Date().toISOString(),
  });
}
