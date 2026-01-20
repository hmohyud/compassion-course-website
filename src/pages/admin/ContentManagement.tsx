import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
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
import { renderHTML } from '../../utils/contentUtils';

// Section definitions
type SectionId = 'home' | 'about' | 'programs' | 'contact';

interface SectionDefinition {
  id: SectionId;
  name: string;
  description: string;
  contentSections: string[]; // Content sections that belong to this page section
}

const SECTIONS: SectionDefinition[] = [
  {
    id: 'home',
    name: 'Home',
    description: 'Edit hero, stats, programs, testimonials, and CTA sections',
    contentSections: ['hero', 'hero-stats', 'programs', 'testimonials', 'cta']
  },
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
      style={{
        ...style,
        padding: '15px',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        backgroundColor: member.isActive ? '#ffffff' : '#fef2f2',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '10px',
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
    >
      <div style={{ display: 'flex', gap: '15px', flex: 1 }}>
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          style={{
            cursor: 'grab',
            display: 'flex',
            alignItems: 'center',
            padding: '8px',
            color: '#6b7280',
            fontSize: '1.2rem',
          }}
        >
          ⋮⋮
        </div>
        
        {/* Photo Thumbnail */}
        {member.photo && (
          <img
            src={member.photo}
            alt={member.name}
            style={{
              width: '60px',
              height: '60px',
              objectFit: 'cover',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
            }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        )}
        
        {/* Member Info */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
            <strong style={{ color: '#002B4D' }}>{member.name}</strong>
            {member.role && (
              <span style={{ color: '#6b7280', fontSize: '0.875rem', fontStyle: 'italic' }}>
                {member.role}
              </span>
            )}
            {!member.isActive && (
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
          {member.bio && (
            <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '4px' }}>
              {typeof member.bio === 'string' 
                ? (member.bio.length > 100 ? member.bio.substring(0, 100) + '...' : member.bio)
                : 'Bio available'
              }
            </div>
          )}
          {member.contact && (
            <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '4px' }}>
              Contact: {member.contact}
            </div>
          )}
          <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
            Order: {member.order ?? 0}
          </div>
        </div>
      </div>
      
      {/* Actions */}
      <div style={{ display: 'flex', gap: '8px' }}>
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
  const [activeSection, setActiveSection] = useState<SectionId>('home');
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

  const loadSectionData = async (sectionId: SectionId) => {
    const sectionDef = SECTIONS.find(s => s.id === sectionId);
    if (!sectionDef) return;
    
    try {
      setError(null);
      const timeout = 8000; // 8 second timeout
      
      // Load only data needed for this section
      if (sectionId === 'home') {
        setContentLoading(true);
        try {
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Content loading timeout')), timeout)
          );
          
          // Only load content for home section's content sections
          const content = await Promise.race([
            getContentBySections(sectionDef.contentSections),
            timeoutPromise
          ]);
          
          // Merge with existing sections (don't overwrite other sections)
          setSections(prev => {
            const existing = prev.filter(s => !sectionDef.contentSections.includes(s.section));
            return [...existing, ...content];
          });
          
          // Expand first section by default
          if (content.length > 0) {
            setExpandedSections(new Set([content[0].section]));
          }
        } catch (contentError: any) {
          console.error('Error loading content:', contentError);
          if (contentError?.code === 'failed-precondition' || contentError?.message?.includes('index')) {
            setError('Firestore index required. Please check the browser console for index creation link.');
          } else if (!contentError?.message?.includes('timeout')) {
            setError('Failed to load content: ' + (contentError.message || 'Unknown error'));
          }
        } finally {
          setContentLoading(false);
        }
      } else if (sectionId === 'about') {
        setMembersLoading(true);
        setSectionsLoading(true);
        
        // Load team members
        const loadMembers = async () => {
          try {
            const timeoutPromise = new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('Team members loading timeout')), timeout)
            );
            
            const members = await Promise.race([getAllTeamMembers(), timeoutPromise]);
            setTeamMembers(members);
          } catch (memberError: any) {
            console.error('Error loading team members:', memberError);
            if (!memberError?.message?.includes('timeout')) {
              console.warn('Failed to load team members: ' + (memberError.message || 'Unknown error'));
            }
          } finally {
            setMembersLoading(false);
          }
        };
        
        // Load language sections
        const loadLangSections = async () => {
          try {
            const timeoutPromise = new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('Language sections loading timeout')), timeout)
            );
            
            const langSections = await Promise.race([getAllLanguageSections(), timeoutPromise]);
            setLanguageSections(langSections);
            
            // Expand first language section by default
            if (langSections.length > 0) {
              setExpandedLanguageSections(new Set([langSections[0].id || '']));
            }
          } catch (langError: any) {
            console.error('Error loading language sections:', langError);
            if (!langError?.message?.includes('timeout')) {
              console.warn('Could not load language sections:', langError);
            }
          } finally {
            setSectionsLoading(false);
          }
        };
        
        Promise.allSettled([loadMembers(), loadLangSections()]);
      } else if (sectionId === 'programs' || sectionId === 'contact') {
        setContentLoading(true);
        try {
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Content loading timeout')), timeout)
          );
          
          // Only load content for this section
          const content = await Promise.race([
            getContentBySections(sectionDef.contentSections),
            timeoutPromise
          ]);
          
          // Merge with existing sections
          setSections(prev => {
            const existing = prev.filter(s => !sectionDef.contentSections.includes(s.section));
            return [...existing, ...content];
          });
        } catch (contentError: any) {
          console.error('Error loading content:', contentError);
          if (!contentError?.message?.includes('timeout')) {
            setError('Failed to load content: ' + (contentError.message || 'Unknown error'));
          }
        } finally {
          setContentLoading(false);
        }
      }
      
      // Mark this section as loaded
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
    if (!editingLanguageSection || !user?.email) return;

    try {
      setSaving(true);
      setError(null);
      
      await saveLanguageSection(editingLanguageSection, user.email);
      setSuccess('Language section saved successfully!');
      
      await loadContent();
      
      setTimeout(() => {
        setEditingLanguageSection(null);
        setSuccess(null);
      }, 1500);
    } catch (err: any) {
      setError('Failed to save language section: ' + err.message);
    } finally {
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
    setEditingLanguageSection({
      name: '',
      order: languageSections.length,
      isActive: true,
    });
    setError(null);
    setSuccess(null);
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
    return teamMembers
      .filter(m => m.teamSection === sectionName && m.isActive !== false)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  };

  const getContentForSection = (sectionId: SectionId): ContentSection[] => {
    const sectionDef = SECTIONS.find(s => s.id === sectionId);
    if (!sectionDef) return [];
    
    return sections.filter(s => sectionDef.contentSections.includes(s.section));
  };

  const getContentItem = (section: string, key: string): ContentItem | null => {
    const sectionData = sections.find(s => s.section === section);
    if (!sectionData) return null;
    return sectionData.items.find(item => item.key === key) || null;
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
    <div className="admin-dashboard">
      <div className="admin-header">
        <h1>Content Management System</h1>
        <div className="admin-user-info">
          <span>Logged in as: {user?.email}</span>
          <button onClick={handleLogout} className="btn btn-secondary">Logout</button>
        </div>
      </div>

      <div className="admin-content">
        {error && (
          <div style={{
            padding: '12px',
            backgroundColor: '#fee2e2',
            color: '#dc2626',
            borderRadius: '8px',
            marginBottom: '20px',
          }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{
            padding: '12px',
            backgroundColor: '#d1fae5',
            color: '#065f46',
            borderRadius: '8px',
            marginBottom: '20px',
          }}>
            {success}
          </div>
        )}

        {/* Section Navigation */}
        <div style={{ marginBottom: '30px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <Link to="/admin" style={{ color: '#002B4D', textDecoration: 'none' }}>
              ← Back to Dashboard
            </Link>
          </div>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '15px',
            marginBottom: '20px'
          }}>
            {SECTIONS.map((section) => (
              <button
                key={section.id}
                onClick={() => {
                  setActiveSection(section.id);
                  if (section.id === 'about') {
                    // Expand first language section if available
                    if (languageSections.length > 0) {
                      setExpandedLanguageSections(new Set([languageSections[0].id || '']));
                    }
                  }
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                style={{
                  padding: '20px',
                  border: '2px solid',
                  borderColor: activeSection === section.id ? '#002B4D' : '#e5e7eb',
                  borderRadius: '12px',
                  backgroundColor: activeSection === section.id ? '#002B4D' : '#ffffff',
                  color: activeSection === section.id ? '#ffffff' : '#002B4D',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease',
                  boxShadow: activeSection === section.id ? '0 4px 12px rgba(0, 43, 77, 0.2)' : '0 2px 4px rgba(0,0,0,0.1)',
                }}
                onMouseEnter={(e) => {
                  if (activeSection !== section.id) {
                    e.currentTarget.style.borderColor = '#002B4D';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeSection !== section.id) {
                    e.currentTarget.style.borderColor = '#e5e7eb';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }
                }}
              >
                <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem' }}>
                  {activeSection === section.id && '✓ '}
                  {section.name}
                </h3>
                <p style={{ 
                  margin: 0, 
                  fontSize: '0.875rem', 
                  opacity: 0.9,
                  color: activeSection === section.id ? '#ffffff' : '#6b7280'
                }}>
                  {section.description}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Edit Modal */}
        {editingItem && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}>
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              padding: '30px',
              maxWidth: '800px',
              width: '90%',
              maxHeight: '90vh',
              overflow: 'auto',
            }}>
              <h2 style={{ marginTop: 0, color: '#002B4D' }}>
                {editingItem.id ? 'Edit Content' : 'Add New Content'}
              </h2>
              
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                  Section
                </label>
                <input
                  type="text"
                  value={editingItem.section}
                  onChange={(e) => setEditingItem({ ...editingItem, section: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                  Key
                </label>
                <input
                  type="text"
                  value={editingItem.key}
                  onChange={(e) => setEditingItem({ ...editingItem, key: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                  Type
                </label>
                <select
                  value={editingItem.type}
                  onChange={(e) => setEditingItem({ ...editingItem, type: e.target.value as ContentItem['type'] })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                  }}
                >
                  <option value="text">Text</option>
                  <option value="html">HTML</option>
                  <option value="rich">Rich Text</option>
                  <option value="image">Image URL</option>
                  <option value="array">Array (JSON)</option>
                  <option value="object">Object (JSON)</option>
                </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                  Value
                </label>
                <textarea
                  value={getItemValue(editingItem)}
                  onChange={(e) => handleValueChange(e.target.value)}
                  rows={editingItem.type === 'rich' || editingItem.type === 'html' ? 10 : 6}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontFamily: editingItem.type === 'object' || editingItem.type === 'array' ? 'monospace' : 'inherit',
                  }}
                />
                {editingItem.type === 'rich' && (
                  <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '4px' }}>
                    Use HTML tags for formatting (e.g., &lt;strong&gt;, &lt;em&gt;, &lt;br&gt;)
                  </p>
                )}
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    checked={editingItem.isActive !== false}
                    onChange={(e) => setEditingItem({ ...editingItem, isActive: e.target.checked })}
                  />
                  <span>Published (Active)</span>
                </label>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
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
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            marginBottom: '20px',
            padding: '20px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, color: '#002B4D' }}>About Us - Team Members</h2>
              {(membersLoading || sectionsLoading) && (
                <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>Loading team data...</span>
              )}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={handleAddNewLanguageSection}
                  className="btn btn-secondary"
                >
                  + Add Language Section
                </button>
              </div>
            </div>

            {/* Language Sections */}
            {languageSections.length === 0 ? (
              <p style={{ color: '#9ca3af', fontStyle: 'italic', textAlign: 'center', padding: '40px' }}>
                No language sections found. Click "Add Language Section" to create one.
              </p>
            ) : (
              languageSections.map((langSection) => {
                const isExpanded = expandedLanguageSections.has(langSection.id || '');
                const members = getMembersForSection(langSection.name);
                
                return (
                  <div
                    key={langSection.id}
                    style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      marginBottom: '15px',
                      overflow: 'hidden',
                      backgroundColor: langSection.isActive ? '#ffffff' : '#fef2f2',
                    }}
                  >
                    {/* Language Section Header */}
                    <div
                      style={{
                        padding: '15px 20px',
                        backgroundColor: '#f9fafb',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: 'pointer',
                        borderBottom: isExpanded ? '1px solid #e5e7eb' : 'none',
                      }}
                      onClick={() => langSection.id && toggleLanguageSection(langSection.id)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flex: 1 }}>
                        <span style={{ fontSize: '1.2rem', color: '#6b7280' }}>
                          {isExpanded ? '−' : '+'}
                        </span>
                        <div>
                          <h3 style={{ margin: 0, color: '#002B4D', fontSize: '1.1rem' }}>
                            {langSection.name}
                            {!langSection.isActive && (
                              <span style={{
                                fontSize: '0.75rem',
                                marginLeft: '10px',
                                padding: '2px 8px',
                                backgroundColor: '#fee2e2',
                                color: '#dc2626',
                                borderRadius: '4px',
                              }}>
                                Inactive
                              </span>
                            )}
                          </h3>
                          <p style={{ margin: '4px 0 0 0', fontSize: '0.875rem', color: '#6b7280' }}>
                            {members.length} {members.length === 1 ? 'member' : 'members'}
                          </p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddNewMember(langSection.id);
                          }}
                          className="btn btn-small btn-primary"
                        >
                          + Add Person
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
                      <div style={{ padding: '20px' }}>
                        {members.length === 0 ? (
                          <p style={{ color: '#9ca3af', fontStyle: 'italic', textAlign: 'center', padding: '20px' }}>
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
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}>
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              padding: '30px',
              maxWidth: '500px',
              width: '90%',
            }}>
              <h2 style={{ marginTop: 0, color: '#002B4D' }}>
                {editingLanguageSection.id ? 'Edit Language Section' : 'Add Language Section'}
              </h2>
              
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                  Section Name *
                </label>
                <input
                  type="text"
                  value={editingLanguageSection.name}
                  onChange={(e) => setEditingLanguageSection({ ...editingLanguageSection, name: e.target.value })}
                  placeholder="e.g., English Team"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px', display: 'flex', gap: '20px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                    Order
                  </label>
                  <input
                    type="number"
                    value={editingLanguageSection.order ?? 0}
                    onChange={(e) => setEditingLanguageSection({ ...editingLanguageSection, order: parseInt(e.target.value) || 0 })}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                    }}
                  />
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="checkbox"
                      checked={editingLanguageSection.isActive !== false}
                      onChange={(e) => setEditingLanguageSection({ ...editingLanguageSection, isActive: e.target.checked })}
                    />
                    <span>Published (Active)</span>
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
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
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}>
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              padding: '30px',
              maxWidth: '800px',
              width: '90%',
              maxHeight: '90vh',
              overflow: 'auto',
            }}>
              <h2 style={{ marginTop: 0, color: '#002B4D' }}>
                {editingMember.id ? 'Edit Team Member' : 'Add Team Member'}
              </h2>
              
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                  Name *
                </label>
                <input
                  type="text"
                  value={editingMember.name}
                  onChange={(e) => setEditingMember({ ...editingMember, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                  Title
                </label>
                <input
                  type="text"
                  value={editingMember.role || ''}
                  onChange={(e) => setEditingMember({ ...editingMember, role: e.target.value })}
                  placeholder="e.g., Compassion Course Author and Lead Trainer"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                  Language Section *
                </label>
                <select
                  value={editingMember.teamSection}
                  onChange={(e) => setEditingMember({ ...editingMember, teamSection: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                  }}
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

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                  Photo *
                </label>
                
                {/* Photo Upload Area */}
                <div
                  onDrop={handlePhotoDrop}
                  onDragOver={handlePhotoDragOver}
                  style={{
                    border: '2px dashed #d1d5db',
                    borderRadius: '8px',
                    padding: '20px',
                    textAlign: 'center',
                    backgroundColor: '#f9fafb',
                    marginBottom: '10px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    e.currentTarget.style.borderColor = '#002B4D';
                    e.currentTarget.style.backgroundColor = '#f0f9ff';
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.currentTarget.style.borderColor = '#d1d5db';
                    e.currentTarget.style.backgroundColor = '#f9fafb';
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
                        style={{
                          maxWidth: '200px',
                          maxHeight: '200px',
                          borderRadius: '8px',
                          marginBottom: '10px',
                          border: '1px solid #e5e7eb',
                        }}
                      />
                      <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '8px 0' }}>
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
                      <p style={{ fontSize: '1rem', color: '#6b7280', marginBottom: '8px' }}>
                        📷 Drag and drop an image here, or click to select
                      </p>
                      <p style={{ fontSize: '0.875rem', color: '#9ca3af' }}>
                        Supports JPEG, PNG, WebP, GIF (max 5MB)
                      </p>
                    </div>
                  )}
                </div>
                
                {uploadingPhoto && (
                  <div style={{ padding: '10px', textAlign: 'center', color: '#002B4D' }}>
                    Uploading photo...
                  </div>
                )}
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                  Biography *
                </label>
                <textarea
                  value={typeof editingMember.bio === 'string' ? editingMember.bio : JSON.stringify(editingMember.bio)}
                  onChange={(e) => {
                    // Try to parse as array, otherwise keep as string
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
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontFamily: 'inherit',
                  }}
                />
                <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '4px' }}>
                  Enter text or JSON array for multiple paragraphs
                </p>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                  Contact
                </label>
                <input
                  type="text"
                  value={editingMember.contact || ''}
                  onChange={(e) => setEditingMember({ ...editingMember, contact: e.target.value })}
                  placeholder="email@example.com"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px', display: 'flex', gap: '20px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                    Order
                  </label>
                  <input
                    type="number"
                    value={editingMember.order ?? 0}
                    onChange={(e) => setEditingMember({ ...editingMember, order: parseInt(e.target.value) || 0 })}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                    }}
                  />
                  <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '4px' }}>
                    Lower numbers appear first
                  </p>
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="checkbox"
                      checked={editingMember.isActive !== false}
                      onChange={(e) => setEditingMember({ ...editingMember, isActive: e.target.checked })}
                    />
                    <span>Published (Active)</span>
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
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
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            padding: '30px',
            marginBottom: '20px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ marginTop: 0, color: '#002B4D', margin: 0 }}>Programs Page Editor</h2>
              {contentLoading && (
                <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>Loading content...</span>
              )}
            </div>
            <p style={{ color: '#6b7280', marginBottom: '20px' }}>
              Edit content for the Programs page. Add or edit content items below.
            </p>
            
            {getContentForSection('programs').length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
                <p>No content items found for Programs page.</p>
                <p style={{ fontSize: '0.875rem', marginTop: '10px' }}>
                  Use the content structure below to add new content items.
                </p>
              </div>
            ) : (
              getContentForSection('programs').map((section) => (
                <div key={section.section} style={{ marginBottom: '20px', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '20px' }}>
                  <h3 style={{ color: '#002B4D', marginBottom: '15px' }}>{section.section.replace(/-/g, ' ')}</h3>
                  {section.items.map((item) => (
                    <div key={item.id} style={{ marginBottom: '15px', padding: '15px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong style={{ color: '#002B4D' }}>{item.key}</strong>
                          <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: '5px 0 0 0' }}>
                            {typeof item.value === 'string' ? item.value.substring(0, 100) : JSON.stringify(item.value).substring(0, 100)}
                          </p>
                        </div>
                        <button onClick={() => handleEdit(item)} className="btn btn-small btn-secondary">
                          Edit
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        )}

        {/* Contact Section Editor */}
        {activeSection === 'contact' && (
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            padding: '30px',
            marginBottom: '20px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ marginTop: 0, color: '#002B4D', margin: 0 }}>Contact Page Editor</h2>
              {contentLoading && (
                <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>Loading content...</span>
              )}
            </div>
            <p style={{ color: '#6b7280', marginBottom: '20px' }}>
              Edit content for the Contact page. Add or edit content items below.
            </p>
            
            {getContentForSection('contact').length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
                <p>No content items found for Contact page.</p>
                <p style={{ fontSize: '0.875rem', marginTop: '10px' }}>
                  Use the content structure below to add new content items.
                </p>
              </div>
            ) : (
              getContentForSection('contact').map((section) => (
                <div key={section.section} style={{ marginBottom: '20px', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '20px' }}>
                  <h3 style={{ color: '#002B4D', marginBottom: '15px' }}>{section.section.replace(/-/g, ' ')}</h3>
                  {section.items.map((item) => (
                    <div key={item.id} style={{ marginBottom: '15px', padding: '15px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong style={{ color: '#002B4D' }}>{item.key}</strong>
                          <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: '5px 0 0 0' }}>
                            {typeof item.value === 'string' ? item.value.substring(0, 100) : JSON.stringify(item.value).substring(0, 100)}
                          </p>
                        </div>
                        <button onClick={() => handleEdit(item)} className="btn btn-small btn-secondary">
                          Edit
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        )}

        {/* Legacy Content Sections (for backward compatibility - only show if no active section matches) */}
        {activeSection !== 'home' && activeSection !== 'about' && activeSection !== 'programs' && activeSection !== 'contact' && sections.map((section) => {
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
