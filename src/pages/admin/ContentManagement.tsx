import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  getAllContent, 
  saveContentItem, 
  deleteContentItem,
  getContentStructure,
  ContentItem,
  ContentSection,
  getAllTeamMembers,
  saveTeamMember,
  deleteTeamMember,
  TeamMember
} from '../../services/contentService';
import { useNavigate } from 'react-router-dom';

const ContentManagement: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sections, setSections] = useState<ContentSection[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<ContentItem | null>(null);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [showTeamMembers, setShowTeamMembers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load content and team members separately to handle errors independently
      let content: ContentSection[] = [];
      let members: TeamMember[] = [];
      
      try {
        content = await getAllContent();
      } catch (contentError: any) {
        console.error('Error loading content:', contentError);
        // Check if it's an index error
        if (contentError?.code === 'failed-precondition' || contentError?.message?.includes('index')) {
          setError('Firestore index required. Please check the browser console for index creation link, or contact support.');
        } else {
          setError('Failed to load content: ' + (contentError.message || 'Unknown error'));
        }
      }
      
      try {
        members = await getAllTeamMembers();
      } catch (memberError: any) {
        console.error('Error loading team members:', memberError);
        // Don't fail completely if team members fail to load
        if (memberError?.code === 'failed-precondition' || memberError?.message?.includes('index')) {
          console.warn('Team members index may be missing, but continuing...');
        } else {
          // Only show error if content also failed
          if (content.length === 0) {
            setError('Failed to load content and team members: ' + (memberError.message || 'Unknown error'));
          }
        }
      }
      
      setSections(content);
      setTeamMembers(members);
      
      // Expand first section by default
      if (content.length > 0) {
        setExpandedSections(new Set([content[0].section]));
      }
    } catch (err: any) {
      console.error('Unexpected error loading content:', err);
      setError('Failed to load content: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
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
    setError(null);
    setSuccess(null);
  };

  const handleCancelEditMember = () => {
    setEditingMember(null);
    setError(null);
    setSuccess(null);
  };

  const handleSaveMember = async () => {
    if (!editingMember || !user?.email) return;

    try {
      setSaving(true);
      setError(null);
      
      await saveTeamMember(editingMember, user.email);
      setSuccess('Team member saved successfully!');
      
      await loadContent();
      
      setTimeout(() => {
        setEditingMember(null);
        setSuccess(null);
      }, 1500);
    } catch (err: any) {
      setError('Failed to save team member: ' + err.message);
    } finally {
      setSaving(false);
    }
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

  const handleAddNewMember = () => {
    setEditingMember({
      name: '',
      role: '',
      bio: '',
      photo: '',
      contact: '',
      teamSection: 'English Team',
      order: 0,
      isActive: true,
    });
    setError(null);
    setSuccess(null);
  };

  const getTeamSections = (): string[] => {
    const sections = new Set<string>();
    teamMembers.forEach(member => {
      if (member.teamSection) {
        sections.add(member.teamSection);
      }
    });
    return Array.from(sections).sort();
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

  if (loading) {
    return (
      <div className="admin-dashboard">
        <div className="admin-content">
          <p>Loading content...</p>
        </div>
      </div>
    );
  }

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

        <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link to="/admin" style={{ color: '#002B4D', textDecoration: 'none' }}>
            ← Back to Dashboard
          </Link>
          <button
            onClick={() => setShowTeamMembers(!showTeamMembers)}
            className="btn btn-primary"
            style={{ marginLeft: 'auto' }}
          >
            {showTeamMembers ? 'Hide Team Members' : 'Manage Team Members'}
          </button>
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

        {/* Team Member Management Section */}
        {showTeamMembers && (
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            marginBottom: '20px',
            padding: '20px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, color: '#002B4D' }}>Team Members</h2>
              <button
                onClick={handleAddNewMember}
                className="btn btn-primary"
              >
                + Add Team Member
              </button>
            </div>

            {/* Team Members by Section */}
            {getTeamSections().map(teamSection => {
              const members = teamMembers.filter(m => m.teamSection === teamSection);
              return (
                <div key={teamSection} style={{ marginBottom: '30px' }}>
                  <h3 style={{ color: '#6b7280', fontSize: '1rem', marginBottom: '15px', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px' }}>
                    {teamSection}
                  </h3>
                  {members.length === 0 ? (
                    <p style={{ color: '#9ca3af', fontStyle: 'italic' }}>No members in this section</p>
                  ) : (
                    <div style={{ display: 'grid', gap: '15px' }}>
                      {members.map((member) => (
                        <div
                          key={member.id}
                          style={{
                            padding: '15px',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            backgroundColor: member.isActive ? '#ffffff' : '#fef2f2',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                          }}
                        >
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
                            {member.photo && (
                              <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '4px' }}>
                                Photo: {member.photo}
                              </div>
                            )}
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
                              Order: {member.order ?? 0} | 
                              {member.updatedAt && ` Updated: ${member.updatedAt.toLocaleDateString()}`}
                              {member.updatedBy && ` by ${member.updatedBy}`}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={() => handleEditMember(member)}
                              className="btn btn-small btn-secondary"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => member.id && handleDeleteMember(member.id)}
                              className="btn btn-small btn-danger"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
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
                  Role
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
                  Team Section *
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
                  <option value="English Team">English Team</option>
                  <option value="German Team">German Team</option>
                  <option value="Arabic Team">Arabic Team</option>
                  <option value="Spanish Team">Spanish Team</option>
                  <option value="Portuguese Team">Portuguese Team</option>
                  <option value="Polish Team">Polish Team</option>
                  <option value="Netherlands">Netherlands</option>
                </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                  Photo Path *
                </label>
                <input
                  type="text"
                  value={editingMember.photo}
                  onChange={(e) => setEditingMember({ ...editingMember, photo: e.target.value })}
                  placeholder="/Team/ThomBond.png"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                  }}
                />
                <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '4px' }}>
                  Path to image file (e.g., /Team/Name.png)
                </p>
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
                  disabled={saving || !editingMember.name || !editingMember.photo || !editingMember.teamSection}
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Content Sections */}
        {sections.map((section) => {
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
