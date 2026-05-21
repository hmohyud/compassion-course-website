import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { ensureTeamSuffix } from '../utils/contentUtils';

export interface ContentItem {
  id?: string;
  section: string; // e.g., 'hero', 'about', 'programs', 'testimonials'
  key: string; // Unique key within section, e.g., 'title', 'subtitle', 'description'
  value: string | any; // Content value (string or object for complex content)
  type: 'text' | 'html' | 'rich' | 'image' | 'array' | 'object'; // Content type
  order?: number; // For ordering items within a section
  isActive?: boolean; // Whether content is published
  createdAt?: Date;
  updatedAt?: Date;
  updatedBy?: string; // Email of admin who last updated
}

export interface ContentSection {
  section: string;
  items: ContentItem[];
}

export interface TeamLanguageSection {
  id?: string;
  name: string; // e.g., "English Team", "German Team"
  order?: number; // For ordering sections
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  updatedBy?: string;
}

export interface TeamMember {
  id?: string;
  name: string;
  role?: string; // e.g., "Compassion Course Author and Lead Trainer"
  bio: string; // Biography paragraphs (array of strings or single string)
  photo: string; // Firebase Storage URL or path to photo
  contact?: string; // Email or contact info
  teamSection: string; // References TeamLanguageSection ID (legacy data may contain section name)
  order?: number; // For ordering within team section
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  updatedBy?: string;
}

// ============================================================
// Fallback data for when Firebase is not configured (local dev)
// ============================================================
const FALLBACK_LANGUAGE_SECTIONS: TeamLanguageSection[] = [
  { id: 'english', name: 'English', order: 0, isActive: true },
];

const FALLBACK_TEAM_MEMBERS: TeamMember[] = [
  {
    id: 'thom-bond',
    name: 'Thom Bond',
    role: 'Compassion Course Author and Lead Trainer, Founder and Director of Education of NYCNVC',
    bio: 'Thom brings 29 years of human potential experience and training experience to his work as an Internationally Certified NVC Trainer. His passion and knowledge of Nonviolent Communication (NVC) combine to create a practical, understandable, humorous, and potentially profound approach for learning and integrating the skills of peacemaking. He is described as concise, inspiring, sincere and optimistic, applying transformational and spiritual ideas and sensibilities to real-life situations. Many of his students become active facilitators, trainers and practitioners.\nAs a trainer, speaker, mediator, and coach, Thom has taught tens of thousands of clients, participants, readers and listeners Nonviolent Communication. He has been published or featured in The New York Times, New York Magazine, Yoga Magazine.\nHe is a founder and the Director of Education for The New York Center for Nonviolent Communication (NYCNVC), the creator of The Compassion Course, a member of the Communications Coordination Committee for the United Nations and a CNVC IIT trainer.',
    photo: '/Team/ThomBond.png',
    contact: 'thombond@nycnvc.org',
    teamSection: 'english',
    order: 0,
    isActive: true,
  },
  {
    id: 'clara-moisello',
    name: 'Clara Moisello, PhD',
    role: 'Co-Director and Lead Trainer',
    bio: 'Clara Moisello embraced Nonviolent Communication as part of a journey of self-discovery and transformation that began once she left her home in Italy in 2006 to pursue her doctoral studies in New York. While still working as neuroscience researcher at CUNY, Clara became actively involved in supporting the NYCNVC community, participating in and facilitating practice groups and intensives and training under the mentorship of Thom Bond. Eventually, this led her to a life and career shift.\nAs of today, Clara has completed over 1000 hours of NVC training and supports NYCNVC both as Lead Trainer and Co-Director. She is also the founder and leader of Compassion Course Italia - the Italian chapter of the renown Compassion Course Online, written and facilitated by Thom Bond, serving over 100 countries in 16 languages.\nFrom her initial participation in coordinating and facilitating workshops to her current position as Co-director and Lead Trainer, Clara has continuously evolved and contributed to the organization\'s growth. Driven by curiosity and creativity, she continuously explores new avenues to enhance the effectiveness of NVC. Her background in neuroscience, combined with contemplative practices, enriches her approach and adds depth to the work of NYCNVC.\nClara is committed to advancing the art and science of compassion, both within NYCNVC and beyond. Her work is driven by a desire to create a more empathetic and connected world, fostering compassionate dialogue and personal growth.',
    photo: '/Team/1769005145485-Clara_Moisello.webp',
    teamSection: 'english',
    order: 1,
    isActive: true,
  },
];

