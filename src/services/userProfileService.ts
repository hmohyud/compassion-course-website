import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { UserProfile, PortalRole } from '../types/platform';

const COLLECTION_NAME = 'userProfiles';

const PORTAL_ROLES: PortalRole[] = ['viewer', 'contributor', 'manager', 'admin'];

/** Normalize role for display/use; maps legacy participant/leader to new roles */
function normalizeProfileRole(raw: unknown): PortalRole {
  if (typeof raw !== 'string') return 'viewer';
  if (raw === 'leader') return 'manager';
  if (raw === 'participant') return 'viewer';
  if (PORTAL_ROLES.includes(raw as PortalRole)) return raw as PortalRole;
  return 'viewer';
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const docRef = doc(db, COLLECTION_NAME, userId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        role: normalizeProfileRole(data.role),
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as UserProfile;
    }
    return null;
  } catch (error: any) {
    // Handle offline errors gracefully - don't log as errors
    const isOfflineError = error?.code === 'unavailable' || 
                          error?.message?.includes('offline') ||
                          error?.message?.includes('Failed to get document because the client is offline');
    
    if (isOfflineError) {
      // Silently return null for offline scenarios - Firestore will retry when online
      return null;
    }
    
    // Only log actual errors (permissions, etc.)
    console.error('Error getting user profile:', error);
    throw error;
  }
}

export async function createUserProfile(
  userId: string,
  email: string,
  name: string,
  avatar?: string,
  bio?: string
): Promise<UserProfile> {
  try {
    // Build profile object, only including fields that are not undefined
    const profileData: any = {
      name,
      email,
      organizations: [],
      role: 'viewer',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Only add avatar and bio if they are truthy strings (not undefined, null, or empty)
    if (avatar !== undefined && avatar !== null && avatar !== '') {
      profileData.avatar = avatar;
    }
    if (bio !== undefined && bio !== null && bio !== '') {
      profileData.bio = bio;
    }

    const docRef = doc(db, COLLECTION_NAME, userId);
    await setDoc(docRef, profileData);

    // Return object - ensure no undefined values
    const returnProfile: UserProfile = {
      id: userId,
      name,
      email,
      organizations: [],
      role: 'viewer',
      createdAt: profileData.createdAt,
      updatedAt: profileData.updatedAt,
    };

    // Only add optional fields if they exist in profileData
    if (profileData.avatar) {
      returnProfile.avatar = profileData.avatar;
    }
    if (profileData.bio) {
      returnProfile.bio = profileData.bio;
    }

    return returnProfile;
  } catch (error) {
    console.error('Error creating user profile:', error);
    throw error;
  }
}

export async function updateUserProfile(
  userId: string,
  updates: Partial<Pick<UserProfile, 'name' | 'avatar' | 'bio' | 'role' | 'mustChangePassword'>>
): Promise<void> {
  try {
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (updates.name !== undefined && updates.name !== null && updates.name !== '') {
      updateData.name = updates.name;
    }
    if (updates.avatar !== undefined && updates.avatar !== null && updates.avatar !== '') {
      updateData.avatar = updates.avatar;
    }
    if (updates.bio !== undefined && updates.bio !== null && updates.bio !== '') {
      updateData.bio = updates.bio;
    }
    if (updates.role !== undefined && PORTAL_ROLES.includes(updates.role)) {
      updateData.role = updates.role;
    }
    if (updates.mustChangePassword !== undefined) {
      updateData.mustChangePassword = updates.mustChangePassword;
    }

    const docRef = doc(db, COLLECTION_NAME, userId);
    await updateDoc(docRef, updateData);
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
}

export async function addOrganizationToProfile(
  userId: string,
  organizationId: string
): Promise<void> {
  try {
    const profile = await getUserProfile(userId);
    if (!profile) {
      throw new Error('User profile not found');
    }

    if (!profile.organizations.includes(organizationId)) {
      const docRef = doc(db, COLLECTION_NAME, userId);
      await updateDoc(docRef, {
        organizations: [...profile.organizations, organizationId],
        updatedAt: new Date(),
      });
    }
  } catch (error) {
    console.error('Error adding organization to profile:', error);
    throw error;
  }
}

export async function listUserProfiles(): Promise<UserProfile[]> {
  try {
    const profilesRef = collection(db, COLLECTION_NAME);
    const querySnapshot = await getDocs(profilesRef);
    return querySnapshot.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        role: normalizeProfileRole(data.role),
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as UserProfile;
    });
  } catch (error) {
    console.error('Error listing user profiles:', error);
    throw error;
  }
}

export async function getUserProfilesByOrganization(
  organizationId: string
): Promise<UserProfile[]> {
  try {
    const profilesRef = collection(db, COLLECTION_NAME);
    const q = query(profilesRef, where('organizations', 'array-contains', organizationId));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        role: normalizeProfileRole(data.role),
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as UserProfile;
    });
  } catch (error) {
    console.error('Error getting user profiles by organization:', error);
    throw error;
  }
}

export async function deleteUserProfile(userId: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, userId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting user profile:', error);
    throw error;
  }
}
