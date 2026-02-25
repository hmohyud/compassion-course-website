import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  getAllContent, 
  getContentBySections,
  saveContentItem, 
  deleteContentItem,
  getContentStructure,
  ContentItem,
  ContentSection,
  getAllTeamMembers,
  saveTeamMember,
  deleteTeamMember,
  TeamMember,
  getAllLanguageSections,
  saveLanguageSection,
  deleteLanguageSection,
  TeamLanguageSection
} from '../../services/contentService';
import { 
  uploadTeamMemberPhoto, 
  createImagePreview,
  validateImageFile 
} from '../../services/photoUploadService';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useNavigate } from 'react-router-dom';
import { useContent } from '../../context/ContentContext';
import { renderHTML, ensureTeamSuffix } from '../../utils/contentUtils';

// Section definitions
type SectionId = 'about' | 'programs' | 'contact';

interface SectionDefinition {
  id: SectionId;
  name: string;
  description: string;
  contentSections: string[]; // Content sections that belong to this page section
}

const SECTIONS: SectionDefinition[] = [
  {
    id: 'about',
    name: 'About Us',
    description: 'Manage team members and language sections',
    contentSections: []
  },
  {
    id: 'programs',
    name: 'Programs',
    description: 'Edit programs page content',
    contentSections: ['programs-page']
  },
  {
    id: 'contact',
    name: 'Contact',
    description: 'Edit contact page content',
    contentSections: ['contact-page']
  }
];

// Sortable Person Item Component
interface SortablePersonItemProps {
  member: TeamMember;
  onEdit: (member: TeamMember) => void;
  onDelete: (id: string) => void;
}

const SortablePersonItem: React.FC<SortablePersonItemProps> = ({ member, onEdit, onDelete }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: member.id || '' });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`cm-member-card${!member.isActive ? ' cm-member-card--inactive' : ''}${isDragging ? ' cm-member-card--dragging' : ''}`}
    >
      <div className="cm-member-card__left">
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="cm-member-card__drag"
        >
          ⋮⋮
        </div>

        {/* Photo Thumbnail */}
        {member.photo && (
          <img
            src={member.photo}
            alt={member.name}
            className="cm-member-card__photo"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        )}

        {/* Member Info */}
        <div className="cm-member-card__info">
          <div className="cm-member-card__name-row">
            <span className="cm-member-card__name">{member.name}</span>
            {member.role && (
              <span className="cm-member-card__role">{member.role}</span>
            )}
            {!member.isActive && (
              <span className="cm-badge--inactive">Inactive</span>
            )}
          </div>
          {member.bio && (
            <div className="cm-member-card__bio">
              {typeof member.bio === 'string'
                ? (member.bio.length > 100 ? member.bio.substring(0, 100) + '...' : member.bio)
                : 'Bio available'
              }
            </div>
          )}
          {member.contact && (
            <div className="cm-member-card__contact">
              Contact: {member.contact}
            </div>
          )}
          <div className="cm-member-card__order">
            Order: {member.order ?? 0}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="cm-member-card__actions">
        <button
          onClick={() => onEdit(member)}
          className="btn btn-small btn-secondary"
        >
          Edit
        </button>
        <button
          onClick={() => member.id && onDelete(member.id)}
          className="btn btn-small btn-danger"
        >
          Delete
        </button>
      </div>
    </div>
  );
};