/**
 * Get all content items for a specific section
 */
export const getContentBySection = async (section: string): Promise<ContentItem[]> => {
  try {
    const contentRef = collection(db, 'content');
    const q = query(
      contentRef,
      where('section', '==', section),
      where('isActive', '==', true),
      orderBy('order', 'asc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as ContentItem[];
  } catch (error) {
    console.error(`Error fetching content for section ${section}:`, error);
    throw error;
  }
};

/**
 * Get a specific content item by section and key
 */
export const getContentItem = async (section: string, key: string): Promise<ContentItem | null> => {
  try {
    const contentRef = collection(db, 'content');
    const q = query(
      contentRef,
      where('section', '==', section),
      where('key', '==', key),
      where('isActive', '==', true)
    );
    
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    
    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    } as ContentItem;
  } catch (error) {
    console.error(`Error fetching content item ${section}.${key}:`, error);
    throw error;
  }
};

/**
 * Get content items for specific sections only
 */
export const getContentBySections = async (sectionNames: string[]): Promise<ContentSection[]> => {
  try {
    if (sectionNames.length === 0) return [];
    
    const startTime = Date.now();
    console.log(`📊 Fetching content for sections: ${sectionNames.join(', ')}`);
    
    const contentRef = collection(db, 'content');
    // Query for specific sections - use 'in' operator (max 10 sections per query)
    const queries = [];
    for (let i = 0; i < sectionNames.length; i += 10) {
      const batch = sectionNames.slice(i, i + 10);
      const q = query(
        contentRef,
        where('section', 'in', batch),
        limit(500) // Safety limit
      );
      queries.push(getDocs(q));
    }
    
    const snapshots = await Promise.all(queries);
    const items: ContentItem[] = [];
    
    snapshots.forEach(snapshot => {
      snapshot.docs.forEach(doc => {
        items.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate(),
          updatedAt: doc.data().updatedAt?.toDate(),
        } as ContentItem);
      });
    });
    
    const queryTime = Date.now() - startTime;
    console.log(`📊 Fetched ${items.length} content items in ${queryTime}ms`);
    
    // Sort in memory: first by section, then by order
    items.sort((a, b) => {
      if (a.section !== b.section) {
        return a.section.localeCompare(b.section);
      }
      return (a.order ?? 0) - (b.order ?? 0);
    });
    
    // Group by section
    const sections: { [key: string]: ContentItem[] } = {};
    items.forEach(item => {
      if (!sections[item.section]) {
        sections[item.section] = [];
      }
      sections[item.section].push(item);
    });
    
    return sectionNames.map(section => ({
      section,
      items: sections[section] || [],
    }));
  } catch (error: any) {
    console.error('Error fetching content by sections:', error);
    // Check for specific error codes
    if (error?.code === 'permission-denied' || error?.code === 'PERMISSION_DENIED') {
      console.error('❌ PERMISSION DENIED: Firestore security rules may not be deployed. Run: firebase deploy --only firestore:rules');
      const permissionError: any = new Error('Permission denied. Firestore security rules may not be deployed. Please deploy rules with: firebase deploy --only firestore:rules');
      permissionError.code = 'permission-denied';
      throw permissionError;
    }
    throw error;
  }
};

/**
 * Get all content items (admin only - includes inactive)
 * Note: This is kept for backward compatibility but should be avoided in favor of getContentBySections
 */
export const getAllContent = async (): Promise<ContentSection[]> => {
  try {
    const contentRef = collection(db, 'content');
    // Add limit for safety and filter by isActive if possible
    const q = query(
      contentRef,
      limit(1000) // Safety limit
    );
    
    const snapshot = await getDocs(q);
    const items = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as ContentItem[];
    
    // Sort in memory: first by section, then by order
    items.sort((a, b) => {
      if (a.section !== b.section) {
        return a.section.localeCompare(b.section);
      }
      return (a.order ?? 0) - (b.order ?? 0);
    });
    
    // Group by section
    const sections: { [key: string]: ContentItem[] } = {};
    items.forEach(item => {
      if (!sections[item.section]) {
        sections[item.section] = [];
      }
      sections[item.section].push(item);
    });
    
    return Object.keys(sections).map(section => ({
      section,
      items: sections[section],
    }));
  } catch (error) {
    console.error('Error fetching all content:', error);
    throw error;
  }
};

