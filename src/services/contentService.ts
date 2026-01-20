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
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

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

export interface TeamMember {
  id?: string;
  name: string;
  role?: string; // e.g., "Compassion Course Author and Lead Trainer"
  bio: string; // Biography paragraphs (array of strings or single string)
  photo: string; // Path to photo, e.g., "/Team/ThomBond.png"
  contact?: string; // Email or contact info
  teamSection: string; // e.g., "English Team", "German Team", "Arabic Team"
  order?: number; // For ordering within team section
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  updatedBy?: string;
}

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
 * Get all content items (admin only - includes inactive)
 */
export const getAllContent = async (): Promise<ContentSection[]> => {
  try {
    const contentRef = collection(db, 'content');
    const q = query(contentRef, orderBy('section', 'asc'), orderBy('order', 'asc'));
    
    const snapshot = await getDocs(q);
    const items = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as ContentItem[];
    
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
 */
export const getAllTeamMembers = async (): Promise<TeamMember[]> => {
  try {
    const teamRef = collection(db, 'teamMembers');
    const q = query(teamRef, orderBy('teamSection', 'asc'), orderBy('order', 'asc'));
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as TeamMember[];
  } catch (error) {
    console.error('Error fetching all team members:', error);
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
  ];
};