const ContentManagement: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sections, setSections] = useState<ContentSection[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [languageSections, setLanguageSections] = useState<TeamLanguageSection[]>([]);
  const [loadedSections, setLoadedSections] = useState<Set<SectionId>>(new Set()); // Track which sections have been loaded
  const [loading, setLoading] = useState(false); // Don't block UI on initial load
  const [contentLoading, setContentLoading] = useState(false);
  const [membersLoading, setMembersLoading] = useState(false);
  const [sectionsLoading, setSectionsLoading] = useState(false);
  const [editingItem, setEditingItem] = useState<ContentItem | null>(null);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [editingLanguageSection, setEditingLanguageSection] = useState<TeamLanguageSection | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [expandedLanguageSections, setExpandedLanguageSections] = useState<Set<string>>(new Set());
  const [activeSection, setActiveSection] = useState<SectionId>('about');
  const { getContent } = useContent();
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Load data for active section when it changes
  useEffect(() => {
    if (!loadedSections.has(activeSection)) {
      loadSectionData(activeSection);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection]); // Only depend on activeSection, not loadedSections to avoid loops

  // Helper function for retry logic with exponential backoff
  const loadWithRetry = async (
    queryFn: () => Promise<any>,
    maxRetries: number = 2,
    operationName: string
  ): Promise<any> => {
    const startTime = Date.now();
    console.log(`🔄 Starting ${operationName}...`);
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await queryFn();
        const duration = Date.now() - startTime;
        console.log(`✅ ${operationName} completed in ${duration}ms (attempt ${attempt + 1})`);
        return result;
      } catch (error: any) {
        const duration = Date.now() - startTime;
        const isLastAttempt = attempt === maxRetries;
        
        console.error(`❌ ${operationName} failed (attempt ${attempt + 1}/${maxRetries + 1}) after ${duration}ms:`, error);
        
        if (isLastAttempt) {
          throw error;
        }
        
        // Exponential backoff: 1s, 2s, 4s
        const delay = 1000 * Math.pow(2, attempt);
        console.log(`⏳ Retrying ${operationName} in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw new Error(`${operationName} failed after ${maxRetries + 1} attempts`);
  };

  const loadSectionData = async (sectionId: SectionId) => {
    const sectionDef = SECTIONS.find(s => s.id === sectionId);
    if (!sectionDef) return;
    
    try {
      // Always clear error when switching sections
      setError(null);
      setSuccess(null);
      const timeout = 15000; // Increased to 15 seconds for initial load
      
      // Load only data needed for this section
      if (sectionId === 'about') {
        setMembersLoading(true);
        setSectionsLoading(true);
        
        let membersError: string | null = null;
        let sectionsError: string | null = null;
        
        // Load team members with retry
        const loadMembers = async () => {
          try {
            const timeoutPromise = new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('Team members loading timeout after 15 seconds')), timeout)
            );
            
            const members = await loadWithRetry(
              () => Promise.race([getAllTeamMembers(), timeoutPromise]),
              2,
              'Team members loading'
            );
            setTeamMembers(members);
            membersError = null;
          } catch (memberError: any) {
            console.error('Error loading team members:', memberError);
            const errorMsg = memberError?.message || 'Unknown error';
            
            if (memberError?.code === 'permission-denied' || memberError?.code === 'PERMISSION_DENIED') {
              membersError = 'Permission denied loading team members. Check Firestore security rules.';
              console.warn(membersError);
            } else if (errorMsg.includes('timeout')) {
              membersError = 'Team members loading timed out. You can continue working or retry.';
              console.warn(membersError);
            } else if (memberError?.code === 'unavailable' || errorMsg.includes('network')) {
              membersError = 'Network error loading team members. Check your internet connection.';
              console.warn(membersError);
            } else {
              membersError = 'Failed to load team members: ' + errorMsg;
              console.warn(membersError);
            }
          } finally {
            setMembersLoading(false);
          }
        };
        
        // Load language sections with retry
        const loadLangSections = async () => {
          try {
            const timeoutPromise = new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('Language sections loading timeout after 15 seconds')), timeout)
            );
            
            const langSections = await loadWithRetry(
              () => Promise.race([getAllLanguageSections(), timeoutPromise]),
              2,
              'Language sections loading'
            );
            setLanguageSections(langSections);
            sectionsError = null;
            
            // Expand first language section by default
            if (langSections.length > 0) {
              setExpandedLanguageSections(new Set([langSections[0].id || '']));
            }
          } catch (langError: any) {
            console.error('Error loading language sections:', langError);
            const errorMsg = langError?.message || 'Unknown error';
            
            if (langError?.code === 'permission-denied' || langError?.code === 'PERMISSION_DENIED') {
              sectionsError = 'Permission denied loading language sections. Check Firestore security rules.';
              console.warn(sectionsError);
            } else if (errorMsg.includes('timeout')) {
              sectionsError = 'Language sections loading timed out. You can continue working or retry.';
              console.warn(sectionsError);
            } else if (langError?.code === 'unavailable' || errorMsg.includes('network')) {
              sectionsError = 'Network error loading language sections. Check your internet connection.';
              console.warn(sectionsError);
            } else {
              sectionsError = 'Could not load language sections: ' + errorMsg;
              console.warn(sectionsError);
            }
          } finally {
            setSectionsLoading(false);
          }
        };
        
        // Load both in parallel
        await Promise.allSettled([loadMembers(), loadLangSections()]);
        
        // Set error message only if both failed, or show specific messages
        if (membersError && sectionsError) {
          setError(`Failed to load About Us data: ${membersError} ${sectionsError}`);
        } else if (membersError) {
          setError(`Team members: ${membersError} Language sections loaded successfully.`);
        } else if (sectionsError) {
          setError(`Language sections: ${sectionsError} Team members loaded successfully.`);
        }
      } else if (sectionId === 'programs' || sectionId === 'contact') {
        setContentLoading(true);
        try {
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Content loading timeout after 15 seconds')), timeout)
          );
          
          // Only load content for this section with retry
          const content = await loadWithRetry(
            () => Promise.race([
              getContentBySections(sectionDef.contentSections),
              timeoutPromise
            ]),
            2,
            'Content loading'
          );
          
          // Merge with existing sections
          setSections(prev => {
            const existing = prev.filter(s => !sectionDef.contentSections.includes(s.section));
            return [...existing, ...content];
          });
        } catch (contentError: any) {
          console.error('Error loading content:', contentError);
          const errorMsg = contentError?.message || 'Unknown error';
          
          if (contentError?.code === 'permission-denied' || contentError?.code === 'PERMISSION_DENIED') {
            setError('Permission denied. Check Firestore security rules.');
          } else if (errorMsg.includes('timeout')) {
            setError('Content loading timed out. Try again or continue with cached data.');
          } else if (contentError?.code === 'unavailable' || errorMsg.includes('network')) {
            setError('Unable to connect to Firestore. Check your internet connection.');
          } else {
            setError('Failed to load content: ' + errorMsg);
          }
        } finally {
          setContentLoading(false);
        }
      }
      
      // Mark this section as loaded (even if some data failed)
      setLoadedSections(prev => new Set([...prev, sectionId]));
      
    } catch (err: any) {
      console.error('Unexpected error loading section data:', err);
      setError('Failed to load section data: ' + (err.message || 'Unknown error'));
    }
  };

  // Legacy function for refreshing data after saves/deletes
  const loadContent = async () => {
    // Refresh the current active section
    setLoadedSections(prev => {
      const updated = new Set(prev);
      updated.delete(activeSection);
      return updated;
    });
    await loadSectionData(activeSection);
  };

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const handleEdit = (item: ContentItem) => {
    setEditingItem({ ...item });
    setError(null);
    setSuccess(null);
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
    setError(null);
    setSuccess(null);
  };

  const handleSave = async () => {
    if (!editingItem || !user?.email) return;

    try {
      setSaving(true);
      setError(null);
      
      await saveContentItem(editingItem, user.email);
      setSuccess('Content saved successfully!');
      
      // Reload content
      await loadContent();
      
      // Clear editing after a short delay
      setTimeout(() => {
        setEditingItem(null);
        setSuccess(null);
      }, 1500);
    } catch (err: any) {
      setError('Failed to save content: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this content item?')) return;

    try {
      setError(null);
      await deleteContentItem(id);
      setSuccess('Content deleted successfully!');
      await loadContent();
      setTimeout(() => setSuccess(null), 2000);
    } catch (err: any) {
      setError('Failed to delete content: ' + err.message);
    }
  };

  const handleEditMember = (member: TeamMember) => {
    setEditingMember({ ...member });
    setPhotoPreview(member.photo || null);
    setPhotoFile(null);
    setError(null);
    setSuccess(null);
  };

  const handleCancelEditMember = () => {
    setEditingMember(null);
    setPhotoPreview(null);
    setPhotoFile(null);
    setError(null);
    setSuccess(null);
  };


  const handleDeleteMember = async (id: string) => {
    if (!confirm('Are you sure you want to delete this team member?')) return;

    try {
      setError(null);
      await deleteTeamMember(id);
      setSuccess('Team member deleted successfully!');
      await loadContent();
      setTimeout(() => setSuccess(null), 2000);
    } catch (err: any) {
      setError('Failed to delete team member: ' + err.message);
    }
  };

  const handleAddNewMember = (languageSectionId?: string) => {
    const defaultSection = languageSections.length > 0 ? languageSections[0].name : 'English Team';
    const sectionName = languageSectionId 
      ? languageSections.find(s => s.id === languageSectionId)?.name || defaultSection
      : defaultSection;
    
    setEditingMember({
      name: '',
      role: '',
      bio: '',
      photo: '',
      contact: '',
      teamSection: sectionName,
      order: 0,
      isActive: true,
    });
    setPhotoPreview(null);
    setPhotoFile(null);
    setError(null);
    setSuccess(null);
  };

  const handleEditLanguageSection = (section: TeamLanguageSection) => {
    setEditingLanguageSection({ ...section });
    setError(null);
    setSuccess(null);
  };

  const handleCancelEditLanguageSection = () => {
    setEditingLanguageSection(null);
    setError(null);
    setSuccess(null);
  };

  const handleSaveLanguageSection = async () => {
    if (!editingLanguageSection || !user?.email) {
      setError('Missing required information. Please ensure you are logged in.');
      return;
    }

    // Validate name is not empty
    if (!editingLanguageSection.name || editingLanguageSection.name.trim() === '') {
      setError('Section name is required. Please enter a name for the language section.');
      return;
    }

    // Helper function to add timeout to async operations
    const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number, operationName: string): Promise<T> => {
      return Promise.race([
        promise,
        new Promise<T>((_, reject) =>
          setTimeout(() => reject(new Error(`${operationName} timed out after ${timeoutMs}ms`)), timeoutMs)
        )
      ]);
    };

    try {
      setSaving(true);
      setError(null);
      
      // Normalize the name to ensure it has "Team" suffix
      const normalizedSection = {
        ...editingLanguageSection,
        name: ensureTeamSuffix(editingLanguageSection.name)
      };
      
      console.log('💾 Saving language section:', normalizedSection);
      
      // Save with timeout (10 seconds)
      const saveTimeout = 10000;
      await withTimeout(
        saveLanguageSection(normalizedSection, user.email),
        saveTimeout,
        'Save language section'
      );
      
      console.log('✅ Language section saved successfully');
      setSuccess('Language section saved successfully!');
      
      // Close modal and show success immediately
      setTimeout(() => {
        setEditingLanguageSection(null);
        setSuccess(null);
      }, 1500);
      
      // Refresh in background (non-blocking) - don't wait for it
      setLoadedSections(prev => {
        const updated = new Set(prev);
        updated.delete('about');
        return updated;
      });
      
      // Refresh in background without blocking
      loadSectionData('about').catch((refreshError: any) => {
        console.warn('⚠️ Background refresh failed (non-blocking):', refreshError);
        // Don't show error to user - they can manually refresh if needed
      });
      
    } catch (err: any) {
      console.error('❌ Error saving language section:', err);
      const errorMessage = err?.message || 'Unknown error occurred';
      
      if (errorMessage.includes('timed out')) {
        setError('Save operation timed out. The section may have been saved. Please refresh the page to check, or try again.');
      } else if (err?.code === 'permission-denied' || err?.code === 'PERMISSION_DENIED') {
        setError('Permission denied. Check Firestore security rules to ensure admin access is allowed.');
      } else if (err?.code === 'unavailable' || errorMessage.includes('network')) {
        setError('Network error. Please check your internet connection and try again.');
      } else {
        setError('Failed to save language section: ' + errorMessage);
      }
    } finally {
      // Always reset saving state, even if operations hang
      setSaving(false);
    }
  };

  const handleDeleteLanguageSection = async (id: string) => {
    if (!confirm('Are you sure you want to delete this language section? This will not delete team members, but they will need to be reassigned to another section.')) return;

    try {
      setError(null);
      await deleteLanguageSection(id);
      setSuccess('Language section deleted successfully!');
      await loadContent();
      setTimeout(() => setSuccess(null), 2000);
    } catch (err: any) {
      setError('Failed to delete language section: ' + err.message);
    }
  };

  const handleAddNewLanguageSection = () => {
    console.log('🔄 Adding new language section...');
    const newSection: TeamLanguageSection = {
      name: '',
      order: languageSections.length,
      isActive: true,
    };
    setEditingLanguageSection(newSection);
    setError(null);
    setSuccess(null);
    console.log('✅ editingLanguageSection state set:', newSection);
  };

  const toggleLanguageSection = (sectionId: string) => {
    const newExpanded = new Set(expandedLanguageSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedLanguageSections(newExpanded);
  };

  const getMembersForSection = (sectionName: string): TeamMember[] => {
    // Normalize the section name for matching
    const normalizedName = ensureTeamSuffix(sectionName);
    return teamMembers
      .filter(m => {
        // Match if teamSection equals either the original or normalized name (for backward compatibility)
        const memberSection = m.teamSection || '';
        return (memberSection === sectionName || memberSection === normalizedName) && m.isActive !== false;
      })
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  };


  const handlePhotoFileSelect = async (file: File) => {
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Invalid image file');
      return;
    }

    try {
      setPhotoFile(file);
      const preview = await createImagePreview(file);
      setPhotoPreview(preview);
      setError(null);
    } catch (err: any) {
      setError('Failed to load image preview: ' + err.message);
    }
  };

  const handlePhotoDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      handlePhotoFileSelect(file);
    }
  };

  const handlePhotoDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleSaveMember = async () => {
    if (!editingMember || !user?.email) return;

    try {
      setSaving(true);
      setError(null);
      
      let photoUrl = editingMember.photo;
      
      // Upload photo if a new file was selected
      if (photoFile) {
        setUploadingPhoto(true);
        try {
          const memberId = editingMember.id || 'temp-' + Date.now();
          photoUrl = await uploadTeamMemberPhoto(photoFile, memberId);
        } catch (uploadError: any) {
          setError('Failed to upload photo: ' + uploadError.message);
          setUploadingPhoto(false);
          return;
        } finally {
          setUploadingPhoto(false);
        }
      }
      
      const memberToSave = {
        ...editingMember,
        photo: photoUrl,
      };
      
      await saveTeamMember(memberToSave, user.email);
      setSuccess('Team member saved successfully!');
      
      await loadContent();
      
      setTimeout(() => {
        setEditingMember(null);
        setPhotoPreview(null);
        setPhotoFile(null);
        setSuccess(null);
      }, 1500);
    } catch (err: any) {
      setError('Failed to save team member: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent, sectionName: string) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;
    
    const members = getMembersForSection(sectionName);
    const oldIndex = members.findIndex(m => m.id === active.id);
    const newIndex = members.findIndex(m => m.id === over.id);
    
    if (oldIndex === -1 || newIndex === -1) return;
    
    // Optimistically update UI
    const reordered = arrayMove(members, oldIndex, newIndex);
    const updatedMembers = [...teamMembers];
    
    // Update order values
    reordered.forEach((member, index) => {
      const existingIndex = updatedMembers.findIndex(m => m.id === member.id);
      if (existingIndex !== -1) {
        updatedMembers[existingIndex] = { ...updatedMembers[existingIndex], order: index };
      }
    });
    
    setTeamMembers(updatedMembers);
    
    // Save to Firestore
    try {
      if (!user?.email) return;
      
      const updates = reordered.map((member, index) => 
        saveTeamMember({ ...member, order: index }, user.email)
      );
      
      await Promise.all(updates);
      setSuccess('Order updated successfully!');
      setTimeout(() => setSuccess(null), 2000);
    } catch (err: any) {
      setError('Failed to update order: ' + err.message);
      // Reload to revert optimistic update
      await loadContent();
    }
  };

  const handleAddNew = (section: string, key: string) => {
    const structure = getContentStructure();
    const sectionStructure = structure.find(s => s.section === section);
    const keyStructure = sectionStructure?.keys.find(k => k.key === key);
    
    if (!keyStructure) return;

    const newItem: ContentItem = {
      section,
      key,
      value: '',
      type: keyStructure.type,
      order: 0,
      isActive: true,
    };
    
    setEditingItem(newItem);
    setError(null);
    setSuccess(null);
  };

  const getContentStructureForSection = (section: string) => {
    return getContentStructure().find(s => s.section === section);
  };

  const getItemValue = (item: ContentItem): string => {
    if (typeof item.value === 'string') return item.value;
    if (Array.isArray(item.value)) return JSON.stringify(item.value, null, 2);
    return JSON.stringify(item.value, null, 2);
  };

  // Helper function to get content value by section and key from local sections state
  const getLocalContent = (section: string, key: string, defaultValue: string = ''): string => {
    const sectionData = sections.find(s => s.section === section);
    if (!sectionData) return defaultValue;
    const item = sectionData.items.find(i => i.key === key && i.isActive !== false);
    if (!item) return defaultValue;
    if (typeof item.value === 'string') return item.value;
    return defaultValue;
  };

  // Helper function to get content item by section and key
  const getContentItem = (section: string, key: string): ContentItem | null => {
    const sectionData = sections.find(s => s.section === section);
    if (!sectionData) return null;
    return sectionData.items.find(i => i.key === key) || null;
  };

  // Helper function to get content for a specific section (for Programs/Contact editors)
  const getContentForSection = (sectionId: SectionId): ContentItem[] => {
    const sectionDef = SECTIONS.find(s => s.id === sectionId);
    if (!sectionDef) return [];
    return sections
      .filter(s => sectionDef.contentSections.includes(s.section))
      .flatMap(s => s.items);
  };

  const handleValueChange = (value: string) => {
    if (!editingItem) return;
    
    let processedValue: any = value;
    
    // Try to parse JSON for complex types
    if (editingItem.type === 'object' || editingItem.type === 'array') {
      try {
        processedValue = JSON.parse(value);
      } catch {
        // If parsing fails, keep as string
        processedValue = value;
      }
    }
    
    setEditingItem({
      ...editingItem,
      value: processedValue,
    });
  };

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login-4f73b2c');
  };

  // Show UI immediately, don't block on loading

  return (
    <div className="ld-admin-view">
      <div className="ld-admin-view-content">
        {error && (
          <div className="cm-alert cm-alert--error">
            <span>{error}</span>
            <button
              onClick={() => {
                setError(null);
                setLoadedSections(prev => {
                  const updated = new Set(prev);
                  updated.delete(activeSection);
                  return updated;
                });
                loadSectionData(activeSection);
              }}
              className="btn btn-small btn-secondary"
            >
              Retry
            </button>
          </div>
        )}

        {success && (
          <div className="cm-alert cm-alert--success">
            {success}
          </div>
        )}

        {/* Section Navigation */}
        <div className="cm-section-nav">
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              onClick={() => {
                setActiveSection(section.id);
                if (section.id === 'about') {
                  if (languageSections.length > 0) {
                    setExpandedLanguageSections(new Set([languageSections[0].id || '']));
                  }
                }
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`cm-section-card${activeSection === section.id ? ' cm-section-card--active' : ''}`}
            >
              <h3 className="cm-section-card__title">
                {activeSection === section.id && <i className="fas fa-check" style={{ fontSize: '0.8rem', marginRight: 4 }} />}
                {section.name}
              </h3>
              <p className="cm-section-card__desc">
                {section.description}
              </p>
            </button>
          ))}
        </div>

        {/* Edit Modal */}
        {editingItem && (
          <div className="cm-modal-backdrop">
            <div className="cm-modal">
              <h2 className="cm-modal__title">
                {editingItem.id ? 'Edit Content' : 'Add New Content'}
              </h2>

              <div className="cm-modal__field">
                <label className="cm-modal__label">Section</label>
                <input
                  type="text"
                  value={editingItem.section}
                  onChange={(e) => setEditingItem({ ...editingItem, section: e.target.value })}
                  className="cm-modal__input"
                />
              </div>

              <div className="cm-modal__field">
                <label className="cm-modal__label">Key</label>
                <input
                  type="text"
                  value={editingItem.key}
                  onChange={(e) => setEditingItem({ ...editingItem, key: e.target.value })}
                  className="cm-modal__input"
                />
              </div>

              <div className="cm-modal__field">
                <label className="cm-modal__label">Type</label>
                <select
                  value={editingItem.type}
                  onChange={(e) => setEditingItem({ ...editingItem, type: e.target.value as ContentItem['type'] })}
                  className="cm-modal__input"
                >
                  <option value="text">Text</option>
                  <option value="html">HTML</option>
                  <option value="rich">Rich Text</option>
                  <option value="image">Image URL</option>
                  <option value="array">Array (JSON)</option>
                  <option value="object">Object (JSON)</option>
                </select>
              </div>

              <div className="cm-modal__field">
                <label className="cm-modal__label">Value</label>
                <textarea
                  value={getItemValue(editingItem)}
                  onChange={(e) => handleValueChange(e.target.value)}
                  rows={editingItem.type === 'rich' || editingItem.type === 'html' ? 10 : 6}
                  className={`cm-modal__input${editingItem.type === 'object' || editingItem.type === 'array' ? ' cm-modal__input--mono' : ''}`}
                />
                {editingItem.type === 'rich' && (
                  <p className="cm-modal__hint">
                    Use HTML tags for formatting (e.g., &lt;strong&gt;, &lt;em&gt;, &lt;br&gt;)
                  </p>
                )}
              </div>

              <div className="cm-modal__field">
                <label className="cm-modal__checkbox">
                  <input
                    type="checkbox"
                    checked={editingItem.isActive !== false}
                    onChange={(e) => setEditingItem({ ...editingItem, isActive: e.target.checked })}
                  />
                  <span>Published (Active)</span>
                </label>
              </div>

              <div className="cm-modal__footer">
                <button
                  onClick={handleCancelEdit}
                  className="btn btn-secondary"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="btn btn-primary"
                  disabled={saving || !editingItem.section || !editingItem.key}
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* About Us Section Editor */}
        {activeSection === 'about' && (
          <div className="cm-panel">
            <div className="cm-panel__header">
              <h2 className="cm-panel__title">About Us - Team Members</h2>
              <div className="cm-panel__actions">
                {(membersLoading || sectionsLoading) && (
                  <span className="cm-panel__loading">Loading team data...</span>
                )}
                <button
                  onClick={() => {
                    setLoadedSections(prev => {
                      const updated = new Set(prev);
                      updated.delete('about');
                      return updated;
                    });
                    loadSectionData('about');
                  }}
                  className="btn btn-small btn-secondary"
                  disabled={membersLoading || sectionsLoading}
                >
                  <i className="fas fa-sync-alt" style={{ fontSize: '0.7rem' }} /> Refresh
                </button>
                <button
                  onClick={handleAddNewLanguageSection}
                  className="btn btn-small btn-primary"
                >
                  <i className="fas fa-plus" style={{ fontSize: '0.7rem' }} /> Add Language Section
                </button>
              </div>
            </div>

            {/* Language Sections */}
            {languageSections.length === 0 ? (
              <p className="cm-empty">
                No language sections found. Click "Add Language Section" to create one.
              </p>
            ) : (
              languageSections.map((langSection) => {
                const isExpanded = expandedLanguageSections.has(langSection.id || '');
                const members = getMembersForSection(langSection.name);

                return (
                  <div
                    key={langSection.id}
                    className={`cm-lang-section${!langSection.isActive ? ' cm-lang-section--inactive' : ''}`}
                  >
                    {/* Language Section Header */}
                    <div
                      className={`cm-lang-header${isExpanded ? ' cm-lang-header--expanded' : ''}`}
                      onClick={() => langSection.id && toggleLanguageSection(langSection.id)}
                    >
                      <div className="cm-lang-header__left">
                        <i className={`fas fa-chevron-right cm-lang-header__chevron${isExpanded ? ' cm-lang-header__chevron--open' : ''}`} />
                        <div className="cm-lang-header__info">
                          <h3 className="cm-lang-header__name">
                            {ensureTeamSuffix(langSection.name)}
                            {!langSection.isActive && (
                              <span className="cm-badge--inactive">Inactive</span>
                            )}
                          </h3>
                          <p className="cm-lang-header__count">
                            {members.length} {members.length === 1 ? 'member' : 'members'}
                          </p>
                        </div>
                      </div>
                      <div className="cm-lang-header__actions">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddNewMember(langSection.id);
                          }}
                          className="btn btn-small btn-primary"
                        >
                          <i className="fas fa-plus" style={{ fontSize: '0.65rem' }} /> Add Person
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditLanguageSection(langSection);
                          }}
                          className="btn btn-small btn-secondary"
                        >
                          Edit Section
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            langSection.id && handleDeleteLanguageSection(langSection.id);
                          }}
                          className="btn btn-small btn-danger"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    {/* Language Section Content - People List */}
                    {isExpanded && (
                      <div className="cm-lang-body">
                        {members.length === 0 ? (
                          <p className="cm-empty" style={{ padding: '20px' }}>
                            No members in this section. Click "+ Add Person" to add one.
                          </p>
                        ) : (
                          <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={(e) => handleDragEnd(e, langSection.name)}
                          >
                            <SortableContext
                              items={members.map(m => m.id || '')}
                              strategy={verticalListSortingStrategy}
                            >
                              {members.map((member) => (
                                <SortablePersonItem
                                  key={member.id}
                                  member={member}
                                  onEdit={handleEditMember}
                                  onDelete={handleDeleteMember}
                                />
                              ))}
                            </SortableContext>
                          </DndContext>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Language Section Edit Modal */}
        {editingLanguageSection && (
          <div
            className="cm-modal-backdrop"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                handleCancelEditLanguageSection();
              }
            }}
          >
            <div className="cm-modal cm-modal--narrow" onClick={(e) => e.stopPropagation()}>
              <h2 className="cm-modal__title">
                {editingLanguageSection.id ? 'Edit Language Section' : 'Add Language Section'}
              </h2>

              <div className="cm-modal__field">
                <label className="cm-modal__label">Section Name *</label>
                <input
                  type="text"
                  value={editingLanguageSection.name}
                  onChange={(e) => setEditingLanguageSection({ ...editingLanguageSection, name: e.target.value.trim() })}
                  placeholder="e.g., English Team, Spanish Team, German Team"
                  required
                  className={`cm-modal__input${editingLanguageSection.name === '' ? ' cm-modal__input--error' : ''}`}
                />
                {editingLanguageSection.name === '' && (
                  <p className="cm-modal__hint cm-modal__hint--error">
                    Section name is required
                  </p>
                )}
              </div>

              <div className="cm-modal__row">
                <div>
                  <label className="cm-modal__label">Order</label>
                  <input
                    type="number"
                    value={editingLanguageSection.order ?? 0}
                    onChange={(e) => setEditingLanguageSection({ ...editingLanguageSection, order: parseInt(e.target.value) || 0 })}
                    className="cm-modal__input"
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <label className="cm-modal__checkbox">
                    <input
                      type="checkbox"
                      checked={editingLanguageSection.isActive !== false}
                      onChange={(e) => setEditingLanguageSection({ ...editingLanguageSection, isActive: e.target.checked })}
                    />
                    <span>Published (Active)</span>
                  </label>
                </div>
              </div>

              <div className="cm-modal__footer">
                <button
                  onClick={handleCancelEditLanguageSection}
                  className="btn btn-secondary"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveLanguageSection}
                  className="btn btn-primary"
                  disabled={saving || !editingLanguageSection.name}
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Team Member Edit Modal */}
        {editingMember && (
          <div className="cm-modal-backdrop">
            <div className="cm-modal">
              <h2 className="cm-modal__title">
                {editingMember.id ? 'Edit Team Member' : 'Add Team Member'}
              </h2>

              <div className="cm-modal__field">
                <label className="cm-modal__label">Name *</label>
                <input
                  type="text"
                  value={editingMember.name}
                  onChange={(e) => setEditingMember({ ...editingMember, name: e.target.value })}
                  className="cm-modal__input"
                />
              </div>

              <div className="cm-modal__field">
                <label className="cm-modal__label">Title</label>
                <input
                  type="text"
                  value={editingMember.role || ''}
                  onChange={(e) => setEditingMember({ ...editingMember, role: e.target.value })}
                  placeholder="e.g., Compassion Course Author and Lead Trainer"
                  className="cm-modal__input"
                />
              </div>

              <div className="cm-modal__field">
                <label className="cm-modal__label">Language Section *</label>
                <select
                  value={editingMember.teamSection}
                  onChange={(e) => setEditingMember({ ...editingMember, teamSection: e.target.value })}
                  className="cm-modal__input"
                >
                  {languageSections
                    .filter(s => s.isActive !== false)
                    .map(section => (
                      <option key={section.id} value={section.name}>
                        {section.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="cm-modal__field">
                <label className="cm-modal__label">Photo *</label>

                {/* Photo Upload Area */}
                <div
                  onDrop={handlePhotoDrop}
                  onDragOver={handlePhotoDragOver}
                  className="cm-photo-drop"
                  onDragEnter={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.add('cm-photo-drop--active');
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('cm-photo-drop--active');
                  }}
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) {
                        handlePhotoFileSelect(file);
                      }
                    };
                    input.click();
                  }}
                >
                  {photoPreview || editingMember.photo ? (
                    <div>
                      <img
                        src={photoPreview || editingMember.photo}
                        alt="Preview"
                        className="cm-photo-drop__preview"
                      />
                      <p className="cm-photo-drop__text">
                        Click or drag a new image to replace
                      </p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPhotoPreview(null);
                          setPhotoFile(null);
                          setEditingMember({ ...editingMember, photo: '' });
                        }}
                        className="btn btn-small btn-secondary"
                        style={{ marginTop: '8px' }}
                      >
                        Remove Photo
                      </button>
                    </div>
                  ) : (
                    <div>
                      <p className="cm-photo-drop__text">
                        <i className="fas fa-camera" style={{ marginRight: 6 }} />
                        Drag and drop an image here, or click to select
                      </p>
                      <p className="cm-photo-drop__hint">
                        Supports JPEG, PNG, WebP, GIF (max 5MB)
                      </p>
                    </div>
                  )}
                </div>

                {uploadingPhoto && (
                  <div className="cm-panel__loading" style={{ padding: '10px', textAlign: 'center' }}>
                    Uploading photo...
                  </div>
                )}
              </div>

              <div className="cm-modal__field">
                <label className="cm-modal__label">Biography *</label>
                <textarea
                  value={typeof editingMember.bio === 'string' ? editingMember.bio : JSON.stringify(editingMember.bio)}
                  onChange={(e) => {
                    let bio: string | string[] = e.target.value;
                    try {
                      const parsed = JSON.parse(e.target.value);
                      if (Array.isArray(parsed)) {
                        bio = parsed;
                      }
                    } catch {
                      // Keep as string
                    }
                    setEditingMember({ ...editingMember, bio });
                  }}
                  rows={8}
                  placeholder="Enter biography text. For multiple paragraphs, use JSON array format: [&quot;Paragraph 1&quot;, &quot;Paragraph 2&quot;]"
                  className="cm-modal__input"
                />
                <p className="cm-modal__hint">
                  Enter text or JSON array for multiple paragraphs
                </p>
              </div>

              <div className="cm-modal__field">
                <label className="cm-modal__label">Contact</label>
                <input
                  type="text"
                  value={editingMember.contact || ''}
                  onChange={(e) => setEditingMember({ ...editingMember, contact: e.target.value })}
                  placeholder="email@example.com"
                  className="cm-modal__input"
                />
              </div>

              <div className="cm-modal__row">
                <div>
                  <label className="cm-modal__label">Order</label>
                  <input
                    type="number"
                    value={editingMember.order ?? 0}
                    onChange={(e) => setEditingMember({ ...editingMember, order: parseInt(e.target.value) || 0 })}
                    className="cm-modal__input"
                  />
                  <p className="cm-modal__hint">
                    Lower numbers appear first
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <label className="cm-modal__checkbox">
                    <input
                      type="checkbox"
                      checked={editingMember.isActive !== false}
                      onChange={(e) => setEditingMember({ ...editingMember, isActive: e.target.checked })}
                    />
                    <span>Published (Active)</span>
                  </label>
                </div>
              </div>

              <div className="cm-modal__footer">
                <button
                  onClick={handleCancelEditMember}
                  className="btn btn-secondary"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveMember}
                  className="btn btn-primary"
                  disabled={saving || uploadingPhoto || !editingMember.name || (!photoPreview && !editingMember.photo) || !editingMember.teamSection}
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Programs Section Editor */}
        {activeSection === 'programs' && (
          <div className="cm-panel">
            <div className="cm-panel__header">
              <h2 className="cm-panel__title">Programs Page Editor</h2>
              <div className="cm-panel__actions">
                {contentLoading && (
                  <span className="cm-panel__loading">Loading content...</span>
                )}
                {!contentLoading && getContentForSection('programs').length === 0 && (
                  <button
                    onClick={() => {
                      setLoadedSections(prev => {
                        const updated = new Set(prev);
                        updated.delete('programs');
                        return updated;
                      });
                      loadSectionData('programs');
                    }}
                    className="btn btn-small btn-secondary"
                  >
                    Retry Loading
                  </button>
                )}
              </div>
            </div>
            <p className="cm-panel__subtitle">
              Edit content for the Programs page. Add or edit content items below.
            </p>

            {getContentForSection('programs').length === 0 ? (
              <div className="cm-empty">
                <p>No content items found for Programs page.</p>
                <p style={{ fontSize: '0.85rem', marginTop: '8px' }}>
                  Use the content structure below to add new content items.
                </p>
              </div>
            ) : (
              getContentForSection('programs').map((section) => (
                <div key={section.section} className="cm-content-group">
                  <h3 className="cm-content-group__title">{section.section.replace(/-/g, ' ')}</h3>
                  {section.items.map((item) => (
                    <div key={item.id} className="cm-content-item">
                      <div>
                        <span className="cm-content-item__key">{item.key}</span>
                        <p className="cm-content-item__preview">
                          {typeof item.value === 'string' ? item.value.substring(0, 100) : JSON.stringify(item.value).substring(0, 100)}
                        </p>
                      </div>
                      <button onClick={() => handleEdit(item)} className="btn btn-small btn-secondary">
                        Edit
                      </button>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        )}

        {/* Contact Section Editor */}
        {activeSection === 'contact' && (
          <div className="cm-panel">
            <div className="cm-panel__header">
              <h2 className="cm-panel__title">Contact Page Editor</h2>
              <div className="cm-panel__actions">
                {contentLoading && (
                  <span className="cm-panel__loading">Loading content...</span>
                )}
              </div>
            </div>
            <p className="cm-panel__subtitle">
              Edit the contact information shown on the Contact Us page. Changes appear immediately.
            </p>

            {/* Contact Info Fields */}
            {[
              { key: 'email', label: 'Contact Email', defaultValue: 'coursecoordinator@nycnvc.org', icon: 'fas fa-envelope' },
              { key: 'phone', label: 'Phone Number (tel: link)', defaultValue: '+16462019226', icon: 'fas fa-phone' },
              { key: 'phone-display', label: 'Phone Display Text', defaultValue: '(646) 201-9226', icon: 'fas fa-mobile-alt' },
              { key: 'address', label: 'Office Address (HTML allowed)', defaultValue: 'NYCNVC<br />645 Gardnertown Road<br />Newburgh, NY 12550', icon: 'fas fa-map-marker-alt' },
              { key: 'form-title', label: 'Form Heading', defaultValue: 'Send a Message', icon: 'fas fa-edit' },
              { key: 'success-message', label: 'Form Success Message', defaultValue: "Thank you for reaching out. We'll get back to you shortly.", icon: 'fas fa-check-circle' },
            ].map((field) => (
              <div key={field.key} className="cm-contact-field">
                <div className="cm-contact-field__info">
                  <div className="cm-contact-field__label-row">
                    <i className={`${field.icon} cm-contact-field__icon`} style={{ color: '#6b7280' }} />
                    <span className="cm-contact-field__label">{field.label}</span>
                  </div>
                  <p className="cm-contact-field__value">
                    {getLocalContent('contact-page', field.key, field.defaultValue)}
                  </p>
                </div>
                <button
                  onClick={() => {
                    const item = getContentItem('contact-page', field.key) || {
                      section: 'contact-page',
                      key: field.key,
                      value: field.defaultValue,
                      type: field.key === 'address' ? 'rich' as const : 'text' as const,
                      order: 0,
                      isActive: true,
                    };
                    handleEdit(item);
                  }}
                  className="btn btn-small btn-secondary"
                >
                  Edit
                </button>
              </div>
            ))}

            {/* Preview */}
            <div className="cm-preview">
              <h4 className="cm-preview__title">
                <i className="fas fa-eye" />
                Live Preview
              </h4>
              <div className="cm-preview__grid">
                <div>
                  <span style={{ color: '#6b7280' }}>Email: </span>
                  <span style={{ color: '#002B4D' }}>{getLocalContent('contact-page', 'email', 'coursecoordinator@nycnvc.org')}</span>
                </div>
                <div>
                  <span style={{ color: '#6b7280' }}>Phone: </span>
                  <span style={{ color: '#002B4D' }}>{getLocalContent('contact-page', 'phone-display', '(646) 201-9226')}</span>
                </div>
                <div className="cm-preview__grid--full">
                  <span style={{ color: '#6b7280' }}>Address: </span>
                  <span style={{ color: '#002B4D' }} dangerouslySetInnerHTML={{ __html: getLocalContent('contact-page', 'address', 'NYCNVC<br />645 Gardnertown Road<br />Newburgh, NY 12550') }} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Legacy Content Sections (for backward compatibility - only show if no active section matches) */}
        {activeSection !== 'about' && activeSection !== 'programs' && activeSection !== 'contact' && sections.map((section) => {
          const sectionStructure = getContentStructureForSection(section.section);
          const isExpanded = expandedSections.has(section.section);
          
          return (
            <div
              key={section.section}
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                marginBottom: '20px',
                overflow: 'hidden',
              }}
            >
              <div
                onClick={() => toggleSection(section.section)}
                style={{
                  padding: '20px',
                  backgroundColor: '#f9fafb',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: isExpanded ? '1px solid #e5e7eb' : 'none',
                }}
              >
                <h2 style={{ margin: 0, color: '#002B4D', textTransform: 'capitalize' }}>
                  {section.section.replace(/-/g, ' ')}
                </h2>
                <span style={{ fontSize: '1.2rem' }}>
                  {isExpanded ? '−' : '+'}
                </span>
              </div>

              {isExpanded && (
                <div style={{ padding: '20px' }}>
                  {/* Show existing items */}
                  {section.items.length > 0 && (
                    <div style={{ marginBottom: '20px' }}>
                      <h3 style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '10px' }}>
                        Existing Content
                      </h3>
                      {section.items.map((item) => (
                        <div
                          key={item.id}
                          style={{
                            padding: '15px',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            marginBottom: '10px',
                            backgroundColor: item.isActive ? '#ffffff' : '#fef2f2',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
                                <strong style={{ color: '#002B4D' }}>{item.key}</strong>
                                {!item.isActive && (
                                  <span style={{
                                    fontSize: '0.75rem',
                                    padding: '2px 8px',
                                    backgroundColor: '#fee2e2',
                                    color: '#dc2626',
                                    borderRadius: '4px',
                                  }}>
                                    Inactive
                                  </span>
                                )}
                              </div>
                              <div style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '8px' }}>
                                {typeof item.value === 'string' 
                                  ? (item.value.length > 100 ? item.value.substring(0, 100) + '...' : item.value)
                                  : JSON.stringify(item.value).substring(0, 100) + '...'
                                }
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                                Type: {item.type} | 
                                {item.updatedAt && ` Updated: ${item.updatedAt.toLocaleDateString()}`}
                                {item.updatedBy && ` by ${item.updatedBy}`}
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                onClick={() => handleEdit(item)}
                                className="btn btn-small btn-secondary"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => item.id && handleDelete(item.id)}
                                className="btn btn-small btn-danger"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Show available keys from structure */}
                  {sectionStructure && (
                    <div>
                      <h3 style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '10px' }}>
                        Available Content Keys
                      </h3>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
                        {sectionStructure.keys.map((keyStruct) => {
                          const exists = section.items.some(item => item.key === keyStruct.key);
                          return (
                            <button
                              key={keyStruct.key}
                              onClick={() => handleAddNew(section.section, keyStruct.key)}
                              style={{
                                padding: '12px',
                                border: exists ? '2px solid #10b981' : '2px solid #e5e7eb',
                                borderRadius: '8px',
                                backgroundColor: exists ? '#f0fdf4' : '#ffffff',
                                cursor: 'pointer',
                                textAlign: 'left',
                                fontSize: '0.875rem',
                              }}
                            >
                              <div style={{ fontWeight: '500', marginBottom: '4px' }}>
                                {keyStruct.key}
                                {exists && <span style={{ color: '#10b981', marginLeft: '8px' }}>✓</span>}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                {keyStruct.label}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ContentManagement;