/**
 * Create or update a content item
 */
export const saveContentItem = async (
  item: ContentItem,
  updatedBy: string
): Promise<void> => {
  try {
    const contentRef = collection(db, 'content');
    
    // If item has an ID, update existing; otherwise create new
    if (item.id) {
      const docRef = doc(contentRef, item.id);
      await updateDoc(docRef, {
        ...item,
        updatedAt: Timestamp.now(),
        updatedBy,
      });
    } else {
      // Create new document with auto-generated ID
      const docRef = doc(contentRef);
      await setDoc(docRef, {
        ...item,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        updatedBy,
        isActive: item.isActive !== undefined ? item.isActive : true,
      });
    }
  } catch (error) {
    console.error('Error saving content item:', error);
    throw error;
  }
};

/**
 * Delete a content item (soft delete by setting isActive to false)
 */
export const deleteContentItem = async (id: string): Promise<void> => {
  try {
    const contentRef = collection(db, 'content');
    const docRef = doc(contentRef, id);
    await updateDoc(docRef, {
      isActive: false,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error deleting content item:', error);
    throw error;
  }
};

/**
 * Hard delete a content item (permanent removal)
 */
export const hardDeleteContentItem = async (id: string): Promise<void> => {
  try {
    const contentRef = collection(db, 'content');
    const docRef = doc(contentRef, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error hard deleting content item:', error);
    throw error;
  }
};

/**
 * Get all team members
 */
export const getTeamMembers = async (): Promise<TeamMember[]> => {
  if (!db) {
    // Return fallback team data when Firebase isn't configured
    return FALLBACK_TEAM_MEMBERS;
  }
  try {
    const teamRef = collection(db, 'teamMembers');
    const q = query(
      teamRef,
      where('isActive', '==', true),
      orderBy('teamSection', 'asc'),
      orderBy('order', 'asc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as TeamMember[];
  } catch (error) {
    console.error('Error fetching team members:', error);
    throw error;
  }
};

/**
 * Get all team members (admin - includes inactive)
 * Optimized with limit for better performance
 */
export const getAllTeamMembers = async (): Promise<TeamMember[]> => {
  try {
    const startTime = Date.now();
    console.log('📊 Fetching all team members...');
    
    const teamRef = collection(db, 'teamMembers');
    // Add limit for safety - most sites won't have more than 500 team members
    const q = query(
      teamRef,
      limit(500)
    );
    
    const snapshot = await getDocs(q);
    const queryTime = Date.now() - startTime;
    console.log(`📊 Fetched ${snapshot.docs.length} team members in ${queryTime}ms`);
    
    const members = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as TeamMember[];
    
    // Sort in memory: first by teamSection, then by order
    members.sort((a, b) => {
      if (a.teamSection !== b.teamSection) {
        return a.teamSection.localeCompare(b.teamSection);
      }
      return (a.order ?? 0) - (b.order ?? 0);
    });
    
    return members;
  } catch (error: any) {
    console.error('Error fetching all team members:', error);
    // Check for specific error codes
    if (error?.code === 'permission-denied' || error?.code === 'PERMISSION_DENIED') {
      console.error('❌ PERMISSION DENIED: Firestore security rules may not be deployed. Run: firebase deploy --only firestore:rules');
      const permissionError: any = new Error('Permission denied. Firestore security rules may not be deployed. Please deploy rules with: firebase deploy --only firestore:rules');
      permissionError.code = 'permission-denied';
      throw permissionError;
    }
    throw error;
  }
};

/**
 * Get team members by section
 */
export const getTeamMembersBySection = async (teamSection: string): Promise<TeamMember[]> => {
  try {
    const teamRef = collection(db, 'teamMembers');
    const q = query(
      teamRef,
      where('teamSection', '==', teamSection),
      where('isActive', '==', true),
      orderBy('order', 'asc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as TeamMember[];
  } catch (error) {
    console.error(`Error fetching team members for ${teamSection}:`, error);
    throw error;
  }
};

/**
 * Lightweight: fetch only the `name` field for every Guest Trainer.
 *
 * Used by pages that just need a count or a small label (e.g., the FAQ
 * "supported by N guest trainers around the world"). Compared to
 * `useTeamData()` which fetches every team member across every section
 * plus the full language-section collection, this:
 *   - skips the language-section fetch entirely (uses the static
 *     "Guest Trainers Team" name plus the resolved section ID via one
 *     small lookup)
 *   - reads only the documents whose teamSection points at Guest
 *     Trainers (typically ~10-12 docs vs. all 100+ team members)
 *   - returns just an array of name strings (still a full-document read
 *     per Firestore billing — Firestore has no field projection — but
 *     transfers far less data than the full hook)
 *
 * Filters out the special placeholder "TBA" so callers can use the
 * length as the live trainer count.
 */
export const getGuestTrainerNames = async (): Promise<string[]> => {
  const GUEST_TRAINER_SECTION = 'Guest Trainers Team';
  const isReal = (n?: string) =>
    !!n && n.trim().toUpperCase() !== 'TBA';

  if (!db) {
    // Static fallback: pull from siteContent if Firebase isn't wired up.
    // siteContent doesn't currently include a "Guest Trainers" section,
    // so we return an empty list rather than a misleading hard-coded
    // number.
    return [];
  }

  try {
    // Look up the section ID (one tiny query, single doc).
    const sectionsRef = collection(db, 'teamLanguageSections');
    const sectionSnap = await getDocs(
      query(sectionsRef, where('name', '==', GUEST_TRAINER_SECTION), limit(1))
    );
    const sectionId = sectionSnap.docs[0]?.id;

    // Fetch members whose teamSection points at the Guest Trainers section.
    // Members may store either the resolved section ID (current scheme) or
    // the legacy name string, so include both in an `in` clause.
    const teamSectionValues = sectionId
      ? [sectionId, GUEST_TRAINER_SECTION]
      : [GUEST_TRAINER_SECTION];
    const teamRef = collection(db, 'teamMembers');
    const memberSnap = await getDocs(
      query(
        teamRef,
        where('teamSection', 'in', teamSectionValues),
        where('isActive', '==', true)
      )
    );

    return memberSnap.docs
      .map((d) => (d.data().name as string | undefined))
      .filter(isReal) as string[];
  } catch (error) {
    console.error('Error fetching guest trainer names:', error);
    return [];
  }
};

/**
 * Save a team member (create or update)
 */
export const saveTeamMember = async (
  member: TeamMember,
  updatedBy: string
): Promise<void> => {
  try {
    const teamRef = collection(db, 'teamMembers');
    
    if (member.id) {
      const docRef = doc(teamRef, member.id);
      await updateDoc(docRef, {
        ...member,
        updatedAt: Timestamp.now(),
        updatedBy,
      });
    } else {
      const docRef = doc(teamRef);
      await setDoc(docRef, {
        ...member,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        updatedBy,
        isActive: member.isActive !== undefined ? member.isActive : true,
        order: member.order ?? 0,
      });
    }
  } catch (error) {
    console.error('Error saving team member:', error);
    throw error;
  }
};

/**
 * Delete a team member (soft delete)
 */
export const deleteTeamMember = async (id: string): Promise<void> => {
  try {
    const teamRef = collection(db, 'teamMembers');
    const docRef = doc(teamRef, id);
    await updateDoc(docRef, {
      isActive: false,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error deleting team member:', error);
    throw error;
  }
};

/**
 * Hard delete a team member
 */
export const hardDeleteTeamMember = async (id: string): Promise<void> => {
  try {
    const teamRef = collection(db, 'teamMembers');
    const docRef = doc(teamRef, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error hard deleting team member:', error);
    throw error;
  }
};

/**
 * Get all language sections (admin - includes inactive)
 * Optimized with limit for better performance
 */
export const getAllLanguageSections = async (): Promise<TeamLanguageSection[]> => {
  try {
    const startTime = Date.now();
    console.log('📊 Fetching all language sections...');
    
    const sectionsRef = collection(db, 'teamLanguageSections');
    // Add limit for safety - most sites won't have more than 50 language sections
    const q = query(
      sectionsRef,
      limit(50)
    );
    
    const snapshot = await getDocs(q);
    const queryTime = Date.now() - startTime;
    console.log(`📊 Fetched ${snapshot.docs.length} language sections in ${queryTime}ms`);
    
    const sections = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as TeamLanguageSection[];
    
    // Sort in memory by order
    sections.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    
    return sections;
  } catch (error: any) {
    console.error('Error fetching language sections:', error);
    // Check for specific error codes
    if (error?.code === 'permission-denied' || error?.code === 'PERMISSION_DENIED') {
      console.error('❌ PERMISSION DENIED: Firestore security rules may not be deployed. Run: firebase deploy --only firestore:rules');
      const permissionError: any = new Error('Permission denied. Firestore security rules may not be deployed. Please deploy rules with: firebase deploy --only firestore:rules');
      permissionError.code = 'permission-denied';
      throw permissionError;
    }
    throw error;
  }
};

/**
 * Get active language sections only
 */
export const getLanguageSections = async (): Promise<TeamLanguageSection[]> => {
  if (!db) {
    // Return fallback sections when Firebase isn't configured
    return FALLBACK_LANGUAGE_SECTIONS;
  }
  try {
    const sectionsRef = collection(db, 'teamLanguageSections');
    const q = query(sectionsRef, where('isActive', '==', true));
    
    const snapshot = await getDocs(q);
    const sections = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as TeamLanguageSection[];
    
    // Sort in memory by order
    sections.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    
    return sections;
  } catch (error) {
    console.error('Error fetching active language sections:', error);
    throw error;
  }
};

/**
 * Migrate team members that reference a section by name to use the section ID instead.
 * Handles both the old name and new name to catch all orphaned members.
 */
const migrateTeamMembersToSectionId = async (
  sectionId: string,
  oldName: string | null,
  newName: string
): Promise<void> => {
  try {
    const teamRef = collection(db, 'teamMembers');
    const batch = writeBatch(db);
    let updateCount = 0;

    // Find members referencing this section by any name variant (not by ID)
    const namesToCheck = new Set<string>();
    if (oldName) {
      namesToCheck.add(oldName);
      namesToCheck.add(ensureTeamSuffix(oldName));
    }
    namesToCheck.add(newName);
    namesToCheck.add(ensureTeamSuffix(newName));
    // Don't migrate members that already use the correct ID
    namesToCheck.delete(sectionId);

    for (const name of namesToCheck) {
      const q = query(teamRef, where('teamSection', '==', name));
      const snap = await getDocs(q);
      snap.forEach((docSnap) => {
        batch.update(docSnap.ref, { teamSection: sectionId });
        updateCount++;
      });
    }

    if (updateCount > 0) {
      await batch.commit();
      console.log(`✅ Migrated ${updateCount} team member(s) to section ID: ${sectionId}`);
    }
  } catch (error) {
    console.error('Error migrating team members to section ID:', error);
    // Don't throw — migration is best-effort, section save already succeeded
  }
};

/**
 * Save a language section (create or update)
 */
export const saveLanguageSection = async (
  section: TeamLanguageSection,
  updatedBy: string
): Promise<TeamLanguageSection> => {
  try {
    const sectionsRef = collection(db, 'teamLanguageSections');
    
    if (section.id) {
      // Update existing section
      const docRef = doc(sectionsRef, section.id);

      // Get old name before updating so we can migrate members
      const oldDoc = await getDoc(docRef);
      const oldName = oldDoc.exists() ? oldDoc.data()?.name : null;

      await updateDoc(docRef, {
        name: section.name,
        order: section.order ?? 0,
        isActive: section.isActive !== undefined ? section.isActive : true,
        updatedAt: Timestamp.now(),
        updatedBy,
      });

      // Migrate members: update any that reference this section by old name to use section ID
      await migrateTeamMembersToSectionId(section.id, oldName, section.name);

      return { ...section, updatedAt: new Date() };
    } else {
      // Create new section
      const docRef = doc(sectionsRef);
      const newSectionData = {
        name: section.name.trim(),
        order: section.order ?? 0,
        isActive: section.isActive !== undefined ? section.isActive : true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        updatedBy,
      };
      await setDoc(docRef, newSectionData);
      console.log('✅ New language section created with ID:', docRef.id);
      return {
        ...section,
        id: docRef.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
  } catch (error) {
    console.error('Error saving language section:', error);
    throw error;
  }
};

/**
 * Delete a language section (soft delete)
 */
export const deleteLanguageSection = async (id: string): Promise<void> => {
  try {
    const sectionsRef = collection(db, 'teamLanguageSections');
    const docRef = doc(sectionsRef, id);
    await updateDoc(docRef, {
      isActive: false,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error deleting language section:', error);
    throw error;
  }
};

/**
 * Bulk-migrate all team members from name-based teamSection to ID-based.
 * Called on data load to auto-fix legacy data. Idempotent.
 */
export const migrateAllTeamMembersToSectionIds = async (
  sections: TeamLanguageSection[],
  members: TeamMember[]
): Promise<void> => {
  try {
    // Build name→ID lookup (including normalized variants)
    const nameToId = new Map<string, string>();
    sections.forEach((s) => {
      if (!s.id) return;
      nameToId.set(s.name, s.id);
      nameToId.set(ensureTeamSuffix(s.name), s.id);
    });

    // Build set of valid section IDs for quick lookup
    const validIds = new Set(sections.map((s) => s.id).filter(Boolean));

    const teamRef = collection(db, 'teamMembers');
    const batch = writeBatch(db);
    let updateCount = 0;

    for (const member of members) {
      if (!member.id) continue;
      // Skip if already using a valid section ID
      if (validIds.has(member.teamSection)) continue;
      // Resolve name to ID
      const resolvedId = nameToId.get(member.teamSection);
      if (resolvedId) {
        batch.update(doc(teamRef, member.id), { teamSection: resolvedId });
        updateCount++;
      }
    }

    if (updateCount > 0) {
      await batch.commit();
      console.log(`✅ Auto-migrated ${updateCount} team member(s) from name to section ID`);
    }
  } catch (error) {
    console.error('Auto-migration of team sections failed (non-blocking):', error);
  }
};

/**
 * Hard delete a language section
 */
export const hardDeleteLanguageSection = async (id: string): Promise<void> => {
  try {
    const sectionsRef = collection(db, 'teamLanguageSections');
    const docRef = doc(sectionsRef, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error hard deleting language section:', error);
    throw error;
  }
};

/**
 * Get content structure for CMS (all sections and their expected keys)
 */
export const getContentStructure = (): { section: string; keys: { key: string; label: string; type: ContentItem['type'] }[] }[] => {
  return [
    {
      section: 'hero',
      keys: [
        { key: 'title', label: 'Hero Title', type: 'text' },
        { key: 'subtitle', label: 'Hero Subtitle', type: 'text' },
        { key: 'ctaPrimary', label: 'Primary CTA Text', type: 'text' },
        { key: 'ctaSecondary', label: 'Secondary CTA Text', type: 'text' },
      ],
    },
    {
      section: 'hero-stats',
      keys: [
        { key: 'stat1-title', label: 'Stat 1 Title', type: 'text' },
        { key: 'stat1-description', label: 'Stat 1 Description', type: 'rich' },
        { key: 'stat2-title', label: 'Stat 2 Title', type: 'text' },
        { key: 'stat2-description', label: 'Stat 2 Description', type: 'rich' },
        { key: 'stat3-title', label: 'Stat 3 Title', type: 'text' },
        { key: 'stat3-description', label: 'Stat 3 Description', type: 'rich' },
      ],
    },
    {
      section: 'programs',
      keys: [
        { key: 'title', label: 'Programs Section Title', type: 'text' },
        { key: 'description', label: 'Programs Section Description', type: 'rich' },
      ],
    },
    {
      section: 'about',
      keys: [
        { key: 'title', label: 'About Section Title', type: 'text' },
        { key: 'description', label: 'About Description', type: 'rich' },
        { key: 'stat1-value', label: 'Stat 1 Value', type: 'text' },
        { key: 'stat1-label', label: 'Stat 1 Label', type: 'text' },
        { key: 'stat2-value', label: 'Stat 2 Value', type: 'text' },
        { key: 'stat2-label', label: 'Stat 2 Label', type: 'text' },
      ],
    },
    {
      section: 'testimonials',
      keys: [
        { key: 'title', label: 'Testimonials Section Title', type: 'text' },
      ],
    },
    {
      section: 'cta',
      keys: [
        { key: 'title', label: 'CTA Title', type: 'text' },
        { key: 'description', label: 'CTA Description', type: 'rich' },
        { key: 'buttonPrimary', label: 'Primary Button Text', type: 'text' },
        { key: 'buttonSecondary', label: 'Secondary Button Text', type: 'text' },
      ],
    },
    {
      section: 'contact-page',
      keys: [
        { key: 'email', label: 'Contact Email', type: 'text' },
        { key: 'phone', label: 'Phone Number', type: 'text' },
        { key: 'phone-display', label: 'Phone Display Text', type: 'text' },
        { key: 'address', label: 'Office Address (HTML allowed)', type: 'rich' },
        { key: 'form-title', label: 'Form Title', type: 'text' },
        { key: 'success-message', label: 'Form Success Message', type: 'text' },
      ],
    },
  ];
};
