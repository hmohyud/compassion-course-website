import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  createWebcast,
  getWebcastsByOrganization,
  updateWebcast,
  deleteWebcast,
  getWebcastSessions,
  generateMeetLink,
  updateWebcastMeetUrl,
} from '../../services/webcastService';
import { Webcast } from '../../types/platform';
import { MEET_LANGUAGES, formatLanguageDisplay } from '../../utils/meetLanguages';
import { getUserOrganizations } from '../../services/organizationService';

const WebcastManagement: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [webcasts, setWebcasts] = useState<Webcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingWebcast, setEditingWebcast] = useState<Webcast | null>(null);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'live' | 'past'>('all');
  const [orgId, setOrgId] = useState<string>('');

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    scheduledAt: '',
    duration: '',
    price: '0',
    currency: 'USD',
    accessType: 'free' as 'free' | 'paid' | 'member-only',
    meetUrl: '',
    autoGenerateMeetLink: false,
    translationLanguages: [] as string[],
    recurrenceType: 'none' as 'none' | 'daily' | 'weekly' | 'monthly',
    recurrenceInterval: '1',
    recurrenceEndDate: '',
  });

  useEffect(() => {
    loadOrganizations();
  }, [user]);

  useEffect(() => {
    if (orgId) {
      loadWebcasts();
    }
  }, [orgId]);

  const loadOrganizations = async () => {
    if (!user) return;
    try {
      const orgs = await getUserOrganizations(user.uid);
      if (orgs.length > 0) {
        setOrgId(orgs[0].id);
      } else {
        // Use a default org ID or create one
        // For now, use a placeholder
        setOrgId('default-org');
      }
    } catch (error) {
      console.error('Error loading organizations:', error);
      setOrgId('default-org');
    }
  };

  const loadWebcasts = async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const data = await getWebcastsByOrganization(orgId);
      setWebcasts(data);
    } catch (error) {
      console.error('Error loading webcasts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingWebcast(null);
    setFormData({
      title: '',
      description: '',
      scheduledAt: '',
      duration: '',
      price: '0',
      currency: 'USD',
      accessType: 'free',
      meetUrl: '',
      autoGenerateMeetLink: false,
      translationLanguages: [],
      recurrenceType: 'none',
      recurrenceInterval: '1',
      recurrenceEndDate: '',
    });
    setShowForm(true);
  };

  const handleEdit = (webcast: Webcast) => {
    setEditingWebcast(webcast);
    setFormData({
      title: webcast.title,
      description: webcast.description,
      scheduledAt: new Date(webcast.scheduledAt).toISOString().slice(0, 16),
      duration: webcast.duration?.toString() || '',
      price: webcast.price.toString(),
      currency: webcast.currency,
      accessType: webcast.accessType,
      meetUrl: webcast.meetUrl || '',
      autoGenerateMeetLink: webcast.autoGenerateMeetLink || false,
      translationLanguages: webcast.translationLanguages || [],
      recurrenceType: webcast.recurrencePattern?.type || 'none',
      recurrenceInterval: webcast.recurrencePattern?.interval.toString() || '1',
      recurrenceEndDate: webcast.recurrencePattern?.endDate
        ? new Date(webcast.recurrencePattern.endDate).toISOString().slice(0, 16)
        : '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this webcast?')) return;
    try {
      await deleteWebcast(id);
      loadWebcasts();
    } catch (error) {
      console.error('Error deleting webcast:', error);
      alert('Error deleting webcast');
    }
  };

  const handleGenerateMeetLink = async () => {
    try {
      const link = await generateMeetLink();
      setFormData({ ...formData, meetUrl: link });
      alert('Meet link generated. Please update it with your actual Google Meet link.');
    } catch (error) {
      console.error('Error generating Meet link:', error);
      alert('Error generating Meet link. Please enter manually.');
    }
  };

  const handleCopyMeetLink = (url: string) => {
    navigator.clipboard.writeText(url);
    alert('Meet link copied to clipboard!');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !orgId) return;

    try {
      const scheduledAt = new Date(formData.scheduledAt);
      const recurrencePattern = formData.recurrenceType !== 'none' ? {
        type: formData.recurrenceType,
        interval: parseInt(formData.recurrenceInterval),
        endDate: formData.recurrenceEndDate ? new Date(formData.recurrenceEndDate) : undefined,
      } : undefined;

      if (editingWebcast) {
        await updateWebcast(editingWebcast.id, {
          title: formData.title,
          description: formData.description,
          scheduledAt,
          duration: formData.duration ? parseInt(formData.duration) : undefined,
          price: parseFloat(formData.price),
          currency: formData.currency,
          accessType: formData.accessType,
          meetUrl: formData.meetUrl || undefined,
          translationLanguages: formData.translationLanguages,
          recurrencePattern,
          autoGenerateMeetLink: formData.autoGenerateMeetLink,
        });
      } else {
        await createWebcast(
          orgId,
          formData.title,
          formData.description,
          scheduledAt,
          user.uid,
          parseFloat(formData.price),
          formData.currency,
          formData.duration ? parseInt(formData.duration) : undefined,
          formData.translationLanguages,
          formData.accessType,
          formData.meetUrl || undefined,
          recurrencePattern,
          formData.autoGenerateMeetLink
        );
      }

      setShowForm(false);
      loadWebcasts();
    } catch (error) {
      console.error('Error saving webcast:', error);
      alert('Error saving webcast');
    }
  };

  const handleStatusChange = async (id: string, status: 'scheduled' | 'live' | 'ended') => {
    try {
      await updateWebcast(id, { status });
      loadWebcasts();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Error updating status');
    }
  };

  const filteredWebcasts = webcasts.filter(w => {
    const now = new Date();
    if (filter === 'upcoming') return w.status === 'scheduled' && w.scheduledAt > now;
    if (filter === 'live') return w.status === 'live';
    if (filter === 'past') return w.status === 'ended' || (w.status === 'scheduled' && w.scheduledAt < now);
    return true;
  });

  const toggleLanguage = (code: string) => {
    setFormData({
      ...formData,
      translationLanguages: formData.translationLanguages.includes(code)
        ? formData.translationLanguages.filter(l => l !== code)
        : [...formData.translationLanguages, code],
    });
  };

  if (loading) {
    return (
      <div className="admin-dashboard">
        <div className="admin-content">
          <div className="loading">
            <div className="spinner"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h1>Webcast Management</h1>
        <div className="admin-user-info">
          <button onClick={() => navigate('/admin')} className="btn btn-secondary">
            ← Back to Dashboard
          </button>
        </div>
      </div>
      <div className="admin-content">
        <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button onClick={handleCreate} className="btn btn-primary">
            + Create New Webcast
          </button>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            style={{ padding: '8px', borderRadius: '4px' }}
          >
            <option value="all">All Webcasts</option>
            <option value="upcoming">Upcoming</option>
            <option value="live">Live</option>
            <option value="past">Past</option>
          </select>
        </div>

        {showForm && (
          <div style={{
            background: '#fff',
            padding: '30px',
            borderRadius: '8px',
            marginBottom: '20px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <h2>{editingWebcast ? 'Edit Webcast' : 'Create New Webcast'}</h2>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div>
                  <label>Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                  />
                </div>
                <div>
                  <label>Scheduled Date/Time *</label>
                  <input
                    type="datetime-local"
                    value={formData.scheduledAt}
                    onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                    required
                    style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                  />
                </div>
                <div>
                  <label>Duration (minutes)</label>
                  <input
                    type="number"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                  />
                </div>
                <div>
                  <label>Access Type</label>
                  <select
                    value={formData.accessType}
                    onChange={(e) => setFormData({ ...formData, accessType: e.target.value as any })}
                    style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                  >
                    <option value="free">Free</option>
                    <option value="paid">Paid</option>
                    <option value="member-only">Member Only</option>
                  </select>
                </div>
                <div>
                  <label>Price</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                  />
                </div>
                <div>
                  <label>Currency</label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label>Google Meet Link</label>
                <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                  <input
                    type="url"
                    value={formData.meetUrl}
                    onChange={(e) => setFormData({ ...formData, meetUrl: e.target.value })}
                    placeholder="https://meet.google.com/..."
                    style={{ flex: 1, padding: '8px' }}
                  />
                  <button
                    type="button"
                    onClick={handleGenerateMeetLink}
                    className="btn btn-secondary"
                  >
                    Auto-Generate
                  </button>
                </div>
                <label style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <input
                    type="checkbox"
                    checked={formData.autoGenerateMeetLink}
                    onChange={(e) => setFormData({ ...formData, autoGenerateMeetLink: e.target.checked })}
                  />
                  Auto-generate Meet link
                </label>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label>Translation Languages (select all that apply)</label>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: '10px',
                  marginTop: '10px',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}>
                  {MEET_LANGUAGES.map(lang => (
                    <label key={lang.code} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <input
                        type="checkbox"
                        checked={formData.translationLanguages.includes(lang.code)}
                        onChange={() => toggleLanguage(lang.code)}
                      />
                      <span style={{ fontSize: '0.9rem' }}>{formatLanguageDisplay(lang)}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label>Recurrence Pattern</label>
                <div style={{ display: 'flex', gap: '10px', marginTop: '5px', alignItems: 'center' }}>
                  <select
                    value={formData.recurrenceType}
                    onChange={(e) => setFormData({ ...formData, recurrenceType: e.target.value as any })}
                    style={{ padding: '8px' }}
                  >
                    <option value="none">None (One-time)</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                  {formData.recurrenceType !== 'none' && (
                    <>
                      <span>Every</span>
                      <input
                        type="number"
                        min="1"
                        value={formData.recurrenceInterval}
                        onChange={(e) => setFormData({ ...formData, recurrenceInterval: e.target.value })}
                        style={{ width: '60px', padding: '8px' }}
                      />
                      <span>{formData.recurrenceType === 'daily' ? 'day(s)' : formData.recurrenceType === 'weekly' ? 'week(s)' : 'month(s)'}</span>
                      <input
                        type="datetime-local"
                        value={formData.recurrenceEndDate}
                        onChange={(e) => setFormData({ ...formData, recurrenceEndDate: e.target.value })}
                        placeholder="End date (optional)"
                        style={{ padding: '8px' }}
                      />
                    </>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" className="btn btn-primary">
                  {editingWebcast ? 'Update' : 'Create'} Webcast
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div style={{ display: 'grid', gap: '15px' }}>
          {filteredWebcasts.map(webcast => (
            <div
              key={webcast.id}
              style={{
                background: '#fff',
                padding: '20px',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: '0 0 10px 0', color: '#002B4D' }}>{webcast.title}</h3>
                <p style={{ margin: '0 0 10px 0', color: '#6b7280' }}>{webcast.description}</p>
                <div style={{ display: 'flex', gap: '20px', fontSize: '0.9rem', color: '#6b7280' }}>
                  <span>📅 {new Date(webcast.scheduledAt).toLocaleString()}</span>
                  {webcast.duration && <span>⏱️ {webcast.duration} min</span>}
                  <span>🌐 {webcast.translationLanguages.length} languages</span>
                  <span>👥 {webcast.accessType}</span>
                  <span style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    background: webcast.status === 'live' ? '#10b981' : webcast.status === 'scheduled' ? '#3b82f6' : '#6b7280',
                    color: '#fff'
                  }}>
                    {webcast.status}
                  </span>
                </div>
                {webcast.meetUrl && (
                  <div style={{ marginTop: '10px' }}>
                    <a
                      href={webcast.meetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ marginRight: '10px', color: '#3b82f6' }}
                    >
                      {webcast.meetUrl}
                    </a>
                    <button
                      onClick={() => handleCopyMeetLink(webcast.meetUrl!)}
                      className="btn btn-secondary"
                      style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                    >
                      Copy Link
                    </button>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
                <button onClick={() => handleEdit(webcast)} className="btn btn-secondary" style={{ fontSize: '0.9rem' }}>
                  Edit
                </button>
                {webcast.status === 'scheduled' && (
                  <button
                    onClick={() => handleStatusChange(webcast.id, 'live')}
                    className="btn btn-primary"
                    style={{ fontSize: '0.9rem' }}
                  >
                    Start
                  </button>
                )}
                {webcast.status === 'live' && (
                  <button
                    onClick={() => handleStatusChange(webcast.id, 'ended')}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.9rem' }}
                  >
                    End
                  </button>
                )}
                <button
                  onClick={() => handleDelete(webcast.id)}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.9rem', background: '#ef4444', color: '#fff' }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
          {filteredWebcasts.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              No webcasts found. Create your first webcast to get started.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WebcastManagement;
